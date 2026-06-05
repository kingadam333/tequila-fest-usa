export const PRICING = {
  earlyBird: { price: 55,  label: "Early Bird",        note: "First 300 tickets", available: true },
  regular:   { price: 60,  label: "Regular Rate",      note: "General on-sale",   available: true },
  late:      { price: 65,  label: "Late Registration", note: "Final week only",   available: false },
  vip:       { price: 125, label: "VIP",               note: "All Inclusive + exclusive VIP access", available: true },
};

export interface EventData {
  slug: string;
  city: string;
  state: string;
  date: string;
  dateISO: string;
  time: string;
  venue: string;
  venueDetail: string;
  venueAddress: string;
  price: number;
  gaTicket: { price: number; limited: boolean; qty?: number } | null;
  freeParking: boolean;
  color: string;
  gradient: string;
  border: string;
  tag: string;
  emoji: string;
  description: string;
}

export const EVENTS: EventData[] = [
  {
    slug: "cincinnati",
    city: "Cincinnati",
    state: "OH",
    date: "June 13, 2026",
    dateISO: "2026-06-13T15:00:00",
    time: "3:00 PM – 9:00 PM",
    venue: "Fountain Square",
    venueDetail: "Downtown Cincinnati",
    venueAddress: "520 Vine St, Cincinnati, OH 45202",
    price: 55,
    gaTicket: null,
    freeParking: false,
    color: "#F5A623",
    gradient: "from-yellow-900/60 to-orange-950/80",
    border: "border-yellow-500/30",
    tag: "Flagship City",
    emoji: "🏙️",
    description:
      "Tequila Fest kicks off its 2026 national tour at the iconic Fountain Square in the heart of downtown Cincinnati. Sample 50+ premium tequilas, enjoy authentic tacos, and dance to live music in one of the city's most beloved public spaces.",
  },
  {
    slug: "cleveland",
    city: "Cleveland",
    state: "OH",
    date: "July 25, 2026",
    dateISO: "2026-07-25T15:00:00",
    time: "3:00 PM – 9:00 PM",
    venue: "Cuyahoga County Fairgrounds",
    venueDetail: "Berea, OH",
    venueAddress: "Cuyahoga County Fairgrounds, Berea, OH 44017",
    price: 55,
    gaTicket: { price: 5, limited: false },
    freeParking: true,
    color: "#C8102E",
    gradient: "from-red-900/60 to-rose-950/80",
    border: "border-red-500/30",
    tag: "Lake Erie Edition",
    emoji: "🌊",
    description:
      "The Lake Erie Edition brings Tequila Fest to the Cuyahoga County Fairgrounds with massive outdoor space, free parking, and a $5 GA entry option. Explore 50+ tequilas, live entertainment, and incredible food in a festival setting built for a crowd.",
  },
  {
    slug: "columbus",
    city: "Columbus",
    state: "OH",
    date: "August 8, 2026",
    dateISO: "2026-08-08T15:00:00",
    time: "3:00 PM – 9:00 PM",
    venue: "Gravity / Greater Columbus Convention Center",
    venueDetail: "Downtown Columbus",
    venueAddress: "400 N High St, Columbus, OH 43215",
    price: 55,
    gaTicket: { price: 5, limited: true, qty: 100 },
    freeParking: false,
    color: "#00A878",
    gradient: "from-emerald-900/60 to-teal-950/80",
    border: "border-emerald-500/30",
    tag: "Capital City",
    emoji: "🌿",
    description:
      "The Capital City stop takes over Gravity at the Greater Columbus Convention Center for an unforgettable evening. Only 100 $5 GA tickets available — grab yours fast. All Inclusive ticket holders enjoy 12 tasting pours, food, live music, and a souvenir.",
  },
  {
    slug: "phoenix",
    city: "Phoenix",
    state: "AZ",
    date: "November 14, 2026",
    dateISO: "2026-11-14T15:00:00",
    time: "3:00 PM – 9:00 PM",
    venue: "Phoenix Convention Center",
    venueDetail: "Downtown Phoenix",
    venueAddress: "100 N 3rd St, Phoenix, AZ 85004",
    price: 55,
    gaTicket: null,
    freeParking: true,
    color: "#7B2FBE",
    gradient: "from-purple-900/60 to-violet-950/80",
    border: "border-purple-500/30",
    tag: "Desert Edition",
    emoji: "🌵",
    description:
      "The Desert Edition closes out the 2026 tour at the Phoenix Convention Center with free parking and an incredible lineup of premium tequilas. End the year right with 50+ pours, authentic cuisine, live music, and the warm Arizona November evenings.",
  },
];

export function getEvent(slug: string): EventData | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
