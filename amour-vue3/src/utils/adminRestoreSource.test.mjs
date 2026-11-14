import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

const spacePage = read('../pages/admin/AdminSpaceManage.vue')
const spaceReviewPage = read('../pages/admin/AdminSpaceReviewManage.vue')
const spaceReviewApi = read('../api/admin/spaceReview.js')
const adminCss = read('../assets/admin.css')

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
