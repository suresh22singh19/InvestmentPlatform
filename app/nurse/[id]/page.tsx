"use client";

import { useMemo } from "react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
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

function FieldCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 last:border-0 md:px-0 lg:px-4 break-words">
            <p className="text-xs font-medium text-[#7B8089]">{label}</p>
            <p className="text-sm font-medium text-[#262D3B]">{value}</p>
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
                    <PageHeading title="View Nurse" />
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
                    <PageHeading title="View Nurse" />
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
                    <PageHeading title="View Nurse" />
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/nurse")} />
                </div>

                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5">
                    <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4">
                        <FieldCell
                            label="Branch"
                            value={nurseBranchDisplayLabel(nurse, resolveBranchNameById)}
                        />
                        <div className="space-y-1 py-[10px] px-4">
                            <p className="text-xs font-medium text-[#7B8089]">Profile Image</p>
                            <NurseAvatarImage
                                imgUrl={nurse.imgUrl}
                                size={80}
                                className="h-20 w-20 rounded-full border border-[#E3EEE1] object-cover"
                            />
                        </div>
                        <FieldCell label="Name" value={nurse.name} />
                        <FieldCell label="Email" value={nurse.email} />
                        <FieldCell label="Address" value={nurse.address || "—"} />
                        <FieldCell label="Phone" value={nurse.phone || "—"} />
                        <FieldCell label="Emp ID" value={nurse.empId} />
                        <FieldCell label="Login Type" value={loginTypeLabel(nurse.loginType)} />
                        <FieldCell label="Status" value={nurseStatusDisplayLabel(nurse)} />
                    </div>
                </div>

                <div className="flex justify-end">
                    <BackToPreviousPageButton text="Back" onClick={() => router.push("/nurse")} />
                </div>
            </div>
        </AppShell>
    );
}