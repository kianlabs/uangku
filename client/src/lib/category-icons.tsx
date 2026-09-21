import {
  Utensils,
  Bus,
  ShoppingCart,
  Film,
  FileText,
  Receipt,
  Wifi,
  CreditCard,
  ShieldCheck,
  Landmark,
  House,
  Smartphone,
  HandHeart,
  Heart,
  BookOpen,
  Briefcase,
  Laptop,
  Gift,
  Store,
  Tag,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Makanan: Utensils,
  Transportasi: Bus,
  Belanja: ShoppingCart,
  Hiburan: Film,
  Tagihan: FileText,
  "Listrik & Air": Receipt,
  "Internet & Telepon": Wifi,
  "Langganan Digital": Smartphone,
  "Cicilan & Pinjaman": CreditCard,
  Asuransi: ShieldCheck,
  "Pajak & Administrasi": Landmark,
  "Kebutuhan Rumah": House,
  "Pembayaran Digital": Smartphone,
  Kesehatan: Heart,
  Pendidikan: BookOpen,
  "Donasi & Zakat": HandHeart,
  Gaji: Briefcase,
  Freelance: Laptop,
  Bonus: Gift,
  Penjualan: Store,
  Lainnya: Tag,
};

const colorMap: Record<string, { background: string; foreground: string }> = {
  Makanan: { background: "bg-orange-50", foreground: "text-orange-600" },
  Transportasi: { background: "bg-cyan-50", foreground: "text-cyan-700" },
  Belanja: { background: "bg-amber-50", foreground: "text-amber-700" },
  Hiburan: { background: "bg-violet-50", foreground: "text-violet-700" },
  Tagihan: { background: "bg-blue-50", foreground: "text-blue-700" },
  "Listrik & Air": { background: "bg-sky-50", foreground: "text-sky-700" },
  "Internet & Telepon": { background: "bg-cyan-50", foreground: "text-cyan-700" },
  "Langganan Digital": { background: "bg-indigo-50", foreground: "text-indigo-700" },
  "Cicilan & Pinjaman": { background: "bg-slate-100", foreground: "text-slate-700" },
  Asuransi: { background: "bg-teal-50", foreground: "text-teal-700" },
  "Pajak & Administrasi": { background: "bg-stone-100", foreground: "text-stone-700" },
  "Kebutuhan Rumah": { background: "bg-lime-50", foreground: "text-lime-700" },
  "Pembayaran Digital": { background: "bg-blue-50", foreground: "text-blue-700" },
  Kesehatan: { background: "bg-rose-50", foreground: "text-rose-700" },
  Pendidikan: { background: "bg-indigo-50", foreground: "text-indigo-700" },
  "Donasi & Zakat": { background: "bg-emerald-50", foreground: "text-emerald-700" },
  Gaji: { background: "bg-emerald-50", foreground: "text-emerald-700" },
  Freelance: { background: "bg-teal-50", foreground: "text-teal-700" },
  Bonus: { background: "bg-green-50", foreground: "text-green-700" },
  Penjualan: { background: "bg-lime-50", foreground: "text-lime-700" },
  Lainnya: { background: "bg-slate-100", foreground: "text-slate-600" },
};

export function getCategoryIcon(name: string): LucideIcon {
  return iconMap[name] || Tag;
}

export function getCategoryColor(name: string) {
  return colorMap[name] || { background: "bg-slate-100", foreground: "text-slate-600" };
}
