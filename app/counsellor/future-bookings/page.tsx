"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useAppDispatch } from "@/store/hooks";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormInputField,
  TableSearchInput,
  Pagination,
  PanelCard,
  MessageDialog,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import {
  settingsApi,
  useGetAllMasterServicesQuery,
  useCreateMasterServiceMutation,
  type GetAllMasterServicesResponse,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";









export default function ConsultancyServiceSettingsPage() {



  const dispatch = useAppDispatch();

  const [formValues, setFormValues] = useState({
    price: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

//   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 

  

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Future Bookings" />
        </div>

   
      </div>

    </AppShell>
  );
}
