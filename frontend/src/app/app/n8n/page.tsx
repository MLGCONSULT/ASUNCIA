import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageMotion from "@/components/PageMotion";

const N8nView = dynamic(() => import("./N8nView"));

export default async function N8nPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  return (
    <PageMotion className="h-full flex flex-col min-h-0">
      <div className="shrink-0 mb-2">
        <h1 className="text-lg sm:text-xl font-bold font-display text-text-primary">
          Workflows n8n
        </h1>
        <p className="text-text-muted text-xs mt-0.5">
          Liste et exécution via MCP n8n.
        </p>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <N8nView />
      </div>
    </PageMotion>
  );
}
