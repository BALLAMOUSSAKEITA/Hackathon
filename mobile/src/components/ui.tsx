import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n } from "../i18n";
import { aLabelEau, colors, labelEau, police, radius, space, tap } from "../theme";
import { BackButton } from "./chrome";
import { Icon, type IconName } from "./icons";

/* ------------------------------------------------------------------ */
/* Texte                                                               */
/* ------------------------------------------------------------------ */

type Variante = "display" | "title" | "h2" | "h3" | "body" | "small" | "tiny" | "kicker";

export function Txt({
  children,
  variant = "body",
  color,
  center = false,
  bold = false,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: Variante;
  color?: string;
  center?: boolean;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { align } = useI18n();
  const plat = StyleSheet.flatten([typo[variant], color ? { color } : null, bold ? { fontWeight: "800" as const } : null, style]);
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ textAlign: center ? "center" : align }, plat, police(plat?.fontWeight)]}
    >
      {children}
    </Text>
  );
}

const typo = StyleSheet.create({
  display: { fontSize: 32, lineHeight: 38, fontWeight: "800", color: colors.ink, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  h2: { fontSize: 17, lineHeight: 23, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  h3: { fontSize: 15, lineHeight: 20, fontWeight: "800", color: colors.ink },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "400", color: colors.body },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "500", color: colors.muted },
  tiny: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: colors.muted },
  kicker: { fontSize: 12, lineHeight: 16, fontWeight: "800", color: colors.olive, letterSpacing: 0.6, textTransform: "uppercase" },
});

/* ------------------------------------------------------------------ */
/* Écran                                                               */
/* ------------------------------------------------------------------ */

export function Screen({
  children,
  tabs,
  footer,
  scroll = true,
  keyboard = false,
  background = colors.bg,
  contentStyle,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  tabs?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { direction } = useI18n();
  const corps = scroll ? (
    <ScrollView
      style={{ direction }}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.olive} colors={[colors.olive]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, direction }, contentStyle]}>{children}</View>
  );
  const interieur = (
    <>
      {corps}
      {footer ? <View style={[styles.footer, { direction }]}>{footer}</View> : null}
    </>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={tabs ? ["top"] : ["top", "bottom"]}>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {interieur}
        </KeyboardAvoidingView>
      ) : (
        interieur
      )}
      {tabs}
    </SafeAreaView>
  );
}

/** En-tête d'écran : retour facultatif, titre, sous-titre et action à droite. */
export function Header({
  title,
  subtitle,
  back = false,
  right,
  light = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  light?: boolean;
}) {
  return (
    <View style={styles.header}>
      {back ? <BackButton light={light} /> : null}
      <View style={styles.flex}>
        <Txt variant="title" color={light ? colors.white : undefined}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" color={light ? colors.leaf : undefined} style={styles.subtitle}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

type Ton = "default" | "olive" | "soft" | "dark" | "danger" | "warning" | "info" | "outline";

const TONS: Record<Ton, ViewStyle> = {
  default: { backgroundColor: colors.card },
  outline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  olive: { backgroundColor: colors.olive },
  soft: { backgroundColor: colors.oliveSoft },
  dark: { backgroundColor: colors.ink },
  danger: { backgroundColor: colors.claySoft },
  warning: { backgroundColor: colors.sand },
  info: { backgroundColor: colors.waterSoft },
};

export function Card({
  children,
  tone = "default",
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  tone?: Ton;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, TONS[tone], pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, TONS[tone], style]}>{children}</View>;
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Txt variant="h2" style={styles.flex}>
          {title}
        </Txt>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10} style={styles.sectionAction}>
            <Text style={styles.link}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

/* ------------------------------------------------------------------ */
/* Boutons                                                             */
/* ------------------------------------------------------------------ */

type VarianteBouton = "primary" | "secondary" | "ghost" | "light" | "danger" | "outlineLight";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  small = false,
  arrow = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: VarianteBouton;
  icon?: IconName;
  /** Flèche après le libellé, comme les boutons d'action des maquettes. */
  arrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const couleur = BOUTON_TEXTE[variant];
  const inactif = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: loading }}
      disabled={inactif}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        BOUTON_FOND[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={couleur} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={couleur} size={small ? 18 : 20} /> : null}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: couleur }]} numberOfLines={1}>
            {label}
          </Text>
          {arrow ? <Arrow color={couleur} /> : null}
        </>
      )}
    </Pressable>
  );
}

function Arrow({ color }: { color: string }) {
  const { direction } = useI18n();
  return <Icon name={direction === "rtl" ? "arrowLeft" : "arrowRight"} color={color} size={20} />;
}

const BOUTON_FOND: Record<VarianteBouton, ViewStyle> = {
  primary: { backgroundColor: colors.olive },
  secondary: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.olive },
  ghost: { backgroundColor: colors.oliveSoft },
  light: { backgroundColor: colors.white },
  danger: { backgroundColor: colors.clay },
  outlineLight: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" },
};

