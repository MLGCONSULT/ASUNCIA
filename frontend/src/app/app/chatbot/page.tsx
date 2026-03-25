/**
 * Stacky — chatbot Typebot hébergé sur typebot.co (iframe = même rendu que la page publique).
 * Hauteur limitée au viewport : pas de scroll sur la page app, le défilement éventuel reste dans l’iframe.
 */
const STACKY_TYPEBOT_URL = "https://typebot.co/stacky-asuncian";

export default function ChatbotPage() {
  return (
    <div
      className="flex h-full min-h-0 max-h-full flex-1 flex-col overflow-hidden"
      style={{
        /* Espace sous header fixe, dock bas (pb-28), marges / padding du panneau */
        maxHeight:
          "calc(100dvh - 3.5rem - env(safe-area-inset-top, 0px) - 7rem - 3rem)",
      }}
    >
      <div className="glass-strong flex min-h-0 max-h-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/10">
        <div className="shrink-0 border-b border-white/10 px-3 py-2 sm:px-4">
          <h1 className="text-sm font-semibold text-text-primary sm:text-base">Chatbot Stacky</h1>
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-text-muted sm:text-xs">
            Stacky te pose quelques questions pour recommander la stack la plus adaptée.{" "}
            <a
              href={STACKY_TYPEBOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-cyan/90 underline-offset-2 hover:underline"
            >
              Ouvrir dans un nouvel onglet
            </a>
          </p>
        </div>

        <div className="relative min-h-0 flex-1 p-1 sm:p-1.5">
          <iframe
            title="Stacky — questionnaire pour choisir une stack"
            src={STACKY_TYPEBOT_URL}
            className="absolute inset-0 box-border h-full w-full rounded-lg border-0 bg-void/40"
            allow="clipboard-write; microphone"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
