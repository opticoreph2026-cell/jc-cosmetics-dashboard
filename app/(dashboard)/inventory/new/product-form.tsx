"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Category = { id: string; name: string; slug: string };

export function ProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, categoryId }),
      });
      if (!res.ok) throw new Error("Failed to create product");
      toast.success("Product created");
      router.push("/inventory");
      router.refresh();
    } catch {
      toast.error("Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-sm border border-jc-blush bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-jc-anchor">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
        >
          <option value="">Select category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {selectedCategory && selectedCategory.slug === "cosmetics" && (
        <div className="rounded-sm bg-jc-cream/30 p-3 text-sm text-jc-anchor/70">
          Cosmetics fields (shade, finish, size) will appear here.
        </div>
      )}

      {selectedCategory && selectedCategory.slug === "apparel" && (
        <div className="rounded-sm bg-jc-cream/30 p-3 text-sm text-jc-anchor/70">
          Apparel fields (size, material, color) will appear here.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-jc-anchor">Product Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-jc-anchor">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-sm bg-jc-rose-gold px-4 py-2 text-sm font-medium text-white hover:bg-jc-rose-gold-light disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
