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
      <button type="button" class="btn-secondary mt-4" @click="handleRefresh">重新加载</button>
    </div>

    <div v-else class="space-y-5">
      <!-- 章节条：先浏览、按需编辑，不再常驻一整块表单 -->
      <section class="studio-panel" aria-labelledby="studio-story-heading">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h2 id="studio-story-heading" class="section-title">故事</h2>
            <p class="section-description">
              共 {{ nodes.length }} 篇故事 · {{ chapters.length }} 个章节。点击章节卡片筛选，再次点击取消筛选；章节下还有故事时不能删除。
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span v-if="chapterSort.saving" class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700" role="status">
              <span class="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" aria-hidden="true" />
              正在保存章节顺序…
            </span>
            <span v-else-if="chapterSort.dragging" class="text-[11px] font-semibold text-rose-700" role="status">松手后自动保存</span>
            <button
              type="button"
              class="btn-ghost"
              :disabled="loading || chapterSort.busy || nodeSort.busy"
              @click="handleRefresh"
            >
              刷新
            </button>
            <button
              ref="newChapterButtonRef"
              type="button"
              class="btn-secondary"
              :disabled="chapterSort.busy || nodeSort.busy"
              @click="openChapterCreate($event)"
            >
              新增章节
            </button>
            <button
              ref="newNodeButtonRef"
              type="button"
              class="btn-primary"
              :disabled="!chapters.length || chapterSort.busy || nodeSort.busy"
              aria-label="新建故事"
              @click="startNewStory($event)"
            >
              新建故事
            </button>
          </div>
        </header>

        <p v-if="chapterSortError" class="border-t border-rose-200 bg-rose-50/70 px-5 py-3 text-xs leading-5 text-rose-700" role="alert">
          {{ chapterSortError }}
        </p>

        <div class="px-5 py-4">
          <div v-if="!chapters.length" class="studio-empty">
            <p class="text-sm font-semibold text-stone-800">还没有章节</p>
            <p class="mt-1 text-xs text-stone-500">先新增一个章节，再开始写故事。</p>
          </div>
          <ul v-else ref="chapterListRef" class="flex flex-wrap gap-2" aria-label="故事章节筛选">
            <!-- 全部故事：清除筛选后恢复全局顺序 -->
            <li>
              <button
                type="button"
                class="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :class="selectedChapterId === 'all'
                  ? 'border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200'
                  : 'border-stone-200 bg-stone-50/70 text-stone-700 hover:border-rose-200 hover:bg-rose-50/40'"
                :aria-pressed="selectedChapterId === 'all'"
                @click="clearChapterFilter"
              >
                <span class="h-2 w-2 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                全部故事
                <span class="text-[10px] font-normal text-stone-500">{{ nodes.length }} 篇</span>
                <Check v-if="selectedChapterId === 'all'" class="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
              </button>
            </li>

            <li
              v-for="(chapter, index) in chapters"
              :key="chapter.id"
              :data-sort-index="index"
              :data-sort-id="chapter.id"
              :aria-grabbed="chapterSort.dragging && chapterSort.dragIndex === index ? 'true' : 'false'"
              class="studio-sortable-item flex items-center gap-0.5 rounded-lg border py-0.5 pl-0.5 pr-1 text-xs"
              :class="[
                isChapterSelected(chapter)
                  ? 'border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200'
                  : 'border-stone-200 bg-stone-50/70 text-stone-700 hover:border-rose-200',
                chapterSort.dragging && chapterSort.dragIndex === index ? 'studio-sort-placeholder relative z-10' : '',
              ]"
              @pointerdown="chapterSort.onRowPointerDown(index, $event)"
            >
              <SortHandleButton
                :label="`章节 ${chapter.name}`"
                :position="index + 1"
                :disabled="chapters.length < 2 || chapterSort.saving || nodeSort.busy"
                :saving="chapterSort.saving && String(chapterSort.savingId) === String(chapter.id)"
                :disabled-hint="chapterSort.saving ? '正在保存章节顺序' : '当前无法调整章节顺序'"
                @drag-start="chapterSort.startDrag(index, $event)"
                @move-up="chapterSort.moveByOffset(index, -1)"
                @move-down="chapterSort.moveByOffset(index, 1)"
              />
              <button
                type="button"
                class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-pressed="isChapterSelected(chapter)"
                :aria-label="`按章节 ${chapter.name} 筛选故事`"
                @click="toggleChapterFilter(chapter)"
              >
                <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: chapterAccent(chapter) }" aria-hidden="true" />
                <span class="max-w-40 truncate font-semibold" :title="chapter.name">{{ chapter.name }}</span>
                <span class="text-[10px] font-normal text-stone-500">{{ chapter.nodeCount }}</span>
                <span v-if="!chapter.isVisible" class="rounded bg-stone-200/80 px-1 text-[10px] text-stone-500">隐藏</span>
                <Check v-if="isChapterSelected(chapter)" class="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="rounded p-1 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`编辑章节 ${chapter.name}`"
                title="编辑章节"
                @click="editChapter(chapter, $event)"
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
      </section>

      <!-- 故事列表：页面只保留浏览与操作入口，编辑在弹窗内完成 -->
      <section class="studio-panel min-w-0" aria-labelledby="studio-story-list-heading">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h3 id="studio-story-list-heading" class="section-title">故事列表</h3>
            <p class="section-description">
              {{ selectedChapterId === 'all'
                ? `全部故事 · 共 ${visibleNodes.length} 篇 · 拖动修改跨章节的全局顺序`
                : `当前章节：${selectedChapterName || '未知章节'} · 共 ${visibleNodes.length} 篇 · 拖动只修改本章节内的顺序` }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-[11px]">
            <span v-if="nodeSort.saving" class="inline-flex items-center gap-1.5 font-semibold text-amber-700" role="status">
              <span class="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" aria-hidden="true" />
              正在保存顺序…
            </span>
            <span v-else-if="nodeSort.dragging" class="font-semibold text-rose-700" role="status">
              松手后自动保存
            </span>
            <span v-else class="hidden text-stone-400 md:inline">
              拖动手柄调整顺序，松手自动保存；聚焦手柄后可用上下方向键
            </span>
          </div>
        </header>

        <p v-if="nodeSortError" class="border-t border-rose-200 bg-rose-50/70 px-5 py-3 text-xs leading-5 text-rose-700" role="alert">
          {{ nodeSortError }}
        </p>

        <div v-if="!visibleNodes.length" class="studio-panel-body">
          <div class="studio-empty">
            <p class="text-sm font-semibold text-stone-800">
              {{ selectedChapterId === 'all' ? '还没有故事' : '这个章节还没有故事' }}
            </p>
            <p class="mt-1 text-xs text-stone-500">
              {{ selectedChapterId === 'all'
                ? '点击「新建故事」写下第一段。'
                : '可以在「新建故事」中选择该章节，或先查看全部故事。' }}
            </p>
            <button
              v-if="selectedChapterId !== 'all'"
              type="button"
              class="btn-secondary mt-3"
              @click="clearChapterFilter"
            >
              查看全部故事
            </button>
          </div>
        </div>
        <div v-else ref="storyListRef">
          <TransitionGroup
            tag="ul"
            name="studio-sort-list"
            class="divide-y divide-stone-100"
            aria-label="故事条目"
          >
          <li
            v-for="(node, index) in visibleNodes"
            :key="node.id"
            :data-sort-index="index"
            :data-sort-id="node.id"
            :aria-grabbed="nodeSort.dragging && nodeSort.dragIndex === index ? 'true' : 'false'"
            class="studio-sortable-item flex items-start gap-2 px-3 py-3 sm:px-4"
            :class="[
              nodeDialogOpen && editingNodeId === node.id ? 'bg-rose-50/60' : 'hover:bg-stone-50/70',
              nodeSort.dragging && nodeSort.dragIndex === index ? 'studio-sort-placeholder relative z-10' : '',
            ]"
            @pointerdown="nodeSort.onRowPointerDown(index, $event)"
          >
            <SortHandleButton
              class="mt-0.5"
              :label="`故事 ${node.title}`"
              :position="index + 1"
              :disabled="visibleNodes.length < 2 || nodeSort.saving || chapterSort.busy"
              :saving="nodeSort.saving && String(nodeSort.savingId) === String(node.id)"
              :disabled-hint="nodeSort.saving ? '正在保存顺序' : '当前无法调整顺序'"
              @drag-start="nodeSort.startDrag(index, $event)"
              @move-up="nodeSort.moveByOffset(index, -1)"
              @move-down="nodeSort.moveByOffset(index, 1)"
            />
            <button
              type="button"
              class="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              :aria-label="`查看并编辑故事 ${node.title}`"
              :aria-current="nodeDialogOpen && editingNodeId === node.id ? 'true' : undefined"
              @click="editNode(node, $event)"
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
            <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                class="btn-ghost !px-2 !py-1 !text-[11px]"
                :aria-label="`编辑故事 ${node.title}`"
                title="编辑故事"
                @click="editNode(node, $event)"
              >
                编辑
              </button>
              <button
                type="button"
                class="rounded p-1.5 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`删除故事 ${node.title}`"
                title="删除故事"
                @click="removeNode(node)"
              >
                <Delete class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
          </TransitionGroup>
        </div>
      </section>
    </div>

    <!-- 章节新增 / 编辑弹窗 -->
    <SpaceStudioDialog
      v-model="chapterDialogOpen"
      :title="chapterForm.id ? '编辑章节' : '新增章节'"
      description="章节名称、主题色和显示状态会同步到故事列表与详情页。"
      width="min(640px, calc(100vw - 24px))"
      :before-close="handleChapterDialogBeforeClose"
      @opened="focusChapterName"
      @closed="handleChapterDialogClosed"
    >
      <form id="studio-chapter-form" class="grid gap-4" @submit.prevent="saveChapter">
        <div>
          <label for="studio-chapter-name" class="field-label">章节名称</label>
          <input
            id="studio-chapter-name"
            ref="chapterNameInputRef"
            v-model="chapterForm.name"
            maxlength="50"
            class="field-input"
            placeholder="例如「初见」"
          >
        </div>
        <div class="grid gap-4 md:grid-cols-2">
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

        <p class="field-hint">
          {{ chapterForm.id ? '保存后保留当前顺序，可在列表中调整顺序。' : '保存后默认添加到列表末尾，可在列表中调整顺序。' }}
        </p>

        <p v-if="chapterError" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
          {{ chapterError }}
        </p>
      </form>
      <template #footer>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="chapterSaving" @click="closeChapterDialog">取消</button>
          <button type="submit" form="studio-chapter-form" class="btn-primary" :disabled="chapterSaving">
            {{ chapterSaving ? '保存中…' : (chapterForm.id ? '保存章节' : '新增章节') }}
          </button>
        </div>
      </template>
    </SpaceStudioDialog>

    <!-- 故事新增 / 编辑弹窗：全屏编辑页，先设置、最后写正文 -->
    <SpaceStudioDialog
      v-model="nodeDialogOpen"
      :title="editingNodeId ? '编辑故事' : '新建故事'"
      :description="editingNodeId
        ? '修改公开故事后会进入审核，广场继续展示旧版本。'
        : '新故事默认仅空间成员可见；设为公开后需要审核。'"
      fullscreen
      :before-close="handleNodeDialogBeforeClose"
      @opened="focusNodeTitle"
      @closed="handleNodeDialogClosed"
    >
      <form id="studio-story-form" class="space-y-5" @submit.prevent="saveNode">
        <!-- 基本信息：标题独占整行，章节、时间、地点并排 -->
        <section class="border-b border-stone-100 pb-5" aria-labelledby="studio-story-basic-heading">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="studio-story-basic-heading" class="text-sm font-bold text-stone-800">基本信息</h3>
            <p class="text-[11px] text-stone-400">标题与发生时间会展示在故事列表和详情页。</p>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div class="sm:col-span-2 xl:col-span-3">
              <label for="studio-node-title" class="field-label">故事标题</label>
              <input
                id="studio-node-title"
                ref="nodeTitleInputRef"
                v-model="nodeForm.title"
                maxlength="100"
                class="field-input"
                placeholder="这一章故事的名字"
              >
            </div>
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
            <div class="sm:col-span-2 xl:col-span-3">
              <label for="studio-node-summary" class="field-label">故事摘要</label>
              <textarea
                id="studio-node-summary"
                v-model="nodeForm.summary"
                rows="2"
                maxlength="500"
                class="field-input resize-y leading-6"
                placeholder="一句话概括这段故事（选填）"
              />
            </div>
          </div>
          <p class="field-hint">
            {{ editingNodeId ? '保存后保留当前顺序，可在列表中调整顺序。' : '保存后默认添加到列表末尾，可在列表中调整顺序。' }}
          </p>
        </section>

        <!-- 发布设置：保留既有可见性控制与审核状态提示 -->
        <section class="border-b border-stone-100 pb-5" aria-labelledby="studio-story-publish-heading">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="studio-story-publish-heading" class="text-sm font-bold text-stone-800">发布设置</h3>
            <p class="text-[11px] text-stone-400">公开内容需要审核，未完成绑定时不能选择公开。</p>
          </div>
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
          <div v-if="editingNodeReview" class="mt-3 flex flex-wrap items-center gap-2 text-[11px] leading-5" role="status">
            <span class="rounded-full px-2 py-0.5 font-semibold" :class="reviewStatusClass(editingNodeReview.reviewStatus)">
              {{ reviewStatusLabel(editingNodeReview.reviewStatus) }}
            </span>
            <span v-if="editingNodeReview.reviewStatus === 'PENDING'" class="text-stone-500">
              {{ editingNodeReview.reviewHasPublishedVersion ? '广场继续展示上一次审核通过的版本。' : '审核通过后才会出现在恋爱广场。' }}
            </span>
            <span v-else-if="editingNodeReview.reviewStatus === 'REJECTED'" class="text-rose-600">
              驳回原因：{{ editingNodeReview.reviewRejectReason || '未填写原因' }}
            </span>
            <span v-else-if="editingNodeReview.reviewStatus === 'PUBLISHED'" class="text-stone-500">
              这篇故事已在恋爱广场公开。
            </span>
          </div>
        </section>

        <!-- 故事展示设置：不再折叠，桌面端标签与颜色两列 -->
        <section class="border-b border-stone-100 pb-5" aria-labelledby="studio-story-display-heading">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="studio-story-display-heading" class="text-sm font-bold text-stone-800">故事展示设置</h3>
            <p class="text-[11px] text-stone-400">标签与封面会出现在故事列表和详情页，封面是故事唯一的配图。</p>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
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
          <div class="mt-3">
            <SpaceImageField
              v-model="nodeForm.coverImage"
              input-id="studio-node-cover"
              label="封面图片"
              :disabled="nodeSaving"
              @uploading="onImageUploading"
            />
          </div>
        </section>

        <!-- 正文：位于所有设置之后，独立全宽编辑 + 右侧实时预览 -->
        <section class="min-w-0" aria-labelledby="studio-node-content-label">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 id="studio-node-content-label" class="text-sm font-bold text-stone-800">正文</h3>
              <p class="mt-0.5 text-[11px] text-stone-400">支持 Markdown，可直接粘贴图片，右侧实时预览。</p>
            </div>
            <span class="text-[11px] font-normal text-stone-400">{{ contentLength }} / {{ STORY_CONTENT_MAX_LENGTH }} 字</span>
          </div>
          <MdEditor
            v-model="nodeForm.content"
            class="story-content-editor mt-3 min-w-0"
            editor-id="studio-story-content-editor"
            language="zh-CN"
            :toolbars="STORY_EDITOR_TOOLBARS"
            :footers="STORY_EDITOR_FOOTERS"
            :max-length="STORY_CONTENT_MAX_LENGTH"
            :preview="true"
            :disabled="nodeSaving"
            :on-upload-img="handleStoryImageUpload"
            placeholder="把那天发生的事写下来……"
          />
          <p
            v-if="imageUploadError"
            class="mt-2 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700"
            role="alert"
          >
            {{ imageUploadError }}
          </p>
          <p v-else-if="uploadingCount > 0" class="mt-2 text-[11px] font-medium text-amber-700" role="status">
            正在上传图片，完成后才能保存故事。
          </p>
          <p v-else class="field-hint">图片支持 JPG、PNG、WebP、GIF，单张不超过 5MB。</p>
        </section>

        <p v-if="nodeError" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
          {{ nodeError }}
        </p>
      </form>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span v-if="dirty" class="text-[11px] font-medium text-amber-700" role="status">有未保存的修改</span>
          <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              class="btn-secondary"
              :disabled="nodeSaving || uploadingCount > 0"
              @click="closeNodeDialog"
            >
              取消
            </button>
            <button
              type="submit"
              form="studio-story-form"
              class="btn-primary"
              :disabled="nodeSaving || uploadingCount > 0 || !chapters.length"
              :aria-label="editingNodeId ? '保存故事' : '创建故事'"
            >
              {{ nodeSaving ? '保存中…' : (uploadingCount > 0 ? '图片上传中…' : (editingNodeId ? '保存故事' : '创建故事')) }}
            </button>
          </div>
        </div>
      </template>
    </SpaceStudioDialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import { Check, Delete, EditPen } from '@element-plus/icons-vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import SpaceImageField from '@/components/frontend/space-studio/SpaceImageField.vue'
