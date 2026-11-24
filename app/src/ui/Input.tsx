/** C2 Input field (components/input-pin-keypad.md §1). */
import { useContext, useState, type ComponentRef, type Ref } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { T, font, useTheme } from '../theme';
import { useT } from '../i18n';
import { FontScaleContext, Icon, Txt, useTk, type IconName } from './base';

const IN = T.component.input;

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  help?: string;
  /** Shown instead of help; callers set it on blur or submit only. */
  error?: string | null;
  leadingIcon?: IconName;
  password?: boolean;
  strength?: 'strong' | 'medium' | 'weak' | null;
  strengthLabel?: string;
  variant?: 'field' | 'search';
  disabled?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export function Input({ label, help, error, leadingIcon, password, strength, strengthLabel, variant = 'field', disabled, onFocus, onBlur, value, onChangeText, ref, ...rest }: InputProps) {
  const { c, scheme } = useTheme();
  const tk = useTk();
  const t = useT();
  const devScale = useContext(FontScaleContext);
  const [focus, setFocus] = useState(false);
  const [shown, setShown] = useState(false);
  const search = variant === 'search';
  const fill = search ? c.surface3 : tk(IN.fill);
  const borderColour = error ? c.loss : focus ? c.focus : scheme === 'light' && !search ? 'rgba(0,0,0,0.10)' : 'transparent';
  const borderWidth = error || focus ? IN.focus.width : scheme === 'light' && !search ? 1 : 0;
  const lead = search ? 'search' : leadingIcon;
  const levels = IN.password.levels;
  const strengthTone = strength ? ({ gain: c.gain, warning: c.warning, loss: c.loss } as Record<string, string>)[levels[strength][1]] : undefined;
  return (
    <View style={{ gap: IN.label.gap, opacity: disabled ? 0.4 : 1 }}>
      {label && !search ? <Txt spec={IN.label} tone="secondary">{label}</Txt> : null}
      <View style={{ minHeight: search ? IN.search.height : IN.height, borderRadius: search ? 999 : IN.radius, backgroundColor: fill,
        borderWidth, borderColor: borderColour, flexDirection: 'row', alignItems: 'center',
        paddingLeft: IN.paddingX - borderWidth, paddingRight: (value && search) || password ? 4 : IN.paddingX - borderWidth, gap: 12 }}>
        {lead ? <Icon name={lead} size={IN.icon} color={c.text.secondary} /> : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          accessibilityLabel={label ?? rest.placeholder}
          accessibilityHint={error ?? undefined}
          placeholderTextColor={tk(IN.placeholder)}
          selectionColor={c.focus}
          cursorColor={c.focus}
          secureTextEntry={password && !shown}
          onFocus={(e) => { setFocus(true); onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); onBlur?.(e); }}
          style={{ flex: 1, minWidth: 0, fontFamily: font(400), fontSize: T.typography.scale.body.size * devScale, color: c.text.primary, paddingVertical: 12, outlineStyle: 'none' } as object}
          {...rest}
        />
        {search && value ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('clear')} onPress={() => onChangeText?.('')}
            style={{ width: IN.trailingTarget, height: IN.trailingTarget, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={IN.icon} color={c.text.secondary} />
          </Pressable>
        ) : null}
        {password ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t(shown ? 'password.hide' : 'password.show')} onPress={() => setShown(!shown)}
            style={{ width: IN.trailingTarget, height: IN.trailingTarget, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={shown ? 'eye-off' : 'eye'} size={IN.icon} color={c.text.secondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <View style={{ paddingTop: 1 }}><Icon name="circle-alert" size={16} color={c.loss} /></View>
          <Txt spec={IN.error.message} color={c.loss} style={{ flex: 1 }}>{error}</Txt>
        </View>
      ) : strength && strengthLabel ? (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Icon name={levels[strength][0] as IconName} size={16} color={strengthTone} />
          <Txt spec={IN.error.message} color={strengthTone}>{strengthLabel}</Txt>
        </View>
      ) : help ? (
        <Txt spec={IN.help} tone="secondary">{help}</Txt>
      ) : null}
    </View>
  );
}
