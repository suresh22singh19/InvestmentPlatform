import { DoctorRecordsProvider } from "./DoctorRecordsContext";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    return <DoctorRecordsProvider>{children}</DoctorRecordsProvider>;
}
