/**
 * Returns whether the color is perceived as dark (use light text) or light (use dark text).
 * Works with hex (#rgb, #rrggbb) and rgb/rgba strings.
 */
export function isColorDark(color: string): boolean {
  const rgb = parseColor(color)
  if (!rgb) return true
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
  return luminance < 0.5
}

/**
 * Returns a contrasting text color for the given background: #fff for dark bg, #111 for light bg.
 */
export function getContrastTextColor(bgColor: string): string {
  return isColorDark(bgColor) ? '#fff' : '#111'
}

/**
 * Returns a muted version of the color: shifts toward light or dark by brightness, keeps hue.
 * Bright colors -> light pastel; dark colors -> dark muted. Calmer look for desktop.
 */
export function muteCalendarColor(hex: string): string {
  const rgb = parseColor(hex)
  if (!rgb) return hex
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const mutedS = Math.max(0.1, Math.min(0.4, s * 0.5))
  const mutedL = l >= 0.5
    ? Math.max(0.72, Math.min(0.88, l * 0.75 + 0.35))
    : Math.max(0.2, Math.min(0.38, l * 0.7 + 0.05))
  return hslToHex(h, mutedS, mutedL)
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return { h, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3)
  }
  const toHex = (x: number) => {
    const n = Math.round(Math.max(0, Math.min(1, x)) * 255)
    return n.toString(16).padStart(2, '0')
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  const s = color.trim()
  const hex3 = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(s)
  if (hex3) {
    return {
      r: parseInt(hex3[1] + hex3[1], 16) / 255,
      g: parseInt(hex3[2] + hex3[2], 16) / 255,
      b: parseInt(hex3[3] + hex3[3], 16) / 255,
    }
  }
  const hex6 = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})?$/.exec(s)
  if (hex6) {
    return {
      r: parseInt(hex6[1], 16) / 255,
      g: parseInt(hex6[2], 16) / 255,
      b: parseInt(hex6[3], 16) / 255,
    }
  }
  const rgb = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(s)
  if (rgb) {
    return {
      r: parseInt(rgb[1], 10) / 255,
      g: parseInt(rgb[2], 10) / 255,
      b: parseInt(rgb[3], 10) / 255,
    }
  }
  return null
}
