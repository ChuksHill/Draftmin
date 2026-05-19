'use client';

import Link from 'next/link';
import { ProjectOrb } from '@/shared/components/visual/ProjectOrb';

interface AuthSidebarProps {
  children: React.ReactNode;
}

export function AuthSidebar({ children }: AuthSidebarProps) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: dark navy with orb ─────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #060B18 0%, #0B1530 50%, #0A1628 100%)',
        }}
      >
        {/* Radial glow behind orb */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(37,99,235,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'rgba(99,102,241,0.08)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'rgba(37,99,235,0.08)', filter: 'blur(60px)' }}
        />

        {/* Logo */}
        <div className="relative z-10 p-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="font-bold text-white text-xl">D</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Draftmin</span>
          </Link>
        </div>

        {/* Orb centred */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-16">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)',
                transform: 'scale(1.3)',
              }}
            />
            <ProjectOrb />
          </div>

          <div className="mt-10 text-center">
            <h2 className="text-2xl font-bold text-white leading-snug">
              Premium Video Meetings
            </h2>
            <p className="mt-2 text-blue-200/60 text-sm leading-relaxed max-w-xs mx-auto">
              Crystal clear calls, AI-powered transcription, and real-time summaries — all in one place.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {['AI Minutes', 'Live Transcribe', 'Speaker ID', 'Smart Tags'].map((f) => (
                <span
                  key={f}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: 'rgba(37,99,235,0.15)',
                    border: '1px solid rgba(96,165,250,0.2)',
                    color: 'rgba(147,197,253,0.9)',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 p-8 text-center">
          <p className="text-blue-200/30 text-xs">© 2026 Draftmin — All rights reserved</p>
        </div>
      </div>

      {/* ── Right panel: form ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F6F8FC] px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex items-center gap-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="font-bold text-white text-lg">D</span>
            </div>
            <span className="text-slate-900 font-bold text-lg tracking-tight">Draftmin</span>
          </Link>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}