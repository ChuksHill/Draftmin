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
  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 flex flex-col">
      
      {/* HEADER */}
      <div className="h-20 border-b border-slate-200 flex items-center px-6 bg-white shadow-sm">
        {header}
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* MAIN AREA */}
        <div className="flex-1 relative bg-slate-50 overflow-y-auto">
          {children}
        </div>

        {/* SIDEBAR */}
        <div className="w-[320px] border-l border-slate-200 bg-slate-100 overflow-y-auto">
          {sidebar}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="h-24 border-t border-slate-200 flex items-center justify-center bg-white px-6">
        {controls}
      </div>

    </div>
  );
}