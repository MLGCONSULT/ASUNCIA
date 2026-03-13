import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-void" />
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />

      <div className="relative z-10 text-center flex flex-col items-center">
        <Image
          src="/logo.png"
          alt="AsuncIA"
          width={160}
          height={96}
          className="mb-6 object-contain"
        />
        <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
          Page introuvable
        </h1>
        <p className="text-text-muted text-sm mb-8 max-w-sm">
          La page que tu cherches n’existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-3 rounded-xl font-medium bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 hover:bg-accent-cyan/25 hover:border-accent-cyan/60 transition-all duration-300"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
