'use client';

import { useState, useEffect } from 'react';

export type MenuPosition = 'top' | 'side';
export type MenuBehavior = 'fixed' | 'collapsible';

interface MenuSettings {
  position: MenuPosition;
  behavior: MenuBehavior;
}

export function useMenuSettings() {
  const [settings, setSettings] = useState<MenuSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('menu-settings');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return {
      position: 'top',
      behavior: 'fixed'
    };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('menu-settings', JSON.stringify(settings));
    }
  }, [settings]);

  const updatePosition = (position: MenuPosition) => {
    setSettings(prev => ({ ...prev, position }));
  };

  const updateBehavior = (behavior: MenuBehavior) => {
    setSettings(prev => ({ ...prev, behavior }));
  };

  return {
    settings,
    updatePosition,
    updateBehavior
  };
}
