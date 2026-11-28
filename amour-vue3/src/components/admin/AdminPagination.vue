<template>
  <div class="admin-pagination border-t border-slate-100 px-5 py-3 sm:px-6">
    <span class="admin-pagination__summary">共 {{ total }} 条</span>
    <el-pagination
      class="admin-pagination__control"
      background
      size="small"
      :current-page="current"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :total="total"
      :disabled="disabled"
      layout="sizes, prev, pager, next, jumper"
      @update:current-page="handleCurrentChange"
      @update:page-size="handleSizeChange"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  total: { type: Number, default: 0 },
  current: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  pageSizes: { type: Array, default: () => [10, 20, 50, 100] },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:current', 'update:pageSize'])

// 切换每页条数时 el-pagination 会按新页数再触发一次页码变更，
// 这里忽略那次回调，统一由本组件把页码重置到第 1 页。
let changingPageSize = false

function pageCount() {
  return Math.max(1, Math.ceil(props.total / (props.pageSize || 10)))
}

function handleCurrentChange(page) {
  if (changingPageSize) return
  const target = Math.min(Math.max(1, Number(page) || 1), pageCount())
  if (target !== props.current) emit('update:current', target)
}

function handleSizeChange(size) {
  const next = Number(size)
  if (!next || next === props.pageSize) return
  changingPageSize = true
  emit('update:pageSize', next)
  if (props.current !== 1) emit('update:current', 1)
  queueMicrotask(() => { changingPageSize = false })
}
</script>

<style scoped>
.admin-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.admin-pagination__summary {
  font-size: 12px;
  color: #94a3b8;
}

.admin-pagination__control {
  flex-wrap: wrap;
  justify-content: flex-end;
  row-gap: 8px;
  --el-pagination-font-size: 12px;
  --el-pagination-button-width: 28px;
  --el-pagination-button-height: 28px;
}

.admin-pagination__control :deep(.el-select) {
  width: 108px;
}

.admin-pagination__control :deep(.el-pagination__jump) {
  color: #64748b;
}
</style>
