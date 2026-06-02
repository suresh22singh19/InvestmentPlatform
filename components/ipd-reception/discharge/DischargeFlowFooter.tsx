"use client";

import Image from "next/image";
import { BackToPreviousPageButton } from "@/components/ui";
import { Button } from "@/components/ui";

type DischargeFlowFooterProps = {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  showNext?: boolean;
  nextDisabled?: boolean;
};

export function DischargeFlowFooter({
  onBack,
  onNext,
  nextLabel = "Next",
  showNext = true,
  nextDisabled = false,
}: DischargeFlowFooterProps) {
  return (
    <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
      <BackToPreviousPageButton text="Back" onClick={onBack} />
      {showNext && onNext ? (
        <Button
          variant="primary"
          size="medium"
          className="!min-w-0 sm:min-w-[140px]"
          onClick={onNext}
          disabled={nextDisabled}
          rightIcon={
            <Image
              src="/icons/LeftArrowIcon.svg"
              alt=""
              width={18}
              height={18}
              className="rotate-180"
            />
          }
        >
          {nextLabel}
        </Button>
      ) : null}
    </div>
  );
}
