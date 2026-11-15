<template>
  <div>
    <div v-if="loading" class="studio-panel px-5 py-6" aria-label="正在加载相册" aria-busy="true">
      <div class="h-5 w-24 animate-pulse rounded bg-stone-100" />
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="n in 3" :key="n" class="h-44 animate-pulse rounded-lg bg-stone-50" />
      </div>
    </div>

    <div v-else-if="loadError" class="studio-panel px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="btn-secondary mt-4" @click="handleRefresh">重新加载</button>
    </div>

    <div v-else class="space-y-5">
      <!-- 相册工具条与分类管理：分类按需展开，不再常驻大表单 -->
      <section class="studio-panel" aria-labelledby="studio-photo-heading">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h2 id="studio-photo-heading" class="section-title">相册</h2>
            <p class="section-description">
              共 {{ total }} 张照片 · {{ categories.length }} 个分类。点击分类卡片筛选，再次点击取消筛选；分类下仍有照片时不能删除。
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span v-if="categorySort.saving" class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700" role="status">
              <span class="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" aria-hidden="true" />
              正在保存分类顺序…
            </span>
            <span v-else-if="categorySort.dragging" class="text-[11px] font-semibold text-rose-700" role="status">松手后自动保存</span>
            <button
              type="button"
              class="btn-ghost"
              :disabled="categorySort.busy || photoSort.busy"
              @click="handleRefresh"
            >
              刷新
            </button>
            <button
              ref="newCategoryButtonRef"
              type="button"
              class="btn-secondary"
              :disabled="categorySort.busy || photoSort.busy"
              @click="openCategoryCreate($event)"
            >
              新增分类
            </button>
            <button
              ref="newPhotoButtonRef"
              type="button"
              class="btn-primary"
              :disabled="!categories.length || categorySort.busy || photoSort.busy"
              @click="startNewPhoto($event)"
            >
              新增照片
            </button>
          </div>
        </header>

        <p v-if="categorySortError" class="border-t border-rose-200 bg-rose-50/70 px-5 py-3 text-xs leading-5 text-rose-700" role="alert">
          {{ categorySortError }}
        </p>

        <div class="px-5 py-4">
          <div v-if="!categories.length" class="studio-empty">
            <p class="text-sm font-semibold text-stone-800">还没有相册分类</p>
            <p class="mt-1 text-xs text-stone-500">先新增一个分类，再上传照片。</p>
          </div>
          <ul v-else ref="categoryListRef" class="flex flex-wrap gap-2" aria-label="相册分类筛选">
            <!-- 全部照片：清除筛选后恢复全局顺序 -->
            <li>
              <button
                type="button"
                class="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :class="filterCategoryId === 'all'
                  ? 'border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200'
                  : 'border-stone-200 bg-stone-50/70 text-stone-700 hover:border-rose-200 hover:bg-rose-50/40'"
                :aria-pressed="filterCategoryId === 'all'"
                @click="clearCategoryFilter"
              >
                <span class="h-2 w-2 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                全部照片
                <Check v-if="filterCategoryId === 'all'" class="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
              </button>
            </li>

            <li
              v-for="(category, index) in categories"
              :key="category.id"
              :data-sort-index="index"
              :data-sort-id="category.id"
              :aria-grabbed="categorySort.dragging && categorySort.dragIndex === index ? 'true' : 'false'"
              class="studio-sortable-item flex items-center gap-0.5 rounded-lg border py-0.5 pl-0.5 pr-1 text-xs"
              :class="[
                isCategorySelected(category)
                  ? 'border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200'
                  : 'border-stone-200 bg-stone-50/70 text-stone-700 hover:border-rose-200',
                categorySort.dragging && categorySort.dragIndex === index ? 'studio-sort-placeholder relative z-10' : '',
              ]"
              @pointerdown="categorySort.onRowPointerDown(index, $event)"
            >
              <SortHandleButton
                :label="`分类 ${category.categoryName}`"
                :position="index + 1"
                :disabled="categories.length < 2 || categorySort.saving || photoSort.busy"
                :saving="categorySort.saving && String(categorySort.savingId) === String(category.id)"
                :disabled-hint="categorySort.saving ? '正在保存分类顺序' : '当前无法调整分类顺序'"
                @drag-start="categorySort.startDrag(index, $event)"
                @move-up="categorySort.moveByOffset(index, -1)"
                @move-down="categorySort.moveByOffset(index, 1)"
              />
              <button
                type="button"
                class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-pressed="isCategorySelected(category)"
                :aria-label="`按分类 ${category.categoryName} 筛选照片`"
                @click="toggleCategoryFilter(category)"
              >
                <span class="max-w-40 truncate font-semibold" :title="category.categoryName">{{ category.categoryName }}</span>
                <span
                  class="rounded px-1 text-[10px] font-normal"
                  :class="category.isEnabled === false ? 'bg-stone-200/80 text-stone-500' : 'bg-emerald-50 text-emerald-700'"
                >
                  {{ category.isEnabled === false ? '停用' : '启用' }}
                </span>
                <Check v-if="isCategorySelected(category)" class="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="rounded p-1 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`编辑分类 ${category.categoryName}`"
                title="编辑分类"
                @click="editCategory(category, $event)"
              >
                <EditPen class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="rounded p-1 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`删除分类 ${category.categoryName}`"
                title="删除分类"
                @click="removeCategory(category)"
              >
                <Delete class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </section>

      <section class="studio-panel min-w-0" aria-labelledby="studio-photo-list-heading">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h3 id="studio-photo-list-heading" class="section-title">照片</h3>
            <p class="section-description">
              {{ filterCategoryId === 'all'
                ? '全部照片'
                : `当前分类：${selectedCategoryName || '未知分类'}` }}
              · 共 {{ total }} 张 · 拖动修改{{ filterCategoryId === 'all' ? '跨分类的全局顺序' : '该分类内的顺序' }}
              · 第 {{ current }} / {{ totalPages }} 页
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-[11px]">
            <span v-if="photoSort.saving" class="inline-flex items-center gap-1.5 font-semibold text-amber-700" role="status">
              <span class="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" aria-hidden="true" />
              正在保存顺序…
            </span>
            <span v-else-if="photoSort.dragging" class="font-semibold text-rose-700" role="status">
              松手后自动保存
            </span>
            <span v-else-if="photoSortPreparing" class="text-stone-500" role="status">
              正在准备拖拽排序…
            </span>
            <span v-else class="hidden text-stone-400 md:inline">
              拖动手柄调整顺序，松手自动保存；聚焦手柄后可用上下方向键
            </span>
          </div>
        </header>

        <div v-if="photoSortError" class="flex flex-wrap items-center justify-between gap-2 border-t border-rose-200 bg-rose-50/70 px-5 py-3" role="alert">
          <p class="text-xs leading-5 text-rose-700">{{ photoSortError }}</p>
          <button type="button" class="btn-secondary !py-1.5" @click="refreshSortBuffer">重新准备排序</button>
        </div>

        <div v-if="!photos.length" class="studio-panel-body">
          <div class="studio-empty">
            <p class="text-sm font-semibold text-stone-800">
              {{ filterCategoryId === 'all' ? '还没有照片' : '这个分类还没有照片' }}
            </p>
            <p class="mt-1 text-xs text-stone-500">
              {{ filterCategoryId === 'all'
                ? '点击「新增照片」添加第一张。'
                : '可以在「新增照片」中选择该分类，或先查看全部照片。' }}
            </p>
            <button
              v-if="filterCategoryId !== 'all'"
              type="button"
              class="btn-secondary mt-3"
              @click="clearCategoryFilter"
            >
              查看全部照片
            </button>
          </div>
        </div>

        <div v-else ref="photoListRef">
          <TransitionGroup
            tag="ul"
            name="studio-sort-list"
            class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-label="照片列表"
          >
          <li
            v-for="(photo, index) in photos"
            :key="photo.id"
            :data-sort-index="index"
            :data-sort-id="photo.id"
            :aria-grabbed="photoSort.dragging && photoSort.dragIndex === index ? 'true' : 'false'"
            class="studio-sortable-item overflow-hidden rounded-xl border bg-white"
            :class="[
              photoDialogOpen && photoForm.id === photo.id ? 'border-rose-300 ring-1 ring-rose-100' : 'border-stone-200 hover:border-stone-300',
              photoSort.dragging && photoSort.dragIndex === index ? 'studio-sort-placeholder relative z-10' : '',
            ]"
            @pointerdown="photoSort.onRowPointerDown(index, $event)"
          >
            <button
              v-if="photo.url"
              type="button"
              class="group relative block w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300"
              :aria-label="`查看照片详情 ${photo.title || '未命名照片'}`"
              @click="openPhotoPreview(photo, $event)"
            >
              <img :src="photo.url" :alt="photo.title || '相册照片'" class="h-32 w-full object-cover" @error="$event.currentTarget.style.display = 'none'">
              <span class="pointer-events-none absolute inset-x-0 bottom-0 bg-stone-950/55 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                点击放大
              </span>
            </button>
            <div v-else class="flex h-32 w-full items-center justify-center bg-stone-100 text-2xl text-stone-300" aria-hidden="true">♥</div>
            <button
              type="button"
              class="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300"
              :aria-label="`编辑照片 ${photo.title || '未命名照片'}`"
              :aria-current="photoDialogOpen && photoForm.id === photo.id ? 'true' : undefined"
              @click="editPhoto(photo, $event)"
            >
              <div class="p-3">
                <p class="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                  <span class="truncate">{{ photo.title || '未命名照片' }}</span>
                  <span v-if="photo.isCover" class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">封面</span>
                </p>
                <p class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                  <span class="truncate">{{ photo.categoryName || '未分类' }}</span>
                  <span v-if="photo.takenTime" aria-hidden="true">·</span>
                  <span v-if="photo.takenTime">{{ String(photo.takenTime).slice(0, 10) }}</span>
                  <span class="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">{{ visibilityLabel(photo.visibility) }}</span>
                  <span
                    v-if="reviewStatusLabel(photo.reviewStatus)"
                    class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    :class="reviewStatusClass(photo.reviewStatus)"
                  >
                    {{ reviewStatusLabel(photo.reviewStatus) }}
                  </span>
                </p>
                <p
                  v-if="photo.reviewStatus === 'REJECTED'"
                  class="mt-1.5 rounded-lg border border-rose-100 bg-rose-50/80 px-2 py-1.5 text-[10px] leading-5 text-rose-700"
                >
                  <span class="font-semibold">驳回原因：</span>{{ photo.reviewRejectReason || '未填写原因' }}
                  <span class="block text-rose-500">
                    {{ photo.reviewHasPublishedVersion ? '恋爱广场继续展示上一次已通过的版本。' : '该内容尚未公开。' }}
                  </span>
                </p>
              </div>
            </button>
            <div class="flex items-center justify-between gap-1 border-t border-stone-100 px-2 py-1.5">
              <SortHandleButton
                :label="`照片 ${photo.title || '未命名照片'}`"
                :position="(current - 1) * PAGE_SIZE + index + 1"
                :disabled="!canDragPhotos || photos.length < 2 || categorySort.busy || photoSort.saving"
                :saving="photoSort.saving && String(photoSort.savingId) === String(photo.id)"
                :disabled-hint="photoSort.saving ? '正在保存顺序' : '正在准备排序数据'"
                @drag-start="photoSort.startDrag(index, $event)"
                @move-up="photoSort.moveByOffset(index, -1)"
                @move-down="photoSort.moveByOffset(index, 1)"
              />
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="btn-ghost !px-2 !py-1 !text-[11px]"
                  :disabled="!photo.url"
                  :aria-label="`查看照片详情 ${photo.title || '未命名照片'}`"
                  @click="openPhotoPreview(photo, $event)"
                >
                  预览
                </button>
                <button type="button" class="btn-ghost !px-2 !py-1 !text-[11px]" @click="editPhoto(photo, $event)">编辑</button>
                <button
                  type="button"
                  class="btn-ghost !px-2 !py-1 !text-[11px] !text-stone-400 hover:!text-rose-600"
                  :aria-label="`删除照片 ${photo.title || '未命名照片'}`"
                  @click="removePhoto(photo)"
                >
                  删除
                </button>
              </div>
            </div>
          </li>
          </TransitionGroup>
        </div>

        <footer v-if="totalPages > 1" class="flex items-center justify-between gap-3 border-t border-stone-100 px-5 py-3">
          <span class="text-xs text-stone-500">{{ current }} / {{ totalPages }}</span>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary !py-1.5" :disabled="current <= 1 || pageLoading || photoSort.busy" @click="goToPage(current - 1)">上一页</button>
            <button type="button" class="btn-secondary !py-1.5" :disabled="current >= totalPages || pageLoading || photoSort.busy" @click="goToPage(current + 1)">下一页</button>
          </div>
        </footer>
      </section>
    </div>

    <!-- 相册分类新增 / 编辑弹窗 -->
    <SpaceStudioDialog
      v-model="categoryDialogOpen"
      :title="categoryForm.id ? '编辑分类' : '新增分类'"
      description="分类名称与启用状态会同步到照片筛选和空间相册。"
      width="min(640px, calc(100vw - 24px))"
      :before-close="handleCategoryDialogBeforeClose"
      @opened="focusCategoryName"
      @closed="handleCategoryDialogClosed"
    >
      <form id="studio-category-form" class="space-y-4" @submit.prevent="saveCategory">
        <div class="grid gap-4">
          <div>
            <label for="studio-category-name" class="field-label">分类名称</label>
            <input
              id="studio-category-name"
              ref="categoryNameInputRef"
              v-model="categoryForm.name"
              maxlength="50"
              class="field-input"
              placeholder="例如「日常」"
            >
          </div>
        </div>
        <label class="flex w-fit items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700">
          <input v-model="categoryForm.isEnabled" type="checkbox" class="h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-400">
          启用该分类
        </label>
        <p class="field-hint">
          {{ categoryForm.id ? '保存后保留当前顺序，可在列表中调整顺序。' : '保存后默认添加到列表末尾，可在列表中调整顺序。' }}
        </p>
        <p v-if="categoryError" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{{ categoryError }}</p>
      </form>
      <template #footer>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="categorySaving" @click="closeCategoryDialog">取消</button>
          <button type="submit" form="studio-category-form" class="btn-primary" :disabled="categorySaving">
            {{ categorySaving ? '保存中…' : (categoryForm.id ? '保存分类' : '新增分类') }}
          </button>
        </div>
      </template>
    </SpaceStudioDialog>

    <!-- 照片新增 / 编辑弹窗 -->
    <SpaceStudioDialog
      v-model="photoDialogOpen"
      :title="photoForm.id ? '编辑照片' : '新增照片'"
      description="照片上传后保存，才会同步到空间相册。"
      width="min(760px, calc(100vw - 24px))"
      :before-close="handlePhotoDialogBeforeClose"
      @opened="focusPhotoTitle"
      @closed="handlePhotoDialogClosed"
    >
      <div class="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button type="button" class="btn-ghost" :disabled="photoSaving || uploading" @click="handleResetPhotoForm">
          清空表单
        </button>
      </div>

      <form id="studio-photo-form" @submit.prevent="savePhoto">
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="studio-photo-category" class="field-label">所属分类</label>
              <ThemeSelect
                v-model="photoForm.categoryId"
                input-id="studio-photo-category"
                class="mt-2"
                placeholder="请选择分类"
                :options="categoryOptions"
              />
            </div>
            <div>
              <label for="studio-photo-taken" class="field-label">拍摄时间</label>
              <ThemeDatePicker
                v-model="photoForm.takenTime"
                input-id="studio-photo-taken"
                class="mt-2"
                mode="datetime"
                placeholder="选择拍摄时间"
              />
            </div>
            <div class="sm:col-span-2">
              <label for="studio-photo-title" class="field-label">标题</label>
              <input
                id="studio-photo-title"
                ref="photoTitleInputRef"
                v-model="photoForm.title"
                maxlength="100"
                class="field-input"
                placeholder="给这张照片起个名字"
              >
            </div>
            <div class="sm:col-span-2">
              <label for="studio-photo-desc" class="field-label">描述</label>
              <textarea
                id="studio-photo-desc"
                v-model="photoForm.description"
                rows="2"
                maxlength="500"
                class="field-input resize-y leading-6"
                placeholder="这张照片背后的故事（选填）"
              />
            </div>
            <div class="sm:col-span-2">
              <label for="studio-photo-location" class="field-label">地点</label>
              <input id="studio-photo-location" v-model="photoForm.location" maxlength="100" class="field-input" placeholder="拍摄地点（选填）">
            </div>
          </div>

          <p class="field-hint">
            {{ photoForm.id ? '保存后保留当前顺序，可在列表中调整顺序。' : '保存后默认添加到列表末尾，可在列表中调整顺序。' }}
          </p>

          <div class="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
            <p class="text-xs font-bold text-stone-500">展示设置</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label for="studio-photo-visibility" class="field-label">可见性</label>
                <ThemeSelect
                  v-model="photoForm.visibility"
                  input-id="studio-photo-visibility"
                  class="mt-2"
                  :options="visibilityOptions"
                />
              </div>
              <label class="flex items-center gap-2 self-end rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-700">
                <input v-model="photoForm.isCover" type="checkbox" class="h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-400">
                设为相册封面
              </label>
            </div>
          </div>

          <SpaceImageField
            v-model="photoForm.url"
            input-id="studio-photo-url"
            label="照片"
            hint="支持 JPG、PNG、WebP、GIF，最大 5MB。"
            :disabled="photoSaving"
            @uploading="uploading = $event"
          />

          <p v-if="photoError" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{{ photoError }}</p>
        </div>
      </form>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span v-if="dirty" class="text-[11px] font-medium text-amber-700" role="status">有未保存的修改</span>
          <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              class="btn-secondary"
              :disabled="photoSaving || uploading"
              @click="closePhotoDialog"
            >
              取消
            </button>
            <button
              type="submit"
              form="studio-photo-form"
              class="btn-primary"
              :disabled="photoSaving || uploading || !categories.length"
            >
              {{ photoSaving ? '保存中…' : (uploading ? '图片上传中…' : (photoForm.id ? '保存照片' : '新增照片')) }}
            </button>
          </div>
        </div>
      </template>
    </SpaceStudioDialog>

    <SpaceImagePreview
      :open="previewIndex >= 0"
      :images="previewItems"
      :initial-index="previewIndex"
      variant="editor"
      @close="previewIndex = -1"
    >
      <template #actions="{ item }">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="btn-secondary !px-3 !py-1.5 !text-xs"
            :aria-label="`编辑照片 ${item.title || '未命名照片'}`"
            title="编辑照片"
            @click="editPhotoFromPreview(item)"
          >
            编辑照片
          </button>
          <button
            type="button"
            class="btn-ghost !px-3 !py-1.5 !text-xs !text-rose-600 hover:!bg-rose-50"
            :aria-label="`删除照片 ${item.title || '未命名照片'}`"
            title="删除照片"
            @click="deletePhotoFromPreview(item)"
          >
            删除照片
          </button>
        </div>
      </template>
    </SpaceImagePreview>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import { Check, Delete, EditPen } from '@element-plus/icons-vue'
