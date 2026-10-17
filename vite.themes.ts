import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Colour themes without touching any existing stylesheet.
//
// While Vite processes the CSS, every hex colour in a declaration is wrapped
// as var(--c-b18189, #b18189), so the normal look is exactly what is written
// in the CSS files. For each theme, this file also writes a block that gives
// every one of those variables a new value: the same colour with its hue
// turned (lightness and strength are kept, so text stays as readable as before).
// Colours added to a stylesheet while the dev server runs get their theme
// versions the next time the dev server starts.

// Keep this list in step with THEMES in src/themes.ts.
const THEMES = [
  { id: 'meadow', hue: 145 },
  { id: 'lavender', hue: 300 },
  { id: 'honey', hue: 62 },
  { id: 'sea', hue: 225 },
]

// The rose used for buttons. Every theme's hue is measured from this one.
const BASE_COLOR = 'b18189'

// Rules whose selector contains one of these words are never recoloured.
const MEANING_PATTERN = /delete|danger|error|success|warning/i

const HEX_PATTERN =
  /(?<!url\()#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g

// "#FFF" -> "ffffff", "#B18189" -> "b18189", "#ffffffde" stays 8 digits.
function normalize(hex: string): string {
  const digits = hex.replace('#', '').toLowerCase()

  return digits.length === 3
    ? digits
        .split('')
        .map((digit) => digit + digit)
        .join('')
    : digits
}

function toLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}

function fromLinear(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel))

  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * clamped ** (1 / 2.4) - 0.055
}

interface Oklch {
  l: number
  c: number
  h: number
}

function hexToOklch(hex: string): Oklch {
  const r = toLinear(parseInt(hex.slice(0, 2), 16) / 255)
  const g = toLinear(parseInt(hex.slice(2, 4), 16) / 255)
  const b = toLinear(parseInt(hex.slice(4, 6), 16) / 255)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  return {
    l: lightness,
    c: Math.hypot(a, bb),
    h: (Math.atan2(bb, a) * 180) / Math.PI,
  }
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)

  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ]
}

function inGamut(rgb: [number, number, number]): boolean {
  return rgb.every((channel) => channel >= -0.0005 && channel <= 1.0005)
}

function byteHex(channel: number): string {
  return Math.round(fromLinear(channel) * 255)
    .toString(16)
    .padStart(2, '0')
}

// Gives a colour its version for a theme.
// - Warm greys (the creams, beiges and browns used for pages, borders and text)
//   take on a light tint of the theme's own colour.
// - Every other colour (rose, sage, lilac, ...) has its hue turned by the same
//   amount, so the colours keep their different roles.
// Lightness is never changed, so text stays as readable as before. White and
// black are left alone, and a colour that cannot be shown on a screen is made a
// little less vivid until it can.
export function rotateColor(
  hex: string,
  degrees: number,
  themeHue: number,
): string {
  const original = hexToOklch(hex)
  const alpha = hex.slice(6)

  if (original.c < 0.004) return hex

  const hue = ((original.h % 360) + 360) % 360
  const isWarmGrey = original.c < 0.032 && hue >= 47 && hue <= 95

  const targetHue = isWarmGrey ? themeHue : original.h + degrees
  let chroma = isWarmGrey
    ? Math.min(0.02, original.c * (original.l > 0.9 ? 1.8 : 1.2))
    : original.c

  let rgb = oklchToLinear({ l: original.l, c: chroma, h: targetHue })

  for (let step = 0; step < 60 && !inGamut(rgb); step++) {
    chroma *= 0.95
    rgb = oklchToLinear({ l: original.l, c: chroma, h: targetHue })
  }

  return rgb.map(byteHex).join('') + alpha
}

export function themeShift(targetHue: number): number {
  return targetHue - hexToOklch(BASE_COLOR).h
}

function collectColors(folder: string): string[] {
  const found = new Set<string>()

  function walk(path: string) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name)

      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.css')) {
        for (const match of readFileSync(full, 'utf8').matchAll(HEX_PATTERN)) {
          found.add(normalize(match[0]))
        }
      }
    }
  }

  walk(folder)

  return [...found].sort()
}

function buildThemeCss(colors: string[]): string {
  return THEMES.map((theme) => {
    const shift = themeShift(theme.hue)
    const lines = colors.map(
      (hex) => `  --c-${hex}: #${rotateColor(hex, shift, theme.hue)};`,
    )

    return `html[data-theme="${theme.id}"] {\n${lines.join('\n')}\n}\n`
  }).join('\n')
}

// Only the parts of PostCSS that are used here.
interface CssDeclaration {
  prop: string
  value: string
  parent?: object
}

interface CssRoot {
  source?: { input: { file?: string } }
  // PostCSS accepts several kinds of node here; `never` keeps this description
  // compatible with all of them.
  append(node: never): unknown
}

interface CssHelpers {
  postcss: {
    parse(css: string, options?: { from?: string }): object
  }
}

function selectorOf(declaration: CssDeclaration): string {
  const parent = declaration.parent

  if (
    typeof parent === 'object' &&
    parent !== null &&
    'selector' in parent &&
    typeof parent.selector === 'string'
  ) {
    return parent.selector
  }

  return ''
}

export function themeColorsPlugin(sourceFolder = 'src') {
  const themeCss = buildThemeCss(collectColors(resolve(sourceFolder)))
  const done = new WeakSet<object>()

  return {
    postcssPlugin: 'my-little-world-themes',

    // The theme blocks are added once, to the first stylesheet (src/index.css).
    Once(root: CssRoot, { postcss }: CssHelpers) {
      const path = root.source?.input.file ?? ''

      if (path.replaceAll('\\', '/').endsWith('/src/index.css')) {
        root.append(postcss.parse(themeCss, { from: path }) as never)
      }
    },

    Declaration(declaration: CssDeclaration) {
      if (done.has(declaration)) return
      done.add(declaration)

      // Skip the variables written above, and values with no colour in them.
      if (declaration.prop.startsWith('--c-')) return
      if (!declaration.value.includes('#')) return

      // Colours that carry a meaning (delete, error, success, warning) keep
      // that colour in every theme, so a delete button never turns green.
      if (MEANING_PATTERN.test(selectorOf(declaration))) return

      declaration.value = declaration.value.replace(HEX_PATTERN, (match) => {
        const hex = normalize(match)

        return `var(--c-${hex}, #${hex})`
      })
    },
  }
}
