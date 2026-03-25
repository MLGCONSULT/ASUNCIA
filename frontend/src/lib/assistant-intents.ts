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
    prompt:
      "Aide-moi à prioriser ma journée selon ce que tu vois dans Airtable, n8n et mes données Supabase.",
  },
  {
    id: "airtable-check",
    title: "Analyser mes données",
    description: "Explorer Airtable et remonter les points utiles.",
    prompt: "Analyse mes données Airtable et dis-moi quelles actions prioritaires je devrais traiter.",
  },
  {
    id: "n8n-create",
    title: "Créer un workflow n8n",
    description: "Structurer une automatisation pas à pas.",
    prompt:
      "Je veux créer un workflow n8n : guide-moi étape par étape (déclencheur, nœuds, données, test) et indique l’onglet /app/n8n pour l’exécuter.",
  },
  {
    id: "n8n-review",
    title: "Vérifier mes automatisations",
    description: "Comprendre l'état des workflows n8n.",
    prompt: "Liste mes workflows n8n importants, explique-moi leur rôle et signale ceux à vérifier.",
  },
  {
    id: "supabase-explore",
    title: "Explorer mes données",
    description: "Formuler ce que tu veux voir dans tes données.",
    prompt:
      "J’aimerais mieux comprendre mes données : aide-moi à formuler une question claire et indique-moi comment l’explorer avec l’outil prévu à cet effet.",
  },
];

export function buildAssistantPromptUrl(prompt: string): string {
  return `/app/dashboard?prompt=${encodeURIComponent(prompt)}`;
}
