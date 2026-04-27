"use client";

import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { getRegistrationVoucherByCodeOrNumber } from "@/lib/api/voucherApi";
import type { VoucherServiceItem } from "@/lib/api/voucherApi";

function getRequestErrorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    const data = e.response?.data as { message?: string } | undefined;
    if (typeof data?.message === "string" && data.message.trim() !== "") {
      return data.message.trim();
    }
    if (e.message) return e.message;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export type RegistrationVoucherPanelItem = VoucherServiceItem & { voucherCode: string };

export function normalizeRegistrationContactDigits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function flattenServices(
  services: Record<string, VoucherServiceItem[] | undefined> | undefined
): RegistrationVoucherPanelItem[] {
  if (!services || typeof services !== "object") return [];
  const out: RegistrationVoucherPanelItem[] = [];
  for (const [voucherCode, items] of Object.entries(services)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      out.push({ ...item, voucherCode });
    }
  }
  return out;
}

/**
 * Loads voucher bundle lines for the registration sidebar when contact number is 10 digits.
 */
export function useRegistrationVoucherPanel(contactNumber: string | undefined) {
  const [vouchers, setVouchers] = useState<RegistrationVoucherPanelItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const digits = useMemo(() => normalizeRegistrationContactDigits(contactNumber ?? ""), [contactNumber]);

  useEffect(() => {
    if (digits.length !== 10) {
      setVouchers([]);
      setFetchError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(() => {
      setIsLoading(true);
      setFetchError(null);
      void getRegistrationVoucherByCodeOrNumber(digits)
        .then((res) => {
          if (cancelled) return;
          if (res.success && res.data?.services) {
            const flat = flattenServices(res.data.services);
            setVouchers(flat);
            setFetchError(flat.length === 0 ? "Voucher Not Found" : null);
          } else {
            setVouchers([]);
            const msg = typeof res.message === "string" && res.message.trim() !== "" ? res.message.trim() : null;
            setFetchError(msg ?? "Voucher Not Found");
          }
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setVouchers([]);
          setFetchError(getRequestErrorMessage(e));
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [digits]);

  return { vouchers, isLoading, fetchError };
}
