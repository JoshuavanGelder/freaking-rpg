import React from 'react';
import { Pressable, ScrollView, StyleProp, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from './theme';
import { Icon, IconName } from './icons';
import { RevealCtx, useKeyboardReveal, useReveal } from './keyboard';
import { useT } from './lang';

// ---------- tekst ----------

type Weight = 'regular' | 'semibold' | 'bold' | 'display' | 'story';

export function T({
  children,
  style,
  size = 15,
  weight = 'regular',
  color = C.ink,
  numberOfLines,
  selectable,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  size?: number;
  weight?: Weight;
  color?: string;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  return (
    <Text numberOfLines={numberOfLines} selectable={selectable} style={[{ fontFamily: F[weight], fontSize: size, color }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
      <T size={13} weight="bold" color={C.accent} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        {children}
      </T>
      {right}
    </Row>
  );
}

// ---------- layout ----------

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

/** Scrollend scherm met ruimte voor de systeembalken. */
export function Screen({ children, gap = 20, bottom = 28 }: { children: React.ReactNode; gap?: number; bottom?: number }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardReveal();
  return (
    <RevealCtx.Provider value={kb.reveal}>
      <ScrollView
        ref={kb.ref}
        onScroll={kb.onScroll}
        scrollEventThrottle={32}
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: bottom + insets.bottom, gap }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </RevealCtx.Provider>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: C.card, borderRadius: 14, padding: 16, gap: 10 }, style]}>{children}</View>;
}

/** Bovenbalk: terugknop, titel en eventueel een knop rechts. */
export function TopBar({
  onBack,
  title,
  subtitle,
  right,
  center,
}: {
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  center?: boolean;
}) {
  const { t } = useT();
  return (
    <Row style={{ gap: 10, minHeight: 44 }}>
      {onBack ? <IconButton icon="back" label={t('common.back')} onPress={onBack} /> : null}
      <View style={{ flex: 1, alignItems: center ? 'center' : 'flex-start' }}>
        {title ? (
          <T size={center ? 13 : 16} weight="bold" color={center ? C.muted : C.ink} numberOfLines={1} style={center ? { letterSpacing: 1, textTransform: 'uppercase' } : undefined}>
            {title}
          </T>
        ) : null}
        {subtitle ? (
          <T size={12} color={C.muted} numberOfLines={1}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right ?? (onBack && center ? <View style={{ width: 44 }} /> : null)}
    </Row>
  );
}

// ---------- knoppen ----------

export function IconButton({ icon, label, onPress, color = C.ink }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: pressed ? C.cardHi : C.card,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Icon name={icon} size={20} color={color} />
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  const fg = primary ? C.onAccent : variant === 'ghost' ? C.accent : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          minHeight: variant === 'ghost' ? 44 : 56,
          paddingHorizontal: variant === 'ghost' ? 4 : 20,
          borderRadius: 16,
          backgroundColor: primary ? (pressed ? C.accentPressed : C.accent) : variant === 'outline' ? (pressed ? C.cardHi : C.card) : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: C.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: variant === 'ghost' ? 'flex-start' : 'center',
          gap: 8,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <T size={variant === 'ghost' ? 14 : 17} weight={variant === 'ghost' ? 'semibold' : 'bold'} color={fg}>
        {label}
      </T>
      {icon ? <Icon name={icon} size={18} color={fg} strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

/** Keuzeknop als pil. */
export function Chip({ label, selected, onPress, dashed }: { label: string; selected?: boolean; onPress: () => void; dashed?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 44,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1.5,
        borderStyle: dashed && !selected ? 'dashed' : 'solid',
        borderColor: selected ? C.accent : dashed ? C.dashed : C.border,
        backgroundColor: selected ? C.accent : pressed ? C.cardHi : dashed ? 'transparent' : C.card,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <T size={15} weight="semibold" color={selected ? C.onAccent : dashed ? C.muted : C.ink}>
        {label}
      </T>
    </Pressable>
  );
}

/** Grote keuzetegel (setting). */
export function Tile({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 84,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: selected ? C.accent : C.border,
        backgroundColor: selected ? C.accentTint : pressed ? C.cardHi : C.card,
        gap: 4,
      })}
    >
      <Row style={{ justifyContent: 'space-between', gap: 6 }}>
        <T size={16} weight="bold" style={{ flexShrink: 1 }}>
          {label}
        </T>
        {selected ? <Icon name="check" size={18} color={C.accent} strokeWidth={2.5} /> : null}
      </Row>
      <T size={13} color={C.muted} style={{ lineHeight: 18 }}>
        {hint}
      </T>
    </Pressable>
  );
}

// ---------- invoer ----------

export function Field({
  label,
  extra,
  value,
  onChangeText,
  placeholder,
  multiline,
  secure,
  autoCapitalize = 'sentences',
}: {
  label?: string;
  extra?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secure?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const reveal = useReveal();
  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <Row style={{ gap: 6 }}>
          <T size={13} weight="bold" color={C.accent} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
            {label}
          </T>
          {extra ? (
            <T size={13} color={C.muted}>
              · {extra}
            </T>
          ) : null}
        </Row>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={reveal}
        placeholder={placeholder}
        placeholderTextColor={C.dim}
        multiline={multiline}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        autoCorrect={!secure}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          minHeight: multiline ? 96 : 50,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: C.border,
          backgroundColor: C.card,
          color: C.ink,
          fontFamily: F.regular,
          fontSize: 15,
          lineHeight: multiline ? 22 : undefined,
        }}
      />
    </View>
  );
}

// ---------- kleine onderdelen ----------

export function Notice({ icon = 'info', text, tone = 'quiet' }: { icon?: IconName; text: string; tone?: 'quiet' | 'warn' }) {
  const color = tone === 'warn' ? C.hp : C.muted;
  return (
    <Row style={{ gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 12, backgroundColor: tone === 'warn' ? C.hpTint : C.surface }}>
      <Icon name={icon} size={18} color={color} />
      <T size={13} color={tone === 'warn' ? C.ink : C.muted} style={{ flex: 1, lineHeight: 19 }}>
        {text}
      </T>
    </Row>
  );
}

export function Bar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: C.cardHi, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}
