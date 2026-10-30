import type { ButtonHTMLAttributes } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const styles =
    variant === "primary"
      ? "bg-accent text-surface hover:opacity-90 dark:text-background"
      : "border border-border bg-surface hover:bg-accent-soft";
  return <button {...props} className={`rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${className}`} />;
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`petal border border-border bg-surface p-5 shadow-[0_1px_0_var(--border),0_8px_20px_-14px_var(--accent)] ${className}`} />;
}

export function ErrorNote({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {message}
    </p>
  ) : null;
}
