// Brand participation packages (/brand-packages). Shared by the self-serve
// checkout (/api/brand-checkout, the real price source for online purchases)
// and the admin "New Brand Invoice" package picker, so an invoiced brand is
// charged the same per-city rate as one who buys online.
export const BRAND_TIER_PRICES: Record<string, number> = {
  Value: 250,
  Standard: 300,
  Premium: 350,
};

export const BRAND_CITY_LABELS: Record<string, string> = {
  cleveland: "Cleveland, OH",
  cincinnati: "Cincinnati, OH",
  columbus: "Columbus, OH",
  phoenix: "Phoenix, AZ",
};
