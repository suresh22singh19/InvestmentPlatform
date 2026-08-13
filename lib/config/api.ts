/**
 * API Configuration
 * Base URL for all API endpoints
 * Uses environment variable if available, otherwise falls back to default
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://hiims.dikonia.in/api/v2";


