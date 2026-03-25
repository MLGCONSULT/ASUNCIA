"use client";

import Script from "next/script";

const TYPEBOT_ID = "cmm4n5oms000304leue87l05d";
// Typebot utilise un Custom Element web (`<typebot-standard />`) : on le rend via un cast pour éviter
// d'avoir à déclarer son type JSX dans tout le projet.
const TypebotStandard = "typebot-standard" as any;

export default function ChatbotPage() {
  return (
    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col">
      <Script
        id="typebot-stacky-asuncian"
        type="module"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            import Typebot from "https://cdn.jsdelivr.net/npm/@typebot.io/js@0/dist/web.js";
            Typebot.initStandard({
              typebot: "${TYPEBOT_ID}",
            });
          `,
        }}
      />

      <div className="glass-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10">
        <div className="border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
          <h1 className="text-base font-semibold text-text-primary sm:text-lg">Chatbot Stacky</h1>
          <p className="mt-1 text-[11px] text-text-muted sm:text-xs">
            Stacky te pose quelques questions pour recommander la stack la plus adaptée.
          </p>
        </div>

        <div className="min-h-0 flex-1 p-1.5 sm:p-2">
          <TypebotStandard
            className="block w-full"
            style={{
              width: "100%",
              height: "min(72dvh, calc(100dvh - 13rem))",
              minHeight: "min(260px, 50dvh)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

