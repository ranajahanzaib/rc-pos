import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  PackagePlus,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  EmptyState,
  Field,
  Modal,
  Notice,
  PageTitle,
  Panel,
  SelectField,
} from "../components/ui";
import { api, messageOf } from "../lib/api";
import { dateTime, money } from "../lib/format";
import type { Product, Store } from "../types";

type Movement = {
  id: string;
  quantityDelta: number;
  reason: string;
  reference: string | null;
  createdAt: string;
  productName: string;
  sku: string;
  userName: string;
};
const reasons: Record<string, string> = {
  received: "Stock received",
  counted: "Stock count correction",
  damaged: "Damaged or lost",
  returned: "Customer return",
  other: "Other adjustment",
  sale: "Sale",
  "opening stock": "Opening stock",
};

export function Inventory({ store }: { store: Store }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [query, setQuery] = useState("");
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("received");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    const result = await api<{ products: Product[]; movements: Movement[] }>(
      "/inventory",
    );
    setProducts(result.products);
    setMovements(result.movements);
  }
  useEffect(() => {
    load().catch((cause) => setError(messageOf(cause)));
  }, []);
  const filtered = products.filter((product) =>
    `${product.name} ${product.sku}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const lowCount = products.filter(
    (product) => product.stock <= product.reorderLevel,
  ).length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!adjusting) return;
    const amount = Math.abs(Number(quantity));
    if (!amount || !Number.isInteger(amount)) {
      setError("Enter a whole number greater than zero.");
      return;
    }
    const quantityDelta =
      reason === "damaged"
        ? -amount
        : reason === "counted"
          ? amount - adjusting.stock
          : amount;
    if (quantityDelta === 0) {
      setError("The adjustment cannot be zero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/inventory/adjustments", {
        method: "POST",
        body: JSON.stringify({
          productId: adjusting.id,
          quantityDelta,
          reason,
        }),
      });
      await load();
      setAdjusting(null);
      setQuantity("");
      setNotice("Inventory adjustment recorded.");
      window.setTimeout(() => setNotice(""), 3500);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="Stockroom"
        title="Inventory"
        description="Every adjustment has a reason. Every sale keeps its own stock trail."
        action={
          <Button
            onClick={() => {
              setAdjusting(products[0] ?? null);
              setError("");
            }}
            disabled={!products.length}
          >
            <Plus size={16} />
            Adjust stock
          </Button>
        }
      />
      {error && !adjusting && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Notice tone="success">{notice}</Notice>
        </div>
      )}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Summary
          label="Tracked products"
          value={String(products.length).padStart(2, "0")}
          icon={Boxes}
        />
        <Summary
          label="Needs replenishing"
          value={String(lowCount).padStart(2, "0")}
          icon={PackagePlus}
          highlight={lowCount > 0}
        />
        <Summary
          label="Recent movements"
          value={String(movements.length).padStart(2, "0")}
          icon={ClipboardList}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-5">
            <div>
              <h2 className="font-semibold">On hand</h2>
              <p className="mt-1 text-xs text-muted">
                Products below their reorder point are highlighted.
              </p>
            </div>
            <span className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-semibold text-muted">
              {products.length} items
            </span>
          </div>
          <div className="border-b border-line p-4">
            <label className="flex min-h-10 items-center gap-2.5 rounded-xl border border-line bg-paper px-3">
              <Search size={14} className="text-muted" />
              <input
                aria-label="Filter inventory"
                placeholder="Find a product"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted/70"
              />
            </label>
          </div>
          {!filtered.length ? (
            <EmptyState
              title="No products yet"
              body="Add products to the catalog and they will appear here."
            />
          ) : (
            <div className="divide-y divide-line/70 px-5">
              {filtered.map((product) => {
                const low = product.stock <= product.reorderLevel;
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 py-4"
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-xl ${low ? "bg-amber-50 text-amber-700" : "bg-paper text-forest"}`}
                    >
                      <PackagePlus size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted">
                        {product.sku} · {product.category}
                      </span>
                    </span>
                    <span className="text-right">
                      <span
                        className={`block text-sm font-semibold ${low ? "text-amber-700" : "text-ink"}`}
                      >
                        {product.stock} units
                      </span>
                      <span className="text-[10px] text-muted">
                        {low
                          ? "reorder soon"
                          : `${money(product.costCents * product.stock, store.currency)} at cost`}
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        setAdjusting(product);
                        setError("");
                      }}
                      aria-label={`Adjust ${product.name} stock`}
                      className="ml-1 rounded-lg border border-line px-2.5 py-2 text-[10px] font-semibold text-muted hover:bg-paper hover:text-ink"
                    >
                      Adjust
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-line px-5 py-5">
            <h2 className="font-semibold">Movement history</h2>
            <p className="mt-1 text-xs text-muted">
              Recent stock changes, newest first.
            </p>
          </div>
          {!movements.length ? (
            <EmptyState
              title="No movements yet"
              body="Opening stock, sales, and manual adjustments will be recorded here."
            />
          ) : (
            <div className="divide-y divide-line/70 px-5">
              {movements.map((movement) => (
                <div key={movement.id} className="flex items-start gap-3 py-4">
                  <span
                    className={`mt-0.5 grid size-8 place-items-center rounded-full ${movement.quantityDelta > 0 ? "bg-mint text-forest" : "bg-orange-50 text-orange-700"}`}
                  >
                    {movement.quantityDelta > 0 ? (
                      <ArrowDownLeft size={15} />
                    ) : (
                      <ArrowUpRight size={15} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {movement.productName}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      {reasons[movement.reason] ?? movement.reason} ·{" "}
                      {movement.userName}
                    </span>
                    <span className="mt-1 block text-[9px] text-muted/80">
                      {dateTime(movement.createdAt)}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-semibold ${movement.quantityDelta > 0 ? "text-forest" : "text-orange-700"}`}
                  >
                    {movement.quantityDelta > 0 ? "+" : ""}
                    {movement.quantityDelta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      {adjusting && (
        <Modal title="Adjust stock" onClose={() => setAdjusting(null)}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[.13em] text-muted">
                Selected product
              </p>
              <p className="mt-1 font-semibold">{adjusting.name}</p>
              <p className="mt-1 text-xs text-muted">
                {adjusting.sku} · currently {adjusting.stock} units
              </p>
            </div>
            <SelectField
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="received">Stock received</option>
              <option value="counted">Count correction</option>
              <option value="damaged">Damaged or lost</option>
              <option value="returned">Customer return</option>
              <option value="other">Other</option>
            </SelectField>
            <Field
              label={reason === "counted" ? "New counted quantity" : "Quantity"}
              type="number"
              min="0"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              hint={
                reason === "damaged"
                  ? "This quantity will be deducted from on hand."
                  : reason === "counted"
                    ? "Enter the new physical count. The difference is recorded."
                    : "This quantity will be added to on hand."
              }
            />
            {error && <Notice>{error}</Notice>}
            <div className="mt-2 flex justify-end gap-2 border-t border-line pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAdjusting(null)}
              >
                Cancel
              </Button>
              <Button type="submit" busy={busy}>
                Record adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: typeof Boxes;
  highlight?: boolean;
}) {
  return (
    <Panel className="flex items-center gap-4 p-5">
      <span
        className={`grid size-11 place-items-center rounded-2xl ${highlight ? "bg-amber-50 text-amber-700" : "bg-mint text-forest"}`}
      >
        <Icon size={20} />
      </span>
      <span>
        <span className="block text-xs text-muted">{label}</span>
        <span className="mt-1 block text-2xl font-semibold tracking-tight">
          {value}
        </span>
      </span>
    </Panel>
  );
}
