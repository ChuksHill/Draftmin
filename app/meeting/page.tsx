import { MeetingLayout } from "@/shared/components/layout/meeting-layout/MeetingLayout";
import { MeetingHeader } from "@/shared/components/layout/meeting-layout/MeetingHeader";
import { MeetingControls } from "@/shared/components/layout/meeting-layout/MeetingControls";

export const metadata = {
  title: "Meeting - Draftmin",
};

export default function MeetingPage() {
  return (
    <MeetingLayout
      header={<MeetingHeader />}
      sidebar={
        <div className="p-5 space-y-6 overflow-y-auto h-full bg-slate-100">
          <div className="text-sm font-semibold text-slate-900">Transcript</div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-xs leading-6 text-slate-700 space-y-3">
            <div><span className="font-semibold text-slate-900">Host:</span> Welcome everyone, let’s get started with today’s agenda.</div>
            <div><span className="font-semibold text-slate-900">Guest 1:</span> Here’s the latest on the review.</div>
            <div><span className="font-semibold text-slate-900">Guest 2:</span> The AI notes are automatically capturing everything.</div>
            <div className="text-slate-500">Live transcription powered by speech-to-text</div>
          </div>

          <div className="text-sm font-semibold text-slate-900">AI Minutes</div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Auto-generated summary</div>
            <div className="mt-4 text-sm text-slate-700">
              AI is generating your meeting minutes in real time. The final summary will include action items, decisions, and next steps.
            </div>
            <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
              Waiting for transcript completion...
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Participants</div>
            <div className="mt-3 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">You (Host)</div>
                  <div className="text-xs text-slate-500">Presenting</div>
                </div>
                <div className="text-xs text-emerald-700">On mic</div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">Guest 1</div>
                  <div className="text-xs text-slate-500">Speaking</div>
                </div>
                <div className="text-xs text-emerald-700">On mic</div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">Guest 2</div>
                  <div className="text-xs text-slate-500">Listening</div>
                </div>
                <div className="text-xs text-slate-500">Muted</div>
              </div>
            </div>
          </div>
        </div>
      }
      controls={<MeetingControls />}
    >
      <div className="h-full p-6 bg-slate-50">
        <div className="grid h-full gap-6 xl:grid-cols-[1.8fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Live meeting</div>
                  <div className="mt-3 text-3xl font-semibold text-slate-900">Video room</div>
                  <div className="mt-2 text-sm text-slate-500">Meetings with live audio, speech transcription, and AI-written minutes.</div>
                </div>
                <div className="inline-flex flex-col gap-2 rounded-3xl bg-blue-50 px-4 py-3 text-sm text-blue-700 border border-blue-100">
                  <div>Model: Whisper + Deepgram</div>
                  <div>Mode: Hybrid speech capture</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="aspect-[16/9] rounded-[1.75rem] bg-slate-100 border border-slate-200 p-6 shadow-sm">
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700">Active speaker</div>
                      <div className="rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 border border-slate-200">Guest 1</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-semibold text-slate-700">Live video</div>
                      <div className="mt-2 text-sm text-slate-500">Guest 1 is speaking now</div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <div>HD | 30fps</div>
                      <div>Network good</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {['You', 'Guest 1', 'Guest 2'].map((name) => (
                    <div key={name} className="rounded-[1.5rem] bg-slate-100 border border-slate-200 p-4 text-center shadow-sm">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-700">{name[0]}</div>
                      <div className="text-sm font-semibold text-slate-900">{name}</div>
                      <div className="mt-2 text-xs text-slate-500">{name === 'You' ? 'Host' : 'Attendee'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Live transcript</div>
                <div className="mt-4 text-sm text-slate-700">Speech is being transcribed in real time. You can switch between Deepgram, Web Speech, or Whisper modes later.</div>
                <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-500 border border-slate-200">Transcription latency: 1.2s</div>
              </div>
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">AI minutes</div>
                <div className="mt-4 text-sm text-slate-700">AI will summarize key decisions, action items, and next steps after the call ends.</div>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  <li className="rounded-3xl bg-slate-50 p-4 border border-slate-200">Capture decisions</li>
                  <li className="rounded-3xl bg-slate-50 p-4 border border-slate-200">Record action items</li>
                  <li className="rounded-3xl bg-slate-50 p-4 border border-slate-200">Create follow-up draft</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Meeting insights</div>
              <div className="mt-4 grid gap-4">
                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                  <div className="text-sm text-slate-500">Audio quality</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">Excellent</div>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                  <div className="text-sm text-slate-500">Speakers active</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">3</div>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                  <div className="text-sm text-slate-500">Hand raised</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">2 people</div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Action items</div>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="rounded-3xl bg-slate-50 p-4 border border-slate-200">Finalize launch date</li>
                <li className="rounded-3xl bg-slate-50 p-4 border border-slate-200">Share design assets</li>
                <li className="rounded-3xl bg-slate-50 p-4 border border-slate-200">Send follow-up summary</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MeetingLayout>
  );
}
