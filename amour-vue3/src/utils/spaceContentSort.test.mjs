import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

const storyEditor = () => readSource('components/frontend/space-studio/SpaceStoryEditor.vue')
const photoEditor = () => readSource('components/frontend/space-studio/SpacePhotoEditor.vue')
const anniversaryEditor = () => readSource('components/frontend/space-studio/SpaceAnniversaryEditor.vue')

test('三个编辑器的弹窗不再出现手动排序输入', () => {
  const story = storyEditor()
  assert.doesNotMatch(story, /id="studio-chapter-sort"/)
  assert.doesNotMatch(story, /id="studio-node-sort"/)
  assert.doesNotMatch(story, /v-model\.number="[^"]*sortOrder"/)

  const photo = photoEditor()
  assert.doesNotMatch(photo, /id="studio-category-sort"/)
  assert.doesNotMatch(photo, /id="studio-photo-sort"/)
  assert.doesNotMatch(photo, /v-model\.number="[^"]*sortOrder"/)

  const anniversary = anniversaryEditor()
  assert.doesNotMatch(anniversary, /id="studio-anniversary-sort"/)
  assert.doesNotMatch(anniversary, /v-model\.number="[^"]*sortOrder"/)

  // 保存 payload 不再提交 sortOrder，后端据此保留原顺序或追加到末尾。
  for (const source of [story, photo, anniversary]) {
    assert.doesNotMatch(source, /sortOrder:\s*(nodeForm|photoForm|anniversaryForm)/)
    assert.doesNotMatch(source, /saveStoryManageNode\(\{[\s\S]*?sortOrder:/)
    assert.doesNotMatch(source, /savePhotoManagePhoto\(\{[\s\S]*?sortOrder:/)
  }
})

test('弹窗提示默认追加到末尾，且不再要求用户理解内部排序值', () => {
  for (const source of [storyEditor(), photoEditor(), anniversaryEditor()]) {
    assert.match(source, /保存后默认添加到列表末尾，可在列表中调整顺序/)
    assert.match(source, /保存后保留当前顺序，可在列表中调整顺序/)
    assert.doesNotMatch(source, /0、10、20/)
  }
})

test('故事列表无需进入排序模式即可直接拖拽并自动保存', () => {
  const source = storyEditor()
  assert.match(source, /useDragSort\(/)
  assert.match(source, /SortHandleButton/)
  assert.match(source, /:data-sort-index="index"/)
  assert.match(source, /@pointerdown="nodeSort\.onRowPointerDown\(index, \$event\)"/)
  assert.match(source, /@drag-start="nodeSort\.startDrag\(index, \$event\)"/)
  assert.match(source, /@move-up="nodeSort\.moveByOffset\(index, -1\)"/)
  assert.match(source, /@move-down="nodeSort\.moveByOffset\(index, 1\)"/)
  assert.match(source, /normalizeSortItems\(orderedNodes\)/)
  assert.match(source, /saveStoryNodeGlobalOrder\(\{ items \}\)/)
  assert.match(source, /saveStoryNodeOrder\(\{ chapterId: scope\.chapterId, items \}\)/)
  assert.match(source, /applyNodeServerOrder\(serverItems\)/)
  assert.match(source, /nodeSort\.saving/)
  assert.match(source, /正在保存顺序/)
  assert.match(source, /nodeSortError/)
  assert.match(source, /TransitionGroup/)
  assert.match(source, /name="studio-sort-list"/)
  assert.match(source, /studio-sortable-item/)
  assert.match(source, /studio-sort-placeholder/)
  assert.match(source, /aria-grabbed/)
  assert.match(source, /:saving="nodeSort\.saving/)
  assert.doesNotMatch(source, /handleStartNodeSort|handleSaveNodeSort|nodeSortScopeLabel/)

  // 故事模块不再出现“调整顺序 / 保存排序”入口，章节卡片也直接拖拽。
  assert.doesNotMatch(source, /SortModeToolbar|SortableListItem|useSortMode/)
  assert.doesNotMatch(source, /handleStartChapterSort|handleSaveChapterSort/)
  assert.match(source, /chapterSort\.startDrag\(index, \$event\)/)
  assert.match(source, /saveStoryChapterOrder\(\{ items \}\)/)
  assert.match(source, /chapterSortError/)
  const listSection = source.slice(
    source.indexOf('id="studio-story-list-heading"'),
    source.indexOf('<!-- 章节新增 / 编辑弹窗'),
  )
  assert.doesNotMatch(listSection, /保存排序/)

  // 章节筛选仍然由卡片驱动。
  assert.match(source, /aria-label="故事章节筛选"/)
  assert.match(source, /toggleChapterFilter/)
  assert.match(source, /clearChapterFilter/)
  assert.match(source, /aria-pressed/)
  assert.doesNotMatch(source, /studio-story-filter/)
  assert.match(source, /sortStoryNodesForFilter\(nodes\.value, selectedChapterId\.value\)/)
})

test('照片列表无需进入排序模式即可直接拖拽并自动保存', () => {
  const source = photoEditor()
  assert.match(source, /useDragSort\(/)
  assert.match(source, /SortHandleButton/)
  assert.match(source, /:data-sort-index="index"/)
  assert.match(source, /@pointerdown="photoSort\.onRowPointerDown\(index, \$event\)"/)
  assert.match(source, /@drag-start="photoSort\.startDrag\(index, \$event\)"/)
  assert.match(source, /savePhotoGlobalOrder\(\{ items \}\)/)
  assert.match(source, /savePhotoOrder\(\{ categoryId: scope\.categoryId, items \}\)/)
  assert.match(source, /mergePageOrderIntoFullOrder\(sortBuffer\.value, orderedPage\)/)
  assert.match(source, /normalizeSortItems\(merged\)/)
  assert.match(source, /refreshSortBuffer/)
  assert.match(source, /fetchPhotoManageSortList\(scopeKey === 'all' \? null : scopeKey\)/)
  assert.match(source, /applyPhotoServerOrder\(serverItems\)/)
  assert.match(source, /正在保存顺序/)
  assert.match(source, /photoSortError/)
  assert.match(source, /TransitionGroup/)
  assert.match(source, /name="studio-sort-list"/)
  assert.match(source, /studio-sortable-item/)
  assert.match(source, /studio-sort-placeholder/)
  assert.match(source, /aria-grabbed/)
  assert.match(source, /:saving="photoSort\.saving/)
  assert.doesNotMatch(source, /handleStartPhotoSort|handleSavePhotoSort|photoSortScopeLabel|photoSortLoading/)

  // 相册模块不再出现“调整顺序 / 保存排序”入口，分类卡片也直接拖拽。
  assert.doesNotMatch(source, /SortModeToolbar|SortableListItem|useSortMode/)
  assert.doesNotMatch(source, /handleStartCategorySort|handleSaveCategorySort/)
  assert.match(source, /categorySort\.startDrag\(index, \$event\)/)
  assert.match(source, /savePhotoCategoryOrder\(\{ items \}\)/)
  assert.match(source, /categorySortError/)
  const listSection = source.slice(
    source.indexOf('id="studio-photo-list-heading"'),
    source.indexOf('<!-- 相册分类新增 / 编辑弹窗'),
  )
  assert.doesNotMatch(listSection, /保存排序/)

  // 分类筛选仍然由卡片驱动。
  assert.match(source, /aria-label="相册分类筛选"/)
  assert.match(source, /toggleCategoryFilter/)
  assert.match(source, /clearCategoryFilter/)
  assert.match(source, /aria-pressed/)
  assert.doesNotMatch(source, /studio-photo-filter/)
})

test('纪念日默认直接拖拽并自动保存，不再进入排序模式', () => {
  const source = anniversaryEditor()
  assert.match(source, /useDragSort\(/)
  assert.match(source, /SortHandleButton/)
  assert.match(source, /TransitionGroup/)
  assert.match(source, /name="studio-sort-list"/)
  assert.match(source, /:data-sort-index="index"/)
  assert.match(source, /@pointerdown="sort\.onRowPointerDown\(index, \$event\)"/)
  assert.match(source, /saveAnniversaryOrder\(\{ items: normalizeSortItems\(orderedItems\) \}\)/)
  assert.match(source, /sort\.saving/)
  assert.match(source, /sortError/)
  assert.match(source, /studio-sort-placeholder/)
  assert.match(source, /aria-grabbed/)
  assert.match(source, /:key="item\.id"/)
  assert.doesNotMatch(source, /SortModeToolbar|SortableListItem|useSortMode|handleStartSort|handleSaveSort/)
})

test('排序工具与组件具备拖拽、键盘与无障碍支持', () => {
  const item = readSource('components/frontend/space-studio/SortableListItem.vue')
  assert.match(item, /:draggable="sorting && !disabled"/)
  assert.match(item, /aria-label/)
  assert.match(item, /上移 \$\{label\}/)
  assert.match(item, /下移 \$\{label\}/)
  assert.match(item, /移到最前/)
  assert.match(item, /移到末尾/)
  assert.match(item, /flex-wrap/)
  assert.match(item, /Rank/)
  assert.match(item, /@dragstart/)
  assert.match(item, /@drop\.prevent/)
  assert.match(item, /第 \{\{ index \+ 1 \}\} 位/)

  const toolbar = readSource('components/frontend/space-studio/SortModeToolbar.vue')
  assert.match(toolbar, /调整顺序/)
  assert.match(toolbar, /保存排序/)
  assert.match(toolbar, /取消/)
  assert.match(toolbar, /disabledReason/)
  assert.match(toolbar, /aria-describedby/)
})

test('直接拖拽松手即保存，失败回滚并锁定连续请求', () => {
  const source = readSource('composables/useDragSort.js')
  assert.match(source, /if \(saving\.value \|\| active\.value\) return false/)
  assert.match(source, /distance < threshold/)
  assert.match(source, /dragging\.value = true/)
  assert.match(source, /createGhost\(dragIndex\.value, event\.clientX, event\.clientY\)/)
  assert.match(source, /await commit\(before, movedId\)/)
  assert.match(source, /await onDrop\(items\.value\.slice\(\)\)/)
  assert.match(source, /items\.value = before\.slice\(\)/)
  assert.match(source, /onError\?\.\(error\)/)
  assert.match(source, /saving\.value = true/)
  assert.match(source, /savingId\.value = movedId/)
  assert.match(source, /handlePointerCancel/)
  assert.match(source, /target\.closest\('button, a, input, textarea, select, label, \[data-drag-handle\], \[data-no-drag\]'\)/)
})

test('拖拽预览、落位动画与减少动态效果', () => {
  const source = readSource('composables/useDragSort.js')
  assert.match(source, /studio-sort-ghost/)
  assert.match(source, /landGhost\(\)/)
  assert.match(source, /cancelGhost\(\)/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /ghost\.animate/)
  assert.match(source, /clone\.style\.width/)
  assert.match(source, /removeGhost\(\)/)

  const css = readSource('assets/main.css')
  assert.match(css, /\.studio-sortable-item/)
  assert.match(css, /\.studio-sort-list-move/)
  assert.match(css, /\.studio-sort-placeholder/)
  assert.match(css, /\.studio-sort-ghost/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /transition: transform var\(--studio-sort-duration\)/)
  assert.match(css, /transition: none !important/)
  assert.match(css, /display: none !important/)
})

test('拖拽手柄支持触摸、键盘、保存状态与无障碍属性', () => {
  const source = readSource('components/frontend/space-studio/SortHandleButton.vue')
  assert.match(source, /data-drag-handle/)
  assert.match(source, /touch-none/)
  assert.match(source, /@pointerdown\.stop\.prevent/)
  assert.match(source, /@keydown\.up\.prevent/)
  assert.match(source, /@keydown\.down\.prevent/)
  assert.match(source, /aria-label/)
  assert.match(source, /aria-keyshortcuts="ArrowUp ArrowDown"/)
  assert.match(source, /当前第 \$\{position\} 位/)
  assert.match(source, /:disabled="disabled \|\| saving"/)
  assert.match(source, /Loading/)
  assert.match(source, /正在保存\$\{label\}的顺序/)
})

test('前端 API 复用 axios 且不吞业务错误', () => {
  const source = readSource('api/spaceContent.js')
  for (const endpoint of [
    '/story/manage/chapter/order',
    '/story/manage/node/order',
    '/story/manage/node/global-order',
    '/photo/manage/category/order',
    '/photo/manage/photo/order',
    '/photo/manage/photo/global-order',
    '/photo/manage/photo/sort-list',
    '/anniversary/manage/order',
  ]) {
    assert.ok(source.includes(endpoint), `缺少接口 ${endpoint}`)
  }
  assert.match(source, /export function saveStoryChapterOrder/)
  assert.match(source, /export function saveStoryNodeOrder/)
  assert.match(source, /export function saveStoryNodeGlobalOrder/)
  assert.match(source, /export function savePhotoCategoryOrder/)
  assert.match(source, /export function savePhotoOrder/)
  assert.match(source, /export function savePhotoGlobalOrder/)
  assert.match(source, /export function saveAnniversaryOrder/)
  assert.doesNotMatch(source, /try\s*\{[\s\S]*saveStoryChapterOrder/)
})
