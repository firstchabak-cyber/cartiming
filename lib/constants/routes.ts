export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  GARAGE: "/garage",
  VEHICLE_NEW: "/vehicles/new",
  VEHICLE_DETAIL: (id: string) => `/vehicles/${id}`,
  ANALYSIS: "/analysis",
  PROFILE: "/profile",
} as const;
