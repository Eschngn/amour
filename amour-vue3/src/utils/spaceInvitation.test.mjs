import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INVITATION_PATH,
  INVITEE_AMOUR_ID_MAX_LENGTH,
  buildCreateInvitationPayload,
  buildInvitationLink,
  buildRevokeInvitationPayload,
  canAcceptInvitation,
  describeInvitationBlock,
  extractInvitationToken,
  isInvitationRevocable,
  normalizeInvitationList,
  normalizeInviteeAmourId,
  parseInvitationTime,
  resolveInvitationAction,
  validateInviteeAmourId,
} from '../utils/spaceInvitation.js'

/**
 * 运行：npm run test:space-api
 *
 * 这些用例覆盖 src/api/space.js 依赖的纯规则：
 * 邀请令牌解析、邀请链接构造、创建/撤销请求体规整。
 * Axios 请求本身由 @/axios 拦截器统一处理，不放这里重复实现。
 */

// ============================== extractInvitationToken ==============================

test('从带 ?token= 的完整链接中解析令牌', () => {
  assert.equal(
    extractInvitationToken('https://amour.example.com/space/setup?token=abc123'),
    'abc123',
  )
})

test('从 /invitation/<token> 与 /space/invitation/<token> 路径中解析令牌', () => {
  assert.equal(
    extractInvitationToken('https://amour.example.com/invitation/tok-1'),
    'tok-1',
  )
  assert.equal(
    extractInvitationToken('https://amour.example.com/space/invitation/tok-2'),
    'tok-2',
  )
  assert.equal(
    extractInvitationToken('https://amour.example.com/invitation/tok-3/'),
    'tok-3',
  )
})

test('查询参数优先于路径上的令牌', () => {
  assert.equal(
    extractInvitationToken('https://amour.example.com/invitation/pathTok?token=queryTok'),
    'queryTok',
  )
})

test('链接中的令牌会被 URL 解码', () => {
  assert.equal(
    extractInvitationToken('https://amour.example.com/space/setup?token=a%2Bb%3Dc'),
    'a+b=c',
  )
  assert.equal(
    extractInvitationToken('https://amour.example.com/invitation/a%2Bb'),
    'a+b',
  )
})

test('支持只有查询串的片段与纯令牌', () => {
  assert.equal(extractInvitationToken('?token=onlyQuery'), 'onlyQuery')
  assert.equal(extractInvitationToken('/space/setup?token=relative&x=1'), 'relative')
  assert.equal(extractInvitationToken('sDCW74oF1iDTbH9LuxEjD-ogODe6ANnkMQeVjV1uDQ0'),
    'sDCW74oF1iDTbH9LuxEjD-ogODe6ANnkMQeVjV1uDQ0')
})

test('相对路径或普通路径原样返回，交由后端判定', () => {
  assert.equal(extractInvitationToken('/space/setup'), '/space/setup')
  assert.equal(extractInvitationToken('some/path/without-token'), 'some/path/without-token')
})

test('空白与非字符串输入统一返回空字符串', () => {
  assert.equal(extractInvitationToken(''), '')
  assert.equal(extractInvitationToken('   '), '')
  assert.equal(extractInvitationToken(null), '')
  assert.equal(extractInvitationToken(undefined), '')
  assert.equal(extractInvitationToken(123), '')
})

test('前后空白会被裁剪', () => {
  assert.equal(extractInvitationToken('  abc123  '), 'abc123')
  assert.equal(extractInvitationToken('  https://a.com/space/setup?token=abc  '), 'abc')
})

test('非法百分号编码不会抛异常', () => {
  assert.doesNotThrow(() => extractInvitationToken('https://a.com/invitation/%E0%A4%A'))
  assert.equal(extractInvitationToken('?token=%E0%A4%A'), '%E0%A4%A')
})

// ================================ buildInvitationLink ================================

test('用默认路径拼接邀请链接', () => {
  assert.equal(
    buildInvitationLink('abc123', { origin: 'https://amour.example.com' }),
    `https://amour.example.com${INVITATION_PATH}?token=abc123`,
  )
})

