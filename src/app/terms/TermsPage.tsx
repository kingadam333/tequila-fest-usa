import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

const LAST_UPDATED = "August 4, 2026";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Acceptance of Terms",
    body: (
      <>
        <p>
          These Terms & Conditions (&quot;Terms&quot;) govern your purchase and use of tickets, and your attendance
          at, any Tequila Fest USA event, and your use of tequilafestusa.com (the &quot;Site&quot;), operated by
          Taste Festivals & Events LLC (&quot;Tequila Fest USA,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
        </p>
        <p>
          By purchasing a ticket, registering as a vendor, sponsor, or affiliate, or otherwise using the Site, you
          agree to be bound by these Terms. If you do not agree, do not purchase a ticket or use the Site.
        </p>
      </>
    ),
  },
  {
    title: "2. Age Requirement & ID",
    body: (
      <>
        <p>
          Tequila Fest USA events are 21+ only. No one under 21 will be admitted, regardless of whether they are
          accompanied by a parent or guardian, and regardless of whether a ticket was purchased on their behalf.
        </p>
        <p>
          Valid, government-issued photo ID is required for entry and may be checked again at any point during the
          event, including at sampling/pour stations. We reserve the right to refuse entry or service to anyone who
          cannot produce valid ID or who appears intoxicated at the time of check-in.
        </p>
      </>
    ),
  },
  {
    title: "3. Tickets — All Sales Final",
    body: (
      <>
        <p>
          <strong className="text-white">All ticket sales are final. There are no refunds or exchanges</strong>, for
          any reason, including but not limited to: change of mind, inability to attend, illness, travel issues,
          weather, or dissatisfaction with the event. This applies to every ticket type (General Admission, Early
          Bird, Regular Rate, Late Registration, VIP, or any other tier) and to any add-ons or upgrades purchased.
        </p>
        <p>
          Ticket prices increase as an event gets closer to capacity or as sale windows (Early Bird, Regular Rate,
          Late Registration) close. We do not retroactively adjust the price of a ticket already purchased, and we
          do not offer credit for the difference between pricing tiers.
        </p>
        <p>
          Tickets are sold exclusively through tequilafestusa.com or an authorized Tequila Fest USA affiliate link.
          Tickets purchased through any unauthorized third party (including resale sites, social media sellers, or
          scalpers) are not guaranteed to be valid and Tequila Fest USA is not responsible for counterfeit,
          duplicated, or fraudulently obtained tickets.
        </p>
        <p>
          It is your responsibility to select the correct city and event date before completing checkout. We do not
          issue refunds, exchanges, or credit toward a different event if you purchase a ticket for the wrong city,
          date, or event — including if you meant to buy a ticket for a different Tequila Fest USA event happening
          in another city or on another day. Please double-check the event details shown on the checkout page
          before paying.
        </p>
      </>
    ),
  },
  {
    title: "4. Ticket Transfers",
    body: (
      <>
        <p>
          Tickets may be transferred to another person free of charge — the new attendee should bring the QR code
          from the original confirmation email or the original purchaser&apos;s account. A transferred ticket is
          still subject to the same age requirement, ID check, and all other terms in this document.
        </p>
        <p>
          Transferring a ticket does not create any right to a refund. Only one person may check in per ticket —
          once a ticket has been scanned for entry, it cannot be reused or transferred.
        </p>
      </>
    ),
  },
  {
    title: "5. Rain or Shine — Event Changes, Postponement & Cancellation",
    body: (
      <>
        <p>
          Tequila Fest USA events are <strong className="text-white">rain or shine</strong>. Weather is not grounds
          for a refund, and the event will proceed as scheduled except in the case of a genuine safety hazard (e.g.
          severe storms, lightning, extreme heat, or a venue/local authority order).
        </p>
        <p>
          If we must postpone, reschedule, or cancel an event due to safety, venue availability, permitting, a
          government order, or other circumstances outside our reasonable control (a &quot;Force Majeure Event&quot;),
          we will make reasonable efforts to notify ticket holders using the email/phone on file and will decide, at
          our discretion, whether affected tickets will be honored at a rescheduled date, transferred to a future
          Tequila Fest USA event, or refunded in whole or in part. Outside of a cancellation we initiate, no refunds
          will be issued.
        </p>
        <p>
          Event details — including but not limited to lineup, vendors, brands pouring, start/end times, and venue
          layout — are subject to change without notice and are not grounds for a refund.
        </p>
      </>
    ),
  },
  {
    title: "6. Entry, Conduct & Right to Refuse",
    body: (
      <>
        <p>
          We reserve the right to refuse entry or remove any person from the event, without refund, for conduct we
          reasonably believe endangers themselves or others, violates venue rules or applicable law, or is
          disorderly, abusive, or intoxicated beyond a level we deem safe to continue serving.
        </p>
        <p>
          Illegal drugs, outside alcohol, and weapons are strictly prohibited. Attendees may be subject to bag checks
          or security screening at venue entry.
        </p>
        <p>
          Please drink responsibly. Free water and, where available, designated ride/rideshare information will be
          provided — attendees are responsible for arranging safe transportation home.
        </p>
      </>
    ),
  },
  {
    title: "7. Assumption of Risk",
    body: (
      <p>
        Attending a tequila-sampling festival involves inherent risks, including but not limited to the effects of
        alcohol consumption, large crowds, outdoor/venue conditions, and physical activity. By attending, you
        voluntarily assume all such risks and release Tequila Fest USA, its officers, employees, sponsors, vendors,
        and the venue from any claim, liability, injury, or loss arising from your attendance, to the fullest extent
        permitted by law.
      </p>
    ),
  },
  {
    title: "8. Photo, Video & Media Release",
    body: (
      <p>
        Tequila Fest USA and its authorized photographers/videographers may capture photo and video at our events
        for use in marketing, social media, and promotional materials. By attending, you consent to being
        photographed or filmed and to our use of that content without compensation. If you do not wish to be
        photographed, please notify event staff, though we cannot guarantee exclusion from wide event/crowd shots.
      </p>
    ),
  },
  {
    title: "9. Vendors, Sponsors & the Affiliate Program",
    body: (
      <>
        <p>
          Vendor booth fees, sponsorship fees, and any other invoiced amounts are due per the terms stated on the
          applicable invoice or agreement, and are non-refundable once an application is approved and payment is
          received, except where we cancel the event outright.
        </p>
        <p>
          Participants in our affiliate program earn commission only on completed, paid ticket sales attributed
          through their unique referral link, at the commission rate assigned to their account. Tequila Fest USA
          may adjust commission rates, suspend, or terminate an affiliate&apos;s participation at its discretion,
          including for fraudulent, misleading, or spam-based promotion of referral links.
        </p>
      </>
    ),
  },
  {
    title: "10. Website Use & Intellectual Property",
    body: (
      <p>
        All content on the Site — including the Tequila Fest USA name, logo, graphics, and event branding — is the
        property of Taste Festivals & Events LLC or its licensors and may not be copied, reproduced, or used
        without written permission. You agree not to use the Site for any unlawful purpose or to attempt to
        interfere with its normal operation.
      </p>
    ),
  },
  {
    title: "11. Limitation of Liability",
    body: (
      <p>
        To the fullest extent permitted by law, Tequila Fest USA&apos;s total liability arising out of or relating
        to a ticket purchase, the Site, or an event is limited to the amount you actually paid for the ticket(s) in
        question. Tequila Fest USA is not liable for indirect, incidental, or consequential damages, including lost
        wages, travel costs, or lodging, arising from a cancellation, postponement, or change to an event.
      </p>
    ),
  },
  {
    title: "12. Governing Law",
    body: (
      <p>
        These Terms are governed by the laws of the State of Ohio, without regard to conflict-of-law principles. Any
        dispute arising from these Terms or a Tequila Fest USA event will be resolved in the state or federal courts
        located in Ohio.
      </p>
    ),
  },
  {
    title: "13. Changes to These Terms",
    body: (
      <p>
        We may update these Terms from time to time. The &quot;Last updated&quot; date at the top of this page
        reflects the most recent revision. Continued use of the Site or purchase of a ticket after changes are
        posted constitutes acceptance of the updated Terms.
      </p>
    ),
  },
  {
    title: "14. Contact Us",
    body: (
      <p>
        Questions about these Terms? Email us at{" "}
        <a href="mailto:help@mail.tequilafestusa.com" className="text-yellow-400 hover:text-yellow-300">
          help@mail.tequilafestusa.com
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <OfficialBanner />
      <Navbar />
      <main className="min-h-screen bg-[#0d0500] pb-24">
        <div className="max-w-3xl mx-auto px-4 pt-32 sm:pt-36">
          <p className="text-yellow-500 text-xs font-bold tracking-[0.3em] uppercase mb-3">Legal</p>
          <h1 className="font-display text-white text-4xl sm:text-5xl mb-2">Terms & Conditions</h1>
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
              <a href="/privacy" className="text-yellow-400 hover:text-yellow-300">
                Privacy Policy
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
