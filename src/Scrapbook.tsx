
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
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
import {
  scrapbookStickers,
  stickerCategories,
  type StickerCategory,
} from './scrapbookAssets'
import './Scrapbook.css'

const WIDTH = 700
const HEIGHT = 500
const MAX_HISTORY = 50
const FAVORITES_KEY = 'my-little-world-sticker-favorites'

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
type StickerFilter = 'All' | 'Favorites' | StickerCategory
type StickerCollectionId =
  | 'soft-girl'
  | 'nature-notes'
  | 'little-joys'
  | 'faith-peace'

interface EditorSnapshot {
  title: string
  background: string
  paperStyle: PaperStyle
  elements: ScrapbookElement[]
}

// Photos taken on a phone are often several megabytes. Shrinking them when
// they are added keeps saved pages, backups and (later) syncing small.
const MAX_PHOTO_SIDE = 1600
const PHOTO_QUALITY = 0.85

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('The image could not be read.'))
      }
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error('The image could not be read.'))
    }

    reader.readAsDataURL(file)
  })
}

function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img')

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The image could not be opened.'))
    image.src = source
  })
}

// Returns the photo as a data URL, shrunk when it is larger than
// MAX_PHOTO_SIDE. Small photos, GIFs and SVGs are kept exactly as they are,
// and the shrunk version is only used when it is really smaller.
async function preparePhoto(file: File): Promise<string> {
  const original = await readFileAsDataUrl(file)

  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return original
  }

  const image = await loadImageElement(original)
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight)

  if (longestSide <= MAX_PHOTO_SIDE) return original

  const scale = MAX_PHOTO_SIDE / longestSide
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)

  const context = canvas.getContext('2d')
  if (!context) return original

  // PNG keeps see-through areas; everything else becomes a smaller JPEG.
  const keepPng = file.type === 'image/png'

  if (!keepPng) {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const resized = canvas.toDataURL(
    keepPng ? 'image/png' : 'image/jpeg',
    PHOTO_QUALITY,
  )

  return resized.length < original.length ? resized : original
}

interface ScrapbookTemplate {
  id: string
  name: string
  emoji: string
  description: string
  background: string
  paperStyle: PaperStyle
  title: string
  accent: string
  elements: {
    type: ScrapbookElement['type']
    content: string
    x: number
    y: number
    width: number
    height: number
    color: string
    fontSize: number
    rotation?: number
  }[]
}