import SpaceStudioDialog from '@/components/frontend/space-studio/SpaceStudioDialog.vue'
import SortHandleButton from '@/components/frontend/space-studio/SortHandleButton.vue'
import ThemeColorField from '@/components/frontend/space-studio/ThemeColorField.vue'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
import ThemeSelect from '@/components/frontend/space-studio/ThemeSelect.vue'
import { useDragSort } from '@/composables/useDragSort'
import { normalizeSortItems } from '@/utils/reorderList'
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
  saveStoryChapterOrder,
  saveStoryManageChapter,
  saveStoryManageNode,
  saveStoryNodeGlobalOrder,
  saveStoryNodeOrder,
  uploadSpaceImage,
} from '@/api/spaceContent'
import { formatSpaceDateTime } from '@/utils/spaceFormat'
import {
  hasSelectedContentScope,
  resolveStorySortScope,
  sortStoryNodesForFilter,
} from '@/utils/spaceContentOrder'
import { createFormSnapshot, isFormDirty } from '@/utils/formBaseline'
import {
  STORY_CONTENT_MAX_LENGTH,
  STORY_EDITOR_FOOTERS,
  STORY_EDITOR_TOOLBARS,
  isStoryContentEmpty,
  isStoryContentTooLong,
  uploadStoryImages,
} from '@/utils/storyEditor'
import { confirmDiscardChanges } from '@/utils/unsavedChanges'
import { resolveSaveFeedback } from '@/utils/saveFeedback'
import {
  buildVisibilityOptions,
  ensureSuccess,
  readContentErrorMessage,
  reviewStatusLabel,
  toBackendDateTime,
  toDateTimeLocalInput,
  VISIBILITY_OPTIONS,
} from '@/utils/spaceContent'

