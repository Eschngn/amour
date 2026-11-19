import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * WXML 结构回归检查。
 *
 * 微信编译器对 `<view wx:if wx:for>` + 同级 `<view wx:else>` 会报
 * `Bad attr wx:else ... wx:if not found`；静态检查必须能提前拦住这类写法，
 * 同时不能把 `<block wx:if>` 包裹循环的正确结构误报为错误。
 */
test('WXML 结构自检拒绝 wx:for 与条件链同节点', () => {
  const result = spawnSync(process.execPath, ['scripts/check-miniprogram.mjs', '--self-test-structure'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /结构自检通过/)
})
