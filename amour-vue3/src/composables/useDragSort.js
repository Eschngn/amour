import { computed, onUnmounted, ref } from 'vue'
import { hasOrderChanged, moveItem, sortItemIds } from '@/utils/reorderList'

/**
 * 列表直接拖拽排序。
 *
 * - 指针移动超过阈值后才进入拖拽，普通点击不受影响；
 * - 拖拽过程中实时移动本地条目，形成目标占位；
 * - 松手后立即调用 onDrop，无需额外保存按钮；
 * - 保存期间锁定列表，避免连续请求互相覆盖；
 * - onDrop 失败时恢复拖拽前顺序。
 */
export function useDragSort({
  items,
  onDrop,
  onError,
  enabled,
  threshold = 6,
} = {}) {
  const listRef = ref(null)
  const saving = ref(false)
  const savingId = ref(null)
  const active = ref(false)
  const dragging = ref(false)
  const dragIndex = ref(-1)
  const overIndex = ref(-1)

  const busy = computed(() => saving.value || active.value)

  let pointerId = null
  let startX = 0
  let startY = 0
  let pointerX = 0
  let pointerY = 0
  let snapshot = []
  let baselineIds = []
  let ghostEl = null
  let ghostOffsetX = 0
  let ghostOffsetY = 0
  let ghostOriginRect = null

  function canStart() {
    if (saving.value || active.value) return false
    if (typeof enabled === 'function' && !enabled()) return false
    return Array.isArray(items?.value) && items.value.length > 1
  }

  function prefersReducedMotion() {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function findItemElement(index) {
    return listRef.value?.querySelector(`[data-sort-index="${index}"]`) || null
  }

  /** 拖拽预览：复制原记录尺寸和内容，跟随指针移动，避免拖动时变形。 */
  function createGhost(index, clientX, clientY) {
    if (ghostEl || prefersReducedMotion()) return
    const element = findItemElement(index)
    if (!element) return
    const rect = element.getBoundingClientRect()
    const clone = element.cloneNode(true)
    clone.removeAttribute('id')
    clone.removeAttribute('data-sort-index')
    clone.removeAttribute('data-sort-id')
    clone.setAttribute('aria-hidden', 'true')
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
    clone.querySelectorAll('button, a, input, textarea, select, [tabindex]')
      .forEach(node => node.setAttribute('tabindex', '-1'))
    clone.classList.add('studio-sort-ghost')
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
    clone.style.borderRadius = getComputedStyle(element).borderRadius
    clone.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1.015)`
    document.body.appendChild(clone)
    ghostEl = clone
    ghostOriginRect = rect
    ghostOffsetX = clientX - rect.left
    ghostOffsetY = clientY - rect.top
  }

  function moveGhost(clientX, clientY) {
    if (!ghostEl) return
    const x = clientX - ghostOffsetX
    const y = clientY - ghostOffsetY
    ghostEl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.015)`
  }

  /** 释放时让预览平滑落入当前占位位置，再移除节点。 */
  function landGhost() {
    if (!ghostEl) return
    const ghost = ghostEl
    const targetRect = findItemElement(dragIndex.value)?.getBoundingClientRect()
    ghostEl = null
    if (!targetRect || prefersReducedMotion() || typeof ghost.animate !== 'function') {
      ghost.remove()
      return
    }
    const animation = ghost.animate([
      { transform: ghost.style.transform, opacity: 1 },
      {
        transform: `translate3d(${targetRect.left}px, ${targetRect.top}px, 0) scale(1)`,
        opacity: 0,
      },
    ], {
      duration: 160,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
      fill: 'forwards',
    })
    animation.onfinish = () => ghost.remove()
    animation.oncancel = () => ghost.remove()
  }

  /** 取消或切换筛选时回到拖拽起点并移除预览。 */
  function cancelGhost() {
    if (!ghostEl) return
    const ghost = ghostEl
    ghostEl = null
    if (!ghostOriginRect || prefersReducedMotion() || typeof ghost.animate !== 'function') {
      ghost.remove()
      return
    }
    const animation = ghost.animate([
      { transform: ghost.style.transform, opacity: 1 },
      {
        transform: `translate3d(${ghostOriginRect.left}px, ${ghostOriginRect.top}px, 0) scale(1)`,
        opacity: 0,
      },
    ], {
      duration: 140,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
      fill: 'forwards',
    })
    animation.onfinish = () => ghost.remove()
    animation.oncancel = () => ghost.remove()
  }

  function removeGhost() {
    if (!ghostEl) return
    ghostEl.remove()
    ghostEl = null
  }

  function cleanupListeners() {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerCancel)
    document.body.classList.remove('space-sort-dragging')
    ghostOriginRect = null
  }

  function resetDragState() {
    active.value = false
    dragging.value = false
    dragIndex.value = -1
    overIndex.value = -1
    pointerId = null
    snapshot = []
    baselineIds = []
    cleanupListeners()
  }

  function startDrag(index, event) {
    if (!canStart()) return
    if (event?.pointerType === 'mouse' && event.button !== 0) return
    active.value = true
    pointerId = event?.pointerId ?? null
    startX = event?.clientX ?? 0
    startY = event?.clientY ?? 0
    pointerX = startX
    pointerY = startY
    dragIndex.value = index
    overIndex.value = index
    dragging.value = false
    snapshot = items.value.slice()
    baselineIds = sortItemIds(items.value)
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    event?.preventDefault?.()
  }

  /** 鼠标可从记录空白区域开始拖拽；按钮、链接、表单控件始终保留原点击行为。 */
  function onRowPointerDown(index, event) {
    if (event?.pointerType !== 'mouse') return
    const target = event?.target
    if (target instanceof Element
      && target.closest('button, a, input, textarea, select, label, [data-drag-handle], [data-no-drag]')) {
      return
    }
    startDrag(index, event)
  }

  function findTargetIndex(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY)
    const item = element?.closest?.('[data-sort-index]')
    if (!item || !listRef.value?.contains(item)) return null
    const index = Number(item.dataset.sortIndex)
    return Number.isInteger(index) ? index : null
  }

  function handlePointerMove(event) {
    if (!active.value) return
    if (pointerId != null && event.pointerId !== pointerId) return
    const distance = Math.hypot(event.clientX - startX, event.clientY - startY)
    if (!dragging.value) {
      if (distance < threshold) return
      dragging.value = true
      document.body.classList.add('space-sort-dragging')
      createGhost(dragIndex.value, event.clientX, event.clientY)
    }
    event.preventDefault()
    pointerX = event.clientX
    pointerY = event.clientY
    moveGhost(pointerX, pointerY)
    const targetIndex = findTargetIndex(pointerX, pointerY)
    if (targetIndex == null || targetIndex === dragIndex.value) return
    items.value = moveItem(items.value, dragIndex.value, targetIndex)
    dragIndex.value = targetIndex
    overIndex.value = targetIndex
  }

  async function handlePointerUp() {
    if (!active.value) return
    const wasDragging = dragging.value
    const before = snapshot
    const movedId = items.value[dragIndex.value]?.id
    const changed = wasDragging && hasOrderChanged(baselineIds, sortItemIds(items.value))
    if (wasDragging) landGhost()
    resetDragState()
    if (!changed) return
    await commit(before, movedId)
  }

  function handlePointerCancel() {
    if (!active.value) return
    cancelGhost()
    if (dragging.value && snapshot.length) {
      items.value = snapshot.slice()
    }
    resetDragState()
  }

  async function commit(before, movedId = null) {
    if (saving.value || typeof onDrop !== 'function') return
    saving.value = true
    savingId.value = movedId
    try {
      await onDrop(items.value.slice())
    } catch (error) {
      // 失败时恢复拖拽前数组，TransitionGroup 会平滑回到原顺序。
      items.value = before.slice()
      onError?.(error)
    } finally {
      saving.value = false
      savingId.value = null
    }
  }

  /** 键盘排序：上移/下移同样立即保存。 */
  async function moveByOffset(index, offset) {
    if (saving.value || active.value || !Array.isArray(items?.value)) return
    const target = index + offset
    if (target < 0 || target >= items.value.length) return
    const movedId = items.value[index]?.id
    const before = items.value.slice()
    items.value = moveItem(items.value, index, target)
    await commit(before, movedId)
  }

  /** 列表重新加载或切换筛选前调用，丢弃尚未完成的拖拽状态。 */
  function cancelDrag() {
    if (!active.value) return
    // 切换筛选/刷新时立即移除预览，不把上一列表的拖拽状态带到新列表。
    removeGhost()
    if (dragging.value && snapshot.length) {
      items.value = snapshot.slice()
    }
    resetDragState()
  }

  onUnmounted(() => {
    removeGhost()
    cleanupListeners()
  })

  return {
    listRef,
    saving,
    savingId,
    active,
    dragging,
    dragIndex,
    overIndex,
    busy,
    startDrag,
    onRowPointerDown,
    moveByOffset,
    cancelDrag,
  }
}
