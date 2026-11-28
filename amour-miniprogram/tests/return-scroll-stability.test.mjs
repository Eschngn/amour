import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

/**
 * 父页面返回滚动稳定性回归测试。
 *
 * 页面栈本身会保留父页面实例与 scroll-view 的滚动位置；
 * 一旦父列表页重新引入 `scroll-top` 绑定、滚动恢复工具或导航过程中的
 * scrollTop 写入，就会出现“先回顶部再恢复”的可见中间帧。
 *
 * 这里用静态审计锁住这些边界：
 * - 父列表页不绑定 scroll-top / 不监听滚动做恢复；
 * - 不调用页面级滚动 API，也不使用延迟补偿；
 * - scroll-view 保持同一个实例，关闭回弹与平滑滚动；
 * - 子页面正常返回仍使用 navigateBack，详情页自身的横滑回顶逻辑不受影响。
 */

const read = path => readFileSync(new URL(`../miniprogram/${path}`, import.meta.url), 'utf8')
const has = path => existsSync(new URL(`../miniprogram/${path}`, import.meta.url))

const PARENT_PAGES = [
  'pages/index/index',
  'pages/profile/profile',
  'pages/photo/photo',
  'pages/story/story',
  'pages/plaza/index',
  'pages/plaza-detail/index',
  'pages/space-studio/index',
  'pages/message/message',
]

const PARENT_SCRIPTS = [
  'pages/index/index.ts',
  'pages/profile/profile.js',
  'pages/photo/photo.ts',
  'pages/story/story.ts',
  'pages/plaza/index.ts',
  'pages/plaza-detail/index.ts',
  'pages/space-studio/index.js',
  'pages/message/message.ts',
]

test('父列表页不再绑定 scroll-top / 滚动恢复监听', () => {
  PARENT_PAGES.forEach((page) => {
    const wxml = read(`${page}.wxml`)
    assert.doesNotMatch(wxml, /scroll-top=/, `${page}.wxml 不能绑定 scroll-top`)
    assert.doesNotMatch(wxml, /onContentScroll/, `${page}.wxml 不能监听滚动做恢复`)
    assert.doesNotMatch(wxml, /scroll-with-animation/, `${page}.wxml 不能开启平滑滚动`)
    assert.match(wxml, /<scroll-view[\s\S]*?bounces="\{\{false\}\}"/, `${page}.wxml 的 scroll-view 必须关闭回弹`)
    const openingTag = wxml.match(/<scroll-view[^>]*>/)
    assert.ok(openingTag, `${page}.wxml 缺少 scroll-view`)
    assert.doesNotMatch(openingTag[0], /wx:if=|wx:elif=|wx:else/, `${page} 的 scroll-view 不能在返回时被销毁重建`)
  })
})

test('父列表页脚本不再引用滚动恢复工具或页面级滚动 API', () => {
  PARENT_SCRIPTS.forEach((page) => {
    const source = read(page)
    assert.doesNotMatch(source, /scroll-restore/, `${page} 不能引用已删除的滚动恢复工具`)
    assert.doesNotMatch(source, /scrollRestorerFor|markLeaving|confirmLeaving|consumeReturn|cancelLeaving/, `${page} 不能保留滚动恢复调用`)
    assert.doesNotMatch(source, /scrollTop/, `${page} 不能在返回流程中读写 scrollTop`)
    assert.doesNotMatch(source, /wx\.pageScrollTo/, `${page} 不能使用页面级滚动 API`)
  })
  assert.equal(has('utils/scroll-restore.js'), false, '滚动恢复工具应已删除')
  assert.equal(has('utils/scroll-restore.d.ts'), false, '滚动恢复类型应已删除')
})

test('页面切换动画期间不做延迟、遮罩或隐藏父页的补偿', () => {
  PARENT_SCRIPTS.forEach((page) => {
    const source = read(page)
    assert.doesNotMatch(source, /setTimeout\([^)]*(navigateBack|scroll)/i, `${page} 不能用延迟补偿返回`)
    assert.doesNotMatch(source, /opacity[^\n]*(navigate|show)/i, `${page} 不能用透明度掩盖父页跳动`)
  })
})

test('首页后台刷新失败提示不参与布局，避免返回后锚点位移', () => {
  const indexLess = read('pages/index/index.less')
  assert.match(
    indexLess,
    /\.refresh-band\s*\{[^}]*position:\s*fixed/,
    '刷新失败提示必须脱离文档流，不能在返回后把已有内容向下推',
  )
})

test('导航栏返回继续使用原生 navigateBack，未引入全局延迟', () => {
  const navigationBar = read('components/navigation-bar/navigation-bar.ts')
  assert.match(navigationBar, /wx\.navigateBack\(/)
  assert.doesNotMatch(navigationBar, /setTimeout/)
})

test('编辑页正常返回仍走 navigateBack，保留页面栈与父页实例', () => {
  const contentEditor = read('pages/space-content-editor/index.js')
  assert.match(contentEditor, /wx\.navigateBack\(/)
  const profileEdit = read('pages/profile-edit/profile-edit.js')
  assert.match(profileEdit, /wx\.navigateBack\(/)
  const spaceSetup = read('pages/space-setup/index.js')
  assert.match(spaceSetup, /wx\.navigateBack\(/)
  const plazaStory = read('pages/plaza-story/plaza-story.ts')
  assert.match(plazaStory, /wx\.navigateBack\(/)
  const plazaPhoto = read('pages/plaza-photo/plaza-photo.ts')
  assert.match(plazaPhoto, /wx\.navigateBack\(/)
})

test('照片 / 故事详情自身的横滑回顶逻辑保持不变', () => {
  ;['pages/photo-detail/photo-detail', 'pages/story-detail/story-detail'].forEach((page) => {
    const wxml = read(`${page}.wxml`)
    assert.match(wxml, /scroll-top="\{\{scrollTop\}\}"/, `${page} 自身的切换回顶逻辑不能被误删`)
    assert.match(wxml, /bindscroll="onDetailScroll"/)
    const source = read(`${page}.js`)
    assert.match(source, /scrollTop/, `${page} 仍保留详情内部切换回顶逻辑`)
  })
})
