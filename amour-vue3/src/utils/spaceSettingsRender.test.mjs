import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

/**
 * 运行：npm run test:space-settings
 *
 * 空间设置面板的**真实组件渲染**测试（SSR）。
 *
 * 为什么需要这一层：
 * - 「空间设置里看不到销毁按钮」历史缺陷的原因是**父级条件渲染**把整块区域藏掉，
 *   只断言纯函数或源码字符串**无法**证明按钮真的渲染出来；
 * - 项目没有 jsdom / @vue/test-utils / Vitest，无法挂载 DOM 做事件交互；
 * - 这里用 Vite 的 SSR 模块加载器载入真实的 SpaceSettingsPanel.vue 及其子组件
 *   （`@/` 别名、Tailwind class、Element Plus 组件都由 Vite 解析），
 *   再用 vue/server-renderer 渲染成真实 HTML，断言分区结构、展示条件与可访问性属性。
 *
 * 本次信息架构重构后的覆盖范围：
 * - 区域顺序：概览 → 基础信息 → 成员与邀请（插槽）→ 公开与审核 → 内容管理 → 危险操作；
 * - 单人创建者仅有销毁资格时，页面底部的销毁区仍必须渲染（不依赖解绑 / 恢复条件）；
 * - 危险操作不再位于右侧吸顶侧栏：没有 <aside>、没有 lg:sticky；
 * - 恢复独立成卡片且不与销毁混在一起；销毁区为浅色边框 + 危险色按钮；
 * - 双人空间基础信息只读并给出原因，且没有「编辑空间信息」入口；
 * - 冻结 / 归档 / 已销毁 / 已解绑 / 无空间等状态不回归；
 * - 表单标签、错误提示、aria 属性与按钮 disabled / aria-busy 完整。
 */

let serverPromise = null

function getServer() {
  if (!serverPromise) {
    serverPromise = createServer({
      configFile: new URL('../../vite.config.js', import.meta.url).pathname,
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: 'error',
      // Element Plus / popper / 日期选择器是 CJS 依赖，SSR 下必须由 Vite 转译。
      ssr: {
        noExternal: [
          'element-plus',
          '@popperjs/core',
          '@vuepic/vue-datepicker',
          '@vueuse/core',
          'date-fns',
        ],
      },
    })
  }
  return serverPromise
}

test.after(async () => {
  if (!serverPromise) return
  const server = await serverPromise
  await server.close()
  serverPromise = null
})

/** 渲染面板前先清空网络层的副作用：任何 POST 都不应真正发出。 */
function stubAxios(server) {
  return server.ssrLoadModule('/src/axios.js').then((module) => {
    const instance = module.default
    const calls = []
    const originalPost = instance.post
    const originalGet = instance.get
    instance.post = (url, body) => {
      calls.push({ method: 'POST', url, body })
      return Promise.resolve({ data: { success: true, data: null } })
    }
    instance.get = (url) => {
      calls.push({ method: 'GET', url })
      return Promise.resolve({ data: { success: true, data: null } })
    }
    return {
      calls,
      restore() {
        instance.post = originalPost
        instance.get = originalGet
      },
    }
  })
}

/**
 * 把 SpaceSettingsPanel 渲染成 HTML。
 *
 * @param {object} options
 * @param {object|null} options.space 空间状态（写进全局 useFrontendSpace 的 spaceStatus）
 * @param {boolean} [options.withSlot] 是否提供 after-overview 插槽内容
 * @returns {Promise<{ html: string, requests: Array, restore: () => void }>}
 */
