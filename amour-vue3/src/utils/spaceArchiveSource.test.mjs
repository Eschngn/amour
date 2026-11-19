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
const dangerZone = read('../components/frontend/space-settings/SpaceDangerZone.vue')
const spaceDestroy = read('../utils/spaceDestroy.js')
const spaceDestroyFlow = read('../utils/spaceDestroyFlow.js')
const spaceStateSource = read('../utils/spaceState.js')
const setupPage = read('../pages/frontend/SpaceSetupPage.vue')
const profilePage = read('../pages/frontend/UserProfilePage.vue')
const siteHeader = read('../components/frontend/SiteHeader.vue')

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
  // 销毁请求必须绑定当前页面展示的空间，避免延迟旧请求误伤新空间。
  assert.match(spaceApi, /export function destroyCoupleSpace\(space\)/)
  assert.match(spaceApi, /payload\.spaceId = spaceId/)
  assert.match(spaceApi, /payload\.expectedRevision = revision/)
  // 编排逻辑集中在 spaceDestroyFlow（可注入依赖、有真实行为测试），组件只负责传依赖。
  // 本次信息架构重构后销毁入口搬到危险操作区组件，依赖注入必须完整随迁。
  assert.match(dangerZone, /runDestroySpace\(\{/)
  assert.match(dangerZone, /requestDestroy: space => destroyCoupleSpace\(space\)/)
  assert.match(dangerZone, /clearCache: \(\) => clearSpaceLocalCache\(\)/)
  assert.match(dangerZone, /clearStatus: \(\) => clearSpaceStatus\(\)/)
  assert.match(dangerZone, /navigate: path => router\.push\(path\)/)
  // 二次确认 + 输入固定文案：定义在 flow 模块，组件调用它。
  assert.match(spaceDestroyFlow, /buildDestroyPromptMessage\(space\)/)
  assert.match(spaceDestroyFlow, /inputValidator: validateDestroyConfirmInput/)
  assert.match(dangerZone, /buildDestroyConfirmRequest\(/)
  assert.match(dangerZone, /ElMessageBox\.prompt\(request\.message/)
  // 提交锁：占锁动作与释放都在编排层，组件把 busyAction 接进去。
  assert.match(spaceDestroyFlow, /setBusyAction\('destroy'\)/)
  assert.match(spaceDestroyFlow, /setBusyAction\(''\)/)
  assert.match(dangerZone, /setBusyAction: action => setBusyAction\(action\)/)
  // 服务端状态类拒绝必须强制刷新。
  assert.match(spaceDestroyFlow, /isDestroyStateConflict/)
  assert.match(dangerZone, /refreshSpaceStatusAfterLifecycleAction\(\{ force: true \}\)/)
})

test('销毁文案明确告知双方不可见、用户侧不可恢复、仅管理员可恢复', () => {
  assert.match(spaceDestroy, /另一半都不可见/)
  assert.match(spaceDestroy, /无法自行恢复/)
  assert.match(spaceDestroy, /平台管理员可以协助恢复/)
  assert.match(spaceDestroy, /DESTROY_CONFIRM_KEYWORD = '销毁'/)
})

test('销毁入口只在创建者且另一半未加入时展示', () => {
  assert.match(dangerZone, /v-if="showDestroySection"/)
  assert.match(dangerZone, /canShowDestroySection\(spaceStatus\.value\)/)
  assert.match(dangerZone, /:disabled="busy \|\| !canDestroyNow"/)
})

test('危险操作区的父级条件只决定整块是否出现，不能吞掉销毁入口（真实渲染见 spaceSettingsRender.test.mjs）', () => {
  // 历史缺陷：外层区域条件只写了「可恢复或可解绑」，
  // 而「创建者 + 另一半尚未加入」时两者都为 false，销毁按钮被整层隐藏。
  // 现在外层只允许由「三个入口的并集」hasLifecycle 控制，且该并集必须包含 showDestroySection。
  const zoneOpen = dangerZone.indexOf('<section')
  const zoneTag = dangerZone.slice(zoneOpen, dangerZone.indexOf('>', zoneOpen) + 1)
  assert.match(zoneTag, /v-if="hasLifecycle"/, '危险操作区入口条件必须是 hasLifecycle')
  const hasLifecycleBlock = dangerZone.slice(
    dangerZone.indexOf('const hasLifecycle'),
    dangerZone.indexOf('const unbindPending'),
  )
  assert.match(hasLifecycleBlock, /isRestorableSpace\(spaceStatus\.value\)/)
  assert.match(hasLifecycleBlock, /showUnbindSection\.value/)
  assert.match(hasLifecycleBlock, /showDestroySection\.value/)
  // 销毁区域只能出现一次，且不再使用侧栏容器。
  assert.equal((dangerZone.match(/id="space-destroy"/g) || []).length, 1, '销毁入口只能有一个')
  assert.doesNotMatch(dangerZone, /<aside/)
  assert.doesNotMatch(dangerZone, /lg:sticky/)
})

test('销毁成功后按刷新结果收敛：刷新失败不报成销毁失败、不重发销毁、仍返回空间不伪造已销毁', () => {
  // 三种结果统一由纯函数判定，编排层只做分支，不在模板里拼状态。
  assert.match(spaceDestroyFlow, /resolveDestroySettleResult\(/)
  assert.match(spaceDestroyFlow, /DESTROY_SETTLE_RESULT\.REFRESH_FAILED/)
  assert.match(spaceDestroyFlow, /DESTROY_SETTLE_RESULT\.SPACE_STILL_PRESENT/)
  assert.match(spaceDestroyFlow, /DESTROY_REFRESH_FAILED_MESSAGE/)
  assert.match(spaceDestroyFlow, /DESTROY_SPACE_STILL_PRESENT_MESSAGE/)
  // 只有「确实没有空间」才清缓存、清共享状态、跳转：清缓存必须排在结局判定之后。
  const settleIndex = spaceDestroyFlow.indexOf('DESTROY_SETTLE_RESULT.SPACE_STILL_PRESENT')
  const clearIndex = spaceDestroyFlow.indexOf('clearCache()')
  assert.ok(settleIndex > -1 && clearIndex > settleIndex, '清缓存必须排在状态收敛判定之后')
  assert.match(spaceDestroy, /DESTROY_REFRESH_FAILED_MESSAGE = '销毁已提交，但状态刷新失败，请重新读取状态后再离开页面'/)
  // 刷新失败分支必须直接 return，不能落到自动重发销毁请求。
  assert.doesNotMatch(spaceDestroyFlow, /requestDestroy\([\s\S]{0,600}requestDestroy\(/)
  // 销毁失败处理不能调用会清登录态的接口。
  assert.doesNotMatch(spaceDestroyFlow, /clearFrontendSession/)
  assert.doesNotMatch(dangerZone, /clearFrontendSession/)
})

test('销毁后两端对 status=6 的展示一致：不再提供空间设置入口', () => {
  // 纯规则：status=5/6 都不是「用户仍然拥有的空间」。
  assert.match(spaceStateSource, /export function hasLiveSpace\(spaceStatus\)/)
  assert.match(spaceStateSource, /!isUnboundSpace\(spaceStatus\)/)
  assert.match(spaceStateSource, /!isDestroyedSpace\(spaceStatus\)/)
  // 页面与顶栏都必须复用同一规则，不能各自判断 status。
  assert.match(setupPage, /hasLiveSpace\(spaceStatus\.value\)/)
  assert.match(profilePage, /v-if="hasLiveSpace\(spaceStatus\)"/)
  assert.match(siteHeader, /hasLiveSpace\(spaceStatus\.value\)/)
})
