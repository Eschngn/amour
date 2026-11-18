import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DETAIL_RETURN_HISTORY_KEY,
  LIST_VIEW_HISTORY_KEY,
  MAX_RETURN_HOPS,
  PLAZA_LIST_PATH,
  STORY_LIST_PATH,
  buildChainedReturnTarget,
  buildListViewSnapshot,
  buildReturnState,
  buildReturnTarget,
  deriveChainedReturnTarget,
  deriveReturnTarget,
  isPlazaListPath,
  isPublicSpacePath,
  isPublicStoryDetailPath,
  isRestorableListViewPath,
  isStoryDetailPath,
  isStoryListPath,
  normalizeListViewSnapshot,
  normalizeReturnTarget,
  readHistoryState,
  readListViewSnapshot,
  resolvePublicSpaceDetailReturn,
  resolvePublicStoryDetailReturn,
  resolveReturnNavigation,
  resolveStoryDetailReturn,
  sanitizeChapterIndex,
  sanitizePlazaPageCount,
  sanitizeScrollTop,
  withReturnState,
  writeListViewSnapshot,
} from './listViewState.js'

/**
 * 运行：npm test
 *
 * 覆盖“列表 -> 详情 -> 返回列表”的状态恢复规则：
 * - 快照与历史记录绑定、路径不匹配时拒绝恢复；
 * - 章节/分页/滚动位置非法值有安全兜底；
 * - 详情页只在上一层确实是来源列表时才走历史回退，
 *   直接打开、来源被替换、历史不足时回退到默认列表页；
 * - 连续翻篇的 hop 递增与上限。
 */

function memoryHistory(initialState = {}) {
  let state = { ...initialState }
  return {
    get state() {
      return state
    },
    replaceState(nextState) {
      state = { ...nextState }
    },
    setState(nextState) {
      state = { ...nextState }
    },
  }
}

test('路径识别只接受真正可恢复的列表页与合法详情页', () => {
  assert.equal(isStoryListPath('/story'), true)
  assert.equal(isStoryListPath('/story?x=1'), true)
  assert.equal(isStoryListPath('/story/'), false)
  assert.equal(isStoryListPath('/story/3001'), false)

  assert.equal(isPlazaListPath('/plaza'), true)
  assert.equal(isPlazaListPath('/plaza?page=2'), true)
  assert.equal(isPlazaListPath('/plaza/2001'), false)

  assert.equal(isStoryDetailPath('/story/3001'), true)
  assert.equal(isStoryDetailPath('/story/3001?x=1'), true)
  assert.equal(isStoryDetailPath('/story'), false)

  assert.equal(isPublicSpacePath('/plaza/2001'), true)
  assert.equal(isPublicSpacePath('/plaza/0'), false)
  assert.equal(isPublicSpacePath('/plaza/abc'), false)
  assert.equal(isPublicSpacePath('/plaza/2001/story/3001'), false)

  assert.equal(isPublicStoryDetailPath('/plaza/2001/story/3001'), true)
  assert.equal(isPublicStoryDetailPath('/plaza/2001'), false)

  assert.equal(isRestorableListViewPath('/story'), true)
  assert.equal(isRestorableListViewPath('/plaza'), true)
  assert.equal(isRestorableListViewPath('/plaza/2001'), true)
  // 详情页不是列表，不能写列表快照（否则返回时会恢复到详情页的滚动位置）。
  assert.equal(isRestorableListViewPath('/story/3001'), false)
  assert.equal(isRestorableListViewPath('/plaza/2001/story/3001'), false)
})

test('滚动位置、章节下标与分页数都有安全兜底', () => {
  assert.equal(sanitizeScrollTop(0), 0)
  assert.equal(sanitizeScrollTop(-20), 0)
  assert.equal(sanitizeScrollTop('320.4'), 320)
  assert.equal(sanitizeScrollTop(Number.NaN), 0)
  assert.equal(sanitizeScrollTop(Infinity), 0)

  assert.equal(sanitizeChapterIndex(0, 3), 0)
  assert.equal(sanitizeChapterIndex(2, 3), 2)
  // 章节被删除后旧下标必须失效，回落到第一章。
  assert.equal(sanitizeChapterIndex(3, 3), null)
  assert.equal(sanitizeChapterIndex(-1, 3), null)
  assert.equal(sanitizeChapterIndex(1.5, 3), null)
  assert.equal(sanitizeChapterIndex(0, 0), null)

  assert.equal(sanitizePlazaPageCount(1), 1)
  assert.equal(sanitizePlazaPageCount(4), 4)
  assert.equal(sanitizePlazaPageCount(0), null)
  assert.equal(sanitizePlazaPageCount(-2), null)
  // 异常大的分页数被限制，避免返回时补加载过多请求。
  assert.equal(sanitizePlazaPageCount(9999), 20)
})

