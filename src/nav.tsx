import React, { createContext, useContext } from 'react';
import type { World } from './logic/types';

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'hero'; world: World }
  | { name: 'story'; id: string }
  | { name: 'sheet'; id: string }
  | { name: 'gallery'; id: string }
  | { name: 'settings' };

export type Nav = {
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => void;
  home: () => void;
};

const NavCtx = createContext<Nav | null>(null);

export function useNav(): Nav {
  const n = useContext(NavCtx);
  if (!n) throw new Error('useNav buiten NavProvider');
  return n;
}

export function NavProvider({ value, children }: { value: Nav; children: React.ReactNode }) {
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>;
}
