import { Router } from "express";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import { parseQuery } from "../validators/http.js";
import { conversationQuerySchema } from "../validators/schemas.js";
import type { AuthRequest } from "../middleware/auth.js";

export function conversationRouter(): Router {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const { conversationId: conversationIdParam } = parseQuery(conversationQuerySchema, req);
    const supabase = createUserSupabaseFromRequest(req);

    let conversationId: string;

    if (conversationIdParam) {
      const { data: conv, error: convErr } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationIdParam)
        .eq("utilisateur_id", user.id)
        .maybeSingle();
      if (convErr || !conv?.id) {
        res.status(404).json({ error: "Conversation introuvable" });
        return;
      }
      conversationId = conv.id;
    } else {
      const { data: existing } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("utilisateur_id", user.id)
        .order("date_mise_a_jour", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        conversationId = existing.id;
      } else {
        const { data: created, error: insertErr } = await supabase
          .from("ai_conversations")
          .insert({ utilisateur_id: user.id, titre: "Nouvelle conversation" })
          .select("id")
          .single();
        if (insertErr || !created?.id) {
          res.status(500).json({ error: "Impossible de créer la conversation" });
          return;
        }
        conversationId = created.id;
      }
    }

    const { data: messages, error: msgErr } = await supabase
      .from("ai_messages")
      .select("id, role, contenu, date_creation")
      .eq("conversation_id", conversationId)
      .order("date_creation", { ascending: true });

    if (msgErr) {
      res.status(500).json({ error: "Impossible de charger les messages" });
      return;
    }

    res.json({
      conversationId,
      messages: (messages ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.contenu,
        date: m.date_creation,
      })),
    });
  });

  return router;
}
