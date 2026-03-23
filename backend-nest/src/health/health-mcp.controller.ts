import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import {
  hasAirtableServerToken,
  getAirtableRuntimeMode,
  isAirtableMcpConfigured,
  isAirtableOAuthConfigured,
  listAirtableMcpTools,
} from "../mcp/airtable-client";
import { listN8nMcpTools, isN8nMcpConfigured } from "../mcp/n8n-client";
import {
  hasNotionEnvToken,
  getNotionRuntimeMode,
  hasNotionOAuthConfig,
  isNotionMcpConfigured,
  listNotionMcpTools,
} from "../mcp/notion-client";
import { isSupabaseMcpConfigured, listMcpTools } from "../mcp/supabase-client";

// Attention : dans main.ts, on a un middleware qui réécrit /api/... en /...
// Donc le contrôleur doit être monté sur "health" (sans /api) pour que
// /api/health/... fonctionne en dev et sur Vercel.
@Controller("health")
export class HealthMcpController {
  @Get("mcp-supabase")
  async mcpSupabase(@Res() res: Response) {
    if (!isSupabaseMcpConfigured()) {
      res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ ok: false, error: "SUPABASE_ACCESS_TOKEN ou SUPABASE_PROJECT_REF/NEXT_PUBLIC_SUPABASE_URL manquant" });
      return;
    }
    try {
      const tools = await listMcpTools();
      res.json({ ok: true, tools: (tools as { tools?: unknown[] }).tools ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(HttpStatus.BAD_GATEWAY).json({ ok: false, error: message });
    }
  }

  @Get("mcp-airtable")
  async mcpAirtable(@Res() res: Response) {
    if (!isAirtableMcpConfigured()) {
      res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ ok: false, error: "AIRTABLE_MCP_URL et un mode d'auth Airtable sont requis" });
      return;
    }
    if (!hasAirtableServerToken() && isAirtableOAuthConfigured()) {
      res.json({
        ok: true,
        selectedMode: getAirtableRuntimeMode(),
        mode: "oauth",
        requiresUserConnection: true,
        message: "Airtable MCP configuré en OAuth. Connectez un utilisateur pour vérifier les outils.",
      });
      return;
    }
    try {
      const tools = await listAirtableMcpTools();
      res.json({
        ok: true,
        selectedMode: getAirtableRuntimeMode(),
        mode: hasAirtableServerToken() ? "server-token" : "oauth",
        tools: (tools as { tools?: unknown[] }).tools ?? [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(HttpStatus.BAD_GATEWAY).json({ ok: false, error: message });
    }
  }

  @Get("mcp-n8n")
  async mcpN8n(@Res() res: Response) {
    if (!isN8nMcpConfigured()) {
      res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ ok: false, error: "N8N_MCP_URL ou N8N_MCP_ACCESS_TOKEN manquant" });
      return;
    }
    try {
      const tools = await listN8nMcpTools();
      res.json({ ok: true, tools: (tools as { tools?: unknown[] }).tools ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(HttpStatus.BAD_GATEWAY).json({ ok: false, error: message });
    }
  }

  @Get("mcp-notion")
  async mcpNotion(@Res() res: Response) {
    if (!isNotionMcpConfigured()) {
      res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ ok: false, error: "Notion MCP non configuré" });
      return;
    }
    if (hasNotionEnvToken()) {
      try {
        const tools = await listNotionMcpTools();
        res.json({
          ok: true,
          selectedMode: getNotionRuntimeMode(),
          mode: "server-token",
          tools: (tools as { tools?: unknown[] }).tools ?? [],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(HttpStatus.BAD_GATEWAY).json({ ok: false, error: message });
      }
      return;
    }
    res.json({
      ok: hasNotionOAuthConfig(),
      selectedMode: getNotionRuntimeMode(),
      mode: "oauth",
      requiresUserConnection: true,
      message: hasNotionOAuthConfig()
        ? "Notion MCP configuré en OAuth. Connectez un utilisateur pour vérifier les outils."
        : "NOTION_OAUTH_REDIRECT_URI manquant pour le mode OAuth.",
    });
  }

}

