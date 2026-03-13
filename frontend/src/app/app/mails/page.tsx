import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PageMotion from "@/components/PageMotion";

const MailsView = dynamic(() => import("./MailsView"));

export default async function MailsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: tokenRow } = await supabase
    .from("oauth_tokens")
    .select("id")
    .eq("utilisateur_id", user.id)
    .eq("provider", "gmail")
    .maybeSingle();

  const hasGmail = !!tokenRow;

  return (
    <PageMotion className="h-full flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between mb-2">
        <h1 className="text-lg sm:text-xl font-bold font-display text-text-primary">
          Mails
        </h1>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <MailsView hasGmail={hasGmail} />
      </div>
    </PageMotion>
  );
}
