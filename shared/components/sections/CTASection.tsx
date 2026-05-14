'use client';

import { Button } from '@/shared/ui/button/Button';

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Ready to get started?
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Join thousands of teams already using Draftmin for their video meetings
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg">Start Free Trial</Button>
          <Button variant="secondary" size="lg">Schedule Demo</Button>
        </div>
      </div>
    </section>
  );
}
