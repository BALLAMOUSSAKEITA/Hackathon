import type { ReactNode } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName =
  | "leaf"
  | "home"
  | "map"
  | "mic"
  | "badge"
  | "bell"
  | "drop"
  | "back"
  | "forward"
  | "scan"
  | "sun"
  | "bolt"
  | "search"
  | "close"
  | "cart"
  | "user"
  | "plus"
  | "minus"
  | "check"
  | "chart"
  | "settings"
  | "logout"
  | "globe"
  | "camera"
  | "send"
  | "volume"
  | "qr"
  | "alert"
  | "info"
  | "truck"
  | "calendar"
  | "satellite"
  | "clock"
  | "sliders"
  | "store"
  | "card"
  | "sprout"
  | "cloud"
  | "thermo"
  | "layers"
  | "wifiOff"
  | "shield"
  | "book"
  | "play"
  | "arrowRight"
  | "arrowLeft"
  | "money"
  | "basket"
  | "rain"
  | "flash"
  | "alertCircle"
  | "waves";

type Props = { name: IconName; color?: string; size?: number; strokeWidth?: number };

const TRACES: Record<IconName, ReactNode> = {
  leaf: (
    <>
      <Path d="M12 21v-9" />
      <Path d="M12 12C12 8 9 5 4 5c0 4 3 7 8 7z" />
      <Path d="M12 14c0-4 3-7 8-7 0 4-3 7-8 7z" />
    </>
  ),
  home: <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  map: (
    <>
      <Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <Path d="M9 4v14M15 6v14" />
    </>
  ),
  mic: (
    <>
      <Path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  badge: (
    <>
      <Circle cx="12" cy="9" r="6" />
      <Path d="M8.5 14L7 21l5-3 5 3-1.5-7" />
    </>
  ),
  bell: (
    <>
      <Path d="M6 9a6 6 0 0 1 12 0c0 6 2 8 2 8H4s2-2 2-8" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  drop: <Path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  forward: <Path d="M9 5l7 7-7 7" />,
  scan: (
    <>
      <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <Path d="M7 12h10" />
    </>
  ),
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  bolt: <Path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-4-4" />
    </>
  ),
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  cart: (
    <>
      <Circle cx="9" cy="20" r="1" />
      <Circle cx="18" cy="20" r="1" />
      <Path d="M3 4h2l2.2 11h11.3l2-7H7" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8" r="3.5" />
      <Path d="M5 20c1.5-3.2 4-4.8 7-4.8s5.5 1.6 7 4.8" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7" />,
  chart: (
    <>
      <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  logout: (
    <>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  globe: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  camera: (
    <>
      <Path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>
  ),
  send: <Path d="M4 12l16-8-6 16-2.5-6.5z" />,
  volume: (
    <>
      <Path d="M4 9v6h4l5 4V5L8 9z" />
      <Path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  qr: (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="3" width="7" height="7" rx="1" />
      <Rect x="3" y="14" width="7" height="7" rx="1" />
      <Path d="M14 14h3v3h-3zM20 14v.01M17 20h4v-3M14 20v.01" />
    </>
  ),
  alert: (
    <>
      <Path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <Path d="M12 9v4M12 17v.01" />
    </>
  ),
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v5M12 8v.01" />
    </>
  ),
  truck: (
    <>
      <Path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
      <Circle cx="7" cy="18" r="1.8" />
      <Circle cx="17" cy="18" r="1.8" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3" y="5" width="18" height="16" rx="2" />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  satellite: (
    <>
      <Path d="M4 10a10 10 0 0 0 10 10z" />
      <Path d="M9 15l5-5" />
      <Circle cx="15" cy="9" r="1.5" />
      <Path d="M14 4a6 6 0 0 1 6 6" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  sliders: <Path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />,
  store: (
    <>
      <Path d="M4 10v10h16V10" />
      <Path d="M3 4h18l-1.5 6a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0z" />
      <Path d="M10 20v-5h4v5" />
    </>
  ),
  card: (
    <>
      <Rect x="2" y="5" width="20" height="14" rx="2" />
      <Path d="M2 10h20M6 15h4" />
    </>
  ),
  sprout: (
    <>
      <Path d="M12 21v-8" />
      <Path d="M12 13c0-3.5-2.5-6-7-6 0 3.5 2.5 6 7 6z" />
      <Path d="M12 11c0-3.5 2.5-7 7-7 0 4-2.5 7-7 7z" />
    </>
  ),
  cloud: <Path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5 4.8 4.8 0 0 1 17.5 18z" />,
  thermo: (
    <>
      <Path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" />
    </>
  ),
  layers: (
    <>
      <Path d="M12 3l9 5-9 5-9-5z" />
      <Path d="M3 13l9 5 9-5" />
    </>
  ),
  wifiOff: (
    <>
      <Path d="M3 3l18 18" />
      <Path d="M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5-2.6M14.5 10a10 10 0 0 1 4.5 2.5M2 9a15 15 0 0 1 4.5-2.8M11 5.1A15 15 0 0 1 22 9M12 20v.01" />
    </>
  ),
  shield: (
    <>
      <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <Path d="M9 12l2 2 4-4" />
    </>
  ),
  book: (
    <>
      <Path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" />
      <Path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />
    </>
  ),
  play: <Path d="M8 5v14l11-7z" />,
  arrowRight: <Path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <Path d="M19 12H5M11 6l-6 6 6 6" />,
  money: (
    <>
      <Rect x="3" y="6" width="18" height="12" rx="2" />
      <Circle cx="12" cy="12" r="2.5" />
    </>
  ),
  basket: (
    <>
      <Path d="M4 10h16l-1.5 10h-13z" />
      <Path d="M8 10l4-6 4 6" />
    </>
  ),
  rain: (
    <>
      <Path d="M7 16a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 16z" />
      <Path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" />
    </>
  ),
  flash: <Path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  alertCircle: (
    <>
      <Path d="M12 8v5M12 16.5v.5" />
      <Circle cx="12" cy="12" r="9" />
    </>
  ),
  waves: <Path d="M3 9c3-2 6 2 9 0s6-2 9 0M3 15c3-2 6 2 9 0s6-2 9 0" />,
};

export function Icon({ name, color = "#2E5E3A", size = 22, strokeWidth = 2 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRACES[name]}
    </Svg>
  );
}
