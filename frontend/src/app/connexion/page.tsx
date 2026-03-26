"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrlClient, safeAppPathAfterAuth } from "@/lib/site-url";
import PasswordInput from "@/components/PasswordInput";

const EMAIL_NOT_CONFIRMED_PATTERNS = [
  "email not confirmed",
  "email non confirmé",
  "Email not confirmed",
];

function isEmailNotConfirmedError(message: string): boolean {
  const lower = message.toLowerCase();
  return EMAIL_NOT_CONFIRMED_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

const RATE_LIMIT_COOLDOWN_SEC = 60;

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("rate limit") || lower.includes("rate_limit") || lower.includes("too many");
}

function getResendErrorMessage(message: string): string {
  if (isRateLimitError(message)) {
    return "Trop de demandes. Veuillez réessayer dans une minute.";
  }
  return message;
}

function ConnexionForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeAppPathAfterAuth(searchParams.get("redirect"));

  useEffect(() => {
    if (resendCooldown === 0 && resendStatus === "error") {
      setResendError(null);
      setResendStatus("idle");
    }
  }, [resendCooldown, resendStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailNotConfirmed(false);
    setResendStatus("idle");
    setResendError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      if (isEmailNotConfirmedError(err.message)) {
        setEmailNotConfirmed(true);
        setError(null);
      } else {
        setError(err.message);
      }
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  function startCooldown(seconds: number) {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleResendConfirmation() {
    setResendError(null);
    setResendStatus("loading");
    const supabase = createClient();
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: getAuthCallbackUrlClient() },
    });
    if (err) {
      setResendStatus("error");
      setResendError(getResendErrorMessage(err.message));
      if (isRateLimitError(err.message)) {
        startCooldown(RATE_LIMIT_COOLDOWN_SEC);
      }
      return;
    }
    setResendStatus("success");
    startCooldown(60);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-void px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.12),transparent_45%),radial-gradient(circle_at_90%_100%,rgba(167,139,250,0.12),transparent_45%)]" />

      <motion.div
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/5 bg-black/70 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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
              <p className="text-xs uppercase tracking-[0.22em] text-text-dim">Connexion</p>
              <p className="mt-1 text-sm text-text-muted">Accède à ton espace pilotage.</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-medium text-text-muted">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-accent-cyan" />
            Espace sécurisé
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              autoComplete="current-password"
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

          {emailNotConfirmed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-accent-cyan/30 bg-accent-cyan/5 px-3.5 py-3 text-xs text-text-muted"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="pr-2">
                  Ton compte n’est pas encore confirmé. Regarde ta boîte mail ou renvoie un email de confirmation.
                </p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendStatus === "loading" || resendCooldown > 0}
                  className="shrink-0 text-[11px] font-semibold text-accent-cyan hover:text-[#06b6d4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `${resendCooldown}s`
                    : resendStatus === "loading"
                      ? "Envoi…"
                      : "Renvoyer"}
                </button>
              </div>
              {resendStatus === "success" && (
                <p className="mt-1 text-[11px] text-green-400">
                  Email renvoyé. Vérifie ta boîte de réception et tes spams.
                </p>
              )}
              {resendStatus === "error" && resendError && (
                <p className="mt-1 text-[11px] text-red-400">{resendError}</p>
              )}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-auth-primary mt-2 h-11 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-muted">
          Pas de compte ?{" "}
          <Link
            href="/inscription"
            className="font-medium text-accent-cyan hover:text-[#06b6d4] transition-colors"
          >
            S&apos;inscrire
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-void">
          <div className="h-8 w-8 rounded-full border-2 border-accent-cyan/40 border-t-accent-cyan animate-spin" />
        </main>
      }
    >
      <ConnexionForm />
    </Suspense>
  );
}
