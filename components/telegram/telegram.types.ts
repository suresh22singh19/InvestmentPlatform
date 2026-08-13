export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface TelegramInitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
    photo_url?: string;
  };
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date?: number;
  hash?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
  onEvent?(eventType: string, eventHandler: (...args: unknown[]) => void): void;
  offEvent?(eventType: string, eventHandler: (...args: unknown[]) => void): void;
  sendData?(data: string): void;
  openLink?(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink?(url: string): void;
  showAlert?(message: string, callback?: () => void): void;
  showConfirm?(message: string, callback?: (confirmed: boolean) => void): void;
}

export interface TelegramContextType {
  /** True if the app is currently running inside an active Telegram WebApp / Mini App environment */
  isTelegram: boolean;
  /** True while initial client-side detection is executing */
  isChecking: boolean;
  /** True after Telegram WebApp SDK has been initialized and ready() was called */
  isReady: boolean;
  /** Direct reference to window.Telegram.WebApp object (null if unavailable or non-Telegram) */
  telegramWebApp: TelegramWebApp | null;
  /** Raw Telegram initData string passed by Telegram (for future server-side validation) */
  initData: string;
  /** Parsed, unverified initData object (frontend UI display ONLY - DO NOT use as trusted auth on server) */
  initDataUnsafe: TelegramInitDataUnsafe;
  /** Convenient accessor for current Telegram user profile data */
  user: TelegramUser | null;
  /** Current Telegram app color scheme ('light' or 'dark') */
  colorScheme: 'light' | 'dark';
  /** Telegram theme color parameters */
  themeParams: TelegramThemeParams;
}
