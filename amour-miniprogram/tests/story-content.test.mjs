import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 故事正文解析测试（公开故事详情与私有故事详情共用）。
 *
 * 私有故事详情此前内联了一份解析逻辑，公开详情必须与其保持完全一致，
 * 这里把它抽成 utils/story-content 后直接做边界覆盖。
 */

const {
  parseStoryContent,
  countStoryWords,
  formatStoryReadTime,
  formatStoryDate,
  formatStoryStartYear,
  collectContentImages,
} = await import('../miniprogram/utils/story-content.ts')

test('段落、标题、引用、列表、代码与图片解析为稳定的块序列', () => {
  const content = [
    '# 一级标题',
    '## 二级标题',
    '### 三级标题',
    '',
    '第一段',
    '仍然属于第一段',
    '',
    '> 引用第一行',
    '> 引用第二行',
    '',
    '- 列表一',
    '- 列表二',
    '',
    '```ts',
    'const value = 1',
    '```',
    '',
    '---',
    '',
    '![合影](https://cdn.example.com/a.jpg)',
  ].join('\n')

  const blocks = parseStoryContent(content)
  assert.deepEqual(blocks.map(block => block.type), [
    'heading', 'heading', 'heading',
    'paragraph', 'quote', 'list', 'list', 'code', 'divider', 'image',
  ])
  assert.equal(blocks[0].level, 1)
  assert.equal(blocks[2].level, 3)
  assert.equal(blocks[3].text, '第一段 仍然属于第一段')
  assert.equal(blocks[4].text, '引用第一行\n引用第二行')
  assert.equal(blocks[7].language, 'TS')
  assert.equal(blocks[7].text, 'const value = 1')
  assert.equal(blocks[9].url, 'https://cdn.example.com/a.jpg')
  assert.equal(blocks[9].alt, '合影')
  // 每块都有稳定且唯一的 key，供 wx:key 使用
  assert.deepEqual(new Set(blocks.map(block => block.key)).size, blocks.length)
})

test('空正文 / 空白正文返回空块列表，不编造内容', () => {
  assert.deepEqual(parseStoryContent(''), [])
  assert.deepEqual(parseStoryContent('   \n\n  '), [])
  assert.deepEqual(parseStoryContent(null), [])
  assert.deepEqual(parseStoryContent(undefined), [])
})

test('行内 Markdown 标记被去除，正文不出现裸标记', () => {
  const blocks = parseStoryContent('**加粗** 与 __下划线__ 还有 `代码` 和 [链接](https://x.com)')
  assert.equal(blocks[0].type, 'paragraph')
  assert.equal(blocks[0].text, '加粗 与 下划线 还有 代码 和 链接')
})

test('未闭合代码块也保留内容，不会丢正文', () => {
  const blocks = parseStoryContent('```js\nconst a = 1')
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'code')
  assert.equal(blocks[0].text, 'const a = 1')
})

test('字数与阅读时长口径：去空白计数，每分钟 400 字', () => {
  assert.equal(countStoryWords('一二三'), 3)
  assert.equal(countStoryWords('一 二\n三\t四'), 4)
  assert.equal(countStoryWords(''), 0)
  assert.equal(formatStoryReadTime(0), '小于 1 分钟')
  assert.equal(formatStoryReadTime(1), '约 1 分钟')
  assert.equal(formatStoryReadTime(400), '约 1 分钟')
  assert.equal(formatStoryReadTime(401), '约 2 分钟')
  assert.equal(formatStoryReadTime(Number.NaN), '小于 1 分钟')
})

test('日期展示为 yyyy.MM.dd，缺失时为空字符串', () => {
  assert.equal(formatStoryDate('2024-05-20 19:30:00'), '2024.05.20')
  assert.equal(formatStoryDate('2024-05-20'), '2024.05.20')
  assert.equal(formatStoryDate(''), '')
  assert.equal(formatStoryDate(null), '')
})

test('故事开始年份只使用真实日期，缺失或非法值显示占位符', () => {
  assert.equal(formatStoryStartYear('2024-05-20 19:30:00'), "'24")
  assert.equal(formatStoryStartYear('2023-12-31T23:59:59'), "'23")
  assert.equal(formatStoryStartYear(''), '--')
  assert.equal(formatStoryStartYear(null), '--')
  assert.equal(formatStoryStartYear(undefined), '--')
  assert.equal(formatStoryStartYear('2024-13-01'), '--')
  assert.equal(formatStoryStartYear("'24"), '--')
})

test('正文图片只收集 http(s) 绝对地址', () => {
  const blocks = parseStoryContent([
    '![一](https://cdn.example.com/a.jpg)',
    '![二](http://cdn.example.com/b.jpg)',
  ].join('\n\n'))
  assert.deepEqual(collectContentImages(blocks), [
    'https://cdn.example.com/a.jpg',
    'http://cdn.example.com/b.jpg',
  ])
  assert.deepEqual(collectContentImages([]), [])
  assert.deepEqual(collectContentImages(null), [])
})
