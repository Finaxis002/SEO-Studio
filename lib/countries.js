// Complete World Countries Dataset with Flags, Slugs, and Calling Dial Codes (+91, +971, etc.)
// 0 network requests, 0ms load time, fast in-memory search by name, ISO code, or dial code.

export const COUNTRIES = [
  {
    code: "global",
    slug: "global",
    name: "Global",
    dial: "",
    flag: "🌐",
    keywords: ["all", "world", "international", "universal", "common", "global"],
  },
  // Primary Markets
  {
    code: "ae",
    slug: "uae",
    name: "United Arab Emirates",
    dial: "+971",
    flag: "ae",
    taxLabel: "VAT 5%",
    currency: "AED",
    keywords: ["uae", "dubai", "abu dhabi", "sharjah", "emirates", "971"],
    isPopular: true,
  },
  {
    code: "in",
    slug: "in",
    name: "India",
    dial: "+91",
    flag: "in",
    taxLabel: "GST 18%",
    currency: "INR",
    keywords: ["india", "bharat", "hindustan", "gst", "91"],
    isPopular: true,
  },
  {
    code: "sa",
    slug: "sa",
    name: "Saudi Arabia",
    dial: "+966",
    flag: "sa",
    taxLabel: "VAT 15%",
    currency: "SAR",
    keywords: ["saudi", "ksa", "riyadh", "jeddah", "zatca", "966"],
    isPopular: true,
  },
  {
    code: "us",
    slug: "us",
    name: "United States",
    dial: "+1",
    flag: "us",
    taxLabel: "Sales Tax",
    currency: "USD",
    keywords: ["usa", "america", "united states", "1"],
    isPopular: true,
  },
  {
    code: "gb",
    slug: "uk",
    name: "United Kingdom",
    dial: "+44",
    flag: "gb",
    taxLabel: "VAT 20%",
    currency: "GBP",
    keywords: ["uk", "britain", "england", "london", "44"],
    isPopular: true,
  },
  { code: "ca", slug: "ca", name: "Canada", dial: "+1", flag: "ca" },
  { code: "au", slug: "au", name: "Australia", dial: "+61", flag: "au" },
  { code: "sg", slug: "sg", name: "Singapore", dial: "+65", flag: "sg" },
  { code: "qa", slug: "qa", name: "Qatar", dial: "+974", flag: "qa" },
  { code: "kw", slug: "kw", name: "Kuwait", dial: "+965", flag: "kw" },
  { code: "om", slug: "om", name: "Oman", dial: "+968", flag: "om" },
  { code: "bh", slug: "bh", name: "Bahrain", dial: "+973", flag: "bh" },

  // All Other World Countries (A-Z)
  { code: "af", slug: "af", name: "Afghanistan", dial: "+93", flag: "af" },
  { code: "al", slug: "al", name: "Albania", dial: "+355", flag: "al" },
  { code: "dz", slug: "dz", name: "Algeria", dial: "+213", flag: "dz" },
  { code: "ad", slug: "ad", name: "Andorra", dial: "+376", flag: "ad" },
  { code: "ao", slug: "ao", name: "Angola", dial: "+244", flag: "ao" },
  { code: "ar", slug: "ar", name: "Argentina", dial: "+54", flag: "ar" },
  { code: "am", slug: "am", name: "Armenia", dial: "+374", flag: "am" },
  { code: "at", slug: "at", name: "Austria", dial: "+43", flag: "at" },
  { code: "az", slug: "az", name: "Azerbaijan", dial: "+994", flag: "az" },
  { code: "bs", slug: "bs", name: "Bahamas", dial: "+1242", flag: "bs" },
  { code: "bd", slug: "bd", name: "Bangladesh", dial: "+880", flag: "bd" },
  { code: "bb", slug: "bb", name: "Barbados", dial: "+1246", flag: "bb" },
  { code: "by", slug: "by", name: "Belarus", dial: "+375", flag: "by" },
  { code: "be", slug: "be", name: "Belgium", dial: "+32", flag: "be" },
  { code: "bz", slug: "bz", name: "Belize", dial: "+501", flag: "bz" },
  { code: "bj", slug: "bj", name: "Benin", dial: "+229", flag: "bj" },
  { code: "bt", slug: "bt", name: "Bhutan", dial: "+975", flag: "bt" },
  { code: "bo", slug: "bo", name: "Bolivia", dial: "+591", flag: "bo" },
  { code: "ba", slug: "ba", name: "Bosnia & Herzegovina", dial: "+387", flag: "ba" },
  { code: "bw", slug: "bw", name: "Botswana", dial: "+267", flag: "bw" },
  { code: "br", slug: "br", name: "Brazil", dial: "+55", flag: "br" },
  { code: "bn", slug: "bn", name: "Brunei", dial: "+673", flag: "bn" },
  { code: "bg", slug: "bg", name: "Bulgaria", dial: "+359", flag: "bg" },
  { code: "bf", slug: "bf", name: "Burkina Faso", dial: "+226", flag: "bf" },
  { code: "bi", slug: "bi", name: "Burundi", dial: "+257", flag: "bi" },
  { code: "kh", slug: "kh", name: "Cambodia", dial: "+855", flag: "kh" },
  { code: "cm", slug: "cm", name: "Cameroon", dial: "+237", flag: "cm" },
  { code: "cv", slug: "cv", name: "Cape Verde", dial: "+238", flag: "cv" },
  { code: "cf", slug: "cf", name: "Central African Rep.", dial: "+236", flag: "cf" },
  { code: "td", slug: "td", name: "Chad", dial: "+235", flag: "td" },
  { code: "cl", slug: "cl", name: "Chile", dial: "+56", flag: "cl" },
  { code: "cn", slug: "cn", name: "China", dial: "+86", flag: "cn" },
  { code: "co", slug: "co", name: "Colombia", dial: "+57", flag: "co" },
  { code: "km", slug: "km", name: "Comoros", dial: "+269", flag: "km" },
  { code: "cg", slug: "cg", name: "Congo (Republic)", dial: "+242", flag: "cg" },
  { code: "cd", slug: "cd", name: "Congo (DR)", dial: "+243", flag: "cd" },
  { code: "cr", slug: "cr", name: "Costa Rica", dial: "+506", flag: "cr" },
  { code: "hr", slug: "hr", name: "Croatia", dial: "+385", flag: "hr" },
  { code: "cu", slug: "cu", name: "Cuba", dial: "+53", flag: "cu" },
  { code: "cy", slug: "cy", name: "Cyprus", dial: "+357", flag: "cy" },
  { code: "cz", slug: "cz", name: "Czech Republic", dial: "+420", flag: "cz" },
  { code: "dk", slug: "dk", name: "Denmark", dial: "+45", flag: "dk" },
  { code: "dj", slug: "dj", name: "Djibouti", dial: "+253", flag: "dj" },
  { code: "do", slug: "do", name: "Dominican Republic", dial: "+1829", flag: "do" },
  { code: "ec", slug: "ec", name: "Ecuador", dial: "+593", flag: "ec" },
  { code: "eg", slug: "eg", name: "Egypt", dial: "+20", flag: "eg" },
  { code: "sv", slug: "sv", name: "El Salvador", dial: "+503", flag: "sv" },
  { code: "gq", slug: "gq", name: "Equatorial Guinea", dial: "+240", flag: "gq" },
  { code: "er", slug: "er", name: "Eritrea", dial: "+291", flag: "er" },
  { code: "ee", slug: "ee", name: "Estonia", dial: "+372", flag: "ee" },
  { code: "sz", slug: "sz", name: "Eswatini", dial: "+268", flag: "sz" },
  { code: "et", slug: "et", name: "Ethiopia", dial: "+251", flag: "et" },
  { code: "fj", slug: "fj", name: "Fiji", dial: "+679", flag: "fj" },
  { code: "fi", slug: "fi", name: "Finland", dial: "+358", flag: "fi" },
  { code: "fr", slug: "fr", name: "France", dial: "+33", flag: "fr" },
  { code: "ga", slug: "ga", name: "Gabon", dial: "+241", flag: "ga" },
  { code: "gm", slug: "gm", name: "Gambia", dial: "+220", flag: "gm" },
  { code: "ge", slug: "ge", name: "Georgia", dial: "+995", flag: "ge" },
  { code: "de", slug: "de", name: "Germany", dial: "+49", flag: "de" },
  { code: "gh", slug: "gh", name: "Ghana", dial: "+233", flag: "gh" },
  { code: "gr", slug: "gr", name: "Greece", dial: "+30", flag: "gr" },
  { code: "gt", slug: "gt", name: "Guatemala", dial: "+502", flag: "gt" },
  { code: "gn", slug: "gn", name: "Guinea", dial: "+224", flag: "gn" },
  { code: "gw", slug: "gw", name: "Guinea-Bissau", dial: "+245", flag: "gw" },
  { code: "gy", slug: "gy", name: "Guyana", dial: "+592", flag: "gy" },
  { code: "ht", slug: "ht", name: "Haiti", dial: "+509", flag: "ht" },
  { code: "hn", slug: "hn", name: "Honduras", dial: "+504", flag: "hn" },
  { code: "hk", slug: "hk", name: "Hong Kong", dial: "+852", flag: "hk" },
  { code: "hu", slug: "hu", name: "Hungary", dial: "+36", flag: "hu" },
  { code: "is", slug: "is", name: "Iceland", dial: "+354", flag: "is" },
  { code: "id", slug: "id", name: "Indonesia", dial: "+62", flag: "id" },
  { code: "ir", slug: "ir", name: "Iran", dial: "+98", flag: "ir" },
  { code: "iq", slug: "iq", name: "Iraq", dial: "+964", flag: "iq" },
  { code: "ie", slug: "ie", name: "Ireland", dial: "+353", flag: "ie" },
  { code: "il", slug: "il", name: "Israel", dial: "+972", flag: "il" },
  { code: "it", slug: "it", name: "Italy", dial: "+39", flag: "it" },
  { code: "ci", slug: "ci", name: "Ivory Coast", dial: "+225", flag: "ci" },
  { code: "jm", slug: "jm", name: "Jamaica", dial: "+1876", flag: "jm" },
  { code: "jp", slug: "jp", name: "Japan", dial: "+81", flag: "jp" },
  { code: "jo", slug: "jo", name: "Jordan", dial: "+962", flag: "jo" },
  { code: "kz", slug: "kz", name: "Kazakhstan", dial: "+7", flag: "kz" },
  { code: "ke", slug: "ke", name: "Kenya", dial: "+254", flag: "ke" },
  { code: "ki", slug: "ki", name: "Kiribati", dial: "+686", flag: "ki" },
  { code: "kp", slug: "kp", name: "Korea (North)", dial: "+850", flag: "kp" },
  { code: "kr", slug: "kr", name: "Korea (South)", dial: "+82", flag: "kr" },
  { code: "xk", slug: "xk", name: "Kosovo", dial: "+383", flag: "xk" },
  { code: "kg", slug: "kg", name: "Kyrgyzstan", dial: "+996", flag: "kg" },
  { code: "la", slug: "la", name: "Laos", dial: "+856", flag: "la" },
  { code: "lv", slug: "lv", name: "Latvia", dial: "+371", flag: "lv" },
  { code: "lb", slug: "lb", name: "Lebanon", dial: "+961", flag: "lb" },
  { code: "ls", slug: "ls", name: "Lesotho", dial: "+266", flag: "ls" },
  { code: "lr", slug: "lr", name: "Liberia", dial: "+231", flag: "lr" },
  { code: "ly", slug: "ly", name: "Libya", dial: "+218", flag: "ly" },
  { code: "li", slug: "li", name: "Liechtenstein", dial: "+423", flag: "li" },
  { code: "lt", slug: "lt", name: "Lithuania", dial: "+370", flag: "lt" },
  { code: "lu", slug: "lu", name: "Luxembourg", dial: "+352", flag: "lu" },
  { code: "mo", slug: "mo", name: "Macau", dial: "+853", flag: "mo" },
  { code: "mg", slug: "mg", name: "Madagascar", dial: "+261", flag: "mg" },
  { code: "mw", slug: "mw", name: "Malawi", dial: "+265", flag: "mw" },
  { code: "my", slug: "my", name: "Malaysia", dial: "+60", flag: "my" },
  { code: "mv", slug: "mv", name: "Maldives", dial: "+960", flag: "mv" },
  { code: "ml", slug: "ml", name: "Mali", dial: "+223", flag: "ml" },
  { code: "mt", slug: "mt", name: "Malta", dial: "+356", flag: "mt" },
  { code: "mh", slug: "mh", name: "Marshall Islands", dial: "+692", flag: "mh" },
  { code: "mr", slug: "mr", name: "Mauritania", dial: "+222", flag: "mr" },
  { code: "mu", slug: "mu", name: "Mauritius", dial: "+230", flag: "mu" },
  { code: "mx", slug: "mx", name: "Mexico", dial: "+52", flag: "mx" },
  { code: "fm", slug: "fm", name: "Micronesia", dial: "+691", flag: "fm" },
  { code: "md", slug: "md", name: "Moldova", dial: "+373", flag: "md" },
  { code: "mc", slug: "mc", name: "Monaco", dial: "+377", flag: "mc" },
  { code: "mn", slug: "mn", name: "Mongolia", dial: "+976", flag: "mn" },
  { code: "me", slug: "me", name: "Montenegro", dial: "+382", flag: "me" },
  { code: "ma", slug: "ma", name: "Morocco", dial: "+212", flag: "ma" },
  { code: "mz", slug: "mz", name: "Mozambique", dial: "+258", flag: "mz" },
  { code: "mm", slug: "mm", name: "Myanmar", dial: "+95", flag: "mm" },
  { code: "na", slug: "na", name: "Namibia", dial: "+264", flag: "na" },
  { code: "nr", slug: "nr", name: "Nauru", dial: "+674", flag: "nr" },
  { code: "np", slug: "np", name: "Nepal", dial: "+977", flag: "np" },
  { code: "nl", slug: "nl", name: "Netherlands", dial: "+31", flag: "nl" },
  { code: "nz", slug: "nz", name: "New Zealand", dial: "+64", flag: "nz" },
  { code: "ni", slug: "ni", name: "Nicaragua", dial: "+505", flag: "ni" },
  { code: "ne", slug: "ne", name: "Niger", dial: "+227", flag: "ne" },
  { code: "ng", slug: "ng", name: "Nigeria", dial: "+234", flag: "ng" },
  { code: "mk", slug: "mk", name: "North Macedonia", dial: "+389", flag: "mk" },
  { code: "no", slug: "no", name: "Norway", dial: "+47", flag: "no" },
  { code: "pk", slug: "pk", name: "Pakistan", dial: "+92", flag: "pk" },
  { code: "pw", slug: "pw", name: "Palau", dial: "+680", flag: "pw" },
  { code: "ps", slug: "ps", name: "Palestine", dial: "+970", flag: "ps" },
  { code: "pa", slug: "pa", name: "Panama", dial: "+507", flag: "pa" },
  { code: "pg", slug: "pg", name: "Papua New Guinea", dial: "+675", flag: "pg" },
  { code: "py", slug: "py", name: "Paraguay", dial: "+595", flag: "py" },
  { code: "pe", slug: "pe", name: "Peru", dial: "+51", flag: "pe" },
  { code: "ph", slug: "ph", name: "Philippines", dial: "+63", flag: "ph" },
  { code: "pl", slug: "pl", name: "Poland", dial: "+48", flag: "pl" },
  { code: "pt", slug: "pt", name: "Portugal", dial: "+351", flag: "pt" },
  { code: "ro", slug: "ro", name: "Romania", dial: "+40", flag: "ro" },
  { code: "ru", slug: "ru", name: "Russia", dial: "+7", flag: "ru" },
  { code: "rw", slug: "rw", name: "Rwanda", dial: "+250", flag: "rw" },
  { code: "sm", slug: "sm", name: "San Marino", dial: "+378", flag: "sm" },
  { code: "st", slug: "st", name: "São Tomé & Príncipe", dial: "+239", flag: "st" },
  { code: "sn", slug: "sn", name: "Senegal", dial: "+221", flag: "sn" },
  { code: "rs", slug: "rs", name: "Serbia", dial: "+381", flag: "rs" },
  { code: "sc", slug: "sc", name: "Seychelles", dial: "+248", flag: "sc" },
  { code: "sl", slug: "sl", name: "Sierra Leone", dial: "+232", flag: "sl" },
  { code: "sk", slug: "sk", name: "Slovakia", dial: "+421", flag: "sk" },
  { code: "si", slug: "si", name: "Slovenia", dial: "+386", flag: "si" },
  { code: "sb", slug: "sb", name: "Solomon Islands", dial: "+677", flag: "sb" },
  { code: "so", slug: "so", name: "Somalia", dial: "+252", flag: "so" },
  { code: "za", slug: "za", name: "South Africa", dial: "+27", flag: "za" },
  { code: "ss", slug: "ss", name: "South Sudan", dial: "+211", flag: "ss" },
  { code: "es", slug: "es", name: "Spain", dial: "+34", flag: "es" },
  { code: "lk", slug: "lk", name: "Sri Lanka", dial: "+94", flag: "lk" },
  { code: "sd", slug: "sd", name: "Sudan", dial: "+249", flag: "sd" },
  { code: "sr", slug: "sr", name: "Suriname", dial: "+597", flag: "sr" },
  { code: "se", slug: "se", name: "Sweden", dial: "+46", flag: "se" },
  { code: "ch", slug: "ch", name: "Switzerland", dial: "+41", flag: "ch" },
  { code: "sy", slug: "sy", name: "Syria", dial: "+963", flag: "sy" },
  { code: "tw", slug: "tw", name: "Taiwan", dial: "+886", flag: "tw" },
  { code: "tj", slug: "tj", name: "Tajikistan", dial: "+992", flag: "tj" },
  { code: "tz", slug: "tz", name: "Tanzania", dial: "+255", flag: "tz" },
  { code: "th", slug: "th", name: "Thailand", dial: "+66", flag: "th" },
  { code: "tl", slug: "tl", name: "Timor-Leste", dial: "+670", flag: "tl" },
  { code: "tg", slug: "tg", name: "Togo", dial: "+228", flag: "tg" },
  { code: "to", slug: "to", name: "Tonga", dial: "+676", flag: "to" },
  { code: "tt", slug: "tt", name: "Trinidad & Tobago", dial: "+1868", flag: "tt" },
  { code: "tn", slug: "tn", name: "Tunisia", dial: "+216", flag: "tn" },
  { code: "tr", slug: "tr", name: "Turkey", dial: "+90", flag: "tr" },
  { code: "tm", slug: "tm", name: "Turkmenistan", dial: "+993", flag: "tm" },
  { code: "tv", slug: "tv", name: "Tuvalu", dial: "+688", flag: "tv" },
  { code: "ug", slug: "ug", name: "Uganda", dial: "+256", flag: "ug" },
  { code: "ua", slug: "ua", name: "Ukraine", dial: "+380", flag: "ua" },
  { code: "uy", slug: "uy", name: "Uruguay", dial: "+598", flag: "uy" },
  { code: "uz", slug: "uz", name: "Uzbekistan", dial: "+998", flag: "uz" },
  { code: "vu", slug: "vu", name: "Vanuatu", dial: "+678", flag: "vu" },
  { code: "va", slug: "va", name: "Vatican City", dial: "+379", flag: "va" },
  { code: "ve", slug: "ve", name: "Venezuela", dial: "+58", flag: "ve" },
  { code: "vn", slug: "vn", name: "Vietnam", dial: "+84", flag: "vn" },
  { code: "ws", slug: "ws", name: "Samoa", dial: "+685", flag: "ws" },
  { code: "ye", slug: "ye", name: "Yemen", dial: "+967", flag: "ye" },
  { code: "zm", slug: "zm", name: "Zambia", dial: "+260", flag: "zm" },
  { code: "zw", slug: "zw", name: "Zimbabwe", dial: "+263", flag: "zw" },
];

