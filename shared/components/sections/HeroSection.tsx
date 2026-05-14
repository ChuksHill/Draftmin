'use client';

import Link from 'next/link';
import { Button } from '@/shared/ui/button/Button';

export function HeroSection() {
  return (
    <section className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-white via-blue-50 to-purple-50 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center space-y-8">
          
          {/* Badge */}
          <div className="inline-block">
            <span className="px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-sm text-blue-600">
              ✨ Crystal Clear Video Meetings
            </span>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight">
              Premium Video Meetings
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Connect with anyone, anywhere. Experience seamless video meetings with crystal-clear audio, real-time transcription, and intelligent insights.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/meeting">
              <Button size="lg">Start Free Meeting</Button>
            </Link>
            <a href="#features">
              <Button variant="secondary" size="lg">Learn More</Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-16 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900">99.9%</div>
              <p className="text-sm text-gray-600 mt-2">Uptime</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900">1M+</div>
              <p className="text-sm text-gray-600 mt-2">Active Users</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900">150+</div>
              <p className="text-sm text-gray-600 mt-2">Countries</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
