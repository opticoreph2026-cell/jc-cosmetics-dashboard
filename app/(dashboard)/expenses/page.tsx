"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  RENT: "Rent", SALARIES: "Salaries", UTILITIES: "Utilities", PACKAGING: "Packaging",
  FREIGHT: "Freight", SHIPPING: "Shipping", MARKETING: "Marketing", MAINTENANCE: "Maintenance",
  EQUIPMENT: "Equipment", SOFTWARE: "Software", PROFESSIONAL_FEES: "Professional Fees",
  TAXES: "Taxes", INSURANCE: "Insurance", OTHER: "Other",
};

type Expense = { id: string; description: string; category: string; amount: number; date: string; notes: string | null };

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: "", category: "OTHER", amount: 0, date: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setExpenses(data);
    } catch { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [month, year]);

  function openNew() { setEditId(null); setForm({ description: "", category: "OTHER", amount: 0, date: new Date().toISOString().slice(0, 10), notes: "" }); setShowForm(true); }

  function openEdit(e: Expense) {
    setEditId(e.id);
    setForm({ description: e.description, category: e.category, amount: e.amount, date: e.date.slice(0, 10), notes: e.notes || "" });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = { ...form, amount: form.amount, date: new Date(form.date).toISOString() };
      const res = editId
        ? await fetch("/api/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...body }) })
        : await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.text(); throw new Error(err); }
      toast.success(editId ? "Expense updated" : "Expense added");
      setShowForm(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Expense deleted");
      load();
    } catch { toast.error("Failed to delete"); }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-jc-anchor">Expenses</h1>
        <button onClick={openNew} className="rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold-light">+ Add Expense</button>
      </div>

      <div className="flex items-center gap-3">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={String(i + 1).padStart(2, "0")}>{new Date(2024, i).toLocaleString("en", { month: "long" })}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor">
          {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => (<option key={y} value={y}>{y}</option>))}
        </select>
        <span className="text-sm text-jc-anchor/60">Total: <strong className="text-jc-anchor">₱{total.toLocaleString()}</strong></span>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
            <div key={cat} className="rounded-sm border border-jc-blush bg-white px-3 py-2">
              <p className="text-xs text-jc-anchor/60">{categoryLabels[cat] || cat}</p>
              <p className="text-sm font-medium text-jc-anchor">₱{amt.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-jc-anchor/50">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-8 text-sm text-jc-anchor/50">No expenses for this month</div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-jc-blush bg-jc-cream/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-jc-anchor">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-jc-anchor">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-jc-anchor">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-jc-anchor">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-jc-anchor">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jc-blush/50">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-jc-cream/20 even:bg-jc-cream/10">
                  <td className="px-4 py-3 text-jc-anchor whitespace-nowrap">{new Date(e.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</td>
                  <td className="px-4 py-3 text-jc-anchor">{e.description}</td>
                  <td className="px-4 py-3"><span className="rounded-sm bg-jc-cream px-2 py-0.5 text-xs text-jc-anchor/70">{categoryLabels[e.category] || e.category}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-jc-anchor">₱{e.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEdit(e)} className="text-xs text-jc-rose-gold hover:underline mr-2">Edit</button>
                    <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-jc-blush bg-jc-cream/20">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-jc-anchor">Total</td>
                <td className="px-4 py-3 text-right font-medium text-jc-anchor">₱{total.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !saving && setShowForm(false)}>
          <div className="mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium text-jc-anchor">{editId ? "Edit Expense" : "Add Expense"}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-jc-anchor/60 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor">
                    {Object.entries(categoryLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-jc-anchor/60 mb-1">Amount (₱)</label>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor" />
              </div>
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} disabled={saving}
                className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.description}
                className="rounded-sm bg-jc-rose-gold px-3 py-1.5 text-sm text-white disabled:opacity-50">
                {saving ? "Saving..." : editId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
