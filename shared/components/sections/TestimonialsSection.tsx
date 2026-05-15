'use client';

export function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        'Draftmin made our weekly syncs faster and more productive. The transcript panel is a game changer.',
      name: 'Mia Torres',
      role: 'Product Lead',
      company: 'Nova Labs',
    },
    {
      quote:
        'Reliable meetings with clear audio and a clean join flow. Our remote team loves it.',
      name: 'Jason Park',
      role: 'Operations Manager',
      company: 'Brightline',
    },
    {
      quote:
        'The panels structure makes it easy to add captions, recordings, and AI summaries later.',
      name: 'Priya Shah',
      role: 'Head of Growth',
      company: 'ScaleUp',
    },
  ];

  return (
    <section className="py-20 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Customer stories</p>
          <h2 className="mt-4 text-4xl sm:text-5xl font-bold text-slate-900">
            Built for teams that move fast
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="rounded-3xl border border-slate-200 bg-[#F6F8FC] p-8 shadow-sm">
              <p className="text-slate-700 leading-relaxed">
                “{testimonial.quote}”
              </p>
              <div className="mt-8">
                <p className="font-semibold text-slate-900">{testimonial.name}</p>
                <p className="text-sm text-slate-600">
                  {testimonial.role} @ {testimonial.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

