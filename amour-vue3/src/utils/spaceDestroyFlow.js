/**
 * 情侣空间「销毁并清空」的提交编排（可注入依赖，便于真实行为测试）。
 *
 * 为什么单独抽这一层：
 * - 交互契约里最容易出错、也最需要被真正验证的是「顺序与副作用」：
 *   取消确认不发请求、提交锁覆盖整个确认到返回的窗口、连续点击只发一次请求、
 *   服务端成功但刷新失败时不得报成销毁失败、只有确认服务器已无空间才清缓存与跳转。
 * - 这些是行为，不是文案。只对 .vue 文件做源码字符串断言无法证明顺序正确；
 *   而项目没有 jsdom / Vitest，无法挂载含 Element Plus 的组件做交互测试。
 * - 把编排逻辑抽成不依赖 Vue / Element Plus 的函数，依赖（确认框、请求、刷新、提示、
 *   清缓存、跳转）全部由调用方注入，就能在 node:test 里用真实控制流跑完整分支。
 *
 * 组件只负责把真实依赖传进来，不再自己编排流程，避免两处逻辑漂移。
 */
import {
  DESTROY_SETTLE_RESULT,
  DESTROY_REFRESH_FAILED_MESSAGE,
  DESTROY_SPACE_STILL_PRESENT_MESSAGE,
  DESTROY_CONFIRM_KEYWORD,
  buildDestroyErrorMessage,
  buildDestroyPromptMessage,
  isDestroyStateConflict,
  resolveDestroySettleResult,
  validateDestroyConfirmInput,
} from './spaceDestroy.js'

/** 销毁编排的结局，供调用方（页面）断言或分支使用。 */
export const DESTROY_OUTCOME = Object.freeze({
  /** 前置条件不满足（已有写操作进行中，或当前不允许销毁）：完全不做任何事。 */
  SKIPPED: 'skipped',
  /** 用户在确认框点了取消 / 关闭：不发请求，不修改状态。 */
  CANCELLED: 'cancelled',
  /** 服务端明确拒绝：展示原因，状态类错误触发强制刷新。 */
  REJECTED: 'rejected',
  /** 服务端明确成功，但状态刷新失败：提示重新读取，不自动重发。 */
  REFRESH_FAILED: 'refresh-failed',
  /** 服务端明确成功，但刷新后仍返回空间：以服务端为准，不伪造已销毁。 */
  SPACE_STILL_PRESENT: 'space-still-present',
  /** 服务端明确成功且刷新确认无空间：清理本地状态并跳转。 */
  COMPLETED: 'completed',
  /** 请求层异常（网络中断 / 响应丢失）。 */
  FAILED: 'failed',
})

/**
 * @typedef {object} DestroyDeps
 * @property {() => boolean} canDestroyNow 当前是否允许销毁（规则层判定）
 * @property {() => string} readBusyAction 读取当前进行中的动作名
 * @property {(action: string) => void} setBusyAction 写入进行中的动作名（'' 表示空闲）
 * @property {() => object|null} readSpace 读取当前页面展示的 SpaceStatusVO
 * @property {() => Promise<{ data?: object }>} confirmPrompt
 *   打开二次确认框；确认返回，取消 / 关闭时抛出（与 ElMessageBox.prompt 语义一致）
 * @property {(space: object|null) => Promise<{ data?: object }>} requestDestroy 调用销毁接口
 * @property {() => Promise<void>} refreshStatus 强制刷新 /space/status
 * @property {() => object|null} readSpaceAfterRefresh 刷新后的空间（null 表示无空间）
 * @property {() => string} readSpaceErrorAfterRefresh 刷新后的空间错误文案
 * @property {() => void} clearCache 清理空间相关本地缓存
 * @property {() => void} clearStatus 清空共享空间状态（不得动登录态）
 * @property {(message: string, kind: string) => void} notify 展示提示
 * @property {(path: string) => Promise<void>} navigate 跳转（成功后去广场）
 */

/**
 * 执行一次「销毁并清空空间」的完整交互。
 *
 * 关键顺序保证（每一条都有对应的真实行为测试）：
 * 1. 先判前置条件并**立即占用提交锁**，晚到的重复调用直接 SKIPPED，因此只会有一次请求；
 * 2. 确认框在锁内打开，取消时立即释放锁且**绝不发请求**；
 * 3. 请求只在用户确认后发出，且请求体绑定当前展示的空间（交给 requestDestroy 实现）；
 * 4. 服务端失败 → 展示原因，状态类冲突强制刷新；成功 → 必须强制刷新后再判定结局；
 * 5. 只有「刷新成功且确认无空间」才清缓存、清共享状态、跳转；
 * 6. 任何路径都在 finally 释放提交锁，不会把页面永久锁死。
 *
 * @param {DestroyDeps} deps
 * @returns {Promise<string>} {@link DESTROY_OUTCOME} 中的一种
 */
