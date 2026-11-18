import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adaptSpaceCard,
  adaptSpaceCards,
  adaptSpaceDetail,
  formatDate,
  formatTogetherDays,
  getTogetherDays,
  initialOf,
  normalizeImageUrl,
  normalizeSpaceId,
  toOptionalCount,
} from '../miniprogram/utils/plaza-adapter.ts'

const NOW = new Date(2026, 4, 26, 12, 0, 0).getTime() // 2026-05-26

/** 与后端 seed 中 SPACE-DEMO-001 的结构一致。 */
function seedCard(overrides = {}) {
  return Object.assign({
    spaceId: 2001,
    spaceName: '橙子与子怡的四季',
    description: '记录我们认真生活的每一天。',
    coverImage: 'https://cdn.example.com/space/cover.jpg',
    loveStartTime: '2024-05-20 19:30:00',
    memberCount: 2,
    members: [
      { displayName: '橙留香', avatar: 'https://cdn.example.com/a1.jpg', memberRole: 1 },
      { displayName: '子怡', avatar: 'https://cdn.example.com/a2.jpg', memberRole: 2 },
    ],
    publicStoryCount: 2,
    publicPhotoCount: 2,
    publicAnniversaryCount: 2,
    latestStory: { storyId: 8002, title: '第一次一起看电影' },
    latestPhotos: [{ photoId: 11002, title: '夏日散步', url: 'https://cdn.example.com/p1.jpg' }],
    latestAnniversaries: [{ anniversaryId: 12001, title: '在一起的第一天' }],
  }, overrides)
}

test('卡片适配保留真实字段并生成展示模型', () => {
  const card = adaptSpaceCard(seedCard(), NOW)
  assert.ok(card)
  assert.equal(card.spaceId, '2001')
  assert.equal(card.spaceName, '橙子与子怡的四季')
  assert.equal(card.description, '记录我们认真生活的每一天。')
  assert.equal(card.coverUrl, 'https://cdn.example.com/space/cover.jpg')
  assert.equal(card.memberSummary, '橙留香 · 子怡')
  assert.deepEqual(card.members.map(item => item.initial), ['橙', '子'])
  assert.equal(card.togetherDays, '相伴 736 天')
  assert.equal(card.startDateText, '始于 2024.05.20')
  assert.deepEqual(card.stats, [
    { key: 'story', label: '公开故事', value: '2' },
    { key: 'photo', label: '公开照片', value: '2' },
    { key: 'anniversary', label: '公开纪念日', value: '2' },
  ])
  assert.equal(card.recentText, '最近更新 · 第一次一起看电影')
  assert.match(card.ariaLabel, /橙子与子怡的四季/)
})

test('缺失字段不编造：无封面、无简介、无开始时间、无统计', () => {
  const card = adaptSpaceCard({
    spaceId: 7,
    spaceName: '',
    description: '   ',
    coverImage: '',
    loveStartTime: null,
    members: [],
  }, NOW)
  assert.ok(card)
  assert.equal(card.spaceName, '未命名的空间')
  assert.equal(card.description, '')
  assert.equal(card.coverUrl, '')
  assert.equal(card.togetherDays, '')
  assert.equal(card.startDateText, '')
  assert.deepEqual(card.stats, [])
  assert.deepEqual(card.members, [])
  assert.equal(card.memberSummary, '')
  assert.equal(card.recentText, '')
})

test('统计字段缺失时整项省略，不显示 0', () => {
  const card = adaptSpaceCard(seedCard({
    publicStoryCount: null,
    publicPhotoCount: '3',
    publicAnniversaryCount: undefined,
  }), NOW)
  assert.deepEqual(card.stats, [{ key: 'photo', label: '公开照片', value: '3' }])
})

test('只有一方有头像 / 昵称时分别处理，不影响另一方', () => {
  const card = adaptSpaceCard(seedCard({
    members: [
      { displayName: '橙留香', avatar: '' },
      { displayName: '', avatar: 'https://cdn.example.com/a2.jpg' },
    ],
  }), NOW)
  assert.equal(card.members.length, 2)
  assert.equal(card.members[0].avatarUrl, '')
  assert.equal(card.members[0].initial, '橙')
  assert.equal(card.members[1].avatarUrl, 'https://cdn.example.com/a2.jpg')
  assert.equal(card.members[1].name, '')
  assert.equal(card.members[1].initial, '')
  // 没有昵称的一方不污染成员摘要
  assert.equal(card.memberSummary, '橙留香')
})

