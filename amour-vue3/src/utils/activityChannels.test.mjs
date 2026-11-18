import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVITY_CHANNEL_ORDER,
  ACTIVITY_CHANNELS,
  findChannelConfig,
  isChannelEmpty,
  normalizeActivityChannels,
  resolvePvShare,
} from './activityChannels.js'

/**
 * 运行：npm test（含 test:admin-activity）
 * 访问来源数据的归一化与展示口径：
 * - 两个来源始终存在、顺序固定；
 * - 缺失保持 null（界面显示“—”），真实 0 保持 0，两者不能混；
 * - 老接口没有 channels 时页面仍可渲染，且不臆造来源数值；
 * - 界面名称使用「网页端」「微信小程序」，不出现 Web / 渠道 等旧文案。
 */

function fullResponse(overrides = {}) {
  return {
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    days: 3,
    totalPv: 10,
    totalUv: 6,
    daily: [
      { date: '2026-11-10', pv: 4, uv: 3, webPv: 3, webUv: 2, miniprogramPv: 1, miniprogramUv: 1 },
      { date: '2026-11-11', pv: 6, uv: 4, webPv: 2, webUv: 2, miniprogramPv: 4, miniprogramUv: 3 },
    ],
    channels: [
      {
        clientType: 'web',
        clientTypeText: 'Web 网页端',
        totalPv: 5,
        totalUv: 3,
        pvShare: 50,
        uvShare: 50,
        previousTotalPv: 4,
        previousTotalUv: 2,
        pvChangeRate: 25,
        uvChangeRate: 50,
        daily: [
          { date: '2026-11-10', pv: 3, uv: 2 },
          { date: '2026-11-11', pv: 2, uv: 2 },
        ],
      },
      {
        clientType: 'miniprogram',
        clientTypeText: '微信小程序端',
        totalPv: 5,
        totalUv: 3,
        pvShare: 50,
        uvShare: 50,
        previousTotalPv: 0,
        previousTotalUv: 0,
        pvChangeRate: null,
        uvChangeRate: null,
        daily: [
          { date: '2026-11-10', pv: 1, uv: 1 },
          { date: '2026-11-11', pv: 4, uv: 3 },
        ],
      },
    ],
    ...overrides,
  }
}

test('来源固定为网页端、微信小程序，名称不含 Web / 端 的旧写法', () => {
  assert.deepEqual([...ACTIVITY_CHANNEL_ORDER], ['web', 'miniprogram'])
  assert.equal(ACTIVITY_CHANNELS.length, 2)
  assert.equal(ACTIVITY_CHANNELS[0].label, '网页端')
  assert.equal(ACTIVITY_CHANNELS[1].label, '微信小程序')
  assert.doesNotMatch(ACTIVITY_CHANNELS[0].label, /^Web/)
  assert.doesNotMatch(ACTIVITY_CHANNELS[1].label, /端$/)
  // 两个来源必须有可区分的颜色。
  assert.notEqual(ACTIVITY_CHANNELS[0].color, ACTIVITY_CHANNELS[1].color)
  assert.equal(ACTIVITY_CHANNELS[0].color, '#e11d48', '网页端沿用玫瑰色')
  assert.equal(ACTIVITY_CHANNELS[1].color, '#0ea5e9', '微信小程序沿用天蓝色')
  assert.equal(findChannelConfig('web').label, '网页端')
  assert.equal(findChannelConfig('unknown'), null)
})

test('同时展示两个来源，顺序固定且数值对应接口字段', () => {
  const channels = normalizeActivityChannels(fullResponse())
  assert.equal(channels.length, 2)
  assert.equal(channels[0].clientType, 'web')
  assert.equal(channels[0].clientTypeText, '网页端')
  assert.equal(channels[1].clientType, 'miniprogram')
  assert.equal(channels[1].clientTypeText, '微信小程序')
  assert.equal(channels[0].totalPv, 5)
  assert.equal(channels[1].totalPv, 5)
  assert.equal(channels[0].previousTotalPv, 4)
  assert.equal(channels[1].previousTotalPv, 0)
  assert.equal(channels[0].pvChangeRate, 25)
  assert.equal(channels[1].pvChangeRate, null)
})