import SpaceImageField from '@/components/frontend/space-studio/SpaceImageField.vue'
import SpaceImagePreview from '@/components/frontend/space-studio/SpaceImagePreview.vue'
import SpaceStudioDialog from '@/components/frontend/space-studio/SpaceStudioDialog.vue'
import SortHandleButton from '@/components/frontend/space-studio/SortHandleButton.vue'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
import ThemeSelect from '@/components/frontend/space-studio/ThemeSelect.vue'
import { useDragSort } from '@/composables/useDragSort'
import { normalizeSortItems } from '@/utils/reorderList'
import {
  deletePhotoManageCategory,
  deletePhotoManagePhoto,
  fetchPhotoManageCategories,
  fetchPhotoManagePage,
  fetchPhotoManageSortList,
  savePhotoCategoryOrder,
  savePhotoGlobalOrder,
  savePhotoManageCategory,
  savePhotoManagePhoto,
  savePhotoOrder,
} from '@/api/spaceContent'
import {
  buildVisibilityOptions,
  ensureSuccess,
  readContentErrorMessage,
  reviewStatusLabel,
  toBackendDateTime,
  toDateTimeLocalInput,
  VISIBILITY_OPTIONS,
} from '@/utils/spaceContent'
import { createFormSnapshot, isFormDirty } from '@/utils/formBaseline'
import { isPreviewableImageSrc } from '@/utils/imagePreview'
import { formatSpaceDate } from '@/utils/spaceFormat'
import { confirmDiscardChanges } from '@/utils/unsavedChanges'
import {
  hasSelectedContentScope,
  mergePageOrderIntoFullOrder,
  resolvePhotoSortScope,
} from '@/utils/spaceContentOrder'
import { resolveSaveFeedback } from '@/utils/saveFeedback'

