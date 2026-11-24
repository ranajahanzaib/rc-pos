import {
  Check,
  CircleDollarSign,
  Copy,
  Info,
  KeyRound,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  Field,
  Modal,
  Notice,
  PageTitle,
  Panel,
} from "../components/ui";
import { api, messageOf } from "../lib/api";
import { generateAccessKey } from "../lib/keys";
import type { Store as StoreType } from "../types";

export function Settings({
  store,
  onSaved,
}: {
  store: StoreType;
  onSaved: (store: StoreType) => void;
}) {
  const [name, setName] = useState(store.name);
  const [currency, setCurrency] = useState(store.currency);
  const [tax, setTax] = useState((store.taxRateBasisPoints / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [keyModal, setKeyModal] = useState(false);
  const [currentKey, setCurrentKey] = useState("");
  const [newKey, setNewKey] = useState(generateAccessKey);
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyRotated, setKeyRotated] = useState(false);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState("");
  useEffect(() => {
    setName(store.name);
    setCurrency(store.currency);
    setTax((store.taxRateBasisPoints / 100).toFixed(2));
  }, [store]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const taxRatePercent = Number(tax);
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({ name, currency, taxRatePercent }),
      });
      onSaved({
        name,
        currency: currency.toUpperCase(),
        taxRateBasisPoints: Math.round(taxRatePercent * 100),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3500);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function rotateKey(event: FormEvent) {
    event.preventDefault();
    setKeyBusy(true);
    setKeyError("");
    try {
      await api("/access-key/rotate", {
        method: "POST",
        body: JSON.stringify({
          currentAccessKey: currentKey,
          newAccessKey: newKey,
        }),
      });
      setKeyRotated(true);
      setKeyCopied(false);
      setCurrentKey("");
    } catch (cause) {
      setKeyError(messageOf(cause));
    } finally {
      setKeyBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="Your workspace"
        title="Store settings"
        description="A few store details keep your register and reports in step."
      />
      {saved && (
        <div className="mb-4">
          <Notice tone="success">Your store settings have been saved.</Notice>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Panel className="overflow-hidden">
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <h2 className="font-semibold">Store profile</h2>
            <p className="mt-1 text-xs text-muted">
              Used throughout the sales workspace.
            </p>
          </div>
          <form onSubmit={submit} className="grid gap-5 p-5 sm:p-7">
            <Field
              label="Store name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Currency code"
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value.toUpperCase().slice(0, 3))
                }
                required
                minLength={3}
                maxLength={3}
                hint="A three-letter ISO currency code, such as USD or PKR."
              />
              <Field
                label="Sales tax rate (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                required
                hint="Applied to each sale. Set to zero if tax is not collected."
              />
            </div>
            <div className="flex justify-end border-t border-line pt-4">
              <Button type="submit" busy={busy}>
                <Save size={15} />
                Save settings
              </Button>
            </div>
          </form>
        </Panel>
        <div className="grid gap-4">
          <Panel className="p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-mint text-forest">
              <ShieldCheck size={19} />
            </span>
            <h2 className="mt-4 font-semibold">Protected by design</h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              Your 256-bit access key is stored only as a one-way hash. Sign-in
              sessions are HTTP-only and expire after two weeks.
            </p>
            <button
              onClick={() => {
                setKeyModal(true);
                setKeyRotated(false);
                setKeyError("");
                setCurrentKey("");
                setNewKey(generateAccessKey());
                setKeyCopied(false);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-forest hover:bg-mint"
            >
              <KeyRound size={14} />
              Rotate access key
            </button>
          </Panel>
          <Panel className="p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <CircleDollarSign size={19} />
            </span>
            <h2 className="mt-4 font-semibold">One currency per store</h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              Past receipts keep their recorded amounts. Updating your currency
              changes how current product prices and future sales are displayed.
            </p>
          </Panel>
          <Panel className="flex gap-3 bg-amber-50/70 p-4">
            <Info size={17} className="mt-0.5 shrink-0 text-amber-700" />
            <p className="text-[11px] leading-5 text-amber-900">
              Online mode is enabled. Checkout requires a connection to your
              Cloudflare deployment. Card processing and offline sales are not
              configured.
            </p>
          </Panel>
        </div>
      </div>
      {keyModal && (
        <Modal
          title={keyRotated ? "Key rotated" : "Rotate access key"}
          onClose={() => setKeyModal(false)}
        >
          {keyRotated ? (
            <div>
              <Notice tone="success">
                Your new access key is active. Save it before closing this
                window.
              </Notice>
              <code className="mt-4 block break-all rounded-xl border border-line bg-white px-3 py-3 font-mono text-xs leading-5">
                {newKey}
              </code>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(newKey);
                      setKeyCopied(true);
                    } catch {
                      setKeyError(
                        "Clipboard access is unavailable. Select and copy the key above.",
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-forest hover:bg-white"
                >
                  {keyCopied ? <Check size={13} /> : <Copy size={13} />}
                  {keyCopied ? "Copied" : "Copy key"}
                </button>
              </div>
              {keyError && (
                <div className="mt-3">
                  <Notice>{keyError}</Notice>
                </div>
              )}
              <div className="mt-5 flex justify-end border-t border-line pt-4">
                <Button onClick={() => setKeyModal(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={rotateKey} className="grid gap-4">
              <p className="text-sm leading-6 text-muted">
                Create a fresh sign-in key. Your current key stops working as
                soon as the new one is saved.
              </p>
              <Field
                label="Current access key"
                type="password"
                autoComplete="current-password"
                required
                minLength={40}
                value={currentKey}
                onChange={(e) => setCurrentKey(e.target.value)}
              />
              <div className="rounded-xl border border-line bg-paper p-3">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                  New key · save after rotating
                </p>
                <code className="mt-2 block break-all font-mono text-[11px] leading-5">
                  {newKey}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(newKey);
                      setKeyCopied(true);
                    } catch {
                      setKeyError(
                        "Clipboard access is unavailable. Select and copy the key above.",
                      );
                    }
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-forest hover:bg-white"
                >
                  {keyCopied ? <Check size={12} /> : <Copy size={12} />}
                  {keyCopied ? "Copied" : "Copy new key"}
                </button>
              </div>
              {keyError && <Notice>{keyError}</Notice>}
              <div className="mt-1 flex justify-end gap-2 border-t border-line pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setKeyModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" busy={keyBusy}>
                  Rotate key
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
