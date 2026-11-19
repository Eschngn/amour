import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SPACE_STUDIO_TABS,
  isStudioTabAllowed,
  resolveStudioTab,
  resolveVisibleStudioTabs,
} from './spaceStudioTabs.js'

test('首页不依赖模块查询权限，其余栏目按 frontend:<module>:query 过滤', () => {
  const tabs = resolveVisibleStudioTabs(module => module === 'photo')
  assert.deepEqual(tabs.map(tab => tab.key), ['home', 'photo'])
  assert.deepEqual(
    resolveVisibleStudioTabs(() => false).map(tab => tab.key),
    ['home'],
    '没有模块权限时仍保留首页能力',
  )
  assert.deepEqual(
    resolveVisibleStudioTabs(() => true).map(tab => tab.key),
    SPACE_STUDIO_TABS.map(tab => tab.key),
  )
})

test('tab 恢复只在可见栏目内生效，否则回落到第一个可用栏目', () => {
  const tabs = resolveVisibleStudioTabs(module => module === 'story')

  assert.equal(resolveStudioTab('story', tabs), 'story')
  assert.equal(resolveStudioTab('photo', tabs), 'home', '无权限栏目不能通过 URL 恢复')
  assert.equal(resolveStudioTab('', tabs), 'home')
  assert.equal(resolveStudioTab('story', []), '', '没有可用栏目时返回空字符串')
})

test('isStudioTabAllowed 不会把未知栏目当作可用', () => {
  const tabs = resolveVisibleStudioTabs(() => true)
  assert.equal(isStudioTabAllowed('home', tabs), true)
  assert.equal(isStudioTabAllowed('unknown', tabs), false)
  assert.equal(isStudioTabAllowed('home', null), false)
})
