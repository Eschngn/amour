import { ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'

export const UNSAVED_CHANGES_TITLE = '有未保存的内容'

let pendingConfirmation = null

/**
 * 统一的“放弃未保存修改”确认。
 *
 * 同一时间只允许一个确认框存在；重复触发直接视为用户未确认，
 * 避免连续点击或父子组件同时拦截时叠加多个弹窗。
 */
export function confirmDiscardChanges(message) {
  if (pendingConfirmation) return Promise.resolve(false)
  pendingConfirmation = ElMessageBox.confirm(message, UNSAVED_CHANGES_TITLE, {
    confirmButtonText: '放弃修改',
    cancelButtonText: '继续编辑',
    type: 'warning',
    distinguishCancelAndClose: true,
  })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      pendingConfirmation = null
    })
  return pendingConfirmation
}
