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

/** Nom d’affichage inscription (`nom_affichage`), sinon email profil. */
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
