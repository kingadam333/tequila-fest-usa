import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tequilafestusa.com";

// Everything gated or transactional is disallowed: auth pages, customer/admin/staff
// dashboards, the check-in portal, and the three post-payment confirmation pages.
// Those last three matter beyond SEO — /ticket-confirmation, /brand-packages/success
// and /vendor-payment-success fire purchase conversions, so a crawler hitting them
// would pollute Google Ads / Meta / Roku with phantom purchases.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/account",
          "/checkin",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/affiliate/dashboard",
          "/affiliate/login",
          "/media/dashboard",
          "/media/login",
          "/staff/",
          "/ticket-confirmation",
          "/brand-packages/success",
          "/vendor-payment-success",
          "/go/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
