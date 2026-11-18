/**
 * 管理台组件的轻量渲染辅助（仅测试使用）。
 *
 * 项目没有引入 @vue/test-utils / jsdom，这里用 Vite 的 SSR 模块加载 + Vue 的
 * renderToString 真实渲染 .vue 单文件组件，验证模板输出而不是复制模板逻辑。
 * 只执行 setup 与渲染，不依赖浏览器 API。
 */
import { createServer } from 'vite'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, h } from 'vue'

let serverPromise = null

function getServer() {
  if (!serverPromise) {
    serverPromise = createServer({
      configFile: new URL('../../vite.config.js', import.meta.url).pathname,
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: 'error',
    })
  }
  return serverPromise
}

/**
 * 渲染一个单文件组件并返回 HTML 字符串。
 *
 * @param {string} modulePath 以 / 开头的项目内路径，例如 /src/components/admin/X.vue
 * @param {object} props 组件 props
 */
export async function renderComponent(modulePath, props = {}) {
  const server = await getServer()
  const module = await server.ssrLoadModule(modulePath)
  const component = module.default
  const app = createSSRApp({
    render: () => h(component, props),
  })
  return renderToString(app)
}

export async function closeRenderer() {
  if (!serverPromise) return
  const server = await serverPromise
  await server.close()
  serverPromise = null
}
