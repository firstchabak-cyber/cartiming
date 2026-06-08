// Supabase 데이터베이스 타입 정의 — `supabase gen types typescript`로 자동 생성하여 대체할 자리표시 파일

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          provider: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          provider?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          manufacturer: string;
          model: string;
          trim: string | null;
          year: number;
          mileage: number;
          registered_at: string;
          fuel_type: string | null;
          transmission: string | null;
          color: string | null;
          plate_number: string | null;
          vin: string | null;
          displacement_cc: number | null;
          body_type: string | null;
          vehicle_class: string | null;
          engine_code: string | null;
          inspection_valid_until: string | null;
          seating_capacity: number | null;
          key_count: number | null;
          wheel_scuff_count: number | null;
          damage_note: string | null;
          options: string[] | null;
          loan_principal: number | null;
          loan_started_at: string | null;
          loan_months: number | null;
          loan_apr: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["vehicles"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
      };
      price_analyses: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          current_price: number;
          predicted_1m: number;
          predicted_3m: number;
          predicted_6m: number;
          predicted_1y: number | null;
          predicted_2y: number | null;
          predicted_3y: number | null;
          signal: "sell_now" | "review" | "hold";
          rationale: string;
          generated_at: string;
          input_hash: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["price_analyses"]["Row"],
          "id" | "generated_at" | "input_hash"
        > & { id?: string; generated_at?: string; input_hash?: string | null };
        Update: Partial<
          Database["public"]["Tables"]["price_analyses"]["Insert"]
        >;
      };
      vehicle_maintenance: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          category: "교환" | "판금" | "수리" | "정비" | "사고";
          part: string;
          description: string | null;
          performed_at: string;
          cost: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["vehicle_maintenance"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["vehicle_maintenance"]["Insert"]
        >;
      };
      vehicle_photos: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          storage_path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["vehicle_photos"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["vehicle_photos"]["Insert"]
        >;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string | null;
          type: "sell_now" | "price_drop" | "price_rise" | "system";
          title: string;
          message: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["notifications"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["notifications"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
