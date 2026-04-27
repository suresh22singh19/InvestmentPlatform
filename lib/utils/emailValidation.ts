const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

const ALLOWED_TLD_SUFFIXES = [
  "com",
  "in",
  "org",
  "net",
  "co.in",
  "co",
  "edu",
  "gov",
  "io",
  "ac.in",
];

export const sanitizeEmailInput = (value: string): string => {
  let sanitized = value.replace(/\s+/g, "").replace(/[^a-zA-Z0-9._+\-@]/g, "");

  const firstAtIndex = sanitized.indexOf("@");
  if (firstAtIndex !== -1) {
    const localPart = sanitized.slice(0, firstAtIndex + 1);
    const domainPart = sanitized.slice(firstAtIndex + 1).replace(/@/g, "").replace(/_/g, "");
    sanitized = `${localPart}${domainPart}`;
  }

  return sanitized.slice(0, 100);
};

export const isValidEmailAddress = (value?: string | null): boolean => {
  const email = (value || "").trim();
  if (!email) return true;

  if (!STRICT_EMAIL_REGEX.test(email)) return false;

  const domainPart = email.split("@")[1]?.toLowerCase() || "";
  if (!domainPart) return false;

  return ALLOWED_TLD_SUFFIXES.some((suffix) => domainPart.endsWith(`.${suffix}`));
};

