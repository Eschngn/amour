import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DESCRIPTION_MAX_LENGTH,
  SPACE_NAME_MAX_LENGTH,
  buildBasicInfoPayload,
  composeLoveStartTimeForSave,
  countCharacters,
  createBasicInfoBaseline,
  createBasicInfoFormFromSpace,
  formatBackendDateTime,
  isBasicInfoUnchanged,
  normalizeMinuteValue,
  parseSpaceDateTimeParts,
  toDateTimeLocalValue,
  validateBasicInfoForm,
} from './spaceBasicInfo.js'

/**
 * 运行：npm run test:space-settings
 *
 * 空间基础信息编辑的纯逻辑测试。
 *
 * 重点是「时间」：
 * - 后端 `yyyy-MM-dd HH:mm:ss` 与 datetime-local 的分钟精度不能互相污染；
 * - 只改名称时不得丢原秒数；
 * - 清空必须提交 null，不能提交空字符串（否则后端 LocalDateTime 反序列化失败）；
 * - 解析不依赖 `new Date(string)`（iOS 不可靠）与 `toISOString()`（UTC 偏移）。
 */

const ORIGINAL = '2024-05-20 19:30:47'

// ============================ 解析与格式化 ============================

test('解析后端时间：正确拆出年月日与秒数', () => {
  assert.deepEqual(parseSpaceDateTimeParts(ORIGINAL), {
    year: 2024, month: 5, day: 20, hour: 19, minute: 30, second: 47,
  })
  // 兼容 T 分隔符与缺省秒。
  assert.equal(parseSpaceDateTimeParts('2024-05-20T19:30:00').second, 0)
  assert.equal(parseSpaceDateTimeParts('2024-05-20 19:30').second, 0)
})

test('解析后端时间：空值 / 非法值一律返回 null，不做宽松解析', () => {
  for (const value of [null, undefined, '', '   ', '2024/05/20 19:30:47', 'not-a-date', '2024-13-01 00:00:00', '2024-05-20 25:00:00', '2024-05-20 19:70:00']) {
    assert.equal(parseSpaceDateTimeParts(value), null, `value=${String(value)}`)
  }
})

test('格式化回后端格式：补零且秒数保持', () => {
  assert.equal(formatBackendDateTime(parseSpaceDateTimeParts('2024-1-2 3:4:5')), null, '非补零输入不解析')
  assert.equal(
    formatBackendDateTime(parseSpaceDateTimeParts('2024-01-02 03:04:05')),
    '2024-01-02 03:04:05',
  )
  assert.equal(formatBackendDateTime(null), null)
})

test('datetime-local 值只保留到分钟，不回显到秒', () => {
  assert.equal(toDateTimeLocalValue(ORIGINAL), '2024-05-20T19:30')
  assert.equal(toDateTimeLocalValue(''), '')
  assert.equal(toDateTimeLocalValue('bad'), '')
})

// ============================ 提交值组合 ============================

test('时间未改动：原样保留秒数（只改名称不会丢秒）', () => {
  assert.equal(composeLoveStartTimeForSave('2024-05-20T19:30', ORIGINAL), ORIGINAL)
  assert.equal(composeLoveStartTimeForSave('2024-05-20 19:30', ORIGINAL), ORIGINAL)
})

test('时间被改动：按选择器精度补 :00', () => {
  assert.equal(
    composeLoveStartTimeForSave('2024-05-20T20:05', ORIGINAL),
    '2024-05-20 20:05:00',
  )
  assert.equal(
    composeLoveStartTimeForSave('2025-01-01T00:00', ORIGINAL),
    '2025-01-01 00:00:00',
  )
})

test('清空时间：提交 null，绝不提交空字符串', () => {
  for (const value of ['', '   ', null, undefined]) {
    assert.equal(composeLoveStartTimeForSave(value, ORIGINAL), null)
  }
})

test('原本没有时间：选择后按分钟补 :00', () => {
  assert.equal(composeLoveStartTimeForSave('2023-07-07T07:07', null), '2023-07-07 07:07:00')
  assert.equal(composeLoveStartTimeForSave('', null), null)
})

test('不产生 UTC 偏移：跨时区机器上仍是同一本地时间', () => {
  // 若实现里用了 toISOString()，在中国时区会变成前一天 11:30 这类值。
  const payload = composeLoveStartTimeForSave('2024-05-20T19:30', '')
  assert.equal(payload, '2024-05-20 19:30:00')
  assert.doesNotMatch(payload, /T|Z/)
})

// ============================ 请求体 ============================

test('请求体显式提交三个字段：只改名称不会把简介或时间清空', () => {
  const form = {
    spaceName: '  新名称  ',
    description: '简介内容',
    loveStartTime: '2024-05-20T19:30',
  }
  assert.deepEqual(buildBasicInfoPayload(form, ORIGINAL), {
    spaceName: '新名称',
    description: '简介内容',
    loveStartTime: ORIGINAL,
  })
})

