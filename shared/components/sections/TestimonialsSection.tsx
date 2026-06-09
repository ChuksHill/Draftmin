"use client";

const TESTIMONIALS = [
  {
    quote: "Our weekly product syncs went from 90 minutes to 45. The AI minutes mean no one leaves without clear owners on every decision — follow-through has improved measurably.",
    name: "Amaka Osei",
    role: "Head of Product",
    company: "FinEdge",
    initials: "AO",
    gradient: "from-blue-500 to-indigo-500",
    metric: "50% shorter meetings",
  },
  {
    quote: "We run a distributed team across Lagos, London, and Toronto. Draftmin's transcripts are accurate even with different accents — that alone was the reason we switched.",
    name: "Tunde Adeyemi",
    role: "CTO",
    company: "Stackvault",
    initials: "TA",
    gradient: "from-violet-500 to-purple-500",
    metric: "Used across 3 time zones",
  },
  {
    quote: "The secretary-quality minutes it produces would take my EA 40 minutes to write. Now they're ready before the call even ends. The team actually reads them.",
    name: "Chisom Eze",
    role: "Operations Director",
    company: "Praxis Advisory",
    initials: "CE",
    gradient: "from-emerald-500 to-teal-500",
    metric: "40 min saved per meeting",
  },
  {
    quote: "I was sceptical about AI transcription, but after using it for a board presentation with investors, the accuracy was impressive. It captured every action item perfectly.",
    name: "Emeka Nwosu",
    role: "Founder & CEO",
    company: "Zenda Capital",
    initials: "EN",
    gradient: "from-amber-500 to-orange-500",
    metric: "Board-level trust",
  },
];

function Stars() {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-24 px-4 bg-white" id="testimonials">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16" data-aos="fade-up">
          <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4 uppercase tracking-wider">
            Customer stories
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Teams that run smarter meetings
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            From startups to enterprise teams across Africa and beyond.
          </p>
        </div>

        {/* Featured testimonial */}
        <div className="mb-8" data-aos="fade-up" data-aos-delay="100">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-10 text-white relative overflow-hidden">
            {/* Background orb */}
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
            <Stars />
            <blockquote className="mt-5 text-xl sm:text-2xl font-medium leading-relaxed text-white max-w-3xl">
              &ldquo;{TESTIMONIALS[0].quote}&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${TESTIMONIALS[0].gradient} grid place-items-center text-white font-bold text-base shrink-0`}>
                {TESTIMONIALS[0].initials}
              </div>
              <div>
                <p className="font-semibold text-white">{TESTIMONIALS[0].name}</p>
                <p className="text-sm text-white/60">{TESTIMONIALS[0].role} · {TESTIMONIALS[0].company}</p>
              </div>
              <div className="ml-auto hidden sm:block">
                <span className="inline-block bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-full px-4 py-1.5">
                  {TESTIMONIALS[0].metric}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid of 3 */}
        <div className="grid sm:grid-cols-3 gap-5">
          {TESTIMONIALS.slice(1).map((t, i) => (
            <div key={t.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:border-blue-200 hover:bg-blue-50/30 transition group"
              data-aos="fade-up" data-aos-delay={`${(i + 1) * 100}`}>
              <Stars />
              <blockquote className="mt-4 text-sm text-slate-700 leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${t.gradient} grid place-items-center text-white font-bold text-sm shrink-0`}>
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                  <p className="text-xs text-slate-500 truncate">{t.role} · {t.company}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <span className="text-xs font-semibold text-blue-600">{t.metric}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div className="mt-14 py-8 border-t border-slate-100 flex flex-wrap items-center justify-center gap-8"
          data-aos="fade-up">
          {[
            { icon: "🔒", label: "256-bit TLS encryption" },
            { icon: "🇪🇺", label: "GDPR compliant" },
            { icon: "✓",  label: "SOC 2 Type II ready" },
            { icon: "⚡", label: "99.9% uptime SLA" },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-2 text-sm text-slate-500">
              <span className="text-base">{b.icon}</span>
              <span className="font-medium">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
