import { ReactNode } from "react";

export function MeetingLayout({
  header,
  sidebar,
  children,
  controls,
}: {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  controls?: ReactNode;
}) {
  const hasSidebar = Boolean(sidebar);
  return (
    <div className="h-screen w-full bg-[#0B0F19] text-white flex flex-col">
      <div className="h-14 border-b border-white/10 flex items-center px-4 md:px-6 bg-[#0B0F19]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F19]/80">
        {header}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 relative">{children}</div>

        {hasSidebar ? (
          <div className="w-[360px] border-l border-white/10 bg-[#0B0F19]">
            {sidebar}
          </div>
        ) : null}
      </div>

      <div className="h-[92px] border-t border-white/10 flex items-center justify-center bg-[#0B0F19]/95 px-3 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F19]/80">
        {controls}
      </div>
    </div>
  );
}
