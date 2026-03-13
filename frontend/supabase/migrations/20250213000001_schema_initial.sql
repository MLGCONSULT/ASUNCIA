-- AsuncIA – Schéma initial (colonnes en français)

-- Enum pour le statut des leads
CREATE TYPE statut_lead AS ENUM ('nouveau', 'contacte', 'qualifie', 'gagne', 'perdu');

-- Table profiles (1 ligne par utilisateur, liée à auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nom_affichage text,
  avatar_url text,
  date_creation timestamptz NOT NULL DEFAULT now(),
  date_mise_a_jour timestamptz NOT NULL DEFAULT now()
);

-- Table leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL,
  email text NOT NULL,
  statut statut_lead NOT NULL DEFAULT 'nouveau',
  notes text,
  date_creation timestamptz NOT NULL DEFAULT now(),
  date_mise_a_jour timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_utilisateur_date ON public.leads(utilisateur_id, date_creation DESC);

-- Table ai_memory
CREATE TABLE public.ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cle text NOT NULL,
  contenu jsonb NOT NULL DEFAULT '{}',
  date_creation timestamptz NOT NULL DEFAULT now(),
  date_mise_a_jour timestamptz NOT NULL DEFAULT now(),
  UNIQUE(utilisateur_id, cle)
);

CREATE INDEX idx_ai_memory_utilisateur ON public.ai_memory(utilisateur_id);

-- Table ai_conversations
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre text NOT NULL DEFAULT 'Nouvelle conversation',
  date_creation timestamptz NOT NULL DEFAULT now(),
  date_mise_a_jour timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_utilisateur ON public.ai_conversations(utilisateur_id, date_creation DESC);

-- Table ai_messages
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  contenu text NOT NULL,
  appels_outils jsonb,
  date_creation timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id);

-- Table ai_action_logs
CREATE TABLE public.ai_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_action text NOT NULL,
  charge_utile jsonb,
  resultat jsonb,
  date_creation timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_action_logs_utilisateur ON public.ai_action_logs(utilisateur_id, date_creation DESC);

-- Trigger : créer un profil à l'inscription
CREATE OR REPLACE FUNCTION public.creer_profil_utilisateur()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom_affichage)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom_affichage', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nom_affichage = COALESCE(EXCLUDED.nom_affichage, profiles.nom_affichage),
    date_mise_a_jour = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.creer_profil_utilisateur();
