"use client";

import Image from "next/image";
import { useMemo, useEffect } from "react";
import { FormInputField, FormSelectField, DatePicker } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface IpdOpdDetailsFormData {
  bookingType: "opd" | "ipd";
  appointmentDate: string;
  timeSlot: string;
  packageId: string;
  startDate: string;
  endDate: string;
  amount: string;
  paymentMode: string;
  paymentMethod: string;
  transactionId: string;
}

const OPD_TIME_SLOTS: SelectOption[] = [
  { value: "10:00am - 12:00pm", label: "10:00am - 12:00pm" },
  { value: "11:00am - 01:00pm", label: "11:00am - 01:00pm" },
  { value: "12:00pm - 02:00pm", label: "12:00pm - 02:00pm" },
  { value: "01:00pm - 03:00pm", label: "01:00pm - 03:00pm" },
  { value: "02:00pm - 04:00pm", label: "02:00pm - 04:00pm" },
  { value: "03:00pm - 05:00pm", label: "03:00pm - 05:00pm" },
  { value: "04:00pm - 06:00pm", label: "04:00pm - 06:00pm" },
];

const getTodayDate = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const DEFAULT_MAX_ADVANCE_BOOKING_DAYS = 45;

const getMaxAppointmentDate = (advanceDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + advanceDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface IpdOpdDetailsProps {
  formData: IpdOpdDetailsFormData;
  onChange: (field: keyof IpdOpdDetailsFormData, value: string) => void;
  onBlur?: (field: keyof IpdOpdDetailsFormData) => void;
  packageOptions?: SelectOption[];
  paymentModeOptions?: SelectOption[];
  paymentMethodOptions?: SelectOption[];
  fieldRefs?: {
    appointmentDate?: React.RefObject<HTMLDivElement | null>;
    timeSlot?: React.RefObject<HTMLDivElement | null>;
    packageId?: React.RefObject<HTMLDivElement | null>;
    startDate?: React.RefObject<HTMLDivElement | null>;
    endDate?: React.RefObject<HTMLDivElement | null>;
    amount?: React.RefObject<HTMLInputElement | null>;
    paymentMode?: React.RefObject<HTMLDivElement | null>;
    paymentMethod?: React.RefObject<HTMLDivElement | null>;
    transactionId?: React.RefObject<HTMLInputElement | null>;
  };
  errors?: Record<string, string>;
  /** From master setting `prebooking` (metaValueOne); max selectable day is today + this many days. */
  maxAdvanceBookingDays?: number;
}

const defaultPaymentModeOptions: SelectOption[] = [
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

const defaultPaymentMethodOptions: SelectOption[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "netbanking", label: "Net Banking" },
];

export default function IpdOpdDetails({
  formData,
  onChange,
  onBlur,
  packageOptions = [],
  paymentModeOptions = defaultPaymentModeOptions,
  paymentMethodOptions = defaultPaymentMethodOptions,
  fieldRefs,
  errors,
  maxAdvanceBookingDays = DEFAULT_MAX_ADVANCE_BOOKING_DAYS,
}: IpdOpdDetailsProps) {
  const isOpd = formData.bookingType === "opd";
  const maxAppointmentDateStr = useMemo(
    () => getMaxAppointmentDate(maxAdvanceBookingDays),
    [maxAdvanceBookingDays],
  );

  useEffect(() => {
    if (isOpd && !formData.appointmentDate) {
      onChange("appointmentDate", getTodayDate());
    }
  }, [isOpd, formData.appointmentDate, onChange]);

  const availableTimeSlots = useMemo(() => {
    if (!formData.appointmentDate) return OPD_TIME_SLOTS;
    const appointmentDate = new Date(formData.appointmentDate);
    const today = new Date();
    const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (appointmentDateOnly > todayOnly) return OPD_TIME_SLOTS;
    if (appointmentDateOnly.getTime() === todayOnly.getTime()) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentMinutes = currentHour * 60 + currentMinute;
      const filtered = OPD_TIME_SLOTS.filter((slot) => {
        // Always keep the currently selected slot so a pre-filled value is never hidden.
        if (formData.timeSlot && slot.value === formData.timeSlot) return true;
        const parts = slot.value.split(/\s*-\s*/);
        if (parts.length !== 2) return true;
        const parseTimeToHourLocal = (s: string): number | null => {
          const t = s.trim().toLowerCase();
          const pm = t.endsWith("pm");
          const am = t.endsWith("am");
          if (!pm && !am) return null;
          const numPart = t.replace(/(am|pm)$/, "").trim();
          const match = numPart.match(/^(\d{1,2})(?::(\d{2}))?/);
          if (!match) return null;
          let h = parseInt(match[1], 10);
          if (isNaN(h) || h < 1 || h > 12) return null;
          if (pm && h !== 12) h += 12;
          if (am && h === 12) h = 0;
          return h;
        };
        const startHour = parseTimeToHourLocal(parts[0]);
        const endHour = parseTimeToHourLocal(parts[1]);
        if (startHour == null || endHour == null) return true;
        const normalizedEnd = endHour <= startHour ? endHour + 24 : endHour;
        const durationHours = normalizedEnd - startHour;
        const cutoffMinutes = durationHours >= 2 ? startHour * 60 + 61 : normalizedEnd * 60;
        return currentMinutes < cutoffMinutes;
      });
      return filtered;
    }
    return OPD_TIME_SLOTS;
  }, [formData.appointmentDate, formData.timeSlot]);

  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
    <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
        <Image src="/icons/CalendarDarkIcon.svg" alt="Appointment info" width={20} height={20} /> Appointment Information
    </h4>
      {/* <div className="mb-4 w-[450px]">
        <PatientTypeButtonGroup
          options={["OPD", "IPD"]}
          value={(formData.bookingType || "opd").toLowerCase()}
          disabledOptions={["ipd"]}
          onChange={(value) => {
            const v = value.toLowerCase() as "opd" | "ipd";
            onChange("bookingType", v);
            if (v === "ipd") {
              onChange("appointmentDate", "");
              onChange("timeSlot", "");
            } else {
              onChange("packageId", "");
              onChange("startDate", "");
              onChange("endDate", "");
              onChange("amount", "");
              onChange("paymentMode", "");
              onChange("paymentMethod", "");
              onChange("transactionId", "");
            }
            setTimeout(() => onBlur?.("bookingType"), 0);
          }}
          label=""
          dataField="bookingType"
        />
      </div> */}

      {isOpd && (
        <>
          {/* <h3 className="text-sm font-medium text-[#262D3B] mb-3">OPD</h3> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div data-field="appointmentDate" className="scroll-mt-4" ref={fieldRefs?.appointmentDate}>
              <DatePicker
                label="Appointment Date "
                value={formData.appointmentDate || undefined}
                onChange={(value) => {
                  onChange("appointmentDate", value || "");
                  if (value) setTimeout(() => onBlur?.("appointmentDate"), 0);
                }}
                onBlur={() => onBlur?.("appointmentDate")}
                placeholder="Appointment Date"
                background="white"
                width="100%"
                minDate={getTodayDate()}
                maxDate={maxAppointmentDateStr}
                required
              />
              {errors?.appointmentDate && <p className="mt-1 text-xs text-[#F6776E]">{errors.appointmentDate}</p>}
            </div>
            <div data-field="timeSlot" className="scroll-mt-4" ref={fieldRefs?.timeSlot}>
              <FormSelectField
                label="Time Slot *"
                options={availableTimeSlots}
                value={formData.timeSlot || null}
                onChange={(value) => {
                  const selectedValue = Array.isArray(value) ? value[0] : value;
                  onChange("timeSlot", selectedValue || "");
                  if (selectedValue) setTimeout(() => onBlur?.("timeSlot"), 0);
                }}
                onBlur={() => onBlur?.("timeSlot")}
                placeholder="--:--"
                mode="single"
                background="white"
              />
              {errors?.timeSlot && <p className="mt-1 text-xs text-[#F6776E]">{errors.timeSlot}</p>}
            </div>
          </div>
        </>
      )}

      {!isOpd && (
        <>
          {/* <h3 className="text-sm font-medium text-[#262D3B] mb-3">IPD</h3> */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div data-field="packageId" className="scroll-mt-4" ref={fieldRefs?.packageId}>
              <FormSelectField
                label="Package *"
                options={packageOptions}
                value={formData.packageId || null}
                onChange={(value) => {
                  const selectedValue = Array.isArray(value) ? value[0] : value;
                  onChange("packageId", selectedValue || "");
                  if (selectedValue) setTimeout(() => onBlur?.("packageId"), 0);
                }}
                onBlur={() => onBlur?.("packageId")}
                placeholder="Select Package"
                mode="single"
                background="white"
              />
              {errors?.packageId && <p className="mt-1 text-xs text-[#F6776E]">{errors.packageId}</p>}
            </div>
            <div data-field="startDate" className="scroll-mt-4" ref={fieldRefs?.startDate}>
              <DatePicker
                label="Start Date"
                value={formData.startDate || undefined}
                onChange={(value) => {
                  onChange("startDate", value || "");
                  if (value) setTimeout(() => onBlur?.("startDate"), 0);
                }}
                onBlur={() => onBlur?.("startDate")}
                placeholder="Start Date"
                background="white"
                width="100%"
              />
            </div>
            <div data-field="endDate" className="scroll-mt-4" ref={fieldRefs?.endDate}>
              <DatePicker
                label="End Date"
                value={formData.endDate || undefined}
                onChange={(value) => {
                  onChange("endDate", value || "");
                  if (value) setTimeout(() => onBlur?.("endDate"), 0);
                }}
                onBlur={() => onBlur?.("endDate")}
                placeholder="End Date"
                background="white"
                width="100%"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div data-field="amount" className="scroll-mt-4" ref={fieldRefs?.amount}>
              <FormInputField
                label="Amount"
                value={formData.amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, "");
                  onChange("amount", v);
                }}
                onBlur={() => onBlur?.("amount")}
                placeholder="Amount"
                type="text"
                error={errors?.amount}
              />
            </div>
            <div data-field="paymentMode" className="scroll-mt-4" ref={fieldRefs?.paymentMode}>
              <FormSelectField
                label="Payment Mode"
                options={paymentModeOptions}
                value={formData.paymentMode || null}
                onChange={(value) => {
                  const selectedValue = Array.isArray(value) ? value[0] : value;
                  onChange("paymentMode", selectedValue || "");
                  if (selectedValue) setTimeout(() => onBlur?.("paymentMode"), 0);
                }}
                onBlur={() => onBlur?.("paymentMode")}
                placeholder="Select Payment Mode"
                mode="single"
                background="white"
              />
            </div>
            <div data-field="paymentMethod" className="scroll-mt-4" ref={fieldRefs?.paymentMethod}>
              <FormSelectField
                label="Payment Method"
                options={paymentMethodOptions}
                value={formData.paymentMethod || null}
                onChange={(value) => {
                  const selectedValue = Array.isArray(value) ? value[0] : value;
                  onChange("paymentMethod", selectedValue || "");
                  if (selectedValue) setTimeout(() => onBlur?.("paymentMethod"), 0);
                }}
                onBlur={() => onBlur?.("paymentMethod")}
                placeholder="Select Payment Method"
                mode="single"
                background="white"
              />
            </div>
            <div data-field="transactionId" className="scroll-mt-4" ref={fieldRefs?.transactionId}>
              <FormInputField
                label="Transaction ID"
                value={formData.transactionId}
                onChange={(e) => onChange("transactionId", e.target.value)}
                onBlur={() => onBlur?.("transactionId")}
                placeholder="Transaction ID"
                type="text"
                error={errors?.transactionId}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
