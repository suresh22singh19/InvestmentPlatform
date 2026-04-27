"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { DoctorPayload, DoctorRecord } from "@/lib/doctor/doctorStatic";
import { SEED_DOCTORS } from "@/lib/doctor/doctorStatic";

type DoctorRecordsContextValue = {
    doctors: DoctorRecord[];
    getDoctorById: (id: number) => DoctorRecord | undefined;
    addDoctor: (payload: DoctorPayload) => number;
    updateDoctor: (id: number, payload: DoctorPayload) => void;
    resetToSeed: () => void;
};

const DoctorRecordsContext = createContext<DoctorRecordsContextValue | null>(null);

export function DoctorRecordsProvider({ children }: { children: React.ReactNode }) {
    const [doctors, setDoctors] = useState<DoctorRecord[]>(() => [...SEED_DOCTORS]);

    const getDoctorById = useCallback(
        (id: number) => doctors.find((d) => d.id === id),
        [doctors]
    );

    const addDoctor = useCallback((payload: DoctorPayload): number => {
        let newId = 0;
        setDoctors((prev) => {
            newId = Math.max(0, ...prev.map((d) => d.id)) + 1;
            const createdAt = new Date().toLocaleString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
            return [...prev, { ...payload, id: newId, createdAt }];
        });
        return newId;
    }, []);

    const updateDoctor = useCallback((id: number, payload: DoctorPayload) => {
        setDoctors((prev) =>
            prev.map((d) => (d.id === id ? { ...d, ...payload, id } : d))
        );
    }, []);

    const resetToSeed = useCallback(() => {
        setDoctors([...SEED_DOCTORS]);
    }, []);

    const value = useMemo(
        () => ({
            doctors,
            getDoctorById,
            addDoctor,
            updateDoctor,
            resetToSeed,
        }),
        [doctors, getDoctorById, addDoctor, updateDoctor, resetToSeed]
    );

    return <DoctorRecordsContext.Provider value={value}>{children}</DoctorRecordsContext.Provider>;
}

export function useDoctorRecords() {
    const ctx = useContext(DoctorRecordsContext);
    if (!ctx) {
        throw new Error("useDoctorRecords must be used within DoctorRecordsProvider");
    }
    return ctx;
}
