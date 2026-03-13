-- Persistance des etats OAuth temporaires et des clients OAuth dynamiques.

CREATE TABLE public.oauth_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  state text NOT NULL,
  utilisateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_verifier text NOT NULL,
  redirect_uri text,
  client_id text,
  client_secret text,
  expires_at timestamptz NOT NULL,
  date_creation timestamptz NOT NULL DEFAULT now(),
  date_mise_a_jour timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, state)
);

CREATE INDEX idx_oauth_pending_provider_expires
  ON public.oauth_pending(provider, expires_at);

ALTER TABLE public.oauth_pending ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.oauth_provider_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  redirect_uri text NOT NULL,
  client_id text NOT NULL,
  client_secret text,
  date_creation timestamptz NOT NULL DEFAULT now(),
  date_mise_a_jour timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, redirect_uri)
);

CREATE INDEX idx_oauth_provider_clients_provider
  ON public.oauth_provider_clients(provider);

ALTER TABLE public.oauth_provider_clients ENABLE ROW LEVEL SECURITY;
