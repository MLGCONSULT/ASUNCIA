import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavWheel from "@/components/NavWheel";
import FloatingAssistant from "@/components/FloatingAssistant";
import AppHeader from "@/components/AppHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-void overflow-x-hidden">
      <div className="fixed inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="fixed inset-0 lava-app-overlay pointer-events-none" aria-hidden />
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="lava-app-blob lava-app-blob-violet" />
        <div className="lava-app-blob lava-app-blob-cyan" />
        <div className="lava-app-blob lava-app-blob-fuchsia" />
        <div className="lava-app-blob lava-app-blob-amber" />
        <div className="lava-app-blob lava-app-blob-rose" />
        <div className="lava-passive-lamp lava-passive-lamp-left" />
        <div className="lava-passive-lamp lava-passive-lamp-right" />
      </div>
      <AppHeader />
      <main className="relative flex-1 min-h-0 flex flex-col pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-28 px-2 sm:px-4 md:px-4">
        <div className="panel-asymmetric lava-shell flex-1 min-h-0 mx-0 mt-0 mb-1 md:mb-2 glass-strong border border-white/10 overflow-auto flex flex-col">
          <div className="p-4 sm:p-5 md:p-6 flex-1 min-h-0 flex flex-col">
            {children}
          </div>
        </div>
      </main>
      <FloatingAssistant />
      <NavWheel />
    </div>
  );
}
