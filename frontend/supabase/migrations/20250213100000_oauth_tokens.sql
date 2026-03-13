-- AsuncIA – Table oauth_tokens (tokens OAuth par utilisateur, ex. Gmail)

CREATE TABLE public.oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text,
  refresh_token text NOT NULL,
  expires_at timestamptz,
  date_creation timestamptz NOT NULL DEFAULT now(),
  date_mise_a_jour timestamptz NOT NULL DEFAULT now(),
  UNIQUE(utilisateur_id, provider)
);

CREATE INDEX idx_oauth_tokens_utilisateur ON public.oauth_tokens(utilisateur_id);

ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_tokens_select_own" ON public.oauth_tokens
  FOR SELECT USING (auth.uid() = utilisateur_id);

CREATE POLICY "oauth_tokens_insert_own" ON public.oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);

CREATE POLICY "oauth_tokens_update_own" ON public.oauth_tokens
  FOR UPDATE USING (auth.uid() = utilisateur_id);

CREATE POLICY "oauth_tokens_delete_own" ON public.oauth_tokens
  FOR DELETE USING (auth.uid() = utilisateur_id);
