/**
 * Mock trip + option data, ported from the design canvas (shared.jsx + detail-data.jsx).
 * Drives the Postcard detail screens until the real backend tools surface ranked options.
 */

export type TripId = "europe" | "japan" | "patagonia";

export type City = {
  code: string;
  city: string;
  country: string;
  nights: number;
  hotel: { name: string; rating: number; type: string; price: number; perNight: boolean };
};

export type Trip = {
  id: TripId;
  title: string;
  subtitle: string;
  dates: string;
  nDays: number;
  travelers: number;
  budget: { spent: number; total: number; currency: string };
  origin: { code: string; city: string };
  cities: City[];
};

export const TRIPS: Record<TripId, Trip> = {
  europe: {
    id: "europe",
    title: "Central & Eastern Europe",
    subtitle: "Kraków · Prague · Ljubljana · Dubrovnik",
    dates: "Jul 5 — Jul 22, 2026",
    nDays: 17,
    travelers: 1,
    budget: { spent: 2840, total: 4200, currency: "USD" },
    origin: { code: "JFK", city: "New York" },
    cities: [
      { code: "KRK", city: "Kraków", country: "Poland", nights: 5, hotel: { name: "Hotel Indigo Old Town", rating: 4.6, type: "Boutique · Stare Miasto", price: 142, perNight: true } },
      { code: "PRG", city: "Prague", country: "Czechia", nights: 4, hotel: { name: "Maximilian Hotel", rating: 4.7, type: "Boutique · Old Town", price: 168, perNight: true } },
      { code: "LJU", city: "Ljubljana", country: "Slovenia", nights: 4, hotel: { name: "Vander Urbani Resort", rating: 4.8, type: "Design · Center", price: 196, perNight: true } },
      { code: "DBV", city: "Dubrovnik", country: "Croatia", nights: 4, hotel: { name: "Villa Dubrovnik", rating: 4.9, type: "Cliffside suite", price: 412, perNight: true } },
    ],
  },
  japan: {
    id: "japan",
    title: "Japan in Cherry Blossom Season",
    subtitle: "Tokyo · Hakone · Kyoto · Naoshima",
    dates: "Mar 28 — Apr 11, 2026",
    nDays: 14,
    travelers: 1,
    budget: { spent: 3120, total: 5800, currency: "USD" },
    origin: { code: "SFO", city: "San Francisco" },
    cities: [
      { code: "HND", city: "Tokyo", country: "Japan", nights: 5, hotel: { name: "Trunk Hotel Yoyogi", rating: 4.8, type: "Design · Shibuya", price: 286, perNight: true } },
      { code: "OWD", city: "Hakone", country: "Japan", nights: 2, hotel: { name: "Gora Kadan Ryokan", rating: 4.9, type: "Onsen ryokan", price: 624, perNight: true } },
      { code: "KYO", city: "Kyoto", country: "Japan", nights: 4, hotel: { name: "Hoshinoya Kyoto", rating: 4.9, type: "Riverside ryokan", price: 712, perNight: true } },
      { code: "NAO", city: "Naoshima", country: "Japan", nights: 3, hotel: { name: "Benesse House", rating: 4.7, type: "Art island stay", price: 348, perNight: true } },
    ],
  },
  patagonia: {
    id: "patagonia",
    title: "Patagonia, end of summer",
    subtitle: "Santiago · Puerto Natales · El Chaltén · Buenos Aires",
    dates: "Mar 1 — Mar 16, 2026",
    nDays: 15,
    travelers: 1,
    budget: { spent: 2210, total: 3800, currency: "USD" },
    origin: { code: "LAX", city: "Los Angeles" },
    cities: [
      { code: "SCL", city: "Santiago", country: "Chile", nights: 3, hotel: { name: "Hotel Magnolia", rating: 4.6, type: "Boutique · Lastarria", price: 168, perNight: true } },
      { code: "PNT", city: "Puerto Natales", country: "Chile", nights: 5, hotel: { name: "Singular Patagonia", rating: 4.9, type: "Lodge w/ excursions", price: 612, perNight: true } },
      { code: "FTE", city: "El Chaltén", country: "Argentina", nights: 4, hotel: { name: "Estancia Cristina", rating: 4.8, type: "Glacier estancia", price: 482, perNight: true } },
      { code: "EZE", city: "Buenos Aires", country: "Argentina", nights: 3, hotel: { name: "Casa Lucia", rating: 4.7, type: "Boutique · Recoleta", price: 224, perNight: true } },
    ],
  },
};

// --- Flight options ---

type Endpoint = { time: string; airport: string; city: string; date: string; dayShift?: string };

export type FlightOption = {
  id: string;
  rank: number;
  fit: number;
  recommended?: boolean;
  carrier: string;
  code: string;
  logoColor: string;
  depart: Endpoint;
  arrive: Endpoint;
  duration: string;
  stops: string;
  via: string;
  cabin: string;
  price: number;
  baggage: string;
  meals: string;
  aircraft: string;
  wifi: boolean | string;
  power: string;
  legroom: string;
  co2: string;
  co2Note: string;
  tags: string[];
  why: string;
  pros: string[];
  cons: string[];
  review: { score: number; count: number };
};

export type StageData<T> = {
  legId?: string;
  cityCode?: string;
  title: string;
  subtitle: string;
  options: T[];
};

