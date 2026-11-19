import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyDatePart,
  normalizeShowTime,
  toBackendContentDateTime,
  toBackendDateTime,
  toDateTimeLocalInput,
  toDateInputValue,
  toTimeInputValue,
} from './spaceContent.js'
import { createFormSnapshot, isFormDirty } from './formBaseline.js'

test('编辑回填保留已有秒级时间，不截断为分钟', () => {
  assert.equal(
    toDateTimeLocalInput('2024-05-20 14:23:45'),
    '2024-05-20T14:23:45',
  )
  assert.equal(
    toBackendDateTime('2024-05-20T14:23:45'),
    '2024-05-20 14:23:45',
  )
})

test('只选日期且未设置时间时默认 00:00:00，不使用当前时刻', () => {
  assert.equal(applyDatePart('', '2024-05-20'), '2024-05-20 00:00:00')
  assert.equal(applyDatePart('2024-05-20 14:23:45', '2024-05-21'), '2024-05-21 14:23:45')
  assert.equal(toTimeInputValue(''), '00:00:00')
})

test('仅日期模式提交时统一规范化为当天零点', () => {
  assert.equal(toBackendContentDateTime('2024-05-20 14:23:45', false), '2024-05-20 00:00:00')
  assert.equal(toBackendContentDateTime('2024-05-20 14:23:45', true), '2024-05-20 14:23:45')
  assert.equal(toBackendContentDateTime('', false), null)
  assert.equal(toBackendContentDateTime(null, true), null)
})

test('历史缺失 showTime 按展示时间兼容，显式 false 仍为仅日期', () => {
  assert.equal(normalizeShowTime(undefined), true)
  assert.equal(normalizeShowTime(null), true)
  assert.equal(normalizeShowTime(false), false)
  assert.equal(normalizeShowTime(0), false)
  assert.equal(normalizeShowTime('0'), false)
  assert.equal(normalizeShowTime(true), true)
})

test('日期部分提取兼容 T 分隔符与纯日期', () => {
  assert.equal(toDateInputValue('2024-05-20T14:23:45'), '2024-05-20')
  assert.equal(toDateInputValue('2024-05-20'), '2024-05-20')
  assert.equal(toDateInputValue(''), '')
})

test('切换展示模式会进入表单快照并触发 dirty', () => {
  const baseline = createFormSnapshot({
    happenedTime: '2024-05-20 14:23:45',
    showTime: true,
  })
  assert.equal(isFormDirty(baseline, {
    happenedTime: '2024-05-20 14:23:45',
    showTime: false,
  }), true, '只切换展示精度也必须视为未保存修改')
  assert.equal(isFormDirty(baseline, {
    happenedTime: '2024-05-20 14:23:45',
    showTime: true,
  }), false)
})

