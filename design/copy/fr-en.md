# X — Copy FR / EN (single source)

**Validated by Franco on 2026-11-23** (choices A, A, A): one file that
gathers every UI string; **this file wins** over the copy tables of the
item files when they differ. Alert reasons compare with the user's own
habits and give the figure when it helps (B13 style). Lengths are
measured by script (Poppins GP, 360 dp, 100 % and 200 % font) — see §4.

Rules: French first, then English. `{param}` names are kept as in the
item files (FR and EN names may differ: same value). Plurals: build with
ICU MessageFormat (`{n, plural, one {# alerte} other {# alertes}}`; FR
treats 0 and 1 as singular). Numbers, dates, amounts: F6 formats. Tone:
calm, factual, "vous"; never accusing words ("suspect", "fraudeur");
the app never blocks. Build: export this file to `shared/i18n/fr.json`
and `en.json` (keys = `{item}.{key}`), check new strings with the script
of §4 and report changes in one line (formats.md §7).

## 1. Alert reasons (reason codes)

Server sends `{code, params}` (docs/API.md); texts live in `shared/i18n`.
**Long** = B13 reasons, B15 rows, B4 full card (≤ 70 characters FR, ≤ 2
lines at 14/20 on 288 dp). **Short** = B4 compact rows, history, bank
queue (1 line, ≤ 34 characters). Icons from B13 §2. Tone: factual, about
the user's own habits, never "suspect", "fraudeur", "anormal".

Number rules: `{x}` = ratio rounded to the unit when ≥ 2 ("6 fois");
when < 2 use the `.mild` variant (no number). `{heure}` F6 "03:10".

| Slot | Key | Icon | FR | EN |
|---|---|---|---|---|
| reason.long | AMOUNT_VS_PAYEE | `chart-no-axes-column-increasing` | Montant {x} fois plus élevé que d'habitude pour ce bénéficiaire | Amount {x} times higher than usual for this payee |
| reason.long | AMOUNT_VS_PAYEE.mild | idem | Montant plus élevé que d'habitude pour ce bénéficiaire | Amount higher than usual for this payee |
| reason.short | AMOUNT_VS_PAYEE.short | idem | Montant inhabituel | Unusual amount |
| reason.long | AMOUNT_VS_CATEGORY | idem | Montant {x} fois plus élevé que d'habitude en {catégorie} | Amount {x} times higher than usual for {category} |
| reason.long | AMOUNT_VS_CATEGORY.mild | idem | Montant plus élevé que d'habitude en {catégorie} | Amount higher than usual for {category} |
| reason.short | AMOUNT_VS_CATEGORY.short | idem | Montant inhabituel | Unusual amount |
| reason.long | NEW_PAYEE | `user-plus` | Premier envoi à ce bénéficiaire | First payment to this payee |
| reason.short | NEW_PAYEE.short | idem | Nouveau bénéficiaire | New payee |
| reason.long | UNUSUAL_HOUR | `moon` | Opération à {heure}, une heure où vous faites rarement des opérations | Made at {time}, a time when you rarely make payments |
| reason.long | UNUSUAL_HOUR.analyst | idem | Opération à {heure}, une heure où l'utilisateur fait rarement des opérations | Made at {time}, a time when the user rarely makes payments |
| reason.short | UNUSUAL_HOUR.short | idem | Heure inhabituelle | Unusual time |
| reason.long | VELOCITY | `repeat` | {n} opérations en une heure, plus que d'habitude | {n} payments within an hour, more than usual |
| reason.short | VELOCITY.short | idem | Opérations rapprochées | Many payments in a row |
| reason.long | DAILY_OUTFLOW | `repeat` | Sorties du jour {x} fois plus élevées que d'habitude | Today's outgoing total is {x} times your usual |
| reason.long | DAILY_OUTFLOW.mild | idem | Sorties du jour plus élevées que d'habitude | Today's outgoing total is higher than usual |
| reason.short | DAILY_OUTFLOW.short | idem | Sorties du jour élevées | High outgoing total today |
| reason.long | UNUSUAL_COMBINATION | `shuffle` | Combinaison inhabituelle : {élément 1} et {élément 2} | Unusual combination: {feature 1} and {feature 2} |
| reason.short | UNUSUAL_COMBINATION.short | idem | Opération inhabituelle | Unusual payment |
| reason.long | R1 | `smartphone` | Carte SIM ou téléphone changé il y a moins de 24 h, puis envoi important | SIM card or phone changed less than 24 h ago, then a large payment |
| reason.short | R1.short | idem | SIM ou téléphone changé | SIM or phone changed |
| reason.long | R2 | `key-round` | Mot de passe ou e-mail changé il y a moins de 24 h, puis nouveau bénéficiaire | Password or email changed less than 24 h ago, then a new payee |
| reason.short | R2.short | idem | Accès modifiés récemment | Sign-in details changed |
| reason.long | R3 | `arrow-left-right` | Argent reçu puis renvoyé à la même personne, comme dans l'arnaque au « transfert par erreur » | Money received then sent back to the same person, as in the "wrong transfer" scam |
| reason.short | R3.short | idem | Argent reçu puis renvoyé | Money received then returned |
| reason.long | R4 | `users` | Argent reçu de nombreuses personnes puis vite renvoyé | Money received from many people and quickly sent on |
| reason.short | R4.short | idem | Argent qui ne fait que passer | Money passing straight through |
| reason.long | R5 | `trending-up` | Envois de plus en plus élevés à un bénéficiaire qui promet des gains | Growing payments to a payee promising returns |
| reason.short | R5.short | idem | Possible faux placement | Possible fake investment |
| reason.long | R6 | `moon` | Retrait d'espèces la nuit depuis un téléphone ajouté il y a moins de 24 h | Night cash withdrawal from a phone added less than 24 h ago |
| reason.short | R6.short | idem | Retrait de nuit | Night withdrawal |

Feature names for UNUSUAL_COMBINATION (`{élément}`, lower case, the two
features with the largest |z|):

| Slot | Key | FR | EN |
|---|---|---|---|
| feature | f1 / f2 | le montant | the amount |
| feature | f3 | le bénéficiaire | the payee |
| feature | f4 | l'heure | the time |
| feature | f5 | le jour de la semaine | the day of the week |
| feature | f6 | le rythme des opérations | the pace of payments |
| feature | f7 | le total du jour | today's total |
| feature | f8 | la part du solde | the share of your balance |
| feature | f9 | le canal (banque ou mobile money) | the channel (bank or mobile money) |
| feature | f10 | le type d'opération | the type of operation |

