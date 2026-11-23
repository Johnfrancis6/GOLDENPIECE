/** §9.4 point 5: 200 labelled labels — no phone, IBAN, card, e-mail or known name survives. */
import { assert, assertEquals } from "@std/assert";
import { FIRST_NAMES, pseudonymise } from "./pseudo.ts";

const LAST = ["Ndiaye", "Diop", "Fall", "Koné", "Traoré", "Mbarga", "Ngono", "Essomba", "Ouattara", "Camara"];
const FIRST = [
  "Awa",
  "Moussa",
  "Aminata",
  "Kouassi",
  "Christelle",
  "Hervé",
  "Seydou",
  "Adjoua",
  "Jean",
  "Rokhaya",
];
const PHONES = [
  "+221 99 123 45 67",
  "+225 0799887766",
  "00237 99 11 22 33",
  "77 123 45 67",
  "+33 6 12 34 56 78",
];
const IBANS = [
  "SN12K01010012345678901234567",
  "CI93 CI00 8010 0123 4567 8901 2345",
  "FR7630006000011234567890189",
];
const CARDS = ["4970 1012 3456 7890", "5132-4567-8901-2345", "4111111111111111"];
const MAILS = ["awa.diop@example.com", "k.kone@mail.example.org"];
const TEMPLATES = [
  (n: string, p: string) => `Envoi à ${n} ${p}`,
  (n: string, p: string) => `Remboursement ${n} tel ${p}`,
  (n: string, _p: string) => `VIREMENT ${n.toUpperCase()} LOYER`,
  (n: string, p: string) => `Transfert de ${n} (${p})`,
  (n: string, _p: string) => `Cadeau pour ${n}`,
];

type Case = { label: string; people: string[]; secrets: string[]; keep: string[] };

function cases(): Case[] {
  const out: Case[] = [];
  let k = 0;
  while (out.length < 200) {
    const n = `${FIRST[k % FIRST.length]} ${LAST[(k * 3) % LAST.length]}`;
    const p = PHONES[k % PHONES.length];
    const t = TEMPLATES[k % TEMPLATES.length];
    const extra = k % 4 === 0
      ? ` IBAN ${IBANS[k % IBANS.length]}`
      : k % 4 === 1
      ? ` carte ${CARDS[k % CARDS.length]}`
      : k % 4 === 2
      ? ` ${MAILS[k % MAILS.length]}`
      : "";
    const label = t(n, p) + extra + (k % 5 === 0 ? " — Supermarché Baobab" : "");
    const secrets = [
      ...n.split(" "),
      ...(label.includes(p) ? [p] : []),
      ...(extra ? [extra.trim().replace(/^(IBAN|carte) /, "")] : []),
    ];
    // half the cases: the name is a known person of the user; the other half rely on the first-name list
    out.push({
      label,
      people: k % 2 === 0 ? [n] : [],
      secrets,
      keep: k % 5 === 0 ? ["Supermarché Baobab"] : [],
    });
    k++;
  }
  return out;
}

Deno.test("pseudonymise: 200 labels, no identifier or name survives, merchant names kept", () => {
  const all = cases();
  assertEquals(all.length, 200);
  for (const c of all) {
    const r = pseudonymise(c.label, c.people);
    for (const s of c.secrets) {
      assert(
        !r.text.toLowerCase().includes(s.toLowerCase()),
        `"${s}" survived in "${r.text}" (from "${c.label}")`,
      );
    }
    assert(
      !/\d{6,}/.test(r.text.replace(/\s/g, "").replace(/<[A-Z_0-9]+>/g, "")) ||
        /<(TEL|IBAN|CARTE)>/.test(r.text),
      `digits left in ${r.text}`,
    );
    for (const s of c.keep) assert(r.text.includes(s), `merchant lost in ${r.text}`);
  }
});

Deno.test("pseudonymise: counts and stable person tags", () => {
  const r = pseudonymise("Envoi Awa Diop puis Awa Diop +221 99 123 45 67 awa@x.example.com", ["Awa Diop"]);
  assertEquals(r.text, "Envoi <PERSONNE_1> puis <PERSONNE_1> <TEL> <EMAIL>");
  assertEquals(r.counts.person, 2);
  assertEquals(r.counts.phone, 1);
  assertEquals(r.counts.email, 1);
});

Deno.test("pseudonymise: keeps merchant words that are not names", () => {
  assertEquals(pseudonymise("PAIEMENT CB HYPER TERANGA").text, "PAIEMENT CB HYPER TERANGA");
  assert(FIRST_NAMES.length > 100);
});
