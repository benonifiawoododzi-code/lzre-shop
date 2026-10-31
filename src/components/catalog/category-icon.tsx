import { Baby, BookOpen, Car, Cpu, Dumbbell, Gift, Hammer, HeartPulse, Laptop, Printer, Puzzle, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, Tag, TreePine, Utensils, Watch, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Smartphone, Laptop, Shirt, Watch, Sparkles, HeartPulse, Sofa, Utensils, Hammer, Dumbbell, Puzzle, Baby, BookOpen, Car, ShoppingBasket, TreePine, Printer, Gift, Cpu,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && icons[name]) || Tag;
  return <Icon aria-hidden="true" className={className} />;
}
