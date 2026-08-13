'use client';

import React from 'react';
import Image from 'next/image';
import { TELEGRAM_BOT_USERNAME } from '@/config/telegramConfig';

interface TelegramAccessDeniedProps {
  botUsername?: string;
}

export const TelegramAccessDenied: React.FC<TelegramAccessDeniedProps> = ({
  botUsername = TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '',
}) => {
  const cleanBotHandle = botUsername.replace('@', '').trim();

  // Telegram usernames: only letters, digits, underscores (NO hyphens or spaces)
  const isValidTelegramUsername = /^[a-zA-Z0-9_]{5,32}$/.test(cleanBotHandle);

  // Valid username → https://t.me/YourBot (opens bot in Telegram or downloads page)
  // Invalid/empty  → tg:// deep link (directly opens installed Telegram app on device)
  const telegramBotUrl = isValidTelegramUsername
    ? `https://t.me/${cleanBotHandle}`
    : 'tg://';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-sky-500 selection:text-white relative overflow-hidden">
      {/* Background Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 text-center flex flex-col items-center">
        {/* Project Logo Badge with Telegram Accent */}
        <div className="relative mb-6 group">
          <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 p-2.5 shadow-xl flex items-center justify-center relative overflow-hidden transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Investment Platform Logo"
              width={72}
              height={72}
              className="object-contain w-full h-full"
              priority
            />
          </div>
          {/* Telegram Indicator Badge on Logo */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 border-2 border-slate-900 flex items-center justify-center shadow-lg">
            <svg
              className="w-4 h-4 text-white translate-x-[-0.5px]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.27-2.04-.49-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.66-2.87 8.01-3.43 3.81-1.59 4.6-1.87 5.12-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.01.07.01.21 0 .37z" />
            </svg>
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          Telegram Mini App Only
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          Access Restricted
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          This application can only be opened inside the official Telegram Mini App. Standard browser access is disabled.
        </p>

        {/* Access Steps Card */}
        <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-left mb-6 space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            How to open:
          </p>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <p className="text-xs text-slate-400">
              Open <strong className="text-slate-200">Telegram</strong> on your phone or desktop.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <p className="text-xs text-slate-400">
              {cleanBotHandle
                ? <>Search for our official bot{' '}<span className="text-sky-400 font-mono font-bold">@{cleanBotHandle}</span> and open it.</>
                : <>Search for our official bot and tap <strong className="text-slate-200">Open</strong>.</>
              }
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <p className="text-xs text-slate-400">
              Tap <strong className="text-slate-200">Launch App</strong> or menu button to start.
            </p>
          </div>
        </div>

        {/* Open Telegram Action Button */}
        <a
          href={telegramBotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-sky-500/25 transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <span>Open Telegram</span>
          <svg
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>

        {/* Security Disclaimer Note */}
        <p className="text-[11px] text-slate-500 mt-6 leading-tight">
          Protected by Telegram Environment Detection.
        </p>
      </div>
    </div>
  );
};
