"use client";

import React, { useMemo } from "react";
import { Tooltip } from "./Tooltip";
import type { PatientDetailsBadge, PatientDetailsInfoItem } from "./PatientDetailsCard";
import type { VitalItem } from "./VitalsCard";

export interface PatientHeaderSummaryCardProps {
    patientName?: string;
    age?: string;
    gender?: string;
    ageGender?: string;
    fatherHusbandName?: string;
    maritalStatus?: string;
    bp?: string;
    temp?: string;
    hr?: string;
    sugar?: string;
    communicableDisease?: string;
    bloodGroup?: string;
    patientType?: string;

    patientSubtitle?: string;
    patientInfoItems?: PatientDetailsInfoItem[];
    vitalsItems?: VitalItem[];
    patientBadges?: PatientDetailsBadge[];
    communicableDiseases?: string[] | string;
    className?: string;
}

export function PatientHeaderSummaryCard({
    patientName = "N/A",
    age: ageProp,
    gender: genderProp,
    ageGender: ageGenderProp,
    fatherHusbandName: fatherHusbandNameProp,
    maritalStatus: maritalStatusProp,
    bp: bpProp,
    temp: tempProp,
    hr: hrProp,
    sugar: sugarProp,
    communicableDisease: communicableDiseaseProp,
    bloodGroup: bloodGroupProp,
    patientType: patientTypeProp,

    patientSubtitle = "",
    patientInfoItems = [],
    vitalsItems = [],
    patientBadges = [],
    communicableDiseases,
    className = "",
}: PatientHeaderSummaryCardProps) {
    // Auto-extract values if props are not explicitly provided
    const extractedData = useMemo(() => {
        // 1. Age and Gender (Age/Gender: 32Y • Female)
        let age = ageProp;
        let gender = genderProp;

        if ((!age || !gender) && patientSubtitle) {
            const ageMatch = patientSubtitle.match(/Age\s*:\s*([^•|]+)/i);
            const genderMatch = patientSubtitle.match(/Gender\s*:\s*([^•|]+)/i);
            if (!age && ageMatch) age = ageMatch[1].trim().replace(/\s*years?/i, "Y");
            if (!gender && genderMatch) gender = genderMatch[1].trim();
        }

        if (!age) {
            const ageItem = patientInfoItems.find(i => i.label.toLowerCase() === "age");
            if (ageItem) age = ageItem.value.replace(/\s*years?/i, "Y");
        }
        if (!gender) {
            const genderItem = patientInfoItems.find(i => i.label.toLowerCase() === "gender");
            if (genderItem) gender = genderItem.value;
        }

        if ((!age || !gender) && ageGenderProp) {
            const parts = ageGenderProp.split("•").map(p => p.trim());
            if (!age && parts[0]) age = parts[0].replace(/\s*years?/i, "Y");
            if (!gender && parts[1]) gender = parts[1];
        }

        const ageGenderText = age && gender ? `${age} • ${gender}` : age || gender || "N/A";

        // 2. Father's / Husband's Name
        let fatherHusbandName = fatherHusbandNameProp;
        if (!fatherHusbandName) {
            const fhItem = patientInfoItems.find(i => {
                const l = i.label.toLowerCase();
                return l.includes("father") || l.includes("husband");
            });
            if (fhItem) fatherHusbandName = fhItem.value;
        }

        // 3. Marital Status
        let maritalStatus = maritalStatusProp;
        if (!maritalStatus) {
            const msItem = patientInfoItems.find(i => i.label.toLowerCase().includes("marital"));
            if (msItem) maritalStatus = msItem.value;
        }

        // 4. Vitals (BP, Temp, HR, Sugar)
        let bp = bpProp;
        let temp = tempProp;
        let hr = hrProp;
        let sugar = sugarProp;

        vitalsItems.forEach(v => {
            const l = v.label.toLowerCase();
            const valStr = `${v.value}${v.unit ? " " + v.unit : ""}`;
            if (!bp && (l.includes("bp") || l.includes("blood pressure"))) bp = valStr.replace(/\s*bp$/i, "");
            else if (!temp && (l.includes("temp") || l.includes("temperature"))) temp = valStr;
            else if (!hr && (l.includes("hr") || l.includes("pulse") || l.includes("heart rate"))) hr = valStr;
            else if (!sugar && (l.includes("sugar") || l.includes("spo2") || l.includes("glucose"))) sugar = valStr;
        });

        // 5. Communicable Disease
        let communicableDisease = communicableDiseaseProp;
        if (!communicableDisease && communicableDiseases) {
            if (Array.isArray(communicableDiseases)) {
                communicableDisease = communicableDiseases.join(", ");
            } else if (typeof communicableDiseases === "string") {
                communicableDisease = communicableDiseases;
            }
        }
        if (!communicableDisease) {
            const cdItem = patientInfoItems.find(i => i.label.toLowerCase().includes("communicable"));
            if (cdItem) communicableDisease = cdItem.value;
        }

        // Format disease labels cleanly (hiv -> HIV, hepatitis -> Hepatitis, tb -> TB, normal -> Normal)
        if (communicableDisease) {
            const diseaseMap: Record<string, string> = {
                hiv: "HIV",
                hepatitis: "Hepatitis",
                tb: "TB",
                normal: "Normal",
            };
            const cleanedInput = String(communicableDisease).replace(/[\{\}\[\]"]/g, "").trim();
            const parts = cleanedInput.split(/[,;]+/).map(p => {
                const clean = p.trim().toLowerCase();
                return diseaseMap[clean] || (p.trim() ? p.trim().charAt(0).toUpperCase() + p.trim().slice(1) : "");
            }).filter(Boolean);

            if (parts.length > 0) {
                communicableDisease = parts.join(", ");
            }
        }

        // 6. Blood Group
        let bloodGroup = bloodGroupProp;
        if (!bloodGroup) {
            const bgItem = patientInfoItems.find(i => i.label.toLowerCase().includes("blood"));
            if (bgItem) bloodGroup = bgItem.value;
        }
        if (!bloodGroup) {
            const bgBadge = patientBadges.find(b => {
                const clean = b.label.trim().toUpperCase();
                return ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "A-POSITIVE", "B-POSITIVE", "AB-POSITIVE", "O-POSITIVE", "A-NEGATIVE", "B-NEGATIVE", "AB-NEGATIVE", "O-NEGATIVE"].includes(clean);
            });
            if (bgBadge) bloodGroup = bgBadge.label;
        }

        if (bloodGroup && bloodGroup.trim().toLowerCase() !== "n/a") {
            bloodGroup = bloodGroup.trim().toUpperCase();
        }

        // 7. Patient Type
        let patientType = patientTypeProp;
        if (!patientType) {
            const ptBadge = patientBadges.find(b => {
                const clean = b.label.trim().toUpperCase();
                return !["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "A-POSITIVE", "B-POSITIVE", "AB-POSITIVE", "O-POSITIVE", "A-NEGATIVE", "B-NEGATIVE", "AB-NEGATIVE", "O-NEGATIVE"].includes(clean);
            });
            if (ptBadge) patientType = ptBadge.label;
        }

        return {
            ageGenderText,
            fatherHusbandName: fatherHusbandName || "N/A",
            maritalStatus: maritalStatus || "N/A",
            bp: bp || "N/A",
            temp: temp || "N/A",
            hr: hr || "N/A",
            sugar: sugar || "N/A",
            communicableDisease: communicableDisease || "N/A",
            bloodGroup: bloodGroup || "N/A",
            patientType: patientType || "N/A",
        };
    }, [
        ageProp, genderProp, ageGenderProp, fatherHusbandNameProp, maritalStatusProp, bpProp, tempProp, hrProp, sugarProp,
        communicableDiseaseProp, bloodGroupProp, patientTypeProp, patientSubtitle, patientInfoItems,
        vitalsItems, patientBadges, communicableDiseases
    ]);

    return (
        <div className={`w-full px-0 py-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs xl:text-[13px] text-[#374151] whitespace-nowrap min-w-0 transition-all duration-600 ease-[cubic-bezier(0.25,1,0.5,1)] ${className}`}>
            {/* Patient Name */}
            <Tooltip content={patientName} position="top" delay={0}>
                <span className="font-bold text-base xl:text-lg text-[#1F2937] truncate max-w-[180px] xl:max-w-[240px] shrink-0 block cursor-pointer hover:text-[#0B8C00] transition-colors me-0.5">
                    {patientName}
                </span>
            </Tooltip>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* Age/Gender */}
            <div className="flex items-center gap-1 shrink-0">
                <span className="text-black font-normal">Age/Gender:</span>
                <span className="font-semibold text-[#1F2937]">{extractedData.ageGenderText}</span>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* Father's/Husband's Name */}
            <div className="flex items-center gap-1 shrink-0 min-w-0">
                <span className="text-black font-normal shrink-0">Father&apos;s/Husband&apos;s Name:</span>
                <Tooltip content={extractedData.fatherHusbandName} position="top" delay={0}>
                    <span className="font-semibold text-[#1F2937] truncate max-w-[130px] xl:max-w-[200px] inline-block cursor-pointer hover:text-[#0B8C00] transition-colors">
                        {extractedData.fatherHusbandName}
                    </span>
                </Tooltip>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* Marital Status */}
            <div className="flex items-center gap-1 shrink-0">
                <span className="text-black font-normal">Marital Status:</span>
                <span className="font-semibold text-[#1F2937]">{extractedData.maritalStatus}</span>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* Blood Group */}
            <div className="flex items-center gap-1 shrink-0">
                <span className="text-black font-normal">Blood Group:</span>
                <span className="font-semibold text-[#1F2937]">{extractedData.bloodGroup}</span>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* Patient Type */}
            <div className="flex items-center gap-1 shrink-0">
                <span className="text-black font-normal">Patient Type:</span>
                <span className="font-semibold text-[#1F2937]">{extractedData.patientType}</span>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* BP */}
            <div className="flex items-center gap-1 shrink-0">
                <span className="text-black font-normal">BP:</span>
                <span className="font-semibold text-[#1F2937]">{extractedData.bp}</span>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* Temp */}
            <div className="flex items-center gap-1 shrink-0">
                <span className="text-black font-normal">Temp:</span>
                <span className="font-semibold text-[#1F2937]">{extractedData.temp}</span>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* HR */}
            <div className="flex items-center gap-1 shrink-0">
                <span className="text-black font-normal">HR:</span>
                <span className="font-semibold text-[#1F2937]">{extractedData.hr}</span>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* Sugar */}
            <div className="flex items-center gap-1 shrink-0">
                <span className="text-black font-normal">Sugar:</span>
                <span className="font-semibold text-[#1F2937]">{extractedData.sugar}</span>
            </div>

            {/* Divider */}
            <span className="text-[#9CA3AF] font-light shrink-0">|</span>

            {/* Communicable Disease */}
            <div className="flex items-center gap-1 shrink-0 min-w-0">
                <span className="text-black font-normal shrink-0">Communicable Disease:</span>
                <Tooltip content={extractedData.communicableDisease} position="top" delay={0}>
                    <span className="font-semibold text-[#1F2937] truncate max-w-[200px] xl:max-w-[320px] inline-block cursor-pointer hover:text-[#0B8C00] transition-colors">
                        {extractedData.communicableDisease}
                    </span>
                </Tooltip>
            </div>
        </div>
    );
}
