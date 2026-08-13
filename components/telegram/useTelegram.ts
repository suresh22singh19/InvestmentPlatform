'use client';

import { useContext } from 'react';
import { TelegramContext } from './TelegramContext';
import { TelegramContextType } from './telegram.types';

export const useTelegram = (): TelegramContextType => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};