// Helper: Find country by code, slug, or dial code
export function getCountry(codeOrSlug) {
  if (!codeOrSlug) return COUNTRIES[0]; // Global
  const lower = String(codeOrSlug).toLowerCase().trim();
  const cleanDial = lower.replace(/^\+/, "");
  return (
    COUNTRIES.find(
      (c) =>
        c.slug === lower ||
        c.code === lower ||
        c.name.toLowerCase() === lower ||
        (c.dial && (c.dial === lower || c.dial.replace(/^\+/, "") === cleanDial))
    ) || {
      code: lower,
      slug: lower,
      name: lower.toUpperCase(),
      dial: "",
      flag: "🌐",
    }
  );
}

// Pre-filtered popular markets for instant quick-picks in UI
export const POPULAR_COUNTRIES = COUNTRIES.filter((c) => c.isPopular || c.code === "global");

// Helper: Search countries in memory by name, ISO code, or dial code (e.g. "91", "+91", "IN", "India")
export function searchCountries(query = "") {
  const q = String(query).toLowerCase().trim();
  if (!q) return COUNTRIES;

  const cleanDigits = q.replace(/[^\d]/g, "");

  // 1. Exact matches (ISO code or exact dial code)
  const exactMatches = COUNTRIES.filter((c) => {
    if (c.code.toLowerCase() === q) return true;
    if (c.dial) {
      const dialDigits = c.dial.replace(/[^\d]/g, "");
      if (cleanDigits && dialDigits === cleanDigits) return true;
    }
    return false;
  });

  // 2. Starts with matches (name, ISO code, or dial prefix)
  const startsWith = COUNTRIES.filter((c) => {
    if (exactMatches.some((m) => m.code === c.code)) return false;
    if (c.name.toLowerCase().startsWith(q)) return true;
    if (c.code.toLowerCase().startsWith(q)) return true;
    if (c.dial && cleanDigits) {
      const dialDigits = c.dial.replace(/[^\d]/g, "");
      if (dialDigits.startsWith(cleanDigits)) return true;
    }
    return false;
  });

  // 3. Substring & keyword matches
  const others = COUNTRIES.filter((c) => {
    if (exactMatches.some((m) => m.code === c.code)) return false;
    if (startsWith.some((m) => m.code === c.code)) return false;
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.code.toLowerCase().includes(q)) return true;
    if (c.slug.toLowerCase().includes(q)) return true;
    if (c.keywords && c.keywords.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  });

  return [...exactMatches, ...startsWith, ...others];
}

// Helper: Get public preview URL given a slug, category and country
export function getLocalizedPublicUrl(type, countryCodeOrSlug, slug, categorySlug = "") {
  const c = getCountry(countryCodeOrSlug);
  const isGlobal = !c.slug || c.slug === "global";
  const baseUrl = process.env.NEXT_PUBLIC_VINIMAY_URL || "https://vinimay.sharda.co.in";

  if (type === "blog") {
    return isGlobal
      ? `${baseUrl}/blog/${slug}`
      : `${baseUrl}/${c.slug}/blog/${slug}`;
  }

  if (type === "kb") {
    const cat = categorySlug || "general";
    return isGlobal
      ? `${baseUrl}/knowledge-base/${cat}/${slug}`
      : `${baseUrl}/${c.slug}/knowledge-base/${cat}/${slug}`;
  }

  return isGlobal ? `${baseUrl}/` : `${baseUrl}/${c.slug}`;
}
