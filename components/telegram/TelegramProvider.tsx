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

/**
 * Checks whether the current window context is a real Telegram Mini App.
 *
 * Key insight: telegram-web-app.js creates window.Telegram.WebApp in ALL browsers
 * (Chrome, Firefox, Safari, Edge) but with dummy/empty values:
 *   - initData      = ""           (empty — Chrome)
 *   - initDataUnsafe = {}          (empty — Chrome)
 *   - platform      = "unknown"    (Chrome)
 *
 * A REAL Telegram Mini App provides at minimum ONE of:
 *   1. Non-empty initData string (Telegram-signed)
 *   2. Non-empty initDataUnsafe with user/auth data
 *   3. tgWebAppData in URL hash/search (injected by Telegram launcher)
 *   4. platform !== "unknown"  (android/ios/tdesktop/macos/weba/webk/webz)
 *   5. window.TelegramWebviewProxy (native mobile Telegram WebView injection)
 */
function detectTelegramEnvironment(): { isTelegram: boolean; tg: TelegramWebApp | null } {
  const win = window as unknown as {
    Telegram?: { WebApp?: TelegramWebApp };
    TelegramWebviewProxy?: unknown;
  };

  const tg = win.Telegram?.WebApp ?? null;
  const hash = window.location.hash;
  const search = window.location.search;

  // --- Signals that ONLY appear inside a real Telegram Mini App ---
  const hasInitData = typeof tg?.initData === 'string' && tg.initData.trim().length > 0;

  const hasInitDataUnsafe =
    tg?.initDataUnsafe != null &&
    typeof tg.initDataUnsafe === 'object' &&
    Object.keys(tg.initDataUnsafe).length > 0;

  const hasTgUrlParam =
    hash.includes('tgWebAppData') ||
    hash.includes('tgWebAppVersion') ||
    search.includes('tgWebAppData') ||
    search.includes('tgWebAppVersion');

  const hasRealPlatform =
    typeof tg?.platform === 'string' &&
    tg.platform.length > 0 &&
    tg.platform !== 'unknown';

  const hasNativeProxy = Boolean(win.TelegramWebviewProxy);

  // Dev-only bypass: open URL with ?mock_telegram=true to test the app in browser
  const isMockDev =
    process.env.NODE_ENV === 'development' &&
    new URLSearchParams(search).get('mock_telegram') === 'true';

  const isTelegram = Boolean(
    isMockDev ||
    hasInitData ||
    hasInitDataUnsafe ||
    hasTgUrlParam ||
    hasRealPlatform ||
    hasNativeProxy
  );

  return { isTelegram, tg };
}

export const TelegramProvider: React.FC<TelegramProviderProps> = ({ children }) => {
  const [state, setState] = useState<TelegramContextType>({
    isTelegram: false,
    isChecking: true,   // Start in checking state — guard shows spinner, app never flashes
    isReady: false,
    telegramWebApp: null,
    initData: '',
    initDataUnsafe: {},
    user: null,
    colorScheme: 'light',
    themeParams: {},
  });

  useEffect(() => {
    // telegram-web-app.js is loaded with strategy="beforeInteractive" which means
    // it executes before any React hydration. A short delay of 150ms is enough
    // to guarantee window.Telegram.WebApp is fully populated before we read it.
    const DETECTION_DELAY_MS = 150;

    const timer = setTimeout(() => {
      const { isTelegram, tg } = detectTelegramEnvironment();

      if (isTelegram && tg) {
        // Initialize Telegram SDK lifecycle
        try { tg.ready?.(); } catch { /* noop */ }
        try { tg.expand?.(); } catch { /* noop */ }

        const initDataUnsafe = (tg.initDataUnsafe ?? {}) as TelegramInitDataUnsafe;

        setState({
          isTelegram: true,
          isChecking: false,
          isReady: true,
          telegramWebApp: tg,
          initData: tg.initData ?? '',
          initDataUnsafe,
          user: (initDataUnsafe.user as TelegramUser) ?? null,
          colorScheme: (tg.colorScheme as 'light' | 'dark') ?? 'light',
          themeParams: (tg.themeParams ?? {}) as TelegramThemeParams,
        });
      } else {
        // Standard browser (Chrome / Firefox / Safari / Edge) → block access
        setState({
          isTelegram: false,
          isChecking: false,
          isReady: false,
          telegramWebApp: tg,
          initData: '',
          initDataUnsafe: {},
          user: null,
          colorScheme: 'light',
          themeParams: {},
        });
      }
    }, DETECTION_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <TelegramContext.Provider value={state}>
      {children}
    </TelegramContext.Provider>
  );
};
