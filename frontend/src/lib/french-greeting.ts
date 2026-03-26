/**
 * Salutation française selon l’heure **locale** (navigateur).
 * Entre minuit et 4 h inclus : « Bonsoir » (fin de soirée / nuit).
 * De 5 h à 17 h inclus : « Bonjour ».
 * À partir de 18 h : « Bonsoir ».
 */
export function frenchTimeGreeting(date: Date): "Bonjour" | "Bonsoir" {
  const h = date.getHours();
  if (h >= 5 && h < 18) return "Bonjour";
  return "Bonsoir";
}

type ProfileRow = { nom_affichage?: string | null; email?: string | null };

type AuthUserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/**
 * Fusionne la ligne `profiles` et la session Supabase : le nom peut ne pas encore
 * être en base alors qu’il est dans `user_metadata` ; l’email de connexion est
 * toujours sur `auth.users` même si `profiles.email` est vide.
 */
export function resolveProfileAndAuthDisplay(
  profile: ProfileRow | null | undefined,
  user: AuthUserLike | null | undefined,
): { nomAffichage: string | null; email: string | null } {
  const fromProfileNom = profile?.nom_affichage?.trim();
  const metaRaw = user?.user_metadata?.nom_affichage;
  const fromMeta =
    typeof metaRaw === "string" && metaRaw.trim().length > 0 ? metaRaw.trim() : null;
  const nomAffichage =
    fromProfileNom && fromProfileNom.length > 0 ? fromProfileNom : fromMeta;

  const fromProfileEmail = profile?.email?.trim();
  const fromUserEmail = user?.email?.trim();
  const email =
    fromProfileEmail && fromProfileEmail.length > 0
      ? fromProfileEmail
      : fromUserEmail && fromUserEmail.length > 0
        ? fromUserEmail
        : null;

  return { nomAffichage: nomAffichage ?? null, email };
}

/** Nom d’affichage (`nom_affichage`), sinon email (pour la salutation). */
export function profileDisplayName(
  nomAffichage: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const nom = nomAffichage?.trim();
  if (nom) return nom;
  const mail = email?.trim();
  if (mail) return mail;
  return null;
}