export const FLIGHT_OPTIONS: Record<TripId, StageData<FlightOption>> = {
  europe: {
    legId: "l1",
    title: "New York → Kraków",
    subtitle: "Outbound · Jul 5, 2026",
    options: [
      { id: "f1", rank: 1, fit: 92, recommended: true, carrier: "LOT Polish", code: "LO 26", logoColor: "#e30613",
        depart: { time: "21:30", airport: "JFK", city: "New York", date: "Jul 5" },
        arrive: { time: "14:05", airport: "KRK", city: "Kraków", date: "Jul 6", dayShift: "+1" },
        duration: "10h 35m", stops: "1 stop", via: "WAW · 1h 25m", cabin: "Economy",
        price: 612, baggage: "2 × 23kg", meals: "Hot dinner + breakfast",
        aircraft: "Boeing 787-9", wifi: true, power: "Universal",
        legroom: '31"', co2: "612 kg", co2Note: "−12% vs. avg",
        tags: ["Best overnight", "Sleeps full", "Direct from JFK"],
        why: "Overnight rhythm puts you in Kraków by mid-afternoon — long enough to drop bags, walk to Rynek Główny, and beat jet lag with sunlight.",
        pros: ["Lie-flat possible (787)", "Lands ahead of check-in", "Lounge access via Star Alliance"],
        cons: ["Connection in WAW (compact)"],
        review: { score: 8.4, count: 3210 } },
      { id: "f2", rank: 2, fit: 78, carrier: "Lufthansa", code: "LH 401", logoColor: "#05164d",
        depart: { time: "17:55", airport: "JFK", city: "New York", date: "Jul 5" },
        arrive: { time: "15:20", airport: "KRK", city: "Kraków", date: "Jul 6", dayShift: "+1" },
        duration: "15h 25m", stops: "1 stop", via: "FRA · 3h 10m", cabin: "Economy",
        price: 548, baggage: "1 × 23kg", meals: "Dinner",
        aircraft: "Airbus A350", wifi: true, power: "USB-C",
        legroom: '32"', co2: "702 kg", co2Note: "0% vs. avg",
        tags: ["Cheapest direct-ish", "Reliable carrier"],
        why: "$64 cheaper but the Frankfurt layover is 3h+ and you arrive an hour later. Better if you'd like a long stretch break mid-route.",
        pros: ["$64 savings", "A350 quieter cabin", "Frankfurt has good food"],
        cons: ["Long layover", "Only 1 bag included"],
        review: { score: 8.7, count: 8420 } },
      { id: "f3", rank: 3, fit: 64, carrier: "Delta + KLM", code: "DL 38 / KL 1675", logoColor: "#003876",
        depart: { time: "22:55", airport: "JFK", city: "New York", date: "Jul 5" },
        arrive: { time: "17:45", airport: "KRK", city: "Kraków", date: "Jul 6", dayShift: "+1" },
        duration: "12h 50m", stops: "1 stop", via: "AMS · 1h 50m", cabin: "Economy",
        price: 678, baggage: "1 × 23kg", meals: "Dinner + snack",
        aircraft: "A330-300", wifi: "Paid", power: "Universal",
        legroom: '31"', co2: "655 kg", co2Note: "−5% vs. avg",
        tags: ["SkyTeam", "Late arrival"],
        why: "Solid SkyTeam routing through Amsterdam, but you land at dinner time — less of the day to find your feet.",
        pros: ["Schiphol is a great connection airport", "Predictable on-time"],
        cons: ["Pricier", "Late arrival eats day 1"],
        review: { score: 8.1, count: 5160 } },
      { id: "f4", rank: 4, fit: 51, carrier: "Turkish Airlines", code: "TK 4 / TK 1761", logoColor: "#c70a0c",
        depart: { time: "00:15", airport: "JFK", city: "New York", date: "Jul 5" },
        arrive: { time: "20:25", airport: "KRK", city: "Kraków", date: "Jul 5", dayShift: "" },
        duration: "14h 10m", stops: "1 stop", via: "IST · 2h 30m", cabin: "Economy",
        price: 522, baggage: "2 × 23kg", meals: "Two full meals",
        aircraft: "777 + 737", wifi: true, power: "Universal",
        legroom: '32"', co2: "748 kg", co2Note: "+8% vs. avg",
        tags: ["Cheapest", "Same-day arrival"],
        why: "Cheapest option and you arrive same-day, but it's a 14h day with a hard pivot east through Istanbul.",
        pros: ["$90 savings vs. top pick", "Famous catering"],
        cons: ["Eastward routing adds CO₂", "Tight midnight departure"],
        review: { score: 8.6, count: 12400 } },
    ],
  },
  japan: {
    legId: "l1",
    title: "San Francisco → Tokyo",
    subtitle: "Outbound · Mar 28, 2026",
    options: [
      { id: "f1", rank: 1, fit: 95, recommended: true, carrier: "ANA", code: "NH 8", logoColor: "#13448f",
        depart: { time: "11:05", airport: "SFO", city: "San Francisco", date: "Mar 28" },
        arrive: { time: "15:30", airport: "HND", city: "Tokyo", date: "Mar 29", dayShift: "+1" },
        duration: "11h 25m", stops: "Direct", via: "—", cabin: "Economy",
        price: 824, baggage: "2 × 23kg", meals: "Two full meals + snacks",
        aircraft: "Boeing 777-300ER", wifi: true, power: "Universal",
        legroom: '34"', co2: "892 kg", co2Note: "−18% vs. avg",
        tags: ["Direct", "Lands at HND", "5★ service"],
        why: "Direct to Haneda — closer to the city than Narita by about 90 minutes. Daytime departure, lands mid-afternoon, you're in Shibuya before dinner.",
        pros: ["No connection", "HND saves 90 min vs NRT", "ANA consistently top-rated"],
        cons: ["Pricier than 1-stops"],
        review: { score: 9.1, count: 14280 } },
      { id: "f2", rank: 2, fit: 81, carrier: "JAL", code: "JL 1", logoColor: "#cc0033",
        depart: { time: "13:00", airport: "SFO", city: "San Francisco", date: "Mar 28" },
        arrive: { time: "16:50", airport: "NRT", city: "Tokyo", date: "Mar 29", dayShift: "+1" },
        duration: "11h 50m", stops: "Direct", via: "—", cabin: "Economy",
        price: 786, baggage: "2 × 23kg", meals: "Two full meals",
        aircraft: "Boeing 787-9", wifi: true, power: "Universal",
        legroom: '33"', co2: "901 kg", co2Note: "−16% vs. avg",
        tags: ["Direct", "Slightly cheaper"],
        why: "JAL is excellent and saves $38, but lands at Narita — that's an extra hour by N'EX into central Tokyo.",
        pros: ["$38 cheaper", "787 quieter"],
        cons: ["NRT vs HND", "Late arrival"],
        review: { score: 9.0, count: 9840 } },
      { id: "f3", rank: 3, fit: 63, carrier: "United", code: "UA 837", logoColor: "#005daa",
        depart: { time: "11:45", airport: "SFO", city: "San Francisco", date: "Mar 28" },
        arrive: { time: "15:25", airport: "NRT", city: "Tokyo", date: "Mar 29", dayShift: "+1" },
        duration: "11h 40m", stops: "Direct", via: "—", cabin: "Economy",
        price: 698, baggage: "1 × 23kg", meals: "Dinner",
        aircraft: "Boeing 777-300ER", wifi: "Paid", power: "Universal",
        legroom: '31"', co2: "925 kg", co2Note: "−14% vs. avg",
        tags: ["Cheapest direct", "Star Alliance"],
        why: "Real savings here — $126 less and same-day. The catch is tighter legroom and a more basic service rhythm.",
        pros: ["$126 cheaper", "Star Alliance miles"],
        cons: ["Tighter pitch", "Paid wifi", "NRT"],
        review: { score: 7.6, count: 18620 } },
      { id: "f4", rank: 4, fit: 48, carrier: "Korean Air", code: "KE 24 / KE 705", logoColor: "#5a8ec5",
        depart: { time: "12:50", airport: "SFO", city: "San Francisco", date: "Mar 28" },
        arrive: { time: "21:10", airport: "HND", city: "Tokyo", date: "Mar 29", dayShift: "+1" },
        duration: "17h 20m", stops: "1 stop", via: "ICN · 2h 30m", cabin: "Economy",
        price: 642, baggage: "2 × 23kg", meals: "Two meals + bibimbap",
        aircraft: "A380 + 737", wifi: true, power: "Universal",
        legroom: '34"', co2: "1140 kg", co2Note: "+12% vs. avg",
        tags: ["Cheapest", "A380 leg"],
        why: "Cheapest by $182, but the routing through Seoul adds 6 hours and you land at 9pm.",
        pros: ["Significant savings", "A380 main leg"],
        cons: ["Late arrival", "Backtracking", "Higher CO₂"],
        review: { score: 8.5, count: 7320 } },
    ],
  },
  patagonia: {
    legId: "l1",
    title: "Los Angeles → Santiago",
    subtitle: "Outbound · Mar 1, 2026",
    options: [
      { id: "f1", rank: 1, fit: 90, recommended: true, carrier: "LATAM", code: "LA 601", logoColor: "#e0094a",
        depart: { time: "23:15", airport: "LAX", city: "Los Angeles", date: "Mar 1" },
        arrive: { time: "12:40", airport: "SCL", city: "Santiago", date: "Mar 2", dayShift: "+1" },
        duration: "12h 25m", stops: "Direct", via: "—", cabin: "Economy",
        price: 712, baggage: "2 × 23kg", meals: "Dinner + breakfast",
        aircraft: "787-9", wifi: "Paid", power: "Universal",
        legroom: '32"', co2: "978 kg", co2Note: "−8% vs. avg",
        tags: ["Direct", "Overnight", "Best schedule"],
        why: "Overnight direct lands at lunch — perfect to drop bags in Lastarria and walk Cerro Santa Lucía in afternoon light.",
        pros: ["No connection", "Sleep through most of it", "OneWorld"],
        cons: ["Late departure"],
        review: { score: 8.5, count: 6240 } },
      { id: "f2", rank: 2, fit: 75, carrier: "American", code: "AA 945", logoColor: "#0078d2",
        depart: { time: "22:40", airport: "LAX", city: "Los Angeles", date: "Mar 1" },
        arrive: { time: "14:35", airport: "SCL", city: "Santiago", date: "Mar 2", dayShift: "+1" },
        duration: "14h 55m", stops: "1 stop", via: "DFW · 1h 50m", cabin: "Economy",
        price: 656, baggage: "1 × 23kg", meals: "Dinner",
        aircraft: "737 + 787", wifi: true, power: "Universal",
        legroom: '31"', co2: "1085 kg", co2Note: "+2% vs. avg",
        tags: ["Cheapest with bag"],
        why: "$56 cheaper but you backtrack through Dallas, which adds two hours.",
        pros: ["Savings", "Reliable carrier"],
        cons: ["Backtracking", "Only 1 bag"],
        review: { score: 7.8, count: 11280 } },
      { id: "f3", rank: 3, fit: 58, carrier: "Avianca", code: "AV 246 / AV 247", logoColor: "#d4002a",
        depart: { time: "00:05", airport: "LAX", city: "Los Angeles", date: "Mar 1" },
        arrive: { time: "15:50", airport: "SCL", city: "Santiago", date: "Mar 1", dayShift: "" },
        duration: "12h 45m", stops: "1 stop", via: "BOG · 2h 10m", cabin: "Economy",
        price: 588, baggage: "1 × 23kg", meals: "Two snacks",
        aircraft: "A320neo", wifi: false, power: "USB",
        legroom: '30"', co2: "1042 kg", co2Note: "−2% vs. avg",
        tags: ["Cheapest", "Same-day"],
        why: "Cheapest, but it's two A320 segments — tighter, no wifi, and you arrive late afternoon already a bit worn.",
        pros: ["$124 savings"],
        cons: ["No wifi", "Two narrowbody legs"],
        review: { score: 7.4, count: 4180 } },
    ],
  },
};

