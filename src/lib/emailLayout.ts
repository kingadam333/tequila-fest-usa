// Shared HTML-email shell using the pattern proven to actually render in
// Gmail: an outer full-width <table> with an explicit background color
// immediately inside <body>, then a fixed-width inner table for content.
//
// A plain `<body style="background:#0d0500">` + `<div>` (no outer table)
// looks fine in a browser preview but Gmail frequently strips the <body>
// background entirely, leaving near-white text (#fff8f0 etc.) on Gmail's
// default white page background — invisible. Confirmed via a real test
// send that looked completely blank. Every email template in this project
// should build on wrapEmailHtml() rather than hand-rolling <body><div>.
export function wrapEmailHtml(innerHtml: string, opts?: { maxWidth?: number }): string {
  const maxWidth = opts?.maxWidth ?? 560;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
  <tr><td align="center">
    <table width="${maxWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width:${maxWidth}px;width:100%">
      <tr><td>
        ${innerHtml}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
