"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetConfigurationQuery, useUpdateConfigurationMutation } from "@/store/api/settingsApi";
import { usePermission } from "@/hooks/usePermission";

const formatSmsValue = (value: string): string => {
  const lowerValue = value.toLowerCase();
  if (lowerValue === "off") return "Off";
  if (lowerValue === "on") return "On";
  return value;
};

export default function SettingsConfigurationPage() {
  const configurationPermission = usePermission("settings", { subModule: "configuration" });
  /** View: main table. Edit: edit button + dialog only. */
  const canView = configurationPermission.canView;
  const canEdit = configurationPermission.canEdit;
  const { data: configurationData, isLoading, refetch } = useGetConfigurationQuery(undefined, {
    skip: !canView,
  });
  const [updateConfiguration, { isLoading: isUpdating }] = useUpdateConfigurationMutation();
  
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

  useEffect(() => {
    console.log("Settings > Configuration", { canView, canEdit, configurationPermission });
  }, [canView, canEdit, configurationPermission]);

  const syncFormValuesFromConfiguration = () => {
    if (!configurationData?.data) return;
    const data = configurationData.data;
    setFormValues({
      id: data.id,
      invoiceLockedDays: String(data.invoiceLockedDays),
      smsChannel: data.sms.toLowerCase(),
      branchId: data.branchId,
    });
  };

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

    if (!canEdit) {
      setIsDialogOpen(false);
      return;
    }
    
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
    } catch (error: unknown) {
      console.error("Update configuration error:", error);
      const typedError = error as { data?: { message?: string; error?: string } };
      const errorMessage =
        typedError?.data?.message ||
        typedError?.data?.error ||
        "Failed to update configuration";
      setApiErrorMessage(errorMessage);
      setShowApiErrorDialog(true);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="HIIMS Configuration" />
          {canEdit ? (
            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-full border border-[#0B8C00] px-5 text-sm font-semibold text-[#0B8C00] shadow-[0px_20px_40px_rgba(34,56,43,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                syncFormValuesFromConfiguration();
                setIsDialogOpen(true);
              }}
              disabled={isLoading || !configurationData?.data}
            >
              <Image src="/icons/EditPencil.svg" alt="Edit" width={20} height={20} />
              Edit
            </button>
          ) : null}
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view this configuration.
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="border-b border-[#E9F3E6] py-4">
                <h2 className="text-base font-semibold text-[#262D3B]"></h2>
              </div>

              <div className="divide-y divide-[#EDF3EA] border-b border-[#E9F3E6]">
                {isLoading ? (
                  <div className="py-8 text-center text-sm text-[#9CA3AF]">Loading configuration...</div>
                ) : configurationRows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#9CA3AF]">No configuration data available</div>
                ) : (
                  configurationRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1.5fr_0.8fr_1.1fr_0.6fr] items-center py-4 text-sm"
                    >
                      <span className="font-medium text-[#262D3B]">{row.label}</span>
                      <span className="flex h-full items-center justify-center border-r border-[#EDF3EA] px-6 text-base">
                        {row.value}
                      </span>
                      <span className="flex h-full items-center pl-4 pr-6 text-sm text-[#434956]">
                        {row.channelLabel}
                      </span>
                      <span className="flex h-full items-center justify-end">
                        <span className="inline-flex min-w-[52px] items-center justify-center px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#262D3B]">
                          {row.channelValue}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </ListBorder>
      </div>

      {canEdit ? (
        <Dialog
          open={isDialogOpen}
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
      ) : null}

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

