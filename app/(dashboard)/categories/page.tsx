"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Category = { id: string; name: string; slug: string; _count: { products: number } };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function createCategory() {
    if (!newName || !newSlug) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, slug: newSlug }),
      });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to create"); }
      const cat = await res.json();
      setCategories([...categories, { ...cat, _count: { products: 0 } }]);
      setNewName("");
      setNewSlug("");
      toast.success("Category created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function updateCategory() {
    if (!editName || !editSlug || !editId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, name: editName, slug: editSlug }),
      });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to update"); }
      setCategories(categories.map((c) => c.id === editId ? { ...c, name: editName, slug: editSlug } : c));
      setEditId(null);
      toast.success("Category updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to delete"); }
      setCategories(categories.filter((c) => c.id !== id));
      toast.success("Category deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete category");
    }
  }

  if (loading) return <div className="text-sm text-jc-anchor/50 p-6">Loading...</div>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Categories</h1>

      <div className="rounded-sm border border-jc-blush bg-white p-4">
        <h2 className="text-sm font-medium text-jc-anchor mb-3">New Category</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="block flex-1 rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          <input type="text" placeholder="slug-name" value={newSlug} onChange={(e) => setNewSlug(e.target.value)}
            className="block w-full sm:w-32 rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          <button onClick={createCategory} disabled={saving || !newName || !newSlug}
            className="rounded-sm bg-jc-rose-gold px-3 py-2 text-sm text-white hover:bg-jc-rose-gold-light disabled:opacity-50">Add</button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-sm border border-jc-blush bg-white p-4">
            {editId === cat.id ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="block flex-1 rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
                <input type="text" value={editSlug} onChange={(e) => setEditSlug(e.target.value)}
                  className="block w-full sm:w-28 rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
                <button onClick={updateCategory} disabled={saving}
                  className="rounded-sm bg-jc-rose-gold px-3 py-1.5 text-xs text-white">Save</button>
                <button onClick={() => setEditId(null)}
                  className="rounded-sm border border-jc-blush px-3 py-1.5 text-xs text-jc-anchor">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span className="text-sm font-medium text-jc-anchor">{cat.name}</span>
                  <span className="ml-2 text-xs text-jc-anchor/50 font-mono">/{cat.slug}</span>
                  <span className="ml-2 text-xs text-jc-anchor/50">{cat._count.products} product(s)</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditSlug(cat.slug); }}
                    className="text-xs text-jc-rose-gold hover:underline">Edit</button>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <div className="rounded-sm border border-jc-blush bg-white p-6 text-center text-sm text-jc-anchor/50">
            No categories yet.
          </div>
        )}
      </div>
    </div>
  );
}
