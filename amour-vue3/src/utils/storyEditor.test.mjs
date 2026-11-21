import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  STORY_CONTENT_MAX_LENGTH,
  STORY_EDITOR_FOOTERS,
  STORY_EDITOR_TOOLBARS,
  STORY_IMAGE_MAX_SIZE,
  isStoryContentEmpty,
  isStoryContentTooLong,
  uploadStoryImages,
  validateStoryImage,
} from './storyEditor.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

/** 截取故事新增 / 编辑弹窗的模板片段，避免章节弹窗干扰断言。 */
function readStoryDialogBlock() {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const start = source.indexOf('<!-- 故事新增 / 编辑弹窗')
  const end = source.indexOf('</SpaceStudioDialog>', start)
  assert.ok(start >= 0 && end > start, '缺少故事新增 / 编辑弹窗')
  return source.slice(start, end)
}

test('故事正文工具栏保留常用 Markdown 工具并支持插入图片', () => {
  for (const item of [
    'title',
    'bold',
    'italic',
    'quote',
    'unorderedList',
    'orderedList',
    'task',
    'code',
    'link',
    'image',
    'revoke',
    'next',
    'preview',
  ]) {
    assert.ok(STORY_EDITOR_TOOLBARS.includes(item), `工具栏缺少 ${item}`)
  }
  for (const item of ['mermaid', 'katex']) {
    assert.ok(!STORY_EDITOR_TOOLBARS.includes(item), `工具栏不应包含 ${item}`)
  }
  assert.ok(STORY_EDITOR_FOOTERS.includes('markdownTotal'))
})

test('正文限制为 20000 字并提供空正文校验', () => {
  assert.equal(STORY_CONTENT_MAX_LENGTH, 20000)
  assert.equal(isStoryContentEmpty('   \n  '), true)
  assert.equal(isStoryContentEmpty('那天的天气很好。'), false)
  assert.equal(isStoryContentTooLong('字'.repeat(STORY_CONTENT_MAX_LENGTH)), false)
  assert.equal(isStoryContentTooLong('字'.repeat(STORY_CONTENT_MAX_LENGTH + 1)), true)
})

test('图片上传前预检类型与 5MB 大小', () => {
  assert.equal(validateStoryImage({ type: 'image/jpeg', size: 1024 }), '')
  assert.equal(validateStoryImage({ type: 'image/png', size: 1024 }), '')
  assert.equal(validateStoryImage({ type: 'image/webp', size: 1024 }), '')
  assert.equal(validateStoryImage({ type: 'image/gif', size: 1024 }), '')
  assert.equal(validateStoryImage({ type: 'image/svg+xml', size: 1024 }), '只支持 JPG、PNG、WebP 或 GIF 图片')
  assert.equal(validateStoryImage(null), '只支持 JPG、PNG、WebP 或 GIF 图片')
  assert.equal(
    validateStoryImage({ type: 'image/png', size: STORY_IMAGE_MAX_SIZE + 1 }),
    '图片不能超过 5MB',
  )
})

test('多张图片全部上传成功后才返回可用于正文的地址', async () => {
  const uploaded = []
  const urls = await uploadStoryImages(
    [
      { name: 'a.png', type: 'image/png', size: 10 },
      { name: 'b.webp', type: 'image/webp', size: 20 },
    ],
    async (file) => {
      uploaded.push(file.name)
      return { url: `https://cdn.example.com/${file.name}` }
    },
  )

  assert.deepEqual(uploaded, ['a.png', 'b.webp'])
  assert.deepEqual(urls, ['https://cdn.example.com/a.png', 'https://cdn.example.com/b.webp'])
})

test('任意一张图片失败时不返回部分地址，也不插入无效 Markdown', async () => {
  const files = [
    { name: 'ok.png', type: 'image/png', size: 10 },
    { name: 'bad.png', type: 'image/png', size: 20 },
  ]

  await assert.rejects(
    () => uploadStoryImages(files, async (file) => {
      if (file.name === 'bad.png') throw new Error('图片上传失败')
      return { url: 'https://cdn.example.com/ok.png' }
    }),
    /图片上传失败/,
  )

  await assert.rejects(
    () => uploadStoryImages([{ name: 'x.png', type: 'image/png', size: 10 }], async () => ({ url: '' })),
    /没有返回图片地址/,
  )

  await assert.rejects(() => uploadStoryImages([], async () => ({})), /没有可上传的图片/)
  await assert.rejects(
    () => uploadStoryImages([{ name: 'x.svg', type: 'image/svg+xml', size: 10 }], async () => ({ url: 'https://x' })),
    /只支持 JPG/,
  )
})