const props = defineProps({
  canPublish: { type: Boolean, default: false },
  /** 重新提交公开审核后由父组件触发刷新。 */
  refreshKey: { type: [String, Number], default: '' },
})

const emit = defineEmits(['update:dirty', 'saved'])

const loading = ref(true)
const loadError = ref('')
const chapters = ref([])
const nodes = ref([])
const selectedChapterId = ref('all')

const chapterOptions = computed(() => chapters.value.map(chapter => ({ value: chapter.id, label: chapter.name })))
const visibilityOptions = computed(() => buildVisibilityOptions(props.canPublish))

const chapterForm = reactive({ id: null, name: '', colorCode: '#D94F70', isVisible: true })
const chapterSaving = ref(false)
const chapterError = ref('')
const chapterDialogOpen = ref(false)
const chapterNameInputRef = ref(null)
const newChapterButtonRef = ref(null)
let chapterDialogTrigger = null

const editingNodeId = ref(null)
const nodeSaving = ref(false)
const uploadingCount = ref(0)
const nodeError = ref('')
const imageUploadError = ref('')
const nodeDialogOpen = ref(false)
const nodeTitleInputRef = ref(null)
const newNodeButtonRef = ref(null)
let nodeDialogTrigger = null
const nodeForm = reactive(emptyNodeForm())
const chapterBaseline = ref('')
const nodeBaseline = ref('')

