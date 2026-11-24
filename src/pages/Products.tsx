import { Archive, ArrowDownUp, Package, Plus, Search, Tag } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Button,
  EmptyState,
  Field,
  Modal,
  Notice,
  PageTitle,
  Panel,
} from "../components/ui";
import { api, messageOf } from "../lib/api";
import { centsFromInput, money } from "../lib/format";
import type { Product, Store } from "../types";

const blankProduct = {
  name: "",
  sku: "",
  barcode: "",
  category: "General",
  price: "",
  cost: "",
  initialStock: "0",
  reorderLevel: "5",
};

export function Products({ store }: { store: Store }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(blankProduct);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const result = await api<{ products: Product[] }>(
      `/products?inactive=${showInactive ? "1" : "0"}`,
    );
    setProducts(result.products);
  }
  useEffect(() => {
    load().catch((cause) => setError(messageOf(cause)));
  }, [showInactive]);
  const visible = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.sku} ${product.barcode ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [products, search],
  );

  function openCreate() {
    setEditing(null);
    setForm(blankProduct);
    setError("");
    setModal(true);
  }
  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      category: product.category,
      price: (product.priceCents / 100).toFixed(2),
      cost: (product.costCents / 100).toFixed(2),
      initialStock: String(product.stock),
      reorderLevel: String(product.reorderLevel),
    });
    setError("");
    setModal(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || null,
      category: form.category,
      priceCents: centsFromInput(form.price),
      costCents: centsFromInput(form.cost || "0"),
      reorderLevel: Number(form.reorderLevel),
    };
    try {
      if (editing)
        await api(`/products/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, active: Boolean(editing.active) }),
        });
      else
        await api("/products", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            initialStock: Number(form.initialStock),
          }),
        });
      await load();
      setModal(false);
      setNotice(
        editing ? "Product details updated." : "Product added to your catalog.",
      );
      window.setTimeout(() => setNotice(""), 3500);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(product: Product) {
    try {
      await api(`/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          priceCents: product.priceCents,
          costCents: product.costCents,
          reorderLevel: product.reorderLevel,
          active: !product.active,
        }),
      });
      await load();
      setNotice(
        product.active
          ? "Product archived from the active catalog."
          : "Product restored to the catalog.",
      );
      window.setTimeout(() => setNotice(""), 3500);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="The catalog"
        title="Products"
        description="Keep the details tidy and the checkout stays quick."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add product
          </Button>
        }
      />
      {error && !modal && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Notice tone="success">{notice}</Notice>
        </div>
      )}
      <Panel className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-5">
          <label className="flex min-h-10 min-w-0 items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 sm:w-80">
            <Search size={15} className="shrink-0 text-muted" />
            <input
              aria-label="Search products"
              placeholder="Search by name, SKU or barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted/70"
            />
            {search && (
              <button
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="text-muted"
              >
                ×
              </button>
            )}
          </label>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs font-medium sm:self-auto ${showInactive ? "bg-mint text-forest" : "text-muted hover:bg-paper"}`}
          >
            <Archive size={14} />
            {showInactive ? "Showing archived" : "Include archived"}
          </button>
        </div>
        {!visible.length ? (
          <EmptyState
            title={search ? "No matching products" : "Your catalog is ready"}
            body={
              search
                ? "Try a different name, SKU, or barcode."
                : "Add your first product to start selling and tracking stock."
            }
            action={
              !search && (
                <Button onClick={openCreate}>
                  <Plus size={15} />
                  Add your first product
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-paper/75 text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">SKU / barcode</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5 text-right">Price</th>
                  <th className="px-5 py-3.5 text-right">On hand</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-line/70 transition hover:bg-paper/40"
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openEdit(product)}
                        className="flex items-center gap-3 text-left"
                      >
                        <span className="grid size-10 place-items-center rounded-xl bg-paper text-forest">
                          <Package size={17} />
                        </span>
                        <span>
                          <span className="block font-semibold text-ink">
                            {product.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted">
                            Cost {money(product.costCents, store.currency)}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="block text-xs font-semibold">
                        {product.sku}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted">
                        {product.barcode || "No barcode"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-[10px] font-medium text-muted">
                        <Tag size={11} />
                        {product.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {money(product.priceCents, store.currency)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`font-semibold ${product.stock <= product.reorderLevel ? "text-amber-700" : "text-ink"}`}
                      >
                        {product.stock}
                      </span>
                      <span className="ml-1 text-[10px] text-muted">units</span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${product.active ? "bg-mint text-forest" : "bg-slate-100 text-slate-500"}`}
                      >
                        {product.active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="rounded-lg px-2.5 py-2 text-[11px] font-semibold text-muted hover:bg-paper hover:text-ink"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(product)}
                          title={
                            product.active
                              ? "Archive product"
                              : "Restore product"
                          }
                          className="rounded-lg p-2 text-muted hover:bg-paper hover:text-ink"
                        >
                          <ArrowDownUp size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line bg-paper/45 px-5 py-3 text-[10px] text-muted">
          <span>
            {visible.length} {visible.length === 1 ? "product" : "products"}
          </span>
          <span>Stock is updated from each sale and adjustment.</span>
        </div>
      </Panel>
      {modal && (
        <Modal
          title={editing ? "Edit product" : "Add a product"}
          onClose={() => setModal(false)}
        >
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              label="Product name"
              placeholder="e.g. House blend coffee"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Field
              label="SKU"
              placeholder="COF-001"
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
            <Field
              label="Barcode"
              placeholder="Optional"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
            <Field
              label="Category"
              placeholder="General"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Field
              label={`Price (${store.currency})`}
              placeholder="0.00"
              inputMode="decimal"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Field
              label={`Unit cost (${store.currency})`}
              placeholder="0.00"
              inputMode="decimal"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
            {editing ? (
              <Field
                label="Reorder when stock reaches"
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm({ ...form, reorderLevel: e.target.value })
                }
              />
            ) : (
              <Field
                label="Starting stock"
                type="number"
                min="0"
                value={form.initialStock}
                onChange={(e) =>
                  setForm({ ...form, initialStock: e.target.value })
                }
              />
            )}
            {!editing && (
              <Field
                label="Reorder when stock reaches"
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm({ ...form, reorderLevel: e.target.value })
                }
              />
            )}
            {error && (
              <div className="sm:col-span-2">
                <Notice>{error}</Notice>
              </div>
            )}
            <div className="mt-2 flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" busy={busy}>
                {editing ? "Save changes" : "Add product"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