test('列表快照只有在路径匹配时才可恢复', () => {
  const snapshot = buildListViewSnapshot('/story', {
    scrollY: 640,
    data: { chapterIndex: 2 },
    now: 1_700_000_000_000,
  })
  assert.equal(snapshot.path, '/story')
  assert.equal(snapshot.scrollY, 640)
  assert.deepEqual(snapshot.data, { chapterIndex: 2 })

  assert.equal(normalizeListViewSnapshot(structuredClone(snapshot), '/story')?.scrollY, 640)
  // 同一个列表的其他查询串（例如 ?from=home）也不应误用。
  assert.equal(normalizeListViewSnapshot(structuredClone(snapshot), '/story?from=home'), null)
  // 不同列表之间完全隔离。
  assert.equal(normalizeListViewSnapshot(structuredClone(snapshot), '/plaza'), null)
  // 版本或路径不合法的快照直接丢弃。
  assert.equal(normalizeListViewSnapshot({ ...structuredClone(snapshot), v: 99 }, '/story'), null)
  assert.equal(normalizeListViewSnapshot({ ...structuredClone(snapshot), path: '/story/3001' }, '/story/3001'), null)
  assert.equal(normalizeListViewSnapshot(null, '/story'), null)
  assert.equal(normalizeListViewSnapshot([], '/story'), null)
})

test('快照写入保留 vue-router 的历史字段，只替换自己的键', () => {
  const history = memoryHistory({
    back: null,
    current: '/story',
    forward: null,
    position: 3,
    scroll: null,
  })
  const snapshot = buildListViewSnapshot('/story', { scrollY: 120, data: { chapterIndex: 1 } })
  assert.equal(writeListViewSnapshot(history, snapshot), true)

  assert.equal(history.state.position, 3)
  assert.equal(history.state.current, '/story')
  assert.equal(history.state[LIST_VIEW_HISTORY_KEY].scrollY, 120)

  // 读取时必须传入当前路径，避免拿到别的列表的快照。
  const read = readListViewSnapshot(history, '/story')
  assert.equal(read.scrollY, 120)
  assert.deepEqual(read.data, { chapterIndex: 1 })
  assert.equal(readListViewSnapshot(history, '/plaza'), null)

  // 非列表路径的写入被拒绝，历史记录保持不变。
  const before = { ...history.state }
  assert.equal(
    writeListViewSnapshot(history, buildListViewSnapshot('/story/3001', { scrollY: 50 })),
    false,
  )
  assert.deepEqual(history.state, before)
})

test('readHistoryState 对不可用 history 不抛异常', () => {
  assert.equal(readHistoryState(null), null)
  assert.equal(readHistoryState({ get state() { throw new Error('denied') } }), null)
  assert.equal(readHistoryState({ state: 'not-an-object' }), null)
})

test('返回目标写入目标路由的 history.state，并支持链条递增', () => {
  const target = buildReturnTarget('/story', { now: 1 })
  assert.equal(target.path, '/story')
  assert.equal(target.hop, 0)

  const state = buildReturnState(target)
  assert.ok(state[DETAIL_RETURN_HISTORY_KEY])
  assert.equal(state[DETAIL_RETURN_HISTORY_KEY].path, '/story')

  // 从详情页继续翻篇：hop+1，最多携带 MAX_RETURN_HOPS 次。
  let chained = target
  for (let hop = 1; hop <= MAX_RETURN_HOPS; hop += 1) {
    chained = buildChainedReturnTarget(chained)
    assert.equal(chained.hop, hop)
  }
  assert.equal(buildChainedReturnTarget(chained), null)

  // 非法来源不会被写入。
  assert.equal(buildReturnTarget('/story/3001'), null)
  assert.equal(buildReturnTarget('/plaza/2001/story/1'), null)
  assert.equal(buildReturnTarget(''), null)
})

