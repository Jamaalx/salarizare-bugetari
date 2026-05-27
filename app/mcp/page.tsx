import Link from "next/link";
import {
  Calculator as CalcIcon,
  Plug,
  Code,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Copy,
  Bot,
  Terminal,
} from "lucide-react";

export const metadata = {
  title: "MCP — Calculator Salariu Bugetari ca tool pentru AI",
  description:
    "Conectează acest calculator la Claude.ai, ChatGPT sau orice asistent AI prin Model Context Protocol (MCP). Endpoint public, gratis.",
};

const TOOLS = [
  {
    name: "search_function",
    desc: "Caută funcția în datasetul de 2627 de funcții bugetare. Returnează coeficientul, anexa, gradul, studiile cerute.",
  },
  {
    name: "calculate_salary",
    desc: "Calculează salariul brut și net pentru o funcție, cu gradații de vechime, sporuri și impozitare (CAS/CASS/impozit).",
  },
  {
    name: "list_anexe",
    desc: "Listează cele 9 familii ocupaționale (anexele I-IX) cu numărul de funcții din fiecare.",
  },
  {
    name: "get_gradatii_table",
    desc: "Returnează tabelul de gradații (G0-G5) cu cotele de majorare conform art. 13.",
  },
  {
    name: "get_law_article",
    desc: "Rezumat al articolelor cheie din proiectul de lege MMFTSS (1-47).",
  },
];

const PUBLIC_HOST = "salarizare.zed-zen.com";
const mcpUrl = `https://${PUBLIC_HOST}/api/mcp`;

export default function McpPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white">
        <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Înapoi la calculator
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
            <Plug className="w-3.5 h-3.5" />
            Model Context Protocol
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            Folosește calculatorul ca tool AI
          </h1>
          <p className="mt-4 max-w-2xl text-base md:text-lg text-white/90 leading-relaxed">
            Conectează acest server MCP la Claude.ai (sau orice client compatibil) și
            poți pune întrebări gen{" "}
            <em>„Cât ia un șef serviciu II la primărie cu 12 ani vechime?"</em> direct
            din chat — AI-ul va folosi calculatorul ca tool și-ți va răspunde cu cifrele
            exacte din lege.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-10 space-y-10">
        {/* Endpoint */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-brand-600" />
            URL-ul serverului MCP
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Public, autentificare OAuth anonimă (auto-aprobată — fără cont,
            fără login). Pune URL-ul acesta în clientul tău MCP:
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 text-emerald-300 px-4 py-3 font-mono text-sm overflow-x-auto">
            <code className="flex-1">{mcpUrl}</code>
            <a
              href="/api/mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              <ExternalLink className="w-3 h-3" /> open
            </a>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Transport: HTTP streamable (JSON-RPC 2.0). Compatibil cu Claude.ai (Pro /
            Team / Enterprise — connector), mcp-cli, OpenAI Agent SDK, etc.
          </p>
        </div>

        {/* Tools */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-brand-600" />
            Tool-urile expuse ({TOOLS.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {TOOLS.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <code className="text-sm font-mono font-semibold text-brand-700">
                  {t.name}
                </code>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Claude.ai */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Bot className="w-5 h-5 text-brand-600" />
            Cum îl adaugi în Claude.ai
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Necesită Claude Pro, Team sau Enterprise (Connectors). Free tier nu suportă
            momentan custom MCP connectors.
          </p>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                1
              </span>
              <span>
                Deschide <strong>Claude.ai</strong> → click pe avatarul tău (dreapta sus)
                → <strong>Settings</strong> → <strong>Connectors</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                2
              </span>
              <span>
                Click <strong>„Add custom connector"</strong> (sau „Browse connectors" →
                „Add custom").
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                3
              </span>
              <span>
                Completează formularul:
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li>
                    <strong>Name:</strong> Salarizare Bugetari RO
                  </li>
                  <li>
                    <strong>Remote MCP server URL:</strong>{" "}
                    <code className="bg-slate-100 px-1 rounded text-[11px]">
                      {mcpUrl}
                    </code>
                  </li>
                  <li>
                    <strong>Authentication:</strong> OAuth (anonim, fără cont —
                    Claude îl negociază automat)
                  </li>
                </ul>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                4
              </span>
              <span>
                <strong>Add</strong>. Apoi într-o conversație nouă, în Search & Tools,
                vei vedea cele 5 tool-uri disponibile.
              </span>
            </li>
          </ol>
        </div>

        {/* Sample prompts */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 border border-brand-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            Exemple de prompt-uri
          </h2>
          <div className="space-y-2 text-sm text-slate-700">
            <SamplePrompt
              text="Cât va lua un șef serviciu II la primărie cu 14 ani vechime și spor de control financiar?"
            />
            <SamplePrompt
              text="Care e diferența de salariu între un profesor universitar cu 10 ani vechime și unul cu 25 de ani, în 2027?"
            />
            <SamplePrompt
              text="Caută toate funcțiile cu coeficient peste 5 din învățământ."
            />
            <SamplePrompt
              text="Vreau să compar 3 funcții: medic primar, judecător de tribunal, profesor universitar gradul I. Care iese mai bine?"
            />
            <SamplePrompt
              text="Sunt funcționar public la județ, am 7 ani vechime, salariu actual 6800 lei brut. Cum mă afectează noua lege?"
            />
          </div>
        </div>

        {/* Quick test cURL */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-brand-600" />
            Testează cu cURL
          </h2>
          <p className="text-sm text-slate-600 mb-3">
            Pentru dezvoltatori care vor să verifice rapid că merge:
          </p>
          <pre className="bg-slate-900 text-emerald-300 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
{`curl -X POST ${mcpUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "calculate_salary",
      "arguments": {
        "coeficient": 4.0,
        "aniVechime": 25,
        "coefIncludeVechime": true
      }
    }
  }'`}
          </pre>
        </div>

        {/* Open source */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600">
            Proiect open-source, gratuit, fără tracking. Construit pentru bugetarii din
            România.
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700 transition"
          >
            <CalcIcon className="w-4 h-4" />
            Înapoi la calculator
          </Link>
        </div>
      </section>
    </main>
  );
}

function SamplePrompt({ text }: { text: string }) {
  return (
    <div className="rounded-lg bg-white/70 border border-white p-3 text-sm">
      <span className="text-slate-400 mr-1">›</span>
      <em>{text}</em>
    </div>
  );
}
