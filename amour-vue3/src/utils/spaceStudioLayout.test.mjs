import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

test('空间编辑页桌面端使用左侧纵向导航、右侧编辑内容', () => {
  const source = readSource('pages/frontend/SpaceStudioPage.vue')

  // 桌面端两栏：稳定宽度的左侧导航 + 可收缩的右侧编辑区。
  assert.match(source, /<aside\b/)
  assert.match(source, /lg:grid-cols-\[16rem_minmax\(0,1fr\)\]/)
  assert.match(source, /lg:sticky/)
  assert.match(source, /lg:flex-col/)
  // 小屏导航变为顶部横向滚动，不能产生横向溢出。
  assert.match(source, /overflow-x-auto/)
  assert.match(source, /lg:overflow-visible/)

  // 审核卡位于编辑区之前；保存结果由 teleport 弹窗展示，不再占用文档流。
  const reviewIndex = source.indexOf('<SpaceReviewStatusCard')
  const navIndex = source.indexOf('aria-label="空间编辑栏目"')
  const editorIndex = source.indexOf('<SpaceHomeEditor')
  assert.ok(source.includes('<SpaceSaveFeedbackDialog'), '缺少保存反馈弹窗组件')
  assert.ok(reviewIndex >= 0 && reviewIndex < navIndex, '审核状态卡应在栏目导航之前')
  assert.ok(editorIndex > navIndex, '栏目导航必须位于编辑内容之前')
  assert.doesNotMatch(source, /<SpaceSaveFeedback\b/)

  // 当前栏目、键盘焦点与无障碍语义。
  assert.match(source, /aria-current/)
  assert.match(source, /focus-visible:ring-2/)
  assert.match(source, /role="region"/)
  assert.match(source, /:aria-label="activeTabLabel"/)
  assert.match(source, /visibleTabs/)
  assert.match(source, /route\.query\.tab/)
  assert.match(source, /beforeunload/)
  assert.match(source, /onBeforeRouteLeave/)
  assert.match(source, /reviewRefreshKey/)
  assert.match(source, /dirtyAfterSave/)
})

test('前台编辑弹窗使用统一共享组件与全局样式', () => {  const dialog = readSource('components/frontend/space-studio/SpaceStudioDialog.vue')
  assert.match(dialog, /append-to-body/)
  assert.match(dialog, /destroy-on-close/)
  assert.match(dialog, /lock-scroll/)
  assert.match(dialog, /:close-on-click-modal="closeOnClickModal"/)
  assert.match(dialog, /closeOnClickModal: \{ type: Boolean, default: false \}/)
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
  assert.match(storyDialog, /@opened="handleNodeDialogOpened"/)
  assert.match(source, /function handleNodeDialogOpened\(\) \{\s*focusNodeTitle\(\)/)
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

  // 日期、预览、保存反馈和 dirty 逻辑继续存在。
  assert.match(source, /ThemeDatePicker/)
  assert.match(source, /previewDateTileStyle/)
  assert.doesNotMatch(source, /id="studio-anniversary-color"/)
  assert.match(source, /handleDialogBeforeClose/)
  assert.match(source, /focusTitle/)
  assert.match(source, /restoreDialogFocus/)
  assert.match(source, /emit\('saved', \{ \.\.\.feedback, dirtyAfterSave: dirty\.value \}\)/)
  assert.match(source, /有未保存的修改/)
})

test('新增/编辑表单标注必填与选填，并对自定义控件透传必填语义', () => {
  const story = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  assert.match(story, /章节名称[\s\S]{0,120}field-requirement">必填/)
  assert.match(story, /故事标题[\s\S]{0,120}field-requirement">必填/)
  assert.match(story, /所属章节[\s\S]{0,120}field-requirement">必填/)
  assert.match(story, /发生时间[\s\S]{0,120}field-requirement">必填/)
  assert.match(story, /正文[\s\S]{0,120}field-requirement">必填/)
  assert.match(story, /:required="true"/, '自定义选择器与日期控件需透传 required')
  assert.match(story, /aria-required="true"/)
  assert.match(story, /封面图片（选填）/)

  const photo = readSource('components/frontend/space-studio/SpacePhotoEditor.vue')
  assert.match(photo, /分类名称[\s\S]{0,120}field-requirement">必填/)
  assert.match(photo, /所属分类[\s\S]{0,120}field-requirement">必填/)
  assert.match(photo, /照片（必填）/)
  assert.match(photo, /标题[\s\S]{0,120}field-requirement-optional">选填/)
  assert.doesNotMatch(photo, /photoForm\.title\.trim\(\)\)\s*\{[\s\S]{0,80}照片标题不能为空/,
    '照片标题允许为空，不能改成必填')
  assert.match(photo, /:required="true"/)

  const anniversary = readSource('components/frontend/space-studio/SpaceAnniversaryEditor.vue')
  assert.match(anniversary, /名称[\s\S]{0,120}field-requirement">必填/)
  assert.match(anniversary, /日期[\s\S]{0,120}field-requirement">必填/)
  assert.match(anniversary, /mode="date"/)
  assert.match(anniversary, /纪念日只保存日期/)

  const select = readSource('components/frontend/space-studio/ThemeSelect.vue')
  assert.match(select, /:aria-required="required \? 'true' : 'false'"/)
  const datePicker = readSource('components/frontend/space-studio/ThemeDatePicker.vue')
  assert.match(datePicker, /'aria-required': props\.required \? 'true' : 'false'/)
  assert.match(datePicker, /:step="enableSeconds \? 1 : 60"/)
  assert.match(datePicker, /enableSeconds: \{ type: Boolean, default: false \}/)
  const imageField = readSource('components/frontend/space-studio/SpaceImageField.vue')
  assert.match(imageField, /:aria-required="required \? 'true' : 'false'"/)
})

test('故事与照片提供日期展示精度选择，并纳入表单快照与保存请求', () => {
  const options = readSource('utils/spaceContent.js')
  assert.match(options, /仅展示日期/)
  assert.match(options, /展示日期和时间/)
  assert.match(options, /SHOW_TIME_OPTIONS/)
  for (const relativePath of [
    'components/frontend/space-studio/SpaceStoryEditor.vue',
    'components/frontend/space-studio/SpacePhotoEditor.vue',
  ]) {
    const source = readSource(relativePath)
    assert.match(source, /SHOW_TIME_OPTIONS/)
    assert.match(source, /option\.label/)
    assert.match(source, /showTime: Boolean\(/)
    assert.match(source, /toBackendContentDateTime\(/)
    assert.match(source, /:enable-seconds=/)
  }
})

test('故事与纪念日展示统一使用默认主题色，不保留分类或章节配色', () => {
  const story = readSource('pages/frontend/OurStoryPage.vue')
  assert.match(story, /function chapterAccent\(\) \{\s*return DEFAULT_THEME_COLOR/)
  assert.doesNotMatch(story, /#f43f5e|colorCode/)

  const anniversary = readSource('pages/frontend/AnniversaryPage.vue')
  assert.match(anniversary, /function themeStyle\(\) \{\s*const accent = DEFAULT_THEME_COLOR/)
  assert.doesNotMatch(anniversary, /themePresets|colorCode/)

  const editor = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  assert.match(editor, /function tagStyle\(\) \{\s*const accent = DEFAULT_THEME_COLOR/)
  assert.doesNotMatch(editor, /tagStyle\([^)]/)
})
