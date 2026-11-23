"""Generate the `ref` seed migration (countries, operators, banks, BINs,
categories, placeholder legal texts, app config).

Every institution is fictitious (design B21/C21: no real names or logos).
Sources: ISO 3166-1 names FR/EN from pycountry, dial codes from
phonenumbers, time zones from the IANA zone.tab of the system tzdata.

Run once (output is a migration, migrations are immutable):
  pip install pycountry phonenumbers
  python3 batch/goldenpiece/generator/ref_seed.py supabase/migrations/<version>_ref_seed.sql
"""
from __future__ import annotations

import gettext
import json
import sys
from pathlib import Path

import phonenumbers
import pycountry

PROFILES = {
    "SN": "SN", "CI": "CI", "CM": "CM",
    **{c: "UEMOA" for c in ["BJ", "BF", "GW", "ML", "NE", "TG"]},
    **{c: "CEMAC" for c in ["CF", "CG", "GA", "GQ", "TD"]},
}
AFRICA = set("""DZ AO BW BI CV KM CD DJ EG ER SZ ET GM GH GN KE LS LR LY MG MW MR MU YT MA MZ NA NG RE RW
SH ST SC SL SO ZA SS SD TZ TN UG EH ZM ZW""".split())

# Fictitious mobile-money operators (design B21: real operator names replaced).
OPERATORS = [
    ("kola_money", "Kola Money"),
    ("savane_pay", "Savane Pay"),
    ("teranga_mobile", "Teranga Mobile"),
    ("lagune_cash", "Lagune Cash"),
    ("sanaga_pay", "Sanaga Pay"),
    ("ogooue_money", "Ogooué Money"),
]
OPERATORS_BY_PROFILE = {
    "SN": ["teranga_mobile", "kola_money", "savane_pay"],
    "CI": ["lagune_cash", "kola_money", "savane_pay"],
    "CM": ["sanaga_pay", "kola_money"],
    "UEMOA": ["kola_money", "savane_pay"],
    "CEMAC": ["sanaga_pay", "ogooue_money"],
    "AFRICA": ["kola_money"],
    "DIASPORA": [],
}

# Fictitious banks. BIC location code "D0": second char '0' = test BIC (never live).
# IBAN bank codes: UEMOA = country letter-prefixed 5 chars, CEMAC = 5 digits; 9xx = fictitious range.
BANKS = [
    ("bank_demo", "Banque (démo)", None, "DEMOXXD0", None),
    ("banque_baobab", "Banque Baobab", "SN", "BAOBSND0", "SN901"),
    ("banque_fleuve", "Banque du Fleuve", "SN", "FLEUSND0", "SN902"),
    ("banque_lagune", "Banque Lagune", "CI", "LAGUCID0", "CI901"),
    ("caisse_sahel", "Caisse Sahel", "ML", "SAHEMLD0", "ML901"),
    ("caisse_horizon", "Caisse Horizon", "CM", "HORICMD0", "10901"),
    ("banque_equateur", "Banque de l'Équateur", "GA", "EQUAGAD0", "40901"),
]
# Fictitious BINs (test-style ranges), one or two per bank.
BINS = [
    ("400901", "banque_baobab", "visa"), ("510901", "banque_baobab", "mastercard"),
    ("400902", "banque_fleuve", "visa"),
    ("400903", "banque_lagune", "visa"), ("510903", "banque_lagune", "mastercard"),
    ("400904", "caisse_sahel", "visa"),
    ("510905", "caisse_horizon", "mastercard"),
    ("400906", "banque_equateur", "visa"),
    ("400900", "bank_demo", "visa"),
]

