'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="font-bold text-white text-xl">D</span>
            </div>
            <span className="text-slate-900 font-bold text-xl hidden sm:block">Draftmin</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition">
              Features
            </a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition">
              Pricing
            </a>
            <a href="#about" className="text-slate-600 hover:text-slate-900 transition">
              About
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <Link 
              href="/meeting"
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition border border-slate-200 font-semibold"
            >
              Try Demo
            </Link>
            <Link 
              href="/meeting"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Start Meeting
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}
