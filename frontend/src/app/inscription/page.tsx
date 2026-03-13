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
    <main className="min-h-screen flex items-center justify-center bg-void px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,0.16),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(34,211,238,0.14),transparent_55%)]" />

      <motion.div
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/5 bg-black/70 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="AsuncIA"
              width={120}
              height={72}
              className="object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-xs uppercase tracking-[0.22em] text-text-dim">Inscription</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="nom_affichage" className="text-xs font-medium uppercase tracking-[0.16em] text-text-dim">
              Nom (optionnel)
            </label>
            <input
              id="nom_affichage"
              type="text"
              value={nomAffichage}
              onChange={(e) => setNomAffichage(e.target.value)}
              autoComplete="name"
              className="input-auth h-11"
              placeholder="Votre nom"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-[0.16em] text-text-dim">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input-auth h-11"
              placeholder="vous@exemple.com"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-[0.16em] text-text-dim">
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
              className="text-xs text-red-400"
            >
              {error}
            </motion.p>
          )}
          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-neon-cyan"
            >
              {message}
            </motion.p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-auth-primary mt-2 h-11 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Création…" : "Créer un compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-muted">
          Déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="font-medium text-accent-cyan hover:text-[#06b6d4] transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
