import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HOME_STORY_LIMIT, loadSpaceHomeStories, normalizeHomeStory } from './spaceHomeStories.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

function success(data) {
  return { data: { success: true, data } }
}

function failure(message) {
  return { data: { success: false, message } }
}

test('没有勾选里程碑的普通故事也会出现在首页故事列表', async () => {
  const stories = await loadSpaceHomeStories({
    fetchOverview: async () => success({
      chapters: [{ id: 1, name: '初见', sortOrder: 10, nodeCount: 2 }],
    }),
    fetchChapterStories: async () => success([
      { id: 101, title: '第一次见面', summary: '那天下了雨', happenedTime: '2024-05-20 18:30:00', coverImage: '', isMilestone: false },
      { id: 102, title: '一起回家', summary: '', happenedTime: '2024-05-21 20:00:00', coverImage: 'https://cdn.example.com/a.jpg', isMilestone: false },
    ]),
  })

  assert.deepEqual(stories.map(story => story.id), [101, 102])
  assert.equal(stories[0].isMilestone, undefined)
})

test('确实没有章节或没有故事时返回空列表', async () => {
  assert.deepEqual(await loadSpaceHomeStories({
    fetchOverview: async () => success(null),
    fetchChapterStories: async () => success([]),
  }), [])

  assert.deepEqual(await loadSpaceHomeStories({
    fetchOverview: async () => success({ chapters: [] }),
    fetchChapterStories: async () => {
      throw new Error('没有章节时不应请求故事')
    },
  }), [])

  assert.deepEqual(await loadSpaceHomeStories({
    fetchOverview: async () => success({ chapters: [{ id: 1, sortOrder: 10 }] }),
    fetchChapterStories: async () => success(null),
  }), [])
})

test('章节顺序优先，章节内按发生时间升序并最多由页面展示 4 条', async () => {
  const chapterRequests = []
  const stories = await loadSpaceHomeStories({
    fetchOverview: async () => success({
      chapters: [
        { id: 2, name: '后来', sortOrder: 20 },
        { id: 1, name: '初见', sortOrder: 10 },
      ],
    }),
    fetchChapterStories: async (chapterId) => {
      chapterRequests.push(chapterId)
      if (String(chapterId) === '1') {
        return success([
          { id: 12, title: '第二篇', happenedTime: '2024-06-02 10:00:00' },
          { id: 11, title: '第一篇', happenedTime: '2024-06-01 10:00:00' },
        ])
      }
      return success([
        { id: 21, title: '第三篇', happenedTime: '2024-07-01 10:00:00' },
      ])
    },
  })

  assert.equal(HOME_STORY_LIMIT, 4)
  assert.deepEqual(stories.map(story => story.id), [11, 12, 21])
  assert.deepEqual(chapterRequests.slice().sort(), [1, 2])
})

test('同一发生时间按故事 ID 升序，缺失时间的故事排在最后', async () => {
  const stories = await loadSpaceHomeStories({
    fetchOverview: async () => success({ chapters: [{ id: 1, sortOrder: 10 }] }),
    fetchChapterStories: async () => success([
      { id: 3, title: '无时间' },
      { id: 2, title: '同时间 B', happenedTime: '2024-05-20 10:00:00' },
      { id: 1, title: '同时间 A', happenedTime: '2024-05-20 10:00:00' },
    ]),
  })

  assert.deepEqual(stories.map(story => story.id), [1, 2, 3])
})

test('概览或任一章节接口失败时向上抛错，不会被当成空故事', async () => {
  await assert.rejects(
    () => loadSpaceHomeStories({
      fetchOverview: async () => failure('故事加载失败'),
      fetchChapterStories: async () => success([]),
    }),
    /故事加载失败/,
  )

  await assert.rejects(
    () => loadSpaceHomeStories({
      fetchOverview: async () => success({ chapters: [{ id: 1, sortOrder: 10 }] }),
      fetchChapterStories: async () => failure('章节故事加载失败'),
    }),
    /章节故事加载失败/,
  )

  await assert.rejects(
    () => loadSpaceHomeStories({
      fetchOverview: async () => {
        throw new Error('Network Error')
      },
      fetchChapterStories: async () => success([]),
    }),
    /Network Error/,
  )
})

test('首页只透出模板需要的故事字段', () => {
  assert.deepEqual(normalizeHomeStory({
    id: 9,
    title: '标题',
    summary: '摘要',
    happenedTime: '2024-05-20 18:30:00',
    coverImage: 'https://cdn.example.com/a.jpg',
    content: '很长的正文',
    reviewStatus: 'PENDING',
  }), {
    id: 9,
    title: '标题',
    summary: '摘要',
    happenedTime: '2024-05-20 18:30:00',
    coverImage: 'https://cdn.example.com/a.jpg',
  })
})

test('首页改为组合故事概览与章节故事接口，不再只读里程碑', () => {
  const source = readSource('pages/frontend/MyCoupleSpaceHome.vue')

  assert.doesNotMatch(source, /\/story\/milestones/)
  assert.match(source, /\/story\/overview/)
  assert.match(source, /\/story\/getStoryByChapterId/)
  assert.match(source, /loadSpaceHomeStories\(/)
  assert.match(source, /HOME_STORY_LIMIT/)
  assert.match(source, /homeStories\.slice\(0, HOME_STORY_LIMIT\)/)
  assert.match(source, /'\/story\/' \+ item\.id/)

  // 加载中、加载失败、真正无故事必须是三种独立状态。
  assert.match(source, /v-if="storyLoading"/)
  assert.match(source, /v-else-if="storyError"/)
  assert.match(source, /v-else-if="homeStories\.length === 0"/)
  assert.match(source, /故事正等待被写下/)

  // 只有 isSpaceReady 之后才请求私密故事数据。
  assert.match(source, /if \(!isSpaceReady\.value\) \{[\s\S]*?storyLoading\.value = false[\s\S]*?return/)
})
