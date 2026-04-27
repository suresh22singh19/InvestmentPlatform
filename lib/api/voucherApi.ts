/**
 * Voucher API — admin settings voucher lookup by phone or voucher code.
 */

import { apiClient } from "@/lib/api/axios";

export type VoucherServiceItem = {
  id: number;
  bundleId: string;
  title: string;
  description: string;
  type: string;
  benefit: string;
  action: string | null;
  active: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  isRedeem: number;
  /** When false, voucher is shown but Claim is disabled (registration lookup). */
  voucherAvailable?: boolean;
};

export type VoucherServicesMap = Record<string, VoucherServiceItem[]>;

export type VoucherUserDetail = {
  name: string;
  phone: string;
  email?: string;
  pincode?: string;
  patientId?: string | null;
  /** Present when API returns patient identifiers */
  uhid?: string;
  jsHealthCardNumber?: string;
};

export type VoucherLookupData = {
  services: VoucherServicesMap;
  userdetail: VoucherUserDetail;
  isExist: number;
  usageHistory: unknown[];
};

export type VoucherLookupResponse = {
  success: boolean;
  data: VoucherLookupData | null;
  message?: string;
  timestamp?: string;
  statusCode?: number;
};

const PATH = "admin/settings/voucher/getVoucherbyCodeOrNumber";

/** Registration flow: same shape as settings lookup, different base path + required voucher type. */
const REGISTRATION_VOUCHER_PATH = "admin/registration/getVoucherbyCodeOrNumber";

export const DEFAULT_REGISTRATION_VOUCHER_TYPE = "opd_consultation";

export async function getVoucherByCodeOrNumber(
  codeOrNumber: string
): Promise<VoucherLookupResponse> {
  const trimmed = codeOrNumber.trim();
  const { data } = await apiClient.get<VoucherLookupResponse>(PATH, {
    params: { codeOrNumber: trimmed },
  });
  return data;
}

export async function getRegistrationVoucherByCodeOrNumber(
  codeOrNumber: string,
  voucherType: string = DEFAULT_REGISTRATION_VOUCHER_TYPE
): Promise<VoucherLookupResponse> {
  const trimmed = codeOrNumber.trim();
  const { data } = await apiClient.get<VoucherLookupResponse>(REGISTRATION_VOUCHER_PATH, {
    params: { codeOrNumber: trimmed, voucherType },
  });
  return data;
}

/** GET admin/settings/voucher/redeemedHistory */
export type RedeemedVoucherHistoryItem = {
  id: string;
  voucherType: string;
  voucher: string;
  benefitMessage: string;
  uhid: string;
  patientId: number;
  invoiceId: number;
  orderId: number;
  branchId: number;
  createdAt: string;
  patientName: string;
};

export type RedeemedVoucherHistoryResponse = {
  success: boolean;
  data: RedeemedVoucherHistoryItem[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
};

export type RedeemedVoucherHistoryParams = {
  /** API allows exactly one of these filters per request. */
  uuid?: string;
  branchId?: number;
  patientName?: string;
  contactNumber?: string;
};

const REDEEMED_HISTORY_PATH = "admin/settings/voucher/redeemedHistory";

/**
 * GET redeemed history — backend requires exactly one query param among
 * uuid | branchId | patientName | contactNumber (not combinations).
 */
export async function getRedeemedVoucherHistory(
  params: RedeemedVoucherHistoryParams
): Promise<RedeemedVoucherHistoryResponse> {
  const digits = params.contactNumber?.replace(/\D/g, "").slice(-10) ?? "";
  const contactNumber = digits.length === 10 ? digits : undefined;
  const u = params.uuid?.trim() || undefined;
  const pn = params.patientName?.trim() || undefined;
  const bid = params.branchId;

  let single: Record<string, string | number>;
  if (contactNumber) {
    single = { contactNumber };
  } else if (u) {
    single = { uuid: u };
  } else if (pn) {
    single = { patientName: pn };
  } else if (bid != null && Number.isFinite(Number(bid))) {
    single = { branchId: Number(bid) };
  } else {
    throw new Error("Provide exactly one of: uuid, branchId, patientName, or contactNumber");
  }

  const { data } = await apiClient.get<RedeemedVoucherHistoryResponse>(REDEEMED_HISTORY_PATH, {
    params: single,
  });
  return data;
}