Context lines (B15 "Votre appareil") are in the B15 table in §5.
Bank dashboard (D) shows the same long sentences plus the code; where the user sentence says "vous" it uses the `.analyst` variant (only UNUSUAL_HOUR today).

## 2. "?" texts (B12)

Keys `help.{figure}.definition|yours|read|method|limits`. Sentence 1 =
definition (`body`), 2 = the user's figure (template), 3 = how to read
it. `method` = "Le calcul en mots" (1-2 sentences), `limits` = one
sentence (the method sheet also shows "Le passé ne prédit pas l'avenir."
for market figures). Risk-scale words come from B12 (Faible · Moyen ·
Élevé); the thresholds are content, still to confirm (HANDOFF).

| Slot | Key | FR | EN |
|---|---|---|---|
| help | volatility.definition | La volatilité mesure à quel point la valeur de votre portefeuille bouge. | Volatility measures how much the value of your portfolio moves. |
| help | volatility.yours | Votre volatilité est de {v} % : sur un an, votre portefeuille monte ou baisse en général d'environ {v} %. | Your volatility is {v}%: over a year, your portfolio usually rises or falls by about {v}%. |
| help | volatility.read.low | C'est un niveau faible, proche d'un portefeuille surtout en obligations. | This is low, close to a portfolio mostly in bonds. |
| help | volatility.read.mid | C'est un niveau moyen, proche d'un portefeuille qui mêle actions et obligations. | This is medium, close to a portfolio mixing shares and bonds. |
| help | volatility.read.high | C'est un niveau élevé, proche d'un portefeuille surtout en actions ou en crypto. | This is high, close to a portfolio mostly in shares or crypto. |
| help | volatility.method | Écart type des rendements quotidiens sur un an, ramené à l'année. | Standard deviation of daily returns over one year, annualised. |
| help | volatility.limits | Une année calme peut cacher un risque plus grand. | A calm year can hide a bigger risk. |
| help | beta.definition | Le bêta compare les mouvements de votre portefeuille à ceux du marché. | Beta compares how your portfolio moves with the market. |
| help | beta.yours | Votre bêta est de {b} : quand le marché bouge de 10 %, votre portefeuille bouge en général de {b×10} %. | Your beta is {b}: when the market moves 10%, your portfolio usually moves {b×10}%. |
| help | beta.read | Sous 1, il bouge moins que le marché ; au-dessus de 1, il bouge plus. | Below 1 it moves less than the market; above 1 it moves more. |
| help | beta.method | Comparaison de vos rendements quotidiens avec ceux de l'indice {indice} sur un an. | Your daily returns compared with the {index} index over one year. |
| help | beta.limits | Ne dit rien des placements qui ne suivent pas cet indice. | Says nothing about investments that do not follow this index. |
| help | var.definition | La VaR est la perte qu'on ne dépasse que rarement sur une période. | VaR is the loss that is rarely exceeded over a period. |
| help | var.yours | Votre VaR à 1 mois est de {montant} : 19 mois sur 20, la perte reste en dessous. | Your 1-month VaR is {amount}: 19 months out of 20, the loss stays below it. |
| help | var.read | Une fois sur 20, la perte peut être plus grande : c'est ce que mesure la CVaR. | 1 time in 20 the loss can be bigger: that is what CVaR measures. |
| help | var.method | Calculée à partir des variations passées de vos placements, au seuil de 95 %. | Calculated from the past changes of your investments, at the 95% level. |
| help | var.limits | Une crise plus forte que celles du passé n'est pas prévue par le calcul. | A crisis worse than past ones is not foreseen by the calculation. |
| help | cvar.definition | La CVaR est la perte moyenne les rares fois où la VaR est dépassée. | CVaR is the average loss in the rare cases when VaR is exceeded. |
| help | cvar.yours | Votre CVaR à 1 mois est de {montant}. | Your 1-month CVaR is {amount}. |
| help | cvar.read | Elle est toujours plus grande que la VaR : c'est le scénario des mauvais mois. | It is always bigger than VaR: it is the bad-months scenario. |
| help | cvar.method | Moyenne des 5 % de pires variations passées. | Average of the worst 5% of past changes. |
| help | cvar.limits | Repose sur peu de cas : à lire comme un ordre de grandeur. | Based on few cases: read it as an order of magnitude. |
| help | maxDrawdown.definition | La perte maximale est la plus forte baisse entre un sommet et un creux. | Maximum drawdown is the biggest fall from a peak to a low. |
| help | maxDrawdown.yours | Votre plus forte baisse est de {v} %, entre le {date1} et le {date2}. | Your biggest fall was {v}%, between {date1} and {date2}. |
| help | maxDrawdown.read | Elle montre ce que vous auriez vécu au pire moment de la période. | It shows what you would have lived through at the worst moment. |
| help | maxDrawdown.method | Plus grand écart entre un plus haut et le plus bas qui suit, sur la période. | Largest gap between a high and the following low, over the period. |
| help | maxDrawdown.limits | Ne dit pas combien de temps il a fallu pour remonter. | Does not say how long it took to recover. |
| help | twr.definition | Le TWR mesure la performance de vos placements, sans tenir compte de vos dépôts et retraits. | TWR measures how your investments performed, leaving out your deposits and withdrawals. |
| help | twr.yours | Sur la période, vos placements ont fait {v} %. | Over the period, your investments returned {v}%. |
| help | twr.read | C'est le bon chiffre pour comparer avec un indice ou un fonds. | This is the right figure to compare with an index or a fund. |
| help | twr.method | Performance calculée entre chaque dépôt ou retrait, puis enchaînée. | Return calculated between each deposit or withdrawal, then chained. |
| help | twr.limits | Ne dit pas combien vous avez gagné en francs. | Does not say how much you earned in francs. |
| help | irr.definition | Le TRI mesure ce que votre argent a rapporté, en tenant compte du moment de vos dépôts et retraits. | IRR measures what your money earned, taking into account when you deposited and withdrew. |
| help | irr.yours | Votre TRI est de {v} % par an. | Your IRR is {v}% a year. |
| help | irr.read | S'il est plus bas que le TWR, vos dépôts sont tombés à de moins bons moments. | If it is below TWR, your deposits came at less good moments. |
| help | irr.method | Taux qui rend égaux vos versements et la valeur actuelle. | Rate that makes your payments equal to today's value. |
| help | irr.limits | Le TRI ne peut pas être calculé sur cette période : {raison}. | IRR cannot be calculated for this period: {reason}. |
| help | contribution.definition | La contribution montre la part de chaque placement dans votre performance. | Contribution shows how much each investment added to your return. |
| help | contribution.yours | {actif} a apporté {v} points à votre performance de {total} %. | {asset} added {v} points to your {total}% return. |
| help | contribution.read | Un gros placement qui bouge peu peut compter plus qu'un petit qui bouge beaucoup. | A large holding that moves a little can count more than a small one that moves a lot. |
| help | contribution.method | Performance de chaque placement multipliée par son poids, sur la période. | Each investment's return times its weight, over the period. |
| help | contribution.limits | Les frais et impôts ne sont pas répartis. | Fees and taxes are not allocated. |
| help | fx.definition | L'effet de change est la part de la performance due aux variations des devises. | The currency effect is the part of your return due to currency changes. |
| help | fx.yours | Les devises ont fait {signe}{montant} sur la période. | Currencies made {sign}{amount} over the period. |
| help | fx.read | Le franc CFA est lié à l'euro : l'effet vient surtout du dollar. | The CFA franc is pegged to the euro: the effect comes mostly from the dollar. |
| help | fx.method | Différence entre la performance en franc CFA et la performance en devise d'origine. | Difference between the return in CFA francs and in the original currency. |
| help | fx.limits | Utilise les cours de change de fin de journée. | Uses end-of-day exchange rates. |
| help | concentration.definition | La concentration indique si un seul placement pèse trop lourd. | Concentration shows whether one investment weighs too much. |
| help | concentration.yours | {actif} représente {v} % de vos placements ; votre seuil est de {seuil} %. | {asset} is {v}% of your investments; your threshold is {threshold}%. |
| help | concentration.read | Au-dessus du seuil, une baisse de ce placement pèserait fort sur l'ensemble. | Above the threshold, a fall in this investment would weigh heavily on the whole. |
| help | concentration.method | Valeur du placement divisée par la valeur de tous vos placements. | Value of the investment divided by the value of all your investments. |
| help | concentration.limits | L'immobilier est compté à sa dernière estimation. | Real estate is counted at its last valuation. |
| help | proxy.definition | Un proxy est un indice qui remplace un placement sans cours quotidien. | A proxy is an index that stands in for an investment without daily prices. |
| help | proxy.yours | {actif} suit l'indice {indice} pour le calcul du risque. | {asset} follows the {index} index for the risk calculation. |
| help | proxy.read | Le risque affiché est donc une estimation. | The risk shown is therefore an estimate. |
| help | proxy.method | Choisi selon la classe et le pays du placement. | Chosen by the investment's class and country. |
| help | proxy.limits | Le vrai placement peut bouger différemment de l'indice. | The real investment can move differently from the index. |
| help | monthlyPrice.definition | Ce placement n'a qu'un prix par mois. | This investment has only one price a month. |
| help | monthlyPrice.yours | Dernier prix connu : {date}. | Last known price: {date}. |
| help | monthlyPrice.read | Il est mis de côté dans les calculs de risque quotidiens. | It is left out of daily risk calculations. |
| help | score.definition | Le score indique à quel point une opération sort de vos habitudes. | The score shows how far a payment is from your habits. |
| help | score.yours | Cette opération est dans la zone « {zone} ». | This payment is in the "{zone}" zone. |
| help | score.read | Normal : rien à faire. À confirmer : on vous demande. Banque prévenue : votre banque vérifie. | Normal: nothing to do. To confirm: we ask you. Bank notified: your bank checks. |
| help | score.method | Mélange vos habitudes (montants, heures, bénéficiaires), des règles contre les arnaques connues et le contexte du téléphone. | Combines your habits (amounts, times, payees), rules against known scams and the phone's context. |
| help | score.limits | Le score se trompe parfois : c'est pour cela qu'il vous demande, et qu'il ne bloque jamais. | The score is sometimes wrong: that is why it asks you, and never blocks. |
| help | savingsRate.definition | Le taux d'épargne est la part de vos revenus que vous n'avez pas dépensée. | The savings rate is the share of your income you did not spend. |
| help | savingsRate.yours | Ce mois-ci, vous avez mis de côté {v} % de vos revenus. | This month you kept {v}% of your income. |
| help | savingsRate.read | Négatif : vous avez dépensé plus que vos revenus du mois. | Negative: you spent more than this month's income. |
| help | resteAVivre.definition | Le reste à vivre est ce qui reste après vos charges fixes. | Money left to live on is what remains after your fixed costs. |
| help | resteAVivre.yours | Il vous reste {montant} ce mois-ci après vos charges fixes. | You have {amount} left this month after fixed costs. |
| help | resteAVivre.read | C'est ce qui reste pour les courses, les sorties et l'imprévu. | It is what remains for food, outings and the unexpected. |
| help | fixedShare.definition | La part des charges fixes est ce que pèsent loyer, abonnements et crédits dans vos dépenses. | The fixed-cost share is how much rent, subscriptions and loans weigh in your spending. |
| help | fixedShare.yours | Vos charges fixes font {v} % de vos dépenses du mois. | Fixed costs are {v}% of this month's spending. |
| help | fixedShare.read | Plus elle est haute, moins vous avez de marge si un revenu baisse. | The higher it is, the less room you have if income drops. |
| help | change.definition | L'évolution compare vos dépenses à celles du mois précédent. | The change compares your spending with the previous month. |
| help | change.yours | Vous avez dépensé {v} % {plus|moins} que le mois dernier. | You spent {v}% {more|less} than last month. |
| help | change.read | À date égale : on compare les mêmes jours des deux mois. | Same dates: the same days of both months are compared. |
| help | netWorth.definition | Le patrimoine net est ce que vous possédez moins ce que vous devez. | Net worth is what you own minus what you owe. |
| help | netWorth.yours | Comptes, placements et biens : {actifs}. Dettes : {dettes}. | Accounts, investments and property: {assets}. Debts: {debts}. |
| help | netWorth.read | Les biens immobiliers sont comptés à votre dernière estimation. | Property is counted at your last valuation. |

