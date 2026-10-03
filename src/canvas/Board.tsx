import { Excalidraw, FONT_FAMILY, MainMenu } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { AppState } from '@excalidraw/excalidraw/types'
import { useCallback, useRef, type ReactNode } from 'react'
import type { Theme } from '../app/useTheme'
import './board.css'

/** Distance between grid dots at 100% zoom, in pixels. */
const DOT_SPACING = 24

interface BoardProps {
  theme: Theme
  /** Controls shown in the top-right corner, next to Excalidraw's own UI. */
  topRight?: ReactNode
}

export function Board({ theme, topRight }: BoardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={wrapperRef} className="board dot-grid h-full w-full">
      <Excalidraw
        theme={theme}
        onScrollChange={syncDotGrid}
        initialData={{
          appState: {
            viewBackgroundColor: 'transparent',
            currentItemRoughness: 0,
            currentItemFontFamily: FONT_FAMILY.Nunito,
          },
        }}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            toggleTheme: false,
          },
        }}
        renderTopRightUI={() => <>{topRight}</>}
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
