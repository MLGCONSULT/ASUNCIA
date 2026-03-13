"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
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
  const redirect = searchParams.get("redirect") ?? "/app/dashboard";

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
    const { error: err } = await supabase.auth.resend({ type: "signup", email });
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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-void" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-30%,rgba(0,255,245,0.06),transparent_50%)]" />

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
        <p className="label-auth text-center mb-8">Connexion</p>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          {emailNotConfirmed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 p-4 space-y-3"
            >
              <p className="text-sm text-text-muted">
                Ton compte n’est pas encore confirmé. Regarde ta boîte mail ou demande un nouvel email ci-dessous.
              </p>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendStatus === "loading" || resendCooldown > 0}
                className="text-sm text-accent-cyan hover:text-[#06b6d4] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0
                  ? `Renvoyer l’email (${resendCooldown} s)`
                  : resendStatus === "loading"
                    ? "Envoi…"
                    : "Renvoyer l’email de confirmation"}
              </button>
              {resendStatus === "success" && (
                <p className="text-sm text-green-400">Email renvoyé. Consultez votre boîte de réception (et les spams).</p>
              )}
              {resendStatus === "error" && resendError && (
                <p className="text-sm text-red-400">{resendError}</p>
              )}
            </motion.div>
          )}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-auth-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-8 pt-6 border-t border-white/[0.06] text-center text-sm text-text-muted">
          Pas de compte ?{" "}
          <Link
            href="/inscription"
            className="text-accent-cyan hover:text-[#06b6d4] transition-colors font-medium"
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
