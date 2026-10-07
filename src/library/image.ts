import { getBoardScene } from './boards'

/** Pixels per canvas unit: three times screen size, sharp enough to zoom in or print. */
const SCALE = 3

/** Renders a board's drawing as a high-resolution PNG. Returns null when the board is empty. */
export async function renderBoardImage(id: string): Promise<Blob | null> {
  const scene = await getBoardScene(id)
  if (!scene || scene.elements.length === 0) return null

  const { exportToBlob } = await import('@excalidraw/excalidraw')
  return exportToBlob({
    elements: scene.elements,
    files: scene.files,
    appState: { exportBackground: true, viewBackgroundColor: '#ffffff' },
    mimeType: 'image/png',
    exportPadding: 48,
    getDimensions: (width: number, height: number) => ({ width: width * SCALE, height: height * SCALE, scale: SCALE }),
  })
}
