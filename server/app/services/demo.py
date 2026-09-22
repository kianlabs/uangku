"""Seed data contoh untuk user (dipicu dari onboarding MochiGuide).

Semua tanggal relatif ke hari ini agar sparkline, streak, dan donut
langsung hidup. Idempotent: kalau user sudah punya transaksi, batal.
"""
from __future__ import annotations

import random
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User


def seed_demo_data(db: Session, user: User, seed: int | None = None) -> dict[str, Any]:
    """Isi 3 minggu transaksi contoh. Return ringkasan jumlah baris."""
    existing = db.scalars(
        select(Transaction).where(Transaction.user_id == user.id)
    ).all()
    if existing:
        if all(t.is_opening_balance for t in existing):
            # Hanya saldo awal dari onboarding — ganti dengan contoh data
            # agar tombol "Coba dengan contoh data" berhasil dalam 1 klik.
            for t in existing:
                db.delete(t)
            db.flush()
        else:
            raise ValueError("user already has transactions")

    rng = random.Random(seed)
    today = datetime.now(UTC).date()

    cats = db.scalars(
        select(Category).where(Category.user_id == user.id)
    ).all()
    by_type: dict[str, list[Category]] = {"expense": [], "income": []}
    for c in cats:
        by_type.setdefault(c.type, []).append(c)

    expenses = by_type.get("expense") or []
    incomes = by_type.get("income") or []
    if not expenses or not incomes:
        raise ValueError("default categories missing")

    def _pick_income_cat() -> Category:
        for name in ("Gaji", "Freelance", "Bonus"):
            match = next((c for c in incomes if c.name.lower() == name.lower()), None)
            if match:
                return match
        return incomes[0]

    salary_cat = _pick_income_cat()
    rows: list[Transaction] = []

    # --- Gaji siklus bulan lalu & bulan ini (day 1 & 15 pattern) ---
    def _add_salary(pay_date: date, amount: str) -> None:
        rows.append(
            Transaction(
                user_id=user.id,
                category_id=salary_cat.id,
                type="income",
                amount=Decimal(amount),
                transaction_date=pay_date,
                description="Gaji bulanan",
            )
        )

    first_of_month = today.replace(day=1)
    if today.day >= 15:
        _add_salary(first_of_month, "4500000")
    if today.day < 15 and today.month == 1:
        prev_month_last = first_of_month - timedelta(days=1)
        _add_salary(prev_month_last.replace(day=25), "4500000")
    else:
        prev = (first_of_month - timedelta(days=1)).replace(day=25)
        _add_salary(prev, "4500000")

    # --- Pengeluaran 21 hari terakhir: kepadatan realistis ---
    for d in range(20, -1, -1):
        day = today - timedelta(days=d)
        if rng.random() < 0.18:
            continue  # beberapa hari kosong → sparkline bergerigi natural
        n = 1 if rng.random() < 0.55 else 2
        for _ in range(n):
            cat = rng.choice(expenses)
            base = rng.choice((15000, 20000, 25000, 30000, 45000, 60000, 120000))
            amount = base * rng.randint(1, 3)
            rows.append(
                Transaction(
                    user_id=user.id,
                    category_id=cat.id,
                    type="expense",
                    amount=Decimal(amount),
                    transaction_date=day,
                    description=None,
                )
            )

    # --- 2 budget contoh ---
    from app.services.budget import upsert_budget

    food = next((c for c in expenses if c.name.lower() == "makanan"), None)
    transport = next((c for c in expenses if c.name.lower() == "transportasi"), None)
    for cat, amount in ((food, "900000"), (transport, "300000")):
        if cat:
            upsert_budget(db, user, category_id=cat.id, amount=Decimal(amount))

    db.add_all(rows)
    db.commit()
    return {"transactions": len(rows), "budgets": sum(1 for c in (food, transport) if c)}
