import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateMembershipId(state: string, districtCode: string, constituencyCode: string, serialNo: number) {
  const paddedSerial = String(serialNo).padStart(4, '0');
  return `${state}/${districtCode}/${constituencyCode}/${paddedSerial}`;
}
