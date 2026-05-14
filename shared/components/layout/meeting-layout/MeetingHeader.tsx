export function MeetingHeader() {
  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center lg:gap-0 w-full text-sm">
      <div>
        <div className="font-semibold text-slate-900 text-lg">Product Review</div>
        <div className="mt-1 text-xs text-slate-500">Weekly strategy call with design, product, and ops</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Live</div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">08:23</div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">12 participants</div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Recording</div>
      </div>
    </div>
  );
}