'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ProjectOrb } from '@/shared/components/visual/ProjectOrb';

function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center rounded-2xl px-6 py-4"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-blue-200/60 mt-0.5 font-medium">{label}</span>
    </motion.div>
  );
}

function AvatarStack() {
  const colors = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706'];
  const initials = ['MK', 'JP', 'SR', 'AL', 'TW'];
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {colors.map((color, i) => (
          <div
            key={i}
            className="h-8 w-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: color, borderColor: '#060B18' }}
          >
            {initials[i]}
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold text-white">2,400+ teams trust Draftmin</p>
        <div className="flex gap-0.5 mt-0.5">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="h-3 w-3 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const reduced = useReducedMotion();
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <section
      className="relative min-h-[calc(100vh-64px)] flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060B18 0%, #0B1530 55%, #0A1628 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.22) 0%, transparent 60%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{ background: 'linear-gradient(to bottom, transparent, #060B18)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">

          <motion.div
            className="space-y-8"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: 'rgba(37,99,235,0.15)',
                border: '1px solid rgba(96,165,250,0.25)',
                color: 'rgba(147,197,253,0.95)',
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>
              Crystal clear meetings for modern teams
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              className="space-y-3"
            >
              <h1 className="text-5xl sm:text-6xl lg:text-[70px] font-bold text-white tracking-tight leading-[1.05]">
                Meetings that feel
              </h1>
              <h1
                className="text-5xl sm:text-6xl lg:text-[70px] font-bold tracking-tight leading-[1.05]"
                style={{
                  background: 'linear-gradient(90deg, #60A5FA 0%, #818CF8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                simple and premium
              </h1>
            </motion.div>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              className="text-lg text-blue-100/60 max-w-xl leading-relaxed"
            >
              Host a room in seconds, invite anyone with a link, and keep everything organised
              with AI-ready notes, live captions, and instant transcripts.
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              <Link href="/auth/signup">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex h-13 items-center justify-center rounded-2xl px-8 py-4 text-sm font-semibold text-white transition"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                    boxShadow: '0 0 30px rgba(37,99,235,0.4)',
                  }}
                >
                  Start for free →
                </motion.span>
              </Link>
              <a href="#features">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex h-13 items-center justify-center rounded-2xl px-8 py-4 text-sm font-semibold text-white transition"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}
                >
                  Explore features
                </motion.span>
              </a>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
            >
              <AvatarStack />
            </motion.div>
          </motion.div>

          <div className="hidden lg:flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={reduced ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -12, 0] }}
              transition={{
                opacity: { duration: 0.8, ease },
                scale: { duration: 0.8, ease },
                y: reduced ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="relative"
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
                  transform: 'scale(1.4)',
                }}
              />
              <ProjectOrb />
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7, ease }}
          className="mt-20 grid grid-cols-3 gap-4 max-w-lg"
        >
          <StatCard value="< 2s"  label="Room start time" delay={0.65} />
          <StatCard value="99.9%" label="Uptime SLA"       delay={0.72} />
          <StatCard value="HD+"   label="Video quality"    delay={0.79} />
        </motion.div>
      </div>
    </section>
  );
}