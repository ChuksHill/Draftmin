export function MeetingControls() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-4">
      <button className="px-4 py-2 rounded-2xl bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm">
        🎤 Mute
      </button>

      <button className="px-4 py-2 rounded-2xl bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm">
        🎥 Video
      </button>

      <button className="px-4 py-2 rounded-2xl bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm">
        � Captions
      </button>

      <button className="px-4 py-2 rounded-2xl bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm">
        🪟 Share
      </button>

      <button className="px-4 py-2 rounded-2xl bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm">
        👥 Participants
      </button>

      <button className="px-4 py-2 rounded-2xl bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm">
        💬 Chat
      </button>

      <button className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 transition text-sm text-white shadow-sm">
        End Call
      </button>
    </div>
  );
}