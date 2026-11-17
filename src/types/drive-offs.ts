export type DriveOffStatus =
  | "unpaid"
  | "partial_payment"
  | "paid"
  | "police_investigation"
  | "written_off"
  | "disputed";

export type DriveOffIncidentType = "drive_off" | "no_means_to_pay";

export interface FuelDriveOffIncident {
  id: string;
  incident_number: string;
  branch_id: string;
  branch_name: string;
  pump_number: number;
  incident_date: string;
  incident_time: string;
  occurred_at: string;
  vehicle_registration_number: string;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_colour?: string | null;
  fuel_type: string;
  litres_dispensed: number;
  price_per_litre: number;
  total_amount_due: number;
  amount_paid: number;
  balance_remaining: number;
  incident_type: DriveOffIncidentType;
  status: DriveOffStatus;
  cctv_image_url?: string | null;
  cctv_footage_timestamp?: string | null;
  police_crime_reference?: string | null;
  police_constabulary?: string | null;
  driver_name?: string | null;
  driver_contact_phone?: string | null;
  driver_address?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface FuelDriveOffPayment {
  id: string;
  incident_id: string;
  amount: number;
  payment_method: string;
  receipt_reference?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  recorded_by_name: string;
  created_at: string;
}

export interface DriveOffSummaryStats {
  totalIncidents: number;
  unpaidCount: number;
  totalUnpaidAmount: number;
  recoveredAmount: number;
  recoveryRatePercent: number;
  withPoliceCount: number;
}

