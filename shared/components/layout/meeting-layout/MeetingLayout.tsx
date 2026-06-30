"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MeetingLayout({
  header,
  sidebar,
  children,
  controls,
  controlsVisible = true,
  onCloseSidebar,
}: {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  controls?: ReactNode;
  controlsVisible?: boolean;
  onCloseSidebar?: () => void;
}) {
  return (
    <div className="h-[100dvh] w-full bg-[#111111] text-white flex flex-col overflow-hidden">
      {/* Header — absolute overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 h-[68px] flex items-center px-4 sm:px-5 bg-gradient-to-b from-black/70 to-transparent pointer-events-none transition-opacity duration-300">
        <div className="pointer-events-auto w-full">{header}</div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Video stage — full bleed */}
        <div className="flex-1 min-w-0 relative bg-black">
          {children}
        </div>

        {/* Side panel — overlay on mobile, fixed width on desktop */}
        <AnimatePresence>
          {sidebar && (
            <div className="flex h-full shrink-0 relative z-40 md:z-30">
              {/* Mobile/tablet backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                onClick={onCloseSidebar}
                aria-hidden="true"
              />
              {/* Panel */}
              <motion.div
                initial={{ x: "100%", opacity: 0.9 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0.9 }}
                transition={{ type: "spring", stiffness: 380, damping: 35 }}
                className="fixed inset-y-0 right-0 z-40 w-full xs:w-80 sm:w-[340px] md:relative md:inset-y-auto md:right-auto md:w-[340px] shrink-0 border-l border-slate-200 bg-white text-slate-800 flex flex-col"
              >
                {sidebar}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Controls */}
      <div className="h-[84px] shrink-0 bg-[#1A1A1A] border-t border-white/10 flex items-center w-full z-30 overflow-visible relative">
        <div className="w-full max-w-[100vw] flex items-center justify-center px-1 sm:px-4 overflow-visible">
          {controls}
        </div>
      </div>
    </div>
  );
}

