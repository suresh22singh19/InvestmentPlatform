"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { MessageDialog } from "@/components/ui/MessageDialog";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { Tabs } from "@/components/ui/Tabs";
import { ListBorder } from "@/components/ui/ListBorder";
import { FormInputField } from "@/components/ui/FormInputField";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import { FormSelectField } from "@/components/ui/FormSelectField";
import { Pagination } from "@/components/ui/Pagination";
import { Tooltip } from "@/components/ui/Tooltip";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useCreateArogyaCardMutation, useGetArogyaCardsQuery, useUpdateArogyaCardStatusMutation, useUpdateArogyaCardMutation, useDeleteArogyaCardMutation, ArogyaCard } from "@/store/api/settingHealthCardApi";
import { Dialog } from "@/components/ui/Dialog";
import { useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";
import { SpinnerLoader } from "@/components/ui/SpinnerLoader";
import { CardImageCropperModal } from "@/components/ui/CardImageCropperModal";
import PhotoCapture, { type PhotoCaptureRef } from "@/components/forms/PhotoCapture";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableData,
} from "@/components/ui/Table";
import { formatIndianAmount, parseIndianAmount } from "@/store/utils/formatIndianAmount";

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface PolicyConfig {
    referrer: string;
    referee: string;
    loyal: string;
    pointsLockedFor: string;
    compTests1: boolean;
    compTests2: boolean;
    remarks: string;
}

interface BranchRule {
    branchId: string;
    branchName: string;
    branchArea: string;
    consultancy: PolicyConfig;
    services: PolicyConfig;
    products: PolicyConfig;
    labTest: PolicyConfig;
    fibroScan: PolicyConfig;
    welcome: PolicyConfig;
    isOverride: boolean;
}

