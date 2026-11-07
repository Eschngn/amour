/**
 * 情侣空间状态请求闸门。
 *
 * 这里只负责「哪一次请求还有效」的纯逻辑，不依赖 Vue、axios 或浏览器：
 * - begin() 开始一次新请求并返回请求序号，序号随每次请求递增；
 * - isCurrent(id) 判断响应是否仍属于最新请求，过期响应必须丢弃；
 * - invalidate() 让所有在途请求失效（生命周期写操作后的强制刷新用）；
 * - track()/currentInflight() 保存并复用无参数刷新时的 in-flight Promise；
 * - release(id) 只在最新请求结束时释放 in-flight，避免旧请求清掉新请求。
 *
 * useFrontendSpace 用它实现 refreshSpaceStatus({ force: true })，
 * 保证写操作之前发出的旧响应不能覆盖写操作之后的新状态。
 */
export function createSpaceRequestGate() {
  let sequence = 0
  let inflight = null

  return {
    /** 当前请求序号，仅用于调试与测试断言。 */
    get sequence() {
      return sequence
    },

    /**
     * 作废所有在途请求：递增序号并丢弃 in-flight Promise。
     * 只影响请求有效性，不修改页面上的空间状态。
     */
    invalidate() {
      sequence += 1
      inflight = null
      return sequence
    },

    /** 开始一次新请求，返回它的序号。 */
    begin() {
      sequence += 1
      return sequence
    },

    /** 该序号是否仍是最新一次请求。 */
    isCurrent(id) {
      return id === sequence
    },

    /** 记录 in-flight Promise，供无参数刷新复用。 */
    track(promise) {
      inflight = promise
      return promise
    },

    /** 当前的 in-flight Promise；没有则为 null。 */
    currentInflight() {
      return inflight
    },

    /** 只允许最新一次请求清理 in-flight 引用。 */
    release(id) {
      if (id === sequence) {
        inflight = null
      }
    },
  }
}
