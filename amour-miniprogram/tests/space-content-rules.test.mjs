import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rules = require('../miniprogram/utils/space-content-rules.js')

test('栏目按模块查询权限过滤，首页始终可用', () => {
  assert.deepEqual(
    rules.resolveContentTabs(() => true).map(tab => tab.key),
    ['home', 'story', 'message', 'photo', 'anniversary'],
  )
  assert.deepEqual(
    rules.resolveContentTabs(module => module === 'story').map(tab => tab.key),
    ['home', 'story'],
  )
  assert.deepEqual(
    rules.resolveContentTabs(() => false).map(tab => tab.key),
    ['home'],
  )
})

test('tab 恢复只接受当前可见栏目', () => {
  const tabs = rules.resolveContentTabs(module => module === 'photo')
  assert.equal(rules.resolveActiveContentTab('photo', tabs), 'photo')
  assert.equal(rules.resolveActiveContentTab('story', tabs), 'home')
  assert.equal(rules.resolveActiveContentTab('', tabs), 'home')
})

test('等待绑定创建者可编辑，冻结 / 归档 / 非成员不可编辑', () => {
  const waiting = { spaceId: 1, status: 0, memberCount: 1, currentUserRole: 1 }
  assert.equal(rules.canEditSpaceContent(waiting), true)
  assert.equal(rules.canPublishContent(waiting), false, '等待绑定不能公开内容')

  const normal = { spaceId: 1, status: 1, memberCount: 2, currentUserRole: 2 }
  assert.equal(rules.canEditSpaceContent(normal), true)
  assert.equal(rules.canPublishContent(normal), true)

  assert.equal(
    rules.canEditSpaceContent({ spaceId: 1, status: 0, memberCount: 1, currentUserRole: 2, creator: false }),
    false,
    '等待绑定阶段只有创建者可以写入',
  )

  for (const status of [2, 3, 4, 5, 6]) {
    assert.equal(
      rules.canEditSpaceContent({ spaceId: 1, status, memberCount: 2, currentUserRole: 1 }),
      false,
      `status=${status}`,
    )
  }
  assert.equal(rules.canEditSpaceContent({ spaceId: 1, status: 1, memberCount: 0, currentUserRole: 1 }), false)
  assert.equal(rules.canEditSpaceContent(null), false)
})

test('可见性选项：未完成绑定时禁用公开，提交前会归一化', () => {
  const options = rules.buildVisibilityOptions(false)
  assert.equal(options[1].disabled, true)
  assert.match(options[1].label, /完成绑定后可用/)
  assert.equal(rules.normalizeVisibility(1, false), 0)
  assert.equal(rules.normalizeVisibility(1, true), 1)
  assert.equal(rules.normalizeVisibility(2, false), 2)
  assert.match(rules.validateVisibility(1, false), /完成两人绑定/)
  assert.equal(rules.validateVisibility(1, true), '')
})

test('审核中的保存不能被描述成已公开', () => {
  const pending = rules.describeSaveReview({ reviewStatus: 'PENDING', published: false }, '已保存')
  assert.equal(pending.kind, 'stale')
  assert.match(pending.message, /审核/)
  assert.doesNotMatch(pending.message, /已公开$/)

  const homePending = rules.describeSaveReview({ reviewPending: true }, '已保存')
  assert.equal(homePending.kind, 'stale', '首页审核中同样不能报成已公开')

  const restored = rules.describeSaveReview({ restoredToPublished: true }, '已保存')
  assert.equal(restored.kind, 'success')
  assert.match(restored.message, /公开版本/)

  const plain = rules.describeSaveReview({}, '照片已保存')
  assert.equal(plain.message, '照片已保存')
  assert.equal(rules.describeSaveReview({ changed: false }, '已保存').kind, 'stale')
})

