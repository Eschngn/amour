import { computed, ref } from 'vue'
import {
  hasOrderChanged,
  moveItem,
  moveItemDown,
  moveItemToEnd,
  moveItemToTop,
  moveItemUp,
  normalizeSortItems,
  sortItemIds,
} from '@/utils/reorderList'

/**
 * 列表排序模式状态。
 *
 * - start 保存进入排序模式时的原始快照；
 * - 拖拽与按钮操作只修改本地 items；
 * - 保存失败时恢复原始快照并保留排序模式；
 * - dirty 用于接入现有未保存修改确认。
 */
export function useSortMode({ onSave } = {}) {
  const active = ref(false)
  const saving = ref(false)
  const items = ref([])
  const baselineIds = ref([])
  const snapshot = ref([])
  const dragIndex = ref(-1)
  const overIndex = ref(-1)

  const dirty = computed(() => (
    active.value && hasOrderChanged(baselineIds.value, sortItemIds(items.value))
  ))

  function clearState() {
    active.value = false
    items.value = []
    baselineIds.value = []
    snapshot.value = []
    dragIndex.value = -1
    overIndex.value = -1
  }

  function start(sourceItems) {
    if (saving.value) return
    const list = Array.isArray(sourceItems) ? sourceItems.slice() : []
    items.value = list
    snapshot.value = list.slice()
    baselineIds.value = sortItemIds(list)
    dragIndex.value = -1
    overIndex.value = -1
    active.value = true
  }

  function cancel() {
    if (saving.value) return
    clearState()
  }

  function moveUp(index) {
    if (!active.value || saving.value) return
    items.value = moveItemUp(items.value, index)
  }

  function moveDown(index) {
    if (!active.value || saving.value) return
    items.value = moveItemDown(items.value, index)
  }

  function moveToTop(index) {
    if (!active.value || saving.value) return
    items.value = moveItemToTop(items.value, index)
  }

  function moveToEnd(index) {
    if (!active.value || saving.value) return
    items.value = moveItemToEnd(items.value, index)
  }

  function startDrag(index, event) {
    if (!active.value || saving.value) return
    dragIndex.value = index
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  function dragOver(index) {
    if (!active.value || saving.value) return
    overIndex.value = index
  }

  function dropAt(index) {
    if (!active.value || saving.value) return
    const fromIndex = dragIndex.value
    dragIndex.value = -1
    overIndex.value = -1
    if (fromIndex < 0 || fromIndex === index) return
    items.value = moveItem(items.value, fromIndex, index)
  }

  function endDrag() {
    dragIndex.value = -1
    overIndex.value = -1
  }

  async function save() {
    if (!active.value || saving.value || typeof onSave !== 'function') return
    saving.value = true
    try {
      await onSave(normalizeSortItems(items.value))
      clearState()
    } catch (error) {
      items.value = snapshot.value.slice()
      dragIndex.value = -1
      overIndex.value = -1
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    active,
    saving,
    items,
    baselineIds,
    dragIndex,
    overIndex,
    dirty,
    start,
    cancel,
    save,
    moveUp,
    moveDown,
    moveToTop,
    moveToEnd,
    startDrag,
    dragOver,
    dropAt,
    endDrag,
  }
}
