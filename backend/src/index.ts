import express from "express";
import { corsMiddleware } from "./middleware/cors.js";
import { requireAuth } from "./middleware/auth.js";
import { chatRouter } from "./routes/chat.js";
import { conversationsRouter } from "./routes/conversations.js";
import { conversationRouter } from "./routes/conversation.js";
import { airtableRouter } from "./routes/airtable.js";
import { notionRouter } from "./routes/notion.js";
import { n8nRouter } from "./routes/n8n.js";
import { gmailRouter } from "./routes/gmail.js";
import { mcpRouter } from "./routes/mcp.js";
import { healthRouter } from "./routes/health.js";
import { deconnexionRouter } from "./routes/deconnexion.js";
import { authNotionRouter } from "./routes/auth-notion.js";
import { authAirtableRouter } from "./routes/auth-airtable.js";

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter());
app.use("/api/auth/notion", authNotionRouter());
app.use("/api/auth/airtable", authAirtableRouter());

app.use("/api/chat", requireAuth, chatRouter());
app.use("/api/chat/conversations", requireAuth, conversationsRouter());
app.use("/api/chat/conversation", requireAuth, conversationRouter());
app.use("/api/airtable", requireAuth, airtableRouter());
app.use("/api/notion", requireAuth, notionRouter());
app.use("/api/n8n", requireAuth, n8nRouter());
app.use("/api/gmail", requireAuth, gmailRouter());
app.use("/api/mcp", requireAuth, mcpRouter());
app.use("/api/deconnexion", requireAuth, deconnexionRouter());

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
