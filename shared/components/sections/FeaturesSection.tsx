"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "Crystal-clear video for distributed teams",
    description: "Sub-2-second room start on LiveKit infrastructure. Host up to 50 participants simultaneously. Share your screen, react, raise your hand — everything a remote team needs in one place.",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1000&q=80"
  },
  {
    title: "Understand every word, any accent",
    description: "Built with Deepgram nova-3 and Whisper large-v3 — optimised for Nigerian, West African, and global English. Custom audio preprocessing filters background noise before it reaches the model.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80"
  },
  {
    title: "Never lose a decision again",
    description: "Every resolution, commitment, and next step is automatically captured. AI meeting minutes are ready before the call ends — formatted the way a professional secretary would write them.",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80"
  },
  {
    title: "Keep your team on the same page",
    description: "In-meeting chat, file sharing, DMs, and live captions — visible to every participant in real time. Searchable transcript history means no context is ever lost after the call ends.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80"
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 bg-slate-50" id="features">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-20" data-aos="fade-up">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Everything your meetings need
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Built for teams that need real outcomes from every conversation — not just recordings that nobody watches.
          </p>
        </div>

        <div className="space-y-24">
          {FEATURES.map((f, i) => (
            <div 
              key={f.title} 
              className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
              data-aos="fade-up"
            >
              <div className="flex-1 lg:w-1/2">
                <div className="relative rounded-2xl overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-200">
                  <img src={f.image} alt={f.title} className="w-full h-auto object-cover aspect-[4/3]" />
                </div>
              </div>
              <div className="flex-1 lg:w-1/2">
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 leading-tight">
                  {f.title}
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  {f.description}
                </p>
                <div className="mt-8">
                  <a href="#pricing" className="text-[#0B5CFF] font-semibold hover:underline flex items-center gap-2">
                    Learn more
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
