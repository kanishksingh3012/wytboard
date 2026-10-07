import {
  Excalidraw,
  FONT_FAMILY,
  MainMenu,
  exportToBlob,
  getNonDeletedElements,
  hashElementsVersion,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import type { Theme } from '../app/useTheme'
import { saveBoardScene, type BoardScene } from '../library/boards'
import './board.css'
import { applyDotGrid } from './dotGrid'

/** How long to wait after the last edit before saving. */
const SAVE_DELAY_MS = 800
const THUMBNAIL_SIZE = 480
/** Longest side of the image sent to the interviewer; small to save quota. */
const CAPTURE_SIZE = 1024

export type SaveState = 'saved' | 'saving' | 'error'

export interface BoardHandle {
  /** Saves any pending changes now; resolves when they are stored. */
  flush: () => Promise<void>
  /** What the interviewer gets to see of the board. */
  capture: () => Promise<BoardCapture>
}

export interface BoardCapture {
  /** Changes whenever the drawing changes; used to skip unchanged snapshots. */
  version: number
  /** Compressed JPEG data URL; absent when the board is empty. */
  image?: string
  /** Typed text on the board, which is cheap to send every time. */
  texts: string[]
}

interface BoardProps {
  boardId: string
  theme: Theme
  initialScene?: BoardScene
  onSaveStateChange: (state: SaveState) => void
  ref?: Ref<BoardHandle>
}

interface Snapshot {
  elements: readonly OrderedExcalidrawElement[]
  appState: AppState
  files: BinaryFiles
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function renderImage(
  snapshot: Pick<Snapshot, 'elements' | 'files'>,
  size: number,
  quality: number,
): Promise<string | undefined> {
  const elements = getNonDeletedElements(snapshot.elements)
  if (elements.length === 0) return undefined
  const blob = await exportToBlob({
    elements,
    files: snapshot.files,
    appState: { exportBackground: true, viewBackgroundColor: '#ffffff' },
    maxWidthOrHeight: size,
    mimeType: 'image/jpeg',
    quality,
    exportPadding: 24,
  })
  return blobToDataUrl(blob)
}

export function Board({ boardId, theme, initialScene, onSaveStateChange, ref }: BoardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const latest = useRef<Snapshot | null>(null)
  const savedVersion = useRef(hashElementsVersion(initialScene?.elements ?? []))
  const viewMoved = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)

  const syncDotGrid = useCallback((scrollX: number, scrollY: number, zoom: AppState['zoom']) => {
    applyDotGrid(wrapperRef.current, scrollX, scrollY, zoom.value)
  }, [])

  const save = useCallback(async () => {
    window.clearTimeout(timer.current)
    const snapshot = latest.current
    if (!snapshot) return

    const version = hashElementsVersion(snapshot.elements)
    const edited = version !== savedVersion.current
    if (!edited && !viewMoved.current) return

    const { scrollX, scrollY, zoom } = snapshot.appState
    try {
      await saveBoardScene(
        boardId,
        {
          elements: getNonDeletedElements(snapshot.elements),
          files: snapshot.files,
          view: { scrollX, scrollY, zoom: zoom.value },
        },
        edited,
        edited ? await renderImage(snapshot, THUMBNAIL_SIZE, 0.7) : undefined,
      )
      savedVersion.current = version
      viewMoved.current = false
      onSaveStateChange('saved')
    } catch (error) {
      console.error('Could not save the board', error)
      onSaveStateChange('error')
    }
  }, [boardId, onSaveStateChange])

  const capture = useCallback(async (): Promise<BoardCapture> => {
    const api = apiRef.current
    const elements = api?.getSceneElements() ?? []
    return {
      version: hashElementsVersion(elements),
      image: await renderImage({ elements, files: api?.getFiles() ?? {} }, CAPTURE_SIZE, 0.6),
      texts: elements.flatMap((element) =>
        element.type === 'text' && element.text.trim() ? [element.text.trim()] : [],
      ),
    }
  }, [])

  useImperativeHandle(ref, () => ({ flush: save, capture }), [save, capture])

  const handleChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      latest.current = { elements, appState, files }
      if (hashElementsVersion(elements) === savedVersion.current) return

      onSaveStateChange('saving')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(save, SAVE_DELAY_MS)
    },
    [save, onSaveStateChange],
  )

  const handleScroll = useCallback(
    (scrollX: number, scrollY: number, zoom: AppState['zoom']) => {
      viewMoved.current = true
      syncDotGrid(scrollX, scrollY, zoom)
    },
    [syncDotGrid],
  )

  const handleApi = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api
      const { scrollX, scrollY, zoom } = api.getAppState()
      syncDotGrid(scrollX, scrollY, zoom)
    },
    [syncDotGrid],
  )

  // Save when the tab is hidden or closed, and when leaving the board.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void save()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', save)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', save)
      void save()
    }
  }, [save])

  return (
    <div ref={wrapperRef} className="board dot-grid h-full w-full">
      <Excalidraw
        theme={theme}
        excalidrawAPI={handleApi}
        onChange={handleChange}
        onScrollChange={handleScroll}
        initialData={{
          elements: initialScene?.elements,
          files: initialScene?.files,
          appState: {
            viewBackgroundColor: 'transparent',
            currentItemRoughness: 0,
            currentItemFontFamily: FONT_FAMILY.Nunito,
            ...(initialScene && {
              scrollX: initialScene.view.scrollX,
              scrollY: initialScene.view.scrollY,
              zoom: { value: initialScene.view.zoom as AppState['zoom']['value'] },
            }),
          },
        }}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            toggleTheme: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw>
    </div>
  )
}