/** 章节卡片直接拖拽：整章全局排序，松手即保存。 */
const chapterSortError = ref('')
const chapterDrag = useDragSort({
  items: chapters,
  enabled: () => !nodeSort.busy && !chapterDialogOpen.value && !nodeDialogOpen.value,
  onDrop: async (orderedChapters) => {
    chapterSortError.value = ''
    const items = normalizeSortItems(orderedChapters)
    ensureSuccess(await saveStoryChapterOrder({ items }), '章节排序保存失败')
    orderedChapters.forEach((chapter, index) => {
      chapter.sortOrder = (index + 1) * 10
    })
    ElMessage.success('章节顺序已保存')
  },
  onError: (error) => {
    chapterSortError.value = readContentErrorMessage(error, '章节排序未保存，已恢复原顺序，请重试')
    ElMessage.error(chapterSortError.value)
  },
})
const chapterListRef = chapterDrag.listRef
const chapterSort = reactive({
  saving: chapterDrag.saving,
  savingId: chapterDrag.savingId,
  dragging: chapterDrag.dragging,
  dragIndex: chapterDrag.dragIndex,
  busy: chapterDrag.busy,
  startDrag: chapterDrag.startDrag,
  onRowPointerDown: chapterDrag.onRowPointerDown,
  moveByOffset: chapterDrag.moveByOffset,
  cancelDrag: chapterDrag.cancelDrag,
})

