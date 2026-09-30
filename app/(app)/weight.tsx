'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_UNITS,
  UNITS_STORAGE_KEY,
  formatVolume,
  formatWeight,
  readStoredUnits,
  unitLabel,
  type UnitSystem,
} from '@/lib/units'

function useUnits(): UnitSystem {
  const [unit, setUnit] = useState<UnitSystem>(DEFAULT_UNITS)

  useEffect(() => {
    function sync() {
      setUnit(readStoredUnits())
    }
    sync()
    function onStorage(e: StorageEvent) {
      if (e.key === UNITS_STORAGE_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return unit
}

// Read-only display of a weight stored in lb, converted to the user's unit.
export function Weight({
  lbs,
  suffix = true,
}: {
  lbs: number | null
  suffix?: boolean
}) {
  const unit = useUnits()
  const text = formatWeight(lbs, unit)
  if (text === '–') return <>–</>
  return (
    <>
      {text}
      {suffix ? ` ${unitLabel(unit)}` : ''}
    </>
  )
}

// Read-only display of an aggregate (e.g. session volume) stored in lb.
export function Volume({ lbs, suffix = true }: { lbs: number; suffix?: boolean }) {
  const unit = useUnits()
  return (
    <>
      {formatVolume(lbs, unit)}
      {suffix ? ` ${unitLabel(unit)}` : ''}
    </>
  )
}

// Uncontrolled weight text field for plain <form action={...}> usage. Shows
// the value converted to the user's unit and posts a companion hidden field
// so the server action knows which unit to convert back from before saving.
export function WeightInput({
  name,
  defaultValueLbs,
  placeholder,
  className,
}: {
  name: string
  defaultValueLbs: number | null
  placeholder?: string
  className?: string
}) {
  const unit = useUnits()
  const displayDefault = defaultValueLbs === null ? '' : formatWeight(defaultValueLbs, unit)

  return (
    <>
      <input
        key={unit}
        type="number"
        inputMode="decimal"
        name={`${name}Display`}
        defaultValue={displayDefault}
        placeholder={placeholder}
        className={className}
      />
      <input type="hidden" name={`${name}Unit`} value={unit} />
    </>
  )
}
