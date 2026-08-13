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

/**
 * Your Official Telegram Bot @username (without @)
 *
 * IMPORTANT: Telegram usernames must:
 *   - Contain ONLY letters (a-z), digits (0-9), and underscores (_)
 *   - NOT contain hyphens (-), spaces, or special characters
 *   - Be 5–32 characters long
 *
 * HOW TO FIND YOUR BOT USERNAME:
 *   1. Open Telegram → search @BotFather
 *   2. Type /mybots → select your bot
 *   3. Copy the @username shown (e.g. 'HIIMS_Bot')
 *
 * Example: 'HIIMS_Bot' or 'InvestmentPlatform_bot'
 *
 * Leave empty ('') to open Telegram app directly without linking to a specific bot.
 */
export const TELEGRAM_BOT_USERNAME = 'InvestmentPlatformDventuresBot';
