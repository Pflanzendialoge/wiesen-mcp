import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { holeLetzteWiesenMesswerte, alsSprechbarenText } from "./wiesen.js";
import { KONFIG } from "./wiesen-konfig.js";

const PORT = Number(process.env.PORT || 8080);
const MCP_SECRET = process.env.MCP_SECRET || "";

if (!MCP_SECRET) {
  console.warn("[wiesen-mcp] MCP_SECRET ist nicht gesetzt; der Endpunkt ist ungeschützt. Nur für lokale Tests gedacht.");
}

function baueServer() {
  const server = new McpServer({
    name: "wiesen-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "letzteWiesenMesswerte",
    {
      title: "Letzte Wiesen-Messwerte",
      description:
        "Liefert die neuesten Wiesen-Messwerte aus Airtable: Temperatur, Luftfeuchte, Luftdruck, Akkustand, Stresslevel des Stecklings und eine fertige Zusammenfassung. Nutze dieses Tool, wenn jemand nach aktuellen Werten, dem Zustand der Wiese oder dem Steckling fragt.",
      inputSchema: {
        anzahl: z
          .number()
          .int()
          .min(1)
          .max(KONFIG.maxAnzahl)
          .optional()
          .describe("Wie viele der letzten Messungen geliefert werden sollen; Standard ist 3."),
      },
    },
    async ({ anzahl }) => {
      const daten = await holeLetzteWiesenMesswerte(anzahl);
      const text = alsSprechbarenText(daten);
      return {
        content: [{ type: "text", text }],
        structuredContent: { messwerte: daten, zusammenfassung: text },
      };
    }
  );

  return server;
}

function pruefeSecret(req, res, next) {
  if (!MCP_SECRET) return next();
  const header = String(req.headers["authorization"] || "").replace(/^Bearer\s+/i, "").trim();
  const queryKey = typeof req.query.key === "string" ? req.query.key.trim() : "";
  if ([header, queryKey].includes(MCP_SECRET)) {
    return next();
  }
  console.warn(`[wiesen-mcp] 401 auf /mcp; Auth fehlgeschlagen (header: ${header ? "ja" : "nein"}, key-param: ${queryKey ? "ja" : "nein"})`);
  return res.status(401).json({ error: "unauthorized" });
}

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "wiesen-mcp",
    status: "ok",
    endpoint: "/mcp",
    tools: ["letzteWiesenMesswerte"],
  });
});

// MCP-Endpunkt; stateless, damit es serverlos-freundlich bleibt.
app.post("/mcp", pruefeSecret, async (req, res) => {
  console.log(`[wiesen-mcp] MCP-Call: ${req.body?.method ?? "unbekannte Methode"}`);
  const server = baueServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (fehler) {
    console.error("[wiesen-mcp] Fehler bei MCP-Request:", fehler);
    if (!res.headersSent) {
      res.status(500).json({ error: "Interner Fehler im MCP-Server" });
    }
  }
});

// Stateless: keine Sessions, daher GET/DELETE sauber ablehnen.
app.all("/mcp", (_req, res) => {
  res.status(405).json({ error: "Nur POST wird unterstützt" });
});

app.listen(PORT, () => {
  console.log(`[wiesen-mcp] läuft auf Port ${PORT}; MCP-Endpunkt: /mcp`);
});
