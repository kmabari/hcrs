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
 * Canonical URL slugs for each of the 14 Kerala districts.
 */
export const DISTRICT_SLUGS: Record<string, string> = {
  KSD: 'kasaragod',
  KNR: 'kannur',
  WYD: 'wayanad',
  KOZ: 'kozhikode',
  MLP: 'malappuram',
  PKD: 'palakkad',
  TCR: 'thrissur',
  EKM: 'ernakulam',
  IDK: 'idukki',
  KTM: 'kottayam',
  ALP: 'alappuzha',
  PTA: 'pathanamthitta',
  KLM: 'kollam',
  TVM: 'thiruvananthapuram',
};

/**
 * Mapping from RTO identifiers and numeric codes to canonical district codes.
 */
export const RTO_TO_DISTRICT_CODE: Record<string, string> = {
  'KL-01': 'TVM', 'KL01': 'TVM', '01': 'TVM', '1': 'TVM',
  'KL-02': 'KLM', 'KL02': 'KLM', '02': 'KLM', '2': 'KLM',
  'KL-03': 'PTA', 'KL03': 'PTA', '03': 'PTA', '3': 'PTA',
  'KL-04': 'ALP', 'KL04': 'ALP', '04': 'ALP', '4': 'ALP',
  'KL-05': 'KTM', 'KL05': 'KTM', '05': 'KTM', '5': 'KTM',
  'KL-06': 'IDK', 'KL06': 'IDK', '06': 'IDK', '6': 'IDK',
  'KL-07': 'EKM', 'KL07': 'EKM', '07': 'EKM', '7': 'EKM',
  'KL-08': 'TCR', 'KL08': 'TCR', '08': 'TCR', '8': 'TCR',
  'KL-09': 'PKD', 'KL09': 'PKD', '09': 'PKD', '9': 'PKD',
  'KL-10': 'MLP', 'KL10': 'MLP', '10': 'MLP',
  'KL-11': 'KOZ', 'KL11': 'KOZ', '11': 'KOZ',
  'KL-12': 'WYD', 'KL12': 'WYD', '12': 'WYD',
  'KL-13': 'KNR', 'KL13': 'KNR', '13': 'KNR',
  'KL-14': 'KSD', 'KL14': 'KSD', '14': 'KSD',
};

/**
 * Comprehensive slug and alias mapping for all 14 Kerala districts.
 */
export const SLUG_TO_DISTRICT_CODE: Record<string, string> = {
  // Kasaragod (KL-14)
  kasaragod: 'KSD',
  kasargod: 'KSD',
  ksd: 'KSD',
  // Kannur (KL-13)
  kannur: 'KNR',
  cannanore: 'KNR',
  knr: 'KNR',
  // Wayanad (KL-12)
  wayanad: 'WYD',
  wynad: 'WYD',
  wyd: 'WYD',
  // Kozhikode (KL-11)
  kozhikode: 'KOZ',
  kozicode: 'KOZ',
  kozikhode: 'KOZ',
  calicut: 'KOZ',
  koz: 'KOZ',
  // Malappuram (KL-10)
  malappuram: 'MLP',
  malapuram: 'MLP',
  mlp: 'MLP',
  mpm: 'MLP',
  // Palakkad (KL-09)
  palakkad: 'PKD',
  palghat: 'PKD',
  palakad: 'PKD',
  pkd: 'PKD',
  // Thrissur (KL-08)
  thrissur: 'TCR',
  trichur: 'TCR',
  tcr: 'TCR',
  // Ernakulam (KL-07)
  ernakulam: 'EKM',
  cochin: 'EKM',
  kochi: 'EKM',
  ekm: 'EKM',
  // Idukki (KL-06)
  idukki: 'IDK',
  idk: 'IDK',
  // Kottayam (KL-05)
  kottayam: 'KTM',
  ktm: 'KTM',
  // Alappuzha (KL-04)
  alappuzha: 'ALP',
  alleppey: 'ALP',
  alapuzha: 'ALP',
  alp: 'ALP',
  // Pathanamthitta (KL-03)
  pathanamthitta: 'PTA',
  pathanamthita: 'PTA',
  pta: 'PTA',
  // Kollam (KL-02)
  kollam: 'KLM',
  quilon: 'KLM',
  klm: 'KLM',
  // Thiruvananthapuram (KL-01)
  thiruvananthapuram: 'TVM',
  trivandrum: 'TVM',
  tvm: 'TVM',
};

/**
 * Returns the canonical district slug for a given district code or name.
 */
export function getDistrictSlug(input: string | undefined | null): string {
  if (!input) return '';
  const code = normalizeDistrictCode(input);
  return DISTRICT_SLUGS[code] || code.toLowerCase();
}

/**
 * Resolves a URL parameter (slug, code, RTO, number) to the canonical 3-letter uppercase district code.
 */
export function resolveDistrictFromSlugOrCode(input: string | undefined | null): string | null {
  if (!input) return null;
  const norm = normalizeDistrictCode(input);
  const exists = DISTRICTS.some(d => d.code === norm);
  return exists ? norm : null;
}

/**
 * Generates the distinct registration share URL for a given district code or slug.
 */
export function getDistrictShareUrl(districtCodeOrSlug: string, origin?: string): string {
  const code = normalizeDistrictCode(districtCodeOrSlug);
  const slug = DISTRICT_SLUGS[code] || (code ? code.toLowerCase() : 'kerala');
  const base = origin || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://hcrs-kerala.web.app');
  return `${base}/?view=register&district=${slug}`;
}

/**
 * Normalizes any district representation (code, full English name, slug, RTO code)
 * to the canonical 3-letter uppercase district code used in Firestore (e.g. 'MLP', 'KOZ', 'KNR').
 */
export function normalizeDistrictCode(input: string | undefined | null): string {
  if (!input) return '';
  const clean = String(input).trim();
  if (!clean) return '';
  const upper = clean.toUpperCase();
  const lower = clean.toLowerCase();

  // 1. Direct code match (e.g. 'MLP', 'KOZ', 'KNR')
  const byCode = DISTRICTS.find(d => d.code === upper);
  if (byCode) return byCode.code;

  // 2. Direct RTO match (e.g. 'KL-10', 'KL10', '10', 'KL-11')
  if (RTO_TO_DISTRICT_CODE[upper]) {
    return RTO_TO_DISTRICT_CODE[upper];
  }

  // 3. Slug and alias dictionary match (e.g. 'malappuram', 'kozhikode', 'calicut')
  if (SLUG_TO_DISTRICT_CODE[lower]) {
    return SLUG_TO_DISTRICT_CODE[lower];
  }

  // 4. Direct name match (e.g. 'Malappuram', 'Kozhikode')
  const byName = DISTRICTS.find(d => d.name.toLowerCase() === lower);
  if (byName) return byName.code;

  // 5. Common spelling variations & historical city names (fallback)
  if (lower.includes('kasaragod') || lower.includes('kasargod')) return 'KSD';
  if (lower.includes('kannur') || lower.includes('cannanore')) return 'KNR';
  if (lower.includes('wayanad') || lower.includes('wynad')) return 'WYD';
  if (lower.includes('kozhikode') || lower.includes('calicut') || lower.includes('kozicode')) return 'KOZ';
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