async function renderPanel({ space, withSlot = false }) {
  const server = await getServer()
  const axiosStub = await stubAxios(server)
  try {
    const spaceModule = await server.ssrLoadModule('/src/composables/useFrontendSpace.js')
    spaceModule.spaceStatus.value = space
    spaceModule.spaceError.value = ''
    spaceModule.spaceLoading.value = false

    const panel = await server.ssrLoadModule('/src/components/frontend/SpaceSettingsPanel.vue')
    const app = createSSRApp({
      render() {
        return h(
          panel.default,
          null,
          withSlot
            ? { 'after-overview': () => h('section', { id: 'space-invite-partner' }, '邀请另一半加入') }
            : {},
        )
      },
    })
    // 路由链接在测试里用最简单的 <a> 替代，避免引入完整 router。
    app.component('RouterLink', {
      props: { to: { type: [String, Object], default: '' } },
      setup(props, { slots }) {
        const href = typeof props.to === 'string' ? props.to : (props.to?.path || '#')
        return () => h('a', { href }, slots.default ? slots.default() : [])
      },
    })
    app.config.warnHandler = () => {}
    const html = await renderToString(app)
    return { html, requests: axiosStub.calls, restore: axiosStub.restore }
  } catch (error) {
    axiosStub.restore()
    throw error
  }
}

/** 从 HTML 中截取指定 id 开始的一块元素（按配对数量截到对应闭合标签）。 */
function sliceById(html, id, tagName = '') {
  const start = html.indexOf(`id="${id}"`)
  if (start < 0) return ''
  let openStart = html.lastIndexOf('<', start)
  let tag = tagName
  if (!tag) {
    const tagMatch = /^<([a-z]+)/.exec(html.slice(openStart))
    if (!tagMatch) return ''
    tag = tagMatch[1]
  } else {
    // 指定标签时向前回溯到该标签的开头，避免被内层元素干扰。
    openStart = html.lastIndexOf(`<${tag}`, start)
    if (openStart < 0) return ''
  }
  const closer = `</${tag}>`
  let depth = 0
  let index = openStart
  while (index < html.length) {
    const nextOpen = html.indexOf(`<${tag}`, index)
    const nextClose = html.indexOf(closer, index)
    if (nextClose < 0) break
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1
      index = nextOpen + tag.length + 1
      continue
    }
    depth -= 1
    index = nextClose + closer.length
    if (depth === 0) return html.slice(openStart, index)
  }
  return html.slice(openStart)
}

/** 断言元素 a 在元素 b 之前出现（区域顺序）。 */
function assertBefore(html, firstId, secondId, message) {
  const first = html.indexOf(`id="${firstId}"`)
  const second = html.indexOf(`id="${secondId}"`)
  assert.ok(first >= 0, `缺少区域 #${firstId}`)
  assert.ok(second >= 0, `缺少区域 #${secondId}`)
  assert.ok(first < second, message || `#${firstId} 应排在 #${secondId} 之前`)
}

/** 单人创建者、另一半尚未加入的典型空间（历史 bug 的复现场景）。 */
function singleCreatorSpace(overrides = {}) {
  return {
    spaceId: 3001,
    spaceCode: 'LOVE-3001',
    spaceName: '我们的故事',
    description: '只属于两个人的简介',
    status: 0,
    visibility: 0,
    loveStartTime: '2024-05-20 19:30:47',
    memberCount: 1,
    memberLimit: 2,
    currentUserRole: 1,
    creator: true,
    revision: 3,
    members: [{ amourId: 'LY100001', displayName: '创建者' }],
    ...overrides,
  }
}

/** 两名有效成员、创建者视角的空间。 */
function twoMemberSpace(overrides = {}) {
  return {
    spaceId: 3002,
    spaceCode: 'LOVE-3002',
    spaceName: '两个人的故事',
    description: '两个人已经绑定完成',
    status: 1,
    visibility: 0,
    loveStartTime: '2022-02-02 08:08:08',
    memberCount: 2,
    memberLimit: 2,
    currentUserRole: 1,
    creator: true,
    revision: 5,
    members: [
      { amourId: 'LY100001', displayName: '创建者' },
      { amourId: 'LY100002', displayName: '另一半' },
    ],
    ...overrides,
  }
}

// ===================== 1. 单人创建者：销毁入口必须真实渲染 =====================

