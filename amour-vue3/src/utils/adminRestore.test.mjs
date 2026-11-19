import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADMIN_MESSAGE_BOX_CLASS,
  ADMIN_RESTORE_MESSAGE_BOX_CLASS,
  buildArchiveRestorePromptMessage,
  buildArchiveRestoreSuccessMessage,
  buildRestorePromptMessage,
  buildRestoreSuccessMessage,
  createAdminRestoreFailureError,
  groupRestoreConflicts,
} from './adminRestore.js'
import { ADMIN_REASON_MAX_LENGTH, validateAdminReason } from './adminPrompt.js'

test('人工恢复弹窗使用后台专用 class，覆盖 append-to-body 的 MessageBox', () => {
  assert.equal(ADMIN_MESSAGE_BOX_CLASS, 'admin-message-box')
  assert.ok(ADMIN_RESTORE_MESSAGE_BOX_CLASS.split(' ').includes('admin-message-box'))
  assert.ok(ADMIN_RESTORE_MESSAGE_BOX_CLASS.split(' ').includes('admin-space-restore-message-box'))
})

test('恢复提示说明原空间、私密、冲突空间与拒绝条件', () => {
  const message = buildRestorePromptMessage({
    spaceName: '旧空间',
    conflictSpaceCount: 1,
    autoClosableConflictSpaceCount: 1,
  })
  assert.match(message, /旧空间/)
  assert.match(message, /正常且私密/)
  assert.match(message, /安全关闭/)
  assert.match(message, /拒绝恢复/)
  assert.match(message, /恢复原因/)
})

test('没有冲突时仍说明自动关闭规则', () => {
  const message = buildRestorePromptMessage({ spaceName: '旧空间' })
  assert.match(message, /若成员在解绑后创建了新的未绑定空间/)
  assert.doesNotMatch(message, /检测到 0 个/)
})

test('恢复成功提示包含被关闭的冲突空间 ID', () => {
  const message = buildRestoreSuccessMessage({
    closedConflictSpaces: [{ spaceId: 101 }, { spaceId: 102, spaceName: '新空间' }],
  })
  assert.match(message, /安全关闭 2 个冲突空间/)
  assert.match(message, /ID 101/)
  assert.match(message, /ID 102/)
})

test('没有自动关闭冲突空间时使用普通成功提示', () => {
  assert.equal(buildRestoreSuccessMessage(null), '情侣空间已恢复为正常且私密状态')
  assert.equal(
    buildRestoreSuccessMessage({ closedConflictSpaces: [] }),
    '情侣空间已恢复为正常且私密状态',
  )
})

test('后台原因校验与后端保持一致：trim 后必填且最多 500 字', () => {
  assert.equal(ADMIN_REASON_MAX_LENGTH, 500)
  assert.equal(validateAdminReason('   '), '请填写操作原因')
  assert.equal(validateAdminReason('内容需要复核'), true)
  assert.equal(validateAdminReason(' 内容需要复核 '), true)
  assert.equal(validateAdminReason('长'.repeat(500)), true)
  assert.equal(validateAdminReason('长'.repeat(501)), '操作原因不能超过 500 字')
})

test('冲突空间按是否可自动关闭分组', () => {
  const grouped = groupRestoreConflicts([
    { spaceId: 1, autoClosable: true },
    { spaceId: 2, autoClosable: false },
    { spaceId: 3 },
  ])
  assert.deepEqual(grouped.autoClosable.map(item => item.spaceId), [1])
  assert.deepEqual(grouped.blocking.map(item => item.spaceId), [2, 3])
})


// ============================== 销毁留档恢复 ==============================

test('从留档恢复的弹窗必须给出目标空间、销毁信息与留档内容，便于管理员确认不是错单', () => {
  const message = buildArchiveRestorePromptMessage({
    spaceName: '旧空间',
    spaceId: 3001,
    spaceCode: 'SP-3001',
    archiveRound: 2,
    destroyedAt: '2026-01-02 03:04:05',
    creatorDisplayName: '小恋',
    archiveStoryCount: 3,
    archivePhotoCount: 4,
    archiveMessageCount: 5,
    archiveAnniversaryCount: 6,
  })
  assert.match(message, /旧空间/)
  assert.match(message, /销毁时间：2026-01-02 03:04:05/)
  assert.match(message, /创建者：小恋/)
  assert.match(message, /故事 3/)
  assert.match(message, /照片 4/)
  assert.match(message, /留言 5/)
  assert.match(message, /纪念日 6/)
  // 恢复语义：回到等待绑定并保持私密，不会自动公开。
  assert.match(message, /等待绑定/)
  assert.match(message, /不会自动重新公开/)
  // 必须填写审计原因。
  assert.match(message, /恢复原因/)
})

