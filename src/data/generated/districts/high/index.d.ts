import type { DistrictCollection } from "../../../types";
export type DistrictLoader = () => Promise<{ default: DistrictCollection }>;
export declare const loaders: Record<string, DistrictLoader>;