/**
 * 故事列表直接拖拽排序。
 *
 * 全部故事视图写 global_sort_order，选中章节后只写该章节的 sort_order；
 * 松手即提交，失败时由 useDragSort 恢复拖拽前顺序。
 */
const visibleNodes = ref([])
const nodeSortError = ref('')

const nodeDrag = useDragSort({
  items: visibleNodes,
  enabled: () => !chapterSort.busy && !chapterDialogOpen.value && !nodeDialogOpen.value,
  onDrop: async (orderedNodes) => {
    nodeSortError.value = ''
    const scope = resolveStorySortScope(selectedChapterId.value)
    const items = normalizeSortItems(orderedNodes)
    const serverItems = scope.scope === 'global'
      ? ensureSuccess(await saveStoryNodeGlobalOrder({ items }), '故事全局排序保存失败')
      : ensureSuccess(await saveStoryNodeOrder({ chapterId: scope.chapterId, items }), '故事排序保存失败')
    applyNodeServerOrder(serverItems)
    ElMessage.success('顺序已保存')
  },
  onError: (error) => {
    nodeSortError.value = readContentErrorMessage(error, '故事排序未保存，已恢复原顺序，请重试')
    ElMessage.error(nodeSortError.value)
  },
})

const storyListRef = nodeDrag.listRef
const nodeSort = reactive({
  saving: nodeDrag.saving,
  savingId: nodeDrag.savingId,
  active: nodeDrag.active,
  dragging: nodeDrag.dragging,
  dragIndex: nodeDrag.dragIndex,
  overIndex: nodeDrag.overIndex,
  busy: nodeDrag.busy,
  startDrag: nodeDrag.startDrag,
  onRowPointerDown: nodeDrag.onRowPointerDown,
  moveByOffset: nodeDrag.moveByOffset,
  cancelDrag: nodeDrag.cancelDrag,
})

/** 服务端排序结果为准：按返回 ID 重排完整对象，并同步两套排序字段。 */
function applyNodeServerOrder(serverItems) {
  if (!Array.isArray(serverItems)) return
  const remaining = new Map(visibleNodes.value.map(node => [String(node.id), node]))
  const ordered = []
  serverItems.forEach(item => {
    const node = remaining.get(String(item?.id))
    if (!node) return
    node.sortOrder = item.sortOrder
    node.globalSortOrder = item.globalSortOrder
    ordered.push(node)
    remaining.delete(String(item.id))
  })
  visibleNodes.value.forEach(node => {
    if (remaining.has(String(node.id))) ordered.push(node)
  })
  visibleNodes.value = ordered
  if (resolveStorySortScope(selectedChapterId.value).scope === 'global') {
    nodes.value = ordered.slice()
  }
}

/** 故事数据变化时重建可拖拽列表；保存期间保持不变，避免请求结果被覆盖。 */
watch(nodes, () => {
  if (nodeSort.saving || nodeSort.active) return
  visibleNodes.value = sortStoryNodesForFilter(nodes.value, selectedChapterId.value)
}, { immediate: true })

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

const contentLength = computed(() => String(nodeForm.content ?? '').length)

/** 正在编辑的故事，用于展示审核状态；列表刷新后仍以 ID 关联。 */
const editingNodeReview = computed(() => {
  if (!editingNodeId.value) return null
  const node = nodes.value.find(item => String(item.id) === String(editingNodeId.value))
  return node && reviewStatusLabel(node.reviewStatus) ? node : null
})

/** 封面图片上传期间禁止提交，避免保存到空白封面。 */
function onImageUploading(value) {
  uploadingCount.value = Math.max(0, uploadingCount.value + (value ? 1 : -1))
}

/**
 * 正文粘贴 / 选择图片后上传，再把 URL 交给 MdEditor 自动插入 Markdown。
 * 任一图片失败都不会调用回调，正文保持原样，用户可以重新粘贴或重试。
 */
async function handleStoryImageUpload(files, callback) {
  const list = Array.from(files ?? [])
  if (!list.length) return
  imageUploadError.value = ''
  uploadingCount.value += 1
  try {
    const urls = await uploadStoryImages(list, async (file) => (
      ensureSuccess(await uploadSpaceImage(file), '图片上传失败，请稍后重试')
    ))
    callback(urls)
  } catch (error) {
    const message = readContentErrorMessage(error, '图片上传失败，请稍后重试')
    imageUploadError.value = message
    ElMessage.error(message)
  } finally {
    uploadingCount.value = Math.max(0, uploadingCount.value - 1)
  }
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
    isMilestone: false,
    visibility: 0,
  }
}

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

/** 章节快照只保留保存接口真正提交的字段。 */
function chapterFormSnapshot() {
  return {
    name: chapterForm.name.trim(),
    colorCode: normalizeHexColor(chapterForm.colorCode),
    isVisible: Boolean(chapterForm.isVisible),
  }
}

/** 故事快照与保存请求保持一致：文本 trim、颜色随标签，封面是唯一配图。 */
function nodeFormSnapshot() {
  const tagLabel = nodeForm.tagLabel.trim()
  return {
    chapterId: nodeForm.chapterId,
    title: nodeForm.title.trim(),
    summary: nodeForm.summary.trim(),
    content: nodeForm.content.trim(),
    happenedTime: nodeForm.happenedTime,
    location: nodeForm.location.trim(),
    coverImage: nodeForm.coverImage.trim(),
    tagLabel,
    tagColor: tagLabel ? normalizeHexColor(nodeForm.tagColor) : '',
    isMilestone: Boolean(nodeForm.isMilestone),
    visibility: Number(nodeForm.visibility),
  }
}