const BOUTON_TEXTE: Record<VarianteBouton, string> = {
  primary: colors.white,
  secondary: colors.olive,
  ghost: colors.olive,
  light: colors.olive,
  danger: colors.white,
  outlineLight: colors.white,
};

export function IconButton({
  icon,
  onPress,
  label,
  tone = "light",
  badge,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: "light" | "olive" | "mist" | "dark";
  badge?: number | boolean;
}) {
  const fond = { light: colors.card, olive: colors.olive, mist: colors.oliveMist, dark: "#2A372D" }[tone];
  const trait = tone === "olive" || tone === "dark" ? colors.white : colors.olive;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: fond }, pressed && styles.pressed]}
    >
      <Icon name={icon} color={trait} size={22} />
      {badge ? (
        <View style={[styles.badge, typeof badge === "number" ? styles.badgeCount : styles.badgeDot]}>
          {typeof badge === "number" ? <Text style={styles.badgeText}>{badge}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Sélection                                                           */
/* ------------------------------------------------------------------ */

export function Chips<T extends string>({
  options,
  value,
  onChange,
  equal = false,
}: {
  options: { id: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (id: T) => void;
  equal?: boolean;
}) {
  return (
    <View style={[styles.chips, equal && styles.chipsEqual]} accessibilityRole="radiogroup">
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [styles.chip, equal && styles.flex, on && styles.chipOn, pressed && styles.pressed]}
          >
            {option.icon ? <Icon name={option.icon} color={on ? colors.white : colors.olive} size={18} /> : null}
            <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onMinus,
  onPlus,
  label,
  minusDisabled,
}: {
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  label?: string;
  minusDisabled?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `− ${label}` : "−"}
        disabled={minusDisabled}
        onPress={onMinus}
        style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed, minusDisabled && styles.disabled]}
      >
        <Icon name="minus" color={colors.olive} size={18} strokeWidth={2.6} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `+ ${label}` : "+"}
        onPress={onPlus}
        style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}
      >
        <Icon name="plus" color={colors.olive} size={18} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Données                                                             */
/* ------------------------------------------------------------------ */

export function Stat({
  value,
  label,
  icon,
  color = colors.ink,
  iconColor,
  style,
}: {
  value: string;
  label: string;
  icon?: IconName;
  color?: string;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.stat, style]}>
      {icon ? <Icon name={icon} color={iconColor ?? colors.olive} size={20} /> : null}
      <Txt variant="h2" color={color} numberOfLines={1}>
        {value}
      </Txt>
      <Txt variant="tiny">{label}</Txt>
    </View>
  );
}

export function LabelBadge({ note, size = 44 }: { note: string | null | undefined; size?: number }) {
  if (!aLabelEau(note)) return null;
  const iconSize = Math.round(size * 0.42);
  return (
    <View
      accessibilityLabel="Label Eau"
      style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: labelEau.bg, alignItems: "center", justifyContent: "center", gap: 1 }}
    >
      <Icon name="drop" color={labelEau.fg} size={iconSize} strokeWidth={2} />
      <Text style={{ color: labelEau.fg, fontSize: Math.round(size * 0.22), letterSpacing: 0.5, ...police("800") }}>EAU</Text>
    </View>
  );
}

