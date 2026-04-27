/**
 * API Exports
 * Purpose: Centralized exports for API utilities
 */

export { apiClient, default as axios } from "./axios";
export { API_BASE_URL } from "@/lib/config/api";
export {
  getVoucherByCodeOrNumber,
  getRegistrationVoucherByCodeOrNumber,
  DEFAULT_REGISTRATION_VOUCHER_TYPE,
  getRedeemedVoucherHistory,
  type RedeemedVoucherHistoryItem,
  type RedeemedVoucherHistoryParams,
  type RedeemedVoucherHistoryResponse,
  type VoucherLookupData,
  type VoucherLookupResponse,
  type VoucherServiceItem,
  type VoucherServicesMap,
  type VoucherUserDetail,
} from "./voucherApi";