test('故事弹窗启用全屏，章节弹窗保持原有尺寸', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const storyDialog = source.slice(
    source.indexOf('<!-- 故事新增 / 编辑弹窗'),
    source.indexOf('</SpaceStudioDialog>', source.indexOf('<!-- 故事新增 / 编辑弹窗')),
  )
  const chapterDialog = source.slice(
    source.indexOf('<!-- 章节新增 / 编辑弹窗'),
    source.indexOf('</SpaceStudioDialog>', source.indexOf('<!-- 章节新增 / 编辑弹窗')),
  )

  assert.match(storyDialog, /\bfullscreen\b/)
  assert.doesNotMatch(storyDialog, /width="min\(960px/)
  assert.doesNotMatch(chapterDialog, /\bfullscreen\b/)
  assert.match(chapterDialog, /width="min\(640px/)

  const dialog = readSource('components/frontend/space-studio/SpaceStudioDialog.vue')
  assert.match(dialog, /fullscreen: \{ type: Boolean, default: false \}/)
  assert.match(dialog, /:fullscreen="fullscreen"/)
})

test('故事弹窗只保留一个保存提交动作，不再提供连续编辑', () => {
  const dialogBlock = readStoryDialogBlock()

  assert.equal((dialogBlock.match(/type="submit"/g) || []).length, 1)
  assert.match(dialogBlock, /form="studio-story-form"/)
  assert.match(dialogBlock, /创建故事/)
  assert.match(dialogBlock, /保存故事/)

  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  for (const removed of [
    '仅保存本篇',
    '仅创建本篇',
    '保存并继续',
    '创建并继续',
    '下一篇',
    '回到第一篇',
    '查看全部章节',
    'advanceAfterSave',
    'continuationNotice',
    'continueAfterNodeSaved',
    'saveWithoutAdvance',
    'findNextStoryNode',
    'resolveStorySaveContinuation',
  ]) {
    assert.ok(!source.includes(removed), `源文件仍包含已移除的连续编辑逻辑：${removed}`)
  }
})

test('故事表单顺序为基本信息、发布设置、故事展示设置、正文', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const titleIndex = source.indexOf('id="studio-node-title"')
  const chapterIndex = source.indexOf('id="studio-node-chapter"')
  const happenedIndex = source.indexOf('id="studio-node-happened"')
  const locationIndex = source.indexOf('id="studio-node-location"')
  const summaryIndex = source.indexOf('id="studio-node-summary"')
  const publishIndex = source.indexOf('id="studio-story-publish-heading"')
  const displayIndex = source.indexOf('id="studio-story-display-heading"')
  const contentIndex = source.indexOf('id="studio-node-content-label"')

  assert.ok(titleIndex > 0, '缺少故事标题')
  assert.ok(chapterIndex > titleIndex, '所属章节应排在标题之后')
  assert.ok(happenedIndex > chapterIndex, '发生时间应排在章节之后')
  assert.ok(locationIndex > happenedIndex, '地点应排在发生时间之后')
  assert.equal(source.indexOf('id="studio-node-sort"'), -1, '故事排序改为列表操作，弹窗中不再提供排序输入')
  assert.ok(summaryIndex > locationIndex, '故事摘要应排在地点之后')
  assert.ok(publishIndex > summaryIndex, '发布设置应排在基本信息之后')
  assert.ok(displayIndex > publishIndex, '故事展示设置应排在发布设置之后')
  assert.ok(contentIndex > displayIndex, '正文必须位于所有设置之后')

  // 展示设置不再折叠，标签与封面直接可见。
  assert.doesNotMatch(source, /showExtras|studio-story-extras|aria-expanded/)
  assert.doesNotMatch(source, /id="studio-node-tag-color"/)
  assert.match(source, /id="studio-node-cover"/)
})

