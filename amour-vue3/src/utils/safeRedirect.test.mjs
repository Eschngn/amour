import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_REDIRECT, resolveSafeRedirect } from '../utils/safeRedirect.js'

/**
 * 运行：npm run test:space-api
 *
 * 登录回跳必须经过这里校验：既不能变成开放重定向，
 * 也不能误伤带查询串的站内邀请地址。
 */

test('合法的站内地址原样返回', () => {
  assert.equal(resolveSafeRedirect('/'), '/')
  assert.equal(resolveSafeRedirect('/story'), '/story')
  assert.equal(resolveSafeRedirect('/space/setup'), '/space/setup')
  assert.equal(resolveSafeRedirect('/space/setup?token=abc123'), '/space/setup?token=abc123')
  assert.equal(
    resolveSafeRedirect('/space/setup?token=a%2Bb%2Fc%3Dd&x=1'),
    '/space/setup?token=a%2Bb%2Fc%3Dd&x=1',
  )
})

test('带 token 的邀请地址不会被编码绕过误伤', () => {
  const redirect = '/space/setup?token=tok_1%2B%2F%3D%26x'
  assert.equal(resolveSafeRedirect(redirect), redirect)
})

test('拒绝协议相对地址（开放重定向）', () => {
  for (const input of [
    '//evil.com',
    '//evil.com/space/setup',
    '///evil.com',
    '/\\evil.com',
    '\\\\evil.com',
  ]) {
    assert.equal(resolveSafeRedirect(input), DEFAULT_REDIRECT, `应拒绝 ${input}`)
  }
})

test('拒绝编码后的协议相对地址', () => {
  for (const input of ['/%2F%2Fevil.com', '/%5Cevil.com', '/%2f%2fevil.com']) {
    assert.equal(resolveSafeRedirect(input), DEFAULT_REDIRECT, `应拒绝 ${input}`)
  }
})

test('拒绝绝对 URL 与非站内路径', () => {
  for (const input of [
    'https://evil.com',
    'http://evil.com/space/setup',
    'javascript:alert(1)',
    'evil.com/path',
    'space/setup',
  ]) {
    assert.equal(resolveSafeRedirect(input), DEFAULT_REDIRECT, `应拒绝 ${input}`)
  }
})

test('拒绝后台入口与登录页，避免跳错或循环', () => {
  for (const input of [
    '/admin',
    '/admin/',
    '/admin/story',
    '/admin?x=1',
    '/login',
    '/login?redirect=/',
  ]) {
    assert.equal(resolveSafeRedirect(input), DEFAULT_REDIRECT, `应拒绝 ${input}`)
  }
})

test('相似前缀不能被误判为后台路径', () => {
  // /administrator 不是 /admin 下的页面，应放行。
  assert.equal(resolveSafeRedirect('/administrator'), '/administrator')
  assert.equal(resolveSafeRedirect('/loginfo'), '/loginfo')
})

test('空值与非字符串走兜底', () => {
  for (const input of [null, undefined, '', '   ', 123, {}, []]) {
    assert.equal(resolveSafeRedirect(input), DEFAULT_REDIRECT)
  }
  assert.equal(resolveSafeRedirect(null, '/plaza'), '/plaza')
  assert.equal(resolveSafeRedirect('https://evil.com', '/plaza'), '/plaza')
})

test('控制字符与空白被视为可疑地址', () => {
  for (const input of ['/space\n/setup', '/space setup', '/space\t/setup', '/space\u0000setup']) {
    assert.equal(resolveSafeRedirect(input), DEFAULT_REDIRECT, `应拒绝 ${JSON.stringify(input)}`)
  }
})

test('非法百分号编码不会被当成合法地址', () => {
  assert.equal(resolveSafeRedirect('/%E0%A4%A'), DEFAULT_REDIRECT)
})

// ============================== 邀请 token 深链接判定 ==============================

/**
 * 路由守卫用 hasInvitationToken 决定“是否允许游客停留预览”。
 * 该规则内联在 router/index.js 中，这里用等价实现锁定行为契约。
 */
function hasInvitationToken(query) {
  const raw = query?.token
  const token = Array.isArray(raw) ? raw[0] : raw
  return typeof token === 'string' && token.trim().length > 0
}

test('带 token 的查询被认为可游客预览', () => {
  assert.equal(hasInvitationToken({ token: 'abc' }), true)
  assert.equal(hasInvitationToken({ token: '  abc  ' }), true)
  assert.equal(hasInvitationToken({ token: ['abc'] }), true)
  assert.equal(hasInvitationToken({ token: ['abc', 'def'] }), true)
})

test('没有 token 或 token 为空时要求登录', () => {
  for (const query of [{}, null, undefined, { token: '' }, { token: '   ' }, { token: [null] }, { token: 123 }]) {
    assert.equal(hasInvitationToken(query), false, `应判定为无 token: ${JSON.stringify(query)}`)
  }
})

test('带 token 的 setup 地址可以通过 redirect 安全校验', () => {
  assert.equal(
    resolveSafeRedirect('/space/setup?token=abc123'),
    '/space/setup?token=abc123',
  )
  assert.equal(
    resolveSafeRedirect(`/space/setup?token=${encodeURIComponent('a+b/c=d')}`),
    `/space/setup?token=${encodeURIComponent('a+b/c=d')}`,
  )
})
