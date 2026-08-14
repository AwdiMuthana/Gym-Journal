'use server'

import { getOverviewStats, getWeeklyFrequency, getLoggedExercises, getExerciseProgress, getPRs } from '@/lib/db'
import { generateText, type GeminiResult } from '@/lib/gemini'

const MAX_EXERCISES = 6
const POINTS_PER_EXERCISE = 6

export async function getCoachingInsights(): Promise<GeminiResult> {
  const [overview, frequency, exercises, prs] = await Promise.all([
    getOverviewStats(),
    getWeeklyFrequency(8),
    getLoggedExercises(),
    getPRs(),
  ])

  const topExercises = exercises.slice(0, MAX_EXERCISES)
  const progressByExercise = await Promise.all(
    topExercises.map(async (ex) => ({ ex, progress: await getExerciseProgress(ex.key) }))
  )

  const progressLines = progressByExercise
    .map(({ ex, progress }) => {
      const recent = progress.slice(-POINTS_PER_EXERCISE)
      if (recent.length === 0) return null
      const trail = recent.map((p) => `${p.top_weight ?? '–'}lb@${p.performed_at_label}`).join(' -> ')
      return `- ${ex.name}: ${trail}`
    })
    .filter(Boolean)
    .join('\n')

  const prLines = prs
    .slice(0, 8)
    .map((p) => `- ${p.exercise_name}: ${p.best_weight}lb x ${p.best_reps}`)
    .join('\n')

  const prompt = `You are a concise strength-training coach reviewing a lifter's logged workout data. Using only the data below, write a short analysis (3-5 sentences, plain prose, no headers or bullet points) covering: any exercise that looks like a plateau (its top weight hasn't moved across its recent sessions), any notable recent progress, and one or two concrete, actionable suggestions. Reference specific exercise names and numbers from the data. Do not restate these instructions.

Overview: ${overview.total_workouts} workouts logged, ${overview.total_sets} total sets, current streak ${overview.current_streak_weeks} week(s).
Weekly workout counts, last 8 weeks oldest to newest: ${frequency.map((f) => f.workout_count).join(', ')}

Personal records:
${prLines || '(none yet)'}

Recent per-exercise top weight by session, oldest to newest:
${progressLines || '(not enough history yet)'}`

  return generateText(prompt)
}
