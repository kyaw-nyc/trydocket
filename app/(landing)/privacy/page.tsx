export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Privacy Policy</p>
          <h1 className="text-4xl font-semibold">How we handle your data</h1>
          <p className="text-neutral-600">Last updated: February 1, 2026</p>
        </header>

        <section className="space-y-4 text-neutral-800 leading-relaxed text-[15px]">
          <p>
            Docket connects to your Google Calendar so we can list your events, propose new ones, and submit changes you confirm.
            We only request the minimum scopes needed to perform those actions on your behalf.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Data accessed:</strong> basic Google profile info (for sign‑in) and calendar event data (titles, times, locations, attendees).
            </li>
            <li>
              <strong>Use of data:</strong> to show your schedule, propose adds/updates/deletions you request, and apply them after you confirm.
            </li>
            <li>
              <strong>Storage:</strong> access tokens are stored securely; pending event proposals live only in your session. We do not sell or share your data with third parties.
            </li>
            <li>
              <strong>Analytics:</strong> we collect lightweight, aggregated usage metrics—never event content.
            </li>
            <li>
              <strong>Controls:</strong> you can revoke access anytime via Google Account permissions and request deletion by emailing <a className="underline" href="mailto:support@trydocket.co">support@trydocket.co</a>.
            </li>
            <li>
              <strong>Retention:</strong> we retain only what is necessary to operate the service; you may request removal of stored data.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-neutral-800 leading-relaxed text-[15px]">
          <h2 className="text-2xl font-semibold">Your choices</h2>
          <p>
            You may decline requested permissions, sign out at any time, or delete events directly in Google Calendar. Revoking access in Google will immediately stop our ability to read or write to your calendars.
          </p>
        </section>

        <section className="space-y-3 text-neutral-800 leading-relaxed text-[15px]">
          <h2 className="text-2xl font-semibold">Contact</h2>
          <p>
            Questions or requests? Email <a className="underline" href="mailto:support@trydocket.co">support@trydocket.co</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
