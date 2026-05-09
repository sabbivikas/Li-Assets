export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: May 9, 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed">
          Natura ("we", "our", or "us") is committed to protecting your privacy.
          This policy explains what information Natura collects, how we use it,
          and your rights regarding that information. Natura is a nature
          discovery app that helps you explore the wildlife living near you.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Information We Collect</h2>

        <h3 className="text-lg font-semibold mt-4 mb-2">Location</h3>
        <p className="text-gray-700 leading-relaxed">
          Natura asks for your approximate location (city or neighbourhood) so
          it can fetch publicly available species observations from the
          iNaturalist API for your area. Your location (city name and a
          coordinate bounding box) is sent to iNaturalist's public API for this
          purpose.
        </p>
        <p className="text-gray-700 mt-2 leading-relaxed">
          If you enable push notifications, your device's latitude, longitude,
          radius, and city name are also sent to and stored on our server so
          we can deliver localised weekly species digests. This data is held in
          server memory for as long as the service is running; it is not written
          to a persistent database and is cleared when the service restarts or
          when you disable notifications.
        </p>

        <h3 className="text-lg font-semibold mt-4 mb-2">Account Information</h3>
        <p className="text-gray-700 leading-relaxed">
          If you create an account, we store your email address and a display
          name via Clerk, our authentication provider. We do not store
          passwords — authentication is handled entirely by Clerk. You can
          review Clerk's privacy practices at{" "}
          <a
            href="https://clerk.com/privacy"
            className="text-green-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            clerk.com/privacy
          </a>
          .
        </p>

        <h3 className="text-lg font-semibold mt-4 mb-2">AI-Generated Report Content</h3>
        <p className="text-gray-700 leading-relaxed">
          Natura can generate a civic biodiversity report for your area. To
          produce this report, we send your city name, a list of local species
          names (sourced from the public iNaturalist API), and a brief radius
          specification to OpenAI's API. We do not include any personally
          identifiable information in that prompt. Generated reports may be
          saved locally on your device. We do not persistently store report
          content or AI prompts on our servers beyond the duration of a single
          request.
        </p>

        <h3 className="text-lg font-semibold mt-4 mb-2">Usage Data</h3>
        <p className="text-gray-700 leading-relaxed">
          Our server logs standard request metadata (HTTP method, path,
          response time, and anonymised IP) for operational monitoring. These
          logs are retained for up to 30 days and are not used for profiling or
          advertising.
        </p>

        <h3 className="text-lg font-semibold mt-4 mb-2">Push Notifications</h3>
        <p className="text-gray-700 leading-relaxed">
          If you enable notifications, we store an Expo push token along with
          your latitude, longitude, search radius, and city name in server
          memory so we can send you weekly species digests relevant to your
          area. This data is held only in memory (not in a persistent database)
          and is automatically cleared when the server restarts or when you
          disable notifications. You can withdraw consent at any time in
          Settings → Notifications.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">How We Use Information</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 leading-relaxed">
          <li>To show you nearby species observations from the iNaturalist public dataset.</li>
          <li>To generate an AI-powered civic biodiversity narrative for your area.</li>
          <li>To send optional push notifications about local wildlife trends.</li>
          <li>To operate, monitor, and improve the Natura service.</li>
        </ul>
        <p className="text-gray-700 mt-3 leading-relaxed">
          We do not sell, rent, or trade your personal information to third
          parties. We do not use your data for advertising purposes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Third-Party Services</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 leading-relaxed">
          <li>
            <strong>iNaturalist</strong> — public biodiversity observations are
            fetched from{" "}
            <a
              href="https://www.inaturalist.org"
              className="text-green-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              inaturalist.org
            </a>
            . No personal information is sent to iNaturalist.
          </li>
          <li>
            <strong>OpenAI</strong> — city and species names are sent to
            OpenAI's API to generate report narratives. OpenAI's data practices
            are described at{" "}
            <a
              href="https://openai.com/policies/privacy-policy"
              className="text-green-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              openai.com/policies/privacy-policy
            </a>
            .
          </li>
          <li>
            <strong>Clerk</strong> — account creation and sign-in are handled
            by Clerk. See{" "}
            <a
              href="https://clerk.com/privacy"
              className="text-green-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              clerk.com/privacy
            </a>
            .
          </li>
          <li>
            <strong>RevenueCat</strong> — subscription management is handled by
            RevenueCat. See{" "}
            <a
              href="https://www.revenuecat.com/privacy"
              className="text-green-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              revenuecat.com/privacy
            </a>
            .
          </li>
          <li>
            <strong>Expo / Apple / Google</strong> — push notifications are
            delivered through Expo's push service and the underlying platform
            (APNs / FCM).
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Data Retention</h2>
        <p className="text-gray-700 leading-relaxed">
          Account data is retained until you delete your account. Push tokens,
          notification preferences, and associated location coordinates are
          held in server memory; they are cleared automatically when the server
          restarts and are also removed immediately when you disable
          notifications. They are not written to a persistent database. AI
          report content is stored only on your device and is never retained on
          our servers. Server request logs are retained for up to 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Your Rights</h2>
        <p className="text-gray-700 leading-relaxed">
          Depending on your location, you may have the right to access, correct,
          or delete personal information we hold about you. To exercise any of
          these rights, or to ask a privacy question, contact us at{" "}
          <a
            href="mailto:privacy@natura.app"
            className="text-green-700 underline"
          >
            privacy@natura.app
          </a>
          . We will respond within 30 days.
        </p>
        <p className="text-gray-700 mt-3 leading-relaxed">
          You can delete locally saved reports and clear cached data at any time
          from Settings → Clear Cache and Settings → Delete All Reports inside
          the app.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Children's Privacy</h2>
        <p className="text-gray-700 leading-relaxed">
          Natura is not directed at children under the age of 13. We do not
          knowingly collect personal information from children under 13. If you
          believe a child has provided us with personal information, please
          contact us and we will delete it promptly.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Changes to This Policy</h2>
        <p className="text-gray-700 leading-relaxed">
          We may update this policy from time to time. When we do, we will
          revise the "Last updated" date at the top of this page. Continued use
          of Natura after changes are posted constitutes your acceptance of the
          updated policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          If you have any questions about this privacy policy, please email us
          at{" "}
          <a
            href="mailto:privacy@natura.app"
            className="text-green-700 underline"
          >
            privacy@natura.app
          </a>
          .
        </p>
      </section>
    </div>
  );
}
