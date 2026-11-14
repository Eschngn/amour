<template>
  <div>
    <div v-if="loading" class="studio-panel px-5 py-6" aria-label="正在加载故事" aria-busy="true">
      <div class="h-5 w-28 animate-pulse rounded bg-stone-100" />
      <div class="mt-6 space-y-3">
        <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-lg bg-stone-50" />
      </div>
    </div>

    <div v-else-if="loadError" class="studio-panel px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="btn-secondary mt-4" @click="load">重新加载</button>
    </div>

    <div v-else class="space-y-5">
      <!-- 章节条：先浏览、按需编辑，不再常驻一整块表单 -->
      <section class="studio-panel" aria-labelledby="studio-story-heading">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h2 id="studio-story-heading" class="section-title">故事</h2>
            <p class="section-description">共 {{ nodes.length }} 篇故事 · {{ chapters.length }} 个章节。章节下还有故事时不能删除。</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn-ghost" :disabled="loading" @click="load">刷新</button>
            <button type="button" class="btn-secondary" @click="openChapterCreate">新增章节</button>
            <button type="button" class="btn-primary" :disabled="!chapters.length" @click="startNewStory">
              新建故事
            </button>
          </div>
        </header>

        <div class="px-5 py-4">
          <div v-if="!chapters.length" class="studio-empty">
            <p class="text-sm font-semibold text-stone-800">还没有章节</p>
            <p class="mt-1 text-xs text-stone-500">先新增一个章节，再开始写故事。</p>
          </div>
          <ul v-else class="flex flex-wrap gap-2" aria-label="故事章节">
            <li
              v-for="chapter in chapters"
              :key="chapter.id"
              class="flex items-center gap-1 rounded-lg border py-1 pl-2.5 pr-1 text-xs transition"
              :class="chapterFormOpen && chapterForm.id === chapter.id
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-stone-200 bg-stone-50/70 text-stone-700'"
            >
              <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: chapterAccent(chapter) }" aria-hidden="true" />
              <span class="max-w-40 truncate font-semibold" :title="chapter.name">{{ chapter.name }}</span>
              <span class="text-[10px] text-stone-400">{{ chapter.nodeCount }}</span>
              <span v-if="!chapter.isVisible" class="rounded bg-stone-200/80 px-1 text-[10px] text-stone-500">隐藏</span>
              <button
                type="button"
                class="rounded p-1 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`编辑章节 ${chapter.name}`"
                title="编辑章节"
                @click="editChapter(chapter)"
              >
                <EditPen class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="rounded p-1 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`删除章节 ${chapter.name}`"
                title="删除章节"
                @click="removeChapter(chapter)"
              >
                <Delete class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>

        <div v-if="chapterEditorOpen" class="border-t border-stone-100 bg-stone-50/50 px-5 py-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-display text-base font-bold text-stone-900">
              {{ chapterForm.id ? '编辑章节' : '新增章节' }}
            </h3>
            <button type="button" class="btn-ghost" @click="closeChapterEditor">关闭</button>
          </div>

          <form class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_7rem]" @submit.prevent="saveChapter">
            <div>
              <label for="studio-chapter-name" class="field-label">章节名称</label>
              <input
                id="studio-chapter-name"
                v-model="chapterForm.name"
                maxlength="50"
                class="field-input"
                placeholder="例如「初见」"
              >
            </div>
            <div>
              <label for="studio-chapter-sort" class="field-label">排序</label>
              <input
                id="studio-chapter-sort"
                v-model.number="chapterForm.sortOrder"
                type="number"
                min="0"
                class="field-input"
              >
            </div>
            <div class="lg:col-span-2 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div class="rounded-xl border border-stone-200 bg-white p-3.5">
                <ThemeColorField
                  v-model="chapterForm.colorCode"
                  input-id="studio-chapter-color"
                  label="章节主题色"
                  hint="章节导航、故事时间线与章节标签都会使用这个颜色。"
                />
              </div>
              <div class="rounded-xl border border-stone-200 bg-white p-3.5">
                <p class="text-xs font-semibold text-stone-500">章节预览</p>
                <div class="mt-3 flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/70 px-3 py-2.5">
                  <span class="flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[10px] font-bold" :style="chapterPreviewBadgeStyle">
                    {{ chapterForm.id ? '章节' : '预览' }}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">{{ chapterForm.name.trim() || '章节名称预览' }}</span>
                  <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :style="chapterPreviewTagStyle">
                    {{ chapterForm.isVisible ? '展示中' : '已隐藏' }}
                  </span>
                </div>
                <label class="mt-3 inline-flex items-center gap-2 text-xs text-stone-600">
                  <input v-model="chapterForm.isVisible" type="checkbox" class="h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-400">
                  在空间故事中显示该章节
                </label>
              </div>
            </div>

            <p v-if="chapterError" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700 lg:col-span-2" role="alert">
              {{ chapterError }}
            </p>

            <div class="flex flex-wrap items-center gap-2 lg:col-span-2">
              <button type="submit" class="btn-primary" :disabled="chapterSaving">
                {{ chapterSaving ? '保存中…' : (chapterForm.id ? '保存章节' : '新增章节') }}
              </button>
              <button v-if="chapterForm.id" type="button" class="btn-secondary" @click="closeChapterEditor">取消</button>
            </div>
          </form>
        </div>
      </section>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
        <!-- 故事列表：先选择条目 -->
        <section class="studio-panel min-w-0" aria-labelledby="studio-story-list-heading">
          <header class="studio-panel-header">
            <div class="min-w-0">
              <h3 id="studio-story-list-heading" class="section-title">故事列表</h3>
              <p class="section-description">选择一篇故事，在右侧编辑内容。</p>
            </div>
            <ThemeSelect
              v-model="selectedChapterId"
              input-id="studio-story-filter"
              size="sm"
              placeholder="全部章节"
              :options="chapterFilterOptions"
            />
          </header>

          <div v-if="!filteredNodes.length" class="studio-panel-body">
            <div class="studio-empty">
              <p class="text-sm font-semibold text-stone-800">还没有故事</p>
              <p class="mt-1 text-xs text-stone-500">点击「新建故事」写下第一段。</p>
            </div>
          </div>
          <ul v-else class="divide-y divide-stone-100" aria-label="故事条目">
            <li
              v-for="node in filteredNodes"
              :key="node.id"
              class="flex items-start gap-2 px-4 py-3 transition"
              :class="editingNodeId === node.id ? 'bg-rose-50/60' : 'hover:bg-stone-50/70'"
            >
              <button
                type="button"
                class="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`编辑故事 ${node.title}`"
                :aria-current="editingNodeId === node.id ? 'true' : undefined"
                @click="editNode(node)"
              >
                <span class="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-stone-900">
                  <span class="truncate">{{ node.title }}</span>
                  <span
                    v-if="node.tagLabel"
                    class="max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    :style="tagStyle(node.tagColor)"
                  >
                    {{ node.tagLabel }}
                  </span>
                  <span v-if="node.isMilestone" class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">里程碑</span>
                </span>
                <span class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-5 text-stone-500">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full" :style="{ backgroundColor: chapterAccentById(node.chapterId) }" aria-hidden="true" />
                  <span>{{ node.chapterName || '未分章' }}</span>
                  <span aria-hidden="true">·</span>
                  <span>{{ formatSpaceDateTime(node.happenedTime) }}</span>
                  <span v-if="node.images?.length" aria-hidden="true">·</span>
                  <span v-if="node.images?.length">{{ node.images.length }} 张图片</span>
                </span>
                <span class="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-stone-400">
                  <span>{{ visibilityLabel(node.visibility) }}</span>
                  <span
                    v-if="reviewStatusLabel(node.reviewStatus)"
                    class="rounded-full px-1.5 py-0.5 font-semibold"
                    :class="reviewStatusClass(node.reviewStatus)"
                  >
                    {{ reviewStatusLabel(node.reviewStatus) }}
                  </span>
                </span>
                <span
                  v-if="node.reviewStatus === 'REJECTED'"
                  class="mt-1.5 block rounded-lg border border-rose-100 bg-rose-50/80 px-2 py-1.5 text-[10px] leading-5 text-rose-700"
                >
                  <span class="font-semibold">驳回原因：</span>{{ node.reviewRejectReason || '未填写原因' }}
                  <span class="block text-rose-500">
                    {{ node.reviewHasPublishedVersion ? '恋爱广场继续展示上一次已通过的版本。' : '该内容尚未公开。' }}
                  </span>
                </span>
              </button>
              <button
                type="button"
                class="mt-0.5 shrink-0 rounded p-1.5 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`删除故事 ${node.title}`"
                title="删除故事"
                @click="removeNode(node)"
              >
                <Delete class="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>

        <!-- 编辑区：紧凑分组，保存操作固定在底部 -->
        <section id="story-node-form" class="studio-panel scroll-mt-24" aria-labelledby="studio-story-editor-heading">
          <header class="studio-panel-header">
            <div class="min-w-0">
              <h3 id="studio-story-editor-heading" class="section-title">
                {{ editingNodeId ? '编辑故事' : '新建故事' }}
              </h3>
              <p class="section-description">
                {{ editingNodeId ? '修改公开故事后会进入审核，广场继续展示旧版本。' : '新故事默认仅空间成员可见；设为公开后需要审核。' }}
              </p>
            </div>
            <button v-if="editingNodeId" type="button" class="btn-ghost" @click="resetNodeForm">取消编辑</button>
          </header>

          <form @submit.prevent="saveNode">
            <div class="px-5 py-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label for="studio-node-chapter" class="field-label">所属章节</label>
                  <ThemeSelect
                    v-model="nodeForm.chapterId"
                    input-id="studio-node-chapter"
                    class="mt-2"
                    placeholder="请先创建章节"
                    :options="chapterOptions"
                  />
                </div>
                <div>
                  <label for="studio-node-happened" class="field-label">发生时间</label>
                  <ThemeDatePicker
                    v-model="nodeForm.happenedTime"
                    input-id="studio-node-happened"
                    class="mt-2"
                    mode="datetime"
                    placeholder="选择故事发生时间"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label for="studio-node-title" class="field-label">标题</label>
                  <input
                    id="studio-node-title"
                    v-model="nodeForm.title"
                    maxlength="100"
                    class="field-input"
                    placeholder="这一章故事的名字"
                  >
                </div>
                <div class="sm:col-span-2">
                  <label for="studio-node-summary" class="field-label">摘要</label>
                  <textarea
                    id="studio-node-summary"
                    v-model="nodeForm.summary"
                    rows="2"
                    maxlength="500"
                    class="field-input resize-y leading-6"
                    placeholder="一句话概括这段故事（选填）"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label for="studio-node-content" class="field-label">正文</label>
                  <textarea
                    id="studio-node-content"
                    v-model="nodeForm.content"
                    rows="7"
                    maxlength="20000"
                    class="field-input resize-y leading-7"
                    placeholder="把那天发生的事写下来……"
                  />
                </div>
                <div>
                  <label for="studio-node-location" class="field-label">地点</label>
                  <input
                    id="studio-node-location"
                    v-model="nodeForm.location"
                    maxlength="100"
                    class="field-input"
                    placeholder="发生地点（选填）"
                  >
                </div>
                <div>
                  <label for="studio-node-sort" class="field-label">章节内排序</label>
                  <input
                    id="studio-node-sort"
                    v-model.number="nodeForm.sortOrder"
                    type="number"
                    min="0"
                    class="field-input"
                  >
                </div>
              </div>

              <div class="mt-5 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <p class="text-xs font-bold text-stone-500">发布设置</p>
                <div class="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <label for="studio-node-visibility" class="field-label">可见性</label>
                    <ThemeSelect
                      v-model="nodeForm.visibility"
                      input-id="studio-node-visibility"
                      class="mt-2"
                      :options="visibilityOptions"
                    />
                  </div>
                  <label class="flex items-center gap-2 self-end rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-700">
                    <input v-model="nodeForm.isMilestone" type="checkbox" class="h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-400">
                    标记为里程碑
                  </label>
                </div>
              </div>

              <div class="mt-5 overflow-hidden rounded-xl border border-stone-200">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 bg-stone-50/70 px-4 py-3 text-left text-xs font-semibold text-stone-700 transition hover:bg-stone-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300"
                  :aria-expanded="showExtras ? 'true' : 'false'"
                  aria-controls="studio-story-extras"
                  @click="showExtras = !showExtras"
                >
                  <span>标签、封面与故事图片</span>
                  <span class="flex items-center gap-2 text-[11px] font-normal text-stone-400">
                    {{ extrasSummary }}
                    <svg
                      class="h-4 w-4 transition"
                      :class="{ 'rotate-180': showExtras }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                </button>

                <div v-if="showExtras" id="studio-story-extras" class="space-y-4 px-4 py-4">
                  <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div>
                      <label for="studio-node-tag" class="field-label">标签文字</label>
                      <input
                        id="studio-node-tag"
                        v-model="nodeForm.tagLabel"
                        maxlength="30"
                        class="field-input"
                        placeholder="例如：初见"
                      >
                    </div>
                    <ThemeColorField
                      v-model="nodeForm.tagColor"
                      input-id="studio-node-tag-color"
                      label="标签颜色"
                      allow-clear
                      hint="留空时使用默认玫瑰色。"
                    />
                  </div>

                  <div>
                    <SpaceImageField
                      v-model="nodeForm.coverImage"
                      input-id="studio-node-cover"
                      label="封面图片"
                      :disabled="nodeSaving"
                      @uploading="onImageUploading"
                    />
                  </div>

                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-semibold text-stone-800">故事图片</p>
                      <button type="button" class="btn-ghost" @click="addImageRow">添加图片</button>
                    </div>
                    <p v-if="!nodeForm.images.length" class="mt-2 text-xs text-stone-500">还没有添加图片。</p>
                    <div v-for="(image, index) in nodeForm.images" :key="index" class="mt-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
                      <div class="flex items-start gap-2">
                        <div class="min-w-0 flex-1">
                          <SpaceImageField
                            v-model="image.url"
                            :input-id="`studio-node-image-${index}`"
                            label=""
                            :disabled="nodeSaving"
                            @uploading="onImageUploading"
                          />
                          <input
                            v-model="image.altText"
                            maxlength="100"
                            class="field-input font-normal"
                            placeholder="图片描述（选填）"
                            :aria-label="`第 ${index + 1} 张故事图片的描述`"
                          >
                        </div>
                        <button type="button" class="btn-ghost mt-1 shrink-0" :aria-label="`移除第 ${index + 1} 张图片`" @click="removeImageRow(index)">
                          移除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p v-if="nodeError" class="mt-4 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                {{ nodeError }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 border-t border-stone-100 bg-stone-50/40 px-5 py-4">
              <button type="submit" class="btn-primary" :disabled="nodeSaving || uploadingCount > 0 || !chapters.length">
                {{ nodeSaving ? '保存中…' : (uploadingCount > 0 ? '图片上传中…' : (editingNodeId ? '保存故事' : '新增故事')) }}
              </button>
              <button type="button" class="btn-secondary" :disabled="nodeSaving" @click="resetNodeForm">
                清空表单
              </button>
              <span v-if="dirty" class="text-[11px] font-medium text-amber-700" role="status">有未保存的修改</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import { Delete, EditPen } from '@element-plus/icons-vue'
