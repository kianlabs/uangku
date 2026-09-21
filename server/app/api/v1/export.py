from __future__ import annotations

import csv
import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import ExportTooLargeError
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.category import CategoryType
from app.services.transaction import get_transactions_for_export

router = APIRouter(prefix="/export", tags=["export"])

_CSV_HEADERS = ["id", "date", "type", "category", "amount", "description", "created_at"]
_FORMULA_TRIGGER = frozenset("=+-@")


def _sanitize_cell(value: str) -> str:
    """Prefix apostrophe if the first non-whitespace char would trigger a spreadsheet formula.

    Applied only to user-controlled fields (category name, description).
    Data in the database is not modified — this is output-layer only.
    Note: the apostrophe prefix is a spreadsheet GUI convention and is NOT stripped
    by programmatic CSV readers, so downstream non-spreadsheet consumers will see it.
    """
    stripped = value.lstrip()
    if stripped and stripped[0] in _FORMULA_TRIGGER:
        return "'" + value
    return value


@router.get("/transactions.csv")
@limiter.limit("30/minute")
def get_transactions_csv(
    request: Request,
    type: CategoryType | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        transactions = get_transactions_for_export(
            db,
            current_user,
            type_filter=type,
            category_id=category_id,
            date_from=date_from,
            date_to=date_to,
        )
    except ExportTooLargeError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "EXPORT_TOO_LARGE", "message": str(exc)},
        )

    def _generate():
        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="\r\n")
        # BOM once so Excel detects UTF-8; yielded first.
        yield "\ufeff"
        writer.writerow(_CSV_HEADERS)
        yield buf.getvalue()
        buf.seek(0)
        buf.truncate(0)
        for tx in transactions:
            writer.writerow([
                str(tx.id),
                tx.transaction_date.isoformat(),
                tx.type,
                _sanitize_cell(tx.category.name),
                f"{tx.amount:.2f}",
                _sanitize_cell(tx.description or ""),
                tx.created_at.isoformat(),
            ])
            yield buf.getvalue()
            buf.seek(0)
            buf.truncate(0)

    return StreamingResponse(
        _generate(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="uangku-transactions.csv"'},
    )