test('完全没有展示信息的成员槽位被丢弃', () => {
  const card = adaptSpaceCard(seedCard({
    members: [{ displayName: '', avatar: '' }, { displayName: '子怡' }],
  }), NOW)
  assert.equal(card.members.length, 1)
  assert.equal(card.members[0].name, '子怡')
})

test('无法导航的空间标识直接丢弃', () => {
  assert.equal(adaptSpaceCard(seedCard({ spaceId: null })), null)
  assert.equal(adaptSpaceCard(seedCard({ spaceId: 'abc' })), null)
  assert.equal(adaptSpaceCard(seedCard({ spaceId: 0 })), null)
  assert.equal(adaptSpaceCard(null), null)
})

test('图片地址只接受可加载的 http(s) 地址，其余回退占位', () => {
  assert.equal(normalizeImageUrl('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg')
  assert.equal(normalizeImageUrl('  http://cdn.example.com/a.jpg  '), 'http://cdn.example.com/a.jpg')
  assert.equal(normalizeImageUrl('//cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg')
  // seed 中的迁移遗留相对路径：小程序无法直接加载，交给占位样式
  assert.equal(normalizeImageUrl('/assets/album/1.jpg'), '')
  assert.equal(normalizeImageUrl('wxfile://tmp/a.jpg'), '')
  assert.equal(normalizeImageUrl(null), '')

  const card = adaptSpaceCard(seedCard({ coverImage: '/assets/album/1.jpg' }), NOW)
  assert.equal(card.coverUrl, '')
})

test('陪伴天数按自然日计算，未来或非法日期不显示', () => {
  assert.equal(getTogetherDays('2026-05-26 23:59:59', NOW), 0)
  assert.equal(formatTogetherDays('2026-05-26 08:00:00', NOW), '今天开始')
  assert.equal(getTogetherDays('2026-05-27 00:00:00', NOW), null)
  assert.equal(formatTogetherDays('2026-05-27 00:00:00', NOW), '')
  assert.equal(formatTogetherDays('', NOW), '')
  assert.equal(formatTogetherDays('2024-13-40', NOW), '')
  assert.equal(formatTogetherDays(undefined, NOW), '')
  assert.equal(formatDate('2024-05-20'), '2024.05.20')
  assert.equal(formatDate('2024-5-9 08:00:00'), '2024.05.09')
  assert.equal(formatDate('not-a-date'), '')
})

test('首字母占位兼容中文、英文与空昵称', () => {
  assert.equal(initialOf('橙子'), '橙')
  assert.equal(initialOf('Orange Chen'), 'OC')
  assert.equal(initialOf('alice'), 'A')
  assert.equal(initialOf('  '), '')
  assert.equal(initialOf(null), '')
})

test('计数只接受真实非负数字', () => {
  assert.equal(toOptionalCount(0), 0)
  assert.equal(toOptionalCount('12'), 12)
  assert.equal(toOptionalCount(-1), null)
  assert.equal(toOptionalCount(''), null)
  assert.equal(toOptionalCount(null), null)
  assert.equal(toOptionalCount(1.8), 1)
})

test('分页适配按 spaceId 去重并保留服务端顺序', () => {
  const cards = adaptSpaceCards([
    seedCard({ spaceId: 3 }),
    seedCard({ spaceId: 1 }),
    seedCard({ spaceId: 3, spaceName: '重复的空间' }),
    seedCard({ spaceId: 'bad' }),
    seedCard({ spaceId: 2 }),
  ], NOW)
  assert.deepEqual(cards.map(item => item.spaceId), ['3', '1', '2'])
  assert.equal(cards[0].spaceName, '橙子与子怡的四季')
  assert.deepEqual(adaptSpaceCards(null), [])
  assert.deepEqual(adaptSpaceCards({}), [])
})

test('长空间名与长简介原样保留，由 WXML 控制行数', () => {
  const longName = '这是一个非常非常长的空间名称用于验证布局不会被撑破'.repeat(2)
  const longDescription = '我们一起去过很多地方，'.repeat(40)
  const card = adaptSpaceCard(seedCard({ spaceName: longName, description: longDescription }), NOW)
  assert.equal(card.spaceName, longName)
  assert.ok(card.description.length <= 240)
  assert.equal(card.description.indexOf('\n'), -1)
})

test('详情适配收集公开故事、照片与纪念日', () => {
  const detail = adaptSpaceDetail(Object.assign(seedCard(), {
    stories: [
      {
        storyId: 8001,
        title: '第一次见面',
        summary: '',
        contentPreview: '我们第一次见面，聊了很多关于未来和旅行的话题。',
        happenedTime: '2024-05-20 19:30:00',
        coverImage: '',
        tagLabel: '初见',
      },
      { storyId: null, title: '没有编号的故事' },
    ],
    photos: [
      { photoId: 11001, title: '周末早餐', description: '一起做的第一顿早餐。', url: 'https://cdn.example.com/p.jpg' },
      { photoId: 11002, title: '相对路径照片', url: '/assets/album/2.jpg' },
    ],
    anniversaries: [
      { anniversaryId: 12001, title: '在一起的第一天', anniversaryDate: '2024-05-20', description: '' },
    ],
  }), NOW)

  assert.ok(detail)
  assert.equal(detail.stories.length, 1)
  assert.equal(detail.stories[0].title, '第一次见面')
  // summary 为空时回退到后端正文预览，而不是编造文案
  assert.equal(detail.stories[0].summary, '我们第一次见面，聊了很多关于未来和旅行的话题。')
  assert.equal(detail.stories[0].dateText, '2024.05.20')
  assert.equal(detail.stories[0].tagLabel, '初见')
  // 没有可加载地址的照片不进入列表
  assert.equal(detail.photos.length, 1)
  assert.equal(detail.photos[0].description, '一起做的第一顿早餐。')
  assert.equal(detail.anniversaries.length, 1)
  assert.equal(detail.anniversaries[0].dateText, '2024.05.20')
})

test('详情适配拒绝非法空间标识', () => {
  assert.equal(adaptSpaceDetail({ spaceId: 'x' }), null)
  assert.equal(adaptSpaceDetail(null), null)
  assert.equal(normalizeSpaceId('0012'), '12')
  assert.equal(normalizeSpaceId(12), '12')
  assert.equal(normalizeSpaceId(-3), '')
})

// ============================ 公开详情页适配 ============================

const {
  adaptStoryDetail,
  adaptPhotoDetail,
  formatPhotoDateTime,
} = await import('../miniprogram/utils/plaza-adapter.ts')

test('故事列表项补充 hasContent / 正文预览 / 字数，供详情入口使用', () => {
  const detail = adaptSpaceDetail(Object.assign(seedCard(), {
    stories: [
      { storyId: 8001, title: '第一次见面', summary: '', contentPreview: '预览一', contentLength: 12, hasContent: true },
      { storyId: 8002, title: '没有正文', hasContent: false, contentLength: 0 },
      // hasContent 缺失：用正文长度兜底
      { storyId: 8003, title: '只有长度', contentLength: '8' },
      // 长度与预览都缺失：视为没有正文
      { storyId: 8004, title: '什么都没有' },
    ],
  }), NOW)

  assert.equal(detail.stories[0].hasContent, true)
  assert.equal(detail.stories[0].contentPreview, '预览一')
  assert.equal(detail.stories[0].contentLength, 12)
  assert.equal(detail.stories[1].hasContent, false)
  assert.equal(detail.stories[2].hasContent, true)
  assert.equal(detail.stories[2].contentLength, 8)
  assert.equal(detail.stories[3].hasContent, false)
  assert.equal(detail.stories[3].contentLength, 0)
})

test('公开照片补充拍摄时间与地点，缺图仍被过滤', () => {
  const detail = adaptSpaceDetail(Object.assign(seedCard(), {
    photos: [
      {
        photoId: 11001,
        title: '周末早餐',
        description: '一起做的第一顿早餐。',
        url: 'https://cdn.example.com/p.jpg',
        takenTime: '2024-05-20 09:00:00',
        location: '杭州',
      },
      { photoId: 11002, title: '没有地址', url: '' },
    ],
  }), NOW)

  assert.equal(detail.photos.length, 1)
  assert.equal(detail.photos[0].takenTime, '2024-05-20 09:00:00')
  assert.equal(detail.photos[0].dateText, '2024.05.20')
  assert.equal(detail.photos[0].location, '杭州')
})

test('故事详情适配：正文解析与 spaceId 来自路由参数', () => {
  const view = adaptStoryDetail({
    storyId: 8001,
    title: '第一次见面',
    summary: '那天在咖啡馆坐了很久。',
    content: '我们第一次见面，聊了很多关于未来和旅行的话题。',
    happenedTime: '2024-05-20 19:30:00',
    location: '杭州',
    tagLabel: '初见',
    coverImage: 'https://cdn.example.com/cover.jpg',
  }, '2001')

  assert.ok(view)
  assert.equal(view.spaceId, '2001')
  assert.equal(view.story.storyId, '8001')
  assert.equal(view.story.title, '第一次见面')
  assert.equal(view.story.dateText, '2024.05.20')
  assert.equal(view.story.hasContent, true)
  assert.equal(view.totalWords, 23)
  assert.equal(view.readTime, '约 1 分钟')
  assert.equal(view.formattedDate, '2024.05.20')
  assert.equal(view.blocks.length, 1)
  assert.equal(view.content, '我们第一次见面，聊了很多关于未来和旅行的话题。')
})

test('故事详情适配：非法或缺失 storyId 返回 null，由页面展示不可见', () => {
  assert.equal(adaptStoryDetail(null, '2001'), null)
  assert.equal(adaptStoryDetail({ title: '没有编号' }, '2001'), null)
  assert.equal(adaptStoryDetail({ storyId: 'abc' }, '2001'), null)
  assert.equal(adaptStoryDetail([], '2001'), null)
  // spaceId 缺失时仍可展示故事本身，但返回入口会退回广场
  const view = adaptStoryDetail({ storyId: 8001, title: 't' }, '')
  assert.ok(view)
  assert.equal(view.spaceId, '')
})

test('照片详情适配：按 photoId 精确匹配，与列表下标无关', () => {
  const raw = Object.assign(seedCard(), {
    photos: [
      { photoId: 11001, title: '周末早餐', url: 'https://cdn.example.com/p1.jpg', takenTime: '2024-05-20 09:00:00' },
      { photoId: 11002, title: '夏日散步', url: 'https://cdn.example.com/p2.jpg', takenTime: '2024-07-01 18:00:00' },
    ],
  })

  const second = adaptPhotoDetail(raw, '2001', '11002')
  assert.ok(second)
  assert.equal(second.spaceId, '2001')
  assert.equal(second.photo.photoId, '11002')
  assert.equal(second.photo.title, '夏日散步')
  assert.equal(second.index, 1)
  assert.equal(second.photos.length, 2)
  assert.equal(second.formattedDateTime, '2024年07月01日 18:00')

  // 顺序反转后同一 photoId 仍指向同一张照片
  const reversed = adaptPhotoDetail(Object.assign({}, raw, { photos: raw.photos.slice().reverse() }), '2001', '11002')
  assert.equal(reversed.photo.title, '夏日散步')
  assert.equal(reversed.index, 0)
})

test('照片详情适配：不在公开列表 / 非法 ID 返回 null', () => {
  const raw = Object.assign(seedCard(), {
    photos: [{ photoId: 11001, title: '公开照片', url: 'https://cdn.example.com/p1.jpg' }],
  })
  // 私密照片不在公开快照里，匹配不到
  assert.equal(adaptPhotoDetail(raw, '2001', '11003'), null)
  assert.equal(adaptPhotoDetail(raw, '2001', 'abc'), null)
  assert.equal(adaptPhotoDetail(raw, '2001', ''), null)
  assert.equal(adaptPhotoDetail(null, '2001', '11001'), null)
})

test('照片拍摄时间格式化：缺失走项目既有文案', () => {
  assert.equal(formatPhotoDateTime('2024-05-20 09:00:00'), '2024年05月20日 09:00')
  assert.equal(formatPhotoDateTime('2024-05-20'), '2024年05月20日')
  assert.equal(formatPhotoDateTime(''), '拍摄时间未记录')
  assert.equal(formatPhotoDateTime(null), '拍摄时间未记录')
})