interface HealthCard {
    id: string;
    cardName: string;
    cardType: string;
    description: string;
    status: "Active" | "Inactive" | "Paused";
    seriesStart: string;
    seriesEnd: string;
    pointValuation: string;
    pointsExpireAfter: string;
    createdAt: string;
    branches: string[];
    branchRules: BranchRule[];
    cardImage?: File | null;
    photoUrl?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const POLICY_PERCENTAGE_FIELDS = [
    { key: "referrer" as const, label: "Referrer Gets (Inviter / Sender) *" },
    { key: "referee" as const, label: "Referee Gets (New User / Receiver) *" },
    { key: "loyal" as const, label: "Loyal Patient (Direct Patient Gets) *" },
];

const POLICY_COMP_TEST_FIELDS = [
    { key: "compTests1" as const, label: "Complimentary Health Gold Package (Worth Rs. 2300.00)" },
    { key: "compTests2" as const, label: "Complimentary Health Gold Package (Worth Rs. 2300.00)" },
];

const POLICY_CATEGORIES = [
    { key: "welcome" as const, label: "Welcome Points" },
    { key: "consultancy" as const, label: "Consultancy" },
    { key: "services" as const, label: "Services" },
    { key: "products" as const, label: "Products" },
    { key: "labTest" as const, label: "Lab Test" },
    { key: "fibroScan" as const, label: "Fibro Scan" },
];

const createDefaultPolicyConfig = (referrer = "", referee = "", loyal = "", pointsLockedFor = ""): PolicyConfig => ({
    referrer,
    referee,
    loyal,
    pointsLockedFor,
    compTests1: false,
    compTests2: false,
    remarks: "",
});

const createBranchRule = (branchId: string, name: string, area: string, isOverride = false): BranchRule => ({
    branchId,
    branchName: name,
    branchArea: area,
    consultancy: createDefaultPolicyConfig(),
    services: createDefaultPolicyConfig(),
    products: createDefaultPolicyConfig(),
    labTest: createDefaultPolicyConfig(),
    fibroScan: createDefaultPolicyConfig(),
    welcome: createDefaultPolicyConfig(),
    isOverride,
});

const renderPercentageBadge = (value: string | number, type: "green" | "yellow", isPts?: boolean) => {
    const valText = `${value || 0}${isPts ? " Pts" : "%"}`;
    const themeClass = type === "green"
        ? "text-[#16A34A] bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.15)]"
        : "text-[#B45309] bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.2)]";
    return (
        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] border text-[10px] font-semibold font-mono min-w-[28px] text-center ${themeClass}`}>
            {valText}
        </span>
    );
};

const renderCategoryCell = (config: PolicyConfig, isPts?: boolean) => {
    const refVal = config?.referrer !== undefined && config?.referrer !== "" ? config.referrer : "0";
    const ref2Val = config?.referee !== undefined && config?.referee !== "" ? config.referee : "0";
    const loyalVal = config?.loyal !== undefined && config?.loyal !== "" ? config.loyal : "0";
    return (
        <div className="flex items-center justify-center gap-1 py-1">
            {renderPercentageBadge(refVal, "green", isPts)}
            {renderPercentageBadge(ref2Val, "green", isPts)}
            {renderPercentageBadge(loyalVal, "yellow", isPts)}
        </div>
    );
};

const mapLocalToApiRule = (rule: BranchRule) => {
    return {
        consultantBy: Number(rule.consultancy.referrer) || 0,
        consultantTo: Number(rule.consultancy.referee) || 0,
        productBy: Number(rule.products.referrer) || 0,
        productTo: Number(rule.products.referee) || 0,
        serviceBy: Number(rule.services.referrer) || 0,
        serviceTo: Number(rule.services.referee) || 0,
        pathologyBy: Number(rule.labTest.referrer) || 0,
        pathologyTo: Number(rule.labTest.referee) || 0,
        fibroscanBy: Number(rule.fibroScan.referrer) || 0,
        fibroscanTo: Number(rule.fibroScan.referee) || 0,
        loyalPatientConsultant: Number(rule.consultancy.loyal) || 0,
        loyalPatientProduct: Number(rule.products.loyal) || 0,
        loyalPatientService: Number(rule.services.loyal) || 0,
        loyalPatientPathology: Number(rule.labTest.loyal) || 0,
        loyalPatientFibroscan: Number(rule.fibroScan.loyal) || 0,
        consultPointLockHour: Number(rule.consultancy.pointsLockedFor) || 0,
        prodPointLockHour: Number(rule.products.pointsLockedFor) || 0,
        servicePointLockHour: Number(rule.services.pointsLockedFor) || 0,
        pathologyPointLockHour: Number(rule.labTest.pointsLockedFor) || 0,
        fibroscanPointLockHour: Number(rule.fibroScan.pointsLockedFor) || 0,
        welcomePointLockHour: Number(rule.welcome.pointsLockedFor) || 0,
        welcomeReferrerPoint: Number(rule.welcome.referrer) || 0,
        welcomeRefereePoint: Number(rule.welcome.referee) || 0,
        welcomeLoyalPoint: Number(rule.welcome.loyal) || 0,
        loyalPatientConsultantPackage: rule.consultancy.compTests2,
        refereePatientConsultantPackage: rule.consultancy.compTests1
    };
};

const mapApiToLocalCard = (apiCard: ArogyaCard, availableBranches: { id: string; name: string; type: string; state: string; area: string }[]): HealthCard => {
    const status: "Active" | "Inactive" | "Paused" =
        apiCard.status?.toLowerCase() === "active"
            ? "Active"
            : apiCard.status?.toLowerCase() === "paused"
                ? "Paused"
                : "Inactive";
    const apiDefaultRule = apiCard.defaultRule || apiCard.branchRules?.find(r => r.isDefaultRule);

    const mapApiConfigToPolicy = (apiRule: any, category: "consultancy" | "products" | "services" | "labTest" | "fibroScan" | "welcome") => {
        if (!apiRule) return createDefaultPolicyConfig();
        switch (category) {
            case "consultancy":
                return {
                    referrer: apiRule.consultantBy != null ? String(apiRule.consultantBy) : "",
                    referee: apiRule.consultantTo != null ? String(apiRule.consultantTo) : "",
                    loyal: apiRule.loyalPatientConsultant != null ? String(apiRule.loyalPatientConsultant) : "",
                    pointsLockedFor: apiRule.consultPointLockHour != null ? String(apiRule.consultPointLockHour) : "",
                    compTests1: apiRule.refereePatientConsultantPackage ?? true,
                    compTests2: apiRule.loyalPatientConsultantPackage ?? true,
                    remarks: "",
                };
            case "products":
                return {
                    referrer: apiRule.productBy != null ? String(apiRule.productBy) : "",
                    referee: apiRule.productTo != null ? String(apiRule.productTo) : "",
                    loyal: apiRule.loyalPatientProduct != null ? String(apiRule.loyalPatientProduct) : "",
                    pointsLockedFor: apiRule.prodPointLockHour != null ? String(apiRule.prodPointLockHour) : "",
                    compTests1: true,
                    compTests2: true,
                    remarks: "",
                };
            case "services":
                return {
                    referrer: apiRule.serviceBy != null ? String(apiRule.serviceBy) : "",
                    referee: apiRule.serviceTo != null ? String(apiRule.serviceTo) : "",
                    loyal: apiRule.loyalPatientService != null ? String(apiRule.loyalPatientService) : "",
                    pointsLockedFor: apiRule.servicePointLockHour != null ? String(apiRule.servicePointLockHour) : "",
                    compTests1: true,
                    compTests2: true,
                    remarks: "",
                };
            case "labTest":
                return {
                    referrer: apiRule.pathologyBy != null ? String(apiRule.pathologyBy) : "",
                    referee: apiRule.pathologyTo != null ? String(apiRule.pathologyTo) : "",
                    loyal: apiRule.loyalPatientPathology != null ? String(apiRule.loyalPatientPathology) : "",
                    pointsLockedFor: apiRule.pathologyPointLockHour != null ? String(apiRule.pathologyPointLockHour) : "",
                    compTests1: true,
                    compTests2: true,
                    remarks: "",
                };
            case "fibroScan":
                return {
                    referrer: apiRule.fibroscanBy != null ? String(apiRule.fibroscanBy) : (apiRule.radiologyBy != null ? String(apiRule.radiologyBy) : ""),
                    referee: apiRule.fibroscanTo != null ? String(apiRule.fibroscanTo) : (apiRule.radiologyTo != null ? String(apiRule.radiologyTo) : ""),
                    loyal: apiRule.loyalPatientFibroscan != null ? String(apiRule.loyalPatientFibroscan) : "",
                    pointsLockedFor: apiRule.fibroscanPointLockHour != null ? String(apiRule.fibroscanPointLockHour) : "",
                    compTests1: true,
                    compTests2: true,
                    remarks: "",
                };
            case "welcome":
                return {
                    referrer: apiRule.welcomeReferrerPoint != null ? String(apiRule.welcomeReferrerPoint) : "",
                    referee: apiRule.welcomeRefereePoint != null ? String(apiRule.welcomeRefereePoint) : "",
                    loyal: apiRule.welcomeLoyalPoint != null ? String(apiRule.welcomeLoyalPoint) : "",
                    pointsLockedFor: apiRule.welcomePointLockHour != null ? String(apiRule.welcomePointLockHour) : "",
                    compTests1: true,
                    compTests2: true,
                    remarks: "",
                };
            default:
                return createDefaultPolicyConfig();
        }
    };

    const defaultBranchRule: BranchRule = {
        branchId: "default",
        branchName: "Default policy",
        branchArea: "Baseline",
        consultancy: mapApiConfigToPolicy(apiDefaultRule, "consultancy"),
        services: mapApiConfigToPolicy(apiDefaultRule, "services"),
        products: mapApiConfigToPolicy(apiDefaultRule, "products"),
        labTest: mapApiConfigToPolicy(apiDefaultRule, "labTest"),
        fibroScan: mapApiConfigToPolicy(apiDefaultRule, "fibroScan"),
        welcome: mapApiConfigToPolicy(apiDefaultRule, "welcome"),
        isOverride: false,
    };

    const linkedBranchIds = (apiCard.branchRules || [])
        .map(r => String(r.branchId));

    const branchRules: BranchRule[] = [defaultBranchRule];

    availableBranches.forEach(b => {
        const apiRule = apiCard.branchRules?.find(r => String(r.branchId) === b.id);
        if (apiRule) {
            branchRules.push({
                branchId: b.id,
                branchName: b.name,
                branchArea: b.area,
                consultancy: mapApiConfigToPolicy(apiRule, "consultancy"),
                services: mapApiConfigToPolicy(apiRule, "services"),
                products: mapApiConfigToPolicy(apiRule, "products"),
                labTest: mapApiConfigToPolicy(apiRule, "labTest"),
                fibroScan: mapApiConfigToPolicy(apiRule, "fibroScan"),
                welcome: mapApiConfigToPolicy(apiRule, "welcome"),
                isOverride: !apiRule.isDefaultRule,
            });
        } else {
            branchRules.push({
                branchId: b.id,
                branchName: b.name,
                branchArea: b.area,
                consultancy: createDefaultPolicyConfig(),
                services: createDefaultPolicyConfig(),
                products: createDefaultPolicyConfig(),
                labTest: createDefaultPolicyConfig(),
                fibroScan: createDefaultPolicyConfig(),
                welcome: createDefaultPolicyConfig(),
                isOverride: false,
            });
        }
    });

    return {
        id: String(apiCard.id),
        cardName: apiCard.cardName,
        cardType: apiCard.cardName.toLowerCase().includes("gold") ? "gold" : "silver",
        description: apiCard.description || "",
        status,
        seriesStart: apiCard.seriesStart != null ? String(apiCard.seriesStart) : "",
        seriesEnd: apiCard.seriesEnd != null ? String(apiCard.seriesEnd) : "",
        pointValuation: apiCard.pointValuation,
        pointsExpireAfter: String(apiCard.pointExpiryDays),
        createdAt: apiCard.createdAt ? new Date(apiCard.createdAt).toLocaleString("en-GB", { hour12: true }) : "",
        branches: linkedBranchIds,
        branchRules,
        cardImage: null,
        photoUrl: apiCard.image || null,
    };
};

const INITIAL_CARDS: HealthCard[] = [
    {
        id: "1",
        cardName: "Gold Health Card",
        cardType: "gold",
        description: "Standard gold policy card.",
        status: "Active",
        seriesStart: "50503030123",
        seriesEnd: "50503030999",
        pointValuation: "1.00",
        pointsExpireAfter: "3",
        createdAt: "10-03-2026 10:30 AM",
        branches: ["1", "2", "3", "4"],
        branchRules: [
            {
                branchId: "default",
                branchName: "Default policy",
                branchArea: "Baseline",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: false,
            },
            {
                branchId: "1",
                branchName: "Chandigarh",
                branchArea: "Sector 34",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "2",
                branchName: "Vaishali UP",
                branchArea: "Ghaziabad",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: { ...createDefaultPolicyConfig("5", "5", "5"), compTests1: false, compTests2: false },
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "3",
                branchName: "Delhi",
                branchArea: "Karol Bagh",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "4",
                branchName: "Mumbai",
                branchArea: "Andheri West",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
        ],
    },
    {
        id: "2",
        cardName: "Silver Health Card",
        cardType: "silver",
        description: "Standard silver policy card.",
        status: "Active",
        seriesStart: "50503031000",
        seriesEnd: "50503031500",
        pointValuation: "0.50",
        pointsExpireAfter: "3",
        createdAt: "11-03-2026 11:30 AM",
        branches: ["1", "2", "3", "4"],
        branchRules: [
            {
                branchId: "default",
                branchName: "Default policy",
                branchArea: "Baseline",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: false,
            },
            {
                branchId: "1",
                branchName: "Chandigarh",
                branchArea: "Sector 34",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "2",
                branchName: "Vaishali UP",
                branchArea: "Ghaziabad",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: { ...createDefaultPolicyConfig("5", "5", "5"), compTests1: false, compTests2: false },
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "3",
                branchName: "Delhi",
                branchArea: "Karol Bagh",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "4",
                branchName: "Mumbai",
                branchArea: "Andheri West",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
        ],
    },
    {
        id: "3",
        cardName: "Jeena Sikho Gold",
        cardType: "gold",
        description: "Jeena Sikho promotion card.",
        status: "Inactive",
        seriesStart: "100001",
        seriesEnd: "150000",
        pointValuation: "1.00",
        pointsExpireAfter: "7",
        createdAt: "12-03-2026 09:15 AM",
        branches: ["1", "2", "3", "4"],
        branchRules: [
            {
                branchId: "default",
                branchName: "Default policy",
                branchArea: "Baseline",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: false,
            },
            {
                branchId: "1",
                branchName: "Chandigarh",
                branchArea: "Sector 34",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "2",
                branchName: "Vaishali UP",
                branchArea: "Ghaziabad",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: { ...createDefaultPolicyConfig("5", "5", "5"), compTests1: false, compTests2: false },
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "3",
                branchName: "Delhi",
                branchArea: "Karol Bagh",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "4",
                branchName: "Mumbai",
                branchArea: "Andheri West",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
        ],
    },
    {
        id: "4",
        cardName: "Wellness Silver",
        cardType: "silver",
        description: "Standard Wellness program card.",
        status: "Inactive",
        seriesStart: "200001",
        seriesEnd: "220000",
        pointValuation: "0.50",
        pointsExpireAfter: "5",
        createdAt: "13-03-2026 02:45 PM",
        branches: ["1", "2", "3", "4"],
        branchRules: [
            {
                branchId: "default",
                branchName: "Default policy",
                branchArea: "Baseline",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: false,
            },
            {
                branchId: "1",
                branchName: "Chandigarh",
                branchArea: "Sector 34",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "2",
                branchName: "Vaishali UP",
                branchArea: "Ghaziabad",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: { ...createDefaultPolicyConfig("5", "5", "5"), compTests1: false, compTests2: false },
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "3",
                branchName: "Delhi",
                branchArea: "Karol Bagh",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
            {
                branchId: "4",
                branchName: "Mumbai",
                branchArea: "Andheri West",
                consultancy: createDefaultPolicyConfig("5", "5", "5"),
                services: createDefaultPolicyConfig("5", "5", "5"),
                products: createDefaultPolicyConfig("5", "5", "5"),
                labTest: createDefaultPolicyConfig("5", "5", "5"),
                fibroScan: createDefaultPolicyConfig("5", "5", "5"),
                welcome: createDefaultPolicyConfig("5", "5", "5"),
                isOverride: true,
            },
        ],
    },
];

const formatBranchLabel = (name: string, type?: string) => {
    const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : "";
    return typeLabel ? `${name} (${typeLabel})` : name;
};

export default function HealthCardManagementPage() {
    const router = useRouter();
    const { data: branchesResponse } = useGetBranchesQuery();
    const [createArogyaCard, { isLoading: isCreatingArogyaCard }] = useCreateArogyaCardMutation();
    const [updateArogyaCardStatus, { isLoading: isUpdatingStatus }] = useUpdateArogyaCardStatusMutation();
    const [updateArogyaCard, { isLoading: isUpdatingArogyaCard }] = useUpdateArogyaCardMutation();
    const [statusTargetCard, setStatusTargetCard] = useState<HealthCard | null>(null);
    const [statusTargetValue, setStatusTargetValue] = useState<boolean | null>(null);
    const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);
    const [triggerGetPresignedUrl, { isFetching: isFetchingPresignedUrl }] = useLazyGetPresignedUrlQuery();
    const [originalStatus, setOriginalStatus] = useState<"Active" | "Inactive" | "Paused" | null>(null);
    const [showInactiveConfirmDialog, setShowInactiveConfirmDialog] = useState(false);

    const getS3KeyFromUrl = (urlStr: string): string => {
        try {
            const url = new URL(urlStr);
            let pathname = url.pathname;
            if (pathname.startsWith('/')) {
                pathname = pathname.substring(1);
            }
            return pathname;
        } catch (e) {
            return urlStr;
        }
    };

    const handleViewCardImage = async () => {
        if (!formValues) return;
        if (formValues.cardImage) {
            const localUrl = URL.createObjectURL(formValues.cardImage);
            window.open(localUrl, "_blank");
            return;
        }

        if (formValues.photoUrl) {
            const key = getS3KeyFromUrl(formValues.photoUrl);
            try {
                const response = await triggerGetPresignedUrl({ key }).unwrap();
                if (response?.data?.signedUrl) {
                    window.open(response.data.signedUrl, "_blank");
                } else {
                    setErrorMessage("Failed to get image link");
                    setShowErrorDialog(true);
                }
            } catch (err: any) {
                setErrorMessage(err?.data?.message || err?.message || "Failed to fetch image link");
                setShowErrorDialog(true);
            }
        }
    };

    const availableBranches = useMemo(() => {
        return (branchesResponse?.data || []).map((b) => ({
            id: String(b.id),
            name: b.name,
            type: b.type || "",
            state: b.state || "",
            area: b.state || b.address || "",
        }));
    }, [branchesResponse]);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

    const debouncedSearch = useDebounce(searchTerm, 500);

    const { data: apiResponse, isLoading: isListLoading } = useGetArogyaCardsQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        branchId: selectedBranchFilter === "all" ? undefined : Number(selectedBranchFilter),
    });

    const [cardsList, setCardsList] = useState<HealthCard[]>([]);
    const [viewState, setViewState] = useState<"list" | "add" | "edit" | "view">("list");

    // Expanded Card Details
    const [expandedCardId, setExpandedCardId] = useState<string | null>("default-pending");

    useEffect(() => {
        if (apiResponse?.data && availableBranches.length > 0) {
            const mapped = apiResponse.data.map(card => mapApiToLocalCard(card, availableBranches));
            setCardsList(mapped);
        }
    }, [apiResponse, availableBranches]);

    useEffect(() => {
        if (cardsList.length > 0 && expandedCardId === "default-pending") {
            setExpandedCardId(cardsList[0].id);
        }
    }, [cardsList, expandedCardId]);

    useEffect(() => {
        setExpandedCardId("default-pending");
    }, [currentPage, debouncedSearch, selectedBranchFilter]);

    // Action Menu Dropdown State
    const [activeMenuCardId, setActiveMenuCardId] = useState<string | null>(null);

    const [formValues, setFormValues] = useState<HealthCard | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const calculatedTotalCards = useMemo(() => {
        const s = parseInt(formValues?.seriesStart || "");
        const e = parseInt(formValues?.seriesEnd || "");
        if (isNaN(s) || isNaN(e)) return 0;
        return Math.max(0, e - s + 1);
    }, [formValues?.seriesStart, formValues?.seriesEnd]);

    // Health Card Image Cropper Modal State
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
    const [cropperFileName, setCropperFileName] = useState<string>("health_card.png");

    // Earning Policy UI State (inside Add / Edit / View form)
    const [selectedPolicyBranchId, setSelectedPolicyBranchId] = useState<string>("default");
    const [selectedPolicyTab, setSelectedPolicyTab] = useState<"consultancy" | "services" | "products" | "labTest" | "fibroScan" | "welcome">("welcome");
    const [summarySearch, setSummarySearch] = useState("");

    const isDefaultPolicyComplete = useMemo(() => {
        if (!formValues?.branchRules) return false;
        const defaultRule = formValues.branchRules.find((r) => r.branchId === "default");
        if (!defaultRule) return false;

        const categories: Array<"welcome" | "consultancy" | "services" | "products" | "labTest" | "fibroScan"> = [
            "welcome",
            "consultancy",
            "services",
            "products",
            "labTest",
            "fibroScan",
        ];

        for (const cat of categories) {
            const config = defaultRule[cat];
            if (!config) return false;

            const referrerVal = String(config.referrer ?? "").trim();
            const refereeVal = String(config.referee ?? "").trim();
            const loyalVal = String(config.loyal ?? "").trim();
            const lockedForVal = String(config.pointsLockedFor ?? "").trim();

            if (!referrerVal || !refereeVal || !loyalVal || !lockedForVal) {
                return false;
            }
        }

        return true;
    }, [formValues?.branchRules]);

    // Reference to "Applicable Branches" multi-select component
    const applicableBranchesRef = useRef<HTMLDivElement>(null);

    // Refs for scrolling/focusing invalid fields
    const cardNameRef = useRef<HTMLInputElement>(null);
    const seriesStartRef = useRef<HTMLInputElement>(null);
    const seriesEndRef = useRef<HTMLInputElement>(null);
    const pointValuationRef = useRef<HTMLInputElement>(null);
    const pointsLockedForRef = useRef<HTMLInputElement>(null);
    const pointsExpireAfterRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLInputElement>(null);
    const photoCaptureRef = useRef<PhotoCaptureRef | null>(null);

    // Success & Error Modal Dialogs
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Delete confirmation
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<string | null>(null);
    const [deleteArogyaCard, { isLoading: isDeletingCard }] = useDeleteArogyaCardMutation();

    // Dropdown reference to close when clicked outside
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuCardId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ─── Stats Derived State ─────────────────────────────────────────────────────
    const activeCardsCount = apiResponse?.activeCardsCount || 0;
    const totalBranchesCount = apiResponse?.branchCount || availableBranches.length;

    // ─── Filtered Cards ──────────────────────────────────────────────────────────
    const filteredCards = useMemo(() => {
        return cardsList;
    }, [cardsList]);

    // Pagination Slice
    const paginatedCards = useMemo(() => {
        return cardsList;
    }, [cardsList]);

    const totalPages = apiResponse?.totalPages || 1;

    // ─── Handlers ────────────────────────────────────────────────────────────────
    const handleAddNew = () => {
        setFormValues({
            id: "",
            cardName: "",
            cardType: "gold",
            description: "",
            status: "Active",
            seriesStart: "",
            seriesEnd: "",
            pointValuation: "",
            pointsExpireAfter: "",
            createdAt: new Date().toLocaleDateString("en-GB") + " 12:00 PM",
            branches: [],
            branchRules: [
                {
                    branchId: "default",
                    branchName: "Default policy",
                    branchArea: "Baseline",
                    consultancy: createDefaultPolicyConfig(),
                    services: createDefaultPolicyConfig(),
                    products: createDefaultPolicyConfig(),
                    labTest: createDefaultPolicyConfig(),
                    fibroScan: createDefaultPolicyConfig(),
                    welcome: createDefaultPolicyConfig(),
                    isOverride: false,
                },
            ],
            cardImage: null,
            photoUrl: null,
        });
        setFormErrors({});
        setSelectedPolicyBranchId("default");
        setSelectedPolicyTab("welcome");
        setOriginalStatus(null);
        setViewState("add");
    };

    const handleEdit = (card: HealthCard) => {
        const cloned = JSON.parse(JSON.stringify(card));
        cloned.cardImage = card.cardImage;
        if (cloned.pointValuation) {
            cloned.pointValuation = formatIndianAmount(cloned.pointValuation);
        }
        setFormValues(cloned);
        setFormErrors({});
        setSelectedPolicyBranchId("default");
        setSelectedPolicyTab("welcome");
        setOriginalStatus(card.status);
        setViewState("edit");
    };

    const handleView = (card: HealthCard) => {
        const cloned = JSON.parse(JSON.stringify(card));
        cloned.cardImage = card.cardImage;
        if (cloned.pointValuation) {
            cloned.pointValuation = formatIndianAmount(cloned.pointValuation);
        }
        setFormValues(cloned);
        setFormErrors({});
        setSelectedPolicyBranchId("default");
        setSelectedPolicyTab("welcome");
        setViewState("view");
    };

    const handleStatusToggle = (card: HealthCard, targetStatus: boolean) => {
        setStatusTargetCard(card);
        setStatusTargetValue(targetStatus);
        setShowStatusConfirmDialog(true);
        setActiveMenuCardId(null);
    };

    const handleStatusConfirmSubmit = () => {
        if (!statusTargetCard || statusTargetValue === null) return;
        updateArogyaCardStatus({ id: Number(statusTargetCard.id), status: statusTargetValue })
            .unwrap()
            .then((res) => {
                setSuccessMessage(res.message || `Health card status updated successfully`);
                setShowSuccessDialog(true);
                setShowStatusConfirmDialog(false);
                setStatusTargetCard(null);
                setStatusTargetValue(null);
            })
            .catch((err) => {
                setErrorMessage(err?.data?.message || err?.message || "Failed to update card status");
                setShowErrorDialog(true);
                setShowStatusConfirmDialog(false);
                setStatusTargetCard(null);
                setStatusTargetValue(null);
            });
    };

    const handleDeleteCard = (cardId: string) => {
        setCardToDelete(cardId);
        setActiveMenuCardId(null);
        setShowDeleteConfirmDialog(true);
    };

    const handleDeleteConfirmSubmit = () => {
        if (!cardToDelete) return;
        deleteArogyaCard(Number(cardToDelete))
            .unwrap()
            .then((data) => {
                setShowDeleteConfirmDialog(false);
                setCardToDelete(null);
                setSuccessMessage(data.message || "Health card deleted successfully.");
                setShowSuccessDialog(true);
            })
            .catch((err) => {
                setShowDeleteConfirmDialog(false);
                setCardToDelete(null);
                setErrorMessage(err?.data?.message || err?.message || "Failed to delete health card.");
                setShowErrorDialog(true);
            });
    };

    const handleArchiveCard = (cardId: string) => {
        setCardsList(cardsList.filter((c) => c.id !== cardId));
        setSuccessMessage("Health card archived successfully.");
        setShowSuccessDialog(true);
        setActiveMenuCardId(null);
    };



    // Tab policy edits
    const handlePolicyNumberChange = (
        field: "referrer" | "referee" | "loyal",
        value: string
    ) => {
        if (!formValues) return;
        if (value !== "") {
            if (!/^\d*$/.test(value)) return;
            const parsed = parseInt(value, 10);
            if (selectedPolicyTab === "welcome") {
                // Points: allow any non-negative integer, max 4 digits
                if (parsed < 0 || value.length > 4) return;
            } else {
                // Percentage: 0–100
                if (parsed < 0 || parsed > 100) return;
            }
        }

        const updatedRules = formValues.branchRules.map((rule) => {
            if (rule.branchId === selectedPolicyBranchId) {
                const policy = rule[selectedPolicyTab];
                return {
                    ...rule,
                    [selectedPolicyTab]: {
                        ...policy,
                        [field]: value,
                    },
                };
            }
            return rule;
        });

        setFormValues({
            ...formValues,
            branchRules: updatedRules,
        });

        if (formErrors[`policy_${field}`]) {
            setFormErrors({
                ...formErrors,
                [`policy_${field}`]: "",
            });
        }
    };

    const handlePolicyToggleChange = (field: "compTests1" | "compTests2") => {
        if (!formValues) return;

        const updatedRules = formValues.branchRules.map((rule) => {
            if (rule.branchId === selectedPolicyBranchId) {
                const policy = rule[selectedPolicyTab];
                return {
                    ...rule,
                    [selectedPolicyTab]: {
                        ...policy,
                        [field]: !policy[field],
                    },
                };
            }
            return rule;
        });

        setFormValues({
            ...formValues,
            branchRules: updatedRules,
        });
    };

    const handlePolicyLockedForChange = (value: string) => {
        if (!formValues) return;
        if (value !== "" && (!/^\d+$/.test(value) || value.length > 4)) return;

        const updatedRules = formValues.branchRules.map((rule) => {
            if (rule.branchId === selectedPolicyBranchId) {
                const policy = rule[selectedPolicyTab] as PolicyConfig;
                return {
                    ...rule,
                    [selectedPolicyTab]: {
                        ...policy,
                        pointsLockedFor: value,
                    },
                };
            }
            return rule;
        });

        setFormValues({ ...formValues, branchRules: updatedRules });

        if (formErrors.policy_pointsLockedFor) {
            setFormErrors({ ...formErrors, policy_pointsLockedFor: "" });
        }
    };



    const handleApplyDefault = () => {
        if (!formValues || selectedPolicyBranchId === "default") return;

        const defaultRule = formValues.branchRules.find((r) => r.branchId === "default");
        if (!defaultRule) return;

        const updatedRules = formValues.branchRules.map((rule) => {
            if (rule.branchId === selectedPolicyBranchId) {
                return {
                    ...rule,
                    consultancy: { ...defaultRule.consultancy },
                    services: { ...defaultRule.services },
                    products: { ...defaultRule.products },
                    labTest: { ...defaultRule.labTest },
                    fibroScan: { ...defaultRule.fibroScan },
                    welcome: { ...defaultRule.welcome },
                    isOverride: false,
                };
            }
            return rule;
        });

        setFormValues({
            ...formValues,
            branchRules: updatedRules,
        });
    };

    const handleRemoveDefault = () => {
        if (!formValues || selectedPolicyBranchId === "default") return;

        const defaultRule = formValues.branchRules.find((r) => r.branchId === "default");
        if (!defaultRule) return;

        const updatedRules = formValues.branchRules.map((rule) => {
            if (rule.branchId === selectedPolicyBranchId) {
                const shouldCopy =
                    rule.consultancy.referrer === "" &&
                    rule.consultancy.referee === "" &&
                    rule.consultancy.loyal === "";

                return {
                    ...rule,
                    ...(shouldCopy ? {
                        consultancy: { ...defaultRule.consultancy },
                        services: { ...defaultRule.services },
                        products: { ...defaultRule.products },
                        labTest: { ...defaultRule.labTest },
                        fibroScan: { ...defaultRule.fibroScan },
                        welcome: { ...defaultRule.welcome },
                    } : {}),
                    isOverride: true,
                };
            }
            return rule;
        });

        setFormValues({
            ...formValues,
            branchRules: updatedRules,
        });
    };

    const handleBackToList = () => {
        setViewState("list");
        setFormValues(null);
    };

    const validateStartOnChange = (val: string, endVal: string, currentErrors: Record<string, string>) => {
        const errors = { ...currentErrors };
        const startVal = val.trim();

        // Validate startVal
        if (!startVal) {
            errors.seriesStart = "Series Start is required";
        } else if (!/^\d+$/.test(startVal)) {
            errors.seriesStart = "Series Start must contain only digits";
        } else if (startVal.length !== 12) {
            errors.seriesStart = "Series Start must be exactly 12 digits";
        } else {
            errors.seriesStart = "";
        }

        // Only validate relationship if both are present and valid 12-digit numbers
        if (startVal && endVal.trim() && /^\d+$/.test(startVal) && /^\d+$/.test(endVal.trim()) && startVal.length === 12 && endVal.trim().length === 12) {
            const sNum = Number(startVal);
            const eNum = Number(endVal.trim());
            if (startVal === endVal.trim()) {
                errors.seriesEnd = "Series Start and End cannot be the same";
            } else if (eNum < sNum) {
                errors.seriesEnd = "Series End must be greater than Start Series";
            } else if (viewState === "add" && (eNum - sNum + 1) > 1000000) {
                errors.seriesEnd = "At creation time, total cards cannot exceed 1 Million";
            } else if (errors.seriesEnd === "Series End must be greater than Start Series" || errors.seriesEnd === "Series Start and End cannot be the same" || errors.seriesEnd === "At creation time, total cards cannot exceed 1 Million") {
                errors.seriesEnd = "";
            }
        }

        return errors;
    };

    const validateEndOnChange = (val: string, startVal: string, currentErrors: Record<string, string>) => {
        const errors = { ...currentErrors };
        const endVal = val.trim();

        // Validate endVal
        if (!endVal) {
            errors.seriesEnd = "Series End is required";
        } else if (!/^\d+$/.test(endVal)) {
            errors.seriesEnd = "Series End must contain only digits";
        } else if (endVal.length !== 12) {
            errors.seriesEnd = "Series End must be exactly 12 digits";
        } else {
            errors.seriesEnd = "";
        }

        // Only validate relationship if both are present and valid 12-digit numbers
        if (startVal.trim() && endVal && /^\d+$/.test(startVal.trim()) && /^\d+$/.test(endVal) && startVal.trim().length === 12 && endVal.length === 12) {
            const sNum = Number(startVal.trim());
            const eNum = Number(endVal);
            if (startVal.trim() === endVal) {
                errors.seriesEnd = "Series Start and End cannot be the same";
            } else if (eNum < sNum) {
                errors.seriesEnd = "Series End must be greater than Start Series";
            } else if (viewState === "add" && (eNum - sNum + 1) > 1000000) {
                errors.seriesEnd = "At creation time, total cards cannot exceed 1 Million";
            } else {
                errors.seriesEnd = "";
            }
        }

        // In edit mode, check min value restriction for endVal
        if (viewState === "edit" && endVal && /^\d+$/.test(endVal) && endVal.length === 12) {
            const originalCard = cardsList.find((c) => c.id === formValues?.id);
            if (originalCard && originalCard.seriesEnd) {
                const originalEnd = Number(originalCard.seriesEnd);
                const newEnd = Number(endVal);
                if (newEnd < originalEnd) {
                    errors.seriesEnd = `Series End cannot be decreased (minimum: ${originalEnd})`;
                }
            }
        }

        return errors;
    };

    const handleSeriesStartBlur = () => {
        if (!formValues) return;
        const errors = { ...formErrors };
        const startVal = formValues.seriesStart.trim();
        const endVal = formValues.seriesEnd.trim();
        setFormErrors(validateStartOnChange(startVal, endVal, errors));
    };

    const handleSeriesEndBlur = () => {
        if (!formValues) return;
        const errors = { ...formErrors };
        const startVal = formValues.seriesStart.trim();
        const endVal = formValues.seriesEnd.trim();
        setFormErrors(validateEndOnChange(endVal, startVal, errors));
    };

    // Form Save
    const handleSaveForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formValues) return;

        const errors: Record<string, string> = {};
        if (!formValues.cardName.trim()) {
            errors.cardName = "Card Name is required";
        } else if (formValues.cardName.length > 100) {
            errors.cardName = "Card Name cannot exceed 100 characters";
        } else if (!/^[a-zA-Z\s]+$/.test(formValues.cardName)) {
            errors.cardName = "Only letters and spaces are allowed";
        }

        if (!formValues.seriesStart.trim()) {
            errors.seriesStart = "Series Start is required";
        } else if (!/^\d+$/.test(formValues.seriesStart)) {
            errors.seriesStart = "Series Start must contain only digits";
        } else if (formValues.seriesStart.trim().length !== 12) {
            errors.seriesStart = "Series Start must be exactly 12 digits";
        }

        if (!formValues.seriesEnd.trim()) {
            errors.seriesEnd = "Series End is required";
        } else if (!/^\d+$/.test(formValues.seriesEnd)) {
            errors.seriesEnd = "Series End must contain only digits";
        } else if (formValues.seriesEnd.trim().length !== 12) {
            errors.seriesEnd = "Series End must be exactly 12 digits";
        } else if (
            /^\d+$/.test(formValues.seriesStart) &&
            /^\d+$/.test(formValues.seriesEnd) &&
            formValues.seriesStart.trim().length === 12 &&
            formValues.seriesEnd.trim().length === 12
        ) {
            const sNum = Number(formValues.seriesStart);
            const eNum = Number(formValues.seriesEnd);
            if (formValues.seriesStart.trim() === formValues.seriesEnd.trim()) {
                errors.seriesEnd = "Series Start and End cannot be the same";
            } else if (eNum < sNum) {
                errors.seriesEnd = "Series End must be greater than Start Series";
            } else if (viewState === "add" && (eNum - sNum + 1) > 1000000) {
                errors.seriesEnd = "At creation time, total cards cannot exceed 1 Million";
            }

            if (viewState === "edit") {
                const originalCard = cardsList.find((c) => c.id === formValues.id);
                if (originalCard && originalCard.seriesEnd) {
                    const originalEnd = Number(originalCard.seriesEnd);
                    const newEnd = Number(formValues.seriesEnd);
                    if (newEnd < originalEnd) {
                        errors.seriesEnd = `Series End cannot be decreased (minimum: ${originalEnd})`;
                    }
                }
            }
        }

        const rawPointValuation = parseIndianAmount(formValues.pointValuation).trim();
        if (!rawPointValuation) {
            errors.pointValuation = "Point Valuation is required";
        } else if (!/^\d+(\.\d{1,2})?$/.test(rawPointValuation)) {
            errors.pointValuation = "Enter a valid numeric amount (e.g. 1.00)";
        } else if (Number(rawPointValuation) <= 0) {
            errors.pointValuation = "Point Valuation must be greater than 0";
        }

        // pointsLockedFor is now validated per-tab below (removed from global basic info)

        if (!formValues.pointsExpireAfter.trim()) {
            errors.pointsExpireAfter = "Expiration days are required";
        } else if (!/^[1-9]\d*$/.test(formValues.pointsExpireAfter)) {
            errors.pointsExpireAfter = "Expiration days must be a positive number starting from 1";
        } else if (formValues.pointsExpireAfter.length > 4) {
            errors.pointsExpireAfter = "Expiration days cannot exceed 4 digits";
        }

        if (!formValues.branches || formValues.branches.length === 0) {
            errors.branches = "At least one branch is required";
        }

        // Validate branch rules policies fields (mandatory to fill)
        let firstInvalidRuleBranchId = "";
        let firstInvalidRuleTab = "";
        let firstInvalidRuleField = "";

        for (const rule of formValues.branchRules) {
            if (rule.branchId !== "default" && !rule.isOverride) {
                continue;
            }
            const tabsToCheck = ["welcome", "consultancy", "services", "products", "labTest", "fibroScan"] as const;
            for (const tab of tabsToCheck) {
                const config = rule[tab];
                let isTabInvalid = false;

                if (!config.referrer.trim()) {
                    errors.policy_referrer = "Referrer Gets is required";
                    isTabInvalid = true;
                    if (!firstInvalidRuleField) firstInvalidRuleField = "referrer";
                }
                if (!config.referee.trim()) {
                    errors.policy_referee = "Referee Gets is required";
                    isTabInvalid = true;
                    if (!firstInvalidRuleField) firstInvalidRuleField = "referee";
                }
                if (!config.loyal.trim()) {
                    errors.policy_loyal = "Loyal Patient Gets is required";
                    isTabInvalid = true;
                    if (!firstInvalidRuleField) firstInvalidRuleField = "loyal";
                }
                if (!config.pointsLockedFor.trim()) {
                    errors.policy_pointsLockedFor = "Points Locked For is required";
                    isTabInvalid = true;
                    if (!firstInvalidRuleField) firstInvalidRuleField = "pointsLockedFor";
                } else if (!/^\d+$/.test(config.pointsLockedFor.trim())) {
                    errors.policy_pointsLockedFor = "Must be a whole number (0 or more)";
                    isTabInvalid = true;
                    if (!firstInvalidRuleField) firstInvalidRuleField = "pointsLockedFor";
                }

                if (isTabInvalid) {
                    if (!firstInvalidRuleBranchId) {
                        firstInvalidRuleBranchId = rule.branchId;
                        firstInvalidRuleTab = tab;
                    }
                }
            }
            if (firstInvalidRuleBranchId) break;
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);

            // Focus and scroll to the first invalid field in sequence
            if (errors.cardName) {
                cardNameRef.current?.focus();
                cardNameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (errors.pointValuation) {
                pointValuationRef.current?.focus();
                pointValuationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (errors.seriesStart) {
                seriesStartRef.current?.focus();
                seriesStartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (errors.seriesEnd) {
                seriesEndRef.current?.focus();
                seriesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (errors.pointsExpireAfter) {
                pointsExpireAfterRef.current?.focus();
                pointsExpireAfterRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (errors.branches) {
                const selectBtn = applicableBranchesRef.current?.querySelector("button");
                selectBtn?.focus();
                applicableBranchesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (errors.policy_referrer || errors.policy_referee || errors.policy_loyal || errors.policy_pointsLockedFor) {
                if (firstInvalidRuleBranchId) {
                    setSelectedPolicyBranchId(firstInvalidRuleBranchId);
                }
                if (firstInvalidRuleTab) {
                    setSelectedPolicyTab(firstInvalidRuleTab as any);
                }
                const configPanel = document.getElementById("earning-policies-configuration-panel");
                configPanel?.scrollIntoView({ behavior: "smooth", block: "center" });

                // Focus the missing field input element in series after tabs update
                setTimeout(() => {
                    const container = document.getElementById("earning-policies-configuration-panel");
                    if (container) {
                        const inputs = container.querySelectorAll("input");
                        const textInputs = Array.from(inputs).filter((input) => input.placeholder === "0");
                        if (textInputs.length >= 3) {
                            if (firstInvalidRuleField === "referrer" && textInputs[0]) {
                                textInputs[0].focus();
                                textInputs[0].scrollIntoView({ behavior: "smooth", block: "center" });
                            } else if (firstInvalidRuleField === "referee" && textInputs[1]) {
                                textInputs[1].focus();
                                textInputs[1].scrollIntoView({ behavior: "smooth", block: "center" });
                            } else if (firstInvalidRuleField === "loyal" && textInputs[2]) {
                                textInputs[2].focus();
                                textInputs[2].scrollIntoView({ behavior: "smooth", block: "center" });
                            }
                        }
                    }
                }, 100);
            }
            return;
        }

        if (formValues.cardImage) {
            const isWebp = formValues.cardImage.type === "image/webp" || formValues.cardImage.name.toLowerCase().endsWith(".webp");
            if (isWebp) {
                setErrorMessage(".webp image format is not allowed. Please upload a normal image format (PNG, JPG, JPEG, SVG).");
                setShowErrorDialog(true);
                return;
            }
        }

        if (photoCaptureRef.current?.hasErrors()) {
            photoCaptureRef.current.scrollToError();
            return;
        }

        executeSaveForm();
    };

    const executeSaveForm = () => {
        if (!formValues) return;

        const buildFormDataPayload = (values: HealthCard) => {
            const defaultBranchRule = values.branchRules.find(r => r.branchId === "default") || {
                branchId: "default",
                branchName: "Default policy",
                branchArea: "Baseline",
                consultancy: createDefaultPolicyConfig(),
                services: createDefaultPolicyConfig(),
                products: createDefaultPolicyConfig(),
                labTest: createDefaultPolicyConfig(),
                fibroScan: createDefaultPolicyConfig(),
                welcome: createDefaultPolicyConfig(),
                isOverride: false,
            };
            const selectedRules = values.branchRules.filter(r => r.branchId !== "default" && values.branches.includes(r.branchId));

            const branchRulesPayload = selectedRules.map(r => {
                const sourceRule = r.isOverride ? r : defaultBranchRule;
                return {
                    branchId: Number(r.branchId) || 0,
                    ...mapLocalToApiRule(sourceRule),
                    isDefaultRule: !r.isOverride
                };
            });

            const defaultRulePayload = mapLocalToApiRule(defaultBranchRule);

            const fd = new FormData();
            fd.append("cardName", values.cardName);
            fd.append("description", values.description || "");
            fd.append("pointValuation", String(Number(parseIndianAmount(values.pointValuation)) || 0));
            fd.append("seriesStart", values.seriesStart);
            fd.append("seriesEnd", values.seriesEnd);
            fd.append("status", values.status.toLowerCase());
            fd.append("pointExpiryDays", String(Number(values.pointsExpireAfter) || 0));
            fd.append("branchRules", JSON.stringify(branchRulesPayload));
            fd.append("defaultRule", JSON.stringify(defaultRulePayload));
            if (values.cardImage) {
                fd.append("image", values.cardImage);
            }

            return fd;
        };

        if (viewState === "add") {
            const fd = buildFormDataPayload(formValues);
            createArogyaCard(fd)
                .unwrap()
                .then((data) => {
                    const newCard: HealthCard = {
                        ...formValues,
                        id: String(data?.data?.id || (data as any)?.id || cardsList.length + 1),
                        createdAt: new Date().toLocaleDateString("en-GB") + " 10:30 AM",
                        photoUrl: data?.data?.image || null,
                    };
                    setCardsList([newCard, ...cardsList]);
                    setSuccessMessage("Health card created successfully");
                    setShowSuccessDialog(true);
                    setViewState("list");
                    setFormValues(null);
                })
                .catch((err) => {
                    setErrorMessage(err?.data?.message || err?.message || "Failed to create health card");
                    setShowErrorDialog(true);
                });
        } else {
            const fd = buildFormDataPayload(formValues);
            updateArogyaCard({ id: Number(formValues.id), body: fd })
                .unwrap()
                .then((data) => {
                    setSuccessMessage(data.message || "Health card updated successfully");
                    setShowSuccessDialog(true);
                    setViewState("list");
                    setFormValues(null);
                })
                .catch((err) => {
                    setErrorMessage(err?.data?.message || err?.message || "Failed to update health card");
                    setShowErrorDialog(true);
                });
        }
    };

    // Render current selected tab's values
    const activeBranchRuleObj = useMemo(() => {
        if (!formValues) return null;
        return formValues.branchRules.find((r) => r.branchId === selectedPolicyBranchId) || null;
    }, [formValues, selectedPolicyBranchId]);

    const activePolicyConfig = useMemo((): PolicyConfig | null => {
        if (!activeBranchRuleObj) return null;
        if (selectedPolicyBranchId !== "default" && !activeBranchRuleObj.isOverride) {
            const defaultRule = formValues?.branchRules.find((r) => r.branchId === "default");
            if (defaultRule) {
                return defaultRule[selectedPolicyTab] as PolicyConfig;
            }
        }
        return activeBranchRuleObj[selectedPolicyTab] as PolicyConfig;
    }, [activeBranchRuleObj, selectedPolicyTab, formValues, selectedPolicyBranchId]);

    const isRuleComplete = (rule: BranchRule) => {
        const defaultRule = formValues?.branchRules.find((r) => r.branchId === "default");
        const targetRule = rule.branchId === "default" || rule.isOverride ? rule : defaultRule;
        if (!targetRule) return false;

        const categories = ["consultancy", "services", "products", "labTest", "fibroScan", "welcome"] as const;
        return categories.every((cat) => {
            const config = targetRule[cat];
            return (
                config &&
                config.referrer !== undefined &&
                config.referrer.trim() !== "" &&
                config.referee !== undefined &&
                config.referee.trim() !== "" &&
                config.loyal !== undefined &&
                config.loyal.trim() !== ""
            );
        });
    };

    return (
        <AppShell>
            <div className="space-y-4 select-none">

                {/* ─── LIST VIEW ────────────────────────────────────────────────────────── */}
                {viewState === "list" && (
                    <>
                        <div className="flex items-center justify-between">
                            <PageHeading title="Health Cards" />
                            <Button
                                variant="outline"
                                size="medium"
                                onClick={handleAddNew}
                                className="!bg-transparent"
                                leftIcon={<Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />}
                            >
                                Add Health Card
                            </Button>
                        </div>

                        {/* Custom Stat Cards Row (integrated StatCard component) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <StatCard
                                title="Active cards"
                                value={activeCardsCount}
                                iconSrc="/icons/giftIcon.svg"
                                className="w-full select-none"
                            />
                            <StatCard
                                title="Branches"
                                value={totalBranchesCount}
                                iconSrc="/icons/BuildingIcon.svg"
                                className="w-full select-none"
                            />
                        </div>

                        {/* List Body Container */}
                        <ListBorder className="bg-white p-6 shadow-sm space-y-6 !overflow-visible">

                            {/* Filters Block */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4">

                                {/* Branch Selector */}
                                {/* <div className="w-[280px] shrink-0">
                                    <FormSelectField
                                        label=""
                                        hideLabel
                                        options={[
                                            { value: "all", label: "All Branches" },
                                            ...availableBranches.map((b) => ({ value: b.id, label: formatBranchLabel(b.name, b.type) })),
                                        ]}
                                        value={selectedBranchFilter}
                                        onChange={(value) => {
                                            const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : "all";
                                            setSelectedBranchFilter(v || "all");
                                            setCurrentPage(1);
                                        }}
                                        placeholder="Select Branch"
                                        mode="single"
                                        background="normal"
                                        width={280}
                                    />
                                </div> */}

                                {/* TableSearchInput Component */}
                                <div className="w-full sm:w-[280px]">
                                    <TableSearchInput
                                        value={searchTerm}
                                        placeholder="Search by card name or series ID"
                                        onChange={(val) => {
                                            setSearchTerm(val);
                                            setCurrentPage(1);
                                        }}
                                        sanitize={false}
                                    />
                                </div>
                            </div>

                            {/* Cards List Table */}
                            <div className="space-y-4">
                                {paginatedCards.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        No Health Cards found matching filters
                                    </div>
                                ) : (
                                    paginatedCards.map((card, idx) => {
                                        const isExpanded = expandedCardId === card.id;
                                        return (
                                            <div
                                                key={card.id}
                                                className={`border rounded-2xl transition-all duration-200 ${isExpanded
                                                    ? "border-[#DFE0E2] shadow-[0px_4px_12px_rgba(11,140,0,0.08)]"
                                                    : "border-[#DFE0E2] hover:border-gray-250"
                                                    }`}
                                            >

                                                {/* Header Row */}
                                                <div className={`flex items-center justify-between px-5 py-3 bg-white ${isExpanded ? "rounded-t-2xl" : "rounded-2xl"}`}>
                                                    <div className="flex items-center gap-4">
                                                        {/* Circle number */}
                                                        <div className="w-8 h-8 rounded-full bg-[#0B8C000D] border border-gray-200 flex items-center justify-center text-xs font-bold text-[#7B8089]">
                                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                                        </div>
                                                        <div>
                                                            <Tooltip content={card.cardName}>
                                                                <h4
                                                                    className="font-bold text-[#262D3B] text-base truncate inline-block align-top"
                                                                    style={{ maxWidth: "300px" }}
                                                                >
                                                                    {card.cardName}
                                                                </h4>
                                                            </Tooltip>
                                                            <p className="text-xs text-[#7B8089] font-medium mt-0.5">
                                                                Series: {card.seriesStart} - {card.seriesEnd}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">

                                                        {/* Status Badge (integrated custom Badge component) */}
                                                        <Badge
                                                            variant={
                                                                card.status === "Active"
                                                                    ? "success"
                                                                    : card.status === "Paused"
                                                                        ? "warning"
                                                                        : "neutral"
                                                            }
                                                            className="!font-normal"
                                                        >
                                                            {card.status}
                                                        </Badge>

                                                        {/* Overrides Badge */}
                                                        <Badge variant="success" className="border-none bg-[#0B8C001A] !h-7 !inline-flex items-center justify-center !text-xs !font-normal !text-[#0B8C00]">
                                                            {card.branchRules.filter(r => r.branchId !== "default" && r.isOverride).length} Branch Overrides
                                                        </Badge>

                                                        {/* View Button */}
                                                        <Tooltip content="View Details">
                                                            <button
                                                                onClick={() => handleView(card)}
                                                                className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-[12px] bg-white border border-[#DFE0E2] hover:bg-gray-50 text-gray-600 transition"

                                                            >
                                                                <Image
                                                                    src="/icons/openEye.svg"
                                                                    alt="View"
                                                                    width={18}
                                                                    height={18}
                                                                />
                                                            </button>
                                                        </Tooltip>

                                                        {/* Edit Button */}
                                                        <Tooltip content="Edit Config">
                                                            <button
                                                                onClick={() => handleEdit(card)}
                                                                className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-[12px] bg-white border border-[#DFE0E2] hover:bg-gray-50 text-gray-600 transition"
                                                            >
                                                                <Image
                                                                    src="/icons/EditIconBlack.svg"
                                                                    alt="Edit"
                                                                    width={16}
                                                                    height={16}
                                                                />
                                                            </button>
                                                        </Tooltip>
                                                        {/* Cad Button */}
                                                        <Tooltip content="Card Series">
                                                            <button
                                                                onClick={() => {
                                                                    router.push(`/settings/health-card-management/card-series?cardId=${card.id}&status=${encodeURIComponent(card.status || "")}`);
                                                                }}
                                                                className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-[12px] bg-white border border-[#DFE0E2] hover:bg-gray-50 text-gray-600 transition"
                                                            >
                                                                <Image
                                                                    src="/icons/card.svg"
                                                                    alt="CardSeries"
                                                                    width={16}
                                                                    height={16}
                                                                />
                                                            </button>
                                                        </Tooltip>

                                                        {/* Dropdown Options */}
                                                        {/* <div className="relative">
                                                            <Tooltip content="More Options">
                                                                <button
                                                                    onClick={() =>
                                                                        setActiveMenuCardId(
                                                                            activeMenuCardId === card.id ? null : card.id
                                                                        )
                                                                    }
                                                                    className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-[12px] bg-white border border-[#DFE0E2] hover:bg-gray-50 text-gray-600 transition focus:outline-none"
                                                                >
                                                                    <Image
                                                                        src="/icons/threeDot.svg"
                                                                        alt="Options"
                                                                        width={18}
                                                                        height={18}
                                                                    />
                                                                </button>
                                                            </Tooltip>

                                                            {activeMenuCardId === card.id && (
                                                                <div
                                                                    ref={menuRef}
                                                                    className="absolute right-0 mt-2 w-[178px] bg-white border border-[#DFE0E2] rounded-[8px] shadow-lg p-1.5 flex flex-col gap-[10px] z-30"
                                                                >

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStatusToggle(card, true)}
                                                                        disabled={card.status === "Active"}
                                                                        className={`w-full px-2.5 py-1.5 text-left text-sm font-semibold flex items-center gap-2.5 transition rounded-[6px] ${card.status === "Active" ? "opacity-40 cursor-not-allowed text-[#262D3B]" : "text-[#262D3B] hover:bg-gray-50 cursor-pointer"}`}
                                                                    >
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={card.status === "Active" ? "text-gray-400" : "text-[#0B8C00]"}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        Active
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStatusToggle(card, false)}
                                                                        disabled={card.status === "Inactive"}
                                                                        className={`w-full px-2.5 py-1.5 text-left text-sm font-semibold flex items-center gap-2.5 transition rounded-[6px] ${card.status === "Inactive" ? "opacity-40 cursor-not-allowed text-[#262D3B]" : "text-[#262D3B] hover:bg-gray-50 cursor-pointer"}`}
                                                                    >
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={card.status === "Inactive" ? "text-gray-400" : "text-[#FF3B30]"}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        Inactive
                                                                    </button>



                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteCard(card.id)}
                                                                        className="cursor-pointer w-full px-2.5 py-1.5 text-left text-sm font-semibold text-[#262D3B] hover:bg-gray-50 flex items-center gap-2.5 transition rounded-[6px]"
                                                                    >
                                                                        <Image
                                                                            src="/icons/transhExtraDarkIcon.svg"
                                                                            alt="Delete"
                                                                            width={16}
                                                                            height={16}
                                                                        />
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div> */}

                                                        {/* Expand/Collapse chevron */}
                                                        <button
                                                            onClick={() =>
                                                                setExpandedCardId(isExpanded ? null : card.id)
                                                            }
                                                            className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-[12px] bg-white border border-[#DFE0E2] hover:bg-gray-50 text-gray-600 transition"
                                                        >
                                                            <Image
                                                                src="/icons/ArrowDown.svg"
                                                                alt="Expand/Collapse"
                                                                width={16}
                                                                height={16}
                                                                className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : "rotate-0"
                                                                    }`}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Collapsible Details Section (image1 layout with UI Table) */}
                                                {isExpanded && (
                                                    <div className="border-t border-gray-100 px-6 py-3 space-y-6 bg-white rounded-b-2xl">

                                                        {/* Horizontal Config metrics */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-[#7B8089] tracking-wider mb-1">
                                                                    Point Valuation
                                                                </p>
                                                                <p className="text-sm font-bold text-[#262D3B]">
                                                                    1 Point = ₹ {formatIndianAmount(card.pointValuation)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-[#7B8089] tracking-wider mb-1">
                                                                    Total Cards in Series
                                                                </p>
                                                                <p className="text-sm font-bold text-[#262D3B]">
                                                                    {Number(card.seriesEnd) - Number(card.seriesStart) + 1}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-[#7B8089] tracking-wider mb-1">
                                                                    Created At
                                                                </p>
                                                                <p className="text-sm font-bold text-[#262D3B]">
                                                                    {card.createdAt}
                                                                </p>
                                                            </div>
                                                            {/* <div>
                                                                <p className="text-[10px] uppercase font-bold text-[#7B8089] tracking-wider mb-1">
                                                                    Points Locked For
                                                                </p>
                                                                <p className="text-sm font-bold text-[#262D3B]">
                                                                    {card.pointsLockedFor} hrs
                                                                </p>
                                                            </div> */}
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-[#7B8089] tracking-wider mb-1">
                                                                    Points Expire After
                                                                </p>
                                                                <p className="text-sm font-bold text-[#262D3B]">
                                                                    {card.pointsExpireAfter} Days
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Branch Configuration Block */}
                                                        <div className="">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="font-medium text-sm text-[#262D3B]">
                                                                    Branch Wise Configuration
                                                                </h3>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="small"
                                                                    onClick={() => handleEdit(card)}
                                                                    className="!bg-transparent !h-8"
                                                                    rightIcon={<span>→</span>}
                                                                >
                                                                    Edit configuration
                                                                </Button>
                                                            </div>

                                                            {/* Table detailing overrides (integrated Table components) */}
                                                            <Table tableClassName="w-full">
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead position="first" className="align-middle min-w-[220px]">Branch</TableHead>
                                                                        {POLICY_CATEGORIES.map((cat) => (
                                                                            <TableHead key={cat.key} className="text-center [&>div]:justify-center [&>div]:w-full [&>div>span]:text-center  py-2 !px-1.5">
                                                                                <div className=" pt-1 ">{cat.label}</div>
                                                                                <div className="flex items-center justify-center gap-0.5 text-[10px] text-gray-400 font-normal normal-case mt-1">
                                                                                    <span>Referrer</span>
                                                                                    <span className="text-gray-250">|</span>
                                                                                    <span>Referee</span>
                                                                                    <span className="text-gray-250">|</span>
                                                                                    <span>Loyal</span>
                                                                                </div>
                                                                            </TableHead>
                                                                        ))}
                                                                        {/* <TableHead className="align-middle">Complimentary Tests</TableHead> */}
                                                                        <TableHead position="last" className="align-middle">Source</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {card.branchRules
                                                                        .filter((rule) => rule.branchId === "default" || card.branches.includes(rule.branchId))
                                                                        .map((rule) => {
                                                                            const isDefaultRule = rule.branchId === "default" || !rule.isOverride;
                                                                            return (
                                                                                <TableRow key={rule.branchId} className="hover:bg-gray-50/50">
                                                                                    <TableData className="min-w-[220px]">
                                                                                        <div className="font-bold text-gray-700">{rule.branchName}</div>
                                                                                        <div className="text-[11px] text-gray-700 font-medium">{rule.branchArea}</div>
                                                                                    </TableData>

                                                                                    {POLICY_CATEGORIES.map((cat) => (
                                                                                        <TableData key={cat.key} className="text-center py-2 !px-1 ">
                                                                                            {renderCategoryCell(rule[cat.key], cat.key === "welcome")}
                                                                                        </TableData>
                                                                                    ))}

                                                                                    {/* <TableData className="">
                                                                                        <Badge variant={rule.consultancy.compTests1 ? "success" : "neutral"} className={`${rule.consultancy.compTests1 && "!bg-transparent !text-[#0B8C00] !text-xs"}`}>
                                                                                            {rule.consultancy.compTests1 ? "Included" : "N/A"}
                                                                                        </Badge>
                                                                                    </TableData> */}
                                                                                    <TableData>
                                                                                        <span className={`text-sm font-normal ${isDefaultRule ? "text-gray-600" : "text-[#0B8C00]"}`}>
                                                                                            {isDefaultRule ? "Default policy" : "Branch override"}
                                                                                        </span>
                                                                                    </TableData>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                </TableBody>
                                                            </Table>
                                                        </div>

                                                    </div>
                                                )}

                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Client Side Pagination */}
                            {filteredCards.length > 0 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={filteredCards.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={(page) => setCurrentPage(page)}
                                    onItemsPerPageChange={(items) => {
                                        setItemsPerPage(items);
                                        setCurrentPage(1);
                                    }}
                                />
                            )}

                        </ListBorder>
                    </>
                )}

                {/* ─── ADD / EDIT / VIEW FORM ───────────────────────────────────────────── */}
                {formValues && (viewState === "add" || viewState === "edit" || viewState === "view") && (
                    <form onSubmit={handleSaveForm} className="space-y-5">

                        {/* Form Header */}
                        <div className="flex items-center justify-between">
                            <PageHeading
                                title={
                                    viewState === "view"
                                        ? "View Health Card Details"
                                        : viewState === "add"
                                            ? "Add Health Card"
                                            : "Edit Health Card"
                                }
                            />
                            <div className="flex items-center gap-3">
                                <BackToPreviousPageButton
                                    text="Back"
                                    onClick={handleBackToList}
                                />
                                {viewState !== "view" && (
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="medium"
                                        isLoading={isCreatingArogyaCard || isUpdatingArogyaCard}
                                    >
                                        {viewState === "add" ? "Save Health Card" : "Update Health Card"}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Basic Information Panel (integrated FormInputField component) */}
                        <ListBorder className="bg-white p-6 shadow-sm space-y-4" style={{ overflow: "visible", position: "relative", zIndex: 10 }}>
                            <h3 className="font-bold text-base text-[#262D3B]">
                                Basic Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">

                                {/* Health Card Name */}
                                <FormInputField
                                    ref={cardNameRef}
                                    label="Health Card Name *"
                                    disabled={viewState === "view"}
                                    placeholder="Enter Health Card Name"
                                    value={formValues.cardName}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                        val = val.replace(/^\s+/, "");
                                        val = val.replace(/(.)\1{2,}/g, "$1$1");
                                        if (val.length > 0) {
                                            val = val.charAt(0).toUpperCase() + val.slice(1);
                                        }
                                        val = val.slice(0, 100);
                                        setFormValues({ ...formValues, cardName: val });
                                        if (formErrors.cardName) {
                                            setFormErrors({ ...formErrors, cardName: "" });
                                        }
                                    }}
                                    error={formErrors.cardName}
                                    maxLength={100}
                                />

                                {/* Status Dropdown */}
                                <div>
                                    <FormSelectField
                                        label="Status *"
                                        value={formValues.status}
                                        onChange={(value) => {
                                            if (viewState === "view") return;
                                            const v = (typeof value === "string" ? value : Array.isArray(value) ? value[0] : "Active") as "Active" | "Inactive" | "Paused";
                                            if (v === "Inactive" && originalStatus !== "Inactive") {
                                                setShowInactiveConfirmDialog(true);
                                            } else {
                                                setFormValues({
                                                    ...formValues,
                                                    status: v,
                                                });
                                            }
                                            if (formErrors.status) {
                                                setFormErrors({ ...formErrors, status: "" });
                                            }
                                        }}
                                        options={(() => {
                                            if (viewState === "add") {
                                                return [
                                                    { value: "Active", label: "Active" },
                                                    { value: "Paused", label: "Paused" }
                                                ];
                                            }
                                            if (viewState === "edit") {
                                                if (originalStatus === "Active") {
                                                    return [
                                                        { value: "Active", label: "Active" },
                                                        { value: "Inactive", label: "Inactive" }
                                                    ];
                                                }
                                                if (originalStatus === "Paused") {
                                                    return [
                                                        { value: "Active", label: "Active" },
                                                        { value: "Paused", label: "Paused" }
                                                    ];
                                                }
                                                if (originalStatus === "Inactive") {
                                                    return [
                                                        { value: "Inactive", label: "Inactive" }
                                                    ];
                                                }
                                            }
                                            return [
                                                { value: "Active", label: "Active" },
                                                { value: "Inactive", label: "Inactive" },
                                                { value: "Paused", label: "Paused" }
                                            ];
                                        })()}
                                        placeholder="Status"
                                        mode="single"
                                        background="white"
                                        disabled={viewState === "view"}
                                    />
                                </div>

                                {/* Point Valuation */}
                                <FormInputField
                                    ref={pointValuationRef}
                                    label="Point Valuation (₹) *"
                                    disabled={viewState === "view"}
                                    placeholder="0.00"
                                    value={formValues.pointValuation}
                                    onChange={(e) => {
                                        const raw = parseIndianAmount(e.target.value).replace(/[^\d.]/g, "");
                                        const parts = raw.split(".");
                                        let integerPart = parts[0];
                                        if (integerPart.length > 6) {
                                            integerPart = integerPart.slice(0, 6);
                                        }
                                        let fractionalPart = parts[1];
                                        if (fractionalPart !== undefined) {
                                            if (fractionalPart.length > 2) {
                                                fractionalPart = fractionalPart.slice(0, 2);
                                            }
                                        }
                                        const normalized =
                                            fractionalPart !== undefined ? `${integerPart}.${fractionalPart}` : integerPart;
                                        const formatted = normalized ? formatIndianAmount(normalized) : "";
                                        setFormValues({ ...formValues, pointValuation: formatted });
                                        if (formErrors.pointValuation) {
                                            setFormErrors({ ...formErrors, pointValuation: "" });
                                        }
                                    }}
                                    error={formErrors.pointValuation}
                                    maxLength={12}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">

                                {/* Series Start */}
                                <FormInputField
                                    ref={seriesStartRef}
                                    label="Series Start *"
                                    disabled={viewState === "view" || viewState === "edit"}
                                    placeholder="Series Start"
                                    value={formValues.seriesStart}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        // Digits only, and the first digit cannot be 0 (no leading zero).
                                        if (val === "" || /^[1-9]\d*$/.test(val)) {
                                            if (val.length <= 12) {
                                                setFormValues({ ...formValues, seriesStart: val });
                                                const nextErrors = validateStartOnChange(val, formValues.seriesEnd, formErrors);
                                                setFormErrors(nextErrors);
                                            }
                                        }
                                    }}
                                    onBlur={handleSeriesStartBlur}
                                    error={formErrors.seriesStart}
                                    maxLength={12}
                                />

                                {/* Series End */}
                                <div className="flex flex-col gap-1 w-full">
                                    <FormInputField
                                        ref={seriesEndRef}
                                        label="Series End *"
                                        disabled={viewState === "view"}
                                        placeholder={!formValues?.seriesStart?.trim() ? "First Enter the Start Series" : "Series End"}
                                        value={formValues.seriesEnd}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            // Digits only, and the first digit cannot be 0 (no leading zero).
                                            if (val === "" || /^[1-9]\d*$/.test(val)) {
                                                if (val.length <= 12) {
                                                    setFormValues({ ...formValues, seriesEnd: val });
                                                    const nextErrors = validateEndOnChange(val, formValues.seriesStart, formErrors);
                                                    setFormErrors(nextErrors);
                                                }
                                            }
                                        }}
                                        onBlur={handleSeriesEndBlur}
                                        error={formErrors.seriesEnd}
                                        maxLength={12}
                                    />
                                    {calculatedTotalCards > 0 && (
                                        <div className="flex justify-end text-xs text-[#7B8089] font-medium mt-0.5 px-3">
                                            Total Cards: <span className="font-bold text-[#262D3B] ml-1">{calculatedTotalCards.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                                {/* Points Expire After */}
                                <FormInputField
                                    ref={pointsExpireAfterRef}
                                    label="Points Expire After *"
                                    disabled={viewState === "view"}
                                    placeholder="Enter Point Expire After Value"
                                    value={formValues.pointsExpireAfter}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || /^[1-9]\d*$/.test(val)) {
                                            setFormValues({ ...formValues, pointsExpireAfter: val });
                                            if (formErrors.pointsExpireAfter) {
                                                setFormErrors({ ...formErrors, pointsExpireAfter: "" });
                                            }
                                        }
                                    }}
                                    suffix={<span className="text-xs text-gray-400 font-semibold select-none">days</span>}
                                    error={formErrors.pointsExpireAfter}
                                    maxLength={4}
                                />

                            </div>

                            {/* Applicable Branches, Description and Expiry Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">


                                {/* Applicable Branches multiselect */}

                                <div>
                                    <FormSelectField
                                        ref={applicableBranchesRef}
                                        label="Applicable Branches *"
                                        error={formErrors.branches}
                                        placeholder="Select branches"
                                        options={availableBranches.map((b) => ({
                                            value: b.id,
                                            label: formatBranchLabel(b.name, b.type),
                                        }))}
                                        value={formValues.branches}
                                        onChange={(value) => {
                                            if (viewState === "view") return;
                                            let selected = Array.isArray(value) ? value : value ? [value] : [];

                                            if (viewState === "edit") {
                                                const originalCard = cardsList.find((c) => c.id === formValues.id);
                                                const originalBranches = originalCard ? originalCard.branches : [];
                                                originalBranches.forEach((bId) => {
                                                    if (!selected.includes(bId)) {
                                                        selected.push(bId);
                                                    }
                                                });
                                            }

                                            // Update branchRules based on the new branch selection
                                            const updatedRules = [...formValues.branchRules];

                                            // Add new rules for selected branches if not exists
                                            selected.forEach((bId) => {
                                                const bMeta = availableBranches.find((b) => b.id === bId);
                                                if (bMeta && !updatedRules.some((r) => r.branchId === bId)) {
                                                    updatedRules.push(createBranchRule(bId, bMeta.name, bMeta.area, false));
                                                }
                                            });

                                            // Filter out rules for unselected branches (keep default)
                                            const filteredRules = updatedRules.filter((r) => r.branchId === "default" || selected.includes(r.branchId));

                                            setFormValues({
                                                ...formValues,
                                                branches: selected,
                                                branchRules: filteredRules,
                                            });
                                            if (selectedPolicyBranchId !== "default" && !selected.includes(selectedPolicyBranchId)) {
                                                setSelectedPolicyBranchId("default");
                                            }
                                            if (formErrors.branches) {
                                                setFormErrors({ ...formErrors, branches: "" });
                                            }
                                        }}
                                        mode="multiple"
                                        background="white"
                                        disabled={viewState === "view"}
                                    />
                                </div>

                                {/* Description of Card */}
                                <FormInputField
                                    ref={descriptionRef}
                                    label="Description of Card"
                                    disabled={viewState === "view"}
                                    placeholder="Enter Card Description"
                                    value={formValues.description}
                                    onChange={(e) => {
                                        if (viewState !== "view") {
                                            let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                            value = value.replace(/^\s+/, "");
                                            value = value.replace(/(.)\1{2,}/g, "$1$1");
                                            if (value.length > 0) {
                                                value = value.charAt(0).toUpperCase() + value.slice(1);
                                            }
                                            value = value.slice(0, 250);
                                            setFormValues({ ...formValues, description: value });
                                            if (formErrors.description) {
                                                setFormErrors({ ...formErrors, description: "" });
                                            }
                                        }
                                    }}
                                    error={formErrors.description}
                                    maxLength={250}
                                />
                                {/* Card Photo upload row */}
                                <div className="">
                                    {viewState !== "view" ? (
                                        <div className="relative w-full">
                                            {(formValues.photoUrl || formValues.cardImage) && (
                                                <div className="absolute right-4 top-0 z-20 -translate-y-1/2">
                                                    {isFetchingPresignedUrl ? (
                                                        <SpinnerLoader size={16} />
                                                    ) : (
                                                        <Tooltip content="View Current Health Card Image" position="top">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleViewCardImage()}
                                                                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF7E8] text-[#0B8C00] font-semibold text-xs hover:bg-[#d5f0d2] transition-colors cursor-pointer border border-[#0B8C00]/20 shadow-sm"
                                                            >
                                                                <Image src="/icons/Eye.svg" alt="View" width={14} height={14} />
                                                                <span>View Image</span>
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            )}
                                            <PhotoCapture
                                                ref={photoCaptureRef}
                                                embedded
                                                mode="vehicle"
                                                hideToggles
                                                maxSize={4 * 1024 * 1024}
                                                selectionHeading="Health Card Photo"
                                                formData={{
                                                    vehiclePhoto: formValues.cardImage || null,
                                                    aadharPhoto: null
                                                }}
                                                accept="image/png,image/jpeg,image/jpg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                                                fieldLabels={{
                                                    vehiclePhoto: "Health Card Image"
                                                }}
                                                helperText="Accepted formats: PNG, JPG, JPEG, SVG | Max size: 4MB | Image will be cropped to 384×240 px"
                                                onChange={(field, file) => {
                                                    if (!file) {
                                                        setFormValues({
                                                            ...formValues,
                                                            cardImage: null,
                                                        });
                                                        return;
                                                    }
                                                    const isWebp = file.type === "image/webp" || file.name.toLowerCase().endsWith(".webp");
                                                    if (isWebp) {
                                                        setErrorMessage(".webp image format is not allowed. Please upload a normal image format (PNG, JPG, JPEG, SVG).");
                                                        setShowErrorDialog(true);
                                                        setFormValues({
                                                            ...formValues,
                                                            cardImage: null
                                                        });
                                                        return;
                                                    }

                                                    // Read file and open 384x240 Card Image Cropper Modal
                                                    const reader = new FileReader();
                                                    reader.onload = (e) => {
                                                        const src = e.target?.result as string;
                                                        if (src) {
                                                            setCropperImageSrc(src);
                                                            setCropperFileName(file.name);
                                                            setIsCropperOpen(true);
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative w-full">
                                            <span className="pointer-events-none absolute left-6 top-0 z-10 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
                                                Health Card Image
                                            </span>
                                            {(formValues.photoUrl || formValues.cardImage) && (
                                                <div className="absolute right-4 top-0 z-20 -translate-y-1/2">
                                                    {isFetchingPresignedUrl ? (
                                                        <SpinnerLoader size={16} />
                                                    ) : (
                                                        <Tooltip content="View Current Health Card Image" position="top">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleViewCardImage()}
                                                                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF7E8] text-[#0B8C00] font-semibold text-xs hover:bg-[#d5f0d2] transition-colors cursor-pointer border border-[#0B8C00]/20 shadow-sm"
                                                            >
                                                                <Image src="/icons/Eye.svg" alt="View" width={14} height={14} />
                                                                <span>View Image</span>
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex h-11 w-full items-center justify-between rounded-[32px] border border-[#DFE0E2] bg-gray-50/50 px-6 text-sm font-medium text-[#262D3B]">
                                                <span className="truncate">
                                                    {formValues.cardImage ? (
                                                        formValues.cardImage.name
                                                    ) : formValues.photoUrl ? (
                                                        formValues.photoUrl.substring(formValues.photoUrl.lastIndexOf('/') + 1).split('?')[0]
                                                    ) : (
                                                        <span className="text-gray-400 font-normal">No Image Uploaded</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>



                        </ListBorder>

                        {/* Earning Policies Configuration Panel */}
                        <ListBorder id="earning-policies-configuration-panel" className="bg-white p-6 shadow-sm space-y-6">

                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="font-bold text-base text-[#262D3B]">
                                    Earning Policies Configuration
                                </h3>
                                <div className="flex items-center gap-1.5 text-[#0B8C00] text-xs font-semibold bg-[#E8F5E9] px-3.5 py-1.5 rounded-full">
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Branches without an override inherit the Default policy</span>
                                </div>
                            </div>
                            {/* Sidebar layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                {/* Branches List (Left) */}
                                <div className="lg:col-span-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Branches</span>
                                        <Badge variant="success">
                                            {formValues.branchRules.filter(r => r.isOverride).length} overrides
                                        </Badge>
                                    </div>

                                    <div className="space-y-2.5">

                                        {/* Dynamic Sidebar Branch Buttons (Unifying Default & Overrides) */}
                                        {formValues.branchRules
                                            .filter((r) => r.branchId === "default" || formValues.branches.includes(r.branchId))
                                            .map((rule) => {
                                                const isDefault = rule.branchId === "default";
                                                const isActive = selectedPolicyBranchId === rule.branchId;
                                                const inheritsDefault = isDefault || !rule.isOverride;
                                                return (
                                                    <button
                                                        key={rule.branchId}
                                                        type="button"
                                                        onClick={() => setSelectedPolicyBranchId(rule.branchId)}
                                                        className={`w-full text-left p-3.5 rounded-[12px] border transition flex items-center justify-between cursor-pointer ${isActive
                                                            ? "border-[#0B8C00] bg-[#E8F5E9]/10 shadow-sm"
                                                            : "border-gray-100 hover:border-gray-250 bg-gray-50/50"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="p-2 rounded-lg bg-[#0B8C00]/10 flex items-center justify-center w-8 h-8 shrink-0">
                                                                <Image
                                                                    src="/icons/locationIcon.svg"
                                                                    alt="Location"
                                                                    width={16}
                                                                    height={20}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-xs text-[#262D3B] flex items-center gap-1.5">
                                                                    {isDefault ? "Default policy" : rule.branchName}
                                                                    <span
                                                                        className={`inline-block w-2 h-2 rounded-full shrink-0 ${isRuleComplete(rule) ? "bg-[#0B8C00]" : "bg-[#EF4444]"}`}
                                                                        title={isRuleComplete(rule) ? "Completed" : "Missing fields"}
                                                                    />
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-medium">
                                                                    {isDefault ? "Applies to all branches" : rule.branchArea}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Badge variant={inheritsDefault ? "warning" : "success"}>
                                                            {inheritsDefault ? "Default" : "Custom"}
                                                        </Badge>
                                                    </button>
                                                );
                                            })}

                                        {/* Add Override Button */}
                                        {viewState !== "view" && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const container = applicableBranchesRef.current;
                                                    if (container) {
                                                        container.scrollIntoView({ behavior: "smooth", block: "center" });
                                                        setTimeout(() => {
                                                            const button = container.querySelector("button");
                                                            button?.click();
                                                        }, 300);
                                                    }
                                                }}
                                                className="w-full py-3.5 border border-dashed border-gray-300 rounded-[12px] flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:border-[#0B8C00] hover:text-[#0B8C00] bg-white transition cursor-pointer"
                                            >
                                                <span>+ Add a branch</span>
                                            </button>
                                        )}

                                    </div>
                                </div>

                                {/* Configurations Panel Details (Right Panel with Tabs & Toggle UI) */}
                                <div className="lg:col-span-8 border border-[#DFE0E2] rounded-[16px] overflow-hidden bg-white shadow-sm flex flex-col">

                                    {/* Panel Header */}
                                    <div className="p-4 bg-white flex-shrink-0">
                                        {(() => {
                                            const isDefaultPolicy = selectedPolicyBranchId === "default";
                                            const activeBranchRule = formValues.branchRules.find((r) => r.branchId === selectedPolicyBranchId);
                                            return (
                                                <div
                                                    className="flex items-center justify-between gap-4 p-4 rounded-[16px] border"
                                                    style={{
                                                        backgroundColor: "rgba(11, 140, 0, 0.05)",
                                                        borderColor: "rgba(11, 140, 0, 0.5)",
                                                    }}
                                                >
                                                    <div className="flex items-center gap-[10px]">
                                                        <div className="w-8 h-8 rounded-lg bg-[#0B8C00]/10 flex items-center justify-center flex-shrink-0">
                                                            <Image
                                                                src={isDefaultPolicy ? "/icons/giftIcon.svg" : "/icons/locationIcon.svg"}
                                                                alt={isDefaultPolicy ? "Gift" : "Location"}
                                                                width={isDefaultPolicy ? 20 : 16}
                                                                height={isDefaultPolicy ? 21 : 20}
                                                            />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-[#262D3B]">
                                                                {isDefaultPolicy ? "Default policy" : activeBranchRule?.branchName}
                                                            </h4>
                                                            <p className="text-xs text-[#7B8089] font-medium mt-0.5">
                                                                {isDefaultPolicy ? "Applies to all branches" : activeBranchRule?.branchArea}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {!isDefaultPolicy && viewState !== "view" && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="xsmall"
                                                            className={`!bg-transparent !min-w-[132px] !h-8 !px-3 rounded-[8px] !border-${activeBranchRule?.isOverride ? "[#0B8C00]" : "[#B88B4A]"} !text-${activeBranchRule?.isOverride ? "[#0B8C00]" : "[#B88B4A]"} hover:!bg-${activeBranchRule?.isOverride ? "[#0B8C00]" : "[#B88B4A]"}/5 active:!bg-${activeBranchRule?.isOverride ? "[#0B8C00]" : "[#B88B4A]"}/10`}
                                                            onClick={activeBranchRule?.isOverride ? handleApplyDefault : handleRemoveDefault}
                                                            leftIcon={
                                                                activeBranchRule?.isOverride ? (
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                )
                                                            }
                                                        >
                                                            {activeBranchRule?.isOverride ? "Apply Default" : "Remove Default"}
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Tabs Component Integration */}
                                    <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                                        <Tabs
                                            options={[
                                                { value: "welcome", label: "Welcome Points" },
                                                { value: "consultancy", label: "Consultancy" },
                                                { value: "services", label: "Services" },
                                                { value: "products", label: "Products" },
                                                { value: "labTest", label: "Lab Test" },
                                                { value: "fibroScan", label: "Fibro Scan" },
                                            ]}
                                            value={selectedPolicyTab}
                                            onChange={(val) => setSelectedPolicyTab(val as any)}
                                        />
                                    </div>

                                    {/* Active Tab Panel Inputs */}
                                    {activePolicyConfig && (() => {
                                        const activeBranchRuleObj = formValues.branchRules.find((r) => r.branchId === selectedPolicyBranchId);
                                        const isCustomBranchOverride = selectedPolicyBranchId !== "default" && !!activeBranchRuleObj?.isOverride;

                                        // Blocked specifically for Custom branches (isOverride === true) when default policy is incomplete
                                        const isBranchFieldBlocked =
                                            selectedPolicyBranchId !== "default" &&
                                            isCustomBranchOverride &&
                                            !isDefaultPolicyComplete;

                                        const isFieldDisabled =
                                            viewState === "view" ||
                                            (selectedPolicyBranchId !== "default" && !activeBranchRuleObj?.isOverride) ||
                                            isBranchFieldBlocked;

                                        const tooltipMessage = "Please fill the values in the Default Policy first to configure it for other branches";

                                        return (
                                            <div className="p-6 space-y-6 flex-1">

                                                {/* Percentages Inputs Grid (using custom FormInputField component) */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                                    {POLICY_PERCENTAGE_FIELDS.map(({ key, label }) => {
                                                        const hasError = formErrors[`policy_${key}`] && (!activePolicyConfig[key] || !activePolicyConfig[key].trim());
                                                        const isWelcome = selectedPolicyTab === "welcome";

                                                        const inputElement = (
                                                            <FormInputField
                                                                key={key}
                                                                label={label}
                                                                disabled={isFieldDisabled}
                                                                placeholder={isWelcome ? "0" : "0"}
                                                                value={activePolicyConfig[key]}
                                                                onChange={(e) => handlePolicyNumberChange(key, e.target.value)}
                                                                suffix={<span className="text-xs font-semibold text-[#7B8089]">{isWelcome ? "Pts" : "%"}</span>}
                                                                error={hasError ? formErrors[`policy_${key}`] : ""}
                                                                maxLength={isWelcome ? 4 : undefined}
                                                            />
                                                        );

                                                        if (isBranchFieldBlocked) {
                                                            return (
                                                                <Tooltip
                                                                    key={key}
                                                                    content={tooltipMessage}
                                                                    position="top"
                                                                    delay={50}
                                                                    className="w-full"
                                                                >
                                                                    <div className="w-full cursor-not-allowed">
                                                                        {inputElement}
                                                                    </div>
                                                                </Tooltip>
                                                            );
                                                        }

                                                        return inputElement;
                                                    })}

                                                    {/* Second row: empty space under Referrer Gets, aligning toggles under Referee and Loyal Patient */}
                                                    {selectedPolicyTab === "consultancy" && (() => {
                                                        const pointsLockedField = (
                                                            <FormInputField
                                                                label="Points Locked For *"
                                                                disabled={isFieldDisabled}
                                                                placeholder="Enter locked hours"
                                                                value={activePolicyConfig.pointsLockedFor}
                                                                onChange={(e) => handlePolicyLockedForChange(e.target.value)}
                                                                suffix={<span className="text-xs text-gray-400 font-semibold select-none">hrs</span>}
                                                                error={formErrors.policy_pointsLockedFor && (!activePolicyConfig.pointsLockedFor || !activePolicyConfig.pointsLockedFor.trim()) ? formErrors.policy_pointsLockedFor : ""}
                                                                maxLength={4}
                                                            />
                                                        );

                                                        if (isBranchFieldBlocked) {
                                                            return (
                                                                <Tooltip
                                                                    content={tooltipMessage}
                                                                    position="top"
                                                                    delay={50}
                                                                    className="w-full"
                                                                >
                                                                    <div className="w-full cursor-not-allowed">
                                                                        {pointsLockedField}
                                                                    </div>
                                                                </Tooltip>
                                                            );
                                                        }

                                                        return pointsLockedField;
                                                    })()}

                                                </div>

                                                {/* Points Locked For — per tab (non-consultancy tabs only) */}
                                                {selectedPolicyTab !== "consultancy" && (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        {(() => {
                                                            const pointsLockedField = (
                                                                <FormInputField
                                                                    label="Points Locked For *"
                                                                    disabled={isFieldDisabled}
                                                                    placeholder="Enter locked hours"
                                                                    value={activePolicyConfig.pointsLockedFor}
                                                                    onChange={(e) => handlePolicyLockedForChange(e.target.value)}
                                                                    suffix={<span className="text-xs text-gray-400 font-semibold select-none">hrs</span>}
                                                                    error={formErrors.policy_pointsLockedFor && (!activePolicyConfig.pointsLockedFor || !activePolicyConfig.pointsLockedFor.trim()) ? formErrors.policy_pointsLockedFor : ""}
                                                                    maxLength={4}
                                                                />
                                                            );

                                                            if (isBranchFieldBlocked) {
                                                                return (
                                                                    <Tooltip
                                                                        content={tooltipMessage}
                                                                        position="top"
                                                                        delay={50}
                                                                        className="w-full"
                                                                    >
                                                                        <div className="w-full cursor-not-allowed">
                                                                            {pointsLockedField}
                                                                        </div>
                                                                    </Tooltip>
                                                                );
                                                            }

                                                            return pointsLockedField;
                                                        })()}
                                                    </div>
                                                )}

                                            </div>
                                        );
                                    })()}

                                </div>

                            </div>

                        </ListBorder>

                        {/* Configuration Summary Table */}
                        <ListBorder className="bg-white p-6 shadow-sm space-y-6">

                            <div className=" space-y-3">
                                {/* First Row: Title and Search Box */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <h3 className="font-bold text-base text-[#262D3B]">Configuration summary</h3>
                                    {/* Summary Search box TableSearchInput */}
                                    <div className="w-full sm:w-[300px]">
                                        <TableSearchInput
                                            value={summarySearch}
                                            placeholder="Search here..."
                                            onChange={(val) => setSummarySearch(val)}
                                            sanitize={false}
                                        />
                                    </div>
                                </div>

                                {/* Second Row: Legend and Description Text */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-medium">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-gray-450">
                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0B8C00]"></span> <span className="font-semibold text-gray-700">Referrer / Referee</span> - Green Badge</span>
                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FFF5D7] border border-[#9A7909]/20"></span> <span className="font-semibold text-gray-700">Loyal</span> - Yellow Badge</span>
                                    </div>
                                    <div className="text-gray-450 font-bold text-left sm:text-right whitespace-nowrap">
                                        All values are % cashback as points
                                    </div>
                                </div>
                            </div>

                            {/* Summary table utilizing standard custom UI Table elements */}
                            <div className="border border-[#DFE0E2] rounded-xl overflow-hidden bg-white overflow-x-auto">
                                <table className="w-full text-center border-separate border-spacing-0 min-w-max">
                                    <thead>
                                        <tr className="border-b border-[#DFE0E2] text-[10px] font-bold text-[#7B8089] uppercase tracking-wider">
                                            <th className="h-[58px] px-5 text-left font-bold text-[#262D3B] border-b border-[#DFE0E2] align-middle">Branch</th>
                                            {POLICY_CATEGORIES.map((cat) => (
                                                <th key={cat.key} className="h-[58px] px-1.5 border-l border-b border-[#DFE0E2] text-center align-middle">
                                                    <div className="font-bold text-[11px] text-[#262D3B] mb-1">{cat.label}</div>
                                                    <div className="flex items-center justify-center gap-0.5 text-[10px] text-gray-400 font-normal normal-case mt-1">
                                                        <span>Referrer</span>
                                                        <span className="text-gray-250">|</span>
                                                        <span>Referee</span>
                                                        <span className="text-gray-250">|</span>
                                                        <span>Loyal</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="h-[58px] px-5 border-l border-b border-[#DFE0E2] text-[#262D3B] text-center align-middle">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs font-semibold text-[#434956]">
                                        {formValues.branchRules
                                            .filter((r) => r.branchId === "default" || formValues.branches.includes(r.branchId))
                                            .filter((r) => r.branchName.toLowerCase().includes(summarySearch.toLowerCase()))
                                            .map((rule) => {
                                                const isDefault = rule.branchId === "default";
                                                return (
                                                    <tr key={rule.branchId} className="hover:bg-gray-50/50">
                                                        <td className="h-[58px] px-5 text-left border-b border-gray-100">
                                                            <div className="font-bold text-gray-700">{rule.branchName}</div>
                                                            <div className="text-[10px] text-gray-400 font-medium">{rule.branchArea}</div>
                                                        </td>
                                                        {POLICY_CATEGORIES.map((cat) => {
                                                            const defaultRule = formValues.branchRules.find((r) => r.branchId === "default");
                                                            const configToUse = isDefault || rule.isOverride
                                                                ? rule[cat.key]
                                                                : defaultRule?.[cat.key];

                                                            return (
                                                                <td key={cat.key} className="h-[58px] px-1.5 border-l border-b border-gray-100">
                                                                    {configToUse ? renderCategoryCell(configToUse, cat.key === "welcome") : "-"}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="h-[58px] px-5 border-l border-b border-gray-100 text-center">
                                                            <Badge variant={isDefault || !rule.isOverride ? "warning" : "success"}>
                                                                {isDefault || !rule.isOverride ? "Default" : "Custom"}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>

                        </ListBorder>

                    </form >
                )
                }

            </div >

            {/* ─── DIALOGS ──────────────────────────────────────────────────────────── */}
            < MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />

            < MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />

            <MessageDialog
                open={showStatusConfirmDialog}
                onClose={() => setShowStatusConfirmDialog(false)}
                iconSlot={
                    <div className="w-12 h-12 rounded-full bg-[#0B8C00] flex items-center justify-center text-white text-2xl font-black">
                        ?
                    </div>
                }
                message={
                    <span className="flex flex-col items-center gap-1.5">
                        <span className="text-lg font-bold text-[#262D3B]">Are you sure?</span>
                        <span className="text-sm font-medium text-[#7B8089]">
                            Are you sure you want to {statusTargetValue ? "Activate" : "Deactivate"} that card?
                        </span>
                    </span>
                }
                confirmText="Confirm"
                cancelText="Cancel"
                onConfirm={handleStatusConfirmSubmit}
                onCancel={() => setShowStatusConfirmDialog(false)}
                isActionLoading={isUpdatingStatus}
                width={400}
            />
            <MessageDialog
                open={showDeleteConfirmDialog}
                onClose={() => setShowDeleteConfirmDialog(false)}
                icon="/icons/transhExtraDarkIcon.svg"
                iconBgColor="#FF3B301A"
                message={
                    <span className="flex flex-col items-center gap-1.5">
                        <span className="text-lg font-bold text-[#262D3B]">Delete Health Card?</span>
                        <span className="text-sm font-medium text-[#7B8089]">
                            Are you sure you want to delete this health card? This action cannot be undone.
                        </span>
                    </span>
                }
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDeleteConfirmSubmit}
                onCancel={() => setShowDeleteConfirmDialog(false)}
                isActionLoading={isDeletingCard}
                width={400}
            />
            <MessageDialog
                open={showInactiveConfirmDialog}
                onClose={() => setShowInactiveConfirmDialog(false)}
                iconSlot={
                    <div className="w-12 h-12 rounded-full bg-[#EF4444] flex items-center justify-center text-white text-2xl font-black">
                        !
                    </div>
                }
                message={
                    <span className="flex flex-col items-center gap-1.5">
                        <span className="text-lg font-bold text-[#262D3B]">Are you sure?</span>
                        <span className="text-sm font-medium text-center text-[#7B8089] px-4">
                            Are you sure you want to inactive this card? This action cannot be undone, and in the future you will not be able to make this card active.
                        </span>
                    </span>
                }
                confirmText="Confirm"
                cancelText="Cancel"
                onConfirm={() => {
                    setShowInactiveConfirmDialog(false);
                    if (formValues) {
                        setFormValues({
                            ...formValues,
                            status: "Inactive",
                        });
                    }
                    if (formErrors.status) {
                        setFormErrors({ ...formErrors, status: "" });
                    }
                }}
                onCancel={() => setShowInactiveConfirmDialog(false)}
                width={400}
            />
            {/* Reusable 384x240 Card Image Cropper Modal */}
            <CardImageCropperModal
                open={isCropperOpen}
                imageSrc={cropperImageSrc}
                fileName={cropperFileName}
                targetWidth={384}
                targetHeight={240}
                onClose={() => {
                    setIsCropperOpen(false);
                    setCropperImageSrc(null);
                }}
                onConfirm={(croppedFile) => {
                    setFormValues((prev) => (prev ? { ...prev, cardImage: croppedFile } : prev));
                    setIsCropperOpen(false);
                    setCropperImageSrc(null);
                }}
            />
        </AppShell >
    );
}