// --- Stay options ---

export type StayOption = {
  id: string;
  rank: number;
  fit: number;
  recommended?: boolean;
  name: string;
  type: string;
  price: number;
  currency: string;
  priceUnit: string;
  total: number;
  rating: number;
  reviews: number;
  neighborhood: string;
  walk: string;
  amenities: string[];
  beds: string;
  view: string;
  tags: string[];
  why: string;
  pros: string[];
  cons: string[];
  photos: string[];
};

export const STAY_OPTIONS: Record<TripId, StageData<StayOption>> = {
  europe: {
    cityCode: "KRK",
    title: "Stay · Kraków",
    subtitle: "5 nights · Jul 5–10",
    options: [
      { id: "s1", rank: 1, fit: 94, recommended: true, name: "Hotel Indigo Old Town", type: "Boutique · Stare Miasto",
        price: 142, currency: "$", priceUnit: "/night", total: 710, rating: 4.6, reviews: 842,
        neighborhood: "Old Town", walk: "4 min to Rynek Główny",
        amenities: ["Free wifi", "Breakfast incl.", "Bar", "Bike rental", "Pet friendly"],
        beds: "King · 26m²", view: "Courtyard or street",
        tags: ["Quiet street", "Walkable everywhere", "Solo-friendly"],
        why: "Tucked on Św. Tomasza, one block off the main square — central but quiet at night. Single rooms have proper desks, helpful since you mentioned a half-day of work mid-trip.",
        pros: ["Fantastic location", "Quiet despite Old Town", "Great breakfast spread"],
        cons: ["Rooms run small", "No spa"], photos: ["warm", "cool", "sun"] },
      { id: "s2", rank: 2, fit: 86, name: "PURO Kazimierz", type: "Design · Kazimierz",
        price: 118, currency: "$", priceUnit: "/night", total: 590, rating: 4.7, reviews: 1320,
        neighborhood: "Kazimierz", walk: "14 min to Rynek",
        amenities: ["Free wifi", "Bar", "Gym", "Pet friendly"],
        beds: "Queen · 22m²", view: "Plac Nowy",
        tags: ["Hipster scene", "Best breakfast", "$120 cheaper"],
        why: "If you'd rather be in the cafe-and-bar district than the postcard square, Kazimierz is it. The hotel is fresh, friendly, and $120 less over the stay.",
        pros: ["Cooler neighborhood", "Significantly cheaper", "Excellent food scene around it"],
        cons: ["15-min walk to Old Town", "Friday/Saturday a bit lively"], photos: ["warm", "sun", "cool"] },
      { id: "s3", rank: 3, fit: 73, name: "Hotel Stary", type: "Luxury · Old Town",
        price: 268, currency: "$", priceUnit: "/night", total: 1340, rating: 4.9, reviews: 612,
        neighborhood: "Old Town", walk: "2 min to Rynek",
        amenities: ["Spa", "Pool", "Fine dining", "Breakfast incl."],
        beds: "King · 38m²", view: "Square or rooftops",
        tags: ["Splurge", "Spa", "Closest to square"],
        why: "Stunning 15th-century building 2 minutes from the square, with an underground pool. It's a real splurge — $630 over the stay vs. Indigo.",
        pros: ["Spectacular property", "Spa & pool", "Top-floor views"],
        cons: ["Doubles your hotel budget", "Solo travelers can feel adrift in such grand spaces"],
        photos: ["sun", "warm", "cool"] },
      { id: "s4", rank: 4, fit: 64, name: "Wesoła Apartments", type: "Apartment · Wesoła",
        price: 96, currency: "$", priceUnit: "/night", total: 480, rating: 4.5, reviews: 218,
        neighborhood: "Wesoła", walk: "12 min to Rynek",
        amenities: ["Kitchen", "Washer", "Free wifi"],
        beds: "Studio · 32m²", view: "Quiet street",
        tags: ["Cheapest", "Kitchen", "Apartment feel"],
        why: "Self-contained apartment with a kitchen. Cheapest option — but you lose breakfast and on-site help.",
        pros: ["Cheap", "Kitchen for laundry/coffee"],
        cons: ["Self check-in", "No daily housekeeping"], photos: ["cool", "warm", "sun"] },
    ],
  },
  japan: {
    cityCode: "HND",
    title: "Stay · Tokyo",
    subtitle: "5 nights · Mar 28 – Apr 2",
    options: [
      { id: "s1", rank: 1, fit: 95, recommended: true, name: "Trunk Hotel Yoyogi", type: "Design · Shibuya",
        price: 286, currency: "$", priceUnit: "/night", total: 1430, rating: 4.8, reviews: 1240,
        neighborhood: "Yoyogi-Kōen", walk: "6 min to park",
        amenities: ["Free wifi", "Lounge bar", "Breakfast option", "Pet friendly"],
        beds: "Queen · 24m²", view: "Park or city",
        tags: ["Sakura park access", "Design", "Walkable Shibuya"],
        why: "Yoyogi park is one of Tokyo's best sakura spots and the lobby bar is a daily-life upgrade — perfect for a solo traveler.",
        pros: ["Park literally next door", "Lively lobby for solo dining", "Walk to Shibuya & Harajuku"],
        cons: ["Small rooms (Tokyo standard)"], photos: ["warm", "cool", "sun"] },
      { id: "s2", rank: 2, fit: 84, name: "Aman Tokyo", type: "Luxury · Otemachi",
        price: 1280, currency: "$", priceUnit: "/night", total: 6400, rating: 4.9, reviews: 380,
        neighborhood: "Otemachi", walk: "8 min to Imperial Palace",
        amenities: ["Spa", "Pool", "5★ dining", "Lounge"],
        beds: "King · 71m²", view: "Skyline 33rd floor",
        tags: ["Bucket-list", "Spa", "Imperial views"],
        why: "If the answer to 'what would make this trip' is one extraordinary stay, this is it. Wildly over budget though.",
        pros: ["One of Tokyo's top hotels", "Pool with a view", "Anchors the trip"],
        cons: ["Massively over budget", "Otemachi quiet at night"], photos: ["sun", "cool", "warm"] },
      { id: "s3", rank: 3, fit: 78, name: "Hoshinoya Tokyo", type: "Ryokan · Otemachi",
        price: 612, currency: "$", priceUnit: "/night", total: 3060, rating: 4.9, reviews: 510,
        neighborhood: "Otemachi", walk: "6 min to Tokyo St.",
        amenities: ["Onsen", "Tea ceremony", "Free wifi", "Tatami rooms"],
        beds: "Futon · 40m²", view: "Tokyo skyline",
        tags: ["Onsen in Tokyo", "Cultural"],
        why: "A ryokan in central Tokyo with a real onsen on top. A different rhythm than Trunk, more meditative.",
        pros: ["Authentic ryokan in heart of city", "Onsen experience"],
        cons: ["$1600 over budget", "Otemachi is business district"], photos: ["cool", "warm", "sun"] },
      { id: "s4", rank: 4, fit: 71, name: "Park Hyatt Tokyo", type: "5★ · Shinjuku",
        price: 642, currency: "$", priceUnit: "/night", total: 3210, rating: 4.7, reviews: 2840,
        neighborhood: "Nishi-Shinjuku", walk: "Tochōmae",
        amenities: ["Pool", "Spa", "Lost in Translation bar"],
        beds: "King · 45m²", view: "52nd floor city",
        tags: ["Iconic", "Skyline view", "New York Bar"],
        why: "The hotel from Lost in Translation. Iconic but a 12-minute walk to anything practical, and ~$350 more per night than Trunk.",
        pros: ["Iconic property", "52nd-floor pool"],
        cons: ["Awkward Shinjuku location", "Pricey"], photos: ["sun", "cool", "warm"] },
    ],
  },
  patagonia: {
    cityCode: "PNT",
    title: "Stay · Puerto Natales",
    subtitle: "5 nights · Mar 4 – Mar 9",
    options: [
      { id: "s1", rank: 1, fit: 93, recommended: true, name: "The Singular Patagonia", type: "Lodge w/ excursions",
        price: 612, currency: "$", priceUnit: "/night", total: 3060, rating: 4.9, reviews: 480,
        neighborhood: "Puerto Bories", walk: "5 km from town",
        amenities: ["Excursions incl.", "Spa", "Restaurant", "Heated pool"],
        beds: "Queen · 38m²", view: "Last Hope Sound",
        tags: ["All-incl. excursions", "Trail-side", "Solo-friendly"],
        why: "Excursions are included and led by guides who know the park's microclimates. As a solo traveler, this means real plans every morning.",
        pros: ["Excursions take the planning off your plate", "Stunning fjord setting", "Communal dining"],
        cons: ["Far from town", "Splurge"], photos: ["cool", "warm", "sun"] },
      { id: "s2", rank: 2, fit: 82, name: "Remota Patagonia", type: "Architectural lodge",
        price: 480, currency: "$", priceUnit: "/night", total: 2400, rating: 4.7, reviews: 320,
        neighborhood: "2km from town", walk: "20 min walk",
        amenities: ["Restaurant", "Excursions", "Spa"],
        beds: "King · 36m²", view: "Sound or steppe",
        tags: ["Architecture-lover", "Lower price"],
        why: "Striking modernist building, similar excursion model, $660 less. Slightly less polished service.",
        pros: ["Visually stunning property", "$660 cheaper"],
        cons: ["Service less consistent"], photos: ["cool", "sun", "warm"] },
      { id: "s3", rank: 3, fit: 70, name: "Vendaval Hotel", type: "Boutique · in town",
        price: 168, currency: "$", priceUnit: "/night", total: 840, rating: 4.6, reviews: 540,
        neighborhood: "Town center", walk: "Walk to restaurants",
        amenities: ["Free wifi", "Breakfast", "Bar"],
        beds: "Queen · 22m²", view: "Sound",
        tags: ["Walkable", "Local feel", "Cheapest of three"],
        why: "Right in town — you'd walk to dinner, organize your own day-tours. Independent and much cheaper.",
        pros: ["Town life", "Big savings"],
        cons: ['You arrange excursions', 'Less of a "lodge" feel'], photos: ["warm", "sun", "cool"] },
    ],
  },
};