const PAGE_SIZE = 8

const props = defineProps({
  canPublish: { type: Boolean, default: false },
  /** 重新提交公开审核后由父组件触发刷新。 */
  refreshKey: { type: [String, Number], default: '' },
})

const emit = defineEmits(['update:dirty', 'saved'])

const loading = ref(true)
const pageLoading = ref(false)
const loadError = ref('')
const categories = ref([])
const photos = ref([])
const total = ref(0)
const current = ref(1)
const filterCategoryId = ref('all')

const categoryOptions = computed(() => categories.value.map(category => ({ value: category.id, label: category.categoryName })))
const visibilityOptions = computed(() => buildVisibilityOptions(props.canPublish))

const categoryForm = reactive({ id: null, name: '', isEnabled: true })
const categorySaving = ref(false)
const categoryError = ref('')
const categoryDialogOpen = ref(false)
const categoryNameInputRef = ref(null)
const newCategoryButtonRef = ref(null)
let categoryDialogTrigger = null

const photoForm = reactive(emptyPhotoForm())
const photoSaving = ref(false)
const uploading = ref(false)
const photoError = ref('')
const photoDialogOpen = ref(false)
const photoTitleInputRef = ref(null)
const newPhotoButtonRef = ref(null)
let photoDialogTrigger = null
const previewIndex = ref(-1)
const categoryBaseline = ref('')
const photoBaseline = ref('')

