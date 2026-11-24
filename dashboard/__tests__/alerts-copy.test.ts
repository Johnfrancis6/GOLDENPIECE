import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUMP, FEATURE, REASON_LONG, REASON_SHORT, categoryName, reasonLong, reasonShort } from '../src/i18n/alerts';
import { STRINGS } from '../src/i18n';

const X = readFileSync(resolve(__dirname, '../../design/copy/fr-en.md'), 'utf8').replace(/’/g, "'");
const D = readFileSync(resolve(__dirname, '../../design/screens/d-bank-dashboard.md'), 'utf8').replace(/’/g, "'");

describe('alert copy is the validated X copy', () => {
  it('every reason, feature and bump string appears verbatim in design/copy/fr-en.md', () => {
    for (const table of [REASON_LONG, REASON_SHORT, FEATURE, BUMP]) {
      for (const [k, v] of Object.entries(table)) {
        expect(X, `${k} fr`).toContain(v.fr);
        expect(X, `${k} en`).toContain(v.en);
      }
    }
  });

  it('categories copied from the app are identical', () => {
    const app = readFileSync(resolve(__dirname, '../../app/src/data/categories.json'), 'utf8');
    const mine = readFileSync(resolve(__dirname, '../src/data/categories.json'), 'utf8');
    expect(mine).toBe(app);
  });

  it('uses the .analyst variant, the .mild rule and feature names', () => {
    expect(reasonLong({ code: 'UNUSUAL_HOUR', params: { time: '23:41' } }, 'fr'))
      .toBe("Opération à 23:41, une heure où l'utilisateur fait rarement des opérations");
    expect(reasonLong({ code: 'AMOUNT_VS_CATEGORY', params: { x: 21, category: 'housing.equipment' } }, 'fr'))
      .toBe(`Montant 21 fois plus élevé que d'habitude en ${categoryName('housing.equipment', 'fr').toLowerCase()}`);
    expect(reasonLong({ code: 'AMOUNT_VS_PAYEE', params: { x: 1.4 } }, 'en')).toBe('Amount higher than usual for this payee');
    expect(reasonLong({ code: 'UNUSUAL_COMBINATION', params: { f1: 'f3', f2: 'f4' } }, 'fr'))
      .toBe("Combinaison inhabituelle : le bénéficiaire et l'heure");
    expect(reasonLong({ code: 'UNUSUAL_COMBINATION', params: { f1: 'f1', f2: 'f2' } }, 'fr')).toBe('Opération inhabituelle');
    expect(reasonShort({ code: 'R4', params: {} }, 'fr')).toBe('Argent qui ne fait que passer');
  });

  it('D §7 queue/detail copy is used verbatim', () => {
    for (const k of ['groups.decided', 'simulated', 'empty.title', 'empty.body'] as const) {
      expect(D).toContain(STRINGS.fr[k].replace(/’/g, "'"));
      expect(D).toContain(STRINGS.en[k]);
    }
    for (const s of ['Opération', 'Pourquoi', 'Score', "Réponse de l'utilisateur", '90 derniers jours', 'Événements de sécurité', 'Appareils']) {
      expect(D).toContain(s);
    }
    expect(D).toContain(STRINGS.fr['status.review']);
    expect(D).toContain(STRINGS.en['status.review']);
  });
});
