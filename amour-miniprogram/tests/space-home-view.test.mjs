import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildHomeView } = require('../miniprogram/utils/space-home-view.js')

test('空间首页直接使用 /space/home/query 返回值与来源字段', () => {
  const view = buildHomeView({
    spaceName: '我们的故事',
    description: '只属于两个人',
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
    heroPhoto2: '',
    heroPhoto2Source: 'placeholder',
  })

  assert.equal(view.spaceName, '我们的故事')
  assert.equal(view.description, '只属于两个人')
  assert.equal(view.canEdit, false, '缺少 canEdit 时不能默认开启编辑入口')
  assert.equal(view.hasLoveStart, true)
  assert.deepEqual(view.heroPhotos, [{ key: 'hero-1', url: 'https://cdn.example.com/hero.png' }])
  assert.equal(view.boyName, '橙子')
  assert.equal(view.girlName, '子怡')
  assert.equal(view.boyAvatar, 'https://cdn.example.com/boy.png')
  assert.equal(view.girlAvatar, '', 'placeholder 来源保留空值，由 WXML 展示占位')
  assert.equal(view.heroPhotoOne, 'https://cdn.example.com/hero.png')
  assert.equal(view.heroPhotoTwo, '')
  assert.equal(view.loveStartTime, '2024-05-20 19:30:47')
  assert.equal(view.loveStartDate, '2024 · 05 · 20')
  assert.equal(view.boyInitial, '橙')
  assert.equal(view.girlInitial, '子')
})

test('未配置时使用后端默认名 HE / SHE，并保持日期为空', () => {
  const view = buildHomeView({
    spaceName: '我们的故事',
    boyName: 'HE',
    boyNameSource: 'default',
    girlName: 'SHE',
    girlNameSource: 'default',
    loveStartTime: null,
  })
  assert.equal(view.boyName, 'HE')
  assert.equal(view.girlName, 'SHE')
  assert.equal(view.boyInitial, 'HE', '英文名取前两个字母')
  assert.equal(view.girlInitial, 'SH')
  assert.equal(view.loveStartTime, '')
  assert.equal(view.loveStartDate, '', '没有开始日期时由页面展示待补充文案')
})

test('空响应不会抛错，返回可用于占位的默认视图', () => {
  const view = buildHomeView(null)
  assert.equal(view.spaceName, '')
  assert.equal(view.description, '')
  assert.equal(view.canEdit, false)
  assert.equal(view.boyAvatar, '')
  assert.equal(view.heroPhotoOne, '')
  assert.deepEqual(view.heroPhotos, [])
  assert.equal(view.hasLoveStart, false)
  assert.equal(view.loveStartDate, '')
})

test('简介与展示字段会去除首尾空白，canEdit 只接受 true', () => {
  const view = buildHomeView({
    spaceName: '  小窝  ',
    description: '  一起生活  ',
    canEdit: true,
    heroPhoto1: '  https://cdn.example.com/a.png  ',
    heroPhoto2: 'https://cdn.example.com/b.png',
  })
  assert.equal(view.spaceName, '小窝')
  assert.equal(view.description, '一起生活')
  assert.equal(view.canEdit, true)
  assert.deepEqual(view.heroPhotos, [
    { key: 'hero-1', url: 'https://cdn.example.com/a.png' },
    { key: 'hero-2', url: 'https://cdn.example.com/b.png' },
  ])
})

test('只有一张照片时不生成空照片项', () => {
  const view = buildHomeView({ heroPhoto1: '', heroPhoto2: 'https://cdn.example.com/only.png' })
  assert.deepEqual(view.heroPhotos, [{ key: 'hero-2', url: 'https://cdn.example.com/only.png' }])
})
