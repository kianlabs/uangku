import uuid
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Base
from app.models import Category, Transaction, User  # noqa: F401
from app.services.auth import register_user
from app.services.category import create_category
from app.services.dashboard import _parse_month, get_dashboard_summary
from app.services.transaction import create_transaction


@pytest.fixture(scope="module")
def db():
    engine = create_engine(settings.database_url_test)
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="module")
def user(db):
    return register_user(db, f"{uuid.uuid4()}@dash.com", "pass")


@pytest.fixture(scope="module")
def other_user(db):
    return register_user(db, f"{uuid.uuid4()}@dash.com", "pass")


@pytest.fixture(scope="module")
def expense_cat(db, user):
    return create_category(db, user, name="Food", type_="expense")


@pytest.fixture(scope="module")
def expense_cat2(db, user):
    return create_category(db, user, name="Transport", type_="expense")


@pytest.fixture(scope="module")
def income_cat(db, user):
    return create_category(db, user, name="Salary", type_="income")


@pytest.fixture(scope="module")
def other_expense_cat(db, other_user):
    return create_category(db, other_user, name="Other", type_="expense")


# --- _parse_month ---

def test_parse_month_valid():
    d_from, d_to = _parse_month("2026-09")
    assert d_from == date(2026, 9, 1)
    assert d_to == date(2026, 10, 1)


def test_parse_month_december():
    d_from, d_to = _parse_month("2026-12")
    assert d_from == date(2026, 12, 1)
    assert d_to == date(2027, 1, 1)


def test_parse_month_february_leap():
    d_from, d_to = _parse_month("2028-02")
    assert d_from == date(2028, 2, 1)
    assert d_to == date(2028, 3, 1)


def test_parse_month_invalid_format():
    with pytest.raises(ValueError, match="invalid_month"):
        _parse_month("bad")


def test_parse_month_invalid_month_13():
    with pytest.raises(ValueError, match="invalid_month"):
        _parse_month("2026-13")


def test_parse_month_invalid_month_00():
    with pytest.raises(ValueError, match="invalid_month"):
        _parse_month("2026-00")


def test_parse_month_non_zero_padded_month():
    with pytest.raises(ValueError, match="invalid_month"):
        _parse_month("2026-9")


def test_parse_month_non_zero_padded_year():
    with pytest.raises(ValueError, match="invalid_month"):
        _parse_month("26-09")


def test_parse_month_year_zero():
    with pytest.raises(ValueError, match="invalid_month"):
        _parse_month("0000-01")


# --- balance ---

def test_balance_empty(db, user):
    result = get_dashboard_summary(db, user, "2020-01")
    assert result["balance"] == Decimal("0.00") or result["balance"] == Decimal(0)


def test_balance_alltime_not_month_filtered(db, user, expense_cat, income_cat):
    # income in 2026-09, expense in 2026-08 — both count for balance
    create_transaction(db, user, type_="income", amount=Decimal(1000000),
                       category_id=income_cat.id, transaction_date=date(2026, 9, 1))
    create_transaction(db, user, type_="expense", amount=Decimal(300000),
                       category_id=expense_cat.id, transaction_date=date(2026, 8, 1))
    result_sep = get_dashboard_summary(db, user, "2026-09")
    result_aug = get_dashboard_summary(db, user, "2026-08")
    assert result_sep["balance"] == result_aug["balance"]


# --- monthly aggregates ---

def test_monthly_income_only_counts_selected_month(db, user, income_cat):
    create_transaction(db, user, type_="income", amount=Decimal(500000),
                       category_id=income_cat.id, transaction_date=date(2026, 7, 15))
    result = get_dashboard_summary(db, user, "2026-07")
    assert result["monthly_income"] >= Decimal(500000)
    result_other = get_dashboard_summary(db, user, "2026-06")
    assert result_other["monthly_income"] == Decimal(0)


def test_monthly_expense_only_counts_selected_month(db, user, expense_cat):
    create_transaction(db, user, type_="expense", amount=Decimal(200000),
                       category_id=expense_cat.id, transaction_date=date(2026, 7, 20))
    result = get_dashboard_summary(db, user, "2026-07")
    assert result["monthly_expense"] >= Decimal(200000)


