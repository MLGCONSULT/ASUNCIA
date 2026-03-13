import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PageMotion from "@/components/PageMotion";

const AirtableView = dynamic(() => import("./AirtableView"));

export default async function AirtablePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: airtableToken } = await supabase
    .from("oauth_tokens")
    .select("access_token, refresh_token")
    .eq("utilisateur_id", user.id)
    .eq("provider", "airtable")
    .maybeSingle();
  const hasAirtable = !!(airtableToken?.refresh_token ?? airtableToken?.access_token);

  return (
    <PageMotion className="h-full flex flex-col min-h-0">
      <div className="shrink-0 mb-2">
        <h1 className="text-lg sm:text-xl font-bold font-display text-text-primary">
          Airtable
        </h1>
        <p className="text-text-muted text-xs mt-0.5">
          Bases et tables connectées (OAuth Airtable).
        </p>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <AirtableView hasAirtable={hasAirtable} />
      </div>
    </PageMotion>
  );
}
