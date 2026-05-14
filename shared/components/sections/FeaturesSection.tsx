'use client';

export function FeaturesSection() {
  const features = [
    {
      icon: '🎥',
      title: 'Crystal Clear Video',
      description: 'HD and 4K video with adaptive bitrate for smooth performance'
    },
    {
      icon: '🎤',
      title: 'Premium Audio',
      description: 'Noise cancellation and echo reduction for pristine sound'
    },
    {
      icon: '📝',
      title: 'Live Transcription',
      description: 'Real-time AI-powered transcription in multiple languages'
    },
    {
      icon: '👥',
      title: 'Group Meetings',
      description: 'Support for up to 1000 participants in a single call'
    },
    {
      icon: '🔒',
      title: 'End-to-End Encryption',
      description: 'Military-grade encryption for maximum security'
    },
    {
      icon: '📊',
      title: 'Analytics & Insights',
      description: 'Detailed meeting statistics and performance metrics'
    },
  ];

  return (
    <section id="features" className="py-20 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need for professional video meetings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition group"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 group-hover:text-gray-800 transition">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
