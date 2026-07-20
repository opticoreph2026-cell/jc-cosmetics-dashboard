"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, XCircle, HelpCircle, ArrowUp, ArrowDown } from "lucide-react";

export default function FeasibilityPage() {
  const [form, setForm] = useState({
    name: "",
    estimatedUnitCost: "",
    estimatedSellingPrice: "",
    categoryId: "",
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.estimatedUnitCost) {
      toast.error("Product name and estimated cost are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analysis/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "feasibility",
          name: form.name,
          estimatedUnitCost: Number(form.estimatedUnitCost),
          estimatedSellingPrice: form.estimatedSellingPrice ? Number(form.estimatedSellingPrice) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setResult(json.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl text-jc-anchor flex items-center gap-2">
          <HelpCircle className="text-jc-rose-gold" size={28} />
          New Product Feasibility Tool
        </h1>
        <p className="text-sm text-jc-rose-gold">
          Evaluate if a new product is viable for the Lapu-Lapu / Cebu market based on cost, margin, and break-even analysis.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <h2 className="font-display text-lg text-jc-anchor mb-4">Product Details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-jc-rose-gold mb-1">Product Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:outline-none focus:border-jc-rose-gold"
                placeholder="e.g., BB Cream, Lip Tint..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-jc-rose-gold mb-1">Estimated Unit Cost (₱) *</label>
              <input
                type="number"
                value={form.estimatedUnitCost}
                onChange={(e) => setForm({ ...form, estimatedUnitCost: e.target.value })}
                className="w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:outline-none focus:border-jc-rose-gold"
                placeholder="e.g., 25"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-jc-rose-gold mb-1">Estimated Selling Price (₱)</label>
              <input
                type="number"
                value={form.estimatedSellingPrice}
                onChange={(e) => setForm({ ...form, estimatedSellingPrice: e.target.value })}
                className="w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:outline-none focus:border-jc-rose-gold"
                placeholder="Leave blank for AI suggestion"
                step="0.01"
              />
              <p className="text-[10px] text-jc-rose-gold mt-0.5">Leave blank and the AI will suggest a competitive price based on PH market data</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-jc-rose-gold px-4 py-2 text-sm font-medium text-white hover:bg-jc-rose-gold/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Analyzing..." : "Analyze Feasibility"}
            </button>
          </form>

          <div className="mt-4 p-3 bg-jc-cream rounded-sm text-xs text-jc-rose-gold">
            <strong>PH Market Benchmarks:</strong><br />
            &bull; Ideal margin: 45% (range: 30-65%)<br />
            &bull; Competitive markup: 1.8x - 3.0x cost<br />
            &bull; Typical lead time: 14 days<br />
            &bull; Break-even target: &le;10 units/day
          </div>
        </div>

        {/* Results */}
        <div>
          {loading && (
            <div className="rounded-sm border border-jc-blush bg-white p-8 animate-pulse">
              <div className="h-6 bg-jc-cream/50 rounded w-3/4 mb-4" />
              <div className="h-4 bg-jc-cream/50 rounded w-1/2 mb-6" />
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-3 bg-jc-cream/50 rounded w-full" />)}
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="rounded-sm border border-jc-blush bg-white p-8 text-center text-sm text-jc-anchor/60">
              Fill in the product details and click &quot;Analyze Feasibility&quot; to see results.
            </div>
          )}

          {result && !loading && <FeasibilityResult data={result} />}
        </div>
      </div>
    </div>
  );
}

function FeasibilityResult({ data }: { data: any }) {
  const score = data.score;
  const color = score >= 80 ? "text-green-700" : score >= 60 ? "text-blue-700" : score >= 40 ? "text-amber-700" : "text-red-700";
  const bgColor = score >= 80 ? "bg-green-50 border-green-200" : score >= 60 ? "bg-blue-50 border-blue-200" : score >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const verdictIcon = score >= 80 ? <CheckCircle className="text-green-600" size={24} /> : score >= 60 ? <CheckCircle className="text-blue-600" size={24} /> : score >= 40 ? <AlertTriangle className="text-amber-600" size={24} /> : <XCircle className="text-red-600" size={24} />;

  return (
    <div className={`rounded-sm border p-5 ${bgColor}`}>
      <div className="flex items-center gap-3 mb-4">
        {verdictIcon}
        <div>
          <h2 className="font-display text-lg text-jc-anchor">Feasibility Score: <span className={color}>{score}/100</span></h2>
          <p className="text-xs text-jc-anchor/70">{data.summary}</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-3 w-full bg-jc-cream rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div className="rounded-sm bg-white p-3 border border-jc-blush/30">
          <p className="text-[10px] uppercase tracking-wide text-jc-rose-gold mb-2">Break-Even Analysis</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span>Monthly cost share:</span><span className="font-medium">₱{data.breakEven.monthlyFixedAllocation.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Unit cost:</span><span className="font-medium">₱{data.breakEven.unitCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Suggested price:</span><span className="font-medium">₱{data.breakEven.suggestedPrice.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Margin:</span><span className={`font-medium ${data.breakEven.marginPct >= 30 ? "text-green-600" : "text-red-600"}`}>{data.breakEven.marginPct.toFixed(0)}%</span></div>
            <div className="flex justify-between"><span>Units/month needed:</span><span className="font-medium">{data.breakEven.unitsNeededPerMonth.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Units/day needed:</span><span className="font-medium">{data.breakEven.unitsNeededPerDay}</span></div>
          </div>
        </div>

        <div className="rounded-sm bg-white p-3 border border-jc-blush/30">
          <p className="text-[10px] uppercase tracking-wide text-jc-rose-gold mb-2">Market Fit</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Price competitive:</span>
              <span className={`font-medium ${data.marketFit.priceCompetitive ? "text-green-600" : "text-red-600"}`}>{data.marketFit.priceCompetitive ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between"><span>Markup ratio:</span><span className="font-medium">{data.marketFit.markupRatio.toFixed(1)}x</span></div>
            <div className="flex justify-between"><span>Market range:</span><span className="font-medium">{data.marketFit.marketRange}</span></div>
            <div className="flex justify-between"><span>Position:</span><span className="font-medium capitalize">{data.marketFit.position}</span></div>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      {data.riskFactors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-jc-anchor mb-2">Risk Factors</p>
          <div className="space-y-1">
            {data.riskFactors.map((rf: any, i: number) => (
              <div key={i} className={`flex items-start gap-2 rounded-sm p-2 text-xs ${rf.severity === "high" ? "bg-red-50" : rf.severity === "medium" ? "bg-yellow-50" : "bg-blue-50"}`}>
                {rf.severity === "high" ? <ArrowUp size={12} className="text-red-600 mt-0.5 shrink-0" /> : rf.severity === "medium" ? <AlertTriangle size={12} className="text-amber-600 mt-0.5 shrink-0" /> : <ArrowDown size={12} className="text-blue-600 mt-0.5 shrink-0" />}
                <div>
                  <span className="font-medium text-jc-anchor">{rf.factor}:</span>
                  <span className="text-jc-anchor/70"> {rf.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparable products */}
      {data.comparableProducts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-jc-anchor mb-2">Comparable Products In Your Inventory</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-jc-blush text-left text-jc-rose-gold">
                  <th className="pb-1 pr-2 font-medium">Product</th>
                  <th className="pb-1 pr-2 font-medium text-right">Price</th>
                  <th className="pb-1 pr-2 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.comparableProducts.map((cp: any, i: number) => (
                  <tr key={i} className="border-b border-jc-blush/30">
                    <td className="py-1 pr-2 text-jc-anchor">{cp.name}</td>
                    <td className="py-1 pr-2 text-right font-mono text-jc-anchor">₱{cp.sellingPrice.toFixed(0)}</td>
                    <td className={`py-1 pr-2 text-right font-mono ${cp.marginPct >= 30 ? "text-green-600" : "text-red-600"}`}>{cp.marginPct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verdict */}
      <div className={`rounded-sm p-3 text-xs ${data.verdict === "highly_recommended" ? "bg-green-100 text-green-800" : data.verdict === "recommended" ? "bg-blue-100 text-blue-800" : data.verdict === "caution" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
        <strong>Verdict:</strong> {data.recommendation}
      </div>
    </div>
  );
}
