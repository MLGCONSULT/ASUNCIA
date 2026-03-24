import {
  Body,
  Controller,
  Post,
  Req,
  HttpException,
  HttpStatus,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import OpenAI from "openai";
import { CHAT_TOOLS } from "../ai/tools-definitions";
import { executeTool } from "../ai/tool-executor";
import { SYSTEM_PROMPT } from "../ai/prompt";
import { createUserSupabaseFromRequest } from "../services/auth-context";

const FALLBACK_REPLY =
  "Bienvenue. Dis-moi simplement ce que tu souhaites faire : organiser Airtable, explorer Notion, lancer une automatisation n8n… Je m'occupe du reste.";
const MAX_TOOL_ROUNDS = 5;

type AuthRequest = Request & { user?: { id: string } };

type ChatHistoryItem = { role: string; content: string };

type ChatBody = {
  message: string;
  history: ChatHistoryItem[];
  conversationId?: string | null;
  createNew?: boolean;
  stream?: boolean;
};

type Message =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

function buildInitialMessages(history: ChatHistoryItem[], newMessage: string): Message[] {
  const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const m of history) {
    if (m.role === "user" || m.role === "assistant") {
      messages.push({ role: m.role as "user" | "assistant", content: m.content });
    }
  }
  messages.push({ role: "user", content: newMessage });
  return messages;
}

function accumulateToolCalls(
  acc: { id: string; name: string; arguments: string }[],
  delta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta,
): void {
  if (!delta.tool_calls?.length) return;
  for (const tc of delta.tool_calls) {
    const i = tc.index ?? acc.length;
    if (!acc[i]) acc[i] = { id: "", name: "", arguments: "" };
    if (tc.id) acc[i].id = tc.id;
    if (tc.function?.name) acc[i].name = tc.function.name;
    if (tc.function?.arguments) acc[i].arguments += tc.function.arguments;
  }
}

function streamLine(
  encoder: InstanceType<typeof TextEncoder>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  obj: Record<string, unknown>,
): void {
  controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
}

