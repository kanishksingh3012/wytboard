import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import type { Feedback } from '../interviewer/feedback'
import { getInterviewType, type SessionOptions } from '../interviewer/session'
import { createStore, del, get, set, values } from 'idb-keyval'

/** What the home screen needs to list a board without loading its canvas. */
export interface BoardMeta {
  id: string
  title: string
  /** What the user said they wanted to practise; empty for a blank board. */
  brief: string
  createdAt: number
  updatedAt: number
  /** Chosen on the home screen; absent on boards made before these options existed. */
  session?: SessionOptions
  /** When the interview was started and ended; the timer runs on wall-clock time. */
  startedAt?: number
  endedAt?: number
  hintsUsed?: number
  feedback?: Feedback
  /** Small JPEG data URL of the canvas, absent until something is drawn. */
  thumbnail?: string
}

export interface BoardScene {
  elements: readonly ExcalidrawElement[]
  files: BinaryFiles
  view: { scrollX: number; scrollY: number; zoom: number }
}

export interface TranscriptMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Sent to the model but not shown, e.g. the cue that starts the interview. */
  hidden?: boolean
}

// idb-keyval allows one object store per database, hence three databases.
const metaStore = createStore('wytboard-board-meta', 'meta')
const sceneStore = createStore('wytboard-board-scenes', 'scenes')
const transcriptStore = createStore('wytboard-board-transcripts', 'transcripts')

const UNTITLED = 'Untitled board'
const TITLE_MAX = 60

function titleFromBrief(brief: string, session?: SessionOptions): string {
  const firstLine = brief.trim().split('\n')[0] ?? ''
  if (!firstLine) return session ? getInterviewType(session.interviewType).label : UNTITLED
  return firstLine.length > TITLE_MAX ? `${firstLine.slice(0, TITLE_MAX - 1).trimEnd()}…` : firstLine
}

export async function listBoards(): Promise<BoardMeta[]> {
  const boards = await values<BoardMeta>(metaStore)
  return boards.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function createBoard(brief: string, session?: SessionOptions): Promise<BoardMeta> {
  const now = Date.now()
  const meta: BoardMeta = {
    id: crypto.randomUUID(),
    title: titleFromBrief(brief, session),
    brief: brief.trim(),
    session,
    createdAt: now,
    updatedAt: now,
  }
  await set(meta.id, meta, metaStore)
  return meta
}

export function getBoardMeta(id: string): Promise<BoardMeta | undefined> {
  return get<BoardMeta>(id, metaStore)
}

export function getBoardScene(id: string): Promise<BoardScene | undefined> {
  return get<BoardScene>(id, sceneStore)
}

// Metadata updates are read-modify-write, so they run one at a time; otherwise an
// autosave could overwrite a session update made at the same moment.
let metaQueue: Promise<void> = Promise.resolve()

export function updateBoardMeta(id: string, patch: Partial<Omit<BoardMeta, 'id'>>): Promise<void> {
  metaQueue = metaQueue
    .catch(() => undefined)
    .then(async () => {
      const meta = await getBoardMeta(id)
      if (meta) await set(id, { ...meta, ...patch }, metaStore)
    })
  return metaQueue
}

/**
 * @param edited false when only the viewport moved, so the board keeps its
 *   place in the library order and its existing thumbnail.
 */
export async function saveBoardScene(
  id: string,
  scene: BoardScene,
  edited: boolean,
  thumbnail?: string,
) {
  await set(id, scene, sceneStore)
  if (edited) await updateBoardMeta(id, { updatedAt: Date.now(), thumbnail })
}

export async function renameBoard(id: string, title: string) {
  await updateBoardMeta(id, { title: title.trim() || UNTITLED })
}

export async function deleteBoard(id: string) {
  await Promise.all([del(id, metaStore), del(id, sceneStore), del(id, transcriptStore)])
}

export async function getTranscript(id: string): Promise<TranscriptMessage[]> {
  return (await get<TranscriptMessage[]>(id, transcriptStore)) ?? []
}

export function saveTranscript(id: string, messages: TranscriptMessage[]) {
  return set(id, messages, transcriptStore)
}

/** A board with everything needed to recreate it in another browser. */
export interface BoardFile {
  format: 'wytboard'
  version: 1
  meta: BoardMeta
  scene?: BoardScene
  transcript: TranscriptMessage[]
}

export async function exportBoard(id: string): Promise<BoardFile | undefined> {
  const meta = await getBoardMeta(id)
  if (!meta) return undefined
  return {
    format: 'wytboard',
    version: 1,
    meta,
    scene: await getBoardScene(id),
    transcript: await getTranscript(id),
  }
}

/** Adds a board from an exported file. It gets a new id, so nothing is overwritten. */
export async function importBoard(data: unknown): Promise<BoardMeta> {
  const file = data as Partial<BoardFile> | null
  if (file?.format !== 'wytboard' || file.version !== 1 || typeof file.meta?.title !== 'string') {
    throw new Error('This is not a Wytboard board file.')
  }

  const meta: BoardMeta = { ...file.meta, id: crypto.randomUUID(), updatedAt: Date.now() }
  await set(meta.id, meta, metaStore)
  if (file.scene && Array.isArray(file.scene.elements)) await set(meta.id, file.scene, sceneStore)
  if (Array.isArray(file.transcript)) await set(meta.id, file.transcript, transcriptStore)
  return meta
}
