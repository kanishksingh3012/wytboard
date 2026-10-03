import type { PersonalityId } from './personalities'

export type SessionMode = 'interview' | 'practice'
export type InterviewTypeId = 'new-product' | 'improve-product' | 'abstract' | 'company-feature'

export interface InterviewType {
  id: InterviewTypeId
  label: string
  /** Inserted into the system prompt. */
  prompt: string
}

export const INTERVIEW_TYPES: InterviewType[] = [
  {
    id: 'new-product',
    label: 'Design a new product',
    prompt: 'Exercise type: design a new product or service from scratch for a given audience.',
  },
  {
    id: 'improve-product',
    label: 'Improve an existing product',
    prompt: 'Exercise type: improve a specific part of a well-known existing product.',
  },
  {
    id: 'abstract',
    label: 'Abstract challenge',
    prompt:
      'Exercise type: an abstract or constraint-driven challenge with an unusual user or ' +
      'context (in the spirit of "an ATM for children").',
  },
  {
    id: 'company-feature',
    label: 'Feature for a company',
    prompt:
      'Exercise type: design a feature for the specific company or domain the candidate names, ' +
      'grounded in that business.',
  },
]

export const MODES: { id: SessionMode; label: string; description: string }[] = [
  {
    id: 'interview',
    label: 'Interview',
    description: 'Realistic: the interviewer answers clarifying questions and gives no hints.',
  },
  {
    id: 'practice',
    label: 'Practice',
    description: 'When you are stuck, the interviewer may name an area to think about.',
  },
]

export const DURATIONS = [30, 45, 60]

/** The choices made on the home screen when a board is started. */
export interface SessionOptions {
  interviewType: InterviewTypeId
  personality: PersonalityId
  mode: SessionMode
  durationMin: number
}

export function getInterviewType(id: InterviewTypeId): InterviewType {
  return INTERVIEW_TYPES.find((t) => t.id === id) ?? INTERVIEW_TYPES[0]
}
