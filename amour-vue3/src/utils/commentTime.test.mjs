import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  COMMENT_TIME_FALLBACK,
  describeCommentTime,
  formatCommentFullTime,
  formatCommentTime,
} from './commentTime.js'

/**
 * 运行：npm test
 *
 * 后端格式（yyyy-MM-dd HH:mm:ss）的用例同时传入本地时间的 now，
 * 两者在同一运行机器时区下比较，测试结果不依赖 CI 所在时区；
 * UTC、跨时区与夏令时用例使用带偏移的 ISO 时间并显式指定时区。
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHANGHAI = 'Asia/Shanghai'
const NEW_YORK = 'America/New_York'
const NOW = '2026-11-15 12:00:00'

function format(value, now = NOW) {
  return formatCommentTime(value, { now })
}

test('小于 1 分钟显示刚刚，刚好 1 分钟显示 1分钟前', () => {
  assert.equal(format('2026-11-15 11:59:30'), '刚刚')
  assert.equal(format('2026-11-15 11:59:00'), '1分钟前')
})

test('59 分钟显示 59分钟前，刚好 60 分钟显示 1小时前', () => {
  assert.equal(format('2026-11-15 11:01:00'), '59分钟前')
  assert.equal(format('2026-11-15 11:00:00'), '1小时前')
})

test('同一自然日按小时展示', () => {
  assert.equal(format('2026-11-15 10:00:00'), '2小时前')
  assert.equal(format('2026-11-15 00:30:00'), '11小时前')
})

test('前一自然日显示昨天，2 至 7 个自然日显示 X天前', () => {
  assert.equal(format('2026-11-14 23:30:00'), '昨天')
  assert.equal(format('2026-11-14 00:10:00'), '昨天')
  assert.equal(format('2026-11-13 23:00:00'), '2天前')
  assert.equal(format('2026-11-08 11:00:00'), '7天前')
})

test('超过 7 个自然日同年显示 MM-DD，跨年显示 YYYY-MM-DD', () => {
  assert.equal(format('2026-11-07 11:00:00'), '11-07')
  assert.equal(format('2026-01-05 09:00:00'), '01-05')
  assert.equal(format('2024-11-08 14:30:00', '2026-01-01 10:00:00'), '2024-11-08')
})

test('跨午夜但未满 60 分钟仍显示分钟数', () => {
  assert.equal(format('2026-11-14 23:50:00', '2026-11-15 00:30:00'), '40分钟前')
})

test('跨午夜且达到 60 分钟后按自然日显示昨天', () => {
  assert.equal(format('2026-11-14 23:30:00', '2026-11-15 00:30:00'), '昨天')
})

test('月份与日期补零', () => {
  assert.equal(format('2026-01-05 09:00:00'), '01-05')
  assert.equal(format('2026-02-12 09:00:00'), '02-12')
  assert.equal(format('2024-11-08 14:30:00', '2026-01-01 10:00:00'), '2024-11-08')
})

test('UTC 与带时区时间按用户时区展示', () => {
  // now 为北京时间 12:00；UTC 03:30 即北京时间 11:30。
  assert.equal(
    formatCommentTime('2026-11-15T03:30:00Z', { now: '2026-11-15T04:00:00Z', timeZone: SHANGHAI }),
    '30分钟前',
  )
  // UTC 前一日 15:00 即北京时间前一日 23:00。
  assert.equal(
    formatCommentTime('2026-11-14T15:00:00Z', { now: '2026-11-15T04:00:00Z', timeZone: SHANGHAI }),
    '昨天',
  )
  // 纽约时区下，UTC 02:00 为当地前一日 21:00。
  assert.equal(
    formatCommentTime('2026-11-15T02:00:00Z', { now: '2026-11-15T04:00:00Z', timeZone: NEW_YORK }),
    '2小时前',
  )
  assert.equal(
    formatCommentTime('2026-11-14T04:00:00Z', { now: '2026-11-15T04:00:00Z', timeZone: NEW_YORK }),
    '昨天',
  )
})

test('夏令时切换日按真实经过时间计算小时数', () => {
  // 2026-03-08 纽约春季拨快：01:30 EST 到 03:30 EDT 实际只经过 1 小时。
  assert.equal(
    formatCommentTime('2026-03-08T06:30:00Z', { now: '2026-03-08T07:30:00Z', timeZone: NEW_YORK }),
    '1小时前',
  )
  // 2026-11-01 纽约秋季回拨：01:30 EDT 到 02:30 EST 实际经过 2 小时。
  assert.equal(
    formatCommentTime('2026-11-01T05:30:00Z', { now: '2026-11-01T07:30:00Z', timeZone: NEW_YORK }),
    '2小时前',
  )
})

test('夏令时切换日按自然日而不是 24 小时判断昨天', () => {
  // 纽约 2026-03-08 只有 23 小时，3 月 7 日 23:30 到 3 月 8 日 23:30 仍是昨天。
  assert.equal(
    formatCommentTime('2026-03-08T04:30:00Z', { now: '2026-03-09T03:30:00Z', timeZone: NEW_YORK }),
    '昨天',
  )
})

test('闰年、月末、年末跨边界展示正确', () => {
  assert.equal(format('2024-02-29 10:00:00', '2024-03-01 10:00:00'), '昨天')
  assert.equal(format('2026-02-28 10:00:00', '2026-03-01 10:00:00'), '昨天')
  assert.equal(format('2026-02-21 10:00:00', '2026-03-01 10:00:00'), '02-21')
  assert.equal(format('2026-12-31 10:00:00', '2027-01-01 10:00:00'), '昨天')
  assert.equal(format('2026-12-24 10:00:00', '2027-01-01 10:00:00'), '2026-12-24')
})

test('空时间、非法时间与解析失败降级为时间未知', () => {
  for (const value of [null, undefined, '', '   ', 'not-a-date', { foo: 'bar' }]) {
    assert.equal(format(value), COMMENT_TIME_FALLBACK, `应降级 ${JSON.stringify(value)}`)
  }
})

test('不存在的日期与越界时间不会被 Date 自动进位', () => {
  const invalidValues = [
    '2026-02-30 10:00:00',
    '2023-02-29 10:00:00',
    '2026-13-01 10:00:00',
    '2026-11-15 24:00:00',
    '2026-11-15 12:60:00',
    '2026-11-15 12:00:60',
    '2026-02-30T10:00:00Z',
  ]
  for (const value of invalidValues) {
    assert.equal(format(value), COMMENT_TIME_FALLBACK, `应拒绝 ${value}`)
  }
})

test('未来时间不显示负数', () => {
  for (const value of ['2026-11-15 12:00:30', '2026-11-15 18:00:00', '2027-11-15 12:00:00']) {
    const text = format(value)
    assert.equal(text, '刚刚')
    assert.doesNotMatch(text, /-/)
  }
})

test('完整时间按用户时区输出，dateTime 保留原始时间', () => {
  const local = describeCommentTime('2024-11-08 14:30:00', { now: NOW })
  assert.deepEqual(local, {
    text: '2024-11-08',
    title: '2024-11-08 14:30:00',
    dateTime: '2024-11-08T14:30:00',
    valid: true,
  })

  const utc = describeCommentTime('2024-11-08T06:30:00Z', {
    now: NOW,
    timeZone: SHANGHAI,
  })
  assert.equal(utc.title, '2024-11-08 14:30:00')
  assert.equal(utc.dateTime, '2024-11-08T06:30:00Z')
  assert.equal(
    formatCommentFullTime('2024-11-08T06:30:00Z', { timeZone: SHANGHAI }),
    '2024-11-08 14:30:00',
  )
})

test('非法时间返回稳定的降级展示信息', () => {
  assert.deepEqual(describeCommentTime('bad-value'), {
    text: COMMENT_TIME_FALLBACK,
    title: null,
    dateTime: '',
    valid: false,
  })
})

test('留言板主留言与回复共用格式化入口，时间元素保留完整时间', () => {
  const page = readFileSync(resolve(ROOT, 'pages/frontend/MessageBoardPage.vue'), 'utf8')

  assert.match(page, /import \{ describeCommentTime \} from '@\/utils\/commentTime'/)
  assert.match(page, /import \{ useCommentClock \} from '@\/composables\/useCommentClock'/)
  assert.match(page, /const now = useCommentClock\(\)/)
  assert.equal(page.match(/describeCommentTime\(/g)?.length, 2)
  assert.match(page, /describeCommentTime\(message\.createTime, \{ now: now\.value \}\)/)
  assert.match(page, /describeCommentTime\(reply\.createTime, \{ now: now\.value \}\)/)

  // 主留言与回复都使用 time 元素，dateTime 为原始时间，title 为完整时间。
  assert.match(page, /<time[^>]*:datetime="m\.timeMeta\.dateTime"[^>]*:title="m\.timeMeta\.title"/)
  assert.match(page, /<time[^>]*:datetime="r\.timeMeta\.dateTime"[^>]*:title="r\.timeMeta\.title"/)
  assert.match(page, /class="whitespace-nowrap text-\[11px\] text-rose-700\/80"/)

  // 时间与名字、内容、操作区保持弹性换行，移动端不重叠。
  assert.match(page, /flex flex-wrap items-start justify-between gap-x-3 gap-y-1/)
  assert.match(page, /class="flex shrink-0 items-center gap-1\.5"/)

  // 不新增逐条留言的定时器，刷新统一由 composable 负责。
  assert.doesNotMatch(page, /setInterval|setTimeout/)
})

test('留言发布、回复、删除、分页与排序逻辑保持不变', () => {
  const page = readFileSync(resolve(ROOT, 'pages/frontend/MessageBoardPage.vue'), 'utf8')

  assert.match(page, /async function onPublish\(\)/)
  assert.match(page, /async function onReply\(\)/)
  assert.match(page, /async function deleteMessage\(message\)/)
  assert.match(page, /async function deleteReply\(message, reply\)/)
  assert.match(page, /function goToPage\(page\)/)
  assert.match(page, /api\.post\('\/message\/publish'/)
  assert.match(page, /api\.post\('\/message\/reply'/)
  assert.match(page, /api\.post\('\/message\/delete'/)
  assert.match(page, /api\.post\('\/message\/reply\/delete'/)
  assert.match(page, /messages\.value = data\.data\.records \|\| \[\]/)
})
