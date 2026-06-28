"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";

export function useSearch<T>(items: T[], keys: (keyof T)[]) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) =>
      keys.some((key) => {
        const val = item[key];
        return String(val ?? "").toLowerCase().includes(q);
      })
    );
  }, [items, query, keys]);
  return { query, setQuery, filtered };
}

export function SearchBar({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-jc-anchor/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search..."}
        className="w-full rounded-sm border border-jc-blush bg-white py-2 pl-9 pr-3 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
      />
    </div>
  );
}
