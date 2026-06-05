export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: number;
  featured: boolean;
  tags: string[];
  image: string;       // cover image URL
  imageAlt: string;    // alt text for accessibility
}

export const POSTS: BlogPost[] = [
  {
    slug: "what-to-expect-at-tequila-fest-usa-2026",
    title: "What to Expect at Tequila Fest USA 2026",
    excerpt: "First time attending? Here's everything you need to know — from how tasting tickets work to what to wear and when to arrive.",
    category: "Guide",
    author: "Tequila Fest USA",
    publishedAt: "2026-01-15",
    readTime: 5,
    featured: true,
    tags: ["guide", "first-timer", "tips"],
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80",
    imageAlt: "Crowd at an outdoor festival enjoying drinks",
    body: `
## Your First Tequila Fest: The Complete Guide

Welcome to the ultimate tequila experience. Whether you're a seasoned agave enthusiast or just tequila-curious, Tequila Fest USA is designed to be the best night of your year. Here's what to expect.

### How Tasting Tickets Work

Every All Inclusive ticket comes with **12 tasting tickets**. Each tasting ticket gets you one pour at any participating brand's booth. Most pours are about half an ounce — the perfect size to taste without overdoing it.

Pro tip: start with blancos and work your way to aged expressions. Your palate will thank you.

### Arriving Early

Doors open at 3 PM. We strongly recommend arriving in the first hour — lines are shorter, booths are fully stocked, and you'll have more time to explore at your own pace.

VIP ticket holders get priority entry and can skip straight to the VIP lounge.

### What to Wear

Think **festival casual** — comfortable shoes are a must (you'll be on your feet all evening). The vibe is festive and fun. Many guests rock floral prints, sombreros, or their city's colors.

### Pacing Yourself

With 50+ tequilas available, pacing is everything. We recommend:
- Drink water between tastings
- Grab food from the vendor area early (lines get longer as the evening goes on)
- Use your tasting tickets on bottles you've never tried — that's the whole point

### Getting Home Safe

We encourage all guests to arrange a designated driver, rideshare, or hotel stay ahead of time. Safety is everything. Many of our venues have Uber/Lyft pickup zones right at the entrance.

See you on the floor! 🥃
    `.trim(),
  },
  {
    slug: "top-10-tequilas-to-try-2026",
    title: "Top 10 Tequilas to Try at This Year's Festival",
    excerpt: "Our team's picks for the must-try bottles at the 2026 tour — from crowd favorites to hidden gems you won't find at your local bar.",
    category: "Tequila",
    author: "Tequila Fest USA",
    publishedAt: "2026-02-08",
    readTime: 4,
    featured: true,
    tags: ["tequila", "recommendations", "brands"],
    image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&q=80",
    imageAlt: "Premium tequila bottles on display",
    body: `
## The 2026 Must-Try List

Every year we crown our staff picks — the bottles that stop people in their tracks. Here's the 2026 list.

### 1. Clase Azul Reposado
The icon. Aged in American oak barrels, incredibly smooth with notes of vanilla and caramel. The hand-painted ceramic bottle doesn't hurt either.

### 2. Don Julio 1942
The gold standard of añejos. Rich, buttery, and impossibly smooth. If you only use two tasting tickets on one bottle, make it this one.

### 3. Fortaleza Still Strength Blanco
A true craft expression made the old-fashioned way. High-proof, intensely aromatic, and absolutely worth seeking out at the festival.

### 4. Avión Extra Añejo 44
Aged 43 months, then finished for another month in port wine casks. The result is something remarkable — complex, fruity, and unlike anything else on the floor.

### 5. G4 Blanco
Distilled with rainwater from the highlands of Jalisco. Clean, bright, and everything a blanco should be.

### 6. Tequila Ocho Single Estate
Terroir-driven tequila from a single field. Every vintage is different — that's part of what makes it special.

### 7. Siete Leguas Reposado
The house that made Patrón famous (before the buyout). Traditional production, exceptional quality, and way underrated.

### 8. El Tesoro Paradiso
Aged in former French Cognac barrels. Silky, complex, and one of the most unique expressions you'll find anywhere.

### 9. Código 1530 Añejo — Our Official Tequila
Our presenting sponsor for good reason. Aged in Napa Valley Cabernet barrels, this is a tequila that wins over non-tequila drinkers every single time.

### 10. ArteNOM Selección 1414
Made at a historic distillery (NOM 1414) using traditional stone tahona crushing. Earthy, herbaceous, and deeply complex.

Come find these and 40+ more at the 2026 tour. 🥃
    `.trim(),
  },
  {
    slug: "cincinnati-2026-venue-guide",
    title: "Cincinnati 2026: Fountain Square Venue Guide",
    excerpt: "Everything you need to know about Fountain Square — parking, transit, nearby hotels, and what makes it the perfect festival backdrop.",
    category: "Event",
    author: "Tequila Fest USA",
    publishedAt: "2026-03-01",
    readTime: 3,
    featured: false,
    tags: ["cincinnati", "venue", "travel"],
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
    imageAlt: "Cincinnati city skyline at dusk",
    body: `
## Fountain Square: Cincinnati's Living Room

There's no better backdrop for a tequila festival than downtown Cincinnati's most iconic public space. Here's everything you need to plan your night.

### Getting There

**Address:** 520 Vine St, Cincinnati, OH 45202

Fountain Square sits at the heart of downtown Cincinnati, easily accessible from multiple directions.

**By Car:** Several parking garages within 2 blocks, including the 4th & Race Garage and the PNC Tower Garage.

**By Transit:** Multiple Metro bus routes stop within a block. The closest stop is 5th & Vine.

**By Rideshare:** Uber and Lyft drop-offs are available on Vine St.

### Nearby Hotels

We recommend staying downtown so you can walk back after the festival:

- **21c Museum Hotel** — 2 min walk
- **Hilton Cincinnati Netherland Plaza** — 3 min walk
- **Marriott Cincinnati at RiverCenter** — 10 min drive

### What to Know About the Space

Fountain Square is an open-air venue with the iconic Tyler Davidson Fountain as its centerpiece. The festival takes over the main square plus the surrounding terrace areas.

- Weather: June in Cincinnati averages 78°F. Light layers recommended for evening.
- Dress code: Festive casual. No black tie, no flip flops.
- Accessibility: The square is fully accessible.

### The Neighborhood

After (or before) the festival, explore the incredible restaurant and bar scene on 4th Street. The Banks waterfront district is a 10-minute walk. Need brunch the next morning? Findlay Market is about 2 miles north.

See you June 13! 🥃
    `.trim(),
  },
  {
    slug: "how-to-become-a-tequila-fest-affiliate",
    title: "How to Become a Tequila Fest Affiliate and Earn Commission",
    excerpt: "Our affiliate program is one of the best in the events space — here's how it works, what you earn, and how to get started today.",
    category: "Affiliate",
    author: "Tequila Fest USA",
    publishedAt: "2026-03-20",
    readTime: 3,
    featured: false,
    tags: ["affiliate", "earn", "program"],
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    imageAlt: "Person using a laptop to manage an online business",
    body: `
## Turn Your Audience Into Income

The Tequila Fest USA Affiliate Program lets you earn real money every time someone buys a ticket through your link. Here's how it works.

### What You Earn

- **$5 per All Inclusive ticket** sold through your link
- **$10 per VIP ticket** sold through your link
- Payouts processed monthly via PayPal or direct deposit
- No cap — the more you sell, the more you earn

### Who Should Apply

- Food & beverage influencers
- Local event bloggers and city guides
- Festival community Facebook group admins
- Nightlife and entertainment accounts
- Anyone with an audience in our tour cities

### How It Works

1. **Apply** at tequilafestusa.com/affiliates
2. **Get approved** (typically within 24 hours)
3. **Get your unique link** — track clicks and conversions in real time
4. **Promote** — share on social, email, or anywhere your audience lives
5. **Get paid** — monthly payouts, no minimums

### Promotional Materials

Once approved, you'll get access to:
- Ready-made social media graphics for every city
- Email copy templates
- Custom discount codes for your audience (5% off — great for conversions)

### FAQs

**Do I need to attend the festival?** Nope, though we'd love to have you.

**When do I get paid?** Payouts are processed on the 15th of each month for the previous month's sales.

**Is there a minimum payout?** No minimums. Earn $1 and we'll pay it out.

Ready to earn? Apply at tequilafestusa.com/affiliates. 🥃
    `.trim(),
  },
  {
    slug: "vip-experience-what-you-get",
    title: "Is the VIP Ticket Worth It? Here's Exactly What You Get",
    excerpt: "We break down every single perk included in the VIP experience — and why most guests who upgrade say it's the best $125 they've spent.",
    category: "Guide",
    author: "Tequila Fest USA",
    publishedAt: "2026-04-05",
    readTime: 4,
    featured: false,
    tags: ["vip", "experience", "worth-it"],
    image: "https://images.unsplash.com/photo-1470338745628-171cf53de3a8?w=800&q=80",
    imageAlt: "VIP lounge at an upscale event",
    body: `
## VIP vs. All Inclusive: Is the Upgrade Worth It?

Short answer: yes. Here's the longer version.

### What's Included in VIP ($125)

Your VIP ticket includes **everything in All Inclusive**, plus:

**1. Private VIP Lounge**
A separate, exclusive space away from the main festival floor. Premium seating, personal service, and a more relaxed atmosphere. Great if you want the festival energy without fighting for elbow room.

**2. 8 Super Premium Pours**
These are the bottles that don't appear on the main floor. We're talking Clase Azul, Don Julio 1942, Fortaleza Still Strength, and other ultra-premium expressions. These 8 pours alone are worth the upgrade for any serious tequila enthusiast.

**3. Build-Your-Own Taco Bar**
Dedicated food service in the VIP area. Fresh proteins, handmade salsas, all the fixings — and no waiting in the general food line.

**4. Priority Entry**
Skip the general admission line entirely. Walk straight to the VIP entrance and you're in.

**5. Dedicated VIP Bartenders**
No waiting for your tasting pours. VIP bartenders are exclusively serving the VIP lounge.

**6. VIP-Only Gift Bag**
Every VIP guest takes home an exclusive gift bag with festival merchandise and partner brand samples.

### Who Should Upgrade

- Anyone who wants to try the rarest bottles
- Groups who want their own space
- First-timers who want the full experience
- Anyone who hates lines

### The Math

VIP is $125. All Inclusive is $55 (Early Bird). The upgrade is $70. If you use all 8 super premium pours, you're getting access to bottles that would cost $25–$40 each at a bar. That's a $200–$320 value on the pours alone.

Worth it? We think so. 🥃
    `.trim(),
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find(p => p.slug === slug);
}

export function getFeaturedPosts(): BlogPost[] {
  return POSTS.filter(p => p.featured);
}