test('审核摘要保持待审核与驳回状态可发现', () => {
  const pending = rules.describeReview({ visibility: 1, pending: true, rejectedItems: [] })
  assert.equal(pending.visibility, '公开中')
  assert.match(pending.summary, /公开中/)
  assert.match(pending.summary, /有待审核/)
  assert.equal(pending.needsAttention, true)

  const rejected = rules.describeReview({
    visibilityText: '公开中',
    pending: false,
    rejectedItems: [{ itemId: 1 }, { itemId: 2 }],
  })
  assert.match(rejected.summary, /2 项未通过审核/)
  assert.equal(rejected.hasRejected, true)
  assert.equal(rejected.needsAttention, true)

  const normal = rules.describeReview({ visibility: 0, lastReviewStatusText: '已公开' })
  assert.equal(normal.summary, '私密 · 已公开')
  assert.equal(normal.needsAttention, false)

  assert.equal(rules.describeReview(null).summary, '私密 · 暂无待审核内容')
})

test('首页表单只回填空间配置本身，不把成员资料 / 平台默认值写成用户配置', () => {
  const form = rules.buildHomeForm({
    spaceName: '我们的故事',
    description: '简介',
    loveStartTime: '2024-05-20 19:30:47',
    boyName: '橙子',
    boyNameSource: 'config',
    girlName: '子怡',
    girlNameSource: 'member',
    boyAvatar: 'https://cdn.example.com/boy.png',
    boyAvatarSource: 'platform',
    girlAvatar: '',
    girlAvatarSource: 'placeholder',
    heroPhoto1: 'https://cdn.example.com/hero.png',
    heroPhoto1Source: 'config',
    heroPhoto2: 'https://cdn.example.com/platform-default.png',
    heroPhoto2Source: 'platform',
  })
  assert.equal(form.boyName, '橙子')
  assert.equal(form.girlName, '', 'member 来源不写回配置输入框')
  assert.equal(form.boyAvatar, '', 'platform 来源不写回配置输入框')
  assert.equal(form.heroPhoto1, 'https://cdn.example.com/hero.png')
  assert.equal(form.heroPhoto2, '', '平台默认图不能被写回空间配置')
  assert.equal(form.loveDate, '2024-05-20')
  assert.equal(form.loveTime, '19:30')
})

test('首页保存提交完整基础信息与白名单 configs，时间为秒级或 null', () => {
  const form = {
    spaceName: '  新名字  ',
    description: ' 简介 ',
    loveDate: '2024-05-20',
    loveTime: '19:30',
    boyName: ' 橙子 ',
    girlName: '',
    boyAvatar: '',
    girlAvatar: '',
    heroPhoto1: 'https://cdn.example.com/hero.png',
    heroPhoto2: '',
  }
  const payload = rules.buildHomePayload(form, '2024-05-20 19:30:47')
  assert.equal(payload.spaceName, '新名字')
  assert.equal(payload.description, '简介')
  assert.equal(payload.loveStartTime, '2024-05-20 19:30:47', '同一分钟保存保留原秒数')
  assert.equal(payload.configs.boy_name, '橙子')
  assert.equal(payload.configs.girl_name, '')
  assert.equal(payload.configs['home.hero_photo_1'], 'https://cdn.example.com/hero.png')

  const cleared = rules.buildHomePayload({ ...form, loveDate: '', loveTime: '' }, '')
  assert.equal(cleared.loveStartTime, null, '清空时间必须提交 null')
})

test('表单校验覆盖名称、时间半选与图片地址', () => {
  assert.match(rules.validateHomeForm({ spaceName: '' }), /必填/)
  assert.match(rules.validateHomeForm({ spaceName: 'x', loveDate: '2024-01-01' }), /同时选择/)
  assert.equal(rules.validateHomeForm({ spaceName: 'x' }), '')
  assert.match(rules.validateChapterForm({ name: '' }), /必填/)
  assert.equal(rules.validateChapterForm({ name: '初见' }), '')
  assert.match(rules.validateNodeForm({ chapterId: 1, title: 'a', happenedDate: '2024-01-01' }), /同时选择/)
  assert.equal(rules.validateNodeForm({ chapterId: 1, title: 'a' }), '')
  assert.match(rules.validatePhotoForm({ photoCategoryId: 1, url: 'javascript:alert(1)' }), /图片地址/)
  assert.equal(rules.validatePhotoForm({ photoCategoryId: 1, url: 'https://cdn.example.com/a.png' }), '')
  assert.match(
    rules.validatePhotoForm({
      photoCategoryId: 1,
      url: 'https://cdn.example.com/a.png',
      isCover: true,
      visibility: 2,
    }),
    /封面照片不能同时设为隐藏/,
  )
  assert.match(rules.validateAnniversaryForm({ title: '周年' }), /日期/)
  assert.equal(rules.validateAnniversaryForm({ title: '周年', anniversaryDate: '2025-05-20' }), '')
})

