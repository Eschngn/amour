import test from 'node:test'
import assert from 'node:assert/strict'
import {
  METRIC_CONFIG,
  describeComparison,
  findMetric,
  formatCount,
  formatCountShort,
  formatPercentValue,
  formatRangeLabel,
  formatTimeZoneLabel,
  normalizeMetric,
} from './activityCopy.js'

/**
 * 运行：npm test（含 test:admin-activity）
 *
 * 看板文案与数字格式：
 * - 界面不出现 PV / UV / k / w 等专业缩写；
 * - 大数字千位分隔，万位以上用“万”；
 * - 比上一时段文案区分增加 / 减少 / 持平 / 上一时段为 0 / 对比缺失；
 * - 缺失值显示“—”，绝不出现 NaN / Infinity / undefined / null。
 */

test('指标配置使用自然中文，不出现 PV / UV 缩写', () => {
  assert.equal(METRIC_CONFIG.pv.label, '浏览次数')
  assert.equal(METRIC_CONFIG.pv.unit, '次')
  assert.equal(METRIC_CONFIG.uv.label, '访客人数')
  assert.equal(METRIC_CONFIG.uv.unit, '人')
  assert.doesNotMatch(METRIC_CONFIG.pv.label, /PV|UV/)
  assert.doesNotMatch(METRIC_CONFIG.uv.label, /PV|UV/)
  // 访客人数不能被改名成注册用户数或活跃用户数，但可以明确说明“不是”。
  assert.notEqual(METRIC_CONFIG.uv.label, '注册用户数')
  assert.notEqual(METRIC_CONFIG.uv.label, '活跃用户数')
  assert.match(METRIC_CONFIG.uv.definition, /去重/)
  assert.match(METRIC_CONFIG.uv.definition, /不是注册用户数/)
})

test('指标归一化：非法值回落到浏览次数', () => {
  assert.equal(normalizeMetric('uv'), 'uv')
  assert.equal(normalizeMetric('pv'), 'pv')
  assert.equal(normalizeMetric('unknown'), 'pv')
  assert.equal(normalizeMetric(undefined), 'pv')
  assert.equal(normalizeMetric(null), 'pv')
  assert.equal(findMetric('uv').key, 'uv')
  assert.equal(findMetric('nope').key, 'pv')
})

test('数字格式：千位分隔、万位缩写、缺失显示破折号', () => {
  assert.equal(formatCount(0), '0')
  assert.equal(formatCount(1234), '1,234')
  assert.equal(formatCount(1234567), '1,234,567')
  assert.equal(formatCount(42.14, 1), '42.1')
  assert.equal(formatCount(null), '—')
  assert.equal(formatCount(undefined), '—')
  assert.equal(formatCount(''), '—')
  assert.equal(formatCount(Number.NaN), '—')
  assert.equal(formatCount(Number.POSITIVE_INFINITY), '—')
  assert.equal(formatCount('not-a-number'), '—')
})

test('坐标轴数字用“万”，不使用 k / w 等英文缩写', () => {
  assert.equal(formatCountShort(0), '0')
  assert.equal(formatCountShort(999), '999')
  assert.equal(formatCountShort(1234), '1,234')
  assert.equal(formatCountShort(12000), '1.2万')
  assert.equal(formatCountShort(10000), '1万')
  assert.equal(formatCountShort(1234567), '123.5万')
  assert.doesNotMatch(formatCountShort(1234567), /k|w/)
  // 坐标轴需要数字，缺失回落为 0。
  assert.equal(formatCountShort(null), '0')
  assert.equal(formatCountShort(Number.NaN), '0')
})

test('百分比格式保留一位小数，缺失显示破折号', () => {
  assert.equal(formatPercentValue(58.8), '58.8%')
  assert.equal(formatPercentValue(100), '100%')
  assert.equal(formatPercentValue(0), '0%')
  assert.equal(formatPercentValue(null), '—')
  assert.equal(formatPercentValue(Number.NaN), '—')
})

test('比上一时段：增加、减少、持平文案带方向文字', () => {
  const up = describeComparison(12.5, 80, '次')
  assert.equal(up.text, '比上一时段增加 12.5%')
  assert.equal(up.detail, '上一时段 80 次')
  assert.equal(up.direction, 'up')

  const down = describeComparison(-8.2, 122, '次')
  assert.equal(down.text, '比上一时段减少 8.2%')
  assert.equal(down.detail, '上一时段 122 次')
  assert.equal(down.direction, 'down')

  const flat = describeComparison(0, 50, '人')
  assert.equal(flat.text, '与上一时段持平')
  assert.equal(flat.detail, '上一时段 50 人')
  assert.equal(flat.direction, 'flat')

  for (const item of [up, down, flat]) {
    assert.doesNotMatch(item.text, /NaN|Infinity|undefined|null|环比/)
  }
})

test('比上一时段：上一时段为 0 / 对比数据缺失的区分', () => {
  const zero = describeComparison(null, 0, '次')
  assert.equal(zero.text, '上一时段暂无访问')
  assert.equal(zero.detail, '')
  assert.equal(zero.direction, 'none')

  const missing = describeComparison(null, null, '次')
  assert.equal(missing.text, '暂无对比数据')
  assert.equal(missing.direction, 'none')

  // 变化率缺失但上一时段有值：仍然算“暂无对比数据”，不臆造增长。
  const noRate = describeComparison(undefined, 30, '人')
  assert.equal(noRate.text, '暂无对比数据')

  // 异常值不产生 NaN。
  assert.equal(describeComparison(Number.NaN, 10, '次').text, '暂无对比数据')
  assert.equal(describeComparison(Number.POSITIVE_INFINITY, 10, '次').text, '暂无对比数据')
})

test('时区与日期范围文案使用普通中文', () => {
  assert.equal(formatTimeZoneLabel('Asia/Shanghai'), '北京时间')
  assert.equal(formatTimeZoneLabel(''), '北京时间')
  assert.equal(formatTimeZoneLabel(undefined), '北京时间')
  assert.doesNotMatch(formatTimeZoneLabel('Asia/Shanghai'), /Asia/)

  assert.equal(formatRangeLabel('2026-11-11', '2026-11-17', 7), '2026-11-11 至 2026-11-17（共 7 天）')
  assert.equal(formatRangeLabel('2026-11-11', '2026-11-11', 1), '2026-11-11 至 2026-11-11（共 1 天）')
  assert.equal(formatRangeLabel('', '', 0), '未选择日期')
  assert.equal(formatRangeLabel('2026-11-11', '2026-11-17', null), '2026-11-11 至 2026-11-17')
})