test('单人创建者：真实渲染出可点击的「销毁并清空空间」按钮', async () => {
  const { html, requests, restore } = await renderPanel({ space: singleCreatorSpace(), withSlot: true })
  try {
    // 1) 危险操作区与销毁入口必须渲染（历史 bug：父级条件漏了 showDestroySection）。
    assert.ok(html.includes('id="space-danger-zone"'), '危险操作区没有渲染出来')
    const destroyHtml = sliceById(html, 'space-destroy')
    assert.ok(destroyHtml.length > 0, '销毁区域 #space-destroy 没有渲染出来')
    assert.match(destroyHtml, /销毁并清空空间/, '销毁区域里没有按钮文案')
    assert.match(destroyHtml, /id="space-destroy-heading"/)
    assert.match(destroyHtml, /id="space-destroy-desc"/)

    // 2) 说明文案必须保留四条关键事实：不可见、留档、不可自行恢复、可联系管理员。
    const desc = sliceById(destroyHtml, 'space-destroy-desc', 'p')
    assert.match(desc, /不可见/, '必须说明销毁后空间及内容不可见')
    assert.match(desc, /留档/, '必须说明数据留档')
    assert.match(desc, /无法自行恢复/, '必须说明用户无法自行恢复')
    assert.match(desc, /管理员/, '必须说明可联系平台管理员协助恢复')

    // 3) 按钮是真实 <button type="button">，不是被禁用状态（canDestroyNow=true 时）。
    const buttonMatch = /<button[^>]*>([\s\S]*?)<\/button>/.exec(destroyHtml)
    assert.ok(buttonMatch, '销毁区域里没有 <button>')
    const buttonTag = buttonMatch[0].slice(0, buttonMatch[0].indexOf('>') + 1)
    assert.match(buttonTag, /type="button"/)
    assert.doesNotMatch(buttonTag, /\sdisabled(\s|>|=)/, '单人创建者场景下销毁按钮不应被禁用')
    assert.match(buttonTag, /aria-describedby="space-destroy-desc"/)

    // 4) 展示条件之间相互独立：销毁入口不依赖解绑/恢复区域。
    assert.ok(!html.includes('id="space-unbind"'), '另一半未加入时不该渲染解绑入口')
    assert.ok(!html.includes('id="space-restore"'), '等待绑定空间不该渲染恢复入口')

    // 5) 该场景下不能出现「另一半已加入」这类禁用原因文案。
    assert.doesNotMatch(html, /另一半已加入，不能再销毁空间/)
    assert.doesNotMatch(html, /只有空间创建者才能销毁空间/)

    // 6) 渲染期间不许发任何请求（面板只读渲染，销毁必须由用户点击触发）。
    assert.deepEqual(requests, [])
  } finally {
    restore()
  }
})

test('单人创建者：危险操作区仍在，但整块位于日常设置之后', async () => {
  const { html, restore } = await renderPanel({ space: singleCreatorSpace(), withSlot: true })
  try {
    assert.ok(html.includes('id="space-invite-partner"'), '邀请区插槽内容必须照常渲染')
    assert.ok(html.includes('id="space-destroy"'), '销毁区必须与邀请区同时渲染')
    // 区域顺序：概览 → 基础信息 → 邀请 → 公开与审核 → 内容管理 → 危险操作。
    assertBefore(html, 'space-overview', 'space-basic-info')
    assertBefore(html, 'space-basic-info', 'space-invite-partner')
    assertBefore(html, 'space-invite-partner', 'space-visibility')
    assertBefore(html, 'space-visibility', 'space-content-entry')
    assertBefore(html, 'space-content-entry', 'space-danger-zone')
    assertBefore(html, 'space-danger-zone', 'space-destroy', '销毁入口必须位于页面底部的危险操作区')
  } finally {
    restore()
  }
})

test('危险操作区不再使用右侧吸顶侧栏', async () => {
  const { html, restore } = await renderPanel({ space: singleCreatorSpace() })
  try {
    // 不能出现 <aside> 侧栏，也不能有 sticky 定位（避免覆盖表单或形成空侧栏）。
    assert.ok(!html.includes('<aside'), '危险操作不应再放在 <aside> 侧栏里')
    assert.doesNotMatch(html, /lg:sticky/)
    assert.doesNotMatch(html, /lg:top-24/)
    // 只有一个内容列：不再出现「内容 + 20rem 侧栏」的栅格。
    assert.doesNotMatch(html, /lg:grid-cols-\[minmax\(0,1fr\)_20rem\]/)
    // 销毁按钮不使用 w-full 铺满整列侧栏，而是右侧操作位（窄屏纵向堆叠）。
    const destroyHtml = sliceById(html, 'space-destroy')
    assert.doesNotMatch(destroyHtml, /whitespace-nowrap/, '窄屏不允许强制不换行')
    assert.match(destroyHtml, /flex-col/, '窄屏必须自然纵向排列')
    assert.match(destroyHtml, /sm:flex-row/, '桌面端采用左侧说明 + 右侧操作按钮')
  } finally {
    restore()
  }
})