test('withReturnState 把 state 合并到字符串或对象地址', () => {
  const target = buildReturnTarget('/plaza')
  const stringLink = withReturnState('/plaza/2001', target)
  assert.equal(stringLink.path, '/plaza/2001')
  assert.equal(stringLink.state[DETAIL_RETURN_HISTORY_KEY].path, '/plaza')

  const objectLink = withReturnState({ path: '/plaza/2001', query: { a: '1' } }, target)
  assert.deepEqual(objectLink.query, { a: '1' })
  assert.equal(objectLink.state[DETAIL_RETURN_HISTORY_KEY].path, '/plaza')

  // 没有可信目标时原样返回，不产生空 state。
  assert.equal(withReturnState('/plaza/2001', null), '/plaza/2001')
  assert.equal(withReturnState('/plaza/2001', buildReturnTarget('/story/1')), '/plaza/2001')
})

test('直接由列表进入详情时，返回走历史回退', () => {
  const state = {
    back: '/story',
    current: '/story/3001',
    forward: null,
    position: 5,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/story'),
  }
  const navigation = resolveStoryDetailReturn(state)
  assert.deepEqual(navigation, { type: 'go', delta: -1 })
})

test('直接打开详情页（无来源 state）回退到默认列表页', () => {
  assert.deepEqual(resolveStoryDetailReturn(null), { type: 'push', path: '/story' })
  assert.deepEqual(resolveStoryDetailReturn({}), { type: 'push', path: '/story' })
  // 只有 back 字段但没有返回目标：说明是地址栏直接输入或外部链接。
  assert.deepEqual(
    resolveStoryDetailReturn({ back: null, current: '/story/3001', position: 0 }),
    { type: 'push', path: '/story' },
  )
})

test('来源路径无效或被其他入口替换时回退默认列表', () => {
  // 返回目标写成详情页：不接受。
  const badTarget = {
    back: '/story/3001',
    position: 3,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/story/3001'),
  }
  assert.deepEqual(resolveStoryDetailReturn(badTarget), { type: 'push', path: '/story' })

  // 返回目标声称来自 /story，但上一层历史其实是首页：历史被替换，不能回退。
  const replaced = {
    back: '/',
    position: 4,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/story'),
  }
  assert.deepEqual(resolveStoryDetailReturn(replaced), { type: 'push', path: '/story' })

  // 历史位置不足（例如从外部直接打开）也不能 go。
  const tooEarly = {
    back: '/story',
    position: 0,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/story'),
  }
  assert.deepEqual(resolveStoryDetailReturn(tooEarly), { type: 'push', path: '/story' })

  // 版本不合法的目标同样丢弃。
  const badVersion = {
    back: '/story',
    position: 5,
    [DETAIL_RETURN_HISTORY_KEY]: { ...buildReturnTarget('/story'), v: 0 },
  }
  assert.deepEqual(resolveStoryDetailReturn(badVersion), { type: 'push', path: '/story' })
})

test('连续翻篇后仍能回到最初的列表，且逐层校验上一页是详情', () => {
  // 列表 -> 详情A -> 详情B
  const state = {
    back: '/story/3001',
    current: '/story/3002',
    position: 6,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/story', { hop: 1 }),
  }
  assert.deepEqual(resolveStoryDetailReturn(state), { type: 'go', delta: -2 })

  // 上一层不是详情页（被替换成列表）：回退整条链不可信，改用默认列表。
  const replaced = { ...state, back: '/' }
  assert.deepEqual(resolveStoryDetailReturn(replaced), { type: 'push', path: '/story' })

  // 达到 hop 上限的详情页仍可一次性回退到最初的列表。
  const atLimit = {
    back: '/story/3001',
    position: 9,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/story', { hop: MAX_RETURN_HOPS }),
  }
  assert.deepEqual(resolveStoryDetailReturn(atLimit), { type: 'go', delta: -(MAX_RETURN_HOPS + 1) })

  // hop 超出上限的目标属于异常数据，按默认列表处理。
  const tooDeep = {
    back: '/story/3001',
    position: 9,
    [DETAIL_RETURN_HISTORY_KEY]: {
      ...buildReturnTarget('/story'),
      hop: MAX_RETURN_HOPS + 1,
    },
  }
  assert.deepEqual(resolveStoryDetailReturn(tooDeep), { type: 'push', path: '/story' })
})

