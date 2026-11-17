/**
 * 测试专用模块解析钩子。
 *
 * 小程序源码里以 CommonJS 风格书写相对路径（例如 '../../utils/request'），
 * Node 的 ESM 加载器不会自动补 .ts / .js 后缀。
 * 这里只在测试进程补上解析规则，不修改生产代码。
 */
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'

function isRelative(specifier) {
  return specifier.startsWith('./') || specifier.startsWith('../')
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!isRelative(specifier) || !context.parentURL) {
      return nextResolve(specifier, context)
    }
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (!error || error.code !== 'ERR_MODULE_NOT_FOUND') throw error
      const base = dirname(fileURLToPath(context.parentURL))
      const candidates = [
        resolvePath(base, `${specifier}.ts`),
        resolvePath(base, `${specifier}.js`),
        resolvePath(base, specifier, 'index.ts'),
        resolvePath(base, specifier, 'index.js'),
      ]
      for (const candidate of candidates) {
        if (!existsSync(candidate)) continue
        return { url: pathToFileURL(candidate).href, shortCircuit: true }
      }
      throw error
    }
  },
})
