"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const CHANNELS = [
  { value: "FACEBOOK_POST", label: "FB Post" },
  { value: "FACEBOOK_MARKETPLACE", label: "Marketplace" },
  { value: "PHYSICAL", label: "Physical" },
  { value: "WEB", label: "Web" },
] as const;

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CARD_OTC", label: "Card OTC" },
] as const;

export function QuickLogForm({
  variants,
}: {
  variants: { id: string; name: string; sku: string; product: { name: string }; sellingPrice: number }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<typeof variants[0] | null>(null);
  const [qty, setQty] = useState(1);
  const [channel, setChannel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [phone, setPhone] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filtered = variants.filter(
    (v) =>
      !selectedVariant &&
      (v.product.name.toLowerCase().includes(search.toLowerCase()) ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.sku.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(variant: typeof variants[0]) {
    setSelectedVariant(variant);
    setSearch(variant.product.name + " — " + variant.name);
    setShowResults(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVariant || !channel || !paymentMethod) return;
    setLoading(true);

    try {
      const res = await fetch("/api/sales/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          qty,
          channel,
          paymentMethod,
          phone: phone || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to log sale");
      toast.success("Sale logged!");
      setSelectedVariant(null);
      setSearch("");
      setQty(1);
      setChannel("");
      setPaymentMethod("");
      setPhone("");
      router.refresh();
    } catch {
      toast.error("Failed to log sale");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div ref={searchRef} className="relative">
        <label className="block text-sm font-medium text-jc-anchor mb-1">Product</label>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowResults(true);
            if (!e.target.value) setSelectedVariant(null);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search by name or SKU..."
          className="block w-full rounded-sm border border-jc-blush px-4 py-3 text-base text-jc-anchor focus:border-jc-rose-gold focus:outline-none focus:ring-1 focus:ring-jc-rose-gold"
        />
        {showResults && search && !selectedVariant && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-sm border border-jc-blush bg-white shadow-sm">
            {filtered.map((v) => (
              <button
                type="button"
                key={v.id}
                onClick={() => handleSelect(v)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-jc-cream/50 transition-colors"
              >
                <span className="text-jc-anchor">{v.product.name} — {v.name}</span>
                <span className="ml-2 text-xs text-jc-anchor/50 font-mono">{v.sku}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedVariant && (
        <div className="rounded-sm bg-jc-cream/30 px-4 py-3">
          <p className="text-sm text-jc-anchor">
            {selectedVariant.product.name} — {selectedVariant.name}
          </p>
          <p className="text-xs text-jc-anchor/50 font-mono">{selectedVariant.sku}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-jc-anchor mb-1">Quantity</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="flex h-12 w-12 items-center justify-center rounded-sm border border-jc-blush text-lg text-jc-anchor hover:bg-jc-cream/50"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value) || 1)}
            className="h-12 w-20 rounded-sm border border-jc-blush px-3 text-center text-lg text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQty(qty + 1)}
            className="flex h-12 w-12 items-center justify-center rounded-sm border border-jc-blush text-lg text-jc-anchor hover:bg-jc-cream/50"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-jc-anchor mb-2">Channel</label>
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map((ch) => (
            <button
              type="button"
              key={ch.value}
              onClick={() => setChannel(ch.value)}
              className={`rounded-sm border px-4 py-3 text-sm transition-colors ${
                channel === ch.value
                  ? "border-jc-rose-gold bg-jc-rose-gold text-white"
                  : "border-jc-blush text-jc-anchor hover:bg-jc-cream/50"
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-jc-anchor mb-2">Payment Method</label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              type="button"
              key={pm.value}
              onClick={() => setPaymentMethod(pm.value)}
              className={`rounded-sm border px-4 py-3 text-sm transition-colors ${
                paymentMethod === pm.value
                  ? "border-jc-rose-gold bg-jc-rose-gold text-white"
                  : "border-jc-blush text-jc-anchor hover:bg-jc-cream/50"
              }`}
            >
              {pm.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-jc-anchor mb-1">
          Customer Phone <span className="text-jc-anchor/50">(optional)</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09XX XXX XXXX"
          className="block w-full rounded-sm border border-jc-blush px-4 py-3 text-base text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !selectedVariant || !channel || !paymentMethod}
        className="w-full rounded-sm bg-jc-rose-gold px-6 py-4 text-base font-medium text-white hover:bg-jc-rose-gold-light disabled:opacity-50 transition-colors"
      >
        {loading ? "Saving..." : "Save Sale"}
      </button>
    </form>
  );
}
