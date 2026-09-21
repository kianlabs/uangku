"""Month parsing helper shared by dashboard and budget services."""
from __future__ import annotations

import re
from datetime import date

from app.core.errors import InvalidMonthError


def parse_month(month_str: str) -> tuple[date, date]:
    """Parse ``YYYY-MM`` into (first_day, first_day_of_next_month)."""
    if not re.fullmatch(r"\d{4}-\d{2}", month_str):
        raise InvalidMonthError()
    try:
        parts = month_str.split("-")
        year, month = int(parts[0]), int(parts[1])
        if not (1 <= month <= 12):
            raise InvalidMonthError()
        date_from = date(year, month, 1)
    except (ValueError, OverflowError):
        raise InvalidMonthError() from None

    if month == 12:
        date_to_exclusive = date(year + 1, 1, 1)
    else:
        date_to_exclusive = date(year, month + 1, 1)
    return date_from, date_to_exclusive
