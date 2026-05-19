"use client";
import React, { useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";


const LOGO_SRC = "/images/jeenasikho_lifecare.jpeg";
const TITLE_SRC = "/images/shuddhi_logo.png";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BranchInfo {
    address: string;
    district: string;
    state: string;
    pin_code: string;
    phone_number: string;
    type: "clinic" | "hospital";
}
/** Flat patient row — matches `buildPatientFormDownloadProps` from the registration list. */
export interface PatientInfo {
    patient: string;
    parent_name: string;
    bp: string;
    sl: string;
    weight: string;
    height: string;
    uhid: string;
    opdId: string;
    age: string;
    gender: string;
    iaf_records: any[];
}
/** Optional API envelope for IAF demo payload (not passed from the list page). */
export interface PatientIafApiResponse {
    status: boolean;
    message: string;
    data: {
        patient: {
            uhid: string;
            patient: string;
            parent_name: string;
            gender: string;
            age: string;
        };
        iaf_records: {
            id: string;
            appointment_id: string;
            patient_id: string;
            doctor_id: string;
            uhid: string;
            branch_id: string;
            header: string;
            meta_value: string;
            fillup: string;
            added_by: string;
            created_at: string;
            updated_at: string;
        }[];
    };
}

export interface DoctorInfo {
    name: string;
    education: string[];
    reg_no: string;
}
export interface AppointmentInfo { created_at: string; }

/** Column values inside Balance / Treatment / Panchkarma IAF meta sections. */
type IafDynamicSection = Record<string, string | string[] | undefined>;
type IafDynamicSectionsMap = Record<string, IafDynamicSection>;

export type NewOPDPatientFormProps = {
    branch?: BranchInfo;
    patient?: PatientInfo;
    doctor?: DoctorInfo;
    appointment?: AppointmentInfo;
    diagnosis?: string;
    /** When false, hides the on-page download control (parent triggers via ref). Default true. */
    showDownloadButton?: boolean;
};

export type NewOPDPatientFormHandle = {
    downloadPdf: () => Promise<void>;
};

// ── Default branch (static header address on PDF) ─────────────────────────────
/** Shown in the form header until wired to live branch data. */
export const DEFAULT_STATIC_BRANCH_INFO: BranchInfo = {
    address: "RZ-6A, Syndicate Enclave Dabri Mod, Dwarka",
    district: "Delhi",
    state: "South West Delhi",
    pin_code: "110045",
    phone_number: "8860421234",
    type: "clinic",
};

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_BRANCH = DEFAULT_STATIC_BRANCH_INFO;

const DEMO_IAF_API: any = {
    status: true,
    message: "patient IAF details",
    data: {
        patient: {
            uhid: "JSDB26222026",
            patient: "Mr Ajinkya Rahane",
            parent_name: "Amit Rahane",
            gender: "Male",
            age: "42",
        },
        //  iaf_records: [],

        // iaf_records: [
        //   {
        //     id: "364289",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "0",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Nutritional_Assessment_Form",
        //     meta_value: {
        //       diet_history: {
        //         Date: ["2026-05-13"],
        //         "Diet-Detail": ["Roti + Sabzi + Dal + Chawal"],
        //       },
        //       Medical_History: {
        //         HTN: {
        //           remark: "",
        //           dropdown: "no",
        //         },
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "8",
        //     created_at: "2026-05-13 10:36:24",
        //     updated_at: "2026-05-13 10:36:24",
        //   },

        //   {
        //     id: "364290",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "General_Question",
        //     meta_value: {
        //       general: [
        //         {
        //           remark: "",
        //           dropdown: "Yes",
        //         },
        //       ],

        //       about_patient: {
        //         height: {
        //           feet: "5",
        //           inch: "10",
        //         },
        //         weight: "74",
        //         appetite: "2",
        //         food_habits:"",
        //         job_profile:"",
        //         daily_working_hours:""
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:37:12",
        //     updated_at: "2026-05-13 10:37:12",
        //   },

        //   {
        //     id: "364291",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Tongue_Pulse_Eyes_Nails",
        //     meta_value: {
        //       pulse: {
        //         Eyes: "-",
        //         Vaat: "-",
        //         Kapha: "-",
        //         Nails: "-",
        //         Pitta: "-",
        //         Red_dot_tongue :""
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:37:15",
        //     updated_at: "2026-05-13 10:37:15",
        //   },

        //   {
        //     id: "364292",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Patient_Full_History",
        //     meta_value: {
        //       Chief_Complaints: {
        //         Symptoms: ["Shortness of Breath due to lung cancer"],
        //         Days_Duration: ["2 years"],
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:38:28",
        //     updated_at: "2026-05-13 10:38:28",
        //   },

        //   {
        //     id: "364293",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Gastroenterology_Digestion",
        //     meta_value: {
        //       gastroenterology: {
        //         gerd: "Yes",
        //         gastritis: "Yes",
        //       },

        //       pulmonary_system: {
        //         fever: "Yes",
        //         wheeze: "Yes",
        //         shortness_of_breath: "Yes",
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:39:10",
        //     updated_at: "2026-05-13 10:39:10",
        //   },

        //   {
        //     id: "364294",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Investigation",
        //     meta_value: {
        //       "radio-invFill": "yes",

        //       investigation_required: {
        //         RADIOLOGY: [
        //           "Biopsy (small / Large)",
        //           "CT - Scan",
        //           "Pet Scan",
        //         ],
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:39:30",
        //     updated_at: "2026-05-13 10:39:30",
        //   },

        //   {
        //     id: "364295",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Balance_disorders",
        //     meta_value: {
        //       diagnisis: {
        //         line_treatment: "Medicationas and therapies",
        //         final_Diagnosis: "Lung Cancer",
        //         provisional_Diagnosis: "Lung Cancer",
        //       },
        //       abc: {
        //         line_treatment: "Medicationas and therapies",
        //         final_Diagnosis: "Lung Cancer",
        //         provisional_Diagnosis: "Lung Cancer",
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:40:12",
        //     updated_at: "2026-05-13 10:40:12",
        //   },

        //   {
        //     id: "364296",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Treatment",
        //     meta_value: {
        //       Treatment_Medicine: {
        //         qty: ["1", "1"],
        //         Days: ["21", "21"],
        //         Dosage: ["Tablet", "Tablet"],
        //         Medicine: [
        //           "492__LUNGS D-TOX 60 TAB",
        //           "224584__LUNGS CARE PACKAGE.",
        //         ],
        //         Frequency: ["1-0-1", "1-1-1"],
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:41:23",
        //     updated_at: "2026-05-13 10:41:23",
        //   },

        //   {
        //     id: "364297",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Panchkarma_Therapies",
        //     meta_value: {
        //       Panchkarma_Therapies: {
        //         qty: ["1", "5"],
        //         Therapy: [
        //           "7__ABHYANGA 60 MIN (HOSPITAL)",
        //           "19540__VIRECHANA (PURGATION)",
        //         ],
        //         Therapist: ["34__Abhishek", "34__Abhishek"],
        //       },
        //     },
        //     fillup: "1",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:44:43",
        //     updated_at: "2026-05-13 10:44:43",
        //   },

        //   {
        //     id: "364298",
        //     appointment_id: "1492517",
        //     patient_id: "1060045",
        //     doctor_id: "122",
        //     uhid: "JSDB26222026",
        //     branch_id: "1",
        //     header: "Ayurvedic_Therapies",
        //     meta_value: {
        //       Ayurvedic_Therapies: {
        //         poorva_karma: {
        //           poorva_karma: "",
        //           Medicine_Type: "",
        //         },
        //       },
        //     },
        //     fillup: "0",
        //     added_by: "122",
        //     created_at: "2026-05-13 10:44:46",
        //     updated_at: "2026-05-13 10:44:46",
        //   },
        // ],
        iaf_records: [
            {
                "id": "364289",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "0",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Nutritional_Assessment_Form",
                "meta_value": {
                    "diet_history": {
                        "Date": [
                            "2026-05-13"
                        ],
                        "Diet-Detail": [
                            "Roti + Sabzi + Dal + Chawal"
                        ]
                    },
                    "Medical_History": {
                        "HTN": {
                            "remark": "",
                            "dropdown": "no"
                        },
                        "Thyroid": {
                            "remark": "",
                            "dropdown": "no"
                        },
                        "Diabetes": {
                            "remark": "",
                            "dropdown": "no"
                        },
                        "Menstrual": {
                            "remark": "",
                            "dropdown": "no"
                        },
                        "Coronary_Artery_Disease": {
                            "remark": "",
                            "dropdown": "no"
                        }
                    },
                    "NutritionalAssessmentForm": {
                        "summary_remark": ""
                    }
                },
                "fillup": "1",
                "added_by": "8",
                "created_at": "2026-05-13 10:36:24",
                "updated_at": "2026-05-13 10:36:24"
            },
            {
                "id": "364290",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "General_Question",
                "meta_value": {
                    "general": [
                        {
                            "remark": "",
                            "dropdown": "no"
                        },
                        {
                            "remark": "",
                            "dropdown": "no"
                        },
                        {
                            "remark": "",
                            "dropdown": "no"
                        },
                        {
                            "remark": "",
                            "dropdown": "Yes"
                        },
                        {
                            "remark": "",
                            "dropdown": "Yes"
                        },
                        {
                            "remark": "",
                            "dropdown": "no"
                        },
                        {
                            "remark": "",
                            "dropdown": "no"
                        },
                        {
                            "remark": "",
                            "dropdown": "no"
                        }
                    ],
                    "about_patient": {
                        "height": {
                            "feet": "",
                            "inch": ""
                        },
                        "weight": "",
                        "appetite": "",
                        "exercise": "",
                        "food_habits": "",
                        "job_profile": "",
                        "daily_working_hours": ""
                    },
                    "generalQuestion": {
                        "summary_remark": ""
                    }
                },
                "fillup": "1",
                "added_by": "122",
                "created_at": "2026-05-13 10:37:12",
                "updated_at": "2026-05-13 10:37:12"
            },
            {
                "id": "364291",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Tongue_Pulse_Eyes_Nails",
                "meta_value": {
                    "pulse": {
                        "Eyes": "-",
                        "Vaat": "-",
                        "Kapha": "-",
                        "Nails": "-",
                        "Pitta": "-"
                    },
                    "Tongue": {
                        "summary_remark": "-"
                    },
                    "tongueList": {
                        "image": "",
                        "shape": "NA",
                        "saliva": "NA",
                        "ulcers": "NA",
                        "texture": "NA",
                        "swelling": "NA",
                        "red_dot_tongue": "NA",
                        "sublingual_vein": "NA",
                        "color_of_coating": "NA",
                        "coating_thickness": "NA"
                    }
                },
                "fillup": "1",
                "added_by": "122",
                "created_at": "2026-05-13 10:37:15",
                "updated_at": "2026-05-13 10:37:15"
            },
            {
                "id": "364292",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Patient_Full_History",
                "meta_value": {
                    "Dharan": {
                        "dharan": [
                            ""
                        ],
                        "Duration": [
                            ""
                        ]
                    },
                    "Allergies": {
                        "Why": [
                            "NA"
                        ],
                        "When": [
                            "NA"
                        ],
                        "Allergies": [
                            "NA"
                        ]
                    },
                    "Surgeries": {
                        "When": [
                            "NA"
                        ],
                        "Remarks": [
                            "NA"
                        ],
                        "Surgeries": [
                            "NA"
                        ]
                    },
                    "patientHistory": {
                        "summary_remark": ""
                    },
                    "Chief_Complaints": {
                        "Symptoms": [
                            "Shortness of Breath due to lung cancer"
                        ],
                        "Days_Duration": [
                            "2 years"
                        ]
                    },
                    "HistoryOfPresent": {
                        "Disease": [
                            "Shortness of Breath due to lung cancer"
                        ],
                        "Treatment": [
                            ""
                        ]
                    },
                    "MedicationHistory": {
                        "Dosage": [
                            "NA"
                        ],
                        "Routine_Medication": [
                            "NA"
                        ]
                    },
                    "PastMedicalHistory": {
                        "What": [
                            "NA"
                        ],
                        "When": [
                            "NA"
                        ],
                        "Medication": [
                            "NA"
                        ]
                    },
                    "PreviousHospitalisation": {
                        "Any_trauma": [
                            ""
                        ]
                    }
                },
                "fillup": "1",
                "added_by": "122",
                "created_at": "2026-05-13 10:38:28",
                "updated_at": "2026-05-13 10:38:28"
            },
            {
                "id": "364293",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Gastroenterology_Digestion",
                "meta_value": {
                    "Gastroenterology": {
                        "summary_remark": ""
                    },
                    "gastroenterology": {
                        "gerd": "Yes",
                        "gastritis": "Yes"
                    },
                    "pulmonary_system": {
                        "fever": "Yes",
                        "wheeze": "Yes",
                        "shortness_of_breath": "Yes"
                    }
                },
                "fillup": "1",
                "added_by": "122",
                "created_at": "2026-05-13 10:39:10",
                "updated_at": "2026-05-13 10:39:10"
            },
            {
                "id": "364294",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Investigation",
                "meta_value": {
                    "radio-invFill": "yes",
                    "investigation_required": {
                        "RADIOLOGY": [
                            "Biopsy (small / Large)",
                            "CT - Scan",
                            "Pet Scan"
                        ],
                        "URINE_EXAMINATION": {
                            "remark": ""
                        },
                        "LIVER_FUNCTION_TEST_-_LFT": {
                            "remark": ""
                        }
                    },
                    "investigationRequiredRecord": {
                        "summary_remark": ""
                    }
                },
                "fillup": "1",
                "added_by": "122",
                "created_at": "2026-05-13 10:39:30",
                "updated_at": "2026-05-13 10:39:30"
            },
            {
                "id": "364295",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Balance_disorders",
                "meta_value": {
                    "diagnisis": {
                        "line_treatment": "Medicationas and therapies",
                        "final_Diagnosis": "Lung Cancer",
                        "provisional_Diagnosis": "Lung Cancer"
                    },
                    "pain_scale": {
                        "mild": "Yes"
                    },
                    "coordinatien": {
                        "comment": "Lung Cancer",
                        "left_lower_limbs": "good",
                        "left_upper_limbs": "poor",
                        "right_lower_limbs": "N/A",
                        "right_upper_limbs": "poor"
                    },
                    "balanceDisorder": {
                        "summary_remark": "Lung Cancer"
                    },
                    "Balance_disorders": {
                        "Sitting": "normal",
                        "Walking": "normal",
                        "Standing": "normal"
                    }
                },
                "fillup": "1",
                "added_by": "122",
                "created_at": "2026-05-13 10:40:12",
                "updated_at": "2026-05-13 10:40:12"
            },
            {
                "id": "364296",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Treatment",
                "meta_value": {
                    "Treatment": {
                        "summary_remark": ""
                    },
                    "Treatment_Medicine": {
                        "qty": [
                            "1",
                            "1"
                        ],
                        "Days": [
                            "21",
                            "21"
                        ],
                        "Dosage": [
                            "Tablet",
                            "Tablet"
                        ],
                        "Remarks": [
                            "",
                            ""
                        ],
                        "Medicine": [
                            "492__LUNGS D-TOX 60 TAB",
                            "224584__LUNGS CARE PACKAGE."
                        ],
                        "Frequency": [
                            "1-0-1",
                            "1-1-1"
                        ]
                    }
                },
                "fillup": "1",
                "added_by": "122",
                "created_at": "2026-05-13 10:41:23",
                "updated_at": "2026-05-13 10:41:23"
            },
            {
                "id": "364297",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Panchkarma_Therapies",
                "meta_value": {
                    "panchKarmaCurrent": {
                        "summary_remark": ""
                    },
                    "Panchkarma_Therapies": {
                        "qty": [
                            "1",
                            "5",
                            "3",
                            "5",
                            "3",
                            "3"
                        ],
                        "Therapy": [
                            "7__ABHYANGA 60 MIN (HOSPITAL) -default",
                            "19540__VIRECHANA (PURGATION) 01 DAY -default",
                            "19541__NASYAM (NASAL THERAPY) 40 MIN / 01 DAY -default",
                            "42__SHIRODHARA 40 MIN (HOSPITAL)  -default",
                            "17__HRID BASTI 40 MIN (HOSPITAL) -default",
                            "19544__ASTHAPANA BASTI 01 DAY -default(old)"
                        ],
                        "Therapist": [
                            "34__Abhishek",
                            "34__Abhishek",
                            "34__Abhishek",
                            "34__Abhishek",
                            "34__Abhishek",
                            "34__Abhishek"
                        ]
                    }
                },
                "fillup": "1",
                "added_by": "122",
                "created_at": "2026-05-13 10:44:43",
                "updated_at": "2026-05-13 10:44:43"
            },
            {
                "id": "364298",
                "appointment_id": "1492517",
                "patient_id": "1060045",
                "doctor_id": "122",
                "uhid": "JSDB26222026",
                "branch_id": "1",
                "header": "Ayurvedic_Therapies",
                "meta_value": {
                    "AyurvedicTherapies": {
                        "summary_remark": ""
                    },
                    "Ayurvedic_Therapies": {
                        "poorva_karma": {
                            "poorva_karma": "",
                            "Medicine_Type": ""
                        },
                        "paschat_karma": {
                            "remark": "",
                            "paschat_karma": ""
                        },
                        "pradhan_karma": {
                            "remark": "",
                            "pradhan_karma": ""
                        },
                        "other_therapies": {
                            "remark": "",
                            "therepy": ""
                        }
                    }
                },
                "fillup": "0",
                "added_by": "122",
                "created_at": "2026-05-13 10:44:46",
                "updated_at": "2026-05-13 10:44:46"
            }
        ]
        //  iaf_records : [
        //   {
        //     id: "364299",
        //     appointment_id: "1492523",
        //     patient_id: "1050282",
        //     doctor_id: "0",
        //     uhid: "JSSN3332026",
        //     branch_id: "1",
        //     header: "Nutritional_Assessment_Form",

        //     meta_value: {
        //       diet_history: {
        //         Date: ["2026-05-13"],
        //         "Diet-Detail": ["ROTI+SABJI"],
        //       },

        //       Medical_History: {
        //         HTN: {
        //           remark: "",
        //           dropdown: "no",
        //         },

        //         Thyroid: {
        //           remark: "",
        //           dropdown: "no",
        //         },

        //         Diabetes: {
        //           remark: "",
        //           dropdown: "Yes",
        //         },

        //         Menstrual: {
        //           remark: "",
        //           dropdown: "no",
        //         },

        //         Coronary_Artery_Disease: {
        //           remark: "",
        //           dropdown: "no",
        //         },
        //       },

        //       NutritionalAssessmentForm: {
        //         summary_remark: "",
        //       },
        //     },

        //     fillup: "1",
        //     added_by: "8",
        //     created_at: "2026-05-13 14:45:53",
        //     updated_at: "2026-05-13 14:45:53",
        //   },
        // ]


    },
};

/** Default IAF rows until list download props load live API data. */
export const DEFAULT_IAF_RECORDS: PatientInfo["iaf_records"] =
    DEMO_IAF_API.data.iaf_records ?? [];

const DEMO_PATIENT: PatientInfo = {
    patient: DEMO_IAF_API.data.patient.patient,
    parent_name: DEMO_IAF_API.data.patient.parent_name,
    bp: "",
    sl: "",
    weight: "",
    height: "",
    uhid: DEMO_IAF_API.data.patient.uhid,
    opdId: "",
    age: DEMO_IAF_API.data.patient.age,
    gender: DEMO_IAF_API.data.patient.gender,
    iaf_records: DEFAULT_IAF_RECORDS,
};

const DEMO_DOCTOR: DoctorInfo = {
    name: "Dr. Anuradha Kumari",
    education: ["BAMS"],
    reg_no: "",
};

const DEMO_APPOINTMENT: AppointmentInfo = { created_at: "2025-12-03T17:09:03" };
const DEMO_DIAGNOSIS = "LIVER PROBLEM";

/** Show menstrual history line only for female patients (hide for male / unknown). */
function isFemalePatientForPatientForm(gender: string | undefined): boolean {
    const g = (gender ?? "").trim().toLowerCase();
    if (!g) return false;
    if (g === "male" || g === "m" || g.startsWith("male")) return false;
    return g === "female" || g === "f" || g.startsWith("female");
}

/** Gender label: first letter of each word capital (male → Male, FEMALE → Female). */
function formatGenderForPatientFormDisplay(gender: string | undefined): string {
    const raw = (gender ?? "").trim();
    if (!raw) return "—";
    return raw
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function safePatientValue(value: string | undefined): string {
    const normalized = (value ?? "").trim();
    return normalized === "" ? "N/A" : normalized;
}

// ── Component ─────────────────────────────────────────────────────────────────
const IPDPatientForm = forwardRef<NewOPDPatientFormHandle, NewOPDPatientFormProps>(function NewOPDPatientForm(
    {
        branch = DEMO_BRANCH,
        patient = DEMO_PATIENT,
        doctor = DEMO_DOCTOR,
        appointment = DEMO_APPOINTMENT,
        diagnosis = DEMO_DIAGNOSIS,
        showDownloadButton = true,
    },
    ref
) {
    const printRef = useRef<HTMLDivElement>(null);

    const patientRow: PatientInfo = {
        ...patient,
        iaf_records: Array.isArray(patient.iaf_records) && patient.iaf_records.length > 0
            ? patient.iaf_records
            : DEFAULT_IAF_RECORDS,
    };

    // const downloadIPDPDF = useCallback(async () => {
    //   const html2pdf = (await import("html2pdf.js")).default;
    //   if (!printRef.current) return;
    //   await html2pdf()
    //     .set({
    //       margin: 0,
    //       filename: `ipd_patient_${patientRow.uhid}.pdf`,
    //       // PNG avoids JPEG blockiness around small text (html2canvas → raster → PDF).
    //       image: { type: "jpeg", quality: 1 },
    //       html2canvas: {
    //         scale: 3,
    //         useCORS: true,
    //         letterRendering: true,
    //         logging: false,
    //       },
    //       jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    //     })
    //     .from(printRef.current)
    //     .save();
    // }, [patientRow.uhid]);

    // const handleDownloadPDF = useCallback(async () => {
    //   const html2pdf = (await import("html2pdf.js")).default;

    //   if (!printRef.current) return;

    //   // ─────────────────────────────────────────────
    //   // PDF PRINT CSS
    //   // ─────────────────────────────────────────────
    //   const style = document.createElement("style");

    //   style.innerHTML = `
    //     @media print {

    //       html,
    //       body {
    //         margin: 0;
    //         padding: 0;
    //       }

    //       .pdf-root {
    //         width: 100%;
    //       }

    //       .pdf-section {
    //         break-inside: avoid;
    //         page-break-inside: avoid;
    //       }

    //       .pdf-page-break {
    //         page-break-before: always;
    //         break-before: page;
    //       }

    //       // table,
    //       // tr,
    //       // td,
    //       // th {
    //       //   page-break-inside: avoid !important;
    //       // }
    //     }
    //   `;

    //   document.head.appendChild(style);

    //   // ─────────────────────────────────────────────
    //   // PDF OPTIONS
    //   // ─────────────────────────────────────────────
    //   const options: any = {
    //     // margin: [15, 10, 15, 10],

    //     filename: `ipd-patient-form-${patientRow?.uhid || "download"}.pdf`,

    //     image: {
    //       type: "jpeg",
    //       quality: 1,
    //     },

    //     html2canvas: {
    //       scale: 3,
    //       useCORS: true,
    //       letterRendering: true,
    //       logging: false,
    //       scrollX: 0,
    //       scrollY: 0,
    //     },

    //     jsPDF: {
    //       unit: "mm",
    //       format: "a4",
    //       orientation: "portrait",
    //     },

    //     pagebreak: {
    //       mode: ["avoid-all", "css", "legacy"],
    //     },
    //   };

    //   // ─────────────────────────────────────────────
    //   // DOWNLOAD PDF
    //   // ─────────────────────────────────────────────
    //   await html2pdf()
    //     .set(options)
    //     .from(printRef.current)
    //     .save();

    //   // cleanup
    //   document.head.removeChild(style);

    // }, [patientRow?.uhid]);

    // const handleDownloadPDF = useCallback(async () => {
    //   const html2pdf = (await import("html2pdf.js")).default;

    //   if (!printRef.current) return;

    //   // ─────────────────────────────────────────────
    //   // PRINT CSS
    //   // ─────────────────────────────────────────────
    //   const style = document.createElement("style");

    //   style.innerHTML = `
    // @media print {

    //   html,
    //   body {
    //     margin: 0;
    //     padding: 0;
    //     background: #fff;
    //   }

    //   .pdf-root {
    //     padding: 15px;
    //     box-sizing: border-box;
    //   }

    //   /* REPEATING FOOTER LINE */
    //   .pdf-footer-line {
    //     position: fixed;
    //     bottom: 8px;
    //     left: 15px;
    //     right: 15px;
    //     border-top: 1px solid #000;
    //     height: 1px;
    //     z-index: 9999;
    //   }

    //   table,
    //   tr,
    //   td,
    //   th {
    //     page-break-inside: avoid !important;
    //   }

    //   .pdf-section {
    //     break-inside: avoid;
    //     page-break-inside: avoid;
    //   }
    // }
    //   `;
    //   document.head.appendChild(style);

    //   // ─────────────────────────────────────────────
    //   // PDF OPTIONS
    //   // ─────────────────────────────────────────────
    //   const options: any = {
    //     margin: [15, 15, 15, 15],

    //     filename: `ipd-patient-form-${patientRow?.uhid || "download"}.pdf`,

    //     image: {
    //       type: "jpeg",
    //       quality: 1,
    //     },

    //     html2canvas: {
    //       scale: 3,
    //       useCORS: true,
    //       letterRendering: true,
    //       logging: false,
    //       scrollX: 0,
    //       scrollY: 0,
    //     },

    //     jsPDF: {
    //       unit: "mm",
    //       format: "a4",
    //       orientation: "portrait",
    //     },

    //     pagebreak: {
    //       mode: ["css", "legacy"],
    //       avoid: ["tr", "td", ".pdf-section"],
    //     },
    //   };

    //   // ─────────────────────────────────────────────
    //   // DOWNLOAD PDF
    //   // ─────────────────────────────────────────────
    //   await html2pdf()
    //     .set(options)
    //     .from(printRef.current)
    //     .save();

    //   // CLEANUP
    //   document.head.removeChild(style);

    // }, [patientRow?.uhid]);


    const handleDownloadPDF = useCallback(async () => {
        const html2pdf = (await import("html2pdf.js")).default;

        if (!printRef.current) return;

        // ─────────────────────────────────────────────
        // PRINT CSS
        // ─────────────────────────────────────────────
        const style = document.createElement("style");

        style.innerHTML = `
      @media print {
  
        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
  
        .pdf-root {
          width: 100%;
          box-sizing: border-box;
          padding: 15px;
        }
  
        .pdf-section {
          break-inside: avoid;
          page-break-inside: avoid;
        }
  
        .pdf-page-break {
          page-break-before: always;
          break-before: page;
        }

        /* Last page: do not force another page after Amount Sheet */
        .ipd-amount-sheet-page {
          page-break-after: avoid !important;
          break-after: avoid !important;
          min-height: auto !important;
          height: auto !important;
        }
  
        /* TABLE FIXES */
        table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto !important;
        }
  
        thead {
          display: table-header-group;
        }
  
        tfoot {
          display: table-footer-group;
        }
  
        tr,
        td,
        th {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
  
        /* IMPORTANT:
           PREVENT LAST ROW CUTTING */
        tbody tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
  
        /* REMARK SECTION FIX */
        .general-question-remark,
        .remark-section,
        .remarks-box {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
  
        /* EXTRA SAFE BLOCKS */
        .avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
  
        /* IMAGE FIX */
        img {
          page-break-inside: avoid !important;
        }
  
        /* TEXT FIX */
        p,
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          page-break-inside: avoid !important;
        }
      }
    `;

        document.head.appendChild(style);

        // ─────────────────────────────────────────────
        // PDF OPTIONS
        // ─────────────────────────────────────────────
        const options: any = {
            margin: [15, 15, 20, 15],

            filename: `ipd-patient-form-${patientRow?.uhid || "download"
                }.pdf`,

            image: {
                type: "jpeg",
                quality: 1,
            },

            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
            },

            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait",
            },

            // pagebreak: {
            //   mode: ["avoid-all", "css", "legacy"],

            //   avoid: [
            //     "tr",
            //     "td",
            //     "th",
            //     "table",
            //     ".pdf-section",
            //     ".general-question-remark",
            //     ".remark-section",
            //     ".remarks-box",
            //     ".avoid-break",
            //   ],

            //   before: [".pdf-page-break"],
            // },

            pagebreak: {
                mode: "legacy",
                before: [".pdf-page-break"],
                avoid: [
                    "tr",
                    "td",
                    "th",
                    ".remark-section",
                    ".remarks-box",
                ],
            },
        };

        // ─────────────────────────────────────────────
        // GENERATE PDF
        // ─────────────────────────────────────────────
        const worker = html2pdf()
            .set(options)
            .from(printRef.current)
            .toPdf();

        // GET PDF INSTANCE
        const pdf = await worker.get("pdf");

        // TOTAL PAGES
        const totalPages = pdf.internal.getNumberOfPages();

        // ─────────────────────────────────────────────
        // FOOTER FOR EVERY PAGE
        // ─────────────────────────────────────────────
        for (let i = 1; i <= totalPages; i++) {

            pdf.setPage(i);

            // PAGE SIZE
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // FOOTER POSITION
            const footerY = pageHeight - 15;

            // HORIZONTAL LINE
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.3);

            pdf.line(
                10,
                footerY,
                pageWidth - 10,
                footerY
            );

            // PAGE NUMBER
            pdf.setFontSize(10);

            pdf.text(
                `${i}`,
                pageWidth - 15,
                footerY + 6
            );
        }

        // ─────────────────────────────────────────────
        // SAVE PDF
        // ─────────────────────────────────────────────
        await worker.save();

        // CLEANUP
        document.head.removeChild(style);

    }, [patientRow?.uhid]);

    useImperativeHandle(ref, () => ({ downloadPdf: handleDownloadPDF }), [handleDownloadPDF]);

    const fmtDate = new Date(appointment.created_at)
        .toLocaleString("en-IN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
        })
        .replace(",", "")
        .replace(/\//g, "-");

    // ── Shared font / colour tokens matching the PDF exactly ──────────────────
    const BASE: React.CSSProperties = {
        // fontFamily: "'Calibri', 'Gill Sans', 'Trebuchet MS', Arial, sans-serif",
        fontSize: "14px",
        color: "#000000",
        // Sharper strokes when html2canvas rasterizes (esp. small table headers / disclaimer).
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
    };

    const shellStyle: React.CSSProperties = showDownloadButton
        ? { background: "#d0d0cc", minHeight: "100vh", padding: "20px" }
        // ? { background: "#d0d0cc", minHeight: "100vh", padding: "20px" }
        : {
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: "794px",
            padding: 0,
            margin: 0,
            background: "#d0d0cc",
            zIndex: -1,
            pointerEvents: "none",
        };

    // const rows = [
    //   ["HTN", "No", "..."],
    //   ["Thyroid", "No", "..."],
    //   ["Diabetes", "No", "..."],
    //   ["Menstrual", "No", "..."],
    //   ["Coronary Artery Disease", "No", "..."],
    // ];

    // const generalQuestionRows = [
    //   ["Are you allergic to any food or drink?", "(क्या आपको किसी भोजन या पेय से एलर्जी है)?", "No", "..."],
    //   ["Do you take any vitamins, minerals and/or food supplements?", "(क्या आप कोई विटामिन, खनिज और/या भोजन अनुपूरक लेते हैं)?", "No", "..."],
    //   ["Have you had any major injuries, hospitalizations, or operations?", "(क्या आपको कोई बड़ी चोट लगी है, अस्पताल में भर्ती होना पड़ा है या ऑपरेशन हुआ है)?", "No", "..."],
    //   ["Do you have any chronic illnesses?", "(क्या आपको कोई पुरानी बीमारी है)?", "No", "..."],
    //   ["Do you take any medications on a regular basis?", "(क्या आप नियमित रूप से कोई दवा लेते हैं)?", "No", "..."],
    //   ["Have you ever been diagnosed or do you suffer from anxiety?", "(क्या आपको कभी इसका िनदान हुआ है या आप िचंता से पीिड़त हैं)?", "No", "..."],
    //   ["Have you ever been diagnosed or do you suffer from depression?", "(क्या आपको कभी इसका िनदान हुआ है या आप अवसाद से पीिड़त हैं)?", "No", "..."],
    //   ["Have you ever been diagnosed or do you suffer from an eating disorder, such as, anorexia, bulimia, or binge eating?", "(क्या आपको कभी िनदान हुआ है या आप खाने के िवकार से पीिड़त हैं, जैसे एनोरेिसया, बुिलिमया, या अयिधक खाना)?", "No", "..."],
    // ];



    // console.log("patientRow",patientRow?.iaf_records);

    return (
        <div style={shellStyle}>
            {showDownloadButton ? (
                <div style={{ maxWidth: "794px", margin: "0 auto 12px", textAlign: "right" }}>
                    <button
                        type="button"
                        onClick={handleDownloadPDF}
                        style={{
                            background: "#024317", color: "#fff", border: "none",
                            borderRadius: "5px", padding: "9px 24px", fontSize: "14px",
                            fontWeight: "600", cursor: "pointer", letterSpacing: "0.4px",
                            boxShadow: "0 2px 8px rgba(0,0,0,.25)",
                        }}
                    >
                        ⬇ Download PDF
                    </button>
                </div>
            ) : null}

            {/* ═══════════ 2PagesPDF PRINTABLE AREA ═══════════ */}

            {
                patientRow?.iaf_records.length <= 0 ?
                    (
                        <div ref={printRef} style={{ background: "#fff" }}>


                            {/* ══════ PAGE 1 ══════ */}
                            <div style={{
                                ...BASE,
                                height: "1122px",
                                boxSizing: "border-box",
                                // padding: "40px 56px",
                                display: "flex",
                                flexDirection: "column",
                            }}>

                                {/* ── HEADER ─────────────────────────────────────────────── */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "26px",
                                        marginBottom: "8px",
                                    }}
                                >
                                    {/* Left Logo */}
                                    <img
                                        src={TITLE_SRC}
                                        alt="JEENA SIKHO LIFECARE LTD"
                                        style={{
                                            width: "130px",
                                            flexShrink: 0, // ✅ prevents shrinking
                                        }}
                                    />

                                    {/* Company name + address block */}
                                    <div
                                        style={{
                                            width: "74%", // ✅ reduce width here
                                            // marginLeft: "10px",
                                        }}
                                    >
                                        <div style={{ textAlign: "center" }}>
                                            <img
                                                src={LOGO_SRC}
                                                alt="Jeena Sikho"
                                                style={{ maxWidth: "100%" }}
                                            />

                                            <div
                                                style={{
                                                    fontSize: "14px",
                                                    marginTop: "-14px",
                                                    marginBottom: "12px",
                                                    fontWeight: 400,
                                                }}
                                            >
                                                Pind Devinagar, Chandigarh Delhi Highway, Derabassi,
                                                Chandigarh, Punjab, S.A.S Nagar
                                                <br />
                                                PH. 9517714446
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", margin: "6px 0 20px 0" }} />
                                {/* <div style={{ position: "relative", height: "20px", marginTop: "18px", border: "1px solid #fff" }}>
      <div
        style={{
          position: "absolute",
          top: "-10px",
          bottom: "10px",
          inset: 0,
          background: "#003366",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          paddingLeft: "2px",
          margin: 0,
          fontSize: "13px",
        }}
      >
        Patient Details
      </div>
    </div> */}

                                <div
                                    style={{
                                        color: "#fff",
                                        background: "#003366",
                                        // padding: "5px 0px 5px 2px",
                                    }}
                                >
                                    <h4
                                        style={{
                                            margin: "0px",
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            marginTop: "-15px",
                                            padding: "8px 0px 8px 2px",
                                        }}
                                    >
                                        Patient Details
                                    </h4>
                                </div>

                                <table
                                    className="opd-patient-main"
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        border: "none",
                                        marginTop: "16px",
                                        tableLayout: "fixed",
                                    }}
                                >
                                    <colgroup>
                                        <col style={{ width: "34%" }} />
                                        <col style={{ width: "28%" }} />
                                        <col style={{ width: "19%" }} />
                                        <col style={{ width: "19%" }} />
                                    </colgroup>

                                    <thead>
                                        <tr>
                                            <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "800", fontSize: "11px" }}>FullName</th>
                                            <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "800", fontSize: "11px" }}>UHID</th>
                                            <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "800", fontSize: "11px" }}>Age</th>
                                            <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "800", fontSize: "11px" }}>Gender</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        <tr>
                                            <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                                                {safePatientValue(patientRow.patient)}
                                            </td>
                                            <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                                                {safePatientValue(patientRow.uhid)}
                                            </td>
                                            <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                                                {safePatientValue(patientRow.age)}
                                            </td>
                                            <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                                                {safePatientValue(formatGenderForPatientFormDisplay(patientRow.gender)).replace("—", "N/A")}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <h4
                                    style={{
                                        color: "red",
                                        fontWeight: 700,
                                        textAlign: "center",
                                        marginTop: "50px",
                                        fontSize: "16px",
                                    }}
                                >
                                    Form not filled yet by receptionist or doctor.
                                </h4>

                                <div style={{ marginTop: "110px" }}>
                                    <p
                                        style={{
                                            fontSize: "10px",
                                            lineHeight: "1.3",
                                            margin: 0,
                                        }}
                                    >
                                        I hereby assure that whatever information I have provided is correct and true to the best of my knowledge.
                                        "If I am an asymptomatic carrier or an undiagnosed patient with COVID-19, I know it may endanger doctors and hospital staff. It is my responsibility to take appropriate precautions and to follow the protocols prescribed by them. I also know that I may get an infection from the clinic or from a doctor, and I will take every precaution to prevent this from happening, but I will not hold doctors and clinic staff accountable if such infection occurs to me or my accompanying persons.
                                    </p>

                                    <h5
                                        style={{
                                            textAlign: "right",
                                            marginTop: "18px",
                                            fontSize: "13px",
                                            fontWeight: 700,
                                        }}
                                    >
                                        Patient Signature
                                    </h5>
                                </div>
                                {/* <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", margin: "8px 0 0px 0" }} />
    <div style={{marginLeft:"auto"}}><h5 style={{ textAlign: "center", fontSize: "13px", fontWeight: "600", marginTop: "10px" }}>1</h5></div>   */}
                                <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", marginTop: "auto" }} />
                                {/* <div style={{ textAlign: "end", fontSize: "13px", fontWeight: "600", marginTop: "-2px" }}>
      1
    </div> */}

                            </div>{/* end page 1 */}


                            {/* ══════ PAGE 2 — Amount Sheet ══════ */}
                            <div
                                className="pdf-page-break ipd-amount-sheet-page"
                                style={{
                                    ...BASE,
                                    boxSizing: "border-box",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <div>
                                    <div style={{ marginTop: "10px" }}>
                                        {/* <div style={{ color: "white", background: "black", padding: "6px" }}>
          <h4 style={{ margin: "10px" }}>Amount Sheet</h4>
        </div> */}

                                        <div
                                            style={{
                                                color: "#fff",
                                                background: "#000",
                                                padding: "5px 0px 5px 2px",
                                            }}
                                        >
                                            <h4
                                                style={{
                                                    margin: "10px",
                                                    fontSize: "16px",
                                                    fontWeight: 600,
                                                    marginTop: "-5px",
                                                }}
                                            >
                                                Amount Sheet
                                            </h4>
                                        </div>
                                        <table
                                            style={{
                                                fontSize: "11px",
                                                width: "100%",
                                                textAlign: "start",
                                                borderCollapse: "separate",
                                                borderSpacing: "3px 3px",
                                                tableLayout: "fixed"
                                            }}
                                        >
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: "13%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>Date</td>
                                                    <td style={{ width: "19%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>Amount</td>
                                                    <td style={{ width: "30%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>Discount (%AGE)</td>
                                                    <td style={{ width: "20%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>REC Payment</td>
                                                    <td style={{ width: "20%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>Payment Mode</td>
                                                </tr>

                                                {Array.from({ length: 10 }).map((_, i) => (
                                                    <tr key={i}>
                                                        {Array.from({ length: 5 }).map((_, j) => (
                                                            <td key={j} style={{ height: "50px", border: "1px solid #222" }} />
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", marginTop: "auto" }} />
    <div style={{ textAlign: "end", fontSize: "13px", fontWeight: "600", marginTop: "-2px" }}>
      2
    </div> */}
                            </div>
                            {/* ══════ end page 2 ══════ */}
                        </div>
                    ) : (
                        <div ref={printRef} className="pdf-root" style={{ background: "#fff" }}>

                            {/* CONTENT */}
                            <div style={{
                                ...BASE,
                                // height: "1122px",
                                // height :"auto",
                                boxSizing: "border-box",
                                // padding: "40px 56px",
                                // padding: "0px 10px 00px  20px",
                                display: "flex",
                                flexDirection: "column",
                            }}>

                                {/* ── HEADER ─────────────────────────────────────────────── */}
                                <div
                                    style={{
                                        // border: "1px solid #000",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "26px",
                                        marginBottom: "6px",
                                        marginTop: "0px",
                                    }}
                                >
                                    {/* Left Logo */}
                                    <img
                                        src={TITLE_SRC}
                                        alt="JEENA SIKHO LIFECARE LTD"
                                        style={{
                                            width: "130px",
                                            flexShrink: 0, // ✅ prevents shrinking
                                        }}
                                    />

                                    {/* Company name + address block */}
                                    <div
                                        style={{
                                            width: "74%", // ✅ reduce width here
                                            // marginLeft: "10px",
                                        }}
                                    >
                                        <div style={{ textAlign: "center" }}>
                                            <img
                                                src={LOGO_SRC}
                                                alt="Jeena Sikho"
                                                style={{ maxWidth: "100%" }}
                                            />

                                            <div
                                                style={{
                                                    fontSize: "14px",
                                                    marginTop: "-14px",
                                                    marginBottom: "12px",
                                                    fontWeight: 400,
                                                }}
                                            >
                                                <p
                                                    style={{
                                                        fontSize: "14px",
                                                        fontWeight: 400,
                                                        paddingLeft: "10px",
                                                        wordSpacing: "1px",
                                                        // border: "1px solid #000",
                                                        margin: 0,
                                                    }}
                                                >
                                                    <div style={{ textAlign: "start" }}>
                                                        Pind Devinagar,Chandigarh Delhi Highway,Derabassi,Chandigarh,Punjab
                                                    </div>

                                                    <div style={{ textAlign: "center" }}>
                                                        S.A.S Nagar
                                                        <br />
                                                        PH. 9517714446
                                                    </div>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", margin: "6px 0 20px 0" }} />

                                <div
                                    style={{
                                        color: "#fff",
                                        background: "#003366",
                                        // padding: "5px 0px 5px 2px",
                                    }}
                                >
                                    <h4
                                        style={{
                                            margin: "0px",
                                            fontSize: "13px",
                                            fontWeight: 800,
                                            marginTop: "-16px",
                                            padding: "8px 0px 8px 2px",
                                        }}
                                    >
                                        Patient Details
                                    </h4>
                                </div>

                                <table
                                    className="opd-patient-main"
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        border: "none",
                                        marginTop: "14px",
                                        tableLayout: "fixed",
                                    }}
                                >
                                    <colgroup>
                                        <col style={{ width: "34%" }} />
                                        <col style={{ width: "28%" }} />
                                        <col style={{ width: "19%" }} />
                                        <col style={{ width: "19%" }} />
                                    </colgroup>

                                    <thead>
                                        <tr>
                                            <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "800", fontSize: "11px" }}>FullName</th>
                                            <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "800", fontSize: "11px" }}>UHID</th>
                                            <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "800", fontSize: "11px" }}>Age</th>
                                            <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "800", fontSize: "11px" }}>Gender</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        <tr>
                                            <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                                                {safePatientValue(patientRow.patient)}
                                            </td>
                                            <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                                                {safePatientValue(patientRow.uhid)}
                                            </td>
                                            <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                                                {safePatientValue(patientRow.age)}
                                            </td>
                                            <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                                                {safePatientValue(formatGenderForPatientFormDisplay(patientRow.gender)).replace("—", "N/A")}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Diet History (Aahar Itihas) ═══════════════════════════════════════════════════════════════════════════════════════ */}

                                {
                                    patientRow?.iaf_records?.length > 0 &&
                                    patientRow?.iaf_records?.map((item: any) => {

                                        const header = item?.header;
                                        const meta_value = item?.meta_value;
                                        const FormatteddietDate = item?.created_at
                                            ? (() => {
                                                const [datePart] = item?.created_at.split(" ");
                                                const [year, month, day] = datePart.split("-");

                                                return `${Number(day)}-${Number(month)}-${year}`;
                                            })()
                                            : "";

                                        // console.log("shfsdyfshdg",item);

                                        // Nutritional_Assessment_Form
                                        if (header === "Nutritional_Assessment_Form") {

                                            const dietDate = meta_value?.diet_history?.Date?.[0] || "";
                                            const dietDetail = meta_value?.diet_history?.["Diet-Detail"]?.[0] || "";

                                            const rows = Object.entries(
                                                meta_value?.Medical_History || {}
                                            ).map(([key, value]: any) => [
                                                key.replaceAll("_", " "),
                                                value?.dropdown || "",
                                                value?.remark || "..."
                                            ]);

                                            const summaryRemark = meta_value?.NutritionalAssessmentForm?.summary_remark || "...";

                                            return (
                                                <>
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "26px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-13px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            Diet History (आहार इतिहास)
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    <table style={{ width: "100%" }}>
                                                        {/* <tbody> */}
                                                        {/* Diet */}

                                                        <tr style={{ height: "8px" }}>
                                                            <td
                                                                style={{

                                                                    height: "8px",
                                                                    width: "30%",
                                                                    paddingTop: "0px",
                                                                    paddingLeft: "6px",
                                                                    border: "1px solid #000",
                                                                    borderBottom: "none",
                                                                    fontSize: "11px",
                                                                    fontWeight: "800",
                                                                    borderRight: "none",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "start",
                                                                        height: "8px",
                                                                        paddingTop: "0px",
                                                                        fontSize: "11px",
                                                                        fontWeight: "800",
                                                                        marginBottom: "14px",
                                                                        marginTop: "0px",
                                                                        textAlign: "start",
                                                                    }}
                                                                >
                                                                    Date
                                                                </div>
                                                            </td>

                                                            <td
                                                                style={{
                                                                    height: "8px",
                                                                    paddingTop: "0px",
                                                                    paddingLeft: "6px",
                                                                    border: "1px solid #000",
                                                                    borderBottom: "none",
                                                                    fontSize: "11px",
                                                                    fontWeight: "400",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "start",
                                                                        height: "8px",
                                                                        paddingTop: "0px",
                                                                        fontSize: "11px",
                                                                        fontWeight: "400",
                                                                        marginBottom: "14px",
                                                                        marginTop: "0px",
                                                                        textAlign: "start",
                                                                    }}
                                                                >
                                                                    {dietDate}
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* Diet details */}
                                                        <tr style={{ height: "8px" }}>
                                                            <td
                                                                style={{
                                                                    height: "8px",
                                                                    paddingTop: "0px",
                                                                    paddingLeft: "6px",
                                                                    border: "1px solid #000",
                                                                    fontSize: "11px",
                                                                    fontWeight: "800",
                                                                    borderRight: "none",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "start",
                                                                        height: "8px",
                                                                        paddingTop: "0px",
                                                                        fontSize: "11px",
                                                                        fontWeight: "800",
                                                                        marginBottom: "14px",
                                                                        marginTop: "0px",
                                                                        textAlign: "start",
                                                                    }}
                                                                >
                                                                    Diet Detail
                                                                </div>
                                                            </td>

                                                            <td
                                                                style={{
                                                                    height: "8px",
                                                                    paddingTop: "0px",
                                                                    paddingLeft: "6px",
                                                                    border: "1px solid #000",
                                                                    fontSize: "11px",
                                                                    fontWeight: "400",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "start",
                                                                        height: "8px",
                                                                        paddingTop: "0px",
                                                                        fontSize: "11px",
                                                                        fontWeight: "400",
                                                                        marginBottom: "14px",
                                                                        marginTop: "0px",
                                                                        textAlign: "start",
                                                                    }}
                                                                >
                                                                    {dietDetail}
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* </tbody> */}
                                                    </table>

                                                    {/* Medical History */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-15px",
                                                                padding: "8px 0px 8px 2px",
                                                            }}
                                                        >
                                                            Medical History (please give full details)
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            {rows.map(([s, v, x], i) => {
                                                                const borderBottomStyle =
                                                                    i === rows.length - 1 ? "1px solid #000" : "none";

                                                                return (
                                                                    <tr key={i} style={{ height: "8px" }}>
                                                                        <td
                                                                            style={{
                                                                                height: "8px",
                                                                                width: "60%",
                                                                                paddingTop: "0px",
                                                                                paddingLeft: "6px",
                                                                                borderTop: "1px solid #000",
                                                                                borderLeft: "1px solid #000",
                                                                                borderRight: "1px solid #000",
                                                                                borderBottom: borderBottomStyle,
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    height: "8px",
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "start",
                                                                                    fontSize: "11px",
                                                                                    fontWeight: "800",
                                                                                    marginBottom: "14px",
                                                                                    textAlign: "start",
                                                                                }}
                                                                            >
                                                                                {s}
                                                                            </div>
                                                                        </td>

                                                                        <td
                                                                            style={{
                                                                                height: "auto",
                                                                                paddingLeft: "6px",
                                                                                borderTop: "1px solid #000",
                                                                                borderRight: "1px solid #000",
                                                                                borderBottom: borderBottomStyle,
                                                                                fontSize: "11px",
                                                                                width: "80px",
                                                                                fontWeight: "400",
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "start",
                                                                                    height: "6px",
                                                                                    fontSize: "11px",
                                                                                    marginBottom: "14px",
                                                                                    textAlign: "start",
                                                                                    fontWeight: "400",
                                                                                }}
                                                                            >
                                                                                {v}
                                                                            </div>
                                                                        </td>

                                                                        <td
                                                                            style={{
                                                                                height: "8px",
                                                                                paddingLeft: "6px",
                                                                                borderTop: "1px solid #000",
                                                                                borderRight: "1px solid #000",
                                                                                borderBottom: borderBottomStyle,
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "start",
                                                                                    height: "6px",
                                                                                    fontSize: "11px",
                                                                                    marginBottom: "14px",
                                                                                    textAlign: "start",
                                                                                    fontWeight: "400",
                                                                                }}
                                                                            >
                                                                                {x}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>


                                                    {/* Remarks */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-15px",
                                                                padding: "8px 0px 8px 2px",
                                                            }}
                                                        >
                                                            Remarks
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    {/* Summary remark */}
                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            {[
                                                                ["Summary remark", summaryRemark]
                                                            ].map(([s, v], i) => (
                                                                <tr key={i} style={{ height: "8px" }}>
                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            width: "80%",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                            borderRight: "none",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {s}
                                                                        </div>
                                                                    </td>

                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {v}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </>
                                            );
                                        }

                                        // General_Question
                                        if (header === "General_Question") {
                                            const rows = Object.entries(meta_value?.about_patient || {}).map(
                                                ([key, value]: any) => [
                                                    key.replaceAll("_", " "),
                                                    typeof value === "object" ? value?.feet || "" : value || "",
                                                    typeof value === "object" ? value?.inch || "" : "",
                                                ]
                                            );
                                            const summaryRemark = meta_value?.NutritionalAssessmentForm?.summary_remark || "...";
                                            const generalAnswers = meta_value?.general || [];


                                            const generalQuestionRows = [
                                                [
                                                    "Are you allergic to any food or drink?",
                                                    "(क्या आपको किसी भोजन या पेय से एलर्जी है)?",
                                                ],
                                                [
                                                    "Do you take any vitamins, minerals and/or food supplements?",
                                                    "(क्या आप कोई विटामिन, खनिज और/या भोजन अनुपूरक लेते हैं)?",
                                                ],
                                                [
                                                    "Have you had any major injuries, hospitalizations, or operations?",
                                                    "(क्या आपको कोई बड़ी चोट लगी है, अस्पताल में भर्ती होना पड़ा है या ऑपरेशन हुआ है)?",
                                                ],
                                                [
                                                    "Do you have any chronic illnesses?",
                                                    "(क्या आपको कोई पुरानी बीमारी है)?",
                                                ],
                                                [
                                                    "Do you take any medications on a regular basis?",
                                                    "(क्या आप नियमित रूप से कोई दवा लेते हैं)?",
                                                ],
                                                [
                                                    "Have you ever been diagnosed or do you suffer from anxiety?",
                                                    "(क्या आपको कभी इसका िनदान हुआ है या आप िचंता से पीिड़त हैं)?",
                                                ],
                                                [
                                                    "Have you ever been diagnosed or do you suffer from depression?",
                                                    "(क्या आपको कभी इसका िनदान हुआ है या आप अवसाद से पीिड़त हैं)?",
                                                ],
                                                [
                                                    "Have you ever been diagnosed or do you suffer from an eating disorder, such as, anorexia, bulimia, or binge eating?",
                                                    "(क्या आपको कभी िनदान हुआ है या आप खाने के िवकार से पीिड़त हैं, जैसे एनोरेिसया, बुिलिमया, या अयिधक खाना)?",
                                                ],
                                            ];


                                            return (
                                                <>
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "26px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-13px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            General Question
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                        <tbody>
                                                            {generalQuestionRows.map(([eng, hindi], i) => {
                                                                const item = generalAnswers[i] || {};

                                                                const answer =
                                                                    item?.dropdown?.toLowerCase() === "yes" ? "Yes" : "No";

                                                                const remarks = item?.remark || "...";

                                                                const borderBottomStyle =
                                                                    i === generalQuestionRows.length - 1
                                                                        ? "1px solid #000"
                                                                        : "none";
                                                                const rowHeight = i === generalQuestionRows.length - 1 ? "50px" : "8px";
                                                                const isLastRow = i === generalQuestionRows.length - 1;
                                                                return (
                                                                    <tr key={i} style={{ height: rowHeight }}>
                                                                        {/* Question Column */}
                                                                        <td
                                                                            style={{
                                                                                height: "8px",
                                                                                width: "90%",
                                                                                paddingLeft: "6px",
                                                                                paddingTop: "0px",
                                                                                borderTop: "1px solid #000",
                                                                                borderLeft: "1px solid #000",
                                                                                borderRight: "1px solid #000",
                                                                                borderBottom: borderBottomStyle,
                                                                            }}
                                                                        >
                                                                            {/* English */}
                                                                            <div
                                                                                style={{
                                                                                    display: "flex",
                                                                                    justifyContent: "start",
                                                                                    alignItems: "center",
                                                                                    height: "8px",
                                                                                    fontSize: "11px",
                                                                                    fontWeight: "800",
                                                                                    marginBottom: "8px",
                                                                                }}
                                                                            >
                                                                                {"•"} {eng}
                                                                            </div>

                                                                            {/* Hindi */}
                                                                            <div
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "start",
                                                                                    height: "8px",
                                                                                    fontSize: "10px",
                                                                                    fontWeight: "800",
                                                                                    marginTop: "2px",
                                                                                    marginBottom: "14px",
                                                                                }}
                                                                            >
                                                                                {hindi}
                                                                            </div>
                                                                        </td>

                                                                        {/* Answer Column */}
                                                                        <td
                                                                            style={{
                                                                                width: "5%",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                borderTop: "1px solid #000",
                                                                                borderRight: "1px solid #000",
                                                                                borderBottom: borderBottomStyle,
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                verticalAlign: "top",
                                                                                textAlign: "center",
                                                                            }}
                                                                        >
                                                                            {answer}
                                                                        </td>

                                                                        {/* Remarks Column */}
                                                                        <td
                                                                            style={{
                                                                                width: "auto",
                                                                                paddingTop: "0px",
                                                                                borderTop: "1px solid #000",
                                                                                borderRight: "1px solid #000",
                                                                                borderBottom: borderBottomStyle,
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                verticalAlign: "top",
                                                                                textAlign: "center",
                                                                            }}
                                                                        >
                                                                            {remarks}
                                                                        </td>
                                                                    </tr>

                                                                    //       <tr key={i}>
                                                                    // {/* Question Column */}
                                                                    // <td
                                                                    //   style={{
                                                                    //     width: "90%",
                                                                    //     paddingLeft: "6px",
                                                                    //     paddingTop: "4px",
                                                                    //     paddingBottom: "4px",
                                                                    //     borderTop: "1px solid #000",
                                                                    //     borderLeft: "1px solid #000",
                                                                    //     borderRight: "1px solid #000",
                                                                    //     borderBottom: borderBottomStyle,
                                                                    //     verticalAlign: "top",
                                                                    //   }}
                                                                    // >
                                                                    //   {/* English */}
                                                                    //   <div
                                                                    //     style={{
                                                                    //       fontSize: "11px",
                                                                    //       fontWeight: "800",
                                                                    //       lineHeight: "16px",
                                                                    //       wordBreak: "break-word",
                                                                    //       marginBottom: "2px",
                                                                    //     }}
                                                                    //   >
                                                                    //     • {eng}
                                                                    //   </div>

                                                                    //   {/* Hindi */}
                                                                    //   <div
                                                                    //     style={{
                                                                    //       fontSize: "10px",
                                                                    //       fontWeight: "800",
                                                                    //       lineHeight: "15px",
                                                                    //       wordBreak: "break-word",
                                                                    //       marginBottom:"8px"
                                                                    //     }}
                                                                    //   >
                                                                    //     {hindi}
                                                                    //   </div>
                                                                    // </td>

                                                                    // {/* Answer Column */}
                                                                    // <td
                                                                    //   style={{
                                                                    //     width: "5%",
                                                                    //     padding: "4px",
                                                                    //     borderTop: "1px solid #000",
                                                                    //     borderRight: "1px solid #000",
                                                                    //     borderBottom: borderBottomStyle,
                                                                    //     fontSize: "11px",
                                                                    //     fontWeight: "400",
                                                                    //     verticalAlign: "middle",
                                                                    //     textAlign: "center",
                                                                    //     whiteSpace: "nowrap",
                                                                    //   }}
                                                                    // >
                                                                    //   {answer}
                                                                    // </td>

                                                                    // {/* Remarks Column */}
                                                                    // <td
                                                                    //   style={{
                                                                    //     width: "15%",
                                                                    //     padding: "4px",
                                                                    //     borderTop: "1px solid #000",
                                                                    //     borderRight: "1px solid #000",
                                                                    //     borderBottom: borderBottomStyle,
                                                                    //     fontSize: "11px",
                                                                    //     fontWeight: "400",
                                                                    //     verticalAlign: "middle",
                                                                    //     textAlign: "center",
                                                                    //     wordBreak: "break-word",
                                                                    //   }}
                                                                    // >
                                                                    //   {remarks}
                                                                    // </td>
                                                                    //       </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>

                                                    {/* General Question Remark*/}


                                                    {/* Remarks */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "26px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-13px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            General Question Remark
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            {[
                                                                ["Summary remark", summaryRemark]
                                                            ].map(([s, v], i) => (
                                                                <tr key={i} style={{ height: "8px" }}>
                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            width: "80%",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                            borderRight: "none",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {s}
                                                                        </div>
                                                                    </td>

                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {v}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>


                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            {rows.map(([s, v, x], i) => {
                                                                const borderBottomStyle =
                                                                    i === rows.length - 1 ? "1px solid #000" : "none";

                                                                return (
                                                                    <tr key={i} style={{ height: "8px" }}>
                                                                        <td
                                                                            style={{
                                                                                height: "8px",
                                                                                width: "80%",
                                                                                paddingTop: "0px",
                                                                                paddingLeft: "6px",
                                                                                borderTop: "1px solid #000",
                                                                                borderLeft: "1px solid #000",
                                                                                borderRight: "1px solid #000",
                                                                                borderBottom: borderBottomStyle,
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    height: "8px",
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "start",
                                                                                    fontSize: "11px",
                                                                                    fontWeight: "800",
                                                                                    marginBottom: "14px",
                                                                                    textAlign: "start",
                                                                                }}
                                                                            >
                                                                                {s}
                                                                            </div>
                                                                        </td>



                                                                        <td
                                                                            style={{
                                                                                height: "8px",
                                                                                paddingLeft: "6px",
                                                                                borderTop: "1px solid #000",
                                                                                borderRight: "1px solid #000",
                                                                                borderBottom: borderBottomStyle,
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "start",
                                                                                    height: "6px",
                                                                                    fontSize: "11px",
                                                                                    marginBottom: "14px",
                                                                                    textAlign: "start",
                                                                                    fontWeight: "400",
                                                                                }}
                                                                            >
                                                                                {s === "height"
                                                                                    ? v != null && v !== "" && x != null && x !== ""
                                                                                        ? `${v} Feet ${x} inch`
                                                                                        : "..."
                                                                                    : v || "..."}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </>
                                            );
                                        }

                                        // Tongue_Pulse_Eyes_Nails

                                        if (header === "Tongue_Pulse_Eyes_Nails") {
                                            const pulseData = (meta_value?.pulse ?? {}) as Record<
                                                string,
                                                string | number | undefined
                                            >;

                                            const tongueData = (meta_value?.tongueList ?? {}) as Record<
                                                string,
                                                string | number | undefined
                                            >;

                                            const headings = Object.keys(pulseData).map((key) =>
                                                key.replaceAll("_", " ")
                                            );

                                            const values = Object.values(pulseData);

                                            const summaryRemark = meta_value?.Tongue?.summary_remark || "...";

                                            return (
                                                <>
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "26px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-13px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            Pulse
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    <table
                                                        style={{
                                                            width: "100%",
                                                            borderCollapse: "collapse",
                                                        }}
                                                    >
                                                        <tbody>
                                                            {/* Heading Row */}
                                                            <tr>
                                                                {headings.map((heading, i) => (
                                                                    <td
                                                                        key={i}
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            borderBottom: "none",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {heading}
                                                                        </div>
                                                                    </td>
                                                                ))}
                                                            </tr>

                                                            {/* Value Row */}
                                                            <tr>
                                                                {values.map((value, i) => (
                                                                    <td
                                                                        key={i}
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {value != null && value !== ""
                                                                                ? String(value)
                                                                                : "."}
                                                                        </div>
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    {/* Tongue Details */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-15px",
                                                                padding: "8px 0px 8px 2px",
                                                            }}
                                                        >
                                                            Tongue Details
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            {Object.entries(tongueData).map(([key, value], i) => (
                                                                <tr key={i} style={{ height: "8px" }}>
                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            width: "40%",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                            borderRight: "none",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {key.replaceAll("_", " ")}
                                                                        </div>
                                                                    </td>

                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {value != null && value !== ""
                                                                                ? String(value)
                                                                                : "-"}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {/* Remarks */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-15px",
                                                                padding: "8px 0px 8px 2px",
                                                            }}
                                                        >
                                                            Tongue Pulse Remarks
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    {/* Summary remark */}
                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            {[["Summary remark", summaryRemark]].map(([s, v], i) => (
                                                                <tr key={i} style={{ height: "8px" }}>
                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            width: "80%",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                            borderRight: "none",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {s}
                                                                        </div>
                                                                    </td>

                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {v}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </>
                                            );
                                        }

                                        // Patient_Full_History
                                        // if (header == "Patient_Full_History") {

                                        //   const Chief_Complaints = meta_value?.Chief_Complaints || {};
                                        //   const headings = Object.keys(Chief_Complaints).map((key) =>
                                        //     key.replaceAll("_", " ")
                                        //   );

                                        //   const values = Object.values(Chief_Complaints).map(
                                        //     (value) => Array.isArray(value) ? value[0] : value
                                        //   );
                                        //   return (
                                        //     <>
                                        //       <div
                                        //         style={{
                                        //           color: "#fff",
                                        //           background: "#003366",
                                        //           marginTop: "26px",
                                        //         }}
                                        //       >
                                        //         <h4
                                        //           style={{
                                        //             margin: "0px",
                                        //             fontSize: "12px",
                                        //             fontWeight: 700,
                                        //             marginTop: "-13px",
                                        //             padding: "7px 0px 7px 2px",
                                        //           }}
                                        //         >
                                        //           Chief Complaints (मुख्य शिकायतें)
                                        //         </h4>
                                        //       </div>

                                        //       {/* Formatted diet date */}
                                        //       <div
                                        //         style={{
                                        //           color: "#fff",
                                        //           background: "#36454F",
                                        //           marginTop: "18px",
                                        //           marginBottom: "12px",
                                        //         }}
                                        //       >
                                        //         <h4
                                        //           style={{
                                        //             margin: "0px",
                                        //             fontSize: "11px",
                                        //             fontWeight: 400,
                                        //             marginTop: "-14px",
                                        //             padding: "7px 0px 7px 2px",
                                        //           }}
                                        //         >
                                        //           {FormatteddietDate}
                                        //         </h4>
                                        //       </div>

                                        //       <table
                                        //         style={{
                                        //           width: "100%",
                                        //           borderCollapse: "collapse",
                                        //         }}
                                        //       >
                                        // <tbody>
                                        //   {/* Heading Row */}
                                        //   <tr>
                                        //     {headings.map((heading, i) => (
                                        //        <td
                                        //        style={{
                                        //          height: "8px",
                                        //          paddingTop: "0px",
                                        //          paddingLeft: "6px",
                                        //          border: "1px solid #000",
                                        //          borderBottom:"none",
                                        //          fontSize: "11px",
                                        //          fontWeight: "800",
                                        //        }}
                                        //      >
                                        //        <div
                                        //          style={{
                                        //            display: "flex",
                                        //            alignItems: "center",
                                        //            justifyContent: "start",
                                        //            height: "8px",
                                        //            paddingTop: "0px",
                                        //            fontSize: "11px",
                                        //            fontWeight: "800",
                                        //            marginBottom: "14px",
                                        //            marginTop: "0px",
                                        //            textAlign: "start",
                                        //          }}
                                        //        >
                                        //          {heading}
                                        //          </div>
                                        //      </td>
                                        //     ))}
                                        //   </tr>

                                        //   {/* Value Row */}
                                        //   <tr>
                                        //     {values.map((value, i) => (
                                        //       <td
                                        //       style={{
                                        //         height: "8px",
                                        //         paddingTop: "0px",
                                        //         paddingLeft: "6px",
                                        //         border: "1px solid #000",
                                        //         fontSize: "11px",
                                        //         fontWeight: "400",
                                        //       }}
                                        //     >
                                        //       <div
                                        //         style={{
                                        //           display: "flex",
                                        //           alignItems: "center",
                                        //           justifyContent: "start",
                                        //           height: "8px",
                                        //           paddingTop: "0px",
                                        //           fontSize: "11px",
                                        //           fontWeight: "400",
                                        //           marginBottom: "14px",
                                        //           marginTop: "0px",
                                        //           textAlign: "start",
                                        //         }}
                                        //       >
                                        //         {value || "."}
                                        //         </div>
                                        //     </td>
                                        //     ))}
                                        //   </tr>
                                        // </tbody>
                                        // </table>
                                        //    </>
                                        //   );
                                        // }

                                        if (header == "Patient_Full_History") {

                                            const sectionTitles = {
                                                Chief_Complaints: "Chief Complaints (मुख्य शिकायतें)",
                                                HistoryOfPresent: "History Of Present illness (वर्तमान बीमारी का इतिहास)",
                                                PastMedicalHistory: "Past Medical History (पिछला मेडिकल इतिहास)",
                                                Surgeries: "Surgeries",
                                                Allergies: "Allergies",
                                                MedicationHistory: "Medication History (दवा का इतिहास)",
                                                PreviousHospitalisation: "Previous Hospitalisation (पिछला अस्पताल में भर्ती)",
                                                Dharan: "धारण/Duration",
                                            };

                                            const sectionOrder = [
                                                "Chief_Complaints",
                                                "HistoryOfPresent",
                                                "PastMedicalHistory",
                                                "Surgeries",
                                                "Allergies",
                                                "MedicationHistory",
                                                "PreviousHospitalisation",
                                                "Dharan",
                                            ];

                                            return (
                                                <>
                                                    {sectionOrder.map((sectionKey, sectionIndex) => {

                                                        const sectionValue = meta_value?.[sectionKey];

                                                        if (!sectionValue || typeof sectionValue !== "object") return null;

                                                        const headings = Object.keys(sectionValue).map((key) =>
                                                            key.replaceAll("_", " ")
                                                        );

                                                        const values = Object.values(sectionValue).map((value) => {
                                                            if (Array.isArray(value)) {
                                                                return value[0] || ".";
                                                            }

                                                            return value || ".";
                                                        });

                                                        return (
                                                            <div key={sectionIndex}>
                                                                {/* Section Heading */}

                                                                <div
                                                                    style={{
                                                                        color: "#fff",
                                                                        background: "#003366",
                                                                        marginTop: "20px",
                                                                        height: "22px",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        paddingLeft: "2px",
                                                                        paddingTop: "0px",
                                                                    }}
                                                                >
                                                                    <h4
                                                                        style={{
                                                                            margin: "0px",
                                                                            fontSize: "12px",
                                                                            fontWeight: 700,
                                                                            padding: "0px",
                                                                            marginBottom: "14px",
                                                                        }}
                                                                    >
                                                                        {sectionTitles[sectionKey as keyof typeof sectionTitles]}
                                                                    </h4>
                                                                </div>


                                                                {/* FormatteddietDate */}
                                                                <div
                                                                    style={{
                                                                        color: "#fff",
                                                                        background: "#36454F",
                                                                        marginTop: "20px",
                                                                        height: "16px",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        paddingLeft: "2px",
                                                                        paddingTop: "0px",
                                                                        marginBottom: "12px",
                                                                    }}
                                                                >
                                                                    <h4
                                                                        style={{
                                                                            margin: "0px",
                                                                            fontSize: "11px",
                                                                            fontWeight: 400,
                                                                            padding: "0px",
                                                                            marginBottom: "12px",
                                                                        }}
                                                                    >
                                                                        {FormatteddietDate}
                                                                    </h4>
                                                                </div>




                                                                {/* Table */}
                                                                <table
                                                                    style={{
                                                                        width: "100%",
                                                                        borderCollapse: "collapse",
                                                                        marginBottom: "16px",
                                                                        tableLayout: "fixed",
                                                                    }}
                                                                >
                                                                    <tbody>
                                                                        {/* Heading Row */}
                                                                        <tr>
                                                                            {headings.map((heading, i) => (
                                                                                <td
                                                                                    key={i}
                                                                                    style={{
                                                                                        border: "1px solid #000",
                                                                                        paddingTop: "0px",
                                                                                        paddingLeft: "6px",
                                                                                        fontSize: "11px",
                                                                                        fontWeight: "800",
                                                                                        height: "24px",
                                                                                        width: `${100 / headings.length}%`,
                                                                                    }}
                                                                                >
                                                                                    <div
                                                                                        style={{
                                                                                            height: "8px",
                                                                                            paddingTop: "0px",
                                                                                            display: "flex",
                                                                                            alignItems: "center",
                                                                                            gap: "4px",
                                                                                            marginBottom: "14px",
                                                                                            wordBreak: "break-word",
                                                                                        }}
                                                                                    >
                                                                                        {heading}
                                                                                    </div>
                                                                                </td>
                                                                            ))}
                                                                        </tr>

                                                                        {/* Value Row */}
                                                                        <tr>
                                                                            {values.map((value, i) => (
                                                                                <td
                                                                                    key={i}
                                                                                    style={{
                                                                                        border: "1px solid #000",
                                                                                        paddingTop: "0px",
                                                                                        paddingLeft: "6px",
                                                                                        fontSize: "11px",
                                                                                        fontWeight: "400",
                                                                                        height: "24px",
                                                                                        width: `${100 / values.length}%`,
                                                                                    }}
                                                                                >
                                                                                    <div
                                                                                        style={{
                                                                                            height: "8px",
                                                                                            paddingTop: "0px",
                                                                                            display: "flex",
                                                                                            alignItems: "center",
                                                                                            gap: "4px",
                                                                                            marginBottom: "14px",
                                                                                            wordBreak: "break-word",
                                                                                        }}
                                                                                    >
                                                                                        • {value || "."}
                                                                                    </div>
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            );
                                        }

                                        // Gastroenterology_Digestion
                                        if (header == "Gastroenterology_Digestion") {
                                            const summaryRemark = meta_value?.NutritionalAssessmentForm?.summary_remark || "";
                                            const sectionTitles: any = {
                                                gastroenterology:
                                                    "Gastroenterology/Digestion/Excreatory System (गैस्ट्रोएंटरोलॉजी/पाचन/उत्सर्जन प्रणाली)",

                                                pulmonary_system:
                                                    "Pulmonary System (फुफ्फुसीय प्रणाली)",
                                            };

                                            const defaultSymptoms: any = {
                                                gastroenterology: [
                                                    "hyperacidity",
                                                    "heart_burn",
                                                    "ulcer",
                                                    "gerd",
                                                    "gastritis",
                                                    "ibs",
                                                    "loss_of_appetite",
                                                    "pain_abdomen_area",
                                                    "nausea",
                                                    "vomiting",
                                                    "bloating",
                                                    "swollen_belly",
                                                    "indigestion",
                                                    "constipation",
                                                    "loose_stool",
                                                ],

                                                pulmonary_system: [
                                                    "shortness_of_breath",
                                                    "fever",
                                                    "cough",
                                                    "chest_pain_dull",
                                                    "fatigue",
                                                    "asthma",
                                                    "pleural_effusion",
                                                    "crackles",
                                                    "wheeze",
                                                    "rhonchi",
                                                ],
                                            };

                                            return (
                                                <>
                                                    {Object.entries(defaultSymptoms).map(
                                                        ([sectionKey, symptoms]: any, sectionIndex) => {
                                                            const sectionData = meta_value?.[sectionKey] || {};

                                                            return (
                                                                <div key={sectionIndex}>
                                                                    <div
                                                                        style={{
                                                                            color: "#fff",
                                                                            background: "#003366",
                                                                            marginTop: "26px",
                                                                            height: "22px",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            paddingLeft: "2px",
                                                                            paddingTop: "0px",
                                                                        }}
                                                                    >
                                                                        <h4
                                                                            style={{
                                                                                margin: "0px",
                                                                                fontSize: "12px",
                                                                                fontWeight: 700,
                                                                                padding: "0px",
                                                                                marginBottom: "14px",
                                                                            }}
                                                                        >
                                                                            {sectionTitles?.[sectionKey]}
                                                                        </h4>
                                                                    </div>

                                                                    {/* FormatteddietDate */}
                                                                    <div
                                                                        style={{
                                                                            color: "#fff",
                                                                            background: "#36454F",
                                                                            marginTop: "26px",
                                                                            height: "16px",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            paddingLeft: "2px",
                                                                            paddingTop: "0px",
                                                                            marginBottom: "12px",
                                                                        }}
                                                                    >
                                                                        <h4
                                                                            style={{
                                                                                margin: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: 400,
                                                                                padding: "0px",
                                                                                marginBottom: "12px",
                                                                            }}
                                                                        >
                                                                            {FormatteddietDate}
                                                                        </h4>
                                                                    </div>

                                                                    <table
                                                                        style={{
                                                                            width: "100%",
                                                                            borderCollapse: "collapse",
                                                                        }}
                                                                    >
                                                                        <tbody>
                                                                            {Array.from({
                                                                                length: Math.ceil(symptoms.length / 5),
                                                                            }).map((_, rowIndex) => (
                                                                                <tr key={rowIndex}>
                                                                                    {symptoms
                                                                                        .slice(rowIndex * 5, rowIndex * 5 + 5)
                                                                                        .map((key: any, i: number) => {
                                                                                            const value = sectionData?.[key];

                                                                                            return (
                                                                                                <td
                                                                                                    key={i}
                                                                                                    style={{
                                                                                                        border: "1px solid #000",
                                                                                                        paddingTop: "0px",
                                                                                                        paddingLeft: "6px",
                                                                                                        fontSize: "11px",
                                                                                                        fontWeight: "400",
                                                                                                        height: "24px",
                                                                                                        width: "20%",
                                                                                                    }}
                                                                                                >
                                                                                                    <div
                                                                                                        style={{
                                                                                                            height: "8px",
                                                                                                            paddingTop: "0px",
                                                                                                            display: "flex",
                                                                                                            alignItems: "center",
                                                                                                            gap: "4px",
                                                                                                            marginBottom: "14px",
                                                                                                        }}
                                                                                                    >
                                                                                                        <span>
                                                                                                            {key
                                                                                                                .replaceAll("_", " ")
                                                                                                                .replace(/\b\w/g, (c: string) =>
                                                                                                                    c.toUpperCase()
                                                                                                                )}
                                                                                                        </span>

                                                                                                        <span
                                                                                                            style={{
                                                                                                                color:
                                                                                                                    value === "Yes"
                                                                                                                        ? "green"
                                                                                                                        : "red",
                                                                                                                fontWeight: "800",
                                                                                                            }}
                                                                                                        >
                                                                                                            {value === "Yes" ? "✓" : "✕"}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </td>
                                                                                            );
                                                                                        })}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            );
                                                        }
                                                    )}

                                                    {/* Remarks */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-15px",
                                                                padding: "8px 0px 8px 2px",
                                                            }}
                                                        >
                                                            Gastroenterology Digestion Remarks
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    {/* Summary remark */}
                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            {[["Summary remark", summaryRemark]].map(([s, v], i) => (
                                                                <tr key={i} style={{ height: "8px" }}>
                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            width: "80%",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                            borderRight: "none",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {s}
                                                                        </div>
                                                                    </td>

                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {v}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </>
                                            );
                                        }

                                        if (header === "Investigation") {

                                            const dietDate = meta_value?.diet_history?.Date?.[0] || "";

                                            const summaryRemark =
                                                meta_value?.NutritionalAssessmentForm?.summary_remark || "";

                                            const labSections = [
                                                {
                                                    title: "LIVER FUNCTION TEST - LFT",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "Total Bilirubin",
                                                        "Direct Binrubin,Indirect Bilirubin",
                                                        "Total Protein",
                                                        "Albumin",
                                                        "SGOT (Serum Glutamic Oxaloacetic Transaminase) Ast (Aspartate Transaminase)",
                                                        "SGPT (Serum Glutamate Pyruvate Transaminase) Alt (Alanine Transaminase)",
                                                        "Alkaline Phosphates",
                                                        "GGT (Gamma Glutamyl Transferase)",
                                                    ],
                                                },

                                                {
                                                    title: "UPID PROFILE",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "S. Cholesterol",
                                                        "S. Triglycerides",
                                                        "HDL Cholesterol",
                                                        "LDL Cholesterol",
                                                    ],
                                                },

                                                {
                                                    title: "RENAL TEST",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "Renal Function Test - RFT",
                                                        "Creatinine",
                                                        "Blood Uria",
                                                        "Uric Acid",
                                                        "Albumin-Globulin Ratio",
                                                        "Serum Electrolytes",
                                                        "Sodium (Na)",
                                                        "Potassium (K)",
                                                        "Chloride (Cl)",
                                                        "Magnesium (Mg)",
                                                        "iPTH",
                                                        "GFR",
                                                        "24HR URINE PROTEIN",
                                                        "MICRO ALBUMINURIA",
                                                    ],
                                                },

                                                {
                                                    title: "URINE EXAMINATION",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "Routine Examination",
                                                        "Colour",
                                                        "PH",
                                                        "Ketone Bodies",
                                                        "Glucose",
                                                        "Proteins",
                                                        "Blood",
                                                        "Epithelial Cells",
                                                        "Pus Cells",
                                                        "RBC (Red Blood Cells)",
                                                        "Crystals",
                                                        "URINE CULTURE",
                                                        "UPT - URINE PREGNENCY TEST",
                                                    ],
                                                },

                                                {
                                                    title: "DIABETES",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "C-Peptide",
                                                        "FBS, PP RBS",
                                                        "HbA,C",
                                                        "Fructosamine",
                                                        "Urine - (Sugar - Ketone Bodies)",
                                                    ],
                                                },

                                                {
                                                    title: "CARDIOLOGY",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "Apolipoprotein AI & B",
                                                        "HS-CRP",
                                                        "CPK-MB",
                                                        "Lipe Protein (a)",
                                                        "Troponine I& T",
                                                        "PTI",
                                                        "- S. Triglycerides - HDL - LDL",
                                                        "ECG",
                                                        "Echocardiography",
                                                        "TMT",
                                                        "Angiography",
                                                    ],
                                                },

                                                {
                                                    title: "STOOL EXAMINATION",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "Routine",
                                                        "Colour",
                                                        "Consistency",
                                                        "Odour",
                                                        "Presence Of Mucus",
                                                        "Stool For Occult Blood",
                                                        "Bile",
                                                        "WBC",
                                                        "PH",
                                                        "Ova Cyst",
                                                        "Culture - Find Out Bacteria Immunology - IgM/gG",
                                                        "Torch - Toxoplasma - Rubella - CMV (Cytomegalovirus) - Herpes - Zika Virus",
                                                        "Chikunguniya gG IgM",
                                                        "Hepatitis NB/C/D/E",
                                                        "AFP (alpha-fetoprotein)",
                                                        "HIV",
                                                    ],
                                                },

                                                {
                                                    title: "RHEUMATOLOGY/AUTOIMMUNE DISORDER",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "Anti-CCP (Anti-Cyclic Citrullinated Peptide)",
                                                        "ANA (Anti Nuclear Antibody)",
                                                        "CRP C-Reactive Protein - Qualitative / Quantitative",
                                                        "ESR",
                                                        "HLAB27",
                                                        "Rheumatoid Factor (RF) - Qualitative I Qualitative",
                                                        "Uric Acid",
                                                        "C3 & C4 Complement",
                                                    ],
                                                },

                                                {
                                                    title: "Prostate",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "PSA",
                                                        "Uroflowmetry",
                                                    ],
                                                },

                                                {
                                                    title: "HORMONE PROFILE",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "LH",
                                                        "FSH",
                                                        "Prolactin",
                                                        "Estradiol",
                                                        "Testosterone",
                                                        "Progesterone",
                                                        "AMH",
                                                        "B-HCG",
                                                    ],
                                                },

                                                {
                                                    title: "ENDOCRINOLOGY",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "TSH,T3, T4",
                                                        "Anti TPO",
                                                        "Thyroglobulin",
                                                        "AMH",
                                                        "PTH",
                                                    ],
                                                },

                                                {
                                                    title: "RADIOLOGY",
                                                    color: "#56c7d9",
                                                    items: [
                                                        "USG - Whole Abdomen (TAS) - Transvaginal (TVS)",
                                                        "Follicular Study",
                                                        "Colour Doppler",
                                                        "Echocardiography",
                                                        "Biopsy (small / Large)",
                                                        "FNAC",
                                                        "Pap Smear",
                                                        "CT - Scan",
                                                        "MRI",
                                                        "Pet Scan",
                                                        "Colonoscopy",
                                                        "Sigmoidoscopy",
                                                        "AFP (alpha-fetoprotein)",
                                                        "EEG",
                                                        "MRCP",
                                                        "FIBROSCAN",
                                                        "DTPA Scan for Kidneys",
                                                    ],
                                                },
                                            ];

                                            return (
                                                <>
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "26px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-13px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            Investigation (Blood / Urine Culture) (जांच (रक्त/मूत्र संस्कृति))
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    <div
                                                        style={{
                                                            display: "grid",
                                                            gridTemplateColumns: "repeat(3, 1fr)",
                                                            width: "100%",
                                                            marginTop: "20px",
                                                            columnGap: "40px",
                                                            rowGap: "30px",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "grid",
                                                                gridTemplateColumns: "repeat(3, 1fr)",
                                                                width: "100%",
                                                                marginTop: "20px",
                                                                columnGap: "40px",
                                                                rowGap: "30px",
                                                                pageBreakInside: "auto",
                                                                breakInside: "auto",
                                                            }}
                                                        >
                                                            {labSections.map((section, index) => {

                                                                // Dynamic selected values from API
                                                                const selectedItems =
                                                                    meta_value?.investigation_required?.[section.title] || [];

                                                                return (
                                                                    <div
                                                                        key={index}
                                                                        style={{
                                                                            flex: 1,
                                                                        }}
                                                                    >
                                                                        {/* Section Title */}
                                                                        <div
                                                                            style={{
                                                                                color: section.color,
                                                                                fontSize: "12px",
                                                                                fontWeight: "500",
                                                                                marginBottom: "2px",
                                                                                textTransform: "uppercase",
                                                                            }}
                                                                        >
                                                                            {section.title}
                                                                        </div>

                                                                        {/* Items */}
                                                                        {section.items.map((item, i) => {

                                                                            // Check selected item
                                                                            const isSelected = selectedItems.includes(item);

                                                                            return (
                                                                                <div
                                                                                    key={i}
                                                                                    style={{
                                                                                        display: "flex",
                                                                                        alignItems: "center",
                                                                                        gap: "4px",
                                                                                        fontSize: "11px",
                                                                                        lineHeight: "16px",
                                                                                    }}
                                                                                >
                                                                                    <span
                                                                                        style={{
                                                                                            color:
                                                                                                item === "Renal Function Test - RFT" ||
                                                                                                    item === "Serum Electrolytes" ||
                                                                                                    item === "GFR" ||
                                                                                                    item === "24HR URINE PROTEIN" ||
                                                                                                    item === "MICRO ALBUMINURIA"
                                                                                                    ? "blue"
                                                                                                    : "#000",
                                                                                        }}
                                                                                    >
                                                                                        {item}
                                                                                    </span>

                                                                                    {/* Dynamic Tick/Cross */}
                                                                                    <span
                                                                                        style={{
                                                                                            color: isSelected ? "green" : "#ff4d6d",
                                                                                            fontWeight: "700",
                                                                                        }}
                                                                                    >
                                                                                        {isSelected ? "✓" : "✕"}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>


                                                    {/* Remarks */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-15px",
                                                                padding: "8px 0px 8px 2px",
                                                            }}
                                                        >
                                                            Investigation Remarks
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    {/* Summary remark */}
                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            {[
                                                                ["Summary remark", summaryRemark]
                                                            ].map(([s, v], i) => (
                                                                <tr key={i} style={{ height: "8px" }}>
                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            width: "80%",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                            borderRight: "none",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {s}
                                                                        </div>
                                                                    </td>

                                                                    <td
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {v}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </>
                                            );
                                        }

                                        // Balance_disorders
                                        //  if (header === "Balance_disorders") {

                                        //           const diagnisis = meta_value?.diagnisis || {};

                                        //           const headings = Object.keys(diagnisis).map((key) =>
                                        //             key.replaceAll("_", " ")
                                        //           );

                                        //           const values = Object.values(diagnisis).map(
                                        //             (value) => Array.isArray(value) ? value[0] : value
                                        //           );

                                        //           return (
                                        //             <>
                                        //               <div
                                        //                 style={{
                                        //                   color: "#fff",
                                        //                   background: "#003366",
                                        //                   marginTop: "26px",
                                        //                 }}
                                        //               >
                                        //                 <h4
                                        //                   style={{
                                        //                     margin: "0px",
                                        //                     fontSize: "12px",
                                        //                     fontWeight: 700,
                                        //                     marginTop: "-13px",
                                        //                     padding: "7px 0px 7px 2px",
                                        //                   }}
                                        //                 >
                                        //                   Diagnosis (निदान)
                                        //                 </h4>
                                        //               </div>

                                        //               {/* Formatted diet date */}
                                        //               <div
                                        //                 style={{
                                        //                   color: "#fff",
                                        //                   background: "#36454F",
                                        //                   marginTop: "18px",
                                        //                   marginBottom: "12px",
                                        //                 }}
                                        //               >
                                        //                 <h4
                                        //                   style={{
                                        //                     margin: "0px",
                                        //                     fontSize: "11px",
                                        //                     fontWeight: 400,
                                        //                     marginTop: "-14px",
                                        //                     padding: "7px 0px 7px 2px",
                                        //                   }}
                                        //                 >
                                        //                   {FormatteddietDate}
                                        //                 </h4>
                                        //               </div>

                                        //               <table
                                        //                 style={{
                                        //                   width: "100%",
                                        //                   borderCollapse: "collapse",
                                        //                 }}
                                        //               >
                                        //                 <tbody>
                                        //                   {/* Heading Row */}
                                        //                   <tr>
                                        //                     {headings.map((heading, i) => (
                                        //                       <td
                                        //                         key={i}
                                        //                         style={{
                                        //                           height: "8px",
                                        //                           paddingTop: "0px",
                                        //                           paddingLeft: "6px",
                                        //                           border: "1px solid #000",
                                        //                           borderBottom: "none",
                                        //                           fontSize: "11px",
                                        //                           fontWeight: "800",
                                        //                         }}
                                        //                       >
                                        //                         <div
                                        //                           style={{
                                        //                             display: "flex",
                                        //                             alignItems: "center",
                                        //                             justifyContent: "start",
                                        //                             height: "8px",
                                        //                             paddingTop: "0px",
                                        //                             fontSize: "11px",
                                        //                             fontWeight: "800",
                                        //                             marginBottom: "14px",
                                        //                             marginTop: "0px",
                                        //                             textAlign: "start",
                                        //                           }}
                                        //                         >
                                        //                           {heading}
                                        //                         </div>
                                        //                       </td>
                                        //                     ))}
                                        //                   </tr>

                                        //                   {/* Value Row */}
                                        //                   <tr>
                                        //                     {values.map((value, i) => (
                                        //                       <td
                                        //                         key={i}
                                        //                         style={{
                                        //                           height: "8px",
                                        //                           paddingTop: "0px",
                                        //                           paddingLeft: "6px",
                                        //                           border: "1px solid #000",
                                        //                           fontSize: "11px",
                                        //                           fontWeight: "400",
                                        //                         }}
                                        //                       >
                                        //                         <div
                                        //                           style={{
                                        //                             display: "flex",
                                        //                             alignItems: "center",
                                        //                             justifyContent: "start",
                                        //                             height: "8px",
                                        //                             paddingTop: "0px",
                                        //                             fontSize: "11px",
                                        //                             fontWeight: "400",
                                        //                             marginBottom: "14px",
                                        //                             marginTop: "0px",
                                        //                             textAlign: "start",
                                        //                           }}
                                        //                         >
                                        //                           {value || "."}
                                        //                         </div>
                                        //                       </td>
                                        //                     ))}
                                        //                   </tr>
                                        //                 </tbody>
                                        //               </table>
                                        //             </>
                                        //           );
                                        //         }



                                        if (header == "Balance_disorders") {

                                            const sectionTitles = {
                                                Balance_disorders: "Balance disorders (संतुलन िवकार)",
                                                balanceDisorder: "Balance disorders Remarks",
                                                coordinatien: "Coordination (समन्वय)",
                                                pain_scale_simple: "Pain Scale",
                                                pain_scale: "Pain Scale",
                                                diagnisis: "Diagnosis",
                                            };

                                            const sectionOrder = [
                                                "Balance_disorders",
                                                "balanceDisorder",
                                                "coordinatien",
                                                "pain_scale_simple",
                                                "pain_scale",
                                                "diagnisis",
                                            ];

                                            return (
                                                <>
                                                    {sectionOrder.map((sectionKey, sectionIndex) => {

                                                        const sectionValue = meta_value?.[sectionKey === "pain_scale_simple" ? "pain_scale" : sectionKey];

                                                        if (!sectionValue || typeof sectionValue !== "object") {
                                                            return null;
                                                        }

                                                        const headings = Object.keys(sectionValue).map((key) =>
                                                            key.replaceAll("_", " ")
                                                        );

                                                        const values = Object.values(sectionValue).map((value) => {
                                                            if (Array.isArray(value)) {
                                                                return value[0] || ".";
                                                            }
                                                            return value || ".";
                                                        });

                                                        return (
                                                            <div key={sectionIndex}>

                                                                {/* Section Heading */}
                                                                <div
                                                                    style={{
                                                                        color: "#fff",
                                                                        background: "#003366",
                                                                        marginTop: "20px",
                                                                        height: "22px",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        paddingLeft: "2px",
                                                                        paddingTop: "0px",
                                                                    }}
                                                                >
                                                                    <h4
                                                                        style={{
                                                                            margin: "0px",
                                                                            fontSize: "12px",
                                                                            fontWeight: 700,
                                                                            padding: "0px",
                                                                            marginBottom: "14px",
                                                                        }}
                                                                    >
                                                                        {sectionTitles[sectionKey as keyof typeof sectionTitles]}
                                                                    </h4>
                                                                </div>

                                                                {/* FormatteddietDate */}
                                                                <div
                                                                    style={{
                                                                        color: "#fff",
                                                                        background: "#36454F",
                                                                        marginTop: "20px",
                                                                        height: "16px",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        paddingLeft: "2px",
                                                                        paddingTop: "0px",
                                                                        marginBottom: "12px",
                                                                    }}
                                                                >
                                                                    <h4
                                                                        style={{
                                                                            margin: "0px",
                                                                            fontSize: "11px",
                                                                            fontWeight: 400,
                                                                            padding: "0px",
                                                                            marginBottom: "12px",
                                                                        }}
                                                                    >
                                                                        {FormatteddietDate}
                                                                    </h4>
                                                                </div>

                                                                {/* Pain Scale Tick/Cross Table */}
                                                                {sectionKey === "pain_scale" ? (
                                                                    <>
                                                                        <table
                                                                            style={{
                                                                                width: "100%",
                                                                                borderCollapse: "collapse",
                                                                            }}
                                                                        >
                                                                            <tbody>
                                                                                {[
                                                                                    {
                                                                                        label: "No Pain (कोई दर्द नहीं)",
                                                                                        range: "0",
                                                                                        selected: sectionValue?.no_pain === "Yes",
                                                                                    },
                                                                                    {
                                                                                        label: "Mild (हल्का)",
                                                                                        range: "1-3",
                                                                                        selected: sectionValue?.mild === "Yes",
                                                                                    },
                                                                                    {
                                                                                        label: "Moderate Severe (मध्यम गंभीर)",
                                                                                        range: "4-6",
                                                                                        selected: sectionValue?.moderate_severe === "Yes",
                                                                                    },
                                                                                    {
                                                                                        label: "Very Severe (काफी गंभीर)",
                                                                                        range: "7-9",
                                                                                        selected: sectionValue?.very_severe === "Yes",
                                                                                    },
                                                                                    {
                                                                                        label: "Worst Possible (सबसे खराब संभव)",
                                                                                        range: "10",
                                                                                        selected: sectionValue?.worst_possible === "Yes",
                                                                                    },
                                                                                ].map((item, i) => (
                                                                                    <tr key={i} style={{ height: "8px" }}>

                                                                                        {/* Label */}
                                                                                        <td
                                                                                            style={{
                                                                                                height: "8px",
                                                                                                width: "40%",
                                                                                                paddingTop: "0px",
                                                                                                paddingLeft: "6px",
                                                                                                border: "1px solid #000",
                                                                                                fontSize: "11px",
                                                                                                fontWeight: "800",
                                                                                            }}
                                                                                        >
                                                                                            <div
                                                                                                style={{
                                                                                                    display: "flex",
                                                                                                    alignItems: "center",
                                                                                                    justifyContent: "start",
                                                                                                    height: "8px",
                                                                                                    paddingTop: "0px",
                                                                                                    fontSize: "11px",
                                                                                                    fontWeight: "800",
                                                                                                    marginBottom: "14px",
                                                                                                    marginTop: "0px",
                                                                                                    textAlign: "start",
                                                                                                }}
                                                                                            >
                                                                                                {item.label}
                                                                                            </div>
                                                                                        </td>

                                                                                        {/* Range */}
                                                                                        <td
                                                                                            style={{
                                                                                                height: "8px",
                                                                                                width: "30%",
                                                                                                paddingTop: "0px",
                                                                                                paddingLeft: "6px",
                                                                                                border: "1px solid #000",
                                                                                                fontSize: "11px",
                                                                                                fontWeight: "400",
                                                                                                textAlign: "center",
                                                                                            }}
                                                                                        >
                                                                                            <div
                                                                                                style={{
                                                                                                    display: "flex",
                                                                                                    alignItems: "center",
                                                                                                    justifyContent: "center",
                                                                                                    height: "8px",
                                                                                                    paddingTop: "0px",
                                                                                                    fontSize: "11px",
                                                                                                    fontWeight: "400",
                                                                                                    marginBottom: "14px",
                                                                                                    marginTop: "0px",
                                                                                                }}
                                                                                            >
                                                                                                {item.range}
                                                                                            </div>
                                                                                        </td>

                                                                                        {/* Tick / Cross */}
                                                                                        <td
                                                                                            style={{
                                                                                                height: "8px",
                                                                                                width: "30%",
                                                                                                paddingTop: "0px",
                                                                                                paddingLeft: "6px",
                                                                                                border: "1px solid #000",
                                                                                                fontSize: "11px",
                                                                                                fontWeight: "400",
                                                                                                textAlign: "center",
                                                                                            }}
                                                                                        >
                                                                                            <div
                                                                                                style={{
                                                                                                    display: "flex",
                                                                                                    alignItems: "center",
                                                                                                    justifyContent: "center",
                                                                                                    height: "8px",
                                                                                                    paddingTop: "0px",
                                                                                                    fontSize: "11px",
                                                                                                    fontWeight: "400",
                                                                                                    marginBottom: "14px",
                                                                                                    marginTop: "0px",
                                                                                                    color: item.selected ? "green" : "red",
                                                                                                }}
                                                                                            >
                                                                                                {item.selected ? "✔" : "✘"}
                                                                                            </div>
                                                                                        </td>

                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </>

                                                                ) : sectionKey === "balanceDisorder" ? (

                                                                    /* Summary remark */
                                                                    <table style={{ width: "100%" }}>
                                                                        <tbody>
                                                                            {[
                                                                                [
                                                                                    "Summary remark",
                                                                                    sectionValue?.summary_remark || ".",
                                                                                ],
                                                                            ].map(([s, v], i) => (
                                                                                <tr key={i} style={{ height: "8px" }}>

                                                                                    <td
                                                                                        style={{
                                                                                            height: "8px",
                                                                                            width: "80%",
                                                                                            paddingTop: "0px",
                                                                                            paddingLeft: "6px",
                                                                                            border: "1px solid #000",
                                                                                            fontSize: "11px",
                                                                                            fontWeight: "800",
                                                                                            borderRight: "none",
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={{
                                                                                                display: "flex",
                                                                                                alignItems: "center",
                                                                                                justifyContent: "start",
                                                                                                height: "8px",
                                                                                                paddingTop: "0px",
                                                                                                fontSize: "11px",
                                                                                                fontWeight: "800",
                                                                                                marginBottom: "14px",
                                                                                                marginTop: "0px",
                                                                                                textAlign: "start",
                                                                                            }}
                                                                                        >
                                                                                            {s}
                                                                                        </div>
                                                                                    </td>

                                                                                    <td
                                                                                        style={{
                                                                                            height: "8px",
                                                                                            paddingTop: "0px",
                                                                                            paddingLeft: "6px",
                                                                                            border: "1px solid #000",
                                                                                            fontSize: "11px",
                                                                                            fontWeight: "400",
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={{
                                                                                                display: "flex",
                                                                                                alignItems: "center",
                                                                                                justifyContent: "start",
                                                                                                height: "8px",
                                                                                                paddingTop: "0px",
                                                                                                fontSize: "11px",
                                                                                                fontWeight: "400",
                                                                                                marginBottom: "14px",
                                                                                                marginTop: "0px",
                                                                                                textAlign: "start",
                                                                                            }}
                                                                                        >
                                                                                            {v}
                                                                                        </div>
                                                                                    </td>

                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>

                                                                ) : (

                                                                    /* Normal Table (used for Balance_disorders, coordinatien, diagnisis, pain_scale_simple) */
                                                                    <table
                                                                        style={{
                                                                            width: "100%",
                                                                            borderCollapse: "collapse",
                                                                            marginBottom: "16px",
                                                                            tableLayout: "fixed",
                                                                        }}
                                                                    >
                                                                        <tbody>

                                                                            {/* Heading Row */}
                                                                            <tr>
                                                                                {headings.map((heading, i) => (
                                                                                    <td
                                                                                        key={i}
                                                                                        style={{
                                                                                            border: "1px solid #000",
                                                                                            paddingTop: "0px",
                                                                                            paddingLeft: "6px",
                                                                                            fontSize: "11px",
                                                                                            fontWeight: "800",
                                                                                            height: "24px",
                                                                                            width: `${100 / headings.length}%`,
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={{
                                                                                                height: "8px",
                                                                                                paddingTop: "0px",
                                                                                                display: "flex",
                                                                                                alignItems: "center",
                                                                                                gap: "4px",
                                                                                                marginBottom: "14px",
                                                                                                wordBreak: "break-word",
                                                                                            }}
                                                                                        >
                                                                                            {heading}
                                                                                        </div>
                                                                                    </td>
                                                                                ))}
                                                                            </tr>

                                                                            {/* Value Row */}
                                                                            <tr>
                                                                                {values.map((value, i) => (
                                                                                    <td
                                                                                        key={i}
                                                                                        style={{
                                                                                            border: "1px solid #000",
                                                                                            paddingTop: "0px",
                                                                                            paddingLeft: "6px",
                                                                                            fontSize: "11px",
                                                                                            fontWeight: "400",
                                                                                            height: "24px",
                                                                                            width: `${100 / values.length}%`,
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={{
                                                                                                height: "8px",
                                                                                                paddingTop: "0px",
                                                                                                display: "flex",
                                                                                                alignItems: "center",
                                                                                                gap: "4px",
                                                                                                marginBottom: "14px",
                                                                                                wordBreak: "break-word",
                                                                                            }}
                                                                                        >
                                                                                            • {String(value || ".")}
                                                                                        </div>
                                                                                    </td>
                                                                                ))}
                                                                            </tr>

                                                                        </tbody>
                                                                    </table>

                                                                )}

                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            );
                                        }

                                        // Treatment
                                        //   if (header === "Treatment") {
                                        //     const summaryRemark =  meta_value?.NutritionalAssessmentForm?.summary_remark || "";
                                        //     // Dynamic meta_value
                                        //     const dynamicSections = (meta_value ?? {}) as IafDynamicSectionsMap;

                                        //     return (
                                        //       <>

                                        //         <div
                                        //           style={{
                                        //             color: "#fff",
                                        //             background: "#003366",
                                        //             marginTop: "26px",
                                        //           }}
                                        //         >
                                        //           <h4
                                        //             style={{
                                        //               margin: "0px",
                                        //               fontSize: "12px",
                                        //               fontWeight: 700,
                                        //               marginTop: "-13px",
                                        //               padding: "7px 0px 7px 2px",
                                        //             }}
                                        //           >
                                        //             Treatment (इलाज)
                                        //           </h4>
                                        //         </div>

                                        //         {/* FormatteddietDate */}
                                        //         <div
                                        //           style={{
                                        //             color: "#fff",
                                        //             background: "#36454F",
                                        //             marginTop: "18px",
                                        //             marginBottom: "12px",
                                        //           }}
                                        //         >
                                        //           <h4
                                        //             style={{
                                        //               margin: "0px",
                                        //               fontSize: "11px",
                                        //               fontWeight: 400,
                                        //               marginTop: "-14px",
                                        //               padding: "7px 0px 7px 2px",
                                        //             }}
                                        //           >
                                        //             {FormatteddietDate}
                                        //           </h4>
                                        //         </div>

                                        //         {Object.entries(dynamicSections).map(
                                        //           ([sectionName, diagnisis], sectionIndex) => {

                                        //             // Medicine first
                                        //             const headings = [
                                        //               "Medicine",
                                        //               ...Object.keys(diagnisis).filter(
                                        //                 (key) => key !== "Medicine"
                                        //               ),
                                        //             ];

                                        //             // Get max rows
                                        //             const maxRows = Math.max(
                                        //               ...Object.values(diagnisis).map((arr) =>
                                        //                 Array.isArray(arr) ? arr.length : 1
                                        //               )
                                        //             );

                                        //             return (
                                        //               <div key={sectionIndex}>

                                        //                 {/* Section Header */}
                                        //                 <div
                                        //                   style={{
                                        //                     color: "#fff",
                                        //                     background: "#003366",
                                        //                     marginTop: "26px",
                                        //                   }}
                                        //                 >
                                        //                   <h4
                                        //                     style={{
                                        //                       margin: "0px",
                                        //                       fontSize: "12px",
                                        //                       fontWeight: 700,
                                        //                       marginTop: "-13px",
                                        //                       padding: "7px 0px 7px 2px",
                                        //                       textTransform: "capitalize",
                                        //                     }}
                                        //                   >
                                        //                     {sectionName.replaceAll("_", " ")}
                                        //                   </h4>
                                        //                 </div>

                                        //                 {/* Formatted diet date */}
                                        //                 <div
                                        //                   style={{
                                        //                     color: "#fff",
                                        //                     background: "#36454F",
                                        //                     marginTop: "18px",
                                        //                     marginBottom: "12px",
                                        //                   }}
                                        //                 >
                                        //                   <h4
                                        //                     style={{
                                        //                       margin: "0px",
                                        //                       fontSize: "11px",
                                        //                       fontWeight: 400,
                                        //                       marginTop: "-14px",
                                        //                       padding: "7px 0px 7px 2px",
                                        //                     }}
                                        //                   >
                                        //                     {FormatteddietDate}
                                        //                   </h4>
                                        //                 </div>

                                        //                 <table
                                        //                   style={{
                                        //                     width: "100%",
                                        //                     borderCollapse: "collapse",
                                        //                   }}
                                        //                 >
                                        //                   <tbody>

                                        //                     {/* Heading Row */}
                                        //                     <tr>

                                        //                       {headings.map((heading, i) => (
                                        //                         <td
                                        //                           key={i}
                                        //                           style={{
                                        //                             height: "8px",
                                        //                             paddingTop: "0px",
                                        //                             paddingLeft: "6px",
                                        //                             border: "1px solid #000",
                                        //                             borderBottom: "none",
                                        //                             fontSize: "11px",
                                        //                             fontWeight: "800",
                                        //                           }}
                                        //                         >
                                        //                           <div
                                        //                             style={{
                                        //                               display: "flex",
                                        //                               alignItems: "center",
                                        //                               justifyContent: "start",
                                        //                               height: "8px",
                                        //                               paddingTop: "0px",
                                        //                               fontSize: "11px",
                                        //                               fontWeight: "800",
                                        //                               marginBottom: "14px",
                                        //                               marginTop: "0px",
                                        //                               textAlign: "start",
                                        //                             }}
                                        //                           >
                                        //                             {heading.replaceAll("_", " ")}
                                        //                           </div>
                                        //                         </td>
                                        //                       ))}

                                        //                       {/* Remarks Column */}
                                        //                       <td
                                        //                         style={{
                                        //                           height: "8px",
                                        //                           paddingTop: "0px",
                                        //                           paddingLeft: "6px",
                                        //                           border: "1px solid #000",
                                        //                           borderBottom: "none",
                                        //                           fontSize: "11px",
                                        //                           fontWeight: "800",
                                        //                         }}
                                        //                       >
                                        //                         <div
                                        //                           style={{
                                        //                             display: "flex",
                                        //                             alignItems: "center",
                                        //                             justifyContent: "start",
                                        //                             height: "8px",
                                        //                             paddingTop: "0px",
                                        //                             fontSize: "11px",
                                        //                             fontWeight: "800",
                                        //                             marginBottom: "14px",
                                        //                             marginTop: "0px",
                                        //                             textAlign: "start",
                                        //                           }}
                                        //                         >
                                        //                           Remarks
                                        //                         </div>
                                        //                       </td>

                                        //                     </tr>

                                        //                     {/* Dynamic Value Rows */}
                                        //                     {Array.from({ length: maxRows }).map((_, rowIndex) => (
                                        //                       <tr key={rowIndex}>

                                        //                         {headings.map((heading, colIndex) => {

                                        //                           const value = diagnisis[heading];

                                        //                           const cellValue = Array.isArray(value)
                                        //                             ? value[rowIndex]
                                        //                             : value;

                                        //                           return (
                                        //                             <td
                                        //                               key={colIndex}
                                        //                               style={{
                                        //                                 height: "8px",
                                        //                                 paddingTop: "0px",
                                        //                                 paddingLeft: "6px",
                                        //                                 border: "1px solid #000",
                                        //                                 fontSize: "11px",
                                        //                                 fontWeight: "400",
                                        //                               }}
                                        //                             >
                                        //                               <div
                                        //                                 style={{
                                        //                                   display: "flex",
                                        //                                   alignItems: "center",
                                        //                                   justifyContent: "start",
                                        //                                   height: "8px",
                                        //                                   paddingTop: "0px",
                                        //                                   fontSize: "11px",
                                        //                                   fontWeight: "400",
                                        //                                   marginBottom: "14px",
                                        //                                   marginTop: "0px",
                                        //                                   textAlign: "start",
                                        //                                 }}
                                        //                               >
                                        //                                 {cellValue || "."}
                                        //                               </div>
                                        //                             </td>
                                        //                           );
                                        //                         })}

                                        //                         {/* Remarks Value */}
                                        //                         <td
                                        //                           style={{
                                        //                             height: "8px",
                                        //                             paddingTop: "0px",
                                        //                             paddingLeft: "6px",
                                        //                             border: "1px solid #000",
                                        //                             fontSize: "11px",
                                        //                             fontWeight: "400",
                                        //                           }}
                                        //                         >
                                        //                           <div
                                        //                             style={{
                                        //                               display: "flex",
                                        //                               alignItems: "center",
                                        //                               justifyContent: "start",
                                        //                               height: "8px",
                                        //                               paddingTop: "0px",
                                        //                               fontSize: "11px",
                                        //                               fontWeight: "400",
                                        //                               marginBottom: "14px",
                                        //                               marginTop: "0px",
                                        //                               textAlign: "start",
                                        //                             }}
                                        //                           >
                                        //                             .
                                        //                           </div>
                                        //                         </td>

                                        //                       </tr>
                                        //                     ))}

                                        //                   </tbody>
                                        //                 </table>

                                        //               </div>
                                        //             );
                                        //           }
                                        //         )}


                                        // {/* Remarks */}
                                        // <div
                                        //   style={{
                                        //     color: "#fff",
                                        //     background: "#003366",
                                        //     marginTop: "20px",
                                        //   }}
                                        // >
                                        //   <h4
                                        //     style={{
                                        //       margin: "0px",
                                        //       fontSize: "12px",
                                        //       fontWeight: 700,
                                        //       marginTop: "-15px",
                                        //       padding: "8px 0px 8px 2px",
                                        //     }}
                                        //   >
                                        //     Remarks
                                        //   </h4>
                                        // </div>

                                        // {/* FormatteddietDate */}
                                        // <div
                                        //   style={{
                                        //     color: "#fff",
                                        //     background: "#36454F",
                                        //     marginTop: "18px",
                                        //     marginBottom: "12px",
                                        //   }}
                                        // >
                                        //   <h4
                                        //     style={{
                                        //       margin: "0px",
                                        //       fontSize: "11px",
                                        //       fontWeight: 400,
                                        //       marginTop: "-14px",
                                        //       padding: "7px 0px 7px 2px",
                                        //     }}
                                        //   >
                                        //     {FormatteddietDate}
                                        //   </h4>
                                        // </div>

                                        // {/* Summary remark */}
                                        // <table style={{ width: "100%" }}>
                                        //   <tbody>
                                        //     {[
                                        //       ["Summary remark", summaryRemark]
                                        //     ].map(([s, v], i) => (
                                        //       <tr key={i} style={{ height: "8px" }}>
                                        //         <td
                                        //           style={{
                                        //             height: "8px",
                                        //             width: "80%",
                                        //             paddingTop: "0px",
                                        //             paddingLeft: "6px",
                                        //             border: "1px solid #000",
                                        //             fontSize: "11px",
                                        //             fontWeight: "800",
                                        //             borderRight: "none",
                                        //           }}
                                        //         >
                                        //           <div
                                        //             style={{
                                        //               display: "flex",
                                        //               alignItems: "center",
                                        //               justifyContent: "start",
                                        //               height: "8px",
                                        //               paddingTop: "0px",
                                        //               fontSize: "11px",
                                        //               fontWeight: "800",
                                        //               marginBottom: "14px",
                                        //               marginTop: "0px",
                                        //               textAlign: "start",
                                        //             }}
                                        //           >
                                        //             {s}
                                        //           </div>
                                        //         </td>

                                        //         <td
                                        //           style={{
                                        //             height: "8px",
                                        //             paddingTop: "0px",
                                        //             paddingLeft: "6px",
                                        //             border: "1px solid #000",
                                        //             fontSize: "11px",
                                        //             fontWeight: "400",
                                        //           }}
                                        //         >
                                        //           <div
                                        //             style={{
                                        //               display: "flex",
                                        //               alignItems: "center",
                                        //               justifyContent: "start",
                                        //               height: "8px",
                                        //               paddingTop: "0px",
                                        //               fontSize: "11px",
                                        //               fontWeight: "400",
                                        //               marginBottom: "14px",
                                        //               marginTop: "0px",
                                        //               textAlign: "start",
                                        //             }}
                                        //           >
                                        //             {v}
                                        //           </div>
                                        //         </td>
                                        //       </tr>
                                        //     ))}
                                        //   </tbody>
                                        // </table>


                                        //       </>
                                        //     );
                                        //   }

                                        // Treatment
                                        if (header === "Treatment") {
                                            const summaryRemark =
                                                meta_value?.Treatment?.summary_remark || "";

                                            const treatmentMedicine =
                                                meta_value?.Treatment_Medicine || {};

                                            return (
                                                <>
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "26px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-13px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            Treatment (इलाज)
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    {/* Treatment Medicine */}
                                                    {/* <div
        style={{
          color: "#fff",
          background: "#003366",
          marginTop: "26px",
        }}
      >
        <h4
          style={{
            margin: "0px",
            fontSize: "12px",
            fontWeight: 700,
            marginTop: "-13px",
            padding: "7px 0px 7px 2px",
            textTransform: "capitalize",
          }}
        >
          Treatment Medicine
        </h4>
      </div> */}

                                                    {/* FormatteddietDate */}
                                                    {/* <div
        style={{
          color: "#fff",
          background: "#36454F",
          marginTop: "18px",
          marginBottom: "12px",
        }}
      >
        <h4
          style={{
            margin: "0px",
            fontSize: "11px",
            fontWeight: 400,
            marginTop: "-14px",
            padding: "7px 0px 7px 2px",
          }}
        >
          {FormatteddietDate}
        </h4>
      </div> */}

                                                    <table
                                                        style={{
                                                            width: "100%",
                                                            borderCollapse: "collapse",
                                                        }}
                                                    >
                                                        <tbody>
                                                            {/* Heading Row */}
                                                            <tr>
                                                                {[
                                                                    "Medicine",
                                                                    "Dosage",
                                                                    "Frequency",
                                                                    "Days",
                                                                    "qty",
                                                                    "Remarks",
                                                                ].map((heading, i) => (
                                                                    <td
                                                                        key={i}
                                                                        style={{
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            paddingLeft: "6px",
                                                                            border: "1px solid #000",
                                                                            borderBottom: "none",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "start",
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800",
                                                                                marginBottom: "14px",
                                                                                marginTop: "0px",
                                                                                textAlign: "start",
                                                                            }}
                                                                        >
                                                                            {heading}
                                                                        </div>
                                                                    </td>
                                                                ))}
                                                            </tr>

                                                            {/* Dynamic Rows */}
                                                            {Array.from({
                                                                length: Math.max(
                                                                    treatmentMedicine?.Medicine?.length || 0,
                                                                    treatmentMedicine?.Dosage?.length || 0,
                                                                    treatmentMedicine?.Frequency?.length || 0,
                                                                    treatmentMedicine?.Days?.length || 0,
                                                                    treatmentMedicine?.qty?.length || 0,
                                                                    treatmentMedicine?.Remarks?.length || 0
                                                                ),
                                                            }).map((_, rowIndex) => (
                                                                <tr key={rowIndex}>
                                                                    {[
                                                                        treatmentMedicine?.Medicine?.[rowIndex],
                                                                        treatmentMedicine?.Dosage?.[rowIndex],
                                                                        treatmentMedicine?.Frequency?.[rowIndex],
                                                                        treatmentMedicine?.Days?.[rowIndex],
                                                                        treatmentMedicine?.qty?.[rowIndex],
                                                                        treatmentMedicine?.Remarks?.[rowIndex],
                                                                    ].map((value, colIndex) => (
                                                                        <td
                                                                            key={colIndex}
                                                                            style={{
                                                                                height: "8px",
                                                                                paddingTop: "0px",
                                                                                paddingLeft: "6px",
                                                                                border: "1px solid #000",
                                                                                fontSize: "11px",
                                                                                fontWeight: "400",
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "start",
                                                                                    height: "8px",
                                                                                    paddingTop: "0px",
                                                                                    fontSize: "11px",
                                                                                    fontWeight: "400",
                                                                                    marginBottom: "14px",
                                                                                    marginTop: "0px",
                                                                                    textAlign: "start",
                                                                                }}
                                                                            >
                                                                                {value || "."}
                                                                            </div>
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {/* Remarks */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-15px",
                                                                padding: "8px 0px 8px 2px",
                                                            }}
                                                        >
                                                            Treatment Remarks
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    {/* Summary remark */}
                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            <tr style={{ height: "8px" }}>
                                                                <td
                                                                    style={{
                                                                        height: "8px",
                                                                        width: "80%",
                                                                        paddingTop: "0px",
                                                                        paddingLeft: "6px",
                                                                        border: "1px solid #000",
                                                                        fontSize: "11px",
                                                                        fontWeight: "800",
                                                                        borderRight: "none",
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "start",
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                            marginBottom: "14px",
                                                                            marginTop: "0px",
                                                                            textAlign: "start",
                                                                        }}
                                                                    >
                                                                        Summary remark
                                                                    </div>
                                                                </td>

                                                                <td
                                                                    style={{
                                                                        height: "8px",
                                                                        paddingTop: "0px",
                                                                        paddingLeft: "6px",
                                                                        border: "1px solid #000",
                                                                        fontSize: "11px",
                                                                        fontWeight: "400",
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "start",
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                            marginBottom: "14px",
                                                                            marginTop: "0px",
                                                                            textAlign: "start",
                                                                        }}
                                                                    >
                                                                        {summaryRemark || "."}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </>
                                            );
                                        }

                                        // Panchkarma_Therapies
                                        //  if (header === "Panchkarma_Therapies") {

                                        //       const summaryRemark =
                                        //         meta_value?.panchKarmaCurrent?.summary_remark || "";

                                        //       // Dynamic meta_value
                                        //       const dynamicSections = (meta_value ?? {}) as IafDynamicSectionsMap;

                                        //       return (
                                        //         <>

                                        //           {/* <div
                                        //             style={{
                                        //               color: "#fff",
                                        //               background: "#003366",
                                        //               marginTop: "26px",
                                        //             }}
                                        //           >
                                        //             <h4
                                        //               style={{
                                        //                 margin: "0px",
                                        //                 fontSize: "12px",
                                        //                 fontWeight: 700,
                                        //                 marginTop: "-13px",
                                        //                 padding: "7px 0px 7px 2px",
                                        //               }}
                                        //             >
                                        //               Panchkarma Therapies (पंचकर्म चिकित्सा)
                                        //             </h4>
                                        //           </div> */}

                                        //           {/* FormatteddietDate */}
                                        //           {/* <div
                                        //             style={{
                                        //               color: "#fff",
                                        //               background: "#36454F",
                                        //               marginTop: "18px",
                                        //               marginBottom: "12px",
                                        //             }}
                                        //           >
                                        //             <h4
                                        //               style={{
                                        //                 margin: "0px",
                                        //                 fontSize: "11px",
                                        //                 fontWeight: 400,
                                        //                 marginTop: "-14px",
                                        //                 padding: "7px 0px 7px 2px",
                                        //               }}
                                        //             >
                                        //               {FormatteddietDate}
                                        //             </h4>
                                        //           </div> */}

                                        //           {Object.entries(dynamicSections).map(
                                        //             ([sectionName, diagnisis], sectionIndex) => {

                                        //               // Skip non object values
                                        //               if (
                                        //                 typeof diagnisis !== "object" ||
                                        //                 diagnisis === null ||
                                        //                 Array.isArray(diagnisis)
                                        //               ) {
                                        //                 return null;
                                        //               }

                                        //               const sectionRows = diagnisis as IafDynamicSection;

                                        //               // Therapy first
                                        //               const headings = [
                                        //                 "Therapy",
                                        //                 ...Object.keys(sectionRows).filter(
                                        //                   (key) => key !== "Therapy"
                                        //                 ),
                                        //               ];

                                        //               // Get max rows
                                        //               const maxRows = Math.max(
                                        //                 ...Object.values(sectionRows).map((arr) =>
                                        //                   Array.isArray(arr) ? arr.length : 1
                                        //                 )
                                        //               );

                                        //               return (
                                        //                 <div key={sectionIndex}>

                                        //                   {/* Section Header */}
                                        //                   <div
                                        //                     style={{
                                        //                       color: "#fff",
                                        //                       background: "#003366",
                                        //                       marginTop: "26px",
                                        //                     }}
                                        //                   >
                                        //                     <h4
                                        //                       style={{
                                        //                         margin: "0px",
                                        //                         fontSize: "12px",
                                        //                         fontWeight: 700,
                                        //                         marginTop: "-13px",
                                        //                         padding: "7px 0px 7px 2px",
                                        //                         textTransform: "capitalize",
                                        //                       }}
                                        //                     >
                                        //                       {sectionName.replaceAll("_", " ")}
                                        //                     </h4>
                                        //                   </div>

                                        //                   {/* Formatted diet date */}
                                        //                   <div
                                        //                     style={{
                                        //                       color: "#fff",
                                        //                       background: "#36454F",
                                        //                       marginTop: "18px",
                                        //                       marginBottom: "12px",
                                        //                     }}
                                        //                   >
                                        //                     <h4
                                        //                       style={{
                                        //                         margin: "0px",
                                        //                         fontSize: "11px",
                                        //                         fontWeight: 400,
                                        //                         marginTop: "-14px",
                                        //                         padding: "7px 0px 7px 2px",
                                        //                       }}
                                        //                     >
                                        //                       {FormatteddietDate}
                                        //                     </h4>
                                        //                   </div>

                                        //                   <table
                                        //                     style={{
                                        //                       width: "100%",
                                        //                       borderCollapse: "collapse",
                                        //                     }}
                                        //                   >
                                        //                     <tbody>

                                        //                       {/* Heading Row */}
                                        //                       <tr>

                                        //                         {headings.map((heading, i) => (
                                        //                           <td
                                        //                             key={i}
                                        //                             style={{
                                        //                               height: "8px",
                                        //                               paddingTop: "0px",
                                        //                               paddingLeft: "6px",
                                        //                               border: "1px solid #000",
                                        //                               borderBottom: "none",
                                        //                               fontSize: "11px",
                                        //                               fontWeight: "800",
                                        //                             }}
                                        //                           >
                                        //                             <div
                                        //                               style={{
                                        //                                 display: "flex",
                                        //                                 alignItems: "center",
                                        //                                 justifyContent: "start",
                                        //                                 height: "8px",
                                        //                                 paddingTop: "0px",
                                        //                                 fontSize: "11px",
                                        //                                 fontWeight: "800",
                                        //                                 marginBottom: "14px",
                                        //                                 marginTop: "0px",
                                        //                                 textAlign: "start",
                                        //                               }}
                                        //                             >
                                        //                               {heading.replaceAll("_", " ")}
                                        //                             </div>
                                        //                           </td>
                                        //                         ))}

                                        //                       </tr>

                                        //                       {/* Dynamic Value Rows */}
                                        //                       {Array.from({ length: maxRows }).map((_, rowIndex) => (
                                        //                         <tr key={rowIndex}>

                                        //                           {headings.map((heading, colIndex) => {

                                        //                             const value = sectionRows[heading];

                                        //                             const cellValue = Array.isArray(value)
                                        //                               ? value[rowIndex]
                                        //                               : value;

                                        //                             return (
                                        //                               <td
                                        //                                 key={colIndex}
                                        //                                 style={{
                                        //                                   height: "8px",
                                        //                                   paddingTop: "0px",
                                        //                                   paddingLeft: "6px",
                                        //                                   border: "1px solid #000",
                                        //                                   fontSize: "11px",
                                        //                                   fontWeight: "400",
                                        //                                 }}
                                        //                               >
                                        //                                 <div
                                        //                                   style={{
                                        //                                     display: "flex",
                                        //                                     alignItems: "center",
                                        //                                     justifyContent: "start",
                                        //                                     height: "8px",
                                        //                                     paddingTop: "0px",
                                        //                                     fontSize: "11px",
                                        //                                     fontWeight: "400",
                                        //                                     marginBottom: "14px",
                                        //                                     marginTop: "0px",
                                        //                                     textAlign: "start",
                                        //                                   }}
                                        //                                 >
                                        //                                   {cellValue || "."}
                                        //                                 </div>
                                        //                               </td>
                                        //                             );
                                        //                           })}

                                        //                         </tr>
                                        //                       ))}

                                        //                     </tbody>
                                        //                   </table>

                                        //                 </div>
                                        //               );
                                        //             }
                                        //           )}


                                        // {/* Remarks */}
                                        // <div
                                        //     style={{
                                        //       color: "#fff",
                                        //       background: "#003366",
                                        //       marginTop: "20px",
                                        //     }}
                                        //   >
                                        //     <h4
                                        //       style={{
                                        //         margin: "0px",
                                        //         fontSize: "12px",
                                        //         fontWeight: 700,
                                        //         marginTop: "-15px",
                                        //         padding: "8px 0px 8px 2px",
                                        //       }}
                                        //     >
                                        //       Panchkarma Therapies Remarks
                                        //     </h4>
                                        //   </div>

                                        //   {/* FormatteddietDate */}
                                        //   <div
                                        //     style={{
                                        //       color: "#fff",
                                        //       background: "#36454F",
                                        //       marginTop: "18px",
                                        //       marginBottom: "12px",
                                        //     }}
                                        //   >
                                        //     <h4
                                        //       style={{
                                        //         margin: "0px",
                                        //         fontSize: "11px",
                                        //         fontWeight: 400,
                                        //         marginTop: "-14px",
                                        //         padding: "7px 0px 7px 2px",
                                        //       }}
                                        //     >
                                        //       {FormatteddietDate}
                                        //     </h4>
                                        //   </div>

                                        //   {/* Summary remark */}
                                        //   <table style={{ width: "100%" }}>
                                        //     <tbody>
                                        //       {[
                                        //         ["Summary remark", summaryRemark]
                                        //       ].map(([s, v], i) => (
                                        //         <tr key={i} style={{ height: "8px" }}>
                                        //           <td
                                        //             style={{
                                        //               height: "8px",
                                        //               width: "80%",
                                        //               paddingTop: "0px",
                                        //               paddingLeft: "6px",
                                        //               border: "1px solid #000",
                                        //               fontSize: "11px",
                                        //               fontWeight: "800",
                                        //               borderRight: "none",
                                        //             }}
                                        //           >
                                        //             <div
                                        //               style={{
                                        //                 display: "flex",
                                        //                 alignItems: "center",
                                        //                 justifyContent: "start",
                                        //                 height: "8px",
                                        //                 paddingTop: "0px",
                                        //                 fontSize: "11px",
                                        //                 fontWeight: "800",
                                        //                 marginBottom: "14px",
                                        //                 marginTop: "0px",
                                        //                 textAlign: "start",
                                        //               }}
                                        //             >
                                        //               {s}
                                        //             </div>
                                        //           </td>

                                        //           <td
                                        //             style={{
                                        //               height: "8px",
                                        //               paddingTop: "0px",
                                        //               paddingLeft: "6px",
                                        //               border: "1px solid #000",
                                        //               fontSize: "11px",
                                        //               fontWeight: "400",
                                        //             }}
                                        //           >
                                        //             <div
                                        //               style={{
                                        //                 display: "flex",
                                        //                 alignItems: "center",
                                        //                 justifyContent: "start",
                                        //                 height: "8px",
                                        //                 paddingTop: "0px",
                                        //                 fontSize: "11px",
                                        //                 fontWeight: "400",
                                        //                 marginBottom: "14px",
                                        //                 marginTop: "0px",
                                        //                 textAlign: "start",
                                        //               }}
                                        //             >
                                        //               {v}
                                        //             </div>
                                        //           </td>
                                        //         </tr>
                                        //       ))}
                                        //     </tbody>
                                        //   </table>



                                        //         </>
                                        //       );
                                        //   }

                                        // Panchkarma_Therapies
                                        if (header === "Panchkarma_Therapies") {

                                            const summaryRemark =
                                                meta_value?.panchKarmaCurrent?.summary_remark || "";

                                            // Ignore panchKarmaCurrent section
                                            const dynamicSections = Object.fromEntries(
                                                Object.entries(meta_value ?? {}).filter(
                                                    ([key]) => key !== "panchKarmaCurrent"
                                                )
                                            ) as IafDynamicSectionsMap;

                                            return (
                                                <>
                                                    {Object.entries(dynamicSections).map(
                                                        ([sectionName, diagnisis], sectionIndex) => {

                                                            // Skip non object values
                                                            if (
                                                                typeof diagnisis !== "object" ||
                                                                diagnisis === null ||
                                                                Array.isArray(diagnisis)
                                                            ) {
                                                                return null;
                                                            }

                                                            const sectionRows = diagnisis as IafDynamicSection;

                                                            // Therapy first
                                                            const headings = [
                                                                "Therapy",
                                                                ...Object.keys(sectionRows).filter(
                                                                    (key) => key !== "Therapy"
                                                                ),
                                                            ];

                                                            // Get max rows
                                                            const maxRows = Math.max(
                                                                ...Object.values(sectionRows).map((arr) =>
                                                                    Array.isArray(arr) ? arr.length : 1
                                                                )
                                                            );

                                                            return (
                                                                <div key={sectionIndex}>

                                                                    {/* Section Header */}
                                                                    {/* <div
                          style={{
                            color: "#fff",
                            background: "#003366",
                            marginTop: "26px",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0px",
                              fontSize: "12px",
                              fontWeight: 700,
                              marginTop: "-13px",
                              padding: "7px 0px 7px 2px",
                              textTransform: "capitalize",
                            }}
                          >
                            {sectionName.replaceAll("_", " ")}
                          </h4>
                        </div> */}

                                                                    <div
                                                                        style={{
                                                                            color: "#fff",
                                                                            background: "#003366",
                                                                            marginTop: "26px",
                                                                            height: "22px",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            paddingLeft: "2px",
                                                                            paddingTop: "0px",
                                                                        }}
                                                                    >
                                                                        <h4
                                                                            style={{
                                                                                margin: "0px",
                                                                                fontSize: "12px",
                                                                                fontWeight: 700,
                                                                                padding: "0px",
                                                                                marginBottom: "14px",
                                                                            }}
                                                                        >
                                                                            {sectionName.replaceAll("_", " ")}
                                                                        </h4>
                                                                    </div>

                                                                    {/* Formatted diet date */}
                                                                    <div
                                                                        style={{
                                                                            color: "#fff",
                                                                            background: "#36454F",
                                                                            marginTop: "18px",
                                                                            marginBottom: "12px",
                                                                        }}
                                                                    >
                                                                        <h4
                                                                            style={{
                                                                                margin: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: 400,
                                                                                marginTop: "-14px",
                                                                                padding: "7px 0px 7px 2px",
                                                                            }}
                                                                        >
                                                                            {FormatteddietDate}
                                                                        </h4>
                                                                    </div>

                                                                    <table
                                                                        style={{
                                                                            width: "100%",
                                                                            borderCollapse: "collapse",
                                                                        }}
                                                                    >
                                                                        <tbody>

                                                                            {/* Heading Row */}
                                                                            <tr>
                                                                                {headings.map((heading, i) => (
                                                                                    <td
                                                                                        key={i}
                                                                                        style={{
                                                                                            height: "8px",
                                                                                            paddingTop: "0px",
                                                                                            paddingLeft: "6px",
                                                                                            border: "1px solid #000",
                                                                                            borderBottom: "none",
                                                                                            fontSize: "11px",
                                                                                            fontWeight: "800",
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={{
                                                                                                display: "flex",
                                                                                                alignItems: "center",
                                                                                                justifyContent: "start",
                                                                                                height: "8px",
                                                                                                paddingTop: "0px",
                                                                                                fontSize: "11px",
                                                                                                fontWeight: "800",
                                                                                                marginBottom: "14px",
                                                                                                marginTop: "0px",
                                                                                                textAlign: "start",
                                                                                            }}
                                                                                        >
                                                                                            {heading.replaceAll("_", " ")}
                                                                                        </div>
                                                                                    </td>
                                                                                ))}
                                                                            </tr>

                                                                            {/* Dynamic Value Rows */}
                                                                            {Array.from({ length: maxRows }).map((_, rowIndex) => (
                                                                                <tr key={rowIndex}>

                                                                                    {headings.map((heading, colIndex) => {

                                                                                        const value = sectionRows[heading];

                                                                                        const cellValue = Array.isArray(value)
                                                                                            ? value[rowIndex]
                                                                                            : value;

                                                                                        return (
                                                                                            <td
                                                                                                key={colIndex}
                                                                                                style={{
                                                                                                    height: "8px",
                                                                                                    paddingTop: "0px",
                                                                                                    paddingLeft: "6px",
                                                                                                    border: "1px solid #000",
                                                                                                    fontSize: "11px",
                                                                                                    fontWeight: "400",
                                                                                                }}
                                                                                            >
                                                                                                <div
                                                                                                    style={{
                                                                                                        display: "flex",
                                                                                                        alignItems: "center",
                                                                                                        justifyContent: "start",
                                                                                                        height: "8px",
                                                                                                        paddingTop: "0px",
                                                                                                        fontSize: "11px",
                                                                                                        fontWeight: "400",
                                                                                                        marginBottom: "14px",
                                                                                                        marginTop: "0px",
                                                                                                        textAlign: "start",
                                                                                                    }}
                                                                                                >
                                                                                                    {cellValue || "."}
                                                                                                </div>
                                                                                            </td>
                                                                                        );
                                                                                    })}

                                                                                </tr>
                                                                            ))}

                                                                        </tbody>
                                                                    </table>

                                                                </div>
                                                            );
                                                        }
                                                    )}

                                                    {/* Remarks */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 700,
                                                                marginTop: "-15px",
                                                                padding: "8px 0px 8px 2px",
                                                            }}
                                                        >
                                                            Panchkarma Therapies Remarks
                                                        </h4>
                                                    </div>

                                                    {/* FormatteddietDate */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "12px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "11px",
                                                                fontWeight: 400,
                                                                marginTop: "-14px",
                                                                padding: "7px 0px 7px 2px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    {/* Summary remark */}
                                                    <table style={{ width: "100%" }}>
                                                        <tbody>
                                                            <tr style={{ height: "8px" }}>
                                                                <td
                                                                    style={{
                                                                        height: "8px",
                                                                        width: "80%",
                                                                        paddingTop: "0px",
                                                                        paddingLeft: "6px",
                                                                        border: "1px solid #000",
                                                                        fontSize: "11px",
                                                                        fontWeight: "800",
                                                                        borderRight: "none",
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "start",
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            fontSize: "11px",
                                                                            fontWeight: "800",
                                                                            marginBottom: "14px",
                                                                            marginTop: "0px",
                                                                            textAlign: "start",
                                                                        }}
                                                                    >
                                                                        Summary remark
                                                                    </div>
                                                                </td>

                                                                <td
                                                                    style={{
                                                                        height: "8px",
                                                                        paddingTop: "0px",
                                                                        paddingLeft: "6px",
                                                                        border: "1px solid #000",
                                                                        fontSize: "11px",
                                                                        fontWeight: "400",
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "start",
                                                                            height: "8px",
                                                                            paddingTop: "0px",
                                                                            fontSize: "11px",
                                                                            fontWeight: "400",
                                                                            marginBottom: "14px",
                                                                            marginTop: "0px",
                                                                            textAlign: "start",
                                                                        }}
                                                                    >
                                                                        {summaryRemark || "."}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </>
                                            );
                                        }


                                        {/* Ayurvedic_Therapies */ }
                                        if (header === "Ayurvedic_Therapies") {
                                            const summaryRemark = meta_value?.NutritionalAssessmentForm?.summary_remark || "";
                                            const therapyData = meta_value?.Ayurvedic_Therapies || {};

                                            return (
                                                <>
                                                    {/* Main Header */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#003366",
                                                            marginTop: "26px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "14px",
                                                                fontWeight: 700,
                                                                padding: "7px 10px",
                                                            }}
                                                        >
                                                            Ayurvedic Therapies (Panchkarmas & Upkarmas)
                                                        </h4>
                                                    </div>

                                                    {/* Date */}
                                                    <div
                                                        style={{
                                                            color: "#fff",
                                                            background: "#36454F",
                                                            marginTop: "18px",
                                                            marginBottom: "18px",
                                                        }}
                                                    >
                                                        <h4
                                                            style={{
                                                                margin: "0px",
                                                                fontSize: "12px",
                                                                fontWeight: 500,
                                                                padding: "5px 10px",
                                                            }}
                                                        >
                                                            {FormatteddietDate}
                                                        </h4>
                                                    </div>

                                                    {/* Dynamic Sections */}
                                                    {Object.entries(therapyData).map(
                                                        ([sectionName, sectionData], sectionIndex) => {

                                                            if (
                                                                typeof sectionData !== "object" ||
                                                                sectionData === null
                                                            ) {
                                                                return null;
                                                            }

                                                            return (
                                                                <div
                                                                    key={sectionIndex}
                                                                    style={{
                                                                        marginBottom: "18px",
                                                                        paddingLeft: "5px",
                                                                    }}
                                                                >
                                                                    {/* Section Title */}
                                                                    <div
                                                                        style={{
                                                                            color: "#0f9db5",
                                                                            fontSize: "16px",
                                                                            fontWeight: "700",
                                                                            textTransform: "capitalize",
                                                                            marginBottom: "6px",
                                                                        }}
                                                                    >
                                                                        {sectionName.replaceAll("_", " ")}
                                                                    </div>

                                                                    {/* Section Fields */}
                                                                    {Object.entries(sectionData).map(
                                                                        ([key, value], index) => (
                                                                            <div
                                                                                key={index}
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    marginBottom: "4px",
                                                                                    fontSize: "14px",
                                                                                }}
                                                                            >
                                                                                {/* Label */}
                                                                                <div
                                                                                    style={{
                                                                                        width: "250px",
                                                                                        color: "#000",
                                                                                        fontWeight: 400,
                                                                                        textTransform: "capitalize",
                                                                                    }}
                                                                                >
                                                                                    {key.replaceAll("_", " ")}
                                                                                </div>

                                                                                {/* Colon */}
                                                                                <div
                                                                                    style={{
                                                                                        width: "20px",
                                                                                        textAlign: "center",
                                                                                        fontWeight: 700,
                                                                                    }}
                                                                                >
                                                                                    :
                                                                                </div>

                                                                                {/* Value */}
                                                                                <div
                                                                                    style={{
                                                                                        flex: 1,
                                                                                        color: "#000",
                                                                                    }}
                                                                                >
                                                                                    {value || ""}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    )}



                                                                    {/* Remarks */}
                                                                    <div
                                                                        style={{
                                                                            color: "#fff",
                                                                            background: "#003366",
                                                                            marginTop: "20px",
                                                                        }}
                                                                    >
                                                                        <h4
                                                                            style={{
                                                                                margin: "0px",
                                                                                fontSize: "12px",
                                                                                fontWeight: 700,
                                                                                marginTop: "-15px",
                                                                                padding: "8px 0px 8px 2px",
                                                                            }}
                                                                        >
                                                                            Remarks
                                                                        </h4>
                                                                    </div>

                                                                    {/* FormatteddietDate */}
                                                                    <div
                                                                        style={{
                                                                            color: "#fff",
                                                                            background: "#36454F",
                                                                            marginTop: "18px",
                                                                            marginBottom: "12px",
                                                                        }}
                                                                    >
                                                                        <h4
                                                                            style={{
                                                                                margin: "0px",
                                                                                fontSize: "11px",
                                                                                fontWeight: 400,
                                                                                marginTop: "-14px",
                                                                                padding: "7px 0px 7px 2px",
                                                                            }}
                                                                        >
                                                                            {FormatteddietDate}
                                                                        </h4>
                                                                    </div>

                                                                    {/* Summary remark */}
                                                                    <table style={{ width: "100%" }}>
                                                                        <tbody>
                                                                            {[
                                                                                ["Summary remark", summaryRemark]
                                                                            ].map(([s, v], i) => (
                                                                                <tr key={i} style={{ height: "8px" }}>
                                                                                    <td
                                                                                        style={{
                                                                                            height: "8px",
                                                                                            width: "80%",
                                                                                            paddingTop: "0px",
                                                                                            paddingLeft: "6px",
                                                                                            border: "1px solid #000",
                                                                                            fontSize: "11px",
                                                                                            fontWeight: "800",
                                                                                            borderRight: "none",
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={{
                                                                                                display: "flex",
                                                                                                alignItems: "center",
                                                                                                justifyContent: "start",
                                                                                                height: "8px",
                                                                                                paddingTop: "0px",
                                                                                                fontSize: "11px",
                                                                                                fontWeight: "800",
                                                                                                marginBottom: "14px",
                                                                                                marginTop: "0px",
                                                                                                textAlign: "start",
                                                                                            }}
                                                                                        >
                                                                                            {s}
                                                                                        </div>
                                                                                    </td>

                                                                                    <td
                                                                                        style={{
                                                                                            height: "8px",
                                                                                            paddingTop: "0px",
                                                                                            paddingLeft: "6px",
                                                                                            border: "1px solid #000",
                                                                                            fontSize: "11px",
                                                                                            fontWeight: "400",
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={{
                                                                                                display: "flex",
                                                                                                alignItems: "center",
                                                                                                justifyContent: "start",
                                                                                                height: "8px",
                                                                                                paddingTop: "0px",
                                                                                                fontSize: "11px",
                                                                                                fontWeight: "400",
                                                                                                marginBottom: "14px",
                                                                                                marginTop: "0px",
                                                                                                textAlign: "start",
                                                                                            }}
                                                                                        >
                                                                                            {v}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>


                                                                    <div style={{ marginTop: "110px" }}>
                                                                        <p
                                                                            style={{
                                                                                fontSize: "10px",
                                                                                lineHeight: "1.3",
                                                                                margin: 0,
                                                                            }}
                                                                        >
                                                                            I hereby assure that whatever information I have provided is correct and true to the best of my knowledge.
                                                                            "If I am an asymptomatic carrier or an undiagnosed patient with COVID-19, I know it may endanger doctors and hospital staff. It is my responsibility to take appropriate precautions and to follow the protocols prescribed by them. I also know that I may get an infection from the clinic or from a doctor, and I will take every precaution to prevent this from happening, but I will not hold doctors and clinic staff accountable if such infection occurs to me or my accompanying persons.
                                                                        </p>

                                                                        <h5
                                                                            style={{
                                                                                textAlign: "right",
                                                                                marginTop: "18px",
                                                                                fontSize: "13px",
                                                                                fontWeight: 700,
                                                                            }}
                                                                        >
                                                                            Patient Signature
                                                                        </h5>
                                                                    </div>
                                                                </div>



                                                            );
                                                        }
                                                    )}
                                                </>
                                            );
                                        }


                                    })
                                }


                                {/* PAGE ENG LINE  */}
                                {/* <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", marginTop: "auto"}}/>
          <div style={{ textAlign: "end", fontSize: "13px", fontWeight: "600", marginTop: "-2px" }}>1</div> */}

                            </div>


                            {/* ══════ Amount Sheet (last page) ══════ */}
                            <div
                                className="pdf-page-break ipd-amount-sheet-page"
                                style={{
                                    ...BASE,
                                    boxSizing: "border-box",
                                    display: "flex",
                                    flexDirection: "column",
                                    background: "#fff",
                                    pageBreakAfter: "avoid",
                                    breakAfter: "avoid",
                                }}
                            >
                                <div>
                                    <div style={{ marginTop: "10px" }}>

                                        <div
                                            style={{
                                                color: "#fff",
                                                background: "#000",
                                                padding: "5px 0px 5px 2px",
                                            }}
                                        >
                                            <h4
                                                style={{
                                                    margin: "10px",
                                                    fontSize: "16px",
                                                    fontWeight: 600,
                                                    marginTop: "-5px",
                                                }}
                                            >
                                                Amount Sheet
                                            </h4>
                                        </div>
                                        <table
                                            style={{
                                                fontSize: "11px",
                                                width: "100%",
                                                textAlign: "start",
                                                borderCollapse: "separate",
                                                borderSpacing: "3px 3px",
                                                tableLayout: "fixed"
                                            }}
                                        >
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: "13%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>Date</td>
                                                    <td style={{ width: "19%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>Amount</td>
                                                    <td style={{ width: "30%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>Discount (%AGE)</td>
                                                    <td style={{ width: "20%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>REC Payment</td>
                                                    <td style={{ width: "20%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px" }}>Payment Mode</td>
                                                </tr>

                                                {Array.from({ length: 10 }).map((_, i) => (
                                                    <tr key={i}>
                                                        {Array.from({ length: 5 }).map((_, j) => (
                                                            <td key={j} style={{ height: "50px", border: "1px solid #222" }} />
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", marginTop: "auto" }} />
          <div style={{ textAlign: "end", fontSize: "13px", fontWeight: "600", marginTop: "-2px" }}>
            2
          </div> */}
                            </div>

                            {/* <div className="pdf-page-break"> </div> */}
                            {/* ══════ LAST PAGE ══════ */}
                        </div>
                    )}
        </div>
    );
});

IPDPatientForm.displayName = "IPDPatientForm";

export default IPDPatientForm;
