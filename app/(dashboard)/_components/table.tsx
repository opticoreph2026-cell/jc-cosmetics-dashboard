"use client";

import { createContext, useContext, type ReactNode } from "react";

type TableVariant = "head" | "body";
const TableCtx = createContext<TableVariant>("body");

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-sm border border-jc-blush bg-white ${className ?? ""}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <TableCtx.Provider value="head">
      <thead className="sticky top-0 z-10 border-b border-jc-blush bg-jc-cream/30">{children}</thead>
    </TableCtx.Provider>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return (
    <TableCtx.Provider value="body">
      <tbody className="divide-y divide-jc-blush/50">{children}</tbody>
    </TableCtx.Provider>
  );
}

export function TR({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const variant = useContext(TableCtx);
  const base = variant === "head"
    ? ""
    : "hover:bg-jc-cream/20 even:bg-jc-cream/10 transition-colors";
  const clickable = onClick ? "cursor-pointer" : "";
  return <tr className={`${base} ${clickable} ${className ?? ""}`.trim()} onClick={onClick}>{children}</tr>;
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
