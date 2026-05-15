import { Header } from "@/shared/components/layout/Header";
import { HeroSection } from "@/shared/components/sections/HeroSection";
import { FeaturesSection } from "@/shared/components/sections/FeaturesSection";
import { AboutSection } from "@/shared/components/sections/AboutSection";
import { TestimonialsSection } from "@/shared/components/sections/TestimonialsSection";
import { PricingSection } from "@/shared/components/sections/PricingSection";
import { CTASection } from "@/shared/components/sections/CTASection";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#features" className="hover:text-slate-900 transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-slate-900 transition">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900 transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#about" className="hover:text-slate-900 transition">About</a></li>
                <li><a href="#" className="hover:text-slate-900 transition">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900 transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition">Docs</a></li>
                <li><a href="#" className="hover:text-slate-900 transition">API</a></li>
                <li><a href="#" className="hover:text-slate-900 transition">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-slate-900 transition">Terms</a></li>
                <li><a href="#" className="hover:text-slate-900 transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex justify-between items-center">
            <p className="text-sm text-slate-600">&copy; 2026 Draftmin. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-600 hover:text-slate-900 transition">Twitter</a>
              <a href="#" className="text-slate-600 hover:text-slate-900 transition">LinkedIn</a>
              <a href="#" className="text-slate-600 hover:text-slate-900 transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
