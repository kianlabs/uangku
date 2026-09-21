"""Domain errors: kontrak terstruktur antara service layer dan API layer.

Menggantikan pola lama ``raise ValueError(\"marker\")`` + pencocokan
substring ``if \"marker\" in str(exc)`` di API layer.

``DomainError`` adalah subclass ``ValueError`` sehingga kode lama
(termasuk test ``pytest.raises(ValueError, match=...)``) tetap kompatibel,
sementara API layer bisa memakai ``except`` yang presisi via isinstance.

Setiap subclass membawa ``marker`` yang sama persis dengan string lama,
sehingga pesan error yang sampai ke klien tidak berubah.
"""

from __future__ import annotations


class DomainError(ValueError):
    """Base class semua error domain. Jangan di-raise langsung."""

    marker: str = "domain_error"

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(detail if detail is not None else self.marker)


class EmailTakenError(DomainError):
    marker = "email_taken"


class InvalidCredentialsError(DomainError):
    marker = "invalid_credentials"


class DuplicateCategoryError(DomainError):
    marker = "duplicate_category"


class CategoryInUseError(DomainError):
    marker = "category_in_use"


class InvalidCategoryError(DomainError):
    marker = "invalid_category"


class TypeMismatchError(DomainError):
    marker = "type_mismatch"


class NotFoundError(DomainError):
    marker = "not_found"


class InvalidMonthError(DomainError):
    marker = "invalid_month"


class InvalidAmountError(DomainError):
    marker = "amount must be greater than 0"


class ExportTooLargeError(DomainError):
    marker = "export_too_large"
