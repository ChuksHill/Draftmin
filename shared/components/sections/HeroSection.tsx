'use client';

import Link from 'next/link';
import { Button } from '@/shared/ui/button/Button';
import { ProjectOrb } from '@/shared/components/visual/ProjectOrb';

export function HeroSection() {
  return (
    <section className="min-h-[calc(100vh-64px)] bg-[#F6F8FC] flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Crystal clear meetings for modern teams
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight">
                Meetings that feel
                <span className="block text-blue-700">simple and premium</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
                Host a room in seconds, invite anyone with a link, and keep everything organized with chat,
                participants, captions, and AI-ready notes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/meeting">
                <Button size="lg">Open Meetings</Button>
              </Link>
              <a href="#features">
                <Button variant="secondary" size="lg">Explore Features</Button>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-2xl font-bold text-slate-900">Fast</div>
                <p className="text-sm text-slate-600 mt-1">Join flow like Zoom</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-2xl font-bold text-slate-900">Clean</div>
                <p className="text-sm text-slate-600 mt-1">Blue “One” styling</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-2xl font-bold text-slate-900">Ready</div>
                <p className="text-sm text-slate-600 mt-1">Panels + stage + chat</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex justify-center lg:justify-end">
            <ProjectOrb />
          </div>
        </div>
      </div>
    </section>
  );
}

