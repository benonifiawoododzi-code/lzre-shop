export const ghanaRegions = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Western North",
  "Central",
  "Eastern",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
] as const;

export type GhanaRegion = (typeof ghanaRegions)[number];

export function isGhanaRegion(value: string): value is GhanaRegion {
  return (ghanaRegions as readonly string[]).includes(value);
}
