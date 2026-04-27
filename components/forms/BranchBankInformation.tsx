"use client";

import type { FormikProps } from "formik";
import { FormInputField } from "@/components/ui";
import type { BranchFacilityFormValues } from "@/lib/validation/branchFacilitySchemas";
import { BRANCH_TEXT_INPUT_MAX_LENGTH, filterDigitsOnly, filterFirmNameChars } from "@/lib/utils/branchFacilityInput";

const TX = BRANCH_TEXT_INPUT_MAX_LENGTH;

type Props = {
  formik: FormikProps<BranchFacilityFormValues>;
};

function fieldErr(formik: FormikProps<BranchFacilityFormValues>, key: keyof BranchFacilityFormValues) {
  const t = formik.touched[key];
  const e = formik.errors[key];
  if (!t || typeof e !== "string") return undefined;
  return e;
}

export default function BranchBankInformation({ formik }: Props) {
  const { values, handleBlur, setFieldValue } = formik;

  return (
    <div className="space-y-4 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">Branch Bank Information</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div data-field="bankName" className="scroll-mt-4">
          <FormInputField
            label="Bank Name *"
            name="bankName"
            placeholder="Enter the bank name"
            value={values.bankName}
            maxLength={TX}
            onChange={(e) => setFieldValue("bankName", filterFirmNameChars(e.target.value))}
            onBlur={handleBlur}
            error={fieldErr(formik, "bankName")}
          />
        </div>
        <div data-field="accNo" className="scroll-mt-4">
          <FormInputField
            label="Account Number *"
            name="accNo"
            placeholder="Enter the account number"
            value={values.accNo}
            maxLength={TX}
            inputMode="numeric"
            onChange={(e) => setFieldValue("accNo", filterDigitsOnly(e.target.value))}
            onBlur={handleBlur}
            error={fieldErr(formik, "accNo")}
          />
        </div>
        <div data-field="ifscCode" className="scroll-mt-4">
          <FormInputField
            label="IFSC Code *"
            name="ifscCode"
            placeholder="Enter the IFSC code"
            value={values.ifscCode}
            onChange={(e) =>
              setFieldValue(
                "ifscCode",
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11)
              )
            }
            onBlur={handleBlur}
            maxLength={11}
            error={fieldErr(formik, "ifscCode")}
          />
        </div>
        <div data-field="bankBranchName" className="scroll-mt-4">
          <FormInputField
            label="Bank Branch Name *"
            name="bankBranchName"
            placeholder="Enter the bank branch name"
            value={values.bankBranchName}
            maxLength={TX}
            onChange={(e) => setFieldValue("bankBranchName", filterFirmNameChars(e.target.value))}
            onBlur={handleBlur}
            error={fieldErr(formik, "bankBranchName")}
          />
        </div>
      </div>
    </div>
  );
}
