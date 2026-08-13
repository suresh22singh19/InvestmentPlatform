"use client";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  const classes =
    tone === "danger"
      ? "border-[#93000A3D] text-[#93000A] bg-white"
      : tone === "warning"
        ? "border-[#B4530933] text-[#B45309] bg-white"
        : tone === "success"
          ? "border-[#0B8C0033] text-[#0B8C00] bg-white"
          : "border-[#CBD5E1] text-[#64748B] bg-[#F8FAFC]";

  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

