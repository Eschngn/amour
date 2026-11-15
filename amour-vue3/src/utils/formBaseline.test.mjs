import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createFormSnapshot,
  isFormDirty,
} from '../utils/formBaseline.js'

/**
 * 运行：npm test
 *
 * 覆盖空间编辑页 dirty 判定的核心规则：
 * - 基线尚未建立时视为 clean；
 * - 回显数据后建立基线即 clean，真正修改后才 dirty，改回原值重新 clean；
 * - 键顺序等非内容差异不应误报。
 */

test('基线为空时一律视为 clean', () => {
  assert.equal(isFormDirty('', { title: '回显内容' }), false)
  assert.equal(isFormDirty(null, { title: '' }), false)
})

test('回显后建立基线为 clean，修改后 dirty，改回原值重新 clean', () => {
  const echoed = { title: '初见', sortOrder: 10, visibility: 0 }
  const baseline = createFormSnapshot(echoed)

  assert.equal(isFormDirty(baseline, { title: '初见', sortOrder: 10, visibility: 0 }), false)

  const edited = { title: '初见（修改）', sortOrder: 10, visibility: 0 }
  assert.equal(isFormDirty(baseline, edited), true)

  assert.equal(isFormDirty(baseline, { title: '初见', sortOrder: 10, visibility: 0 }), false)
})

test('快照不受对象键顺序影响', () => {
  const left = createFormSnapshot({ title: 'A', sortOrder: 1, nested: { b: 2, a: 1 } })
  const right = createFormSnapshot({ nested: { a: 1, b: 2 }, sortOrder: 1, title: 'A' })
  assert.equal(left, right)
})

test('数字与字符串类型差异仍算真实修改', () => {
  const baseline = createFormSnapshot({ sortOrder: 0, isVisible: true })
  assert.equal(isFormDirty(baseline, { sortOrder: '0', isVisible: true }), true)
  assert.equal(isFormDirty(baseline, { sortOrder: 0, isVisible: false }), true)
})
