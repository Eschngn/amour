import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFormSnapshot, isFormDirty } from './formBaseline.js'

/**
 * 运行：npm test
 *
 * 编辑无改动的回归测试：
 * - 每个编辑已有内容的保存入口都先比较基线，再决定是否调用接口；
 * - 无改动时关闭弹窗、重建基线、派发 UNCHANGED 页面反馈；
 * - 新增内容、请求中/上传中、保存失败都保持原有流程；
 * - 重新提交公开审核时前端识别后端 changed=false，后端不创建重复审核记录。
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

/** 取从签名到函数收尾 `}` 的源码片段，用于检查单个函数内的分支顺序。 */
function readFunction(source, signature) {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `缺少函数：${signature}`)
  const end = source.indexOf('\n}', start)
  assert.ok(end > start, `无法定位函数结尾：${signature}`)
  return source.slice(start, end + 2)
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first)
  const secondIndex = source.indexOf(second)
  assert.ok(firstIndex >= 0, `缺少片段：${first}`)
  assert.ok(secondIndex >= 0, `缺少片段：${second}`)
  assert.ok(firstIndex < secondIndex, message)
}

test('故事章节保存：校验 -> 无改动判断 -> 保存接口，未改动时关闭弹窗并重建基线', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const block = readFunction(source, 'async function saveChapter()')

  assert.match(block, /shouldSkipUnchangedSave\(\{/)
  assert.match(block, /editing: Boolean\(chapterForm\.id\)/)
  assert.match(block, /baseline: chapterBaseline\.value/)
  assert.match(block, /snapshot: chapterFormSnapshot\(\)/)
  assertBefore(block, '章节名称不能为空', 'shouldSkipUnchangedSave', '新增空章节必须先执行必填校验')
  assertBefore(block, 'shouldSkipUnchangedSave', 'saveStoryManageChapter', '无改动判断必须在保存接口之前')
  assert.match(block, /resolveUnchangedFeedback\(\)/)
  assert.match(block, /chapterDialogOpen\.value = false/)
  assert.match(block, /resetChapterForm\(\)/)
  assert.match(block, /dirtyAfterSave: dirty\.value/)
})

test('故事节点保存：校验与上传保护之后判断无改动，未改动时不调用保存接口', () => {
  const source = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  const block = readFunction(source, 'async function saveNode()')

  assert.match(block, /shouldSkipUnchangedSave\(\{/)
  assert.match(block, /editing: Boolean\(editingNodeId\.value\)/)
  assert.match(block, /baseline: nodeBaseline\.value/)
  assert.match(block, /snapshot: nodeFormSnapshot\(\)/)
  assert.match(block, /busy: nodeSaving\.value \|\| uploadingCount\.value > 0/)
  assertBefore(block, '故事标题不能为空', 'shouldSkipUnchangedSave', '新增空故事必须先执行必填校验')
  assertBefore(block, 'shouldSkipUnchangedSave', 'saveStoryManageNode', '无改动判断必须在保存接口之前')
  assert.match(block, /nodeDialogOpen\.value = false/)
  assert.match(block, /dirtyAfterSave: dirty\.value/)

  const unchangedBlock = block.slice(
    block.indexOf('shouldSkipUnchangedSave({'),
    block.indexOf('nodeSaving.value = true'),
  )
  assert.doesNotMatch(unchangedBlock, /saveStoryManageNode|captureNodeBaseline|load\(/)
})

test('相册分类与照片保存入口都执行无改动判断，且分类/照片互不清除对方 dirty', () => {
  const source = readSource('components/frontend/space-studio/SpacePhotoEditor.vue')
  const categoryBlock = readFunction(source, 'async function saveCategory()')
  const photoBlock = readFunction(source, 'async function savePhoto()')

  assert.match(categoryBlock, /editing: Boolean\(categoryForm\.id\)/)
  assert.match(categoryBlock, /baseline: categoryBaseline\.value/)
  assert.match(categoryBlock, /snapshot: categoryFormSnapshot\(\)/)
  assertBefore(categoryBlock, '分类名称不能为空', 'shouldSkipUnchangedSave', '新增空分类必须先执行必填校验')
  assertBefore(categoryBlock, 'shouldSkipUnchangedSave', 'savePhotoManageCategory', '无改动判断必须在保存接口之前')
  assert.match(categoryBlock, /categoryDialogOpen\.value = false/)
  assert.match(categoryBlock, /resetCategoryForm\(\)/)

  assert.match(photoBlock, /editing: Boolean\(photoForm\.id\)/)
  assert.match(photoBlock, /baseline: photoBaseline\.value/)
  assert.match(photoBlock, /snapshot: photoFormSnapshot\(\)/)
  assert.match(photoBlock, /busy: photoSaving\.value \|\| uploading\.value/)
  assertBefore(photoBlock, '请上传照片', 'shouldSkipUnchangedSave', '新增空照片必须先执行必填校验')
  assertBefore(photoBlock, 'shouldSkipUnchangedSave', 'savePhotoManagePhoto', '无改动判断必须在保存接口之前')
  assert.match(photoBlock, /photoDialogOpen\.value = false/)
  assert.match(photoBlock, /resetPhotoForm\(\)/)

  // 两个表单分别维护自己的基线，整体 dirty 为并集。
  assert.match(source, /const categoryDirty = computed\(\(\) => isFormDirty\(categoryBaseline\.value, categoryFormSnapshot\(\)\)\)/)
  assert.match(source, /const photoDirty = computed\(\(\) => isFormDirty\(photoBaseline\.value, photoFormSnapshot\(\)\)\)/)
  assert.match(source, /categoryDirty\.value \|\| photoDirty\.value/)
})

test('纪念日保存入口执行无改动判断，未改动时关闭弹窗并重建基线', () => {
  const source = readSource('components/frontend/space-studio/SpaceAnniversaryEditor.vue')
  const block = readFunction(source, 'async function save()')

  assert.match(block, /editing: Boolean\(form\.id\)/)
  assert.match(block, /baseline: baseline\.value/)
  assert.match(block, /snapshot: formSnapshot\(\)/)
  assertBefore(block, '纪念日名称不能为空', 'shouldSkipUnchangedSave', '新增空纪念日必须先执行必填校验')
  assertBefore(block, 'shouldSkipUnchangedSave', 'saveAnniversaryManage', '无改动判断必须在保存接口之前')
  assert.match(block, /dialogOpen\.value = false/)
  assert.match(block, /resetForm\(\)/)
  assert.match(block, /resolveUnchangedFeedback\(\)/)
})

test('空间首页保存使用规范化快照，未改动时恢复表单且不调用保存接口', () => {
  const source = readSource('components/frontend/space-studio/SpaceHomeEditor.vue')
  const block = readFunction(source, 'async function save()')

  // 不再使用原始 JSON.stringify(form) 判断 dirty。
  assert.doesNotMatch(source, /JSON\.stringify\(form\)/)
  assert.match(source, /const dirty = computed\(\(\) => isFormDirty\(baseline\.value, homeFormSnapshot\(\)\)\)/)
  assert.match(source, /function homeFormSnapshot\(\)[\s\S]*?configs: \{/)
  assert.match(source, /baselineForm\.value = \{ \.\.\.form \}/)

  assert.match(block, /shouldSkipUnchangedSave\(\{/)
  assert.match(block, /editing: true/)
  assert.match(block, /baseline: baseline\.value/)
  assert.match(block, /snapshot: homeFormSnapshot\(\)/)
  assert.match(source, /function validate\(\)[\s\S]*?空间名称不能为空/)
  assertBefore(block, 'validate()', 'shouldSkipUnchangedSave', '首页保存必须先执行必填校验')
  assertBefore(block, 'shouldSkipUnchangedSave', 'saveSpaceHome', '无改动判断必须在保存接口之前')
  assert.match(block, /reset\(\)\n\s+emit\('saved', \{ \.\.\.resolveUnchangedFeedback\(\)/)
})

test('空间首页恋爱开始时间只选择日期，并按当天零点保存', () => {
  const source = readSource('components/frontend/space-studio/SpaceHomeEditor.vue')

  assert.match(source, /<label for="studio-home-love-start"[^>]*>恋爱开始日期<\/label>/)
  assert.match(source, /<ThemeDatePicker[\s\S]*?mode="date"[\s\S]*?input-id="studio-home-love-start"[\s\S]*?class="mt-2"/)
  assert.match(source, /form\.loveStartTime = toDateInputValue\(data\.loveStartTime\)/)
  assert.doesNotMatch(source, /toDateTimeLocalInput/)
  assert.match(source, /function homeFormSnapshot\(\)[\s\S]*?loveStartTime: toBackendDateTime\(form\.loveStartTime\)/)
  assert.match(source, /loveStartTime: toBackendDateTime\(form\.loveStartTime\)/)
})

test('保存失败时编辑器保持弹窗与输入，不误派发 unchanged 或 success', () => {
  for (const [file, signature, catchField] of [
    ['components/frontend/space-studio/SpaceStoryEditor.vue', 'async function saveNode()', 'nodeError'],
    ['components/frontend/space-studio/SpaceStoryEditor.vue', 'async function saveChapter()', 'chapterError'],
    ['components/frontend/space-studio/SpacePhotoEditor.vue', 'async function savePhoto()', 'photoError'],
    ['components/frontend/space-studio/SpacePhotoEditor.vue', 'async function saveCategory()', 'categoryError'],
    ['components/frontend/space-studio/SpaceAnniversaryEditor.vue', 'async function save()', 'error'],
    ['components/frontend/space-studio/SpaceHomeEditor.vue', 'async function save()', 'saveError'],
  ]) {
    const source = readSource(file)
    const block = readFunction(source, signature)
    const catchIndex = block.search(/\} catch \((?:error|err)\) \{/)
    assert.ok(catchIndex >= 0, `${file} ${signature} 缺少失败分支`)
    const catchBlock = block.slice(catchIndex)
    assert.match(catchBlock, new RegExp(`${catchField}\\.value = (readContentErrorMessage\\(|message)`))
    assert.doesNotMatch(catchBlock, /emit\('saved'|DialogOpen\.value = false|resetForm\(|resetPhotoForm\(|resetCategoryForm\(|resolveUnchangedFeedback/)
  }
})

test('留言发布与回复属于新增内容，空内容仍被校验拦截', () => {
  const source = readSource('components/frontend/space-studio/SpaceMessageEditor.vue')

  assert.match(source, /async function publish\(\) \{\n\s+if \(publishing\.value \|\| !draft\.value\.trim\(\)\) return/)
  assert.match(source, /async function submitReply\(\) \{\n\s+if \(replying\.value \|\| !replyTarget\.value \|\| !replyDraft\.value\.trim\(\)\) return/)
  // 留言没有“编辑已有内容”的入口，不应出现无改动跳过逻辑。
  assert.doesNotMatch(source, /shouldSkipUnchangedSave|resolveUnchangedFeedback/)
})

test('排序操作在顺序未变化时不调用排序接口', () => {
  const source = readSource('composables/useDragSort.js')

  assert.match(source, /hasOrderChanged\(baselineIds, sortItemIds\(items\.value\)\)/)
  assert.match(source, /if \(!changed\) return/)
})

test('重新提交公开审核识别后端 unchanged 结果，并沿用页面级反馈', () => {
  const source = readSource('components/frontend/space-studio/SpaceReviewStatusCard.vue')

  assert.doesNotMatch(source, /ElMessage\.success/)
  assert.match(source, /:disabled="resubmitting \|\| loading"/)
  const block = readFunction(source, 'async function resubmit()')
  assert.match(block, /if \(resubmitting\.value \|\| loading\.value\) return/)
  assert.match(block, /status\.value\?\.unchangedSinceLastSubmission/)
  assert.match(block, /emit\('submitted', resolveUnchangedFeedback\(\)\)/)
  assert.match(block, /const result = data\.data \|\| null/)
  assert.match(block, /result\?\.changed === false\s*\n\s*\? resolveUnchangedFeedback\(\)/)
  assert.match(block, /emit\('submitted', feedback\)/)
  assert.match(block, /await load\(\)/)
  assert.match(block, /ElMessage\.error/)
})

test('编辑页统一承接审核重新提交反馈，不额外弹出成功提示', () => {
  const studio = readSource('pages/frontend/SpaceStudioPage.vue')

  assert.match(studio, /<SpaceReviewStatusCard[^>]*@submitted="onReviewSubmitted"/)
  assert.match(studio, /function onReviewSubmitted\(payload\)[\s\S]*?showSaveFeedback\(payload\)/)
  assert.match(studio, /function showSaveFeedback\(payload\)[\s\S]*?saveFeedback\.value = \{/)
  assert.doesNotMatch(studio, /ElMessage\.success/)

  // 审核反馈到设置页后统一由公开设置分组承接（信息架构重构后从面板搬到子组件）。
  const visibilitySection = readSource('components/frontend/space-settings/SpaceVisibilitySection.vue')
  assert.match(visibilitySection, /function onReviewSubmitted\(payload\)[\s\S]*?payload\?\.message/)
  assert.match(visibilitySection, /payload\?\.kind === 'unchanged' \? 'info' : 'success'/)
})

test('后端重新提交审核时比较当前快照，无变化不创建新的审核记录', () => {
  const source = readFileSync(resolve(
    ROOT,
    '../../amour-springboot/amour-web/src/main/java/com/chengliuxiang/amour/web/service/impl/SpaceReviewServiceImpl.java',
  ), 'utf8')

  assert.match(source, /isSameAsLastSubmission\(spaceId, space\)/)
  assert.match(source, /isSameAsLastSubmission\(space, latestHandled\)/)
  assert.match(source, /unchangedSinceLastSubmission\(unchangedSinceLastSubmission\)/)
  assert.match(source, /setChanged\(false\)/)
  assert.match(source, /setReviewMessage\("未检测到内容变化，未提交审核"\)/)
  assertBefore(source, 'isSameAsLastSubmission(spaceId, space)', 'submitSpacePublish(spaceId, access.getUserId())',
    '无变化判断必须在创建审核提交之前')

  const snapshotStart = source.indexOf('private Map<String, String> buildCurrentItemSnapshots')
  assert.ok(snapshotStart >= 0, '缺少当前审核快照构建方法')
  const snapshotBlock = source.slice(snapshotStart, source.indexOf('    @Override', snapshotStart))
  for (const field of [
    'ITEM_TYPE_SPACE',
    'ITEM_TYPE_HOME_CONFIG',
    'ITEM_TYPE_STORY',
    'ITEM_TYPE_PHOTO',
    'ITEM_TYPE_ANNIVERSARY',
  ]) {
    assert.ok(snapshotBlock.includes(field), `当前快照缺少 ${field}`)
  }

  const vo = readFileSync(resolve(
    ROOT,
    '../../amour-springboot/amour-web/src/main/java/com/chengliuxiang/amour/web/model/vo/space/SpaceReviewStatusVO.java',
  ), 'utf8')
  assert.match(vo, /private Boolean changed;/)
  assert.match(vo, /private String reviewMessage;/)
  assert.match(vo, /private Boolean unchangedSinceLastSubmission;/)
})

test('无改动分支只重置当前表单基线，不清除同栏目其他表单的 dirty', () => {
  const story = readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
  assert.match(story, /chapterDirty\.value \|\| nodeDirty\.value/)
  assert.match(story, /function resetChapterForm\(\)[\s\S]*?captureChapterBaseline\(\)/)
  assert.match(story, /function resetNodeForm\(\)[\s\S]*?captureNodeBaseline\(\)/)

  const storySaveChapter = readFunction(story, 'async function saveChapter()')
  const storySaveNode = readFunction(story, 'async function saveNode()')
  for (const block of [storySaveChapter, storySaveNode]) {
    const unchangedBlock = block.slice(block.indexOf('shouldSkipUnchangedSave({'), block.indexOf('value = true'))
    assert.doesNotMatch(unchangedBlock, /emit\('update:dirty', false\)/)
  }

  // 页面始终使用编辑器给出的整体 dirty 结果。
  const studio = readSource('pages/frontend/SpaceStudioPage.vue')
  assert.match(studio, /if \(typeof payload\?\.dirtyAfterSave === 'boolean'\) \{/)
  assert.match(studio, /dirty\.value = payload\.dirtyAfterSave/)
})

test('规范化快照可以直接用于各编辑器无改动判断', () => {
  const baseline = createFormSnapshot({
    title: ' 初见 ',
    sortOrder: 10,
    visibility: 0,
    coverImage: '',
  })
  // 后端回显的空值、数字与字符串混用时仍视为无改动。
  assert.equal(isFormDirty(baseline, {
    title: '初见',
    sortOrder: '10',
    visibility: '0',
    coverImage: null,
  }), false)
})
