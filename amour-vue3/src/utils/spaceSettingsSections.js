/**
 * 空间设置页的分区定义、可用性规则与 hash 深链映射。
 *
 * 页面结构（桌面端）：左侧四组纵向导航 + 右侧按层级组织的内容。
 * 这里只做纯数据与判定，不依赖 Vue / 路由，便于直接测试：
 * - 四组分区：空间概况、邀请另一半 / 空间成员、公开与审核、空间操作；
 * - 邀请与成员共用同一个导航位置，由服务器返回的绑定状态动态决定；
 * - 旧 hash 深链继续映射到合并后的分区。
 */
import {
  activeSpaceMemberCount,
  canShowDestroySection,
  canShowUnbindSection,
  hasActiveSpaceMembership,
  isRestorableSpace,
  SPACE_STATUS,
} from './spaceState.js'

export const SPACE_SETTINGS_SECTIONS = Object.freeze([
  { key: 'overview', anchor: 'space-overview', label: '空间概况', hint: '信息、内容与编辑入口' },
  { key: 'partner', anchor: 'space-members', label: '空间成员', hint: '成员与邀请' },
  { key: 'visibility', anchor: 'space-visibility', label: '公开与审核', hint: '恋爱广场展示状态' },
  { key: 'danger', anchor: 'space-danger-zone', label: '空间操作', hint: '恢复、解绑与销毁' },
])

/**
 * hash → 分区 key。
 * 合并后的分区保留全部旧锚点：
 * - 概览 / 基础信息 / 内容入口 → 空间概况；
 * - 邀请 / 成员 → 同一个成员与邀请分区；
 * - 恢复 / 解绑 / 销毁 → 空间操作。
 */
const HASH_SECTION_MAP = Object.freeze({
  'space-overview': 'overview',
  'space-basic-info': 'overview',
  'space-content-entry': 'overview',
  'space-invite-partner': 'partner',
  'space-members': 'partner',
  'space-visibility': 'visibility',
  'space-danger-zone': 'danger',
  'space-restore': 'danger',
  'space-unbind': 'danger',
  'space-destroy': 'danger',
})

/** 从 hash（带不带 # 均可）解析分区 key；无法识别时返回空字符串。 */
export function resolveSettingsHashSection(hash) {
  const value = String(hash || '').trim().replace(/^#/, '')
  if (!value) return ''
  return HASH_SECTION_MAP[value] || ''
}

/** 分区对应的 URL hash（用于点击导航后同步地址）。 */
export function settingsSectionHash(sectionKey, sections = SPACE_SETTINGS_SECTIONS) {
  const section = (Array.isArray(sections) ? sections : [])
    .find(item => item.key === sectionKey)
  return section ? `#${section.anchor}` : ''
}

/** 邀请分区只对等待绑定、且尚未满员的创建者空间有意义。 */
export function canShowInviteSection(spaceStatus) {
  if (!hasActiveSpaceMembership(spaceStatus)) return false
  if (Number(spaceStatus?.status) !== SPACE_STATUS.WAITING) return false
  return activeSpaceMemberCount(spaceStatus) < 2
}

/** 成员卡片只在两位成员都加入后展示。 */
export function canShowMembersSection(spaceStatus) {
  return hasActiveSpaceMembership(spaceStatus) && activeSpaceMemberCount(spaceStatus) > 1
}

/** 危险操作区的展示条件：恢复 / 解绑 / 销毁任一成立。 */
export function canShowDangerSection(spaceStatus) {
  return isRestorableSpace(spaceStatus)
    || canShowUnbindSection(spaceStatus)
    || canShowDestroySection(spaceStatus)
}

/**
 * 计算四组分区的展示信息。
 *
 * - 空间概况始终可用，内容入口是否可点由分区内部按状态说明；
 * - 邀请与成员合并为一个导航：等待绑定显示邀请，完成绑定显示成员，
 *   两者都不适用时该分区整体隐藏，不保留灰色禁用项；
 * - 空间操作在没有可执行动作时整体隐藏。
 *
 * @param {object|null} spaceStatus
 * @returns {Array<{key: string, anchor: string, label: string, hint: string, available: boolean, reason: string}>}
 */
export function buildSpaceSettingsSections(spaceStatus) {
  const showInvite = canShowInviteSection(spaceStatus)
  const showMembers = canShowMembersSection(spaceStatus)
  return SPACE_SETTINGS_SECTIONS.map((section) => {
    let available = true
    let reason = ''
    let label = section.label
    let hint = section.hint
    let anchor = section.anchor
    if (section.key === 'partner') {
      available = showInvite || showMembers
      if (showInvite) {
        label = '邀请另一半'
        hint = '生成并管理邀请'
        anchor = 'space-invite-partner'
      } else if (showMembers) {
        label = '空间成员'
        hint = '两位成员与身份'
        anchor = 'space-members'
      } else {
        label = '邀请与成员'
        hint = '完成绑定后可用'
        reason = '当前空间状态暂不展示邀请或成员信息。'
      }
    } else if (section.key === 'danger') {
      available = canShowDangerSection(spaceStatus)
      if (!available) reason = '当前没有可执行的恢复、解绑或销毁操作。'
    }
    return { ...section, anchor, label, hint, available, reason }
  })
}

/** 不适用的分区说明（仅用于诊断，不在导航下重复占位）。 */
export function describeUnavailableSettingsSections(sections) {
  return (Array.isArray(sections) ? sections : [])
    .filter(section => !section.available)
    .map(section => `${section.label}：${section.reason}`)
}

/** 当前分区若不可用，回落到第一个可用分区（默认空间概况）。 */
export function resolveAvailableSettingsSection(sectionKey, sections) {
  const list = Array.isArray(sections) ? sections : []
  const current = list.find(section => section.key === sectionKey)
  if (current?.available) return current.key
  return list.find(section => section.available)?.key || ''
}
