import asyncio
import logging
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from google import genai
from google.genai import errors, types
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import AiUsage, User
from app.models.category import Category
from app.schemas.assistant import ChatHistoryMessage
from app.services import analytics_service

logger = logging.getLogger(__name__)

CHAT_MODEL_NAME = "gemini-flash-latest"
MAX_MODEL_CALLS = 3
HISTORY_TURNS = 6
CALL_TIMEOUT_SECONDS = 20
DAILY_MESSAGE_LIMIT = 20

SYSTEM_PROMPT = """You are the FinSight financial assistant, answering questions about the \
user's own transaction data via read-only tools. You cannot create, edit, or delete anything.

Rules:
- Every number you state must come from a tool result. Never compute or estimate a total \
yourself, and never guess at data you have not fetched.
- Categories are a fixed set: INCOME, EXPENSE, BILL, SUBSCRIPTION, SAVINGS, DEBT, \
REIMBURSEMENT, TIPS. There is no "food", "gas", or other everyday category - EXPENSE covers \
all uncategorized spending. If asked about a category that doesn't exist, say so.
- Merchant/name search is a literal, case-insensitive text match on how the user named the \
transaction - not a concept match. If a search for "gas" returns nothing, tell the user \
nothing matched that name rather than guessing at what they meant or reporting $0 spent.
- If a question can't be answered with the tools available, say what you can't do rather \
than inventing an answer.
- Be concise. Lead with the number, then brief context.
"""


class AssistantUnavailable(Exception):
    """The assistant can't respond right now (not configured, timed out, or the call failed)."""


class AssistantRateLimited(Exception):
    """Gemini's own rate limit was hit - distinct from AssistantUnavailable so the client can
    tell "try again in a bit" apart from "something is broken"."""


class DailyLimitReached(Exception):
    """This user has used their daily message allowance."""


def _tool_declarations() -> list[types.FunctionDeclaration]:
    category_enum = [c.value for c in Category]
    return [
        types.FunctionDeclaration(
            name="get_financial_snapshot",
            description=(
                "Current financial position: running balance, spendable surplus, spending "
                "reserve, next payday, estimated savings, and cash on hand. Use for any "
                "balance/affordability/'how am I doing' question."
            ),
            parameters={"type": "object", "properties": {}},
        ),
        types.FunctionDeclaration(
            name="get_spending_summary",
            description=(
                "Totals and a breakdown for a date range: spending, income, and savings, "
                "grouped by category, merchant name, or month. Use for 'how much did I spend "
                "on X' or 'top merchants' or spending trend questions."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "format": "date", "description": "Defaults to the start of the current calendar month."},
                    "end_date": {"type": "string", "format": "date", "description": "Defaults to the end of the current calendar month."},
                    "group_by": {"type": "string", "enum": ["category", "merchant", "month"], "description": "Defaults to category."},
                    "category": {"type": "string", "enum": category_enum, "description": "Scope the breakdown to one category."},
                    "limit": {"type": "integer", "description": "Max groups to return, defaults to 20."},
                },
            },
        ),
        types.FunctionDeclaration(
            name="search_transactions",
            description=(
                "Find individual transactions by merchant name (literal substring, "
                "case-insensitive), category, date range, and/or amount range. Returns "
                "matching rows plus the total across every match, not just the returned page."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Literal substring to match against the transaction name."},
                    "category": {"type": "string", "enum": category_enum},
                    "start_date": {"type": "string", "format": "date"},
                    "end_date": {"type": "string", "format": "date"},
                    "min_amount": {"type": "number"},
                    "max_amount": {"type": "number"},
                    "limit": {"type": "integer", "description": "Max rows to return, defaults to 20."},
                },
            },
        ),
        types.FunctionDeclaration(
            name="get_commitments",
            description=(
                "Forward-looking monthly obligations: active recurring payments and active "
                "installments, with their totals. Use for 'what do I owe every month' or "
                "questions about upcoming bills and installments."
            ),
            parameters={"type": "object", "properties": {}},
        ),
    ]


def _parse_date(value: Any, field: str) -> date:
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (ValueError, TypeError) as exc:
        raise ValueError(f"{field} must be an ISO date (YYYY-MM-DD), got {value!r}") from exc


def _parse_category(value: Any) -> Category | None:
    if value is None:
        return None
    try:
        return Category(str(value).upper())
    except ValueError as exc:
        raise ValueError(f"Unknown category {value!r}") from exc


def _parse_amount(value: Any, field: str) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError(f"{field} must be a number, got {value!r}") from exc


