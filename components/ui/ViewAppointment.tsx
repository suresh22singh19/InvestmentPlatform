"use client";

import {
    AppointmentDetailCard,
    type AppointmentDetailItem,
    PatientWalletInformationCard,
    type PatientWalletDetailItem,
    ReferralPatientInfoCard,
    type ReferralPatientInfoItem,
    PatientDetailsCard,
    type PatientDetailsBadge,
    type PatientDetailsInfoItem,
    VitalsCard,
    type VitalItem,
    PatientInformationTimelineCard,
    type PatientInformationTimelineItem,
    HealthCardPreview,
    MedicalInformationCard,
    type MedicalInformationItem,
    PatientFilesCard,
    type PatientFileItem,
    OtherInformationCard,
    type OtherInformationItem,
    DietPlanCard,
    type DietPlanEntry,
    type DietPlanHeaderAction,
} from "@/components/ui";

export interface ViewAppointmentProps {
    // Left column
    appointmentItems?: AppointmentDetailItem[];
    walletRemainingAmount?: string;
    walletDetails?: PatientWalletDetailItem[];
    onWalletActionClick?: () => void;
    referralItems?: ReferralPatientInfoItem[];

    // Middle column
    patientName?: string;
    patientSubtitle?: string;
    patientBadges?: PatientDetailsBadge[];
    patientInfoItems?: PatientDetailsInfoItem[];
    showVitals?: boolean;
    vitalsItems?: VitalItem[];
    timelineItems?: PatientInformationTimelineItem[];
    showDietPlan?: boolean;
    dietPlanDecoctionValue?: string;
    dietPlanHeaderActions?: DietPlanHeaderAction[];
    dietPlanRows?: DietPlanEntry[][];
    dietPlanRoomService?: string;

    // Right column
    healthCardNo?: string;
    medicalItems?: MedicalInformationItem[];
    fileItems?: PatientFileItem[];
    fileEmptyMessage?: string;
    filePlainEmptyState?: boolean;
    otherInfoItems?: OtherInformationItem[];
}

export function ViewAppointment({
    // Left column
    appointmentItems,
    walletRemainingAmount = "Rs. 0",
    walletDetails,
    onWalletActionClick,
    referralItems,

    // Middle column
    patientName = "N/A",
    patientSubtitle = "Contact Number: XXXXXXXXXX • Age : N/A • Gender : N/A",
    patientBadges = [],
    patientInfoItems = [],
    showVitals = true,
    vitalsItems,
    timelineItems,
    showDietPlan = false,
    dietPlanDecoctionValue = "Kadha",
    dietPlanHeaderActions = [],
    dietPlanRows = [],
    dietPlanRoomService = "N/A",

    // Right column
    healthCardNo = "",
    medicalItems,
    fileItems,
    fileEmptyMessage = "No Data Available",
    filePlainEmptyState = true,
    otherInfoItems,
}: ViewAppointmentProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left Column */}
            <div className="col-span-1">
                {appointmentItems && (
                    <AppointmentDetailCard items={appointmentItems} />
                )}

                {walletDetails && (
                    <PatientWalletInformationCard
                        remainingAmount={walletRemainingAmount}
                        details={walletDetails}
                        onActionClick={onWalletActionClick}
                    />
                )}

                {referralItems && (
                    <ReferralPatientInfoCard items={referralItems} />
                )}
            </div>

            {/* Middle Column */}
            <div className="col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className={showVitals ? "" : "md:col-span-2"}>
                        <PatientDetailsCard
                            name={patientName}
                            subtitle={patientSubtitle}
                            badges={patientBadges}
                            infoItems={patientInfoItems}
                        />
                    </div>
                    {showVitals && vitalsItems && (
                        <VitalsCard items={vitalsItems} />
                    )}
                </div>

                {timelineItems && timelineItems.length > 0 && (
                    <PatientInformationTimelineCard
                        title="Patient History"
                        items={timelineItems}
                    />
                )}

                {showDietPlan && (
                    <DietPlanCard
                        decoctionValue={dietPlanDecoctionValue}
                        headerActions={dietPlanHeaderActions}
                        rows={dietPlanRows}
                        roomService={dietPlanRoomService}
                    />
                )}
            </div>

            {/* Right Column */}
            <div className="col-span-1">
                <HealthCardPreview cardNumber={healthCardNo} />

                {medicalItems && (
                    <MedicalInformationCard items={medicalItems} />
                )}

                {fileItems && (
                    <PatientFilesCard
                        items={fileItems}
                        emptyMessage={fileEmptyMessage}
                        plainEmptyState={filePlainEmptyState}
                    />
                )}

                {otherInfoItems && (
                    <OtherInformationCard items={otherInfoItems} />
                )}
            </div>
        </div>
    );
}
