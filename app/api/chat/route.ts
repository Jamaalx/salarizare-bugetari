import { NextRequest, NextResponse } from "next/server";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TOOL_DEFINITIONS } from "@/lib/tools";
import { rateLimit, getClientIp, redact } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";

// 10 requests per minute per IP; tool-loop can multiply NVIDIA calls 5x
// so this is effectively up to ~50 NVIDIA calls/min/IP in the worst case.
const CHAT_LIMIT = 10;
const CHAT_WINDOW_MS = 60_000;

const MAX_MESSAGE_CHARS = 2000;
const MAX_MESSAGES = 20;
const ALLOWED_ROLES = new Set(["user", "assistant"]);

const SYSTEM_PROMPT = `Ești un asistent virtual specializat pe proiectul de lege MMFTSS din 25 mai 2026 privind salarizarea personalului bugetar din România.

CONTEXT IMPORTANT:
- Proiectul intră în vigoare la 1 ianuarie 2027
- Valoarea de referință pentru 2027 este FIXATĂ la 4100 lei (art. 47 alin. 2)
- Formula: salariu_de_baza = coeficient × valoare_referinta + gradații vechime
- Gradații (art. 13): G0 <3ani (0%), G1 3-5 (+7.5%), G2 5-10 (+5%), G3 10-15 (+5%), G4 15-20 (+2.5%), G5 >20 (+2.5%) — se aplică multiplicativ succesiv
- Pentru funcții de conducere și învățământ universitar/sanitar, coeficientul include deja vechimea (nu se mai aplică gradațiile)
- Plafon sporuri în plafon: 20% din salariul de bază (art. 21); excepții: noapte, ore supl., handicap, fonduri EU
- Impozite: CAS 25% + CASS 10% + impozit pe venit 10%
- Diferența salarială tranzitorie (art. 32): dacă noul salariu < dec. 2026, primesc diferența până la 31 dec. 2031

INSTRUCȚIUNI:
1. Răspunde DOAR în limba română, scurt și clar
2. Folosește OBLIGATORIU tool-urile când utilizatorul cere calcule, caută o funcție sau întreabă despre articole din lege — NU inventa cifre
3. Pentru orice calcul concret, apelează calculate_salary; pentru funcții, apelează search_function
4. Dacă utilizatorul te întreabă ceva ce iese din scopul calculatorului (politică, opinii), refuză politicos și revino la subiect
5. Dacă datele lipsesc (ex: nu specifică vechimea), întreabă înainte să calculezi
6. Nu da sfaturi juridice — proiectul nu e încă adoptat
7. Fii concis: 2-4 propoziții pe răspuns, dar prezintă cifrele clar`;

// Convert our tool definitions into OpenAI-compatible function specs
const OPENAI_TOOLS = TOOL_DEFINITIONS.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: zodToJsonSchema(t.schema as any, { target: "openApi3" }) as any,
  },
}));

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
};

async function executeToolCall(name: string, args: any): Promise<string> {
  const def = TOOL_DEFINITIONS.find((t) => t.name === name);
  if (!def) return JSON.stringify({ error: `Unknown tool: ${name}` });
  try {
    const parsed = def.schema.parse(args);
    const result = (def.handler as any)(parsed);
    return JSON.stringify(result);
  } catch (err: any) {
    return JSON.stringify({ error: err?.message || String(err) });
  }
}

async function callNvidia(messages: ChatMessage[], useTools = true): Promise<any> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NVIDIA_API_KEY nu este configurat. Adaugă-l în variabilele de mediu."
    );
  }

  const body: any = {
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1024,
    stream: false,
  };
  if (useTools) {
    body.tools = OPENAI_TOOLS;
    body.tool_choice = "auto";
  }

  const res = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[chat] NVIDIA NIM ${res.status}:`,
      redact(text.slice(0, 500))
    );
    const err = new Error(`upstream_${res.status}`);
    (err as any).upstreamStatus = res.status;
    throw err;
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`chat:${ip}`, CHAT_LIMIT, CHAT_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message:
          "Prea multe întrebări într-un minut. Așteaptă puțin și reîncearcă.",
        retryAfterMs: rl.resetAt - Date.now(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(CHAT_LIMIT),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      }
    );
  }

  let payload: { messages: ChatMessage[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload?.messages || !Array.isArray(payload.messages)) {
    return NextResponse.json({ error: "messages[] required" }, { status: 400 });
  }

  const sanitized: ChatMessage[] = [];
  for (const m of payload.messages.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") continue;
    if (!ALLOWED_ROLES.has(m.role)) continue;
    if (typeof m.content !== "string") continue;
    const content = m.content.slice(0, MAX_MESSAGE_CHARS);
    if (!content.trim()) continue;
    sanitized.push({ role: m.role, content });
  }

  if (sanitized.length === 0) {
    return NextResponse.json(
      { error: "no valid messages after sanitization" },
      { status: 400 }
    );
  }

  if (!process.env.NVIDIA_API_KEY) {
    return NextResponse.json(
      {
        error: "NOT_CONFIGURED",
        message:
          "Chat AI nu este configurat încă. Administratorul site-ului trebuie să adauge cheia NVIDIA NIM.",
      },
      { status: 503 }
    );
  }

  // Build full message history with system prompt
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...sanitized,
  ];

  try {
    // Loop until model returns a final message without tool calls
    // Cap at 5 iterations to prevent runaway tool loops
    for (let i = 0; i < 5; i++) {
      const completion = await callNvidia(messages, true);
      const msg = completion.choices?.[0]?.message;
      if (!msg) {
        return NextResponse.json(
          { error: "Empty response from model" },
          { status: 502 }
        );
      }

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // Final answer
        return NextResponse.json({
          message: msg.content || "",
          usage: completion.usage,
        });
      }

      // Execute tool calls
      messages.push({
        role: "assistant",
        content: msg.content || "",
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const name = tc.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}");
        } catch {}
        const result = await executeToolCall(name, args);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name,
          content: result,
        });
      }
    }

    return NextResponse.json(
      { error: "Tool loop limit exceeded" },
      { status: 502 }
    );
  } catch (err: any) {
    console.error("[chat] error:", redact(String(err?.message ?? err)));
    const upstream = err?.upstreamStatus;
    const status = upstream && upstream >= 500 ? 502 : 500;
    return NextResponse.json(
      {
        error: "INTERNAL",
        message:
          "Asistentul nu este disponibil momentan. Reîncearcă peste câteva minute.",
      },
      { status }
    );
  }
}
