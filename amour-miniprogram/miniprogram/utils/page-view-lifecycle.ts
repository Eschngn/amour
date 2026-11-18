/**
 * 页面生命周期接入层：把页面浏览采集统一挂到小程序的页面生命周期上。
 *
 * 为什么要这一层：
 * - 本项目的页面既有 `Page({...})`（广场列表 / 详情 / 故事详情 / 照片详情），
 *   也有作为页面使用的 `Component({...})`（首页 / 故事 / 相册 / 留言 / 我的），生命周期名不同；
 * - 直接在每个页面里复制 visitorId、eventId、去重逻辑难以维护，
 *   这里只做“生命周期 → 采集器”的适配，统计口径全部集中在 utils/page-view-tracker。
 *
 * 计数口径（与 Web 端 pageViewTracker 对齐）：
 * - onLoad / attached（新页面实例）记录为“新实例”；
 * - onShow / pageLifetimes.show 只在新实例首次展示时计数；
 *   从后台切回前台、同一实例重复 onShow 都不重复计数；
 * - onUnload / detached 清理当前页状态，重新进入页面（新实例）会重新计数；
 * - 采集失败静默丢弃，不阻塞页面打开，也不弹提示。
 */
import {
  configurePageViewTracker,
  getPageViewTracker,
  type SupportedPageKey,
} from './page-view-tracker'

interface LifecycleHost {
  [key: string]: unknown
}

type LifecycleFn = (this: LifecycleHost, ...args: unknown[]) => unknown
type Send = Parameters<typeof configurePageViewTracker>[0]

/** 当前页面实例是否已经加载（用于区分“新实例首次展示”与“后台恢复”）。 */
let pageLoaded = false

/** App 进入后台时调用：下一次 onShow 属于“恢复”，不重复计数。 */
export function notifyAppHide(): void {
  pageLoaded = false
}

/** 仅测试使用：重置模块级状态。 */
export function resetPageViewLifecycleState(): void {
  pageLoaded = false
}

/** 页面加载（onLoad / attached）：标记新实例，允许下一次展示计数。 */
export function notifyPageLoaded(): void {
  pageLoaded = true
}

/**
 * 页面展示（onShow / pageLifetimes.show）。
 *
 * @param routePath 页面路径（app.json 中注册的路径）；缺省时取当前页面栈顶
 * @returns 是否计了一次 PV
 */
export function trackPageShow(routePath?: string): boolean {
  const fresh = pageLoaded
  pageLoaded = false
  return getPageViewTracker().trackPageShow({
    routePath,
    fresh,
  })
}

/** 页面卸载（onUnload / detached）：清理去重状态，下次进入重新计数。 */
export function trackPageUnload(): void {
  pageLoaded = false
  getPageViewTracker().trackPageUnload()
}

/** 注入统计上报实现（app.ts 启动时调用一次）。 */
export function configurePageViewReporting(send: Send): void {
  configurePageViewTracker(send)
}

/**
 * 为 `Page({...})` 页面接入统计。
 *
 * 用法：`Page(withPageViewTracking({ ...原页面选项 }, 'pages/plaza/index'))`
 */
export function withPageViewTracking<
  TData extends WechatMiniprogram.Page.DataOption,
  TCustom extends WechatMiniprogram.Page.CustomOption,
>(
  pageOptions: WechatMiniprogram.Page.Options<TData, TCustom>,
  routePath: string,
): WechatMiniprogram.Page.Options<TData, TCustom> {
  const options = { ...pageOptions } as Record<string, unknown>

  const originalLoad = options.onLoad as LifecycleFn | undefined
  const originalShow = options.onShow as LifecycleFn | undefined
  const originalUnload = options.onUnload as LifecycleFn | undefined

  options.onLoad = function (this: LifecycleHost, ...args: unknown[]) {
    notifyPageLoaded()
    if (typeof originalLoad === 'function') return originalLoad.apply(this, args)
    return undefined
  }
  options.onShow = function (this: LifecycleHost, ...args: unknown[]) {
    trackPageShow(routePath)
    if (typeof originalShow === 'function') return originalShow.apply(this, args)
    return undefined
  }
  options.onUnload = function (this: LifecycleHost, ...args: unknown[]) {
    trackPageUnload()
    if (typeof originalUnload === 'function') return originalUnload.apply(this, args)
    return undefined
  }

  return options as WechatMiniprogram.Page.Options<TData, TCustom>
}

/**
 * 为“作为页面使用的 Component”接入统计。
 *
 * 用法：`Component(withComponentPageViewTracking({ ...原组件选项 }, 'pages/index/index'))`
 */
export function withComponentPageViewTracking<
  TData extends WechatMiniprogram.Component.DataOption,
  TProperty extends WechatMiniprogram.Component.PropertyOption,
  TMethod extends WechatMiniprogram.Component.MethodOption,
>(
  componentOptions: WechatMiniprogram.Component.Options<TData, TProperty, TMethod>,
  routePath: string,
): WechatMiniprogram.Component.Options<TData, TProperty, TMethod> {
  const options = { ...componentOptions } as Record<string, unknown>
  const lifetimes = { ...((options.lifetimes as Record<string, unknown>) || {}) }
  const pageLifetimes = { ...((options.pageLifetimes as Record<string, unknown>) || {}) }

  const originalAttached = lifetimes.attached as LifecycleFn | undefined
  const originalDetached = lifetimes.detached as LifecycleFn | undefined
  const originalShow = pageLifetimes.show as LifecycleFn | undefined

  lifetimes.attached = function (this: LifecycleHost, ...args: unknown[]) {
    notifyPageLoaded()
    if (typeof originalAttached === 'function') return originalAttached.apply(this, args)
    return undefined
  }
  lifetimes.detached = function (this: LifecycleHost, ...args: unknown[]) {
    trackPageUnload()
    if (typeof originalDetached === 'function') return originalDetached.apply(this, args)
    return undefined
  }
  pageLifetimes.show = function (this: LifecycleHost, ...args: unknown[]) {
    trackPageShow(routePath)
    if (typeof originalShow === 'function') return originalShow.apply(this, args)
    return undefined
  }

  return {
    ...componentOptions,
    lifetimes,
    pageLifetimes,
  } as WechatMiniprogram.Component.Options<TData, TProperty, TMethod>
}

/** 便于页面按需显式统计（一般不需要直接调用）。 */
export type { SupportedPageKey }