import SpaceImageField from '@/components/frontend/space-studio/SpaceImageField.vue'
import ThemeColorField from '@/components/frontend/space-studio/ThemeColorField.vue'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
import ThemeSelect from '@/components/frontend/space-studio/ThemeSelect.vue'
import {
  DEFAULT_THEME_COLOR,
  accentTextColor,
  contrastTextColor,
  normalizeHexColor,
  softenHexColor,
  themeBorderColor,
} from '@/utils/themeColor'
import {
  deleteStoryManageChapter,
  deleteStoryManageNode,
  fetchStoryManageChapters,
  fetchStoryManageNodes,
  saveStoryManageChapter,
  saveStoryManageNode,
} from '@/api/spaceContent'
import { formatSpaceDateTime } from '@/utils/spaceFormat'
import {
  buildVisibilityOptions,
  ensureSuccess,
  readContentErrorMessage,
  reviewStatusLabel,
  saveSuccessMessage,
  toBackendDateTime,
  toDateTimeLocalInput,
  VISIBILITY_OPTIONS,
} from '@/utils/spaceContent'

const props = defineProps({
  canPublish: { type: Boolean, default: false },
  /** 重新提交公开审核后由父组件触发刷新。 */
  refreshKey: { type: [String, Number], default: '' },
})

