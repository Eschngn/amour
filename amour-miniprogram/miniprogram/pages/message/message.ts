import { ApiError, post } from '../../utils/request'
import { ensureWechatLogin, hasFrontendQueryPermission } from '../../utils/auth'

const PAGE_SIZE = 8

interface MessageReply {
  replyId: string
  content: string
  fromUserName: string
  fromUserAvatar: string
  toUserName: string
  createTime: string
}

interface MessageRecord {
  messageId: string
  content: string
  userName: string
  userAvatar: string
  createTime: string
  replies: MessageReply[]
}

interface MessagePageResult {
  current: number
  size: number
  total: number
  records: MessageRecord[]
}

function initials(name: string) {
  return String(name || '匿名').trim().slice(0, 2).toUpperCase()
}

function formatTime(value: string) {
  return value ? value.slice(0, 16).replace(/-/g, '.') : '时间未记录'
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiError
    && (error.statusCode === 401 || error.errorCode === '20002')
}

Component({
  data: {
    loading: true,
    loadError: '',
    loadingItems: [1, 2, 3],
    messages: [] as WechatMiniprogram.IAnyObject[],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    draft: '',
    draftLength: 0,
    canPublish: false,
    publishing: false,
  },

  lifetimes: {
    async attached() {
      const app = getApp<IAppOption>()
      if (app.globalData.authReady) await app.globalData.authReady.catch(() => undefined)
      if (!hasFrontendQueryPermission('message')) {
        wx.reLaunch({ url: '/pages/index/index' })
        return
      }
      this.loadMessages(1)
    },
  },

  methods: {
    async loadMessages(page: number) {
      this.setData({ loading: true, loadError: '' })
      try {
        const result = await post<MessagePageResult>(`/message/page?current=${page}&size=${PAGE_SIZE}`)
        const total = Number(result.total) || 0
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const currentPage = Math.min(Math.max(1, Number(result.current) || page), totalPages)
        const messages = (result.records || []).map((message, index) => ({
          ...message,
          userName: message.userName || '匿名',
          initials: initials(message.userName),
          displayTime: formatTime(message.createTime),
          shortDate: message.createTime ? message.createTime.slice(5, 10).replace('-', '.') : '',
          number: String(total - ((currentPage - 1) * PAGE_SIZE + index)).padStart(2, '0'),
          replies: (message.replies || []).map((reply) => ({
            ...reply,
            initials: initials(reply.fromUserName),
            displayTime: formatTime(reply.createTime),
          })),
          replyCount: (message.replies || []).length,
        }))
        this.setData({ messages, total, totalPages, currentPage, loading: false })
      } catch (error) {
        this.setData({
          loading: false,
          loadError: getErrorMessage(error, '获取留言失败，请稍后重试'),
        })
      }
    },

    onDraftInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
      const draft = event.detail.value || ''
      this.setData({ draft, draftLength: draft.length, canPublish: Boolean(draft.trim()) })
    },

    async publishMessage() {
      const content = this.data.draft.trim()
      if (!content || this.data.publishing) return
      this.setData({ publishing: true })
      try {
        await ensureWechatLogin()
        try {
          await post<void>('/message/publish', { content })
        } catch (error) {
          if (!isUnauthorized(error)) throw error
          await ensureWechatLogin({ force: true })
          await post<void>('/message/publish', { content })
        }
        this.setData({ draft: '', draftLength: 0, canPublish: false })
        wx.showToast({ title: '留言发布成功', icon: 'success' })
        await this.loadMessages(1)
      } catch (error) {
        wx.showToast({ title: getErrorMessage(error, '发布失败，请稍后重试'), icon: 'none' })
      } finally {
        this.setData({ publishing: false })
      }
    },

    turnPage(event: WechatMiniprogram.BaseEvent) {
      const direction = event.currentTarget.dataset.direction
      const nextPage = direction === 'prev' ? this.data.currentPage - 1 : this.data.currentPage + 1
      if (nextPage >= 1 && nextPage <= this.data.totalPages) this.loadMessages(nextPage)
    },

    retry() {
      this.loadMessages(this.data.currentPage)
    },
  },
})
