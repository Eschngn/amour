import test from 'node:test'
import assert from 'node:assert/strict'
import { restoreScrollPosition } from './scrollRestore.js'

/**
 * 运行：npm test
 *
 * 滚动恢复必须在“文档高度还不够”时继续等待内容渲染，
 * 否则故事/广场列表的骨架屏阶段会把位置滚到错误的地方。
 * 这里用可控的 window 替身与手动 rAF 队列验证重试与停止条件。
 */

function createFakeWindow({ height = 1000, viewport = 800, scrollY = 0 } = {}) {
  const state = { height, viewport, scrollY, scrollCalls: [] }
  const win = {
    innerHeight: viewport,
    get scrollY() {
      return state.scrollY
    },
    document: {
      documentElement: {
        get scrollHeight() {
          return state.height
        },
      },
    },
    scrollTo(options) {
      state.scrollCalls.push(options)
      if (typeof options === 'object') state.scrollY = options.top
      else state.scrollY = arguments[1]
    },
  }
  return {
    win,
    state,
    setHeight(next) {
      state.height = next
    },
  }
}

function createRafQueue() {
  const queue = []
  let id = 0
  return {
    raf(callback) {
      id += 1
      queue.push({ id, callback })
      return id
    },
    cancelRaf(handle) {
      const index = queue.findIndex(item => item.id === handle)
      if (index >= 0) queue.splice(index, 1)
    },
    /** 只跑一帧（帧内新增的回调留到下一帧）。 */
    tick() {
      const item = queue.shift()
      if (item) item.callback(Date.now())
    },
    /** 跑完当前帧队列（含帧内新增的回调）。 */
    flush() {
      let guard = 0
      while (queue.length && guard < 10000) {
        const item = queue.shift()
        item.callback(Date.now())
        guard += 1
      }
    },
    get size() {
      return queue.length
    },
  }
}

test('文档高度足够时一帧内滚到目标位置', () => {
  const { win, state } = createFakeWindow({ height: 3000, scrollY: 0 })
  const raf = createRafQueue()
  restoreScrollPosition(1200, { windowRef: win, raf: raf.raf, cancelRaf: raf.cancelRaf })

  assert.equal(raf.size, 1, '首次恢复应排入一帧')
  raf.flush()
  assert.equal(state.scrollY, 1200)
  assert.deepEqual(state.scrollCalls.at(-1), { top: 1200, behavior: 'auto' })
  assert.equal(raf.size, 0, '到达目标后不再重试')
})

test('内容高度不足时逐帧重试，等列表渲染完成后落位', () => {
  const { win, state, setHeight } = createFakeWindow({ height: 900, viewport: 800, scrollY: 0 })
  const raf = createRafQueue()
  restoreScrollPosition(2400, { windowRef: win, raf: raf.raf, cancelRaf: raf.cancelRaf })

  // 第一帧：只能滚到底部（100px），继续等待。
  raf.tick()
  assert.equal(state.scrollY, 100)
  assert.equal(raf.size, 1)

  // 列表加载出更多内容后，下一帧即可到达目标。
  setHeight(5000)
  raf.tick()
  assert.equal(state.scrollY, 2400)
  assert.equal(raf.size, 0)
})

test('达到帧数上限后停止，不会无限循环', () => {
  const { win, state } = createFakeWindow({ height: 900, viewport: 800, scrollY: 0 })
  const raf = createRafQueue()
  let frames = 0
  const countingRaf = (callback) => {
    frames += 1
    return raf.raf(callback)
  }
  restoreScrollPosition(2400, {
    windowRef: win,
    maxFrames: 3,
    raf: countingRaf,
    cancelRaf: raf.cancelRaf,
  })
  raf.flush()

  assert.equal(frames, 3)
  assert.equal(raf.size, 0)
  // 高度始终不足时至少把用户带到能到达的最底部，而不是停在顶部。
  assert.equal(state.scrollY, 100)
})

test('取消函数会停止后续重试', () => {
  const { win, state } = createFakeWindow({ height: 900, viewport: 800, scrollY: 0 })
  const raf = createRafQueue()
  const cancel = restoreScrollPosition(2400, {
    windowRef: win,
    raf: raf.raf,
    cancelRaf: raf.cancelRaf,
  })
  cancel()
  raf.flush()
  assert.equal(raf.size, 0)
  assert.equal(state.scrollY, 0, '取消后不再滚动')
})

test('目标为 0 或非法值时直接回到顶部，不排入重试', () => {
  for (const target of [0, -100, Number.NaN, null, undefined]) {
    const { win, state } = createFakeWindow({ height: 3000, scrollY: 900 })
    const raf = createRafQueue()
    restoreScrollPosition(target, { windowRef: win, raf: raf.raf, cancelRaf: raf.cancelRaf })
    assert.equal(raf.size, 0, `目标 ${String(target)} 不应重试`)
    assert.equal(state.scrollY, 0, `目标 ${String(target)} 应回到顶部`)
  }
})

test('没有 window（SSR/测试环境）时安全返回空操作', () => {
  const cancel = restoreScrollPosition(300, { windowRef: null })
  assert.equal(typeof cancel, 'function')
  assert.doesNotThrow(() => cancel())
})