/**
 * 编辑相册详情数据：与恋爱广场共用预览层，但额外提供分类、可见性、审核状态等管理元信息。
 * 预览项过滤空地址，索引与过滤后的列表保持一致，避免空 URL 照片导致切图错位。
 */
const previewItems = computed(() => photos.value
  .filter(photo => isPreviewableImageSrc(photo.url))
  .map(photo => {
    const title = String(photo.title || '').trim()
    const description = String(photo.description || '').trim()
    const alt = title || (description ? `照片描述：${description.slice(0, 80)}` : '相册照片')
    return {
      id: photo.id,
      src: String(photo.url).trim(),
      alt,
      title: title || '未命名照片',
      description,
      meta: buildPhotoPreviewMeta(photo),
    }
  }))

/** 分类卡片直接拖拽：分类属于空间级全局排序，松手即保存。 */
const categorySortError = ref('')
const categoryDrag = useDragSort({
  items: categories,
  enabled: () => !photoSort.busy && !categoryDialogOpen.value && !photoDialogOpen.value,
  onDrop: async (orderedCategories) => {
    categorySortError.value = ''
    const items = normalizeSortItems(orderedCategories)
    ensureSuccess(await savePhotoCategoryOrder({ items }), '分类排序保存失败')
    orderedCategories.forEach((category, index) => {
      category.sortOrder = (index + 1) * 10
    })
    ElMessage.success('分类顺序已保存')
  },
  onError: (error) => {
    categorySortError.value = readContentErrorMessage(error, '分类排序未保存，已恢复原顺序，请重试')
    ElMessage.error(categorySortError.value)
  },
})
const categoryListRef = categoryDrag.listRef
const categorySort = reactive({
  saving: categoryDrag.saving,
  savingId: categoryDrag.savingId,
  dragging: categoryDrag.dragging,
  dragIndex: categoryDrag.dragIndex,
  busy: categoryDrag.busy,
  startDrag: categoryDrag.startDrag,
  onRowPointerDown: categoryDrag.onRowPointerDown,
  moveByOffset: categoryDrag.moveByOffset,
  cancelDrag: categoryDrag.cancelDrag,
})