## 3. State messages

### C8 banners (≤ 2 lines at 13/18 on 280 dp, action on the right)

| Slot | Key | FR | EN |
|---|---|---|---|
| banner | offline | Hors ligne. Données du {date}, {heure}. | Offline. Data from {date}, {time}. |
| banner | syncError | Synchronisation impossible. | Couldn't sync. |
| button | retry | Réessayer | Try again |
| banner | stale7d | Données de plus de 7 jours. | Data more than 7 days old. |
| banner | bankReconnect | {banque} demande une nouvelle connexion. | {bank} needs you to sign in again. |
| button | reconnect | Reconnecter | Reconnect |
| banner | uncategorised | {n} opérations à classer | {n} operations to sort |
| button | sort | Classer | Sort |
| banner | concentration | {actif} dépasse votre seuil de {seuil} %. | {asset} is above your {threshold}% threshold. |
| banner | dataSaver | Économie de données : graphiques mis à jour à l'ouverture. | Data saver: charts update when you open the app. |
| banner | demo | Mode démo : données fictives. | Demo mode: fictitious data. |
| banner | queued | Réponse envoyée dès le retour du réseau. | Answer will be sent when you're back online. |

### C11 toasts (1 line at 14/20 on 280 dp)

| Slot | Key | FR | EN |
|---|---|---|---|
| toast | saved | Enregistré | Saved |
| toast | thanks | Merci, c'est noté | Thank you, noted |
| toast | categoryChanged | Catégorie modifiée | Category changed |
| toast | ruleCreated | Règle créée | Rule created |
| toast | budgetSaved | Budget enregistré | Budget saved |
| toast | purchaseAdded | Achat ajouté | Purchase added |
| toast | deviceSignedOut | Appareil déconnecté | Device signed out |
| toast | copied | Copié | Copied |
| toast | queued | En attente de connexion | Waiting for connection |
| toast | conflict | Modifié sur un autre appareil | Changed on another device |
| button | undo | Annuler | Undo |

