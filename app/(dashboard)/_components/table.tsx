"use client";

import type { ReactNode } from "react";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-sm border border-jc-blush bg-white ${className ?? ""}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 border-b border-jc-blush bg-jc-cream/30">{children}</thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-jc-blush/50 [&>tr:nth-child(even)]:bg-jc-cream/10">{children}</tbody>
  );
}

export function TR({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const clickable = onClick ? "cursor-pointer" : "";
  return <tr className={`hover:bg-jc-cream/20 transition-colors ${clickable} ${className ?? ""}`.trim()} onClick={onClick}>{children}</tr>;
}

type ColAlign = "left" | "right" | "center";
type Breakpoint = "sm" | "md" | "lg";

function hiddenClass(hiddenOn?: Breakpoint) {
  if (!hiddenOn) return "";
  return `hidden ${hiddenOn}:table-cell`;
}

function alignClass(align?: ColAlign) {
  if (align === "right") return "text-right font-medium";
  if (align === "center") return "text-center";
  return "text-left";
}

export function TH({
  children,
  className,
  align,
  hiddenOn,
}: {
  children: ReactNode;
  className?: string;
  align?: ColAlign;
  hiddenOn?: Breakpoint;
}) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 font-medium text-jc-anchor text-sm ${alignClass(align)} ${hiddenClass(hiddenOn)} ${className ?? ""}`.trim()}>
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  align,
  hiddenOn,
}: {
  children: ReactNode;
  className?: string;
  align?: ColAlign;
  hiddenOn?: Breakpoint;
}) {
  return (
    <td className={`px-4 py-3 text-jc-anchor/70 ${alignClass(align)} ${hiddenClass(hiddenOn)} ${className ?? ""}`.trim()}>
      {children}
    </td>
  );
}

export function Empty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-jc-anchor/50">{children}</td>
    </tr>
  );
}
