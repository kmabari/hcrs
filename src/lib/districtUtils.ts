export interface DistrictItem {
  code: string;
  name: string;
}

export const DISTRICTS: DistrictItem[] = [
  { code: 'KSD', name: 'Kasaragod' },
  { code: 'KNR', name: 'Kannur' },
  { code: 'WYD', name: 'Wayanad' },
  { code: 'KOZ', name: 'Kozhikode' },
  { code: 'MLP', name: 'Malappuram' },
  { code: 'PKD', name: 'Palakkad' },
  { code: 'TCR', name: 'Thrissur' },
  { code: 'EKM', name: 'Ernakulam' },
  { code: 'IDK', name: 'Idukki' },
  { code: 'KTM', name: 'Kottayam' },
  { code: 'ALP', name: 'Alappuzha' },
  { code: 'PTA', name: 'Pathanamthitta' },
  { code: 'KLM', name: 'Kollam' },
  { code: 'TVM', name: 'Thiruvananthapuram' },
];

/**
 * Normalizes any district representation (code, full English name, alias)
 * to the canonical 3-letter uppercase district code used in Firestore (e.g. 'MLP', 'KOZ', 'KNR').
 */
export function normalizeDistrictCode(input: string | undefined | null): string {
  if (!input) return '';
  const clean = String(input).trim();
  if (!clean) return '';
  const upper = clean.toUpperCase();

  // 1. Direct code match (e.g. 'MLP', 'KNR')
  const byCode = DISTRICTS.find(d => d.code === upper);
  if (byCode) return byCode.code;

  // 2. Direct name match (e.g. 'Malappuram', 'Kozhikode')
  const byName = DISTRICTS.find(d => d.name.toLowerCase() === clean.toLowerCase());
  if (byName) return byName.code;

  // 3. Common spelling variations & historical city names
  const lower = clean.toLowerCase();
  if (lower.includes('kasaragod') || lower.includes('kasargod')) return 'KSD';
  if (lower.includes('kannur') || lower.includes('cannanore')) return 'KNR';
  if (lower.includes('wayanad') || lower.includes('wynad')) return 'WYD';
  if (lower.includes('kozhikode') || lower.includes('calicut')) return 'KOZ';
  if (lower.includes('malappuram') || lower.includes('malapuram')) return 'MLP';
  if (lower.includes('palakkad') || lower.includes('palghat')) return 'PKD';
  if (lower.includes('thrissur') || lower.includes('trichur')) return 'TCR';
  if (lower.includes('ernakulam') || lower.includes('cochin') || lower.includes('kochi')) return 'EKM';
  if (lower.includes('idukki')) return 'IDK';
  if (lower.includes('kottayam')) return 'KTM';
  if (lower.includes('alappuzha') || lower.includes('alleppey')) return 'ALP';
  if (lower.includes('pathanamthitta')) return 'PTA';
  if (lower.includes('kollam') || lower.includes('quilon')) return 'KLM';
  if (lower.includes('thiruvananthapuram') || lower.includes('trivandrum')) return 'TVM';

  return upper;
}

/**
 * Returns the human-readable English district name for a code or name.
 */
export function getDistrictName(input: string | undefined | null): string {
  if (!input) return '';
  const code = normalizeDistrictCode(input);
  const found = DISTRICTS.find(d => d.code === code);
  return found ? found.name : String(input);
}

/**
 * Checks if two district values match, regardless of whether one is a code
 * and the other is a full name.
 */
export function isDistrictMatch(distA: string | undefined | null, distB: string | undefined | null): boolean {
  if (!distA || !distB) return false;
  const normA = normalizeDistrictCode(distA);
  const normB = normalizeDistrictCode(distB);
  return normA === normB;
}
