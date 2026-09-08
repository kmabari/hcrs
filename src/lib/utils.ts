import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateMembershipId(state: string, districtCode: string, constituencyCode: string, serialNo: number) {
  const paddedSerial = String(serialNo).padStart(4, '0');
  return `${state}/${districtCode}/${constituencyCode}/${paddedSerial}`;
}

export function sanitizeMemberAddress(rawAddr?: any): string {
  if (!rawAddr || typeof rawAddr !== 'string') return '';
  const trimmed = rawAddr.trim();
  // Filter out dummy placeholder strings, HCRS category, membership status, or organization text
  if (
    /HCRS/i.test(trimmed) || 
    /Founding\s*Core/i.test(trimmed) || 
    /Life\s*Founding/i.test(trimmed) || 
    /Registered\s*Life/i.test(trimmed) ||
    /Life\s*Member/i.test(trimmed) ||
    /Adhoc\s*Member/i.test(trimmed) ||
    /Registered\s*Member/i.test(trimmed) ||
    /Membership\s*Status/i.test(trimmed) ||
    /Highrich\s*Customer\s*Rehabilitation/i.test(trimmed) ||
    (/Valapad/i.test(trimmed) && /Kanimangalam/i.test(trimmed)) // Company registered office accidentally in address
  ) {
    return '';
  }
  if (trimmed.toLowerCase() === 'n/a' || trimmed === '.' || trimmed === '..') return '';
  return trimmed;
}

