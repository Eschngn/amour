import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTH_STORAGE_MODE,
  pickAuthStorage,
  resolveAuthStorageMode,
} from './authStorage.js'
import {
  frontendLoggedIn,
  getFrontendToken,
  isFrontendAuthTabScoped,
  isFrontendAuthenticated,
} from './auth.js'

test('开发环境默认按标签页隔离登录态', () => {
  assert.equal(resolveAuthStorageMode(true, ''), AUTH_STORAGE_MODE.SESSION)
  assert.equal(resolveAuthStorageMode(true, undefined), AUTH_STORAGE_MODE.SESSION)
})

test('生产构建默认保持跨标签页共享登录态', () => {
  assert.equal(resolveAuthStorageMode(false, ''), AUTH_STORAGE_MODE.LOCAL)
  assert.equal(resolveAuthStorageMode(false, undefined), AUTH_STORAGE_MODE.LOCAL)
})

test('显式配置可以覆盖默认存储策略', () => {
  assert.equal(resolveAuthStorageMode(true, 'local'), AUTH_STORAGE_MODE.LOCAL)
  assert.equal(resolveAuthStorageMode(false, 'session'), AUTH_STORAGE_MODE.SESSION)
  assert.equal(resolveAuthStorageMode(false, ' SESSION '), AUTH_STORAGE_MODE.SESSION)
  assert.equal(resolveAuthStorageMode(true, 'unknown'), AUTH_STORAGE_MODE.SESSION)
})

test('按策略选择 sessionStorage 或 localStorage', () => {
  const local = { name: 'local' }
  const session = { name: 'session' }

  assert.equal(pickAuthStorage(AUTH_STORAGE_MODE.SESSION, { local, session }), session)
  assert.equal(pickAuthStorage(AUTH_STORAGE_MODE.LOCAL, { local, session }), local)
})

test('无浏览器存储环境时 auth 模块可安全加载并保持未登录', () => {
  assert.equal(isFrontendAuthTabScoped, false)
  assert.equal(getFrontendToken(), '')
  assert.equal(isFrontendAuthenticated(), false)
  assert.equal(frontendLoggedIn.value, false)
})
