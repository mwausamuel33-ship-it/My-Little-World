
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Transformer,
  Line,
} from 'react-konva'
import type Konva from 'konva'
import useImage from 'use-image'
import { db, type ScrapbookElement, type ScrapbookPage } from './db'
import './Scrapbook.css'

const WIDTH = 700
const HEIGHT = 500
const MAX_HISTORY = 50

const backgrounds = [
  { name: 'Cream', value: '#FFF9EF' },
  { name: 'Blush', value: '#FCE8EC' },
  { name: 'Sage', value: '#E6EEDD' },
  { name: 'Lilac', value: '#F0E9FA' },
  { name: 'Sky', value: '#E8F2FA' },
  { name: 'Butter', value: '#FFF1C9' },
  { name: 'White', value: '#FFFFFF' },
]

const paperStyles = ['Plain', 'Lined', 'Dotted', 'Grid'] as const
type PaperStyle = (typeof paperStyles)[number]

const stickers = [
  '🌸', '🌷', '🌼', '🦋', '💗', '✨', '🌿', '🎀',
  '⭐', '🧸', '🍓', '☁️', '♡', '୨୧', '🕊️', '🌙',
  '🍰', '🐇', '💌', '🪻', '☕', '📖', '🤍', '🪷',
]

interface EditorSnapshot {
  title: string
  background: string
  paperStyle: PaperStyle
  elements: ScrapbookElement[]
}

function makeElement(
  type: ScrapbookElement['type'],
  content: string,
  x = 220,
  y = 150,
): ScrapbookElement {
  return {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    width: type === 'image' ? 180 : 150,
    height: type === 'image' ? 150 : type === 'sticker' ? 70 : 70,
    rotation: 0,
    content,
    color: '#72515C',
    fontSize: type === 'sticker' ? 42 : 24,
  }
}

function cloneElements(elements: ScrapbookElement[]) {
  return elements.map((element) => ({ ...element }))
}

function PhotoElement({
  element,
  onSelect,
  onUpdate,
}: {
  element: ScrapbookElement
  onSelect: () => void
  onUpdate: (patch: Partial<ScrapbookElement>) => void
}) {
  const [image] = useImage(element.content, 'anonymous')

  if (!image) return null

  return (
    <KonvaImage
      id={element.id}
      image={image}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onSelect}
      onDragEnd={(event) =>
        onUpdate({ x: event.target.x(), y: event.target.y() })
      }
      onTransformEnd={(event) => {
        const node = event.target
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()

        node.scaleX(1)
        node.scaleY(1)

        onUpdate({
          x: node.x(),
          y: node.y(),
          width: Math.max(40, node.width() * scaleX),
          height: Math.max(40, node.height() * scaleY),
          rotation: node.rotation(),
        })
      }}
    />
  )
}

