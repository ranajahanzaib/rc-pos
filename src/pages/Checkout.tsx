import {
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Notice, PageTitle, Panel } from "../components/ui";
import { api, messageOf } from "../lib/api";
import { centsFromInput, money } from "../lib/format";
import type { Product, Store } from "../types";

type CartItem = { product: Product; quantity: number };
type CompletedSale = {
  receiptNumber: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  changeCents: number;
};

export function Checkout({ store }: { store: Store }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<CompletedSale | null>(null);
  const [checkoutKey, setCheckoutKey] = useState<string | null>(null);
  async function loadProducts() {
    const result = await api<{ products: Product[] }>("/products");
    setProducts(result.products);
  }
  useEffect(() => {
    loadProducts().catch((cause) => setError(messageOf(cause)));
  }, []);

  const visible = useMemo(
    () =>
      products
        .filter(
          (product) =>
            product.stock > 0 &&
            `${product.name} ${product.sku} ${product.barcode ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .slice(0, 60),
    [products, search],
  );
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );
  const tax = Math.round((subtotal * store.taxRateBasisPoints) / 10_000);
  const total = subtotal + tax;
  const cashCents = centsFromInput(cash);

  function add(product: Product) {
    setError("");
    setCart((current) => {
      const match = current.find((item) => item.product.id === product.id);
      if (match)
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        );
      return [...current, { product, quantity: 1 }];
    });
  }
  function quantity(id: string, delta: number) {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.product.id !== id) return [item];
        const next = item.quantity + delta;
        return next <= 0
          ? []
          : [{ ...item, quantity: Math.min(next, item.product.stock) }];
      }),
    );
  }
  function changeCash(value: string) {
    if (/^\d*\.?\d{0,2}$/.test(value)) setCash(value);
  }

  async function checkout() {
    if (!cart.length || cashCents < total) return;
    setBusy(true);
    setError("");
    try {
      const idempotencyKey = checkoutKey ?? crypto.randomUUID();
      setCheckoutKey(idempotencyKey);
      const result = await api<CompletedSale>("/sales", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map(({ product, quantity: count }) => ({
            productId: product.id,
            quantity: count,
          })),
          cashReceivedCents: cashCents,
          idempotencyKey,
        }),
      });
      setCompleted(result);
      setCart([]);
      setCash("");
      setCheckoutKey(null);
      await loadProducts();
    } catch (cause) {
      setError(messageOf(cause));
      await loadProducts().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  if (completed)
    return (
      <div className="mx-auto max-w-2xl pt-8">
        <PageTitle
          eyebrow="Payment complete"
          title="That’s a wrap."
          description="The sale is recorded, the stock is updated, and your receipt is ready."
        />
        <Panel className="overflow-hidden">
          <div className="flex flex-col items-center border-b border-dashed border-line bg-mint/60 px-6 py-10 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-forest text-white shadow-lg shadow-forest/20">
              <Check size={29} />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.15em] text-forest">
              Payment received
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              {money(completed.totalCents, store.currency)}
            </p>
            <p className="mt-2 text-sm text-muted">
              Receipt {completed.receiptNumber}
            </p>
          </div>
          <div className="grid gap-3 p-6 sm:grid-cols-3">
            <ReceiptLine
              label="Subtotal"
              value={money(completed.subtotalCents, store.currency)}
            />
            <ReceiptLine
              label="Tax"
              value={money(completed.taxCents, store.currency)}
            />
            <ReceiptLine
              label="Change"
              value={money(completed.changeCents, store.currency)}
            />
          </div>
          <div className="flex justify-end border-t border-line p-5">
            <Button
              onClick={() => {
                setCompleted(null);
                setSearch("");
              }}
            >
              Start another sale <ShoppingCart size={16} />
            </Button>
          </div>
        </Panel>
      </div>
    );

  return (
    <>
      <PageTitle
        eyebrow="Register 01 · Online"
        title="Point of sale"
        description="Find an item, add it to the basket, and take payment."
      />
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <label className="mb-4 flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-white px-4 shadow-card focus-within:border-forest/50 focus-within:ring-4 focus-within:ring-forest/10">
            <Search size={17} className="text-muted" />
            <input
              autoFocus
              aria-label="Search products by name, SKU or barcode"
              placeholder="Search products or scan a barcode…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-muted"
              >
                Clear
              </button>
            )}
          </label>
          {!visible.length ? (
            <Panel>
              <EmptyState
                title={
                  search ? "No products found" : "No products ready to sell"
                }
                body={
                  search
                    ? "Try another name, SKU, or barcode."
                    : "Add products and stock before opening the register."
                }
              />
            </Panel>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {visible.map((product) => (
                <button
                  key={product.id}
                  onClick={() => add(product)}
                  className="group min-h-[154px] rounded-2xl border border-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-forest/35 hover:shadow-lg hover:shadow-ink/[.04]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid size-10 place-items-center rounded-xl bg-paper text-forest transition group-hover:bg-mint">
                      <ShoppingBag size={17} />
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-semibold ${product.stock <= product.reorderLevel ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-muted"}`}
                    >
                      {product.stock} in stock
                    </span>
                  </div>
                  <span className="mt-4 block truncate text-sm font-semibold">
                    {product.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted">
                    {product.sku} · {product.category}
                  </span>
                  <span className="mt-3 flex items-center justify-between">
                    <span className="text-base font-semibold text-forest">
                      {money(product.priceCents, store.currency)}
                    </span>
                    <span className="grid size-7 place-items-center rounded-full bg-paper text-muted group-hover:bg-forest group-hover:text-white">
                      <Plus size={14} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-4 text-[10px] text-muted">
            Showing up to 60 in-stock products · click an item to add it to the
            basket.
          </p>
        </section>
        <Panel className="sticky top-[86px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-mint text-forest">
                <ShoppingCart size={17} />
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  Current sale
                </span>
                <span className="block text-[10px] text-muted">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items in
                  basket
                </span>
              </span>
            </div>
            <button
              disabled={!cart.length}
              onClick={() => setCart([])}
              className="text-[10px] font-semibold text-muted hover:text-red-600 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          {!cart.length ? (
            <div className="grid min-h-40 place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-paper text-muted">
                  <ShoppingBag size={18} />
                </span>
                <p className="mt-3 text-sm font-semibold">Basket is ready</p>
                <p className="mt-1 text-xs text-muted">
                  Choose products to begin.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[34vh] divide-y divide-line/70 overflow-y-auto px-5">
              {cart.map(({ product, quantity: count }) => (
                <div
                  key={product.id}
                  className="flex items-center gap-2.5 py-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {product.name}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted">
                      {money(product.priceCents, store.currency)} each
                    </span>
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-paper p-1">
                    <button
                      onClick={() => quantity(product.id, -1)}
                      aria-label={`Decrease ${product.name} quantity`}
                      className="grid size-6 place-items-center rounded-md hover:bg-white"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold">
                      {count}
                    </span>
                    <button
                      onClick={() => quantity(product.id, 1)}
                      aria-label={`Increase ${product.name} quantity`}
                      disabled={count >= product.stock}
                      className="grid size-6 place-items-center rounded-md hover:bg-white disabled:opacity-30"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="w-[74px] text-right text-xs font-semibold">
                    {money(product.priceCents * count, store.currency)}
                  </span>
                  <button
                    onClick={() => quantity(product.id, -count)}
                    aria-label={`Remove ${product.name}`}
                    className="grid size-7 place-items-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-line bg-paper/60 px-5 py-4">
            <div className="grid gap-2 text-xs">
              <ReceiptLine
                label="Subtotal"
                value={money(subtotal, store.currency)}
              />
              <ReceiptLine
                label={`Tax (${(store.taxRateBasisPoints / 100).toFixed(2)}%)`}
                value={money(tax, store.currency)}
              />
              <div className="my-1 border-t border-dashed border-line" />
              <ReceiptLine
                label="Total due"
                value={money(total, store.currency)}
                strong
              />
            </div>
            <label className="mt-4 grid gap-1.5 text-[11px] font-semibold">
              Cash received{" "}
              <span className="flex items-center rounded-xl border border-line bg-white px-3 focus-within:border-forest">
                <span className="text-xs text-muted">{store.currency}</span>
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Cash received"
                  value={cash}
                  onChange={(event) => changeCash(event.target.value)}
                  disabled={!cart.length}
                  className="min-h-11 w-full bg-transparent px-2 text-right text-sm outline-none placeholder:text-muted/60"
                />
              </span>
            </label>
            {cashCents >= total && cart.length > 0 && (
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-muted">Change due</span>
                <span className="font-semibold text-forest">
                  {money(cashCents - total, store.currency)}
                </span>
              </div>
            )}
            <Button
              className="mt-4 w-full"
              busy={busy}
              disabled={!cart.length || cashCents < total}
              onClick={checkout}
            >
              Complete cash sale <Check size={16} />
            </Button>
            <p className="mt-2 text-center text-[9px] text-muted">
              Checkout is online and records stock in your store database.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

function ReceiptLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${strong ? "text-base font-semibold" : "text-xs text-muted"}`}
    >
      <span>{label}</span>
      <span className={strong ? "text-ink" : "text-ink/80"}>{value}</span>
    </div>
  );
}
