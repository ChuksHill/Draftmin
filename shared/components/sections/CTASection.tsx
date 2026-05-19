'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #060B18 0%, #0B1530 60%, #0A1628 100%)' }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(37,99,235,0.18) 0%, transparent 70%)' }}
      />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="zoom-in">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-400 mb-4">Get started today</p>
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          Ready to run better meetings?
        </h2>
        <p className="text-lg text-blue-100/60 mb-10 max-w-2xl mx-auto leading-relaxed">
          Open your meeting dashboard and start a room with a single link. No downloads required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/auth/signup"
              className="inline-flex h-13 items-center justify-center px-8 py-4 rounded-2xl text-sm font-semibold text-white transition"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                boxShadow: '0 0 30px rgba(37,99,235,0.35)',
              }}
            >
              Start for free →
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <a
              href="#features"
              className="inline-flex h-13 items-center justify-center px-8 py-4 rounded-2xl text-sm font-semibold text-white transition"
              style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}
            >
              See all features
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}