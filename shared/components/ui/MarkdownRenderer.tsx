import { ReactNode } from "react";

function parseBold(text: string): ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
      : part
  );
}

export function MarkdownRenderer({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {text.split("\n").map((line, idx) => {
        const t = line.trim();
        if (t.startsWith("# "))
          return <h1 key={idx} className="text-xl font-bold text-slate-900 mt-8 mb-3 first:mt-0">{t.slice(2)}</h1>;
        if (t.startsWith("## "))
          return <h2 key={idx} className="text-base font-bold text-slate-900 mt-6 mb-2 border-b border-slate-100 pb-1.5">{t.slice(3)}</h2>;
        if (t.startsWith("### "))
          return <h3 key={idx} className="text-sm font-semibold text-slate-800 mt-4 mb-1">{t.slice(4)}</h3>;
        if (t.startsWith("---"))
          return <hr key={idx} className="border-slate-200 my-4" />;
        const cbm = t.match(/^-\s+\[([ xX])\]\s+(.*)/);
        if (cbm) {
          const checked = cbm[1].toLowerCase() === "x";
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1">
              <div className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                {checked && <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-white" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <span className={`text-sm leading-relaxed ${checked ? "line-through text-slate-400" : "text-slate-700"}`}>{parseBold(cbm[2])}</span>
            </div>
          );
        }
        if (t.startsWith("- ") || t.startsWith("* "))
          return <li key={idx} className="text-sm text-slate-700 ml-5 list-disc my-0.5 leading-relaxed">{parseBold(t.slice(2))}</li>;
        const nm = t.match(/^(\d+)\.\s+(.*)/);
        if (nm)
          return (
            <div key={idx} className="flex gap-2.5 pl-1 my-1">
              <span className="text-blue-600 font-semibold text-sm shrink-0">{nm[1]}.</span>
              <span className="text-sm text-slate-700 leading-relaxed">{parseBold(nm[2])}</span>
            </div>
          );
        if (t.startsWith("|"))
          return (
            <div key={idx} className="overflow-x-auto my-1">
              <div className="text-xs text-slate-600 font-mono bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 whitespace-pre">{t}</div>
            </div>
          );
        if (t.startsWith(">"))
          return <blockquote key={idx} className="border-l-4 border-blue-300 pl-4 my-2 text-sm text-slate-600 italic">{parseBold(t.slice(1).trim())}</blockquote>;
        if (!t) return <div key={idx} className="h-1" />;
        return <p key={idx} className="text-sm text-slate-700 leading-relaxed">{parseBold(t)}</p>;
      })}
    </div>
  );
}
