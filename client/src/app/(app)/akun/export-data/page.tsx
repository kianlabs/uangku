"use client";

import { useState } from "react";
import { ApiResponseError } from "@/lib/api";
import { exportTransactionsCsv } from "@/lib/transactions";
import type { TransactionType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Mascot } from "@/components/brand/Mascot";

type FilterType = "all" | TransactionType;

export default function ExportDataPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setError(null);
    setSuccess(null);
    setIsExporting(true);
    try {
      const { blob, filename } = await exportTransactionsCsv({
        type: filter === "all" ? undefined : filter,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccess(`Berhasil mengunduh ${filename}.`);
      // Revoke after 60s so large downloads aren't killed mid-save.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.message);
      } else {
        setError("Gagal mengekspor data. Coba lagi.");
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-text">Export Data</h1>
        <p className="text-sm text-muted">
          Download transaksi Anda dalam format CSV
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Select
          label="Jenis transaksi"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
        >
          <option value="all">Semua</option>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Dari tanggal"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
          />
          <Input
            label="Sampai tanggal"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-surface border border-danger px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl bg-surface border border-border px-4 py-3"
        >
          <Mascot size={52} mood="celebrating" animated={false} />
          <p className="text-sm text-text">{success}</p>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        loading={isExporting}
        onClick={handleExport}
        className="w-full"
      >
        Unduh CSV
      </Button>
    </div>
  );
}
