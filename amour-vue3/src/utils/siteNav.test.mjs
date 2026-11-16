import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveSiteNavState } from './siteNav.js'
import { SPACE_VIEW_MODE } from './spaceState.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

test('广场列表与详情路径都高亮恋爱广场', () => {
  for (const path of ['/plaza', '/plaza/2001', '/plaza/2001/story/3001']) {
    const state = resolveSiteNavState(path, SPACE_VIEW_MODE.PRIVATE)
    assert.equal(state.plazaActive, true, path)
    assert.equal(state.homeActive, false, path)
  }
})

test('根路由在 plaza 模式下高亮恋爱广场而不是我的情侣空间', () => {
  const state = resolveSiteNavState('/', SPACE_VIEW_MODE.PLAZA)
  assert.equal(state.plazaActive, true)
  assert.equal(state.homeActive, false)
})

test('根路由在 private 模式下只高亮我的情侣空间', () => {
  const state = resolveSiteNavState('/', SPACE_VIEW_MODE.PRIVATE)
  assert.equal(state.plazaActive, false)
  assert.equal(state.homeActive, true)
})

test('根路由在空间不可用（等待绑定/冻结/归档）时仍归属我的情侣空间', () => {
  const state = resolveSiteNavState('/', SPACE_VIEW_MODE.UNAVAILABLE)
  assert.equal(state.plazaActive, false)
  assert.equal(state.homeActive, true)
})

test('首页不会同时高亮恋爱广场与我的情侣空间', () => {
  for (const viewMode of Object.values(SPACE_VIEW_MODE)) {
    const state = resolveSiteNavState('/', viewMode)
    assert.equal(state.plazaActive !== state.homeActive, true, viewMode)
  }
})

test('其他栏目路径不会误高亮恋爱广场或首页', () => {
  for (const path of ['/story', '/story/3001', '/photo', '/message', '/anniversary', '/space/studio', '/space/setup']) {
    const state = resolveSiteNavState(path, SPACE_VIEW_MODE.PRIVATE)
    assert.equal(state.plazaActive, false, path)
    assert.equal(state.homeActive, false, path)
  }
})

test('桌面端与移动端导航共用同一套高亮与 aria-current 规则', () => {
  const source = readSource('components/frontend/SiteHeader.vue')

  assert.match(source, /resolveSiteNavState\(route\.path, viewMode\.value\)/)
  assert.equal((source.match(/:class="\{ 'nav-link-active': isPlazaSection \}"/g) || []).length, 1)
  assert.equal((source.match(/:class="\{ 'mobile-nav-link-active': isPlazaSection \}"/g) || []).length, 1)
  assert.equal((source.match(/:class="\{ 'nav-link-active': isHomeSection \}"/g) || []).length, 1)
  assert.equal((source.match(/:class="\{ 'mobile-nav-link-active': isHomeSection \}"/g) || []).length, 1)
  assert.equal((source.match(/:aria-current="isPlazaSection \? 'page' : undefined"/g) || []).length, 2)
  assert.equal((source.match(/:aria-current="isHomeSection \? 'page' : undefined"/g) || []).length, 2)
})
