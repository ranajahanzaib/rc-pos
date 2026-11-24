import { ArrowDownToLine, ArrowRight, ReceiptText, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState, Notice, PageTitle, Panel } from "../components/ui";
import { api, messageOf } from "../lib/api";
import { dateTime, money } from "../lib/format";
import type { Sale, Store } from "../types";

type SaleItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export function Sales({ store }: { store: Store }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    sale: Sale;
    items: SaleItem[];
  } | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ sales: Sale[] }>("/sales")
      .then(({ sales: rows }) => setSales(rows))
      .catch((cause) => setError(messageOf(cause)));
  }, []);
  useEffect(() => {
    if (selected)
      api<{ sale: Sale; items: SaleItem[] }>(
        `/sales/${encodeURIComponent(selected)}`,
      )
        .then(setDetail)
        .catch((cause) => setError(messageOf(cause)));
  }, [selected]);
  const filtered = sales.filter((sale) =>
    sale.receiptNumber.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <PageTitle
        eyebrow="Transactions"
        title="Sales history"
        description="A clear record of every completed checkout, with receipt details when you need them."
      />
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      <Panel className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <h2 className="font-semibold">Completed sales</h2>
            <p className="mt-1 text-xs text-muted">
              Showing the latest 100 receipts.
            </p>
          </div>
          <label className="flex min-h-10 items-center gap-2.5 rounded-xl border border-line bg-paper px-3 sm:w-64">
            <Search size={14} className="text-muted" />
            <input
              aria-label="Search receipts"
              placeholder="Find a receipt"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted/70"
            />
          </label>
        </div>
        {!filtered.length ? (
          <EmptyState
            title={sales.length ? "No receipts match" : "No sales recorded yet"}
            body={
              sales.length
                ? "Try another receipt number."
                : "Completed cash sales will appear here with their receipt details."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-paper/75 text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                <tr>
                  <th className="px-5 py-3.5">Receipt</th>
                  <th className="px-5 py-3.5">Date and time</th>
                  <th className="px-5 py-3.5">Method</th>
                  <th className="px-5 py-3.5 text-right">Subtotal</th>
                  <th className="px-5 py-3.5 text-right">Tax</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => (
                  <tr
                    key={sale.receiptNumber}
                    className={`border-t border-line/70 transition hover:bg-paper/50 ${selected === sale.receiptNumber ? "bg-mint/40" : ""}`}
                  >
                    <td className="px-5 py-4 font-semibold">
                      {sale.receiptNumber}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      {dateTime(sale.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-mint px-2.5 py-1 text-[10px] font-semibold text-forest">
                        Cash
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-xs">
                      {money(sale.subtotalCents, store.currency)}
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-muted">
                      {money(sale.taxCents, store.currency)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {money(sale.totalCents, store.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() =>
                          setSelected(
                            selected === sale.receiptNumber
                              ? null
                              : sale.receiptNumber,
                          )
                        }
                        aria-label={`View receipt ${sale.receiptNumber}`}
                        className="grid size-8 place-items-center rounded-lg hover:bg-white"
                      >
                        <ArrowRight
                          size={15}
                          className={`text-muted transition ${selected === sale.receiptNumber ? "rotate-90" : ""}`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {selected && detail && (
        <Panel className="mt-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-forest">
                Receipt details
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {detail.sale.receiptNumber}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {dateTime(detail.sale.createdAt)}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:bg-paper"
            >
              <ArrowDownToLine size={14} />
              Print receipt
            </button>
          </div>
          <div className="divide-y divide-line/70 px-5">
            {detail.items.map((item, index) => (
              <div
                key={`${item.sku}-${index}`}
                className="flex items-center gap-3 py-3.5"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-paper text-[10px] font-bold text-muted">
                  {item.quantity}×
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-muted">
                    {item.sku} · {money(item.unitPriceCents, store.currency)}{" "}
                    each
                  </span>
                </span>
                <span className="text-sm font-semibold">
                  {money(item.lineTotalCents, store.currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="ml-auto grid w-full max-w-sm gap-2 border-t border-line bg-paper/55 p-5">
            <Total
              label="Subtotal"
              value={money(detail.sale.subtotalCents, store.currency)}
            />
            <Total
              label="Tax"
              value={money(detail.sale.taxCents, store.currency)}
            />
            <Total
              label="Cash received"
              value={money(detail.sale.cashReceivedCents, store.currency)}
            />
            <Total
              label="Change"
              value={money(detail.sale.changeCents, store.currency)}
            />
            <div className="my-1 border-t border-dashed border-line" />
            <Total
              label="Total"
              value={money(detail.sale.totalCents, store.currency)}
              strong
            />
          </div>
        </Panel>
      )}
      {selected && !detail && (
        <Panel className="mt-5 p-5">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ReceiptText size={16} />
            Loading receipt…
          </div>
        </Panel>
      )}
    </>
  );
}

function Total({
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
      className={`flex justify-between ${strong ? "font-semibold" : "text-xs text-muted"}`}
    >
      <span>{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
