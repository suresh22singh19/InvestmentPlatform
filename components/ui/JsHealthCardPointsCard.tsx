"use client";

export interface JsHealthCardPointsItem {
    id: string;
    label: string;
    value: string;
}

interface JsHealthCardPointsCardProps {
    title?: string;
    remainingAmountLabel?: string;
    remainingAmount: string;
    items: JsHealthCardPointsItem[];
    /** When set, shows a simple centered message instead of amount / grid (e.g. no wallet package data) */
    emptyMessage?: string;
    className?: string;
}

export function JsHealthCardPointsCard({
    title = "Health Card Points",
    remainingAmountLabel = "Remaining Amount",
    remainingAmount,
    items,
    emptyMessage,
    className = "",
}: JsHealthCardPointsCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2">
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>

            {emptyMessage ? (
                <div className="mt-5 flex min-h-[120px] items-center justify-center">
                    <p className="text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">{emptyMessage}</p>
                </div>
            ) : (
                <>
                    <div className="my-5">
                        <h5 className="mb-2 text-center text-base font-medium leading-[19px] tracking-[0.03em] text-[#9FA2AB]">
                            {remainingAmountLabel}
                        </h5>
                        <h4 className="text-center text-2xl font-bold leading-[28px] text-[#1D1B23]">{remainingAmount}</h4>
                    </div>

                    <div className="my-5 grid grid-cols-12 gap-4">
                        <div className="col-span-12">
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4 border-t border-b border-[#DFE0E2]">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words"
                                        >
                                            <p className="text-xs font-medium text-[#7B8089]">{item.label}</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
