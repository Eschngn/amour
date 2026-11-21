import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 运行：npm test
 *
 * 未上传头像 / 首页主视觉照片时的占位回归测试：
 * - 只展示真实图片，不再使用示例真人头像与示例照片；
 * - 图片为空或加载失败时回退到首字母 / “尚未上传照片”占位；
 * - 占位与图片使用同一固定比例，加载前后尺寸稳定；
 * - 小程序首页不再出现硬编码示例图片。
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

async function renderComponent(relativePath, props) {
  const { createServer } = await import('vite')
  const server = await createServer({
    configFile: resolve(ROOT, '..', 'vite.config.js'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  try {
    const component = await server.ssrLoadModule(relativePath)
    const { createSSRApp } = await import('vue')
    const { renderToString } = await import('vue/server-renderer')
    return await renderToString(createSSRApp(component.default, props))
  } finally {
    await server.close()
  }
}

test('没有头像时渲染昵称首字母占位，不渲染图片', async () => {
  const html = await renderComponent('/src/components/frontend/CoupleAvatar.vue', {
    name: '橙子',
    fallback: 'HE',
    label: '橙子的头像',
  })

  assert.match(html, /role="img"/)
  assert.match(html, /aria-label="橙子的头像"/)
  assert.match(html, />橙</)
  assert.doesNotMatch(html, /<img/)
})

test('有真实头像时渲染图片，并保留无障碍文本', async () => {
  const html = await renderComponent('/src/components/frontend/CoupleAvatar.vue', {
    src: 'https://cdn.example.com/avatar.png',
    name: '橙子',
    label: '橙子的头像',
  })

  assert.match(html, /<img[^>]+src="https:\/\/cdn\.example\.com\/avatar\.png"/)
  assert.match(html, /aria-label="橙子的头像"/)
  // 图片本身对读屏隐藏，由容器统一提供名称，避免重复朗读。
  assert.match(html, /aria-hidden="true"/)
})

test('没有昵称时头像使用 HE / SHE 兜底', async () => {
  const html = await renderComponent('/src/components/frontend/CoupleAvatar.vue', {
    name: '',
    fallback: 'SHE',
  })

  assert.match(html, />SHE</)
  assert.match(html, /aria-label="情侣空间头像"/)
})

test('没有主视觉照片时渲染稳定比例的“尚未上传照片”占位', async () => {
  const html = await renderComponent('/src/components/frontend/CoupleHeroPhoto.vue', {
    alt: '我们的相册照片',
    ratioClass: 'aspect-[4/5]',
  })

  assert.match(html, /尚未上传照片/)
  assert.match(html, /role="img"/)
  assert.match(html, /aria-label="我们的相册照片"/)
  // 占位与图片共用同一比例类，加载前后占位区域高度保持一致。
  assert.match(html, /hero-photo-empty/)
  assert.match(html, /aspect-\[4\/5\]/)
  assert.doesNotMatch(html, /<img/)
})

test('有真实主视觉照片时渲染图片且不再显示占位', async () => {
  const html = await renderComponent('/src/components/frontend/CoupleHeroPhoto.vue', {
    src: 'https://cdn.example.com/hero.png',
    alt: '我们的相册照片',
    ratioClass: 'aspect-square',
  })

  assert.match(html, /<img[^>]+src="https:\/\/cdn\.example\.com\/hero\.png"/)
  assert.match(html, /aspect-square/)
  assert.doesNotMatch(html, /尚未上传照片/)
})

test('情侣空间首页移除示例头像与示例照片，改用占位组件', () => {
  const source = readSource('pages/frontend/MyCoupleSpaceHome.vue')

  assert.doesNotMatch(source, /example-photo/)
  assert.doesNotMatch(source, /assets\/boy\.jpeg|assets\/girl\.jpeg/)
  assert.doesNotMatch(source, /DEFAULT_HERO_PHOTO/)
  assert.match(source, /CoupleAvatar/)
  assert.match(source, /CoupleHeroPhoto/)
  assert.match(source, /heroPhoto1: ''/)
  assert.match(source, /:src="creatorMember\?\.avatar \|\| ''"/)
  assert.match(source, /:src="partnerMember\?\.avatar \|\| ''"/)
  assert.doesNotMatch(source, /homeConfig\.(?:boy|girl)Avatar/)
  // 图片加载失败由占位组件在内部回退，不再预先加载示例图。
  assert.doesNotMatch(source, /preloadImage|resolveDisplayableImage/)
})

test('公开广场卡片与详情页只展示成员真实头像，首字母负责兜底', () => {
  for (const file of [
    'components/frontend/PublicSpaceCard.vue',
    'pages/frontend/PublicSpaceDetailPage.vue',
  ]) {
    const source = readSource(file)
    assert.doesNotMatch(source, /assets\/boy\.jpeg|assets\/girl\.jpeg/, file)
    assert.doesNotMatch(source, /defaultBoyAvatar|defaultGirlAvatar/, file)
    assert.match(source, /initials\(/, file)
    assert.match(source, /role="img"/, file)
    assert.match(source, /@error="\$event\.currentTarget\.style\.display = 'none'"/, file)
  }
})

test('纪念日页头像使用占位组件，不依赖示例图片', () => {
  const source = readSource('pages/frontend/AnniversaryPage.vue')

  assert.doesNotMatch(source, /assets\/boy\.jpeg|assets\/girl\.jpeg/)
  assert.match(source, /<CoupleAvatar/)
})

test('空间设置面板成员头像保留首字母兜底与加载失败回退', () => {
  const source = readSource('components/frontend/SpaceSettingsPanel.vue')

  assert.match(source, /memberInitial\(member\)/)
  assert.match(source, /v-if="member\.avatar"/)
  assert.match(source, /@error="\$event\.currentTarget\.style\.display = 'none'"/)
  assert.doesNotMatch(source, /assets\/boy\.jpeg|assets\/girl\.jpeg/)
})

test('首页编辑器说明不再承诺使用站点示例图', () => {
  const source = readSource('components/frontend/space-studio/SpaceHomeEditor.vue')

  assert.doesNotMatch(source, /站点示例图/)
  assert.match(source, /尚未上传照片/)
  assert.doesNotMatch(source, /boy_avatar|girl_avatar|form\.(?:boy|girl)Avatar/)
  assert.match(source, /头像统一读取双方的账号资料/)
})

test('小程序首页移除硬编码示例图片，并提供占位视图', () => {
  const script = readFileSync(resolve(
    ROOT,
    '../../amour-miniprogram/miniprogram/pages/index/index.ts',
  ), 'utf8')
  const template = readFileSync(resolve(
    ROOT,
    '../../amour-miniprogram/miniprogram/pages/index/index.wxml',
  ), 'utf8')

  assert.doesNotMatch(script, /example-photo1|example-photo2|DEFAULT_AVATAR/)
  assert.match(script, /homePhotos: \[\] as HomePhotoItem\[\]/)
  assert.match(script, /boyAvatar: ''/)
  assert.match(script, /girlAvatar: ''/)
  assert.match(script, /space\/home\/query/)
  assert.doesNotMatch(script, /post[^\n]*\/site-config\/query/, '首页不能再用平台默认配置覆盖空间首页数据')

  assert.match(template, /wx:if="\{\{homePhotos\.length\}\}"/)
  assert.match(template, /还没有首页照片/)
  assert.match(template, /avatar-fallback/)
  assert.match(template, /onAvatarError/)
})
