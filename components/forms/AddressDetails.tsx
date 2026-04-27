"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FormInputField, FormSelectField } from "@/components/ui";
import { useGetCountriesQuery, useGetStatesQuery, useGetCitiesQuery, useGetTehsilsQuery, useGetAreasQuery, useLazyGetPincodeQuery } from "@/store/api/publicApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import PincodeSelectionDialog from "./PincodeSelectionDialog";

export interface AddressFormData {
  pinCode: string;
  country: string;
  state: string;
  city: string;
  tehsil: string;
  area: string;
  address: string;
  /** For non-India: House/Building Number, Street Name (mandatory). Sent as addressLine1 in API. */
  addressLine1?: string;
  /** For non-India: Apartment/Unit (optional). Sent as addressLine2 in API. */
  addressLine2?: string;
  companyName?: string;
}

/** Same rules as Patient Name on registration/hospital (`RegistrationPersonalDetails`): letters and spaces only, no leading spaces, collapse 3+ repeated characters to 2, capitalize first letter, max 100. */
function sanitizePatientNameStyleInput(raw: string): string {
  let value = raw.replace(/[^a-zA-Z\s]/g, "");
  value = value.replace(/^\s+/, "");
  value = value.replace(/(.)\1{2,}/g, "$1$1");
  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value.slice(0, 100);
}

interface AddressDetailsProps {
  formData: AddressFormData;
  onChange: (field: keyof AddressFormData, value: string) => void;
  onBlur?: (field: keyof AddressFormData) => void;
  /** Prefix for `data-field` attributes (e.g. `address.` → `address.pinCode`) when multiple address blocks exist on one page. */
  dataFieldPrefix?: string;
  /** When "Foreigner" or "Nepal", show non-India address fields (ZIP/Postal Code, Address Line 1/2). When "Indian", show India fields (Pin Code, Tehsil, Post Office, Address). */
  nationality?: string; // "Indian" | "Foreigner" | "Nepal"
  title?: string;
  iconSrc?: string;
  iconAlt?: string;
  showCompanyName?: boolean; // Show Company Name field (for Other Visitor page when Official is selected)
  fieldRefs?: {
    pinCode?: React.Ref<HTMLInputElement | null>;
    country?: React.Ref<HTMLDivElement | null>;
    state?: React.Ref<HTMLDivElement | null>;
    city?: React.Ref<HTMLDivElement | null>;
    tehsil?: React.Ref<HTMLDivElement | null>;
    area?: React.Ref<HTMLDivElement | null>;
    address?: React.Ref<HTMLInputElement | null>;
    addressLine1?: React.Ref<HTMLInputElement | null>;
    addressLine2?: React.Ref<HTMLInputElement | null>;
    companyName?: React.Ref<HTMLInputElement | null>;
  };
  errors?: Record<string, string | undefined>;
  readOnly?: boolean;
}