const templates: ScrapbookTemplate[] = [
  {
    id: 'soft-girl',
    name: 'Soft Girl',
    emoji: '🎀',
    description: 'Pink, sweet and full of little details',
    background: '#FCE8EC',
    paperStyle: 'Plain',
    title: 'Little things I love',
    accent: '#BD718D',
    elements: [
      { type: 'sticker', content: '🎀', x: 42, y: 32, width: 75, height: 70, color: '#BD718D', fontSize: 54, rotation: -10 },
      { type: 'text', content: 'little things I love', x: 145, y: 45, width: 420, height: 55, color: '#9C536F', fontSize: 34 },
      { type: 'sticker', content: '🌷', x: 565, y: 45, width: 70, height: 75, color: '#BD718D', fontSize: 48, rotation: 8 },
      { type: 'text', content: '♡ sweet memories ♡', x: 205, y: 105, width: 300, height: 38, color: '#BD718D', fontSize: 20 },
      { type: 'sticker', content: '💗', x: 90, y: 190, width: 70, height: 70, color: '#BD718D', fontSize: 48, rotation: -8 },
      { type: 'sticker', content: '✨', x: 535, y: 175, width: 65, height: 65, color: '#BD718D', fontSize: 44 },
      { type: 'text', content: 'A little space for my favourite moments...', x: 145, y: 355, width: 410, height: 55, color: '#9C536F', fontSize: 21 },
      { type: 'sticker', content: '🌸', x: 570, y: 380, width: 65, height: 65, color: '#BD718D', fontSize: 44 },
    ],
  },
  {
    id: 'nature',
    name: 'Nature Journal',
    emoji: '🌿',
    description: 'Earthy greens and peaceful moments',
    background: '#E6EEDD',
    paperStyle: 'Lined',
    title: 'My little nature journal',
    accent: '#56775A',
    elements: [
      { type: 'sticker', content: '🌿', x: 40, y: 35, width: 80, height: 80, color: '#56775A', fontSize: 55, rotation: -12 },
      { type: 'text', content: 'nature journal', x: 150, y: 45, width: 410, height: 55, color: '#426448', fontSize: 36 },
      { type: 'text', content: 'slow days • fresh air • little wonders', x: 140, y: 105, width: 430, height: 35, color: '#56775A', fontSize: 17 },
      { type: 'sticker', content: '🍃', x: 550, y: 40, width: 70, height: 70, color: '#56775A', fontSize: 48 },
      { type: 'sticker', content: '🌼', x: 65, y: 200, width: 75, height: 75, color: '#56775A', fontSize: 48 },
      { type: 'sticker', content: '🦋', x: 540, y: 205, width: 75, height: 70, color: '#56775A', fontSize: 48, rotation: 8 },
      { type: 'text', content: 'Today, I noticed...', x: 170, y: 345, width: 350, height: 45, color: '#426448', fontSize: 26 },
      { type: 'text', content: 'Write down a little moment from today.', x: 170, y: 390, width: 370, height: 40, color: '#56775A', fontSize: 18 },
    ],
  },
  {
    id: 'faith',
    name: 'Faith & Peace',
    emoji: '🤍',
    description: 'A calm page for gratitude and faith',
    background: '#F0E9FA',
    paperStyle: 'Dotted',
    title: 'Grace for today',
    accent: '#81699E',
    elements: [
      { type: 'sticker', content: '🤍', x: 65, y: 35, width: 75, height: 75, color: '#81699E', fontSize: 52 },
      { type: 'text', content: 'grace for today', x: 160, y: 45, width: 390, height: 55, color: '#70558E', fontSize: 36 },
      { type: 'sticker', content: '🕊️', x: 550, y: 35, width: 80, height: 75, color: '#81699E', fontSize: 48 },
      { type: 'text', content: 'Be still, and know.', x: 180, y: 150, width: 340, height: 50, color: '#70558E', fontSize: 28 },
      { type: 'text', content: 'Psalm 46:10', x: 250, y: 205, width: 200, height: 35, color: '#81699E', fontSize: 20 },
      { type: 'sticker', content: '✨', x: 100, y: 260, width: 60, height: 60, color: '#81699E', fontSize: 42 },
      { type: 'text', content: 'Today I am grateful for...', x: 165, y: 330, width: 370, height: 45, color: '#70558E', fontSize: 23 },
      { type: 'sticker', content: '🌷', x: 545, y: 375, width: 65, height: 65, color: '#81699E', fontSize: 44 },
    ],
  },
  {
    id: 'moments',
    name: 'Little Moments',
    emoji: '🍓',
    description: 'Playful decorations for everyday memories',
    background: '#FFF1C9',
    paperStyle: 'Plain',
    title: 'The little moments',
    accent: '#BA744B',
    elements: [
      { type: 'sticker', content: '🍓', x: 45, y: 35, width: 75, height: 75, color: '#BA744B', fontSize: 50, rotation: -8 },
      { type: 'text', content: 'the little moments', x: 145, y: 45, width: 420, height: 55, color: '#9D603F', fontSize: 34 },
      { type: 'sticker', content: '☀️', x: 565, y: 35, width: 75, height: 75, color: '#BA744B', fontSize: 48 },
      { type: 'text', content: 'ordinary days, favourite memories', x: 165, y: 105, width: 370, height: 35, color: '#BA744B', fontSize: 18 },
      { type: 'sticker', content: '🍒', x: 70, y: 195, width: 75, height: 75, color: '#BA744B', fontSize: 48 },
      { type: 'sticker', content: '🧸', x: 550, y: 190, width: 75, height: 75, color: '#BA744B', fontSize: 48 },
      { type: 'text', content: 'One moment I want to remember...', x: 145, y: 350, width: 420, height: 55, color: '#9D603F', fontSize: 21 },
      { type: 'sticker', content: '💌', x: 315, y: 415, width: 65, height: 60, color: '#BA744B', fontSize: 40 },
    ],
  },
]

