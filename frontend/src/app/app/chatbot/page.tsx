/**
 * Stacky — chatbot Typebot hébergé sur typebot.co.
 * Intégration en iframe : même URL que la page publique (le SDK JS attend le *slug* public,
 * pas l’ID interne ; une iframe évite toute ambiguïté avec l’API viewer).
 */
const STACKY_TYPEBOT_URL = "https://typebot.co/stacky-asuncian";

export default function ChatbotPage() {
  return (
    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col">
      <div className="glass-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10">
        <div className="border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
          <h1 className="text-base font-semibold text-text-primary sm:text-lg">Chatbot Stacky</h1>
          <p className="mt-1 text-[11px] text-text-muted sm:text-xs">
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

        <div className="relative min-h-0 flex-1 p-1.5 sm:p-2">
          <iframe
            title="Stacky — questionnaire pour choisir une stack"
            src={STACKY_TYPEBOT_URL}
            className="block w-full rounded-xl border-0 bg-void/40"
            style={{
              height: "min(72dvh, calc(100dvh - 13rem))",
              minHeight: "min(260px, 50dvh)",
            }}
            allow="clipboard-write; microphone"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
