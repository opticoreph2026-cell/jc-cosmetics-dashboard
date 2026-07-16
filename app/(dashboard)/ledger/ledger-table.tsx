"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../_components/table";
import { EditLedgerModal } from "./edit-modal";
import { DeleteLedgerModal } from "./delete-modal";

type Entry = {
  id: string;
  variant: { name: string; product: { name: string } };
  changeQty: number;
  previousStockQty: number;
  newStockQty: number;
  referenceType: string | null;
  referenceId: string | null;
  channel: string;
  note: string | null;
  createdAt: string;
};

export function LedgerTable({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);

  function onSavedOrDeleted() {
    setEditEntry(null);
    setDeleteEntry(null);
    router.refresh();
  }

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>Date</TH>
            <TH>Product</TH>
            <TH>Variant</TH>
            <TH align="right">Change</TH>
            <TH align="right">Previous</TH>
            <TH align="right">New</TH>
            <TH>Reference</TH>
            <TH>Channel</TH>
            <TH>Note</TH>
            <TH>Actions</TH>
          </TR>
        </THead>
        <TBody>
          {entries.map((e) => (
            <TR key={e.id}>
              <TD className="whitespace-nowrap text-xs">
                {new Date(e.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </TD>
              <TD className="text-jc-anchor truncate max-w-[150px]">{e.variant.product.name}</TD>
              <TD className="text-xs">{e.variant.name}</TD>
              <TD align="right" className={`font-mono text-xs ${e.changeQty > 0 ? "text-green-600" : "text-red-600"}`}>
                {e.changeQty > 0 ? "+" : ""}{e.changeQty}
              </TD>
              <TD align="right" className="font-mono text-xs">{e.previousStockQty}</TD>
              <TD align="right" className="font-mono text-xs text-jc-anchor">{e.newStockQty}</TD>
              <TD className="text-xs">
                {e.referenceType}{e.referenceId ? `:${e.referenceId.slice(0, 8)}...` : ""}
              </TD>
              <TD>
                <span className="rounded-sm bg-jc-cream px-1.5 py-0.5 text-xs text-jc-anchor/70">{e.channel}</span>
              </TD>
              <TD className="max-w-[120px] truncate text-jc-anchor/50 text-xs">{e.note || "\u2014"}</TD>
              <TD>
                <div className="flex gap-1">
                  <button onClick={() => setEditEntry(e)}
                    className="text-xs text-jc-rose-gold hover:underline">Edit</button>
                  <button onClick={() => setDeleteEntry(e)}
                    className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </TD>
            </TR>
          ))}
          {entries.length === 0 && <Empty colSpan={10}>No ledger entries yet.</Empty>}
        </TBody>
      </Table>

      {editEntry && (
        <EditLedgerModal
          entry={{ id: editEntry.id, note: editEntry.note, channel: editEntry.channel }}
          onClose={() => setEditEntry(null)}
          onSaved={onSavedOrDeleted}
        />
      )}
      {deleteEntry && (
        <DeleteLedgerModal
          entryId={deleteEntry.id}
          changeQty={deleteEntry.changeQty}
          onClose={() => setDeleteEntry(null)}
          onDeleted={onSavedOrDeleted}
        />
      )}
    </>
  );
}
