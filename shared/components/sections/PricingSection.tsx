'use client';

import { motion } from 'framer-motion';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for individuals',
      features: ['Up to 3 participants', '45 minute meetings', 'Basic HD video', 'Email support'],
      cta: 'Get started',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$99',
      period: '/month',
      description: 'For growing teams',
      features: [
        'Up to 100 participants',
        'Unlimited meetings',
        'HD video & audio',
        'Live transcription',
        'Priority support',
        'Meeting recordings',
      ],
      cta: 'Start free trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations',
      features: [
        'Unlimited participants',
        'Custom features',
        'Dedicated support',
        'SSO & advanced security',
        'SLA guarantee',
        'Custom integrations',
      ],
      cta: 'Contact sales',
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-[#F6F8FC] border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16" data-aos="fade-up">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Pricing</p>
          <h2 className="mt-4 text-4xl sm:text-5xl font-bold text-slate-900">Simple, transparent plans</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-4">
            Start free and upgrade when your team needs more participants and advanced features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              className={[
                'rounded-3xl border bg-white shadow-sm transition',
                plan.highlighted
                  ? 'border-blue-300 ring-2 ring-blue-100 md:scale-[1.02]'
                  : 'border-slate-200 hover:shadow-md',
              ].join(' ')}
              data-aos="fade-up"
              data-aos-delay={index * 90}
              whileHover={{ y: -4, scale: plan.highlighted ? 1.02 : 1.01 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-slate-600 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  {plan.period ? <span className="text-slate-600">{plan.period}</span> : null}
                </div>

                <button
                  type="button"
                  className={[
                    'w-full h-11 rounded-xl font-semibold transition mb-8',
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
                  ].join(' ')}
                >
                  {plan.cta}
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className={plan.highlighted ? 'text-blue-600 mt-0.5' : 'text-slate-500 mt-0.5'}>
                        <CheckIcon />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
