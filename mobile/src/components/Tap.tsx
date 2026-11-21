import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, tap } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
};

export function Tap({ label, onPress, variant = "primary", style }: Props) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    minWidth: tap.minWidth,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.olive,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  labelPrimary: {
    color: colors.white,
  },
  labelSecondary: {
    color: colors.ink,
  },
});
