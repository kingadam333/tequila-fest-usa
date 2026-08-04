import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

const LAST_UPDATED = "August 4, 2026";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Overview",
    body: (
      <p>
        This Privacy Policy explains how Taste Festivals & Events LLC, operating as Tequila Fest USA
        (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), collects, uses, and protects information when you visit
        tequilafestusa.com, purchase a ticket, apply as a vendor/sponsor/affiliate, or otherwise interact with us.
        By using our Site, you agree to the collection and use of information as described here.
      </p>
    ),
  },
  {
    title: "2. Information We Collect",
    body: (
      <>
        <p>We collect information you provide directly, such as:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Name, email address, and phone number when you purchase a ticket, create an account, or contact us</li>
          <li>Billing information processed securely through Stripe (we do not store full card numbers ourselves)</li>
          <li>Vendor, sponsor, or affiliate application details (business name, description, links, etc.)</li>
          <li>Messages you send through our contact forms or inbox</li>
        </ul>
        <p className="mt-3">We also automatically collect certain information when you use the Site, such as:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pages visited, links clicked, and general browsing behavior, via analytics and advertising tools</li>
          <li>IP address, device/browser type, and approximate location</li>
          <li>Referral source — including which affiliate or QR/short link, if any, brought you to the Site</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. Cookies & Tracking Technologies",
    body: (
      <>
        <p>
          We use cookies and similar technologies to operate the Site and understand how it&apos;s used, including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Essential cookies required for checkout, login, and account sessions</li>
          <li>
            Analytics and advertising cookies (Google Tag Manager, Google Ads, Meta Pixel) used to measure site
            performance and ad campaign effectiveness
          </li>
          <li>
            Affiliate/referral attribution cookies, which remember that you arrived via a specific referral or
            affiliate link so a ticket purchase can be correctly credited
          </li>
        </ul>
        <p className="mt-3">
          You can control cookies through your browser settings; disabling them may affect parts of the Site,
          such as checkout or referral tracking.
        </p>
      </>
    ),
  },
  {
    title: "4. How We Use Your Information",
    body: (
      <>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Process ticket purchases, issue tickets/QR codes, and manage your account</li>
          <li>Send transactional emails (order confirmations, event details, receipts)</li>
          <li>Send marketing emails and SMS about upcoming events, on-sale dates, and promotions — you can opt out at any time (see Section 6)</li>
          <li>Operate our loyalty/rewards and referral programs</li>
          <li>Review and manage vendor, sponsor, and affiliate applications</li>
          <li>Improve the Site, our events, and our marketing based on aggregate usage trends</li>
          <li>Detect and prevent fraud, abuse, or violations of our Terms</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Third-Party Service Providers",
    body: (
      <>
        <p>
          We share information with trusted service providers who help us operate the Site and our events, solely
          for that purpose:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-white">Stripe</strong> — payment processing</li>
          <li><strong className="text-white">Resend</strong> — transactional and account emails</li>
          <li><strong className="text-white">Brevo</strong> and <strong className="text-white">TextMagic</strong> — email and SMS marketing</li>
          <li><strong className="text-white">Supabase</strong> — secure database hosting</li>
          <li><strong className="text-white">Google (Analytics, Ads, Tag Manager)</strong> and <strong className="text-white">Meta (Pixel)</strong> — site analytics and advertising</li>
        </ul>
        <p className="mt-3">
          We do not sell your personal information to third parties. We may disclose information if required by
          law, or to protect the rights, property, or safety of Tequila Fest USA, our attendees, or others.
        </p>
      </>
    ),
  },
  {
    title: "6. Email & SMS Marketing Consent",
    body: (
      <p>
        If you provide your email or phone number at checkout or through a sign-up form, you may receive marketing
        messages about Tequila Fest USA events. You can unsubscribe from marketing emails at any time using the
        link at the bottom of any email, and from SMS by replying STOP to any text. Opting out of marketing does not
        affect transactional messages related to a ticket purchase you&apos;ve already made (e.g. your ticket/QR
        code email).
      </p>
    ),
  },
  {
    title: "7. Data Security",
    body: (
      <p>
        We use reasonable administrative and technical safeguards to protect your information, including encrypted
        connections (HTTPS) and secure, access-controlled hosting. No method of transmission or storage is 100%
        secure, and we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    title: "8. Your Rights & Choices",
    body: (
      <>
        <p>You can:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Update your name, email, or phone number anytime from your account page</li>
          <li>Unsubscribe from marketing emails or texts as described in Section 6</li>
          <li>
            Request access to, correction of, or deletion of your personal information by emailing{" "}
            <a href="mailto:help@mail.tequilafestusa.com" className="text-yellow-400 hover:text-yellow-300">
              help@mail.tequilafestusa.com
            </a>
          </li>
        </ul>
        <p className="mt-3">
          We will respond to reasonable requests within a reasonable timeframe, though certain records (such as
          transaction history) may need to be retained for legal, accounting, or fraud-prevention purposes.
        </p>
      </>
    ),
  },
  {
    title: "9. Children's Privacy",
    body: (
      <p>
        Tequila Fest USA events and ticket purchases are intended for adults 21 and older. We do not knowingly
        collect personal information from anyone under 18. If you believe a minor has provided us information,
        contact us and we will delete it.
      </p>
    ),
  },
  {
    title: "10. Changes to This Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top of this
        page reflects the most recent revision. Continued use of the Site after changes are posted constitutes
        acceptance of the updated policy.
      </p>
    ),
  },
  {
    title: "11. Contact Us",
    body: (
      <p>
        Questions about this Privacy Policy? Email us at{" "}
        <a href="mailto:help@mail.tequilafestusa.com" className="text-yellow-400 hover:text-yellow-300">
          help@mail.tequilafestusa.com
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <OfficialBanner />
      <Navbar />
      <main className="min-h-screen bg-[#0d0500] pb-24">
        <div className="max-w-3xl mx-auto px-4 pt-32 sm:pt-36">
          <p className="text-yellow-500 text-xs font-bold tracking-[0.3em] uppercase mb-3">Legal</p>
          <h1 className="font-display text-white text-4xl sm:text-5xl mb-2">Privacy Policy</h1>
          <p className="text-white/80 text-sm mb-12">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-10">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-white font-display text-xl sm:text-2xl mb-3">{s.title}</h2>
                <div className="text-white/80 text-sm sm:text-[15px] leading-relaxed space-y-3">{s.body}</div>
              </section>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-white/80 text-xs">
              See also our{" "}
              <a href="/terms" className="text-yellow-400 hover:text-yellow-300">
                Terms & Conditions
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
