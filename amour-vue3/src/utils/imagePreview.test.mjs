import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildPublicPhotoPreviews,
  buildReviewImagePreviews,
  isPreviewableImageSrc,
  normalizePreviewImages,
  resolvePreviewIndex,
  stepPreviewIndex,
} from './imagePreview.js'

/**
 * 运行：npm test
 *
 * 覆盖图片预览的数据归一化、审核图片 alt 生成、公开照片描述透传，
 * 以及管理台 / 恋爱广场接入预览所需的可访问性与降级约束。
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readSource(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8')
}

test('图片地址只允许 http(s) 或站内相对路径', () => {
  assert.equal(isPreviewableImageSrc('https://cdn.example.com/a.jpg'), true)
  assert.equal(isPreviewableImageSrc('/assets/album/1.jpg'), true)
  assert.equal(isPreviewableImageSrc(''), false)
  assert.equal(isPreviewableImageSrc('   '), false)
  assert.equal(isPreviewableImageSrc('javascript:alert(1)'), false)
  assert.equal(isPreviewableImageSrc('data:text/html,<script>'), false)
})

test('单图旧调用保留 alt 与描述，空地址不会生成预览项', () => {
  assert.deepEqual(normalizePreviewImages({ src: '', alt: '空图' }), [])

  const [item] = normalizePreviewImages({
    src: ' /assets/album/1.jpg ',
    alt: '周末早餐',
    description: ' 一起做的第一顿早餐。 ',
  })
  assert.equal(item.src, '/assets/album/1.jpg')
  assert.equal(item.alt, '周末早餐')
  assert.equal(item.title, '周末早餐')
  assert.equal(item.description, '一起做的第一顿早餐。')
})

test('多图模式过滤空地址与不安全协议，并保留可公开字段', () => {
  const items = normalizePreviewImages({
    alt: '公开照片',
    images: [
      { id: 1, src: 'https://cdn.example.com/1.jpg', title: '第一张', description: '描述一' },
      { id: 2, src: '' },
      { id: 3, src: 'javascript:alert(1)' },
      { id: 4, url: '/assets/album/2.jpg' },
    ],
  })

  assert.equal(items.length, 2)
  assert.equal(items[0].id, 1)
  assert.equal(items[0].title, '第一张')
  assert.equal(items[0].description, '描述一')
  assert.equal(items[1].src, '/assets/album/2.jpg')
  assert.equal(items[1].alt, '公开照片')
})

test('预览索引收敛并在首尾循环切图', () => {
  assert.equal(resolvePreviewIndex(0, 0), 0)
  assert.equal(resolvePreviewIndex(-2, 3), 0)
  assert.equal(resolvePreviewIndex(9, 3), 2)
  assert.equal(resolvePreviewIndex('1', 3), 1)

  assert.equal(stepPreviewIndex(0, -1, 3), 2)
  assert.equal(stepPreviewIndex(2, 1, 3), 0)
  assert.equal(stepPreviewIndex(1, 1, 3), 2)
  assert.equal(stepPreviewIndex(0, 1, 1), 0)
})

test('审核详情图片按当前 / 待审核分组生成 alt，空地址不会出现空图', () => {
  const item = {
    itemId: 11001,
    title: '周末早餐',
    itemTypeText: '照片',
    beforeImages: [''],
    beforeSummary: { subtitle: '旧描述' },
    afterImages: ['https://cdn.example.com/new.jpg', ''],
    afterSummary: { subtitle: '新描述' },
  }

  assert.deepEqual(buildReviewImagePreviews(item, 'before'), [])

  const after = buildReviewImagePreviews(item, 'after')
  assert.equal(after.length, 1)
  assert.equal(after[0].src, 'https://cdn.example.com/new.jpg')
  assert.equal(after[0].alt, '周末早餐 · 待审核图片')
  assert.equal(after[0].description, '新描述')
  assert.equal(after[0].meta, '照片 · 待审核图片')
})

test('审核详情多图 alt 带序号，避免审核人员混淆版本', () => {
  const images = buildReviewImagePreviews({
    title: '双人封面',
    itemTypeText: '主页配置',
    afterImages: ['https://cdn.example.com/a.jpg', '/assets/album/b.jpg'],
  }, 'after')

  assert.equal(images.length, 2)
  assert.equal(images[0].alt, '双人封面 · 待审核图片 1')
  assert.equal(images[1].alt, '双人封面 · 待审核图片 2')
})

test('公开照片描述完整透传，空描述保持空字符串且不引入管理字段', () => {
  const previews = buildPublicPhotoPreviews([
    {
      photoId: 11001,
      title: '周末早餐',
      description: '一起做的第一顿早餐。',
      url: '/assets/album/1.jpg',
      takenTime: '2024-05-20 09:00:00',
      location: '杭州',
      visibility: 1,
      createdBy: 1001,
      sortOrder: 10,
    },
    {
      photoId: 11002,
      title: '没有描述',
      description: '',
      url: '/assets/album/2.jpg',
    },
    { photoId: 11003, title: '失效地址', description: '不应出现', url: '' },
  ])

  assert.equal(previews.length, 2)
  assert.equal(previews[0].description, '一起做的第一顿早餐。')
  assert.equal(previews[0].meta, '拍摄于 2024.05.20 09:00:00 · 杭州')
  assert.equal(previews[1].description, '')
  assert.deepEqual(
    Object.keys(previews[0]).sort(),
    ['alt', 'description', 'id', 'meta', 'src', 'title'],
  )
  assert.equal(JSON.stringify(previews).includes('createdBy'), false)
  assert.equal(JSON.stringify(previews).includes('visibility'), false)
  assert.equal(JSON.stringify(previews).includes('sortOrder'), false)
})

test('空描述保持空字符串，避免渲染空白说明区', () => {
  const previews = buildPublicPhotoPreviews([
    { photoId: 1, title: '空白描述', description: '   ', url: '/assets/album/1.jpg' },
  ])

  assert.equal(previews[0].description, '')
})

test('无标题时 alt 使用描述摘要，完全无内容时使用通用文本', () => {
  const previews = buildPublicPhotoPreviews([
    {
      photoId: 1,
      title: '   ',
      description: '傍晚的风很轻，我们沿着江边走了很久。',
      url: '/assets/album/1.jpg',
    },
    { photoId: 2, title: '', description: '', url: '/assets/album/2.jpg' },
  ])

  assert.equal(previews[0].title, '未命名照片')
  assert.equal(previews[0].alt, '照片描述：傍晚的风很轻，我们沿着江边走了很久。')
  assert.equal(previews[1].alt, '公开照片')
})

test('描述中的特殊字符、换行和超长 URL 原样保留，由模板负责转义', () => {
  const description = `<script>alert("xss")</script>\n第二行 https://example.com/${'a'.repeat(240)}`
  const [preview] = buildPublicPhotoPreviews([{
    photoId: 1,
    title: '特殊内容',
    description,
    url: '/assets/album/1.jpg',
  }])

  assert.equal(preview.description, description)
  assert.equal(preview.description.includes('<script>'), true)
})

test('多张照片的描述互相独立，切换时不会复用上一张文案', () => {
  const previews = buildPublicPhotoPreviews([
    { photoId: 1, title: '第一张', description: '第一张的描述', url: '/assets/album/1.jpg' },
    { photoId: 2, title: '第二张', description: '第二张的描述', url: '/assets/album/2.jpg' },
  ])

  assert.equal(previews[0].description, '第一张的描述')
  assert.equal(previews[1].description, '第二张的描述')
  assert.notEqual(previews[0].description, previews[1].description)
})

test('长描述不会被截断，换行与超长内容交给预览层滚动展示', () => {
  const description = `第一行\n${'很长的照片描述'.repeat(60)}`
  const [preview] = buildPublicPhotoPreviews([{
    photoId: 1,
    title: '长描述',
    description,
    url: '/assets/album/1.jpg',
  }])

  assert.equal(preview.description, description)
})

test('共享预览层支持关闭、切图、Esc、加载与错误、缩放和滚动恢复', () => {
  const source = readSource('components/frontend/space-studio/SpaceImagePreview.vue')

  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-label="关闭图片预览"/)
  assert.match(source, /aria-label="上一张图片"/)
  assert.match(source, /aria-label="下一张图片"/)
  assert.match(source, /Escape/)
  assert.match(source, /ArrowLeft/)
  assert.match(source, /ArrowRight/)
  assert.match(source, /@click\.self="close"/)
  assert.match(source, /正在加载图片/)
  assert.match(source, /图片加载失败/)
  assert.match(source, /暂无可预览的图片/)
  assert.match(source, /@wheel\.prevent="handleWheel"/)
  assert.match(source, /handleTouchStart/)
  assert.match(source, /object-contain/)
  assert.match(source, /max-h-\[calc\(100dvh-13rem\)\]/)

  // 滚动锁定与关闭后的位置恢复、焦点返回。
  assert.match(source, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(source, /window\.scrollTo\(\{ top: savedScrollTop/)
  assert.match(source, /lastFocusedElement\.focus\(\{ preventScroll: true \}\)/)
  assert.match(source, /props\.variant === 'admin'/)
})

test('恋爱广场照片详情使用独立信息面板并保留无障碍能力', () => {
  const source = readSource('components/frontend/space-studio/SpaceImagePreview.vue')

  assert.match(source, /props\.variant === 'plaza'/)
  assert.match(source, /plaza-photo-dialog/)
  assert.match(source, /照片详情/)
  assert.match(source, /照片描述/)
  assert.match(source, /whitespace-pre-wrap/)
  assert.match(source, /break-words/)
  assert.match(source, /overflow-y-auto/)
  assert.match(source, /aria-label="关闭照片详情"/)
  assert.match(source, /title="关闭照片详情"/)
  assert.match(source, /aria-label="上一张照片"/)
  assert.match(source, /aria-label="下一张照片"/)
  assert.match(source, /aria-label="放大照片"/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /max-h-\[94dvh\]/)
  assert.match(source, /sm:h-\[min\(78dvh,660px\)\]/)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(source, /transition: none/)
  assert.match(source, /\.plaza-photo-image/)
  assert.match(source, /plaza-photo-preview-enter-active/)
  assert.match(source, /@click\.self="close"/)
  assert.doesNotMatch(source, /v-html/)
})

test('空间编辑相册复用同一照片详情组件并接入编辑操作', () => {
  const editor = readSource('components/frontend/space-studio/SpacePhotoEditor.vue')
  const plaza = readSource('pages/frontend/PublicSpaceDetailPage.vue')
  const preview = readSource('components/frontend/space-studio/SpaceImagePreview.vue')

  // 两个页面必须引用同一个预览组件，避免维护两套弹窗。
  assert.match(editor, /import SpaceImagePreview from '@\/components\/frontend\/space-studio\/SpaceImagePreview\.vue'/)
  assert.match(plaza, /import SpaceImagePreview from '@\/components\/frontend\/space-studio\/SpaceImagePreview\.vue'/)
  assert.match(editor, /variant="editor"/)
  assert.match(plaza, /variant="plaza"/)
  assert.match(preview, /isPlaza\.value \|\| isEditor\.value/)

  // 编辑模式通过 actions 插槽补充管理操作，不复制详情布局。
  assert.match(editor, /#actions="\{ item \}"/)
  assert.match(editor, /editPhotoFromPreview/)
  assert.match(editor, /deletePhotoFromPreview/)
  assert.match(preview, /slot name="actions"/)
  assert.match(preview, /v-if="isEditor && \$slots\.actions && currentItem"/)

  // 切换照片时操作目标来自当前预览项，编辑与删除都使用最新照片 ID。
  assert.match(editor, /String\(photoItem\.id\) === String\(item\?\.id\)/)
  assert.match(editor, /openPhotoPreview\(photo, \$event\)/)
  assert.match(editor, /previewItems/)
  assert.match(editor, /buildPhotoPreviewMeta/)
  assert.match(editor, /isPreviewableImageSrc/)
})

test('编辑相册删除当前照片后正确切换或关闭详情', () => {
  const editor = readSource('components/frontend/space-studio/SpacePhotoEditor.vue')

  assert.match(editor, /const result = await removePhoto\(photo\)/)
  assert.match(editor, /if \(result === 'deleted'\)/)
  assert.match(editor, /previewItems\.value\.length/)
  assert.match(editor, /return 'cancelled'/)
  assert.match(editor, /return 'failed'/)
  assert.match(editor, /ensureCurrentPageHasPhotos/)
  assert.match(editor, /previewIndex\.value = -1/)
  assert.match(editor, /variant="editor"/)
})

test('管理台审核详情图片接入预览且保留审核操作', () => {
  const source = readSource('pages/admin/AdminSpaceReviewManage.vue')

  assert.match(source, /SpaceImagePreview/)
  assert.match(source, /variant="admin"/)
  assert.match(source, /buildReviewImagePreviews/)
  assert.match(source, /openReviewPreview/)
  assert.match(source, /:alt="image\.alt"/)
  assert.doesNotMatch(source, /alt=""/)
  assert.match(source, /approveItem/)
  assert.match(source, /rejectItem/)
  assert.match(source, /approveAll/)
  assert.match(source, /rejectAll/)
})

test('恋爱广场照片展示描述并通过预览层查看完整内容', () => {
  const source = readSource('pages/frontend/PublicSpaceDetailPage.vue')

  assert.match(source, /photoDescription\(photo\)/)
  assert.match(source, /line-clamp-2/)
  assert.match(source, /SpaceImagePreview/)
  assert.match(source, /variant="plaza"/)
  assert.match(source, /publicPhotoPreviews/)
  assert.match(source, /openPhotoPreview/)
  assert.match(source, /watch\(publicPhotoPreviews/)
  assert.match(source, /查看照片大图和描述/)
  assert.doesNotMatch(source, /v-html/)
})

test('公开照片接口继续返回描述且不暴露内部字段', () => {
  const vo = readSource('../../amour-springboot/amour-web/src/main/java/com/chengliuxiang/amour/web/model/vo/gallery/GalleryPhotoVO.java')

  assert.match(vo, /private String description;/)
  assert.doesNotMatch(vo, /createdBy|updatedBy|visibility|sortOrder|isDeleted/)
})
