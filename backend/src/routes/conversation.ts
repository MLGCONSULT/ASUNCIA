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
      // Prioriser une conversation qui contient déjà des messages pour afficher un
      // historique utile au chargement (et éviter de tomber sur une conversation vide).
      const { data: latestConversations } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("utilisateur_id", user.id)
        .order("date_mise_a_jour", { ascending: false })
        .limit(50);

      const conversationIds = (latestConversations ?? []).map((c) => c.id).filter(Boolean);
      let selectedId: string | null = null;

      if (conversationIds.length > 0) {
        const { data: latestMessage } = await supabase
          .from("ai_messages")
          .select("conversation_id, date_creation")
          .in("conversation_id", conversationIds)
          .order("date_creation", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestMessage?.conversation_id) {
          selectedId = latestMessage.conversation_id;
        }
      }

      if (selectedId) {
        conversationId = selectedId;
      } else if (conversationIds.length > 0) {
        // Fallback: dernière conversation même si vide.
        conversationId = conversationIds[0];
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
