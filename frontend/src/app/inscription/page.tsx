"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function InscriptionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomAffichage, setNomAffichage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom_affichage: nomAffichage || null } },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage(
      "Compte créé. Vérifiez votre email pour confirmer, ou connectez-vous si la confirmation est désactivée."
    );
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-void" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-30%,rgba(139,92,246,0.06),transparent_50%)]" />

      <motion.div
        className="relative z-10 card-auth"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="AsuncIA"
            width={180}
            height={108}
            className="object-contain"
          />
        </div>
        <p className="label-auth text-center mb-8">Inscription</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="nom_affichage" className="label-auth">
              Nom d&apos;affichage (optionnel)
            </label>
            <input
              id="nom_affichage"
              type="text"
              value={nomAffichage}
              onChange={(e) => setNomAffichage(e.target.value)}
              autoComplete="name"
              className="input-auth"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label htmlFor="email" className="label-auth">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input-auth"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="label-auth">
              Mot de passe
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}
          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-neon-cyan"
            >
              {message}
            </motion.p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-auth-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-8 pt-6 border-t border-white/[0.06] text-center text-sm text-text-muted">
          Déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="text-accent-cyan hover:text-[#06b6d4] transition-colors font-medium"
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
