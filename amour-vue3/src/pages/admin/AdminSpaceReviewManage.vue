<template>
  <div class="space-y-5">
    <section class="admin-filter-panel">
      <div class="admin-filter-bar">
        <div class="admin-filter-fields">
          <el-select
            v-model="filters.status"
            clearable
            placeholder="全部状态"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option v-for="item in statusOptions" :key="item.value" :value="item.value" :label="item.label" />
          </el-select>
          <el-select
            v-model="filters.reviewType"
            clearable
            placeholder="全部审核类型"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option v-for="item in reviewTypeOptions" :key="item.value" :value="item.value" :label="item.label" />
          </el-select>
          <label class="admin-filter-field admin-filter-field--search">
            <Search class="admin-search-icon" aria-hidden="true" />
            <input
              v-model="filters.keyword"
              type="search"
              aria-label="搜索空间"
              placeholder="空间名称或 spaceCode"
              class="admin-search-input"
              @keyup.enter="applyFilters"
            >
          </label>
          <el-input-number
            v-model="filters.spaceId"
            :min="1"
            :controls="false"
            placeholder="空间 ID"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          />
          <el-input
            v-model="filters.submittedByAmourId"
            clearable
            placeholder="提交人恋语 ID"
            class="admin-filter-field admin-filter-field--select"
            @keyup.enter="applyFilters"
            @clear="applyFilters"
          />
          <el-date-picker
            v-model="filters.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="提交开始"
            end-placeholder="提交结束"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="admin-filter-field admin-filter-field--date"
            @change="applyFilters"
          />
        </div>
        <div class="admin-filter-actions">
          <button type="button" class="admin-filter-button admin-filter-button--primary" @click="applyFilters">
            查询
          </button>
          <button
            type="button"
            class="admin-filter-button admin-filter-button--secondary admin-filter-button--icon"
            aria-label="刷新审核列表"
            title="刷新审核列表"
            @click="load"
          >
            <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-24 text-sm text-slate-400">加载中…</div>
      <div v-else-if="error" class="px-6 py-16 text-center text-sm text-rose-600">
        {{ error }}
        <button type="button" class="ml-2 font-semibold underline" @click="load">重试</button>
      </div>
      <div v-else-if="!rows.length" class="px-6 py-20 text-center">
        <Document class="mx-auto h-9 w-9 text-slate-200" aria-hidden="true" />
        <p class="mt-3 text-sm font-medium text-slate-600">暂无符合条件的审核提交</p>
        <p class="mt-1 text-xs text-slate-400">调整状态、审核类型或空间关键字后再查询。</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1080px] divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-6 py-3">空间</th>
              <th class="px-4 py-3">成员</th>
              <th class="px-4 py-3">公开状态</th>
              <th class="px-4 py-3">审核类型</th>
              <th class="px-4 py-3">修改项</th>
              <th class="px-4 py-3">提交人 / 时间</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">最近修改</th>
              <th class="px-6 py-3 admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="row.submissionId" class="align-top hover:bg-slate-50/70">
              <td class="max-w-[16rem] px-6 py-4">
                <p class="truncate font-medium text-slate-800" :title="row.spaceName || '未知空间'">{{ row.spaceName || '未知空间' }}</p>
                <p class="mt-1 truncate font-mono text-[11px] text-slate-400">ID {{ row.spaceId }} · {{ row.spaceCode || '-' }}</p>
              </td>
              <td class="px-4 py-4">
                <p class="max-w-[11rem] truncate text-xs text-slate-600" :title="row.memberSummary || ''">{{ row.memberSummary || '-' }}</p>
                <p class="mt-1 text-[10px] text-slate-400">{{ row.spaceStatusText }}</p>
              </td>
              <td class="whitespace-nowrap px-4 py-4">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="row.spaceVisibility === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
                >
                  {{ row.spaceVisibilityText || '私密' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{{ row.reviewTypeText || '-' }}</td>
              <td class="whitespace-nowrap px-4 py-4">
                <p class="text-xs font-semibold text-slate-700">{{ row.itemCount || 0 }} 项</p>
                <p class="mt-1 text-[10px] text-slate-400">
                  待审核 {{ row.pendingItemCount || 0 }} · 已通过 {{ row.approvedItemCount || 0 }} · 已驳回 {{ row.rejectedItemCount || 0 }}
                </p>
              </td>
              <td class="px-4 py-4">
                <p class="max-w-[10rem] truncate text-xs text-slate-700" :title="row.submittedByName || '恋人'">{{ row.submittedByName || '恋人' }}</p>
                <p class="mt-1 font-mono text-[10px] text-slate-400">{{ row.submittedByAmourId || '-' }}</p>
                <p class="mt-1 text-[10px] text-slate-400">{{ row.submittedAt || '-' }}</p>
              </td>
              <td class="whitespace-nowrap px-4 py-4">
                <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(row.status)">
                  {{ row.statusText }}
                </span>
                <p
                  v-if="row.itemRejectReason || row.rejectReason"
                  class="mt-1 max-w-[10rem] truncate text-[10px] text-rose-500"
                  :title="row.itemRejectReason || row.rejectReason"
                >
                  {{ row.itemRejectReason || row.rejectReason }}
                </p>
              </td>
              <td class="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{{ row.updateTime || '-' }}</td>
              <td class="whitespace-nowrap px-6 py-4 admin-table-actions">
                <div class="admin-table-action-group admin-table-action-group--space">
                  <button type="button" class="admin-table-action text-slate-600 hover:bg-slate-100" @click="openDetail(row)">
                    <View class="admin-table-action__icon" aria-hidden="true" />
                    <span>详情</span>
                  </button>
                  <button
                    v-if="row.status === 'PENDING' && canProcess"
                    type="button"
                    class="admin-table-action text-emerald-600 hover:bg-emerald-50"
                    @click="openDetail(row)"
                  >
                    <CircleCheck class="admin-table-action__icon" aria-hidden="true" />
                    <span>审核</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
        <span class="text-xs text-slate-400">共 {{ total }} 条</span>
        <div class="flex items-center gap-1">
          <button type="button" :disabled="current <= 1 || loading" class="rounded-lg px-3 py-1.5 text-xs transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="current -= 1">上一页</button>
          <span class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white">{{ current }}</span>
          <button type="button" :disabled="current >= totalPages || loading" class="rounded-lg px-3 py-1.5 text-xs transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="current += 1">下一页</button>
        </div>
      </div>
    </section>

    <el-drawer
      v-model="detailVisible"
      :title="detail ? `空间审核 #${detail.submissionId}` : '空间审核详情'"
      size="min(1080px, calc(100vw - 24px))"
      class="admin-drawer admin-dialog-surface"
      modal-class="admin-modal-overlay"
      append-to-body
      destroy-on-close
    >
      <div v-if="detailLoading" class="py-16 text-center text-sm text-slate-400">详情加载中…</div>
      <div v-else-if="detailError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {{ detailError }}
        <button type="button" class="ml-2 font-semibold underline" @click="reloadDetail">重试</button>
      </div>
      <div v-else-if="detail" class="space-y-5">
        <section class="rounded-xl border border-slate-200 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-base font-semibold text-slate-900">{{ detail.space?.spaceName || '未知空间' }}</h3>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="detail.space?.visibility === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">
                  空间当前公开状态：{{ detail.space?.visibilityText || '私密' }}
                </span>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="statusClass(detail.status)">
                  提交审核状态：{{ detail.statusText }}
                </span>
              </div>
              <p class="mt-1 font-mono text-[11px] text-slate-400">ID {{ detail.spaceId }} · {{ detail.space?.spaceCode || '-' }}</p>
              <p class="mt-2 max-w-3xl text-xs leading-6 text-slate-600">{{ detail.space?.description || '暂无空间简介' }}</p>
            </div>
            <div class="admin-review-toolbar">
              <button
                v-if="(detail.pendingItemCount || 0) > 0 && canProcess"
                type="button"
                class="admin-review-action admin-review-action--primary"
                :disabled="isProcessing"
                :aria-busy="isActionBusy('approve-all')"
                @click="approveAll"
              >
                <Loading v-if="isActionBusy('approve-all')" class="admin-review-action__icon animate-spin" aria-hidden="true" />
                <CircleCheck v-else class="admin-review-action__icon" aria-hidden="true" />
                <span>全部通过</span>
              </button>
              <button
                v-if="(detail.pendingItemCount || 0) > 0 && canProcess"
                type="button"
                class="admin-review-action admin-review-action--reject"
                :disabled="isProcessing"
                :aria-busy="isActionBusy('reject-all')"
                @click="rejectAll"
              >
                <Loading v-if="isActionBusy('reject-all')" class="admin-review-action__icon animate-spin" aria-hidden="true" />
                <CircleClose v-else class="admin-review-action__icon" aria-hidden="true" />
                <span>全部驳回</span>
              </button>
              <button
                v-if="canProcess && detail.space?.visibility === 1"
                type="button"
                class="admin-review-action admin-review-action--danger"
                :disabled="isProcessing"
                :aria-busy="isActionBusy('unpublish-space')"
                @click="unpublishSpace"
              >
                <Loading v-if="isActionBusy('unpublish-space')" class="admin-review-action__icon animate-spin" aria-hidden="true" />
                <Remove v-else class="admin-review-action__icon" aria-hidden="true" />
                <span>暂停空间公开</span>
              </button>
            </div>
          </div>

          <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg bg-slate-50 px-3 py-2">
              <dt class="text-[10px] text-slate-400">审核类型</dt>
              <dd class="mt-1 text-xs font-semibold text-slate-700">{{ detail.reviewTypeText }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 px-3 py-2">
              <dt class="text-[10px] text-slate-400">提交人</dt>
              <dd class="mt-1 text-xs font-semibold text-slate-700">{{ detail.submittedByName }} · {{ detail.submittedByAmourId || '-' }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 px-3 py-2">
              <dt class="text-[10px] text-slate-400">提交时间</dt>
              <dd class="mt-1 text-xs font-semibold text-slate-700">{{ detail.submittedAt || '-' }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 px-3 py-2">
              <dt class="text-[10px] text-slate-400">处理信息</dt>
              <dd class="mt-1 text-xs font-semibold text-slate-700">
                {{ detail.handledAt ? `${detail.handledByName} · ${detail.handledAt}` : '尚未处理' }}
              </dd>
            </div>
          </dl>
          <p v-if="detail.rejectReason" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
            驳回原因：{{ detail.rejectReason }}
          </p>
          <p v-else-if="detail.changeSummary" class="mt-3 text-xs text-slate-500">变更摘要：{{ detail.changeSummary }}</p>

          <div class="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>空间成员：{{ (detail.space?.members || []).map(item => item.displayName).join(' · ') || '-' }}</span>
            <span>已发布内容：故事 {{ detail.publicStoryCount || 0 }} · 照片 {{ detail.publicPhotoCount || 0 }} · 纪念日 {{ detail.publicAnniversaryCount || 0 }}</span>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 p-4">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-800">本次提交（{{ detail.itemCount || 0 }} 项）</h3>
            <p class="text-[11px] text-slate-500">
              待审核 {{ detail.pendingItemCount || 0 }} · 已通过 {{ detail.approvedItemCount || 0 }} · 已驳回 {{ detail.rejectedItemCount || 0 }}
            </p>
          </div>
          <p v-if="!detail.reviewItems?.length" class="mt-2 text-xs text-slate-400">该提交没有审核项。</p>
          <div v-else class="mt-3 space-y-4">
            <article
              v-for="item in detail.reviewItems"
              :key="`${item.itemType}-${item.itemId}`"
              class="rounded-xl border bg-white p-4"
              :class="item.itemStatus === 'REJECTED' ? 'border-rose-200' : 'border-slate-200'"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-slate-800">{{ item.title || item.itemTypeText }}</p>
                  <p class="mt-1 text-[11px] text-slate-400">
                    {{ item.itemTypeText }} · 动作 {{ item.actionText || '-' }}
                    <span v-if="item.currentRevision != null"> · 当前版本 V{{ item.currentRevision }} / 审核版本 V{{ item.baseRevision }}</span>
                  </p>
                </div>
                <span class="rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="itemStatusClass(item.itemStatus)">
                  {{ item.itemStatusText }}
                </span>
              </div>

              <p
                v-if="item.itemStatus === 'REJECTED'"
                class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"
              >
                驳回原因：{{ item.rejectReason || '未填写原因' }}
              </p>
              <p v-if="item.itemStatus === 'APPROVED' && item.handledAt" class="mt-3 text-[11px] text-emerald-700">
                已通过 · 处理时间 {{ item.handledAt }}
              </p>
              <p v-else-if="item.itemStatus === 'REJECTED' && item.handledAt" class="mt-1 text-[11px] text-slate-400">
                处理时间 {{ item.handledAt }}
              </p>

              <template v-if="item.itemStatus === 'PENDING'">
                <div v-if="item.changedFields?.length" class="mt-3 overflow-x-auto">
                  <table class="w-full min-w-[560px] text-left text-xs">
                    <thead class="text-slate-400">
                      <tr>
                        <th class="w-24 py-2">字段</th>
                        <th class="py-2">当前已发布版本</th>
                        <th class="py-2">待审核版本</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="field in item.changedFields" :key="field.label">
                        <td class="py-2 align-top font-medium text-slate-600">{{ field.label }}</td>
                        <td class="py-2 align-top text-slate-500">
                          <p class="max-h-40 overflow-auto whitespace-pre-wrap break-words">{{ field.before || '（空）' }}</p>
                        </td>
                        <td class="py-2 align-top text-slate-700">
                          <p class="max-h-40 overflow-auto whitespace-pre-wrap break-words">{{ field.after || '（空）' }}</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="mt-3 text-xs text-slate-400">内容未发生变化或为首次提交。</p>

                <div v-if="item.beforeImages?.length || item.afterImages?.length" class="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p class="text-[10px] font-semibold text-slate-400">当前图片</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <img
                        v-for="(url, index) in item.beforeImages"
                        :key="`before-${index}`"
                        :src="url"
                        alt=""
                        class="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-100"
                      >
                      <span v-if="!item.beforeImages?.length" class="text-xs text-slate-400">无</span>
                    </div>
                  </div>
                  <div>
                    <p class="text-[10px] font-semibold text-slate-400">待审核图片</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <img
                        v-for="(url, index) in item.afterImages"
                        :key="`after-${index}`"
                        :src="url"
                        alt=""
                        class="h-20 w-20 rounded-lg object-cover ring-1 ring-rose-100"
                      >
                      <span v-if="!item.afterImages?.length" class="text-xs text-slate-400">无</span>
                    </div>
                  </div>
                </div>

                <div v-if="canProcess" class="admin-review-item-actions">
                  <button
                    type="button"
                    class="admin-review-action admin-review-action--primary"
                    :disabled="isProcessing"
                    :aria-busy="isActionBusy(itemApproveKey(item))"
                    @click="approveItem(item)"
                  >
                    <Loading v-if="isActionBusy(itemApproveKey(item))" class="admin-review-action__icon animate-spin" aria-hidden="true" />
                    <CircleCheck v-else class="admin-review-action__icon" aria-hidden="true" />
                    <span>通过此项</span>
                  </button>
                  <button
                    type="button"
                    class="admin-review-action admin-review-action--reject"
                    :disabled="isProcessing"
                    :aria-busy="isActionBusy(itemRejectKey(item))"
                    @click="rejectItem(item)"
                  >
                    <Loading v-if="isActionBusy(itemRejectKey(item))" class="admin-review-action__icon animate-spin" aria-hidden="true" />
                    <CircleClose v-else class="admin-review-action__icon" aria-hidden="true" />
                    <span>驳回此项</span>
                  </button>
                </div>
              </template>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 p-4">
          <h3 class="text-sm font-semibold text-slate-800">当前已发布版本（{{ detail.publishedItems?.length || 0 }} 项）</h3>
          <p v-if="!detail.publishedItems?.length" class="mt-2 text-xs text-slate-400">恋爱广场当前没有展示该空间的内容。</p>
          <div v-else class="mt-3 space-y-3">
            <article v-for="item in detail.publishedItems" :key="`pub-${item.itemType}-${item.itemId}`" class="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-slate-700">{{ item.afterSummary?.title || item.title || item.itemTypeText }}</p>
                  <p class="mt-1 text-[10px] text-slate-400">
                    {{ item.itemTypeText }} · 版本 V{{ item.currentRevision ?? item.baseRevision ?? 0 }}
                    <span v-if="item.afterSummary?.subtitle"> · {{ item.afterSummary.subtitle }}</span>
                  </p>
                </div>
                <button
                  v-if="canProcess && isContentItem(item)"
                  type="button"
                  class="admin-review-action admin-review-action--danger-solid ml-auto"
                  :disabled="isProcessing"
                  :aria-busy="isActionBusy(itemUnpublishKey(item))"
                  @click="unpublishItem(item)"
                >
                  <Loading v-if="isActionBusy(itemUnpublishKey(item))" class="admin-review-action__icon animate-spin" aria-hidden="true" />
                  <Hide v-else class="admin-review-action__icon" aria-hidden="true" />
                  <span>下架已公开内容</span>
                </button>
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 p-4">
          <h3 class="text-sm font-semibold text-slate-800">历史审核记录</h3>
          <p v-if="!detail.history?.length" class="mt-2 text-xs text-slate-400">暂无历史审核记录。</p>
          <ul v-else class="mt-3 space-y-2">
            <li v-for="history in detail.history" :key="history.submissionId" class="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span class="font-mono text-[10px] text-slate-400">#{{ history.submissionId }}</span>
              <span class="font-medium text-slate-700">{{ history.reviewTypeText }}</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="statusClass(history.status)">{{ history.statusText }}</span>
              <span class="text-[10px] text-slate-400">{{ history.submittedAt }} → {{ history.handledAt || '未处理' }}</span>
              <span v-if="history.rejectReason" class="w-full text-[10px] text-rose-500">驳回原因：{{ history.rejectReason }}</span>
            </li>
          </ul>
        </section>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { CircleCheck, CircleClose, Document, Hide, Loading, Refresh, Remove, Search, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveAdminSpaceReview,
  approveAdminSpaceReviewItem,
  fetchAdminSpaceReviewDetail,
  fetchAdminSpaceReviewPage,
  rejectAdminSpaceReview,
  rejectAdminSpaceReviewItem,
  unpublishAdminSpaceContent,
} from '@/api/admin/spaceReview'
import { ADMIN_PERMISSIONS, hasAdminPermission } from '@/utils/adminAuth'
import {
  ADMIN_DANGER_CONFIRM_BUTTON_CLASS,
  ADMIN_MODAL_OVERLAY_CLASS,
  ADMIN_REASON_MAX_LENGTH,
  validateAdminReason,
} from '@/utils/adminPrompt'
import { ADMIN_MESSAGE_BOX_CLASS } from '@/utils/adminRestore'

const PAGE_SIZE = 10

const statusOptions = [
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'PARTIALLY_APPROVED', label: '部分通过' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'WITHDRAWN', label: '已撤回' },
  { value: 'SUPERSEDED', label: '已被新版本替代' },
]
const reviewTypeOptions = [
  { value: 'FIRST_PUBLISH', label: '首次公开' },
  { value: 'CONTENT_UPDATE', label: '公开内容修改' },
  { value: 'REPUBLISH', label: '重新公开' },
]

const canProcess = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.SPACE_REVIEW_PROCESS))

const filters = reactive({
  status: null,
  reviewType: null,
  keyword: '',
  spaceId: null,
  submittedByAmourId: '',
  timeRange: null,
})
const rows = ref([])
const total = ref(0)
const current = ref(1)
const loading = ref(false)
const error = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref(null)
const processingKey = ref('')
const isProcessing = computed(() => Boolean(processingKey.value))

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

function isActionBusy(key) {
  return processingKey.value === key
}

function itemRejectKey(item) {
  return `reject-item:${item?.itemType}:${item?.itemId}`
}

function itemApproveKey(item) {
  return `approve-item:${item?.itemType}:${item?.itemId}`
}

function itemUnpublishKey(item) {
  return `unpublish-item:${item?.itemType}:${item?.itemId}`
}

function itemStatusClass(status) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700'
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-600'
    case 'REJECTED':
      return 'bg-rose-50 text-rose-600'
    case 'WITHDRAWN':
    case 'SUPERSEDED':
      return 'bg-slate-100 text-slate-500'
    default:
      return 'bg-slate-100 text-slate-500'
  }
}

