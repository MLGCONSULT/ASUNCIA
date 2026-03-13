import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PageMotion from "@/components/PageMotion";

const NotionView = dynamic(() => import("./NotionView"));

export default async function NotionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: notionToken } = await supabase
    .from("oauth_tokens")
    .select("access_token, refresh_token")
    .eq("utilisateur_id", user.id)
    .eq("provider", "notion")
    .maybeSingle();
  const hasNotion = !!(notionToken?.refresh_token ?? notionToken?.access_token);

  return (
    <PageMotion className="h-full flex flex-col min-h-0">
      <div className="shrink-0 mb-2">
        <h1 className="text-lg sm:text-xl font-bold font-display text-text-primary">
          Notion
        </h1>
        <p className="text-text-muted text-xs mt-0.5">
          Bases et pages (OAuth Notion).
        </p>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <NotionView hasNotion={hasNotion} />
      </div>
    </PageMotion>
  );
}
