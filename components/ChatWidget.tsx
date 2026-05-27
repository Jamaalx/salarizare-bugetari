"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const SUGGESTIONS = [
  "Cât ia un profesor cu 15 ani vechime?",
  "Compară medic primar vs judecător",
  "Ce e gradația 3?",
  "Cum se calculează diferența tranzitorie?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "NOT_CONFIGURED") {
          setMessages([
            ...newMessages,
            {
              role: "assistant",
              content:
                "Chat-ul nu este activat încă pe acest site. Funcția va fi disponibilă în curând — între timp folosește calculatorul direct sau MCP-ul pentru Claude.ai.",
              error: true,
            },
          ]);
        } else {
          setMessages([
            ...newMessages,
            {
              role: "assistant",
              content:
                "Hopa, ceva n-a mers. Încearcă din nou peste câteva secunde.",
              error: true,
            },
          ]);
        }
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: data.message || "(răspuns gol)" },
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Eroare de rețea. Verifică conexiunea și încearcă din nou.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-brand-600 text-white px-5 py-3 shadow-lg shadow-brand-500/30 hover:bg-brand-700 hover:scale-105 transition"
          aria-label="Deschide chat AI"
        >
          <MessageCircle className="w-5 h-5" strokeWidth={2.25} />
          <span className="text-sm font-semibold">Întreabă AI-ul</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[600px] max-h-[calc(100vh-2.5rem)] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
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
                  Llama 3.3 · NVIDIA NIM
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  className="p-1.5 rounded-lg hover:bg-white/15 transition"
                  title="Conversație nouă"
                  aria-label="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 transition"
                aria-label="Închide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50 space-y-3"
          >
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 mb-2">
                    <Sparkles className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    Salut! Te ajut cu calculele salariale.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pot căuta funcții, calcula brut/net, explica articole din lege.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-1">
                    Exemple
                  </p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-brand-300 hover:bg-brand-50 transition"
                    >
                      <span className="text-slate-400 mr-1">›</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} msg={m} />
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Caut în datele legii...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading}
                placeholder="Întreabă-mă orice despre salariul tău..."
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50 max-h-24"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Trimite"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400 text-center">
              AI poate greși. Verifică cifrele cu fluturașul de salariu.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-brand-600 text-white text-sm px-3.5 py-2 rounded-br-md leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div
        className={
          "max-w-[88%] rounded-2xl text-sm px-3.5 py-2 rounded-bl-md leading-relaxed whitespace-pre-wrap " +
          (msg.error
            ? "bg-amber-50 border border-amber-200 text-amber-900"
            : "bg-white border border-slate-200 text-slate-800")
        }
      >
        {msg.error && (
          <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-amber-600" />
        )}
        {msg.content}
      </div>
    </div>
  );
}
