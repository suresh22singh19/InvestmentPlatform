import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export interface MedicineItem {
  id: number;
  jatayuCd: string;
  branchId: number;
  name: string;
  category: string;
  quantity: number;
  remainingQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LookupItem {
  key: string;
  value: string;
}

interface MedicineState {
  medicines: MedicineItem[];
  hasLoaded: boolean;
  dosage: LookupItem[];
  frequency: LookupItem[];
  duration: LookupItem[];
  timing: LookupItem[];
}

const initialState: MedicineState = {
  medicines: [],
  hasLoaded: false,
  dosage: [
    { key: "HALF_TABLET", value: "½ Tablet" },
    { key: "ONE_TABLET", value: "1 Tablet" },
    { key: "ONE_HALF_TABLET", value: "1½ Tablet" },
    { key: "TWO_TABLETS", value: "2 Tablets" },
    { key: "THREE_TABLETS", value: "3 Tablets" },

    { key: "ONE_CAPSULE", value: "1 Capsule" },
    { key: "TWO_CAPSULES", value: "2 Capsules" },

    // { key: "TWO_POINT_FIVE_ML", value: "2.5 ml" },
    { key: "FIVE_ML", value: "5 ml" },
    // { key: "SEVEN_POINT_FIVE_ML", value: "7.5 ml" },
    { key: "TEN_ML", value: "10 ml" },
    // { key: "FIFTEEN_ML", value: "15 ml" },
    // { key: "TWENTY_ML", value: "20 ml" },
    // { key: "THIRTY_ML", value: "30 ml" },

    { key: "ONE_DROP", value: "1 Drop" },
    { key: "TWO_DROPS", value: "2 Drops" },
    // { key: "THREE_DROPS", value: "3 Drops" },
    // { key: "FOUR_DROPS", value: "4 Drops" },
    { key: "FIVE_DROPS", value: "5 Drops" },
    { key: "TEN_DROPS", value: "10 Drops" },

    { key: "QUARTER_SPOON", value: "¼ Spoon" },
    { key: "HALF_SPOON", value: "½ Spoon" },
    { key: "ONE_SPOON", value: "1 Spoon" },
    { key: "TWO_SPOONS", value: "2 Spoons" },
    // { key: "FIVE_GM", value: "5 gm" },
    // { key: "TEN_GM", value: "10 gm" },

    // { key: "APPLY_THIN_LAYER", value: "Apply Thin Layer" },
    // { key: "APPLY_MODERATE_LAYER", value: "Apply Moderate Layer" },
    // { key: "APPLY_THICK_LAYER", value: "Apply Thick Layer" },
    // { key: "APPLY_AFFECTED_AREA", value: "Apply on Affected Area" },

    // { key: "ZERO_POINT_FIVE_ML", value: "0.5 ml" },
    // { key: "ONE_ML", value: "1 ml" },
    // { key: "TWO_ML", value: "2 ml" },
    // { key: "FIVE_ML_INJECTION", value: "5 ml" },
    // { key: "TEN_ML_INJECTION", value: "10 ml" },
    // { key: "TWENTY_IU", value: "20 IU" },
    // { key: "FORTY_IU", value: "40 IU" },
    // { key: "ONE_VIAL", value: "1 Vial" },
    // { key: "ONE_AMPOULE", value: "1 Ampoule" },

    // { key: "ONE_PUFF", value: "1 Puff" },
    // { key: "TWO_PUFFS", value: "2 Puffs" },
    // { key: "THREE_PUFFS", value: "3 Puffs" }
  ],
  frequency: [
    { key: "OD", value: "Once Daily (OD)" },
    { key: "BD", value: "Twice Daily (BD)" },
    { key: "TDS", value: "Three Times Daily (TDS)" },
    { key: "QID", value: "Four Times Daily (QID)" },

    // { key: "EVERY_MORNING", value: "Every Morning" },
    // { key: "EVERY_EVENING", value: "Every Evening" },
    // { key: "EVERY_NIGHT", value: "Every Night" },

    // { key: "EVERY_4_HOURS", value: "Every 4 Hours" },
    // { key: "EVERY_6_HOURS", value: "Every 6 Hours" },
    // { key: "EVERY_8_HOURS", value: "Every 8 Hours" },
    // { key: "EVERY_12_HOURS", value: "Every 12 Hours" },
    // { key: "EVERY_24_HOURS", value: "Every 24 Hours" },

    // { key: "ONCE_WEEKLY", value: "Once Weekly" },
    // { key: "TWICE_WEEKLY", value: "Twice Weekly" },
    // { key: "ALTERNATE_DAYS", value: "Alternate Days" },

    // { key: "ONCE_MONTHLY", value: "Once Monthly" },

    // { key: "SOS", value: "SOS" },
    // { key: "PRN", value: "PRN (As Needed)" },

    // { key: "BEFORE_SURGERY", value: "Before Surgery" },
    // { key: "BEFORE_DIALYSIS", value: "Before Dialysis" },
    // { key: "BEFORE_CHEMOTHERAPY", value: "Before Chemotherapy" }
  ],
  duration: [
    { key: "ONE_DAY", value: "1 Day" },
    { key: "TWO_DAYS", value: "2 Days" },
    { key: "THREE_DAYS", value: "3 Days" },
    { key: "FIVE_DAYS", value: "5 Days" },
    { key: "SEVEN_DAYS", value: "7 Days" },
    { key: "TEN_DAYS", value: "10 Days" },
    { key: "FOURTEEN_DAYS", value: "14 Days" },
    { key: "FIFTEEN_DAYS", value: "15 Days" },
    { key: "TWENTY_ONE_DAYS", value: "21 Days" },
    { key: "THIRTY_DAYS", value: "30 Days" },
    { key: "FORTY_FIVE_DAYS", value: "45 Days" },
    { key: "SIXTY_DAYS", value: "60 Days" },
    { key: "NINETY_DAYS", value: "90 Days" },

    { key: "ONE_WEEK", value: "1 Week" },
    { key: "TWO_WEEKS", value: "2 Weeks" },
    { key: "THREE_WEEKS", value: "3 Weeks" },
    { key: "FOUR_WEEKS", value: "4 Weeks" },

    { key: "ONE_MONTH", value: "1 Month" },
    { key: "TWO_MONTHS", value: "2 Months" },
    { key: "THREE_MONTHS", value: "3 Months" },
    { key: "SIX_MONTHS", value: "6 Months" },
    { key: "ONE_YEAR", value: "1 Year" },

    // { key: "CONTINUE", value: "Continue" },
    // { key: "UNTIL_FINISHED", value: "Until Finished" },
    // { key: "LIFELONG", value: "Lifelong" },
    // { "key": "UNTIL_FOLLOWUP", "value": "Until Follow-up" },
    // { key: "STOP_IF_IMPROVED", value: "Stop if Symptoms Improve" }
  ],
  timing: [
    // { key: "BEFORE_BREAKFAST", value: "Before Breakfast" },
    // { key: "AFTER_BREAKFAST", value: "After Breakfast" },
    // { key: "BEFORE_LUNCH", value: "Before Lunch" },
    // { key: "AFTER_LUNCH", value: "After Lunch" },
    // { key: "BEFORE_DINNER", value: "Before Dinner" },
    // { key: "AFTER_DINNER", value: "After Dinner" },

    // { key: "EMPTY_STOMACH", value: "Empty Stomach" },
    // { key: "EARLY_MORNING_EMPTY_STOMACH", value: "Early Morning Empty Stomach" },

    // { key: "AT_BEDTIME", value: "At Bedtime" },
    // { key: "BEFORE_SLEEP", value: "Before Sleep" },

    { key: "BEFORE_FOOD", value: "Before Food" },
    { key: "AFTER_FOOD", value: "After Food" },
    // { key: "WITH_FOOD", value: "With Food" },
    // { key: "WITH_MILK", value: "With Milk" },
    // { key: "WITH_WATER", value: "With Water" },

    // { key: "MORNING", value: "Morning" },
    // { key: "AFTERNOON", value: "Afternoon" },
    // { key: "EVENING", value: "Evening" },
    // { key: "NIGHT", value: "Night" }
  ]
};

export const medicineSlice = createSlice({
  name: "medicine",
  initialState,
  reducers: {
    setMedicines: (state, action: PayloadAction<MedicineItem[]>) => {
      state.medicines = action.payload;
      state.hasLoaded = true;
    },
    clearMedicines: (state) => {
      state.medicines = [];
      state.hasLoaded = false;
    },
  },
});

export const { setMedicines, clearMedicines } = medicineSlice.actions;

export const selectMedicines = (state: RootState) => state.medicine.medicines;
export const selectMedicinesLoaded = (state: RootState) => state.medicine.hasLoaded;
export const selectDosageList = (state: RootState) => state.medicine.dosage;
export const selectFrequencyList = (state: RootState) => state.medicine.frequency;
export const selectDurationList = (state: RootState) => state.medicine.duration;
export const selectTimingList = (state: RootState) => state.medicine.timing;

export default medicineSlice.reducer;