# Default category tree (design C21: 12 top categories, Lucide icons).
# (id, parent, name_fr, name_en, icon, fixed, income)
CATEGORIES = [
    ("groceries", None, "Courses", "Groceries", "shopping-cart", False, False),
    ("groceries.market", "groceries", "Marché", "Market", "shopping-basket", False, False),
    ("groceries.supermarket", "groceries", "Supermarché", "Supermarket", "shopping-cart", False, False),
    ("groceries.shop", "groceries", "Boutique de quartier", "Corner shop", "store", False, False),
    ("transport", None, "Transport", "Transport", "bus", False, False),
    ("transport.taxi", "transport", "Taxi et moto-taxi", "Taxi and motorbike taxi", "car-taxi-front", False, False),
    ("transport.public", "transport", "Transports en commun", "Public transport", "bus", False, False),
    ("transport.fuel", "transport", "Carburant", "Fuel", "fuel", False, False),
    ("transport.travel", "transport", "Voyages", "Travel", "plane", False, False),
    ("restaurant", None, "Restaurant", "Restaurant", "utensils", False, False),
    ("restaurant.eating_out", "restaurant", "Restaurant et maquis", "Eating out", "utensils", False, False),
    ("restaurant.delivery", "restaurant", "Livraison", "Delivery", "bike", False, False),
    ("housing", None, "Logement", "Housing", "house", False, False),
    ("housing.rent", "housing", "Loyer", "Rent", "house", True, False),
    ("housing.maintenance", "housing", "Entretien et réparations", "Maintenance and repairs", "wrench", False, False),
    ("housing.equipment", "housing", "Équipement", "Household equipment", "sofa", False, False),
    ("bills", None, "Factures", "Bills", "receipt-text", False, False),
    ("bills.electricity", "bills", "Électricité", "Electricity", "zap", True, False),
    ("bills.water", "bills", "Eau", "Water", "droplet", True, False),
    ("bills.airtime", "bills", "Crédit téléphone", "Airtime", "smartphone", False, False),
    ("bills.internet", "bills", "Internet", "Internet", "wifi", True, False),
    ("bills.tv", "bills", "Télévision", "TV", "tv", True, False),
    ("bills.fees", "bills", "Frais bancaires et mobile money", "Bank and mobile-money fees", "receipt-text", False, False),
    ("health", None, "Santé", "Health", "heart-pulse", False, False),
    ("health.pharmacy", "health", "Pharmacie", "Pharmacy", "pill", False, False),
    ("health.doctor", "health", "Consultations", "Doctor", "stethoscope", False, False),
    ("health.insurance", "health", "Assurance santé", "Health insurance", "shield-plus", True, False),
    ("education", None, "Éducation", "Education", "graduation-cap", False, False),
    ("education.school_fees", "education", "Frais de scolarité", "School fees", "graduation-cap", True, False),
    ("education.supplies", "education", "Fournitures", "School supplies", "pencil", False, False),
    ("leisure", None, "Loisirs", "Leisure", "gamepad-2", False, False),
    ("leisure.outings", "leisure", "Sorties", "Going out", "ticket", False, False),
    ("leisure.subscriptions", "leisure", "Abonnements", "Subscriptions", "repeat", True, False),
    ("leisure.sport", "leisure", "Sport", "Sport", "dumbbell", False, False),
    ("leisure.ceremonies", "leisure", "Cérémonies et fêtes", "Ceremonies and celebrations", "party-popper", False, False),
    ("income", None, "Revenus", "Income", "banknote", False, True),
    ("income.salary", "income", "Salaire", "Salary", "banknote", False, True),
    ("income.business", "income", "Revenus d'activité", "Business income", "briefcase", False, True),
    ("income.transfer_in", "income", "Transferts reçus", "Transfers received", "arrow-down-left", False, True),
    ("income.other", "income", "Autres revenus", "Other income", "banknote", False, True),
    ("savings", None, "Épargne", "Savings", "piggy-bank", False, False),
    ("savings.tontine", "savings", "Tontine", "Tontine", "users", False, False),
    ("savings.account", "savings", "Compte épargne", "Savings account", "piggy-bank", False, False),
    ("savings.investment", "savings", "Placements", "Investments", "trending-up", False, False),
    ("transfers", None, "Transferts", "Transfers", "arrow-left-right", False, False),
    ("transfers.family", "transfers", "Famille et proches", "Family and friends", "heart-handshake", False, False),
    ("transfers.internal", "transfers", "Entre mes comptes", "Between my accounts", "arrow-left-right", False, False),
    ("transfers.cash", "transfers", "Retraits d'espèces", "Cash withdrawals", "hand-coins", False, False),
    ("other", None, "Autres", "Other", "circle-ellipsis", False, False),
    ("other.misc", "other", "Divers", "Miscellaneous", "circle-ellipsis", False, False),
]

