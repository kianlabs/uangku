from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models.budget import Budget
from app.models.category import Category
from app.models.recurring import RecurringTemplate
from app.models.transaction import Transaction
from app.models.user import User

__all__ = ["Base", "Budget", "Category", "RecurringTemplate", "Transaction", "User"]
