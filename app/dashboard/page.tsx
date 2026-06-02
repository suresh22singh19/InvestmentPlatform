"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FaInfoCircle, FaUserAlt, FaUsers } from "react-icons/fa";
import { FaUserDoctor } from "react-icons/fa6";
import { PiStethoscopeBold } from "react-icons/pi";
import { useAppSelector } from "@/store/hooks";
import {
  selectLoginType,
  selectPermissionsMap,
  selectSelectedBranch,
  selectUserBranchId,
} from "@/store/slices/authSlice";
import { hasOnlyGateModuleViewAccess } from "@/utils/permission";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { FormSelectField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useGetAppointmentsCountQuery,
  useGetYesterdayAppointmentsCountQuery,
  useGetTodayRegistrationCountQuery,
  useGetOpdPatientTypeWiseCountQuery,
  useGetTodayTotalConsultancyQuery,
  useGetSupportContactsQuery,
} from "@/store/api/dashboardApi";
import type { DashboardSupportCategory, DashboardSupportContact } from "@/store/api/dashboardApi";
import { useGetDoctorsByBranchQuery } from "@/store/api/registrationApi";
import { usePermission } from "@/hooks/usePermission";

const DASHBOARD_ESCALATION_CARD_TITLE =
  "If there is no response, kindly call the below-mentioned number.";

function formatSupportContactLine(c: DashboardSupportContact): string {
  const role = c.role?.trim();
  const rolePart = role ? ` (${role})` : "";
  return `${c.name}${rolePart} : ${c.phone}`;
}

function chunkSupportContactsPairs(contacts: DashboardSupportContact[]): [DashboardSupportContact, DashboardSupportContact | undefined][] {
  const pairs: [DashboardSupportContact, DashboardSupportContact | undefined][] = [];
  for (let i = 0; i < contacts.length; i += 2) {
    pairs.push([contacts[i], contacts[i + 1]]);
  }
  return pairs;
}

function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || str === "") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function DashboardPage() {
  return <StandardDashboardPage />;
}

