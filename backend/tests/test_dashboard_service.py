import uuid
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Base, Category, Transaction, User  # noqa: F401
from app.services.auth import register_user
from app.services.category import create_category
from app.services.dashboard import (
    _days_until_next_payday,
    _parse_month,
    get_dashboard_summary,
    get_user_metrics,
)
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


# ===========================================================================
# get_user_metrics
# ===========================================================================


# --- _days_until_next_payday ---

def test_payday_future_same_month():
    # today=5, payday=25 → 20 days
    assert _days_until_next_payday(date(2026, 9, 5), 25) == 20


def test_payday_is_today():
    # payday == today → next occurrence is next month, but treated as "today is payday"
    # per implementation: next_pay <= today → move to next month
    result = _days_until_next_payday(date(2026, 9, 25), 25)
    # next payday = 2026-10-25 → 30 days
    assert result == 30


def test_payday_already_passed():
    # today=28, payday=25 → next payday is next month's 25th
    result = _days_until_next_payday(date(2026, 9, 28), 25)
    # 2026-10-25 - 2026-09-28 = 27 days
    assert result == 27


def test_payday_clamps_to_feb_end():
    # payday=31 in February → clamped to 28 (2027 is not leap)
    result = _days_until_next_payday(date(2027, 2, 1), 31)
    assert result == 27  # Feb 28 - Feb 1 = 27


def test_payday_december_rollover():
    # today=Dec 28, payday=25 → next payday = Jan 25
    result = _days_until_next_payday(date(2026, 12, 28), 25)
    assert result == 28  # Jan 25 - Dec 28 = 28


# --- get_user_metrics ---

@pytest.fixture(scope="module")
def metrics_user(db):
    return register_user(db, f"{uuid.uuid4()}@metrics.com", "pass")


@pytest.fixture(scope="module")
def metrics_expense_cat(db, metrics_user):
    return db.scalar(
        select(Category).where(Category.user_id == metrics_user.id, Category.name == "Makanan")
    )


@pytest.fixture(scope="module")
def metrics_tagihan_cat(db, metrics_user):
    return db.scalar(
        select(Category).where(Category.user_id == metrics_user.id, Category.name == "Tagihan")
    )


@pytest.fixture(scope="module")
def metrics_income_cat(db, metrics_user):
    return db.scalar(
        select(Category).where(Category.user_id == metrics_user.id, Category.name == "Gaji")
    )


def test_metrics_no_transactions(db, metrics_user):
    today = date(2030, 1, 15)
    result = get_user_metrics(db, metrics_user, payday=25, today=today)
    assert result["transaction_dates"] == []
    assert result["week_expense_total"] == Decimal(0)
    assert result["week_top_category"] is None
    assert result["days_left"] > 0


def test_metrics_streak_dates_within_60_days(db, metrics_user, metrics_expense_cat):
    today = date(2028, 3, 10)
    # Transaction in window
    create_transaction(db, metrics_user, type_="expense", amount=Decimal(10000),
                       category_id=metrics_expense_cat.id, transaction_date=date(2028, 3, 8))
    # Transaction outside 60-day window — should NOT appear
    create_transaction(db, metrics_user, type_="expense", amount=Decimal(10000),
                       category_id=metrics_expense_cat.id, transaction_date=date(2028, 1, 1))

    result = get_user_metrics(db, metrics_user, payday=25, today=today)
    dates = result["transaction_dates"]
    assert "2028-03-08" in dates
    assert "2028-01-01" not in dates


def test_metrics_weekly_expense_aggregation(db, metrics_user, metrics_expense_cat):
    today = date(2028, 5, 10)
    # Within 7 days
    create_transaction(db, metrics_user, type_="expense", amount=Decimal(50000),
                       category_id=metrics_expense_cat.id, transaction_date=date(2028, 5, 8))
    create_transaction(db, metrics_user, type_="expense", amount=Decimal(30000),
                       category_id=metrics_expense_cat.id, transaction_date=date(2028, 5, 4))
    # Outside 7 days — not counted
    create_transaction(db, metrics_user, type_="expense", amount=Decimal(999999),
                       category_id=metrics_expense_cat.id, transaction_date=date(2028, 4, 1))

    result = get_user_metrics(db, metrics_user, payday=25, today=today)
    assert result["week_expense_total"] >= Decimal(80000)
    assert result["week_top_category"] == "Makanan"


def test_metrics_weekly_excludes_income(db, metrics_user, metrics_income_cat, metrics_expense_cat):
    today = date(2028, 6, 15)
    create_transaction(db, metrics_user, type_="income", amount=Decimal(5000000),
                       category_id=metrics_income_cat.id, transaction_date=date(2028, 6, 14))
    create_transaction(db, metrics_user, type_="expense", amount=Decimal(10000),
                       category_id=metrics_expense_cat.id, transaction_date=date(2028, 6, 14))

    result = get_user_metrics(db, metrics_user, payday=25, today=today)
    assert result["week_expense_total"] < Decimal(100000)  # income not counted


def test_metrics_safe_to_spend_with_income_and_tagihan(
    db, metrics_user, metrics_income_cat, metrics_expense_cat, metrics_tagihan_cat
):
    today = date(2028, 7, 10)
    # Income: 5,000,000
    create_transaction(db, metrics_user, type_="income", amount=Decimal(5000000),
                       category_id=metrics_income_cat.id, transaction_date=date(2028, 7, 1))
    # Regular expense: 1,000,000
    create_transaction(db, metrics_user, type_="expense", amount=Decimal(1000000),
                       category_id=metrics_expense_cat.id, transaction_date=date(2028, 7, 5))
    # Tagihan (mandatory): 500,000
    create_transaction(db, metrics_user, type_="expense", amount=Decimal(500000),
                       category_id=metrics_tagihan_cat.id, transaction_date=date(2028, 7, 5))

    result = get_user_metrics(db, metrics_user, payday=25, today=today)
    # remaining_balance = income - ALL expense = 5,000,000 - 1,500,000 = 3,500,000
    assert result["remaining_balance"] == Decimal(3500000)
    # days_left = 25 - 10 = 15
    assert result["days_left"] == 15
    assert result["safe_to_spend"] == Decimal(3500000) / 15


def test_metrics_safe_to_spend_zero_income(db, metrics_user, metrics_expense_cat):
    today = date(2028, 8, 15)
    result = get_user_metrics(db, metrics_user, payday=20, today=today)
    # No income this month → remaining_balance negative or 0
    assert result["days_left"] == 5  # 20 - 15


def test_metrics_payday_default_is_1(db, metrics_user):
    today = date(2028, 9, 10)
    result = get_user_metrics(db, metrics_user, today=today)  # no payday arg → default 1
    # Next payday is Oct 1
    assert result["payday"] == 1
    assert result["days_left"] == 21  # Oct 1 - Sep 10
