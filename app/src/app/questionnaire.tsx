/** O14 Questionnaire (B24 piece): C12 bar with 4-section C17 dots, one
 * question per screen as a C16 choice list; tap = saved (outbox) + next. */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../theme';
import { ChoiceList, StepDots, TopBar, Txt, useToast } from '../ui';
import { useT, type StringKey } from '../i18n';
import { useApp } from '../state/app';
import { getEngine } from '../state/engine';
import { QUESTIONS, QUESTIONNAIRE_VERSION, SECTIONS, sectionAnswers } from '../lib/questionnaire';

export default function Questionnaire() {
  const { c } = useTheme();
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { api } = useApp();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const q = QUESTIONS[i];
  const sectionIndex = SECTIONS.indexOf(q.section);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  const back = () => (i > 0 ? setI(i - 1) : close());

  const choose = async (key: string) => {
    const opt = q.options.find((x) => String(x.value) === key)!;
    const next = { ...answers, [q.key]: opt.value };
    setAnswers(next);
    // saved per answer: the whole section so far (server upserts the section)
    const e = await getEngine(api).catch(() => null);
    const args = { section: q.section, answers: sectionAnswers(next, q.section), version: QUESTIONNAIRE_VERSION };
    if (e) { await e.enqueue('save_questionnaire', args).catch(() => {}); void e.replay().catch(() => {}); }
    else await api.rpc('save_questionnaire', { p_section: args.section, p_answers: args.answers, p_version: args.version }).catch(() => {});
    if (i < QUESTIONS.length - 1) setI(i + 1);
    else { toast.show({ kind: 'success', text: t('O14.saved') }); close(); }
  };

  const value = q.key in answers ? String(answers[q.key]) : null;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <TopBar onBack={back} center={<StepDots index={sectionIndex + 1} total={SECTIONS.length} showLabel={false} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: T.layout.screenMargin, paddingBottom: insets.bottom + 32, gap: 8 }}>
        <Txt v="caption" tone="secondary" style={{ marginTop: 8 }}>{t(`O14.section.${q.section}` as StringKey)}</Txt>
        <Txt v="titleScreen" accessibilityRole="header">{q.title[t.lang]}</Txt>
        <View style={{ marginTop: 16 }}>
          <ChoiceList options={q.options.map((o) => ({ key: String(o.value), label: o.label[t.lang] }))} value={value} onChange={(k) => void choose(k)} />
        </View>
      </ScrollView>
    </View>
  );
}
