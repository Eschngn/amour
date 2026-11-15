import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPhotoSortPayload,
  buildStorySortPayload,
  hasSelectedContentScope,
  mergePageOrderIntoFullOrder,
  resolvePhotoSortScope,
  resolveStorySortScope,
  sortStoryNodesForFilter,
} from './spaceContentOrder.js'

const nodes = [
  { id: 1, chapterId: 10, title: 'A1', sortOrder: 10, globalSortOrder: 30, happenedTime: '2025-01-01 10:00:00' },
  { id: 2, chapterId: 10, title: 'A2', sortOrder: 20, globalSortOrder: 10, happenedTime: '2025-01-02 10:00:00' },
  { id: 3, chapterId: 20, title: 'B1', sortOrder: 10, globalSortOrder: 20, happenedTime: '2025-01-03 10:00:00' },
  { id: 4, chapterId: 20, title: 'B2', sortOrder: 20, globalSortOrder: 40, happenedTime: '2025-01-04 10:00:00' },
]

test('未选择章节时展示全部故事并按全局排序', () => {
  const result = sortStoryNodesForFilter(nodes, 'all')
  assert.deepEqual(result.map(node => node.title), ['A2', 'B1', 'A1', 'B2'])
})

test('选择章节后只展示该章节并按章节内排序', () => {
  assert.deepEqual(
    sortStoryNodesForFilter(nodes, 10).map(node => node.title),
    ['A1', 'A2'],
  )
  assert.deepEqual(
    sortStoryNodesForFilter(nodes, '20').map(node => node.title),
    ['B1', 'B2'],
  )
})

test('再次清除筛选后恢复全部故事和全局顺序', () => {
  const filtered = sortStoryNodesForFilter(nodes, 20)
  assert.equal(filtered.length, 2)
  assert.deepEqual(
    sortStoryNodesForFilter(nodes, 'all').map(node => node.title),
    ['A2', 'B1', 'A1', 'B2'],
  )
})

test('章节局部排序变化不影响全局顺序', () => {
  const reordered = nodes.map(node => (
    node.chapterId === 10
      ? { ...node, sortOrder: node.id === 1 ? 20 : 10 }
      : node
  ))
  assert.deepEqual(
    sortStoryNodesForFilter(reordered, 10).map(node => node.title),
    ['A2', 'A1'],
  )
  assert.deepEqual(
    sortStoryNodesForFilter(reordered, 'all').map(node => node.title),
    ['A2', 'B1', 'A1', 'B2'],
  )
})

test('重复排序值和空值有稳定兜底顺序', () => {
  const duplicated = [
    { id: 3, chapterId: 10, title: 'C', sortOrder: 10, globalSortOrder: 10 },
    { id: 1, chapterId: 10, title: 'A', sortOrder: 10, globalSortOrder: 10 },
    { id: 2, chapterId: 10, title: 'B', sortOrder: null, globalSortOrder: null },
  ]
  assert.deepEqual(
    sortStoryNodesForFilter(duplicated, 'all').map(node => node.title),
    ['B', 'A', 'C'],
  )
  assert.deepEqual(
    sortStoryNodesForFilter(duplicated, 10).map(node => node.title),
    ['B', 'A', 'C'],
  )
})

test('空列表与单条数据可以正常筛选和排序', () => {
  assert.deepEqual(sortStoryNodesForFilter([], 'all'), [])
  assert.deepEqual(sortStoryNodesForFilter(null, 10), [])
  assert.deepEqual(
    sortStoryNodesForFilter([nodes[0]], 'all').map(node => node.title),
    ['A1'],
  )
})

test('排序范围与请求体明确区分全局和局部', () => {
  assert.deepEqual(resolveStorySortScope('all'), { scope: 'global', chapterId: null })
  assert.deepEqual(resolveStorySortScope(10), { scope: 'chapter', chapterId: 10 })
  assert.deepEqual(resolvePhotoSortScope('all'), { scope: 'global', categoryId: null })
  assert.deepEqual(resolvePhotoSortScope(20), { scope: 'category', categoryId: 20 })

  const items = [{ id: 1, sortOrder: 10 }]
  assert.deepEqual(buildStorySortPayload('global', null, items), { items })
  assert.deepEqual(buildStorySortPayload('chapter', 10, items), { chapterId: 10, items })
  assert.deepEqual(buildPhotoSortPayload('global', null, items), { items })
  assert.deepEqual(buildPhotoSortPayload('category', 20, items), { categoryId: 20, items })
})

test('删除章节或分类后能识别失效筛选', () => {
  const scopes = [{ id: 10 }, { id: 20 }]
  assert.equal(hasSelectedContentScope(scopes, 'all'), true)
  assert.equal(hasSelectedContentScope(scopes, 10), true)
  assert.equal(hasSelectedContentScope(scopes, 99), false)
  assert.equal(hasSelectedContentScope([], 10), false)
})

test('分页拖拽只替换当前页在完整列表中的槽位', () => {
  const full = [
    { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
    { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 },
    { id: 9 }, { id: 10 },
  ]
  const page = [{ id: 3 }, { id: 4 }, { id: 5 }]
  const reorderedPage = [{ id: 5 }, { id: 3 }, { id: 4 }]
  const merged = mergePageOrderIntoFullOrder(full, reorderedPage)
  assert.deepEqual(merged.map(item => item.id), [1, 2, 5, 3, 4, 6, 7, 8, 9, 10])
  // 非当前页顺序保持不变，避免全局排序被意外重排。
  assert.deepEqual(merged.slice(5).map(item => item.id), [6, 7, 8, 9, 10])
  assert.equal(page.length, 3)
})

test('分页数据异常时拒绝合并，便于回滚并提示重试', () => {
  assert.throws(
    () => mergePageOrderIntoFullOrder([{ id: 1 }, { id: 2 }], [{ id: 1 }, { id: 1 }]),
    /重复记录/,
  )
  assert.throws(
    () => mergePageOrderIntoFullOrder([{ id: 1 }, { id: 2 }], [{ id: 1 }, { id: 99 }]),
    /不一致/,
  )
  assert.deepEqual(mergePageOrderIntoFullOrder([], [{ id: 1 }]).map(item => item.id), [1])
})
