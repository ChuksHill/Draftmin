'use client';

export function AboutSection() {
  const steps = [
    {
      title: 'Create a Room',
      description: 'Start a meeting room in seconds and invite your team with a unique link.',
    },
    {
      title: 'Share Seamless Video',
      description: 'Use HD video with smart bandwidth adaptation for smooth calls on any device.',
    },
    {
      title: 'Capture Insights',
      description: 'Get live transcription, summaries, and analytics after every meeting.',
    },
  ];

  return (
    <section id="about" className="py-20 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">How it works</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mt-4">
            Run better meetings in three easy steps
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mt-4">
            Draftmin makes meeting setup fast, reliable, and powerful so teams can focus on what matters.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="rounded-3xl border border-gray-200 bg-gray-50 p-8 text-center">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xl font-bold">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