const emit = defineEmits(['update:dirty'])

const loading = ref(true)
const loadError = ref('')
const chapters = ref([])
const nodes = ref([])
const selectedChapterId = ref('all')

const chapterOptions = computed(() => chapters.value.map(chapter => ({ value: chapter.id, label: chapter.name })))
const chapterFilterOptions = computed(() => [{ value: 'all', label: '全部章节' }, ...chapterOptions.value])
const visibilityOptions = computed(() => buildVisibilityOptions(props.canPublish))

const chapterForm = reactive({ id: null, name: '', colorCode: '#D94F70', sortOrder: 10, isVisible: true })
const chapterSaving = ref(false)
const chapterError = ref('')
const chapterEditorOpen = ref(false)

const editingNodeId = ref(null)
const nodeSaving = ref(false)
const uploadingCount = ref(0)
const nodeError = ref('')
const showExtras = ref(false)
const nodeForm = reactive(emptyNodeForm())
let baseline = ''

/** 章节表单里实时预览主题色，避免只靠一串色值想象效果。 */
const chapterPreviewAccent = computed(() => normalizeHexColor(chapterForm.colorCode, DEFAULT_THEME_COLOR))
const chapterPreviewBadgeStyle = computed(() => ({
  backgroundColor: chapterPreviewAccent.value,
  color: contrastTextColor(chapterPreviewAccent.value),
}))
const chapterPreviewTagStyle = computed(() => ({
  backgroundColor: softenHexColor(chapterPreviewAccent.value),
  color: accentTextColor(chapterPreviewAccent.value),
}))

