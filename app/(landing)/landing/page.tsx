import { signIn } from "@/lib/auth";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-neutral-900">Docket</span>
          </div>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Sign in
            </button>
          </form>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-neutral-900 sm:text-6xl">
            Your calendar,
            <br />
            <span className="text-neutral-400">managed by AI</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-neutral-600 max-w-xl mx-auto">
            Schedule, reschedule, and organize your Google Calendar using natural language.
            Just tell Docket what you need.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
            className="mt-10"
          >
            <button
              type="submit"
              className="cursor-pointer inline-flex items-center gap-3 rounded-xl bg-neutral-900 px-6 py-3.5 text-base font-medium text-white transition-all hover:bg-neutral-800 hover:shadow-lg"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </section>

      {/* Preview */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="relative rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl shadow-neutral-300/50">
            <div className="rounded-xl bg-white border border-neutral-100 overflow-hidden">
              {/* Mock browser header */}
              <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-neutral-300" />
                  <div className="h-3 w-3 rounded-full bg-neutral-300" />
                  <div className="h-3 w-3 rounded-full bg-neutral-300" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="mx-auto max-w-md rounded-md bg-neutral-100 px-3 py-1.5 text-xs text-neutral-400 text-center">
                    docket.app
                  </div>
                </div>
              </div>

              {/* Mock calendar interface */}
              <div className="flex relative">
                {/* Sidebar */}
                <div className="w-52 border-r border-neutral-100 p-4 hidden md:block">
                  <div className="space-y-4">
                    {/* Mini calendar */}
                    <div className="p-2">
                      <div className="text-xs font-medium text-neutral-700 mb-2">January 2026</div>
                      <div className="grid grid-cols-7 gap-0.5 text-[9px] text-neutral-400">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <div key={i} className="w-5 h-5 flex items-center justify-center font-medium">{d}</div>
                        ))}
                        {Array.from({ length: 31 }, (_, i) => (
                          <div key={i} className={`w-5 h-5 flex items-center justify-center rounded-full ${i === 29 ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}>
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Calendars list */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide px-2">My calendars</div>
                      <div className="space-y-1 px-1">
                        <div className="flex items-center gap-2 py-1">
                          <div className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />
                          <span className="text-[11px] text-neutral-700">Work</span>
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          <div className="h-2.5 w-2.5 rounded-sm bg-green-500" />
                          <span className="text-[11px] text-neutral-700">Personal</span>
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          <div className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                          <span className="text-[11px] text-neutral-700">Classes</span>
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                          <span className="text-[11px] text-neutral-700">Meetings</span>
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          <div className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                          <span className="text-[11px] text-neutral-700">Deadlines</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendar grid */}
                <div className="flex-1 p-4">
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-lg font-medium text-neutral-800">January 25–31, 2026</div>
                    <div className="flex items-center gap-1">
                      <div className="h-7 w-7 rounded flex items-center justify-center hover:bg-neutral-100">
                        <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                      <div className="h-7 w-7 rounded flex items-center justify-center hover:bg-neutral-100">
                        <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b border-neutral-100">
                    {[
                      { day: 'SUN', date: '25' },
                      { day: 'MON', date: '26' },
                      { day: 'TUE', date: '27' },
                      { day: 'WED', date: '28' },
                      { day: 'THU', date: '29' },
                      { day: 'FRI', date: '30', current: true },
                      { day: 'SAT', date: '31' },
                    ].map((d, i) => (
                      <div key={i} className="py-2 text-center border-l border-neutral-100 first:border-l-0">
                        <div className="text-[10px] text-neutral-400 font-medium">{d.day}</div>
                        <div className={`text-lg font-medium mt-0.5 ${d.current ? 'w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center mx-auto' : 'text-neutral-700'}`}>
                          {d.date}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time grid */}
                  <div className="relative">
                    {/* Time labels */}
                    <div className="absolute left-0 top-0 w-12 text-[10px] text-neutral-400">
                      {['10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'].map((t, i) => (
                        <div key={i} className="h-12 flex items-start justify-end pr-2 -mt-1.5">{t}</div>
                      ))}
                    </div>

                    {/* Grid columns */}
                    <div className="ml-12 grid grid-cols-7">
                      {Array.from({ length: 7 }).map((_, colIndex) => (
                        <div key={colIndex} className="relative border-l border-neutral-100 first:border-l-0">
                          {/* Hour lines */}
                          {Array.from({ length: 7 }).map((_, rowIndex) => (
                            <div key={rowIndex} className="h-12 border-b border-neutral-50" />
                          ))}

                          {/* Events */}
                          {colIndex === 0 && (
                            <div className="absolute left-1 right-1 top-[12px] h-[36px] rounded bg-cyan-100 border-l-2 border-cyan-500 px-1.5 py-0.5 overflow-hidden">
                              <div className="text-[10px] font-medium text-cyan-800 truncate">COS217</div>
                              <div className="text-[9px] text-cyan-600 truncate">10:40 AM</div>
                            </div>
                          )}
                          {colIndex === 1 && (
                            <>
                              <div className="absolute left-1 right-1 top-[12px] h-[36px] rounded bg-cyan-100 border-l-2 border-cyan-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-cyan-800 truncate">COS217</div>
                                <div className="text-[9px] text-cyan-600 truncate">10:40 AM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[72px] h-[36px] rounded bg-purple-100 border-l-2 border-purple-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-purple-800 truncate">REL235</div>
                                <div className="text-[9px] text-purple-600 truncate">12:15 PM</div>
                              </div>
                            </>
                          )}
                          {colIndex === 2 && (
                            <>
                              <div className="absolute left-1 right-1 top-[12px] h-[36px] rounded bg-cyan-100 border-l-2 border-cyan-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-cyan-800 truncate">COS217</div>
                                <div className="text-[9px] text-cyan-600 truncate">10:40 AM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[72px] h-[36px] rounded bg-purple-100 border-l-2 border-purple-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-purple-800 truncate">REL235</div>
                                <div className="text-[9px] text-purple-600 truncate">12:15 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[120px] h-[36px] rounded bg-green-100 border-l-2 border-green-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-green-800 truncate">Lunch</div>
                                <div className="text-[9px] text-green-600 truncate">2:00 PM</div>
                              </div>
                            </>
                          )}
                          {colIndex === 3 && (
                            <div className="absolute left-1 right-1 top-[168px] h-[48px] rounded bg-amber-100 border-l-2 border-amber-500 px-1.5 py-0.5 overflow-hidden">
                              <div className="text-[10px] font-medium text-amber-800 truncate">Team sync</div>
                              <div className="text-[9px] text-amber-600 truncate">3:00 PM</div>
                            </div>
                          )}
                          {colIndex === 4 && (
                            <>
                              <div className="absolute left-1 right-1 top-[48px] h-[36px] rounded bg-amber-100 border-l-2 border-amber-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-amber-800 truncate">Meet with Sarah</div>
                                <div className="text-[9px] text-amber-600 truncate">11:30 AM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[120px] h-[36px] rounded bg-cyan-100 border-l-2 border-cyan-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-cyan-800 truncate">COS217</div>
                                <div className="text-[9px] text-cyan-600 truncate">2:00 PM</div>
                              </div>
                            </>
                          )}
                          {colIndex === 5 && (
                            <>
                              <div className="absolute left-1 right-1 top-[72px] h-[36px] rounded bg-purple-100 border-l-2 border-purple-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-purple-800 truncate">REL235</div>
                                <div className="text-[9px] text-purple-600 truncate">12:15 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[168px] h-[48px] rounded bg-green-100 border-l-2 border-green-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-green-800 truncate">Gym</div>
                                <div className="text-[9px] text-green-600 truncate">3:00 PM</div>
                              </div>
                            </>
                          )}
                          {colIndex === 6 && (
                            <div className="absolute left-1 right-1 top-[168px] h-[48px] rounded bg-red-100 border-l-2 border-red-400 px-1.5 py-0.5 overflow-hidden">
                              <div className="text-[10px] font-medium text-red-800 truncate">Project due</div>
                              <div className="text-[9px] text-red-600 truncate">3:00 PM</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chat popup mock */}
                <div className="absolute bottom-4 right-4 w-72 rounded-xl border border-neutral-200 bg-white shadow-xl hidden sm:block">
                  <div className="border-b border-neutral-100 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900">
                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-neutral-900">Docket AI</div>
                        <div className="text-[10px] text-neutral-400">Calendar assistant</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white max-w-[85%] ml-auto">
                      Schedule 30min with Sarah tomorrow at 11:30am
                    </div>
                    <div className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700 max-w-[85%]">
                      Done! I've added "Meet with Sarah" on Thursday at 11:30 AM.
                    </div>
                  </div>
                  <div className="border-t border-neutral-100 p-2">
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-400">
                        Ask Docket anything...
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 cursor-pointer">
                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-200 py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-neutral-900">
            Simple. Fast. Natural.
          </h2>
          <p className="mt-3 text-center text-neutral-500">
            Managing your calendar shouldn't be a chore.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-neutral-200">
                <svg className="h-5 w-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-medium text-neutral-900">Natural language</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                Just type what you want. "Add lunch with Tom on Friday" works perfectly.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-neutral-200">
                <svg className="h-5 w-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-medium text-neutral-900">Conflict detection</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                Docket checks your schedule and warns you about overlapping events.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-neutral-200">
                <svg className="h-5 w-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-medium text-neutral-900">Preview first</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                See proposed events before they're added. You're always in control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-neutral-900">
            Ready to simplify your schedule?
          </h2>
          <p className="mt-4 text-neutral-500">
            Connect your Google Calendar and start using Docket in seconds.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
            className="mt-8"
          >
            <button
              type="submit"
              className="cursor-pointer inline-flex items-center gap-3 rounded-xl bg-neutral-900 px-6 py-3.5 text-base font-medium text-white transition-all hover:bg-neutral-800 hover:shadow-lg"
            >
              Get started for free
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-neutral-900">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-neutral-900">Docket</span>
          </div>
          <p className="text-sm text-neutral-400">
            Built for people who value their time.
          </p>
        </div>
      </footer>
    </div>
  );
}
