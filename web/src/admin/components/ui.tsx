import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <h1 className="admin-page-title">{title}</h1>
        {description ? <p className="admin-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </header>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="admin-card">
      {title ? <h2 className="admin-card-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {hint ? <small className="admin-hint">{hint}</small> : null}
      {error ? <small className="admin-error-inline">{error}</small> : null}
    </label>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="admin-empty">
      <p>{message}</p>
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <p className="admin-loading">{label}</p>;
}

export function Toast({ message, tone }: { message: string; tone: "success" | "error" }) {
  return <div className={`admin-toast admin-toast--${tone}`}>{message}</div>;
}
