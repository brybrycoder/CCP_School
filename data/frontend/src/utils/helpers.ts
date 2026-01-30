import { InstitutionKey, InstitutionGroup } from '../types';

/**
 * Institution groups for organizing the multi-select UI
 */
export const INSTITUTION_GROUPS: InstitutionGroup[] = [
  {
    name: 'Universities',
    institutions: ['nus', 'ntu', 'smu', 'sit', 'sutd', 'suss'],
  },
  {
    name: 'Polytechnics',
    institutions: [
      'singapore_polytechnic',
      'ngee_ann_polytechnic',
      'temasek_polytechnic',
      'nanyang_polytechnic',
      'republic_polytechnic',
    ],
  },
  {
    name: 'Arts & Others',
    institutions: [
      'nie',
      'ite',
      'lasalle_diploma',
      'lasalle_degree',
      'nafa_diploma',
      'nafa_degree',
    ],
  },
];

/**
 * Human-readable labels for institutions
 */
export const INSTITUTION_LABELS: Record<InstitutionKey, string> = {
  nus: 'NUS',
  ntu: 'NTU',
  smu: 'SMU',
  sit: 'SIT',
  sutd: 'SUTD',
  suss: 'SUSS',
  singapore_polytechnic: 'Singapore Poly',
  ngee_ann_polytechnic: 'Ngee Ann Poly',
  temasek_polytechnic: 'Temasek Poly',
  nanyang_polytechnic: 'Nanyang Poly',
  republic_polytechnic: 'Republic Poly',
  nie: 'NIE',
  ite: 'ITE',
  lasalle_diploma: 'LASALLE (Diploma)',
  lasalle_degree: 'LASALLE (Degree)',
  nafa_diploma: 'NAFA (Diploma)',
  nafa_degree: 'NAFA (Degree)',
};

/**
 * Get all institution keys
 */
export const getAllInstitutions = (): InstitutionKey[] => {
  return INSTITUTION_GROUPS.flatMap((group) => group.institutions);
};

/**
 * Get institution label
 */
export const getInstitutionLabel = (key: InstitutionKey): string => {
  return INSTITUTION_LABELS[key] || key;
};

/**
 * Check if a value is a valid number (not NaN, null, or undefined)
 */
export const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

/**
 * Safely parse a number, returning null for invalid values
 */
export const safeParseNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '' || value === 'na') {
    return null;
  }
  const parsed = Number(value);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Generate a range of years
 */
export const generateYearRange = (start: number, end: number): number[] => {
  const years: number[] = [];
  for (let year = start; year <= end; year++) {
    years.push(year);
  }
  return years;
};
