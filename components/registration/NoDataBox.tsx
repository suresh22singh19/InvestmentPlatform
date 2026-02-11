"use client";

interface NoDataBoxProps {
    message?: string;
}

export default function NoDataBox({ message = "No Data Found" }: NoDataBoxProps) {
    return (
        <div className="text-center text-[#434956] font-inter font-normal text-sm h-[200px] flex items-center justify-center rounded-[12px] border-2 border-dashed border-[#E3EEE1]">
            {message}
        </div>
    );
}