test('销毁区使用克制的浅色边框与危险色按钮，不使用大面积高饱和红色', async () => {
  const { html, restore } = await renderPanel({ space: singleCreatorSpace() })
  try {
    const destroyHtml = sliceById(html, 'space-destroy')
    // 浅色边框 + 浅底（rose-200/80 + rose-50/40），不是 bg-rose-600 这类大面积高饱和铺色。
    assert.match(destroyHtml, /border-rose-200\/80/)
    assert.match(destroyHtml, /bg-rose-50\/40/)
    assert.doesNotMatch(destroyHtml, /bg-rose-600|bg-rose-700/)
    // 按钮沿用全局 btn-danger（白底 + 危险色文字与边框）。
    const buttonTag = /<button[^>]*>/.exec(destroyHtml)?.[0] || ''
    assert.match(buttonTag, /btn-danger/)
  } finally {
    restore()
  }
})

test('旧版单人正常状态（status=1 但只有一名成员）同样能看到销毁入口', async () => {
  const { html, restore } = await renderPanel({
    space: singleCreatorSpace({ status: 1, memberCount: 1 }),
  })
  try {
    assert.ok(html.includes('id="space-destroy"'), '历史上单人正常状态也允许销毁')
    assert.match(html, /销毁并清空空间/)
  } finally {
    restore()
  }
})

test('存在待处理解绑申请时展示入口但禁用，并给出可用原因', async () => {
  const { html, restore } = await renderPanel({
    space: singleCreatorSpace({ unbindPending: true, unbindRequestedByMe: true }),
  })
  try {
    const destroyHtml = sliceById(html, 'space-destroy')
    assert.ok(destroyHtml.length > 0, '入口展示由 showDestroySection 控制，仍需渲染')
    const buttonTag = /<button[^>]*>/.exec(destroyHtml)?.[0] || ''
    // 注意不能写成 /disabled/：Tailwind 的 disabled:cursor-not-allowed 类名会被误匹配。
    assert.match(buttonTag, /\sdisabled(\s|>|=)/, '不可提交时必须禁用按钮')
    assert.match(destroyHtml, /存在待处理的解绑申请，请先处理/, '禁用原因必须展示')
  } finally {
    restore()
  }
})

// ===================== 2. 基础信息分组 =====================

test('等待绑定且符合规则时展示基础信息摘要与「编辑空间信息」入口', async () => {
  const { html, restore } = await renderPanel({ space: singleCreatorSpace() })
  try {
    const basicHtml = sliceById(html, 'space-basic-info')
    assert.ok(basicHtml.length > 0, '基础信息区域必须渲染')
    assert.match(basicHtml, /id="space-basic-info-heading"/)
    // 默认展示只读摘要（名称、简介、恋爱开始时间），而不是常驻表单。
    assert.match(basicHtml, /我们的故事/)
    assert.match(basicHtml, /只属于两个人的简介/)
    assert.match(basicHtml, /2024\.05\.20 19:30/)
    assert.match(basicHtml, /<button[^>]*>\s*编辑空间信息/, '必须提供编辑按钮')
    // 摘要态不渲染输入控件。
    assert.doesNotMatch(basicHtml, /id="space-basic-info-name"/)
  } finally {
    restore()
  }
})

test('基础信息编辑入口与内容编辑入口使用不同名称，避免混淆', async () => {
  const { html, restore } = await renderPanel({ space: singleCreatorSpace() })
  try {
    const basicHtml = sliceById(html, 'space-basic-info')
    const contentHtml = sliceById(html, 'space-content-entry')
    assert.match(basicHtml, /编辑空间信息/, '基础信息入口文案')
    assert.match(contentHtml, /去内容编辑/, '内容管理入口文案')
    assert.ok(!contentHtml.includes('编辑空间信息'), '内容入口不能使用与基础信息相同的文案')
    assert.ok(!basicHtml.includes('去内容编辑'), '基础信息入口不能使用内容编辑文案')
    assert.match(contentHtml, /\/space\/studio/, '内容入口必须仍指向空间内容编辑页')
  } finally {
    restore()
  }
})

