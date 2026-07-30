// Base Google tag (gtag.js) for Google Ads — required for the "Purchase"
// conversion action, which is configured in Google Ads as a page-load
// conversion on /ticket-confirmation (not a GTM/dataLayer event). Without
// this tag actually installed, that conversion action can never fire no
// matter how correct the dataLayer purchase event pushed elsewhere is.
//
// AW-18196896859 is a public tracking ID (same category as NEXT_PUBLIC_GTM_ID),
// hardcoded rather than env-gated so this can't silently no-op from a missing
// env var. Rendered as plain <script> JSX (not next/script) to match the GTM
// component's approach — Next's script strategies don't reliably land inside
// the literal <head> tag in this Next.js version.
const GOOGLE_ADS_ID = "AW-18196896859";

export function GoogleAdsTagScript() {
  return (
    <script
      id="google-ads-tag"
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_ID}');
        `,
      }}
    />
  );
}

export function GoogleAdsGtagSrc() {
  return <script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} />;
}