export function Pill({ text, tone = "olive", icon }: { text: string; tone?: "olive" | "clay" | "amber" | "water" | "muted" | "white"; icon?: IconName }) {
  const t = {
    olive: { bg: colors.oliveSoft, fg: colors.olive },
    clay: { bg: colors.claySoft, fg: colors.clay },
    amber: { bg: colors.sand, fg: colors.amber },
    water: { bg: colors.waterSoft, fg: colors.water },
    muted: { bg: "#EEF1EA", fg: colors.muted },
    white: { bg: "rgba(255,255,255,0.18)", fg: colors.white },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} color={t.fg} size={13} strokeWidth={2.4} /> : null}
      <Text style={[styles.pillText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export function Progress({ value, color = colors.olive, track = colors.oliveSoft, height = 8 }: { value: number; color?: string; track?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function IconCircle({ icon, tone = "olive", size = 44 }: { icon: IconName; tone?: "olive" | "amber" | "water" | "clay" | "solid"; size?: number }) {
  const t = {
    olive: { bg: colors.oliveSoft, fg: colors.olive },
    amber: { bg: colors.sand, fg: colors.amber },
    water: { bg: colors.waterSoft, fg: colors.water },
    clay: { bg: colors.claySoft, fg: colors.clay },
    solid: { bg: colors.olive, fg: colors.white },
  }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} color={t.fg} size={size * 0.48} />
    </View>
  );
}

export function ListRow({
  icon,
  iconTone,
  title,
  subtitle,
  right,
  onPress,
  last = false,
}: {
  icon?: IconName;
  iconTone?: "olive" | "amber" | "water" | "clay" | "solid";
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const contenu = (
    <>
      {icon ? <IconCircle icon={icon} tone={iconTone} size={40} /> : null}
      <View style={styles.flex}>
        <Txt variant="h3">{title}</Txt>
        {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
      </View>
      {right ?? (onPress ? <Chevron /> : null)}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.listRow, !last && styles.listRowLine, pressed && styles.pressedRow]}
      >
        {contenu}
      </Pressable>
    );
  }
  return <View style={[styles.listRow, !last && styles.listRowLine]}>{contenu}</View>;
}

export function Chevron({ color = colors.muted }: { color?: string }) {
  const { direction } = useI18n();
  return <Icon name={direction === "rtl" ? "back" : "forward"} color={color} size={18} />;
}

/* ------------------------------------------------------------------ */
/* Formulaires et messages                                             */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  value,
  onChangeText,
  unit,
  keyboardType,
  placeholder,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (texte: string) => void;
  unit?: string;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  hint?: string;
  error?: boolean;
}) {
  const { align } = useI18n();
  return (
    <View style={styles.field}>
      <Txt variant="h3">{label}</Txt>
      <View style={[styles.input, error && styles.inputError]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={[styles.inputText, { textAlign: align }]}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {hint ? <Txt variant="small">{hint}</Txt> : null}
    </View>
  );
}

export function Notice({
  text,
  tone = "info",
  action,
}: {
  text: string;
  tone?: "info" | "success" | "error" | "warning";
  action?: { label: string; onPress: () => void };
}) {
  const t = {
    info: { bg: colors.waterSoft, fg: colors.water, icon: "info" as IconName },
    success: { bg: colors.oliveSoft, fg: colors.olive, icon: "check" as IconName },
    error: { bg: colors.claySoft, fg: colors.clay, icon: "alert" as IconName },
    warning: { bg: colors.sand, fg: colors.amber, icon: "alert" as IconName },
  }[tone];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: t.bg }]}>
      <Icon name={t.icon} color={t.fg} size={20} />
      <View style={styles.flex}>
        <Txt variant="small" color={t.fg} bold>
          {text}
        </Txt>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <Text style={[styles.link, { color: t.fg }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Note d'hypothèse ou de source, discrète, en bas d'écran. */
export function Footnote({ children }: { children: ReactNode }) {
  return (
    <View style={styles.footnote}>
      <Icon name="info" color={colors.muted} size={14} />
      <Txt variant="tiny" style={styles.flex}>
        {children}
      </Txt>
    </View>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={colors.olive} />
      {label ? <Txt variant="small">{label}</Txt> : null}
    </View>
  );
}

export function Link({ label, onPress, color = colors.olive }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={styles.linkWrap}>
      <Text style={[styles.link, { color }]}>{label}</Text>
      <Chevron color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxl + 8, gap: 18 },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: colors.bg,
    gap: space.sm,
  },
  header: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 48 },
  subtitle: { marginTop: 2 },
  card: { borderRadius: 18, padding: space.lg, gap: space.sm },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  pressedRow: { backgroundColor: colors.oliveSoft },
  disabled: { opacity: 0.45 },
  section: { gap: space.md },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  sectionAction: { minHeight: 32, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  link: { color: colors.olive, ...police("800"), fontSize: 14 },
  linkWrap: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32, alignSelf: "flex-start" },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  buttonSmall: { minHeight: tap.minHeight, borderRadius: 12, paddingHorizontal: space.md },
  buttonText: { fontSize: 16, ...police("800"), flexShrink: 1 },
  buttonTextSmall: { fontSize: 14 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", backgroundColor: colors.clay, borderWidth: 2, borderColor: colors.white },
  badgeDot: { top: 8, right: 9, width: 11, height: 11, borderRadius: 6 },
  badgeCount: { top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: colors.white, fontSize: 11, ...police("800") },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chipsEqual: { flexWrap: "nowrap" },
  chip: {
    minHeight: tap.minHeight,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chipOn: { backgroundColor: colors.olive, borderColor: colors.olive },
  chipText: { color: colors.ink, ...police("700"), fontSize: 14 },
  chipTextOn: { color: colors.white, ...police("800") },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.sm },
  stepperBtn: {
    width: tap.minWidth,
    height: tap.minHeight,
    borderRadius: 22,
    backgroundColor: colors.oliveSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { minWidth: 56, textAlign: "center", fontSize: 16, ...police("800"), color: colors.ink },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: space.md, gap: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 12, ...police("800") },
  listRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60, paddingVertical: space.sm },
  listRowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  field: { gap: 6 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  inputError: { borderColor: colors.clay },
  inputText: { ...police("500"), flex: 1, fontSize: 16, color: colors.ink, paddingVertical: space.sm },
  unit: { fontSize: 15, ...police("700"), color: colors.muted },
  notice: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.md },
  footnote: { flexDirection: "row", gap: 6, alignItems: "flex-start", paddingTop: space.xs },
  loader: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, justifyContent: "center" },
});
