<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 ring-1 ring-sky-100">
          <Picture class="h-6 w-6" />
        </span>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-slate-900">相册资源</h2>
          <p class="mt-1 text-sm text-slate-500">
            共收录 <span class="font-semibold text-rose-500">{{ totalItems }}</span> 张照片，管理分类、展示顺序与前台可见状态。
          </p>
        </div>
      </div>
      <div class="flex w-full gap-3 sm:w-auto">
        <button
          type="button"
          class="inline-flex min-h-10 flex-1 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:flex-none"
          @click="openCategoryManager"
        >
          <CollectionTag class="h-4 w-4" />
          分类管理
        </button>
        <button
          type="button"
          class="inline-flex min-h-10 flex-1 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-xl sm:flex-none"
          @click="openEditor()"
        >
          <Upload class="h-4 w-4" />
          上传照片
        </button>
      </div>
    </div>

    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div class="grid gap-3 md:grid-cols-3 xl:grid-cols-[minmax(15rem,1fr)_12rem_12rem_auto]">
        <label class="relative block">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索照片标题…"
            class="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400"
          >
        </label>

        <div class="category-select-shell relative">
          <CollectionTag class="category-select-icon" />
          <el-select
            v-model="categoryFilter"
            clearable
            placeholder="全部分类"
            class="admin-category-select w-full"
            popper-class="photo-category-popper"
            @change="applyFilters"
          >
            <el-option v-for="item in categories" :key="item.id" :label="item.label" :value="item.id">
              <span class="flex items-center justify-between gap-3">
                <span class="flex min-w-0 items-center gap-2.5">
                  <span class="h-2 w-2 shrink-0 rounded-full" :class="item.status ? 'bg-rose-400' : 'bg-slate-300'" />
                  <span class="truncate">{{ item.label }}</span>
                </span>
                <span v-if="!item.status" class="shrink-0 text-[10px] text-slate-400">已停用</span>
              </span>
            </el-option>
          </el-select>
        </div>

        <select
          v-model="visibilityFilter"
          class="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
          @change="applyFilters"
        >
          <option value="">全部状态</option>
          <option value="true">前台显示</option>
          <option value="false">已隐藏</option>
        </select>

        <button
          type="button"
          class="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-sm font-semibold text-slate-800">全部照片</h3>
          <p class="mt-1 text-xs text-slate-400">排序值越小越靠前；封面标记全站仅保留一张。</p>
        </div>
        <span class="text-xs text-slate-400">第 {{ currentPage }} / {{ totalPages }} 页</span>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div v-for="index in pageSize" :key="index" class="overflow-hidden rounded-2xl border border-slate-100">
          <div class="aspect-[4/3] animate-pulse bg-slate-100" />
          <div class="space-y-3 p-4">
            <div class="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div class="h-3 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div v-else-if="photos.length" class="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <article
          v-for="row in photos"
          :key="row.id"
          class="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg hover:shadow-slate-200/60"
        >
          <div class="relative aspect-[4/3] overflow-hidden bg-slate-100 p-2">
            <img
              :src="row.url"
              :alt="row.title"
              class="h-full w-full object-contain"
              loading="lazy"
            >
            <div class="absolute left-3 top-3 flex flex-wrap gap-2">
              <span class="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
                {{ row.categoryName || '未分类' }}
              </span>
              <span v-if="row.isCover" class="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                <StarFilled class="h-3 w-3" /> 封面
              </span>
            </div>
            <span
              class="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur"
              :class="row.isVisible ? 'bg-emerald-500/90 text-white' : 'bg-slate-900/65 text-white'"
            >
              {{ row.isVisible ? '显示中' : '已隐藏' }}
            </span>
          </div>

          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h4 class="truncate text-sm font-semibold text-slate-800" :title="row.title">{{ row.title }}</h4>
                <p class="photo-description mt-1 min-h-9 text-xs leading-[1.125rem] text-slate-400">
                  {{ row.description || '还没有填写照片描述。' }}
                </p>
              </div>
              <span class="shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">#{{ row.sortOrder ?? 0 }}</span>
            </div>

            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
              <span class="inline-flex items-center gap-1"><Calendar class="h-3 w-3" />{{ formatDate(row.takenTime) }}</span>
              <span class="inline-flex min-w-0 items-center gap-1"><Location class="h-3 w-3 shrink-0" /><span class="truncate">{{ row.location || '未记录地点' }}</span></span>
            </div>

            <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <label class="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                <el-switch v-model="row.isVisible" size="small" @change="toggleVisible(row)" />
                前台显示
              </label>
              <div class="flex items-center gap-1">
                <button type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="编辑照片" @click="openEditor(row)">
                  <Edit class="h-4 w-4" />
                </button>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label="删除照片" @click="deletePhoto(row)">
                  <Delete class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="px-6 py-20 text-center">
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Picture class="h-7 w-7" />
        </span>
        <p class="mt-4 text-sm font-medium text-slate-600">没有找到照片</p>
        <p class="mt-1 text-xs text-slate-400">调整筛选条件，或上传一张新的照片。</p>
        <button type="button" class="mt-5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700" @click="openEditor()">上传照片</button>
      </div>

      <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row">
        <p class="text-xs text-slate-400">共 {{ totalItems }} 条，每页 {{ pageSize }} 条</p>
        <div class="flex items-center gap-1">
          <button type="button" :disabled="currentPage <= 1 || loading" class="page-button" @click="currentPage--">上一页</button>
          <button
            v-for="page in pageNumbers"
            :key="page"
            type="button"
            class="page-button"
            :class="currentPage === page ? 'page-button-active' : ''"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
          <button type="button" :disabled="currentPage >= totalPages || loading" class="page-button" @click="currentPage++">下一页</button>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="photo-modal">
        <div v-if="showEditor" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" @click.self="closeEditor">
          <section class="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" :aria-label="editingId ? '编辑照片' : '上传照片'">
            <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <h3 class="text-base font-semibold text-slate-900">{{ editingId ? '编辑照片' : '上传照片' }}</h3>
                <p class="mt-1 text-xs text-slate-400">完善照片信息后即可在前台相册展示。</p>
              </div>
              <button type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeEditor">
                <Close class="h-5 w-5" />
              </button>
            </header>

            <div class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.9fr)]">
              <div>
                <el-upload
                  class="photo-uploader block"
                  action="#"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  :auto-upload="false"
                  :show-file-list="false"
                  :disabled="uploading"
                  :on-change="handleImageChange"
                >
                  <div class="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2 transition hover:border-rose-300 hover:bg-rose-50/30">
                    <img v-if="form.url" :src="form.url" :alt="form.title || '照片预览'" class="h-full w-full object-contain">
                    <div v-else class="flex flex-col items-center px-6 text-center text-slate-400">
                      <Loading v-if="uploading" class="h-8 w-8 animate-spin text-rose-500" />
                      <UploadFilled v-else class="h-9 w-9 text-rose-400" />
                      <p class="mt-3 text-sm font-medium text-slate-600">{{ uploading ? '正在上传…' : '点击选择照片' }}</p>
                      <p class="mt-1 text-xs">支持 JPG、PNG、WebP、GIF，最大 10MB</p>
                    </div>
                    <div v-if="form.url" class="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-sm font-medium text-white opacity-0 transition hover:opacity-100">
                      {{ uploading ? '正在上传…' : '点击更换照片' }}
                    </div>
                  </div>
                </el-upload>
              </div>

              <div class="space-y-4">
                <label class="block">
                  <span class="mb-1.5 block text-xs font-medium text-slate-500">照片标题 <span class="text-rose-500">*</span></span>
                  <input v-model="form.title" maxlength="100" placeholder="给这张照片起个名字" class="form-control">
                </label>

                <div class="grid grid-cols-2 gap-3">
                  <label class="block">
                    <span class="mb-1.5 block text-xs font-medium text-slate-500">照片分类 <span class="text-rose-500">*</span></span>
                    <div class="category-select-shell relative">
                      <CollectionTag class="category-select-icon" />
                      <el-select
                        v-model="form.photoCategoryId"
                        placeholder="请选择照片分类"
                        class="admin-category-select w-full"
                        popper-class="photo-category-popper"
                      >
                        <el-option
                        v-for="item in categories"
                        :key="item.id"
                        :label="item.label"
                        :value="item.id"
                        :disabled="!item.status && item.id !== form.photoCategoryId"
                      >
                          <span class="flex items-center justify-between gap-3">
                            <span class="flex min-w-0 items-center gap-2.5">
                              <span class="h-2 w-2 shrink-0 rounded-full" :class="item.status ? 'bg-rose-400' : 'bg-slate-300'" />
                              <span class="truncate">{{ item.label }}</span>
                            </span>
                            <span v-if="!item.status" class="shrink-0 text-[10px] text-slate-400">已停用</span>
                          </span>
                        </el-option>
                      </el-select>
                    </div>
                  </label>
                  <label class="block">
                    <span class="mb-1.5 block text-xs font-medium text-slate-500">排序值</span>
                    <input v-model.number="form.sortOrder" type="number" min="0" step="1" class="form-control">
                  </label>
                </div>

                <label class="block">
                  <span class="mb-1.5 block text-xs font-medium text-slate-500">拍摄时间</span>
                  <el-date-picker
                    v-model="form.takenTime"
                    type="datetime"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    placeholder="选择拍摄时间"
                    class="!w-full"
                  />
                </label>

                <label class="block">
                  <span class="mb-1.5 block text-xs font-medium text-slate-500">拍摄地点</span>
                  <input v-model="form.location" maxlength="100" placeholder="例如：青岛 · 小麦岛" class="form-control">
                </label>

                <label class="block">
                  <span class="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>照片描述</span><span class="font-normal text-slate-300">{{ form.description.length }}/1000</span>
                  </span>
                  <textarea v-model="form.description" maxlength="1000" rows="4" placeholder="写下照片背后的故事…" class="form-control resize-none" />
                </label>

                <div class="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                  <label class="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-600">
                    <span>前台显示</span>
                    <el-switch v-model="form.isVisible" />
                  </label>
                  <label class="flex cursor-pointer items-center justify-between gap-3 border-l border-slate-200 pl-3 text-sm text-slate-600">
                    <span>设为封面</span>
                    <el-switch v-model="form.isCover" />
                  </label>
                </div>
              </div>
            </div>

            <footer class="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <button type="button" :disabled="saving" class="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50" @click="closeEditor">取消</button>
              <button type="button" :disabled="saving || uploading" class="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50" @click="submitPhoto">
                <Loading v-if="saving" class="h-4 w-4 animate-spin" />
                {{ saving ? '保存中…' : '保存照片' }}
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="photo-modal">
        <div v-if="showCategoryManager" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" @click.self="closeCategoryManager">
          <section class="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="照片分类管理">
            <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <h3 class="text-base font-semibold text-slate-900">照片分类管理</h3>
                <p class="mt-1 text-xs text-slate-400">新增或调整分类，启用的分类会同步显示在前台相册。</p>
              </div>
              <button type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeCategoryManager">
                <Close class="h-5 w-5" />
              </button>
            </header>

            <div class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div class="min-w-0">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 class="text-sm font-semibold text-slate-800">已有分类</h4>
                    <p class="mt-1 text-xs text-slate-400">排序值越小，在后台选择器和前台标签中越靠前。</p>
                  </div>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{{ categoryItems.length }} 个</span>
                </div>

                <div v-if="categoryLoading" class="space-y-3">
                  <div v-for="index in 3" :key="index" class="h-[4.5rem] animate-pulse rounded-xl bg-slate-100" />
                </div>
                <div v-else-if="categoryItems.length" class="space-y-2">
                  <button
                    v-for="item in categoryItems"
                    :key="item.id"
                    type="button"
                    class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition"
                    :class="categoryForm.id === item.id ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 hover:border-rose-200 hover:bg-slate-50'"
                    @click="editCategory(item)"
                  >
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                      <CollectionTag class="h-4 w-4" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="flex items-center gap-2">
                        <span class="truncate text-sm font-semibold text-slate-700">{{ item.label }}</span>
                        <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="item.status ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'">
                          {{ item.status ? '已启用' : '已停用' }}
                        </span>
                      </span>
                      <span class="mt-1 block truncate text-[11px] text-slate-400">照片分类</span>
                    </span>
                    <span class="shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-400">#{{ item.sortOrder }}</span>
                    <Edit class="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </div>
                <div v-else class="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
                  暂无照片分类，请在右侧新增。
                </div>
              </div>

              <form class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5" @submit.prevent="saveCategory">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h4 class="text-sm font-semibold text-slate-800">{{ categoryForm.id ? '编辑分类' : '新增分类' }}</h4>
                    <p class="mt-1 text-xs text-slate-400">新增和编辑只需填写分类名称。</p>
                  </div>
                  <button v-if="categoryForm.id" type="button" class="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600" @click="resetCategoryForm">
                    <Plus class="h-3.5 w-3.5" /> 新增
                  </button>
                </div>

                <div class="mt-5 space-y-4">
                  <label class="block">
                    <span class="mb-1.5 block text-xs font-medium text-slate-500">分类名称 <span class="text-rose-500">*</span></span>
                    <input v-model.trim="categoryForm.label" maxlength="100" placeholder="例如：甜蜜约会" class="form-control">
                  </label>

                  <div class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div>
                      <span class="block text-xs font-medium text-slate-500">前台显示</span>
                      <span class="mt-1 block text-[11px] text-slate-400">停用后不会出现在前台分类和新增照片选择器中</span>
                    </div>
                    <el-switch v-model="categoryForm.status" :disabled="categorySaving || categoryDeleting" inline-prompt active-text="启用" inactive-text="停用" />
                  </div>
                </div>

                <button type="submit" :disabled="categorySaving || categoryDeleting" class="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Loading v-if="categorySaving" class="h-4 w-4 animate-spin" />
                  {{ categorySaving ? '保存中…' : categoryForm.id ? '保存修改' : '新增分类' }}
                </button>
                <button
                  v-if="categoryForm.id"
                  type="button"
                  :disabled="categorySaving || categoryDeleting"
                  class="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="deleteCategory"
                >
                  <Loading v-if="categoryDeleting" class="h-4 w-4 animate-spin" />
                  <Delete v-else class="h-4 w-4" />
                  {{ categoryDeleting ? '删除中…' : '删除分类' }}
                </button>
              </form>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Calendar,
  Close,
  CollectionTag,
  Delete,
  Edit,
  Loading,
  Location,
  Picture,
  Plus,
  Search,
  StarFilled,
  Upload,
  UploadFilled,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/date-picker/style/css'

