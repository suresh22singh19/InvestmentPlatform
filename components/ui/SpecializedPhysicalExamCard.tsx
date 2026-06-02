"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { FormInputField } from "./FormInputField";
import { FormSelectField } from "./FormSelectField";
import { FormTextareaField } from "./FormTextareaField";
import { PatientTypeButtonGroup } from "./PatientTypeButtonGroup";
import { Button } from "./Button";

export interface SpecializedPhysicalExamCardProps {
    className?: string;
}

interface BodyMarker {
    id: number;
    x: number; // percentage from left
    y: number; // percentage from top
    view: "front" | "back";
    type: "pain" | "swelling" | "numbness";
}

const SELECT_OPTIONS = [
    { label: "None", value: "None" },
    { label: "Mild", value: "Mild" },
    { label: "Moderate", value: "Moderate" },
    { label: "Severe", value: "Severe" },
];

const SLEEP_OPTIONS = [
    { label: "Good", value: "Good" },
    { label: "Fair", value: "Fair" },
    { label: "Poor", value: "Poor" },
    { label: "Insomnia", value: "Insomnia" },
];

export function SpecializedPhysicalExamCard({ className = "" }: SpecializedPhysicalExamCardProps) {
    // Mental Health State
    const [anxiety, setAnxiety] = useState("");
    const [depression, setDepression] = useState("");
    const [sleepQuality, setSleepQuality] = useState("");
    const [stressLevel, setStressLevel] = useState<"mild" | "moderate" | "severe" | "none" | "">("");
    const [mentalRemarks, setMentalRemarks] = useState("");

    // Systemic Notes - Gastric
    const [gastricSelected, setGastricSelected] = useState<string[]>([]);
    const [gastricRemarks, setGastricRemarks] = useState("");

    // Systemic Notes - Respiratory
    const [so2, setSo2] = useState("");
    const [respiratorySelected, setRespiratorySelected] = useState<string[]>([]);
    const [respiratoryRemarks, setRespiratoryRemarks] = useState("");

    // Systemic Notes - Cardiac
    const [cardiacSelected, setCardiacSelected] = useState<string[]>([]);
    const [cardiacRemarks, setCardiacRemarks] = useState("");

    // Systemic Notes - Nervous
    const [nervousSelected, setNervousSelected] = useState<string[]>([]);
    const [nervousRemarks, setNervousRemarks] = useState("");

    // Systemic Notes - Urinary
    const [urinarySelected, setUrinarySelected] = useState<string[]>([]);
    const [urinaryRemarks, setUrinaryRemarks] = useState("");

    // Balance & Mobility
    const [sitting, setSitting] = useState<"normal" | "abnormal" | "">("");
    const [standing, setStanding] = useState<"normal" | "abnormal" | "">("");
    const [walking, setWalking] = useState<"normal" | "abnormal" | "">("");
    const [mobilityRemarks, setMobilityRemarks] = useState("");

    // Pain Assessment
    const [painSite, setPainSite] = useState("");
    const [painScale, setPainScale] = useState<number | null>(null);
    const [activeMarkType, setActiveMarkType] = useState<"pain" | "swelling" | "numbness">("pain");
    const [markers, setMarkers] = useState<BodyMarker[]>([]);
    const [painNotes, setPainNotes] = useState("");

    // Ashta Vidha Pariksha
    const [nadi, setNadi] = useState("");
    const [mala, setMala] = useState("");
    const [mutra, setMutra] = useState("");
    const [jihva, setJihva] = useState("");
    const [shabda, setShabda] = useState("");
    const [sparsha, setSparsha] = useState("");
    const [druk, setDruk] = useState("");
    const [akruti, setAkruti] = useState("");

    // Handle multiselect button toggle
    const handleToggleOption = (
        option: string, 
        selectedList: string[], 
        setSelectedList: (list: string[]) => void
    ) => {
        const optionLower = option.toLowerCase();
        if (optionLower === "none" || optionLower === "nil") {
            if (selectedList.includes(option)) {
                setSelectedList([]);
            } else {
                setSelectedList([option]);
            }
        } else {
            let updated = selectedList.filter(item => item.toLowerCase() !== "none" && item.toLowerCase() !== "nil");
            if (updated.includes(option)) {
                updated = updated.filter(item => item !== option);
            } else {
                updated.push(option);
            }
            setSelectedList(updated);
        }
    };

    // Body diagram click handler to place coordinates
    const handleBodyClick = (
        e: React.MouseEvent<HTMLDivElement>, 
        view: "front" | "back"
    ) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newMarker: BodyMarker = {
            id: Date.now(),
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            view,
            type: activeMarkType,
        };

        const updatedMarkers = [...markers, newMarker];
        setMarkers(updatedMarkers);
        
        // Auto-generate note update
        const typeLabel = activeMarkType.charAt(0).toUpperCase() + activeMarkType.slice(1);
        const markerDesc = `${typeLabel} marked on ${view} body diagram at location x:${newMarker.x}%, y:${newMarker.y}%`;
        setPainNotes(prev => prev ? `${prev}\n- ${markerDesc}` : `- ${markerDesc}`);
    };

    // Remove single marker
    const handleRemoveMarker = (id: number) => {
        setMarkers(markers.filter(m => m.id !== id));
    };

    // Clear all body map markers
    const handleClearAllMarkers = () => {
        setMarkers([]);
        setPainNotes("");
    };

    return (
        <div className={`flex flex-col gap-6 w-full ${className}`}>

            {/* SECTION 4: SPECIALIZED HISTORY */}
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#F0F2F0] pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">
                            4
                        </div>
                        <h3 className="font-inter font-semibold text-base text-[#262D3B]">
                            Specialized History
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
                </div>

                {/* Mental & Psychological Health Sub-Section */}
                <div className="space-y-4">
                    <h4 className="font-inter font-semibold text-sm text-[#434956] border-l-2 border-[#0B8C00] pl-2">
                        Mental & Psychological Health
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormSelectField
                            label="Anxiety"
                            placeholder="Select"
                            options={SELECT_OPTIONS}
                            value={anxiety}
                            onChange={(val) => setAnxiety(val as string)}
                            background="white"
                            width="100%"
                        />
                        <FormSelectField
                            label="Depression"
                            placeholder="Select"
                            options={SELECT_OPTIONS}
                            value={depression}
                            onChange={(val) => setDepression(val as string)}
                            background="white"
                            width="100%"
                        />
                        <FormSelectField
                            label="Sleep Quality"
                            placeholder="Select"
                            options={SLEEP_OPTIONS}
                            value={sleepQuality}
                            onChange={(val) => setSleepQuality(val as string)}
                            background="white"
                            width="100%"
                        />
                        <PatientTypeButtonGroup
                            options={["Mild", "Moderate", "Severe", "None"]}
                            value={stressLevel}
                            onChange={(val) => setStressLevel(val as any)}
                            label="Stress Level"
                        />
                    </div>
                    <FormTextareaField
                        label="Remarks / Doctor Notes"
                        placeholder="Doctor notes on mental and psychological health..."
                        value={mentalRemarks}
                        onChange={(e) => setMentalRemarks(e.target.value)}
                        width="100%"
                        height={76}
                    />
                </div>

                {/* Systemic Notes Sub-Section */}
                <div className="space-y-6 pt-2 border-t border-dashed border-[#EBECED]">
                    <h4 className="font-inter font-semibold text-sm text-[#434956] border-l-2 border-[#0B8C00] pl-2 mb-2">
                        Systemic Notes
                    </h4>

                    {/* Gastric Complaints */}
                    <div className="space-y-3">
                        <span className="block text-xs font-semibold text-[#7B8089]">
                            Gastric Complaints
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {["Acidity", "GERD", "Gas", "Abd Pain", "Constipation", "Loose Stool", "Nausea", "None"].map((option) => {
                                const isActive = gastricSelected.includes(option);
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => handleToggleOption(option, gastricSelected, setGastricSelected)}
                                        className={`font-inter text-xs font-medium px-4 py-1.5 rounded-full border transition-all duration-150 ${
                                            isActive
                                                ? "bg-[#0B8C00] text-white border-[#0B8C00]"
                                                : "bg-white text-[#434956] border-[#EBECED] hover:bg-[#F5FBF5]"
                                        }`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        <FormTextareaField
                            label="Remarks / Doctor Notes"
                            placeholder="Doctor notes on gastric symptoms..."
                            value={gastricRemarks}
                            onChange={(e) => setGastricRemarks(e.target.value)}
                            width="100%"
                            height={70}
                        />
                    </div>

                    {/* Respiratory */}
                    <div className="space-y-3 pt-2 border-t border-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                            <div className="md:col-span-1">
                                <FormInputField
                                    label="SO2"
                                    placeholder="e.g. 98"
                                    value={so2}
                                    onChange={(e) => setSo2(e.target.value)}
                                    type="text"
                                    width="100%"
                                />
                            </div>
                            <div className="md:col-span-3 space-y-2">
                                <span className="block text-xs font-semibold text-[#7B8089]">Respiratory Issues</span>
                                <div className="flex flex-wrap gap-2">
                                    {["Cough", "Fever", "Asthma", "Wheeze", "TB", "Others", "None"].map((option) => {
                                        const isActive = respiratorySelected.includes(option);
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => handleToggleOption(option, respiratorySelected, setRespiratorySelected)}
                                                className={`font-inter text-xs font-medium px-4 py-1.5 rounded-full border transition-all duration-150 ${
                                                    isActive
                                                        ? "bg-[#0B8C00] text-white border-[#0B8C00]"
                                                        : "bg-white text-[#434956] border-[#EBECED] hover:bg-[#F5FBF5]"
                                                }`}
                                            >
                                                {option}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <FormTextareaField
                            label="Remarks / Doctor Notes"
                            placeholder="Doctor notes on respiratory symptoms..."
                            value={respiratoryRemarks}
                            onChange={(e) => setRespiratoryRemarks(e.target.value)}
                            width="100%"
                            height={70}
                        />
                    </div>

                    {/* Cardiac */}
                    <div className="space-y-3 pt-2 border-t border-gray-50">
                        <span className="block text-xs font-semibold text-[#7B8089]">Cardiac</span>
                        <div className="flex flex-wrap gap-2">
                            {["Chest Pain", "Palpitation", "Breathing", "Dizziness", "Nil", "Others"].map((option) => {
                                const isActive = cardiacSelected.includes(option);
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => handleToggleOption(option, cardiacSelected, setCardiacSelected)}
                                        className={`font-inter text-xs font-medium px-4 py-1.5 rounded-full border transition-all duration-150 ${
                                            isActive
                                                ? "bg-[#0B8C00] text-white border-[#0B8C00]"
                                                : "bg-white text-[#434956] border-[#EBECED] hover:bg-[#F5FBF5]"
                                        }`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        <FormTextareaField
                            label="Remarks / Doctor Notes"
                            placeholder="Doctor notes on cardiac concerns..."
                            value={cardiacRemarks}
                            onChange={(e) => setCardiacRemarks(e.target.value)}
                            width="100%"
                            height={70}
                        />
                    </div>

                    {/* Nervous System */}
                    <div className="space-y-3 pt-2 border-t border-gray-50">
                        <span className="block text-xs font-semibold text-[#7B8089]">Nervous System</span>
                        <div className="flex flex-wrap gap-2">
                            {["Headache", "Sensory Loss", "Weakness", "Nil", "Others"].map((option) => {
                                const isActive = nervousSelected.includes(option);
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => handleToggleOption(option, nervousSelected, setNervousSelected)}
                                        className={`font-inter text-xs font-medium px-4 py-1.5 rounded-full border transition-all duration-150 ${
                                            isActive
                                                ? "bg-[#0B8C00] text-white border-[#0B8C00]"
                                                : "bg-white text-[#434956] border-[#EBECED] hover:bg-[#F5FBF5]"
                                        }`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        <FormTextareaField
                            label="Remarks / Doctor Notes"
                            placeholder="Doctor notes on nervous system conditions..."
                            value={nervousRemarks}
                            onChange={(e) => setNervousRemarks(e.target.value)}
                            width="100%"
                            height={70}
                        />
                    </div>

                    {/* Urinary System */}
                    <div className="space-y-3 pt-2 border-t border-gray-50">
                        <span className="block text-xs font-semibold text-[#7B8089]">Urinary System</span>
                        <div className="flex flex-wrap gap-2">
                            {["Burning", "Frequency", "Blood", "Low Output", "Stones", "Others"].map((option) => {
                                const isActive = urinarySelected.includes(option);
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => handleToggleOption(option, urinarySelected, setUrinarySelected)}
                                        className={`font-inter text-xs font-medium px-4 py-1.5 rounded-full border transition-all duration-150 ${
                                            isActive
                                                ? "bg-[#0B8C00] text-white border-[#0B8C00]"
                                                : "bg-white text-[#434956] border-[#EBECED] hover:bg-[#F5FBF5]"
                                        }`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        <FormTextareaField
                            label="Remarks / Doctor Notes"
                            placeholder="Doctor notes on urinary complaints..."
                            value={urinaryRemarks}
                            onChange={(e) => setUrinaryRemarks(e.target.value)}
                            width="100%"
                            height={70}
                        />
                    </div>
                </div>

            </div>

            {/* SECTION 5: PHYSICAL EXAMINATION & DISORDERS */}
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#F0F2F0] pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">
                            5
                        </div>
                        <h3 className="font-inter font-semibold text-base text-[#262D3B]">
                            Physical Examination & Disorders
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
                </div>

                {/* Balance & Mobility Sub-Section */}
                <div className="space-y-4">
                    <h4 className="font-inter font-semibold text-sm text-[#434956] border-l-2 border-[#0B8C00] pl-2">
                        Balance and Mobility
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <PatientTypeButtonGroup
                            options={["Normal", "Abnormal"]}
                            value={sitting}
                            onChange={(val) => setSitting(val as any)}
                            label="Sitting"
                            required={true}
                        />
                        <PatientTypeButtonGroup
                            options={["Normal", "Abnormal"]}
                            value={standing}
                            onChange={(val) => setStanding(val as any)}
                            label="Standing"
                            required={true}
                        />
                        <PatientTypeButtonGroup
                            options={["Normal", "Abnormal"]}
                            value={walking}
                            onChange={(val) => setWalking(val as any)}
                            label="Walking"
                            required={true}
                        />
                    </div>
                    <FormTextareaField
                        label="Remarks"
                        placeholder="Remarks on mobility..."
                        value={mobilityRemarks}
                        onChange={(e) => setMobilityRemarks(e.target.value)}
                        width="100%"
                        height={76}
                    />
                </div>

                {/* Pain Assessment Sub-Section */}
                <div className="space-y-4 pt-4 border-t border-dashed border-[#EBECED]">
                    <h4 className="font-inter font-semibold text-sm text-[#434956] border-l-2 border-[#0B8C00] pl-2">
                        Pain Assessment
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInputField
                            label="Pain Site"
                            placeholder="e.g. Lower Back, Right Knee..."
                            value={painSite}
                            onChange={(e) => setPainSite(e.target.value)}
                            width="100%"
                        />

                        {/* Pain Scale (0-10) */}
                        <div className="space-y-1">
                            <span className="block text-xs font-medium text-[#7B8089]">
                                Pain Scale (0-10) <span className="text-[#F6776E]">*</span>
                            </span>
                            <div className="flex items-center gap-[5px] flex-wrap md:flex-nowrap">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                    const isSelected = painScale === num;
                                    return (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setPainScale(num)}
                                            className={`w-[26px] h-[26px] text-xs rounded-full font-bold flex items-center justify-center border transition-all duration-150 ${
                                                isSelected 
                                                    ? "bg-[#0B8C00] text-white border-[#0B8C00] scale-105" 
                                                    : "bg-white text-[#434956] border-[#EBECED] hover:bg-[#F5FBF5]"
                                            }`}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Interactive Body Mapping Area */}
                    <div className="bg-[#FAFAFA] border border-[#EBECED] rounded-2xl p-4 space-y-4">
                        <div>
                            <span className="block text-xs font-bold text-[#434956]">
                                Click on the body diagram to mark pain areas. Click on a marker to remove it.
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            {/* Dual Body Diagrams */}
                            <div className="lg:col-span-6 flex justify-around gap-2 bg-white rounded-xl border border-gray-100 p-3 relative select-none">
                                
                                {/* Front View Silhouette */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-[#7B8089]">Front</span>
                                    <div 
                                        onClick={(e) => handleBodyClick(e, "front")}
                                        className="relative w-[110px] h-[240px] border border-dashed border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center cursor-crosshair overflow-hidden"
                                    >
                                        <Image
                                            src="/icons/maleBodyFrontView.svg"
                                            alt="Male Body Front View"
                                            fill
                                            className="object-contain p-2 opacity-85"
                                        />
                                        
                                        {/* Render Front Markers */}
                                        {markers.filter(m => m.view === "front").map((marker) => {
                                            const colorClass = 
                                                marker.type === "pain" ? "bg-[#EF4444]" :
                                                marker.type === "swelling" ? "bg-[#3B82F6]" : "bg-[#1F2937]";
                                            return (
                                                <button
                                                    key={marker.id}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveMarker(marker.id);
                                                    }}
                                                    className={`absolute w-3 h-3 rounded-full border border-white ring-2 ring-white/30 ${colorClass} -translate-x-1/2 -translate-y-1/2 animate-ping-once cursor-pointer hover:scale-125 transition-transform`}
                                                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                                                    title={`Click to remove ${marker.type}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Back View Silhouette */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-[#7B8089]">Back</span>
                                    <div 
                                        onClick={(e) => handleBodyClick(e, "back")}
                                        className="relative w-[110px] h-[240px] border border-dashed border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center cursor-crosshair overflow-hidden"
                                    >
                                        <Image
                                            src="/icons/maleBodyBackView.svg"
                                            alt="Male Body Back View"
                                            fill
                                            className="object-contain p-2 opacity-85"
                                        />
                                        
                                        {/* Render Back Markers */}
                                        {markers.filter(m => m.view === "back").map((marker) => {
                                            const colorClass = 
                                                marker.type === "pain" ? "bg-[#EF4444]" :
                                                marker.type === "swelling" ? "bg-[#3B82F6]" : "bg-[#1F2937]";
                                            return (
                                                <button
                                                    key={marker.id}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveMarker(marker.id);
                                                    }}
                                                    className={`absolute w-3 h-3 rounded-full border border-white ring-2 ring-white/30 ${colorClass} -translate-x-1/2 -translate-y-1/2 animate-ping-once cursor-pointer hover:scale-125 transition-transform`}
                                                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                                                    title={`Click to remove ${marker.type}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>

                            {/* Mark Type controls */}
                            <div className="lg:col-span-6 flex flex-col gap-3 h-full justify-between">
                                <div className="space-y-2">
                                    <span className="block text-[11px] font-bold text-[#7B8089] uppercase tracking-wider">
                                        Mark Type
                                    </span>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveMarkType("pain")}
                                            className={`flex items-center gap-3 px-4 py-2 border rounded-xl text-xs font-semibold transition-all duration-150 ${
                                                activeMarkType === "pain"
                                                    ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]"
                                                    : "bg-white text-[#434956] border-[#EBECED] hover:bg-gray-50"
                                            }`}
                                        >
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                                            Pain / Tenderness
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveMarkType("swelling")}
                                            className={`flex items-center gap-3 px-4 py-2 border rounded-xl text-xs font-semibold transition-all duration-150 ${
                                                activeMarkType === "swelling"
                                                    ? "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]"
                                                    : "bg-white text-[#434956] border-[#EBECED] hover:bg-gray-50"
                                            }`}
                                        >
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                                            Swelling
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveMarkType("numbness")}
                                            className={`flex items-center gap-3 px-4 py-2 border rounded-xl text-xs font-semibold transition-all duration-150 ${
                                                activeMarkType === "numbness"
                                                    ? "bg-gray-800/10 text-gray-800 border-gray-800"
                                                    : "bg-white text-[#434956] border-[#EBECED] hover:bg-gray-50"
                                            }`}
                                        >
                                            <span className="w-2.5 h-2.5 rounded-full bg-gray-800" />
                                            Numbness
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleClearAllMarkers}
                                        className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                                    >
                                        ✕ Clear All Markers
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Location Notes Input */}
                        <div className="pt-1">
                            <FormTextareaField
                                label="Pain Location Notes"
                                placeholder="Auto-populated locations or custom notes here..."
                                value={painNotes}
                                onChange={(e) => setPainNotes(e.target.value)}
                                width="100%"
                                height={76}
                            />
                        </div>
                    </div>
                </div>

                {/* Ashta Vidha Pariksha Sub-Section */}
                <div className="space-y-4 pt-4 border-t border-dashed border-[#EBECED]">
                    <h4 className="font-inter font-semibold text-sm text-[#434956] border-l-2 border-[#0B8C00] pl-2">
                        Ashta Vidha Pariksha
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInputField
                            label="Nadi (Pulse)"
                            placeholder="e.g. Regular, Pitta..."
                            value={nadi}
                            onChange={(e) => setNadi(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Mala (Stool)"
                            placeholder="e.g. Constipated, Loose..."
                            value={mala}
                            onChange={(e) => setMala(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Mutra (Urine)"
                            placeholder="e.g. Clear, Pale Yellow..."
                            value={mutra}
                            onChange={(e) => setMutra(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Jihva (Tongue)"
                            placeholder="e.g. Coated, Pink..."
                            value={jihva}
                            onChange={(e) => setJihva(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Shabda (Voice)"
                            placeholder="e.g. Clear, Hoarse..."
                            value={shabda}
                            onChange={(e) => setShabda(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Sparsha (Touch)"
                            placeholder="e.g. Warm, Dry..."
                            value={sparsha}
                            onChange={(e) => setSparsha(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Druk (Eyes)"
                            placeholder="e.g. Normal, Yellowish..."
                            value={druk}
                            onChange={(e) => setDruk(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Akruti (Body Build)"
                            placeholder="e.g. Madhyam, Sthula..."
                            value={akruti}
                            onChange={(e) => setAkruti(e.target.value)}
                            width="100%"
                        />
                    </div>
                </div>

            </div>

        </div>
    );
}
