import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

test('空间编辑页使用全宽栏目导航且不再渲染左侧 aside', () => {
  const source = readSource('pages/frontend/SpaceStudioPage.vue')

  assert.doesNotMatch(source, /<aside\b/)
  assert.doesNotMatch(source, /lg:grid-cols-\[15rem_minmax/)
  assert.doesNotMatch(source, /lg:sticky/)

  const feedbackIndex = source.indexOf('<SpaceSaveFeedback')
  const navIndex = source.indexOf('aria-label="空间编辑栏目"')
  const editorIndex = source.indexOf('<SpaceHomeEditor')
  assert.ok(feedbackIndex >= 0, '缺少保存反馈组件')
  assert.ok(navIndex > feedbackIndex, '栏目导航必须位于保存反馈之后')
  assert.ok(editorIndex > navIndex, '栏目导航必须位于编辑内容之前')

  // 移动端横向滚动、桌面端自动换行，并保留 active 与键盘语义。
  assert.match(source, /overflow-x-auto/)
  assert.match(source, /sm:flex-wrap/)
  assert.match(source, /aria-current/)
  assert.match(source, /visibleTabs/)
  assert.match(source, /route\.query\.tab/)
  assert.match(source, /beforeunload/)
  assert.match(source, /onBeforeRouteLeave/)
  assert.match(source, /reviewRefreshKey/)
  assert.match(source, /dirtyAfterSave/)
})

test('前台编辑弹窗使用统一共享组件与全局样式', () => {
  const dialog = readSource('components/frontend/space-studio/SpaceStudioDialog.vue')
  assert.match(dialog, /append-to-body/)
  assert.match(dialog, /destroy-on-close/)
  assert.match(dialog, /lock-scroll/)
  assert.match(dialog, /close-on-click-modal="false"/)
  assert.match(dialog, /class="space-studio-dialog"/)
  assert.match(dialog, /modal-class="space-studio-dialog-overlay"/)
  assert.match(dialog, /hasOpenPopup/)
  assert.match(dialog, /skipNextEscapeClose/)
  assert.match(dialog, /:close-on-press-escape="closeOnPressEscape"/)

  // fullscreen 由共享弹窗透传给 el-dialog，章节弹窗不受影响。
  assert.match(dialog, /fullscreen: \{ type: Boolean, default: false \}/)
  assert.match(dialog, /:fullscreen="fullscreen"/)

  const css = readSource('assets/main.css')
  assert.match(css, /\.space-studio-dialog\b/)
  assert.match(css, /\.space-studio-dialog-overlay\b/)
  assert.match(css, /max-height: calc\(100vh - 180px\)/)

  // 全屏样式：占满视口、无圆角、头尾固定、中间区域独立滚动。
  assert.match(css, /\.el-dialog\.space-studio-dialog\.is-fullscreen/)
  assert.match(css, /height: 100dvh/)
  assert.match(css, /max-width: 100vw/)
  assert.match(css, /border-radius: 0/)
  assert.match(css, /\.space-studio-dialog\.is-fullscreen \.el-dialog__body/)
  assert.match(css, /min-height: 0/)
  assert.match(css, /overflow-y: auto/)
  assert.match(css, /flex: 1 1 auto/)
})

test('故事编辑页全屏时保留 Escape、关闭确认与 body 滚动锁定', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const storyDialog = source.slice(
    source.indexOf('<!-- 故事新增 / 编辑弹窗'),
    source.indexOf('</SpaceStudioDialog>', source.indexOf('<!-- 故事新增 / 编辑弹窗')),
  )

  assert.match(storyDialog, /\bfullscreen\b/)
  assert.match(storyDialog, /:before-close="handleNodeDialogBeforeClose"/)
  assert.match(storyDialog, /@closed="handleNodeDialogClosed"/)
  assert.match(storyDialog, /@opened="focusNodeTitle"/)
  assert.match(storyDialog, /id="studio-story-form"/)

  const dialog = readSource('components/frontend/space-studio/SpaceStudioDialog.vue')
  assert.match(dialog, /document\.body\.classList\.add\('space-studio-dialog-open'\)/)
  assert.match(dialog, /lock-scroll/)
})

test('相册编辑器和分类编辑器改为弹窗且页面不再保留内嵌表单', () => {
  const source = readSource('components/frontend/space-studio/SpacePhotoEditor.vue')

  assert.match(source, /<SpaceStudioDialog/)
  assert.match(source, /id="studio-photo-form"/)
  assert.match(source, /id="studio-category-form"/)
  assert.doesNotMatch(source, /id="photo-form"/)
  assert.doesNotMatch(source, /scrollIntoView/)
  assert.doesNotMatch(source, /xl:grid-cols-\[minmax\(0,1\.12fr\)/)
  assert.doesNotMatch(source, /xl:sticky/)

  // 预览、上传、分页与保存反馈继续存在。
  assert.match(source, /SpaceImagePreview/)
  assert.match(source, /SpaceImageField/)
  assert.match(source, /totalPages/)
  assert.match(source, /handlePhotoDialogBeforeClose/)
  assert.match(source, /handleCategoryDialogBeforeClose/)
  assert.match(source, /focusPhotoTitle/)
  assert.match(source, /restoreDialogFocus/)
  assert.match(source, /emit\('saved', \{ \.\.\.feedback, dirtyAfterSave: dirty\.value \}\)/)
})

test('纪念日编辑器改为弹窗且页面不再保留内嵌表单', () => {
  const source = readSource('components/frontend/space-studio/SpaceAnniversaryEditor.vue')

  assert.match(source, /<SpaceStudioDialog/)
  assert.match(source, /id="studio-anniversary-form"/)
  assert.doesNotMatch(source, /id="anniversary-form"/)
  assert.doesNotMatch(source, /scrollIntoView/)
  assert.doesNotMatch(source, /xl:grid-cols-\[minmax\(0,0\.92fr\)/)

  // 日期、主题色预览、保存反馈和 dirty 逻辑继续存在。
  assert.match(source, /ThemeDatePicker/)
  assert.match(source, /previewDateTileStyle/)
  assert.match(source, /handleDialogBeforeClose/)
  assert.match(source, /focusTitle/)
  assert.match(source, /restoreDialogFocus/)
  assert.match(source, /emit\('saved', \{ \.\.\.feedback, dirtyAfterSave: dirty\.value \}\)/)
  assert.match(source, /有未保存的修改/)
})
