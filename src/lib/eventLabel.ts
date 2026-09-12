// How an event is named on anything a customer or the Stripe dashboard sees.
//
// The year used to be typed into the string literal — `Tequila Fest ${city} 2026`
// — in both checkout routes. Cincinnati and Cleveland rolled over to 2027 dates
// and those literals did not, so every ticket sold afterwards was labelled with
// the wrong year on the customer's checkout page, on their Stripe receipt, and
// in the dashboard's payment description.
//
// So the year is derived from the event's own date and never written by hand.
// If the date is missing or unparseable, the label simply omits the year rather
// than guessing one: no year at all beats a confidently wrong one on a receipt.
//
// `events.date_iso` stores the event's LOCAL start time written as if it were
// UTC (a 3:00 PM Eastern start is stored `15:00:00+00`), so the year is read in
// UTC — reading it locally could roll a New Year's Eve event into the wrong year.

export function eventYear(dateISO?: string | null): number | null {
  if (!dateISO) return null;
  const t = new Date(dateISO);
  if (Number.isNaN(t.getTime())) return null;
  return t.getUTCFullYear();
}

/** e.g. "Tequila Fest Cincinnati 2027" — or "Tequila Fest Cincinnati" with no usable date. */
export function eventLabel(city: string, dateISO?: string | null): string {
  const year = eventYear(dateISO);
  return year ? `Tequila Fest ${city} ${year}` : `Tequila Fest ${city}`;
}