const stickerCollections: {
  id: StickerCollectionId
  name: string
  emoji: string
  description: string
  categories: StickerCategory[]
}[] = [
  { id: 'soft-girl', name: 'Soft Girl', emoji: '🎀', description: 'Sweet, pink and playful', categories: ['Cute', 'Flowers'] },
  { id: 'nature-notes', name: 'Nature Notes', emoji: '🌿', description: 'Little pieces of nature', categories: ['Nature', 'Flowers'] },
  { id: 'little-joys', name: 'Little Joys', emoji: '🍓', description: 'Everyday treats', categories: ['Food & Drink'] },
  { id: 'faith-peace', name: 'Faith & Peace', emoji: '🤍', description: 'Faith and quiet moments', categories: ['Faith & Calm'] },
]

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

function cloneElements(elements: ScrapbookElement[]) {
  return elements.map((element) => ({ ...element }))
}

function readFavoriteStickers(): string[] {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)

    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed
    }
  } catch {
    // Storage may be unavailable.
  }

  return []
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
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  const [stickerSearch, setStickerSearch] = useState('')
  const [stickerCategory, setStickerCategory] = useState<StickerFilter>('All')
  const [stickerCollection, setStickerCollection] = useState<
    StickerCollectionId | 'All'
  >('All')
  const [favoriteStickers, setFavoriteStickers] =
    useState<string[]>(readFavoriteStickers)

  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const historyRef = useRef<EditorSnapshot[]>([])
  const futureRef = useRef<EditorSnapshot[]>([])
  const pageRef = useRef<ScrapbookPage | null>(null)
  const titleRef = useRef(pageTitle)
  const paperRef = useRef<PaperStyle>(paperStyle)
  const skipHistoryRef = useRef(false)

  const selected = page?.elements.find(
    (element) => element.id === selectedId,
  )

  const activeCollection = stickerCollections.find(
    (collection) => collection.id === stickerCollection,
  )

  const filteredStickers = scrapbookStickers.filter((sticker) => {
    const query = stickerSearch.trim().toLowerCase()

    const matchesSearch =
      !query ||
      sticker.name.toLowerCase().includes(query) ||
      sticker.emoji.includes(query) ||
      sticker.category.toLowerCase().includes(query)

    const matchesCategory =
      stickerCategory === 'All' ||
      (stickerCategory === 'Favorites'
        ? favoriteStickers.includes(sticker.id)
        : sticker.category === stickerCategory)

    const matchesCollection =
      !activeCollection ||
      activeCollection.categories.includes(sticker.category)

    return matchesSearch && matchesCategory && matchesCollection
  })

  useEffect(() => {
    pageRef.current = page
  }, [page])

  useEffect(() => {
    titleRef.current = pageTitle
  }, [pageTitle])

  useEffect(() => {
    paperRef.current = paperStyle
  }, [paperStyle])

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

  // Load saved pages on mount without synchronously setting state in the effect.
  useEffect(() => {
    let cancelled = false

    async function loadSavedPages() {
      try {
        const saved = await db.scrapbookPages
          .orderBy('updatedAt')
          .reverse()
          .toArray()

        if (!cancelled) {
          setPages(saved)
        }
      } catch (error) {
        console.error('Could not load scrapbook pages:', error)

        if (!cancelled) {
          setMessage(
            'Could not load saved pages. Please refresh and try again.',
          )
        }
      }
    }

    void loadSavedPages()

    return () => {
      cancelled = true
    }
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
    skipHistoryRef.current = false
  }

  function createPage() {
    setMessage('')
    setShowTemplatePicker(true)
  }

  function chooseTemplate(template: ScrapbookTemplate) {
    const now = new Date().toISOString()

    const elements: ScrapbookElement[] = template.elements.map((item) => ({
      id: crypto.randomUUID(),
      type: item.type,
      content: item.content,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      color: item.color,
      fontSize: item.fontSize,
      rotation: item.rotation ?? 0,
    }))

    const newPage: ScrapbookPage = {
      title: template.title,
      background: template.background,
      paperStyle: template.paperStyle,
      elements,
      createdAt: now,
      updatedAt: now,
    }

    setPage(newPage)
    pageRef.current = newPage

    setPageTitle(newPage.title)
    titleRef.current = newPage.title

    setPaperStyle(template.paperStyle)
    paperRef.current = template.paperStyle

    setSelectedId(null)
    setShowTemplatePicker(false)
    resetHistory()
    setMessage(`${template.name} template is ready to make your own ✨`)
  }

  function openPage(savedPage: ScrapbookPage) {
    const openedPage = {
      ...savedPage,
      elements: cloneElements(savedPage.elements),
    }

    const savedPaperStyle: PaperStyle = savedPage.paperStyle ?? 'Plain'

    setPage(openedPage)
    pageRef.current = openedPage

    setPageTitle(savedPage.title)
    titleRef.current = savedPage.title

    setPaperStyle(savedPaperStyle)
    paperRef.current = savedPaperStyle

    setSelectedId(null)
    setMessage('')
    setShowTemplatePicker(false)
    resetHistory()
  }

  function updateElement(
    id: string,
    patch: Partial<ScrapbookElement>,
  ) {
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
    addElement(
      makeElement('text', newText.trim() || 'Write your memory here'),
    )
  }

  function addSticker(sticker: string) {
    addElement(makeElement('sticker', sticker))
  }

  function toggleStickerFavorite(id: string) {
    const nextFavorites = favoriteStickers.includes(id)
      ? favoriteStickers.filter((favoriteId) => favoriteId !== id)
      : [...favoriteStickers, id]

    setFavoriteStickers(nextFavorites)

    try {
      localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(nextFavorites),
      )
      setMessage('')
    } catch {
      setMessage(
        'Sticker favourites could not be saved in this browser.',
      )
    }
  }

  function selectCollection(id: StickerCollectionId | 'All') {
    setStickerCollection(id)
    setStickerCategory('All')
  }

  function selectCategory(category: StickerFilter) {
    setStickerCategory(category)
    setStickerCollection('All')
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

    preparePhoto(file)
      .then((dataUrl) => {
        addElement(makeElement('image', dataUrl, 200, 120))
        setMessage('')
      })
      .catch((error: unknown) => {
        console.error('Could not prepare the photo:', error)
        setMessage('Could not read that image. Try another one.')
      })

    event.target.value = ''
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

  function undo() {
    const currentSnapshot = makeSnapshot()
    const previous = historyRef.current

    if (!currentSnapshot || previous.length === 0) return

    const snapshot = previous[previous.length - 1]
    const remaining = previous.slice(0, -1)

    futureRef.current = [
      ...futureRef.current,
      currentSnapshot,
    ].slice(-MAX_HISTORY)

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

    historyRef.current = [
      ...historyRef.current,
      currentSnapshot,
    ].slice(-MAX_HISTORY)

    futureRef.current = remaining

    setHistory(historyRef.current)
    setFuture(remaining)

    skipHistoryRef.current = true
    applySnapshot(snapshot)
  }

  function removeSelected() {
    if (!page || !selectedId) return

    rememberChange()

    const updated = {
      ...page,
      elements: page.elements.filter(
        (element) => element.id !== selectedId,
      ),
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

    const index = page.elements.findIndex(
      (element) => element.id === selectedId,
    )

    if (index < 0) return

    const targetIndex =
      direction === 'forward' ? index + 1 : index - 1

    if (
      targetIndex < 0 ||
      targetIndex >= page.elements.length
    ) {
      return
    }

    rememberChange()

    const elements = [...page.elements]
    ;[elements[index], elements[targetIndex]] = [
      elements[targetIndex],
      elements[index],
    ]

    const updated = { ...page, elements }

    setPage(updated)
    pageRef.current = updated
  }

  function changeBackground(value: string) {
    if (!page || page.background === value) return

    rememberChange()

    setPage((current) => {
      if (!current) return current

      const updated = { ...current, background: value }
      pageRef.current = updated
      return updated
    })
  }

  function changePaperStyle(value: PaperStyle) {
    if (paperStyle === value) return

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
        paperStyle,
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
    setShowTemplatePicker(false)
    resetHistory()
    void refreshPages()
  }

  function renderPaper(): ReactNode {
    if (paperStyle === 'Plain') return null

    const lines: ReactNode[] = []

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

  const buttonStyle: React.CSSProperties = {
    border: '1px solid #ead4dc',
    borderRadius: 14,
    background: '#fffafc',
    padding: '10px 14px',
    cursor: 'pointer',
    color: '#765363',
    font: 'inherit',
  }

  return (
    <section className="scrapbook">
      <header className="scrapbook-heading">
        <div>
          <p className="scrapbook-eyebrow">
            YOUR LITTLE CREATIVE CORNER 🌷
          </p>
          <h1>Scrapbook Studio</h1>
          <p>Collect the little moments that make life lovely.</p>
        </div>

        <button className="scrapbook-primary" onClick={createPage}>
          + New page
        </button>
      </header>

      {showTemplatePicker ? (
        <div className="scrapbook-library">
          <div className="scrapbook-library-intro">
            <span className="scrapbook-flower">✿</span>
            <h2>Choose your little world</h2>
            <p>
              Pick a starting design. Every detail can be changed later.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
              marginTop: 24,
            }}
          >
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => chooseTemplate(template)}
                style={{
                  ...buttonStyle,
                  padding: 12,
                  textAlign: 'left',
                  border: '1px solid #ead4dc',
                  boxShadow: '0 5px 18px rgba(105, 68, 85, 0.07)',
                  transition:
                    'transform 160ms ease, box-shadow 160ms ease',
                }}
              >
                <div
                  style={{
                    height: 160,
                    borderRadius: 10,
                    overflow: 'hidden',
                    position: 'relative',
                    background: template.background,
                    border: '1px solid rgba(120, 80, 100, 0.12)',
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '8%',
                      top: '12%',
                      fontSize: 28,
                    }}
                  >
                    {template.emoji}
                  </span>

                  <span
                    style={{
                      position: 'absolute',
                      left: '20%',
                      top: '18%',
                      right: '8%',
                      color: template.accent,
                      fontFamily: 'Georgia, serif',
                      fontSize: 20,
                      fontWeight: 600,
                    }}
                  >
                    {template.title}
                  </span>

                  {template.elements.slice(1, 5).map((element, index) => (
                    <span
                      key={`${template.id}-${index}`}
                      style={{
                        position: 'absolute',
                        left: `${Math.min(85, Math.max(5, (element.x / WIDTH) * 100))}%`,
                        top: `${Math.min(82, Math.max(5, (element.y / HEIGHT) * 100))}%`,
                        fontSize: element.type === 'sticker' ? 24 : 12,
                        color: element.color,
                        maxWidth: '75%',
                        overflow: 'hidden',
                      }}
                    >
                      {element.content}
                    </span>
                  ))}

                  <span
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 10,
                      fontSize: 11,
                      color: template.accent,
                      opacity: 0.8,
                    }}
                  >
                    MY LITTLE WORLD ✿
                  </span>
                </div>

                <strong style={{ display: 'block', marginBottom: 5 }}>
                  {template.emoji} {template.name}
                </strong>

                <span
                  style={{
                    display: 'block',
                    fontSize: 13,
                    lineHeight: 1.5,
                    opacity: 0.8,
                  }}
                >
                  {template.description}
                </span>

                <span
                  style={{
                    display: 'block',
                    marginTop: 12,
                    padding: '9px 10px',
                    borderRadius: 9,
                    background: template.background,
                    color: template.accent,
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  Use this template →
                </span>
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <button
              className="scrapbook-secondary"
              onClick={() => {
                if (page) {
                  setShowTemplatePicker(false)
                } else {
                  goToLibrary()
                }
              }}
            >
              ← {page ? 'Back to current page' : 'Back to saved pages'}
            </button>

            <button
              className="scrapbook-secondary"
              style={{ marginLeft: 10 }}
              onClick={() =>
                chooseTemplate({
                  id: 'blank',
                  name: 'Blank page',
                  emoji: '📄',
                  description: 'Start with an empty page',
                  background: '#FFF9EF',
                  paperStyle: 'Plain',
                  title: 'My lovely memories',
                  accent: '#72515C',
                  elements: [],
                })
              }
            >
              Start with a blank page
            </button>
          </div>
        </div>
      ) : !page ? (
        <div className="scrapbook-library">
          <div className="scrapbook-library-intro">
            <span className="scrapbook-flower">✿</span>
            <h2>Your memory pages</h2>
            <p>Your saved creations will live here.</p>
            <button className="scrapbook-primary" onClick={createPage}>
              Choose a template
            </button>
          </div>

          {pages.length === 0 ? (
            <div className="scrapbook-empty">
              <span>📔</span>
              <h3>Your first page is waiting</h3>
              <p>
                Add photos, little notes and stickers to make it yours.
              </p>
              <button className="scrapbook-primary" onClick={createPage}>
                Create my first page
              </button>
            </div>
          ) : (
            <div className="scrapbook-page-grid">
              {pages.map((savedPage) => (
                <article
                  className="scrapbook-page-card"
                  key={savedPage.id}
                >
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

                    <span>
                      {savedPage.elements.length} elements
                    </span>

                    <button
                      className="scrapbook-delete"
                      onClick={() =>
                        savedPage.id && void deletePage(savedPage.id)
                      }
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
            <button
              className="scrapbook-secondary"
              onClick={goToLibrary}
            >
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
            >
              ↶ Undo
            </button>

            <button
              className="scrapbook-secondary"
              onClick={redo}
              disabled={future.length === 0}
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
                <button
                  className="scrapbook-secondary full-width"
                  onClick={createPage}
                >
                  ✨ Change template
                </button>
              </div>

              <div className="scrapbook-tool-group">
                <label htmlFor="scrapbook-text">Add a little note</label>
                <textarea
                  id="scrapbook-text"
                  value={newText}
                  onChange={(event) => setNewText(event.target.value)}
                  rows={3}
                />
                <button
                  className="scrapbook-secondary full-width"
                  onClick={addText}
                >
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

              <div className="scrapbook-tool-group scrapbook-sticker-library">
                <div className="scrapbook-sticker-heading">
                  <div>
                    <label>Sticker library ✿</label>
                    <p>Little details, lots of personality.</p>
                  </div>
                  <span className="scrapbook-sticker-count">
                    {filteredStickers.length}
                  </span>
                </div>

                <input
                  className="scrapbook-sticker-search"
                  type="search"
                  placeholder="Search stickers..."
                  aria-label="Search stickers"
                  value={stickerSearch}
                  onChange={(event) =>
                    setStickerSearch(event.target.value)
                  }
                />

                <div className="scrapbook-collection-section">
                  <div className="scrapbook-collection-heading">
                    <strong>Explore collections</strong>
                    <span>Curated little moods ✨</span>
                  </div>

                  <div className="scrapbook-collections">
                    <button
                      type="button"
                      className={stickerCollection === 'All' ? 'active' : ''}
                      aria-pressed={stickerCollection === 'All'}
                      onClick={() => selectCollection('All')}
                    >
                      <span>✿</span>
                      <small>Everything</small>
                    </button>

                    {stickerCollections.map((collection) => (
                      <button
                        type="button"
                        key={collection.id}
                        className={
                          stickerCollection === collection.id
                            ? 'active'
                            : ''
                        }
                        aria-pressed={
                          stickerCollection === collection.id
                        }
                        title={collection.description}
                        onClick={() => selectCollection(collection.id)}
                      >
                        <span>{collection.emoji}</span>
                        <small>{collection.name}</small>
                        <small>{collection.description}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="scrapbook-sticker-categories">
                  {(['All', 'Favorites', ...stickerCategories] as StickerFilter[]).map(
                    (category) => (
                      <button
                        key={category}
                        type="button"
                        className={
                          stickerCategory === category ? 'active' : ''
                        }
                        aria-pressed={stickerCategory === category}
                        onClick={() => selectCategory(category)}
                      >
                        {category === 'Favorites'
                          ? '♥ Favorites'
                          : category}
                      </button>
                    ),
                  )}
                </div>

                <div className="scrapbook-stickers scrapbook-sticker-grid">
                  {filteredStickers.map((sticker) => {
                    const isFavorite = favoriteStickers.includes(
                      sticker.id,
                    )

                    return (
                      <div
                        className="scrapbook-sticker-card"
                        key={sticker.id}
                      >
                        <button
                          type="button"
                          className="scrapbook-sticker-add"
                          onClick={() => addSticker(sticker.emoji)}
                          title={`Add ${sticker.name} to your page`}
                          aria-label={`Add ${sticker.name}`}
                        >
                          <span>{sticker.emoji}</span>
                          <small>{sticker.name}</small>
                        </button>

                        <button
                          type="button"
                          className={`scrapbook-sticker-favorite ${isFavorite ? 'is-favorite' : ''}`}
                          onClick={() =>
                            toggleStickerFavorite(sticker.id)
                          }
                          title={
                            isFavorite
                              ? 'Remove from favourites'
                              : 'Add to favourites'
                          }
                          aria-label={
                            isFavorite
                              ? `Remove ${sticker.name} from favourites`
                              : `Add ${sticker.name} to favourites`
                          }
                        >
                          {isFavorite ? '♥' : '♡'}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {filteredStickers.length === 0 && (
                  <p className="scrapbook-sticker-empty">
                    {stickerCategory === 'Favorites' &&
                    favoriteStickers.length === 0
                      ? 'Your favourite stickers will appear here. Tap a heart to save one. 💗'
                      : 'No stickers found. Try another search, category or collection 🌷'}
                  </p>
                )}
              </div>

              <div className="scrapbook-tool-group">
                <label>Paper colour</label>
                <div className="scrapbook-colours">
                  {backgrounds.map((background) => (
                    <button
                      key={background.value}
                      title={background.name}
                      aria-label={background.name}
                      className={
                        page.background === background.value
                          ? 'active'
                          : ''
                      }
                      style={{ background: background.value }}
                      onClick={() =>
                        changeBackground(background.value)
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="scrapbook-tool-group">
                <label htmlFor="paper-style">Paper pattern</label>
                <select
                  id="paper-style"
                  value={paperStyle}
                  onChange={(event) =>
                    changePaperStyle(
                      event.target.value as PaperStyle,
                    )
                  }
                >
                  {paperStyles.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
                <small>
                  Choose plain, lined, dotted or grid paper.
                </small>
              </div>

              {selected && (
                <div className="scrapbook-tool-group selected-controls">
                  <label>Selected element</label>

                  {selected.type !== 'image' && (
                    <>
                      <label htmlFor="selected-content">
                        Text or sticker
                      </label>
                      <input
                        id="selected-content"
                        value={selected.content}
                        onChange={(event) =>
                          updateElement(selected.id, {
                            content: event.target.value,
                          })
                        }
                      />

                      <label htmlFor="selected-color">
                        Text colour
                      </label>
                      <input
                        id="selected-color"
                        type="color"
                        value={selected.color}
                        onChange={(event) =>
                          updateElement(selected.id, {
                            color: event.target.value,
                          })
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
                    <button
                      className="scrapbook-secondary full-width"
                      onClick={duplicateSelected}
                    >
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
                    <button
                      className="scrapbook-danger full-width"
                      onClick={removeSelected}
                    >
                      Remove element
                    </button>
                  </div>
                </div>
              )}

              <p className="scrapbook-tip">
                Tip: drag an item to move it. Select it to reveal canvas
                handles. Remember to save your page.
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

                      const update = (
                        patch: Partial<ScrapbookElement>,
                      ) => updateElement(element.id, patch)

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
                          fontFamily={
                            element.type === 'sticker'
                              ? 'Arial'
                              : 'Georgia'
                          }
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
                              width: Math.max(
                                40,
                                node.width() * scaleX,
                              ),
                              height: Math.max(
                                30,
                                node.height() * scaleY,
                              ),
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
                      boundBoxFunc={(oldBox, newBox) =>
                        newBox.width < 30 || newBox.height < 25
                          ? oldBox
                          : newBox
                      }
                    />
                  </Layer>
                </Stage>
              </div>

              <p className="scrapbook-canvas-help">
                Select an item to reveal its handles. Drag the corner
                handles to resize and use the rotation handle to turn it.
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
