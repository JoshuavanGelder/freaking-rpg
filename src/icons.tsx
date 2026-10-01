import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'settings'
  | 'plus'
  | 'arrow'
  | 'check'
  | 'user'
  | 'bag'
  | 'book'
  | 'scroll'
  | 'heart'
  | 'coin'
  | 'image'
  | 'info'
  | 'alert'
  | 'refresh'
  | 'trash'
  | 'pending';

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 22, color, strokeWidth = 2 }: Props) {
  const c = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  let body: React.ReactNode;
  switch (name) {
    case 'back':
      body = <Path {...c} d="M15 18l-6-6 6-6" />;
      break;
    case 'settings':
      body = (
        <>
          <Circle {...c} cx={12} cy={12} r={3} />
          <Path
            {...c}
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </>
      );
      break;
    case 'plus':
      body = <Path {...c} d="M12 5v14M5 12h14" />;
      break;
    case 'arrow':
      body = <Path {...c} d="M5 12h14M13 6l6 6-6 6" />;
      break;
    case 'check':
      body = <Path {...c} d="M20 6L9 17l-5-5" />;
      break;
    case 'user':
      body = (
        <>
          <Path {...c} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <Circle {...c} cx={12} cy={7} r={4} />
        </>
      );
      break;
    case 'bag':
      body = (
        <>
          <Path {...c} d="M6 8h12l-1 12H7z" />
          <Path {...c} d="M9 8V6a3 3 0 016 0v2" />
        </>
      );
      break;
    case 'book':
      body = <Path {...c} d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14z" />;
      break;
    case 'scroll':
      body = (
        <>
          <Path {...c} d="M8 3h11v15a3 3 0 01-3 3H6a3 3 0 01-3-3v-1h11v1a3 3 0 003 0" />
          <Path {...c} d="M8 3a3 3 0 00-3 3v11" />
          <Path {...c} d="M11 8h5M11 12h5" />
        </>
      );
      break;
    case 'heart':
      body = <Path fill={color} stroke="none" d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.4 5 7 5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.8 3.6 4.5 6.8C19.5 16.4 12 21 12 21z" />;
      break;
    case 'coin':
      body = (
        <>
          <Circle {...c} cx={12} cy={12} r={8} />
          <Path {...c} d="M12 8v8M9.5 10.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" />
        </>
      );
      break;
    case 'image':
      body = (
        <>
          <Rect {...c} x={3} y={3} width={18} height={18} rx={2} />
          <Circle {...c} cx={8.5} cy={8.5} r={1.5} />
          <Path {...c} d="M21 15l-5-5L5 21" />
        </>
      );
      break;
    case 'info':
      body = (
        <>
          <Circle {...c} cx={12} cy={12} r={9} />
          <Path {...c} d="M12 11v5M12 8h.01" />
        </>
      );
      break;
    case 'alert':
      body = (
        <>
          <Path {...c} d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          <Path {...c} d="M12 9v4M12 17h.01" />
        </>
      );
      break;
    case 'refresh':
      body = (
        <>
          <Path {...c} d="M21 12a9 9 0 11-2.6-6.4" />
          <Path {...c} d="M21 3v6h-6" />
        </>
      );
      break;
    case 'trash':
      body = (
        <>
          <Path {...c} d="M3 6h18" />
          <Path {...c} d="M8 6V4h8v2M6 6l1 14h10l1-14" />
        </>
      );
      break;
    case 'pending':
      body = <Circle {...c} cx={12} cy={12} r={8} strokeDasharray="4 4" />;
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
