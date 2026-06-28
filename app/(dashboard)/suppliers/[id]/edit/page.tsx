"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/suppliers/${id}`)
      .then((r) => r.json())
      .then((s) => { setName(s.name); setContactPerson(s.contactPerson || ""); setEmail(s.email || ""); setPhone(s.phone || ""); setAddress(s.address || ""); setNotes(s.notes || ""); })
      .catch(() => toast.error("Failed to load supplier"))
      .finally(() => setFetching(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, contactPerson: contactPerson || undefined, email: email || undefined,
          phone: phone || undefined, address: address || undefined, notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Supplier updated");
      router.push(`/suppliers/${id}`);
      router.refresh();
    } catch {
      toast.error("Failed to update supplier");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <div className="text-sm text-jc-anchor/50 p-6">Loading...</div>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Edit Supplier</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-sm border border-jc-blush bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-jc-anchor">Name *</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-jc-anchor">Contact Person</label>
          <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-jc-anchor">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-jc-anchor">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-jc-anchor">Address</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-jc-anchor">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading}
            className="flex-1 rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold-light disabled:opacity-50">
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.push(`/suppliers/${id}`)}
            className="rounded-sm border border-jc-blush px-4 py-2 text-sm text-jc-anchor hover:bg-jc-cream/50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
