"use client";

const FEATURES = [
  {
    title: "Never lose a decision again",
    description: "Every resolution, commitment, and next step is automatically captured. AI meeting minutes are ready before the call ends — formatted the way a professional secretary would write them.",
    metric: "Saves 40 min per meeting",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: "Understand every word, any accent",
    description: "Built with Deepgram nova-3 and Whisper large-v3 — optimised for Nigerian, West African, and global English. Custom audio preprocessing filters background noise before it reaches the model.",
    metric: "Deepgram + Whisper hybrid",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6" />
      </svg>
    ),
  },
  {
    title: "Crystal-clear video for distributed teams",
    description: "Sub-2-second room start on LiveKit infrastructure. Host up to 50 participants simultaneously. Share your screen, react, raise your hand — everything a remote team needs in one place.",
    metric: "Works anywhere, any device",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /><rect x="3" y="8" width="12" height="10" rx="2" />
      </svg>
    ),
  },
  {
    title: "Keep your team on the same page",
    description: "In-meeting chat, file sharing, DMs, and live captions — visible to every participant in real time. Searchable transcript history means no context is ever lost after the call ends.",
    metric: "Persistent chat history",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    title: "Security that enterprise teams trust",
    description: "All audio is encrypted in transit via TLS 1.3. No recordings are stored on Draftmin servers — everything lives in your own Supabase project. GDPR-compliant by design.",
    metric: "Your data, your infrastructure",
    color: "from-slate-600 to-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Start a meeting in 10 seconds",
    description: "No downloads. No plugins. Works in Chrome, Safari, Firefox, and mobile browsers. Share the invite link — guests join via the browser with no account required.",
    metric: "Zero install, any device",
    color: "from-cyan-500 to-sky-500",
    bg: "bg-cyan-50",
    border: "border-cyan-100",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 bg-white" id="features">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16" data-aos="fade-up">
          <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4 uppercase tracking-wider">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Everything your meetings need
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Built for teams that need real outcomes from every conversation — not just recordings that nobody watches.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              data-aos="fade-up" data-aos-delay={`${(i % 3) * 100}`}
              className={`rounded-2xl border ${f.border} ${f.bg} p-6 hover:shadow-md transition group`}>
              {/* Icon */}
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.color} grid place-items-center mb-5 shadow-sm`}>
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 leading-tight">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{f.description}</p>
              <div className="pt-4 border-t border-white/80">
                <span className="text-xs font-semibold text-slate-500">{f.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
