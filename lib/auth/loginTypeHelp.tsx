export type LoginTypeHelpEntity = "nurse" | "user" | "doctor";

function roleLabelForEntity(entity: LoginTypeHelpEntity): string {
    if (entity === "nurse") return "nurse";
    if (entity === "doctor") return "doctor";
    return "user";
}

export function LoginTypeHelpContent({ entity = "user" }: { entity?: LoginTypeHelpEntity }) {
    const roleLabel = roleLabelForEntity(entity);

    return (
        <div className="space-y-1.5 text-start text-[10px] leading-[1] text-[#262D3B]">
            <p className="font-bold">
                Login Type determines how the {roleLabel} can log in to the system.
            </p>
            <ul className="space-y-1">
                <li>
                    <span className="font-semibold">IP</span> → Login allowed only from registered hospital IP address.
                </li>
                <li>
                    <span className="font-semibold">OTP</span> → Login using One-Time Password
                    verification.
                </li>
                <li>
                    <span className="font-semibold">IP/OTP</span> → Both IP restriction and OTP
                    verification required.
                </li>
                <li>
                    <span className="font-semibold">No Auth</span> → Login without IP restriction or
                    OTP verification.
                </li>
            </ul>
        </div>
    );
}
