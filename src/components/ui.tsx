import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger"; busy?: boolean };

export function Button({ children, className = "", variant = "primary", busy = false, disabled, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-forest text-white shadow-sm hover:bg-forest-dark disabled:bg-slate-300",
    secondary: "bg-white text-ink border border-line hover:bg-paper-dark disabled:text-muted",
    quiet: "text-muted hover:bg-paper-dark hover:text-ink disabled:text-slate-300",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  };
  return <button className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`} disabled={disabled || busy} {...props}>
    {busy && <LoaderCircle size={16} className="animate-spin" />}{children}
  </button>;
}

export function Field({ label, hint, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className={`grid gap-2 text-sm font-medium text-ink ${className}`}>
    <span>{label}</span>
    <input className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm font-normal text-ink outline-none transition placeholder:text-muted/70 focus:border-forest focus:ring-4 focus:ring-forest/10" {...props} />
    {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
  </label>;
}

export function SelectField({ label, children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className={`grid gap-2 text-sm font-medium text-ink ${className}`}>
    <span>{label}</span>
    <select className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm font-normal text-ink outline-none focus:border-forest focus:ring-4 focus:ring-forest/10" {...props}>{children}</select>
  </label>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-white shadow-card ${className}`}>{children}</section>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>{eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-forest">{eyebrow}</p>}
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[34px]">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
    </div>
    {action}
  </div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center">
    <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-mint text-forest">✳</span>
    <h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  return <div role="status" className={`rounded-xl px-4 py-3 text-sm ${tone === "error" ? "bg-red-50 text-red-700" : "bg-mint text-forest-dark"}`}>{children}</div>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-3xl border border-line bg-paper p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-forest">RC-PoS</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2></div>
        <button onClick={onClose} aria-label="Close dialog" className="grid size-9 place-items-center rounded-full text-muted hover:bg-paper-dark">×</button>
      </div>{children}
    </section>
  </div>;
}
