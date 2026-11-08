<template>
  <div class="space-y-5">
    <div v-if="loading" class="space-y-3" aria-label="正在加载故事" aria-busy="true">
      <div v-for="n in 3" :key="n" class="h-32 animate-pulse rounded-2xl border border-rose-100 bg-white/60" />
    </div>

    <div v-else-if="loadError" class="rounded-2xl border border-rose-100 bg-rose-50/50 px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="load">
        重新加载
      </button>
    </div>

    <template v-else>
      <!-- 章节管理 -->
      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 class="font-display text-lg font-bold text-rose-950">故事章节</h3>
            <p class="mt-1 text-xs leading-6 text-rose-700/50">先建章节，再把故事放进对应章节；章节下还有故事时不能删除。</p>
          </div>
          <button type="button" class="rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" :disabled="loading" @click="load">
            刷新
          </button>
        </div>

        <form class="mt-4 space-y-3" @submit.prevent="saveChapter">
          <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <div>
              <label for="studio-chapter-name" class="block text-sm font-semibold text-rose-900">章节名称</label>
              <input
                id="studio-chapter-name"
                v-model="chapterForm.name"
                maxlength="50"
                class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none transition placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                placeholder="章节名称，例如「初见」"
              >
            </div>
            <div>
              <label for="studio-chapter-sort" class="block text-sm font-semibold text-rose-900">排序</label>
              <input
                id="studio-chapter-sort"
                v-model.number="chapterForm.sortOrder"
                type="number"
                min="0"
                class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                placeholder="排序"
              >
            </div>
          </div>

          <div class="rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
            <ThemeColorField
              v-model="chapterForm.colorCode"
              input-id="studio-chapter-color"
              label="章节主题色"
              hint="章节导航、故事时间线与章节标签都会使用这个颜色。"
            />
            <div class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-100 bg-white/80 px-3 py-2.5">
              <span class="flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-[10px] font-bold shadow-sm" :style="chapterPreviewBadgeStyle">
                {{ chapterForm.id ? '章节' : '预览' }}
              </span>
              <span class="min-w-0 truncate text-sm font-semibold text-rose-900">{{ chapterForm.name.trim() || '章节名称预览' }}</span>
              <span class="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :style="chapterPreviewTagStyle">
                {{ chapterForm.isVisible ? '展示中' : '已隐藏' }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="inline-flex items-center gap-2 text-xs text-rose-700/60">
              <input v-model="chapterForm.isVisible" type="checkbox" class="h-4 w-4 rounded border-rose-300 text-rose-500 focus:ring-rose-400">
              在空间故事中显示该章节
            </label>
            <div class="flex items-center gap-2">
              <button
                type="submit"
                class="rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="chapterSaving"
              >
                {{ chapterSaving ? '保存中…' : (chapterForm.id ? '保存章节' : '新增章节') }}
              </button>
              <button
                v-if="chapterForm.id"
                type="button"
                class="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                @click="resetChapterForm"
              >
                取消
              </button>
            </div>
          </div>
        </form>

        <p v-if="chapterError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">
          {{ chapterError }}
        </p>

        <div v-if="!chapters.length" class="mt-4 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-4 py-8 text-center">
          <p class="text-sm font-semibold text-rose-800/70">还没有章节</p>
          <p class="mt-1 text-xs text-rose-700/45">先新增一个章节，再开始写故事。</p>
        </div>
        <ul v-else class="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            v-for="chapter in chapters"
            :key="chapter.id"
            class="relative flex items-start justify-between gap-3 overflow-hidden rounded-2xl border pl-5 pr-4 py-3"
            :class="chapterForm.id === chapter.id ? 'border-rose-300 bg-rose-50/60' : 'border-rose-100 bg-rose-50/25'"
          >
            <span class="absolute inset-y-0 left-0 w-1.5" :style="{ backgroundColor: chapterAccent(chapter) }" aria-hidden="true" />
            <div class="min-w-0">
              <p class="flex items-center gap-2 text-sm font-semibold text-rose-900">
                <span class="truncate">{{ chapter.name }}</span>
                <span v-if="!chapter.isVisible" class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">已隐藏</span>
              </p>
              <p class="mt-1 text-[11px] text-rose-700/45">{{ chapter.nodeCount }} 个故事 · 排序 {{ chapter.sortOrder ?? 0 }}</p>
            </div>
            <div class="flex shrink-0 gap-1.5">
              <button type="button" class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-white" @click="editChapter(chapter)">
                编辑
              </button>
              <button type="button" class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition hover:bg-white hover:text-rose-600" @click="removeChapter(chapter)">
                删除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- 故事节点 -->
      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 class="font-display text-lg font-bold text-rose-950">故事内容</h3>
            <p class="mt-1 text-xs leading-6 text-rose-700/50">新建内容默认仅空间成员可见；完成两人绑定后才可主动公开到恋爱广场。</p>
          </div>
          <ThemeSelect
            v-model="selectedChapterId"
            input-id="studio-story-filter"
            size="sm"
            placeholder="全部章节"
            :options="chapterFilterOptions"
          />
        </div>

        <div v-if="!filteredNodes.length" class="mt-4 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-4 py-8 text-center">
          <p class="text-sm font-semibold text-rose-800/70">还没有故事</p>
          <p class="mt-1 text-xs text-rose-700/45">在下方表单写下第一段故事。</p>
        </div>
        <ul v-else class="mt-4 space-y-2">
          <li v-for="node in filteredNodes" :key="node.id" class="rounded-2xl border border-rose-100 bg-rose-50/25 px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="flex flex-wrap items-center gap-2 text-sm font-semibold text-rose-900">
                  <span class="truncate">{{ node.title }}</span>
                  <span
                    v-if="node.tagLabel"
                    class="max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    :style="tagStyle(node.tagColor)"
                  >
                    {{ node.tagLabel }}
                  </span>
                  <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-500">{{ visibilityLabel(node.visibility) }}</span>
                  <span v-if="node.isMilestone" class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">里程碑</span>
                </p>
                <p class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-5 text-rose-700/45">
                  <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: chapterAccentById(node.chapterId) }" aria-hidden="true" />
                  <span>{{ node.chapterName || '未分章' }}</span>
                  <span>· {{ formatSpaceDateTime(node.happenedTime) }}</span>
                  <span v-if="node.location"> · {{ node.location }}</span>
                  <span v-if="node.images?.length"> · {{ node.images.length }} 张图片</span>
                </p>
                <p v-if="node.summary" class="mt-1 line-clamp-2 text-xs leading-5 text-rose-800/60">{{ node.summary }}</p>
              </div>
              <div class="flex shrink-0 gap-1.5">
                <button type="button" class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-white" @click="editNode(node)">
                  编辑
                </button>
                <button type="button" class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition hover:bg-white hover:text-rose-600" @click="removeNode(node)">
                  删除
                </button>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- 新增/编辑表单 -->
      <section id="story-node-form" class="scroll-mt-24 rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-display text-lg font-bold text-rose-950">{{ editingNodeId ? '编辑故事' : '新增故事' }}</h3>
          <button v-if="editingNodeId" type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50" @click="resetNodeForm">
            取消编辑
          </button>
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="saveNode">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="studio-node-chapter" class="block text-sm font-semibold text-rose-900">所属章节</label>
              <ThemeSelect
                v-model="nodeForm.chapterId"
                input-id="studio-node-chapter"
                class="mt-2"
                placeholder="请先创建章节"
                :options="chapterOptions"
              />
            </div>
            <div>
              <label for="studio-node-happened" class="block text-sm font-semibold text-rose-900">发生时间</label>
              <ThemeDatePicker
                v-model="nodeForm.happenedTime"
                input-id="studio-node-happened"
                class="mt-2"
                mode="datetime"
                placeholder="选择故事发生时间"
              />
            </div>
            <div class="sm:col-span-2">
              <label for="studio-node-title" class="block text-sm font-semibold text-rose-900">标题</label>
              <input id="studio-node-title" v-model="nodeForm.title" maxlength="100" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="这一章故事的名字">
            </div>
            <div class="sm:col-span-2">
              <label for="studio-node-summary" class="block text-sm font-semibold text-rose-900">摘要</label>
              <textarea id="studio-node-summary" v-model="nodeForm.summary" rows="2" maxlength="500" class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm leading-6 text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="一句话概括这段故事（选填）" />
            </div>
            <div class="sm:col-span-2">
              <label for="studio-node-content" class="block text-sm font-semibold text-rose-900">正文</label>
              <textarea id="studio-node-content" v-model="nodeForm.content" rows="6" maxlength="20000" class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm leading-7 text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="把那天发生的事写下来……" />
            </div>
            <div>
              <label for="studio-node-location" class="block text-sm font-semibold text-rose-900">地点</label>
              <input id="studio-node-location" v-model="nodeForm.location" maxlength="100" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="发生地点（选填）">
            </div>
            <div>
              <label for="studio-node-sort" class="block text-sm font-semibold text-rose-900">章节内排序</label>
              <input id="studio-node-sort" v-model.number="nodeForm.sortOrder" type="number" min="0" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100">
            </div>
            <div class="sm:col-span-2 rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-semibold text-rose-900">故事标签</p>
                <span class="text-[11px] text-rose-700/45">可选，用一句短标签概括这段故事</span>
              </div>
              <div class="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div>
                  <label for="studio-node-tag" class="block text-sm font-semibold text-rose-900">标签文字</label>
                  <input id="studio-node-tag" v-model="nodeForm.tagLabel" maxlength="30" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="例如：初见">
                </div>
                <ThemeColorField
                  v-model="nodeForm.tagColor"
                  input-id="studio-node-tag-color"
                  label="标签颜色"
                  allow-clear
                  hint="留空时使用默认玫瑰色；只在填写标签文字后展示。"
                />
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-100 bg-white/80 px-3 py-2.5">
                <span class="text-[11px] font-semibold text-rose-700/45">标签预览</span>
                <span class="max-w-full truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold" :style="nodeTagPreviewStyle">
                  {{ nodeForm.tagLabel.trim() || '故事标签' }}
                </span>
              </div>
            </div>
            <div>
              <label for="studio-node-visibility" class="block text-sm font-semibold text-rose-900">可见性</label>
              <ThemeSelect
                v-model="nodeForm.visibility"
                input-id="studio-node-visibility"
                class="mt-2"
                :options="visibilityOptions"
              />
            </div>
            <label class="flex items-center gap-2 self-end rounded-xl border border-rose-100 bg-rose-50/40 px-3.5 py-3 text-xs font-semibold text-rose-800">
              <input v-model="nodeForm.isMilestone" type="checkbox" class="h-4 w-4 rounded border-rose-300 text-rose-500 focus:ring-rose-400">
              标记为里程碑
            </label>
            <div class="sm:col-span-2">
              <SpaceImageField v-model="nodeForm.coverImage" input-id="studio-node-cover" label="封面图片" :disabled="nodeSaving" @uploading="onImageUploading" />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-rose-900">故事图片</p>
              <button type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50" @click="addImageRow">
                添加图片
              </button>
            </div>
            <p v-if="!nodeForm.images.length" class="mt-2 text-xs text-rose-700/45">还没有添加图片，可上传或粘贴图片地址。</p>
            <div v-for="(image, index) in nodeForm.images" :key="index" class="mt-3 rounded-2xl border border-rose-100 bg-rose-50/30 p-3">
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <SpaceImageField v-model="image.url" :input-id="`studio-node-image-${index}`" label="" :disabled="nodeSaving" @uploading="onImageUploading" />
                  <input v-model="image.altText" maxlength="100" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-rose-950 outline-none focus:border-rose-400" placeholder="图片描述（选填）">
                </div>
                <button type="button" class="mt-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition hover:bg-white hover:text-rose-600" @click="removeImageRow(index)">
                  移除
                </button>
              </div>
            </div>
          </div>

          <p v-if="nodeError" class="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">
            {{ nodeError }}
          </p>

          <div class="flex flex-wrap items-center gap-2">
            <button type="submit" class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" :disabled="nodeSaving || uploadingCount > 0 || !chapters.length">
              {{ nodeSaving ? '保存中…' : (uploadingCount > 0 ? '图片上传中…' : (editingNodeId ? '保存故事' : '新增故事')) }}
            </button>
            <button type="button" class="rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="nodeSaving" @click="resetNodeForm">
              清空表单
            </button>
            <span v-if="dirty" class="text-[11px] font-medium text-amber-600">有未保存的修改</span>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
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
  toBackendDateTime,
  toDateTimeLocalInput,
  VISIBILITY_OPTIONS,
} from '@/utils/spaceContent'