test('请求体：简介可清空，名称为空串交由后端落默认名', () => {
  assert.deepEqual(buildBasicInfoPayload({ spaceName: '   ', description: '', loveStartTime: '' }, ORIGINAL), {
    spaceName: '',
    description: '',
    loveStartTime: null,
  })
})

// ============================ 校验 ============================

test('名称超过 30 字 / 简介超过 500 字给出字段级错误', () => {
  assert.equal(SPACE_NAME_MAX_LENGTH, 30)
  assert.equal(DESCRIPTION_MAX_LENGTH, 500)
  assert.ok(validateBasicInfoForm({ spaceName: 'a'.repeat(31) }).spaceName)
  assert.ok(validateBasicInfoForm({ description: 'b'.repeat(501) }).description)
  assert.deepEqual(validateBasicInfoForm({ spaceName: 'a'.repeat(30), description: 'b'.repeat(500) }), {})
})

test('长度按用户可见字符计：emoji 不被算成两个字符', () => {
  const emoji = '😀'.repeat(30)
  assert.equal(countCharacters(emoji), 30)
  assert.equal(countCharacters('a'.repeat(30)), 30)
  assert.deepEqual(validateBasicInfoForm({ spaceName: emoji }), {}, '30 个 emoji 不应超限')
})

test('非法时间格式给出错误', () => {
  assert.ok(validateBasicInfoForm({ loveStartTime: '2024-13-40T99:99' }).loveStartTime)
  assert.deepEqual(validateBasicInfoForm({ loveStartTime: '' }), {}, '空时间合法（表示未设置）')
})

// ============================ 表单与基线 ============================

test('从 SpaceStatusVO 回填表单：时间转 datetime-local', () => {
  assert.deepEqual(createBasicInfoFormFromSpace({
    spaceName: '我们的故事',
    description: '简介',
    loveStartTime: ORIGINAL,
  }), {
    spaceName: '我们的故事',
    description: '简介',
    loveStartTime: '2024-05-20T19:30',
  })
  assert.deepEqual(createBasicInfoFormFromSpace(null), {
    spaceName: '', description: '', loveStartTime: '',
  })
})

test('无改动判定：打开编辑后直接保存应视为未修改', () => {
  const space = { spaceName: '我们的故事', description: '简介', loveStartTime: ORIGINAL }
  const form = createBasicInfoFormFromSpace(space)
  assert.equal(isBasicInfoUnchanged(space, form), true)
})

test('无改动判定：只改名称时不是「时间未改所以整体未改」', () => {
  const space = { spaceName: '旧名称', description: '简介', loveStartTime: ORIGINAL }
  const form = createBasicInfoFormFromSpace(space)
  form.spaceName = '新名称'
  assert.equal(isBasicInfoUnchanged(space, form), false)
})

test('无改动判定：只改时间也算修改', () => {
  const space = { spaceName: '我们的故事', description: '', loveStartTime: ORIGINAL }
  const form = createBasicInfoFormFromSpace(space)
  form.loveStartTime = '2024-05-20T19:31'
  assert.equal(isBasicInfoUnchanged(space, form), false)
})

test('无改动判定：首尾空白差异不算修改（与提交时的 trim 语义一致）', () => {
  const space = { spaceName: '我们的故事', description: '', loveStartTime: '' }
  const form = { spaceName: '  我们的故事  ', description: '  ', loveStartTime: '' }
  assert.equal(isBasicInfoUnchanged(space, form), true)
})

test('无改动判定：清空原本有值的时间算修改', () => {
  const space = { spaceName: '我们的故事', description: '', loveStartTime: ORIGINAL }
  const form = createBasicInfoFormFromSpace(space)
  form.loveStartTime = ''
  assert.equal(isBasicInfoUnchanged(space, form), false)
})

test('基线快照保持秒数，避免「HH:mm」与「HH:mm:ss」互相误判', () => {
  const baseline = createBasicInfoBaseline({ spaceName: 'x', description: '', loveStartTime: ORIGINAL })
  assert.match(baseline, /19:30/)
  // 基线稳定：同样输入产生同样快照。
  assert.equal(
    baseline,
    createBasicInfoBaseline({ spaceName: 'x', description: '', loveStartTime: ORIGINAL }),
  )
})

test('normalizeMinuteValue 统一 T 分隔并截到分钟', () => {
  assert.equal(normalizeMinuteValue('2024-05-20T19:30'), '2024-05-20 19:30')
  assert.equal(normalizeMinuteValue('2024-05-20 19:30:47'), '2024-05-20 19:30')
  assert.equal(normalizeMinuteValue(''), '')
})
