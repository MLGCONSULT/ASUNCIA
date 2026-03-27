-- Configuration MCP par utilisateur (saisie in-app).
-- Permet de ne plus dépendre uniquement des variables d'environnement backend.

CREATE TABLE public.user_mcp_configs (
  utilisateur_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  supabase jsonb NOT NULL DEFAULT '{}'::jsonb,
  n8n jsonb NOT NULL DEFAULT '{}'::jsonb,
  airtable jsonb NOT NULL DEFAULT '{}'::jsonb,
  notion jsonb NOT NULL DEFAULT '{}'::jsonb,
  date_creation timestamptz NOT NULL DEFAULT now(),
  date_mise_a_jour timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_mcp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_mcp_configs_select_own" ON public.user_mcp_configs
  FOR SELECT USING (auth.uid() = utilisateur_id);

CREATE POLICY "user_mcp_configs_insert_own" ON public.user_mcp_configs
  FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);

CREATE POLICY "user_mcp_configs_update_own" ON public.user_mcp_configs
  FOR UPDATE USING (auth.uid() = utilisateur_id);

CREATE POLICY "user_mcp_configs_delete_own" ON public.user_mcp_configs
  FOR DELETE USING (auth.uid() = utilisateur_id);
