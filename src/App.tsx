import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { Notice } from "./components/ui";
import { api, messageOf } from "./lib/api";
import { AuthPage } from "./pages/AuthPage";
import { Checkout } from "./pages/Checkout";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Products } from "./pages/Products";
import { Sales } from "./pages/Sales";
import { Settings } from "./pages/Settings";
import type { Store, User } from "./types";

type SessionResponse = { user: User | null; store: Store | null };
type BootstrapResponse = { configured: boolean; store: Store | null };

export function App() {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const bootstrap = await api<BootstrapResponse>("/bootstrap");
      setConfigured(bootstrap.configured);
      if (!bootstrap.configured) {
        setUser(null);
        setStore(null);
        return;
      }
      const session = await api<SessionResponse>("/session");
      setUser(session.user);
      setStore(session.store);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  function signOut() {
    setUser(null);
  }
  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 text-sm text-muted shadow-card">
          <span className="size-2 animate-pulse rounded-full bg-forest" />
          Opening your workspace…
        </div>
      </div>
    );
  if (error && !store)
    return (
      <div className="mx-auto grid min-h-screen max-w-md content-center gap-4 p-6">
        <h1 className="text-2xl font-semibold">Can’t reach your store yet</h1>
        <Notice>{error}</Notice>
        <button
          className="w-fit text-sm font-semibold text-forest"
          onClick={() => {
            setReady(false);
            void refresh();
          }}
        >
          Try again
        </button>
      </div>
    );
  if (!configured || !user || !store)
    return <AuthPage configured={configured} onComplete={refresh} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={<Shell store={store} user={user} onSignOut={signOut} />}
        >
          <Route index element={<Dashboard store={store} />} />
          <Route path="checkout" element={<Checkout store={store} />} />
          <Route path="products" element={<Products store={store} />} />
          <Route path="inventory" element={<Inventory store={store} />} />
          <Route path="sales" element={<Sales store={store} />} />
          <Route
            path="settings"
            element={<Settings store={store} onSaved={setStore} />}
          />
          <Route path="*" element={<Dashboard store={store} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
