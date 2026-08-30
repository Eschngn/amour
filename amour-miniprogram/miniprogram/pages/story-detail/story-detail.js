const { post } = require('../../utils/request')
const { hasFrontendQueryPermission } = require('../../utils/auth')

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

function normalizeStory(story) {
  if (!story) return null
  return {
    ...story,
    title: story.title || '未命名故事',
    summary: story.summary || '这一页还没有写下简介。',
    chapterName: story.chapterName || '章节未记录',
    tagLabel: story.tagLabel || story.tag || '',
    location: story.location || '地点未记录',
    coverImage: story.coverImage || '',
    content: story.content || '',
  }
}

function buildStoryContext(story) {
  const normalizedStory = normalizeStory(story)
  if (!normalizedStory) return null
  const content = String(normalizedStory.content || '')
  const blocks = parseMarkdown(content).map((block, index) => ({
    ...block,
    key: `${block.type}-${index}`,
  }))
  const totalWords = content.replace(/\s/g, '').length
  const contentImages = blocks.filter((block) => block.type === 'image').map((block) => block.url)
  return {
    story: normalizedStory,
    blocks,
    contentImages,
    totalWords,
    readTime: totalWords ? `约 ${Math.ceil(totalWords / 400)} 分钟` : '小于 1 分钟',
    formattedDate: formatDate(normalizedStory.happenedTime),
  }
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
    scrollTop: 0,
    pageScrollEnabled: true,
    adjacentStory: null,
    adjacentBlocks: [],
    adjacentContentImages: [],
    adjacentReadTime: '',
    adjacentTotalWords: 0,
    adjacentFormattedDate: '',
    adjacentOffset: 0,
    adjacentTop: 0,
    detailOffset: 0,
    detailTransition: false,
    loadingItems: [1, 2, 3, 4, 5],
  },

  onLoad(options) {
    if (!hasFrontendQueryPermission('story')) {
      wx.reLaunch({ url: '/pages/index/index' })
      return
    }
    const id = Number(options.id)
    this.storyContextCache = new Map()
    this.storyContextRequests = new Map()
    if (!Number.isFinite(id) || id <= 0) {
      this.setData({ loading: false, error: '故事 ID 无效' })
      return
    }
    this.loadStory(id)
  },

  async getStoryContext(id) {
    const safeId = Number(id)
    if (!Number.isFinite(safeId) || safeId <= 0) return null
    if (this.storyContextCache && this.storyContextCache.has(safeId)) {
      return this.storyContextCache.get(safeId)
    }
    if (this.storyContextRequests && this.storyContextRequests.has(safeId)) {
      return this.storyContextRequests.get(safeId)
    }

    const request = post('/story/detail', { id: safeId })
      .then((story) => {
        const context = buildStoryContext(story)
        if (context && this.storyContextCache) this.storyContextCache.set(safeId, context)
        return context
      })
      .catch(() => null)
      .finally(() => {
        if (this.storyContextRequests) this.storyContextRequests.delete(safeId)
      })

    this.storyContextRequests.set(safeId, request)
    return request
  },

  async prefetchAdjacentStories(story) {
    const neighborIds = [story && story.preStory && story.preStory.id, story && story.nextStory && story.nextStory.id]
      .map((value) => Number(value))
      .filter((value, index, array) => Number.isFinite(value) && value > 0 && array.indexOf(value) === index)
    if (!neighborIds.length) return
    await Promise.all(neighborIds.map((id) => this.getStoryContext(id).catch(() => null)))
  },

  applyStoryContext(context, options = {}) {
    if (!context) return
    const resetScroll = options.resetScroll !== false
    this.setData({
      loading: false,
      error: '',
      currentId: Number(context.story.id),
      story: context.story,
      blocks: context.blocks,
      contentImages: context.contentImages,
      readTime: context.readTime,
      totalWords: context.totalWords,
      formattedDate: context.formattedDate,
      adjacentStory: null,
      adjacentBlocks: [],
      adjacentContentImages: [],
      adjacentReadTime: '',
      adjacentTotalWords: 0,
      adjacentFormattedDate: '',
      adjacentOffset: 0,
      adjacentTop: 0,
      detailOffset: 0,
      detailTransition: false,
      ...(resetScroll ? { scrollTop: 0 } : {}),
    })
  },

  async loadStory(id) {
    const safeId = Number(id)
    if (!Number.isFinite(safeId) || safeId <= 0) return
    const requestId = (this.storyLoadRequestId || 0) + 1
    this.storyLoadRequestId = requestId
    this.setData({ loading: true, error: '', currentId: safeId, scrollTop: 0, pageScrollEnabled: true })
    try {
      const context = await this.getStoryContext(safeId)
      if (this.storyLoadRequestId !== requestId) return
      if (!context) throw new Error('故事不存在或已被删除')
      this.applyStoryContext(context)
      this.prefetchAdjacentStories(context.story)
    } catch (error) {
      this.setData({
        loading: false,
        story: null,
        error: error instanceof Error && error.message ? error.message : '故事加载失败，请稍后重试',
      })
    }
  },

  onDetailScroll(event) {
    this.scrollOffsetPx = event.detail.scrollTop || 0
  },

  onDetailTouchStart(event) {
    const touch = event.touches && event.touches[0]
    if (!touch || this.detailSwitchTimer) return
    if (this.detailResetTimer) {
      clearTimeout(this.detailResetTimer)
      this.detailResetTimer = null
    }
    const currentStory = this.data.story || {}
    const preId = currentStory.preStory && Number(currentStory.preStory.id)
    const nextId = currentStory.nextStory && Number(currentStory.nextStory.id)
    if (Number.isFinite(preId) && preId > 0) this.getStoryContext(preId)
    if (Number.isFinite(nextId) && nextId > 0) this.getStoryContext(nextId)
    this.detailTouchStart = { x: touch.clientX, y: touch.clientY }
    this.detailGestureDirection = ''
    this.setData({
      detailTransition: false,
      pageScrollEnabled: true,
      adjacentTop: this.scrollOffsetPx || 0,
    })
  },

  onDetailTouchMove(event) {
    const start = this.detailTouchStart
    const touch = event.touches && event.touches[0]
    if (!start || !touch) return

    const offsetX = touch.clientX - start.x
    const offsetY = touch.clientY - start.y
    if (!this.detailGestureDirection && (Math.abs(offsetX) > 8 || Math.abs(offsetY) > 8)) {
      this.detailGestureDirection = Math.abs(offsetX) > Math.abs(offsetY) ? 'horizontal' : 'vertical'
      if (this.detailGestureDirection === 'horizontal' && this.data.pageScrollEnabled) {
        this.setData({ pageScrollEnabled: false })
      }
    }
    if (this.detailGestureDirection !== 'horizontal') return

    const windowWidth = wx.getSystemInfoSync().windowWidth
    const direction = offsetX < 0 ? 1 : -1
    const adjacentId = direction > 0
      ? this.data.story && this.data.story.nextStory && this.data.story.nextStory.id
      : this.data.story && this.data.story.preStory && this.data.story.preStory.id
    const adjacentContext = Number.isFinite(Number(adjacentId)) ? this.storyContextCache && this.storyContextCache.get(Number(adjacentId)) : null
    const hasAdjacentStory = !!adjacentContext
    const displayOffset = hasAdjacentStory ? offsetX : offsetX * 0.28
    this.setData({
      detailOffset: displayOffset,
      adjacentStory: adjacentContext ? adjacentContext.story : null,
      adjacentBlocks: adjacentContext ? adjacentContext.blocks : [],
      adjacentContentImages: adjacentContext ? adjacentContext.contentImages : [],
      adjacentReadTime: adjacentContext ? adjacentContext.readTime : '',
      adjacentTotalWords: adjacentContext ? adjacentContext.totalWords : 0,
      adjacentFormattedDate: adjacentContext ? adjacentContext.formattedDate : '',
      adjacentOffset: hasAdjacentStory ? displayOffset + (offsetX < 0 ? windowWidth : -windowWidth) : 0,
      adjacentTop: this.scrollOffsetPx || 0,
    })
  },

  onDetailTouchEnd(event) {
    const start = this.detailTouchStart
    const touch = event.changedTouches && event.changedTouches[0]
    const direction = this.detailGestureDirection
    this.detailTouchStart = null
    this.detailGestureDirection = ''
    if (!start || !touch || direction !== 'horizontal') {
      this.setData({ pageScrollEnabled: true })
      return
    }

    this.setData({ pageScrollEnabled: true })

    const offsetX = touch.clientX - start.x
    const windowWidth = wx.getSystemInfoSync().windowWidth
    const nextStory = offsetX < 0 ? this.data.story && this.data.story.nextStory : this.data.story && this.data.story.preStory
    const canSwitch = !!(nextStory && nextStory.id)
    const switchThreshold = Math.max(36, windowWidth * 0.12)
    const shouldSwitch = canSwitch && Math.abs(offsetX) >= switchThreshold

    if (!shouldSwitch) {
      this.setData({ detailOffset: 0, adjacentOffset: 0, detailTransition: true })
      this.detailResetTimer = setTimeout(() => {
        this.detailResetTimer = null
        this.setData({
          adjacentStory: null,
          adjacentBlocks: [],
          adjacentContentImages: [],
          adjacentReadTime: '',
          adjacentTotalWords: 0,
          adjacentFormattedDate: '',
        })
      }, 250)
      return
    }

    const targetOffset = offsetX < 0 ? -windowWidth : windowWidth
    const nextStoryId = Number(nextStory.id)
    const cachedContext = this.storyContextCache && this.storyContextCache.get(nextStoryId)

    if (!cachedContext) {
      // Keep the current story visible while a missed adjacent story is fetched.
      this.setData({ detailOffset: 0, adjacentOffset: 0, detailTransition: true })
      this.detailSwitchTimer = this.getStoryContext(nextStoryId).then((context) => {
        this.detailSwitchTimer = null
        if (!context) {
          this.setData({ detailTransition: false })
          return
        }
        this.applyStoryContext(context)
        this.prefetchAdjacentStories(context.story)
      }).catch(() => {
        this.detailSwitchTimer = null
        this.setData({ detailTransition: false })
      })
      return
    }

    this.setData({
      detailOffset: targetOffset,
      adjacentOffset: 0,
      detailTransition: true,
      scrollTop: this.scrollOffsetPx || 0,
    })
    this.detailSwitchTimer = setTimeout(() => {
      this.detailSwitchTimer = null
      // Reuse the prefetched context instead of rendering the loading skeleton.
      this.applyStoryContext(cachedContext)
      this.prefetchAdjacentStories(cachedContext.story)
    }, 250)
  },

  onUnload() {
    if (this.detailSwitchTimer) clearTimeout(this.detailSwitchTimer)
    if (this.detailResetTimer) clearTimeout(this.detailResetTimer)
  },

  previewContentImage(event) {
    const current = String(event.currentTarget.dataset.url || '')
    if (current) wx.previewImage({ current, urls: this.data.contentImages })
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
