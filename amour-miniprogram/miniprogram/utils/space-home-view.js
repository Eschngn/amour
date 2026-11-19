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
 * 首页照片：只保留真实存在的地址。
 *
 * 两张都为空时不返回空壳项；只有一张时列表长度为 1，由 WXML 自然排布。
 */
function buildHeroPhotos(primary, secondary) {
  const list = []
  const first = trimText(primary)
  const second = trimText(secondary)
  if (first) list.push({ key: 'hero-1', url: first })
  if (second) list.push({ key: 'hero-2', url: second })
  return list
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
  const heroPhotoOne = trimText(source.heroPhoto1)
  const heroPhotoTwo = trimText(source.heroPhoto2)
  return {
    spaceName: trimText(source.spaceName),
    description: trimText(source.description),
    canEdit: source.canEdit === true,
    boyName,
    girlName,
    boyAvatar: trimText(source.boyAvatar),
    girlAvatar: trimText(source.girlAvatar),
    heroPhotoOne,
    heroPhotoTwo,
    heroPhotos: buildHeroPhotos(heroPhotoOne, heroPhotoTwo),
    loveStartTime,
    loveStartDate: formatLoveStartDate(loveStartTime),
    hasLoveStart: Boolean(loveStartTime),
    boyInitial: initialOf(boyName, 'HE'),
    girlInitial: initialOf(girlName, 'SHE'),
  }
}

module.exports = {
  buildHomeView,
  formatLoveStartDate,
  initialOf,
}