const extrasSummary = computed(() => {
  const parts = []
  if (nodeForm.tagLabel.trim()) parts.push('已填标签')
  if (nodeForm.coverImage.trim()) parts.push('有封面')
  if (nodeForm.images.filter(image => image.url.trim()).length) {
    parts.push(`${nodeForm.images.filter(image => image.url.trim()).length} 张图片`)
  }
  return parts.length ? parts.join(' · ') : '选填'
})

/** 故事标签的浅底 + 主题文字样式；亮色会自动压暗文字，保证可读。 */
function tagStyle(color) {
  const accent = normalizeHexColor(color, DEFAULT_THEME_COLOR)
  return {
    backgroundColor: softenHexColor(accent),
    borderColor: themeBorderColor(accent),
    color: accentTextColor(accent),
  }
}

function chapterAccent(chapter) {
  return normalizeHexColor(chapter?.colorCode, DEFAULT_THEME_COLOR)
}

function chapterAccentById(chapterId) {
  const chapter = chapters.value.find(item => String(item.id) === String(chapterId))
  return normalizeHexColor(chapter?.colorCode, DEFAULT_THEME_COLOR)
}

/** 多张图片可能同时上传，用计数保证全部结束前不能提交。 */
function onImageUploading(value) {
  uploadingCount.value = Math.max(0, uploadingCount.value + (value ? 1 : -1))
}

