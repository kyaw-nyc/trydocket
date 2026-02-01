import { MarketingNavbar } from "@/components/marketing/layout/MarketingNavbar";
import { SignInButton } from "@/components/auth/SignInButton";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <MarketingNavbar>
        <SignInButton className="cursor-pointer rounded-full bg-neutral-900 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-neutral-800">
          Sign in
        </SignInButton>
      </MarketingNavbar>

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
          <div className="mt-10">
            <SignInButton className="cursor-pointer inline-flex items-center gap-3 rounded-xl bg-neutral-900 px-6 py-3.5 text-base font-medium text-white transition-all hover:bg-neutral-800 hover:shadow-lg">
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
            </SignInButton>
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1400px] w-full">
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="overflow-hidden rounded-2xl bg-white">
              {/* Mock browser header - white */}
              <div className="flex items-center gap-2 border-b border-neutral-100 bg-white px-4 py-3 rounded-t-2xl">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-neutral-300" />
                  <div className="h-3 w-3 rounded-full bg-neutral-300" />
                  <div className="h-3 w-3 rounded-full bg-neutral-300" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="mx-auto max-w-md rounded-md bg-neutral-100 px-3 py-1.5 text-xs text-neutral-400 text-center">
                    trydocket.co
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
                  {/* Header - white */}
                  <div className="mb-3 flex items-center justify-between rounded-t-xl bg-white py-1">
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

                  {/* Day headers - same grid as time grid so vertical lines align */}
                  <div className="flex border-b border-neutral-100">
                    <div className="w-12 flex-shrink-0" />
                    <div className="flex flex-1">
                      {[
                        { day: 'SUN', date: '25' },
                        { day: 'MON', date: '26' },
                        { day: 'TUE', date: '27' },
                        { day: 'WED', date: '28' },
                        { day: 'THU', date: '29' },
                        { day: 'FRI', date: '30', current: true },
                        { day: 'SAT', date: '31' },
                      ].map((d, i) => (
                        <div key={i} className="flex-1 py-2 text-center border-l border-neutral-100 first:border-l-0">
                          <div className="text-[10px] text-neutral-400 font-medium">{d.day}</div>
                          <div className={`text-lg font-medium mt-0.5 ${d.current ? 'w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center mx-auto' : 'text-neutral-700'}`}>
                            {d.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time grid - vertical day lines run full height */}
                  <div className="relative flex">
                    {/* Time labels - 11 rows for taller grid */}
                    <div className="w-12 flex-shrink-0 text-[10px] text-neutral-400">
                      {['10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'].map((t, i) => (
                        <div key={i} className="h-12 flex items-start justify-end pr-2 -mt-1.5">{t}</div>
                      ))}
                    </div>

                    {/* Grid columns - straight vertical borders, stretched vertically */}
                    <div className="flex flex-1 border-l border-neutral-100" style={{ minHeight: 528 }}>
                      {Array.from({ length: 7 }).map((_, colIndex) => (
                        <div key={colIndex} className="relative flex-1 border-l border-neutral-100 first:border-l-0 min-h-[528px]">
                          {/* Hour lines - 11 rows */}
                          {Array.from({ length: 11 }).map((_, rowIndex) => (
                            <div key={rowIndex} className="absolute left-0 right-0 h-12 border-b border-neutral-50" style={{ top: rowIndex * 48 }} />
                          ))}

                          {/* Events */}
                          {colIndex === 0 && (
                            <>
                              <div className="absolute left-1 right-1 top-[12px] h-[36px] rounded bg-cyan-100 border-l-2 border-cyan-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-cyan-800 truncate">COS217</div>
                                <div className="text-[9px] text-cyan-600 truncate">10:40 AM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[336px] h-[36px] rounded bg-sky-100 border-l-2 border-sky-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-sky-800 truncate">Study group</div>
                                <div className="text-[9px] text-sky-600 truncate">5:00 PM</div>
                              </div>
                            </>
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
                              <div className="absolute left-1 right-1 top-[288px] h-[36px] rounded bg-rose-100 border-l-2 border-rose-400 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-rose-800 truncate">Office hours</div>
                                <div className="text-[9px] text-rose-600 truncate">4:00 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[432px] h-[48px] rounded bg-amber-100 border-l-2 border-amber-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-amber-800 truncate">Dinner</div>
                                <div className="text-[9px] text-amber-600 truncate">7:00 PM</div>
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
                              <div className="absolute left-1 right-1 top-[336px] h-[36px] rounded bg-indigo-100 border-l-2 border-indigo-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-indigo-800 truncate">Podcast</div>
                                <div className="text-[9px] text-indigo-600 truncate">5:00 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[432px] h-[36px] rounded bg-slate-100 border-l-2 border-slate-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-slate-800 truncate">Reading</div>
                                <div className="text-[9px] text-slate-600 truncate">7:00 PM</div>
                              </div>
                            </>
                          )}
                          {colIndex === 3 && (
                            <>
                              <div className="absolute left-1 right-1 top-[168px] h-[48px] rounded bg-amber-100 border-l-2 border-amber-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-amber-800 truncate">Team sync</div>
                                <div className="text-[9px] text-amber-600 truncate">3:00 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[336px] h-[36px] rounded bg-teal-100 border-l-2 border-teal-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-teal-800 truncate">Coffee chat</div>
                                <div className="text-[9px] text-teal-600 truncate">5:00 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[480px] h-[36px] rounded bg-pink-100 border-l-2 border-pink-400 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-pink-800 truncate">Movie night</div>
                                <div className="text-[9px] text-pink-600 truncate">8:00 PM</div>
                              </div>
                            </>
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
                              <div className="absolute left-1 right-1 top-[336px] h-[36px] rounded bg-emerald-100 border-l-2 border-emerald-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-emerald-800 truncate">Review</div>
                                <div className="text-[9px] text-emerald-600 truncate">5:00 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[432px] h-[36px] rounded bg-violet-100 border-l-2 border-violet-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-violet-800 truncate">Call Mom</div>
                                <div className="text-[9px] text-violet-600 truncate">7:00 PM</div>
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
                              <div className="absolute left-1 right-1 top-[336px] h-[36px] rounded bg-orange-100 border-l-2 border-orange-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-orange-800 truncate">Happy hour</div>
                                <div className="text-[9px] text-orange-600 truncate">5:00 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[432px] h-[48px] rounded bg-rose-100 border-l-2 border-rose-400 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-rose-800 truncate">Dinner out</div>
                                <div className="text-[9px] text-rose-600 truncate">7:00 PM</div>
                              </div>
                            </>
                          )}
                          {colIndex === 6 && (
                            <>
                              <div className="absolute left-1 right-1 top-[12px] h-[36px] rounded bg-lime-100 border-l-2 border-lime-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-lime-800 truncate">Yoga</div>
                                <div className="text-[9px] text-lime-600 truncate">10:00 AM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[120px] h-[36px] rounded bg-blue-100 border-l-2 border-blue-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-blue-800 truncate">Grocery</div>
                                <div className="text-[9px] text-blue-600 truncate">2:00 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[168px] h-[48px] rounded bg-red-100 border-l-2 border-red-400 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-red-800 truncate">Project due</div>
                                <div className="text-[9px] text-red-600 truncate">3:00 PM</div>
                              </div>
                              <div className="absolute left-1 right-1 top-[432px] h-[48px] rounded bg-fuchsia-100 border-l-2 border-fuchsia-500 px-1.5 py-0.5 overflow-hidden">
                                <div className="text-[10px] font-medium text-fuchsia-800 truncate">Game night</div>
                                <div className="text-[9px] text-fuchsia-600 truncate">7:00 PM</div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Centered chatbox - middle of calendar area */}
                <div className="absolute left-1/2 bottom-6 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-none">
                  <div className="pointer-events-auto flex items-end gap-3 rounded-2xl px-4 py-3 bg-white/90 backdrop-blur-md shadow-lg border border-neutral-200/80">
                    <input
                      type="text"
                      readOnly
                      placeholder="Ask Docket anything..."
                      className="flex-1 min-h-[24px] bg-transparent text-sm text-neutral-500 outline-none placeholder-neutral-400"
                    />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900">
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
          <div className="mt-8">
            <SignInButton className="cursor-pointer inline-flex items-center gap-3 rounded-xl bg-neutral-900 px-6 py-3.5 text-base font-medium text-white transition-all hover:bg-neutral-800 hover:shadow-lg">
              Get started for free
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </SignInButton>
          </div>
        </div>
      </section>

      {/* Footer - same background as CTA section above (neutral-50) */}
      <footer className="relative w-full overflow-hidden bg-neutral-50">
        <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-24 md:pt-32 pb-16 md:pb-24">
          <div className="bg-neutral-900 rounded-3xl p-8 md:p-12 shadow-lg border border-neutral-700/50">
            <div className="flex flex-col gap-16 md:gap-24">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
                <div className="md:col-span-3 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-base font-semibold tracking-[0.08em] text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                      <svg className="h-4 w-4 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    DOCKET
                  </div>
                  <p className="text-sm text-white/70">
                    Manage your Google Calendar with AI. Schedule, update, and organize events using natural language.
                  </p>
                </div>
                <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-3 gap-8">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Product</h3>
                    <div className="flex flex-col gap-3">
                      <a href="/landing" className="text-sm text-white/70 hover:text-white transition-colors">How it works</a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Company</h3>
                    <div className="flex flex-col gap-3">
                      <a href="/landing" className="text-sm text-white/70 hover:text-white transition-colors">About</a>
                      <a href="/landing" className="text-sm text-white/70 hover:text-white transition-colors">Contact</a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Get Started</h3>
                    <div className="flex flex-col gap-3">
                      <a href="/landing" className="text-sm text-white/70 hover:text-white transition-colors">Sign In</a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-8">
                <div className="h-[1px] bg-white/20 w-full" />
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/70">
                  <p>© {new Date().getFullYear()} Docket. All rights reserved.</p>
                  <div className="flex gap-6">
                    <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                    <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
