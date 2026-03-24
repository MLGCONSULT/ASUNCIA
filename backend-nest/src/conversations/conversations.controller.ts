import { Body, Controller, Get, Post, Req, HttpException, HttpStatus } from "@nestjs/common";
import type { Request } from "express";
import { createUserSupabaseFromRequest } from "../services/auth-context";

type AuthRequest = Request & { user?: { id: string } };

type ConversationCreateBody = {
  titre?: string | null;
};

function isRecoverableStorageError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("schema cache") === true ||
    error.message?.includes("Could not find the table") === true
  );
}

@Controller("conversations")
export class ConversationsController {
  @Get()
  async list(@Req() req: AuthRequest) {
    const user = req.user;
    if (!user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    const supabase = createUserSupabaseFromRequest(req);
    const { data: conversations, error } = await supabase
      .from("ai_conversations")
      .select("id, titre, date_creation, date_mise_a_jour")
      .eq("utilisateur_id", user.id)
      .order("date_mise_a_jour", { ascending: false })
      .limit(50);
    if (error) {
      if (isRecoverableStorageError(error)) {
        return { conversations: [] };
      }
      throw new HttpException(
        { error: `Impossible de charger les conversations: ${error.message}` },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      conversations: (conversations ?? []).map((c) => ({
        id: c.id,
        titre: c.titre,
        dateCreation: c.date_creation,
        dateMiseAJour: c.date_mise_a_jour,
      })),
    };
  }

  @Post()
  async create(@Req() req: AuthRequest, @Body() body: ConversationCreateBody) {
    const user = req.user;
    if (!user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    const supabase = createUserSupabaseFromRequest(req);
    const safeTitle = body.titre || "Nouvelle conversation";
    const { data: created, error } = await supabase
      .from("ai_conversations")
      .insert({ utilisateur_id: user.id, titre: safeTitle })
      .select("id, titre, date_creation")
      .single();
    if (error || !created?.id) {
      if (isRecoverableStorageError(error)) {
        return {
          conversationId: null,
          titre: safeTitle,
          dateCreation: null,
        };
      }
      throw new HttpException(
        { error: `Impossible de créer la conversation: ${error?.message ?? "erreur inconnue"}` },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      conversationId: created.id,
      titre: created.titre,
      dateCreation: created.date_creation,
    };
  }
}

