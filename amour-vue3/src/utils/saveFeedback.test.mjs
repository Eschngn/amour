import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SAVE_FEEDBACK_DURATION_MS,
  SAVE_FEEDBACK_KIND,
  resolveSaveFeedback,
  saveFeedbackTitle,
} from './saveFeedback.js'
import { createFormSnapshot, isFormDirty } from './formBaseline.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readSource(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8')
}

test('已公开内容的修改保留后端“广场仍展示旧版本”语义', () => {
  const feedback = resolveSaveFeedback({
    reviewStatus: 'PENDING',
    published: true,
    reviewMessage: '修改已保存，当前广场仍展示旧版本',
  }, '故事已更新')

  assert.equal(feedback.kind, SAVE_FEEDBACK_KIND.STALE)
  assert.equal(feedback.message, '修改已保存，当前广场仍展示旧版本')
  assert.equal(feedback.published, true)
})

test('首次公开等待审核与旧版本继续展示可区分', () => {
  const pending = resolveSaveFeedback({
    reviewStatus: 'PENDING',
    published: false,
    reviewMessage: '已保存，等待审核后公开',
  }, '故事已创建')
  assert.equal(pending.kind, SAVE_FEEDBACK_KIND.PENDING)

  const removed = resolveSaveFeedback({
    reviewStatus: 'UNPUBLISHED',
    published: false,
    reviewMessage: '已从恋爱广场移除',
  }, '故事已更新')
  assert.equal(removed.kind, SAVE_FEEDBACK_KIND.REMOVED)
})

test('无审核提示的普通保存使用编辑器文案', () => {
  const feedback = resolveSaveFeedback({}, '照片已更新')
  assert.equal(feedback.kind, SAVE_FEEDBACK_KIND.SUCCESS)
  assert.equal(feedback.message, '照片已更新')
  assert.equal(feedback.reviewStatus, '')
})

test('无变化保存使用 unchanged 状态并保留后端说明', () => {
  const feedback = resolveSaveFeedback({
    changed: false,
    reviewStatus: 'PENDING',
    published: true,
    reviewMessage: '未检测到内容变化，未提交审核',
  }, '故事已更新')

  assert.equal(feedback.kind, SAVE_FEEDBACK_KIND.UNCHANGED)
  assert.equal(feedback.message, '未检测到内容变化，未提交审核')
})

test('反馈标题能区分成功、等待审核、旧版本、取消公开和未变化', () => {
  const titles = [
    SAVE_FEEDBACK_KIND.SUCCESS,
    SAVE_FEEDBACK_KIND.PENDING,
    SAVE_FEEDBACK_KIND.STALE,
    SAVE_FEEDBACK_KIND.REMOVED,
    SAVE_FEEDBACK_KIND.UNCHANGED,
  ].map(saveFeedbackTitle)

  assert.equal(new Set(titles).size, titles.length)
  assert.ok(titles.every(title => typeof title === 'string' && title.length > 0))
})

test('自动隐藏时间处于 6~8 秒区间', () => {
  assert.ok(SAVE_FEEDBACK_DURATION_MS >= 6000 && SAVE_FEEDBACK_DURATION_MS <= 8000)
})

test('保存反馈组件是普通文档流提示且具备无障碍语义', () => {
  const source = readSource('components/frontend/space-studio/SpaceSaveFeedback.vue')

  assert.match(source, /role="status"/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /aria-label="关闭保存提示"/)
  assert.match(source, /SAVE_FEEDBACK_DURATION_MS/)
  // 不允许 fixed / absolute 全屏遮罩，否则会覆盖桌面与移动端栏目按钮。
  assert.doesNotMatch(source, /\bfixed\b/)
  assert.doesNotMatch(source, /\babsolute\b/)
  assert.doesNotMatch(source, /\binset-0\b/)
})

