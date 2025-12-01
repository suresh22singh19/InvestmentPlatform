"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetConfigurationQuery, useUpdateConfigurationMutation } from "@/store/api/settingsApi";

const formatSmsValue = (value: string): string => {
  const lowerValue = value.toLowerCase();
  if (lowerValue === "off") return "Off";
  if (lowerValue === "on") return "On";
  return value;
};

export default function SettingsConfigurationPage() {
  const { data: configurationData, isLoading, refetch } = useGetConfigurationQuery();
  const [updateConfiguration, { isLoading: isUpdating }] = useUpdateConfigurationMutation();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formValues, setFormValues] = useState({
    id: 0,
    invoiceLockedDays: "",
    smsChannel: "off",
    oldSaleCron: "",
    newSaleCron: "",
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
        oldSaleCron: String(data.regCrone),
        newSaleCron: String(data.saleCron),
        branchId: data.branchId,
      });
    }
  }, [configurationData]);

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
        {
          id: 2,
          label: "Old Sale Cron Count",
          value: String(configurationData.data.regCrone),
          channelLabel: "New Sale Cron Count",
          channelValue: String(configurationData.data.saleCron),
        },
      ]
    : [];

  const smsChannelOptions = [
    { value: "off", label: "Off" },
    { value: "on", label: "On" },
  ];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Basic validation
    if (!formValues.invoiceLockedDays || !formValues.oldSaleCron || !formValues.newSaleCron) {
      setSuccessMessage("Please fill in all required fields");
      setShowSuccessDialog(true);
      return;
    }

    if (formValues.id === 0) {
      setSuccessMessage("Configuration data not loaded. Please refresh the page.");
      setShowSuccessDialog(true);
      return;
    }
    
    try {
      const result = await updateConfiguration({
        id: formValues.id,
        invoiceLockedDays: Number(formValues.invoiceLockedDays),
        sms: formValues.smsChannel,
        regCrone: Number(formValues.oldSaleCron),
        saleCron: Number(formValues.newSaleCron),
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
      setSuccessMessage(errorMessage);
      setShowSuccessDialog(true);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Settings" />
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-full border border-[#0B8C00] px-5 text-sm font-semibold text-[#0B8C00] shadow-[0px_20px_40px_rgba(34,56,43,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIsDialogOpen(true)}
            disabled={isLoading || !configurationData?.data}
          >
            <Image src="/icons/EditPencil.svg" alt="Edit" width={20} height={20} />
            Edit
          </button>
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="border-b border-[#E9F3E6] py-4">
              <h2 className="text-base font-semibold text-[#262D3B]">HIIMS Configuration</h2>
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
        </ListBorder>
      </div>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Edit Configuration"
        width={686}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInputField
              label="Invoice locked After days"
              value={formValues.invoiceLockedDays}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  invoiceLockedDays: event.target.value,
                }))
              }
              height={44}
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
            />

            <FormInputField
              label="Old Sale Cron Count"
              value={formValues.oldSaleCron}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  oldSaleCron: event.target.value,
                }))
              }
              height={44}
            />

            <FormInputField
              label="New Sale Cron Count"
              value={formValues.newSaleCron}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  newSaleCron: event.target.value,
                }))
              }
              height={44}
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
            <Button type="submit" variant="primary" disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
        }}
      />
    </AppShell>
  );
}

