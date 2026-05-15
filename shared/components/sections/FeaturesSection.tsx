'use client';

function IconVideo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4.5 7.5A2.5 2.5 0 0 1 7 5h7a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 14 19H7a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16.5 10.2 21 7.5v9l-4.5-2.7v-3.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconText() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M7 6h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 10h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 14h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 18h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 18.5c0-2 2.7-3.5 6-3.5s6 1.5 6 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16 18.5c0-2 2-3.5 4-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 12a2.5 2.5 0 1 0 0-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7.5 11h9A2.5 2.5 0 0 1 19 13.5v5A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-5A2.5 2.5 0 0 1 7.5 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 16v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M5 19V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 19v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 19v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 19h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function FeaturesSection() {
  const features = [
    {
      icon: <IconVideo />,
      title: 'Crystal clear video',
      description: 'A clean stage UI with gallery layout, screen share support, and smooth resizing.',
    },
    {
      icon: <IconMic />,
      title: 'Reliable audio controls',
      description: 'Mute/unmute, device permission handling, and playback enable in one place.',
    },
    {
      icon: <IconText />,
      title: 'Transcripts + captions',
      description: 'Panels ready for live captions and transcripts with an AI-minutes workflow.',
    },
    {
      icon: <IconUsers />,
      title: 'Participants panel',
      description: 'See who’s in the room, who is speaking, and basic mic/cam status.',
    },
    {
      icon: <IconLock />,
      title: 'Secure room access',
      description: 'LiveKit token-based access keeps joins authenticated and controlled.',
    },
    {
      icon: <IconChart />,
      title: 'Insights-ready',
      description: 'A structure that can evolve into meeting analytics and post-call summaries.',
    },
  ];

  return (
    <section id="features" className="py-20 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Features</p>
          <h2 className="mt-4 text-4xl sm:text-5xl font-bold text-slate-900">Built for focused meetings</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-4">
            A Zoom-like join flow and meeting room structure — clean, fast, and expandable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-3xl border border-slate-200 bg-[#F6F8FC] hover:bg-slate-50 transition"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
                {feature.icon}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

