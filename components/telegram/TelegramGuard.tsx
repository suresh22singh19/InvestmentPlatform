'use client';

import React, { ReactNode } from 'react';
import { useTelegram } from './useTelegram';
import { TelegramAccessDenied } from './TelegramAccessDenied';
import { TELEGRAM_ONLY } from '@/config/telegramConfig';

interface TelegramGuardProps {
  children: ReactNode;
}

export const TelegramGuard: React.FC<TelegramGuardProps> = ({ children }) => {
  const { isTelegram, isChecking } = useTelegram();

  // 1. Render Loading State while Telegram environment detection is running
  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          {/* Animated Spinner Outer Ring */}
          <div className="w-14 h-14 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin" />
          {/* Telegram Plane Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-sky-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.27-2.04-.49-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.66-2.87 8.01-3.43 3.81-1.59 4.6-1.87 5.12-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.01.07.01.21 0 .37z" />
            </svg>
          </div>
        </div>
        <p className="text-slate-400 text-sm font-medium mt-4 tracking-wide animate-pulse">
          Verifying Telegram Environment...
        </p>
      </div>
    );
  }

  // 2. If TELEGRAM_ONLY is enabled and user is NOT inside Telegram, render Access Denied UI
  if (TELEGRAM_ONLY && !isTelegram) {
    return <TelegramAccessDenied />;
  }

  // 3. Render Application UI (inside Telegram or when TELEGRAM_ONLY = false)
  return <>{children}</>;
};
