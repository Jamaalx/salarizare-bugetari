import { NextRequest, NextResponse } from "next/server";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TOOL_DEFINITIONS } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MCP server stateless cu HTTP transport simplificat.
 *
 * Implementăm direct JSON-RPC peste POST fără SSE / sesiuni — fiecare request
 * este self-contained. Funcționează cu Claude.ai (MCP connector pe Pro/Team) și
 * cu orice client MCP care suportă HTTP streamable.
 */

function buildServer() {
  const server = new Server(
    { name: "salarizare-bugetari-ro", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.schema as any, { target: "openApi3" }) as any,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const def = TOOL_DEFINITIONS.find((t) => t.name === req.params.name);
    if (!def) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      };
    }
    try {
      const parsed = def.schema.parse(req.params.arguments ?? {});
      const result = (def.handler as any)(parsed);
      return {
        content: [
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${err?.message ?? String(err)}`,
          },
        ],
      };
    }
  });

  return server;
}

/**
 * Handler pentru JSON-RPC peste POST.
 * Acceptă o singură cerere (sau array de cereri) și răspunde sincron.
 */
async function handleRpc(body: any): Promise<any> {
  const server = buildServer();
  const requests = Array.isArray(body) ? body : [body];
  const responses: any[] = [];

  for (const req of requests) {
    try {
      // Validate request shape
      if (!req || typeof req !== "object" || req.jsonrpc !== "2.0" || !req.method) {
        responses.push({
          jsonrpc: "2.0",
          id: req?.id ?? null,
          error: { code: -32600, message: "Invalid Request" },
        });
        continue;
      }

      // Special-case `initialize`: respond with server capabilities
      if (req.method === "initialize") {
        responses.push({
          jsonrpc: "2.0",
          id: req.id,
          result: {
            protocolVersion: "2025-06-18",
            capabilities: { tools: {} },
            serverInfo: { name: "salarizare-bugetari-ro", version: "1.0.0" },
          },
        });
        continue;
      }

      // Notifications (no id) — silently accepted
      if (req.method === "notifications/initialized" || !("id" in req)) {
        continue;
      }

      // Route via handlers we registered on the Server instance
      // We bypass Server's transport plumbing and call handlers directly
      const handlers = (server as any)._requestHandlers as Map<string, any>;
      const handler = handlers.get(req.method);
      if (!handler) {
        responses.push({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        });
        continue;
      }
      const result = await handler({ method: req.method, params: req.params ?? {} });
      responses.push({ jsonrpc: "2.0", id: req.id, result });
    } catch (err: any) {
      responses.push({
        jsonrpc: "2.0",
        id: req?.id ?? null,
        error: { code: -32603, message: err?.message ?? "Internal error" },
      });
    }
  }

  return Array.isArray(body) ? responses : responses[0];
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      { status: 400 }
    );
  }
  const result = await handleRpc(body);
  // If it was only notifications, result is undefined — respond 204
  if (result === undefined) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function GET() {
  return NextResponse.json({
    name: "salarizare-bugetari-ro",
    version: "1.0.0",
    protocol: "Model Context Protocol",
    transport: "HTTP (JSON-RPC over POST)",
    documentation: "https://salarizare.zed-zen.com/mcp",
    tools: TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
    })),
    usage:
      "Send JSON-RPC requests via POST to this endpoint. Compatible with MCP clients (Claude.ai connector, mcp-cli, etc.)",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