test('故事 / 照片 / 纪念日提交体符合后端 VO 字段', () => {
  const chapter = rules.buildChapterPayload({ id: 3, name: ' 初见 ', isVisible: false })
  assert.deepEqual(chapter, { id: 3, name: '初见', isVisible: false })

  const node = rules.buildNodePayload({
    id: 9,
    chapterId: 3,
    title: '第一次见面',
    summary: '摘要',
    content: '正文',
    happenedDate: '2024-05-20',
    happenedTime: '19:30',
    baselineHappenedTime: '2024-05-20 19:30:47',
    location: '江边',
    coverImage: 'https://cdn.example.com/cover.png',
    tagLabel: '初见',
    isMilestone: true,
    visibility: 1,
    canPublish: false,
  })
  assert.equal(node.happenedTime, '2024-05-20 19:30:47')
  assert.equal(node.visibility, 0, '未完成绑定时不能提交公开')
  assert.equal(node.isMilestone, true)

  const photo = rules.buildPhotoPayload({
    photoCategoryId: 5,
    url: 'https://cdn.example.com/p.png',
    takenDate: '2024-06-15',
    takenTime: '09:30',
    baselineTakenTime: '',
    visibility: 0,
    canPublish: true,
  })
  assert.equal(photo.takenTime, '2024-06-15 09:30:00')
  assert.equal(photo.photoCategoryId, 5)

  const anniversary = rules.buildAnniversaryPayload({
    title: '周年',
    anniversaryDate: '2025-05-20',
    repeatType: 0,
    category: 'love',
    visibility: 2,
    canPublish: false,
  })
  assert.equal(anniversary.repeatType, 0)
  assert.equal(anniversary.visibility, 2)
})

test('排序项按 10 递增，上下移动不修改原数组', () => {
  const list = [{ id: 1 }, { id: 2 }, { id: 3 }]
  assert.deepEqual(rules.buildOrderItems(list), [
    { id: 1, sortOrder: 10 },
    { id: 2, sortOrder: 20 },
    { id: 3, sortOrder: 30 },
  ])

  const moved = rules.moveListItem(list, 1, 'up')
  assert.equal(moved.moved, true)
  assert.deepEqual(moved.list.map(item => item.id), [2, 1, 3])
  assert.deepEqual(list.map(item => item.id), [1, 2, 3], '原数组不能被修改')

  const blocked = rules.moveListItem(list, 0, 'up')
  assert.equal(blocked.moved, false)
  assert.deepEqual(blocked.list.map(item => item.id), [1, 2, 3])
})

test('错误码转可读提示，冲突错误需要刷新空间状态', () => {
  assert.match(rules.buildContentErrorMessage({ errorCode: '20065' }), /不允许编辑内容/)
  assert.match(rules.buildContentErrorMessage({ errorCode: '20069' }), /完成两人绑定/)
  assert.match(rules.buildContentErrorMessage({ errorCode: '20068' }), /章节下仍有故事/)
  assert.equal(
    rules.buildContentErrorMessage({ errorCode: '99999', message: '后端提示' }, '兜底'),
    '后端提示',
  )
  assert.equal(rules.isContentConflict({ errorCode: '20065' }), true)
  assert.equal(rules.isContentConflict({ errorCode: '20034' }), true)
  assert.equal(rules.isContentConflict({ errorCode: '20024' }), false)
  assert.equal(rules.isContentConflict(null), false)
})

test('留言校验与分页路径使用后端 query 参数', () => {
  assert.match(rules.validateMessageContent('   '), /不能为空/)
  assert.equal(rules.validateMessageContent('你好'), '')
  const apiModule = require('../miniprogram/utils/space-content-api.js')
  assert.equal(apiModule.buildMessagePagePath(2, 8), '/message/page?current=2&size=8')
})
