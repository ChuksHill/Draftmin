'use client';

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: 'Draftmin made our weekly syncs faster and more productive. The transcript feature is a game changer.',
      name: 'Mia Torres',
      role: 'Product Lead',
      company: 'Nova Labs',
    },
    {
      quote: 'Reliable meetings with clear audio and fast setup. Our remote team loves it.',
      name: 'Jason Park',
      role: 'Operations Manager',
      company: 'Brightline',
    },
    {
      quote: 'The analytics and summaries save us hours of follow-up work after every call.',
      name: 'Priya Shah',
      role: 'Head of Growth',
      company: 'ScaleUp',
    },
  ];

  return (
    <section className="py-20 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Customer Stories</p>
          <h2 className="mt-4 text-4xl sm:text-5xl font-bold text-gray-900">
            Trusted by teams around the world
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="rounded-3xl border border-gray-200 bg-gray-50 p-8">
              <p className="text-gray-700 leading-relaxed">“{testimonial.quote}”</p>
              <div className="mt-8">
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.role} @ {testimonial.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
