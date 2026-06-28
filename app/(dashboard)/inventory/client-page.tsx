"use client";

import { useSearch, SearchBar } from "../_components/search-filter";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; category: { name: string }; variants: { currentStockQty: number }[] };

export function InventoryClient({ products }: { products: Product[] }) {
  const router = useRouter();
  const { query, setQuery, filtered } = useSearch(products, ["name"]);

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} placeholder="Search products..." />
      <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Product</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Category</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Variants</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Total Stock</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const totalStock = product.variants.reduce((s, v) => s + v.currentStockQty, 0);
              return (
                <tr key={product.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20 cursor-pointer"
                  onClick={() => router.push(`/inventory/${product.id}`)}>
                  <td className="px-4 py-3 text-jc-rose-gold font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-jc-anchor/70">{product.category.name}</td>
                  <td className="px-4 py-3 text-jc-anchor/70">{product.variants.length}</td>
                  <td className="px-4 py-3 text-right text-jc-anchor">{totalStock}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-jc-anchor/50">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
