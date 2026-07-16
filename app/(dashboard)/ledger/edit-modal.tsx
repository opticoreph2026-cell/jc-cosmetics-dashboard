"use client";

import { useState } from "react";
import { toast } from "sonner";

type LedgerEntry = { id: string; note: string | null; channel: string };

export function EditLedgerModal({ entry, onClose, onSaved }: { entry: LedgerEntry; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState(entry.note || "");
  const [channel, setChannel] = useState(entry.channel);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/ledger/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || null, channel }),
      });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to update"); }
      toast.success("Ledger entry updated");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to update ledger entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-xl">
        <h3 className="font-medium text-jc-anchor">Edit Ledger Entry</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-jc-anchor/60 mb-1">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-jc-anchor/60 mb-1">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}
              className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none">
              <option value="WEB">Web</option>
              <option value="FACEBOOK_POST">Facebook Post</option>
              <option value="FACEBOOK_MARKETPLACE">Facebook Marketplace</option>
              <option value="PHYSICAL">Physical</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onClose} disabled={saving}
            className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-sm bg-jc-rose-gold px-3 py-1.5 text-sm text-white hover:bg-jc-rose-gold-light disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
