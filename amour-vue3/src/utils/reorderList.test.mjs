import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasOrderChanged,
  moveItem,
  moveItemDown,
  moveItemToEnd,
  moveItemToTop,
  moveItemUp,
  normalizeSortItems,
  sortItemIds,
} from './reorderList.js'

const list = () => [
  { id: 1, title: '第一' },
  { id: 2, title: '第二' },
  { id: 3, title: '第三' },
  { id: 4, title: '第四' },
]

test('moveItem 返回新数组且不修改原列表', () => {
  const source = list()
  const moved = moveItem(source, 0, 2)
  assert.deepEqual(moved.map(item => item.id), [2, 3, 1, 4])
  assert.deepEqual(source.map(item => item.id), [1, 2, 3, 4])
})

test('moveItem 越界或原地移动时保持原顺序', () => {
  const source = list()
  assert.deepEqual(moveItem(source, -1, 2).map(item => item.id), [1, 2, 3, 4])
  assert.deepEqual(moveItem(source, 0, 9).map(item => item.id), [1, 2, 3, 4])
  assert.deepEqual(moveItem(source, 2, 2).map(item => item.id), [1, 2, 3, 4])
  assert.deepEqual(moveItem(null, 0, 1).map(item => item.id), [])
})

test('上移、下移、置顶、移到末尾逻辑正确', () => {
  assert.deepEqual(moveItemUp(list(), 2).map(item => item.id), [1, 3, 2, 4])
  assert.deepEqual(moveItemDown(list(), 1).map(item => item.id), [1, 3, 2, 4])
  assert.deepEqual(moveItemToTop(list(), 3).map(item => item.id), [4, 1, 2, 3])
  assert.deepEqual(moveItemToEnd(list(), 0).map(item => item.id), [2, 3, 4, 1])
})

test('边界位置按钮不会改变顺序', () => {
  assert.deepEqual(moveItemUp(list(), 0).map(item => item.id), [1, 2, 3, 4])
  assert.deepEqual(moveItemDown(list(), 3).map(item => item.id), [1, 2, 3, 4])
  assert.deepEqual(moveItemToTop(list(), 0).map(item => item.id), [1, 2, 3, 4])
  assert.deepEqual(moveItemToEnd(list(), 3).map(item => item.id), [1, 2, 3, 4])
})

test('排序值稳定生成 10、20、30', () => {
  assert.deepEqual(normalizeSortItems(list()), [
    { id: 1, sortOrder: 10 },
    { id: 2, sortOrder: 20 },
    { id: 3, sortOrder: 30 },
    { id: 4, sortOrder: 40 },
  ])
  assert.deepEqual(normalizeSortItems(null), [])
})

test('仅在顺序真正变化时判定为 dirty', () => {
  const before = sortItemIds(list())
  assert.equal(hasOrderChanged(before, [1, 2, 3, 4]), false)
  assert.equal(hasOrderChanged(before, ['1', '2', '3', '4']), false)
  assert.equal(hasOrderChanged(before, [1, 2, 4, 3]), true)
  assert.equal(hasOrderChanged([], [1]), true)
})
