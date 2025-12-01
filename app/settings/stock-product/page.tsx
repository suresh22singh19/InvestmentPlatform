"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, FormSelectField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { ListBorder } from "@/components/ui/ListBorder";

const branchOptions: SelectOption[] = [
  { value: "murad-nagar", label: "MURAD NAGAR UP" },
  { value: "vaishali", label: "Vaishali UP" },
  { value: "sonipat", label: "Sonipat" },
  { value: "shastri-nagar", label: "Shastri Nagar Delhi" },
  { value: "rdc-ghaziabad", label: "RDC Ghaziabad UP" },
  { value: "prashant-vihar", label: "Prashant Vihar" },
  { value: "panchkula", label: "HIIMS PANCHKULA" },
];

const updateTypeOptions: SelectOption[] = [
  { value: "stock", label: "Stock" },
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
];

export default function StockProductPage() {
  const [formValues, setFormValues] = useState({
    branch: "",
    updateType: "",
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Submit handler placeholder
    console.log("Submitting stock/product update", formValues);
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Settings" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold leading-[120%] text-[#262D3B]">Update Stock/Products/Service</h2>
              </div>

              <div className="space-y-5">
                <FormSelectField
                  label="Branch*"
                  value={formValues.branch}
                  onChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      branch: Array.isArray(value) ? value[0] : value || "",
                    }))
                  }
                  options={branchOptions}
                  placeholder="Select Branch"
                  mode="single"
                  background="white"
                />

                <FormSelectField
                  label="Update Type*"
                  value={formValues.updateType}
                  onChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      updateType: Array.isArray(value) ? value[0] : value || "",
                    }))
                  }
                  options={updateTypeOptions}
                  placeholder="Select"
                  mode="single"
                  background="white"
                />
              </div>

              <div>
                <Button type="submit" variant="primary">
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </ListBorder>
      </div>
    </AppShell>
  );
}