test('MdEditor 开启左右预览并接入图片上传回调', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')

  assert.match(source, /<MdEditor/)
  assert.match(source, /:preview="true"/)
  assert.doesNotMatch(source, /:preview="false"/)
  assert.match(source, /:on-upload-img="handleStoryImageUpload"/)
  assert.doesNotMatch(source, /:no-upload-img="true"/)
  assert.match(source, /:max-length="STORY_CONTENT_MAX_LENGTH"/)
  assert.match(source, /story-content-editor/)
  assert.doesNotMatch(source, /v-html/)

  // 图片上传复用已有接口，不把 base64 或 blob 地址写入正文。
  assert.match(source, /uploadSpaceImage/)
  assert.match(source, /uploadStoryImages\(list/)
  assert.match(source, /ensureSuccess\(await uploadSpaceImage\(file\)/)
  assert.match(source, /callback\(urls\)/)
  assert.doesNotMatch(source, /base64|blob:/)
})

test('保存成功后刷新列表、关闭弹窗并统一触发 saved 反馈', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const saveBlock = source.slice(
    source.indexOf('async function saveNode()'),
    source.indexOf('async function removeNode(node)'),
  )
  const successBlock = saveBlock.slice(
    saveBlock.indexOf('const result = ensureSuccess(await saveStoryManageNode(payload)'),
    saveBlock.indexOf('} catch (error) {'),
  )

  // 成功提示统一由编辑页的 SpaceSaveFeedback 承接，避免同时再弹全局 success toast。
  assert.doesNotMatch(successBlock, /ElMessage\.success/)
  assert.match(successBlock, /await load\(\{ resetForms: false \}\)/)
  assert.match(successBlock, /nodeDialogOpen\.value = false/)
  assert.match(successBlock, /captureNodeBaseline\(\)/)
  assert.match(successBlock, /emit\('saved', \{ \.\.\.feedback, dirtyAfterSave: dirty\.value \}\)/)
})

test('保存失败后弹窗保持打开、保留输入并显示错误', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const saveBlock = source.slice(
    source.indexOf('async function saveNode()'),
    source.indexOf('async function removeNode(node)'),
  )
  const catchBlock = saveBlock.slice(saveBlock.indexOf('} catch (error) {'))

  assert.match(catchBlock, /nodeError\.value = message/)
  assert.match(catchBlock, /ElMessage\.error\(message\)/)
  assert.doesNotMatch(catchBlock, /nodeDialogOpen\.value = false|resetNodeForm|loadNodeIntoForm|await load/)
})

test('未保存修改的确认覆盖关闭、取消、Escape、切换故事与刷新列表', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')

  assert.match(source, /const nodeDirty = computed/)
  assert.match(source, /const dirty = computed/)
  assert.match(source, /async function closeNodeDialog\(\)/)
  assert.match(source, /async function handleNodeDialogBeforeClose\(done\)/)
  assert.match(source, /confirmOverwrite\('关闭故事弹窗会丢弃当前未保存的故事修改，确定继续吗？', nodeDirty\.value\)/)
  assert.match(source, /confirmOverwrite\('切换故事会丢弃当前未保存的故事修改，确定继续吗？', nodeDirty\.value\)/)
  assert.match(source, /confirmOverwrite\('刷新会重新加载数据并丢弃当前未保存的修改，确定继续吗？', dirty\.value\)/)
  assert.match(source, /有未保存的修改/)
  assert.match(source, /:before-close="handleNodeDialogBeforeClose"/)
})

test('公开权限与审核状态提示保持既有控制', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')

  assert.match(source, /buildVisibilityOptions\(props\.canPublish\)/)
  assert.match(source, /reviewStatusLabel\(editingNodeReview\.reviewStatus\)/)
  assert.match(source, /reviewStatusLabel\(node\.reviewStatus\)/)
  assert.match(source, /驳回原因/)
  assert.match(source, /广场继续展示上一次审核通过的版本/)
  assert.match(source, /reviewHasPublishedVersion/)
})

test('故事与章节表单改为弹窗，页面不再保留内嵌长表单', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')

  assert.match(source, /<SpaceStudioDialog/)
  assert.match(source, /id="studio-story-form"/)
  assert.match(source, /id="studio-chapter-form"/)
  assert.doesNotMatch(source, /id="story-node-form"/)
  assert.doesNotMatch(source, /id="studio-story-editor-heading"/)
  assert.doesNotMatch(source, /scrollEditorIntoView/)
  assert.doesNotMatch(source, /scrollIntoView/)
  assert.match(source, /focusNodeTitle/)
  assert.match(source, /handleNodeDialogBeforeClose/)
  assert.match(source, /handleChapterDialogBeforeClose/)
  assert.match(source, /restoreDialogFocus/)
  assert.match(source, /rememberDialogTrigger/)

  // 页面只保留工具栏、章节条与故事列表。
  const listIndex = source.indexOf('id="studio-story-list-heading"')
  const storyFormIndex = source.indexOf('id="studio-story-form"')
  assert.ok(listIndex > 0, '缺少故事列表标题')
  assert.ok(storyFormIndex > listIndex, '故事表单应位于弹窗内容中并排在列表之后')
})