async def _dispatch_tool(name: str, args: dict, user: User, db: AsyncSession) -> dict:
    """Execute one tool call against analytics_service and return a JSON-safe dict.

    Malformed arguments (a bad date string, an unknown category) are caught and handed back
    to the model as {"error": ...} rather than raised - a model-generated argument error
    shouldn't abort the whole exchange when the model can plausibly retry with a fix.
    """
    try:
        if name == "get_financial_snapshot":
            result = await analytics_service.get_snapshot(user, db)
            payload = analytics_service.snapshot_to_response(result)

        elif name == "get_spending_summary":
            from app.schemas.analytics import GroupBy

            start = _parse_date(args["start_date"], "start_date") if args.get("start_date") else None
            end = _parse_date(args["end_date"], "end_date") if args.get("end_date") else None
            group_by = GroupBy(args["group_by"]) if args.get("group_by") else GroupBy.CATEGORY
            category = _parse_category(args.get("category"))
            limit = int(args["limit"]) if args.get("limit") else 20
            result = await analytics_service.get_spending_summary(
                user.id, db, start, end, group_by, category, limit
            )
            payload = analytics_service.spending_summary_to_response(result)

        elif name == "search_transactions":
            start = _parse_date(args["start_date"], "start_date") if args.get("start_date") else None
            end = _parse_date(args["end_date"], "end_date") if args.get("end_date") else None
            category = _parse_category(args.get("category"))
            min_amount = _parse_amount(args.get("min_amount"), "min_amount")
            max_amount = _parse_amount(args.get("max_amount"), "max_amount")
            limit = int(args["limit"]) if args.get("limit") else 20
            result = await analytics_service.search_transactions(
                user.id, db, args.get("query"), category, start, end, min_amount, max_amount, limit
            )
            payload = analytics_service.transaction_search_to_response(result)

        elif name == "get_commitments":
            result = await analytics_service.get_commitments(user.id, db)
            payload = analytics_service.commitments_to_response(result)

        else:
            return {"error": f"Unknown tool {name!r}"}

        return payload.model_dump(mode="json")

    except ValueError as e:
        return {"error": str(e)}
    except Exception:
        logger.exception("Tool call failed: %s(%r)", name, args)
        return {"error": "That lookup failed on the server."}


async def _try_consume_daily_quota(user_id, db: AsyncSession, today: date) -> int | None:
    """Atomically increment today's message count if under the cap.

    Single UPSERT with a conditional DO UPDATE: if request_count is already at the cap, the
    WHERE clause makes the update a no-op and RETURNING yields nothing, so the check-and-
    increment can't race across concurrent requests from the same user - Postgres serializes
    on the (user_id, usage_date) row.

    Returns the new count if allowed, None if the daily cap is already reached.
    """
    stmt = (
        pg_insert(AiUsage)
        .values(user_id=user_id, usage_date=today, request_count=1)
        .on_conflict_do_update(
            index_elements=["user_id", "usage_date"],
            set_={"request_count": AiUsage.request_count + 1},
            where=AiUsage.request_count < DAILY_MESSAGE_LIMIT,
        )
        .returning(AiUsage.request_count)
    )
    row = (await db.execute(stmt)).first()
    await db.commit()
    return row.request_count if row else None


def _build_contents(history: list[ChatHistoryMessage], message: str) -> list[types.Content]:
    trimmed = history[-HISTORY_TURNS:]
    contents = [
        types.Content(role="model" if m.role.value == "assistant" else "user", parts=[types.Part(text=m.content)])
        for m in trimmed
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    return contents


async def send_message(
    user: User, db: AsyncSession, message: str, history: list[ChatHistoryMessage], today: date | None = None
) -> tuple[str, int]:
    if not settings.GEMINI_API_KEY:
        raise AssistantUnavailable("The assistant isn't configured on this server.")

    today = today or date.today()
    used_count = await _try_consume_daily_quota(user.id, db, today)
    if used_count is None:
        raise DailyLimitReached(f"Daily limit of {DAILY_MESSAGE_LIMIT} messages reached. Try again tomorrow.")
    remaining = DAILY_MESSAGE_LIMIT - used_count

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    tools = [types.Tool(function_declarations=_tool_declarations())]
    system_instruction = SYSTEM_PROMPT + f"\nToday's date is {today.isoformat()}."
    contents = _build_contents(history, message)

    try:
        for call_index in range(MAX_MODEL_CALLS):
            # On the last allowed call, force text - executing one more round of tool calls
            # here would make a 4th request, exceeding the ceiling this loop promises.
            is_last_call = call_index == MAX_MODEL_CALLS - 1
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=tools,
                tool_config=(
                    types.ToolConfig(function_calling_config=types.FunctionCallingConfig(mode="NONE"))
                    if is_last_call
                    else None
                ),
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            )
            response = await asyncio.wait_for(
                client.aio.models.generate_content(model=CHAT_MODEL_NAME, contents=contents, config=config),
                timeout=CALL_TIMEOUT_SECONDS,
            )

            candidate = response.candidates[0]
            function_calls = [p.function_call for p in candidate.content.parts if p.function_call]

            if not function_calls:
                text = (response.text or "").strip()
                return text or "I don't have a response for that.", remaining

            contents.append(candidate.content)
            response_parts = []
            for fc in function_calls:
                result = await _dispatch_tool(fc.name, dict(fc.args or {}), user, db)
                response_parts.append(types.Part.from_function_response(name=fc.name, response=result))
            contents.append(types.Content(role="user", parts=response_parts))

        return "I wasn't able to finish that within the tool budget - try asking something more specific.", remaining

    except asyncio.TimeoutError as exc:
        raise AssistantUnavailable("The assistant timed out.") from exc
    except errors.ClientError as exc:
        if exc.code == 429:
            raise AssistantRateLimited("The assistant is rate limited right now.") from exc
        logger.exception("Assistant call failed")
        raise AssistantUnavailable("The assistant call failed.") from exc
    except errors.ServerError as exc:
        logger.exception("Assistant call failed")
        raise AssistantUnavailable("The assistant call failed.") from exc
    except Exception as exc:
        logger.exception("Assistant call failed")
        raise AssistantUnavailable("The assistant call failed.") from exc
