"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Wrench, Plug } from "lucide-react";
import Wizard from "./Wizard";
import Calculator from "./Calculator";

export default function ModeSwitcher({ data }: { data: any }) {
  const [mode, setMode] = useState<"wizard" | "expert">("wizard");

  return (
    <>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm bg-white/85">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-4">
            <a
              href="#sources"
              className="text-xs font-medium text-slate-500 hover:text-brand-600"
            >
              Documente sursă
            </a>
            <Link
              href="/mcp"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600"
            >
              <Plug className="w-3.5 h-3.5" /> MCP pentru AI
            </Link>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Mod:</span>
            <div className="inline-flex p-0.5 rounded-full bg-slate-100">
              <button
                onClick={() => setMode("wizard")}
                className={
                  "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition " +
                  (mode === "wizard"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                Ghidat
              </button>
              <button
                onClick={() => setMode("expert")}
                className={
                  "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition " +
                  (mode === "expert"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                <Wrench className="w-3.5 h-3.5" strokeWidth={2} />
                Expert
              </button>
            </div>
          </div>
        </div>
      </div>

      {mode === "wizard" ? (
        <Wizard initialData={data} />
      ) : (
        <Calculator initialData={data} />
      )}
    </>
  );
}