export async function runDestroySpace(deps) {
  const {
    canDestroyNow,
    readBusyAction,
    setBusyAction,
    readSpace,
    confirmPrompt,
    requestDestroy,
    refreshStatus,
    readSpaceAfterRefresh,
    readSpaceErrorAfterRefresh,
    clearCache,
    clearStatus,
    notify,
    navigate,
  } = deps || {}

  // 1. 前置条件 + 提交锁：连着点两次时第二次在这里被挡住，不会进入确认框也不会发请求。
  if (typeof readBusyAction === 'function' && readBusyAction() !== '') {
    return DESTROY_OUTCOME.SKIPPED
  }
  if (typeof canDestroyNow === 'function' && !canDestroyNow()) {
    return DESTROY_OUTCOME.SKIPPED
  }
  setBusyAction('destroy')
  try {
    // 2. 二次确认：取消 / 关闭直接返回，保持「不发请求、不改状态」。
    try {
      await confirmPrompt()
    } catch {
      return DESTROY_OUTCOME.CANCELLED
    }

    // 3. 确认后才发请求；请求体绑定当前展示的空间，供服务端校验目标一致性。
    let response
    try {
      response = await requestDestroy(readSpace())
    } catch (error) {
      // 网络中断 / 响应丢失：提示可理解信息；状态类冲突刷新后由用户自行重试，
      // 绝不自动重发已可能成功的销毁请求。
      notify(buildDestroyErrorMessage(null, error), 'error')
      if (isDestroyStateConflict(null, error) && typeof refreshStatus === 'function') {
        await refreshStatus()
      }
      return DESTROY_OUTCOME.FAILED
    }

    const body = response && response.data
    if (!body || !body.success) {
      notify(buildDestroyErrorMessage(body || null, null), 'error')
      if (isDestroyStateConflict(body || null, null) && typeof refreshStatus === 'function') {
        await refreshStatus()
      }
      return DESTROY_OUTCOME.REJECTED
    }

    // 4. 服务端已明确成功：必须强制刷新后再判定结局，不能本地伪造已销毁。
    await refreshStatus()
    const settle = resolveDestroySettleResult({
      space: readSpaceAfterRefresh(),
      spaceError: readSpaceErrorAfterRefresh(),
    })
    if (settle === DESTROY_SETTLE_RESULT.REFRESH_FAILED) {
      // 不报成失败、不自动重发销毁请求。
      notify(DESTROY_REFRESH_FAILED_MESSAGE, 'warning')
      return DESTROY_OUTCOME.REFRESH_FAILED
    }
    if (settle === DESTROY_SETTLE_RESULT.SPACE_STILL_PRESENT) {
      notify(DESTROY_SPACE_STILL_PRESENT_MESSAGE, 'warning')
      return DESTROY_OUTCOME.SPACE_STILL_PRESENT
    }

    // 5. 只有确认服务器已无该空间，才清理本地缓存与共享状态并离开。
    clearCache()
    clearStatus()
    notify('情侣空间已销毁并清空，如有需要请联系管理员协助恢复', 'success')
    await navigate('/plaza')
    return DESTROY_OUTCOME.COMPLETED
  } finally {
    // 6. 无论成功 / 失败 / 取消，都必须释放提交锁。
    setBusyAction('')
  }
}

/**
 * 构造销毁确认框的选项（供组件直接把真实 ElMessageBox.prompt 传进来）。
 *
 * 抽出来是为了保证「确认文案 + 逐字输入校验 + 按钮文案」只有一份定义，
 * 不会出现组件与测试各写一套而漂移。
 *
 * @param {object|null} space 当前空间
 * @returns {{ message: string, title: string, options: object }}
 */
export function buildDestroyConfirmRequest(space) {
  return {
    message: buildDestroyPromptMessage(space),
    title: '销毁并清空情侣空间',
    options: {
      confirmButtonText: '确认销毁',
      cancelButtonText: '取消',
      type: 'warning',
      inputType: 'textarea',
      inputPlaceholder: `请输入“${DESTROY_CONFIRM_KEYWORD}”以确认`,
      inputValidator: validateDestroyConfirmInput,
      distinguishCancelAndClose: true,
    },
  }
}
