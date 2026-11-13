import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

const spacePage = read('../pages/admin/AdminSpaceManage.vue')
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
