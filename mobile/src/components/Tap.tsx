import type { StyleProp, ViewStyle } from "react-native";

import { Button } from "./ui";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
};

/** Ancien bouton, conservé pour compatibilité : utilise Button. */
export function Tap({ label, onPress, variant = "primary", style }: Props) {
  return <Button label={label} onPress={onPress} variant={variant} style={style} />;
}
