/** O12 Consents (S1 §2, dots 5/5): one C7 list card, rows 64 dp, control on
 * the right; "Détails" opens a C9 sheet; primary disabled until the service
 * box is checked. Each consent is stored with its version and date. */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp, CONSENT_VERSION, type Fail } from '../../state/app';
import { useT, type StringKey } from '../../i18n';
import { T, useTheme } from '../../theme';
import { Banner, Button, Card, Checkbox, Sheet, Switch, Txt, useLargeFont } from '../../ui';
import { FormFrame, failText, useBack, useStep } from '../../screens/frames';

type Row = 'service' | 'ai' | 'crash';
const ROW = T.component.listRow;

function ConsentRow({ id, on, onToggle, onDetails, control }: { id: Row; on: boolean; onToggle: () => void; onDetails: () => void; control: 'checkbox' | 'switch' }) {
  const { c, scheme } = useTheme();
  const t = useT();
  const title = t(`O12.${id}` as StringKey);
  const large = useLargeFont(); // ≥ 150 %: the control goes under the text (no word split, D12)
  return (
    <View style={{ flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-start' : 'center', minHeight: 64 }}>
      <View style={{ flex: large ? undefined : 1, alignSelf: 'stretch', paddingLeft: ROW.paddingX, paddingRight: large ? ROW.paddingX : 0, paddingVertical: 10 }}>
        <Pressable onPress={onToggle} accessibilityRole={control === 'checkbox' ? 'checkbox' : 'switch'}
          accessibilityState={{ checked: on }} accessibilityLabel={title}
          style={({ pressed }) => ({ backgroundColor: pressed ? ROW.pressed[scheme] : 'transparent' })}>
          <Txt v="body">{title}</Txt>
        </Pressable>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
          <Txt v="caption" tone="secondary">{t(`O12.${id}.sub` as StringKey)} · </Txt>
          <Pressable onPress={onDetails} hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }} accessibilityRole="button"
            accessibilityLabel={t('O12.details.a11y', { what: title })}>
            <Txt v="caption" weight={600} color={c.brand.text}>{t('O12.details')}</Txt>
          </Pressable>
        </View>
      </View>
      <Pressable onPress={onToggle} accessibilityRole={control === 'checkbox' ? 'checkbox' : 'switch'}
        accessibilityState={{ checked: on }} accessibilityLabel={title}
        style={{ minWidth: 48, minHeight: 48, paddingHorizontal: ROW.paddingX, paddingBottom: large ? 8 : 0, alignItems: 'center', justifyContent: 'center' }}>
        {control === 'checkbox' ? <Checkbox on={on} /> : <Switch on={on} />}
      </Pressable>
    </View>
  );
}

export default function Consents() {
  useStep('consents');
  const back = useBack('consents');
  const { recordConsents } = useApp();
  const { c } = useTheme();
  const t = useT();
  const [service, setService] = useState(false);
  const [ai, setAi] = useState(false);
  const [crash, setCrash] = useState(false);
  const [details, setDetails] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Fail | null>(null);
  const submit = async () => {
    setBusy(true); setFail(null);
    const f = await recordConsents(ai, crash);
    setBusy(false);
    if (f) setFail(f); // success: the phase gate opens Home
  };
  const hair = <View style={{ height: ROW.separator.width, marginLeft: ROW.separator.insetWithout, backgroundColor: c.border.hairline }} />;
  return (
    <FormFrame step="consents" title={t('O12.title')} line={t('O12.line')} onBack={back}
      banner={fail ? <Banner kind="error" text={failText(t, fail)} /> : undefined}
      footer={<Button label={t('O12.primary')} onPress={() => void submit()} loading={busy} disabled={!service} />}>
      <Card variant="list" style={{ marginTop: 24 }}>
        <ConsentRow id="service" control="checkbox" on={service} onToggle={() => setService(!service)} onDetails={() => setDetails('service')} />
        {hair}
        <ConsentRow id="ai" control="switch" on={ai} onToggle={() => setAi(!ai)} onDetails={() => setDetails('ai')} />
        {hair}
        <ConsentRow id="crash" control="switch" on={crash} onToggle={() => setCrash(!crash)} onDetails={() => setDetails('crash')} />
      </Card>
      <Txt v="caption" tone="secondary" style={{ marginTop: 16 }}>{t('O12.notif')}</Txt>
      <Sheet open={details !== null} onClose={() => setDetails(null)} title={details ? t(`O12.${details}` as StringKey) : ''}>
        {details ? (
          <View style={{ gap: 12, paddingBottom: 8 }}>
            <Txt v="body">{t(`O12.${details}.details` as StringKey)}</Txt>
            <Txt v="caption" tone="secondary">{t('O12.version', { v: CONSENT_VERSION })}</Txt>
          </View>
        ) : <View />}
      </Sheet>
    </FormFrame>
  );
}
