"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Barcode, Search } from "lucide-react";

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

type VariantItem = { id: string; name: string; sku: string; barcode: string | null; product: { name: string }; sellingPrice: number };

type CartItem = {
  variantId: string;
  label: string;
  sku: string;
  qty: number;
  unitPrice: number;
};

export function QuickLogForm({ variants }: { variants: VariantItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [channel, setChannel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [phone, setPhone] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 16));
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const filtered = variants.filter(
    (v) =>
      (v.product.name.toLowerCase().includes(search.toLowerCase()) ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.sku.toLowerCase().includes(search.toLowerCase())) &&
      !cart.find((c) => c.variantId === v.id)
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

  useEffect(() => {
    if (barcodeRef.current) barcodeRef.current.focus();
  }, []);

  function handleBarcodeSubmit(e?: React.FormEvent | React.KeyboardEvent) {
    if (e) e.preventDefault();
    const code = barcode.trim();
    if (!code) return;

    const variant = variants.find((v) => v.barcode === code);
    if (!variant) {
      toast.error(`No product found with barcode: ${code}`);
      setBarcode("");
      return;
    }

    addToCartDirect(variant);
    setBarcode("");
    if (barcodeRef.current) barcodeRef.current.focus();
  }

  function addToCartDirect(variant: VariantItem, qty = 1) {
    const existing = cart.find((c) => c.variantId === variant.id);
    if (existing) {
      setCart(cart.map((c) => (c.variantId === variant.id ? { ...c, qty: c.qty + qty } : c)));
    } else {
      setCart([
        ...cart,
        {
          variantId: variant.id,
          label: `${variant.product.name} \u2014 ${variant.name}`,
          sku: variant.sku,
          qty,
          unitPrice: variant.sellingPrice,
        },
      ]);
    }
  }

  function handleSelect(variant: VariantItem) {
    setSelectedVariant(variant);
    setSearch(variant.product.name + " \u2014 " + variant.name);
    setShowResults(false);
  }

  function addToCart() {
    if (!selectedVariant) return;
    addToCartDirect(selectedVariant, addQty);
    setSelectedVariant(null);
    setSearch("");
    setAddQty(1);
  }

  function removeFromCart(variantId: string) {
    setCart(cart.filter((c) => c.variantId !== variantId));
  }

  function updateCartQty(variantId: string, qty: number) {
    if (qty < 1) return;
    setCart(cart.map((c) => (c.variantId === variantId ? { ...c, qty } : c)));
  }

  const total = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0 || !channel || !paymentMethod) return;
    setLoading(true);

    try {
      const res = await fetch("/api/sales/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ variantId: c.variantId, qty: c.qty })),
          channel,
          paymentMethod,
          phone: phone || undefined,
          saleDate: saleDate ? new Date(saleDate).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to log sale");
      toast.success(`Sale logged! ${cart.length} item(s)`);
      setCart([]);
      setChannel("");
      setPaymentMethod("");
      setPhone("");
      if (barcodeRef.current) barcodeRef.current.focus();
      router.refresh();
    } catch {
      toast.error("Failed to log sale");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <div className="rounded-sm border-2 border-jc-rose-gold/30 bg-jc-cream/20 p-3">
          <label htmlFor="barcode" className="flex items-center gap-2 text-sm font-medium text-jc-anchor mb-2">
            <Barcode size={16} /> Scan Barcode
          </label>
          <div className="flex gap-2">
            <input
              ref={barcodeRef}
              id="barcode"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBarcodeSubmit(e); } }}
              placeholder="Scan or type barcode..."
              autoComplete="off"
              className="block flex-1 rounded-sm border border-jc-blush px-4 py-3 text-base text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
            />
            <button type="button" onClick={handleBarcodeSubmit}
              className="rounded-sm bg-jc-rose-gold px-4 py-3 text-sm font-medium text-white hover:bg-jc-rose-gold/90">
              Add
            </button>
          </div>
        </div>

        <div ref={searchRef} className="relative">
          <label className="flex items-center gap-2 text-sm font-medium text-jc-anchor mb-1">
            <Search size={14} /> Search Item
          </label>
          <div className="flex gap-2">
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
              className="block flex-1 rounded-sm border border-jc-blush px-4 py-3 text-base text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
            />
          </div>
          {showResults && search && !selectedVariant && filtered.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-sm border border-jc-blush bg-white shadow-sm">
              {filtered.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => handleSelect(v)}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-jc-cream/50"
                >
                  <span className="text-jc-anchor">{v.product.name} &mdash; {v.name}</span>
                  <span className="ml-2 text-xs text-jc-anchor/50 font-mono">{v.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedVariant && (
          <div className="flex items-center gap-3 rounded-sm border border-jc-blush/50 bg-jc-cream/20 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-jc-anchor truncate">{selectedVariant.product.name} &mdash; {selectedVariant.name}</p>
              <p className="text-xs text-jc-anchor/50 font-mono">{selectedVariant.sku} &mdash; ₱{selectedVariant.sellingPrice}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAddQty(Math.max(1, addQty - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-jc-blush text-sm hover:bg-jc-cream/50">-</button>
              <span className="w-8 text-center text-sm text-jc-anchor">{addQty}</span>
              <button type="button" onClick={() => setAddQty(addQty + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-jc-blush text-sm hover:bg-jc-cream/50">+</button>
            </div>
            <button type="button" onClick={addToCart}
              className="rounded-sm bg-jc-rose-gold px-3 py-1.5 text-sm text-white hover:bg-jc-rose-gold-light">Add</button>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="rounded-sm border border-jc-blush bg-white">
          <div className="border-b border-jc-blush px-4 py-2">
            <span className="text-xs font-medium text-jc-anchor/60">Items ({cart.length})</span>
          </div>
          {cart.map((item) => (
            <div key={item.variantId} className="flex items-center gap-3 border-b border-jc-blush/50 px-4 py-2.5 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-jc-anchor truncate">{item.label}</p>
                <p className="text-xs text-jc-anchor/50 font-mono">₱{item.unitPrice} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => updateCartQty(item.variantId, item.qty - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-sm border border-jc-blush text-xs hover:bg-jc-cream/50">-</button>
                <span className="w-6 text-center text-xs text-jc-anchor">{item.qty}</span>
                <button type="button" onClick={() => updateCartQty(item.variantId, item.qty + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-sm border border-jc-blush text-xs hover:bg-jc-cream/50">+</button>
              </div>
              <p className="w-20 text-right text-sm text-jc-anchor">₱{(item.unitPrice * item.qty).toFixed(2)}</p>
              <button type="button" onClick={() => removeFromCart(item.variantId)}
                className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 border-t border-jc-blush">
            <span className="text-sm font-medium text-jc-anchor">Total</span>
            <span className="text-base font-medium text-jc-rose-gold">₱{total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-jc-anchor mb-1">
          Sale Date <span className="text-jc-anchor/50">(defaults to now)</span>
        </label>
        <input
          type="datetime-local"
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
          className="block w-full rounded-sm border border-jc-blush px-4 py-3 text-base text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
        />
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
        disabled={loading || cart.length === 0 || !channel || !paymentMethod}
        className="w-full rounded-sm bg-jc-rose-gold px-6 py-4 text-base font-medium text-white hover:bg-jc-rose-gold-light disabled:opacity-50"
      >
        {loading ? "Saving..." : `Record Sale (${cart.length} item${cart.length > 1 ? "s" : ""})`}
      </button>
    </form>
  );
}
