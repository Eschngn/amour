import type { StoryContentBlock } from '../types/plaza'

/**
 * 故事正文解析（纯函数，无 wx 依赖）。
 *
 * 这里只负责把 Markdown 正文转换成 WXML 可直接渲染的块结构，
 * 同一份解析逻辑同时服务于：
 * - 本人 / 情侣空间的私有故事详情（pages/story-detail）；
 * - 恋爱广场他人的公开故事详情（pages/plaza-story）。
 *
 * 两个页面共用同一套渲染语义，避免公开详情与私有详情出现排版差异。
 * 不发起请求、不读取缓存，便于单测覆盖。
 */

/** 去掉常见行内 Markdown 标记，得到纯文本。 */
function stripInlineMarkdown(value: unknown): string {
  return String(value === null || value === undefined ? '' : value)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim()
}

/**
 * 解析故事正文为渲染块。
 *
 * 支持：围栏代码块、引用、图片、1~3 级标题、分隔线、无序列表与普通段落。
 * 其它 Markdown 语法按普通段落处理，不破坏原有排版。
 */
export function parseStoryContent(content: unknown): StoryContentBlock[] {
  const lines = String(content === null || content === undefined ? '' : content)
    .replace(/\r\n/g, '\n')
    .split('\n')
  const blocks: StoryContentBlock[] = []
  let paragraph: string[] = []
  let quote: string[] = []
  let code: string[] = []
  let codeLanguage = ''
  let inCode = false

  const pushBlock = (block: Omit<StoryContentBlock, 'key'>) => {
    blocks.push({ ...block, key: `${block.type}-${blocks.length}` })
  }

  const flushParagraph = () => {
    const text = stripInlineMarkdown(paragraph.join(' '))
    if (text) pushBlock({ type: 'paragraph', text })
    paragraph = []
  }
  const flushQuote = () => {
    const text = stripInlineMarkdown(quote.join('\n'))
    if (text) pushBlock({ type: 'quote', text })
    quote = []
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    const fence = line.match(/^```\s*(.*)$/)
    if (fence) {
      if (inCode) {
        pushBlock({ type: 'code', text: code.join('\n'), language: codeLanguage || 'CODE' })
        code = []
        codeLanguage = ''
        inCode = false
      } else {
        flushParagraph()
        flushQuote()
        codeLanguage = fence[1].trim().toUpperCase()
        inCode = true
      }
      return
    }
    if (inCode) {
      code.push(rawLine)
      return
    }

    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      quote.push(quoteMatch[1])
      return
    }
    flushQuote()

    if (!line) {
      flushParagraph()
      return
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/)
    if (imageMatch) {
      flushParagraph()
      pushBlock({ type: 'image', alt: imageMatch[1] || '故事图片', url: imageMatch[2] })
      return
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      pushBlock({ type: 'heading', level: headingMatch[1].length, text: stripInlineMarkdown(headingMatch[2]) })
      return
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushParagraph()
      pushBlock({ type: 'divider' })
      return
    }

    const listMatch = line.match(/^[-*+]\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      pushBlock({ type: 'list', text: stripInlineMarkdown(listMatch[1]) })
      return
    }

    paragraph.push(line)
  })

  flushParagraph()
  flushQuote()
  if (inCode && code.length) pushBlock({ type: 'code', text: code.join('\n'), language: codeLanguage || 'CODE' })
  return blocks
}

/** 正文字数：去掉所有空白字符，与后端 GalleryStoryPreviewUtil 的口径一致。 */
export function countStoryWords(content: unknown): number {
  return String(content === null || content === undefined ? '' : content).replace(/\s/g, '').length
}

/** 预计阅读时长：按每分钟 400 字估算，无正文时为“小于 1 分钟”。 */
export function formatStoryReadTime(totalWords: number): string {
  const words = Number(totalWords)
  if (!Number.isFinite(words) || words <= 0) return '小于 1 分钟'
  return `约 ${Math.ceil(words / 400)} 分钟`
}

/** 故事开始年份展示为 '24；无有效开始日期时返回占位符。 */
export function formatStoryStartYear(value: unknown): string {
  const text = String(value === null || value === undefined ? '' : value).trim()
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:[ T].*)?$/.exec(text)
  return match ? `'${match[1].slice(2)}` : '--'
}

/** 故事发生日期展示为 2024.05.20；无有效日期时返回空字符串。 */
export function formatStoryDate(value: unknown): string {
  if (!value) return ''
  return String(value).slice(0, 10).replace(/-/g, '.')
}

/** 正文中的图片地址：只接受 http(s) 绝对地址，用于大图预览。 */
export function collectContentImages(blocks: StoryContentBlock[]): string[] {
  return (Array.isArray(blocks) ? blocks : [])
    .filter(block => block && block.type === 'image')
    .map(block => String(block.url || '').trim())
    .filter(url => /^https?:\/\//i.test(url))
}