function statusClass(status) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700'
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-600'
    case 'PARTIALLY_APPROVED':
      return 'bg-sky-50 text-sky-600'
    case 'REJECTED':
      return 'bg-rose-50 text-rose-600'
    case 'WITHDRAWN':
      return 'bg-slate-100 text-slate-500'
    case 'SUPERSEDED':
      return 'bg-slate-100 text-slate-500'
    default:
      return 'bg-slate-100 text-slate-500'
  }
}

function buildPayload() {
  const [startTime, endTime] = Array.isArray(filters.timeRange) ? filters.timeRange : [null, null]
  return {
    current: current.value,
    size: PAGE_SIZE,
    status: filters.status || null,
    reviewType: filters.reviewType || null,
    keyword: filters.keyword.trim() || null,
    spaceId: filters.spaceId || null,
    submittedByAmourId: filters.submittedByAmourId.trim() || null,
    startTime,
    endTime,
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await fetchAdminSpaceReviewPage(buildPayload())
    if (!data?.success) throw new Error(data?.message || '审核列表加载失败')
    rows.value = Array.isArray(data.data?.records) ? data.data.records : []
    total.value = Number(data.data?.total) || 0
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '审核列表加载失败'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  current.value = 1
  load()
}

async function openDetail(row) {
  detailVisible.value = true
  detailError.value = ''
  detail.value = null
  detailLoading.value = true
  try {
    const { data } = await fetchAdminSpaceReviewDetail(row.submissionId)
    if (!data?.success) throw new Error(data?.message || '审核详情加载失败')
    detail.value = data.data
  } catch (e) {
    detailError.value = e.response?.data?.message || e.message || '审核详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

async function reloadDetail() {
  if (!detail.value?.submissionId) return
  await openDetail({ submissionId: detail.value.submissionId })
}

function isContentItem(item) {
  return ['STORY', 'PHOTO', 'ANNIVERSARY'].includes(item?.itemType)
}

function contentPayload(item) {
  const map = { STORY: 'story', PHOTO: 'photo', ANNIVERSARY: 'anniversary' }
  return { contentType: map[item.itemType], contentId: item.itemId }
}

/**
 * 后台下架 / 驳回共用原因输入弹窗。
 * 所有调用都带 admin-message-box 作用域，避免 body 挂载的 MessageBox 丢失品牌样式。
 */
async function promptReason({ title, message, confirmButtonText }) {
  try {
    const result = await ElMessageBox.prompt(message, title, {
      confirmButtonText,
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: `必填，最多 ${ADMIN_REASON_MAX_LENGTH} 字`,
      inputValidator: validateAdminReason,
      customClass: ADMIN_MESSAGE_BOX_CLASS,
      modalClass: ADMIN_MODAL_OVERLAY_CLASS,
      confirmButtonClass: ADMIN_DANGER_CONFIRM_BUTTON_CLASS,
      distinguishCancelAndClose: true,
    })
    const reason = String(result.value || '').trim()
    return reason || null
  } catch {
    return null
  }
}

function handleActionError(error, fallback) {
  const message = error.response?.data?.message || error.message || fallback
  const errorCode = error.response?.data?.errorCode
  if (errorCode === '20091') {
    ElMessage.error('该审核项已被处理，请刷新后重试')
    return
  }
  // 审核状态或 revision 已变化时，提示管理员刷新详情，避免继续基于旧快照操作。
  const needsRefresh = ['20079', '20080', '20081'].includes(errorCode)
  ElMessage.error(needsRefresh ? `${message}，请刷新详情后重试` : message)
}

async function approveAll() {
  if (!detail.value || isProcessing.value) return
  try {
    await ElMessageBox.confirm(
      '通过后待审核版本会一次性替换当前广场展示，且会校验审核期间是否有新的编辑。确定全部通过吗？',
      '全部通过待审核变更',
      {
        confirmButtonText: '全部通过',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true,
        customClass: ADMIN_MESSAGE_BOX_CLASS,
        modalClass: ADMIN_MODAL_OVERLAY_CLASS,
      },
    )
  } catch {
    return
  }
  processingKey.value = 'approve-all'
  try {
    const { data } = await approveAdminSpaceReview(detail.value.submissionId)
    if (!data?.success) throw new Error(data?.message || '审核通过失败')
    ElMessage.success('已通过全部待审核变更，公开内容已更新')
    await reloadDetail()
    await load()
  } catch (e) {
    handleActionError(e, '审核通过失败')
  } finally {
    processingKey.value = ''
  }
}

async function rejectAll() {
  if (!detail.value || isProcessing.value) return
  const reason = await promptReason({
    title: '驳回全部待审核变更',
    message: '全部驳回后，恋爱广场仍展示当前已发布版本。\n驳回原因会展示给空间成员，请说明需要修改的内容。\n本次操作会写入审计记录。',
    confirmButtonText: '全部驳回',
  })
  if (!reason) return
  processingKey.value = 'reject-all'
  try {
    const { data } = await rejectAdminSpaceReview(detail.value.submissionId, reason)
    if (!data?.success) throw new Error(data?.message || '驳回失败')
    ElMessage.success('已驳回全部待审核变更，当前广场仍展示旧版本')
    await reloadDetail()
    await load()
  } catch (e) {
    handleActionError(e, '驳回失败')
  } finally {
    processingKey.value = ''
  }
}

async function approveItem(item) {
  if (!detail.value || isProcessing.value) return
  try {
    await ElMessageBox.confirm(
      '通过后该项会立即替换恋爱广场对应内容，其他待审核项不受影响。确定通过此项吗？',
      '通过此项审核',
      {
        confirmButtonText: '通过此项',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true,
        customClass: ADMIN_MESSAGE_BOX_CLASS,
        modalClass: ADMIN_MODAL_OVERLAY_CLASS,
      },
    )
  } catch {
    return
  }
  processingKey.value = itemApproveKey(item)
  try {
    const { data } = await approveAdminSpaceReviewItem(detail.value.submissionId, item)
    if (!data?.success) throw new Error(data?.message || '审核通过失败')
    ElMessage.success('已通过此项审核')
    await reloadDetail()
    await load()
  } catch (e) {
    handleActionError(e, '审核通过失败')
  } finally {
    processingKey.value = ''
  }
}

async function rejectItem(item) {
  if (!detail.value || isProcessing.value) return
  const reason = await promptReason({
    title: '驳回此项',
    message: '本次操作只驳回该审核项，不会修改恋爱广场当前已发布的版本，也不会删除成员端内容。\n驳回原因会展示给空间成员，请说明需要修改的内容。\n本次操作会写入审计记录。',
    confirmButtonText: '驳回此项',
  })
  if (!reason) return
  processingKey.value = itemRejectKey(item)
  try {
    const { data } = await rejectAdminSpaceReviewItem(detail.value.submissionId, item, reason)
    if (!data?.success) throw new Error(data?.message || '驳回失败')
    ElMessage.success('已驳回此项')
    await reloadDetail()
    await load()
  } catch (e) {
    handleActionError(e, '驳回失败')
  } finally {
    processingKey.value = ''
  }
}

async function unpublishItem(item) {
  if (!detail.value || isProcessing.value) return
  const reason = await promptReason({
    title: '下架已公开内容',
    message: '该内容目前正在恋爱广场展示，下架后会立即从广场移除，成员端数据不会删除。\n请填写下架原因。\n本次操作会写入审计记录。',
    confirmButtonText: '下架已公开内容',
  })
  if (!reason) return
  processingKey.value = itemUnpublishKey(item)
  try {
    const { data } = await unpublishAdminSpaceContent({
      spaceId: detail.value.spaceId,
      ...contentPayload(item),
      reason,
    })
    if (!data?.success) throw new Error(data?.message || '下架失败')
    ElMessage.success('公开内容已下架')
    await reloadDetail()
    await load()
  } catch (e) {
    handleActionError(e, '下架失败')
  } finally {
    processingKey.value = ''
  }
}

async function unpublishSpace() {
  if (!detail.value || isProcessing.value) return
  const reason = await promptReason({
    title: '暂停空间公开',
    message: '整个空间会从恋爱广场隐藏，成员端内容不会删除。\n请填写暂停公开原因。\n本次操作会写入审计记录。',
    confirmButtonText: '暂停空间公开',
  })
  if (!reason) return
  processingKey.value = 'unpublish-space'
  try {
    const { data } = await unpublishAdminSpaceContent({ spaceId: detail.value.spaceId, reason })
    if (!data?.success) throw new Error(data?.message || '暂停公开失败')
    ElMessage.success('空间已暂停公开')
    await reloadDetail()
    await load()
  } catch (e) {
    handleActionError(e, '暂停公开失败')
  } finally {
    processingKey.value = ''
  }
}

watch(current, load)
onMounted(load)
</script>
