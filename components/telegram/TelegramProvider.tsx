'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { TelegramContext } from './TelegramContext';
import {
  TelegramContextType,
  TelegramInitDataUnsafe,
  TelegramThemeParams,
  TelegramUser,
  TelegramWebApp,
} from './telegram.types';

interface TelegramProviderProps {
  children: ReactNode;
}

export const TelegramProvider: React.FC<TelegramProviderProps> = ({ children }) => {
  const [state, setState] = useState<TelegramContextType>({
    isTelegram: false,
    isChecking: true,
    isReady: false,
    telegramWebApp: null,
    initData: '',
    initDataUnsafe: {},
    user: null,
    colorScheme: 'light',
    themeParams: {},
  });

  useEffect(() => {
    // Only execute detection on client side
    if (typeof window === 'undefined') return;

    const checkTelegramEnvironment = () => {
      const windowWithTelegram = window as unknown as {
        Telegram?: { WebApp?: TelegramWebApp };
      };
      const tg = windowWithTelegram.Telegram?.WebApp;
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      // Development mock bypass check (disabled in production unless process.env.NEXT_PUBLIC_ALLOW_BROWSER_DEV === 'true')
      const isDevMode = process.env.NODE_ENV === 'development';
      const urlParams = new URLSearchParams(search);
      const isMockTelegram = isDevMode && urlParams.get('mock_telegram') === 'true';

      // Telegram Mini App detection rules:
      // When opened inside Telegram Mini App, Telegram injects initData, platform name, or URL parameters like tgWebAppData.
      // In normal desktop browsers (Chrome/Firefox), even if script is loaded, initData is empty and platform is "unknown".
      const hasInitData = Boolean(tg?.initData && tg.initData.trim().length > 0);
      const hasInitDataUnsafe = Boolean(tg?.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0);
      const hasTelegramUrlParams = hash.includes('tgWebAppData') || search.includes('tgWebAppData');
      const isKnownTelegramPlatform = Boolean(
        tg?.platform && tg.platform !== 'unknown' && tg.platform.length > 0
      );

      const isTelegramEnvironment = Boolean(
        isMockTelegram ||
        hasInitData ||
        hasInitDataUnsafe ||
        hasTelegramUrlParams ||
        isKnownTelegramPlatform
      );

      if (isTelegramEnvironment && tg) {
        try {
          // Initialize Telegram WebApp SDK lifecycle methods safely
          if (typeof tg.ready === 'function') {
            tg.ready();
          }
          if (typeof tg.expand === 'function') {
            tg.expand();
          }
        } catch (err) {
          console.warn('[TelegramProvider] Error initializing Telegram WebApp SDK:', err);
        }

        const rawInitData = tg.initData || '';
        const initDataUnsafe = (tg.initDataUnsafe || {}) as TelegramInitDataUnsafe;
        const currentUser: TelegramUser | null = initDataUnsafe.user || null;
        const colorScheme = (tg.colorScheme as 'light' | 'dark') || 'light';
        const themeParams = (tg.themeParams || {}) as TelegramThemeParams;

        setState({
          isTelegram: true,
          isChecking: false,
          isReady: true,
          telegramWebApp: tg,
          initData: rawInitData,
          initDataUnsafe,
          user: currentUser,
          colorScheme,
          themeParams,
        });
      } else {
        // Normal web browser or non-Telegram environment detected
        setState({
          isTelegram: false,
          isChecking: false,
          isReady: false,
          telegramWebApp: tg || null,
          initData: '',
          initDataUnsafe: {},
          user: null,
          colorScheme: 'light',
          themeParams: {},
        });
      }
    };

    // Check immediately and also after script finishes loading if delayed
    checkTelegramEnvironment();

    // If script is loaded dynamically or delayed, re-verify on load
    const handleScriptLoad = () => {
      checkTelegramEnvironment();
    };

    window.addEventListener('TelegramWebAppReady', handleScriptLoad);

    // Fallback timer to finish checking if environment detection is slow
    const timer = setTimeout(() => {
      checkTelegramEnvironment();
    }, 300);

    return () => {
      window.removeEventListener('TelegramWebAppReady', handleScriptLoad);
      clearTimeout(timer);
    };
  }, []);

  return (
    <TelegramContext.Provider value={state}>
      {children}
    </TelegramContext.Provider>
  );
};