function emptyNodeForm() {
  return {
    chapterId: '',
    title: '',
    summary: '',
    content: '',
    happenedTime: '',
    location: '',
    coverImage: '',
    tagLabel: '',
    tagColor: '',
    sortOrder: 0,
    isMilestone: false,
    visibility: 0,
    images: [],
  }
}

const dirty = computed(() => Boolean(baseline) && JSON.stringify(serializeForms()) !== baseline)

function serializeForms() {
  return { chapterForm: { ...chapterForm }, nodeForm: { ...nodeForm, images: nodeForm.images.map(i => ({ ...i })) } }
}

function captureBaseline() {
  baseline = JSON.stringify(serializeForms())
  emit('update:dirty', dirty.value)
}

watch([chapterForm, nodeForm], () => emit('update:dirty', dirty.value), { deep: true })

const filteredNodes = computed(() => (
  selectedChapterId.value === 'all'
    ? nodes.value
    : nodes.value.filter(node => String(node.chapterId) === String(selectedChapterId.value))
))

function visibilityLabel(value) {
  return VISIBILITY_OPTIONS.find(option => option.value === Number(value))?.label || '仅空间成员可见'
}

function reviewStatusClass(status) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-700'
  if (status === 'UNPUBLISHED') return 'bg-slate-200 text-slate-600'
  return 'bg-emerald-100 text-emerald-700'
}

