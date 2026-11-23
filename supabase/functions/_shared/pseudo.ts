/**
 * Pseudonymisation before any LLM request (ARCHITECTURE §9.4). Pure functions, unit-tested.
 * IBANs, card-like digit runs, phone numbers and e-mails are replaced by tags; person names
 * (the user's known people + a first-name list) by <PERSONNE_n>. Only counts are logged.
 */

/** First names (West/Central African and French). The generator's names are a subset. [assumed list, not 3,000] */
export const FIRST_NAMES = [
  "Awa",
  "Fatou",
  "Fatoumata",
  "Moussa",
  "Ibrahima",
  "Aminata",
  "Cheikh",
  "Mariama",
  "Ousmane",
  "Khady",
  "Mamadou",
  "Adjoua",
  "Kouassi",
  "Yao",
  "Akissi",
  "Koffi",
  "Kofi",
  "Aya",
  "Brou",
  "Nadia",
  "Jean",
  "Esther",
  "Paul",
  "Christelle",
  "Hervé",
  "Herve",
  "Sandrine",
  "Arnaud",
  "Mireille",
  "Samuel",
  "Rokhaya",
  "Bineta",
  "Seydou",
  "Abdoulaye",
  "Adama",
  "Aïcha",
  "Aicha",
  "Alassane",
  "Amadou",
  "Aminatou",
  "Assane",
  "Astou",
  "Boubacar",
  "Bintou",
  "Coumba",
  "Daouda",
  "Djeneba",
  "Fanta",
  "Habib",
  "Hawa",
  "Idrissa",
  "Issa",
  "Kadiatou",
  "Kadi",
  "Lamine",
  "Mame",
  "Maimouna",
  "Modou",
  "Moustapha",
  "Ndeye",
  "Oumar",
  "Oumou",
  "Rama",
  "Salif",
  "Saliou",
  "Sokhna",
  "Souleymane",
  "Tidiane",
  "Yacine",
  "Youssou",
  "Ama",
  "Abena",
  "Akosua",
  "Kwame",
  "Kwabena",
  "Kouadio",
  "Konan",
  "Affoué",
  "Amenan",
  "N'Guessan",
  "Ange",
  "Blaise",
  "Didier",
  "Emmanuel",
  "Fabrice",
  "Franck",
  "Guy",
  "Honoré",
  "Joseph",
  "Josiane",
  "Laurent",
  "Lucie",
  "Marcel",
  "Martine",
  "Michel",
  "Nicole",
  "Olivier",
  "Patrice",
  "Pierre",
  "Rachel",
  "Rose",
  "Serge",
  "Simone",
  "Thierry",
  "Valérie",
  "Victor",
  "Yves",
  "Alice",
  "Anne",
  "Camille",
  "Claire",
  "Julie",
  "Marie",
  "Sophie",
  "Thomas",
  "Nicolas",
  "Julien",
  "Antoine",
  "Chantal",
  "Béatrice",
  "Brigitte",
  "Célestin",
  "Clarisse",
  "Edwige",
  "Eugène",
  "Félicité",
  "Gaston",
  "Grâce",
  "Hortense",
  "Innocent",
  "Jeanne",
  "Jules",
  "Prosper",
  "Solange",
  "Ulrich",
  "Armel",
  "Arsène",
  "Boris",
  "Cyrille",
  "Gildas",
  "Landry",
  "Rodrigue",
  "Steve",
  "Wilfried",
  "Hamidou",
  "Djibril",
];

export type PseudoResult = { text: string; counts: Record<string, number> };

const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const RE_IBAN = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){12,30}\b/g;
const RE_CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
const RE_PHONE = /(?:\+|00)?\d[\d\s.-]{7,15}\d/g;

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace sensitive fragments. `people` = full names of the user's known people. */
export function pseudonymise(
  input: string,
  people: string[] = [],
  firstNames: string[] = FIRST_NAMES,
): PseudoResult {
  const counts: Record<string, number> = { iban: 0, card: 0, phone: 0, email: 0, person: 0 };
  let t = input ?? "";
  const sub = (re: RegExp, tag: string, key: string) => {
    t = t.replace(re, () => {
      counts[key]++;
      return tag;
    });
  };
  sub(RE_EMAIL, "<EMAIL>", "email");
  sub(RE_IBAN, "<IBAN>", "iban");
  sub(RE_CARD, "<CARTE>", "card");
  sub(RE_PHONE, "<TEL>", "phone");
  // people: full names first (longest first), then remaining parts of those names, then first names
  const ids = new Map<string, string>();
  const tagFor = (k: string) => {
    if (!ids.has(k)) ids.set(k, `<PERSONNE_${ids.size + 1}>`);
    return ids.get(k)!;
  };
  const full = [...new Set(people.filter((p) => p && p.trim().length > 2))].sort((a, b) =>
    b.length - a.length
  );
  for (const p of full) {
    const re = new RegExp(`(?<![\\p{L}])${esc(p.trim()).replace(/\s+/g, "\\s+")}(?![\\p{L}])`, "giu");
    t = t.replace(re, () => {
      counts.person++;
      return tagFor(p.toLowerCase());
    });
  }
  const parts = new Set<string>();
  for (const p of full) for (const w of p.split(/\s+/)) if (w.length > 2) parts.add(w);
  for (const w of firstNames) parts.add(w);
  for (const w of [...parts].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(?<![\\p{L}<_])${esc(w)}(?![\\p{L}>])`, "giu");
    t = t.replace(re, () => {
      counts.person++;
      return tagFor(w.toLowerCase());
    });
  }
  // a tagged first name followed by a capitalised word is a full name: absorb the surname
  t = t.replace(/(<PERSONNE_\d+>)\s+\p{Lu}[\p{L}'-]+/gu, (_m, tag) => tag);
  return { text: t, counts };
}
