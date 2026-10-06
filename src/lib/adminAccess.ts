import { resolveDistrictFromSlugOrCode } from './districtUtils';

export const MAIN_ADMIN_EMAILS = [
  'kmabarikiyafoods@gmail.com', 'hcrsindia@gmail.com', 'admin@hcrs.society',
  '9645934571@hcrs.society', 'mabarikiyafoods@gmail.com', 'hcrskerala@gmail.com'
];

type AdminProfile = { role?: string; isAdmin?: boolean; district?: string };

// Only the authenticated account email may establish a district identity.
export function getDistrictAdminDistrict(email: string | null | undefined): string | null {
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^hcrs[a-z]+@hcrs\.society$/.test(normalized)) return null;
  return resolveDistrictFromSlugOrCode(normalized.split('@')[0].slice(4));
}

export function isMainAdminAccount(email: string | null | undefined, profile?: AdminProfile | null): boolean {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || getDistrictAdminDistrict(normalized)) return false;
  if (MAIN_ADMIN_EMAILS.includes(normalized)) return true;
  return false;
}
