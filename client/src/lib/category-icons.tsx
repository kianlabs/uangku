import {
  Utensils,
  Bus,
  ShoppingCart,
  Film,
  FileText,
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
  Kesehatan: Heart,
  Pendidikan: BookOpen,
  Gaji: Briefcase,
  Freelance: Laptop,
  Bonus: Gift,
  Penjualan: Store,
  Lainnya: Tag,
};

export function getCategoryIcon(name: string): LucideIcon {
  return iconMap[name] || Tag;
}
