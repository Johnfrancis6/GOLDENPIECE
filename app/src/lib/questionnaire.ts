/**
 * O14 questionnaire (B24 piece, composed by B6.4): 4 sections, one question
 * per screen, saved per answer (`save_questionnaire` through the outbox).
 * Risk: five answers r1..r5 scored 1-5 → server sets profiles.risk_profile
 * (round of the mean, app_sync migration). Texts FR/EN here (not in design).
 */
export type Section = 'income' | 'goals' | 'risk' | 'habits';
export const SECTIONS: Section[] = ['income', 'goals', 'risk', 'habits'];
export const QUESTIONNAIRE_VERSION = 1;

type L = { fr: string; en: string };
export type Option = { value: string | number; label: L };
export type Question = { section: Section; key: string; title: L; options: Option[] };

const o = (value: string | number, fr: string, en: string): Option => ({ value, label: { fr, en } });

export const QUESTIONS: Question[] = [
  { section: 'income', key: 'monthly_income', title: { fr: 'Vos revenus chaque mois', en: 'Your monthly income' }, options: [
    o('lt_100k', 'Moins de 100 000 F', 'Under 100,000 F'), o('100k_300k', '100 000 à 300 000 F', '100,000 to 300,000 F'),
    o('300k_1m', '300 000 F à 1 million', '300,000 F to 1 million'), o('gt_1m', 'Plus d’1 million de F', 'Over 1 million F')] },
  { section: 'income', key: 'regularity', title: { fr: 'Vos revenus sont…', en: 'Your income is…' }, options: [
    o('regular', 'Réguliers (salaire)', 'Regular (salary)'), o('variable', 'Variables (commerce, missions)', 'Variable (trade, jobs)'),
    o('seasonal', 'Saisonniers', 'Seasonal')] },
  { section: 'goals', key: 'main_goal', title: { fr: 'Votre objectif principal', en: 'Your main goal' }, options: [
    o('project', 'Épargner pour un projet', 'Save for a project'), o('reserve', 'Garder une réserve', 'Keep a safety reserve'),
    o('grow', 'Faire fructifier mon argent', 'Grow my money'), o('retire', 'Préparer ma retraite', 'Prepare my retirement')] },
  { section: 'goals', key: 'horizon', title: { fr: 'Pour quand ?', en: 'By when?' }, options: [
    o('lt_1y', 'Moins d’un an', 'Under a year'), o('1_3y', '1 à 3 ans', '1 to 3 years'), o('3_10y', '3 à 10 ans', '3 to 10 years'),
    o('gt_10y', 'Plus de 10 ans', 'Over 10 years')] },
  { section: 'risk', key: 'r1', title: { fr: 'Vos placements perdent 10 % en un mois. Vous…', en: 'Your investments lose 10% in a month. You…' }, options: [
    o(1, 'Vendez tout', 'Sell everything'), o(2, 'Vendez une partie', 'Sell part of them'), o(4, 'Attendez', 'Wait'),
    o(5, 'Achetez davantage', 'Buy more')] },
  { section: 'risk', key: 'r2', title: { fr: 'Vous pourriez laisser cet argent placé…', en: 'You could leave this money invested…' }, options: [
    o(1, 'Moins d’un an', 'Under a year'), o(2, '1 à 3 ans', '1 to 3 years'), o(4, '3 à 7 ans', '3 to 7 years'), o(5, 'Plus de 7 ans', 'Over 7 years')] },
  { section: 'risk', key: 'r3', title: { fr: 'Vous préférez…', en: 'You prefer…' }, options: [
    o(1, 'Garder tout mon capital', 'Keep all my capital'), o(3, 'Un peu de risque pour un peu plus', 'Some risk for a little more'),
    o(5, 'Plus de risque pour plus de gain', 'More risk for more gain')] },
  { section: 'risk', key: 'r4', title: { fr: 'Votre expérience des placements', en: 'Your investing experience' }, options: [
    o(1, 'Aucune', 'None'), o(2, 'Épargne, tontine', 'Savings, tontine'), o(4, 'Actions ou fonds', 'Shares or funds'),
    o(5, 'Plusieurs années de marché', 'Several years in markets')] },
  { section: 'risk', key: 'r5', title: { fr: 'Part de votre épargne que vous pourriez placer', en: 'Share of your savings you could invest' }, options: [
    o(1, 'Moins de 10 %', 'Under 10%'), o(2, '10 à 25 %', '10 to 25%'), o(4, '25 à 50 %', '25 to 50%'), o(5, 'Plus de 50 %', 'Over 50%')] },
  { section: 'habits', key: 'pay_with', title: { fr: 'Vous payez surtout…', en: 'You mostly pay…' }, options: [
    o('cash', 'En espèces', 'In cash'), o('momo', 'Par mobile money', 'By mobile money'), o('card', 'Par carte', 'By card'),
    o('transfer', 'Par virement', 'By transfer')] },
  { section: 'habits', key: 'budget_check', title: { fr: 'Vous suivez votre budget…', en: 'You check your budget…' }, options: [
    o('never', 'Jamais', 'Never'), o('sometimes', 'Parfois', 'Sometimes'), o('monthly', 'Chaque mois', 'Every month'),
    o('weekly', 'Chaque semaine', 'Every week')] },
];

/** The section's answers so far (what one save sends). */
export function sectionAnswers(all: Record<string, string | number>, section: Section): Record<string, string | number> {
  const keys = QUESTIONS.filter((q) => q.section === section).map((q) => q.key);
  return Object.fromEntries(keys.filter((k) => k in all).map((k) => [k, all[k]]));
}

/** Server rule mirrored for display: mean of r1..r5 rounded, when all five are answered. */
export function riskProfile(all: Record<string, string | number>): number | null {
  const v = ['r1', 'r2', 'r3', 'r4', 'r5'].map((k) => all[k]).filter((x): x is number => typeof x === 'number');
  return v.length === 5 ? Math.round(v.reduce((a, b) => a + b, 0) / 5) : null;
}
