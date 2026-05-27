export type LookupResult = {
  source: "gemini-vision";
  vehicle: {
    manufacturer?: string;
    model?: string;
    trim?: string;
    year?: number;
    fuel_type?: "gasoline" | "diesel" | "hybrid" | "ev" | "lpg";
    transmission?: "auto" | "manual";
    displacement_cc?: number;
    body_type?:
      | "sedan"
      | "suv"
      | "hatchback"
      | "coupe"
      | "wagon"
      | "van"
      | "pickup"
      | "convertible"
      | "other";
    vehicle_class?: "passenger" | "van" | "truck" | "special";
    engine_code?: string;
    color?: string;
    interior_color?: string;
    options?: string[];
    plate_number?: string;
  };
};