### C10 dialogs

| Slot | Key | FR | EN |
|---|---|---|---|
| dialog.title | signOut.title | Se déconnecter ? | Sign out? |
| dialog.body | signOut.body | Vos données restent sur votre compte. Il faudra vous reconnecter. | Your data stays in your account. You will need to sign in again. |
| dialog.title | signOutAll.title | Déconnecter tous les appareils ? | Sign out all devices? |
| dialog.body | signOutAll.body | Tous vos appareils, sauf celui-ci, devront se reconnecter. | All your devices except this one will need to sign in again. |
| dialog.title | delete.title | Supprimer votre compte ? | Delete your account? |
| dialog.body | delete.body | Toutes vos données seront effacées. Cette action est définitive. | All your data will be erased. This cannot be undone. |
| field | delete.field | Tapez SUPPRIMER pour confirmer | Type DELETE to confirm |
| button | delete.confirm | Supprimer | Delete |
| button | cancel | Annuler | Cancel |
| dialog.title | update.title | Mise à jour nécessaire | Update required |
| dialog.body | update.body | Cette version n'est plus prise en charge. Installez la dernière version pour continuer. | This version is no longer supported. Install the latest version to continue. |
| button | update.cta | Mettre à jour | Update |

### C18 failed load and C19 empty states

| Slot | Key | FR | EN |
|---|---|---|---|
| empty.title | failed.title | Connexion instable | Unstable connection |
| empty.body | failed.body | Impossible de charger {objet} pour le moment. Vérifiez votre connexion, puis réessayez. | We can't load {object} right now. Check your connection, then try again. |
| param | failed.objects | vos comptes · vos opérations · vos placements · vos dépenses · vos alertes | your accounts · your operations · your investments · your spending · your alerts |
| empty.title | home.title | Votre patrimoine commence ici | Your net worth starts here |
| empty.body | home.body | Ajoutez un compte pour voir votre patrimoine. | Add an account to see your net worth. |
| button | addAccount | Ajouter un compte | Add an account |
| empty.title | accounts.title | Aucun compte pour l'instant | No accounts yet |
| empty.body | accounts.body | Ajoutez un compte bancaire ou mobile money pour suivre votre argent ici. | Add a bank or mobile money account to follow your money here. |
| empty.title | operations.title | Aucune opération | No operations |
| empty.body | operations.body | Les opérations de ce compte apparaîtront ici. | This account's operations will appear here. |
| empty.title | search.title | Aucun résultat | No results |
| empty.body | search.body | Essayez un autre mot ou retirez un filtre. | Try another word or remove a filter. |
| empty.title | portfolio.title | Aucun placement | No investments |
| empty.body | portfolio.body | Ajoutez un achat ou un bien immobilier pour suivre leur valeur. | Add a purchase or a property to follow its value. |
| button | addPurchase | Ajouter un achat | Add a purchase |
| empty.title | risk.title | Pas encore de risque à calculer | No risk to calculate yet |
| empty.body | risk.body | Le risque se calcule sur des placements cotés. Ajoutez-en un pour le voir. | Risk is calculated on listed investments. Add one to see it. |
| empty.title | spending.title | Pas encore d'opérations ce mois-ci | No operations this month yet |
| empty.body | spending.body | Vos dépenses du mois apparaîtront ici dès la première opération. | This month's spending will appear here after the first operation. |
| empty.title | budgets.title | Pas encore de budget | No budget yet |
| empty.body | budgets.body | Fixez un montant par catégorie pour savoir ce qu'il vous reste ce mois-ci. | Set an amount per category to know what you have left this month. |
| button | createBudget | Créer un budget | Create a budget |
| empty.title | alerts.title | Aucune alerte en cours | No open alerts |
| empty.body | alerts.body | Nous surveillons vos opérations. | We are watching your operations. |
| empty.title | history.title | Aucune alerte pour l'instant | No alerts yet |
| empty.title | devices.title | Un seul appareil | Only one device |
| empty.body | devices.body | Les autres appareils connectés à votre compte apparaîtront ici. | Other devices signed in to your account will appear here. |
## 4. Length check (2026-11-23)

