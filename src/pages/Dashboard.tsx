import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock3,
  Package,
  Plus,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyState, Notice, PageTitle, Panel } from "../components/ui";
import { api, messageOf } from "../lib/api";
import { dateTime, money, shortDate } from "../lib/format";
import type { Sale, Store } from "../types";

type DashboardData = {
  today: { count: number; total: number };
  products: number;
  lowStock: number;
  recentSales: Sale[];
  trend: { day: string; totalCents: number }[];
};

export function Dashboard({ store }: { store: Store }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<DashboardData>("/dashboard")
      .then(setData)
      .catch((cause) => setError(messageOf(cause)));
  }, []);

  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return {
      day: key,
      amount: data?.trend.find((item) => item.day === key)?.totalCents ?? 0,
    };
  });
  const chartMax = Math.max(...days.map((day) => day.amount), 1);
  const weekTotal = days.reduce((sum, day) => sum + day.amount, 0);

  return (
    <>
      <PageTitle
        eyebrow="Store overview"
        title="A good day to do business."
        description="Here’s what’s happening across your store today."
        action={
          <Link
            to="/checkout"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forest-dark"
          >
            <Plus size={16} />
            New sale
          </Link>
        }
      />
      {error && (
        <div className="mb-5">
          <Notice>{error}</Notice>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Sales today"
          value={data ? money(data.today.total, store.currency) : "—"}
          note={`${data?.today.count ?? 0} completed transactions`}
          icon={CircleDollarSign}
          tone="green"
        />
        <Metric
          label="Transactions"
          value={data ? String(data.today.count).padStart(2, "0") : "—"}
          note="Completed today"
          icon={ShoppingBag}
          tone="blue"
        />
        <Metric
          label="Active products"
          value={data ? String(data.products).padStart(2, "0") : "—"}
          note="In your catalog"
          icon={Package}
          tone="peach"
        />
        <Metric
          label="Needs a look"
          value={data ? String(data.lowStock).padStart(2, "0") : "—"}
          note="Items at or below reorder level"
          icon={TriangleAlert}
          tone="yellow"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-2 pt-5 sm:px-7 sm:pt-7">
            <div>
              <p className="text-xs font-medium text-muted">Sales activity</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {money(weekTotal, store.currency)}
                <span className="ml-2 text-sm font-normal text-muted">
                  this week
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-[11px] font-semibold text-forest">
              <span className="size-1.5 rounded-full bg-forest" /> Live data
            </div>
          </div>
          <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
            <div className="flex h-52 items-end gap-2 border-b border-dashed border-line px-1 sm:gap-4">
              {days.map((day, index) => (
                <div
                  key={day.day}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div
                    className="relative w-full max-w-12 rounded-t-lg bg-mint transition-colors group-hover:bg-forest/25"
                    style={{
                      height: `${Math.max(day.amount === 0 ? 2 : 9, (day.amount / chartMax) * 100)}%`,
                    }}
                    title={money(day.amount, store.currency)}
                  />
                  <span className="pb-2 text-[10px] text-muted">
                    {index === 6 ? "Today" : shortDate(day.day)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold">Stock to watch</h2>
              <p className="mt-1 text-xs text-muted">
                A little attention goes a long way.
              </p>
            </div>
            <Link
              to="/inventory"
              className="grid size-9 place-items-center rounded-xl bg-paper text-muted hover:text-forest"
            >
              <Boxes size={17} />
            </Link>
          </div>
          {!data?.lowStock ? (
            <EmptyState
              title="Stock is looking good"
              body="No products are currently at or below their reorder level."
            />
          ) : (
            <LowStockList />
          )}
        </Panel>
      </div>

      <Panel className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-semibold">Recent sales</h2>
            <p className="mt-1 text-xs text-muted">
              Your latest completed checkouts.
            </p>
          </div>
          <Link
            to="/sales"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest-dark"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {data?.recentSales.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-paper/75 text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                <tr>
                  <th className="px-6 py-3">Receipt</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Payment</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((sale) => (
                  <tr
                    key={sale.receiptNumber}
                    className="border-t border-line/70 hover:bg-paper/50"
                  >
                    <td className="px-6 py-4 font-semibold">
                      {sale.receiptNumber}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {dateTime(sale.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-mint px-2.5 py-1 text-[10px] font-semibold text-forest">
                        Cash
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      {money(sale.totalCents, store.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <Clock3 size={15} className="ml-auto text-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Your first sale is waiting"
            body="Once you make a sale, it will show up here alongside your daily activity."
            action={
              <Link to="/checkout">
                <Button variant="secondary">
                  Open the register <ArrowRight size={15} />
                </Button>
              </Link>
            }
          />
        )}
      </Panel>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <QuickLink
          to="/checkout"
          icon={ShoppingBag}
          label="Start a checkout"
          detail="Ring up a customer"
        />
        <QuickLink
          to="/products"
          icon={Package}
          label="Add a product"
          detail="Grow your catalog"
        />
        <QuickLink
          to="/inventory"
          icon={Boxes}
          label="Adjust inventory"
          detail="Keep counts current"
        />
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof CircleDollarSign;
  tone: string;
}) {
  const palette: Record<string, string> = {
    green: "bg-mint text-forest",
    blue: "bg-blue-50 text-blue-700",
    peach: "bg-orange-50 text-orange-700",
    yellow: "bg-amber-50 text-amber-700",
  };
  return (
    <Panel className="p-5 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-3 text-[26px] font-semibold tracking-tight text-ink">
            {value}
          </p>
        </div>
        <span
          className={`grid size-10 place-items-center rounded-xl ${palette[tone]}`}
        >
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
        <span className="grid size-4 place-items-center rounded-full bg-mint text-forest">
          {tone === "yellow" ? (
            <ArrowDownRight size={11} />
          ) : (
            <ArrowUpRight size={11} />
          )}
        </span>
        {note}
      </p>
    </Panel>
  );
}

function LowStockList() {
  const [items, setItems] = useState<
    {
      id: string;
      name: string;
      sku: string;
      stock: number;
      reorderLevel: number;
    }[]
  >([]);
  useEffect(() => {
    api<{ products: typeof items }>("/inventory")
      .then(({ products }) =>
        setItems(
          products
            .filter((product) => product.stock <= product.reorderLevel)
            .slice(0, 4),
        ),
      )
      .catch(() => undefined);
  }, []);
  return (
    <div className="divide-y divide-line/70 px-5 sm:px-6">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Package size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {item.name}
            </span>
            <span className="mt-0.5 block text-[10px] text-muted">
              SKU {item.sku}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-sm font-semibold text-amber-700">
              {item.stock} left
            </span>
            <span className="text-[10px] text-muted">
              reorder at {item.reorderLevel}
            </span>
          </span>
        </div>
      ))}
      <Link
        to="/inventory"
        className="flex items-center justify-between py-4 text-xs font-semibold text-forest"
      >
        Review inventory <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
  detail,
}: {
  to: string;
  icon: typeof Package;
  label: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-forest/20"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-paper text-forest transition group-hover:bg-mint">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted">{detail}</span>
      </span>
      <ArrowRight
        size={15}
        className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-forest"
      />
    </Link>
  );
}
