const { post } = require('../../utils/request')

function stripInlineMarkdown(value) {
  return String(value || '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim()
}

function parseMarkdown(content) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let paragraph = []
  let quote = []
  let code = []
  let codeLanguage = ''
  let inCode = false

  const flushParagraph = () => {
    const text = stripInlineMarkdown(paragraph.join(' '))
    if (text) blocks.push({ type: 'paragraph', text })
    paragraph = []
  }
  const flushQuote = () => {
    const text = stripInlineMarkdown(quote.join('\n'))
    if (text) blocks.push({ type: 'quote', text })
    quote = []
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    const fence = line.match(/^```\s*(.*)$/)
    if (fence) {
      if (inCode) {
        blocks.push({ type: 'code', text: code.join('\n'), language: codeLanguage || 'CODE' })
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
      blocks.push({ type: 'image', alt: imageMatch[1] || '故事图片', url: imageMatch[2] })
      return
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: stripInlineMarkdown(headingMatch[2]) })
      return
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushParagraph()
      blocks.push({ type: 'divider' })
      return
    }

    const listMatch = line.match(/^[-*+]\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      blocks.push({ type: 'list', text: stripInlineMarkdown(listMatch[1]) })
      return
    }

    paragraph.push(line)
  })

  flushParagraph()
  flushQuote()
  if (inCode && code.length) blocks.push({ type: 'code', text: code.join('\n'), language: codeLanguage || 'CODE' })
  return blocks
}

function formatDate(value) {
  return value ? String(value).slice(0, 10).replace(/-/g, '.') : '日期未记录'
}

Page({
  data: {
    loading: true,
    error: '',
    story: null,
    blocks: [],
    contentImages: [],
    readTime: '小于 1 分钟',
    totalWords: 0,
    formattedDate: '',
    currentId: 0,
    scrollIntoView: '',
    loadingItems: [1, 2, 3, 4, 5],
  },

  onLoad(options) {
    const id = Number(options.id)
    if (!Number.isFinite(id) || id <= 0) {
      this.setData({ loading: false, error: '故事 ID 无效' })
      return
    }
    this.loadStory(id)
  },

  async loadStory(id) {
    this.setData({ loading: true, error: '', currentId: id, scrollIntoView: '' })
    try {
      const story = await post('/story/detail', { id })
      if (!story || !story.id) throw new Error('故事不存在或已被删除')
      const content = String(story.content || '')
      const blocks = parseMarkdown(content).map((block, index) => ({
        ...block,
        key: `${block.type}-${index}`,
      }))
      const totalWords = content.replace(/\s/g, '').length
      const contentImages = blocks.filter((block) => block.type === 'image').map((block) => block.url)
      this.setData({
        story,
        blocks,
        contentImages,
        totalWords,
        readTime: totalWords ? `约 ${Math.ceil(totalWords / 400)} 分钟` : '小于 1 分钟',
        formattedDate: formatDate(story.happenedTime),
        loading: false,
        scrollIntoView: 'detail-top',
      })
    } catch (error) {
      this.setData({
        loading: false,
        story: null,
        error: error instanceof Error && error.message ? error.message : '故事加载失败，请稍后重试',
      })
    }
  },

  previewContentImage(event) {
    const current = String(event.currentTarget.dataset.url || '')
    if (current) wx.previewImage({ current, urls: this.data.contentImages })
  },

  switchStory(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (Number.isFinite(id) && id > 0) this.loadStory(id)
  },

  retry() {
    const id = Number(this.data.currentId)
    if (Number.isFinite(id) && id > 0) this.loadStory(id)
  },

  backToStory() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/story/story' })
  },
})
