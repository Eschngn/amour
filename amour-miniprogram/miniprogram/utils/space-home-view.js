/**
 * 小程序情侣空间首页的展示映射。
 *
 * 数据唯一来源是后端 `POST /space/home/query`（SpaceHomeVO）：
 * - 空间名 / 简介 / 恋爱开始时间来自 couple_space；
 * - 双方展示名、头像与主视觉照片由后端按「空间配置 → 成员资料 → 平台默认 → 占位」解析；
 * - `*Source` 字段用于说明当前值来自哪里，前端不自行读取 `/site-config/query` 覆盖空间数据。
 *
 * 纯函数：不发起请求、不依赖页面，可在 node:test 中直接验证。
 */
const { parseBackendDateTime } = require('./space-edit')

function trimText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function initialOf(name, fallback) {
  const text = trimText(name)
  if (!text) return fallback
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length >= 2 && /^[a-z]/i.test(words[0])) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return text.slice(0, /^[a-z]/i.test(text) ? 2 : 1).toUpperCase()
}

function formatLoveStartDate(value) {
  const fields = parseBackendDateTime(value)
  if (!fields) return ''
  const pad = number => String(number).padStart(2, '0')
  return `${fields.year} · ${pad(fields.month)} · ${pad(fields.day)}`
}

/**
 * SpaceHomeVO → 首页展示数据。
 *
 * 未配置时直接使用后端返回值（可能是成员资料、平台默认或空字符串），
 * 空字符串由 WXML 展示“尚未上传照片 / 首字母头像”占位。
 */
function buildHomeView(home) {
  const source = home && typeof home === 'object' ? home : {}
  const boyName = trimText(source.boyName) || 'HE'
  const girlName = trimText(source.girlName) || 'SHE'
  const loveStartTime = trimText(source.loveStartTime)
  return {
    spaceName: trimText(source.spaceName),
    boyName,
    girlName,
    boyAvatar: trimText(source.boyAvatar),
    girlAvatar: trimText(source.girlAvatar),
    heroPhotoOne: trimText(source.heroPhoto1),
    heroPhotoTwo: trimText(source.heroPhoto2),
    loveStartTime,
    loveStartDate: formatLoveStartDate(loveStartTime),
    boyInitial: initialOf(boyName, 'HE'),
    girlInitial: initialOf(girlName, 'SHE'),
  }
}

module.exports = {
  buildHomeView,
  formatLoveStartDate,
  initialOf,
}
