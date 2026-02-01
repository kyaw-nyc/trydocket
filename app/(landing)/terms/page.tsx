export default function TermsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Terms & Conditions</p>
          <h1 className="text-4xl font-semibold">Using Docket</h1>
          <p className="text-neutral-600">Last updated: February 1, 2026</p>
        </header>

        <section className="space-y-3 text-neutral-800 leading-relaxed text-[15px]">
          <p>
            Docket helps you manage Google Calendar using natural language. By using the service you agree to these terms.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Eligibility:</strong> You need a valid Google account and must keep your credentials secure.</li>
            <li><strong>Service scope:</strong> We propose calendar changes (add/update/delete) and only apply them after your confirmation.</li>
            <li><strong>Acceptable use:</strong> No illegal activity, spam, harassment, or abuse of Google APIs. We may suspend access for misuse.</li>
            <li><strong>Third‑party dependency:</strong> The service relies on Google Calendar APIs; outages or API changes may affect availability.</li>
            <li><strong>Data handling:</strong> Governed by our Privacy Policy. We do not sell your data.</li>
            <li><strong>Disclaimers:</strong> Provided “as is” without warranties. You are responsible for verifying event details.</li>
            <li><strong>Limitation of liability:</strong> To the fullest extent permitted by law, our liability is limited to the amount you paid for the service (currently $0 for the public beta).</li>
          </ul>
        </section>

        <section className="space-y-3 text-neutral-800 leading-relaxed text-[15px]">
          <h2 className="text-2xl font-semibold">Contact</h2>
          <p>
            Questions about these terms? Email <a className="underline" href="mailto:support@trydocket.co">support@trydocket.co</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
