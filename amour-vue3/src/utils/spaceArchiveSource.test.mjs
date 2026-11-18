import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 管理控制台「已销毁空间留档」的源码级契约测试。
 *
 * 这些断言覆盖无法在 node:test 里直接渲染 Vue 单文件组件、但一旦回退就会造成
 * 权限或状态不同步的关键点：权限校验、loading/重复提交保护、恢复后刷新、
 * 审计原因必填，以及两端使用的 API 路径必须一致。
 */

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

const adminSpacePage = read('../pages/admin/AdminSpaceManage.vue')
const adminSpaceApi = read('../api/admin/space.js')
const adminRestore = read('../utils/adminRestore.js')
const spaceApi = read('../api/space.js')
const settingsPanel = read('../components/frontend/SpaceSettingsPanel.vue')
const spaceDestroy = read('../utils/spaceDestroy.js')

test('后台留档接口路径与后端控制器一致，且查询与恢复分离', () => {
  assert.match(adminSpaceApi, /\/admin\/space\/archive\/list/)
  assert.match(adminSpaceApi, /\/admin\/space\/archive\/detail/)
  assert.match(adminSpaceApi, /\/admin\/space\/archive\/restore/)
  // 恢复必须携带原因（后端强制审计）。
  assert.match(adminSpaceApi, /reason:\s*String\(reason \|\| ''\)\.trim\(\)/)
})

test('后台留档列表展示销毁时间、创建者与恢复状态', () => {
  assert.match(adminSpacePage, /已销毁空间（留档）/)
  assert.match(adminSpacePage, /row\.destroyedAt/)
  assert.match(adminSpacePage, /row\.creatorDisplayName/)
  assert.match(adminSpacePage, /row\.destroyedByDisplayName/)
  assert.match(adminSpacePage, /已恢复/)
  // 留档内容摘要必须给出数量，便于管理员确认目标空间。
  assert.match(adminSpacePage, /archiveContentTotal\(row\)/)
  assert.match(adminSpacePage, /fileResourceCount/)
})

test('后台恢复按钮按权限与可恢复状态禁用，并防重复提交', () => {
  assert.match(adminSpacePage, /hasAdminPermission\(ADMIN_PERMISSIONS\.SPACE_RESTORE\)/)
  assert.match(adminSpacePage, /:disabled="!row\.restorable \|\| restoringArchiveId !== null"/)
  assert.match(adminSpacePage, /:disabled="!archiveDetail\.restorable \|\| restoringArchiveId !== null"/)
  assert.match(adminSpacePage, /restoringArchiveId === row\.archiveId/)
  assert.match(adminSpacePage, /restoringArchiveId === archiveDetail\.archiveId/)
})

test('后台恢复必须填写原因，成功后刷新列表与详情', () => {
  assert.match(adminSpacePage, /customClass:\s*ADMIN_RESTORE_MESSAGE_BOX_CLASS/)
  assert.match(adminSpacePage, /inputValidator:\s*value => \(String\(value \|\| ''\)\.trim\(\)\.length > 0/)
  assert.match(adminSpacePage, /await loadArchives\(\)/)
  assert.match(adminSpacePage, /await openArchiveDetail\(\{ archiveId: row\.archiveId \}\)/)
  // 冲突失败也要刷新，避免继续展示过期的恢复资格。
  assert.match(adminSpacePage, /if \(e\.response\?\.data\?\.errorCode\)/)
})

test('留档详情展示冲突项与完整性摘要，避免显示正文内容', () => {
  assert.match(adminSpacePage, /archiveDetail\.conflicts/)
  assert.match(adminSpacePage, /archiveIntegrityItems/)
  // 只在详情里出现数量 / 索引级摘要，不引入正文渲染。
  assert.doesNotMatch(adminSpacePage, /archiveDetail\.storyContent/)
})

test('恢复弹窗文案说明恢复后回到等待绑定且保持私密', () => {
  assert.match(adminRestore, /buildArchiveRestorePromptMessage/)
  assert.match(adminRestore, /等待绑定/)
  assert.match(adminRestore, /不会自动重新公开/)
  assert.match(adminRestore, /冲突/)
  assert.match(adminRestore, /buildArchiveRestoreSuccessMessage/)
})

test('Web 端销毁接口与二次确认、提交锁、状态清理齐备', () => {
  assert.match(spaceApi, /\/space\/destroy/)
  assert.match(settingsPanel, /destroyCoupleSpace/)
  // 二次确认 + 输入固定文案。
  assert.match(settingsPanel, /ElMessageBox\.prompt\(buildDestroyPromptMessage/)
  assert.match(settingsPanel, /inputValidator:\s*validateDestroyConfirmInput/)
  // 提交锁从打开确认框之前开始，并禁用其它写操作。
  assert.match(settingsPanel, /busyAction\.value = 'destroy'/)
  assert.match(settingsPanel, /clearSpaceLocalCache\(\)/)
  assert.match(settingsPanel, /clearSpaceStatus\(\)/)
  assert.match(settingsPanel, /router\.push\('\/plaza'\)/)
  // 服务端状态类拒绝必须强制刷新。
  assert.match(settingsPanel, /isDestroyStateConflict/)
  assert.match(settingsPanel, /refreshSpaceStatusAfterLifecycleAction\(\{ force: true \}\)/)
})

test('销毁文案明确告知双方不可见、用户侧不可恢复、仅管理员可恢复', () => {
  assert.match(spaceDestroy, /另一半都不可见/)
  assert.match(spaceDestroy, /无法自行恢复/)
  assert.match(spaceDestroy, /平台管理员可以协助恢复/)
  assert.match(spaceDestroy, /DESTROY_CONFIRM_KEYWORD = '销毁'/)
})

test('销毁入口只在创建者且另一半未加入时展示', () => {
  assert.match(settingsPanel, /v-if="showDestroySection"/)
  assert.match(settingsPanel, /canShowDestroySection\(spaceStatus\.value\)/)
  assert.match(settingsPanel, /:disabled="busyAction !== '' \|\| !canDestroyNow"/)
})