test('origin 末尾斜杠会被规整，路径可自定义', () => {
  assert.equal(
    buildInvitationLink('abc123', { origin: 'https://amour.example.com/', path: 'space/join' }),
    'https://amour.example.com/space/join?token=abc123',
  )
})

test('令牌中的特殊字符会被编码，且能原样解析回来', () => {
  const token = 'a+b/c=d e'
  const link = buildInvitationLink(token, { origin: 'https://amour.example.com' })
  assert.equal(link, 'https://amour.example.com/space/setup?token=a%2Bb%2Fc%3Dd%20e')
  assert.equal(extractInvitationToken(link), token)
})

test('缺少 origin 时生成站内相对链接', () => {
  assert.equal(buildInvitationLink('abc123'), '/space/setup?token=abc123')
})

test('空令牌返回空字符串，避免生成无效链接', () => {
  assert.equal(buildInvitationLink(''), '')
  assert.equal(buildInvitationLink('   '), '')
  assert.equal(buildInvitationLink(null), '')
  assert.equal(buildInvitationLink(undefined), '')
  assert.equal(buildInvitationLink(123), '')
})

// ========================= buildCreateInvitationPayload =========================

test('指定账号时带上 inviteeAmourId', () => {
  assert.deepEqual(buildCreateInvitationPayload('LY100002'), { inviteeAmourId: 'LY100002' })
  assert.deepEqual(buildCreateInvitationPayload('  LY100002  '), { inviteeAmourId: 'LY100002' })
})

test('空值、空白与非字符串都应省略 inviteeAmourId 以创建链接邀请', () => {
  for (const input of ['', '   ', null, undefined, 0, {}, []]) {
    assert.deepEqual(buildCreateInvitationPayload(input), {}, `输入 ${String(input)} 应生成空请求体`)
    assert.equal('inviteeAmourId' in buildCreateInvitationPayload(input), false)
  }
})

test('normalizeInviteeAmourId 只做去空格', () => {
  assert.equal(normalizeInviteeAmourId(' LY1 '), 'LY1')
  assert.equal(normalizeInviteeAmourId(''), '')
  assert.equal(normalizeInviteeAmourId(null), '')
  assert.equal(normalizeInviteeAmourId(undefined), '')
})

// ========================= buildRevokeInvitationPayload =========================

test('撤销请求体把字符串 ID 规整为数字', () => {
  assert.deepEqual(buildRevokeInvitationPayload(4002), { invitationId: 4002 })
  assert.deepEqual(buildRevokeInvitationPayload('4002'), { invitationId: 4002 })
})

test('非法邀请 ID 直接抛错，避免发出必然失败的请求', () => {
  for (const input of [0, -1, 1.5, 'abc', '', null, undefined, NaN, Infinity]) {
    assert.throws(() => buildRevokeInvitationPayload(input), TypeError, `输入 ${String(input)} 应抛错`)
  }
})

// =============================== 契约：可解析再构造 ===============================

test('构造出的链接可以被解析回原始令牌（往返一致）', () => {
  const tokens = ['abc', 'a+b', 'tok_en-123', 'x'.repeat(64), '含中文的令牌']
  for (const token of tokens) {
    const link = buildInvitationLink(token, { origin: 'http://localhost:5173' })
    assert.equal(extractInvitationToken(link), token, `令牌 ${token} 往返不一致`)
  }
})

// ============================== validateInviteeAmourId ==============================

test('空的恋语 ID 合法，表示创建链接邀请', () => {
  for (const input of ['', '   ', null, undefined]) {
    assert.equal(validateInviteeAmourId(input), '')
  }
})

test('恋语 ID 正好 20 个字符时通过校验', () => {
  assert.equal(validateInviteeAmourId('L'.repeat(INVITEE_AMOUR_ID_MAX_LENGTH)), '')
  assert.equal(validateInviteeAmourId(`  ${'L'.repeat(INVITEE_AMOUR_ID_MAX_LENGTH)}  `), '')
})

