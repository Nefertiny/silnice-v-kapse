import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'route'
  | 'car'
  | 'star'
  | 'ticket'
  | 'wrench'
  | 'shield'
  | 'bell'
  | 'bolt'
  | 'back'
  | 'chevron'
  | 'swap'
  | 'spark'
  | 'alert'
  | 'check'
  | 'plus'
  | 'minus'
  | 'refresh'
  | 'lock'
  | 'trash'
  | 'camera'
  | 'phone'
  | 'pin'
  | 'doc'
  | 'close';

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: Props) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />}
      {name === 'route' && (
        <>
          <Circle {...p} cx="6" cy="19" r="2" />
          <Circle {...p} cx="18" cy="5" r="2" />
          <Path {...p} d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8" />
        </>
      )}
      {name === 'car' && (
        <>
          <Path {...p} d="M3 13l2-6h14l2 6v4H3z" />
          <Path {...p} d="M5 17v2M19 17v2" />
          <Circle {...p} cx="7.5" cy="13.5" r="1" />
          <Circle {...p} cx="16.5" cy="13.5" r="1" />
        </>
      )}
      {name === 'star' && <Path {...p} d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />}
      {name === 'ticket' && (
        <>
          <Path {...p} d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" />
          <Path {...p} d="M14 8v2M14 12v2" />
        </>
      )}
      {name === 'wrench' && <Path {...p} d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />}
      {name === 'shield' && (
        <>
          <Path {...p} d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
          <Path {...p} d="M9 12l2 2 4-4" />
        </>
      )}
      {name === 'bell' && (
        <>
          <Path {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <Path {...p} d="M10 20a2 2 0 0 0 4 0" />
        </>
      )}
      {name === 'bolt' && <Path {...p} d="M13 2L4 14h7l-1 8 9-12h-7z" />}
      {name === 'back' && <Path {...p} d="M15 5l-7 7 7 7" />}
      {name === 'chevron' && <Path {...p} d="M9 5l7 7-7 7" />}
      {name === 'swap' && <Path {...p} d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />}
      {name === 'spark' && (
        <Path {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
      )}
      {name === 'alert' && (
        <>
          <Path {...p} d="M12 3l10 18H2z" />
          <Path {...p} d="M12 10v5M12 18v.5" />
        </>
      )}
      {name === 'check' && <Path {...p} d="M5 12l5 5 9-10" />}
      {name === 'plus' && <Path {...p} d="M12 5v14M5 12h14" />}
      {name === 'minus' && <Path {...p} d="M5 12h14" />}
      {name === 'refresh' && (
        <>
          <Path {...p} d="M20 11a8 8 0 1 0-2.3 5.7" />
          <Path {...p} d="M20 5v6h-6" />
        </>
      )}
      {name === 'lock' && (
        <>
          <Path {...p} d="M6 11h12v9H6z" />
          <Path {...p} d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
        </>
      )}
      {name === 'trash' && <Path {...p} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />}
      {name === 'camera' && (
        <>
          <Path {...p} d="M3 8h4l2-3h6l2 3h4v11H3z" />
          <Circle {...p} cx="12" cy="13" r="3.5" />
        </>
      )}
      {name === 'phone' && (
        <Path {...p} d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />
      )}
      {name === 'pin' && (
        <>
          <Path {...p} d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
          <Circle {...p} cx="12" cy="9" r="2.5" />
        </>
      )}
      {name === 'doc' && (
        <>
          <Path {...p} d="M6 3h8l4 4v14H6z" />
          <Path {...p} d="M14 3v4h4M9 12h6M9 16h6" />
        </>
      )}
      {name === 'close' && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
    </Svg>
  );
}
