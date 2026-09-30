export type UnitSystem = 'lbs' | 'kg'

export const UNITS_STORAGE_KEY = 'gym-journal:units'
export const DEFAULT_UNITS: UnitSystem = 'lbs'

export const UNIT_OPTIONS: { id: UnitSystem; label: string }[] = [
  { id: 'lbs', label: 'Pounds' },
  { id: 'kg', label: 'Kilograms' },
]

// 1 kg = this many lb. Weights are always persisted in lb; this is the only
// place the conversion factor lives.
const LB_PER_KG = 2.2046226218

export const PLATE_DENOMINATIONS_LB = [45, 35, 25, 10, 5, 2.5]
export const PLATE_DENOMINATIONS_KG = [25, 20, 15, 10, 5, 2.5, 1.25]
export const BAR_WEIGHT_LB = 45
export const BAR_WEIGHT_KG = 20
export const WEIGHT_BUMP_LB = 5
export const WEIGHT_BUMP_KG = 2.5

export function readStoredUnits(): UnitSystem {
  if (typeof localStorage === 'undefined') return DEFAULT_UNITS
  const stored = localStorage.getItem(UNITS_STORAGE_KEY)
  return stored === 'kg' ? 'kg' : DEFAULT_UNITS
}

export function unitLabel(unit: UnitSystem): string {
  return unit === 'kg' ? 'kg' : 'lb'
}

// lb -> display unit, rounded to the nearest 0.5 kg so kg numbers stay clean.
// lb stays exact since that's the storage unit already.
export function toDisplayNumber(lbs: number, unit: UnitSystem): number {
  if (unit === 'lbs') return lbs
  return Math.round((lbs / LB_PER_KG) * 2) / 2
}

// Display-unit value (whatever the user typed/sees) -> lb for storage.
export function displayToLbs(value: number, unit: UnitSystem): number {
  if (unit === 'lbs') return value
  return value * LB_PER_KG
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function formatWeight(lbs: number | null, unit: UnitSystem): string {
  if (lbs === null || Number.isNaN(lbs)) return '–'
  return trimNumber(toDisplayNumber(lbs, unit))
}

// Aggregate totals (session volume, chart volume series) — rounded to a
// whole number since these are big sums where half-units aren't useful.
export function volumeToDisplayNumber(lbsVolume: number, unit: UnitSystem): number {
  const value = unit === 'kg' ? lbsVolume / LB_PER_KG : lbsVolume
  return Math.round(value)
}

export function formatVolume(lbsVolume: number, unit: UnitSystem): string {
  return volumeToDisplayNumber(lbsVolume, unit).toLocaleString()
}
