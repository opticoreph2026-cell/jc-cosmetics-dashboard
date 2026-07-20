"use client";

import { useState, useEffect } from "react";
import { Sparkles, Globe, MessageCircle, Tag, Lightbulb, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PromoPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analysis/intelligence?mode=promo")
      .then((r) => r.json())
      .then((json) => setPromos(json.data || []))
      .finally(() => setLoading(false));
  }, []);

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(key);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {}
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-jc-cream/50 rounded w-64" />
          <div className="h-4 bg-jc-cream/50 rounded w-96" />
          {[1,2,3].map(i => <div key={i} className="h-40 bg-jc-cream/30 rounded-sm" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl text-jc-anchor flex items-center gap-2">
          <Sparkles className="text-jc-rose-gold" size={28} />
          AI Promo & Ad Generator
        </h1>
        <p className="text-sm text-jc-rose-gold">
          Auto-generated promotional content for products that need a sales boost. Copy-paste to Facebook or Messenger.
        </p>
      </div>

      {promos.length === 0 ? (
        <div className="rounded-sm border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
          <p className="text-sm text-green-700">All products are meeting sales targets. No promotions needed right now.</p>
          <Link href="/analysis/intelligence" className="text-xs text-jc-rose-gold hover:underline mt-2 inline-block">
            &larr; Back to Intelligence Hub
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {promos.map((p, i) => (
            <div key={i} className="rounded-sm border border-jc-blush bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-jc-anchor">{p.productName}</span>
                  <span className="text-xs text-jc-rose-gold">({p.variantName})</span>
                </div>
                <span className="flex items-center gap-1 rounded-sm bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                  <Tag size={12} /> {p.suggestedDiscount}% Off
                </span>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-jc-rose-gold mb-1">Headline</p>
                <p className="text-sm font-medium text-jc-anchor bg-jc-cream/50 rounded-sm p-2">{p.headline}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-jc-rose-gold mb-1">Body</p>
                <p className="text-xs text-jc-anchor/80 bg-jc-cream/30 rounded-sm p-2 leading-relaxed">{p.body}</p>
              </div>

              <div className="mb-3">
                <p className="text-xs font-medium text-blue-600 flex items-center gap-1 mb-1">
                  <Globe size={12} /> Facebook Post
                </p>
                <CopyBlock text={p.platform.facebook} label={`fb-${i}`} copiedIndex={copiedIndex} onCopy={copyText} />
              </div>

              <div className="mb-3">
                <p className="text-xs font-medium text-green-600 flex items-center gap-1 mb-1">
                  <MessageCircle size={12} /> Messenger Copy
                </p>
                <CopyBlock text={p.platform.messenger} label={`msg-${i}`} copiedIndex={copiedIndex} onCopy={copyText} />
              </div>

              <div className="flex flex-wrap gap-1">
                {p.hashtags.map((tag: string, ti: number) => (
                  <span key={ti} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{tag}</span>
                ))}
              </div>

              {p.bundleIdea && (
                <div className="mt-3 flex items-start gap-2 rounded-sm bg-purple-50 p-2 text-xs text-purple-700">
                  <Lightbulb size={12} className="mt-0.5 shrink-0" />
                  <span>{p.bundleIdea}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyBlock({ text, label, copiedIndex, onCopy }: { text: string; label: string; copiedIndex: string | null; onCopy: (text: string, key: string) => void }) {
  return (
    <div className="relative group">
      <pre className="text-xs text-jc-anchor/80 bg-gray-50 rounded-sm p-2 border border-jc-blush/30 whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
      <button
        onClick={() => onCopy(text, label)}
        className="absolute top-1 right-1 flex items-center gap-1 rounded-sm bg-white border border-jc-blush px-2 py-1 text-[10px] text-jc-rose-gold hover:bg-jc-cream transition-colors"
      >
        {copiedIndex === label ? <><CheckCircle size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  );
}
