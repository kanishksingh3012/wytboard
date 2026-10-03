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

/** Distance between grid dots at 100% zoom, in pixels. */
const DOT_SPACING = 24
/** How long to wait after the last edit before saving. */
const SAVE_DELAY_MS = 800
const THUMBNAIL_SIZE = 480

export type SaveState = 'saved' | 'saving' | 'error'

export interface BoardHandle {
  /** Saves any pending changes now; resolves when they are stored. */
  flush: () => Promise<void>
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

async function makeThumbnail(snapshot: Snapshot): Promise<string | undefined> {
  const elements = getNonDeletedElements(snapshot.elements)
  if (elements.length === 0) return undefined
  const blob = await exportToBlob({
    elements,
    files: snapshot.files,
    appState: { exportBackground: true, viewBackgroundColor: '#ffffff' },
    maxWidthOrHeight: THUMBNAIL_SIZE,
    mimeType: 'image/jpeg',
    quality: 0.7,
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

  // The dot grid is a CSS background behind a transparent canvas, so it has to
  // be moved and scaled by hand to follow the canvas as the user pans and zooms.
  const syncDotGrid = useCallback((scrollX: number, scrollY: number, zoom: AppState['zoom']) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    // Keep dots readable when zoomed far out by doubling the spacing.
    let spacing = DOT_SPACING * zoom.value
    while (spacing < DOT_SPACING / 2) spacing *= 2

    wrapper.style.backgroundSize = `${spacing}px ${spacing}px`
    wrapper.style.backgroundPosition = `${scrollX * zoom.value}px ${scrollY * zoom.value}px`
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
        edited ? await makeThumbnail(snapshot) : undefined,
      )
      savedVersion.current = version
      viewMoved.current = false
      onSaveStateChange('saved')
    } catch (error) {
      console.error('Could not save the board', error)
      onSaveStateChange('error')
    }
  }, [boardId, onSaveStateChange])

  useImperativeHandle(ref, () => ({ flush: save }), [save])

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
