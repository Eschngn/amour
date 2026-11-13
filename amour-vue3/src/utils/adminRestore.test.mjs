import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADMIN_MESSAGE_BOX_CLASS,
  ADMIN_RESTORE_MESSAGE_BOX_CLASS,
  buildRestorePromptMessage,
  buildRestoreSuccessMessage,
  groupRestoreConflicts,
} from './adminRestore.js'

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

test('冲突空间按是否可自动关闭分组', () => {
  const grouped = groupRestoreConflicts([
    { spaceId: 1, autoClosable: true },
    { spaceId: 2, autoClosable: false },
    { spaceId: 3 },
  ])
  assert.deepEqual(grouped.autoClosable.map(item => item.spaceId), [1])
  assert.deepEqual(grouped.blocking.map(item => item.spaceId), [2, 3])
})