const chapterDirty = computed(() => isFormDirty(chapterBaseline.value, chapterFormSnapshot()))
const nodeDirty = computed(() => isFormDirty(nodeBaseline.value, nodeFormSnapshot()))
const dirty = computed(() => (
  chapterDirty.value || nodeDirty.value
))

function emitDirty() {
  emit('update:dirty', dirty.value)
}

function captureChapterBaseline() {
  chapterBaseline.value = createFormSnapshot(chapterFormSnapshot())
  emitDirty()
}

function captureNodeBaseline() {
  nodeBaseline.value = createFormSnapshot(nodeFormSnapshot())
  emitDirty()
}

watch(dirty, emitDirty)

/** 统一的覆盖前确认：只有真正 dirty 时才询问。 */
async function confirmOverwrite(message, hasChanges) {
  if (!hasChanges) return true
  return confirmDiscardChanges(message)
}

const selectedChapterName = computed(() => (
  chapters.value.find(chapter => String(chapter.id) === String(selectedChapterId.value))?.name || ''
))

function isChapterSelected(chapter) {
  return String(selectedChapterId.value) === String(chapter.id)
}

/** 点击已选中的章节卡片取消筛选，恢复全部故事。 */
function toggleChapterFilter(chapter) {
  if (nodeSort.busy || chapterSort.busy) return
  selectedChapterId.value = isChapterSelected(chapter) ? 'all' : chapter.id
}

function clearChapterFilter() {
  if (nodeSort.busy || chapterSort.busy) return
  selectedChapterId.value = 'all'
}

/** 章节被删除后，清除已失效的筛选条件。 */
function syncSelectedChapterIfMissing() {
  if (hasSelectedContentScope(chapters.value, selectedChapterId.value)) return
  selectedChapterId.value = 'all'
}

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
  chapterForm.isVisible = true
  chapterError.value = ''
  captureChapterBaseline()
}

/** 记住触发弹窗的元素，关闭后把焦点还回去，避免掉到页面顶部。 */
function rememberDialogTrigger(event) {
  if (event?.currentTarget instanceof HTMLElement) return event.currentTarget
  return null
}

function restoreDialogFocus(trigger, fallbackRef) {
  const target = trigger?.isConnected ? trigger : fallbackRef.value
  nextTick(() => {
    target?.focus({ preventScroll: true })
  })
}

async function openChapterCreate(event) {
  if (nodeSort.busy) return
  if (!(await confirmOverwrite('新建章节会覆盖章节表单里未保存的内容，确定继续吗？', chapterDirty.value))) return
  chapterDialogTrigger = rememberDialogTrigger(event)
  resetChapterForm()
  chapterDialogOpen.value = true
}

async function closeChapterDialog() {
  if (chapterSaving.value) return
  if (!(await confirmOverwrite('关闭章节编辑会丢弃未保存的章节修改，确定继续吗？', chapterDirty.value))) return
  chapterDialogOpen.value = false
}

async function handleChapterDialogBeforeClose(done) {
  if (chapterSaving.value) return
  if (!(await confirmOverwrite('关闭章节编辑会丢弃未保存的章节修改，确定继续吗？', chapterDirty.value))) return
  done()
}

function handleChapterDialogClosed() {
  resetChapterForm()
  const trigger = chapterDialogTrigger
  chapterDialogTrigger = null
  restoreDialogFocus(trigger, newChapterButtonRef)
}

/** 弹窗打开动画结束后聚焦第一个输入框。 */
function focusChapterName() {
  nextTick(() => {
    chapterNameInputRef.value?.focus({ preventScroll: true })
  })
}

async function editChapter(chapter, event) {
  if (nodeSort.busy) return
  if (chapterDialogOpen.value && String(chapterForm.id) === String(chapter.id)) {
    focusChapterName()
    return
  }
  if (!(await confirmOverwrite('切换章节会丢弃当前未保存的章节修改，确定继续吗？', chapterDirty.value))) return
  chapterDialogTrigger = rememberDialogTrigger(event)
  chapterForm.id = chapter.id
  chapterForm.name = chapter.name || ''
  chapterForm.colorCode = normalizeHexColor(chapter.colorCode, DEFAULT_THEME_COLOR)
  chapterForm.isVisible = chapter.isVisible !== false
  chapterError.value = ''
  chapterDialogOpen.value = true
  captureChapterBaseline()
}

function resetNodeForm() {
  editingNodeId.value = null
  uploadingCount.value = 0
  Object.assign(nodeForm, emptyNodeForm())
  nodeForm.chapterId = chapters.value[0]?.id ?? ''
  nodeError.value = ''
  imageUploadError.value = ''
  captureNodeBaseline()
}

async function startNewStory(event) {
  if (nodeSort.busy) return
  if (!(await confirmOverwrite('新建故事会丢弃当前未保存的故事修改，确定继续吗？', nodeDirty.value))) return
  nodeDialogTrigger = rememberDialogTrigger(event)
  resetNodeForm()
  nodeDialogOpen.value = true
  focusNodeTitle()
}

