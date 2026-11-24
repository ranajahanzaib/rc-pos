import {
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Store,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Field, Notice, SelectField } from "../components/ui";
import { api, messageOf } from "../lib/api";
import { generateAccessKey } from "../lib/keys";

export function AuthPage({
  configured,
  onComplete,
}: {
  configured: boolean;
  onComplete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    storeName: "",
    currency: "USD",
    taxRatePercent: "0",
    name: "",
    email: "",
  });
  const [accessKey, setAccessKey] = useState(generateAccessKey);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (configured)
        await api("/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, accessKey }),
        });
      else
        await api("/setup", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            taxRatePercent: Number(form.taxRatePercent),
            accessKey,
          }),
        });
      await onComplete();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page min-h-screen bg-paper p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-line bg-white shadow-xl lg:grid-cols-[1fr_.9fr]">
        <section className="flex flex-col justify-between bg-ink px-7 py-8 text-white sm:px-12 sm:py-12">
          <Brand light />
          <div className="my-16 max-w-lg">
            <p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-[#9dd4b2]">
              A calmer kind of checkout
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Good business
              <br />
              starts with a<br />
              <span className="text-[#9dd4b2]">clear picture.</span>
            </h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-white/65">
              A thoughtful, dependable point of sale for the people who keep
              independent retail moving.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/45">
            <span className="size-2 rounded-full bg-[#9dd4b2]" /> Securely
            hosted on Cloudflare
          </div>
        </section>
        <section className="flex items-center justify-center px-6 py-12 sm:px-12">
          <form onSubmit={submit} className="w-full max-w-md">
            <div className="mb-7 grid size-12 place-items-center rounded-2xl bg-mint text-forest">
              {configured ? <LockKeyhole size={21} /> : <Store size={21} />}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-forest">
              {configured ? "Welcome back" : "First time setup"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {configured ? "Sign in to your store" : "Let’s set up shop."}
            </h2>
            <p className="mt-2 mb-7 text-sm leading-6 text-muted">
              {configured
                ? "Enter your details to open the register."
                : "Create your store and administrator account. This setup is only available once."}
            </p>
            {!configured && (
              <>
                <Field
                  label="Store name"
                  placeholder="e.g. Good Goods Market"
                  autoComplete="organization"
                  required
                  minLength={2}
                  value={form.storeName}
                  onChange={(e) =>
                    setForm({ ...form, storeName: e.target.value })
                  }
                />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <SelectField
                    label="Currency"
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                  >
                    {[
                      ["USD", "US dollar"],
                      ["PKR", "Pakistani rupee"],
                      ["GBP", "Pound sterling"],
                      ["EUR", "Euro"],
                      ["CAD", "Canadian dollar"],
                      ["AUD", "Australian dollar"],
                      ["INR", "Indian rupee"],
                      ["AED", "UAE dirham"],
                    ].map(([code, name]) => (
                      <option key={code} value={code}>
                        {code} · {name}
                      </option>
                    ))}
                  </SelectField>
                  <Field
                    label="Tax rate (%)"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.taxRatePercent}
                    onChange={(e) =>
                      setForm({ ...form, taxRatePercent: e.target.value })
                    }
                  />
                </div>
                <div className="my-6 h-px bg-line" />
                <Field
                  label="Your name"
                  placeholder="Name on receipts"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </>
            )}
            <Field
              className="mt-4"
              label="Email address"
              type="email"
              placeholder="you@yourstore.com"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {!configured && (
              <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint text-forest">
                    <KeyRound size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">
                      Your private access key
                    </span>
                    <span className="mt-1 block text-[10px] leading-4 text-muted">
                      Save this key somewhere safe. You’ll use it with your
                      email to sign in again.
                    </span>
                  </span>
                </div>
                <code className="mt-3 block break-all rounded-xl border border-line bg-white px-3 py-2.5 font-mono text-[11px] leading-5 text-ink">
                  {accessKey}
                </code>
                <div className="mt-2 flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccessKey(generateAccessKey());
                      setCopied(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-muted hover:bg-white"
                  >
                    <RefreshCw size={12} />
                    Generate another
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(accessKey);
                        setCopied(true);
                      } catch {
                        setError(
                          "Clipboard access is unavailable. Select and copy the key above before continuing.",
                        );
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-forest hover:bg-white"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy key"}
                  </button>
                </div>
              </div>
            )}
            {configured && (
              <Field
                className="mt-4"
                label="Access key"
                type="password"
                placeholder="Paste your saved access key"
                autoComplete="current-password"
                required
                minLength={40}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
            )}
            {error && (
              <div className="mt-4">
                <Notice>{error}</Notice>
              </div>
            )}
            <Button type="submit" busy={busy} className="mt-6 w-full">
              {configured ? "Sign in" : "Create my store"}
              <ArrowRight size={16} />
            </Button>
            {!configured && (
              <p className="mt-4 text-center text-xs leading-5 text-muted">
                This random key is stored only as a one-way hash. Store setup
                cannot be repeated after this account is created.
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

export function Brand({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-10 place-items-center rounded-xl ${light ? "bg-[#9dd4b2] text-ink" : "bg-forest text-white"}`}
      >
        <Store size={19} strokeWidth={2.3} />
      </span>
      <span
        className={`font-semibold tracking-tight ${compact ? "text-base" : "text-lg"} ${light ? "text-white" : "text-ink"}`}
      >
        RC<span className={light ? "text-[#9dd4b2]" : "text-forest"}>·</span>PoS
      </span>
    </div>
  );
}