test('双人空间：基础信息只读并给出原因，不出现可执行编辑入口', async () => {
  const { html, restore } = await renderPanel({ space: twoMemberSpace() })
  try {
    const basicHtml = sliceById(html, 'space-basic-info')
    assert.ok(basicHtml.length > 0, '双人空间仍要展示基础信息摘要')
    assert.doesNotMatch(basicHtml, /<button[^>]*>\s*编辑空间信息/, '另一半已加入时不得出现编辑按钮')
    assert.match(basicHtml, /另一半已经加入/, '必须说明为什么不能修改')
    assert.match(basicHtml, /不能再修改/)
    assert.doesNotMatch(basicHtml, /id="space-basic-info-name"/, '只读态不得渲染表单')
  } finally {
    restore()
  }
})

// ===================== 3. 非创建者 / 双人空间：危险入口 =====================

test('非创建者：不会渲染可执行的销毁入口', async () => {
  const { html, restore } = await renderPanel({
    space: singleCreatorSpace({ creator: false, currentUserRole: 2 }),
  })
  try {
    assert.ok(!html.includes('id="space-destroy"'), '非创建者不得看到销毁区域')
    // 单人空间没有另一名成员，解绑也不出现，整块危险区都不应渲染。
    assert.ok(!html.includes('id="space-danger-zone"'), '没有可执行危险操作时不应保留空区域')
  } finally {
    restore()
  }
})

test('两名有效成员：不出现销毁入口，解绑区域正常渲染', async () => {
  const { html, restore } = await renderPanel({ space: twoMemberSpace() })
  try {
    assert.ok(!html.includes('id="space-destroy"'), '另一半已加入时不得出现销毁区域')
    assert.doesNotMatch(html, /销毁并清空空间/)

    const unbindHtml = sliceById(html, 'space-unbind')
    assert.ok(unbindHtml.length > 0, '双人空间的解绑区域必须照常渲染')
    assert.match(unbindHtml, /申请解绑/)
    const unbindButton = /<button[^>]*>\s*申请解绑/.exec(unbindHtml)
    assert.ok(unbindButton, '解绑按钮必须渲染')
    assert.doesNotMatch(unbindButton[0].slice(0, unbindButton[0].indexOf('>') + 1), /\sdisabled(\s|>|=)/)
    // 危险区仍在（解绑属于危险操作），且位于日常设置之后。
    assertBefore(html, 'space-content-entry', 'space-danger-zone')
  } finally {
    restore()
  }
})

test('另一半已加入但状态未刷新（memberCount=2, status=0）：销毁入口隐藏，解绑可用', async () => {
  const { html, restore } = await renderPanel({
    space: twoMemberSpace({ status: 0 }),
  })
  try {
    assert.ok(!html.includes('id="space-destroy"'))
    assert.ok(html.includes('id="space-unbind"'))
  } finally {
    restore()
  }
})

// ===================== 4. 冻结 / 归档：恢复区域与禁用规则 =====================

test('冻结空间：恢复区域独立渲染，销毁入口不出现', async () => {
  const { html, restore } = await renderPanel({
    space: twoMemberSpace({ status: 2, visibility: 0 }),
  })
  try {
    assert.ok(html.includes('id="space-restore"'), '冻结空间必须展示恢复区域')
    assert.match(html, /id="space-restore-heading"/)
    assert.match(html, /确认恢复空间/)
    assert.ok(!html.includes('id="space-destroy"'), '冻结空间不得出现销毁入口')
    // 恢复与销毁是两个独立卡片：恢复卡片内不含销毁文案。
    const restoreHtml = sliceById(html, 'space-restore')
    assert.doesNotMatch(restoreHtml, /销毁并清空空间/)
    assert.match(restoreHtml, /border-stone-200/, '恢复使用中性视觉层级，不使用危险色')
  } finally {
    restore()
  }
})

