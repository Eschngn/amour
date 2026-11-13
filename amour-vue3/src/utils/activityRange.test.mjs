import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVITY_MAX_RANGE_DAYS,
  addDays,
  buildActivityPayload,
  countDays,
  formatActivityNumber,
  formatChangeRate,
  formatShortDate,
  formatWeekday,
  paginateActivityDays,
  parseDateKey,
  resolvePresetRange,
  toDateKey,
  todayKey,
  validateActivityRange,
} from './activityRange.js'

/**
 * 运行：npm test
 * 这些用例锁定日期区间构造与环比展示的关键行为，避免跨月、跨年、
 * 时区偏移或上一周期为 0 时产生 NaN / Infinity。
 */

test('本地日期键不会因 UTC 解析偏移一天', () => {
  assert.equal(toDateKey(new Date(2026, 10, 11)), '2026-11-11')
  assert.equal(toDateKey(new Date(2026, 0, 1)), '2026-01-01')
  assert.equal(toDateKey(new Date(2024, 1, 29)), '2024-02-29')
  // “今天”按北京时间切分：UTC 15:59 仍是北京 23:59，UTC 16:00 进入次日。
  assert.equal(todayKey(new Date('2026-11-11T15:59:00Z')), '2026-11-11')
  assert.equal(todayKey(new Date('2026-11-11T16:00:00Z')), '2026-11-12')
})

test('parseDateKey 拒绝不存在的日期和错误格式', () => {
  assert.equal(toDateKey(parseDateKey('2026-11-11')), '2026-11-11')
  for (const input of ['2026-02-30', '2026-13-01', '2026-1-1', '2026/11/11', '', null, undefined, 20261111]) {
    assert.equal(parseDateKey(input), null, `应拒绝 ${JSON.stringify(input)}`)
  }
})

test('addDays 正确跨月、跨年和闰年', () => {
  assert.equal(addDays('2026-11-11', -10), '2026-11-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(addDays('2024-02-29', 1), '2024-03-01')
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
})

test('countDays 含首尾，反向区间返回 0', () => {
  assert.equal(countDays('2026-11-05', '2026-11-11'), 7)
  assert.equal(countDays('2026-11-11', '2026-11-11'), 1)
  assert.equal(countDays('2026-11-12', '2026-11-11'), 0)
  assert.equal(countDays('bad', '2026-11-11'), 0)
})

test('快捷范围按本地日历计算', () => {
  const now = new Date('2026-11-11T04:00:00Z')
  assert.deepEqual(resolvePresetRange('7d', now), { startDate: '2026-11-05', endDate: '2026-11-11' })
  assert.deepEqual(resolvePresetRange('30d', now), { startDate: '2026-10-13', endDate: '2026-11-11' })
  assert.equal(resolvePresetRange('custom', now), null)
  assert.equal(resolvePresetRange('unknown', now), null)
})

test('自定义区间校验覆盖空值、倒置、未来和超长', () => {
  const today = '2026-11-11'
  assert.equal(validateActivityRange('2026-11-01', today, { today }).valid, true)
  assert.equal(validateActivityRange('', today, { today }).valid, false)
  assert.equal(validateActivityRange('2026-11-12', today, { today }).valid, false)
  assert.equal(validateActivityRange('2026-11-11', '2026-11-01', { today }).valid, false)
  assert.equal(validateActivityRange('2026-11-08', '2026-11-12', { today }).valid, false)

  const tooLong = validateActivityRange('2026-08-01', today, { today })
  assert.equal(tooLong.valid, false)
  assert.match(tooLong.message, /90/)

  // 恰好 90 天（含首尾）应放行。
  const exactly = addDays(today, -(ACTIVITY_MAX_RANGE_DAYS - 1))
  assert.equal(validateActivityRange(exactly, today, { today }).valid, true)
  assert.equal(validateActivityRange(addDays(exactly, -1), today, { today }).valid, false)
})

test('环比展示不会出现 NaN/Infinity', () => {
  assert.equal(formatChangeRate(null), '—')
  assert.equal(formatChangeRate(undefined), '—')
  assert.equal(formatChangeRate(Number.NaN), '—')
  assert.equal(formatChangeRate(Number.POSITIVE_INFINITY), '—')
  assert.equal(formatChangeRate(0), '0%')
  assert.equal(formatChangeRate(12.5), '+12.5%')
  assert.equal(formatChangeRate(200), '+200%')
  assert.equal(formatChangeRate(-12.34), '-12.3%')
})

test('数字与日期标签格式稳定', () => {
  assert.equal(formatActivityNumber(1234), '1,234')
  assert.equal(formatActivityNumber(1.8, 1), '1.8')
  assert.equal(formatActivityNumber(0), '0')
  assert.equal(formatActivityNumber(null), '—')
  assert.equal(formatShortDate('2026-11-11'), '11-11')
  assert.equal(formatShortDate(''), '')
  assert.equal(formatWeekday('2026-11-11'), '周三')
  assert.equal(formatWeekday('2026-11-15'), '周日')
  assert.equal(formatWeekday('bad'), '')
})

test('每日数据分页最多 7 天且尽量均分', () => {
  const days = Array.from({ length: 90 }, (_, index) => ({ date: addDays('2026-08-14', index) }))

  const week = paginateActivityDays(days.slice(0, 7))
  assert.equal(week.length, 1)
  assert.equal(week[0].length, 7)

  const month = paginateActivityDays(days.slice(0, 30))
  assert.equal(month.length, 5)
  assert.deepEqual(month.map(page => page.length), [6, 6, 6, 6, 6])

  const maxRange = paginateActivityDays(days)
  assert.equal(maxRange.length, 13)
  assert.deepEqual(maxRange.map(page => page.length), [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6])

  // 每页数据连续且保持原始顺序，不能丢日期或重复。
  const flattened = maxRange.flat().map(item => item.date)
  assert.deepEqual(flattened, days.map(item => item.date))

  // 8 天均分为 4 + 4，避免出现 7 + 1 的稀疏尾页。
  assert.deepEqual(paginateActivityDays(days.slice(0, 8)).map(page => page.length), [4, 4])
  assert.deepEqual(paginateActivityDays([]), [])
  assert.deepEqual(paginateActivityDays(null), [])
})

test('构建请求参数只包含起止日期', () => {
  assert.deepEqual(buildActivityPayload('2026-11-01', '2026-11-11'), {
    startDate: '2026-11-01',
    endDate: '2026-11-11',
  })
})