/**
 * 照片列表直接拖拽排序。
 *
 * 分页只影响展示范围，提交时会把当前页的新顺序合并回当前筛选范围的完整列表，
 * 再调用全局或分类内排序接口；松手即保存，失败自动恢复。
 */
const photoSortError = ref('')
const photoSortPreparing = ref(false)
const sortBuffer = ref([])
const sortBufferScope = ref('')
let sortBufferSeq = 0

const canDragPhotos = computed(() => (
  !photoSortPreparing.value
  && sortBufferScope.value === String(filterCategoryId.value)
  && sortBuffer.value.length > 0
))

const photoDrag = useDragSort({
  items: photos,
  enabled: () => canDragPhotos.value && !categorySort.busy && !photoDialogOpen.value,
  onDrop: async (orderedPage) => {
    photoSortError.value = ''
    if (!sortBuffer.value.length) {
      throw new Error('排序数据尚未准备好，请稍后重试')
    }
    const merged = mergePageOrderIntoFullOrder(sortBuffer.value, orderedPage)
    const items = normalizeSortItems(merged)
    const scope = resolvePhotoSortScope(filterCategoryId.value)
    const serverItems = scope.scope === 'global'
      ? ensureSuccess(await savePhotoGlobalOrder({ items }), '照片全局排序保存失败')
      : ensureSuccess(await savePhotoOrder({ categoryId: scope.categoryId, items }), '照片排序保存失败')
    sortBuffer.value = Array.isArray(serverItems) ? serverItems : merged
    applyPhotoServerOrder(serverItems)
    ElMessage.success('顺序已保存')
  },
  onError: (error) => {
    photoSortError.value = readContentErrorMessage(error, '照片排序未保存，已恢复原顺序，请重试')
    ElMessage.error(photoSortError.value)
  },
})

const photoListRef = photoDrag.listRef
const photoSort = reactive({
  saving: photoDrag.saving,
  savingId: photoDrag.savingId,
  active: photoDrag.active,
  dragging: photoDrag.dragging,
  dragIndex: photoDrag.dragIndex,
  busy: photoDrag.busy,
  startDrag: photoDrag.startDrag,
  onRowPointerDown: photoDrag.onRowPointerDown,
  moveByOffset: photoDrag.moveByOffset,
  cancelDrag: photoDrag.cancelDrag,
})

const selectedCategoryName = computed(() => (
  categories.value.find(item => String(item.id) === String(filterCategoryId.value))?.categoryName || ''
))

/** 以服务端返回的完整排序为准，同步当前页可见照片的顺序与排序字段。 */
function applyPhotoServerOrder(serverItems) {
  if (!Array.isArray(serverItems)) return
  const remaining = new Map(photos.value.map(photo => [String(photo.id), photo]))
  const ordered = []
  serverItems.forEach(item => {
    const photo = remaining.get(String(item?.id))
    if (!photo) return
    photo.sortOrder = item.sortOrder
    photo.globalSortOrder = item.globalSortOrder
    ordered.push(photo)
    remaining.delete(String(item.id))
  })
  photos.value.forEach(photo => {
    if (remaining.has(String(photo.id))) ordered.push(photo)
  })
  photos.value = ordered
}

/**
 * 准备完整排序数据。
 *
 * 单页数据直接复用当前照片列表；跨页时额外拉取当前筛选范围的完整列表，
 * 避免只对当前页排序而丢失其他页顺序。
 */
async function refreshSortBuffer({ force = false } = {}) {
  if (photoSort.saving) return
  const scopeKey = String(filterCategoryId.value)
  if (!force && sortBufferScope.value === scopeKey && sortBuffer.value.length) return
  const seq = ++sortBufferSeq
  photoSortPreparing.value = true
  photoSortError.value = ''
  try {
    const singlePage = photos.value.length > 0
      && photos.value.length >= total.value
      && current.value === 1
    const data = singlePage
      ? photos.value.slice()
      : ensureSuccess(
        await fetchPhotoManageSortList(scopeKey === 'all' ? null : scopeKey),
        '照片排序数据加载失败',
      )
    if (seq !== sortBufferSeq) return
    sortBuffer.value = Array.isArray(data) ? data : []
    sortBufferScope.value = scopeKey
  } catch (error) {
    if (seq !== sortBufferSeq) return
    sortBuffer.value = []
    sortBufferScope.value = ''
    photoSortError.value = readContentErrorMessage(error, '排序数据加载失败，请重试')
  } finally {
    if (seq === sortBufferSeq) photoSortPreparing.value = false
  }
}