import api from '@/axios'

const pageSize = 12
const categoryItems = ref([])
const categories = computed(() => categoryItems.value)
const activeCategories = computed(() => categories.value.filter((item) => item.status))

const currentPage = ref(1)
const keyword = ref('')
const categoryFilter = ref('')
const visibilityFilter = ref('')
const loading = ref(false)
const photosData = ref({ records: [], total: 0, current: 1, size: pageSize })
let searchTimer
let requestSerial = 0
let resettingFilters = false

const photos = computed(() => photosData.value.records || [])
const totalItems = computed(() => Number(photosData.value.total) || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize)))
const pageNumbers = computed(() => {
  const last = totalPages.value
  let start = Math.max(1, currentPage.value - 2)
  let end = Math.min(last, start + 4)
  start = Math.max(1, end - 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '未记录日期'
}

function responseError(data, fallback) {
  return data?.message || fallback
}

const categoryLoading = ref(false)
const categorySaving = ref(false)
const categoryDeleting = ref(false)
const categoryForm = ref(createEmptyCategoryForm())

function createEmptyCategoryForm() {
  return {
    id: null,
    label: '',
    status: true,
  }
}

async function fetchCategoryItems() {
  const { data } = await api.post('/admin/photo/category/list')
  if (!data?.success || !Array.isArray(data.data)) {
    throw new Error(responseError(data, '照片分类加载失败'))
  }
  return data.data
    .filter((item) => item?.id && item?.categoryName)
    .map((item) => ({
      id: item.id,
      label: String(item.categoryName).trim(),
      sortOrder: Number(item.sortOrder) || 0,
      status: item.isEnabled !== false,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder)
}

async function loadCategories(options = {}) {
  const { notify = false } = options
  categoryLoading.value = true
  try {
    categoryItems.value = await fetchCategoryItems()
    if (!form.value.photoCategoryId) {
      form.value.photoCategoryId = activeCategories.value[0]?.id || categories.value[0]?.id || null
    }
    return true
  } catch (error) {
    if (notify) ElMessage.error(error.response?.data?.message || error.message || '照片分类加载失败')
    return false
  } finally {
    categoryLoading.value = false
  }
}

async function openCategoryManager() {
  showCategoryManager.value = true
  resetCategoryForm()
  await loadCategories({ notify: true })
}

function closeCategoryManager() {
  if (categorySaving.value || categoryDeleting.value) return
  showCategoryManager.value = false
}

function resetCategoryForm() {
  categoryForm.value = createEmptyCategoryForm()
}

function editCategory(item) {
  categoryForm.value = {
    id: item.id,
    label: item.label,
    status: item.status,
  }
}

async function saveCategory() {
  const label = categoryForm.value.label.trim()
  if (!label) return ElMessage.warning('分类名称不能为空')

  categorySaving.value = true
  try {
    const payload = {
      id: categoryForm.value.id || undefined,
      categoryName: label,
      isEnabled: categoryForm.value.status,
    }
    const { data } = await api.post('/admin/photo/category/save', payload)
    if (!data?.success) throw new Error(responseError(data, '照片分类保存失败'))
    ElMessage.success(categoryForm.value.id ? '分类已更新' : '分类已新增')
    await loadCategories({ notify: true })
    resetCategoryForm()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '照片分类保存失败')
  } finally {
    categorySaving.value = false
  }
}

async function deleteCategory() {
  const category = { ...categoryForm.value }
  if (!category.id) return

  try {
    await ElMessageBox.confirm(
      `确定删除照片分类“${category.label}”吗？`,
      '删除照片分类',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  categoryDeleting.value = true
  try {
    const { data } = await api.post('/admin/photo/category/delete', { id: category.id })
    if (!data?.success) throw new Error(responseError(data, '照片分类删除失败'))

    ElMessage.success('照片分类已删除')
    resetCategoryForm()
    await loadCategories({ notify: true })
    if (form.value.photoCategoryId === category.id) {
      form.value.photoCategoryId = activeCategories.value[0]?.id || categories.value[0]?.id || null
    }
    if (categoryFilter.value === category.id) {
      categoryFilter.value = ''
      applyFilters()
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '照片分类删除失败')
  } finally {
    categoryDeleting.value = false
  }
}

async function fetchPhotos() {
  const serial = ++requestSerial
  loading.value = true
  try {
    const payload = {
      current: currentPage.value,
      size: pageSize,
      title: keyword.value.trim() || undefined,
      photoCategoryId: categoryFilter.value || undefined,
      isVisible: visibilityFilter.value === '' ? undefined : visibilityFilter.value === 'true',
    }
    const { data } = await api.post('/admin/photo/list', payload)
    if (serial !== requestSerial) return
    if (!data?.success || !data.data) {
      ElMessage.error(responseError(data, '照片列表加载失败'))
      return
    }

    photosData.value = data.data
    const lastPage = Math.max(1, Math.ceil((Number(data.data.total) || 0) / pageSize))
    if (currentPage.value > lastPage) {
      currentPage.value = lastPage
    }
  } catch (error) {
    if (serial === requestSerial) {
      ElMessage.error(error.response?.data?.message || '照片列表加载失败，请稍后重试')
    }
  } finally {
    if (serial === requestSerial) loading.value = false
  }
}

function applyFilters() {
  if (currentPage.value !== 1) currentPage.value = 1
  else fetchPhotos()
}

async function resetFilters() {
  clearTimeout(searchTimer)
  resettingFilters = true
  keyword.value = ''
  categoryFilter.value = ''
  visibilityFilter.value = ''
  await nextTick()
  resettingFilters = false
  applyFilters()
}

watch(currentPage, fetchPhotos)
watch(keyword, () => {
  if (resettingFilters) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 350)
})

onMounted(() => {
  fetchPhotos()
  loadCategories()
})
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  document.documentElement.classList.remove('admin-photo-modal-open')
})

const showEditor = ref(false)
const showCategoryManager = ref(false)
const editingId = ref(null)
const saving = ref(false)
const uploading = ref(false)
const form = ref(createEmptyForm())

watch([showEditor, showCategoryManager], ([editorOpen, categoryOpen]) => {
  document.documentElement.classList.toggle('admin-photo-modal-open', editorOpen || categoryOpen)
})

watch(() => form.value.isCover, (isCover) => {
  if (isCover) form.value.isVisible = true
})

function createEmptyForm() {
  return {
    title: '',
    description: '',
    photoCategoryId: activeCategories.value[0]?.id || categories.value[0]?.id || null,
    url: '',
    takenTime: '',
    location: '',
    sortOrder: 0,
    isCover: false,
    isVisible: true,
  }
}

function openEditor(row) {
  editingId.value = row?.id || null
  form.value = row
    ? {
        title: row.title || '',
        description: row.description || '',
        photoCategoryId: row.photoCategoryId || activeCategories.value[0]?.id || null,
        url: row.url || '',
        takenTime: row.takenTime || '',
        location: row.location || '',
        sortOrder: Number(row.sortOrder) || 0,
        isCover: Boolean(row.isCover),
        isVisible: Boolean(row.isVisible),
      }
    : createEmptyForm()
  showEditor.value = true
}

function closeEditor() {
  if (saving.value || uploading.value) return
  showEditor.value = false
}

async function handleImageChange(file) {
  const raw = file?.raw
  if (!raw) return
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(raw.type)) {
    ElMessage.warning('仅支持 JPG、PNG、WebP 或 GIF 图片')
    return
  }
  if (raw.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 10MB')
    return
  }

  uploading.value = true
  const formData = new FormData()
  formData.append('file', raw)
  try {
    const { data } = await api.post('/admin/file/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (!data?.success || !data.data?.url) {
      ElMessage.error(responseError(data, '图片上传失败'))
      return
    }
    form.value.url = data.data.url
    if (!form.value.title.trim()) {
      form.value.title = raw.name.replace(/\.[^.]+$/, '').slice(0, 100)
    }
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '图片上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

async function submitPhoto() {
  if (!form.value.url.trim()) return ElMessage.warning('请先上传照片')
  if (!form.value.title.trim()) return ElMessage.warning('照片标题不能为空')
  if (!form.value.photoCategoryId) return ElMessage.warning('请选择照片分类')
  if (!Number.isInteger(Number(form.value.sortOrder)) || Number(form.value.sortOrder) < 0) {
    return ElMessage.warning('排序值请输入大于等于 0 的整数')
  }

  saving.value = true
  try {
    const isUpdate = Boolean(editingId.value)
    const payload = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      photoCategoryId: form.value.photoCategoryId,
      url: form.value.url.trim(),
      takenTime: form.value.takenTime || null,
      location: form.value.location.trim(),
      sortOrder: Number(form.value.sortOrder),
      isCover: form.value.isCover,
      isVisible: form.value.isVisible,
    }
    if (isUpdate) payload.id = editingId.value

    const { data } = await api.post(isUpdate ? '/admin/photo/update' : '/admin/photo/add', payload)
    if (!data?.success) {
      ElMessage.error(responseError(data, '照片保存失败'))
      return
    }
    ElMessage.success(isUpdate ? '照片已更新' : '照片已添加')
    showEditor.value = false
    if (!isUpdate && currentPage.value !== 1) currentPage.value = 1
    else fetchPhotos()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '照片保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

async function toggleVisible(row) {
  const nextValue = Boolean(row.isVisible)
  try {
    const { data } = await api.post('/admin/photo/updateVisibleStatus', {
      id: row.id,
      isVisible: nextValue,
    })
    if (!data?.success) throw new Error(responseError(data, '状态更新失败'))
    if (!nextValue) row.isCover = false
    ElMessage.success(nextValue ? '照片已显示' : '照片已隐藏')
  } catch (error) {
    row.isVisible = !nextValue
    ElMessage.error(error.response?.data?.message || error.message || '状态更新失败')
  }
}

async function deletePhoto(row) {
  try {
    await ElMessageBox.confirm(`确定删除照片“${row.title}”吗？删除后前台将不再展示。`, '删除照片', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    const { data } = await api.post('/admin/photo/delete', { id: row.id })
    if (!data?.success) {
      ElMessage.error(responseError(data, '删除失败'))
      return
    }
    ElMessage.success('照片已删除')
    if (photos.value.length === 1 && currentPage.value > 1) currentPage.value--
    else fetchPhotos()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '删除失败，请稍后重试')
  }
}
</script>

<style scoped>
.photo-description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.page-button {
  min-width: 2rem;
  border-radius: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  transition: 160ms ease;
}

.page-button:hover:not(:disabled) {
  background: #f1f5f9;
  color: #334155;
}

.page-button:disabled {
  cursor: not-allowed;
  color: #cbd5e1;
}

.page-button-active,
.page-button-active:hover:not(:disabled) {
  background: #e11d48;
  color: white;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.08);
}

.form-control {
  min-height: 2.5rem;
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: white;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #334155;
  outline: none;
  transition: 160ms ease;
}

.form-control:focus {
  border-color: #fda4af;
  box-shadow: 0 0 0 3px rgb(255 228 230 / 0.8);
}

.category-select-icon {
  position: absolute;
  z-index: 2;
  left: 0.8rem;
  top: 50%;
  width: 1rem;
  height: 1rem;
  color: #fb7185;
  pointer-events: none;
  transform: translateY(-50%);
}

:deep(.admin-category-select .el-select__wrapper) {
  min-height: 2.5rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #fff 0%, #fff7f8 100%);
  padding-left: 2.45rem;
  padding-right: 0.8rem;
  box-shadow: 0 0 0 1px #e2e8f0 inset, 0 1px 2px rgb(15 23 42 / 0.03);
  transition: box-shadow 160ms ease, background 160ms ease, transform 160ms ease;
}

:deep(.admin-category-select .el-select__wrapper:hover) {
  background: #fff;
  box-shadow: 0 0 0 1px #fda4af inset, 0 4px 12px rgb(244 63 94 / 0.08);
}

:deep(.admin-category-select .el-select__wrapper.is-focused) {
  background: #fff;
  box-shadow: 0 0 0 1px #fb7185 inset, 0 0 0 3px rgb(255 228 230 / 0.85);
}

:deep(.admin-category-select .el-select__placeholder),
:deep(.admin-category-select .el-select__selected-item) {
  color: #475569;
  font-size: 0.875rem;
}

:deep(.admin-category-select .el-select__caret) {
  color: #f43f5e;
}

:global(.photo-category-popper.el-popper) {
  overflow: hidden;
  border: 1px solid #ffe4e6;
  border-radius: 0.875rem;
  box-shadow: 0 14px 38px rgb(15 23 42 / 0.14);
}

:global(.photo-category-popper .el-select-dropdown__list) {
  padding: 0.4rem;
}

:global(.photo-category-popper .el-select-dropdown__item) {
  min-height: 2.5rem;
  height: auto;
  margin: 0.12rem 0;
  border-radius: 0.65rem;
  padding: 0.6rem 0.75rem;
  color: #475569;
  line-height: 1.25rem;
}

:global(.photo-category-popper .el-select-dropdown__item.is-hovering) {
  background: #fff1f2;
  color: #be123c;
}

:global(.photo-category-popper .el-select-dropdown__item.is-selected) {
  background: #ffe4e6;
  color: #be123c;
  font-weight: 600;
}

.photo-uploader :deep(.el-upload) {
  display: block;
  width: 100%;
}

.photo-modal-enter-active,
.photo-modal-leave-active {
  transition: opacity 180ms ease;
}

.photo-modal-enter-active section,
.photo-modal-leave-active section {
  transition: transform 180ms ease, opacity 180ms ease;
}

.photo-modal-enter-from,
.photo-modal-leave-to {
  opacity: 0;
}

.photo-modal-enter-from section,
.photo-modal-leave-to section {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

:global(html.admin-photo-modal-open),
:global(html.admin-photo-modal-open body) {
  overflow: hidden;
}
</style>