export default function AddressDetails({
  formData,
  onChange,
  onBlur,
  dataFieldPrefix = "",
  nationality,
  title = "Address Details",
  iconSrc,
  iconAlt = "Address icon",
  showCompanyName = false,
  fieldRefs,
  errors,
  readOnly = false,
}: AddressDetailsProps) {
  const df = (name: string) => (dataFieldPrefix ? `${dataFieldPrefix}${name}` : name);

  // When nationality is "Foreigner" or "Nepal", show non-India layout. When "Indian", show India layout. When not passed, use country only.
  const isIndiaSelected = useMemo(() => {
    if (nationality === "Foreigner" || nationality === "Nepal") return false;
    if (nationality === "Indian") return !formData.country || formData.country === "6";
    return formData.country === "6"; // No nationality prop: decide by country only (e.g. registration pages)
  }, [nationality, formData.country]);

  // Fetch countries from public API (always fetch)
  const { data: countriesData, isLoading: countriesLoading } = useGetCountriesQuery();

  // Fetch states only when India is selected and a country is chosen (cascading IDs)
  const { data: statesData, isLoading: statesLoading } = useGetStatesQuery(
    formData.country && isIndiaSelected
      ? {
          countryId: formData.country,
        }
      : undefined,
    {
      skip: !formData.country || !isIndiaSelected,
    }
  );

  // Fetch cities (districts) only when India is selected and a state is chosen
  const { data: citiesData, isLoading: citiesLoading } = useGetCitiesQuery(
    formData.state && isIndiaSelected
      ? {
          stateId: formData.state,
        }
      : undefined,
    {
      skip: !formData.state || !isIndiaSelected,
      refetchOnMountOrArgChange: true,
    }
  );

  // Lazy query for pincode - only fetch when needed
  const [getPincode] = useLazyGetPincodeQuery();
  
  // State to track pincode API errors
  const [pincodeApiError, setPincodeApiError] = useState<string>("");
  
  // State to store pincode options for dropdown
  const [pincodeOptions, setPincodeOptions] = useState<SelectOption[]>([]);
  const [pincodeSearchValue, setPincodeSearchValue] = useState<string>("");
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [showPincodeDropdown, setShowPincodeDropdown] = useState<boolean>(false);
  const [areaOptionsFromPincode, setAreaOptionsFromPincode] = useState<SelectOption[]>([]);
  const [pendingTehsilId, setPendingTehsilId] = useState<string | null>(null);
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const hasAutoSelectedTehsilRef = useRef<boolean>(false);
  const hasAutoSelectedAreaRef = useRef<boolean>(false);
  const lastSetTehsilValueRef = useRef<string | null>(null); // Track last successfully set tehsil value
  const lastSetAreaValueRef = useRef<string | null>(null); // Track last Post Office id (revisit / API can beat options load)
  const pincodeSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pincodeDropdownRef = useRef<HTMLDivElement>(null);
  const [showPincodeDialog, setShowPincodeDialog] = useState<boolean>(false);
  const [pincodeDialogData, setPincodeDialogData] = useState<any[]>([]);
  
  // Fetch tehsils when city (district) is selected and country is India (and include pincode if available)
  const { data: tehsilsData, isLoading: tehsilsLoading } = useGetTehsilsQuery(
    formData.city && formData.country === "6"
      ? {
          districtId: formData.city,
          ...(formData.pinCode
            ? { pincode: formData.pinCode.replace(/\D/g, "") }
            : {}),
        }
      : undefined,
    {
      skip: !formData.city || formData.country !== "6", // Skip if no city or not India
      refetchOnMountOrArgChange: true, // Refetch when districtId changes
    }
  );
  
  // Fetch areas when tehsil is selected and country is India (and include pincode if available)
  const { data: areasData, isLoading: areasLoading } = useGetAreasQuery(
    formData.tehsil && formData.country === "6"
      ? {
          tehsilId: formData.tehsil,
          ...(formData.pinCode
            ? { pincode: formData.pinCode.replace(/\D/g, "") }
            : {}),
        }
      : undefined,
    {
      skip: !formData.tehsil || formData.country !== "6", // Skip if no tehsil or not India
    }
  );

  // Transform countries data to options format
  const countryOptions: SelectOption[] = useMemo(() => {
    if (!countriesData?.data) return [];
    return countriesData.data.map((country) => ({
      value: country.id.toString(),
      label: country.name,
    }));
  }, [countriesData]);

  // Transform states data to options format
  const stateOptions: SelectOption[] = useMemo(() => {
    if (!statesData?.data) return [];
    return statesData.data.map((state) => ({
      value: state.id.toString(),
      label: state.name,
    }));
  }, [statesData]);

  // Transform cities data to options format
  const cityOptions: SelectOption[] = useMemo(() => {
    if (!citiesData?.data) return [];
    return citiesData.data.map((city) => ({
      value: city.id.toString(),
      label: city.name,
    }));
  }, [citiesData]);
  
  // Transform tehsils data to options format
  const tehsilOptions: SelectOption[] = useMemo(() => {
    if (!tehsilsData?.data) return [];
    return tehsilsData.data.map((tehsil) => ({
      value: tehsil.id.toString(),
      label: tehsil.name,
    }));
  }, [tehsilsData]);
  
  // Transform areas data to options format
  const areaOptionsFromAPI: SelectOption[] = useMemo(() => {
    if (!areasData?.data) return [];
    return areasData.data.map((area) => ({
      value: area.id.toString(),
      label: area.name,
    }));
  }, [areasData]);
  
  // Area options - prioritize API data, fallback to pincode response
  const areaOptions: SelectOption[] = useMemo(() => {
    // Use area options from API if available (when tehsil is selected)
    if (areaOptionsFromAPI.length > 0) {
      return areaOptionsFromAPI;
    }
    // Fallback to area options from pincode response
    if (areaOptionsFromPincode.length > 0) {
      return areaOptionsFromPincode;
    }
    return [];
  }, [areaOptionsFromAPI, areaOptionsFromPincode]);
  
  // Fetch pincode options when user types (3+ digits) - debounced
  useEffect(() => {
    // Clear previous timeout
    if (pincodeSearchTimeoutRef.current) {
      clearTimeout(pincodeSearchTimeoutRef.current);
    }
    
    const searchValue = pincodeSearchValue.replace(/\D/g, ""); // Only digits
    
    if (searchValue.length >= 3 && formData.country === "6") {
      // Debounce API call
      pincodeSearchTimeoutRef.current = setTimeout(() => {
        setIsPincodeLoading(true);
        getPincode(searchValue).then((result) => {
          setIsPincodeLoading(false);
          if (result.data?.success && result.data?.data) {
            const pincodeData = result.data.data;
            const dataArray = Array.isArray(pincodeData) ? pincodeData : [pincodeData];
            
            // Create options in format "152116 Abohar SO"
            const options: SelectOption[] = dataArray.map((item) => ({
              value: `${item.pincode}_${item.area_id}`, // Use pincode_areaId as unique identifier
              label: `${item.pincode} ${item.area}`,
            }));
            
            setPincodeOptions(options);
            setPincodeApiError("");
            setShowPincodeDropdown(options.length > 0);
          } else {
            setPincodeOptions([]);
            setShowPincodeDropdown(false);
            if (searchValue.length === 6) {
              setPincodeApiError(result.data?.message || "Pincode not found");
            }
          }
        }).catch((error) => {
          setIsPincodeLoading(false);
          console.error("Error fetching pincode data:", error);
          setPincodeOptions([]);
          setShowPincodeDropdown(false);
          if (searchValue.length === 6) {
            const errorMessage = error?.data?.message || error?.message || "Failed to fetch pincode data";
            setPincodeApiError(errorMessage);
          }
        });
      }, 300); // 300ms debounce
    } else {
      setIsPincodeLoading(false);
      setPincodeOptions([]);
      setShowPincodeDropdown(false);
      if (searchValue.length === 0) {
        setPincodeApiError("");
      }
    }
    
    return () => {
      if (pincodeSearchTimeoutRef.current) {
        clearTimeout(pincodeSearchTimeoutRef.current);
      }
    };
  }, [pincodeSearchValue, formData.country, getPincode]);

  // Transform flat pincode API response to nested structure for dialog
  const transformPincodeDataForDialog = (pincodeDataArray: any[]) => {
    // Group by pincode, then by area, then by tehsil
    interface TehsilData {
      id: number;
      name: string;
      district: {
        id: number;
        name: string;
        state: {
          id: number;
          name: string;
          country: {
            id: number;
            name: string;
          };
        };
      };
    }
    
    interface AreaData {
      id: number;
      name: string;
      tehsils: Map<number, TehsilData>;
    }
    
    type AreaMap = Map<number, AreaData>;
    type PincodeMap = Map<number, AreaMap>;
    
    const pincodeMap: PincodeMap = new Map();
    
    pincodeDataArray.forEach((item) => {
      const pincode = item.pincode;
      const areaId = item.area_id;
      const tehsilId = item.tehsil_id;
      
      if (!pincodeMap.has(pincode)) {
        pincodeMap.set(pincode, new Map());
      }
      const areaMap = pincodeMap.get(pincode)!;
      
      if (!areaMap.has(areaId)) {
        areaMap.set(areaId, {
          id: areaId,
          name: item.area,
          tehsils: new Map(),
        });
      }
      const area = areaMap.get(areaId)!;
      
      if (!area.tehsils.has(tehsilId)) {
        area.tehsils.set(tehsilId, {
          id: tehsilId,
          name: item.tehsil,
          district: {
            id: item.district_id,
            name: item.district,
            state: {
              id: item.state_id,
              name: item.state,
              country: {
                id: item.country_id,
                name: item.country,
              },
            },
          },
        });
      }
    });
    
    // Convert to array format expected by dialog
    const result: any[] = [];
    pincodeMap.forEach((areaMap, pincode) => {
      const areas: any[] = [];
      areaMap.forEach((area) => {
        areas.push({
          id: area.id,
          name: area.name,
          tehsils: Array.from(area.tehsils.values()),
        });
      });
      result.push({
        pincode,
        areas,
      });
    });
    
    return result;
  };

  // Handle "Show more" click - open dialog with current pincode data
  const handleShowMoreClick = () => {
    if (readOnly) return;
    
    const searchValue = pincodeSearchValue.replace(/\D/g, "");
    if (searchValue.length >= 3) {
      // Fetch pincode data for dialog
      getPincode(searchValue).then((result) => {
        if (result.data?.success && result.data?.data) {
          const pincodeData = result.data.data;
          const dataArray = Array.isArray(pincodeData) ? pincodeData : [pincodeData];
          
          // Transform to dialog format
          const transformedData = transformPincodeDataForDialog(dataArray);
          setPincodeDialogData(transformedData);
          setShowPincodeDialog(true);
        }
      }).catch((error) => {
        console.error("Error fetching pincode data for dialog:", error);
      });
    }
  };

  // Handle dialog selection - auto-fill form fields
  const handleDialogSelect = (pincode: number, area: any, tehsil: any) => {
    if (readOnly) return;
    
    // Set pincode
    onChange("pinCode", pincode.toString());
    setPincodeSearchValue(pincode.toString());
    setShowPincodeDropdown(false);
    
    // Clear previous pending values and reset auto-selection flags
    setPendingTehsilId(null);
    setPendingAreaId(null);
    setAreaOptionsFromPincode([]);
    hasAutoSelectedTehsilRef.current = false;
    hasAutoSelectedAreaRef.current = false;
    // Don't clear lastSetTehsilValueRef - preserve it to maintain value through re-renders
    
    // Auto-fill all fields from selected data
    const district = tehsil.district;
    const state = district.state;
    const country = state.country;
    
    if (country.id) {
      onChange("country", country.id.toString());
      setTimeout(() => {
        onBlur?.("country");
      }, 50);
    }
    
    if (state.id) {
      onChange("state", state.id.toString());
      setTimeout(() => {
        onBlur?.("state");
      }, 50);
    }
    
    if (district.id) {
      onChange("city", district.id.toString());
      // Store tehsil_id and area_id to set after dependencies load
      if (tehsil.id) {
        setPendingTehsilId(tehsil.id.toString());
      }
      if (area.id) {
        setPendingAreaId(area.id.toString());
      }
      // Reset auto-selection flags when new pincode is selected
      hasAutoSelectedTehsilRef.current = false;
      hasAutoSelectedAreaRef.current = false;
      setTimeout(() => {
        onBlur?.("city");
      }, 50);
    }
  };

  const handlePincodeOptionSelect = (option: SelectOption) => {
    if (readOnly) return;
    
    const selectedValue = option.value;
    const [pincode, areaId] = selectedValue.split("_");
    if (!pincode || !areaId) return;
    
    onChange("pinCode", pincode);
    setPincodeSearchValue(pincode);
    setShowPincodeDropdown(false);
    
    // Clear previous pending values and reset auto-selection flags
    setPendingTehsilId(null);
    setPendingAreaId(null);
    setAreaOptionsFromPincode([]);
    hasAutoSelectedTehsilRef.current = false;
    hasAutoSelectedAreaRef.current = false;
    // Don't clear lastSetTehsilValueRef - preserve it to maintain value through re-renders
    
    // Fetch full pincode data to get all fields
    getPincode(pincode).then((result) => {
      if (result.data?.success && result.data?.data) {
        const pincodeData = result.data.data;
        const dataArray = Array.isArray(pincodeData) ? pincodeData : [pincodeData];
        
        // Find the selected item by area_id
        const selectedItem = dataArray.find((item) => item.area_id.toString() === areaId);
        if (!selectedItem) return;
        
        // Clear any previous error
        setPincodeApiError("");
        
        // Create area options from all pincode results for this pincode (as fallback)
        const areas: SelectOption[] = dataArray.map((item) => ({
          value: item.area_id.toString(),
          label: item.area,
        }));
        setAreaOptionsFromPincode(areas);
        
        // Auto-fill all fields from selected pincode data
        if (selectedItem.state_id) {
          onChange("state", selectedItem.state_id.toString());
          setTimeout(() => {
            onBlur?.("state");
          }, 50);
        }
        
        if (selectedItem.district_id) {
          const districtId = selectedItem.district_id.toString();
          console.log("Setting city (district_id):", districtId);
          onChange("city", districtId);
          // Store tehsil_id and area_id to set after dependencies load
          if (selectedItem.tehsil_id) {
            const tehsilId = selectedItem.tehsil_id.toString();
            console.log("Storing pending tehsil_id:", tehsilId);
            setPendingTehsilId(tehsilId);
          }
          if (selectedItem.area_id) {
            const areaId = selectedItem.area_id.toString();
            console.log("Storing pending area_id:", areaId);
            setPendingAreaId(areaId);
          }
          // Reset auto-selection flags when new pincode is selected
          hasAutoSelectedTehsilRef.current = false;
          hasAutoSelectedAreaRef.current = false;
          setTimeout(() => {
            onBlur?.("city");
          }, 50);
        }
      }
    }).catch((error) => {
      console.error("Error fetching pincode data:", error);
    });
  };
  
  // Auto-select tehsil when tehsils API response is loaded and we have a pending tehsil_id
  useEffect(() => {
    // Only proceed if we have all required conditions
    if (
      pendingTehsilId && 
      tehsilsData?.data && 
      tehsilsData.data.length > 0 &&
      tehsilOptions.length > 0 && 
      !tehsilsLoading && 
      formData.city &&
      !hasAutoSelectedTehsilRef.current
    ) {
      console.log("🔍 Checking for tehsil match. pendingTehsilId:", pendingTehsilId, "Total tehsils:", tehsilsData.data.length);
      console.log("Current formData.tehsil:", formData.tehsil);
      
      // First, try to find in raw data to verify it exists
      const foundInRawData = tehsilsData.data.find(t => String(t.id) === String(pendingTehsilId));
      if (foundInRawData) {
        console.log("✅ Found in raw data:", foundInRawData);
      } else {
        console.warn("❌ Not found in raw data. Searching in first 10:", tehsilsData.data.slice(0, 10).map(t => ({ id: t.id, name: t.name })));
      }
      
      // Find the tehsil option that matches the pending tehsil_id from pincode response
      // Compare as strings to ensure exact match (both are converted to strings in options)
      const matchingTehsil = tehsilOptions.find(opt => {
        // Ensure both are compared as strings
        const optValue = String(opt.value);
        const pendingValue = String(pendingTehsilId);
        const matches = optValue === pendingValue;
        return matches;
      });
      
      if (matchingTehsil) {
        console.log("✅ Found matching tehsil option:", matchingTehsil.label, "ID:", matchingTehsil.value);
        
        // Double-check the current value to avoid unnecessary updates
        if (formData.tehsil !== matchingTehsil.value) {
          // Mark that we're auto-selecting to prevent re-triggering
          hasAutoSelectedTehsilRef.current = true;
          console.log("🔄 Auto-selecting tehsil:", matchingTehsil.value, "Name:", matchingTehsil.label);
          
          // Auto-select the matching tehsil - use exact value from option
          // This ensures the value matches exactly what's in the options
          onChange("tehsil", matchingTehsil.value);
          lastSetTehsilValueRef.current = matchingTehsil.value; // Track the successfully set value
          
          // Call onBlur after a delay to trigger validation
          // Note: formData.tehsil prop updates in next render cycle, so we don't check it here
          setTimeout(() => {
            onBlur?.("tehsil");
          }, 300);
        } else {
          // Already selected, just mark as done
          console.log("✅ Tehsil already selected:", matchingTehsil.value);
          hasAutoSelectedTehsilRef.current = true;
        }
      } else {
        console.warn("❌ No matching tehsil found in options. pendingTehsilId:", pendingTehsilId);
        console.log("First 10 tehsil option values:", tehsilOptions.slice(0, 10).map(opt => ({ value: opt.value, label: opt.label })));
        // Try direct match with raw data as fallback
        if (foundInRawData) {
          console.log("⚠️ Found in raw data but not in options. Attempting direct selection...");
          hasAutoSelectedTehsilRef.current = true;
          onChange("tehsil", String(foundInRawData.id));
          setTimeout(() => {
            onBlur?.("tehsil");
          }, 200);
        }
      }
    } else if (pendingTehsilId && !hasAutoSelectedTehsilRef.current) {
      // Log why we're not proceeding
      console.log("⏳ Waiting for tehsils to load...", {
        hasPendingTehsilId: !!pendingTehsilId,
        hasTehsilsData: !!tehsilsData?.data,
        tehsilsDataLength: tehsilsData?.data?.length || 0,
        tehsilOptionsLength: tehsilOptions.length,
        tehsilsLoading,
        hasCity: !!formData.city,
        hasAutoSelected: hasAutoSelectedTehsilRef.current
      });
    }
  }, [tehsilsData, tehsilOptions, pendingTehsilId, tehsilsLoading, formData.city, formData.tehsil, onChange, onBlur]);
  
  // Additional effect to catch when tehsilsData loads - direct match from raw data
  useEffect(() => {
    if (
      pendingTehsilId && 
      tehsilsData?.data && 
      Array.isArray(tehsilsData.data) &&
      tehsilsData.data.length > 0 &&
      !tehsilsLoading && 
      formData.city &&
      !hasAutoSelectedTehsilRef.current
    ) {
      console.log("🔍 Direct tehsilsData effect triggered. pendingTehsilId:", pendingTehsilId, "city:", formData.city);
      // Find directly in raw data
      const matchingTehsil = tehsilsData.data.find(t => {
        const tehsilId = String(t.id);
        const pendingId = String(pendingTehsilId);
        const matches = tehsilId === pendingId;
        if (matches) {
          console.log("✅ Direct match found in tehsilsData:", t);
        }
        return matches;
      });
      
      if (matchingTehsil) {
        const tehsilIdStr = String(matchingTehsil.id);
        console.log("🎯 Direct effect - Current formData.tehsil:", formData.tehsil, "Setting to:", tehsilIdStr);
        
        if (formData.tehsil !== tehsilIdStr) {
          console.log("🔄 Direct auto-selecting tehsil from raw data:", tehsilIdStr, matchingTehsil.name);
          hasAutoSelectedTehsilRef.current = true;
          
          // Call onChange with the tehsil ID - use exact string value
          onChange("tehsil", tehsilIdStr);
          lastSetTehsilValueRef.current = tehsilIdStr; // Track the successfully set value
          
          // Call onBlur after a delay to trigger validation
          // Note: formData.tehsil prop updates in next render cycle (Formik state update timing)
          setTimeout(() => {
            onBlur?.("tehsil");
          }, 300);
        } else {
          console.log("✅ Tehsil already set to:", tehsilIdStr);
          hasAutoSelectedTehsilRef.current = true;
        }
      } else {
        console.warn("❌ No match in tehsilsData. pendingTehsilId:", pendingTehsilId);
        console.log("Sample tehsil IDs from data (first 10):", tehsilsData.data.slice(0, 10).map(t => ({ id: t.id, name: t.name })));
        console.log("All tehsil IDs:", tehsilsData.data.map(t => t.id));
        // Even if not found, preserve the value if it matches pendingTehsilId
        // It might be filtered by pincode but should still be shown
        if (formData.tehsil && String(formData.tehsil) === String(pendingTehsilId)) {
          console.log("⚠️ Tehsil not in API response but matches pending - preserving value");
          // Value is already set, just mark as auto-selected
          hasAutoSelectedTehsilRef.current = true;
        }
      }
    }
  }, [tehsilsData, pendingTehsilId, tehsilsLoading, formData.city, formData.tehsil, onChange, onBlur]);
  
  // Preserve tehsil value during API refetches if it matches pendingTehsilId
  useEffect(() => {
    if (
      pendingTehsilId && 
      formData.city &&
      formData.tehsil &&
      String(formData.tehsil) === String(pendingTehsilId) &&
      tehsilsLoading
    ) {
      // During refetch, preserve the value - don't let it get cleared
      // The value will be validated once options load
    }
  }, [pendingTehsilId, formData.city, formData.tehsil, tehsilsLoading]);
  
  // Auto-select area when areas API response is loaded and we have a pending area_id
  useEffect(() => {
    // Ensure tehsil is set if we have pendingTehsilId (even if not in options yet)
    if (pendingTehsilId && !formData.tehsil && formData.city) {
      onChange("tehsil", String(pendingTehsilId));
      hasAutoSelectedTehsilRef.current = true;
    }
    
    if (
      pendingAreaId && 
      areaOptionsFromAPI.length > 0 && 
      !areasLoading && 
      formData.tehsil &&
      !hasAutoSelectedAreaRef.current
    ) {
      // Find the area option that matches the pending area_id from pincode response
      // Compare as strings to ensure exact match (both are converted to strings in options)
      const matchingArea = areaOptionsFromAPI.find(opt => {
        // Ensure both are compared as strings
        return String(opt.value) === String(pendingAreaId);
      });
      
      if (matchingArea) {
        // Double-check the current value to avoid unnecessary updates
        if (formData.area !== pendingAreaId) {
          // Mark that we're auto-selecting to prevent re-triggering
          hasAutoSelectedAreaRef.current = true;
          // Auto-select the matching area from API response
          onChange("area", pendingAreaId);
          setTimeout(() => {
            onBlur?.("area");
          }, 100);
          // Clear pending values after successful selection
          setPendingTehsilId(null);
          setPendingAreaId(null);
        } else {
          // Already selected, just mark as done and clear pending values
          hasAutoSelectedAreaRef.current = true;
          setPendingTehsilId(null);
          setPendingAreaId(null);
        }
      }
    }
  }, [areaOptionsFromAPI, pendingAreaId, pendingTehsilId, areasLoading, formData.tehsil, formData.city, formData.area, onChange, onBlur]);
  
  // Fallback: Auto-select area from pincode options if API hasn't loaded yet
  // Also ensure tehsil is set if we have pendingTehsilId
  useEffect(() => {
    if (
      pendingAreaId && 
      areaOptionsFromPincode.length > 0 && 
      areaOptionsFromAPI.length === 0 && 
      formData.city && // Only require city, not tehsil (tehsil might not be in options yet)
      !hasAutoSelectedAreaRef.current
    ) {
      // First, ensure tehsil is set if we have pendingTehsilId
      if (pendingTehsilId && !formData.tehsil) {
        // Set tehsil even if it's not in options yet - it will show once options load
        onChange("tehsil", String(pendingTehsilId));
        hasAutoSelectedTehsilRef.current = true;
      }
      
      // Find the area option that matches the pending area_id from pincode response
      // Compare as strings to ensure exact match
      const matchingArea = areaOptionsFromPincode.find(opt => {
        return String(opt.value) === String(pendingAreaId);
      });
      
      if (matchingArea) {
        // Double-check the current value to avoid unnecessary updates
        if (formData.area !== pendingAreaId) {
          // Mark that we're auto-selecting to prevent re-triggering
          hasAutoSelectedAreaRef.current = true;
          // Auto-select the matching area from pincode options as fallback
          onChange("area", pendingAreaId);
          setTimeout(() => {
            onBlur?.("area");
          }, 100);
          // Don't clear pending values yet - wait for tehsil to be confirmed in options
        } else {
          // Already selected, just mark as done
          hasAutoSelectedAreaRef.current = true;
        }
      }
    }
  }, [areaOptionsFromPincode, areaOptionsFromAPI, pendingAreaId, pendingTehsilId, formData.city, formData.tehsil, formData.area, onChange, onBlur]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pincodeDropdownRef.current && !pincodeDropdownRef.current.contains(event.target as Node)) {
        setShowPincodeDropdown(false);
      }
    };
    
    if (showPincodeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPincodeDropdown]);
  
  // Update pincode search when formData.pinCode changes (from external source) — India only
  useEffect(() => {
    if (!isIndiaSelected) return;
    if (formData.pinCode !== pincodeSearchValue) {
      const digitsOnly = formData.pinCode.replace(/\D/g, "").slice(0, 6);
      if (digitsOnly !== pincodeSearchValue) {
        setPincodeSearchValue(digitsOnly);
      }
    }
  }, [formData.pinCode, isIndiaSelected, pincodeSearchValue]);

  const handleCountryChange = (value: string | string[], selection?: any) => {
    if (readOnly) return;
    if (value === null || value === undefined) return;

    const countryValue = Array.isArray(value) ? value[0] : value;
    if (countryValue && typeof countryValue === "string") {
      onChange("country", countryValue);
      // Always clear pincode, state, city, tehsil, and area when country changes
      onChange("pinCode", "");
      onChange("state", ""); // Reset state when country changes
      onChange("city", ""); // Reset city when country changes
      onChange("tehsil", ""); // Reset tehsil when country changes
      onChange("area", ""); // Reset area when country changes
      // When switching to India: clear non-India address fields
      if (countryValue === "6") {
        onChange("addressLine1", "");
        onChange("addressLine2", "");
      } else {
        // When switching to non-India: clear India-only address field
        onChange("address", "");
      }
      
      // Clear pincode API error and options when country changes
      setPincodeApiError("");
      setPincodeOptions([]);
      setPincodeSearchValue("");
      setAreaOptionsFromPincode([]);
      setPendingTehsilId(null);
      setPendingAreaId(null);
      hasAutoSelectedTehsilRef.current = false;
      hasAutoSelectedAreaRef.current = false;
      lastSetTehsilValueRef.current = null; // Clear tracked value when country changes
      
      // If a value is selected, immediately mark as touched and validate
      if (countryValue) {
        setTimeout(() => {
          onBlur?.("country");
        }, 0);
      }
    }
  };

  const handleStateChange = (value: string | string[]) => {
    if (readOnly) return;
    const stateValue = Array.isArray(value) ? value[0] : value;
    onChange("state", stateValue);
    onChange("city", ""); // Reset city when state changes
    onChange("tehsil", ""); // Reset tehsil when state changes
    onChange("area", ""); // Reset area when state changes
    setAreaOptionsFromPincode([]);
    setPendingTehsilId(null);
    setPendingAreaId(null);
    hasAutoSelectedTehsilRef.current = false;
    hasAutoSelectedAreaRef.current = false;
    lastSetTehsilValueRef.current = null; // Clear tracked value when state changes
    
    // If a value is selected, immediately mark as touched and validate
    if (stateValue) {
      setTimeout(() => {
        onBlur?.("state");
      }, 0);
    }
  };

  const handleCityChange = (value: string | string[]) => {
    if (readOnly) return;
    const cityValue = Array.isArray(value) ? value[0] : value;
    onChange("city", cityValue);
    onChange("tehsil", ""); // Reset tehsil when city changes
    onChange("area", ""); // Reset area when city changes
    // Don't clear areaOptionsFromPincode here - keep them if from pincode selection
    // But clear pending values if city changes manually
    if (!pendingTehsilId && !pendingAreaId) {
      setAreaOptionsFromPincode([]);
      hasAutoSelectedTehsilRef.current = false;
      hasAutoSelectedAreaRef.current = false;
      lastSetTehsilValueRef.current = null; // Clear tracked value when city changes manually
    }
    
    // If a value is selected, immediately mark as touched and validate
    if (cityValue) {
      setTimeout(() => {
        onBlur?.("city");
      }, 0);
    }
  };
  
  const handleTehsilChange = (value: string | string[], selection?: SelectOption | SelectOption[] | null) => {
    if (readOnly) return;
    const tehsilValue = Array.isArray(value) ? value[0] : value;
    
    // Only reset area if this is a manual change (not from auto-selection)
    // Check if the value matches pendingTehsilId to determine if it's auto-selection
    if (tehsilValue && tehsilValue !== pendingTehsilId) {
      // Manual change - reset area
      onChange("area", "");
      if (!pendingAreaId) {
        setAreaOptionsFromPincode([]);
        setPendingAreaId(null);
        hasAutoSelectedAreaRef.current = false;
      }
    }
    
      // Always update tehsil value
      console.log("handleTehsilChange called with value:", tehsilValue);
      onChange("tehsil", tehsilValue || "");
      // Track the value when manually changed
      if (tehsilValue) {
        lastSetTehsilValueRef.current = tehsilValue;
      }
    
    // If a value is selected, immediately mark as touched and validate
    if (tehsilValue) {
      setTimeout(() => {
        onBlur?.("tehsil");
      }, 0);
    }
  };
  
  const handleAreaChange = (value: string | string[]) => {
    if (readOnly) return;
    const areaValue = Array.isArray(value) ? value[0] : value;
    if (areaValue) {
      lastSetAreaValueRef.current = areaValue;
    }
    onChange("area", areaValue);
    
    // If a value is selected, immediately mark as touched and validate
    if (areaValue) {
      setTimeout(() => {
        onBlur?.("area");
      }, 0);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    // Allow only alphanumeric characters, spaces, and common address characters (comma, period, dash, slash)
    // Block special characters like $, %, &, *, #, etc.
    let value = e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/]/g, "");
    // Ensure first character is uppercase if present
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    value = value.slice(0, 100);
    onChange("address", value);
  };

  // ZIP/Postal Code for non-India: alphanumeric only, min 4 max 10
  const handleZipPostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    onChange("pinCode", value);
  };

  const handleAddressLine1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    let value = e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/]/g, "");
    // Ensure first character is uppercase if present
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    value = value.slice(0, 100);
    onChange("addressLine1", value);
  };

  const handleAddressLine2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const value = e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/]/g, "").slice(0, 100);
    onChange("addressLine2", value);
  };

  /** Non-India: free-text state — same input rules as Patient Name * on registration/hospital */
  const handleNonIndiaStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    onChange("state", sanitizePatientNameStyleInput(e.target.value));
  };

  /** Non-India: free-text city — same input rules as Patient Name * on registration/hospital */
  const handleNonIndiaCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    onChange("city", sanitizePatientNameStyleInput(e.target.value));
  };

  return (
    <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center">
        {iconSrc && <Image src={iconSrc} alt={iconAlt} width={20} height={20} />}
        {title}
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Company Name - Only show when showCompanyName is true (for Other Visitor Official type) */}
        {showCompanyName && (
          <div
            ref={fieldRefs?.companyName}
            data-field={df("companyName")}
            className="scroll-mt-4"
          >
            <FormInputField
              label="Company Name"
              value={formData.companyName || ""}
              onChange={(e) => {
                if (readOnly) return;
                // Only allow letters, spaces, and "&" – no numbers or other special characters
                let value = e.target.value.replace(/[^a-zA-Z\s&]/g, "");
                // Ensure first character is uppercase if present
                if (value.length > 0) {
                  value = value.charAt(0).toUpperCase() + value.slice(1);
                }
                value = value.slice(0, 100);
                onChange("companyName", value);
              }}
              onBlur={() => onBlur?.("companyName")}
              placeholder="Company Name"
              error={errors?.companyName}
              maxLength={100}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </div>
        )}

        <div
          ref={fieldRefs?.country}
          data-field={df("country")}
          className="scroll-mt-4"
        >
          <FormSelectField
            label="Country *"
            options={countryOptions}
            placeholder={countriesLoading ? "Loading..." : "Select"}
            background="white"
            value={formData.country || null}
            onChange={handleCountryChange}
            onBlur={() => onBlur?.("country")}
            disabled={countriesLoading || readOnly}
          />
          {errors?.country && (
            <p className="mt-1 text-xs text-[#F6776E]">{errors.country}</p>
          )}
        </div>

        {/* Show Pin Code only when India (countryId: 6) is selected */}
        {isIndiaSelected && (
          <div
            ref={fieldRefs?.pinCode}
            data-field={df("pinCode")}
            className="scroll-mt-4"
          >
            <div className="relative" ref={pincodeDropdownRef}>
              <FormInputField
                label="Pin Code *"
                value={pincodeSearchValue}
                className="!pr-12"
                onChange={(e) => {
                  let digitsOnly = e.target.value.replace(/\D/g, "");
                  // Disallow leading zeros – remove them while allowing zeros after first non-zero digit
                  digitsOnly = digitsOnly.replace(/^0+/, "");
                  digitsOnly = digitsOnly.slice(0, 6);
                  setPincodeSearchValue(digitsOnly);
                  onChange("pinCode", digitsOnly);
                  if (digitsOnly.length >= 3) {
                    setShowPincodeDropdown(true);
                  }
                }}
                onFocus={() => {
                  if (pincodeOptions.length > 0) {
                    setShowPincodeDropdown(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on dropdown option
                  setTimeout(() => {
                    setShowPincodeDropdown(false);
                    onBlur?.("pinCode");
                  }, 200);
                }}
                placeholder="Type pincode to search (min 3 digits)"
                readOnly={readOnly}
                disabled={readOnly}
                required
                maxLength={6}
                type="tel"
                error={pincodeApiError || errors?.pinCode}
              />
              {isPincodeLoading && (
                <div className="absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
                  <svg
                    className="h-5 w-5 animate-spin text-[#0B8C00]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
              {showPincodeDropdown && pincodeOptions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-[#D0D5DD] bg-white shadow-lg max-h-60 overflow-auto">
                  {/* Show more option at the top */}
                  <div
                    className="cursor-pointer px-4 py-2 border-b border-[#E3EEE1] hover:bg-[#F9FAFB]"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent onBlur from firing
                      handleShowMoreClick();
                    }}
                  >
                    <div className="text-sm font-medium text-green-600">Show more</div>
                  </div>
                  {pincodeOptions.map((option) => (
                    <div
                      key={option.value}
                      className="cursor-pointer px-4 py-2 hover:bg-[#F9FAFB] border-b border-[#E3EEE1] last:border-b-0"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent onBlur from firing
                        handlePincodeOptionSelect(option);
                      }}
                    >
                      <div className="text-sm font-medium text-[#262D3B]">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-[#7B8089]">{option.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show ZIP/Postal Code when non-India (Foreigner/Nepal or country not India): plain input, alphanumeric, 4-10 chars, value sent as pinCode in API */}
        {!isIndiaSelected && (
          <div
            ref={fieldRefs?.pinCode}
            data-field={df("pinCode")}
            className="scroll-mt-4"
          >
            <FormInputField
              label="ZIP/Postal Code *"
              value={formData.pinCode}
              onChange={handleZipPostalCodeChange}
              onBlur={() => onBlur?.("pinCode")}
              placeholder="Enter ZIP/Postal Code (4-10 characters)"
              readOnly={readOnly}
              disabled={readOnly}
              required
              maxLength={10}
              error={errors?.pinCode}
            />
          </div>
        )}

        <div
          ref={fieldRefs?.state}
          data-field={df("state")}
          className="scroll-mt-4"
        >
          {isIndiaSelected ? (
            <>
              <FormSelectField
                label="State *"
                options={stateOptions}
                placeholder={
                  !formData.country
                    ? "Select Country First"
                    : statesLoading
                      ? "Loading..."
                      : "Select"
                }
                background="white"
                value={formData.state}
                onChange={handleStateChange}
                onBlur={() => onBlur?.("state")}
                disabled={statesLoading || !formData.country || readOnly}
              />
              {errors?.state && (
                <p className="mt-1 text-xs text-[#F6776E]">{errors.state}</p>
              )}
            </>
          ) : (
            <FormInputField
              label="State *"
              value={formData.state || ""}
              onChange={handleNonIndiaStateChange}
              onBlur={(e) => {
                if (readOnly) return;
                const trimmed = e.target.value.trim();
                if (trimmed !== e.target.value) {
                  onChange("state", trimmed);
                }
                onBlur?.("state");
              }}
              placeholder="Enter state / province / region"
              type="text"
              readOnly={readOnly}
              disabled={readOnly || !formData.country}
              required
              maxLength={100}
              error={errors?.state}
            />
          )}
        </div>

        <div
          ref={fieldRefs?.city}
          data-field={df("city")}
          className="scroll-mt-4"
        >
          {isIndiaSelected ? (
            <>
              <FormSelectField
                label="District *"
                options={cityOptions}
                placeholder={
                  !formData.state
                    ? "Select State First"
                    : citiesLoading
                      ? "Loading..."
                      : "Select"
                }
                background="white"
                value={formData.city}
                onChange={handleCityChange}
                onBlur={() => onBlur?.("city")}
                disabled={citiesLoading || !formData.state || readOnly}
              />
              {errors?.city && (
                <p className="mt-1 text-xs text-[#F6776E]">{errors.city}</p>
              )}
            </>
          ) : (
            <FormInputField
              label="City *"
              value={formData.city || ""}
              onChange={handleNonIndiaCityChange}
              onBlur={(e) => {
                if (readOnly) return;
                const trimmed = e.target.value.trim();
                if (trimmed !== e.target.value) {
                  onChange("city", trimmed);
                }
                onBlur?.("city");
              }}
              placeholder="Enter city"
              type="text"
              readOnly={readOnly}
              disabled={readOnly || !formData.country}
              required
              maxLength={100}
              error={errors?.city}
            />
          )}
        </div>
        
        {/* Show Tehsil only when India (countryId: 6) is selected */}
        {isIndiaSelected && (
          <div
            ref={fieldRefs?.tehsil}
            data-field={df("tehsil")}
            className="scroll-mt-4"
          >
            <FormSelectField
              label="Tehsil/Area *"
              options={tehsilOptions}
              placeholder={
                !formData.city
                  ? "Select District First"
                  : tehsilsLoading
                    ? "Loading..."
                    : tehsilOptions.length === 0
                      ? "No Tehsil Available"
                      : "Select"
              }
              background="white"
              value={(() => {
                // Track the current tehsil value if it's set
                if (formData.tehsil) {
                  lastSetTehsilValueRef.current = formData.tehsil;
                }
                
                // If we have a pending tehsil ID from pincode, preserve it even if options haven't loaded
                if (pendingTehsilId && formData.tehsil && String(formData.tehsil) === String(pendingTehsilId)) {
                  return formData.tehsil;
                }
                
                // Ensure value matches one of the options, but only if options have loaded
                if (formData.tehsil) {
                  // If options are still loading, keep the value (it might appear when loaded)
                  if (tehsilsLoading) {
                    return formData.tehsil;
                  }
                  
                  // If options have loaded, check if value exists
                  if (tehsilOptions.length > 0) {
                    const optionExists = tehsilOptions.some(opt => String(opt.value) === String(formData.tehsil));
                    if (optionExists) {
                      return formData.tehsil;
                    } else {
                      // Value doesn't exist in options - but check if we have pending selection or last set value
                      if (pendingTehsilId && String(formData.tehsil) === String(pendingTehsilId)) {
                        // Keep the value if it matches pending - it might be filtered but should still show
                        return formData.tehsil;
                      }
                      // Also preserve if it matches the last successfully set value (from pincode selection)
                      if (lastSetTehsilValueRef.current && String(formData.tehsil) === String(lastSetTehsilValueRef.current)) {
                        // Value was previously set successfully - preserve it even if not in current options
                        // This handles cases where options are filtered or refetched
                        return formData.tehsil;
                      }
                      console.warn("⚠️ Tehsil value", formData.tehsil, "not found in options");
                      // Only return null if we're sure options have loaded and value doesn't exist
                      return null;
                    }
                  } else if (!tehsilsLoading && tehsilOptions.length === 0) {
                    // Options loaded but empty - keep value if it matches pending or last set value
                    if (pendingTehsilId && String(formData.tehsil) === String(pendingTehsilId)) {
                      return formData.tehsil;
                    }
                    if (lastSetTehsilValueRef.current && String(formData.tehsil) === String(lastSetTehsilValueRef.current)) {
                      return formData.tehsil;
                    }
                    return null;
                  }
                  
                  // Options haven't loaded yet or are loading - preserve the value
                  return formData.tehsil;
                }
                return formData.tehsil || null;
              })()}
              onChange={handleTehsilChange}
              onBlur={() => onBlur?.("tehsil")}
              disabled={tehsilsLoading || !formData.city || readOnly}
            />
            {errors?.tehsil && (
              <p className="mt-1 text-xs text-[#F6776E]">{errors.tehsil}</p>
            )}
          </div>
        )}
        
        {/* Show Area only when India (countryId: 6) is selected */}
        {isIndiaSelected && (
          <div
            ref={fieldRefs?.area}
            data-field={df("area")}
            className="scroll-mt-4"
          >
            <FormSelectField
              label="Post Office *"
              options={areaOptions}
              placeholder={
                !formData.tehsil
                  ? "Select Tehsil/Area First"
                  : areasLoading
                    ? "Loading..."
                    : areaOptions.length === 0
                      ? "No Area Available"
                      : "Select"
              }
              background="white"
              value={(() => {
                if (formData.area) {
                  lastSetAreaValueRef.current = formData.area;
                }
                if (formData.area && pendingAreaId && String(formData.area) === String(pendingAreaId)) {
                  return formData.area;
                }
                if (formData.area && areasLoading) {
                  return formData.area;
                }
                if (formData.area && areaOptions.length > 0) {
                  const optionExists = areaOptions.some(
                    (opt) => String(opt.value) === String(formData.area)
                  );
                  if (optionExists) {
                    return formData.area;
                  }
                  if (
                    pendingAreaId &&
                    String(formData.area) === String(pendingAreaId)
                  ) {
                    return formData.area;
                  }
                  if (
                    lastSetAreaValueRef.current &&
                    String(formData.area) === String(lastSetAreaValueRef.current)
                  ) {
                    return formData.area;
                  }
                  return formData.area;
                }
                if (formData.area && !areasLoading && areaOptions.length === 0) {
                  if (pendingAreaId && String(formData.area) === String(pendingAreaId)) {
                    return formData.area;
                  }
                  if (
                    lastSetAreaValueRef.current &&
                    String(formData.area) === String(lastSetAreaValueRef.current)
                  ) {
                    return formData.area;
                  }
                  return formData.area;
                }
                return formData.area || null;
              })()}
              onChange={handleAreaChange}
              onBlur={() => onBlur?.("area")}
              disabled={
                readOnly ||
                areasLoading ||
                !formData.tehsil ||
                (areaOptions.length === 0 && !String(formData.area || "").trim())
              }
            />
            {errors?.area && (
              <p className="mt-1 text-xs text-[#F6776E]">{errors.area}</p>
            )}
          </div>
        )}
        {/* Address * - only for India */}
        {isIndiaSelected && (
          <div className={
            showCompanyName 
              ? "" 
              : "md:col-span-2 lg:col-span-3"
          }>
            <div data-field={df("address")} className="scroll-mt-4">
              <FormInputField
                ref={fieldRefs?.address}
                label="Address *"
                value={formData.address}
                onChange={handleAddressChange}
                onBlur={() => onBlur?.("address")}
                placeholder="Address"
                required
                maxLength={100}
                error={errors?.address}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {/* For non-India: Address Line 1 * and Address Line 2 (optional) in same row - 2nd row positions 2 and 3 */}
        {!isIndiaSelected && (
          <>
            <div data-field={df("addressLine1")} className="scroll-mt-4">
              <FormInputField
                ref={fieldRefs?.addressLine1}
                label="Address Line 1 *"
                value={formData.addressLine1 || ""}
                onChange={handleAddressLine1Change}
                onBlur={() => onBlur?.("addressLine1")}
                placeholder="House/Building Number, Street Name"
                required
                maxLength={100}
                error={errors?.addressLine1}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
            <div data-field={df("addressLine2")} className="scroll-mt-4">
              <FormInputField
                ref={fieldRefs?.addressLine2}
                label="Address Line 2 "
                value={formData.addressLine2 || ""}
                onChange={handleAddressLine2Change}
                onBlur={() => onBlur?.("addressLine2")}
                placeholder="Apartment / Unit"
                maxLength={100}
                error={errors?.addressLine2}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
          </>
        )}
      </div>
      
      {/* Pincode Selection Dialog */}
      <PincodeSelectionDialog
        open={showPincodeDialog}
        onClose={() => setShowPincodeDialog(false)}
        pincodeData={pincodeDialogData}
        searchQuery={pincodeSearchValue}
        onSelect={handleDialogSelect}
      />
    </div>
  );
}

