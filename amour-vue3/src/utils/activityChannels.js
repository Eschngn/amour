/**
 * 管理控制台数据看板的「访问来源」口径。
 *
 * 来源由采集端上报、服务端白名单校验，仅用于统计分组，不作为权限判断依据。
 * 顺序固定为网页端、微信小程序；某个来源没有数据时仍然展示，数值为 0。
 *
 * 界面统一使用「网页端」「微信小程序」等自然中文，代码内部继续使用
 * web / miniprogram 字段，接口协议不变。
 */

export const ACTIVITY_CLIENT_TYPE_WEB = 'web'
export const ACTIVITY_CLIENT_TYPE_MINIPROGRAM = 'miniprogram'

/**
 * 来源展示配置。颜色与趋势图 / 图例 / 每日明细保持一致，便于跨组件识别。
 * 网页端沿用玫瑰色，微信小程序沿用天蓝色。
 */
export const ACTIVITY_CHANNELS = Object.freeze([
  Object.freeze({
    clientType: ACTIVITY_CLIENT_TYPE_WEB,
    label: '网页端',
    shortLabel: '网页端',
    color: '#e11d48',
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-600',
    daily: 'webPv',
    dailyUv: 'webUv',
  }),
  Object.freeze({
    clientType: ACTIVITY_CLIENT_TYPE_MINIPROGRAM,
    label: '微信小程序',
    shortLabel: '微信小程序',
    color: '#0ea5e9',
    dotClass: 'bg-sky-500',
    textClass: 'text-sky-600',
    daily: 'miniprogramPv',
    dailyUv: 'miniprogramUv',
  }),
])

export const ACTIVITY_CHANNEL_ORDER = Object.freeze(
  ACTIVITY_CHANNELS.map(channel => channel.clientType),
)

export function findChannelConfig(clientType) {
  return ACTIVITY_CHANNELS.find(item => item.clientType === clientType) || null
}

function toFiniteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/**
 * 计数收敛：null / 非法 / 负数 → null（表示“未提供”），保留真实 0。
 * 真实 0 与数据缺失必须区分，不能把缺失伪装成 0。
 */
function toCountOrNull(value) {
  const number = toFiniteNumberOrNull(value)
  if (number === null || number < 0) return null
  return Math.round(number)
}

/**
 * 把接口返回的 channels 归一化为固定两个来源，顺序固定。
 *
 * - 同时兼容 clientType 缺失的旧数据（按顺序兜底到网页端 / 微信小程序）；
 * - 不认识的来源值直接丢弃，不展示未经服务端统计的数据；
 * - 接口完全没有 channels 时返回 unavailable 占位，绝不把合计拆成来源；
 * - 缺失字段保持 null（界面显示“—”），真实 0 保持 0。
 */
export function normalizeActivityChannels(data) {
  const rawChannels = Array.isArray(data?.channels) ? data.channels : []
  const unavailable = rawChannels.length === 0
  const byType = new Map()

  if (!unavailable) {
    rawChannels.forEach((item, index) => {
      if (!item || typeof item !== 'object') return
      const rawType = typeof item.clientType === 'string' ? item.clientType.trim().toLowerCase() : ''
      let clientType = ''
      if (!rawType) {
        // 旧接口可能完全没有 clientType：此时才按返回顺序映射到固定来源顺序。
        clientType = ACTIVITY_CHANNEL_ORDER[index] || ''
      } else if (ACTIVITY_CHANNEL_ORDER.includes(rawType)) {
        clientType = rawType
      }
      // 明确给出但不认识的来源值一律丢弃，绝不猜测成另一个来源。
      if (!clientType || byType.has(clientType)) return
      byType.set(clientType, item)
    })
  }

  const channels = ACTIVITY_CHANNELS.map((config) => {
    const raw = byType.get(config.clientType) || {}
    const totalPv = unavailable ? null : toCountOrNull(raw.totalPv)
    const totalUv = unavailable ? null : toCountOrNull(raw.totalUv)
    const pvShare = unavailable ? null : toFiniteNumberOrNull(raw.pvShare)
    const uvShare = unavailable ? null : toFiniteNumberOrNull(raw.uvShare)
    return {
      clientType: config.clientType,
      clientTypeText: config.label,
      color: config.color,
      totalPv,
      totalUv,
      previousTotalPv: unavailable ? null : toCountOrNull(raw.previousTotalPv),
      previousTotalUv: unavailable ? null : toCountOrNull(raw.previousTotalUv),
      pvChangeRate: unavailable ? null : toFiniteNumberOrNull(raw.pvChangeRate),
      uvChangeRate: unavailable ? null : toFiniteNumberOrNull(raw.uvChangeRate),
      // 服务端给出的浏览次数占比可以直接使用；缺少时由调用方在数据完整时计算。
      pvShare,
      uvShare,
      unavailable,
    }
  })

  return channels
}

/**
 * 来源是否明确没有访问记录（浏览次数与访客人数都是真实 0）。
 * 数据缺失（null）不算“空来源”，避免把缺失误报成 0。
 */
export function isChannelEmpty(channel) {
  return toCountOrNull(channel?.totalPv) === 0 && toCountOrNull(channel?.totalUv) === 0
}

/**
 * 浏览次数的来源占比。
 *
 * 只有两个来源的浏览次数已知、且合计有效时才计算；
 * 访客人数是去重集合，不计算占比。
 *
 * @param {number|null} part 该来源浏览次数
 * @param {number|null} total 全部来源浏览次数
 * @returns {number|null} 百分比数值（保留 1 位小数），不可计算时返回 null
 */
export function resolvePvShare(part, total) {
  const partValue = toCountOrNull(part)
  const totalValue = toCountOrNull(total)
  if (partValue === null || totalValue === null || totalValue <= 0) return null
  const share = (partValue / totalValue) * 100
  return Number.isFinite(share) ? Math.round(share * 10) / 10 : null
}