test('恋语 ID 超过 20 个字符时返回与后端一致的错误信息', () => {
  const tooLong = 'L'.repeat(INVITEE_AMOUR_ID_MAX_LENGTH + 1)
  assert.equal(validateInviteeAmourId(tooLong), '恋语 ID 不能超过 20 个字符')
  // 前后空格裁剪后再判断长度
  assert.equal(validateInviteeAmourId(`  ${tooLong}  `), '恋语 ID 不能超过 20 个字符')
})

// ============================== isInvitationRevocable ==============================

const NOW = new Date('2026-11-03T10:00:00').getTime()

test('待接受且未过期的邀请可以撤销', () => {
  assert.equal(isInvitationRevocable({ status: 0, expiresAt: '2026-11-10 10:00:00' }, NOW), true)
  assert.equal(isInvitationRevocable({ status: '0', expiresAt: '2026-11-03 10:00:01' }, NOW), true)
})

test('已过期、已接受、已撤销、已拒绝的邀请都不能撤销', () => {
  assert.equal(isInvitationRevocable({ status: 0, expiresAt: '2026-11-03 10:00:00' }, NOW), false)
  assert.equal(isInvitationRevocable({ status: 0, expiresAt: '2026-10-01 10:00:00' }, NOW), false)
  for (const status of [1, 2, 3, 4]) {
    assert.equal(isInvitationRevocable({ status, expiresAt: '2026-11-10 10:00:00' }, NOW), false)
  }
  assert.equal(isInvitationRevocable(null, NOW), false)
})

test('缺少 expiresAt 时按未过期处理，交给后端兜底', () => {
  assert.equal(isInvitationRevocable({ status: 0 }, NOW), true)
  assert.equal(isInvitationRevocable({ status: 0, expiresAt: '不是时间' }, NOW), true)
})

// ============================== parseInvitationTime ==============================

test('解析后端常见日期时间格式', () => {
  const expected = new Date(2026, 10, 3, 10, 24, 36).getTime()
  assert.equal(parseInvitationTime('2026-11-03 10:24:36'), expected)
  assert.equal(parseInvitationTime('2026-11-03T10:24:36'), expected)
  assert.equal(parseInvitationTime('2026-11-03 10:24'), new Date(2026, 10, 3, 10, 24, 0).getTime())
  assert.equal(parseInvitationTime('2026-11-03'), new Date(2026, 10, 3, 0, 0, 0).getTime())
})

test('无法解析的时间返回 null 而不是 Invalid Date', () => {
  for (const input of ['', '   ', null, undefined, 'abc', '2026/11/03', '2026-13-45 99:99:99']) {
    const result = parseInvitationTime(input)
    assert.ok(result === null || Number.isFinite(result), `输入 ${String(input)} 不应返回 NaN`)
  }
  assert.equal(parseInvitationTime('abc'), null)
  assert.equal(parseInvitationTime(null), null)
})

// ============================== normalizeInvitationList ==============================

test('列表规整：标记可撤销、是否定向和可复制链接', () => {
  const result = normalizeInvitationList([
    { invitationId: 1, status: 0, expiresAt: '2026-11-10 10:00:00', inviteeAmourId: 'LY100002', token: 'tok-1' },
    { invitationId: 2, status: 0, expiresAt: '2026-11-10 10:00:00', inviteeAmourId: null },
    { invitationId: 3, status: 1, expiresAt: '2026-11-10 10:00:00' },
  ], NOW)

  assert.equal(result.length, 3)
  assert.equal(result[0].revocable, true)
  assert.equal(result[0].isTargeted, true)
  assert.equal(result[0].canCopy, true)
  assert.equal(result[0].token, 'tok-1')
  assert.equal(result[1].isTargeted, false)
  assert.equal(result[1].canCopy, false, '旧数据没有令牌时不能标记为可复制')
  assert.equal(result[2].revocable, false)
  assert.equal(result[2].canCopy, false)
})

