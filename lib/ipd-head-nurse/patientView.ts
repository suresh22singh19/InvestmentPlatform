import type { PatientWalletDetailItem } from "@/components/ui";

export function formatCounsellingAppointmentDate(dateString?: string | null): string {
    if (!dateString?.trim()) return "N/A";
    const trimmed = dateString.trim();
    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        return `${day}/${month}/${year}`;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
}

export function formatCounsellingCreatedDate(dateString?: string | null): string {
    if (!dateString?.trim()) return "N/A";
    const trimmed = dateString.trim();
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const seconds = String(parsed.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

export function buildViewAppointmentData(fetchedPatientData: Record<string, any> | null | undefined) {
    const appDetail = fetchedPatientData?.appointmentDetail || {};
    const patDetails = fetchedPatientData?.patientDetails || {};
    const refDetail = fetchedPatientData?.referralDetail || {};
    const medInfo = fetchedPatientData?.medicalInfo || {};
    const otherInfo = fetchedPatientData?.otherInformation || {};
    const walletInfo = fetchedPatientData?.wallet || {};
    // const walletExists = !!fetchedPatientData?.wallet;
    const packageDetails = fetchedPatientData?.patientPackage || {};

    const appointmentItems = [
        { label: "UHID", value: appDetail.uhid || "N/A" },
        { label: "OPD ID", value: appDetail.opid?.toString() || "N/A" },
        { label: "Branch", value: appDetail.branch || "N/A" },
        { label: "Doctor", value: appDetail.doctor || "N/A" },
        {
            label: "Doctor OPD Fee",
            value: appDetail.doctorCpdFee !== undefined ? `Rs. ${appDetail.doctorCpdFee}` : "N/A",
        },
        { label: "Appointment Date", value: formatCounsellingAppointmentDate(appDetail.appointmentDate) },
        { label: "Time Slot", value: appDetail.timeSlot || "N/A" },
        { label: "Created Date", value: formatCounsellingCreatedDate(appDetail.createdDate) },
        { label: "Remark", value: appDetail.remark || "N/A", multiline: true },
    ];

    const referralItems = [
        { label: "Source", value: refDetail.source || "N/A" },
        { label: "Sub Source", value: refDetail.subSource || "N/A" },
        { label: "Referral Doctor", value: refDetail.referralDoctor || "N/A" },
        { label: "Referral Name", value: refDetail.referralName || "N/A" },
        { label: "Mobile", value: refDetail.mobile || "N/A" },
    ];

    // const patientName = patDetails.name || "N/A";
    // const patientName = `${patDetails.patientTitle} ${patDetails.name || "N/A"}`;
     const patientName = patDetails?.name
        ? `${patDetails?.patientTitle || ""} ${patDetails.name}`.trim()
        : "N/A";
    const patientSubtitle = `Contact Number: ${patDetails.contactNumber || "N/A"} • Age : ${patDetails.age || "N/A"} Years • Gender : ${patDetails.gender || "N/A"}`;

    const patientBadges = [
        ...(medInfo.bloodGroup && medInfo.bloodGroup !== "N/A"
            ? [
                  {
                      label: medInfo.bloodGroup,
                      className:
                          "inline-flex h-[30px] min-w-[76px] me-2 items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]",
                  },
              ]
            : []),
        ...(otherInfo.patientType
            ? [
                  {
                      label: otherInfo.patientType,
                      className:
                          "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-white text-[#0B8C00]",
                  },
              ]
            : []),
    ];

    const patientInfoItems = [
        {
            iconSrc: "/icons/UserGear.svg",
            iconAlt: "Father/Husband",
            label: "Father’s/Husband’s Name",
            // value: patDetails.fatherHusbandName || patDetails.guardianName || "N/A",
            value:  `${patDetails?.guardianTitle || ""} ${
                    patDetails?.fatherHusbandName || patDetails?.guardianName || ""
                }`.trim() || "N/A",
        },
        {
            iconSrc: "/icons/gendericon.svg",
            iconAlt: "Marital Status",
            label: "Marital Status",
            value: patDetails.maritalStatus || "N/A",
        },
        {
            iconSrc: "/icons/mapicon.svg",
            iconAlt: "Address",
            label: "Address",
            value: patDetails.address || "N/A",
        },
        {
            iconSrc: "/icons/adharcardicon.svg",
            iconAlt: "Aadhar Card Number",
            label: "Aadhar Card Number",
            value: patDetails.aadharCardNumber || "N/A",
        },
    ];

    const vitalsItems = [
        { label: "Blood Pressure", value: patDetails.bloodPressure || "N/A", unit: "bp" },
        { label: "Sugar Level", value: patDetails.sugarLevel || "N/A", unit: "mg/dL" },
        { label: "Temperature", value: patDetails.temperature || "N/A", unit: "" },
        { label: "Heart Rate", value: patDetails.heartRate || "N/A", unit: "bpm" },
    ];

    // const remainingAmount =
    //     walletExists && walletInfo.availableBalance !== undefined
    //         ? `Rs. ${walletInfo.availableBalance}`
    //         : "N/A";

    // const walletDetails: PatientWalletDetailItem[] = walletExists
    //     ? [
    //           { label: "Current Balance", value: `Rs. ${walletInfo.currentBalance ?? 0}` },
    //           { label: "Hold Amount", value: `Rs. ${walletInfo.holdAmount ?? 0}` },
    //           { label: "Total Credit", value: `Rs. ${walletInfo.totalCredit ?? 0}` },
    //           { label: "Total Debit", value: `Rs. ${walletInfo.totalDebit ?? 0}` },
    //           {
    //               label: "Last Updated",
    //               value: walletInfo.lastUpdated
    //                   ? new Date(walletInfo.lastUpdated).toLocaleDateString("en-GB")
    //                   : "N/A",
    //           },
    //       ]
    //     : [
    //           { label: "Package", value: "N/A" },
    //           { label: "Amount", value: "N/A" },
    //           { label: "Discount", value: "N/A" },
    //           { label: "Expire", value: "N/A" },
    //       ];

            const remainingAmount =  walletInfo.currentBalance !== undefined ? `Rs. ${walletInfo.currentBalance}`  : "N/A";
                const walletDetails: PatientWalletDetailItem[] =
                        [
                        { label: "Package", value: packageDetails?.packageName || "N/A" },
                       {
                            label: "Amount",
                            value: packageDetails?.packagePrice != null
                                ? `Rs. ${packageDetails.packagePrice}`
                                : "N/A",
                            },
                        { label: "Discount",
                            value: packageDetails?.discountPercentage != null
                            ? `${packageDetails.discountPercentage}%`
                            : packageDetails?.discountFixed != null
                            ? `${packageDetails.discountFixed}`
                            : "N/A",
                        },
                        // { label: "Expire", value: packageDetails?.expireDate || "N/A" },
                     {
                        label: "Expire",
                        value: packageDetails?.expireDate
                            ? new Date(packageDetails.expireDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })
                            : "N/A",
                        }
                    ]

    const medicalItems = [
        { label: "Diagnosis", value: medInfo.diagnosis || "N/A" },
        { label: "Disease", value: medInfo.disease || "N/A" },
        { label: "Blood Group", value: medInfo.bloodGroup || "N/A" },
        { label: "Allergies", value: medInfo.allergies || "N/A" },
        { label: "Surgeries", value: medInfo.surgeries || "N/A" },
        { label: "Addiction", value: medInfo.addiction || "N/A" },
        { label: "Height", value: patDetails.height || medInfo.height || "N/A" },
        { label: "Weight", value: patDetails.weight || medInfo.weight || "N/A" },
        { label: "Diet Type", value: medInfo.dietType || "N/A" },
        { label: "Remark", value: medInfo.remark || "N/A", multiline: true },
    ];

    const otherInfoItems = [
        { label: "Patient Type", value: otherInfo.patientType || "N/A" },
        { label: "Patient Sub Type", value: otherInfo.patientSubType || "N/A" },
        { label: "Beneficiary ID", value: "N/A" },
        { label: "Insurance Company", value: "N/A" },
        { label: "Ayush Covered", value: "N/A" },
    ];

    const timelineItems =
        fetchedPatientData?.patientHistory?.map((h: Record<string, any>) => ({
            dateLabel: h.date || h.createdDate || "N/A",
            detail: {
                primaryComplaintTitle: "Chief Complaint",
                primaryComplaintText: h.chiefComplaint || h.remark || "N/A",
                detailsTitle: "Symptoms",
                detailsItems: Array.isArray(h.symptoms) ? h.symptoms : h.symptoms ? [h.symptoms] : ["N/A"],
                actionsTitle: "Medicines Prescribed",
                actionItems: Array.isArray(h.medicines) ? h.medicines : h.medicines ? [h.medicines] : ["N/A"],
            },
        })) || [];

    const healthCardNo = patDetails.jsHealthCardNo || "N/A";

    return {
        appointmentItems,
        referralItems,
        patientName,
        patientSubtitle,
        patientBadges,
        patientInfoItems,
        vitalsItems,
        remainingAmount,
        walletDetails,
        medicalItems,
        otherInfoItems,
        timelineItems,
        healthCardNo,
    };
}

export function resolveCounsellorAppointmentId(
    item: { appointmentId?: number | string | null; opid?: number | string | null; id?: number | string | null }
): number | null {
    const candidates = [item.appointmentId, item.opid];
    for (const raw of candidates) {
        if (raw == null || raw === "") continue;
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
}
