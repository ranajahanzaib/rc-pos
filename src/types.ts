export type Store = {
  name: string;
  currency: string;
  taxRateBasisPoints: number;
};
export type User = { id: string; name: string; email: string };
export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string;
  priceCents: number;
  costCents: number;
  stock: number;
  reorderLevel: number;
  active: number;
  createdAt?: string;
};
export type Sale = {
  receiptNumber: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  cashReceivedCents: number;
  changeCents: number;
  createdAt: string;
};
