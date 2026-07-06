// Google Tag Manager — split into a head script + body noscript fallback,
// exactly as Google's own install snippet requires. Rendered directly in
// layout.tsx (head script inside <head>, noscript right after <body> opens)
// rather than via next/script, for the same reason as MetaPixelHead: Next's
// script-injection strategies don't reliably land in the literal tag GTM
// docs specify, which can cause GTM's own install-check to flag it.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export function GTMHeadScript() {
  if (!GTM_ID) return null;

  return (
    <script
      id="gtm-head"
      dangerouslySetInnerHTML={{
        __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `,
      }}
    />
  );
}

export function GTMBodyNoscript() {
  if (!GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