function StandardDashboardPage() {
  const router = useRouter();
  const permissionsMap = useAppSelector(selectPermissionsMap);
  const dashboardPermission = usePermission("Dashboard");
  const dashboardSubPermission = usePermission("Dashboard", { subModule: "Dashboard" });
  const canView = dashboardPermission.canView || dashboardSubPermission.canView;

  const [showOccupiedTooltip, setShowOccupiedTooltip] = useState(false);
  const userBranchId = useAppSelector(selectUserBranchId);
  const headerSelectedBranch = useAppSelector(selectSelectedBranch);

  useEffect(() => {
    if (hasOnlyGateModuleViewAccess(permissionsMap)) {
      router.replace("/gate");
    }
  }, [permissionsMap, router]);

  const {
    selectedBranchFilter: selectedBranchId,
    setSelectedBranchFilter: setSelectedBranchId,
    branchFilterOptions: branchOptions,
    isLoadingBranches,
    isBranchFilterDisabled,
    filterBranchId: hookFilterBranchId,
    isSuperAdmin: isDashboardBranchSuperAdmin,
  } = useBranchFilter();

  const { data: branchesData } = useGetBranchesQuery(undefined, {
    skip: !isDashboardBranchSuperAdmin,
  });

  const branchOptionsWithType = useMemo((): SelectOption[] => {
    const rows = branchesData?.data;
    const mapped =
      !Array.isArray(rows) || rows.length === 0
        ? branchOptions
        : branchOptions.map((opt) => {
            if (opt.value === "") return opt;
            const id = parseInt(String(opt.value), 10);
            if (!Number.isFinite(id)) return opt;
            const b = rows.find((x) => Number(x.id) === id);
            const t = b?.type?.trim();
            if (!b || !t) return opt;
            return {
              value: opt.value,
              label: `${b.name} (${capitalizeFirst(t)})`,
            };
          });
    if (isDashboardBranchSuperAdmin) {
      return mapped.filter((o) => o.value !== "");
    }
    return mapped;
  }, [branchOptions, branchesData, isDashboardBranchSuperAdmin]);

  /** Super Admin: default to first branch (no "All Branches" on dashboard). */
  useEffect(() => {
    if (!isDashboardBranchSuperAdmin) return;
    if (isLoadingBranches) return;
    const rows = branchesData?.data;
    if (!Array.isArray(rows) || rows.length === 0) return;
    if (selectedBranchId !== "") return;
    setSelectedBranchId(String(rows[0].id));
  }, [
    isDashboardBranchSuperAdmin,
    isLoadingBranches,
    branchesData,
    selectedBranchId,
    setSelectedBranchId,
  ]);

  const dashboardBranchId: number | null = isDashboardBranchSuperAdmin
    ? hookFilterBranchId != null && Number.isFinite(hookFilterBranchId) && hookFilterBranchId > 0
      ? hookFilterBranchId
      : null
    : userBranchId ?? 1;

  const skipBranch =
    !canView ||
    dashboardBranchId == null ||
    typeof dashboardBranchId !== "number" ||
    Number.isNaN(Number(dashboardBranchId));

  const branchId = dashboardBranchId ?? 0;

  const welcomeTitle = useMemo(() => {
    if (isDashboardBranchSuperAdmin && hookFilterBranchId != null && branchesData?.data) {
      const b = branchesData.data.find((x) => Number(x.id) === hookFilterBranchId);
      if (b?.name) return b.name;
    }
    return headerSelectedBranch?.name?.trim() || "SHUDDHI DERABASSI";
  }, [isDashboardBranchSuperAdmin, hookFilterBranchId, branchesData, headerSelectedBranch?.name]);

  const { data: appointmentsCountData, isLoading: isAppointmentsCountLoading } = useGetAppointmentsCountQuery(
    { branchId },
    { skip: skipBranch, refetchOnMountOrArgChange: true }
  );
  const { data: yesterdayAppointmentsData, isLoading: isYesterdayAppointmentsLoading } =
    useGetYesterdayAppointmentsCountQuery({ branchId }, { skip: skipBranch, refetchOnMountOrArgChange: true });
  const { data: todayRegistrationData, isLoading: isTodayRegistrationLoading } = useGetTodayRegistrationCountQuery(
    { branchId },
    { skip: skipBranch, refetchOnMountOrArgChange: true }
  );
  const todayAppointmentCount = appointmentsCountData?.data?.count ?? null;
  const yesterdayAppointmentCount = yesterdayAppointmentsData?.data?.count ?? null;
  const newRegistrationCount = todayRegistrationData?.data?.count ?? null;
  const { data: opdTypeWiseData, isLoading: isOpdTypeWiseLoading } = useGetOpdPatientTypeWiseCountQuery(
    { branchId },
    { skip: skipBranch, refetchOnMountOrArgChange: true }
  );
  const { data: todayConsultancyData, isLoading: isTodayConsultancyLoading } = useGetTodayTotalConsultancyQuery(
    { branchId },
    { skip: skipBranch, refetchOnMountOrArgChange: true }
  );
  const opdCounts = opdTypeWiseData?.data;
  const todayConsultancyTotal = todayConsultancyData?.data?.total;
  const consultancyDisplay =
    isTodayConsultancyLoading
      ? "—"
      : todayConsultancyTotal != null
        ? `₹ ${Number(todayConsultancyTotal).toLocaleString("en-IN")}`
        : "N/A";
  const showOpd = (n: number | undefined) =>
    isOpdTypeWiseLoading ? "—" : n !== undefined ? n : "—";
  const { data: doctorsData, isLoading: isDoctorsLoading } = useGetDoctorsByBranchQuery(
    { branchId },
    { skip: skipBranch, refetchOnMountOrArgChange: true }
  );
  const totalDoctorCount = doctorsData?.total ?? null;
  const {
    data: supportContactsResponse,
    isLoading: isSupportContactsLoading,
    isError: isSupportContactsError,
  } = useGetSupportContactsQuery(undefined, { skip: !canView });
  const supportCategories = useMemo(() => {
    const list = supportContactsResponse?.data;
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) as DashboardSupportCategory[];
  }, [supportContactsResponse?.data]);

  if (!canView) {
    return (
      <AppShell>
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
          You don&apos;t have permission to view dashboard.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <h5 className="font-[Inter] font-medium text-md leading-[120%] text-[#262D3B]">Welcome</h5>
          <PageHeading title={welcomeTitle} />
        </div>
        {isDashboardBranchSuperAdmin ? (
          <div className="flex-shrink-0" style={{ width: "300px" }}>
            <FormSelectField
              label=""
              value={selectedBranchId}
              onChange={(value) => {
                const newValue = Array.isArray(value) ? value[0] : value ?? "";
                setSelectedBranchId(newValue);
              }}
              options={branchOptionsWithType}
              placeholder={isLoadingBranches ? "Loading branches..." : "Select branch"}
              mode="single"
              background="normal"
              disabled={isBranchFilterDisabled || isLoadingBranches}
            />
          </div>
        ) : null}
        {/* <div className="flex gap-4 items-center">
          <button className="flex flex-row justify-center items-center py-3 px-6 gap-1 lg:h-[48px] md:h-[36px] border border-[#0B8C00] rounded-[32px] cursor-pointer hover:bg-[#0B8C00]/10 transition-colors">
            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">Therapy Schedule</span>
          </button>
          <button className="flex flex-row justify-center items-center py-3 px-6 gap-1 lg:h-[48px] md:h-[36px] border border-[#0B8C00] rounded-[32px] cursor-pointer hover:bg-[#0B8C00]/10 transition-colors">
            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">Show Active Patient</span>
          </button>
          <button className="flex flex-row justify-center items-center py-3 px-6 gap-1 lg:h-[48px] md:h-[36px] border border-[#0B8C00] rounded-[32px] cursor-pointer hover:bg-[#0B8C00]/10 transition-colors">
            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">Show Patient Token</span>
          </button>
          <button className="flex flex-row justify-center items-center py-3 px-6 gap-1 lg:h-[48px] md:h-[36px] border border-[#0B8C00] rounded-[32px] cursor-pointer hover:bg-[#0B8C00]/10 transition-colors">
            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">Mishu Beds Status</span>
          </button>

        </div> */}
      </div>

      {/* today sales and support details */}
      <div className="w-full rounded-[20px] border border-[#E3EEE1] p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 ">
            <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
              <Image src="/icons/todaysales.svg" alt="patient info" width={20} height={20} /> Today Sales
            </h4>
            <div className="bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-2xl p-4">
              <div className="grid grid-cols-2">
                <div className="border-b border-r border-[#DFE0E2] p-12 text-center">
                  <p className="font-inter font-semibold text-[32px] leading-[120%] text-[#262D3B]">{consultancyDisplay}</p>
                  <p className="font-inter font-normal text-[24px] leading-[120%] text-[#434956] mt-1">Consultancy</p>
                </div>
                <div className="border-b border-[#DFE0E2] p-12 text-center">
                  <p className="font-inter font-semibold text-[32px] leading-[120%] text-[#262D3B]">N/A</p>
                  <p className="font-inter font-normal text-[24px] leading-[120%] text-[#434956] mt-1">Service</p>
                </div>
                <div className="border-r border-[#DFE0E2] p-12 text-center">
                  <p className="font-inter font-semibold text-[32px] leading-[120%] text-[#262D3B]">N/A</p>
                  <p className="font-inter font-normal text-[24px] leading-[120%] text-[#434956] mt-1">Product</p>
                </div>
                <div className="border-0 border-[#DFE0E2] p-12 text-center">
                  <p className="font-inter font-semibold text-[32px] leading-[120%] text-[#262D3B]">N/A</p>
                  <p className="font-inter font-normal text-[24px] leading-[120%] text-[#434956] mt-1">Total</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            {isSupportContactsLoading && supportCategories.length === 0 ? (
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                <p className="font-inter font-medium text-[14px] leading-[120%] text-[#434956]">Loading support contacts…</p>
              </div>
            ) : isSupportContactsError ? (
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                <p className="font-inter font-medium text-[14px] leading-[120%] text-[#434956]">
                  Could not load support contacts. Please try again later.
                </p>
              </div>
            ) : supportCategories.length === 0 ? (
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                <p className="font-inter font-medium text-[14px] leading-[120%] text-[#434956]">No support contacts available.</p>
              </div>
            ) : (
              supportCategories.map((category, categoryIndex) => {
                const contacts = [...(category.contacts ?? [])].sort((a, b) => a.id - b.id);
                const cardTitle =
                  categoryIndex === 2 ? DASHBOARD_ESCALATION_CARD_TITLE : category.title;
                const isFirstColumnLayout = categoryIndex === 0;
                const contactRows = chunkSupportContactsPairs(contacts);

                return (
                  <div
                    key={category.id}
                    className={categoryIndex < supportCategories.length - 1 ? "mb-4" : ""}
                  >
                    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                      <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5 border-b border-[#DFE0E2] pb-4">
                        {cardTitle}
                      </h4>
                      {contacts.length === 0 ? (
                        <p className="font-inter font-medium text-[14px] leading-[120%] text-[#434956]/80">
                          No contacts listed.
                        </p>
                      ) : isFirstColumnLayout ? (
                        <div>
                          {contacts.map((c) => (
                            <p
                              key={c.id}
                              className="font-inter font-medium text-[14px] leading-[120%] text-[#434956] mb-3 last:mb-0"
                            >
                              {formatSupportContactLine(c)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div>
                          {contactRows.map(([left, right], rowIndex) => (
                            <div
                              key={`${left.id}-${right?.id ?? "x"}-${rowIndex}`}
                              className={`flex justify-between items-center gap-2 ${rowIndex < contactRows.length - 1 ? "mb-3" : ""}`}
                            >
                              <p className="font-inter font-medium text-[14px] leading-[120%] text-[#434956] shrink min-w-0">
                                {formatSupportContactLine(left)}
                              </p>
                              {right ? (
                                <p className="font-inter font-medium text-[14px] leading-[120%] text-[#434956] shrink min-w-0 text-right">
                                  {formatSupportContactLine(right)}
                                </p>
                              ) : (
                                <span className="flex-1 min-w-0 shrink" aria-hidden />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
      {/* today sales and support details */}

      {/* cards-registration and patient details */}
      <div className="w-full rounded-[20px] border border-[#E3EEE1] p-5 ">
        <div className="grid grid-cols-4 gap-4">

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">New Registration</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">
                {isTodayRegistrationLoading ? "—" : newRegistrationCount !== null ? newRegistrationCount : "—"}
              </h4>
            </div>
            <div>
              <PiStethoscopeBold fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Today Appointment</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">
                {isAppointmentsCountLoading ? "—" : todayAppointmentCount !== null ? todayAppointmentCount : "—"}
              </h4>
            </div>
            <div>
              <PiStethoscopeBold fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Yesterday Appointment</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">
                {isYesterdayAppointmentsLoading ? "—" : yesterdayAppointmentCount !== null ? yesterdayAppointmentCount : "—"}
              </h4>
            </div>
            <div>
              <PiStethoscopeBold fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Total Daycare Patient</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
            <div>
              <PiStethoscopeBold fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Total Active IPD Patient • <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.40209 1.03748L4.04167 3.79581L0.997921 4.23956C0.452088 4.31873 0.233338 4.99165 0.629171 5.37706L2.83125 7.52289L2.31042 10.5541C2.21667 11.1021 2.79375 11.5125 3.27709 11.2562L6 9.82498L8.72292 11.2562C9.20625 11.5104 9.78334 11.1021 9.68959 10.5541L9.16875 7.52289L11.3708 5.37706C11.7667 4.99165 11.5479 4.31873 11.0021 4.23956L7.95834 3.79581L6.59792 1.03748C6.35417 0.545813 5.64792 0.539563 5.40209 1.03748Z" fill="#FFC107" />
              </svg> VIP: 0</span></p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
            <div>
              <FaUsers fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Yesterday IPD Patient • <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.40209 1.03748L4.04167 3.79581L0.997921 4.23956C0.452088 4.31873 0.233338 4.99165 0.629171 5.37706L2.83125 7.52289L2.31042 10.5541C2.21667 11.1021 2.79375 11.5125 3.27709 11.2562L6 9.82498L8.72292 11.2562C9.20625 11.5104 9.78334 11.1021 9.68959 10.5541L9.16875 7.52289L11.3708 5.37706C11.7667 4.99165 11.5479 4.31873 11.0021 4.23956L7.95834 3.79581L6.59792 1.03748C6.35417 0.545813 5.64792 0.539563 5.40209 1.03748Z" fill="#FFC107" />
              </svg> VIP: 0</span></p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
            <div>
              <FaUsers fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Today IPD Patient • <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.40209 1.03748L4.04167 3.79581L0.997921 4.23956C0.452088 4.31873 0.233338 4.99165 0.629171 5.37706L2.83125 7.52289L2.31042 10.5541C2.21667 11.1021 2.79375 11.5125 3.27709 11.2562L6 9.82498L8.72292 11.2562C9.20625 11.5104 9.78334 11.1021 9.68959 10.5541L9.16875 7.52289L11.3708 5.37706C11.7667 4.99165 11.5479 4.31873 11.0021 4.23956L7.95834 3.79581L6.59792 1.03748C6.35417 0.545813 5.64792 0.539563 5.40209 1.03748Z" fill="#FFC107" />
              </svg> VIP: 0</span></p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
            <div>
              <FaUsers fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Today Daycare Patient</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
            <div>
              <svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42.1875 26.7188C42.1878 25.4241 41.8307 24.1546 41.1556 23.05C40.4804 21.9454 39.5134 21.0486 38.3611 20.4585C37.2088 19.8685 35.9159 19.608 34.625 19.7058C33.3341 19.8036 32.0953 20.2559 31.0451 21.0128C29.9948 21.7698 29.1739 22.802 28.6729 23.9957C28.1719 25.1895 28.0102 26.4983 28.2055 27.7781C28.4009 29.0579 28.9458 30.2589 29.7802 31.2487C30.6146 32.2385 31.7061 32.9788 32.9344 33.3879C32.6959 34.4862 32.0888 35.4699 31.2139 36.1753C30.3389 36.8808 29.2489 37.2655 28.125 37.2656H23.9062C22.6009 37.2656 21.349 36.7471 20.426 35.824C19.5029 34.901 18.9844 33.6491 18.9844 32.3438V25.8223C24.5619 24.8062 28.8281 19.8299 28.8281 13.9166V7.03125C28.8281 6.56957 28.7372 6.11241 28.5605 5.68588C28.3838 5.25934 28.1249 4.87178 27.7984 4.54533C27.472 4.21887 27.0844 3.95991 26.6579 3.78324C26.2313 3.60656 25.7742 3.51562 25.3125 3.51562H22.5C21.9406 3.51562 21.404 3.73786 21.0084 4.13345C20.6129 4.52903 20.3906 5.06556 20.3906 5.625C20.3906 6.18444 20.6129 6.72097 21.0084 7.11655C21.404 7.51214 21.9406 7.73438 22.5 7.73438H24.6094V13.9166C24.6094 18.2057 21.1869 21.7424 16.9787 21.7969C15.9543 21.8106 14.9374 21.6207 13.987 21.2382C13.0367 20.8556 12.1717 20.2881 11.4425 19.5685C10.7133 18.849 10.1343 17.9917 9.73913 17.0465C9.34397 16.1013 9.14053 15.087 9.14062 14.0625V7.73438H11.25C11.8094 7.73438 12.346 7.51214 12.7416 7.11655C13.1371 6.72097 13.3594 6.18444 13.3594 5.625C13.3594 5.06556 13.1371 4.52903 12.7416 4.13345C12.346 3.73786 11.8094 3.51562 11.25 3.51562H8.4375C7.5051 3.51562 6.61089 3.88602 5.95158 4.54533C5.29227 5.20464 4.92188 6.09885 4.92188 7.03125V14.0625C4.92199 16.8667 5.90804 19.5817 7.70753 21.7324C9.50702 23.8831 12.0054 25.3327 14.7656 25.8275V32.3438C14.7684 34.7671 15.7323 37.0905 17.4459 38.8041C19.1595 40.5177 21.4829 41.4816 23.9062 41.4844H28.125C30.3571 41.4817 32.5113 40.6633 34.1822 39.1831C35.853 37.703 36.9252 35.6632 37.1971 33.4477C38.6395 33.0078 39.9028 32.1168 40.8011 30.9055C41.6994 29.6943 42.1853 28.2268 42.1875 26.7188ZM35.1562 29.5312C34.6 29.5312 34.0562 29.3663 33.5937 29.0573C33.1312 28.7482 32.7707 28.309 32.5578 27.795C32.345 27.2811 32.2893 26.7156 32.3978 26.1701C32.5063 25.6245 32.7742 25.1233 33.1675 24.73C33.5608 24.3367 34.062 24.0688 34.6076 23.9603C35.1531 23.8518 35.7186 23.9075 36.2325 24.1203C36.7465 24.3332 37.1857 24.6937 37.4948 25.1562C37.8038 25.6187 37.9688 26.1625 37.9688 26.7188C37.9688 27.4647 37.6724 28.18 37.145 28.7075C36.6175 29.2349 35.9022 29.5312 35.1562 29.5312Z" fill="#0B8C00" />
              </svg>
            </div>
          </div>

        </div>
      </div>
      {/* cards-registration and patient details */}

      {/* staff Overview  */}
      <div className="w-full rounded-[20px] bg-white border border-[#E3EEE1] p-5 ">
        <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
          <Image src="/icons/staffuser.svg" alt="staff info" width={20} height={20} /> Staff Overview
        </h4>
        <div className="grid grid-cols-3 gap-4">

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Total Doctor</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">
                {isDoctorsLoading ? "—" : totalDoctorCount !== null ? totalDoctorCount : "—"}
              </h4>
            </div>
            <div>
              <FaUserDoctor fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Total Nurse</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
            <div>
              <FaUserDoctor fontSize={45} color="#0B8C00" />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
            <div>
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Total Therapist</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
            <div>
              <FaUserAlt fontSize={45} color="#0B8C00" />
            </div>
          </div>

        </div>
      </div>
      {/* staff Overview  */}

      {/* Hospital Room & Bed Management */}
      <div className="w-full rounded-[20px] bg-white border border-[#E3EEE1] p-5 relative">
        <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
          <Image src="/icons/hospitalicon.svg" alt="Hospital info" width={20} height={20} /> Hospital Room & Bed Management
        </h4>
        <div className="grid grid-cols-6 gap-4">

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-center items-center">
            <div className="text-center">
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Total Rooms</p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-center items-center relative">
            <div className="text-center">
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex gap-1 items-center justify-center">
                Occupied Beds
                <span
                  className="relative cursor-pointer"
                  onMouseEnter={() => setShowOccupiedTooltip(true)}
                  onMouseLeave={() => setShowOccupiedTooltip(false)}
                >
                  <FaInfoCircle fontSize={18} />
                </span>
              </p>
              
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-center items-center">
            <div className="text-center">
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex gap-1 items-center">Ready to Move
              </p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-center items-center">
            <div className="text-center">
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex gap-1 items-center">Cleaning
              </p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-center items-center">
            <div className="text-center">
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex gap-1 items-center">Total Discharge
              </p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-center items-center">
            <div className="text-center">
              <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex gap-1 items-center">Reserved
              </p>
              <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
            </div>
          </div>

        </div>
        {showOccupiedTooltip && (
          <div className="info-details bg-[#CCEEDD] rounded-lg p-3 w-[75%] transition-all duration-200 absolute">
            <div className="absolute top-[calc(100%+25px-18px)] left-6 z-[51]">
                <div className="absolute top-0 left-0 w-0 h-0 border-l-[18px] border-r-[18px] border-b-[18px] border-l-transparent border-r-transparent border-b-white">
                </div>
              </div>
            <div className="grid grid-cols-6 gap-4">

              {/* Private */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Private</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* Private Share */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Private Share</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* Semi-Private */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Semi-Private</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]"></h4>
                </div>
              </div>

              {/* General Ward */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">General Ward</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* General Ward2 */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">General Ward2</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* VIP */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">VIP</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* Emergency */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Emergency</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* Staff */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Staff</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* Medical */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Medical</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* Cottage */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Cottage</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* Panchakarma */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Panchakarma</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

              {/* Hall */}
              <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-3 flex justify-center items-center">
                <div className="text-center">
                  <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Hall</p>
                  <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Hospital Room & Bed Management */}

      {/* opd and ipd patient details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="w-full rounded-[20px] bg-white border border-[#E3EEE1] p-5 ">
          <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
            <Image src="/icons/multiuser.svg" alt="OPD info" width={20} height={20} /> OPD Patient
          </h4>
          <div className="grid grid-cols-3 gap-4">

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Private</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">{showOpd(opdCounts?.normal)}</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Govt Emp <FaInfoCircle fontSize={18} /></p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">{showOpd(opdCounts?.panel)}</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Re-Visit/Old</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">{showOpd(opdCounts?.revisit)}</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Advance</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">0</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Pre Booking</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">{showOpd(opdCounts?.prebooking)}</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">TPA</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">{showOpd(opdCounts?.tpa)}</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

          </div>
        </div>

        <div className="w-full rounded-[20px] bg-white border border-[#E3EEE1] p-5 ">
          <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
            <Image src="/icons/multiuser.svg" alt="IPD info" width={20} height={20} /> IPD Active Patient
          </h4>
          <div className="grid grid-cols-3 gap-4">

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4">Private</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Govt Emp <FaInfoCircle fontSize={18} /></p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Re-Visit/Old</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Advance</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">Pre Booking</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-[14px] leading-[120%] text-[#434956] mb-4 flex items-center gap-1">TPA</p>
                <h4 className="font-semibold text-[24px] leading-[120%] text-[#434956]">-</h4>
              </div>
              <div>
                <FaUsers fontSize={45} color="#0B8C00" />
              </div>
            </div>

          </div>
        </div>

      </div>
      {/* opd and ipd patient details */}
    </AppShell>
  );
}