test('公开空间详情不再渲染故事附图', () => {
  const source = readSource('pages/frontend/PublicSpaceDetailPage.vue')
  assert.doesNotMatch(source, /story\.images/)
})

test('公开空间详情只展示故事摘要并提供阅读全文入口', () => {
  const source = readSource('pages/frontend/PublicSpaceDetailPage.vue')

  // 空间详情不再渲染完整正文，也不使用 v-html 自行渲染。
  assert.doesNotMatch(source, /MdPreview|md-editor-v3/)
  assert.doesNotMatch(source, /:modelValue="story\.content"/)
  assert.doesNotMatch(source, /v-html/)

  // 摘要最多三行，摘要为空时回退到后端返回的纯文本预览。
  assert.match(source, /line-clamp-3/)
  assert.match(source, /storySummary/)
  assert.match(source, /contentPreview/)
  assert.match(source, /约 \$\{count\.toLocaleString\('zh-CN'\)\} 字/)

  // 封面高度固定，grid 顶部对齐，避免被长标题或正文拉伸。
  assert.match(source, /grid items-start/)
  assert.match(source, /sm:h-36/)
  assert.doesNotMatch(source, /sm:min-h-28|sm:aspect-auto/)

  // 有正文时进入独立的公开故事详情页，并携带返回来源（公开空间），
  // 保证故事详情页能回到原来的空间浏览位置而不是重置。
  assert.match(source, /:to="publicStoryLink\(story\)"/)
  assert.match(source, /function publicStoryLink\(story\)/)
  assert.match(source, /withReturnState\(/)
  assert.match(source, /buildReturnTarget\(route\.fullPath\)/)
  assert.match(source, /阅读全文/)
  assert.match(source, /这篇故事还没有正文/)
})

test('公开故事详情页通过匿名接口按需加载完整正文', () => {
  const source = readSource('pages/frontend/PublicStoryDetailPage.vue')

  assert.match(source, /fetchPublicStoryDetail/)
  assert.match(source, /<MdPreview/)
  assert.match(source, /:modelValue="story\.content"/)
  assert.match(source, /返回公开空间/)
  // 只读公开接口，不复用需要登录的私密故事接口。
  assert.doesNotMatch(source, /\/story\/detail/)
  // 新路由必须是匿名可访问的，且声明在 /plaza/:spaceId 之前。
  const router = readSource('router/index.js')
  const storyRouteIndex = router.indexOf("path: '/plaza/:spaceId/story/:storyId'")
  const spaceRouteIndex = router.indexOf("path: '/plaza/:spaceId',")
  assert.ok(storyRouteIndex >= 0, '缺少公开故事详情路由')
  assert.ok(spaceRouteIndex > storyRouteIndex, '公开故事路由必须在公开空间路由之前')
  const routeBlock = router.slice(storyRouteIndex, spaceRouteIndex)
  assert.match(routeBlock, /title: '公开故事详情 · 恋语间'/)
  assert.doesNotMatch(routeBlock, /requiresFrontendAuth|requiresCoupleSpace/)
})

test('图片字段只保留文件上传，不显示 URL 输入', () => {
  const field = readSource('components/frontend/space-studio/SpaceImageField.vue')

  assert.match(field, /type="file"/)
  assert.match(field, /SpaceImagePreview/)
  assert.doesNotMatch(field, /type="url"/)
  assert.doesNotMatch(field, /inputmode=/)
  assert.doesNotMatch(field, /https:\/\//)
  assert.doesNotMatch(field, /placeholder=/)
})

test('大图预览支持 Esc、遮罩关闭、滚动锁定与错误状态', () => {
  const preview = readSource('components/frontend/space-studio/SpaceImagePreview.vue')

  assert.match(preview, /role="dialog"/)
  assert.match(preview, /aria-modal="true"/)
  assert.match(preview, /aria-label="关闭图片预览"/)
  assert.match(preview, /Escape/)
  assert.match(preview, /@click\.self="close"/)
  assert.match(preview, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(preview, /图片加载失败/)
})

test('相册列表缩略图接入大图预览且不再提示填写图片地址', () => {
  const source = readSource('components/frontend/space-studio/SpacePhotoEditor.vue')

  assert.match(source, /SpaceImagePreview/)
  assert.match(source, /openPhotoPreview/)
  assert.doesNotMatch(source, /填写图片地址/)
})