function isCategorySelected(category) {
  return String(filterCategoryId.value) === String(category.id)
}

/** 全局排序时同一列表会混排多个分类，用分类名提示照片归属。 */
function categoryNameById(categoryId) {
  return categories.value.find(item => String(item.id) === String(categoryId))?.categoryName || '未分类'
}

/** 点击已选中的分类卡片取消筛选，恢复全部照片。 */
function toggleCategoryFilter(category) {
  if (photoSort.busy || categorySort.busy) return
  filterCategoryId.value = isCategorySelected(category) ? 'all' : category.id
}

function clearCategoryFilter() {
  if (photoSort.busy || categorySort.busy) return
  filterCategoryId.value = 'all'
}

function emptyPhotoForm() {
  return {
    id: null,
    categoryId: '',
    title: '',
    description: '',
    url: '',
    takenTime: '',
    location: '',
    isCover: false,
    visibility: 0,
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

/** 分类快照只保留保存接口真正提交的字段。 */
function categoryFormSnapshot() {
  return {
    name: categoryForm.name.trim(),
    isEnabled: Boolean(categoryForm.isEnabled),
  }
}

/** 照片快照与保存请求保持一致，文本 trim、数字字段保持数字类型。 */
function photoFormSnapshot() {
  return {
    categoryId: photoForm.categoryId,
    title: photoForm.title.trim(),
    description: photoForm.description.trim(),
    url: photoForm.url.trim(),
    takenTime: photoForm.takenTime,
    location: photoForm.location.trim(),
    isCover: Boolean(photoForm.isCover),
    visibility: Number(photoForm.visibility),
  }
}

const categoryDirty = computed(() => isFormDirty(categoryBaseline.value, categoryFormSnapshot()))
const photoDirty = computed(() => isFormDirty(photoBaseline.value, photoFormSnapshot()))
const dirty = computed(() => (
  categoryDirty.value || photoDirty.value
))

function emitDirty() {
  emit('update:dirty', dirty.value)
}

function captureCategoryBaseline() {
  categoryBaseline.value = createFormSnapshot(categoryFormSnapshot())
  emitDirty()
}

function capturePhotoBaseline() {
  photoBaseline.value = createFormSnapshot(photoFormSnapshot())
  emitDirty()
}

watch(dirty, emitDirty)

/** 统一的覆盖前确认：只有真正 dirty 时才询问。 */
async function confirmOverwrite(message, hasChanges) {
  if (!hasChanges) return true
  return confirmDiscardChanges(message)
}

function visibilityLabel(value) {
  return VISIBILITY_OPTIONS.find(option => option.value === Number(value))?.label || '仅空间成员可见'
}

/** 编辑模式元信息：分类、拍摄日期、地点、可见性与审核状态，不包含后台内部字段。 */
function buildPhotoPreviewMeta(photo) {
  const date = photo?.takenTime ? formatSpaceDate(photo.takenTime, '') : ''
  return [
    String(photo?.categoryName || '').trim() || '未分类',
    date ? `拍摄于 ${date}` : '',
    String(photo?.location || '').trim(),
    visibilityLabel(photo?.visibility),
    reviewStatusLabel(photo?.reviewStatus),
    photo?.isCover ? '封面照片' : '',
  ].filter(Boolean).join(' · ')
}

function reviewStatusClass(status) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-700'
  if (status === 'UNPUBLISHED') return 'bg-slate-200 text-slate-600'
  return 'bg-emerald-100 text-emerald-700'
}

function resetCategoryForm() {
  categoryForm.id = null
  categoryForm.name = ''
  categoryForm.isEnabled = true
  categoryError.value = ''
  captureCategoryBaseline()
}

/** 记住触发弹窗的元素，关闭后把焦点还回去。 */
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

async function openCategoryCreate(event) {
  if (photoSort.busy) return
  if (!(await confirmOverwrite('新建分类会覆盖分类表单里未保存的内容，确定继续吗？', categoryDirty.value))) return
  categoryDialogTrigger = rememberDialogTrigger(event)
  resetCategoryForm()
  categoryDialogOpen.value = true
  focusCategoryName()
}

async function closeCategoryDialog() {
  if (categorySaving.value) return
  if (!(await confirmOverwrite('关闭分类编辑会丢弃未保存的分类修改，确定继续吗？', categoryDirty.value))) return
  categoryDialogOpen.value = false
}

async function handleCategoryDialogBeforeClose(done) {
  if (categorySaving.value) return
  if (!(await confirmOverwrite('关闭分类编辑会丢弃未保存的分类修改，确定继续吗？', categoryDirty.value))) return
  done()
}

function handleCategoryDialogClosed() {
  resetCategoryForm()
  const trigger = categoryDialogTrigger
  categoryDialogTrigger = null
  restoreDialogFocus(trigger, newCategoryButtonRef)
}

function focusCategoryName() {
  nextTick(() => {
    categoryNameInputRef.value?.focus({ preventScroll: true })
  })
}

async function editCategory(category, event) {
  if (photoSort.busy) return
  if (categoryDialogOpen.value && String(categoryForm.id) === String(category.id)) {
    focusCategoryName()
    return
  }
  if (!(await confirmOverwrite('切换分类会丢弃当前未保存的分类修改，确定继续吗？', categoryDirty.value))) return
  categoryDialogTrigger = rememberDialogTrigger(event)
  categoryForm.id = category.id
  categoryForm.name = category.categoryName || ''
  categoryForm.isEnabled = category.isEnabled !== false
  categoryError.value = ''
  categoryDialogOpen.value = true
  captureCategoryBaseline()
  focusCategoryName()
}

function resetPhotoForm() {
  Object.assign(photoForm, emptyPhotoForm())
  photoForm.categoryId = categories.value[0]?.id ?? ''
  photoError.value = ''
  capturePhotoBaseline()
}

async function handleResetPhotoForm() {
  if (!(await confirmOverwrite('清空表单会丢弃当前未保存的照片修改，确定继续吗？', photoDirty.value))) return
  resetPhotoForm()
  focusPhotoTitle()
}

async function startNewPhoto(event) {
  if (photoSort.busy) return
  if (!(await confirmOverwrite('新增照片会丢弃当前未保存的照片修改，确定继续吗？', photoDirty.value))) return
  photoDialogTrigger = rememberDialogTrigger(event)
  resetPhotoForm()
  photoDialogOpen.value = true
  focusPhotoTitle()
}

function focusPhotoTitle() {
  nextTick(() => {
    photoTitleInputRef.value?.focus({ preventScroll: true })
  })
}

async function closePhotoDialog() {
  if (photoSaving.value || uploading.value) return
  if (!(await confirmOverwrite('关闭照片弹窗会丢弃当前未保存的照片修改，确定继续吗？', photoDirty.value))) return
  photoDialogOpen.value = false
}

async function handlePhotoDialogBeforeClose(done) {
  if (photoSaving.value || uploading.value) return
  if (!(await confirmOverwrite('关闭照片弹窗会丢弃当前未保存的照片修改，确定继续吗？', photoDirty.value))) return
  done()
}

function handlePhotoDialogClosed() {
  resetPhotoForm()
  const trigger = photoDialogTrigger
  photoDialogTrigger = null
  restoreDialogFocus(trigger, newPhotoButtonRef)
}

function openPhotoPreview(photo, event) {
  if (!isPreviewableImageSrc(photo?.url)) return
  const index = previewItems.value.findIndex(item => String(item.id) === String(photo?.id))
  if (index < 0) return
  if (event?.currentTarget instanceof HTMLElement) {
    event.currentTarget.focus({ preventScroll: true })
  }
  previewIndex.value = index
}

/**
 * 从详情弹窗进入编辑：先关闭预览，避免预览层（z-3000）盖住编辑弹窗，
 * 再复用现有 editPhoto，确保照片 ID 和 dirty 校验逻辑不变。
 */
async function editPhotoFromPreview(item) {
  const photo = photos.value.find(photoItem => String(photoItem.id) === String(item?.id))
  if (!photo) return
  previewIndex.value = -1
  await nextTick()
  await editPhoto(photo, null)
}

/**
 * 从详情弹窗删除：删除后若仍有照片，打开原索引位置（或最后一张）；
 * 若无照片则保持关闭并展示列表空状态；取消或失败时回到原照片。
 */
async function deletePhotoFromPreview(item) {
  const photo = photos.value.find(photoItem => String(photoItem.id) === String(item?.id))
  if (!photo) return
  const previousIndex = previewIndex.value
  previewIndex.value = -1
  await nextTick()

  const result = await removePhoto(photo)
  if (result === 'deleted') {
    if (previewItems.value.length) {
      previewIndex.value = Math.min(Math.max(previousIndex, 0), previewItems.value.length - 1)
    }
    return
  }

  if (photos.value.some(photoItem => String(photoItem.id) === String(photo.id))) {
    openPhotoPreview(photo)
  }
}

async function editPhoto(photo, event) {
  if (photoSort.busy) return
  if (photoDialogOpen.value && String(photoForm.id) === String(photo.id)) {
    focusPhotoTitle()
    return
  }
  if (!(await confirmOverwrite('切换照片会丢弃当前未保存的照片修改，确定继续吗？', photoDirty.value))) return
  photoDialogTrigger = rememberDialogTrigger(event)
  photoForm.id = photo.id
  photoForm.categoryId = photo.photoCategoryId
  photoForm.title = photo.title || ''
  photoForm.description = photo.description || ''
  photoForm.url = photo.url || ''
  photoForm.takenTime = toDateTimeLocalInput(photo.takenTime)
  photoForm.location = photo.location || ''
  photoForm.isCover = photo.isCover === true
  photoForm.visibility = Number(photo.visibility) || 0
  photoError.value = ''
  capturePhotoBaseline()
  photoDialogOpen.value = true
  focusPhotoTitle()
}

/** 分类列表变化后，若当前干净的照片表单指向了不存在的分类，回落到第一个分类。 */
function syncPhotoCategoryIfMissing() {
  if (photoDirty.value) return
  const exists = categories.value.some(category => String(category.id) === String(photoForm.categoryId))
  if (exists) return
  photoForm.categoryId = categories.value[0]?.id ?? ''
  capturePhotoBaseline()
}

async function handleRefresh() {
  if (photoSort.busy || categorySort.busy) return
  if (!(await confirmOverwrite('刷新会重新加载数据并丢弃当前未保存的修改，确定继续吗？', dirty.value))) return
  await load()
}



/**
 * @param {{ resetForms?: boolean }} options
 * resetForms=false 时只刷新列表数据，保留当前表单，避免覆盖正在编辑的内容。
 */
async function load({ resetForms = true } = {}) {
  loading.value = true
  loadError.value = ''
  try {
    const categoryData = ensureSuccess(await fetchPhotoManageCategories(), '相册分类加载失败')
    categories.value = Array.isArray(categoryData) ? categoryData : []
    // 分类被删除或无权访问时，清除失效筛选并回到全部照片。
    if (!hasSelectedContentScope(categories.value, filterCategoryId.value)) {
      skipFilterReload = true
      filterCategoryId.value = 'all'
    }
    await loadPhotos()
    refreshSortBuffer({ force: true })
    if (resetForms) {
      categoryDrag.cancelDrag()
      photoDrag.cancelDrag()
      categoryDialogOpen.value = false
      photoDialogOpen.value = false
      previewIndex.value = -1
      resetCategoryForm()
      resetPhotoForm()
    } else {
      syncPhotoCategoryIfMissing()
    }
  } catch (error) {
    loadError.value = readContentErrorMessage(error, '相册加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function loadPhotos() {
  if (photoSort.saving) return
  const payload = { current: current.value, size: PAGE_SIZE }
  if (filterCategoryId.value !== 'all') payload.photoCategoryId = filterCategoryId.value
  const data = ensureSuccess(await fetchPhotoManagePage(payload), '照片加载失败')
  photos.value = Array.isArray(data?.records) ? data.records : []
  total.value = Number(data?.total) || 0
  current.value = Number(data?.current) || 1
}

async function goToPage(page) {
  if (pageLoading.value || photoSort.busy || page < 1 || page > totalPages.value) return
  previewIndex.value = -1
  current.value = page
  pageLoading.value = true
  try {
    await loadPhotos()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '照片加载失败'))
  } finally {
    pageLoading.value = false
  }
}

async function saveCategory() {
  if (categorySaving.value) return
  const name = categoryForm.name.trim()
  if (!name) {
    categoryError.value = '分类名称不能为空'
    return
  }
  categorySaving.value = true
  categoryError.value = ''
  try {
    ensureSuccess(await savePhotoManageCategory({
      id: categoryForm.id,
      categoryName: name,
      isEnabled: categoryForm.isEnabled,
    }), '分类保存失败')
    const feedback = resolveSaveFeedback(null, categoryForm.id ? '分类已更新' : '分类已创建')
    // 保存成功后重建分类表单基线，保留照片表单里未保存的内容。
    await load({ resetForms: false })
    categoryDialogOpen.value = false
    resetCategoryForm()
    emit('saved', { ...feedback, dirtyAfterSave: dirty.value })
  } catch (error) {
    categoryError.value = readContentErrorMessage(error, '分类保存失败，请稍后重试')
  } finally {
    categorySaving.value = false
  }
}

async function removeCategory(category) {
  if (photoSort.busy) return
  try {
    await ElMessageBox.confirm(`确定删除分类「${category.categoryName}」吗？分类下仍有照片时无法删除。`, '删除分类', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
  try {
    ensureSuccess(await deletePhotoManageCategory(category.id), '删除分类失败')
    ElMessage.success('分类已删除')
    await load({ resetForms: false })
    if (String(categoryForm.id) === String(category.id)) {
      categoryDialogOpen.value = false
      resetCategoryForm()
    }
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '删除分类失败，请稍后重试'))
  }
}

async function savePhoto() {
  if (photoSaving.value || uploading.value) return
  photoError.value = ''
  if (!photoForm.categoryId) {
    photoError.value = '请先创建并选择分类'
    return
  }
  if (!photoForm.url.trim()) {
    photoError.value = '请上传照片'
    return
  }
  if (photoForm.isCover && Number(photoForm.visibility) === 2) {
    photoError.value = '封面照片不能设置为隐藏'
    return
  }

  photoSaving.value = true
  try {
    const result = ensureSuccess(await savePhotoManagePhoto({
      id: photoForm.id,
      photoCategoryId: Number(photoForm.categoryId),
      title: photoForm.title.trim(),
      description: photoForm.description.trim(),
      url: photoForm.url.trim(),
      takenTime: toBackendDateTime(photoForm.takenTime),
      location: photoForm.location.trim(),
      isCover: photoForm.isCover,
      visibility: Number(photoForm.visibility),
    }), '照片保存失败')
    const feedback = resolveSaveFeedback(result, photoForm.id ? '照片已更新' : '照片已添加')
    // 保存成功后重建照片表单基线，保留分类表单里未保存的内容。
    await load({ resetForms: false })
    photoDialogOpen.value = false
    resetPhotoForm()
    emit('saved', { ...feedback, dirtyAfterSave: dirty.value })
  } catch (error) {
    photoError.value = readContentErrorMessage(error, '照片保存失败，请稍后重试')
  } finally {
    photoSaving.value = false
  }
}

/**
 * 删除当前页最后一张照片时回退一页，避免列表停留在空页而实际仍有其他照片。
 * 仅在存在其他照片时生效，不改变排序规则。
 */
async function ensureCurrentPageHasPhotos() {
  if (photos.value.length || total.value <= 0 || current.value <= 1) return
  current.value = Math.max(1, Math.min(current.value - 1, totalPages.value))
  await loadPhotos()
  refreshSortBuffer({ force: true })
}

async function removePhoto(photo) {
  if (photoSort.busy) return 'busy'
  try {
    await ElMessageBox.confirm(`确定删除照片「${photo.title || '未命名照片'}」吗？`, '删除照片', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return 'cancelled'
  }
  try {
    ensureSuccess(await deletePhotoManagePhoto(photo.id), '删除照片失败')
    ElMessage.success('照片已删除')
    await load({ resetForms: false })
    await ensureCurrentPageHasPhotos()
    if (String(photoForm.id) === String(photo.id)) resetPhotoForm()
    return 'deleted'
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '删除照片失败，请稍后重试'))
    return 'failed'
  }
}

/** 切换分类：取消未完成的拖拽，重新加载当前分类并准备对应的完整排序数据。 */
let skipFilterReload = false
watch(filterCategoryId, async () => {
  if (skipFilterReload) {
    skipFilterReload = false
    return
  }
  if (photoSort.busy) return
  previewIndex.value = -1
  photoDrag.cancelDrag()
  photoSortError.value = ''
  sortBufferSeq += 1
  sortBuffer.value = []
  sortBufferScope.value = ''
  current.value = 1
  pageLoading.value = true
  try {
    await loadPhotos()
    refreshSortBuffer({ force: true })
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '照片加载失败'))
  } finally {
    pageLoading.value = false
  }
})

onMounted(load)

/** 审核状态刷新只同步列表；用户正在编辑或保存顺序时保留当前状态。 */
watch(() => props.refreshKey, () => {
  if (photoSort.saving) return
  previewIndex.value = -1
  load({ resetForms: !dirty.value })
})

defineExpose({ dirty, saving: photoSaving })
</script>
