"use client";

import { useSearch, SearchBar } from "../_components/search-filter";
import { useRouter } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../_components/table";

type Product = { id: string; name: string; category: { name: string }; variants: { currentStockQty: number }[] };

export function InventoryClient({ products }: { products: Product[] }) {
  const router = useRouter();
  const { query, setQuery, filtered } = useSearch(products, ["name"]);

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} placeholder="Search products..." />
      <Table>
        <THead>
          <TR>
            <TH>Product</TH>
            <TH hiddenOn="sm">Category</TH>
            <TH align="right" hiddenOn="sm">Variants</TH>
            <TH align="right">Total Stock</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((product) => {
            const totalStock = product.variants.reduce((s, v) => s + v.currentStockQty, 0);
            return (
              <TR key={product.id} onClick={() => router.push(`/inventory/${product.id}`)}>
                <TD className="text-jc-rose-gold font-medium truncate max-w-[200px]">{product.name}</TD>
                <TD hiddenOn="sm">{product.category.name}</TD>
                <TD align="right" hiddenOn="sm">{product.variants.length}</TD>
                <TD align="right" className="text-jc-anchor">{totalStock}</TD>
              </TR>
            );
          })}
          {filtered.length === 0 && <Empty colSpan={4}>No products found.</Empty>}
        </TBody>
      </Table>
    </div>
  );
}
