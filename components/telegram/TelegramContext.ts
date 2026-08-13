'use client';

import { createContext } from 'react';
import { TelegramContextType } from './telegram.types';

export const initialTelegramContext: TelegramContextType = {
  isTelegram: false,
  isChecking: true,
  isReady: false,
  telegramWebApp: null,
  initData: '',
  initDataUnsafe: {},
  user: null,
  colorScheme: 'light',
  themeParams: {},
};

export const TelegramContext = createContext<TelegramContextType>(initialTelegramContext);
