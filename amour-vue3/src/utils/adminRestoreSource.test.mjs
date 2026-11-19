import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

const spacePage = read('../pages/admin/AdminSpaceManage.vue')
const spaceReviewPage = read('../pages/admin/AdminSpaceReviewManage.vue')
const spaceReviewApi = read('../api/admin/spaceReview.js')
const adminCss = read('../assets/admin.css')
const adminRestore = read('../utils/adminRestore.js')

test('人工恢复 prompt 使用专用 class，请求期间禁用恢复按钮并防止旧详情覆盖', () => {
  assert.match(spacePage, /customClass:\s*ADMIN_RESTORE_MESSAGE_BOX_CLASS/)
  assert.match(spacePage, /:disabled="restoringId !== null"/)
  assert.match(spacePage, /restoringId === detail\.spaceId/)
  assert.match(spacePage, /detailSequence/)
  assert.match(spacePage, /await load\(\)/)
})

test('后台 MessageBox 输入框使用品牌 focus 环、错误态与移动端宽度', () => {
  assert.match(adminCss, /\.el-message-box\.admin-message-box\s*\{[^}]*width:\s*min\(440px,\s*calc\(100vw - 32px\)\)/)
  assert.match(adminCss, /\.admin-message-box \.el-message-box__input \.el-input__wrapper\.is-focus/)
  assert.match(adminCss, /\.admin-message-box \.el-message-box__input \.el-input\.invalid/)
  assert.match(adminCss, /\.admin-message-box \.el-message-box__message\s*\{[^}]*white-space:\s*pre-line/)
  // 焦点态必须提供可见的 box-shadow，而不是只做 outline:none
  assert.match(adminCss, /\.admin-message-box \.el-message-box__input \.el-input__wrapper\.is-focus[^{]*\{[^}]*box-shadow:\s*0 0 0 1px var\(--admin-brand\) inset/)
})

test('后台编辑弹窗与抽屉共享统一的输入 focus 样式', () => {
  assert.match(adminCss, /\.admin-dialog-surface \.el-input__wrapper\.is-focus/)
  assert.match(adminCss, /\.admin-dialog-surface \.el-textarea__inner:focus/)
  assert.match(adminCss, /\.admin-dialog-surface \.el-form-item\.is-error \.el-input__wrapper/)
})

test('存在输入的后台弹窗均声明 customClass，避免 scoped CSS 失效', () => {
  for (const path of [
    '../pages/admin/AdminSpaceManage.vue',
    '../pages/admin/AdminSpaceReviewManage.vue',
    '../pages/admin/AdminContentGovernance.vue',
    '../pages/admin/AdminUserManage.vue',
    '../pages/admin/AdminDictManage.vue',
  ]) {
    const source = read(path)
    if (/ElMessageBox\.(prompt|confirm)/.test(source)) {
      assert.match(source, /customClass:\s*ADMIN_(RESTORE_)?MESSAGE_BOX_CLASS/, `${path} 必须配置后台专用 customClass`)
    }
  }
})

test('空间审核抽屉挂到 body 并使用统一遮罩，避免被页面 transform 限制', () => {
  assert.match(spaceReviewPage, /class="admin-drawer admin-dialog-surface"/)
  assert.match(spaceReviewPage, /modal-class="admin-modal-overlay"/)
  assert.match(spaceReviewPage, /append-to-body/)
  assert.match(spaceReviewPage, /size="min\(1080px, calc\(100vw - 24px\)\)"/)
})

test('下架 / 驳回原因最多 500 字，确认按钮使用危险操作样式', () => {
  assert.match(spaceReviewPage, /inputType: 'textarea'/)
  assert.match(spaceReviewPage, /validateAdminReason/)
  assert.match(spaceReviewPage, /ADMIN_DANGER_CONFIRM_BUTTON_CLASS/)
  assert.match(spaceReviewPage, /ADMIN_REASON_MAX_LENGTH/)
  assert.match(adminCss, /\.admin-message-box__confirm--danger/)
})

test('空间审核使用独立按钮体系，驳回待审核项不再调用下架语义', () => {
  assert.match(spaceReviewPage, /admin-review-toolbar/)
  assert.match(spaceReviewPage, /admin-review-item-actions/)
  assert.match(spaceReviewPage, /CircleClose/)
  assert.match(spaceReviewPage, /驳回此项/)
  assert.doesNotMatch(spaceReviewPage, /下架该内容/)
  assert.match(spaceReviewPage, /rejectItem\(item\)/)
  assert.match(spaceReviewPage, /approveAll/)
  assert.match(spaceReviewApi, /itemType/)
  assert.match(spaceReviewApi, /itemId/)
  assert.match(adminCss, /\.admin-review-action\s*\{[^}]*gap:\s*6px/)
  assert.match(adminCss, /\.admin-review-action\s*\{[^}]*min-height:\s*36px/)
  assert.match(adminCss, /\n\.admin-table-action\s*\{[^}]*gap:\s*6px/)
  assert.doesNotMatch(adminCss, /\.admin-main \.admin-table-action\s*\{/)
})

test('后台弹层统一使用 drawer / dialog / overlay 规范', () => {
  assert.match(adminCss, /\.el-overlay\.admin-modal-overlay/)
  assert.match(adminCss, /\.admin-drawer \.el-drawer__title/)
  assert.match(adminCss, /\.admin-drawer \.el-drawer__body/)
  assert.match(adminCss, /\.admin-dialog \.el-dialog__body/)
  assert.match(adminCss, /\.admin-shell \.el-input__inner:focus/)
})

test('留档恢复的业务失败也要保留 errorCode，冲突后刷新列表与详情', () => {
  assert.match(spacePage, /createAdminRestoreFailureError\(data, '从留档恢复失败'\)/)
  assert.match(spacePage, /if \(e\.response\?\.data\?\.errorCode\) \{/)
  // 失败分支必须同时刷新详情与列表，不能只刷新其中一个。
  const archiveRestoreBlock = spacePage.slice(spacePage.indexOf('async function restoreArchive(row)'))
  const catchBlock = archiveRestoreBlock.slice(archiveRestoreBlock.indexOf('} catch (e) {'))
  assert.match(catchBlock, /openArchiveDetail\(\{ archiveId: row\.archiveId \}\)/)
  assert.match(catchBlock, /await loadArchives\(\)/)
})

test('后台恢复按钮按 SPACE_RESTORE 权限显隐，查询权限不能用于恢复', () => {
  // 两个权限常量必须分开：路由 meta 用 SPACE_QUERY，恢复按钮用 SPACE_RESTORE。
  const router = read('../router/index.js')
  const adminRoutes = router.slice(router.indexOf("path: 'space'"))
  assert.match(adminRoutes.slice(0, 400), /adminPermission: ADMIN_PERMISSIONS\.SPACE_QUERY/)
  assert.match(spacePage, /hasAdminPermission\(ADMIN_PERMISSIONS\.SPACE_RESTORE\)/)
  assert.doesNotMatch(spacePage, /SPACE_QUERY\)\s*\)/)
  // 恢复按钮必须受权限控制（不能只靠点击后的提示）。
  for (const guard of [
    /v-if="row\.status === 5 && canRestoreSpace"/,
    /v-if="!row\.restoredAt && canRestoreSpace"/,
    /v-if="!archiveDetail\.restoredAt && canRestoreSpace"/,
    /v-if="detail\.restore\?\.restorable && canRestoreSpace"/,
  ]) {
    assert.match(spacePage, guard)
  }
  // 无权限时点击仍要再次拦截，不能只依赖按钮隐藏。
  assert.match(spacePage, /当前账号没有从留档恢复空间的权限/)
})

test('留档详情展示完整性摘要、冲突与不可恢复原因，且不渲染正文', () => {
  assert.match(spacePage, /留档完整性/)
  assert.match(spacePage, /当前无法恢复/)
  assert.match(spacePage, /archiveDetail\.restoreBlockReason/)
  assert.match(spacePage, /恢复冲突（必须全部处理）/)
  assert.match(spacePage, /conflict\.typeText/)
  assert.match(spacePage, /conflict\.conflictSpaceName/)
  // 只展示数量与索引级摘要，不能引入正文/留言内容。
  assert.doesNotMatch(spacePage, /archiveDetail\.(storyContent|messageContent|contentHtml)/)
})

test('留档列表状态标签区分「已恢复 / 可恢复 / 存在冲突」并能展示阻止原因', () => {
  assert.match(spacePage, /row\.restoredAt \? '已恢复' : \(row\.restorable \? '可恢复' : '存在冲突'\)/)
  assert.match(spacePage, /v-if="!row\.restoredAt && row\.restoreBlockReason"/)
  // 已恢复的留档不再提供恢复按钮。
  assert.match(spacePage, /v-if="!row\.restoredAt && canRestoreSpace"/)
})

test('留档列表筛选、分页与详情入口齐备', () => {
  assert.match(spacePage, /archiveFilters\.keyword/)
  assert.match(spacePage, /archiveFilters\.restored/)
  assert.match(spacePage, /<el-option :value="false" label="未恢复" \/>/)
  assert.match(spacePage, /<el-option :value="true" label="已恢复" \/>/)
  assert.match(spacePage, /archiveCurrent/)
  assert.match(spacePage, /archiveTotalPages/)
  assert.match(spacePage, /@click="openArchiveDetail\(row\)"/)
  // 请求序号保护：旧响应不能覆盖新筛选结果。
  assert.match(spacePage, /archiveLoadSequence/)
  assert.match(spacePage, /archiveDetailSequence/)
})

test('留档恢复成功提示使用统一文案函数，alreadyRestored 不再误报', () => {
  assert.match(spacePage, /buildArchiveRestoreSuccessMessage\(\{/)
  assert.match(spacePage, /buildArchiveRestorePromptMessage\(row\)/)
  assert.match(adminRestore, /此前已恢复/)
  assert.match(adminRestore, /未重复写入/)
})

test('恢复成功后先刷新详情再刷新列表，确保抽屉不展示过期恢复资格', () => {
  const restoreBlock = spacePage.slice(spacePage.indexOf('async function restoreArchive(row)'))
  const successBlock = restoreBlock.slice(0, restoreBlock.indexOf('} catch (e) {'))
  const detailIndex = successBlock.indexOf('await openArchiveDetail(')
  const listIndex = successBlock.indexOf('await loadArchives()')
  assert.ok(detailIndex > -1 && listIndex > detailIndex, '详情刷新必须早于列表刷新')
})

test('空间列表可按 status=6（已销毁）筛选，并给出可区分的状态样式', () => {
  // 后端 AdminSpacePageReqVO 允许 status 取到 6；前端筛选必须能选中，
  // 否则管理员无法在列表里定位已销毁空间再跳转留档视图。
  assert.match(spacePage, /<el-option :value="6" label="已销毁（留档）" \/>/)
  assert.match(spacePage, /6: 'bg-stone-200 text-stone-700'/)
  // 列表不做恢复入口：恢复只能走留档视图（按 archiveId 操作）。
  assert.match(spacePage, /v-if="row\.status === 5 && canRestoreSpace"/)
})
