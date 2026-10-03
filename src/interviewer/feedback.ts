import type { BoardCapture } from '../canvas/Board'
import type { TranscriptMessage } from '../library/boards'
import { LlmError, chat, type ContentPart, type LlmConfig } from '../llm/client'

export const CRITERIA = [
  'Problem framing',
  'User understanding',
  'Prioritisation',
  'Solution quality',
  'Communication',
]

export interface Feedback {
  summary: string
  scores: { criterion: string; score: number; comment: string }[]
  strengths: string[]
  improvements: string[]
  /** What a strong answer to this specific problem would cover. */
  strongAnswer: string[]
}

const PROMPT = `You are a senior product designer who has just finished running a whiteboard
design interview. Assess the candidate honestly and specifically, as you would in a hiring
debrief. Base every point on the transcript and the board; do not invent things they did not do.
If there is too little to judge a criterion, give it a low score and say so.

Reply with JSON only, no markdown, in exactly this shape:
{
  "summary": "two or three sentences on the overall performance",
  "scores": [{ "criterion": "<name>", "score": <integer 1-5>, "comment": "one specific sentence" }],
  "strengths": ["up to three specific strengths"],
  "improvements": ["up to three specific things to do differently next time"],
  "strongAnswer": ["four to six things a strong answer to this specific problem would cover, as areas to address, not as a finished solution"]
}
Score exactly these criteria, in this order: ${CRITERIA.join(', ')}.`

function parseFeedback(reply: string): Feedback {
  // Models often wrap JSON in a code fence despite being told not to.
  const json = reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1)
  const data = JSON.parse(json) as Partial<Feedback>
  if (!Array.isArray(data.scores) || typeof data.summary !== 'string') {
    throw new Error('unexpected shape')
  }
  return {
    summary: data.summary,
    scores: data.scores.map((entry) => ({
      criterion: String(entry.criterion),
      score: Math.min(5, Math.max(1, Math.round(Number(entry.score)) || 1)),
      comment: String(entry.comment ?? ''),
    })),
    strengths: (data.strengths ?? []).map(String),
    improvements: (data.improvements ?? []).map(String),
    strongAnswer: (data.strongAnswer ?? []).map(String),
  }
}

export async function generateFeedback(
  config: LlmConfig,
  input: { brief: string; transcript: TranscriptMessage[]; board?: BoardCapture; minutes: number },
): Promise<Feedback> {
  const conversation = input.transcript
    .filter((message) => !message.hidden)
    .map((message) => `${message.role === 'user' ? 'Candidate' : 'Interviewer'}: ${message.content}`)
    .join('\n')

  const text =
    `What the candidate asked to practise: ${input.brief || '(interviewer chose the problem)'}\n` +
    `Session length: ${input.minutes} minutes.\n\n` +
    `TRANSCRIPT\n${conversation || '(nothing was said)'}\n\n` +
    `TEXT TYPED ON THE BOARD\n${input.board?.texts.join('\n') || '(none)'}\n\n` +
    (input.board?.image ? 'The final board is attached as an image.' : 'The board was left empty.')

  const ask = (withImage: boolean) => {
    const parts: ContentPart[] = [{ type: 'text', text }]
    if (withImage && input.board?.image) {
      parts.push({ type: 'image_url', image_url: { url: input.board.image } })
    }
    return chat(
      config,
      [
        { role: 'system', content: PROMPT },
        { role: 'user', content: parts },
      ],
      { maxTokens: 2000 },
    )
  }

  let reply: string
  try {
    reply = await ask(true)
  } catch (cause) {
    // A model that cannot read images rejects the request; fall back to text only.
    if (!(cause instanceof LlmError && cause.status === 400 && input.board?.image)) throw cause
    reply = await ask(false)
  }

  try {
    return parseFeedback(reply)
  } catch {
    throw new LlmError('The model returned feedback in a form that could not be read. Try again.')
  }
}
