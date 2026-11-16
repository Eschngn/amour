import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isRestoredReviewStatus,
  resolveReviewBadgeText,
  resolveReviewCardTitle,
  resolveReviewStateText,
} from './spaceReviewDisplay.js'

test('全部恢复公开版本时展示无待审核项，不再展示已撤回', () => {
  const status = {
    pending: false,
    itemCount: 0,
    withdrawnItemCount: 2,
    lastReviewStatus: 'WITHDRAWN',
    lastReviewStatusText: '已撤回',
    restoredToPublished: true,
    visibility: 1,
  }

  assert.equal(isRestoredReviewStatus(status), true)
  assert.equal(resolveReviewBadgeText(status), '无待审核项')
  assert.equal(resolveReviewCardTitle(status), '已恢复公开版本')
  assert.equal(resolveReviewStateText(status), '已恢复为当前公开版本')
  assert.notEqual(resolveReviewBadgeText(status), status.lastReviewStatusText)
})

test('首页已恢复、仅剩余一项待审核时只展示真实待审核数量', () => {
  const status = {
    pending: true,
    itemCount: 1,
    pendingItemCount: 1,
    withdrawnItemCount: 2,
    lastReviewStatus: null,
    visibility: 1,
  }

  assert.equal(resolveReviewBadgeText(status), '1 项待审核')
  assert.equal(resolveReviewCardTitle(status), '已提交审核')
  assert.equal(resolveReviewStateText(status), '待审核')
})

test('剩余审核项通过后展示已通过，而不是部分通过', () => {
  const status = {
    pending: false,
    itemCount: 1,
    pendingItemCount: 0,
    approvedItemCount: 1,
    rejectedItemCount: 0,
    withdrawnItemCount: 2,
    lastReviewStatus: 'APPROVED',
    lastReviewStatusText: '已通过',
    visibility: 1,
  }

  assert.equal(resolveReviewBadgeText(status), '已通过')
  assert.equal(resolveReviewCardTitle(status), '已公开')
  assert.equal(resolveReviewStateText(status), '已通过')
  assert.notEqual(resolveReviewCardTitle(status), '部分通过')
})

test('真正的部分通过仍按服务端状态展示', () => {
  const status = {
    pending: false,
    itemCount: 2,
    approvedItemCount: 1,
    rejectedItemCount: 1,
    lastReviewStatus: 'PARTIALLY_APPROVED',
    lastReviewStatusText: '部分通过',
    visibility: 1,
  }

  assert.equal(resolveReviewCardTitle(status), '部分通过')
  assert.equal(resolveReviewStateText(status), '部分通过')
})

test('空状态展示公开审核占位', () => {
  assert.equal(resolveReviewBadgeText(null), '')
  assert.equal(resolveReviewCardTitle(null), '公开审核')
  assert.equal(resolveReviewStateText(null), '暂无审核记录')
})
