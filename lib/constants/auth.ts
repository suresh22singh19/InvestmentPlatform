export const AUTH_STORAGE_KEYS = {
  TOKEN: "authToken",
  USER: "user",
} as const;

export const LOGIN_TYPES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  TEAM: "team",
  FIELD_USER: "field-user",
} as const;

export type LoginType = typeof LOGIN_TYPES[keyof typeof LOGIN_TYPES];
