"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Edit3, Save, X } from "lucide-react";

export default function SalesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<{
    id: string; orderNumber: string; channel: string; paymentMethod: string;
    subtotal: number; discount: number; total: number; amountTendered: number | null;
    changeGiven: number | null; notes: string | null; createdAt: string;
    customer: { id: string; name: string; phone: string | null } | null;
    items: { id: string; variant: { product: { name: string }; name: string }; unitPriceAtSale: number; subtotal: number; qty: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editDiscount, setEditDiscount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPayment, setEditPayment] = useState("");
  const [editTendered, setEditTendered] = useState("");
  const [editChange, setEditChange] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d);
        setEditDiscount(String(Number(d.discount).toFixed(2)));
        setEditNotes(d.notes || "");
        setEditPayment(d.paymentMethod);
        setEditTendered(d.amountTendered ? String(Number(d.amountTendered).toFixed(2)) : "");
        setEditChange(d.changeGiven ? String(Number(d.changeGiven).toFixed(2)) : "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      if (!order) return;
      const payload: any = { discount: parseFloat(editDiscount) || 0, notes: editNotes };
      if (editPayment && editPayment !== order.paymentMethod) payload.paymentMethod = editPayment;
      if (editTendered) payload.amountTendered = parseFloat(editTendered);
      if (editChange) payload.changeGiven = parseFloat(editChange);

      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setOrder(updated);
      setEditing(false);
      toast.success("Order updated");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid() {
    if (!order) return;
    if (!confirm(`Void order ${order.orderNumber}? This will restore inventory.`)) return;
    try {
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to void");
      toast.success("Order voided");
      router.push("/sales");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to void");
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-sm bg-jc-cream/50" />;
  if (!order) return <div className="text-sm text-red-500">Order not found</div>;

  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const total = Number(order.total);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/sales" className="text-sm text-jc-rose-gold hover:underline">&larr; Back to Sales</Link>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1 rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">
              <Edit3 size={14} /> Edit
            </button>
          )}
          <button onClick={handleVoid}
            className="rounded-sm border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Void
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-jc-blush bg-white p-6">
        <div className="flex items-center justify-between border-b border-jc-blush pb-4">
          <div>
            <h1 className="font-display text-xl text-jc-anchor">{order.orderNumber}</h1>
            <p className="text-sm text-jc-anchor/60">
              {new Date(order.createdAt).toLocaleDateString("en-PH", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
          <span className="rounded-sm bg-jc-cream px-3 py-1 text-sm text-jc-anchor">{order.channel}</span>
        </div>

        <div className="space-y-3 py-4">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-jc-anchor">{item.variant.product.name} — {item.variant.name}</p>
                <p className="text-xs text-jc-anchor/50">{item.qty} x ₱{Number(item.unitPriceAtSale).toFixed(2)}</p>
              </div>
              <p className="text-sm text-jc-anchor font-medium">₱{Number(item.subtotal).toFixed(2)}</p>
            </div>
          ))}
        </div>

        {editing ? (
          <div className="border-t border-jc-blush pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-jc-anchor/60">Subtotal</p>
              <p className="text-sm text-jc-anchor">₱{subtotal.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-jc-anchor/60">Discount</p>
              <input type="number" min="0" step="0.01" value={editDiscount}
                onChange={(e) => setEditDiscount(e.target.value)}
                className="w-28 rounded-sm border border-jc-blush px-2 py-1 text-sm text-right text-jc-anchor" />
            </div>
            <div className="flex items-center justify-between font-medium">
              <p className="text-sm text-jc-anchor">Total</p>
              <p className="font-display text-lg text-jc-rose-gold">
                ₱{Math.max(0, subtotal - (parseFloat(editDiscount) || 0)).toFixed(2)}
              </p>
            </div>
            <div className="border-t border-jc-blush pt-3">
              <label className="text-xs text-jc-anchor/60 block mb-1">Payment Method</label>
              <select value={editPayment} onChange={(e) => setEditPayment(e.target.value)}
                className="w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor">
                <option value="CASH">Cash</option>
                <option value="GCASH">GCash</option>
                <option value="MAYA">Maya</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD_OTC">Card OTC</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-jc-anchor/60 block mb-1">Amount Tendered</label>
                <input type="number" min="0" step="0.01" value={editTendered}
                  onChange={(e) => setEditTendered(e.target.value)}
                  placeholder="₱0.00"
                  className="w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor" />
              </div>
              <div>
                <label className="text-xs text-jc-anchor/60 block mb-1">Change Given</label>
                <input type="number" min="0" step="0.01" value={editChange}
                  onChange={(e) => setEditChange(e.target.value)}
                  placeholder="₱0.00"
                  className="w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor" />
              </div>
            </div>
            <div>
              <label className="text-xs text-jc-anchor/60 block mb-1">Notes</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                rows={2} placeholder="Discount reason, change not given, etc."
                className="w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1 rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold/90 disabled:opacity-50">
                <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-1 rounded-sm border border-jc-blush px-4 py-2 text-sm text-jc-anchor hover:bg-jc-cream/50">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-jc-blush pt-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-jc-anchor/60">Subtotal</p>
              <p className="text-sm text-jc-anchor">₱{subtotal.toFixed(2)}</p>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-jc-anchor/60">Discount</p>
                <p className="text-sm text-red-500">−₱{discount.toFixed(2)}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm text-jc-anchor/60">Payment</p>
              <p className="text-sm text-jc-anchor">{order.paymentMethod}</p>
            </div>
            {order.amountTendered && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-jc-anchor/60">Tendered</p>
                <p className="text-sm text-green-700">₱{Number(order.amountTendered).toFixed(2)}</p>
              </div>
            )}
            {order.changeGiven && Number(order.changeGiven) > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-jc-anchor/60">Change</p>
                <p className="text-sm text-jc-anchor">₱{Number(order.changeGiven).toFixed(2)}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-jc-blush">
              <p className="font-display text-lg text-jc-anchor">Total</p>
              <p className="font-display text-lg text-jc-rose-gold">₱{total.toFixed(2)}</p>
            </div>
            {order.notes && (
              <div className="pt-2 text-xs text-jc-anchor/50 italic">{order.notes}</div>
            )}
          </div>
        )}

        {order.customer && (
          <div className="mt-4 border-t border-jc-blush pt-4">
            <p className="text-sm text-jc-anchor/60">Customer</p>
            <Link href={`/customers/${order.customer.id}`} className="text-sm text-jc-rose-gold hover:underline">
              {order.customer.name}
            </Link>
            {order.customer.phone && (
              <p className="text-xs text-jc-anchor/50">{order.customer.phone}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
