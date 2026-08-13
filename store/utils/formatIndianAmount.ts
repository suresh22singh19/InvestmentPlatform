/**
 * Formats a number or numeric string into a comma-separated string
 * based on the Indian numbering system (en-IN).
 *
 * Examples:
 * - 10000000       -> "1,00,00,000"
 * - "45454543.00"  -> "4,54,54,543.00"
 * - "50000"        -> "50,000"
 * - null / undefined / "" -> "0"
 */
export const formatIndianAmount = (amount?: number | string | null): string => {
  if (amount === null || amount === undefined || amount === "") return "0";

  const strAmount = String(amount).trim();
  const parts = strAmount.split(".");
  const numericInteger = Number(parts[0]);

  if (isNaN(numericInteger)) return "0";

  const formattedInteger = new Intl.NumberFormat("en-IN").format(numericInteger);

  if (parts.length > 1) {
    return `${formattedInteger}.${parts[1]}`;
  }
  return formattedInteger;
};

/**
 * Formats an amount with currency symbol (e.g., "₹4,54,54,543.00").
 */
export const formatIndianCurrency = (
  amount?: number | string | null,
  symbol: string = "₹"
): string => {
  const formatted = formatIndianAmount(amount);
  return `${symbol}${formatted}`;
};

/**
 * Utility to strip commas from a formatted amount string.
 * Useful for raw numeric input processing or API payloads.
 */
export const parseIndianAmount = (formattedAmount?: number | string | null): string => {
  if (formattedAmount === null || formattedAmount === undefined || formattedAmount === "") return "";
  return String(formattedAmount).replace(/,/g, "").trim();
};