test('归档空间：恢复区域正常渲染，恢复按钮可用', async () => {
  const { html, restore } = await renderPanel({
    space: twoMemberSpace({ status: 3, visibility: 0 }),
  })
  try {
    const restoreHtml = sliceById(html, 'space-restore')
    assert.ok(restoreHtml.length > 0)
    assert.match(html, /已确认 \d+ \/ \d+ 人/)
    assert.ok(!html.includes('id="space-destroy"'))
  } finally {
    restore()
  }
})

test('单人创建者的冻结空间：展示销毁入口但禁用并给出原因（不绕过状态规则）', async () => {
  const { html, restore } = await renderPanel({
    space: singleCreatorSpace({ status: 2 }),
  })
  try {
    const destroyHtml = sliceById(html, 'space-destroy')
    assert.ok(destroyHtml.length > 0, 'showDestroySection 只控制入口展示，冻结时仍应可见')
    assert.match(destroyHtml, /冻结或归档的空间不能直接销毁/, '必须展示禁用原因')
    const buttonTag = /<button[^>]*>/.exec(destroyHtml)?.[0] || ''
    assert.match(buttonTag, /\sdisabled(\s|>|=)/, '冻结空间不得允许提交销毁')
    // 冻结区域本身仍按原规则展示恢复入口。
    assert.match(html, /id="space-restore"/)
  } finally {
    restore()
  }
})

// ===================== 5. 终态 / 无空间：不展示失效的操作 =====================

test('已销毁空间（status=6）：面板不渲染任何空间生命周期操作', async () => {
  const { html, restore } = await renderPanel({
    space: singleCreatorSpace({ status: 6, memberCount: 0, currentUserRole: null }),
  })
  try {
    const hasAnyLifecycle = html.includes('id="space-destroy"')
      || html.includes('id="space-unbind"')
      || html.includes('id="space-restore"')
    assert.ok(!hasAnyLifecycle, '已销毁空间不能出现销毁/解绑/恢复入口')
    assert.ok(!html.includes('id="space-danger-zone"'), '没有危险操作时不应保留空区域')
  } finally {
    restore()
  }
})

test('已解绑空间（status=5）：面板不展示销毁/解绑/恢复入口', async () => {
  const { html, restore } = await renderPanel({
    space: singleCreatorSpace({ status: 5, memberCount: 0, currentUserRole: null }),
  })
  try {
    assert.ok(!html.includes('id="space-destroy"'), '已解绑空间不得出现销毁入口')
    assert.ok(!html.includes('id="space-unbind"'), '已解绑空间不得出现解绑入口')
    assert.ok(!html.includes('id="space-restore"'), '已解绑空间不得出现恢复入口')
  } finally {
    restore()
  }
})

test('冻结 / 归档空间不出现基础信息编辑入口', async () => {
  for (const status of [2, 3]) {
    const { html, restore } = await renderPanel({ space: twoMemberSpace({ status, visibility: 0 }) })
    try {
      const basicHtml = sliceById(html, 'space-basic-info')
      assert.ok(basicHtml.length > 0, `status=${status} 仍要展示基础信息`)
      assert.doesNotMatch(basicHtml, /<button[^>]*>\s*编辑空间信息/, `status=${status} 不得出现编辑按钮`)
      assert.match(basicHtml, /冻结或归档的空间需先恢复/, `status=${status} 必须给出原因`)
    } finally {
      restore()
    }
  }
})

test('没有空间时设置面板本身不渲染（父页面 showSpacePanel 守卫）', async () => {
  // SpaceSettingsPanel 假定 spaceStatus 非空；
  // 因此「没有空间」必须由父页面 SpaceSetupPage 的 showSpacePanel = hasLiveSpace() 拦在外面。
  const { readFile } = await import('node:fs/promises')
  const setupPage = await readFile(new URL('../pages/frontend/SpaceSetupPage.vue', import.meta.url), 'utf8')
  assert.match(setupPage, /const showSpacePanel = computed\(\(\) => hasLiveSpace\(spaceStatus\.value\)\)/)
  assert.match(setupPage, /<SpaceSettingsPanel v-else-if="showSpacePanel"/)
  // hasLiveSpace 必须排除 status=5 / status=6。
  const spaceState = await readFile(new URL('./spaceState.js', import.meta.url), 'utf8')
  assert.match(spaceState, /export function hasLiveSpace/)
  assert.match(spaceState, /!isUnboundSpace\(spaceStatus\)/)
  assert.match(spaceState, /!isDestroyedSpace\(spaceStatus\)/)
})

