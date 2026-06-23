export type Plan = {
    id: string
    user_id: string
    name: string
    created_at: string
  }
  
  export type Day = {
    id: string
    plan_id: string
    name: string
    position: number
    created_at: string
  }
  
  export type Exercise = {
    id: string
    day_id: string
    name: string
    target_sets: number
    target_reps: string
    position: number
    created_at: string
  }
  
  export type Session = {
    id: string
    user_id: string
    day_id: string | null
    performed_at: string
    created_at: string
  }
  
  export type SetLog = {
    id: string
    session_id: string
    exercise_id: string | null
    exercise_name: string
    set_number: number
    weight: number | null
    reps: number | null
    notes: string | null
    created_at: string
  }
  
  // Aggregated types used in the UI
  export type DayWithExercises = Day & { exercises: Exercise[] }
  export type PlanWithDays = Plan & { days: DayWithExercises[] }