
export const stickerCategories = [
  'Flowers',
  'Cute',
  'Nature',
  'Food & Drink',
  'Faith & Calm',
  'Scrapbook',
] as const

export type StickerCategory = (typeof stickerCategories)[number]

export interface ScrapbookSticker {
  id: string
  emoji: string
  name: string
  category: StickerCategory
}

export const scrapbookStickers: ScrapbookSticker[] = [
  // Flowers
  { id: 'flower-cherry', emoji: '🌸', name: 'Cherry blossom', category: 'Flowers' },
  { id: 'flower-tulip', emoji: '🌷', name: 'Tulip', category: 'Flowers' },
  { id: 'flower-daisy', emoji: '🌼', name: 'Daisy', category: 'Flowers' },
  { id: 'flower-bouquet', emoji: '💐', name: 'Flower bouquet', category: 'Flowers' },
  { id: 'flower-hibiscus', emoji: '🌺', name: 'Hibiscus', category: 'Flowers' },
  { id: 'flower-lavender', emoji: '🪻', name: 'Lavender', category: 'Flowers' },
  { id: 'flower-rose', emoji: '🌹', name: 'Rose', category: 'Flowers' },
  { id: 'flower-lotus', emoji: '🪷', name: 'Lotus', category: 'Flowers' },

  // Cute and coquette
  { id: 'cute-bow', emoji: '🎀', name: 'Pink bow', category: 'Cute' },
  { id: 'cute-bear', emoji: '🧸', name: 'Teddy bear', category: 'Cute' },
  { id: 'cute-bunny', emoji: '🐇', name: 'Bunny', category: 'Cute' },
  { id: 'cute-heart', emoji: '💗', name: 'Growing heart', category: 'Cute' },
  { id: 'cute-sparkle', emoji: '✨', name: 'Sparkles', category: 'Cute' },
  { id: 'cute-heart-white', emoji: '🤍', name: 'White heart', category: 'Cute' },
  { id: 'cute-love-letter', emoji: '💌', name: 'Love letter', category: 'Cute' },
  { id: 'cute-ribbon', emoji: '୨୧', name: 'Ribbon symbol', category: 'Cute' },

  // Nature
  { id: 'nature-butterfly', emoji: '🦋', name: 'Butterfly', category: 'Nature' },
  { id: 'nature-leaves', emoji: '🌿', name: 'Green leaves', category: 'Nature' },
  { id: 'nature-moon', emoji: '🌙', name: 'Moon', category: 'Nature' },
  { id: 'nature-cloud', emoji: '☁️', name: 'Cloud', category: 'Nature' },
  { id: 'nature-sun', emoji: '☀️', name: 'Sunshine', category: 'Nature' },
  { id: 'nature-star', emoji: '⭐', name: 'Star', category: 'Nature' },
  { id: 'nature-sparkle', emoji: '🌟', name: 'Glowing star', category: 'Nature' },
  { id: 'nature-dove', emoji: '🕊️', name: 'Dove', category: 'Nature' },

  // Food and drink
  { id: 'food-strawberry', emoji: '🍓', name: 'Strawberry', category: 'Food & Drink' },
  { id: 'food-cake', emoji: '🍰', name: 'Cake', category: 'Food & Drink' },
  { id: 'food-coffee', emoji: '☕', name: 'Coffee time', category: 'Food & Drink' },
  { id: 'food-tea', emoji: '🫖', name: 'Tea pot', category: 'Food & Drink' },
  { id: 'food-peach', emoji: '🍑', name: 'Peach', category: 'Food & Drink' },
  { id: 'food-cookie', emoji: '🍪', name: 'Cookie', category: 'Food & Drink' },

  // Faith and calm
  { id: 'faith-pray', emoji: '🙏', name: 'Prayer', category: 'Faith & Calm' },
  { id: 'faith-book', emoji: '📖', name: 'Bible or reading', category: 'Faith & Calm' },
  { id: 'faith-dove', emoji: '🕊️', name: 'Peace', category: 'Faith & Calm' },
  { id: 'faith-heart', emoji: '❤️', name: 'Love', category: 'Faith & Calm' },
  { id: 'faith-sunrise', emoji: '🌅', name: 'New beginnings', category: 'Faith & Calm' },
  { id: 'faith-candle', emoji: '🕯️', name: 'Quiet reflection', category: 'Faith & Calm' },

  // Scrapbook decorations
  { id: 'scrapbook-paperclip', emoji: '📎', name: 'Paper clip', category: 'Scrapbook' },
  { id: 'scrapbook-note', emoji: '📝', name: 'Little note', category: 'Scrapbook' },
  { id: 'scrapbook-calendar', emoji: '🗓️', name: 'Calendar', category: 'Scrapbook' },
  { id: 'scrapbook-envelope', emoji: '✉️', name: 'Envelope', category: 'Scrapbook' },
  { id: 'scrapbook-heart', emoji: '♡', name: 'Outline heart', category: 'Scrapbook' },
  { id: 'scrapbook-glitter', emoji: '✧', name: 'Tiny sparkle', category: 'Scrapbook' },
  { id: 'scrapbook-flower', emoji: '✿', name: 'Flower symbol', category: 'Scrapbook' },
  { id: 'scrapbook-star', emoji: '☆', name: 'Outline star', category: 'Scrapbook' },
]
