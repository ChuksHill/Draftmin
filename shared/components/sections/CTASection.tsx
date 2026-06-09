"use client";

import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-10 sm:p-16 text-center relative overflow-hidden">
          {/* Orbs */}
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

          <div className="relative">
            <span className="inline-block text-xs font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
              Get started today
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Your next meeting should<br className="hidden sm:inline" /> be your most productive
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
              Join teams across Africa and beyond who use Draftmin to run sharper meetings and turn every conversation into action.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/auth/signup"
                className="w-full sm:w-auto h-12 rounded-xl bg-white text-slate-900 font-semibold text-sm px-8 hover:bg-blue-50 transition flex items-center justify-center gap-2 shadow-lg shadow-black/20">
                Start for free
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/auth/login"
                className="w-full sm:w-auto h-12 rounded-xl border border-white/20 text-white font-semibold text-sm px-8 hover:bg-white/10 transition flex items-center justify-center">
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-xs text-white/30">No credit card required · Cancel anytime · Free tier forever</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-10 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center text-white font-bold text-sm">D</div>
              <span className="text-sm font-semibold text-slate-800">Draftmin</span>
              <span className="text-slate-300 mx-1">·</span>
              <span className="text-xs text-slate-400">AI-powered meeting intelligence</span>
            </div>

            <nav className="flex items-center gap-5 flex-wrap justify-center">
              {["Privacy", "Terms", "Support"].map(l => (
                <Link key={l} href="#" className="text-xs text-slate-400 hover:text-slate-700 transition">{l}</Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {/* Twitter/X */}
              <a href="#" aria-label="Twitter" className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 transition grid place-items-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" aria-label="LinkedIn" className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 transition grid place-items-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              {/* GitHub */}
              <a href="#" aria-label="GitHub" className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 transition grid place-items-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Draftmin. All rights reserved.</p>
        </footer>
      </div>
    </section>
  );
}