// ===================== 6. 可访问性与窄屏防护 =====================

test('概览保留名称、状态、成员、必要时间与刷新入口，且不重复大段说明', async () => {
  const { html, restore } = await renderPanel({ space: singleCreatorSpace() })
  try {
    const overviewHtml = sliceById(html, 'space-overview')
    assert.match(overviewHtml, /id="space-settings-summary"/)
    assert.match(overviewHtml, /等待绑定/, '必须展示状态')
    assert.match(overviewHtml, /成员/)
    assert.match(overviewHtml, /刷新状态/, '必须保留刷新入口')
    assert.match(overviewHtml, /恋爱开始/)
    assert.match(overviewHtml, /待接受邀请/)
    // 概览不再使用四格卡片（原来会挤占首屏）。
    assert.doesNotMatch(overviewHtml, /sm:grid-cols-2 lg:grid-cols-4/)
    // 名称必须允许换行，长空间名不能溢出。
    assert.match(overviewHtml, /break-words/)
  } finally {
    restore()
  }
})

test('危险操作区与销毁按钮具备完整可访问性属性', async () => {
  const { html, restore } = await renderPanel({ space: singleCreatorSpace() })
  try {
    assert.match(html, /id="space-danger-zone-heading"/)
    const destroyHtml = sliceById(html, 'space-destroy')
    // 标题通过 aria-labelledby 关联，按钮禁用原因通过 aria-describedby 关联。
    assert.match(destroyHtml, /aria-labelledby="space-destroy-heading"/)
    assert.match(destroyHtml, /aria-describedby="space-destroy-desc"/)
    assert.match(destroyHtml, /aria-busy="false"/)
    // 危险区标题使用二级标题语义（页面主标题是 h1）。
    assert.match(html, /<h2[^>]*id="space-danger-zone-heading"/)
  } finally {
    restore()
  }
})

test('概览中的刷新按钮禁用态带 aria-busy，长错误提示可换行', async () => {
  const server = await getServer()
  const axiosStub = await stubAxios(server)
  try {
    const spaceModule = await server.ssrLoadModule('/src/composables/useFrontendSpace.js')
    spaceModule.spaceStatus.value = singleCreatorSpace()
    spaceModule.spaceError.value = '网络连接不稳定，请稍后重试'
    spaceModule.spaceLoading.value = true
    const panel = await server.ssrLoadModule('/src/components/frontend/SpaceSettingsPanel.vue')
    const app = createSSRApp({ render: () => h(panel.default) })
    app.component('RouterLink', {
      props: { to: { type: [String, Object], default: '' } },
      setup: () => () => h('a'),
    })
    app.config.warnHandler = () => {}
    const html = await renderToString(app)
    assert.match(html, /aria-busy="true"/, '加载中必须标记 aria-busy')
    assert.match(html, /刷新中…/)
    assert.match(html, /空间状态刷新失败：网络连接不稳定/)
    // 长错误提示位于带 role="status" 的块里，并允许换行（不强制 nowrap）。
    const errorBlock = /空间状态刷新失败[\s\S]{0,200}?<\/p>/.exec(html)?.[0] || ''
    assert.match(errorBlock, /空间状态刷新失败/)
    assert.doesNotMatch(errorBlock, /whitespace-nowrap/)
  } finally {
    axiosStub.restore()
    const spaceModule = await server.ssrLoadModule('/src/composables/useFrontendSpace.js')
    spaceModule.spaceError.value = ''
    spaceModule.spaceLoading.value = false
  }
})

