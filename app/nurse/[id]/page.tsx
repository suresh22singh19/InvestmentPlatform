"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useRef } from "react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { Tooltip } from "@/components/ui/Tooltip";
import { NurseAvatarImage } from "@/components/nurse/NurseAvatarImage";
import { NurseCredentialsSection } from "@/components/nurse/NurseCredentialsSection";
import {
    loginTypeLabel,
    nurseBranchDisplayLabel,
    nurseStatusDisplayLabel,
} from "@/lib/nurse/mapNurseApi";
import { useAppSelector } from "@/store/hooks";
import { selectRoleCategoryType, selectSelectedBranch } from "@/store/slices/authSlice";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useGetNursesQuery } from "@/store/api/nurseApi";

function TruncatedTextValue({ text }: { text: string | null | undefined }) {
    const value = text?.trim() ? text.trim() : "—";
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const element = textRef.current;
        if (!element) return;

        const checkTruncation = () => {
            setIsTruncated(element.scrollWidth > element.clientWidth + 1);
        };

        checkTruncation();

        const observer = new ResizeObserver(checkTruncation);
        observer.observe(element);
        return () => observer.disconnect();
    }, [value]);

    if (value === "—") {
        return <span>—</span>;
    }

    return (
        <Tooltip
            position="top"
            maxWidth={360}
            disabled={!isTruncated}
            className="!overflow-visible !py-2.5"
            content={
                <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
                    {value}
                </p>
            }
        >
            <span ref={textRef} className="block min-w-0 w-full truncate whitespace-nowrap font-medium text-[#262D3B]">
                {value}
            </span>
        </Tooltip>
    );
}

function FieldCell({ label, value }: { label: string; value: React.ReactNode }) {
    const isTargetField = label === "Name" || label === "Email/Username" || label === "Email";
    const renderValue = isTargetField && typeof value === "string" ? <TruncatedTextValue text={value} /> : value;
    return (
        <div className="min-w-0 overflow-hidden space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 last:border-0 md:px-0 lg:px-4">
            <p className="text-xs font-medium text-[#7B8089] truncate whitespace-nowrap">{label}</p>
            <div className="text-sm font-medium text-[#262D3B] min-w-0 overflow-hidden truncate whitespace-nowrap">{renderValue}</div>
        </div>
    );
}

export default function NurseViewPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const rawId = params?.id;
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    const branchIdParam = Number(searchParams?.get("branchId"));
    const branchId = Number.isFinite(branchIdParam) && branchIdParam > 0 ? branchIdParam : undefined;
    const isCredentialsSection = searchParams?.get("section") === "credentials";
    const selectedBranch = useAppSelector(selectSelectedBranch);
    const roleCategoryType = useAppSelector(selectRoleCategoryType);
    const isSuperAdmin = roleCategoryType?.toLowerCase() === "superadmin";

    const { data: branchesData } = useGetBranchesQuery(undefined, {
        skip: !isSuperAdmin,
    });

    const resolveBranchNameById = useMemo(() => {
        return (id: string): string | undefined => {
            const rows = branchesData?.data;
            if (Array.isArray(rows)) {
                const found = rows.find((b) => String(b.id) === id);
                if (found?.name) return found.name;
            }
            if (selectedBranch && String(selectedBranch.id) === id) {
                return selectedBranch.name ?? undefined;
            }
            return undefined;
        };
    }, [branchesData, selectedBranch]);

    const { data, isLoading, isFetching } = useGetNursesQuery(
        {
            page: 1,
            limit: 500,
            search: "",
            branchId: branchId ?? 0,
            sort: "",
            order: "ASC",
        },
        { skip: !Number.isFinite(id) || id <= 0 || branchId == null }
    );

    const nurse = useMemo(() => data?.data?.find((d) => d.id === id), [data, id]);

    if (!Number.isFinite(id) || id <= 0) {
        notFound();
    }

    if (branchId == null) {
        return (
            <AppShell>
                <div className="space-y-8 pb-10">
                    <PageHeading title="View Details" />
                    <p className="text-sm text-[#7B8089]">
                        Missing branch context. Open this page from the nurse list, or add{" "}
                        <code className="rounded bg-[#F3F4F6] px-1">?branchId=</code> to the URL.
                    </p>
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/nurse")} />
                </div>
            </AppShell>
        );
    }

    if (!isLoading && !isFetching && !nurse) {
        notFound();
    }

    if (!nurse) {
        return (
            <AppShell>
                <div className="space-y-8 pb-10">
                    <PageHeading title="View Details" />
                    <p className="text-sm text-[#9CA3AF]">Loading…</p>
                </div>
            </AppShell>
        );
    }

    if (isCredentialsSection) {
        return (
            <NurseCredentialsSection
                nurseId={id}
                branchId={branchId}
                email={nurse.email}
            />
        );
    }

    return (
        <AppShell>
            <div className="space-y-8 pb-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <PageHeading title="View Details" />
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/nurse")} />
                </div>

                <div className="view-registration-container">
                    <div className="mb-4 w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4">
                        <div className="mb-4 grid grid-cols-12 gap-4">
                            <div className="col-span-12 space-y-4">
                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/patientinfo.svg" alt="" width={20} height={20} /> Basic
                                        Information
                                    </h4>
                                    <div className="space-y-1 px-4 py-[10px] md:px-0 lg:px-4">
                                        <p className="text-xs font-medium text-[#7B8089]">Profile Photo</p>
                                        <p className="text-sm font-medium text-[#262D3B]">
                                            <span className="inline-block overflow-hidden rounded-full">
                                                <NurseAvatarImage
                                                    imgUrl={nurse.imgUrl}
                                                    size={140}
                                                    className="h-[140px] w-[140px] rounded-full border border-[#E3EEE1] bg-[#F3F4F6] object-cover"
                                                />
                                            </span>
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                            <FieldCell
                                                label="Branch"
                                                value={nurseBranchDisplayLabel(nurse, resolveBranchNameById)}
                                            />
                                            <FieldCell label="Name" value={nurse.name} />
                                            <FieldCell label="Email/Username" value={nurse.email} />
                                            <FieldCell label="Contact" value={nurse.phone || "—"} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                            <FieldCell label="Login Type" value={loginTypeLabel(nurse.loginType)} />
                                            <FieldCell label="Employee Id" value={nurse.empId} />
                                            <FieldCell label="Status" value={nurseStatusDisplayLabel(nurse)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/addressicon.svg" alt="" width={20} height={20} /> Address
                                        Information
                                    </h4>
                                    <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                        <FieldCell label="Address" value={nurse.address || "—"} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <BackToPreviousPageButton text="Back" onClick={() => router.push("/nurse")} />
                </div>
            </div>
        </AppShell>
    );
}