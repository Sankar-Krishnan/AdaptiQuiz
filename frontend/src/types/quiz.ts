export interface StartQuizRequest {
  topic: string
  difficulty?: number
}

export interface StartQuizResponse {
  session_id: string
  question: string
  difficulty: number
}

export interface AnswerRequest {
  session_id: string
  answer: string
}

export interface AnswerResponse {
  correct: boolean
  explanation: string
  feedback: string
  next_question: string
  difficulty: number
  score: number         // cumulative score (computed client-side; backend returns streak)
  streak: number
  next_action: string   // "retry" | "escalate" | "scaffold" | "same"
  hint: string          // non-empty when next_action === "retry"
}

// Stored locally for the results screen
export interface HistoryEntry {
  question: string
  answer: string
  correct: boolean
  difficulty: number
}

export interface QuizSession {
  session_id: string
  topic: string
  score: number
  streak: number
  difficulty: number
  history: HistoryEntry[]
}

export interface InsightsData {
  topic: string
  mastery_level: number   // 1–5
  strengths: string[]
  weak_areas: string[]
  recommended_focus: string[]
  overall_summary: string
  sessions_analyzed: number
}

export interface FinishResponse {
  insights: InsightsData
}

// --- Auth ---

export interface SignUpRequest {
  name: string
  email: string
  password: string
  password_confirm: string
  grade_level: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  student_id: string
  name: string
  grade_level: string
  access_token: string
  token_type: string
}

export interface AuthUser {
  student_id: string
  name: string
  grade_level: string
}
