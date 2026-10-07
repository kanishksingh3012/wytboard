import { createBoard, getBoardMeta, getBoardScene, renameBoard, saveBoardScene, type BoardMeta, type BoardScene } from './boards'

/**
 * Share links carry the whole board inside the URL, compressed. There is no
 * server: nothing is uploaded, and anyone who has the link can open the board.
 */
export interface SharedBoard {
  v: 1
  title: string
  brief: string
  scene: BoardScene
}

/** Longer links than this are unreliable to paste and send. */
const MAX_LINK_CHARS = 100_000

export class ShareError extends Error {}

async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  const piped = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(piped).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Builds a link that opens a read-only copy of the board. The transcript and feedback are not included. */
export async function createShareLink(id: string): Promise<string> {
  const [meta, scene] = await Promise.all([getBoardMeta(id), getBoardScene(id)])
  if (!meta) throw new ShareError('This board could not be found.')
  if (typeof CompressionStream === 'undefined') {
    throw new ShareError('This browser cannot create share links. Use Export instead.')
  }

  const shared: SharedBoard = {
    v: 1,
    title: meta.title,
    brief: meta.brief,
    scene: scene ?? { elements: [], files: {}, view: { scrollX: 0, scrollY: 0, zoom: 1 } },
  }
  const json = new TextEncoder().encode(JSON.stringify(shared))
  const data = toBase64Url(await transform(json, new CompressionStream('deflate-raw')))
  if (data.length > MAX_LINK_CHARS) {
    throw new ShareError('This board is too large for a link, usually because of images. Use Export instead.')
  }
  return `${location.origin}${location.pathname}#/shared/${data}`
}

export async function readShareData(data: string): Promise<SharedBoard> {
  try {
    const json = await transform(fromBase64Url(data), new DecompressionStream('deflate-raw'))
    const shared = JSON.parse(new TextDecoder().decode(json)) as SharedBoard
    if (shared.v !== 1 || !Array.isArray(shared.scene?.elements)) throw new Error('shape')
    return shared
  } catch {
    throw new ShareError('This share link is broken or incomplete. Ask for it to be sent again.')
  }
}

/** Saves a shared board into this browser's library as a new board. */
export async function saveSharedCopy(shared: SharedBoard): Promise<BoardMeta> {
  const meta = await createBoard(shared.brief)
  await renameBoard(meta.id, shared.title)
  await saveBoardScene(meta.id, shared.scene, true)
  return meta
}