function resetChapterForm() {
  chapterForm.id = null
  chapterForm.name = ''
  chapterForm.colorCode = '#D94F70'
  chapterForm.sortOrder = nextChapterSort()
  chapterForm.isVisible = true
  chapterError.value = ''
  captureBaseline()
}

function openChapterCreate() {
  resetChapterForm()
  chapterEditorOpen.value = true
}

function closeChapterEditor() {
  chapterEditorOpen.value = false
  resetChapterForm()
}

function nextChapterSort() {
  return chapters.value.reduce((max, chapter) => Math.max(max, Number(chapter.sortOrder) || 0), 0) + 10
}

function editChapter(chapter) {
  chapterForm.id = chapter.id
  chapterForm.name = chapter.name || ''
  chapterForm.colorCode = normalizeHexColor(chapter.colorCode, DEFAULT_THEME_COLOR)
  chapterForm.sortOrder = Number(chapter.sortOrder) || 0
  chapterForm.isVisible = chapter.isVisible !== false
  chapterError.value = ''
  chapterEditorOpen.value = true
}

function resetNodeForm() {
  editingNodeId.value = null
  uploadingCount.value = 0
  Object.assign(nodeForm, emptyNodeForm())
  nodeForm.chapterId = chapters.value[0]?.id ?? ''
  nodeForm.sortOrder = 0
  nodeError.value = ''
  showExtras.value = false
  captureBaseline()
}

