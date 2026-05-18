'use client';

import { Button } from '@/shared/ui/button/Button';
import { motion } from 'framer-motion';

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="zoom-in">
        <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
          Ready to get started?
        </h2>
        <p className="text-lg text-slate-600 mb-8">
          Open your meeting dashboard and start a room with a single link.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Button size="lg">Start Free Trial</Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Button variant="secondary" size="lg">Schedule Demo</Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
