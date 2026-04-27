/** Rupee-in-circle stroke icon (matches ConsultancyBranchService usage). */
export function RupeeCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8.25a6.5 6.5 0 01-6.5-6.5H9"
      />
    </svg>
  );
}
