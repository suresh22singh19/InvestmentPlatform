"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, MessageDialog, BackToPreviousPageButton } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetConfigurationQuery, useUpdateConfigurationMutation } from "@/store/api/settingsApi";
import {
  FormTextareaField,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
  Pagination,
} from "@/components/ui";

const formatSmsValue = (value: string): string => {
  const lowerValue = value.toLowerCase();
  if (lowerValue === "off") return "Off";
  if (lowerValue === "on") return "On";
  return value;
};

interface PatientWalletViewProps {
  onClose?: () => void;
}

export default function PatientWalletView({ onClose }: PatientWalletViewProps) {
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

  return (
    <AppShell>
  

      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="View" />
          {onClose && (
            <div className="px-5">
              <BackToPreviousPageButton
                iconOnly={true}
                onClick={onClose}
              />
            </div>
          )}
        </div>
    
        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-4 py-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* package  */}
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="flex items-center justify-between gap-2 mb-[20px] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Image src="/icons/package_details.svg" alt="Package Icon" width={20} height={20} />
                  <h2 className="font-[Inter] font-medium text-base leading-[120%] text-[#262D3B]">Package Details</h2>
                </div>
                <div className="flex gap-2 items-center">
                  <Image src="/icons/file-pdf.svg" alt="pdf Icon" width={24} height={24} />
                  <span className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]">Active</span>
                </div>
              </div>

              <div className="view_wallet">
                  <div className="package_profile border-[#DFE0E2] border-b pb-[18px] mb-4">
                      <h4 className="font-inter text-[32px] leading-[120%] font-semibold text-[#262D3B] mb-2">Shuddhi Membership</h4>
                      <p className="font-inter text-[14px] leading-[120%] font-normal text-[#434956]"><span>Wallet ID: #12744</span> • <span>Validity : 30 Dec 2025 - 30 Mar 2026</span></p>
                  </div>
                  <div className="grid grid-cols-3">
                      <div className="package_list mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/package_details.svg" alt="Package Icon" width={28} height={28} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Package Amount</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">₹69,999</span>
                          </div>
                        </div>
                      </div>
                      <div className="package_list mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/discount.svg" alt="Discount Icon" width={28} height={28} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Discount</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">5%</span>
                          </div>
                        </div>
                      </div>

                       <div className="package_list mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/walletbenifit.svg" alt="Wallet Benefit Icon" width={28} height={28} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Wallet Benefit</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">13.04% Extra</span>
                          </div>
                        </div>
                      </div>

                       <div className="package_list mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/paidamount.svg" alt="Paid Amount Icon" width={24} height={24} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Paid Amount</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">₹69,999</span>
                          </div>
                        </div>
                      </div>
                       <div className="package_list">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/pendingamount.svg" alt="Pending Amount Icon" width={24} height={24} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Pending Amount</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">0</span>
                          </div>
                        </div>
                      </div>
                  </div>
              </div>
            </div>
            {/* //package end  */}

            {/* Patient Details  */}
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="flex items-center justify-between gap-2 mb-[20px] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Image src="/icons/patientinfo.svg" alt="Patient Icon" width={20} height={20} />
                  <h2 className="font-[Inter] font-medium text-base leading-[120%] text-[#262D3B]">Patient Details</h2>
                </div>
              </div>

              <div className="view_wallet">
                  <div className="package_profile border-[#DFE0E2] border-b pb-[18px] mb-4">
                      <h4 className="font-inter text-[32px] leading-[120%] font-semibold text-[#262D3B] mb-2">Mr. Abhishek</h4>
                      <p className="font-inter text-[14px] leading-[120%] font-normal text-[#434956]"><span>Staff Name: Rijul Gupta</span> • <span>Staff Code: #12345</span> • <span>Added By: Gaurav Sharma</span></p>
                  </div>
                  <div className="grid grid-cols-3">
                      <div className="package_list mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/doctorIcon.svg" alt="Doctor Icon" width={28} height={28} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Doctor Name</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">Dr. Shweta Thakur</span>
                          </div>
                        </div>
                      </div>
                      <div className="package_list mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/paymethode.svg" alt="Payment Methode Icon" width={28} height={28} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Payment Method</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">Online</span>
                          </div>
                        </div>
                      </div>

                       <div className="package_list mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/transactionID.svg" alt="Transaction ID Icon" width={28} height={28} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Transaction ID</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">6266266262626</span>
                          </div>
                        </div>
                      </div>

                       <div className="package_list mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="flex items-center justify-center p-[12px] gap-[12px] w-[60px] h-[60px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full">
                            <Image src="/icons/remark.svg" alt="Remark Icon" width={28} height={28} />
                          </div>
                          <div>
                            <p className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] mb-0">Remarks</p>
                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#262D3B]">Lorem ipsum dolor sit amet</span>
                          </div>
                        </div>
                      </div>
                  </div>
              </div>
            </div>
            {/* Patient Details end  */}
          </div>
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="flex items-center justify-between gap-2 mb-[20px] cursor-pointer">
                <div className="flex items-center gap-2">
                  {/* <Image src="/icons/package_details.svg" alt="Package Icon" width={20} height={20} /> */}
                  <h2 className="font-[Inter] font-medium text-base leading-[120%] text-[#262D3B]">History</h2>
                </div>
              </div>
               <div className="list_history">
                <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead position="first" className="whitespace-nowrap w-[80px]">
                                    Sr no.
                                  </TableHead>
                                  <TableHead>
                                    Date & Time
                                  </TableHead>
                                  <TableHead>
                                   Order ID
                                  </TableHead>
                                  <TableHead>
                                    Remarks
                                  </TableHead>
                                  <TableHead>
                                    Amount (₹)
                                  </TableHead>
                                  <TableHead>
                                    Balance (₹)
                                  </TableHead>
                                  <TableHead>
                                    Mode
                                  </TableHead>
                                  <TableHead position="last" className="w-[120px]">
                                    Status
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                  <TableRow>
                                    <TableData>
                                      1
                                    </TableData>
                                    <TableData>
                                     31 Dec 2025 12:52
                                    </TableData>
                                    <TableData>
                                     #3012418
                                    </TableData>
                                    <TableData>
                                     OPD Consultation Fee Received
                                    </TableData>
                                    <TableData >
                                     <span className="text-[#4CAF50]">+1,000.00</span>
                                    </TableData>
                                    <TableData>
                                     7000
                                    </TableData>
                                    <TableData>
                                    <span className="text-[#4CAF50]">Cash</span>
                                    </TableData>
                                    <TableData>
                                     <span className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]">Credit</span>
                                    </TableData>
                                  </TableRow>
                                  <TableRow>
                                    <TableData>
                                     2
                                    </TableData>
                                    <TableData>
                                     31 Dec 2025 12:52
                                    </TableData>
                                    <TableData>
                                     #3012418
                                    </TableData>
                                    <TableData>
                                    Medicine Purchase Payment
                                    </TableData>
                                    <TableData >
                                     <span className="text-[#F44336]">-1,000.00</span>
                                    </TableData>
                                    <TableData>
                                     7000
                                    </TableData>
                                    <TableData>
                                    <span className="text-[#4CAF50]">Cash</span>
                                    </TableData>
                                    <TableData>
                                     <span className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#F44336]/20 bg-white text-[#F44336]">Debit</span>
                                    </TableData>
                                  </TableRow>
                             
                              </TableBody>
                            </Table>
               </div>
            </div>
        </div>
        {/* ///// */}
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
