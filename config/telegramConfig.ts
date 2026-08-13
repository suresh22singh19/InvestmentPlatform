/**
 * ====================================================================
 * TELEGRAM MINI APP ACCESS MODE CONFIGURATION
 * ====================================================================
 *
 * TELEGRAM_ONLY = true
 *   - Production / Telegram-Only Mode.
 *   - Restricts application access ONLY to the official Telegram Mini App.
 *   - Direct browser access (Chrome, Firefox, Safari, Edge) displays the Access Denied screen.
 *
 * TELEGRAM_ONLY = false
 *   - Local Development / Normal Browser Mode.
 *   - Disables access restrictions so you can test in standard desktop browsers.
 *   - Telegram WebApp SDK still initializes normally when opened in Telegram.
 * ====================================================================
 */

export const TELEGRAM_ONLY = true;