/** 把列表中的故事载入弹窗表单，并重建 clean 基线。 */
function loadNodeIntoForm(node) {
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
  nodeForm.isMilestone = node.isMilestone === true
  nodeForm.visibility = Number(node.visibility) || 0
  nodeError.value = ''
  imageUploadError.value = ''
  captureNodeBaseline()
}

/** 切换故事后把焦点交给标题输入框，让键盘与读屏用户确认当前编辑对象。 */
function focusNodeTitle() {
  nextTick(() => {
    nodeTitleInputRef.value?.focus({ preventScroll: true })
  })
}

async function closeNodeDialog() {
  if (nodeSaving.value || uploadingCount.value > 0) return
  if (!(await confirmOverwrite('关闭故事弹窗会丢弃当前未保存的故事修改，确定继续吗？', nodeDirty.value))) return
  nodeDialogOpen.value = false
}

async function handleNodeDialogBeforeClose(done) {
  if (nodeSaving.value || uploadingCount.value > 0) return
  if (!(await confirmOverwrite('关闭故事弹窗会丢弃当前未保存的故事修改，确定继续吗？', nodeDirty.value))) return
  done()
}

function handleNodeDialogClosed() {
  resetNodeForm()
  const trigger = nodeDialogTrigger
  nodeDialogTrigger = null
  restoreDialogFocus(trigger, newNodeButtonRef)
}

async function editNode(node, event) {
  if (nodeSort.busy) return false
  if (nodeDialogOpen.value && String(editingNodeId.value) === String(node.id)) {
    focusNodeTitle()
    return true
  }
  if (!(await confirmOverwrite('切换故事会丢弃当前未保存的故事修改，确定继续吗？', nodeDirty.value))) return false
  nodeDialogTrigger = rememberDialogTrigger(event)
  loadNodeIntoForm(node)
  nodeDialogOpen.value = true
  focusNodeTitle()
  return true
}

/** 章节列表变化后，若当前干净的新故事表单指向了不存在的章节，回落到第一个章节。 */
function syncNodeChapterIfMissing() {
  if (nodeDirty.value) return
  const exists = chapters.value.some(chapter => String(chapter.id) === String(nodeForm.chapterId))
  if (exists) return
  nodeForm.chapterId = chapters.value[0]?.id ?? ''
  captureNodeBaseline()
}

async function handleRefresh() {
  if (nodeSort.busy || chapterSort.busy) return
  if (!(await confirmOverwrite('刷新会重新加载数据并丢弃当前未保存的修改，确定继续吗？', dirty.value))) return
  await load()
}



/** 切换章节时取消未完成的拖拽，并按新筛选重建列表。 */
watch(selectedChapterId, () => {
  nodeDrag.cancelDrag()
  nodeSortError.value = ''
  if (nodeSort.saving) return
  visibleNodes.value = sortStoryNodesForFilter(nodes.value, selectedChapterId.value)
})

/**
 * @param {{ resetForms?: boolean }} options
 * resetForms=false 时只刷新列表数据，保留当前表单，避免覆盖正在编辑的内容。
 */
async function load({ resetForms = true } = {}) {
  loading.value = true
  loadError.value = ''
  try {
    const [chapterData, nodeData] = await Promise.all([
      fetchStoryManageChapters().then(r => ensureSuccess(r, '章节加载失败')),
      fetchStoryManageNodes().then(r => ensureSuccess(r, '故事加载失败')),
    ])
    chapters.value = Array.isArray(chapterData) ? chapterData : []
    nodes.value = Array.isArray(nodeData) ? nodeData : []
    // 章节被删除或不再可见时，筛选条件回落到全部故事。
    syncSelectedChapterIfMissing()
    if (resetForms) {
      chapterDrag.cancelDrag()
      nodeDrag.cancelDrag()
      chapterDialogOpen.value = false
      nodeDialogOpen.value = false
      resetChapterForm()
      resetNodeForm()
    } else {
      syncNodeChapterIfMissing()
    }
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
    const savedMessage = chapterForm.id ? '章节已更新' : '章节已创建'
    ensureSuccess(await saveStoryManageChapter({
      id: chapterForm.id,
      name,
      colorCode,
      isVisible: chapterForm.isVisible,
    }), '章节保存失败')
    ElMessage.success(savedMessage)
    const feedback = resolveSaveFeedback(null, savedMessage)
    // 保存成功后重建被保存表单的基线，避免自动刷新再次触发放弃确认。
    await load({ resetForms: false })
    chapterDialogOpen.value = false
    resetChapterForm()
    emit('saved', { ...feedback, dirtyAfterSave: dirty.value })
  } catch (error) {
    chapterError.value = readContentErrorMessage(error, '章节保存失败，请稍后重试')
    ElMessage.error(chapterError.value)
  } finally {
    chapterSaving.value = false
  }
}

async function removeChapter(chapter) {
  if (nodeSort.busy) return
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
    await load({ resetForms: false })
    if (String(chapterForm.id) === String(chapter.id)) {
      chapterDialogOpen.value = false
      resetChapterForm()
    }
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
  if (isStoryContentEmpty(nodeForm.content)) {
    nodeError.value = '故事正文不能为空'
    return
  }
  if (isStoryContentTooLong(nodeForm.content)) {
    nodeError.value = `故事正文不能超过 ${STORY_CONTENT_MAX_LENGTH} 字`
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
  const wasEditing = Boolean(editingNodeId.value)
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
      isMilestone: nodeForm.isMilestone,
      visibility: Number(nodeForm.visibility),
    }
    const result = ensureSuccess(await saveStoryManageNode(payload), '故事保存失败')
    const successMessage = wasEditing ? '故事已保存' : '故事已创建'
    const feedback = resolveSaveFeedback(result, successMessage)
    ElMessage.success(successMessage)
    // 先刷新列表并重建 clean 基线，再关闭弹窗；表单在关闭动画结束后由 handleNodeDialogClosed 重置。
    await load({ resetForms: false })
    captureNodeBaseline()
    nodeDialogOpen.value = false
    emit('saved', { ...feedback, dirtyAfterSave: dirty.value })
  } catch (error) {
    // 保存失败时保持弹窗和用户输入不变，只展示可读错误。
    const message = readContentErrorMessage(error, '故事保存失败，请稍后重试')
    nodeError.value = message
    ElMessage.error(message)
  } finally {
    nodeSaving.value = false
  }
}

