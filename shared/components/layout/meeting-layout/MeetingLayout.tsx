import { ReactNode } from "react";

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
    <div className="h-screen w-full bg-[#09090e] text-white flex flex-col overflow-hidden">
      {/* Header — absolute overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 h-16 flex items-center px-4 sm:px-5 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="pointer-events-auto w-full">{header}</div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Video stage — full bleed */}
        <div className="flex-1 min-w-0 relative">
          {children}

          {/* Floating controls */}
          <div
            className={[
              "absolute left-0 right-0 z-20 flex justify-center px-4 sm:px-0 transition-all duration-500 bottom-[calc(env(safe-area-inset-bottom)+1rem)] sm:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]",
              controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
            ].join(" ")}
          >
            {controls}
          </div>
        </div>

        {/* Side panel — overlay on mobile, fixed width on desktop */}
        {sidebar ? (
          <>
            {/* Mobile/tablet backdrop */}
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
              onClick={onCloseSidebar}
              aria-hidden="true"
            />
            {/* Panel */}
            <div className="fixed inset-y-0 right-0 z-40 w-full xs:w-80 sm:w-[340px] md:relative md:inset-y-auto md:right-auto md:z-10 md:w-[340px] shrink-0 border-l border-white/[0.06] bg-[#0d0f14] flex flex-col shadow-2xl md:shadow-none">
              {sidebar}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
