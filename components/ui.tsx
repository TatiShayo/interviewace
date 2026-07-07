/**
 * Shared UI primitives, themed for "executive calm".
 * Retheme-first (PLAYBOOK 1.1): never ship default shadcn. These are hand-built
 * on the design tokens in globals.css. Buttons press to 0.97 (1.4 motion).
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "brass";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-navy)] text-[var(--color-porcelain)] hover:bg-[var(--color-navy-2)] shadow-[var(--shadow-card)]",
  secondary:
    "bg-[var(--color-porcelain)] text-[var(--color-navy)] border border-[var(--color-line)] hover:border-[var(--color-navy)]",
  ghost: "bg-transparent text-[var(--color-navy)] hover:bg-[var(--color-porcelain-2)]",
  brass: "bg-[var(--color-brass)] text-white hover:bg-[var(--color-brass-2)] shadow-[var(--shadow-card)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-base min-w-[44px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: ButtonSize; href: string }) {
  return <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white/70 shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-[var(--color-navy)]", className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius)] border border-[var(--color-line)] bg-white px-3.5 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-navy)] focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[var(--radius)] border border-[var(--color-line)] bg-white px-3.5 py-3 text-[15px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-navy)] focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-porcelain-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted)]",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Skeleton — used everywhere instead of spinners (PLAYBOOK 1.4). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius)] bg-[var(--color-porcelain-2)]", className)} />;
}
