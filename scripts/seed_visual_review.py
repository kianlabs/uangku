"""Seed akun demo untuk review visual beranda.

Dipanggil dari project root:
  uv run --project server scripts/seed_visual_review.py

Idempotent: jika demo@uangku.app sudah ada, data TIDAK diubah.
Password: demopass1234
"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))

from app.core.deps import SessionLocal  # noqa: E402
from app.models.category import Category  # noqa: E402
from app.models.transaction import Transaction  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.auth import _pwd_hash  # noqa: E402
from app.services.auth import _seed_default_categories  # noqa: E402

EMAIL = "demo@uangku.app"
PASSWORD = "demopass1234"

TODAY = date.today()
D = lambda days_ago: TODAY - timedelta(days=days_ago)  # noqa: E731

# (hari_lalu, type, kategori, jumlah, deskripsi)
TXS: list[tuple[int, str, str, str, str]] = [
    (29, "income", "Gaji", "8500000", "Gaji bulanan"),
    (27, "expense", "Belanja", "420000", "Belanja bulanan"),
    (27, "expense", "Makanan", "96000", "Sarapan + kopi"),
    (26, "expense", "Transportasi", "35000", "Bensin"),
    (25, "expense", "Makanan", "128000", "Makan malam keluarga"),
    (24, "expense", "Tagihan", "450000", "Listrik"),
    (22, "expense", "Hiburan", "150000", "Streaming + game"),
    (20, "expense", "Makanan", "74000", "Jajan sore"),
    (18, "income", "Freelance", "1800000", "Proyek desain"),
    (17, "expense", "Belanja", "260000", "Skincare"),
    (15, "expense", "Kesehatan", "185000", "Vitamin"),
    (12, "expense", "Transportasi", "42000", "Top up e-money"),
    (10, "expense", "Makanan", "152000", "Cafe bareng teman"),
    (8, "expense", "Tagihan", "320000", "Internet"),
    (6, "expense", "Hiburan", "90000", "Nonton bioskop"),
    (4, "expense", "Belanja", "310000", "Pakaian"),
    (3, "expense", "Makanan", "88000", "Makan siang"),
    (2, "expense", "Transportasi", "28000", "Parkir + tol"),
    (1, "expense", "Makanan", "65000", "Dinner"),
    (0, "expense", "Makanan", "45000", "Brunch"),
    (0, "income", "Bonus", "500000", "Bonus kecil"),
]

# kategori expense -> limit bulanan
BUDGETS: dict[str, str] = {
    "Makanan": "1500000",
    "Transportasi": "400000",
    "Belanja": "900000",
    "Hiburan": "300000",
    "Tagihan": "800000",
}


def main() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).first()
        if user is not None:
            print(f"SKIP: {EMAIL} sudah ada (id={user.id}). Data tidak diubah.")
            return

        user = User(email=EMAIL, password_hash=_pwd_hash.hash(PASSWORD))
        db.add(user)
        db.flush()
        _seed_default_categories(db, user.id)
        db.flush()

        cats: dict[tuple[str, str], Category] = {
            (c.name, c.type): c
            for c in db.query(Category).filter(Category.user_id == user.id).all()
        }

        for days_ago, type_, cat_name, amount, desc in TXS:
            cat = cats[(cat_name, type_)]
            db.add(
                Transaction(
                    user_id=user.id,
                    category_id=cat.id,
                    type=type_,
                    amount=Decimal(amount),
                    description=desc,
                    transaction_date=D(days_ago),
                )
            )

        for cat_name, limit in BUDGETS.items():
            cat = cats[(cat_name, "expense")]
            from app.models.budget import Budget

            db.add(
                Budget(user_id=user.id, category_id=cat.id, amount=Decimal(limit))
            )

        db.commit()
        print(f"OK: {EMAIL} dibuat dengan {len(TXS)} transaksi & {len(BUDGETS)} budget.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
