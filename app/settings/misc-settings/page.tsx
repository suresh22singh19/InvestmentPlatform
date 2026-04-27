"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import {
  useGetConfigurationQuery,
  useUpdateConfigurationMutation,
  useGetMasterSettingsQuery,
  useCreateMasterSettingMutation,
  useUpdateMasterSettingMutation,
} from "@/store/api/settingsApi";
import { usePermission } from "@/hooks/usePermission";

const PREBOOKING_META_KEY = "prebooking";
const PREBOOKING_META_VALUE_TWO = "days";

/** Master setting metaKey — align with backend if different */
const MEDICAL_VITAL_RECAPTURE_META_KEY = "medical_vital_recapture";
const MEDICAL_VITAL_RECAPTURE_META_VALUE_TWO = "days";

const formatSmsValue = (value: string): string => {
  const lowerValue = value.toLowerCase();
  if (lowerValue === "off") return "Off";
  if (lowerValue === "on") return "On";
  return value;
};

export default function SettingsConfigurationPage() {
  const miscSettingsPermission = usePermission("settings", { subModule: "misc-settings" });
  const canView = miscSettingsPermission.canView;
  const canEdit = miscSettingsPermission.canEdit;

  const { data: configurationData, isLoading, refetch } = useGetConfigurationQuery(undefined, {
    skip: !canView,
  });
  const [updateConfiguration, { isLoading: isUpdating }] = useUpdateConfigurationMutation();
  const {
    data: masterSettingsData,
    isLoading: isMasterSettingsLoading,
    refetch: refetchMasterSettings,
  } = useGetMasterSettingsQuery(undefined, { skip: !canView });
  const [createMasterSetting, { isLoading: isCreatingPreBooking }] =
    useCreateMasterSettingMutation();
  const [updateMasterSetting, { isLoading: isUpdatingPreBooking }] =
    useUpdateMasterSettingMutation();

  const [isPreBookingEditing, setIsPreBookingEditing] = useState(false);
  const [preBookingMasterId, setPreBookingMasterId] = useState<number | null>(null);
  const [preBookingDisplayDays, setPreBookingDisplayDays] = useState<number | null>(null);
  const [preBookingEditDraft, setPreBookingEditDraft] = useState("");
  const [preBookingFieldError, setPreBookingFieldError] = useState("");

  const [isVitalMedicalEditing, setIsVitalMedicalEditing] = useState(false);
  const [vitalMedicalMasterId, setVitalMedicalMasterId] = useState<number | null>(null);
  const [vitalMedicalDisplayDays, setVitalMedicalDisplayDays] = useState<number | null>(null);
  const [vitalMedicalEditDraft, setVitalMedicalEditDraft] = useState("");
  const [vitalMedicalFieldError, setVitalMedicalFieldError] = useState("");
  const [activeMasterSave, setActiveMasterSave] = useState<null | "prebooking" | "vital_medical">(
    null,
  );

  const [supportmodal, setSupportmodal] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [invoiceLockedDaysError, setInvoiceLockedDaysError] = useState("");
  const [formValues, setFormValues] = useState({
    id: 0,
    invoiceLockedDays: "",
    smsChannel: "off",
    branchId: 1,
  });

  // Update form values when configuration data is loaded
  useEffect(() => {
    if (configurationData?.data) {
      const data = configurationData.data;
      setFormValues({
        id: data.id,
        invoiceLockedDays: String(data.invoiceLockedDays),
        smsChannel: data.sms.toLowerCase(),
        branchId: data.branchId,
      });
    }
  }, [configurationData]);

  useEffect(() => {
    const list = masterSettingsData?.data;
    if (!list) return;

    const preRow = list.find((item) => item.metaKey === PREBOOKING_META_KEY);
    if (preRow) {
      setPreBookingMasterId(preRow.id);
      const n = Number(preRow.metaValueOne);
      setPreBookingDisplayDays(Number.isFinite(n) ? n : null);
    } else {
      setPreBookingMasterId(null);
      setPreBookingDisplayDays(null);
    }

    const vitalRow = list.find((item) => item.metaKey === MEDICAL_VITAL_RECAPTURE_META_KEY);
    if (vitalRow) {
      setVitalMedicalMasterId(vitalRow.id);
      const n = Number(vitalRow.metaValueOne);
      setVitalMedicalDisplayDays(Number.isFinite(n) ? n : null);
    } else {
      setVitalMedicalMasterId(null);
      setVitalMedicalDisplayDays(null);
    }
  }, [masterSettingsData]);

  // Build configuration rows from API data
  const configurationRows = configurationData?.data
    ? [
      {
        id: 1,
        label: "Invoice/Order Locked After Days",
        value: String(configurationData.data.invoiceLockedDays),
        channelLabel: "SMS / WhatsApp",
        channelValue: formatSmsValue(configurationData.data.sms),
      },
    ]
    : [];

  const smsChannelOptions = [
    { value: "off", label: "Off" },
    { value: "on", label: "On" },
  ];

  const handleInvoiceDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    // Only allow numeric input (0-9)
    if (value === "" || /^\d+$/.test(value)) {
      // Limit to 3 digits
      if (value.length <= 3) {
        setFormValues((prev) => ({
          ...prev,
          invoiceLockedDays: value,
        }));
        // Clear error when valid input is entered
        if (invoiceLockedDaysError) {
          setInvoiceLockedDaysError("");
        }
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;

    // Clear previous errors
    setInvoiceLockedDaysError("");

    // Validate invoice locked days field
    if (!formValues.invoiceLockedDays.trim()) {
      setInvoiceLockedDaysError("Invoice locked days is required");
      return;
    }

    const daysValue = Number(formValues.invoiceLockedDays);

    // Validate it's a valid number
    if (isNaN(daysValue)) {
      setInvoiceLockedDaysError("Please enter a valid number");
      return;
    }

    // Validate range (0-999)
    if (daysValue < 0 || daysValue > 999) {
      setInvoiceLockedDaysError("Please enter a number between 0 and 999");
      return;
    }

    if (formValues.id === 0) {
      setApiErrorMessage("Configuration data not loaded. Please refresh the page.");
      setShowApiErrorDialog(true);
      return;
    }

    try {
      const result = await updateConfiguration({
        id: formValues.id,
        invoiceLockedDays: Number(formValues.invoiceLockedDays),
        sms: formValues.smsChannel,
        regCrone: configurationData?.data?.regCrone ?? 0,
        saleCron: configurationData?.data?.saleCron ?? 0,
        branchId: formValues.branchId,
      }).unwrap();

      setSuccessMessage(result?.message || "Configuration saved successfully");
      setShowSuccessDialog(true);
      setIsDialogOpen(false);

      // Refetch configuration data to update the display
      refetch();
    } catch (error: any) {
      console.error("Update configuration error:", error);
      const errorMessage = error?.data?.message || error?.data?.error || "Failed to update configuration";
      setApiErrorMessage(errorMessage);
      setShowApiErrorDialog(true);
    }
  };

  const isMasterMutationBusy = isCreatingPreBooking || isUpdatingPreBooking;
  const isPreBookingSaving = activeMasterSave === "prebooking" && isMasterMutationBusy;

  const startPreBookingEdit = () => {
    setPreBookingFieldError("");
    setPreBookingEditDraft(
      preBookingDisplayDays !== null && Number.isFinite(preBookingDisplayDays)
        ? String(preBookingDisplayDays)
        : "",
    );
    setIsPreBookingEditing(true);
  };

  const handlePreBookingDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      if (value.length <= 3) {
        setPreBookingEditDraft(value);
        if (preBookingFieldError) setPreBookingFieldError("");
      }
    }
  };

  const savePreBookingDays = async () => {
    if (!canEdit) return;
    setPreBookingFieldError("");
    const trimmed = preBookingEditDraft.trim();
    if (!trimmed) {
      setPreBookingFieldError("Days is required");
      return;
    }
    const daysValue = Number(trimmed);
    if (!Number.isFinite(daysValue) || daysValue < 0 || daysValue > 999) {
      setPreBookingFieldError("Enter a number between 0 and 999");
      return;
    }
    const metaValueOne = String(daysValue);

    setActiveMasterSave("prebooking");
    try {
      if (preBookingMasterId == null) {
        const result = await createMasterSetting({
          metaKey: PREBOOKING_META_KEY,
          metaValueOne,
          metaValueTwo: PREBOOKING_META_VALUE_TWO,
        }).unwrap();
        setSuccessMessage(result?.message || "Pre-booking setting saved");
        setShowSuccessDialog(true);
      } else {
        const result = await updateMasterSetting({
          id: preBookingMasterId,
          metaValueOne,
        }).unwrap();
        setSuccessMessage(result?.message || "Pre-booking setting updated");
        setShowSuccessDialog(true);
      }
      setIsPreBookingEditing(false);
      await refetchMasterSettings();
    } catch (error: unknown) {
      console.error("Pre-booking master setting error:", error);
      const err = error as { data?: { message?: string; error?: string } };
      setApiErrorMessage(err?.data?.message || err?.data?.error || "Failed to save pre-booking days");
      setShowApiErrorDialog(true);
    } finally {
      setActiveMasterSave(null);
    }
  };

  const onPreBookingEditToggle = () => {
    if (!canEdit) return;
    if (isPreBookingEditing) {
      void savePreBookingDays();
    } else {
      startPreBookingEdit();
    }
  };

  const isVitalMedicalSaving = activeMasterSave === "vital_medical" && isMasterMutationBusy;

  const startVitalMedicalEdit = () => {
    setVitalMedicalFieldError("");
    setVitalMedicalEditDraft(
      vitalMedicalDisplayDays !== null && Number.isFinite(vitalMedicalDisplayDays)
        ? String(vitalMedicalDisplayDays)
        : "",
    );
    setIsVitalMedicalEditing(true);
  };

  const handleVitalMedicalDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      if (value.length <= 3) {
        setVitalMedicalEditDraft(value);
        if (vitalMedicalFieldError) setVitalMedicalFieldError("");
      }
    }
  };

  const saveVitalMedicalDays = async () => {
    if (!canEdit) return;
    setVitalMedicalFieldError("");
    const trimmed = vitalMedicalEditDraft.trim();
    if (!trimmed) {
      setVitalMedicalFieldError("Days is required");
      return;
    }
    const daysValue = Number(trimmed);
    if (!Number.isFinite(daysValue) || daysValue < 0 || daysValue > 999) {
      setVitalMedicalFieldError("Enter a number between 0 and 999");
      return;
    }
    const metaValueOne = String(daysValue);

    try {
      if (vitalMedicalMasterId == null) {
        const result = await createMasterSetting({
          metaKey: MEDICAL_VITAL_RECAPTURE_META_KEY,
          metaValueOne,
          metaValueTwo: MEDICAL_VITAL_RECAPTURE_META_VALUE_TWO,
        }).unwrap();
        setSuccessMessage(result?.message || "Medical / vital recapture setting saved");
        setShowSuccessDialog(true);
      } else {
        const result = await updateMasterSetting({
          id: vitalMedicalMasterId,
          metaValueOne,
        }).unwrap();
        setSuccessMessage(result?.message || "Medical / vital recapture setting updated");
        setShowSuccessDialog(true);
      }
      setIsVitalMedicalEditing(false);
      await refetchMasterSettings();
    } catch (error: unknown) {
      console.error("Medical / vital recapture master setting error:", error);
      const err = error as { data?: { message?: string; error?: string } };
      setApiErrorMessage(
        err?.data?.message || err?.data?.error || "Failed to save medical / vital recapture days",
      );
      setShowApiErrorDialog(true);
    }
  };

  const onVitalMedicalEditToggle = () => {
    if (!canEdit) return;
    if (isVitalMedicalEditing) {
      void saveVitalMedicalDays();
    } else {
      startVitalMedicalEdit();
    }
  };

  return (
    <AppShell>
  

      {/* Misc Settings  */}
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Misc Settings" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view misc settings.
            </div>
          ) : (
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div
              className="grid grid-cols-2 items-center border-t border-b border-[#EBECED] "
            >
              <div className="flex justify-between items-center px-5 h-[60px] border-r border-[#EBECED]">

                <span className="text-sm text-[#434956] flex items-center gap-1">
                  Pre-Booking Allowed For{" "}

                  <span>
                    {isMasterSettingsLoading ? (
                      <span className="text-[#8B939E]">…</span>
                    ) : isPreBookingEditing ? (
                      <FormInputField
                        label=""
                        value={preBookingEditDraft}
                        placeholder=""
                        type="text"
                        inputMode="numeric"
                        className="!h-[32px] !w-[85px]"
                        onChange={handlePreBookingDaysChange}
                        error={preBookingFieldError}
                        disabled={isPreBookingSaving}
                      />
                    ) : preBookingDisplayDays !== null ? (
                      preBookingDisplayDays
                    ) : (
                      <span className="text-[#8B939E]">—</span>
                    )}
                  </span>

                  Days
                </span>

                <span>
                  <button
                    type="button"
                    onClick={onPreBookingEditToggle}
                    disabled={!canEdit || isMasterSettingsLoading || isMasterMutationBusy}
                    className="flex h-[36px] cursor-pointer items-center gap-2 rounded-full border border-[#0B8C00] px-6 text-sm font-semibold text-[#0B8C00] shadow-[0px_20px_40px_rgba(34,56,43,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPreBookingSaving ? "Saving…" : isPreBookingEditing ? "Save" : "Edit"}
                  </button>
                </span>
              </div>
              {/* i will add another option for next settings */}
              <div className="flex justify-between items-center px-5 h-[60px] border-r border-[#EBECED]">

                <span className="text-sm text-[#434956] flex items-center gap-1">
                  Medical and Vital again capture after days

                  <span>
                    {isMasterSettingsLoading ? (
                      <span className="text-[#8B939E]">…</span>
                    ) : isVitalMedicalEditing ? (
                      <FormInputField
                        label=""
                        value={vitalMedicalEditDraft}
                        placeholder=""
                        type="text"
                        inputMode="numeric"
                        className="!h-[32px] !w-[85px]"
                        onChange={handleVitalMedicalDaysChange}
                        error={vitalMedicalFieldError}
                        disabled={isVitalMedicalSaving}
                      />
                    ) : vitalMedicalDisplayDays !== null ? (
                      vitalMedicalDisplayDays
                    ) : (
                      <span className="text-[#8B939E]">—</span>
                    )}
                  </span>

                  Days
                </span>

                <span>
                  <button
                    type="button"
                    onClick={onVitalMedicalEditToggle}
                    disabled={!canEdit || isMasterSettingsLoading || isMasterMutationBusy}
                    className="flex h-[36px] cursor-pointer items-center gap-2 rounded-full border border-[#0B8C00] px-6 text-sm font-semibold text-[#0B8C00] shadow-[0px_20px_40px_rgba(34,56,43,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isVitalMedicalSaving
                      ? "Saving…"
                      : isVitalMedicalEditing
                        ? "Save"
                        : "Edit"}
                  </button>
                </span>
              </div>
              
                  {/* i will add another option for next settings */}
              {/* <div className="flex justify-between items-center px-5 h-[60px] border-r border-[#EBECED]">

                <span className="text-sm text-[#434956] flex items-center gap-1">
                  Next Settings

                  <span>
                    {isEditing ? (
                      <FormInputField
                        label=""
                        value={days}
                        placeholder=""
                        type="number"
                        className="!h-[32px] !w-[85px]"
                        onChange={handleDays}
                      />
                    ) : (
                      days
                    )}
                  </span>

                  Days
                </span>

                <span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex h-[36px] cursor-pointer items-center gap-2 rounded-full border border-[#0B8C00] px-6 text-sm font-semibold text-[#0B8C00] shadow-[0px_20px_40px_rgba(34,56,43,0.08)]"
                  >
                    {isEditing ? "Save" : "Edit"}
                  </button>
                </span>
              </div> */}

            </div>
          </div>
          )}
        </ListBorder>
      </div>
      {/* Misc Settings  */}

     






      <Dialog
        open={isDialogOpen && canEdit}
        onClose={() => {
          setIsDialogOpen(false);
          setInvoiceLockedDaysError("");
        }}
        title="Edit Configuration"
        width={686}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <FormInputField
              label="Invoice locked After days *"
              type="number"
              min="0"
              max="999"
              maxLength={3}
              required
              value={formValues.invoiceLockedDays}
              onChange={handleInvoiceDaysChange}
              height={44}
              disabled={isUpdating}
              error={invoiceLockedDaysError}
            />

            <FormSelectField
              label="SMS/Whatsapp"
              options={smsChannelOptions}
              value={formValues.smsChannel}
              onChange={(value) => {
                if (typeof value === "string") {
                  setFormValues((prev) => ({
                    ...prev,
                    smsChannel: value,
                  }));
                }
              }}
              background="white"
              disabled={isUpdating}
            />
          </div>

          {/* <FormSelectField
            label="Notification Channels"
            mode="multiple"
            options={notificationChannelOptions}
            value={formValues.notificationChannels}
            onChange={(value) => {
              if (Array.isArray(value)) {
                setFormValues((prev) => ({
                  ...prev,
                  notificationChannels: value,
                }));
              }
            }}
            background="white"
          /> */}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={isUpdating}
              disabled={isUpdating}
            >
              Update
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setInvoiceLockedDaysError("");
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Success Dialog */}
      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="Success"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
        }}
      />

      {/* API Error Dialog - Only for API errors, not validation errors */}
      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => {
          setShowApiErrorDialog(false);
        }}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowApiErrorDialog(false);
        }}
      />
    </AppShell>
  );
}

