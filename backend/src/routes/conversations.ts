import { Router } from "express";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import { parseBody } from "../validators/http.js";
import { conversationCreateBodySchema } from "../validators/schemas.js";
import type { AuthRequest } from "../middleware/auth.js";

export function conversationsRouter(): Router {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const supabase = createUserSupabaseFromRequest(req);
    const { data: conversations, error } = await supabase
      .from("ai_conversations")
      .select("id, titre, date_creation, date_mise_a_jour")
      .eq("utilisateur_id", user.id)
      .order("date_mise_a_jour", { ascending: false })
      .limit(50);
    if (error) {
      res.status(500).json({ error: "Impossible de charger les conversations" });
      return;
    }
    res.json({
      conversations: (conversations ?? []).map((c) => ({
        id: c.id,
        titre: c.titre,
        dateCreation: c.date_creation,
        dateMiseAJour: c.date_mise_a_jour,
      })),
    });
  });

  router.post("/", async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const supabase = createUserSupabaseFromRequest(req);
    const { titre } = parseBody(conversationCreateBodySchema, req);
    const safeTitle = titre || "Nouvelle conversation";
    const { data: created, error } = await supabase
      .from("ai_conversations")
      .insert({ utilisateur_id: user.id, titre: safeTitle })
      .select("id, titre, date_creation")
      .single();
    if (error || !created?.id) {
      res.status(500).json({ error: "Impossible de créer la conversation" });
      return;
    }
    res.json({ conversationId: created.id, titre: created.titre, dateCreation: created.date_creation });
  });

  return router;
}
