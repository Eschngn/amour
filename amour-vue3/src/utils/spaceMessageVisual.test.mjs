import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const messageEditor = () => readFileSync(
  resolve(ROOT, 'components/frontend/space-studio/SpaceMessageEditor.vue'),
  'utf8',
)

test('留言人名字、正文与回复按钮使用不同视觉层级', () => {
  const source = messageEditor()

  // 名字使用玫瑰色与更高字重。
  assert.match(source, /text-sm font-bold text-rose-800[^>]*>\{\{ message\.userName \|\| '匿名' \}\}/)
  // 正文使用主要正文色，和名字、操作按钮区分开。
  assert.match(source, /whitespace-pre-wrap break-words text-sm leading-7 text-stone-800/)
  // 时间信息保持弱化显示。
  assert.match(source, /text-\[11px\] font-normal text-stone-400/)
  // 回复按钮使用玫瑰色描边按钮，而不是普通黑色文字按钮。
  assert.match(source, /border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50/)
  assert.match(source, /focus-visible:ring-2 focus-visible:ring-rose-300/)
  assert.match(source, /disabled:cursor-not-allowed disabled:opacity-55/)
  assert.doesNotMatch(source, /class="btn-ghost !px-2 !py-1 !text-\[11px\]"[^>]*>\s*回复这条留言/)
})

test('留言展示头像、回复状态与无障碍属性', () => {
  const source = messageEditor()

  assert.match(source, /message\.userAvatar/)
  assert.match(source, /initials\(message\.userName\)/)
  assert.match(source, /aria-expanded/)
  assert.match(source, /aria-controls/)
  assert.match(source, /:aria-controls="`studio-reply-form-\$\{message\.messageId\}`"/)
  assert.match(source, /toggleReply\(message\)/)
  assert.match(source, /取消回复/)
  assert.match(source, /whitespace-nowrap/)

  // 回复列表同样使用玫瑰色名字与正文色内容。
  assert.match(source, /font-semibold text-rose-700/)
  assert.match(source, /text-stone-700">\{\{ reply\.content \}\}/)
})

test('留言加载、错误、空状态与回复表单继续保留', () => {
  const source = messageEditor()
  assert.match(source, /aria-label="正在加载留言"/)
  assert.match(source, /role="alert"/)
  assert.match(source, /还没有留言/)
  assert.match(source, /回复中…/)
  assert.match(source, /发送回复/)
  assert.match(source, /删除中…/)
})

test('留言模块恢复为不含直接拖拽排序的交互', () => {
  const source = messageEditor()
  assert.doesNotMatch(source, /useDragSort|SortHandleButton|TransitionGroup|studio-sort-list|saveMessageOrder|fetchMessageSortList/)
  assert.doesNotMatch(source, /messageSort|messageDrag|sortBuffer/)
})

test('故事、相册和纪念日共用半透明预览与平滑占位样式', () => {
  const source = readFileSync(resolve(ROOT, 'assets/main.css'), 'utf8')
  assert.match(source, /\.studio-sortable-item/)
  assert.match(source, /\.studio-sort-list-move/)
  assert.match(source, /\.studio-sort-placeholder/)
  assert.match(source, /\.studio-sort-ghost/)
  assert.match(source, /opacity: 0\.66/)
  assert.match(source, /outline: 2px dashed #fda4af/)
  assert.match(source, /transition: transform var\(--studio-sort-duration\)/)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/)
})