test('deriveReturnTarget 在没有显式目标时用 back 字段兜底', () => {
  assert.equal(deriveReturnTarget(null, isStoryListPath), null)
  assert.deepEqual(
    deriveReturnTarget({ back: '/story' }, isStoryListPath),
    { v: 1, path: '/story', hop: 0, savedAt: 0 },
  )
  assert.equal(deriveReturnTarget({ back: '/plaza' }, isStoryListPath), null)

  // 显式目标优先于 back。
  const explicit = buildReturnTarget('/story', { hop: 1 })
  assert.equal(
    deriveReturnTarget({ back: '/story', [DETAIL_RETURN_HISTORY_KEY]: explicit }, isStoryListPath).hop,
    1,
  )

  const chained = deriveChainedReturnTarget(
    { [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/story') },
    { isAllowedReturnPath: isStoryListPath },
  )
  assert.equal(chained.hop, 1)
})

test('公开空间详情只接受广场列表作为来源', () => {
  const fromPlaza = {
    back: '/plaza',
    position: 4,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/plaza'),
  }
  assert.deepEqual(resolvePublicSpaceDetailReturn(fromPlaza), { type: 'go', delta: -1 })

  // 来自另一个公开空间不能直接回退（会退回错误的来源）。
  const fromOtherSpace = {
    back: '/plaza/2002',
    position: 4,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/plaza/2002'),
  }
  assert.deepEqual(resolvePublicSpaceDetailReturn(fromOtherSpace), { type: 'push', path: '/plaza' })
})

test('公开故事详情接受广场列表或公开空间作为来源', () => {
  const fromPlaza = {
    back: '/plaza',
    position: 3,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/plaza'),
  }
  assert.deepEqual(resolvePublicStoryDetailReturn(fromPlaza), { type: 'go', delta: -1 })

  const fromSpace = {
    back: '/plaza/2001',
    position: 4,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/plaza/2001'),
  }
  assert.deepEqual(resolvePublicStoryDetailReturn(fromSpace), { type: 'go', delta: -1 })

  // 默认回退目标是故事所属的公开空间（由调用方传入），非法时退到广场。
  assert.deepEqual(
    resolvePublicStoryDetailReturn(null, { fallbackPath: '/plaza/2001' }),
    { type: 'push', path: '/plaza/2001' },
  )
  assert.deepEqual(
    resolvePublicStoryDetailReturn(null, { fallbackPath: '/admin' }),
    { type: 'push', path: '/plaza' },
  )
  // 来自私有故事详情不能回退。
  const fromPrivateStory = {
    back: '/story/3001',
    position: 5,
    [DETAIL_RETURN_HISTORY_KEY]: buildReturnTarget('/story'),
  }
  assert.deepEqual(resolvePublicStoryDetailReturn(fromPrivateStory), { type: 'push', path: '/plaza' })
})

test('返回目标路径只允许站内绝对路径，拒绝协议相对地址', () => {
  for (const path of ['//evil.com', 'https://evil.com', 'story', '', null]) {
    assert.equal(buildReturnTarget(path), null, String(path))
  }
  assert.equal(normalizeReturnTarget({ v: 1, path: '//evil.com', hop: 0 }), null)
  // 回退路径本身也要经过站内校验。
  const navigation = resolveReturnNavigation(null, { fallbackPath: '//evil.com' })
  assert.deepEqual(navigation, { type: 'push', path: '/' })
})

test('常量与默认路径稳定', () => {
  assert.equal(STORY_LIST_PATH, '/story')
  assert.equal(PLAZA_LIST_PATH, '/plaza')
  assert.equal(MAX_RETURN_HOPS >= 1, true)
  // 默认来源不可信时故事详情退回 /story，而不是空路由。
  assert.equal(resolveStoryDetailReturn(undefined).path, '/story')
})