def test_transaction_count_both_types(db, user, expense_cat, income_cat):
    create_transaction(db, user, type_="expense", amount=Decimal(10000),
                       category_id=expense_cat.id, transaction_date=date(2025, 1, 5))
    create_transaction(db, user, type_="income", amount=Decimal(20000),
                       category_id=income_cat.id, transaction_date=date(2025, 1, 10))
    result = get_dashboard_summary(db, user, "2025-01")
    assert result["transaction_count"] == 2


def test_transaction_count_excludes_other_months(db, user, expense_cat):
    result = get_dashboard_summary(db, user, "2024-01")
    assert result["transaction_count"] == 0


# --- expense_by_category ---

def test_expense_by_category_empty(db, user):
    result = get_dashboard_summary(db, user, "2024-06")
    assert result["expense_by_category"] == []


def test_expense_by_category_amounts(db, user, expense_cat, expense_cat2):
    create_transaction(db, user, type_="expense", amount=Decimal(100000),
                       category_id=expense_cat.id, transaction_date=date(2026, 5, 1))
    create_transaction(db, user, type_="expense", amount=Decimal(50000),
                       category_id=expense_cat2.id, transaction_date=date(2026, 5, 1))
    result = get_dashboard_summary(db, user, "2026-05")
    items = result["expense_by_category"]
    assert len(items) == 2
    assert items[0]["amount"] >= items[1]["amount"]  # sorted DESC


def test_expense_by_category_percentage_sums_to_100(db, user, expense_cat, expense_cat2):
    result = get_dashboard_summary(db, user, "2026-05")
    total_pct = sum(i["percentage"] for i in result["expense_by_category"])
    assert abs(total_pct - 100.0) < 0.1


def test_expense_by_category_excludes_income(db, user, income_cat):
    create_transaction(db, user, type_="income", amount=Decimal(999999),
                       category_id=income_cat.id, transaction_date=date(2026, 5, 1))
    result = get_dashboard_summary(db, user, "2026-05")
    cats = [i["category_name"] for i in result["expense_by_category"]]
    assert "Salary" not in cats


def test_expense_by_category_deterministic_tiebreak(db, user):
    # sorted amount DESC, name ASC
    result = get_dashboard_summary(db, user, "2026-05")
    items = result["expense_by_category"]
    for i in range(len(items) - 1):
        a, b = items[i], items[i + 1]
        assert a["amount"] > b["amount"] or (
            a["amount"] == b["amount"] and a["category_name"] <= b["category_name"]
        )


def test_expense_by_category_own_only(db, user, other_user, other_expense_cat):
    create_transaction(db, other_user, type_="expense", amount=Decimal(999),
                       category_id=other_expense_cat.id, transaction_date=date(2026, 5, 1))
    result = get_dashboard_summary(db, user, "2026-05")
    cat_ids = [str(i["category_id"]) for i in result["expense_by_category"]]
    assert str(other_expense_cat.id) not in cat_ids


# --- recent_transactions ---

def test_recent_transactions_limit(db, user, expense_cat):
    for i in range(6):
        create_transaction(db, user, type_="expense", amount=Decimal(1000),
                           category_id=expense_cat.id, transaction_date=date(2026, 4, i + 1))
    result = get_dashboard_summary(db, user, "2026-04")
    assert len(result["recent_transactions"]) <= 5


def test_recent_transactions_month_filtered(db, user, expense_cat):
    result = get_dashboard_summary(db, user, "2026-04")
    for tx in result["recent_transactions"]:
        assert tx["transaction_date"] >= date(2026, 4, 1)
        assert tx["transaction_date"] < date(2026, 5, 1)


def test_recent_transactions_sort_order(db, user, expense_cat):
    result = get_dashboard_summary(db, user, "2026-04")
    dates = [tx["transaction_date"] for tx in result["recent_transactions"]]
    assert dates == sorted(dates, reverse=True)


def test_recent_transactions_has_category_name(db, user, expense_cat):
    result = get_dashboard_summary(db, user, "2026-04")
    for tx in result["recent_transactions"]:
        assert "category_name" in tx
        assert isinstance(tx["category_name"], str)
