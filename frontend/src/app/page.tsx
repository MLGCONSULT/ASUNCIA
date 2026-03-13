"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const quickBenefits = [
  {
    title: "Voir clair plus vite",
    text: "L'IA relie les signaux importants et reduit le bruit des outils disperses.",
  },
  {
    title: "Agir sans friction",
    text: "Les prochaines actions utiles apparaissent avant meme d'ouvrir chaque module.",
  },
  {
    title: "Garder le controle",
    text: "Les connexions et l'etat des integrations restent visibles et faciles a comprendre.",
  },
] as const;

const integrations = [
  { label: "Gmail", tone: "text-accent-cyan" },
  { label: "Airtable", tone: "text-accent-lime" },
  { label: "Notion", tone: "text-accent-violet" },
  { label: "n8n", tone: "text-accent-amber" },
  { label: "Supabase", tone: "text-accent-fuchsia" },
] as const;

const previewSignals = [
  "Priorites detectees",
  "Connexions prêtes",
  "Actions suggerees",
] as const;

const assistantFlow = [
  {
    title: "Comprendre la situation",
    text: "L'assistant resume les signaux utiles et fait remonter le contexte.",
  },
  {
    title: "Choisir la bonne action",
    text: "Le parcours recommande apparait sans obliger l'utilisateur a naviguer a l'aveugle.",
  },
  {
    title: "Executer ou deleguer",
    text: "Les integrations connectees permettent d'agir tout de suite.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="home-viewport relative isolate flex items-center overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-4">
      <div className="absolute inset-0 bg-gradient-radial from-accent-violet/10 via-void to-void" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(232,121,249,0.12),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(34,211,238,0.11),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(167,139,250,0.12),transparent_30%)]" />
      <div className="home-orb home-orb-left" />
      <div className="home-orb home-orb-right" />
      <div className="home-grid-overlay absolute inset-0 opacity-40" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-6xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid items-center gap-4 lg:min-h-[calc(100dvh-2rem)] lg:grid-cols-[1.02fr_0.98fr] lg:gap-5">
          <section className="home-organic-panel home-main-panel relative overflow-hidden p-5 sm:p-6 lg:p-7">
            <div className="home-panel-glow" />
            <div className="relative space-y-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="badge-cyan">IA au coeur du pilotage</span>
                <span className="home-pill text-[11px] uppercase tracking-[0.22em] text-text-muted">
                  Experience organique. Actions guidees.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="home-logo-wrap">
                  <Image
                    src="/logo.png"
                    alt="AsuncIA"
                    width={124}
                    height={74}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs uppercase tracking-[0.24em] text-text-dim">Mission control IA</p>
                  <p className="mt-1 text-sm text-text-muted">Une interface qui donne envie d'entrer et de comprendre.</p>
                </div>
              </div>

              <motion.h1
                className="max-w-3xl text-[2.1rem] font-display font-bold leading-[0.98] text-text-primary sm:text-[2.7rem] lg:text-[3.55rem]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                L'assistant IA qui transforme des outils disperses en decisions claires et en actions utiles.
              </motion.h1>

              <motion.p
                className="max-w-2xl text-sm leading-6 text-text-muted sm:text-[15px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                Gmail, Airtable, Notion, n8n et Supabase se retrouvent dans une seule experience.
                L'utilisateur comprend ce qui compte, voit quoi faire ensuite et garde l'IA comme point d'entree naturel.
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-2.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.45 }}
              >
                {integrations.map((integration) => (
                  <span key={integration.label} className="home-pill text-xs font-medium text-text-muted">
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full bg-current ${integration.tone}`} />
                    {integration.label}
                  </span>
                ))}
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-3">
                {quickBenefits.map((item, index) => (
                  <motion.div
                    key={item.title}
                    className={`home-feature-card ${index === 1 ? "home-feature-card-wide" : ""}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 + index * 0.08, duration: 0.45 }}
                  >
                    <span className="text-[11px] uppercase tracking-[0.22em] text-text-dim">0{index + 1}</span>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-text-muted">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              className="relative mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/connexion"
                  className="btn-neon inline-flex min-w-[220px] items-center justify-center px-5 py-3"
                >
                  Entrer dans l'assistant
                </Link>
              </motion.span>
              <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/inscription"
                  className="btn-secondary inline-flex min-w-[190px] items-center justify-center px-5 py-3"
                >
                  Creer un compte
                </Link>
              </motion.span>
              <div className="sm:ml-auto">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-dim">Premier pas recommande</p>
                <p className="mt-1 text-sm text-text-muted">
                  Se connecter, verifier les integrations, puis laisser l'IA proposer la suite.
                </p>
              </div>
            </motion.div>
          </section>

          <aside className="relative flex min-h-0 flex-col justify-center">
            <div className="home-preview-shell">
              <div className="home-floating-badge home-floating-badge-top">
                <span className="badge-violet">Apercu intelligent</span>
                <span className="text-xs text-text-muted">Vue guidee par l'IA</span>
              </div>

              <motion.div
                className="home-preview-card"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.24, duration: 0.5 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Mission control</p>
                    <p className="mt-1 text-sm leading-5 text-text-muted">
                      Une lecture rapide des priorites, des connexions et du prochain mouvement.
                    </p>
                  </div>
                  <span className="home-status-dot" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {previewSignals.map((signal) => (
                    <span key={signal} className="home-pill text-xs text-text-muted">
                      {signal}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-3">
                  {assistantFlow.map((item, index) => (
                    <div key={item.title} className="home-flow-row">
                      <div className="home-flow-index">0{index + 1}</div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-text-muted">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="home-mini-console">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim">Prompt suggere</p>
                    <p className="mt-2 text-sm text-text-primary">
                      Fais ressortir les urgences Gmail et propose une prochaine action dans Airtable.
                    </p>
                  </div>
                  <div className="home-mini-stack">
                    <div className="home-mini-chip">
                      <span className="text-text-primary">4 integrations</span>
                      <span className="text-text-dim">actives</span>
                    </div>
                    <div className="home-mini-chip">
                      <span className="text-text-primary">1 action</span>
                      <span className="text-text-dim">recommandee</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="home-floating-badge home-floating-badge-bottom"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.45 }}
              >
                <span className="text-xs font-medium text-text-primary">Parcours recommande</span>
                <span className="text-xs text-text-muted">Connexion, verification, action IA</span>
              </motion.div>
            </div>
          </aside>
        </div>
      </motion.div>
    </main>
  );
}
