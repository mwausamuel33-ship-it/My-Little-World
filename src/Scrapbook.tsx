
import { useEffect, useState } from 'react'
import { Stage, Layer, Rect, Text, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { db, type ScrapbookElement, type ScrapbookPage } from './db'
import './Scrapbook.css'

const WIDTH = 700
const HEIGHT = 500

const backgrounds = [
  { name: 'Cream', value: '#FFF9EF' },
  { name: 'Blush', value: '#FCE8EC' },
  { name: 'Sage', value: '#E6EEDD' },
  { name: 'Lilac', value: '#F0E9FA' },
  { name: 'Sky', value: '#E8F2FA' },
]

const stickers = ['🌸', '🌷', '🌼', '🦋', '💗', '✨', '🌿', '🎀', '⭐', '🧸', '🍓', '☁️']

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
    height: type === 'image' ? 150 : 70,
    rotation: 0,
    content,
    color: '#72515C',
    fontSize: type === 'sticker' ? 42 : 24,
  }
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

  return (
    <>
      {image && (
        <KonvaImage
          image={image}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rotation={element.rotation}
          draggable
          onClick={onSelect}
          onTap={onSelect}
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
      )}
    </>
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

  const selected = page?.elements.find((element) => element.id === selectedId)

  async function refreshPages() {
    const saved = await db.scrapbookPages.orderBy('updatedAt').reverse().toArray()
    setPages(saved)
  }

  useEffect(() => {
    void refreshPages()
  }, [])

  function createPage() {
    const now = new Date().toISOString()
    setPage({
      title: 'My new scrapbook',
      background: '#FFF9EF',
      elements: [],
      createdAt: now,
      updatedAt: now,
    })
    setPageTitle('My new scrapbook')
    setSelectedId(null)
    setMessage('')
  }

  async function openPage(savedPage: ScrapbookPage) {
    setPage(savedPage)
    setPageTitle(savedPage.title)
    setSelectedId(null)
    setMessage('')
  }

  function updateElement(id: string, patch: Partial<ScrapbookElement>) {
    setPage((current) => {
      if (!current) return current
      return {
        ...current,
        elements: current.elements.map((element) =>
          element.id === id ? { ...element, ...patch } : element,
        ),
      }
    })
  }

  function addElement(element: ScrapbookElement) {
    setPage((current) =>
      current
        ? { ...current, elements: [...current.elements, element] }
        : current,
    )
    setSelectedId(element.id)
  }

  function addText() {
    addElement(makeElement('text', newText || 'Write your memory here'))
  }

  function addSticker(sticker: string) {
    addElement(makeElement('sticker', sticker))
  }

  function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Choose a photo under 5 MB for this first version.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addElement(makeElement('image', reader.result, 200, 120))
        setMessage('')
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
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
      setPageTitle(toSave.title)
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
    const confirmed = window.confirm('Delete this scrapbook page? This cannot be undone.')
    if (!confirmed) return

    await db.scrapbookPages.delete(id)
    if (page?.id === id) {
      setPage(null)
      setSelectedId(null)
    }
    await refreshPages()
  }

  function removeSelected() {
    if (!page || !selectedId) return
    setPage({
      ...page,
      elements: page.elements.filter((element) => element.id !== selectedId),
    })
    setSelectedId(null)
  }

  function changeBackground(value: string) {
    setPage((current) => current ? { ...current, background: value } : current)
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
                    onClick={() => void openPage(savedPage)}
                    aria-label={`Open ${savedPage.title}`}
                  >
                    {savedPage.elements.slice(0, 6).map((element) => (
                      <span
                        key={element.id}
                        className="scrapbook-preview-element"
                        style={{
                          left: `${Math.min(88, Math.max(4, element.x / WIDTH * 100))}%`,
                          top: `${Math.min(85, Math.max(4, element.y / HEIGHT * 100))}%`,
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
                      onClick={() => void openPage(savedPage)}
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
            <button className="scrapbook-secondary" onClick={() => {
              setPage(null)
              setSelectedId(null)
              void refreshPages()
            }}>
              ← All pages
            </button>
            <label className="scrapbook-title-label">
              Page title
              <input
                value={pageTitle}
                onChange={(event) => setPageTitle(event.target.value)}
                maxLength={80}
              />
            </label>
            <button className="scrapbook-primary" onClick={() => void savePage()} disabled={saving}>
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
                    <button key={sticker} onClick={() => addSticker(sticker)} title={`Add ${sticker}`}>
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

              {selected && (
                <div className="scrapbook-tool-group selected-controls">
                  <label>Selected element</label>

                  {selected.type !== 'image' && (
                    <>
                      <label htmlFor="selected-content">Text or sticker</label>
                      <input
                        id="selected-content"
                        value={selected.content}
                        onChange={(event) => updateElement(selected.id, { content: event.target.value })}
                      />
                      <label htmlFor="selected-color">Text colour</label>
                      <input
                        id="selected-color"
                        type="color"
                        value={selected.color}
                        onChange={(event) => updateElement(selected.id, { color: event.target.value })}
                      />
                    </>
                  )}

                  {selected.type === 'text' && (
                    <>
                      <label htmlFor="selected-font-size">Text size: {selected.fontSize}px</label>
                      <input
                        id="selected-font-size"
                        type="range"
                        min="12"
                        max="60"
                        value={selected.fontSize}
                        onChange={(event) => updateElement(selected.id, { fontSize: Number(event.target.value) })}
                      />
                    </>
                  )}

                  <label htmlFor="selected-width">Width: {Math.round(selected.width)}px</label>
                  <input
                    id="selected-width"
                    type="range"
                    min="40"
                    max="400"
                    value={selected.width}
                    onChange={(event) => updateElement(selected.id, { width: Number(event.target.value) })}
                  />

                  <label htmlFor="selected-rotation">Rotation: {selected.rotation}°</label>
                  <input
                    id="selected-rotation"
                    type="range"
                    min="-180"
                    max="180"
                    value={selected.rotation}
                    onChange={(event) => updateElement(selected.id, { rotation: Number(event.target.value) })}
                  />

                  <button className="scrapbook-danger full-width" onClick={removeSelected}>
                    Remove element
                  </button>
                </div>
              )}

              <p className="scrapbook-tip">Tip: drag any item on the page to move it. Tap an item to edit it.</p>
            </aside>

            <div className="scrapbook-canvas-wrap">
              <div className="scrapbook-canvas-caption">✿ A page made with love ✿</div>
              <div className="scrapbook-canvas">
                <Stage
                  width={WIDTH}
                  height={HEIGHT}
                  onMouseDown={(event) => {
                    if (event.target === event.target.getStage()) setSelectedId(null)
                  }}
                  onTouchStart={(event) => {
                    if (event.target === event.target.getStage()) setSelectedId(null)
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
                          x={element.x}
                          y={element.y}
                          width={element.width}
                          height={element.type === 'sticker' ? element.height : undefined}
                          text={element.content}
                          fontSize={element.fontSize}
                          fill={element.color}
                          rotation={element.rotation}
                          draggable
                          wrap="word"
                          fontFamily={element.type === 'sticker' ? 'Arial' : 'Georgia'}
                          onClick={select}
                          onTap={select}
                          onDragEnd={(event) => update({
                            x: event.target.x(),
                            y: event.target.y(),
                          })}
                        />
                      )
                    })}
                  </Layer>
                </Stage>
              </div>
              <p className="scrapbook-canvas-help">Select an item to customise it. Remember to save your page.</p>
            </div>
          </div>
        </div>
      )}

      {message && <p className="scrapbook-message" role="status">{message}</p>}
    </section>
  )
}