const props = defineProps({
  canPublish: { type: Boolean, default: false },
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

const editingNodeId = ref(null)
const nodeSaving = ref(false)
const uploadingCount = ref(0)
const nodeError = ref('')
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

/** 故事标签的浅底 + 主题文字样式；亮色会自动压暗文字，保证可读。 */
function tagStyle(color) {
  const accent = normalizeHexColor(color, DEFAULT_THEME_COLOR)
  return {
    backgroundColor: softenHexColor(accent),
    borderColor: themeBorderColor(accent),
    color: accentTextColor(accent),
  }
}

const nodeTagPreviewStyle = computed(() => tagStyle(nodeForm.tagColor))

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

function resetChapterForm() {
  chapterForm.id = null
  chapterForm.name = ''
  chapterForm.colorCode = '#D94F70'
  chapterForm.sortOrder = nextChapterSort()
  chapterForm.isVisible = true
  chapterError.value = ''
  captureBaseline()
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
}

function resetNodeForm() {
  editingNodeId.value = null
  uploadingCount.value = 0
  Object.assign(nodeForm, emptyNodeForm())
  nodeForm.chapterId = chapters.value[0]?.id ?? ''
  nodeForm.sortOrder = 0
  nodeError.value = ''
  captureBaseline()
}

function addImageRow() {
  nodeForm.images.push({ url: '', altText: '' })
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
    ensureSuccess(await saveStoryManageNode(payload), '故事保存失败')
    ElMessage.success(editingNodeId.value ? '故事已更新' : '故事已创建')
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
    ensureSuccess(await deleteStoryManageNode(node.id), '删除故事失败')
    ElMessage.success('故事已删除')
    await load()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '删除故事失败，请稍后重试'))
  }
}

onMounted(load)

defineExpose({ dirty, saving: nodeSaving })
</script>
