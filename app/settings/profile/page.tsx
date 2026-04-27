"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, MessageDialog, Tabs, Checkbox } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetConfigurationQuery, useUpdateConfigurationMutation } from "@/store/api/settingsApi";
import { Toggle } from "@/components/ui/Toggle";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch, selectUser } from "@/store/slices/authSlice";

const formatSmsValue = (value: string): string => {
  const lowerValue = value.toLowerCase();
  if (lowerValue === "off") return "Off";
  if (lowerValue === "on") return "On";
  return value;
};

export default function ProfilePage() {
  const user = useAppSelector(selectUser);
  const selectedBranch = useAppSelector(selectSelectedBranch);

  const profileInfo = useMemo(() => {
    const fullName = (user?.userName || user?.name || "").trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ");

    return {
      firstName,
      lastName,
      email: user?.email || "",
      phone: user?.phone || "",
      empId: user?.empId || "",
      branchName: selectedBranch?.name || user?.branchName || "",
    };
  }, [user, selectedBranch]);

  const { data: configurationData, isLoading, refetch } = useGetConfigurationQuery();
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

   
  };
  const [activeTab, setActiveTab] = useState("profile");
  const tabOptions = [
    { value: "profile", label: "Personal info" },
    { value: "security", label: "Security" },
  ];
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  return (
    <AppShell>
   


      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Profile" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-[30%] mb-4">
            <Tabs options={tabOptions} value={activeTab} onChange={handleTabChange} />
          </div>

          {activeTab === "profile" && (
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6" style={{ lineHeight: "1px" }}>
              <h2 className="text-base font-semibold text-[#262D3B]">Personal info</h2>
              <span className="font-inter font-normal text-[14px] leading-[120%] text-[#525763]">Update your photo and personal details here.</span>
            </div>
            <div className="profile_form">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-[85px]">
                    <div className="profilepicontainer relative w-[128px] h-[128px] shrink-0">
                      <Image
                        src="/icons/Portrait_Placeholder.svg"
                        alt="Profile placeholder"
                        className="rounded-full object-cover" width={128} height={128}
                      />
                      <label
                        htmlFor="profilephoto"
                        className="absolute bottom-0 right-0 cursor-pointer flex justify-center items-center "
                      >
                        <input type="file" hidden id="profilephoto" />
                      </label>
                    </div>
                <div className="w-full rounded-[16px] border border-[#E9F3E6] bg-white px-5 py-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center justify-center">
                    <label htmlFor="profilephoto" className="flex cursor-pointer items-center gap-3 text-left md:pl-4">
                      <div className="text-center">
                      <Image src="/icons/UploadIcon.svg" alt="Upload icon" width={18} height={18} className="mx-auto mb-2 text-center" />
                        <p className="text-sm font-semibold text-[#0B8C00] mb-2">Click to upload</p>
                        <p className="text-xs text-[#667085]">or drag and drop SVG, PNG, JPG (max. 128 x 128px)</p>
                      </div>
                    </label>
                  </div>
                </div>

                </div>
                <div className="grid grid-cols-2 gap-6">
                  <FormInputField
                    label="First name"
                    placeholder="Enter First name"
                    type="text"
                    value={profileInfo.firstName}
                    readOnly
                  />
                  <FormInputField
                    label="Last name"
                    placeholder="Enter Last name"
                    type="text"
                    value={profileInfo.lastName}
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <FormInputField
                    label="Email address"
                    placeholder="Enter Email address"
                    type="email"
                    value={profileInfo.email}
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <FormInputField label="Phone" type="text" value={profileInfo.phone} readOnly />
                  <FormInputField label="Employee ID" type="text" value={profileInfo.empId} readOnly />
                  <FormInputField label="Branch" type="text" value={profileInfo.branchName} readOnly />
                </div>
                <div>
                  <Button type="button" className="me-2" variant="outline" size="large" >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="large"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    Save
                  </Button>
                </div>
              </form>
            </div>

          </div>
          )}
          {/* profile  */}

          {/* security  */}
          {activeTab === "security" && (
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5">
            <div className="mb-6" style={{ lineHeight: "1px" }}>
              <h2 className="text-base font-semibold text-[#262D3B]">Security</h2>
              <span className="font-inter font-normal text-[14px] leading-[120%] text-[#525763]">Manage and personalize your security settings for enhanced account protection and data privacy.</span>
            </div>
            <div className="profile_form">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-12 gap-4 ">
                  <div className="col-span-9 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <FormInputField
                        label="Current password"
                        placeholder="Enter Current password"
                        type="password"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <FormInputField
                        label="New password"
                        placeholder="Enter New password"
                        type="text"
                      />
                      <FormInputField
                        label="Confirm password"
                        placeholder="Enter Confirm password"
                        type="text"
                      />
                    </div>
                    {/* <div className="grid grid-cols-2 gap-6 items-center">
                      <div style={{ lineHeight: "1px" }}>
                        <h2 className="text-base font-semibold text-[#262D3B]">2-step verification</h2>
                        <span className="font-inter font-normal text-[14px] leading-[120%] text-[#525763]">Add an additional layer of security to your account during login.</span>
                      </div>
                      <div className="flex items-center ">
                        <Toggle
                          checked={false}
                          onChange={(checked) => {
                            console.log(checked);
                          }}
                          label=""
                        />
                      </div>
                    </div> */}
                  </div>
                  <div className="col-span-3">
                    <div className="intruction_meet p-4 bg-[rgba(11,140,0,0.1)] rounded-lg">
                      <ul className="flex gap-3 flex-col">
                        <li className="text-base font-semibold text-[#262D3B]">Your password must contain:</li>
                        <li>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={false}
                              onChange={(checked) => {
                                console.log(checked);
                              }}
                              width={16}
                              height={16}
                            />
                            <span className="font-inter font-medium text-sm leading-5 text-[#344054]">at least 8 Characters</span>
                          </div>
                        </li>
                        <li>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={false}
                              onChange={(checked) => {
                                console.log(checked);
                              }}
                              width={16}
                              height={16}
                            />
                            <span className="font-inter font-medium text-sm leading-5 text-[#344054]">lower case letters  (i.e a-z)</span>
                          </div>
                        </li>
                        <li>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={false}
                              onChange={(checked) => {
                                console.log(checked);
                              }}
                              width={16}
                              height={16}
                            />
                            <span className="font-inter font-medium text-sm leading-5 text-[#344054]">upper case letters  (i.e A-Z)</span>
                          </div>
                        </li>
                        <li>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={false}
                              onChange={(checked) => {
                                console.log(checked);
                              }}
                              width={16}
                              height={16}
                            />
                            <span className="font-inter font-medium text-sm leading-5 text-[#344054]">numbers  (i.e 0-9)</span>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <Button type="button" className="me-2" variant="outline" size="large" >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="large"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    Save
                  </Button>
                </div>
              </form>
            </div>

          </div>
          )}
          {/* security  */}
        </ListBorder>
      </div>



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

