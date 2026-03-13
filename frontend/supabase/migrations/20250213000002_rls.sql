-- AsuncIA – Row Level Security (isolation par utilisateur_id)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;

-- profiles : voir/modifier uniquement son profil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- leads : CRUD uniquement sur ses leads
CREATE POLICY "leads_select_own" ON public.leads
  FOR SELECT USING (auth.uid() = utilisateur_id);

CREATE POLICY "leads_insert_own" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);

CREATE POLICY "leads_update_own" ON public.leads
  FOR UPDATE USING (auth.uid() = utilisateur_id);

CREATE POLICY "leads_delete_own" ON public.leads
  FOR DELETE USING (auth.uid() = utilisateur_id);

-- ai_memory
CREATE POLICY "ai_memory_select_own" ON public.ai_memory
  FOR SELECT USING (auth.uid() = utilisateur_id);

CREATE POLICY "ai_memory_insert_own" ON public.ai_memory
  FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);

CREATE POLICY "ai_memory_update_own" ON public.ai_memory
  FOR UPDATE USING (auth.uid() = utilisateur_id);

CREATE POLICY "ai_memory_delete_own" ON public.ai_memory
  FOR DELETE USING (auth.uid() = utilisateur_id);

-- ai_conversations
CREATE POLICY "ai_conversations_select_own" ON public.ai_conversations
  FOR SELECT USING (auth.uid() = utilisateur_id);

CREATE POLICY "ai_conversations_insert_own" ON public.ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);

CREATE POLICY "ai_conversations_update_own" ON public.ai_conversations
  FOR UPDATE USING (auth.uid() = utilisateur_id);

CREATE POLICY "ai_conversations_delete_own" ON public.ai_conversations
  FOR DELETE USING (auth.uid() = utilisateur_id);

-- ai_messages : accès via la conversation (propriétaire de la conversation)
CREATE POLICY "ai_messages_select_via_conversation" ON public.ai_messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM public.ai_conversations WHERE utilisateur_id = auth.uid())
  );

CREATE POLICY "ai_messages_insert_via_conversation" ON public.ai_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM public.ai_conversations WHERE utilisateur_id = auth.uid())
  );

-- ai_action_logs : lecture et écriture uniquement pour soi
CREATE POLICY "ai_action_logs_select_own" ON public.ai_action_logs
  FOR SELECT USING (auth.uid() = utilisateur_id);

CREATE POLICY "ai_action_logs_insert_own" ON public.ai_action_logs
  FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);
