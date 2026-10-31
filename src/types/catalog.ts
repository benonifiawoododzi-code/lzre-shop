export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  pricePesewas: number;
  comparePesewas: number | null;
  discountPercent: number | null;
  currency: string;
  image: string;
  imageAlt: string;
  rating: number;
  ratingCount: number;
  sellerName: string;
  sellerSlug: string;
  available: number;
  canQuickAdd: boolean;
  variantId: string | null;
};