Script: [check/extract.py](check/extract.py) + [check/measure.js](check/measure.js)
(Poppins GP from ../fonts, Chromium; parameters filled with long
realistic values: "Obligation État CI 2030", "1 250 000 F", "Banque
Baobab"). Each string is measured in its slot: width, size/line height,
weight, max lines at 100 %; at 200 % a 1-2 line slot may take twice its
lines (it wraps, never truncates). Notifications are checked in
characters (N §3: title ≤ 40, text ≤ 90).

| Slot | Width dp | Font | Max lines (100 %) |
|---|---|---|---|
| reason.long | 288 | 14/20 Regular | 2 |
| reason.short | 200 | 14/20 Medium | 1 |
| help sentence | 320 | 15/22 Regular | 4 |
| banner (C8, with action) | 230 | 13/18 Regular | 2 |
| button | 280 | 15/20 SemiBold | 1 |
| toast | 240 | 14/20 Medium | 1 |
| dialog title / body | 272 | 18/26 SemiBold / 15/22 | 2 / 4 |
| empty title / body (C19) | 320 | 18/26 SemiBold / 15/22 | 2 / 2 |
| item tables (by key): title / button / badge / other | 320 / 280 / 200 / 320 | 24/32 / 15/20 / 12/16 / 14/20 | 2 / 1 / 1 / 3 |

Result: **836 strings (418 FR + 418 EN), 0 over the limit** after these
changes:

| Where | Before | After |
|---|---|---|
| reason AMOUNT_VS_CATEGORY.short | Montant inhabituel en {catégorie} | Montant inhabituel (3 lines at 200 %) |
| reason UNUSUAL_HOUR.short | Heure inhabituelle ({heure}) | Heure inhabituelle |
| reason R6.short | Retrait de nuit, nouveau téléphone | Retrait de nuit |
| N alerted.text | … signalé à {bank}. Suivez l'analyse dans l'app. | … signalé à {bank}. (94 → 62 characters) |
| N conc.title | {asset} : {share} % de vos placements | {asset} : {share} % du total (48 → 39) |

Not checked: strings inside charts (axis labels, G-files have their own
rules), real Android rendering of notifications and widgets, and the
Tecno font scaling (assumed equal to Chromium at 2×).

## 5. Validated copy by item (gathered 2026-11-23)

Copied from the item files (unchanged unless §6 lists a change).

### B10 — Position, real-estate and debt rows

Source: [blocks/b10-holding-rows.md](../blocks/b10-holding-rows.md)

| FR | EN |
|---|---|
| Placements · Immobilier · Dettes | Investments · Real estate · Debts |
| {n} titres · {n} parts | {n} shares · {n} units |
| Proxy : {ticker} · Prix mensuel · Prix manuel | Proxy: {ticker} · Monthly price · Manual price |
| Estimé le {date} | Valued on {date} |
| À réévaluer | Revalue |
| {amount}/mois | {amount}/month |
| Hors calcul de risque | Excluded from risk |
| Historique insuffisant | Not enough history |

### B12 — "?" explanation sheet (+ method sheet)

Source: [blocks/b12-help-sheet.md](../blocks/b12-help-sheet.md)

| FR | EN |
|---|---|
| En savoir plus | Learn more |
| {Mot} · méthode | {Word} · method |
| Le calcul en mots · Données utilisées · Limites · Formule | How it is calculated · Data used · Limits · Formula |
| Période · Cours · Hors calcul | Period · Prices · Not included |
| Faible · Moyen · Élevé | Low · Medium · High |
| Il faut {n} jours de cours, vous en avez {m}. | {n} days of prices are needed, you have {m}. |
| Le passé ne prédit pas l'avenir. | The past does not predict the future. |

### B13 — "C'est bien vous ?" (L2, score 40-70)

Source: [blocks/b13-is-it-you.md](../blocks/b13-is-it-you.md)

| Key | FR | EN |
|---|---|---|
| title | C'est bien vous ? | Was this you? |
| calm | Nous vérifions cette opération avec vous. Elle n'est pas bloquée. | We are checking this operation with you. It is not blocked. |
| why | Pourquoi cette question ? | Why are we asking? |
| detail | Voir le détail du score | See the score details |
| hint | Votre empreinte vous sera demandée. | You will be asked for your fingerprint. |
| yes / no | Oui, c'est moi / Non, ce n'est pas moi | Yes, it was me / No, it wasn't me |
| thanks | Merci, c'est noté | Thank you, noted |
| answered | Vous avez déjà répondu « {réponse} » sur un autre appareil, à {heure}. | You already answered "{answer}" on another device at {time}. |

### B14 — "Votre banque a été prévenue" (L3, score > 70 or answer "Non")

Source: [blocks/b14-bank-notified.md](../blocks/b14-bank-notified.md)

| Key | FR | EN |
|---|---|---|
| badge | Banque prévenue | Bank notified |
| title | Votre banque a été prévenue | Your bank has been notified |
| calm | L'application ne bloque jamais un paiement. C'est votre banque qui décide. | The app never blocks a payment. Your bank decides. |
| step1 | Alerte envoyée à {banque} | Alert sent to {bank} |
| step2 | La banque vérifie l'opération · En général moins de 10 min | Your bank is checking the payment · Usually under 10 min |
| step3 | Décision de la banque | Bank's decision |
| legit | Opération confirmée · Votre banque a vérifié : tout est en ordre. | Payment confirmed · Your bank checked: everything is fine. |
| fraud | Opération bloquée par la banque · Votre banque va vous contacter. | Payment blocked by your bank · Your bank will contact you. |
| advice | Ne communiquez jamais votre code, même à quelqu'un qui dit appeler de votre banque. | Never share your code, even with someone who says they are calling from your bank. |
| why | Pourquoi cette alerte ? | Why this alert? |
| call / close | Appeler ma banque / Fermer | Call my bank / Close |

### B15 — "Pourquoi ?" sheet (L4, score explained)

Source: [blocks/b15-why-sheet.md](../blocks/b15-why-sheet.md)

| Key | FR | EN |
|---|---|---|
| title | Pourquoi cette alerte ? | Why this alert? |
| intro40 | Cette opération ne ressemble pas à vos habitudes : nous vous demandons de confirmer. | This operation doesn't match your habits: we're asking you to confirm. |
| intro70 | Plusieurs signes inhabituels réunis : votre banque a été prévenue. | Several unusual signs together: your bank has been notified. |
| reasons | Ce qui a compté | What counted |
| weightHigh / Low | Compte beaucoup / Compte un peu | Counts a lot / Counts a little |
| device | Votre appareil | Your device |
| newDevice | Opération faite depuis un nouvel appareil | Made from a new device |
| notLocked | Téléphone non verrouillé par un code | Phone not locked with a code |
| weakFace | Déverrouillage par le visage peu sûr sur ce modèle | Face unlock is weak on this model |
| method | Comment fonctionne le score ? | How does the score work? |

### B16 — Grouped settings list (Settings, O12)

Source: [blocks/b16-settings-list.md](../blocks/b16-settings-list.md)

| FR | EN |
|---|---|
| Paramètres | Settings |
| Général · Sécurité · Compte | General · Security · Account |
| Langue · Devise · Thème (Système / Sombre / Clair) | Language · Currency · Theme (System / Dark / Light) |
| Économie de données | Data saver |
| Déverrouillage · Verrouillage auto · Appareils connectés | Unlock · Auto-lock · Connected devices |
| Se déconnecter partout · Exporter mes données · Supprimer mon compte | Sign out everywhere · Export my data · Delete my account |
| Une confirmation (empreinte ou code) est demandée pour ces actions. | These actions ask for confirmation (fingerprint or code). |

### B18 — Form (P3 add trade; P4, P5, D3 and onboarding forms)

Source: [blocks/b18-form.md](../blocks/b18-form.md)

| FR | EN |
|---|---|
| Nouvelle opération · Achat · Vente | New transaction · Buy · Sell |
| Placement · Date · Quantité · Prix unitaire · Frais (facultatif) | Investment · Date · Quantity · Unit price · Fees (optional) |
| Montant de l'achat / de la vente | Purchase / Sale amount |
| Enregistrer | Save |
| Vous détenez {n} titres. | You hold {n} shares. |
| Sans connexion, l'opération est gardée « En attente » et envoyée plus tard. | Offline, the transaction is kept "Pending" and sent later. |
| Abandonner la saisie ? | Discard this entry? |

### B19 — Step screen (onboarding and one-off full screens)

Source: [blocks/b19-step-screen.md](../blocks/b19-step-screen.md)

| Key | FR | EN |
|---|---|---|
| progress | Étape {n} sur {N} | Step {n} of {N} |
| later | Plus tard | Later |
| O2.title | Choisissez votre langue | Choose your language |
| O2.text | Choose your language | Choisissez votre langue |
| O2.primary | Continuer | Continue |
| O10none.title | Votre téléphone n'est pas verrouillé | Your phone is not locked |
| O10none.text | Sans code ni empreinte, quelqu'un qui prend votre téléphone peut ouvrir l'app. Créez un code GOLDENPIECE à 6 chiffres. | Without a code or fingerprint, anyone who picks up your phone can open the app. Create a 6-digit GOLDENPIECE code. |
| O10none.secondary | Verrouiller mon téléphone | Lock my phone |
| O10none.primary | Créer un code | Create a code |
| O17.title | Mise à jour nécessaire | Update required |
| O17.text | Cette version n'est plus prise en charge. Installez la nouvelle pour continuer. Vos données sont conservées. | This version is no longer supported. Install the new one to continue. Your data is kept. |
| O17.version | Votre version {v} · minimum {min} | Your version {v} · minimum {min} |
| O17.primary | Mettre à jour | Update |

### B21 — Institution picker (O13f, O15a)

Source: [blocks/b21-institution-picker.md](../blocks/b21-institution-picker.md)

| Key | FR | EN |
|---|---|---|
| title.link | Relier un compte | Link an account |
| title.card | De quelle banque est cette carte ? | Which bank issued this card? |
| tag | simulation | simulation |
| line.link | Aucune vraie connexion n'est faite : les comptes sont fictifs. | No real connection is made: the accounts are fictitious. |
| line.card | Carte •• {last4} · Aucune vraie connexion n'est faite. | Card •• {last4} · No real connection is made. |
| group.mm | Mobile money | Mobile money |
| group.banks | Banques | Banks |
| other.title | Autre banque | Other bank |
| other.sub | Continuer avec la Banque (démo) | Continue with the demo bank |
| search | Rechercher | Search |
| empty | Aucun résultat pour « {q} » | No results for "{q}" |
| linked | Déjà relié · •• {last4} | Already linked · •• {last4} |

### B22 — Categories, rules and "Appliquer aux N opérations similaires ?"

Source: [blocks/b22-categories-rules.md](../blocks/b22-categories-rules.md)

| Key | FR | EN |
|---|---|---|
| title | Catégories et règles | Categories and rules |
| summary | {n} sous-catégories · {r} règles | {n} sub-categories · {r} rules |
| noSub | Aucune sous-catégorie | No sub-category |
| createCat | Créer une catégorie | Create a category |
| addSub / addRule | Ajouter une sous-catégorie / Ajouter une règle | Add a sub-category / Add a rule |
| rule | Quand le libellé contient « {texte} », classer dans {catégorie} | When the label contains “{text}”, file under {category} |
| aiChip | Proposée par l'IA | Suggested by AI |
| applyTitle | Appliquer aux {n} opérations similaires ? | Apply to {n} similar operations? |
| applyText | Ces opérations ont le même libellé « {libellé} ». Elles passeront de {ancienne} à {nouvelle}. | These operations have the same label “{label}”. They will move from {old} to {new}. |
| more | et {n} de plus | and {n} more |
| makeRule | Faire de même pour les prochaines (créer une règle) | Do the same for future ones (create a rule) |
| apply / only | Appliquer aux {n} / Seulement celle-ci | Apply to {n} / Only this one |
| toast | {n} opérations classées dans {catégorie} | {n} operations filed under {category} |
| noRule | Corrigez une opération pour créer une règle automatiquement. | Correct an operation to create a rule automatically. |

### B23 — Device row + remote sign-out (Settings → Appareils connectés)

Source: [blocks/b23-device-row.md](../blocks/b23-device-row.md)

| Key | FR | EN |
|---|---|---|
| title | Appareils connectés | Connected devices |
| line | Les téléphones où votre compte est ouvert. | Phones where your account is open. |
| current | Cet appareil | This device |
| active.now | Actif maintenant | Active now |
| active.date | Actif {date} | Active {date} |
| foot | Touchez un appareil pour le déconnecter. | Tap a device to sign it out. |
| foot.alone | Aucun autre appareil n'est connecté. | No other device is signed in. |
| k.last · k.city · k.first | Dernière activité · Lieu approximatif · Première connexion | Last activity · Approximate location · First sign-in |
| btn | Déconnecter cet appareil | Sign out this device |
| btn.self | Me déconnecter ici | Sign out here |
| toast | {model} déconnecté | {model} signed out |
| error | Impossible de déconnecter. Réessayez. | Couldn't sign out. Try again. |

### B4 — Alert card

Source: [blocks/b4-alert-card.md](../blocks/b4-alert-card.md)

| Key | FR | EN |
|---|---|---|
| section | Alertes | Alerts |
| link | Voir les {n} alertes | See all {n} alerts |
| action.confirm | C'est bien vous ? Répondez | Was this you? Answer |
| action.notified | Suivre l'analyse | Follow the review |
| action.budget | Voir le budget | See the budget |
| action.concentration | Voir la répartition | See the allocation |
| outcome.you | C'était vous | It was you |
| outcome.legit | Légitime | Legitimate |
| outcome.fraud | Fraude confirmée | Fraud confirmed |

### B5 — Learning card

Source: [blocks/b5-learning-card.md](../blocks/b5-learning-card.md)

| Key | FR | EN |
|---|---|---|
| title | Apprentissage de vos habitudes | Learning your habits |
| text | Les alertes d'anomalies s'activeront après {d} jours et {o} opérations. | Unusual-activity alerts start after {d} days and {o} operations. |
| days / ops | jours / opérations | days / operations |
| fraud | Les alertes de fraude restent actives pendant ce temps. | Fraud alerts stay on in the meantime. |
| done.title | Les alertes d'anomalies sont actives | Unusual-activity alerts are on |
| done.text | Une opération inhabituelle vous sera désormais signalée. | You will now be told about any unusual operation. |
| done.ok | OK | OK |

### B6 — Budget ring

Source: [blocks/b6-budget-ring.md](../blocks/b6-budget-ring.md)

| Key | FR | EN |
|---|---|---|
| section | Budget | Budget |
| total | Ce mois | This month |
| left | Reste {amount} | {amount} left |
| over | Dépassé de {amount} | Over by {amount} |
| empty | Fixez un montant par catégorie pour suivre vos dépenses du mois. | Set an amount per category to follow your spending this month. |
| create | Créer un budget | Create a budget |

### B7 — Stat tiles

Source: [blocks/b7-stat-tiles.md](../blocks/b7-stat-tiles.md)

| Key | FR | EN |
|---|---|---|
| section | Ce mois en chiffres | This month in figures |
| savings | Taux d'épargne · {amount} mis de côté ce mois | Savings rate · {amount} saved this month |
| savingsNeg | Plus de dépenses que de revenus | More spending than income |
| rav | Reste à vivre · Après loyer, factures et crédits | Left to live on · After rent, bills and loans |
| fixed | Charges fixes · Loyer, factures et crédits | Fixed costs · Rent, bills and loans |
| change | Évolution · Dépenses par rapport à {mois} | Change · Spending compared with {month} |
| insufficient | Données insuffisantes | Not enough data |
| missingIncome | Ajoutez vos revenus du mois | Add this month's income |
| missingIncomeFixed | Ajoutez vos revenus et charges fixes | Add your income and fixed costs |
| missingPrev | Il faut un mois précédent | A previous month is needed |

### B8 — Chart frame

Source: [blocks/b8-chart-frame.md](../blocks/b8-chart-frame.md)

| Case | FR | EN |
|---|---|---|
| line up / down | Votre {objet} a gagné / perdu {p} % {période}. | Your {object} gained / lost {p}% {period}. |
| spending vs previous | Vos dépenses ont baissé / augmenté de {p} % par rapport à {mois}. | Your spending fell / rose {p}% compared with {month}. |
| month pill | Mois {mois} | Month {month} |
| insufficient | Il faut au moins deux mois d'opérations. | At least two months of operations are needed. |

### G3 — Bars: spending by category vs previous month

Source: [charts/g3-bars.md](../charts/g3-bars.md)

| Key | FR | EN |
|---|---|---|
| title | Dépenses par catégorie | Spending by category |
| legendNow | {Mois} | {Month} |
| legendPrev | Niveau d'{mois} / de {mois} | {Month} level |
| expand / collapse | Voir les {n} catégories / Voir moins | See all {n} categories / See less |
| scrubChange | {Catégorie} · {±p} % par rapport à {mois} | {Category} · {±p}% compared with {month} |
| firstMonth | Premier mois suivi. | First month tracked. |
| other | Autres | Other |

### G4 — Donut (allocation)

Source: [charts/g4-donut.md](../charts/g4-donut.md)

| FR | EN |
|---|---|
| Répartition | Allocation |
| Classe · Devise · Pays | Class · Currency · Country |
| Total des actifs | Total assets |
| {n} classes · {n} devises · {n} pays | {n} classes · {n} currencies · {n} countries |
| L'{key} représente {pct} de vos actifs. | {Key} makes up {pct} of your assets. |
| Autres | Other |

### G5 — Sankey: flows of the month

Source: [charts/g5-sankey.md](../charts/g5-sankey.md)

| Key | FR | EN |
|---|---|---|
| title | Flux du mois | Money flows this month |
| hub | Revenus | Income |
| summary | Sur {income} reçus, vous avez dépensé {spent} et mis {saved} de côté. | Out of {income} received, you spent {spent} and saved {saved}. |
| summaryOver | Vous avez dépensé {gap} de plus que vos revenus ; la différence vient de votre épargne. | You spent {gap} more than your income; the difference came from your savings. |
| share | {Nom} · {p} % de vos revenus | {Name} · {p}% of your income |
| from / to | D'où vient l'argent / Où il part | Where the money comes from / Where it goes |
| more | … {n} de plus | … {n} more |
| showChart | Voir le schéma | Show the diagram |
| noIncome | Ajoutez vos revenus du mois pour voir d'où vient l'argent. | Add this month's income to see where the money comes from. |

### G6 — Candlestick (asset detail, P6)

Source: [charts/g6-candlestick.md](../charts/g6-candlestick.md)

| FR | EN |
|---|---|
| Courbe · Bougies | Line · Candles |
| 3M · 1A · 5A | 3M · 1Y · 5Y |
| Ouverture · Plus haut · Plus bas · Clôture | Open · High · Low · Close |
| Prix mensuel : affiché en courbe | Monthly price: shown as a line |

### G7 — Positive / negative bars (contributions, D2)

Source: [charts/g7-pos-neg-bars.md](../charts/g7-pos-neg-bars.md)

| FR | EN |
|---|---|
| Ce qui a compté | What made the difference |
| Par actif · Par classe | By asset · By class |
| Le {a} a le plus aidé, le {b} a le plus pesé. | {A} helped most, {b} weighed most. |

### N — Notifications (Android push)

Source: [screens/n-notifications.md](../screens/n-notifications.md)

| Key | FR | EN |
|---|---|---|
| channel.security / budgets / markets | Sécurité / Budgets / Marchés | Security / Budgets / Markets |
| confirm.title | C'est bien vous ? | Was this you? |
| confirm.text | {op_type} {operator} vers {payee} à {time}. L'opération n'est pas bloquée. | {op_type} {operator} to {payee} at {time}. It is not blocked. |
| confirm.public | Une opération attend votre confirmation. | A payment is waiting for your confirmation. |
| action.yes / no | Oui, c'est moi / Non, pas moi | Yes, it was me / No, not me |
| reminder.title | Une réponse vous attend | We're waiting for your answer |
| reminder.text | {op_type} {operator} vers {payee} à {time}. C'est bien vous ? | {op_type} {operator} to {payee} at {time}. Was this you? |
| reminder.public | Une opération attend toujours votre réponse. | A payment is still waiting for your answer. |
| alerted.title | Votre banque a été prévenue | Your bank has been notified |
| alerted.text | {op_type} {operator} vers {payee} à {time} signalé à {bank}. | {op_type} {operator} to {payee} at {time} reported to {bank}. |
| alerted.public | Alerte de sécurité · Ouvrez l'application pour suivre l'analyse. | Security alert · Open the app to follow the review. |
| action.call | Appeler ma banque | Call my bank |
| legit.title / text | Opération confirmée / {bank} a vérifié le {op_type_lower} de {time} : tout est en ordre. | Payment confirmed / {bank} checked the {op_type_lower} at {time}: everything is fine. |
| fraud.title / text | Opération bloquée par la banque / {bank} va vous contacter. Ne communiquez jamais votre code. | Payment blocked by your bank / {bank} will contact you. Never share your code. |
| decision.public | Décision de votre banque · Ouvrez l'application pour la voir. | Your bank's decision · Open the app to see it. |
| budget80.title / text | {category} : 80 % du budget / Il reste 20 % du budget jusqu'au {last_day}. | {category}: 80% of budget / 20% of the budget left until {last_day}. |
| budget80.amount | Il reste {left} jusqu'au {last_day}. | {left} left until {last_day}. |
| budget100.title / text | {category} : budget atteint / Vous avez utilisé tout le budget de {month}. | {category}: budget reached / You have used all of your {month} budget. |
| budget100.amount | Vous avez utilisé les {budgeted} du budget de {month}. | You have used your {budgeted} {month} budget. |
| budget.public80 / public100 | Un budget approche de sa limite. / Un budget est atteint. | A budget is close to its limit. / A budget has been reached. |
| conc.title / text | {asset} : {share} % du total / Au-dessus de votre seuil de {threshold} %. | {asset}: {share}% of total / Above your {threshold}% threshold. |
| conc.public | Placements · Un placement dépasse votre seuil. | Investments · An investment is above your threshold. |
| learning.title / text | Les alertes d'anomalies sont actives / Une opération inhabituelle vous sera désormais signalée. | Anomaly alerts are on / We'll now tell you about any unusual payment. |
| group.summary | {n} notifications | {n} notifications |

### S1 — Launch and onboarding (O1-O18)

Source: [screens/s1-onboarding.md](../screens/s1-onboarding.md)

| Key | FR | EN |
|---|---|---|
| O3.title | Votre pays de résidence | Your country of residence |
| O3.line | Cela ne change pas votre devise (F CFA par défaut). | This does not change your currency (CFA franc by default). |
| O3.search | Rechercher un pays | Search for a country |
| O3.suggest | Suggestions | Suggestions |
| O3.all | Tous les pays | All countries |
| O12.title | Vos accords | Your consents |
| O12.line | Vous pourrez les changer dans Paramètres. | You can change them in Settings. |
| O12.service | J'accepte le service | I accept the service |
| O12.service.sub | Prototype, données fictives | Prototype, fictitious data |
| O12.ai | Catégorisation par IA | AI categorisation |
| O12.ai.sub | Aucun nom envoyé | No name sent |
| O12.crash | Rapports de plantage | Crash reports |
| O12.crash.sub | Anonymes | Anonymous |
| O12.details | Détails | Details |
| O12.notif | Les notifications vous seront proposées plus tard, au bon moment. | We'll ask about notifications later, when they're useful. |
| O12.primary | Accepter et continuer | Accept and continue |
| O18.title | Entrez votre code | Enter your code |
| O18.sub | Pour ouvrir GOLDENPIECE | To open GOLDENPIECE |
| O18.forgot | Code oublié ? | Forgot your code? |

### S5 — Spending (D1-D4)

Source: [screens/s5-spending.md](../screens/s5-spending.md)

| Key | FR | EN |
|---|---|---|
| title | Dépenses | Spending |
| pills | Aperçu · Flux · Budgets | Overview · Flows · Budgets |
| monthPill | Mois {mois} | Month {month} |
| uncategorised | {n} opérations à classer · Classer | {n} transactions to sort · Sort |
| heroSpent | Dépensé en {mois} | Spent in {month} |
| heroShare | {a} et {b} font {p} % de vos dépenses. | {a} and {b} make up {p}% of your spending. |
| rulesRow | Catégories et règles · {n} catégories · {r} règles | Categories and rules · {n} categories · {r} rules |
| budgetsHero | Reste sur vos budgets | Left in your budgets |
| budgetsSub | {spent} dépensés sur {planned} prévus. | {spent} spent of {planned} planned. |
| createBudget | Créer un budget | Create a budget |

### S6 — Alerts (L1-L5)

Source: [screens/s6-alerts.md](../screens/s6-alerts.md)

| Key | FR | EN |
|---|---|---|
| title | Alertes | Alerts |
| history | Historique des alertes | Alert history |
| empty | Aucune alerte en cours · Nous surveillons vos opérations. | No open alerts · We are watching your transactions. |
| historyEmpty | Aucune alerte pour l'instant | No alerts yet |
| headerIcon | {n} alerte(s) en cours | {n} open alert(s) |

### S7 — Settings

Source: [screens/s7-settings.md](../screens/s7-settings.md)

| FR | EN |
|---|---|
| Compte créé le {date} | Account created on {date} |
| Profil démo · {persona} · données fictives | Demo profile · {persona} · fictitious data |
| Créer mon compte | Create my account |
| Notifications · Sécurité · Budgets · Marchés · Montants visibles | Notifications · Security · Budgets · Markets · Show amounts |
| Même désactivées, les alertes de sécurité restent visibles dans l'app. | Even when off, security alerts stay visible in the app. |
| Mes données · Catégories et règles · Seuil de concentration · Questionnaire · Historique des alertes · Accords | My data · Categories and rules · Concentration threshold · Questionnaire · Alert history · Consents |
| Aide · Rejouer la visite · Installer l'app · À propos | Help · Replay the tour · Install the app · About |
| Démo · Réinitialiser la démo | Demo · Reset the demo |
| Afficher les montants ? | Show amounts? |
| Les montants seront visibles dans les notifications, une fois le téléphone déverrouillé. Toute personne qui utilise votre téléphone pourra les lire. | Amounts will be visible in notifications once the phone is unlocked. Anyone who uses your phone can read them. |
| Afficher les montants · Garder masqués | Show amounts · Keep hidden |

### W — Home-screen widgets (phase 2, designed now)

Source: [screens/w-widgets.md](../screens/w-widgets.md)

| Key | FR | EN |
|---|---|---|
| nw.label2x2 / 2x1 | Patrimoine net / Patrimoine | Net worth / Net worth |
| nw.footer | 30 jours · {heure} | 30 days · {time} |
| budget.label / left / over | Budget / restant / dépassé | Budget / left / over |
| budget.none | Créer un budget | Create a budget |
| alerts.count | {n} alertes (1 alerte, 0 alerte) | {n} alerts (1 alert, 0 alerts) |
| alerts.toConfirm | {k} à confirmer | {k} to confirm |
| alerts.notified | Banque prévenue | Bank notified |
| alerts.none | Tout est calme | All clear |
| noData | Ouvrez l'app pour mettre à jour | Open the app to update |
| config.show | Afficher les montants | Show amounts |
| config.title | Réglages du widget | Widget settings |
| locked | Ouvrir l'app | Open the app |
| picker names | Patrimoine · Patrimoine (petit) · Budget du mois · Alertes | Net worth · Net worth (small) · Monthly budget · Alerts |
