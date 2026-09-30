import data from '@/data/exercises.json'

export type ExerciseDbEntry = {
  name: string
  muscle: string
  equipment: string
}

// free-exercise-db (github.com/yuhonas/free-exercise-db), dedicated to the
// public domain under the Unlicense — trimmed to name/muscle/equipment.
export const EXERCISE_DB: ExerciseDbEntry[] = data as ExerciseDbEntry[]

export const MUSCLE_GROUPS: string[] = Array.from(
  new Set(EXERCISE_DB.map((e) => e.muscle))
).sort()

export function tokenize(query: string): string[] {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean)
}

export function matchesQuery(name: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false
  const lower = name.toLowerCase()
  return tokens.every((t) => lower.includes(t))
}

export function searchExerciseDb(query: string, limit = 20): ExerciseDbEntry[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []
  const lowerQuery = query.toLowerCase().trim()
  const matches = EXERCISE_DB.filter((e) => matchesQuery(e.name, tokens))
  matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(lowerQuery)
    const bStarts = b.name.toLowerCase().startsWith(lowerQuery)
    if (aStarts !== bStarts) return aStarts ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return matches.slice(0, limit)
}

export function exercisesByMuscle(muscle: string, limit = 80): ExerciseDbEntry[] {
  return EXERCISE_DB.filter((e) => e.muscle === muscle).slice(0, limit)
}
