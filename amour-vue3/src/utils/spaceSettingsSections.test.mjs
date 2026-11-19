import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSpaceSettingsSections,
  describeUnavailableSettingsSections,
  resolveAvailableSettingsSection,
  resolveSettingsHashSection,
  settingsSectionHash,
} from './spaceSettingsSections.js'

function waitingCreator(overrides = {}) {
  return {
    spaceId: 1,
    status: 0,
    memberCount: 1,
    currentUserRole: 1,
    creator: true,
    members: [{ amourId: 'LY1', displayName: '创建者' }],
    ...overrides,
  }
}

function boundSpace(overrides = {}) {
  return {
    spaceId: 2,
    status: 1,
    memberCount: 2,
    currentUserRole: 1,
    creator: true,
    members: [
      { amourId: 'LY1', displayName: '创建者' },
      { amourId: 'LY2', displayName: '另一半' },
    ],
    ...overrides,
  }
}

test('旧 hash 深链全部映射到合并后的四组分区', () => {
  const expected = {
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
  }
  Object.entries(expected).forEach(([hash, section]) => {
    assert.equal(resolveSettingsHashSection(`#${hash}`), section, hash)
    assert.equal(resolveSettingsHashSection(hash), section, `${hash} 不带 # 也应识别`)
  })
  assert.equal(resolveSettingsHashSection('#unknown'), '')
  assert.equal(resolveSettingsHashSection(''), '')
})

test('导航 hash 指向当前状态下真正渲染的分区锚点', () => {
  const waitingSections = buildSpaceSettingsSections(waitingCreator())
  assert.equal(settingsSectionHash('overview', waitingSections), '#space-overview')
  assert.equal(settingsSectionHash('partner', waitingSections), '#space-invite-partner')
  assert.equal(settingsSectionHash('danger', waitingSections), '#space-danger-zone')

  const boundSections = buildSpaceSettingsSections(boundSpace())
  assert.equal(settingsSectionHash('partner', boundSections), '#space-members')
  assert.equal(settingsSectionHash('unknown', boundSections), '')
})

test('等待绑定：合并为四组，邀请与成员只出现一个导航', () => {
  const sections = buildSpaceSettingsSections(waitingCreator())
  assert.deepEqual(sections.map(section => section.key), ['overview', 'partner', 'visibility', 'danger'])
  const byKey = Object.fromEntries(sections.map(section => [section.key, section]))

  assert.equal(byKey.overview.available, true, '内容入口合并进空间概况')
  assert.equal(byKey.partner.available, true)
  assert.equal(byKey.partner.label, '邀请另一半')
  assert.equal(byKey.partner.anchor, 'space-invite-partner')
  assert.equal(byKey.visibility.available, true)
  assert.equal(byKey.danger.available, true, '创建者可以销毁')
  assert.ok(!sections.some(section => section.key === 'members'))
  assert.ok(!sections.some(section => section.key === 'basic-info'))
})

test('已绑定：邀请导航变为成员导航，不保留灰色禁用项', () => {
  const sections = buildSpaceSettingsSections(boundSpace())
  const byKey = Object.fromEntries(sections.map(section => [section.key, section]))
  assert.equal(byKey.partner.label, '空间成员')
  assert.equal(byKey.partner.anchor, 'space-members')
  assert.equal(byKey.partner.available, true)
  assert.ok(!sections.some(section => section.label === '邀请另一半'))
  assert.equal(byKey.danger.available, true)

  const reasons = describeUnavailableSettingsSections(sections)
  assert.deepEqual(reasons, [], '不适用分区不再作为导航项说明占位')
})

test('冻结 / 归档：空间概况仍在，恢复入口保留在空间操作', () => {
  for (const status of [2, 3]) {
    const sections = buildSpaceSettingsSections(boundSpace({ status }))
    const byKey = Object.fromEntries(sections.map(section => [section.key, section]))
    assert.equal(byKey.overview.available, true, `status=${status}`)
    assert.equal(byKey.danger.available, true, `status=${status} 应展示恢复入口`)
  }
})

test('没有可用危险操作时整组隐藏，不出现空导航', () => {
  const sections = buildSpaceSettingsSections(boundSpace({ status: 1, memberCount: 1, currentUserRole: null }))
  const byKey = Object.fromEntries(sections.map(section => [section.key, section]))
  assert.equal(byKey.partner.available, false)
  assert.equal(byKey.danger.available, false)
  assert.deepEqual(sections.filter(section => section.available).map(section => section.key),
    ['overview', 'visibility'])
})

test('当前分区不可用时回落到第一个可用分区', () => {
  const sections = buildSpaceSettingsSections(boundSpace())
  assert.equal(resolveAvailableSettingsSection('partner', sections), 'partner')
  assert.equal(resolveAvailableSettingsSection('danger', sections), 'danger')
  assert.equal(resolveAvailableSettingsSection('missing', sections), 'overview')

  const noPartner = buildSpaceSettingsSections(boundSpace({ memberCount: 1, currentUserRole: null }))
  assert.equal(resolveAvailableSettingsSection('partner', noPartner), 'overview')
})