LEGAL = {
    ("terms", "fr"): "# Conditions d'utilisation (brouillon)\n\nPrototype de démonstration. Données fictives. Pas un conseil financier. Texte définitif rédigé en B10.",
    ("terms", "en"): "# Terms of use (draft)\n\nDemonstration prototype. Fictitious data. Not financial advice. Final text drafted in B10.",
    ("privacy", "fr"): "# Confidentialité (brouillon)\n\nAucune donnée bancaire réelle n'est collectée. Texte définitif rédigé en B10.",
    ("privacy", "en"): "# Privacy (draft)\n\nNo real banking data is collected. Final text drafted in B10.",
    ("disclaimer", "fr"): "Données fictives, à titre de démonstration. Pas un conseil financier.",
    ("disclaimer", "en"): "Fictitious data, for demonstration only. Not financial advice.",
}

APP_CONFIG = {
    "min_version": {"android": "0.0.0"},
    "maintenance": False,
    "flags": {},
    "health": {"quotes_max_age_min": 45, "batch_max_age_h": 26, "groq_backlog_max": 500,
               "db_size_warn_mb": 300},
}


def q(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (list, tuple)):
        return "array[" + ",".join(q(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def zones() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for line in Path("/usr/share/zoneinfo/zone.tab").read_text().splitlines():
        if line.startswith("#") or not line.strip():
            continue
        cc, _, tz = line.split("\t")[:3]
        out.setdefault(cc, []).append(tz)
    return out


def main(out_path: str) -> None:
    fr = gettext.translation("iso3166-1", pycountry.LOCALES_DIR, languages=["fr"])
    tzs = zones()
    rows = []
    for c in sorted(pycountry.countries, key=lambda c: c.alpha_2):
        iso = c.alpha_2
        profile = PROFILES.get(iso) or ("AFRICA" if iso in AFRICA else "DIASPORA")
        en = getattr(c, "common_name", None) or c.name
        fr_name = fr.gettext(getattr(c, "common_name", None) or c.name)
        if fr_name == en:
            fr_name = fr.gettext(c.name)
        dial = phonenumbers.country_code_for_region(iso)
        z = tzs.get(iso, [])
        default_tz = {"SN": "Africa/Dakar", "CI": "Africa/Abidjan", "CM": "Africa/Douala"}.get(iso, z[0] if z else "UTC")
        rows.append(f"({q(iso)},{q(fr_name)},{q(en)},{q('+' + str(dial) if dial else None)},{q(default_tz)},"
                    f"{q(z)},{q(profile)},{q('privacy.' + profile.lower())},{q(OPERATORS_BY_PROFILE[profile])})")
    sql = [
        "-- B1: ref seed. GENERATED by batch/goldenpiece/generator/ref_seed.py (do not edit by hand).",
        "-- All institutions are fictitious (design B21/C21). ISO 3166-1 names (pycountry),",
        "-- dial codes (phonenumbers), IANA zones (zone.tab).",
        "",
        "insert into ref.operators (id, name, is_fictitious) values",
        ",\n".join(f"({q(i)},{q(n)},true)" for i, n in OPERATORS) + ";",
        "",
        "insert into ref.countries (iso2, name_fr, name_en, dial_code, default_tz, timezones, profile_id, privacy_notice_key, operators) values",
        ",\n".join(rows) + ";",
        "",
        "insert into ref.banks (id, name, country, bic, iban_bank_code, is_fictitious) values",
        ",\n".join(f"({q(i)},{q(n)},{q(c)},{q(b)},{q(code)},true)" for i, n, c, b, code in BANKS) + ";",
        "",
        "insert into ref.card_bins (bin6, bank_id, brand) values",
        ",\n".join(f"({q(b)},{q(k)},{q(br)})" for b, k, br in BINS) + ";",
        "",
        "insert into ref.categories (id, parent_id, name_fr, name_en, icon, is_fixed_charge, is_income, sort) values",
        ",\n".join(f"({q(i)},{q(p)},{q(nf)},{q(ne)},{q(ic)},{q(fx)},{q(inc)},{n * 10})"
                   for n, (i, p, nf, ne, ic, fx, inc) in enumerate(CATEGORIES, 1)) + ";",
        "",
        "insert into ref.legal_texts (kind, lang, version, body_md) values",
        ",\n".join(f"({q(k)},{q(l)},'0.1-draft',{q(b)})" for (k, l), b in LEGAL.items()) + ";",
        "",
        "insert into ops.app_config (key, value) values",
        ",\n".join(f"({q(k)},{q(json.dumps(v))}::jsonb)" for k, v in APP_CONFIG.items()) + ";",
        "",
    ]
    Path(out_path).write_text("\n".join(sql))
    print(f"{len(rows)} countries, {len(CATEGORIES)} categories -> {out_path}")


if __name__ == "__main__":
    main(sys.argv[1])
