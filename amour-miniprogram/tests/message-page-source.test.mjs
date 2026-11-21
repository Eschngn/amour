import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('留言页展示用户头像且不再渲染右侧序号', () => {
  const wxml = readFileSync('miniprogram/pages/message/message.wxml', 'utf8')
  const source = readFileSync('miniprogram/pages/message/message.ts', 'utf8')
  const less = readFileSync('miniprogram/pages/message/message.less', 'utf8')

  assert.match(wxml, /src="\{\{item\.userAvatar\}\}"/)
  assert.match(wxml, /src="\{\{reply\.fromUserAvatar\}\}"/)
  assert.doesNotMatch(wxml, /message-index|#\{\{item\.number\}\}/)
  assert.doesNotMatch(source, /number:\s*String\(/)
  assert.doesNotMatch(less, /\.message-index/)
})

test('留言页支持回复主留言和已有回复，并沿用登录失效重试', () => {
  const wxml = readFileSync('miniprogram/pages/message/message.wxml', 'utf8')
  const source = readFileSync('miniprogram/pages/message/message.ts', 'utf8')

  assert.match(wxml, /data-reply-id="\{\{reply\.replyId\}\}"/)
  assert.match(wxml, /bindtap="toggleReply"/)
  assert.match(wxml, /wx:if="\{\{activeReplyMessageId === item\.messageId\}\}"/)
  assert.match(wxml, /bindtap="submitReply"/)
  assert.match(wxml, /回复 \{\{activeReplyTargetName\}\}/)

  assert.match(source, /post<void>\('\/message\/reply', payload\)/)
  assert.match(source, /if \(replyId\) payload\.replyId = replyId/)
  assert.match(source, /ensureWechatLogin\(\{ force: true \}\)/)
  assert.match(source, /title: '回复已发送'/)
  assert.match(source, /this\.loadMessages\(this\.data\.currentPage\)/)
})
