export const LEGACY_PROJECT_API_BASE_URL = "https://stagging.hiims.in/v3";

export const LEGACY_PROJECT_API_TOKEN = "AC188d6806d44558B6D537627bC7893dZSI6IFkbWWF26";

export const LEGACY_PROJECT_ENDPOINTS = {
  opdList: "/opdlist",
  ipdList: "/ipdlist",
  dayCareList: "/dayCarelist",
  prebooking: "/prebooking",
  prebookingDetail: "/prebookingDetail",
  dischargeList: "/dischargelist",
  branchPendingDischarge: "/branchPendingDischarge",
  branchLead: "/branchLead",
  /** GET + JSON body `{ branchId }` — doctor dropdown for legacy patient lists */
  branchDoctorList: "/branchdoctor",
  opdPatientDetail: "/opdPatientDetail",
  opdPatientIaForm: "/opd_patient_iaform",
  patientDetail: "/patientDetail",
  patientPackage: "/patientPackage",
  patientRoom: "/patientRoom",
  patientReport: "/patientReport",
  nursingNote: "/nursingNote",
  doctorVisit: "/doctorVisit",
  patientHistory: "/patientHistory",
  patientRevisit: "/patientRevisit",
  patientDiet: "/patientDiet",
  patientFiles: "/patientFiles",
  patientWallet: "/patientWallet",
  orderDetail: "/order_detail",
  orders: "/orders",
  patientForm: "/patientForm",
} as const;