test('接口来源顺序颠倒时仍按固定顺序输出', () => {
  const response = fullResponse()
  const channels = normalizeActivityChannels({
    ...response,
    channels: [response.channels[1], response.channels[0]],
  })
  assert.equal(channels[0].clientType, 'web')
  assert.equal(channels[0].totalPv, 5)
  assert.equal(channels[1].clientType, 'miniprogram')
})

test('真实 0 与数据缺失必须区分', () => {
  const channels = normalizeActivityChannels(fullResponse({
    channels: [
      { clientType: 'web', totalPv: 0, totalUv: 0 },
      { clientType: 'miniprogram' }, // 字段完全缺失
    ],
  }))
  assert.equal(channels[0].totalPv, 0, '接口返回的真实 0 保持为 0')
  assert.equal(channels[0].totalUv, 0)
  assert.equal(channels[1].totalPv, null, '缺失字段保持 null，不冒充 0')
  assert.equal(channels[1].totalUv, null)
  // 只有两个值都是真实 0 才算空来源。
  assert.equal(isChannelEmpty(channels[0]), true)
  assert.equal(isChannelEmpty(channels[1]), false, '缺失不能算空来源')
  assert.equal(isChannelEmpty({ totalPv: 0, totalUv: null }), false)
})

test('非法数值收敛为 null，不产生 NaN / Infinity', () => {
  const channels = normalizeActivityChannels(fullResponse({
    channels: [
      { clientType: 'web', totalPv: Number.NaN, totalUv: Number.POSITIVE_INFINITY, pvShare: -5 },
      { clientType: 'miniprogram', totalPv: -3, totalUv: 'abc' },
    ],
  }))
  for (const channel of channels) {
    assert.equal(channel.totalPv, null)
    assert.equal(channel.totalUv, null)
  }
  assert.doesNotMatch(JSON.stringify(channels), /NaN|Infinity/)
})

test('老接口没有 channels 时本地兼容，不崩溃也不伪造来源数据', () => {
  const response = fullResponse()
  const legacy = normalizeActivityChannels({
    startDate: response.startDate,
    endDate: response.endDate,
    days: response.days,
    totalPv: response.totalPv,
    totalUv: response.totalUv,
    daily: response.daily.map(item => ({ date: item.date, pv: item.pv, uv: item.uv })),
  })
  assert.equal(legacy.length, 2, '老接口也要显示两个来源占位')
  assert.ok(legacy.every(item => item.unavailable === true), '必须标记来源数据不可用')
  assert.ok(legacy.every(item => item.totalPv === null), '不可用时保持 null，不冒充 0')
  assert.ok(legacy.every(item => item.totalUv === null))

  // 完全空的 data 也不能抛错。
  const empty = normalizeActivityChannels(null)
  assert.equal(empty.length, 2)
  assert.ok(empty.every(item => item.unavailable === true))
})

test('未知来源值被丢弃，不展示未经服务端统计的数据', () => {
  const channels = normalizeActivityChannels(fullResponse({
    channels: [
      { clientType: 'web', totalPv: 3, totalUv: 2 },
      { clientType: 'app', totalPv: 999, totalUv: 999 },
    ],
  }))
  assert.equal(channels.length, 2)
  assert.equal(channels[0].clientType, 'web')
  assert.equal(channels[0].totalPv, 3)
  assert.equal(channels[1].clientType, 'miniprogram')
  assert.equal(channels[1].totalPv, null, '未知来源的数据没有被映射成微信小程序')
})

test('浏览次数的来源占比只在总量有效时计算', () => {
  assert.equal(resolvePvShare(50, 100), 50)
  assert.equal(resolvePvShare(40, 40), 100)
  assert.equal(resolvePvShare(1, 3), 33.3)
  assert.equal(resolvePvShare(0, 100), 0)
  // 分母为 0 / 缺失 / 非法时不计算占比。
  assert.equal(resolvePvShare(0, 0), null)
  assert.equal(resolvePvShare(5, 0), null)
  assert.equal(resolvePvShare(5, null), null)
  assert.equal(resolvePvShare(null, 100), null)
  assert.equal(resolvePvShare(Number.NaN, 100), null)
  assert.equal(resolvePvShare(-1, 100), null)
})
