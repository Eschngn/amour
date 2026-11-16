import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RESTORED_TO_PUBLISHED_MESSAGE,
  SAVE_FEEDBACK_DURATION_MS,
  SAVE_FEEDBACK_KIND,
  UNCHANGED_EDIT_MESSAGE,
  resolveSaveFeedback,
  resolveUnchangedFeedback,
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

test('前端拦截无改动保存时使用统一提示与 unchanged 状态', () => {
  const feedback = resolveUnchangedFeedback()

  assert.equal(UNCHANGED_EDIT_MESSAGE, '当前编辑无改动，未提交审核')
  assert.equal(feedback.kind, SAVE_FEEDBACK_KIND.UNCHANGED)
  assert.equal(feedback.message, '当前编辑无改动，未提交审核')
  assert.equal(feedback.reviewStatus, '')
  assert.equal(feedback.published, null)
})

test('反馈标题能区分成功、等待审核、旧版本、取消公开、未变化和已恢复', () => {
  const titles = [
    SAVE_FEEDBACK_KIND.SUCCESS,
    SAVE_FEEDBACK_KIND.PENDING,
    SAVE_FEEDBACK_KIND.STALE,
    SAVE_FEEDBACK_KIND.REMOVED,
    SAVE_FEEDBACK_KIND.UNCHANGED,
    SAVE_FEEDBACK_KIND.RESTORED,
  ].map(saveFeedbackTitle)

  assert.equal(new Set(titles).size, titles.length)
  assert.ok(titles.every(title => typeof title === 'string' && title.length > 0))
})

test('改回公开版本时展示已恢复提示，不能提示成新的审核提交', () => {
  const feedback = resolveSaveFeedback({
    changed: true,
    restoredToPublished: true,
    reviewStatus: 'PUBLISHED',
    published: true,
    reviewMessage: '已恢复为当前公开版本，本次未产生新的审核项',
  }, '故事已更新')

  assert.equal(feedback.kind, SAVE_FEEDBACK_KIND.RESTORED)
  assert.equal(saveFeedbackTitle(feedback.kind), '已恢复公开版本')
  assert.equal(feedback.message, '已恢复为当前公开版本，本次未产生新的审核项')
  assert.notEqual(feedback.kind, SAVE_FEEDBACK_KIND.PENDING)
  assert.notEqual(feedback.kind, SAVE_FEEDBACK_KIND.STALE)
})

test('首页恢复公开版本时使用 reviewRestored 标记与统一文案', () => {
  const feedback = resolveSaveFeedback({
    reviewPending: false,
    reviewRestored: true,
    reviewMessage: '',
  }, '空间首页已保存')

  assert.equal(feedback.kind, SAVE_FEEDBACK_KIND.RESTORED)
  assert.equal(feedback.message, RESTORED_TO_PUBLISHED_MESSAGE)
})

