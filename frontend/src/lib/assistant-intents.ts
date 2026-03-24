export type AssistantIntent = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

export const dashboardIntents: AssistantIntent[] = [
  {
    id: "daily-priority",
    title: "Prioriser ma journée",
    description: "Identifier les actions les plus importantes.",
    prompt: "Aide-moi a prioriser ma journee selon Airtable, Notion et n8n.",
  },
  {
    id: "airtable-check",
    title: "Analyser mes donnees",
    description: "Explorer Airtable et remonter les points utiles.",
    prompt: "Analyse mes donnees Airtable et dis-moi quelles actions prioritaires je devrais traiter.",
  },
  {
    id: "notion-focus",
    title: "Trouver mon contexte",
    description: "Retrouver les pages et bases Notion utiles.",
    prompt: "Cherche dans Notion les pages et bases les plus utiles pour preparer ma journee.",
  },
  {
    id: "n8n-review",
    title: "Verifier mes automatisations",
    description: "Comprendre l'etat des workflows n8n.",
    prompt: "Liste mes workflows n8n importants, explique-moi leur role et signale ceux a verifier.",
  },
];

export function buildAssistantPromptUrl(prompt: string): string {
  return `/app/dashboard?prompt=${encodeURIComponent(prompt)}`;
}