async function removeNode(node) {
  if (nodeSort.busy) return
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
    await load({ resetForms: false })
    if (String(editingNodeId.value) === String(node.id)) resetNodeForm()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '删除故事失败，请稍后重试'))
  }
}

onMounted(load)

/** 审核状态刷新只同步列表；用户正在编辑或保存顺序时保留当前状态。 */
watch(() => props.refreshKey, () => {
  if (nodeSort.saving) return
  load({ resetForms: !dirty.value })
})

defineExpose({ dirty, saving: nodeSaving })
</script>

<style scoped>
/* 正文高度跟随视口，长文在编辑器内部滚动，不会把底部保存栏推出页面。 */
/* MdEditor 根节点同时带有 story-content-editor 与 md-editor，样式直接作用在根节点上。 */
.story-content-editor {
  height: clamp(24rem, 58vh, 42rem);
  border-color: #e7e5e4;
  border-radius: 0.75rem;
  --md-color: #44403c;
  --md-bk-color: #ffffff;
  --md-border-color: #e7e5e4;
  --md-border-hover-color: #f9a8b8;
  --md-border-active-color: #f43f5e;
  --md-scrollbar-thumb-color: #d6d3d1;
}

.story-content-editor :deep(.md-editor-toolbar-wrapper),
.story-content-editor :deep(.md-editor-footer) {
  background-color: #fafaf9;
}

.story-content-editor :deep(.md-editor-input-wrapper) {
  font-size: 14px;
  line-height: 1.75;
}

/* 右侧预览沿用故事详情页的玫瑰色 Markdown 排版。 */
.story-content-editor :deep(.md-editor-preview-wrapper) {
  border-left: 1px solid #f5f5f4;
  background-color: #fffdfd;
}

.story-content-editor :deep(.md-editor-preview) {
  padding: 1.15rem 1.35rem;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.9;
  color: #3b2f2f;
}

.story-content-editor :deep(.md-editor-preview h1),
.story-content-editor :deep(.md-editor-preview h2),
.story-content-editor :deep(.md-editor-preview h3),
.story-content-editor :deep(.md-editor-preview h4) {
  font-family: 'Noto Serif SC', serif;
  color: #4a1d2f;
  letter-spacing: -0.02em;
}

.story-content-editor :deep(.md-editor-preview h1) {
  margin-top: 0;
  font-size: 1.75rem;
}

.story-content-editor :deep(.md-editor-preview h2) {
  margin-top: 2rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #ffe4e6;
  font-size: 1.35rem;
}

.story-content-editor :deep(.md-editor-preview h3) {
  margin-top: 1.6rem;
  font-size: 1.1rem;
}

.story-content-editor :deep(.md-editor-preview a) {
  color: #e11d48;
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}

.story-content-editor :deep(.md-editor-preview img) {
  max-width: 100%;
  height: auto;
  margin: 1.25rem auto;
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(159, 18, 57, 0.1);
}

.story-content-editor :deep(.md-editor-preview blockquote) {
  margin: 1.25rem 0;
  padding: 0.85rem 1rem;
  border-radius: 0 12px 12px 0;
  border-left-color: #fda4af;
  background: rgba(255, 241, 242, 0.65);
  color: #9f5468;
}

.story-content-editor :deep(.md-editor-preview ol) {
  list-style: decimal !important;
  padding-left: 1.75em;
}

.story-content-editor :deep(.md-editor-preview ul) {
  list-style: disc !important;
  padding-left: 1.75em;
}

.story-content-editor :deep(.md-editor-preview code) {
  border-radius: 6px;
  background: #fff1f2;
  color: #be123c;
  overflow-wrap: anywhere;
}

.story-content-editor :deep(.md-editor-preview pre) {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid #ffe4e6;
  border-radius: 12px;
  background: #fffafb;
}

.story-content-editor :deep(.md-editor-preview table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

/* 移动端改为上下排列，编辑区与预览区各占一半高度，且不产生横向滚动。 */
@media (max-width: 767px) {
  .story-content-editor {
    height: clamp(28rem, 68vh, 36rem);
  }

  .story-content-editor :deep(.md-editor-content-wrapper) {
    flex-direction: column;
  }

  .story-content-editor :deep(.md-editor-content-wrapper > .md-editor-custom-scrollbar) {
    width: 100% !important;
    height: auto;
    flex: 1 1 0;
    min-height: 0;
  }

  .story-content-editor :deep(.md-editor-resize-operate) {
    display: none !important;
  }

  .story-content-editor :deep(.md-editor-preview-wrapper) {
    border-top: 1px solid #f5f5f4;
    border-left: none;
  }

  .story-content-editor :deep(.md-editor-preview) {
    padding: 0.9rem 1rem;
    font-size: 13px;
  }
}
</style>
