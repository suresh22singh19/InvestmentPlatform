"use client";

import { useEffect, useState } from "react";

interface TokenPatient {
    token: string;
    patientName: string;
    timeSlot: string;
    isActive?: boolean;
}

interface Doctor {
    name: string;
    specialty: string;
    roomNumber: string;
    patients: TokenPatient[];
}

interface HospitalTokenListProps {
    doctors?: Doctor[];
}

export default function HospitalTokenList({
    doctors = [
        {
            name: "Dr. Vishal Raman",
            specialty: "Cardiology",
            roomNumber: "Room no. 105",
            patients: [
                {
                    token: "RP-20260212-0001",
                    patientName: "Mrs. Kamlesh Devi",
                    timeSlot: "09:00 AM - 10:00 AM",
                    isActive: true,
                },
                {
                    token: "NP-20260212-0002",
                    patientName: "Mrs. Mangubhai Tailor",
                    timeSlot: "09:00 AM - 10:00 AM",
                },
                {
                    token: "GEP-20260211-0001",
                    patientName: "Mrs. Kusumbahen Tailor",
                    timeSlot: "09:00 AM - 10:00 AM",
                },
            ],
        },
        {
            name: "Dr. Anjali Sharma",
            specialty: "Orthopedic",
            roomNumber: "Room no. 106",
            patients: [
                {
                    token: "RP-20260212-0001",
                    patientName: "Mr. Ravi",
                    timeSlot: "11:00 AM - 11:15 AM",
                    isActive: true,
                },
                {
                    token: "NP-20260212-0002",
                    patientName: "Mr. Sanjeev Kapoor",
                    timeSlot: "11:15 AM - 11:30 AM",
                },
                {
                    token: "GEP-20260211-0001",
                    patientName: "Mrs. Pooja Agarwal",
                    timeSlot: "11:30 AM - 11:45 AM",
                },
            ],
        },
        {
            name: "Dr. R. K. Mehta",
            specialty: "ENT",
            roomNumber: "Room no. 107",
            patients: [
                {
                    token: "RP-20260212-0001",
                    patientName: "Mr. Suresh Pawar",
                    timeSlot: "09:00 AM - 09:10 AM",
                    isActive: true,
                },
                {
                    token: "NP-20260212-0002",
                    patientName: "Mrs. Manju Kulkarni",
                    timeSlot: "09:10 AM - 09:20 AM",
                },
                {
                    token: "GEP-20260211-0001",
                    patientName: "Mr. Vinod Patil",
                    timeSlot: "09:20 AM - 09:30 AM",
                },
            ],
        },
    ],
}: HospitalTokenListProps) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="flex h-screen flex-col bg-white">
            {/* Header Section */}
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

            {/* Container with Doctor Columns */}
            <div className="grid flex-1 grid-cols-3 gap-2.5 p-2.5">
                {doctors.map((doctor, doctorIndex) => (
                    <div key={doctorIndex} className="flex flex-col border border-[#ddd] bg-white">
                        {/* Doctor Header */}
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

                        {/* Table */}
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
                                        key={patientIndex}
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
                                            {patient.patientName}
                                            <span
                                                className={`mt-0.5 block text-base leading-[120%] ${
                                                    patient.isActive ? "text-white" : "text-[#666]"
                                                }`}
                                            >
                                                {patient.timeSlot}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            {/* Footer Section */}
            <footer className="flex items-center justify-between border-t border-[#ddd] [background-color:rgba(223,224,226,0.4)]">
                <div className="m-0 text-2xl font-medium">Patients are requested to wait for their token number to appear on the display.</div>
                <div className="min-w-[200px] bg-[#2c2f33] px-8 py-4 text-center text-white">
                    <span className="block text-2xl font-bold">{formatTime(currentTime)}</span>
                    <span className="text-xl">{formatDate(currentTime)}</span>
                </div>
            </footer>
        </div>
    );
}
