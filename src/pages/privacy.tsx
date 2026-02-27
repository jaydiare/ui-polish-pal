import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <VzlaNavbar />
      <main className="page-shell flex-1 py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8">
            Privacy Policy
          </h1>

          <div className="space-y-6 text-foreground/80 text-sm leading-relaxed">
            <p>
              <strong>Effective Date:</strong> February 27, 2026
            </p>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
              <p>
                Vzla Sports Elite ("we", "us", "our") operates the website{" "}
                <strong>vzlasportselite.com</strong>. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you visit our
                website and use our services, including our eBay integration.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>eBay Account Data:</strong> When you connect your eBay account, we
                  receive an OAuth token that allows us to access your eBay selling data
                  (listings, orders, and transaction details) on your behalf.
                </li>
                <li>
                  <strong>Usage Data:</strong> We may collect anonymized analytics such as
                  pages visited and interaction patterns to improve our service.
                </li>
                <li>
                  <strong>Cookies:</strong> We use essential cookies for session management
                  and optional analytics cookies (with your consent).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>To display market pricing and analytics for Venezuelan sports cards.</li>
                <li>To provide eBay order tracking and business analytics.</li>
                <li>To improve our website and user experience.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Sharing</h2>
              <p>
                We <strong>do not sell, rent, or share</strong> your personal information
                with third parties, except as required by law or to operate our eBay
                integration (e.g., communicating with eBay's API on your behalf).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Retention &amp; Deletion</h2>
              <p>
                You may disconnect your eBay account at any time. Upon disconnection, we
                will delete your eBay OAuth tokens within 30 days. Anonymized analytics
                data may be retained indefinitely.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Security</h2>
              <p>
                We use industry-standard measures (HTTPS, encrypted storage) to protect
                your data. However, no method of transmission over the Internet is 100%
                secure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal data. To
                exercise these rights, contact us at the email below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
              <p>
                For questions about this Privacy Policy, please reach out via our social
                channels or email us at{" "}
                <a
                  href="mailto:privacy@vzlasportselite.com"
                  className="text-vzla-yellow hover:underline"
                >
                  privacy@vzlasportselite.com
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-10">
            <Link
              to="/"
              className="text-sm text-vzla-yellow hover:underline no-underline"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
      <VzlaFooter />
    </div>
  );
}
