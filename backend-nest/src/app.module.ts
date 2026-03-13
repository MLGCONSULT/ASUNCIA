import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { HealthModule } from "./health/health.module";
import { McpModule } from "./mcp/mcp.module";
import { AirtableModule } from "./airtable/airtable.module";
import { NotionModule } from "./notion/notion.module";
import { GmailModule } from "./gmail/gmail.module";
import { N8nModule } from "./n8n/n8n.module";
import { ChatModule } from "./chat/chat.module";
import { ConversationModule } from "./conversation/conversation.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    HealthModule,
    McpModule,
    AirtableModule,
    NotionModule,
    GmailModule,
    N8nModule,
    ChatModule,
    ConversationModule,
    ConversationsModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