test('保存反馈组件实际渲染为可读、可关闭的普通文档流提示', async () => {
  const { createServer } = await import('vite')
  const server = await createServer({
    configFile: resolve(ROOT, '..', 'vite.config.js'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  try {
    const component = await server.ssrLoadModule(
      '/src/components/frontend/space-studio/SpaceSaveFeedback.vue',
    )
    const { createSSRApp } = await import('vue')
    const { renderToString } = await import('vue/server-renderer')

    const html = await renderToString(createSSRApp(component.default, {
      notice: { message: '修改已保存，当前广场仍展示旧版本', kind: 'stale' },
    }))
    assert.match(html, /role="status"/)
    assert.match(html, /aria-live="polite"/)
    assert.match(html, /广场仍展示旧版本/)
    assert.match(html, /关闭保存提示/)
    assert.doesNotMatch(html, /\bfixed\b/)
    assert.doesNotMatch(html, /\binset-0\b/)

    const empty = await renderToString(createSSRApp(component.default, { notice: null }))
    assert.equal(empty.replace(/<!--.*?-->/g, '').trim(), '')
  } finally {
    await server.close()
  }
})

test('编辑页统一承接保存反馈，并放在栏目导航之前的普通文档流中', () => {
  const source = readSource('pages/frontend/SpaceStudioPage.vue')

  assert.match(source, /<SpaceSaveFeedback[^>]*:notice="saveFeedback"/)
  assert.equal((source.match(/@saved="onContentSaved"/g) || []).length, 4)
  assert.match(source, /function onContentSaved\(payload\)[\s\S]*?dirtyAfterSave/)
  const handlerBlock = source.slice(
    source.indexOf('function onContentSaved(payload)'),
    source.indexOf('function isTabAllowed(key)'),
  )
  assert.doesNotMatch(handlerBlock, /dirty\.value = false/,
    '保存反馈不能无条件清除 dirty，否则同栏目其他表单的未保存修改会被漏掉')

  // 栏目切换与离开页面的放弃确认必须继续保留。
  assert.match(source, /switchTab\([\s\S]*?confirmDiscard\('切换栏目会丢失当前未保存的修改，确定继续吗？'\)/)
  assert.match(source, /onBeforeRouteLeave\([\s\S]*?confirmDiscard\('离开编辑页会丢失当前未保存的修改，确定离开吗？'\)/)

  const feedbackIndex = source.indexOf('<SpaceSaveFeedback')
  const desktopNavIndex = source.indexOf('aria-label="空间编辑栏目"')
  const mobileNavIndex = source.lastIndexOf('aria-label="空间编辑栏目"')
  assert.ok(feedbackIndex > 0 && desktopNavIndex > feedbackIndex && mobileNavIndex > feedbackIndex)
})

test('四个内容编辑器保存成功后都派发 saved 事件', () => {
  const editors = [
    'components/frontend/space-studio/SpaceHomeEditor.vue',
    'components/frontend/space-studio/SpaceStoryEditor.vue',
    'components/frontend/space-studio/SpacePhotoEditor.vue',
    'components/frontend/space-studio/SpaceAnniversaryEditor.vue',
  ]

  for (const editor of editors) {
    const source = readSource(editor)
    assert.match(source, /defineEmits\(\['update:dirty', 'saved'\]\)/, editor)
    assert.match(source, /emit\('saved'/, editor)
  }
})

test('保存成功后编辑器会重建基线并上报保存后的 dirty 状态', () => {
  const storySource = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const saveNodeBlock = storySource.slice(
    storySource.indexOf('async function saveNode()'),
    storySource.indexOf('async function removeNode(node)'),
  )

  assert.match(saveNodeBlock, /await load\(\{ resetForms: false \}\)/)
  // 保存成功后先重建 clean 基线再关闭弹窗，关闭动画结束后才清空表单。
  assert.match(saveNodeBlock, /captureNodeBaseline\(\)/)
  assert.match(saveNodeBlock, /nodeDialogOpen\.value = false/)
  assert.match(saveNodeBlock, /emit\('saved', \{ \.\.\.feedback, dirtyAfterSave: dirty\.value \}\)/)
  assert.match(storySource, /function captureNodeBaseline\(\)[\s\S]*?emitDirty\(\)/)

  const editors = [
    'components/frontend/space-studio/SpaceHomeEditor.vue',
    'components/frontend/space-studio/SpaceStoryEditor.vue',
    'components/frontend/space-studio/SpacePhotoEditor.vue',
    'components/frontend/space-studio/SpaceAnniversaryEditor.vue',
  ]
  for (const editor of editors) {
    assert.match(readSource(editor), /dirtyAfterSave: dirty\.value/, editor)
  }
})

test('保存被保存表单后 clean 基线让 dirty 回到 false', () => {
  const savedSnapshot = { title: '故事', sortOrder: 20, coverImage: '' }
  const baseline = createFormSnapshot(savedSnapshot)
  assert.equal(isFormDirty(baseline, { ...savedSnapshot }), false)
})
