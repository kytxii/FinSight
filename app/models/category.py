from enum import Enum

class Category(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    BILL = "BILL"
    SUBSCRIPTION = "SUBSCRIPTION"
    SAVINGS = "SAVINGS"
    DEBT = "DEBT"
    REIMBURSEMENT = "REIMBURSEMENT"
    TIPS = "TIPS"

