/**
 * 空间内容展示色工具。
 *
 * 故事、章节与纪念日统一使用默认玫瑰色；
 * 这里集中提供柔化底色、浅底文字色与纯色块文字色，避免各页面重复计算。
 */

export const DEFAULT_THEME_COLOR = '#D94F70'

/** 统一为 #RRGGBB 大写；非法或空值返回 fallback。 */
export function normalizeHexColor(value, fallback = '') {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  const candidate = text.startsWith('#') ? text : `#${text}`
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toUpperCase() : fallback
}

function hexToRgb(value) {
  const hex = normalizeHexColor(value)
  if (!hex) return null
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function toHex(value) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0').toUpperCase()
}

/** 按权重混合两个颜色；weight 为 from 的占比（0-1）。 */
export function mixHexColors(from, to, weight = 0.5) {
  const start = hexToRgb(from)
  const end = hexToRgb(to)
  if (!start || !end) return normalizeHexColor(from, normalizeHexColor(to, DEFAULT_THEME_COLOR))
  const ratio = Math.max(0, Math.min(1, weight))
  const mixChannel = (a, b) => toHex(a * ratio + b * (1 - ratio))
  return `#${mixChannel(start.r, end.r)}${mixChannel(start.g, end.g)}${mixChannel(start.b, end.b)}`
}

/** 展示色的浅色底，用于标签、日期块等大面积背景。 */
export function softenHexColor(value, fallback = DEFAULT_THEME_COLOR, ratio = 0.12) {
  const accent = normalizeHexColor(value, fallback)
  return mixHexColors(accent, '#FFFFFF', ratio)
}

/** 展示色描边，比柔化底色更有存在感。 */
export function themeBorderColor(value, fallback = DEFAULT_THEME_COLOR, ratio = 0.38) {
  const accent = normalizeHexColor(value, fallback)
  return mixHexColors(accent, '#FFFFFF', ratio)
}

function relativeLuminance(value) {
  const rgb = hexToRgb(value)
  if (!rgb) return 1
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const unit = channel / 255
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** 在展示色纯色块上使用时，返回白色或深色文字，避免亮色背景白字看不清。 */
export function contrastTextColor(value, fallback = DEFAULT_THEME_COLOR) {
  return relativeLuminance(normalizeHexColor(value, fallback)) > 0.35 ? '#4C0519' : '#FFFFFF'
}

/** 在浅色底上作为展示文字色使用；过亮的颜色自动压暗，避免低对比度。 */
export function accentTextColor(value, fallback = DEFAULT_THEME_COLOR) {
  const accent = normalizeHexColor(value, fallback)
  return relativeLuminance(accent) > 0.3 ? mixHexColors(accent, '#4C0519', 0.55) : accent
}
