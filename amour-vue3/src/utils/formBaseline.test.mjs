import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createFormSnapshot,
  isFormDirty,
  isFormUnchanged,
  shouldSkipUnchangedSave,
} from '../utils/formBaseline.js'

/**
 * 运行：npm test
 *
 * 覆盖空间编辑页 dirty / 无改动判定的核心规则：
 * - 基线尚未建立时视为 clean，且不能据此跳过保存；
 * - 回显数据后建立基线即 clean，真正修改后才 dirty，改回原值重新 clean；
 * - 键顺序、首尾空白、空值格式、数字字符串、日期格式等非内容差异不应误报；
 * - 新增内容即使空表单与基线一致，也必须继续走必填校验。
 */

test('基线为空时一律视为 clean，但不能判定为无改动', () => {
  assert.equal(isFormDirty('', { title: '回显内容' }), false)
  assert.equal(isFormDirty(null, { title: '' }), false)
  assert.equal(isFormUnchanged('', { title: '回显内容' }), false)
  assert.equal(isFormUnchanged(null, { title: '' }), false)
})

test('回显后建立基线为 clean，修改后 dirty，改回原值重新 clean', () => {
  const echoed = { title: '初见', sortOrder: 10, visibility: 0 }
  const baseline = createFormSnapshot(echoed)

  assert.equal(isFormDirty(baseline, { title: '初见', sortOrder: 10, visibility: 0 }), false)
  assert.equal(isFormUnchanged(baseline, { visibility: 0, sortOrder: 10, title: '初见' }), true)

  const edited = { title: '初见（修改）', sortOrder: 10, visibility: 0 }
  assert.equal(isFormDirty(baseline, edited), true)
  assert.equal(isFormUnchanged(baseline, edited), false)

  assert.equal(isFormDirty(baseline, { title: '初见', sortOrder: 10, visibility: 0 }), false)
})

test('快照不受对象键顺序影响', () => {
  const left = createFormSnapshot({ title: 'A', sortOrder: 1, nested: { b: 2, a: 1 } })
  const right = createFormSnapshot({ nested: { a: 1, b: 2 }, sortOrder: 1, title: 'A' })
  assert.equal(left, right)
})

test('数字与数字字符串等价，布尔值差异仍算真实修改', () => {
  const baseline = createFormSnapshot({ sortOrder: 0, visibility: 1, isVisible: true })
  assert.equal(isFormDirty(baseline, { sortOrder: '0', visibility: '1', isVisible: true }), false)
  assert.equal(isFormDirty(baseline, { sortOrder: 0, visibility: 1, isVisible: false }), true)
  // 两个字符串之间仍按文本比较，避免把 “1” 和 “01” 当作同一段文本。
  assert.equal(isFormDirty(createFormSnapshot({ title: '1' }), { title: '01' }), true)
})

test('首尾空白、空值与图片地址空值差异不算修改', () => {
  const baseline = createFormSnapshot({
    title: '  初见  ',
    description: '  我们第一次见面  ',
    coverImage: '',
    categoryId: null,
  })
  assert.equal(isFormDirty(baseline, {
    title: '初见',
    description: '我们第一次见面',
    coverImage: undefined,
    categoryId: '',
  }), false)

  // 新增非空值仍然是真实修改。
  assert.equal(isFormDirty(baseline, {
    title: '初见',
    description: '我们第一次见面',
    coverImage: 'https://cdn.example.com/a.png',
    categoryId: '',
  }), true)
})

test('日期时间格式差异与换行差异不算修改', () => {
  const baseline = createFormSnapshot({
    happenedTime: '2024-05-20T18:30',
    content: '第一行\r\n第二行',
  })
  assert.equal(isFormDirty(baseline, {
    happenedTime: '2024-05-20 18:30:00',
    content: '第一行\n第二行',
  }), false)

  // 发生时间变化仍然是真实修改。
  assert.equal(isFormDirty(baseline, {
    happenedTime: '2024-05-21 18:30:00',
    content: '第一行\n第二行',
  }), true)
})

test('排序数组内容相同但对象引用不同不算修改，顺序变化仍算修改', () => {
  const baseline = createFormSnapshot({ items: [{ id: 1, sortOrder: 10 }, { id: 2, sortOrder: 20 }] })
  assert.equal(isFormDirty(baseline, {
    items: [{ id: '1', sortOrder: '10' }, { id: 2, sortOrder: 20 }],
  }), false)
  assert.equal(isFormDirty(baseline, {
    items: [{ id: 2, sortOrder: 20 }, { id: 1, sortOrder: 10 }],
  }), true)
})

test('新增空表单不会被无改动逻辑跳过保存', () => {
  const emptyForm = { title: '', content: '', happenedTime: '' }
  const baseline = createFormSnapshot(emptyForm)
  assert.equal(isFormUnchanged(baseline, emptyForm), true)
  assert.equal(shouldSkipUnchangedSave({
    editing: false,
    baseline,
    snapshot: emptyForm,
  }), false)
})

test('仅编辑已有内容且请求空闲时才跳过无改动保存', () => {
  const snapshot = { title: '初见' }
  const baseline = createFormSnapshot(snapshot)

  assert.equal(shouldSkipUnchangedSave({ editing: true, baseline, snapshot }), true)
  assert.equal(shouldSkipUnchangedSave({ editing: true, baseline, snapshot: { title: '初见 ' } }), true)
  // 真实修改仍必须调用保存接口。
  assert.equal(shouldSkipUnchangedSave({ editing: true, baseline, snapshot: { title: '初见（修改）' } }), false)
  // 保存中或上传中不能被无改动逻辑绕过。
  assert.equal(shouldSkipUnchangedSave({ editing: true, baseline, snapshot, busy: true }), false)
  // 基线缺失时不能误判。
  assert.equal(shouldSkipUnchangedSave({ editing: true, baseline: '', snapshot }), false)
})
