/**
 * export-pdf.ts — render PDF laporan transaksi, dimuat malas (lazy).
 *
 * `jspdf` (~350KB gzip) hanya diunduh saat user membuka halaman Export dan
 * menekan "Unduh PDF" — tidak ikut bundle awal. Modul ini TIDAK boleh
 * diimpor statis dari halaman lain selain export-data.
 */

import { exportTransactionsCsv, type ExportTransactionsParams } from "./transactions";

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Batas baris PDF agar HP tidak freeze — data besar pakai CSV. */
export const PDF_MAX_ROWS = 2000;

export async function exportTransactionsPdf(
  params: ExportTransactionsParams = {}
): Promise<{ blob: Blob; filename: string }> {
  const { blob } = await exportTransactionsCsv(params);
  const rows = parseCsvRows((await blob.text()).replace(/^\uFEFF/, ""));
  const dataRows = rows.length > 0 ? rows.length - 1 : 0;
  if (dataRows > PDF_MAX_ROWS) {
    throw new Error(
      `Terlalu banyak data untuk PDF (${dataRows} baris, maks ${PDF_MAX_ROWS}). Persempit rentang tanggal atau unduh CSV.`
    );
  }
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const columns = [
    { label: "Tanggal", width: 27 },
    { label: "Jenis", width: 25 },
    { label: "Kategori", width: 43 },
    { label: "Nominal", width: 34 },
    { label: "Catatan", width: pageWidth - margin * 2 - 129 },
  ];
  let y = 18;

  pdf.setTextColor(2, 70, 145);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("UangKu", margin, y);
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(11);
  pdf.text("Laporan transaksi", margin, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(110, 110, 110);
  const filterText = [
    params.type ? (params.type === "income" ? "Pemasukan" : "Pengeluaran") : "Semua transaksi",
    params.date_from ? `Dari ${params.date_from}` : "",
    params.date_to ? `Sampai ${params.date_to}` : "",
  ].filter(Boolean).join(" - ");
  pdf.text(filterText, margin, y + 13);
  y += 23;

  const drawHeader = () => {
    pdf.setFillColor(2, 70, 145);
    pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    let x = margin;
    columns.forEach((column) => {
      pdf.text(column.label, x + 2, y + 5.2);
      x += column.width;
    });
    y += 8;
  };

  drawHeader();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  rows.slice(1).forEach((row, rowIndex) => {
    const values = [row[1] ?? "", row[2] === "income" ? "Pemasukan" : "Pengeluaran", row[3] ?? "", row[4] ?? "", row[5] ?? ""];
    const lineCount = Math.max(1, ...values.map((value, index) => pdf.splitTextToSize(value, columns[index].width - 4).length));
    const rowHeight = Math.max(7, lineCount * 3.5 + 3);
    if (y + rowHeight > pageHeight - 12) {
      pdf.addPage();
      y = 14;
      drawHeader();
    }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(245, 248, 250);
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
    }
    let x = margin;
    pdf.setTextColor(45, 45, 45);
    values.forEach((value, index) => {
      pdf.text(pdf.splitTextToSize(value, columns[index].width - 4), x + 2, y + 4.5);
      x += columns[index].width;
    });
    y += rowHeight;
  });

  pdf.setTextColor(120, 120, 120);
  pdf.setFontSize(7);
  pdf.text(`Dibuat ${new Date().toLocaleDateString("id-ID")}`, margin, pageHeight - 7);
  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const kind = params.type ?? "semua";
  return { blob: pdf.output("blob"), filename: `uangku-${stamp}-${kind}.pdf` };
}