test('成员卡片只在两名成员都加入时出现，等待绑定不重复「成员与邀请」分组', async () => {
  const single = await renderPanel({ space: singleCreatorSpace(), withSlot: true })
  try {
    assert.ok(!single.html.includes('id="space-members"'), '等待绑定时不应再补一张只含自己的成员卡')
    // 「成员与邀请」在等待绑定时由父页面插槽（真实邀请区）承担，面板不再自己补成员卡。
    const { readFile } = await import('node:fs/promises')
    const setupPage = await readFile(new URL('../pages/frontend/SpaceSetupPage.vue', import.meta.url), 'utf8')
    assert.match(setupPage, /<p class="section-kicker">成员与邀请<\/p>/, '邀请区承担「成员与邀请」分组标题')
  } finally {
    single.restore()
  }
  const two = await renderPanel({ space: twoMemberSpace() })
  try {
    assert.ok(two.html.includes('id="space-members"'), '双人空间应展示成员卡片')
    assert.match(two.html, /两位成员都已加入/)
    assert.match(two.html, /另一半/)
  } finally {
    two.restore()
  }
})

test('基础信息表单具备完整的标签、错误容器与输入约束', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(
    new URL('../components/frontend/space-settings/SpaceBasicInfoSection.vue', import.meta.url),
    'utf8',
  )
  // 每个输入都有显式 label（for/id 对应），不依赖占位符。
  assert.match(source, /<label for="space-basic-info-name"/)
  assert.match(source, /id="space-basic-info-name"/)
  assert.match(source, /<label for="space-basic-info-love-start"/)
  assert.match(source, /input-id="space-basic-info-love-start"/)
  assert.match(source, /<label for="space-basic-info-description"/)
  assert.match(source, /id="space-basic-info-description"/)
  // 长度限制与后端一致。
  assert.match(source, /:maxlength="SPACE_NAME_MAX_LENGTH"/)
  assert.match(source, /:maxlength="DESCRIPTION_MAX_LENGTH"/)
  // 错误提示使用 role="alert"，保存按钮有 aria-busy，禁用态与提交锁联动。
  assert.match(source, /role="alert"/)
  assert.match(source, /:aria-busy="saving \? 'true' : 'false'"/)
  assert.match(source, /:disabled="busy \|\| locked"/)
  // 焦点可见样式沿用全局 field-input（focus:ring），不在本地关闭 outline。
  const mainCss = await readFile(new URL('../assets/main.css', import.meta.url), 'utf8')
  assert.match(mainCss, /\.field-input[\s\S]*?focus:border-rose-400/)
  assert.match(mainCss, /\.field-input[\s\S]*?focus:ring-2/)
})

test('保存成功但同步失败：保留草稿与编辑态，提示中不含「保存失败」', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(
    new URL('../components/frontend/space-settings/SpaceBasicInfoSection.vue', import.meta.url),
    'utf8',
  )
  // 同步失败提示必须在表单外层，退出编辑态后仍可见。
  const noticeIndex = source.indexOf('v-if="syncNotice"')
  const formCloseIndex = source.indexOf('</form>')
  assert.ok(noticeIndex > formCloseIndex, '同步失败提示必须渲染在 </form> 之后')
  assert.match(source, /空间信息已保存，但状态同步失败/)
  assert.doesNotMatch(source, /保存失败，但状态同步/)
  // 失败分支不退出编辑态：不清空用户输入。
  const submitBlock = source.slice(source.indexOf('async function submit()'))
  const syncFailIndex = submitBlock.indexOf('空间信息已保存，但状态同步失败')
  assert.ok(syncFailIndex > -1)
  // 只看 syncNotice 所在的 else 分支：成功分支的 editing=false 不算。
  const elseIndex = submitBlock.lastIndexOf('} else {', syncFailIndex)
  assert.ok(elseIndex > -1, '同步失败分支必须位于 else 中')
  assert.doesNotMatch(
    submitBlock.slice(elseIndex, syncFailIndex),
    /editing\.value = false/,
    '同步失败时不能退出编辑态（否则丢弃草稿）',
  )
  // 重试入口只刷新状态，不重新提交更新。
  const retryBlock = source.slice(source.indexOf('async function retrySync()'), source.indexOf('async function submit()'))
  assert.match(retryBlock, /refreshSpaceStatusAfterLifecycleAction/)
  assert.doesNotMatch(retryBlock, /updateCoupleSpace/)
})
