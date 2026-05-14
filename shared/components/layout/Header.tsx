'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white text-xl">D</span>
            </div>
            <span className="text-gray-900 font-bold text-xl hidden sm:block">Draftmin</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition">
              Pricing
            </a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition">
              About
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <Link 
              href="/meeting"
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 transition"
            >
              Try Demo
            </Link>
            <Link 
              href="/meeting"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:opacity-90 transition"
            >
              Start Meeting
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}
