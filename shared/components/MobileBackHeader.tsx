"use client";

import { useRouter } from "next/navigation";

/**
 * MobileBackHeader
 *
 * A sticky top bar shown only on small screens (hidden sm:hidden).
 * Drop it at the top of any sub-page (Summaries, Recordings, Meeting List, etc.)
 * so users can get back to the home dashboard on mobile.
 *
 * Usage:
 *   import { MobileBackHeader } from "@/shared/components/MobileBackHeader";
 *   // inside your page component:
 *   <MobileBackHeader title="AI Summaries" />
 */
export function MobileBackHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 bg-stone-50/90 backdrop-blur-sm border-b border-stone-100 px-4 py-3 sm:hidden">
      <button
        type="button"
        onClick={() => router.back()}
        className="h-8 w-8 rounded-full bg-white border border-stone-200 grid place-items-center text-stone-500 hover:text-stone-800 hover:border-stone-300 active:scale-95 transition shrink-0"
        aria-label="Go back"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="text-sm font-medium text-stone-800 truncate">{title}</span>
    </div>
  );
}