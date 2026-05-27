"use client";

import { useState } from "react";
import { MessageCircle, X, Sparkles, Clock } from "lucide-react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-brand-600 text-white px-5 py-3 shadow-lg shadow-brand-500/30 hover:bg-brand-700 hover:scale-105 transition"
          aria-label="Asistent AI"
        >
          <MessageCircle className="w-5 h-5" strokeWidth={2.25} />
          <span className="text-sm font-semibold">Asistent AI</span>
          <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            În curând
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[360px] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 w-8 h-8 rounded-full bg-white/15 inline-flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">
                  Asistent Salarizare
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/70">
                  AI
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition"
              aria-label="Închide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 mb-4">
              <Clock className="w-7 h-7" strokeWidth={1.75} />
            </div>
            <p className="text-base font-semibold text-slate-900">
              ÎN CURÂND
            </p>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Asistentul AI va răspunde la întrebări despre salarizare,
              coeficienți, gradații și articolele legii. Funcția va fi
              activată în curând — între timp folosește calculatorul.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