test('列表规整对非数组输入返回空数组', () => {
  for (const input of [null, undefined, {}, 'abc', 0]) {
    assert.deepEqual(normalizeInvitationList(input, NOW), [])
  }
})

// ============================== 链接构造与 Router 一致性 ==============================

test('buildInvitationLink 与 URLSearchParams 生成的查询串等价', () => {
  const token = 'a+b/c=d&e f'
  const link = buildInvitationLink(token, { origin: 'https://amour.example.com' })
  const parsed = new URL(link)
  assert.equal(parsed.pathname, '/space/setup')
  assert.equal(parsed.searchParams.get('token'), token)
  assert.equal(extractInvitationToken(link), token)
})

// ============================== canAcceptInvitation ==============================

test('只有登录且 joinable=true 才允许接受', () => {
  assert.equal(canAcceptInvitation({ joinable: true }, true), true)
  assert.equal(canAcceptInvitation({ joinable: true }, false), false, '未登录不能接受')
  assert.equal(canAcceptInvitation({ joinable: false }, true), false)
  assert.equal(canAcceptInvitation(null, true), false)
})

test('joinable 只认严格的 true，字符串或缺失都视为不可接受', () => {
  assert.equal(canAcceptInvitation({ joinable: 'true' }, true), false)
  assert.equal(canAcceptInvitation({ joinable: 1 }, true), false)
  assert.equal(canAcceptInvitation({}, true), false)
})

test('needLogin=true 时即使 joinable 也不接受', () => {
  assert.equal(canAcceptInvitation({ joinable: true, needLogin: true }, true), false)
  assert.equal(canAcceptInvitation({ joinable: true, needLogin: false }, true), true)
})

// ============================== resolveInvitationAction ==============================

test('未登录一律引导去登录', () => {
  assert.equal(resolveInvitationAction({ joinable: true, needLogin: true }, false), 'login')
  assert.equal(resolveInvitationAction({ joinable: true, needLogin: false }, false), 'login')
  assert.equal(resolveInvitationAction(null, false), 'login')
})

test('已登录且可加入时直接接受', () => {
  assert.equal(resolveInvitationAction({ joinable: true, needLogin: false }, true), 'accept')
})

test('已是成员或已在其他空间时提供回空间入口', () => {
  assert.equal(resolveInvitationAction({ joinable: false, alreadyMember: true }, true), 'space')
  assert.equal(resolveInvitationAction({ joinable: false, inOtherSpace: true }, true), 'space')
})

test('其余不可加入的情况回到恋爱广场', () => {
  assert.equal(resolveInvitationAction({ joinable: false, status: 3 }, true), 'plaza')
  assert.equal(resolveInvitationAction({ joinable: false, memberCount: 2, memberLimit: 2 }, true), 'plaza')
})

// ============================== describeInvitationBlock ==============================

test('优先使用后端 message', () => {
  const preview = { status: 3, message: '邀请已过期', alreadyMember: true }
  assert.equal(describeInvitationBlock(preview), '邀请已过期')
})

test('后端没有 message 时按字段兜底', () => {
  assert.equal(describeInvitationBlock({ alreadyMember: true }), '你已经是该情侣空间的成员')
  assert.equal(describeInvitationBlock({ inOtherSpace: true }), '你已加入其他情侣空间，无法重复加入')
  assert.equal(describeInvitationBlock({ memberCount: 2, memberLimit: 2 }), '情侣空间成员人数已达上限')
  assert.equal(describeInvitationBlock({ status: 1 }), '邀请已被接受')
  assert.equal(describeInvitationBlock({ status: 2 }), '邀请已被撤销')
  assert.equal(describeInvitationBlock({ status: 3 }), '邀请已过期')
  assert.equal(describeInvitationBlock({ status: 4 }), '邀请已被拒绝')
})

test('空白 message 视为没有说明', () => {
  assert.equal(describeInvitationBlock({ message: '   ', status: 3 }), '邀请已过期')
  assert.equal(describeInvitationBlock({ status: 0, joinable: true }), '')
  assert.equal(describeInvitationBlock(null), '')
})