export default function Scrapbook() {
  const [pages, setPages] = useState<ScrapbookPage[]>([])
  const [page, setPage] = useState<ScrapbookPage | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [newText, setNewText] = useState('A little memory...')
  const [pageTitle, setPageTitle] = useState('My lovely memories')
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('Plain')
  const [history, setHistory] = useState<EditorSnapshot[]>([])
  const [future, setFuture] = useState<EditorSnapshot[]>([])

  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const historyRef = useRef<EditorSnapshot[]>([])
  const futureRef = useRef<EditorSnapshot[]>([])
  const pageRef = useRef<ScrapbookPage | null>(null)
  const titleRef = useRef(pageTitle)
  const paperRef = useRef<PaperStyle>(paperStyle)
  const backgroundRef = useRef('#FFF9EF')
  const skipHistoryRef = useRef(false)

  const selected = page?.elements.find((element) => element.id === selectedId)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  useEffect(() => {
    titleRef.current = pageTitle
  }, [pageTitle])

  useEffect(() => {
    paperRef.current = paperStyle
  }, [paperStyle])

  useEffect(() => {
    backgroundRef.current = page?.background ?? '#FFF9EF'
  }, [page?.background])

  const makeSnapshot = useCallback((): EditorSnapshot | null => {
    const current = pageRef.current
    if (!current) return null

    return {
      title: titleRef.current,
      background: current.background,
      paperStyle: paperRef.current,
      elements: cloneElements(current.elements),
    }
  }, [])

  const rememberChange = useCallback(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      return
    }

    const snapshot = makeSnapshot()
    if (!snapshot) return

    setHistory((current) => {
      const next = [...current, snapshot].slice(-MAX_HISTORY)
      historyRef.current = next
      return next
    })

    setFuture([])
    futureRef.current = []
  }, [makeSnapshot])

  async function refreshPages() {
    try {
      const saved = await db.scrapbookPages
        .orderBy('updatedAt')
        .reverse()
        .toArray()

      setPages(saved)
    } catch (error) {
      console.error('Could not load scrapbook pages:', error)
      setMessage('Could not load saved pages. Please refresh and try again.')
    }
  }

  useEffect(() => {
    void refreshPages()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current

    if (!stage || !transformer) return

    const selectedNode = selectedId
      ? stage.findOne(`#${selectedId}`)
      : undefined

    transformer.nodes(selectedNode ? [selectedNode] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedId, page?.elements])

  function resetHistory() {
    setHistory([])
    setFuture([])
    historyRef.current = []
    futureRef.current = []
  }

  function createPage() {
    const now = new Date().toISOString()

    const newPage: ScrapbookPage = {
      title: 'My new scrapbook',
      background: '#FFF9EF',
      elements: [],
      createdAt: now,
      updatedAt: now,
    }

    setPage(newPage)
    pageRef.current = newPage
    setPageTitle(newPage.title)
    titleRef.current = newPage.title
    setPaperStyle('Plain')
    paperRef.current = 'Plain'
    setSelectedId(null)
    setMessage('')
    resetHistory()
  }

  function openPage(savedPage: ScrapbookPage) {
    const openedPage = {
      ...savedPage,
      elements: cloneElements(savedPage.elements),
    }

    setPage(openedPage)
    pageRef.current = openedPage
    setPageTitle(savedPage.title)
    titleRef.current = savedPage.title
    setPaperStyle('Plain')
    paperRef.current = 'Plain'
    setSelectedId(null)
    setMessage('')
    resetHistory()
  }

  function updateElement(id: string, patch: Partial<ScrapbookElement>) {
    rememberChange()

    setPage((current) => {
      if (!current) return current

      const updated = {
        ...current,
        elements: current.elements.map((element) =>
          element.id === id ? { ...element, ...patch } : element,
        ),
      }

      pageRef.current = updated
      return updated
    })
  }

  function addElement(element: ScrapbookElement) {
    rememberChange()

    setPage((current) => {
      if (!current) return current

      const updated = {
        ...current,
        elements: [...current.elements, element],
      }

      pageRef.current = updated
      return updated
    })

    setSelectedId(element.id)
  }

  function addText() {
    addElement(makeElement('text', newText.trim() || 'Write your memory here'))
  }

  function addSticker(sticker: string) {
    addElement(makeElement('sticker', sticker))
  }

  function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Choose a photo under 5 MB for this version.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addElement(makeElement('image', reader.result, 200, 120))
        setMessage('')
      }
    }

    reader.onerror = () => setMessage('Could not read that image. Try another one.')
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function undo() {
    const currentSnapshot = makeSnapshot()
    const previous = historyRef.current

    if (!currentSnapshot || previous.length === 0) return

    const snapshot = previous[previous.length - 1]
    const remaining = previous.slice(0, -1)

    futureRef.current = [...futureRef.current, currentSnapshot].slice(-MAX_HISTORY)
    historyRef.current = remaining

    setFuture(futureRef.current)
    setHistory(remaining)

    skipHistoryRef.current = true
    applySnapshot(snapshot)
  }

  function redo() {
    const currentSnapshot = makeSnapshot()
    const next = futureRef.current

    if (!currentSnapshot || next.length === 0) return

    const snapshot = next[next.length - 1]
    const remaining = next.slice(0, -1)

    historyRef.current = [...historyRef.current, currentSnapshot].slice(-MAX_HISTORY)
    futureRef.current = remaining

    setHistory(historyRef.current)
    setFuture(remaining)

    skipHistoryRef.current = true
    applySnapshot(snapshot)
  }

  function applySnapshot(snapshot: EditorSnapshot) {
    setPage((current) => {
      if (!current) return current

      const restored = {
        ...current,
        background: snapshot.background,
        elements: cloneElements(snapshot.elements),
      }

      pageRef.current = restored
      return restored
    })

    setPageTitle(snapshot.title)
    titleRef.current = snapshot.title
    setPaperStyle(snapshot.paperStyle)
    paperRef.current = snapshot.paperStyle
    setSelectedId(null)
  }

  function removeSelected() {
    if (!page || !selectedId) return

    rememberChange()

    const updated = {
      ...page,
      elements: page.elements.filter((element) => element.id !== selectedId),
    }

    setPage(updated)
    pageRef.current = updated
    setSelectedId(null)
  }

  function duplicateSelected() {
    if (!selected) return

    addElement({
      ...selected,
      id: crypto.randomUUID(),
      x: selected.x + 24,
      y: selected.y + 24,
    })
  }

  function moveSelectedLayer(direction: 'forward' | 'backward') {
    if (!page || !selectedId) return

    const index = page.elements.findIndex((element) => element.id === selectedId)
    if (index < 0) return

    const targetIndex = direction === 'forward' ? index + 1 : index - 1
    if (targetIndex < 0 || targetIndex >= page.elements.length) return

    rememberChange()

    const elements = [...page.elements]
    ;[elements[index], elements[targetIndex]] = [elements[targetIndex], elements[index]]

    const updated = { ...page, elements }
    setPage(updated)
    pageRef.current = updated
  }

  function changeBackground(value: string) {
    rememberChange()

    setPage((current) => {
      if (!current) return current

      const updated = { ...current, background: value }
      pageRef.current = updated
      return updated
    })
  }

  function changePaperStyle(value: PaperStyle) {
    rememberChange()
    setPaperStyle(value)
    paperRef.current = value
  }

  async function savePage() {
    if (!page) return

    setSaving(true)
    setMessage('')

    try {
      const now = new Date().toISOString()

      const toSave: ScrapbookPage = {
        ...page,
        title: pageTitle.trim() || 'Untitled scrapbook',
        updatedAt: now,
      }

      if (toSave.id) {
        await db.scrapbookPages.put(toSave)
      } else {
        const id = await db.scrapbookPages.add(toSave)
        toSave.id = id
      }

      setPage(toSave)
      pageRef.current = toSave
      setPageTitle(toSave.title)
      titleRef.current = toSave.title

      await refreshPages()
      setMessage('Your page is safely saved on this device 💗')
    } catch (error) {
      console.error('Could not save scrapbook page:', error)
      setMessage('Could not save this page. Try using a smaller photo.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePage(id: number) {
    const confirmed = window.confirm(
      'Delete this scrapbook page? This cannot be undone.',
    )

    if (!confirmed) return

    try {
      await db.scrapbookPages.delete(id)

      if (page?.id === id) {
        setPage(null)
        pageRef.current = null
        setSelectedId(null)
        resetHistory()
      }

      await refreshPages()
      setMessage('Scrapbook page deleted.')
    } catch (error) {
      console.error('Could not delete scrapbook page:', error)
      setMessage('Could not delete this page. Please try again.')
    }
  }

  function goToLibrary() {
    setPage(null)
    pageRef.current = null
    setSelectedId(null)
    resetHistory()
    void refreshPages()
  }

  function renderPaper() {
    if (paperStyle === 'Plain') return null

    const lines: React.ReactNode[] = []

    if (paperStyle === 'Lined') {
      for (let y = 28; y < HEIGHT; y += 28) {
        lines.push(
          <Line
            key={`line-${y}`}
            points={[0, y, WIDTH, y]}
            stroke="#D8A8B8"
            strokeWidth={0.7}
            opacity={0.6}
            listening={false}
          />,
        )
      }
    }

    if (paperStyle === 'Grid') {
      for (let x = 20; x < WIDTH; x += 20) {
        lines.push(
          <Line
            key={`grid-x-${x}`}
            points={[x, 0, x, HEIGHT]}
            stroke="#C7B6D8"
            strokeWidth={0.5}
            opacity={0.55}
            listening={false}
          />,
        )
      }

      for (let y = 20; y < HEIGHT; y += 20) {
        lines.push(
          <Line
            key={`grid-y-${y}`}
            points={[0, y, WIDTH, y]}
            stroke="#C7B6D8"
            strokeWidth={0.5}
            opacity={0.55}
            listening={false}
          />,
        )
      }
    }

    if (paperStyle === 'Dotted') {
      for (let x = 12; x < WIDTH; x += 20) {
        for (let y = 12; y < HEIGHT; y += 20) {
          lines.push(
            <Rect
              key={`dot-${x}-${y}`}
              x={x}
              y={y}
              width={1.6}
              height={1.6}
              fill="#C7A9BA"
              cornerRadius={1}
              listening={false}
            />,
          )
        }
      }
    }

    return <>{lines}</>
  }

  return (
    <section className="scrapbook">
      <header className="scrapbook-heading">
        <div>
          <p className="scrapbook-eyebrow">YOUR LITTLE CREATIVE CORNER 🌷</p>
          <h1>Scrapbook Studio</h1>
          <p>Collect the little moments that make life lovely.</p>
        </div>

        <button className="scrapbook-primary" onClick={createPage}>
          + New page
        </button>
      </header>

      {!page ? (
        <div className="scrapbook-library">
          <div className="scrapbook-library-intro">
            <span className="scrapbook-flower">✿</span>
            <h2>Your memory pages</h2>
            <p>Your saved creations will live here.</p>
          </div>

          {pages.length === 0 ? (
            <div className="scrapbook-empty">
              <span>📔</span>
              <h3>Your first page is waiting</h3>
              <p>Add photos, little notes and stickers to make it yours.</p>
              <button className="scrapbook-primary" onClick={createPage}>
                Create my first page
              </button>
            </div>
          ) : (
            <div className="scrapbook-page-grid">
              {pages.map((savedPage) => (
                <article className="scrapbook-page-card" key={savedPage.id}>
                  <button
                    className="scrapbook-page-preview"
                    style={{ background: savedPage.background }}
                    onClick={() => openPage(savedPage)}
                    aria-label={`Open ${savedPage.title}`}
                  >
                    {savedPage.elements.slice(0, 6).map((element) => (
                      <span
                        key={element.id}
                        className="scrapbook-preview-element"
                        style={{
                          left: `${Math.min(88, Math.max(4, (element.x / WIDTH) * 100))}%`,
                          top: `${Math.min(85, Math.max(4, (element.y / HEIGHT) * 100))}%`,
                          color: element.color,
                        }}
                      >
                        {element.type === 'image' ? '🖼️' : element.content}
                      </span>
                    ))}
                  </button>

                  <div className="scrapbook-card-info">
                    <button
                      className="scrapbook-card-title"
                      onClick={() => openPage(savedPage)}
                    >
                      {savedPage.title}
                    </button>
                    <span>{savedPage.elements.length} elements</span>
                    <button
                      className="scrapbook-delete"
                      onClick={() => savedPage.id && void deletePage(savedPage.id)}
                      aria-label={`Delete ${savedPage.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="scrapbook-workspace">
          <div className="scrapbook-toolbar">
            <button className="scrapbook-secondary" onClick={goToLibrary}>
              ← All pages
            </button>

            <label className="scrapbook-title-label">
              Page title
              <input
                value={pageTitle}
                onChange={(event) => {
                  setPageTitle(event.target.value)
                  titleRef.current = event.target.value
                }}
                maxLength={80}
              />
            </label>

            <button
              className="scrapbook-secondary"
              onClick={undo}
              disabled={history.length === 0}
              title="Undo"
            >
              ↶ Undo
            </button>

            <button
              className="scrapbook-secondary"
              onClick={redo}
              disabled={future.length === 0}
              title="Redo"
            >
              ↷ Redo
            </button>

            <button
              className="scrapbook-primary"
              onClick={() => void savePage()}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save page ♡'}
            </button>
          </div>

          <div className="scrapbook-editor-layout">
            <aside className="scrapbook-tools">
              <h3>Make it yours</h3>

              <div className="scrapbook-tool-group">
                <label htmlFor="scrapbook-text">Add a little note</label>
                <textarea
                  id="scrapbook-text"
                  value={newText}
                  onChange={(event) => setNewText(event.target.value)}
                  rows={3}
                />
                <button className="scrapbook-secondary full-width" onClick={addText}>
                  + Add text
                </button>
              </div>

              <div className="scrapbook-tool-group">
                <label htmlFor="scrapbook-photo">Add a photo</label>
                <input
                  id="scrapbook-photo"
                  type="file"
                  accept="image/*"
                  onChange={uploadPhoto}
                />
                <small>Images up to 5 MB each</small>
              </div>

              <div className="scrapbook-tool-group">
                <label>Choose stickers</label>
                <div className="scrapbook-stickers">
                  {stickers.map((sticker) => (
                    <button
                      key={sticker}
                      onClick={() => addSticker(sticker)}
                      title={`Add ${sticker}`}
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>

              <div className="scrapbook-tool-group">
                <label>Paper colour</label>
                <div className="scrapbook-colours">
                  {backgrounds.map((background) => (
                    <button
                      key={background.value}
                      title={background.name}
                      aria-label={background.name}
                      className={page.background === background.value ? 'active' : ''}
                      style={{ background: background.value }}
                      onClick={() => changeBackground(background.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="scrapbook-tool-group">
                <label htmlFor="paper-style">Paper pattern</label>
                <select
                  id="paper-style"
                  value={paperStyle}
                  onChange={(event) => changePaperStyle(event.target.value as PaperStyle)}
                >
                  {paperStyles.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
                <small>Choose plain, lined, dotted or grid paper.</small>
              </div>

              {selected && (
                <div className="scrapbook-tool-group selected-controls">
                  <label>Selected element</label>

                  {selected.type !== 'image' && (
                    <>
                      <label htmlFor="selected-content">Text or sticker</label>
                      <input
                        id="selected-content"
                        value={selected.content}
                        onChange={(event) =>
                          updateElement(selected.id, { content: event.target.value })
                        }
                      />

                      <label htmlFor="selected-color">Text colour</label>
                      <input
                        id="selected-color"
                        type="color"
                        value={selected.color}
                        onChange={(event) =>
                          updateElement(selected.id, { color: event.target.value })
                        }
                      />
                    </>
                  )}

                  {selected.type === 'text' && (
                    <>
                      <label htmlFor="selected-font-size">
                        Text size: {selected.fontSize}px
                      </label>
                      <input
                        id="selected-font-size"
                        type="range"
                        min="12"
                        max="60"
                        value={selected.fontSize}
                        onChange={(event) =>
                          updateElement(selected.id, {
                            fontSize: Number(event.target.value),
                          })
                        }
                      />
                    </>
                  )}

                  <label htmlFor="selected-width">
                    Width: {Math.round(selected.width)}px
                  </label>
                  <input
                    id="selected-width"
                    type="range"
                    min="40"
                    max="400"
                    value={selected.width}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        width: Number(event.target.value),
                      })
                    }
                  />

                  <label htmlFor="selected-rotation">
                    Rotation: {Math.round(selected.rotation)}°
                  </label>
                  <input
                    id="selected-rotation"
                    type="range"
                    min="-180"
                    max="180"
                    value={selected.rotation}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        rotation: Number(event.target.value),
                      })
                    }
                  />

                  <div className="scrapbook-element-actions">
                    <button className="scrapbook-secondary full-width" onClick={duplicateSelected}>
                      Duplicate
                    </button>
                    <button
                      className="scrapbook-secondary full-width"
                      onClick={() => moveSelectedLayer('forward')}
                    >
                      Bring forward ↑
                    </button>
                    <button
                      className="scrapbook-secondary full-width"
                      onClick={() => moveSelectedLayer('backward')}
                    >
                      Send backward ↓
                    </button>
                    <button className="scrapbook-danger full-width" onClick={removeSelected}>
                      Remove element
                    </button>
                  </div>
                </div>
              )}

              <p className="scrapbook-tip">
                Tip: drag an item to move it. Select it to reveal canvas handles.
                Remember to save your page.
              </p>
            </aside>

            <div className="scrapbook-canvas-wrap">
              <div className="scrapbook-canvas-caption">
                ✿ A page made with love ✿
              </div>

              <div className="scrapbook-canvas">
                <Stage
                  ref={stageRef}
                  width={WIDTH}
                  height={HEIGHT}
                  onMouseDown={(event) => {
                    if (event.target === event.target.getStage()) {
                      setSelectedId(null)
                    }
                  }}
                  onTouchStart={(event) => {
                    if (event.target === event.target.getStage()) {
                      setSelectedId(null)
                    }
                  }}
                >
                  <Layer>
                    <Rect
                      x={0}
                      y={0}
                      width={WIDTH}
                      height={HEIGHT}
                      fill={page.background}
                      listening={false}
                    />

                    {renderPaper()}

                    {page.elements.map((element) => {
                      const select = () => setSelectedId(element.id)
                      const update = (patch: Partial<ScrapbookElement>) =>
                        updateElement(element.id, patch)

                      if (element.type === 'image') {
                        return (
                          <PhotoElement
                            key={element.id}
                            element={element}
                            onSelect={select}
                            onUpdate={update}
                          />
                        )
                      }

                      return (
                        <Text
                          key={element.id}
                          id={element.id}
                          x={element.x}
                          y={element.y}
                          width={element.width}
                          height={element.height}
                          text={element.content}
                          fontSize={element.fontSize}
                          fill={element.color}
                          rotation={element.rotation}
                          draggable
                          wrap="word"
                          fontFamily={element.type === 'sticker' ? 'Arial' : 'Georgia'}
                          onClick={select}
                          onTap={select}
                          onDragStart={select}
                          onDragEnd={(event) =>
                            update({
                              x: event.target.x(),
                              y: event.target.y(),
                            })
                          }
                          onTransformEnd={(event) => {
                            const node = event.target
                            const scaleX = node.scaleX()
                            const scaleY = node.scaleY()

                            node.scaleX(1)
                            node.scaleY(1)

                            update({
                              x: node.x(),
                              y: node.y(),
                              width: Math.max(40, node.width() * scaleX),
                              height: Math.max(30, node.height() * scaleY),
                              rotation: node.rotation(),
                            })
                          }}
                        />
                      )
                    })}

                    <Transformer
                      ref={transformerRef}
                      rotateEnabled
                      flipEnabled
                      keepRatio={false}
                      anchorSize={9}
                      anchorCornerRadius={4}
                      borderStroke="#C985A0"
                      anchorStroke="#C985A0"
                      anchorFill="#FFF9FC"
                      boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 30 || newBox.height < 25) {
                          return oldBox
                        }
                        return newBox
                      }}
                    />
                  </Layer>
                </Stage>
              </div>

              <p className="scrapbook-canvas-help">
                Select an item to reveal its handles. Drag the corner handles to
                resize and use the rotation handle to turn it.
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <p className="scrapbook-message" role="status">
          {message}
        </p>
      )}
    </section>
  )
}
