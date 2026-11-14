<template>
  <section
    v-if="status"
    class="rounded-xl border px-4 py-3 text-xs leading-6"
    :class="cardClass"
    role="status"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <p class="flex flex-wrap items-center gap-2 font-semibold">
          <span class="h-1.5 w-1.5 rounded-full" :class="dotClass" aria-hidden="true" />
          {{ title }}
          <span
            v-if="status.pending"
            class="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold"
          >
            {{ status.pendingItemCount || 0 }} 项待审核
          </span>
          <span
            v-else-if="status.lastReviewStatus"
            class="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold"
          >
            {{ status.lastReviewStatusText }}
          </span>
        </p>
        <p v-if="status.message" class="mt-1 break-words">{{ status.message }}</p>

        <p class="mt-1 text-[11px] opacity-80">
          空间当前公开状态：{{ status.visibilityText || (status.visibility === 1 ? '公开中' : '私密') }}
          <span aria-hidden="true">·</span>
          审核状态：{{ reviewStateText }}
        </p>

        <p v-if="hasStats" class="mt-1 text-[11px] opacity-80">
          本次提交 {{ status.itemCount }} 项
          <span aria-hidden="true">·</span>
          待审核 {{ status.pendingItemCount || 0 }}
          <span aria-hidden="true">·</span>
          已通过 {{ status.approvedItemCount || 0 }}
          <span aria-hidden="true">·</span>
          已驳回 {{ status.rejectedItemCount || 0 }}
        </p>

        <p v-if="status.rejectReason" class="mt-1 break-words font-medium">
          最新驳回原因：{{ status.rejectReason }}
        </p>

        <details v-if="(status.rejectedItems?.length || 0) > 1" class="mt-1.5">
          <summary class="cursor-pointer select-none text-[11px] font-semibold underline underline-offset-2">
            查看 {{ status.rejectedItems.length }} 项驳回原因
          </summary>
          <ul class="mt-1.5 space-y-1.5">
            <li v-for="item in status.rejectedItems" :key="`${item.itemType}-${item.itemId}`" class="rounded-lg bg-white/60 px-2.5 py-1.5">
              <p class="font-semibold">{{ item.title || item.itemTypeText }}</p>
              <p class="break-words">{{ item.rejectReason || '未填写原因' }}</p>
              <p v-if="item.handledAt" class="text-[10px] opacity-70">处理时间：{{ formatTime(item.handledAt) }}</p>
            </li>
          </ul>
        </details>

        <p v-if="status.lastSubmittedAt || status.lastHandledAt" class="mt-1 text-[11px] opacity-70">
          <span v-if="status.lastSubmittedAt">提交时间：{{ formatTime(status.lastSubmittedAt) }}</span>
          <span v-if="status.lastHandledAt" class="ml-3">处理时间：{{ formatTime(status.lastHandledAt) }}</span>
        </p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <button
          v-if="status.canResubmit"
          type="button"
          class="rounded-lg border border-current bg-white/70 px-2.5 py-1 text-[11px] font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="resubmitting || loading"
          :aria-busy="resubmitting ? 'true' : 'false'"
          @click="resubmit"
        >
          {{ resubmitting ? '提交中…' : '重新提交公开审核' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-current px-2.5 py-1 text-[11px] font-semibold opacity-80 transition hover:bg-white/60 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading || resubmitting"
          @click="load"
        >
          {{ loading ? '刷新中…' : '刷新' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import { fetchSpaceReviewStatus, resubmitSpaceReview } from '@/api/spaceReview'
import { formatSpaceDateTime } from '@/utils/spaceFormat'

const props = defineProps({
  /** 空间状态变化后由父组件触发刷新。 */
  refreshKey: { type: [String, Number], default: '' },
})

const emit = defineEmits(['submitted'])

const status = ref(null)
const loading = ref(false)
const resubmitting = ref(false)

const hasStats = computed(() => Number(status.value?.itemCount) > 0)

const reviewStateText = computed(() => {
  if (!status.value) return '暂无审核记录'
  if (status.value.pending) return '待审核'
  return status.value.lastReviewStatusText || '暂无审核记录'
})

const cardClass = computed(() => {
  if (!status.value) return 'border-stone-200 bg-stone-50 text-stone-600'
  if (status.value.pending) return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status.value.lastReviewStatus === 'REJECTED') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (status.value.lastReviewStatus === 'PARTIALLY_APPROVED') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (status.value.unpublished) return 'border-rose-200 bg-rose-50 text-rose-700'
  if (status.value.visibility === 1) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-stone-200 bg-stone-50 text-stone-600'
})

const dotClass = computed(() => {
  if (!status.value) return 'bg-stone-400'
  if (status.value.pending) return 'bg-amber-500'
  if (status.value.lastReviewStatus === 'REJECTED') return 'bg-rose-500'
  if (status.value.lastReviewStatus === 'PARTIALLY_APPROVED') return 'bg-sky-500'
  if (status.value.unpublished) return 'bg-rose-500'
  if (status.value.visibility === 1) return 'bg-emerald-500'
  return 'bg-stone-400'
})

const title = computed(() => {
  if (!status.value) return '公开审核'
  if (status.value.pending) return '已提交审核'
  if (status.value.unpublished) return '已下架'
  if (status.value.lastReviewStatus === 'REJECTED') return '审核未通过'
  if (status.value.lastReviewStatus === 'PARTIALLY_APPROVED') return '部分通过'
  if (status.value.visibility === 1) return '已公开'
  return '尚未公开'
})

function formatTime(value) {
  return value ? formatSpaceDateTime(value) : '-'
}

async function load() {
  if (loading.value) return
  loading.value = true
  try {
    const { data } = await fetchSpaceReviewStatus()
    if (data?.success) status.value = data.data
  } catch {
    // 状态卡片失败不阻塞编辑；上方页面已有统一错误提示。
  } finally {
    loading.value = false
  }
}

async function resubmit() {
  if (resubmitting.value || loading.value) return
  resubmitting.value = true
  try {
    const { data } = await resubmitSpaceReview()
    if (!data?.success) throw new Error(data?.message || '重新提交失败')
    if (data.data) status.value = data.data
    ElMessage.success('已重新提交公开审核')
    emit('submitted', status.value)
    await load()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '重新提交失败，请稍后重试')
  } finally {
    resubmitting.value = false
  }
}

onMounted(load)

watch(() => props.refreshKey, () => load())

defineExpose({ load, status })
</script>