@Controller("chat")
export class ChatController {
  @Post()
  async chat(@Req() req: AuthRequest, @Body() body: ChatBody, @Res() res: Response) {
    const user = req.user;
    if (!user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    const supabase = createUserSupabaseFromRequest(req);

    const message = body.message;
    const history = Array.isArray(body.history) ? body.history : [];
    let conversationId = body.conversationId ?? null;
    const createNew = body.createNew === true;

    if (!conversationId) {
      if (createNew) {
        const titre =
          message.slice(0, 45) + (message.length > 45 ? "…" : "") || "Nouvelle conversation";
        const { data: created, error: insertErr } = await supabase
          .from("ai_conversations")
          .insert({ utilisateur_id: user.id, titre })
          .select("id")
          .single();
        if (!insertErr && created?.id) conversationId = created.id;
      } else {
        const { data: existing } = await supabase
          .from("ai_conversations")
          .select("id")
          .eq("utilisateur_id", user.id)
          .order("date_mise_a_jour", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing?.id) conversationId = existing.id;
        else {
          const { data: created, error: insertErr } = await supabase
            .from("ai_conversations")
            .insert({ utilisateur_id: user.id, titre: "Nouvelle conversation" })
            .select("id")
            .single();
          if (!insertErr && created?.id) conversationId = created.id;
        }
      }
    }

    if (conversationId) {
      await supabase
        .from("ai_messages")
        .insert({ conversation_id: conversationId, role: "user", contenu: message });
      await supabase
        .from("ai_conversations")
        .update({ date_mise_a_jour: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("utilisateur_id", user.id);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    const useStream = body.stream !== false;

    if (!apiKey) {
      if (conversationId) {
        await supabase
          .from("ai_messages")
          .insert({ conversation_id: conversationId, role: "assistant", contenu: FALLBACK_REPLY });
        await supabase
          .from("ai_conversations")
          .update({ date_mise_a_jour: new Date().toISOString() })
          .eq("id", conversationId);
      }
      res.json({ reply: FALLBACK_REPLY, conversationId });
      return;
    }

    const openai = new OpenAI({ apiKey });
    let messages: Message[] = buildInitialMessages(history, message);
    const ctx = { supabase, userId: user.id };
    const encoder = new TextEncoder();

    if (!useStream) {
      let rounds = 0;
      let lastContent: string | null = null;
      while (rounds < MAX_TOOL_ROUNDS) {
        rounds++;
        const completion = await openai.chat.completions.create({
          model,
          messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          tools: CHAT_TOOLS,
          tool_choice: "auto",
          max_completion_tokens: 1024,
        });
        const choice = completion.choices[0];
        const msg = choice?.message;
        if (!msg) {
          lastContent = FALLBACK_REPLY;
          break;
        }
        lastContent = msg.content?.trim() ?? null;
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          messages.push({
            role: "assistant",
            content: msg.content ?? null,
            tool_calls: msg.tool_calls,
          });
          for (const tc of msg.tool_calls) {
            const fn = "function" in tc ? tc.function : undefined;
            const name = fn?.name ?? "";
            let args: Record<string, unknown> = {};
            try {
              if (fn?.arguments) args = JSON.parse(fn.arguments);
            } catch {}
            const result = await executeTool(name, args, ctx);
            messages.push({ role: "tool", tool_call_id: tc.id!, content: result });
          }
          continue;
        }
        break;
      }
      const reply = lastContent && lastContent.length > 0 ? lastContent : FALLBACK_REPLY;
      if (conversationId) {
        await supabase
          .from("ai_messages")
          .insert({ conversation_id: conversationId, role: "assistant", contenu: reply });
        await supabase
          .from("ai_conversations")
          .update({ date_mise_a_jour: new Date().toISOString() })
          .eq("id", conversationId);
      }
      res.json({ reply, conversationId });
      return;
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let streamedContent = "";
          const accToolCalls: { id: string; name: string; arguments: string }[] = [];
          const streamResponse = await openai.chat.completions.create({
            model,
            messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
            tools: CHAT_TOOLS,
            tool_choice: "auto",
            max_completion_tokens: 1024,
            stream: true,
          });
          for await (const chunk of streamResponse) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;
            if (delta.content) {
              streamedContent += delta.content;
              streamLine(encoder, controller, { type: "chunk", content: delta.content });
            }
            accumulateToolCalls(accToolCalls, delta);
          }
          const hasToolCalls =
            accToolCalls.length > 0 && accToolCalls.some((t) => t.id && t.name);
          if (hasToolCalls) {
            const toolCalls = accToolCalls
              .filter((t) => t.id && t.name)
              .map((t) => ({
                id: t.id,
                type: "function" as const,
                function: { name: t.name, arguments: t.arguments },
              }));
            messages.push({
              role: "assistant",
              content: streamedContent.trim() || null,
              tool_calls: toolCalls,
            });
            for (const tc of toolCalls) {
              const fn = (tc as { function: { name: string; arguments?: string } }).function;
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(fn.arguments || "{}");
              } catch {}
              const result = await executeTool(fn.name, args, ctx);
              messages.push({ role: "tool", tool_call_id: tc.id, content: result });
            }
            const finalCompletion = await openai.chat.completions.create({
              model,
              messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
              tools: CHAT_TOOLS,
              tool_choice: "none",
              max_completion_tokens: 1024,
            });
            const finalMsg = finalCompletion.choices[0]?.message;
            const finalContent = finalMsg?.content?.trim() ?? "";
            if (finalContent)
              streamLine(encoder, controller, { type: "chunk", content: finalContent });
            const fullReply =
              [streamedContent.trim(), finalContent].filter(Boolean).join("\n\n") ||
              FALLBACK_REPLY;
            if (conversationId) {
              await supabase
                .from("ai_messages")
                .insert({
                  conversation_id: conversationId,
                  role: "assistant",
                  contenu: fullReply,
                });
              await supabase
                .from("ai_conversations")
                .update({ date_mise_a_jour: new Date().toISOString() })
                .eq("id", conversationId);
            }
            streamLine(encoder, controller, {
              type: "done",
              content: fullReply,
              conversationId: conversationId ?? undefined,
            });
          } else {
            const fullReply = streamedContent.trim() || FALLBACK_REPLY;
            if (conversationId) {
              await supabase
                .from("ai_messages")
                .insert({
                  conversation_id: conversationId,
                  role: "assistant",
                  contenu: fullReply,
                });
              await supabase
                .from("ai_conversations")
                .update({ date_mise_a_jour: new Date().toISOString() })
                .eq("id", conversationId);
            }
            streamLine(encoder, controller, {
              type: "done",
              content: fullReply,
              conversationId: conversationId ?? undefined,
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          streamLine(encoder, controller, { type: "error", error: msg });
        } finally {
          controller.close();
        }
      },
    });

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    const reader = stream.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } finally {
        res.end();
      }
    };
    pump();
  }
}

