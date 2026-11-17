import type { SpaceCardView } from '../types/plaza'

/**
 * 恋爱广场列表状态机。
 *
 * 与页面 / 组件解耦的纯逻辑，负责：
 * - 首次加载、下拉刷新、加载下一页三种请求的来源隔离；
 * - 刷新与分页并发时丢弃过期响应（generation 令牌）；
 * - 记录已成功加载的页码，失败不推进页码，重试同一页；
 * - 同一分页请求不重复并发；
 * - 按 spaceId 去重并保持服务端顺序；
 * - 组件卸载（dispose）后忽略所有在途响应。
 *
 * 该类不依赖 wx API，也不发起网络请求，便于用 node:test 覆盖竞态场景。
 */

export type PlazaListStatus = 'idle' | 'loading' | 'error' | 'ready'

export interface PlazaListState {
  status: PlazaListStatus
  items: SpaceCardView[]
  /** 服务端返回的总条数；未知时为已加载条数 */
  total: number
  /** 最近一次成功加载的页码，从 1 开始 */
  page: number
  hasMore: boolean
  refreshing: boolean
  loadingMore: boolean
  /** 首次加载失败文案 */
  loadError: string
  /** 下一页失败文案，不清空已有 items */
  loadMoreError: string
}

export interface PagerQuery {
  current: number
  size: number
}

export interface PagerPage {
  records?: unknown
  current?: unknown
  total?: unknown
}

export type PagerFetcher = (query: PagerQuery) => Promise<PagerPage>
export type PagerAdapter = (records: unknown) => SpaceCardView[]

export type PagerOutcome = 'loaded' | 'failed' | 'ignored'

const DEFAULT_PAGE_SIZE = 8

function initialState(): PlazaListState {
  return {
    status: 'idle',
    items: [],
    total: 0,
    page: 0,
    hasMore: true,
    refreshing: false,
    loadingMore: false,
    loadError: '',
    loadMoreError: '',
  }
}

function toCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value)
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

export class PlazaPager {
  private readonly fetchPage: PagerFetcher
  private readonly adapt: PagerAdapter
  private readonly pageSize: number

  private state: PlazaListState = initialState()
  private listeners: Array<(state: PlazaListState) => void> = []
  /** 每次首屏 / 刷新请求自增；旧 generation 的响应全部丢弃 */
  private generation = 0
  /** 在途的首屏 / 刷新请求所属 generation；null 表示没有在途首屏请求 */
  private firstRequest: number | null = null
  /** 每次首屏 / 刷新请求都会让在途分页 token 失效 */
  private moreToken = 0
  private disposed = false

  constructor(fetchPage: PagerFetcher, adapt: PagerAdapter, options: { pageSize?: number } = {}) {
    this.fetchPage = fetchPage
    this.adapt = adapt
    const size = Number(options.pageSize)
    this.pageSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : DEFAULT_PAGE_SIZE
  }

  getState(): PlazaListState {
    return this.state
  }

  subscribe(listener: (state: PlazaListState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(item => item !== listener)
    }
  }

  /** 首次加载 / 首屏失败后的重试。已有内容时忽略，避免清空列表。 */
  load(): Promise<PagerOutcome> {
    if (this.disposed || this.firstRequest !== null) return Promise.resolve('ignored')
    // 已经成功加载过（包括空列表）就不再重复请求；空列表由“刷新”或错误态重试驱动。
    if (this.state.status === 'ready') return Promise.resolve('ignored')
    return this.runFirstPage('loading')
  }

  /**
   * 下拉刷新。
   *
   * 始终发起新的 generation：在途的分页响应会被丢弃；刷新失败时保留旧列表。
   * 首屏请求还没结束时忽略刷新，避免同一页并发两次请求。
   */
  refresh(): Promise<PagerOutcome> {
    if (this.disposed || this.firstRequest !== null) return Promise.resolve('ignored')
    return this.runFirstPage('refresh')
  }

  /** 加载下一页。页码只在成功拿到数据后推进。 */
  async loadMore(): Promise<PagerOutcome> {
    if (this.disposed) return Promise.resolve('ignored')
    const state = this.state
    if (state.status === 'loading' || state.refreshing || state.loadingMore) return 'ignored'
    if (!state.items.length || !state.hasMore) return 'ignored'

    const generation = this.generation
    const token = ++this.moreToken
    const target = state.page + 1
    const previousItems = state.items

    this.patch({ loadingMore: true, loadMoreError: '' })

    let page: PagerPage
    try {
      page = await this.fetchPage({ current: target, size: this.pageSize })
    } catch (error) {
      // 刷新 / 卸载已经让这次分页请求过期：不要改动任何状态。
      if (this.disposed || generation !== this.generation || token !== this.moreToken) return 'ignored'
      this.patch({
        loadingMore: false,
        loadMoreError: this.describeError(error, '加载更多失败，请稍后重试'),
      })
      return 'failed'
    }

    if (this.disposed || generation !== this.generation || token !== this.moreToken) return 'ignored'

    const cards = this.adapt(page.records)
    const merged = this.merge(previousItems, cards)
    const current = toCount(page.current) || target
    const total = toCount(page.total)

    this.patch({
      loadingMore: false,
      loadMoreError: '',
      items: merged,
      page: current,
      total: total === null ? merged.length : total,
      hasMore: this.resolveHasMore({ page: current, total, received: cards.length }),
    })
    return 'loaded'
  }

