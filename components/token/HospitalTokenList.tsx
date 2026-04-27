"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

export type TokenPatientRow = {
  appointmentId?: number;
  token: string;
  patientName: string;
  timeSlot: string;
  isActive?: boolean;
};

export type TokenDoctorColumn = {
  id: string | number;
  name: string;
  specialty: string;
  roomNumber: string;
  patients: TokenPatientRow[];
  /** Under the doctor header when API sends `nowServing` (large name + "Now serving"). */
  headlinePatientName?: string | null;
};

type HospitalTokenListProps = {
  doctors: TokenDoctorColumn[];
  onMarkOpdComplete?: (appointmentId: number) => void | Promise<void>;
  markingAppointmentId?: number | null;
};

export function HospitalTokenList({
  doctors,
  onMarkOpdComplete,
  markingAppointmentId,
}: HospitalTokenListProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  const colCount = Math.max(doctors.length, 1);

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex h-20 items-center justify-center gap-4 bg-[#0B8C00] text-white">
        <svg width="48" viewBox="0 0 55 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M40.8148 23.6263L33.9741 39.2592C33.8017 39.6542 33.413 39.9019 32.9915 39.9019C32.9464 39.9019 32.8992 39.8983 32.8541 39.8925C32.3803 39.831 32.0038 39.4646 31.9301 38.9936L27.5987 11.2705L21.3085 33.3575C21.1818 33.8013 20.786 34.1155 20.3237 34.1348C19.8499 34.1792 19.4391 33.8793 19.2737 33.447L15.6337 23.9519L1.75488 23.7336C2.72251 25.6431 4.08018 27.3915 5.82291 28.8551L26.8952 46.5356L27.3947 47.1311L27.5 47.0445L27.6052 47.1311L28.1054 46.5356L49.177 28.8558C50.9512 27.3658 52.3232 25.5765 53.2944 23.6263H40.8148Z"
            fill="white"
          />
          <path
            d="M51.1917 5.83691C45.3917 -1.07527 35.087 -1.97633 28.1763 3.82366L27.4992 4.38834L26.8258 3.82294C19.9143 -1.97704 9.60965 -1.07598 3.80892 5.83619C0.00714042 10.3665 -0.896786 16.3497 0.865261 21.5722L16.3916 21.8176C16.8303 21.8248 17.2204 22.0975 17.3771 22.5069L20.124 29.6724L26.8708 5.98291C27.009 5.49695 27.4706 5.17489 27.9687 5.20567C28.4719 5.23644 28.8855 5.61289 28.9643 6.11173L33.4825 35.0251L39.1279 22.1225C39.2982 21.7318 39.684 21.4791 40.1112 21.4791H54.1661C55.8859 16.2789 54.9698 10.3408 51.1917 5.83691ZM48.5436 12.3605C48.5436 12.6618 48.2995 12.9058 47.9982 12.9058H44.2287V16.6754C44.2287 16.9767 43.9839 17.2207 43.6833 17.2207H41.5033C41.202 17.2207 40.9586 16.9767 40.9586 16.6754V12.9058H37.1898C36.8885 12.9058 36.6444 12.6618 36.6444 12.3605V10.1805C36.6444 9.87915 36.8885 9.6351 37.1898 9.6351H40.9601V5.86553C40.9601 5.56494 41.2034 5.32089 41.5047 5.32089H43.6847C43.9853 5.32089 44.2301 5.56494 44.2301 5.86553V9.6351H47.9997C48.301 9.6351 48.545 9.87915 48.545 10.1805V12.3605H48.5436Z"
            fill="white"
          />
        </svg>
        <span className="text-4xl font-bold">Hospital Token List</span>
      </header>

      <div
        className="grid flex-1 gap-2.5 p-2.5"
        style={{
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        }}
      >
        {doctors.map((doctor) => (
          <div key={String(doctor.id)} className="flex flex-col border border-[#ddd] bg-white">
            <div className="bg-[#0B8C00] text-white">
              <h2 className="m-0 flex h-[60px] items-center justify-center border-b border-[#ddd] text-xl">
                {doctor.name}
              </h2>
              <p className="m-0 flex h-[45px] items-center justify-center border-b border-[#ddd] text-lg font-bold leading-[120%]">
                {doctor.specialty}
              </p>
              <p className="m-0 flex h-[45px] items-center justify-center border-b border-[#ddd] text-lg font-bold leading-[120%]">
                {doctor.roomNumber}
              </p>
            </div>

            {doctor.headlinePatientName ? (
              <div className="border-b border-[#ddd] bg-[#E8F5E9] px-4 py-3 text-center">
                <p className="m-0 text-sm font-semibold uppercase tracking-wide text-[#0B8C00]">
                  Now serving
                </p>
                <p className="m-0 mt-1 line-clamp-2 text-2xl font-bold leading-tight text-[#262D3B]">
                  {doctor.headlinePatientName}
                </p>
              </div>
            ) : null}

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="h-[60px] border-b border-[#ddd] border-r border-[#ddd] px-5 text-left align-middle text-lg font-bold leading-[120%] text-[#262D3B] [background-color:rgba(223,224,226,0.4)]">
                    Token
                  </th>
                  <th className="h-[60px] border-b border-[#ddd] px-5 text-left align-middle text-lg font-bold leading-[120%] text-[#262D3B] [background-color:rgba(223,224,226,0.4)]">
                    Now Serving
                  </th>
                </tr>
              </thead>
              <tbody>
                {doctor.patients.map((patient, patientIndex) => (
                  <tr
                    key={patient.appointmentId ?? `${patient.token}-${patientIndex}`}
                    className={
                      patient.isActive
                        ? "bg-[#0B8C00] text-white"
                        : patientIndex % 2 === 0
                          ? "bg-[rgba(223,224,226,0.4)]"
                          : ""
                    }
                  >
                    <td
                      className={`h-[78px] border-b border-[#eee] border-r border-[#ddd] px-5 align-middle text-lg font-semibold leading-[120%] ${
                        patient.isActive ? "text-white" : "text-[#434956]"
                      }`}
                    >
                      {patient.token}
                    </td>
                    <td
                      className={`h-[78px] border-b border-[#eee] px-5 align-middle text-lg font-semibold leading-[120%] ${
                        patient.isActive ? "text-white" : "text-[#333]"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          {patient.patientName}
                          <span
                            className={`mt-0.5 block text-base leading-[120%] ${
                              patient.isActive ? "text-white" : "text-[#666]"
                            }`}
                          >
                            {patient.timeSlot}
                          </span>
                        </div>
                        {onMarkOpdComplete &&
                        patient.appointmentId != null &&
                        patient.appointmentId > 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="small"
                            className={`shrink-0 text-xs ${
                              patient.isActive
                                ? "max-w-[min(100%,11rem)] whitespace-normal text-left leading-snug !h-auto !min-h-9 !min-w-0 !border-white/80 !bg-white/20 !py-2 !text-white !shadow-none hover:!bg-white/30 hover:!text-white"
                                : ""
                            }`}
                            isLoading={markingAppointmentId === patient.appointmentId}
                            disabled={markingAppointmentId !== null}
                            onClick={() => onMarkOpdComplete(patient.appointmentId!)}
                          >
                            Mark OPD complete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <footer className="flex items-center justify-between border-t border-[#ddd] [background-color:rgba(223,224,226,0.4)]">
        <div className="m-0 text-2xl font-medium">
          Patients are requested to wait for their token number to appear on the display.
        </div>
        <div className="min-w-[200px] bg-[#2c2f33] px-8 py-4 text-center text-white">
          <span className="block text-2xl font-bold">{formatTime(currentTime)}</span>
          <span className="text-xl">{formatDate(currentTime)}</span>
        </div>
      </footer>
    </div>
  );
}
