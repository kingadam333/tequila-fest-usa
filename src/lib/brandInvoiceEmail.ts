// The brand invoice email (admin -> Brands -> New Invoice). Lives outside the
// route so it can be rendered on its own for previews.
import { wrapEmailHtml } from "@/lib/emailLayout";

export interface InvoicePaymentSettings {
  check_payable_to: string | null;
  mailing_address: string | null;
  zelle_handle: string | null;
  zelle_qr_url: string | null;
}

export function buildInvoiceEmailHtml({ contact_name, invoice_number, event_name, line_items, total, due_date, payment_url, paymentSettings }: {
  contact_name: string; invoice_number: string; event_name?: string; line_items: { description: string; quantity: number; unit_price: number; total: number }[];
  total: number; due_date?: string; payment_url?: string; paymentSettings?: InvoicePaymentSettings | null;
}) {
  const hasCheck = paymentSettings?.check_payable_to && paymentSettings?.mailing_address;
  const hasZelle = paymentSettings?.zelle_handle;
  const otherWaysToPay = (hasCheck || hasZelle) ? `
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2a1a00">
      <h3 style="color:#f5a623;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px">Other Ways to Pay</h3>
      <div style="display:block">
        ${hasCheck ? `
        <div style="margin-bottom:${hasZelle ? "20px" : "0"}">
          <p style="color:#fff8f0;font-weight:bold;margin:0 0 4px">Pay by Check</p>
          <p style="color:#fff8f0;opacity:0.7;margin:0;line-height:1.5">
            Make payable to: <strong>${paymentSettings!.check_payable_to}</strong><br>
            Mail to:<br>${paymentSettings!.mailing_address!.replace(/\n/g, "<br>")}
          </p>
        </div>` : ""}
        ${hasZelle ? `
        <div>
          <p style="color:#fff8f0;font-weight:bold;margin:0 0 4px">Pay by Zelle</p>
          <p style="color:#fff8f0;opacity:0.7;margin:0 0 12px">Send to: <strong>${paymentSettings!.zelle_handle}</strong></p>
          ${paymentSettings?.zelle_qr_url ? `<img src="${paymentSettings.zelle_qr_url}" width="160" height="160" alt="Zelle QR code" style="border-radius:8px;border:1px solid #2a1a00" />` : ""}
        </div>` : ""}
      </div>
      <p style="color:#fff8f0;opacity:0.4;font-size:12px;margin:16px 0 0">Paying by check or Zelle? Please include invoice #${invoice_number} as a note/memo, and let us know at brands@mail.tequilafestusa.com so we can mark it received.</p>
    </div>` : "";
  // Negative-total rows are discounts/comps — shown in green with a minus
  // sign so a contact billed for 3 of 5 brands (say) can see all 5 listed
  // and exactly what was waived, not just a smaller total with no context.
  const rows = line_items.map(item => {
    const isDiscount = item.total < 0;
    const isComp = item.total === 0 && item.unit_price === 0;
    const amountColor = isDiscount ? "#4ade80" : "#f5a623";
    const amountText = isDiscount ? `−$${Math.abs(item.total).toFixed(2)}` : `$${item.total.toFixed(2)}`;
    return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a1a00;color:#fff8f0">${item.description}${isComp ? ` <span style="color:#4ade80;font-size:11px;font-weight:bold;text-transform:uppercase">(Comp)</span>` : ""}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a1a00;color:#fff8f0;text-align:center">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a1a00;color:#fff8f0;text-align:right;padding-left:16px;white-space:nowrap">$${item.unit_price.toFixed(2)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a1a00;color:${amountColor};text-align:right;font-weight:bold;padding-left:16px;white-space:nowrap">${amountText}</td>
    </tr>`;
  }).join("");
  return wrapEmailHtml(`
    <h1 style="color:#f5a623;font-size:28px;margin:0 0 4px">TEQUILA FEST USA</h1>
    <p style="color:#fff8f0;opacity:0.5;margin:0 0 32px">Brand Invoice</p>
    <h2 style="color:#fff;margin:0 0 8px">Invoice #${invoice_number}</h2>
    ${event_name ? `<p style="color:#f5a623;margin:0 0 24px">${event_name}</p>` : ""}
    <p style="margin:0 0 24px">Hi ${contact_name},<br><br>Please find your invoice below.${payment_url ? " Use the button to pay securely online via Stripe." : ""}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead><tr>
        <th style="text-align:left;color:#f5a623;font-size:12px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #f5a623">Description</th>
        <th style="text-align:center;color:#f5a623;font-size:12px;text-transform:uppercase;padding-bottom:8px;padding-left:12px;border-bottom:1px solid #f5a623">Qty</th>
        <th style="text-align:right;color:#f5a623;font-size:12px;text-transform:uppercase;padding-bottom:8px;padding-left:16px;border-bottom:1px solid #f5a623;white-space:nowrap">Unit Price</th>
        <th style="text-align:right;color:#f5a623;font-size:12px;text-transform:uppercase;padding-bottom:8px;padding-left:16px;border-bottom:1px solid #f5a623">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:right;margin-top:16px;font-size:20px;font-weight:bold;color:#f5a623">Total: $${total.toFixed(2)}</div>
    ${due_date && payment_url ? `<p style="color:#fff8f0;opacity:0.6;text-align:right;font-size:13px">Due: ${due_date}</p>` : ""}
    ${payment_url ? `
    <div style="text-align:center;margin:40px 0">
      <a href="${payment_url}" style="background:#f5a623;color:#0d0500;font-weight:bold;font-size:16px;padding:16px 40px;border-radius:8px;text-decoration:none;display:inline-block">Pay Invoice Online →</a>
    </div>` : `
    <div style="text-align:center;margin:40px 0;padding:16px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.25);border-radius:12px">
      <p style="color:#4ade80;font-weight:bold;margin:0">No payment due — this invoice is fully comped.</p>
    </div>`}
    ${otherWaysToPay}
    <p style="color:#fff8f0;opacity:0.6;font-size:12px;text-align:center;margin-top:32px">Tequila Fest USA · brands@mail.tequilafestusa.com</p>`, { maxWidth: 600 });
}
