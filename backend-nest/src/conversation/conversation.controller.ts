import { Controller, Get, Query, Req, HttpException, HttpStatus } from "@nestjs/common";
import type { Request } from "express";
import { createUserSupabaseFromRequest } from "../services/auth-context";

type AuthRequest = Request & { user?: { id: string } };

type ConversationQuery = {
  conversationId?: string;
};

@Controller("conversation")
export class ConversationController {
  @Get()
  async getConversation(@Req() req: AuthRequest, @Query() query: ConversationQuery) {
    const user = req.user;
    if (!user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    const { conversationId: conversationIdParam } = query;
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
        throw new HttpException(
          { error: "Conversation introuvable" },
          HttpStatus.NOT_FOUND,
        );
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
          throw new HttpException(
            { error: "Impossible de créer la conversation" },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
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
      throw new HttpException(
        { error: "Impossible de charger les messages" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      conversationId,
      messages: (messages ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.contenu,
        date: m.date_creation,
      })),
    };
  }
}