// --- Activity options ---

export type ActivityOption = {
  id: string;
  rank: number;
  fit: number;
  recommended?: boolean;
  name: string;
  type: string;
  price: number;
  currency: string;
  priceUnit: string;
  duration: string;
  rating: number;
  reviews: number;
  when: string;
  tags: string[];
  why: string;
  pros: string[];
  cons: string[];
  photos: string[];
};

export const ACTIVITY_OPTIONS: Record<TripId, StageData<ActivityOption>> = {
  europe: {
    cityCode: "KRK",
    title: "Activities · Kraków",
    subtitle: "5 days to fill · curated mix",
    options: [
      { id: "a1", rank: 1, fit: 96, recommended: true, name: "Auschwitz–Birkenau · guided", type: "Memorial · ½-day",
        price: 78, currency: "$", priceUnit: "/person", duration: "7 hours",
        rating: 4.9, reviews: 8420, when: "Mornings · book ahead",
        tags: ["Essential", "Emotionally heavy", "Pickup incl."],
        why: "Non-negotiable for most first visits. Book a guided tour with hotel pickup — logistics dissolve and you arrive with context.",
        pros: ["Hotel pickup", "Excellent guides", "Skip-the-line"],
        cons: ["Heavy day; pair with a light evening"], photos: ["warm"] },
      { id: "a2", rank: 2, fit: 92, recommended: true, name: "Wieliczka Salt Mine", type: "UNESCO · ½-day",
        price: 52, currency: "$", priceUnit: "/person", duration: "4 hours",
        rating: 4.7, reviews: 6240, when: "Any morning",
        tags: ["Unusual", "Family-safe", "Underground"],
        why: "Underground cathedral carved from salt. Strange and beautiful — pairs well with a relaxed afternoon.",
        pros: ["One of a kind", "Reliable timing"],
        cons: ["Lots of stairs", "Crowded peak hours"], photos: ["cool"] },
      { id: "a3", rank: 3, fit: 88, name: "Kazimierz Food Walk", type: "Food + culture · evening",
        price: 64, currency: "$", priceUnit: "/person", duration: "3.5 hours",
        rating: 4.9, reviews: 1840, when: "Evenings · 6 pm",
        tags: ["Solo-friendly", "Local guide", "Eat your dinner"],
        why: "Five stops with a local — zapiekanka, pierogi, vodka tasting. Effectively becomes dinner. Solo travelers love these.",
        pros: ["Counts as dinner", "Meet other travelers", "Great guides"],
        cons: ["Shared experience may not suit a quiet night"], photos: ["sun"] },
      { id: "a4", rank: 4, fit: 80, name: "Wawel Castle + Cathedral", type: "Self-guided · 2-3h",
        price: 18, currency: "$", priceUnit: "/person", duration: "2-3 hours",
        rating: 4.6, reviews: 12400, when: "Anytime",
        tags: ["Iconic", "Cheap", "Walk to it"],
        why: "Hilltop castle complex. Skip the guided audio if you'd rather wander.",
        pros: ["Cheap", "Can do in any weather window", "Beautiful views over Vistula"],
        cons: ["Crowded mid-day"], photos: ["warm"] },
      { id: "a5", rank: 5, fit: 72, name: "Tatra Day-Trip · Zakopane", type: "Day trip · mountains",
        price: 110, currency: "$", priceUnit: "/person", duration: "12 hours",
        rating: 4.5, reviews: 980, when: "Weather-dependent",
        tags: ["Long day", "Mountains", "Outside city"],
        why: "Big mountain day. Long drive both ways — only worth it if you have great weather and can spare a full day.",
        pros: ["Real Carpathian air", "Good hike options"],
        cons: ["Long bus rides", "Touristy lower town"], photos: ["cool"] },
    ],
  },
  japan: {
    cityCode: "HND",
    title: "Activities · Tokyo",
    subtitle: "5 days during sakura peak",
    options: [
      { id: "a1", rank: 1, fit: 97, recommended: true, name: "Sakura sunrise · Meguro River", type: "Walk · 1h",
        price: 0, currency: "$", priceUnit: "free", duration: "1-2 hours",
        rating: 4.9, reviews: 2400, when: "Sunrise · 5:30 am",
        tags: ["Free", "Sakura", "Crowd-free"],
        why: "Meguro is the iconic cherry-tunnel walk. Sunrise has it nearly empty for an hour.",
        pros: ["Free", "Magical at golden hour", "Beat jet lag day 2"],
        cons: ["Early", "5 days of sakura is a narrow window"], photos: ["warm"] },
      { id: "a2", rank: 2, fit: 94, recommended: true, name: "TeamLab Planets", type: "Immersive art · 2h",
        price: 32, currency: "$", priceUnit: "/person", duration: "2 hours",
        rating: 4.8, reviews: 14200, when: "Book time slot",
        tags: ["Solo-photo-friendly", "Sensory", "Toyosu"],
        why: "Walk-through immersive installations — solo-photographer paradise. Book the slot in advance.",
        pros: ["Easy to do alone", "Otherworldly photos", "Indoor option for any weather"],
        cons: ["Crowded weekends", "Wet floors — wear easy clothes"], photos: ["sun"] },
      { id: "a3", rank: 3, fit: 90, name: "Tsukiji Outer Market · early", type: "Food · 2-3h",
        price: 45, currency: "$", priceUnit: "~spent", duration: "2-3 hours",
        rating: 4.7, reviews: 9820, when: "Mornings · before 9",
        tags: ["Food", "Solo-easy", "Walk"],
        why: "Outer market is where the food actually is. Solo standing-bar tamago and tuna at 8am beats any guide.",
        pros: ["Self-paced", "Genuinely good food", "Free to wander"],
        cons: ["Early", "Some places cash-only"], photos: ["warm"] },
      { id: "a4", rank: 4, fit: 86, name: "Nezu Museum + garden", type: "Museum · ½-day",
        price: 14, currency: "$", priceUnit: "/person", duration: "2-3 hours",
        rating: 4.7, reviews: 3640, when: "Closed Mon",
        tags: ["Quiet", "Garden", "Aoyama"],
        why: "Excellent Asian art collection in Aoyama, but the real prize is the hidden garden behind it.",
        pros: ["Lovely garden", "Walk to Omotesando after"],
        cons: ["Closed Mondays"], photos: ["cool"] },
    ],
  },
  patagonia: {
    cityCode: "PNT",
    title: "Activities · Torres del Paine",
    subtitle: "5 days · trail-focused",
    options: [
      { id: "a1", rank: 1, fit: 98, recommended: true, name: "Base Torres day hike", type: "Hike · full day",
        price: 0, currency: "$", priceUnit: "park fee", duration: "8-10 hours",
        rating: 4.9, reviews: 5840, when: "Clear weather day",
        tags: ["Iconic", "Strenuous", "Photographer's grail"],
        why: "The trail Patagonia is named for. 19km, 1100m gain, the towers reveal themselves only at the top. Pick your best weather day.",
        pros: ["One of the great day hikes anywhere", "Doable from a base"],
        cons: ["Hard on the body", "Weather-dependent"], photos: ["cool"] },
      { id: "a2", rank: 2, fit: 92, recommended: true, name: "Grey Glacier kayak", type: "Kayak · ½-day",
        price: 195, currency: "$", priceUnit: "/person", duration: "5 hours",
        rating: 4.8, reviews: 1240, when: "Mornings",
        tags: ["Among icebergs", "Guided", "Wet"],
        why: "Paddle through icebergs at the glacier's terminus. Surreal in a way photos don't capture.",
        pros: ["Once-in-a-lifetime", "All gear provided"],
        cons: ["Cold, wet", "Pricier"], photos: ["cool"] },
      { id: "a3", rank: 3, fit: 84, name: "French Valley out-and-back", type: "Hike · long day",
        price: 0, currency: "$", priceUnit: "park fee", duration: "9-11 hours",
        rating: 4.8, reviews: 2860, when: "Stable weather",
        tags: ["Heart of W", "Long", "Less crowded"],
        why: "The middle of the W-circuit, condensed into a long day from the catamaran landing. Less crowded than Base Torres.",
        pros: ["Less crowded", "Diverse scenery"],
        cons: ["Long", "Catamaran logistics"], photos: ["cool"] },
    ],
  },
};

