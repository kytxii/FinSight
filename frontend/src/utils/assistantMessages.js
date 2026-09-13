// Shared between the desktop AssistantPanel and mobile MobileAssistant - the wire format and
// quota numbers are identical on both platforms (#13), only the surrounding layout differs.

// Mirrors assistant_service.DAILY_REQUEST_LIMIT / MINUTE_REQUEST_LIMIT - the real Gemini
// free-tier caps for gemini-flash-lite-latest (confirmed via the account's own AI Studio
// dashboard, since Google no longer publishes fixed numbers). The API only ever returns how many
// requests remain, not the caps themselves, so these have to be kept in sync by hand if they change.
export const DAILY_REQUEST_LIMIT = 500;
export const MINUTE_REQUEST_LIMIT = 15;

// Matches the exact shape the system prompt asks for: "- Label: $amount (detail)" - e.g.
// "- February 2026: $186.37 (4 transactions)". Given actual structure rather than parsed as
// generic markdown (no dependency, and it only ever needs to handle the one shape the prompt
// produces).
const LIST_LINE_RE = /^-\s*(.+?):\s*(\$[\d,]+\.\d{2})\s*(\(.+\))?$/;

export function parseAssistantBlocks(content) {
  const lines = content.split("\n");
  const blocks = [];
  let list = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      const match = line.match(LIST_LINE_RE);
      if (!list) { list = []; blocks.push({ type: "list", items: list }); }
      list.push(match
        ? { label: match[1].trim(), amount: match[2], detail: match[3]?.slice(1, -1) }
        : { label: line.slice(2).trim(), amount: null, detail: null });
    } else {
      list = null;
      if (line) blocks.push({ type: "text", text: line });
    }
  }
  return blocks;
}
