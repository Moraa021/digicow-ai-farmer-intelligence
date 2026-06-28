export interface Farmer {
  name: string;
  location: string;
  phone: string;
  income: number;
  priority: number;
  cow_count?: number;
  cows: string[];
  diseases: string[];
  milk_production?: number;
  soil?: string;
}

export interface AddFarmerPayload {
  name: string;
  location?: string;
  phone?: string;
  income?: number;
  cow_count?: number;
  cows?: string[];
  diseases?: string[];
  soil?: string;
  milk_production?: number;
}

export const SOIL_TYPES = [
  "Clay",
  "Sandy",
  "Loam",
  "Laterite",
  "Black Cotton",
] as const;

export interface RecommendationResponse {
  farmer: string;
  recommendation: string;
}

export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";

export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}