function startNewStory() {
  resetNodeForm()
  document.getElementById('story-node-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function addImageRow() {
  nodeForm.images.push({ url: '', altText: '' })
  showExtras.value = true
}

function removeImageRow(index) {
  nodeForm.images.splice(index, 1)
}

function editNode(node) {
  editingNodeId.value = node.id
  nodeForm.chapterId = node.chapterId
  nodeForm.title = node.title || ''
  nodeForm.summary = node.summary || ''
  nodeForm.content = node.content || ''
  nodeForm.happenedTime = toDateTimeLocalInput(node.happenedTime)
  nodeForm.location = node.location || ''
  nodeForm.coverImage = node.coverImage || ''
  nodeForm.tagLabel = node.tagLabel || ''
  nodeForm.tagColor = normalizeHexColor(node.tagColor)
  nodeForm.sortOrder = Number(node.sortOrder) || 0
  nodeForm.isMilestone = node.isMilestone === true
  nodeForm.visibility = Number(node.visibility) || 0
  nodeForm.images = (node.images || []).map(image => ({ url: image.url || '', altText: image.altText || '' }))
  nodeError.value = ''
  showExtras.value = Boolean(nodeForm.tagLabel || nodeForm.coverImage || nodeForm.images.length)
  document.getElementById('story-node-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [chapterData, nodeData] = await Promise.all([
      fetchStoryManageChapters().then(r => ensureSuccess(r, '章节加载失败')),
      fetchStoryManageNodes().then(r => ensureSuccess(r, '故事加载失败')),
    ])
    chapters.value = Array.isArray(chapterData) ? chapterData : []
    nodes.value = Array.isArray(nodeData) ? nodeData : []
    chapterEditorOpen.value = false
    resetChapterForm()
    resetNodeForm()
  } catch (error) {
    loadError.value = readContentErrorMessage(error, '故事加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function saveChapter() {
  if (chapterSaving.value) return
  const name = chapterForm.name.trim()
  if (!name) {
    chapterError.value = '章节名称不能为空'
    return
  }
  const colorCode = normalizeHexColor(chapterForm.colorCode)
  if (!colorCode) {
    chapterError.value = '请选择章节主题色'
    return
  }
  chapterSaving.value = true
  chapterError.value = ''
  try {
    ensureSuccess(await saveStoryManageChapter({
      id: chapterForm.id,
      name,
      colorCode,
      sortOrder: Number(chapterForm.sortOrder) || 0,
      isVisible: chapterForm.isVisible,
    }), '章节保存失败')
    ElMessage.success(chapterForm.id ? '章节已更新' : '章节已创建')
    await load()
  } catch (error) {
    chapterError.value = readContentErrorMessage(error, '章节保存失败，请稍后重试')
  } finally {
    chapterSaving.value = false
  }
}

async function removeChapter(chapter) {
  if (chapter.nodeCount > 0) {
    ElMessage.warning('章节下还有故事，请先移动或删除这些故事')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除章节「${chapter.name}」吗？`, '删除章节', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
  try {
    ensureSuccess(await deleteStoryManageChapter(chapter.id), '删除章节失败')
    ElMessage.success('章节已删除')
    await load()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '删除章节失败，请稍后重试'))
  }
}

async function saveNode() {
  if (nodeSaving.value || uploadingCount.value > 0) return
  nodeError.value = ''
  if (!nodeForm.chapterId) {
    nodeError.value = '请先创建并选择章节'
    return
  }
  if (!nodeForm.title.trim()) {
    nodeError.value = '故事标题不能为空'
    return
  }
  if (!nodeForm.content.trim()) {
    nodeError.value = '故事正文不能为空'
    return
  }
  if (!nodeForm.happenedTime) {
    nodeError.value = '请选择故事发生时间'
    return
  }
  const tagLabel = nodeForm.tagLabel.trim()
  const tagColor = normalizeHexColor(nodeForm.tagColor)
  if (nodeForm.tagColor.trim() && !tagColor) {
    nodeError.value = '请选择标签颜色'
    return
  }

  nodeSaving.value = true
  try {
    const payload = {
      id: editingNodeId.value,
      chapterId: Number(nodeForm.chapterId),
      title: nodeForm.title.trim(),
      summary: nodeForm.summary.trim(),
      content: nodeForm.content.trim(),
      happenedTime: toBackendDateTime(nodeForm.happenedTime),
      location: nodeForm.location.trim(),
      coverImage: nodeForm.coverImage.trim(),
      tagLabel,
      tagColor: tagLabel ? tagColor : '',
      sortOrder: Number(nodeForm.sortOrder) || 0,
      isMilestone: nodeForm.isMilestone,
      visibility: Number(nodeForm.visibility),
      images: nodeForm.images
        .filter(image => image.url.trim())
        .map((image, index) => ({
          url: image.url.trim(),
          altText: image.altText.trim(),
          sortOrder: index * 10,
        })),
    }
    const result = ensureSuccess(await saveStoryManageNode(payload), '故事保存失败')
    ElMessage.success(saveSuccessMessage(result, editingNodeId.value ? '故事已更新' : '故事已创建'))
    await load()
  } catch (error) {
    nodeError.value = readContentErrorMessage(error, '故事保存失败，请稍后重试')
  } finally {
    nodeSaving.value = false
  }
}

async function removeNode(node) {
  try {
    await ElMessageBox.confirm(`确定删除故事「${node.title}」吗？`, '删除故事', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
  try {
    ensureSuccess(await deleteStoryManageNode(node.id), '故事删除失败')
    ElMessage.success('故事已删除')
    await load()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '删除故事失败，请稍后重试'))
  }
}

onMounted(load)

watch(() => props.refreshKey, () => load())

defineExpose({ dirty, saving: nodeSaving })
</script>