// --- Food options ---

export type FoodOption = {
  id: string;
  rank: number;
  fit: number;
  recommended?: boolean;
  name: string;
  type: string;
  price: string;
  dishPrice: number;
  rating: number;
  reviews: number;
  neighborhood: string;
  walk: string;
  when: string;
  cuisine: string;
  tags: string[];
  why: string;
  pros: string[];
  cons: string[];
};

export const FOOD_OPTIONS: Record<TripId, StageData<FoodOption>> = {
  europe: {
    cityCode: "KRK",
    title: "Food · Kraków",
    subtitle: "5 evenings to fill",
    options: [
      { id: "r1", rank: 1, fit: 95, recommended: true, name: "Pod Aniołami", type: "Old Polish · cellar",
        price: "$$", dishPrice: 28, rating: 4.7, reviews: 1860,
        neighborhood: "Old Town", walk: "3 min from hotel",
        when: "Dinner · book ahead", cuisine: "Polish (heritage)",
        tags: ["Atmosphere", "Solo bar seats", "Local"],
        why: "Vaulted brick cellar from a 13th-century cloth-merchant's house. Pierogi by the half-portion at the bar — solo-friendly.",
        pros: ["Beautiful room", "Bar serves full menu", "Sharing portions"],
        cons: ["Touristy at 8pm prime", "Heavy food"] },
      { id: "r2", rank: 2, fit: 89, recommended: true, name: "Bottiglieria 1881", type: "Modern Polish · Michelin",
        price: "$$$$", dishPrice: 142, rating: 4.9, reviews: 540,
        neighborhood: "Kazimierz", walk: "15 min",
        when: "Dinner · 6 wks ahead", cuisine: "New Polish · tasting",
        tags: ["Michelin ★", "Tasting menu", "Splurge"],
        why: "Two Michelin stars in a bottle-cellar room. The most ambitious meal in town — book the moment your dates lock.",
        pros: ["World-class kitchen", "Wine pairings extraordinary"],
        cons: ["Most expensive evening", "Need 6+ weeks notice"] },
      { id: "r3", rank: 3, fit: 85, name: "Hamsa", type: "Israeli · Kazimierz",
        price: "$$", dishPrice: 22, rating: 4.7, reviews: 4280,
        neighborhood: "Kazimierz", walk: "15 min",
        when: "Dinner · walk-in OK", cuisine: "Israeli / Levantine",
        tags: ["Lively", "Vegetarian-strong", "Solo bar"],
        why: "Loud, fun, hummus-and-pita kind of place on Plac Nowy. Mid-week walk-ins usually fine.",
        pros: ["No reservations needed", "Strong veg menu"],
        cons: ["Loud at peak"] },
      { id: "r4", rank: 4, fit: 78, name: "Plac Nowy zapiekanka", type: "Street · Okrąglak",
        price: "$", dishPrice: 5, rating: 4.5, reviews: 9620,
        neighborhood: "Kazimierz", walk: "14 min",
        when: "Lunch or late", cuisine: "Street",
        tags: ["Cheap", "Late-night", "Iconic"],
        why: "Open-faced baguette with mushrooms and cheese, $5, eaten standing up at the round market hall. Iconic Kazimierz move.",
        pros: ["Cheap", "Open late", "Local"],
        cons: ["Standing only"] },
      { id: "r5", rank: 5, fit: 72, name: "Café Camelot", type: "Café · breakfast",
        price: "$$", dishPrice: 14, rating: 4.6, reviews: 2140,
        neighborhood: "Old Town", walk: "6 min",
        when: "Mornings", cuisine: "Café",
        tags: ["Slow morning", "Folk-art interior"],
        why: "A storybook café for a slow morning before a heavy sightseeing day.",
        pros: ["Charming interior", "Strong coffee"],
        cons: ["Limited savory options"] },
    ],
  },
  japan: {
    cityCode: "HND",
    title: "Food · Tokyo",
    subtitle: "Sushi, sake, soba — solo-friendly",
    options: [
      { id: "r1", rank: 1, fit: 96, recommended: true, name: "Sushi Ichi", type: "Sushi counter · Ginza",
        price: "$$$$", dishPrice: 180, rating: 4.9, reviews: 320,
        neighborhood: "Ginza", walk: "Ginza station",
        when: "Lunch counter · easier", cuisine: "Edo-mae sushi",
        tags: ["Solo counter", "Lunch deal", "High-end"],
        why: "Lunch counter is far more solo-friendly than dinner. Same fish, half the bill.",
        pros: ["Counter conversation", "Lunch makes it accessible"],
        cons: ["Still a splurge"] },
      { id: "r2", rank: 2, fit: 91, recommended: true, name: "Tonkatsu Maisen", type: "Tonkatsu · Aoyama",
        price: "$$", dishPrice: 22, rating: 4.7, reviews: 6240,
        neighborhood: "Aoyama", walk: "Omotesandō station",
        when: "Lunch", cuisine: "Tonkatsu",
        tags: ["Iconic", "Solo-easy", "Mid-range"],
        why: "The tonkatsu temple in a converted bathhouse. Solo seats at the bar are normal.",
        pros: ["Famously consistent", "Easy lunch solo"],
        cons: ["Lines at peak"] },
      { id: "r3", rank: 3, fit: 88, name: "Omoide Yokochō yakitori", type: "Yakitori alley · Shinjuku",
        price: "$", dishPrice: 18, rating: 4.6, reviews: 12400,
        neighborhood: "Shinjuku", walk: "West side",
        when: "Evenings", cuisine: "Yakitori",
        tags: ["Atmosphere", "Cheap", "Smoky"],
        why: "Tiny yakitori alleys behind Shinjuku station. Pick a place, sit down, eat skewers.",
        pros: ["Atmosphere", "Cheap", "Solo OK"],
        cons: ["Smoky", "Some places tourist-priced"] },
      { id: "r4", rank: 4, fit: 82, name: "Den", type: "Modern Japanese · Jingumae",
        price: "$$$$", dishPrice: 240, rating: 4.9, reviews: 280,
        neighborhood: "Jingumae", walk: "8 min from Trunk",
        when: "Dinner · book months ahead", cuisine: "Modern kaiseki",
        tags: ["Asia's 50 Best", "Playful", "Splurge"],
        why: "World-renowned and just a walk from the hotel — but you need to book months ahead.",
        pros: ["World-class", "Walk to it"],
        cons: ["Book ahead", "Over budget"] },
    ],
  },
  patagonia: {
    cityCode: "PNT",
    title: "Food · Puerto Natales",
    subtitle: "Lodge dining + town nights",
    options: [
      { id: "r1", rank: 1, fit: 92, recommended: true, name: "Afrigonia", type: "Patagonian-African fusion",
        price: "$$$", dishPrice: 42, rating: 4.8, reviews: 1240,
        neighborhood: "Town", walk: "Walkable",
        when: "Dinner · book ahead", cuisine: "Fusion",
        tags: ["Unusual", "Solo bar seats"],
        why: "Improbable Patagonian-Zambian fusion that absolutely works. Bar seats are easy solo.",
        pros: ["Genuinely unique", "Solo bar OK"],
        cons: ["Books up"] },
      { id: "r2", rank: 2, fit: 87, name: "La Mesita Grande", type: "Wood-fired pizza",
        price: "$$", dishPrice: 18, rating: 4.7, reviews: 2640,
        neighborhood: "Town center", walk: "Walkable",
        when: "Dinner · walk-in", cuisine: "Italian",
        tags: ["Lively", "Casual", "Cheap"],
        why: "Big communal table, wood-fire pies after a long trek.",
        pros: ["No reservations", "Friendly staff"],
        cons: ["Loud", "Limited menu"] },
      { id: "r3", rank: 3, fit: 82, name: "Singular Dining Room", type: "Lodge fine dining",
        price: "$$$$", dishPrice: 120, rating: 4.9, reviews: 320,
        neighborhood: "Lodge", walk: "In hotel",
        when: "Dinner", cuisine: "New Patagonian",
        tags: ["Lodge-incl. option", "Splurge", "Tasting"],
        why: "If you stay at Singular, several dinners are included on the half-board plan.",
        pros: ["Walk to your room after", "Excellent kitchen"],
        cons: ["Trapped at the lodge"] },
    ],
  },
};
