'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Button } from '@/shared/ui/button/Button';
import { ProjectOrb } from '@/shared/components/visual/ProjectOrb';

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
  };

  const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
  };

  return (
    <section className="min-h-[calc(100vh-64px)] bg-[#F6F8FC] flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div className="space-y-8" variants={stagger} initial="hidden" animate="show">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
            >
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Crystal clear meetings for modern teams
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-5">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight">
                Meetings that feel
                <span className="block text-blue-700">simple and premium</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
                Host a room in seconds, invite anyone with a link, and keep everything organized with chat,
                participants, captions, and AI-ready notes.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/meeting">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg">Open Meetings</Button>
                </motion.div>
              </Link>
              <a href="#features">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="secondary" size="lg">Explore Features</Button>
                </motion.div>
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
              <motion.div
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <div className="text-2xl font-bold text-slate-900">Fast</div>
                <p className="text-sm text-slate-600 mt-1">Join flow like Zoom</p>
              </motion.div>
              <motion.div
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <div className="text-2xl font-bold text-slate-900">Clean</div>
                <p className="text-sm text-slate-600 mt-1">Blue “One” styling</p>
              </motion.div>
              <motion.div
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <div className="text-2xl font-bold text-slate-900">Ready</div>
                <p className="text-sm text-slate-600 mt-1">Panels + stage + chat</p>
              </motion.div>
            </motion.div>
          </motion.div>

          <div className="hidden lg:flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={
                shouldReduceMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, scale: 1, y: [0, -10, 0] }
              }
              transition={{
                opacity: { duration: 0.7 },
                scale: { duration: 0.7 },
                y: shouldReduceMotion ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <ProjectOrb />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