test('恢复标记优先于后端的 changed=false 与待审核状态', () => {
  const feedback = resolveSaveFeedback({
    changed: false,
    restoredToPublished: true,
    reviewStatus: 'PENDING',
    published: true,
  })

  assert.equal(feedback.kind, SAVE_FEEDBACK_KIND.RESTORED)
  assert.equal(feedback.message, RESTORED_TO_PUBLISHED_MESSAGE)
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
  assert.equal((source.match(/@saved="onContentSaved"/g) || []).length, 5)
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

test('五个内容编辑器保存成功后都派发 saved 事件', () => {
  const editors = [
    'components/frontend/space-studio/SpaceHomeEditor.vue',
    'components/frontend/space-studio/SpaceStoryEditor.vue',
    'components/frontend/space-studio/SpacePhotoEditor.vue',
    'components/frontend/space-studio/SpaceAnniversaryEditor.vue',
    'components/frontend/space-studio/SpaceMessageEditor.vue',
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
    'components/frontend/space-studio/SpaceMessageEditor.vue',
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

test('保存后刷新审核状态卡，恢复公开版本也视为审核状态变化', () => {
  const source = readSource('pages/frontend/SpaceStudioPage.vue')

  assert.match(source, /<SpaceReviewStatusCard[^>]*:refresh-key="reviewRefreshKey"/)
  const block = source.slice(
    source.indexOf('function onContentSaved(payload)'),
    source.indexOf('function showSaveFeedback(payload)'),
  )
  assert.match(block, /payload\?\.reviewStatus \|\| payload\?\.kind === SAVE_FEEDBACK_KIND\.RESTORED/)
  assert.match(block, /reviewRefreshKey\.value \+= 1/)
  assert.doesNotMatch(block, /ElMessage\.success/)
})

/** 取从签名到函数收尾 `}` 的源码片段，用于检查单个函数内的成功/失败分支。 */
function readFunction(source, signature) {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `缺少函数：${signature}`)
  const end = source.indexOf('\n}', start)
  assert.ok(end > start, `无法定位函数结尾：${signature}`)
  return source.slice(start, end + 2)
}

test('空间首页保存成功、失败分别走 saved 与行内错误', () => {
  const source = readSource('components/frontend/space-studio/SpaceHomeEditor.vue')
  const block = readFunction(source, 'async function save()')

  assert.match(block, /resolveSaveFeedback\(data, '空间首页已保存'\)/)
  assert.match(block, /emit\('saved'/)
  assert.match(block, /captureSnapshot\(\)/)
  assert.doesNotMatch(block, /ElMessage\.success/)

  const catchBlock = block.slice(block.indexOf('} catch (error) {'))
  assert.match(catchBlock, /saveError\.value = readContentErrorMessage\(error, '空间首页保存失败，请稍后重试'\)/)
  assert.doesNotMatch(catchBlock, /emit\('saved'/)
})

test('故事章节与故事节点的新增、编辑成功都派发 saved', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const chapterBlock = readFunction(source, 'async function saveChapter()')
  const nodeBlock = readFunction(source, 'async function saveNode()')

  assert.match(chapterBlock, /chapterForm\.id \? '章节已更新' : '章节已创建'/)
  assert.match(chapterBlock, /emit\('saved'/)
  assert.doesNotMatch(chapterBlock, /ElMessage\.success/)

  assert.match(nodeBlock, /wasEditing \? '故事已保存' : '故事已创建'/)
  assert.match(nodeBlock, /emit\('saved'/)
  assert.doesNotMatch(nodeBlock, /ElMessage\.success/)
  // 失败时保留弹窗与输入，不派发成功反馈。
  const nodeCatch = nodeBlock.slice(nodeBlock.indexOf('} catch (error) {'))
  assert.match(nodeCatch, /nodeError\.value = message/)
  assert.doesNotMatch(nodeCatch, /emit\('saved'|nodeDialogOpen\.value = false|resetNodeForm/)

  assert.match(source, /emitSimpleSaved\('章节顺序已保存'\)/)
  assert.match(source, /emitSimpleSaved\('顺序已保存'\)/)
  assert.match(source, /emitSimpleSaved\('章节已删除'\)/)
  assert.match(source, /emitSimpleSaved\('故事已删除'\)/)
})

test('照片分类与照片的新增、编辑成功都派发 saved', () => {
  const source = readSource('components/frontend/space-studio/SpacePhotoEditor.vue')
  const categoryBlock = readFunction(source, 'async function saveCategory()')
  const photoBlock = readFunction(source, 'async function savePhoto()')

  assert.match(categoryBlock, /categoryForm\.id \? '分类已更新' : '分类已创建'/)
  assert.match(categoryBlock, /emit\('saved'/)
  assert.doesNotMatch(categoryBlock, /ElMessage\.success/)
  assert.match(categoryBlock, /categoryDialogOpen\.value = false/)
  assert.match(categoryBlock, /resetCategoryForm\(\)/)

  assert.match(photoBlock, /photoForm\.id \? '照片已更新' : '照片已添加'/)
  assert.match(photoBlock, /emit\('saved'/)
  assert.doesNotMatch(photoBlock, /ElMessage\.success/)
  assert.match(photoBlock, /photoDialogOpen\.value = false/)
  assert.match(photoBlock, /resetPhotoForm\(\)/)

  const photoCatch = photoBlock.slice(photoBlock.indexOf('} catch (error) {'))
  assert.match(photoCatch, /photoError\.value = readContentErrorMessage/)
  assert.doesNotMatch(photoCatch, /emit\('saved'|photoDialogOpen\.value = false|resetPhotoForm/)

  assert.match(source, /emitSimpleSaved\('分类顺序已保存'\)/)
  assert.match(source, /emitSimpleSaved\('顺序已保存'\)/)
  assert.match(source, /emitSimpleSaved\('分类已删除'\)/)
  assert.match(source, /emitSimpleSaved\('照片已删除'\)/)
})

test('纪念日新增、编辑、排序与删除成功都派发 saved', () => {
  const source = readSource('components/frontend/space-studio/SpaceAnniversaryEditor.vue')
  const saveBlock = readFunction(source, 'async function save()')

  assert.match(saveBlock, /form\.id \? '纪念日已更新' : '纪念日已创建'/)
  assert.match(saveBlock, /emit\('saved'/)
  assert.doesNotMatch(saveBlock, /ElMessage\.success/)
  assert.match(saveBlock, /dialogOpen\.value = false/)
  assert.match(saveBlock, /resetForm\(\)/)

  const catchBlock = saveBlock.slice(saveBlock.indexOf('} catch (err) {'))
  assert.match(catchBlock, /error\.value = readContentErrorMessage/)
  assert.doesNotMatch(catchBlock, /emit\('saved'|dialogOpen\.value = false|resetForm/)

  assert.match(source, /emitSimpleSaved\('纪念日顺序已保存'\)/)
  assert.match(source, /emitSimpleSaved\('纪念日已删除'\)/)
})

test('留言发布、回复、删除成功都派发 saved，失败只写行内错误', () => {
  const source = readSource('components/frontend/space-studio/SpaceMessageEditor.vue')

  assert.match(source, /function emitSaved\(message\)/)
  assert.match(source, /emitSaved\('留言已发布'\)/)
  assert.match(source, /emitSaved\('回复已发送'\)/)
  assert.match(source, /emitSaved\('留言已删除'\)/)
  assert.match(source, /emitSaved\('回复已删除'\)/)
  assert.doesNotMatch(source, /ElMessage\.success/)

  for (const [signature, errorField, fallback] of [
    ['async function publish()', 'publishError', '留言发布失败，请稍后重试'],
    ['async function submitReply()', 'actionError', '回复失败，请稍后重试'],
    ['async function removeMessage(message)', 'actionError', '删除留言失败，请稍后重试'],
    ['async function removeReply(reply)', 'actionError', '删除回复失败，请稍后重试'],
  ]) {
    const block = readFunction(source, signature)
    const catchBlock = block.slice(block.indexOf('} catch (error) {'))
    assert.match(catchBlock, new RegExp(`${errorField}\\.value = readContentErrorMessage\\(error, '${fallback}'\\)`))
    assert.doesNotMatch(catchBlock, /emitSaved\(/)
  }
})

test('空间编辑页为全部编辑器绑定 saved，并在同一处展示反馈', () => {
  const source = readSource('pages/frontend/SpaceStudioPage.vue')

  for (const editor of [
    'SpaceHomeEditor',
    'SpaceStoryEditor',
    'SpaceMessageEditor',
    'SpacePhotoEditor',
    'SpaceAnniversaryEditor',
  ]) {
    const start = source.indexOf(`<${editor}`)
    assert.ok(start >= 0, `缺少编辑器：${editor}`)
    const end = source.indexOf('/>', start)
    const block = source.slice(start, end)
    assert.match(block, /@saved="onContentSaved"/, editor)
    assert.match(block, /@update:dirty="setDirty"/, editor)
  }

  // 保存提示只能有一处：不允许再通过全局 success toast 重复提示。
  const feedbackBlock = source.slice(
    source.indexOf('function onContentSaved(payload)'),
    source.indexOf('function isTabAllowed(key)'),
  )
  assert.match(feedbackBlock, /saveFeedback\.value = \{/)
  assert.doesNotMatch(feedbackBlock, /ElMessage\.success/)
})
