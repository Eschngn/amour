import test from 'node:test'
import assert from 'node:assert/strict'
import { PlazaPager } from '../miniprogram/utils/plaza-pager.ts'

/**
 * 恋爱广场列表状态机测试。
 *
 * 重点是分页竞态：
 * - 刷新与分页并发时，旧响应不得污染新列表；
 * - 失败不推进页码，重试同一页；
 * - 同一分页请求不重复并发；
 * - 首屏、刷新、分页的去重与结束状态。
 */

const ADAPT = records => (Array.isArray(records) ? records : [])

/** 生成一页卡片，spaceId 全局唯一便于断言。 */
function page(ids, extra = {}) {
  return Object.assign({
    records: ids.map(id => ({ spaceId: id })),
    current: 1,
    total: 100,
  }, extra)
}

/** 手动控制 resolve 时机的假请求，用于构造并发顺序。 */
function deferredFetcher() {
  const calls = []
  const fetcher = (query) => {
    let resolve
    let reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    calls.push({ query, resolve, reject, promise })
    return promise
  }
  return { fetcher, calls }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

test('首次加载成功：去重、记录页码与是否还有下一页', async () => {
  const pager = new PlazaPager(async () => page([1, 2, 2, 3], { current: 1, total: 5 }), ADAPT, { pageSize: 3 })
  const outcome = await pager.load()
  const state = pager.getState()
  assert.equal(outcome, 'loaded')
  assert.equal(state.status, 'ready')
  assert.deepEqual(state.items.map(item => item.spaceId), [1, 2, 3])
  assert.equal(state.page, 1)
  assert.equal(state.total, 5)
  // total=5、每页 3 条：第 1 页之后仍有第 2 页
  assert.equal(state.hasMore, true)
  assert.equal(state.loadingMore, false)
  assert.equal(state.refreshing, false)
})

test('首次加载失败：给出重试态，页码不推进', async () => {
  const pager = new PlazaPager(async () => {
    throw new Error('网络连接不太稳定')
  }, ADAPT)
  const outcome = await pager.load()
  const state = pager.getState()
  assert.equal(outcome, 'failed')
  assert.equal(state.status, 'error')
  assert.equal(state.loadError, '网络连接不太稳定')
  assert.equal(state.page, 0)
  assert.deepEqual(state.items, [])
})

test('空列表：status=ready 且 hasMore=false，不重复请求', async () => {
  let calls = 0
  const pager = new PlazaPager(async () => {
    calls += 1
    return page([], { current: 1, total: 0 })
  }, ADAPT)
  await pager.load()
  assert.equal(pager.getState().status, 'ready')
  assert.equal(pager.getState().hasMore, false)
  assert.deepEqual(pager.getState().items, [])
  await pager.load()
  assert.equal(calls, 1)
})

test('首次请求在途时重复调用不会并发', async () => {
  const { fetcher, calls } = deferredFetcher()
  const pager = new PlazaPager(fetcher, ADAPT)
  const first = pager.load()
  const second = pager.load()
  assert.equal(calls.length, 1)
  calls[0].resolve(page([1], { total: 1 }))
  assert.equal(await first, 'loaded')
  assert.equal(await second, 'ignored')
})

test('加载下一页成功：追加并推进页码', async () => {
  const queries = []
  const pager = new PlazaPager(async (query) => {
    queries.push(query)
    return query.current === 1
      ? page([1, 2], { current: 1, total: 4 })
      : page([3, 4], { current: 2, total: 4 })
  }, ADAPT, { pageSize: 2 })
  await pager.load()
  assert.equal(pager.getState().hasMore, true)
  const outcome = await pager.loadMore()
  const state = pager.getState()
  assert.equal(outcome, 'loaded')
  assert.deepEqual(state.items.map(item => item.spaceId), [1, 2, 3, 4])
  assert.equal(state.page, 2)
  assert.equal(state.hasMore, false)
  assert.deepEqual(queries, [{ current: 1, size: 2 }, { current: 2, size: 2 }])
  // 到底后不再发请求
  assert.equal(await pager.loadMore(), 'ignored')
  assert.equal(queries.length, 2)
})

test('下一页失败：不清空已加载内容，重试仍请求同一页', async () => {
  const queries = []
  let failNext = true
  const pager = new PlazaPager(async (query) => {
    queries.push(query.current)
    if (query.current === 1) return page([1, 2], { current: 1, total: 6 })
    if (failNext) {
      failNext = false
      throw new Error('加载更多失败')
    }
    return page([3, 4], { current: 2, total: 6 })
  }, ADAPT, { pageSize: 2 })

  await pager.load()
  const failed = await pager.loadMore()
  assert.equal(failed, 'failed')
  let state = pager.getState()
  assert.deepEqual(state.items.map(item => item.spaceId), [1, 2])
  assert.equal(state.page, 1)
  assert.equal(state.loadMoreError, '加载更多失败')
  assert.equal(state.loadingMore, false)
  assert.equal(state.items.length, 2)

  const retried = await pager.loadMore()
  assert.equal(retried, 'loaded')
  state = pager.getState()
  assert.deepEqual(queries, [1, 2, 2])
  assert.deepEqual(state.items.map(item => item.spaceId), [1, 2, 3, 4])
  assert.equal(state.page, 2)
  assert.equal(state.loadMoreError, '')
})

test('同一次分页请求不会被连续触底重复触发', async () => {
  const { fetcher, calls } = deferredFetcher()
  const pager = new PlazaPager(fetcher, ADAPT, { pageSize: 2 })
  const first = pager.load()
  calls[0].resolve(page([1, 2], { current: 1, total: 6 }))
  await first

  const more = pager.loadMore()
  assert.equal(await pager.loadMore(), 'ignored')
  assert.equal(calls.length, 2)
  calls[1].resolve(page([3, 4], { current: 2, total: 6 }))
  assert.equal(await more, 'loaded')
})

test('刷新与分页并发：旧分页响应返回后不得污染新列表', async () => {
  const { fetcher, calls } = deferredFetcher()
  const pager = new PlazaPager(fetcher, ADAPT, { pageSize: 2 })

  const load = pager.load()
  calls[0].resolve(page([1, 2], { current: 1, total: 10 }))
  await load

  // 分页请求在途
  const more = pager.loadMore()
  assert.equal(calls.length, 2)

  // 用户下拉刷新：新 generation
  const refresh = pager.refresh()
  assert.equal(calls.length, 3)
  calls[2].resolve(page([9, 8], { current: 1, total: 10 }))
  assert.equal(await refresh, 'loaded')

  // 旧分页此时才返回
  calls[1].resolve(page([3, 4], { current: 2, total: 10 }))
  assert.equal(await more, 'ignored')

  const state = pager.getState()
  assert.deepEqual(state.items.map(item => item.spaceId), [9, 8])
  assert.equal(state.page, 1)
  assert.equal(state.loadingMore, false)
  assert.equal(state.refreshing, false)
})

test('刷新失败保留已有列表与分页', async () => {
  let shouldFail = false
  const pager = new PlazaPager(async (query) => {
    if (shouldFail) throw new Error('刷新失败')
    return query.current === 1
      ? page([1, 2], { current: 1, total: 4 })
      : page([3, 4], { current: 2, total: 4 })
  }, ADAPT, { pageSize: 2 })

  await pager.load()
  await pager.loadMore()
  shouldFail = true
  const outcome = await pager.refresh()
  const state = pager.getState()
  assert.equal(outcome, 'failed')
  assert.deepEqual(state.items.map(item => item.spaceId), [1, 2, 3, 4])
  assert.equal(state.page, 2)
  assert.equal(state.refreshing, false)
  assert.equal(state.status, 'ready')
  assert.equal(state.loadError, '')
})

test('空列表时刷新失败转为可重试的错误态', async () => {
  let firstCall = true
  const pager = new PlazaPager(async () => {
    if (firstCall) {
      firstCall = false
      return page([], { current: 1, total: 0 })
    }
    throw new Error('刷新失败')
  }, ADAPT)
  await pager.load()
  const outcome = await pager.refresh()
  assert.equal(outcome, 'failed')
  assert.equal(pager.getState().status, 'error')
  assert.equal(pager.getState().loadError, '刷新失败')
})

test('刷新成功后替换旧列表并重置分页', async () => {
  const queries = []
  let round = 1
  const pager = new PlazaPager(async (query) => {
    queries.push(`${round}-${query.current}`)
    if (round === 1) {
      return query.current === 1
        ? page([1, 2], { current: 1, total: 6 })
        : page([3, 4], { current: 2, total: 6 })
    }
    return page([7], { current: 1, total: 3 })
  }, ADAPT, { pageSize: 2 })

  await pager.load()
  await pager.loadMore()
  round = 2
  await pager.refresh()
  const state = pager.getState()
  assert.deepEqual(state.items.map(item => item.spaceId), [7])
  assert.equal(state.page, 1)
  assert.equal(state.total, 3)
  assert.equal(state.hasMore, true)
})

test('卸载后忽略在途响应', async () => {
  const { fetcher, calls } = deferredFetcher()
  const pager = new PlazaPager(fetcher, ADAPT)
  const load = pager.load()
  pager.dispose()
  calls[0].resolve(page([1], { total: 1 }))
  assert.equal(await load, 'ignored')
  assert.deepEqual(pager.getState().items, [])
  assert.equal(pager.getState().status, 'loading')
})

test('服务端不返回 total 时按满页推断是否还有下一页', async () => {
  const pager = new PlazaPager(async (query) => {
    if (query.current === 1) return { records: [{ spaceId: 1 }, { spaceId: 2 }], current: 1 }
    return { records: [{ spaceId: 3 }], current: 2 }
  }, ADAPT, { pageSize: 2 })
  await pager.load()
  assert.equal(pager.getState().hasMore, true)
  await pager.loadMore()
  assert.equal(pager.getState().hasMore, false)
})

test('分页返回重复空间时保持顺序并去重', async () => {
  const pager = new PlazaPager(async (query) => (
    query.current === 1
      ? page([1, 2], { current: 1, total: 6 })
      : page([2, 3], { current: 2, total: 6 })
  ), ADAPT, { pageSize: 2 })
  await pager.load()
  await pager.loadMore()
  assert.deepEqual(pager.getState().items.map(item => item.spaceId), [1, 2, 3])
})

test('subscribe 收到状态更新，退订后不再通知', async () => {
  const pager = new PlazaPager(async () => page([1], { total: 1 }), ADAPT)
  const seen = []
  const unsubscribe = pager.subscribe(state => seen.push(state.status))
  assert.deepEqual(seen, [])
  const load = pager.load()
  await tick()
  await load
  assert.deepEqual(seen, ['loading', 'ready'])
  unsubscribe()
  pager.dispose()
  assert.equal(seen.length, 2)
})
