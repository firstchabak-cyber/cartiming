export type Vehicle = {
  id: string;
  user_id: string;
  manufacturer: string;
  model: string;
  trim?: string;
  year: number;
  mileage: number;
  registered_at: string;
  fuel_type?: "gasoline" | "diesel" | "hybrid" | "ev" | "lpg";
  transmission?: "auto" | "manual";
  color?: string;
  plate_number?: string;
  created_at: string;
  updated_at: string;
};

export type PriceAnalysis = {
  vehicle_id: string;
  current_price: number;
  predicted_1m: number;
  predicted_3m: number;
  predicted_6m: number;
  signal: "sell_now" | "review" | "hold";
  rationale: string;
  generated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: "naver" | "google" | "email";
  created_at: string;
};

export type AuthProvider = "naver" | "google" | "email";