test('留档弹窗在没有名称/创建者时使用占位符，不出现 undefined', () => {
  const message = buildArchiveRestorePromptMessage({ spaceId: 9 })
  assert.doesNotMatch(message, /undefined/)
  assert.match(message, /ID 9/)
  assert.match(message, /创建者：-/)
  assert.match(message, /销毁时间：-/)
})

test('留档存在冲突时弹窗必须明确说明会被拒绝，而不是让管理员以为能直接恢复', () => {
  const message = buildArchiveRestorePromptMessage({ spaceName: '旧空间', conflictCount: 2 })
  assert.match(message, /检测到 2 项冲突/)
  assert.match(message, /拒绝恢复/)
  assert.match(message, /先处理冲突/)

  // 没有冲突时不出现这条提示。
  assert.doesNotMatch(
    buildArchiveRestorePromptMessage({ spaceName: '旧空间' }),
    /检测到 0 项冲突/,
  )
})

test('留档恢复成功提示包含空间标识与恢复成员数', () => {
  assert.equal(
    buildArchiveRestoreSuccessMessage({
      spaceName: '旧空间',
      statusText: '等待绑定',
      restoredMemberCount: 1,
    }),
    '“旧空间”已从留档恢复为等待绑定状态，已恢复 1 名成员',
  )

  // 字段缺失时回退到后端默认语义「等待绑定」，不能出现 undefined。
  const fallback = buildArchiveRestoreSuccessMessage({ spaceName: '旧空间' })
  assert.match(fallback, /等待绑定/)
  assert.doesNotMatch(fallback, /undefined/)
  assert.doesNotMatch(fallback, /已恢复 0 名成员/)

  // 无名称时同样要能定位到空间。
  assert.match(buildArchiveRestoreSuccessMessage({ spaceId: 88 }), /ID 88/)
})

test('alreadyRestored 分支提示不会误报为「刚刚恢复」', () => {
  const message = buildArchiveRestoreSuccessMessage({ alreadyRestored: true, spaceName: '旧空间' })
  assert.match(message, /此前已恢复/)
  assert.match(message, /未重复写入/)
  assert.match(message, /刷新/)
  // 不能宣称成员被恢复（幂等重放没有写任何数据）。
  assert.doesNotMatch(message, /已恢复 \d+ 名成员/)
})

test('补齐内容时才提示内容条数', () => {
  const withContent = buildArchiveRestoreSuccessMessage({
    spaceName: '旧空间',
    restoredMemberCount: 1,
    restoredContentCount: 7,
  })
  assert.match(withContent, /已恢复 1 名成员/)
  assert.match(withContent, /补齐 7 条内容/)

  const withoutContent = buildArchiveRestoreSuccessMessage({
    spaceName: '旧空间',
    restoredMemberCount: 1,
    restoredContentCount: 0,
  })
  assert.doesNotMatch(withoutContent, /补齐/)
})

// ============================== 后台恢复失败分类 ==============================

test('业务失败必须保留 errorCode，才能触发详情与列表刷新', () => {
  // 后端 BusinessException 走 HTTP 200 + success=false：直接 throw 普通 Error 会丢掉 errorCode。
  const conflict = createAdminRestoreFailureError({
    success: false,
    errorCode: '20100',
    message: '存在无法自动处理的恢复冲突：成员已加入其它空间。请先处理冲突后再恢复',
  })
  assert.equal(conflict.message, '存在无法自动处理的恢复冲突：成员已加入其它空间。请先处理冲突后再恢复')
  assert.equal(conflict.response.data.errorCode, '20100')
  // errorCode 是页面刷新分支的唯一依据，必须完整保留。
  assert.equal(Boolean(conflict.response.data.errorCode), true)
  // 幂等/冲突错误码同样需要保留。
  for (const code of ['20098', '20099', '20100', '20101']) {
    const error = createAdminRestoreFailureError({ success: false, errorCode: code })
    assert.equal(error.response.data.errorCode, code)
  }

  // 缺失 message 时回退到兜底文案，仍然保留 errorCode。
  const noMessage = createAdminRestoreFailureError({ success: false, errorCode: '20101' }, '从留档恢复失败')
  assert.equal(noMessage.message, '从留档恢复失败')
  assert.equal(noMessage.response.data.errorCode, '20101')

  // 空响应体也要能安全包装：不能抛 TypeError，且明确没有 errorCode。
  const empty = createAdminRestoreFailureError(null, '从留档恢复失败')
  assert.equal(empty.message, '从留档恢复失败')
  assert.equal(empty.response.data.errorCode, undefined)
  assert.equal(Boolean(empty.response.data.errorCode), false)
})