  /** 页面卸载时调用：让所有在途响应失效，并解绑订阅。 */
  dispose(): void {
    this.disposed = true
    this.generation += 1
    this.moreToken += 1
    this.firstRequest = null
    this.listeners = []
  }

  private async runFirstPage(mode: 'loading' | 'refresh'): Promise<PagerOutcome> {
    const generation = ++this.generation
    // 作废所有在途分页请求：它们的 token 在此之后不再匹配。
    this.moreToken += 1
    this.firstRequest = generation

    const previousItems = this.state.items
    if (mode === 'loading') {
      this.patch({
        status: 'loading',
        items: [],
        total: 0,
        page: 0,
        hasMore: true,
        refreshing: false,
        loadingMore: false,
        loadError: '',
        loadMoreError: '',
      })
    } else {
      // 刷新时保留已有列表，只标记刷新中；旧的分页请求已经作废，footer 同时复位。
      this.patch({
        status: previousItems.length ? 'ready' : 'loading',
        refreshing: true,
        loadingMore: false,
        loadError: '',
        loadMoreError: '',
      })
    }

    let page: PagerPage
    try {
      page = await this.fetchPage({ current: 1, size: this.pageSize })
    } catch (error) {
      if (!this.isCurrentFirst(generation)) return 'ignored'
      const message = this.describeError(error, '恋爱广场加载失败了，请稍后重试')
      if (mode === 'refresh' && previousItems.length) {
        // 刷新失败：保留已有列表与分页状态，只关闭刷新态。
        this.patch({ refreshing: false, status: 'ready' })
      } else if (mode === 'refresh') {
        // 列表为空时刷新失败：与首屏失败一致，给出重试入口。
        this.patch({ refreshing: false, status: 'error', loadError: message })
      } else {
        this.patch({ refreshing: false, status: 'error', loadError: message })
      }
      return 'failed'
    }

    if (!this.isCurrentFirst(generation)) return 'ignored'

    const cards = this.merge([], this.adapt(page.records))
    const current = toCount(page.current) || 1
    const total = toCount(page.total)
    this.patch({
      status: 'ready',
      items: cards,
      page: current,
      total: total === null ? cards.length : total,
      hasMore: this.resolveHasMore({ page: current, total, received: cards.length }),
      refreshing: false,
      loadingMore: false,
      loadError: '',
      loadMoreError: '',
    })
    return 'loaded'
  }

  /**
   * 统一错误文案：开发版把实际尝试过的地址附在提示里，
   * 便于一眼看出「本地服务地址没配对」而不是后端挂了。
   */
  private describeError(error: unknown, fallback: string): string {
    const source = (error && typeof error === 'object' ? error : {}) as {
      message?: string
      detail?: string
    }
    const message = typeof source.message === 'string' && source.message.trim() ? source.message : fallback
    const detail = typeof source.detail === 'string' ? source.detail.trim() : ''
    return detail ? `${message}（${detail}）` : message
  }

  private isCurrentFirst(generation: number): boolean {
    if (this.disposed || generation !== this.generation) return false
    this.firstRequest = null
    return true
  }

  /**
   * 是否还有下一页。
   *
   * - 服务端返回 total 时，按“已请求到的服务端行数”和 total 比较：
   *   即使本页因去重变少，也不会误判成到底。
   * - 没有 total 时按本页是否满页推断，避免空翻页。
   */
  private resolveHasMore(input: { page: number; total: number | null; received: number }): boolean {
    if (input.received <= 0) return false
    if (input.total !== null) return input.page * this.pageSize < input.total
    return input.received >= this.pageSize
  }

  private merge(previous: SpaceCardView[], incoming: SpaceCardView[]): SpaceCardView[] {
    const seen: Record<string, true> = {}
    const merged: SpaceCardView[] = []
    previous.concat(incoming).forEach((card) => {
      if (!card || seen[card.spaceId]) return
      seen[card.spaceId] = true
      merged.push(card)
    })
    return merged
  }

  private patch(partial: Partial<PlazaListState>): void {
    this.state = Object.assign({}, this.state, partial)
    this.listeners.forEach(listener => listener(this.state))
  }
}
