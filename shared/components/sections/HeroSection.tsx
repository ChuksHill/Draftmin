'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export function HeroSection() {
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <section className="relative bg-white pt-20 pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
            className="max-w-2xl"
          >
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1]"
            >
              One platform to <span className="text-[#0B5CFF]">connect</span>
            </motion.h1>
            
            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-lg"
            >
              Draftmin brings your teams together with frictionless HD video meetings, AI-powered notes, and enterprise-grade security.
            </motion.p>
            
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              className="mt-10 flex flex-col sm:flex-row gap-4"
            >
              <Link href="/auth/signup">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#0B5CFF] text-white font-bold text-base hover:bg-[#0048D4] transition shadow-lg shadow-blue-500/30"
                >
                  Sign Up, It's Free
                </motion.button>
              </Link>
              <a href="#features">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-slate-200 text-slate-700 font-bold text-base hover:border-[#0B5CFF] hover:text-[#0B5CFF] transition"
                >
                  Discover Features
                </motion.button>
              </a>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
              className="mt-10 flex items-center gap-4 text-sm font-medium text-slate-500"
            >
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 12}`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p>Trusted by 2,400+ modern teams globally</p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease }}
            className="relative lg:h-[600px] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-100"
          >
            <img 
              src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1200&q=80" 
              alt="Team in a video conference" 
              className="w-full h-full object-cover"
            />
            {/* Subtle overlay to make it look like a video interface */}
            <div className="absolute inset-0 border-[12px] border-white/20 rounded-3xl pointer-events-none"></div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 px-6 py-3 rounded-full bg-slate-900/80 backdrop-blur-md">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v1a7 7 0 01-14 0v-1" /></svg>
              </div>
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /><rect x="3" y="8" width="12" height="10" rx="2" /></svg>
              </div>
              <div className="h-10 px-4 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold text-sm">
                End
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}