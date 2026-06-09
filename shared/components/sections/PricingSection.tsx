"use client";

import { useState } from "react";
import Link from "next/link";

type Plan = {
  name: string; price: { monthly: number; annual: number };
  description: string; features: string[];
  cta: string; ctaHref: string;
  highlight?: boolean; badge?: string;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Try Draftmin for personal use with no time limits.",
    features: [
      "Unlimited meetings",
      "Up to 3 participants",
      "Live captions (Web Speech)",
      "5 AI summaries per month",
      "Chat & file sharing",
    ],
    cta: "Get started free",
    ctaHref: "/auth/signup",
  },
  {
    name: "Pro",
    price: { monthly: 19, annual: 15 },
    description: "For growing teams that need reliable AI-powered meeting intelligence.",
    features: [
      "Unlimited participants",
      "Deepgram + Whisper STT",
      "Unlimited AI summaries",
      "Transcript search & export",
      "PDF & Markdown export",
      "Priority email support",
      "Recordings archive",
    ],
    cta: "Start free trial",
    ctaHref: "/auth/signup?plan=pro",
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: { monthly: 0, annual: 0 },
    description: "Custom deployment with SSO, audit logs, and dedicated support.",
    features: [
      "Everything in Pro",
      "SSO / SAML integration",
      "Audit logs & compliance",
      "Custom data retention",
      "SLA guarantee",
      "Dedicated account manager",
      "On-premise option",
    ],
    cta: "Talk to sales",
    ctaHref: "mailto:hello@draftmin.com",
  },
];

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-500 shrink-0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="py-24 px-4 bg-[#F8FAFF]" id="pricing">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12" data-aos="fade-up">
          <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4 uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8">
            Start for free. Upgrade when your team is ready.
          </p>

          {/* Annual / Monthly toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
            <button type="button" onClick={() => setAnnual(false)}
              className={`h-9 px-5 rounded-xl text-sm font-semibold transition ${!annual ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Monthly
            </button>
            <button type="button" onClick={() => setAnnual(true)}
              className={`h-9 px-5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${annual ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Annual
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 transition ${annual ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                –20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid sm:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => (
            <div key={plan.name}
              data-aos="fade-up" data-aos-delay={`${i * 100}`}
              className={`relative rounded-2xl p-6 border flex flex-col ${plan.highlight ? "border-blue-500 bg-slate-900 text-white shadow-2xl shadow-blue-900/20 scale-[1.02]" : "border-slate-200 bg-white"}`}>

              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-[11px] font-bold rounded-full px-3 py-1 shadow-lg shadow-blue-600/30">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${plan.highlight ? "text-blue-400" : "text-blue-600"}`}>{plan.name}</div>
                <div className="flex items-end gap-1.5 mb-3">
                  {plan.price.monthly === 0 && plan.name !== "Enterprise" ? (
                    <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>Free</span>
                  ) : plan.name === "Enterprise" ? (
                    <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>Custom</span>
                  ) : (
                    <>
                      <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                        ${annual ? plan.price.annual : plan.price.monthly}
                      </span>
                      <span className={`text-sm mb-2 ${plan.highlight ? "text-white/50" : "text-slate-400"}`}>/mo</span>
                      {annual && plan.price.monthly > 0 && (
                        <span className={`text-sm mb-2 line-through ${plan.highlight ? "text-white/30" : "text-slate-400"}`}>
                          ${plan.price.monthly}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${plan.highlight ? "text-white/60" : "text-slate-500"}`}>{plan.description}</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check />
                    <span className={`text-sm ${plan.highlight ? "text-white/80" : "text-slate-700"}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <div>
                <Link href={plan.ctaHref}
                  className={`block h-11 rounded-xl text-sm font-semibold text-center leading-[44px] transition ${plan.highlight ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30" : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200"}`}>
                  {plan.cta}
                </Link>
                {plan.highlight && (
                  <p className="text-center text-xs text-white/40 mt-2">No credit card required · Cancel anytime</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ teaser + enterprise */}
        <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center" data-aos="fade-up">
          <p className="text-base font-semibold text-slate-800 mb-1">Need a custom plan or on-premise deployment?</p>
          <p className="text-sm text-slate-500 mb-5">Enterprise contracts, volume pricing, and custom SLAs available. Let&apos;s talk.</p>
          <Link href="mailto:hello@draftmin.com"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
            Contact sales
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
