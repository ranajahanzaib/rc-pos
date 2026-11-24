import {
  Activity,
  ChevronDown,
  CircleHelp,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Brand } from "../pages/AuthPage";
import type { Store as StoreType, User } from "../types";

const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/checkout", label: "Point of sale", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Activity },
  { to: "/sales", label: "Sales history", icon: ShoppingBag },
];

export function Shell({
  store,
  user,
  onSignOut,
}: {
  store: StoreType;
  user: User;
  onSignOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const current =
    navigation.find((item) => item.to === location.pathname)?.label ??
    "Store settings";

  async function signOut() {
    await api("/logout", { method: "POST" }).catch(() => undefined);
    onSignOut();
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-ink px-4 py-5 text-white lg:flex">
        <div className="px-2">
          <Brand light />
        </div>
        <button
          onClick={() => navigate("/checkout")}
          className="mt-9 flex items-center gap-3 rounded-2xl bg-forest px-4 py-3.5 text-left shadow-lg shadow-black/10 transition hover:bg-forest-light"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-white/15">
            <ShoppingCart size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">New sale</span>
            <span className="mt-0.5 block text-[11px] text-white/65">
              Start a checkout
            </span>
          </span>
          <span className="text-white/50">↗</span>
        </button>
        <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/35">
          Workspace
        </p>
        <nav className="grid gap-1" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition ${isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/[.06] hover:text-white/90"}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <span className="size-1.5 rounded-full bg-[#9dd4b2]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/35">
          Manage
        </p>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition ${isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/[.06] hover:text-white/90"}`
          }
        >
          <Settings2 size={17} />
          <span className="flex-1">Store settings</span>
        </NavLink>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-[#9dd4b2] text-xs font-bold text-ink">
              {user.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">
                {user.name}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-white/40">
                {user.email}
              </span>
            </span>
          </div>
          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] text-white/45 hover:bg-white/5 hover:text-white/80"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            onClick={(event) => event.stopPropagation()}
            className="flex h-full w-[min(84vw,300px)] flex-col bg-ink px-4 py-5 text-white"
          >
            <div className="flex items-center justify-between px-2">
              <Brand light />
              <button
                className="text-white/65"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X />
              </button>
            </div>
            <nav className="mt-8 grid gap-1">
              {navigation.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${isActive ? "bg-white/10 text-white" : "text-white/60"}`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <NavLink
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60"
            >
              <Settings2 size={18} />
              Store settings
            </NavLink>
          </aside>
        </div>
      )}
      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-[70px] items-center gap-4 border-b border-line/80 bg-paper/90 px-4 backdrop-blur-xl sm:px-8">
          <button
            className="grid size-9 place-items-center rounded-xl border border-line bg-white lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
            <span>Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-ink">{current}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-muted md:flex">
              <Search size={14} />
              <span>Online and ready</span>
              <span className="ml-1 size-1.5 rounded-full bg-forest" />
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="flex max-w-[190px] items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-white"
            >
              <span className="grid size-8 place-items-center rounded-full bg-mint text-xs font-bold text-forest">
                {store.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-xs font-semibold">
                  {store.name}
                </span>
                <span className="block text-[10px] text-muted">
                  {store.currency} register
                </span>
              </span>
              <ChevronDown size={13} className="hidden text-muted sm:block" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1480px] px-4 pb-12 pt-7 sm:px-8 sm:pt-9">
          <Outlet />
        </main>
        <footer className="flex items-center justify-between border-t border-line/70 px-4 py-4 text-[10px] text-muted sm:px-8">
          <span className="flex items-center gap-1.5">
            <Command size={11} /> RC-PoS · Store operations
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <CircleHelp size={12} /> Online mode
          </span>
        </footer>
      </div>
    </div>
  );
}
