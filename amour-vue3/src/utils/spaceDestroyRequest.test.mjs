import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

/**
 * 运行：npm run test:space-settings（或 node --test src/utils/spaceDestroyRequest.test.mjs）
 *
 * 覆盖 `destroyCoupleSpace(space)` 的请求体契约。
 *
 * 项目没有 jsdom / Vitest，也没有 mock axios 的先例；这里用 Vite 的 SSR 模块加载
 * 载入真实的 `src/api/space.js`（`@/` 别名与 `import.meta.env` 都由 Vite 解析），
 * 再把 `src/axios.js` 默认导出的实例上的 post 换成记录器，
 * 直接断言「真正发出去的请求体」，而不是对源码做正则匹配。
 */

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
 * 调用真实的 space API，返回它发出的所有请求。
 *
 * @param {(spaceApi: object) => Promise<unknown>} run
 * @returns {Promise<Array<{ url: string, body: unknown }>>}
 */
async function captureRequests(run) {
  const server = await getServer()
  const axiosModule = await server.ssrLoadModule('/src/axios.js')
  const instance = axiosModule.default
  const calls = []
  const originalPost = instance.post
  instance.post = (url, body) => {
    calls.push({ url, body })
    return Promise.resolve({ data: { success: true, data: null } })
  }
  try {
    const spaceApi = await server.ssrLoadModule('/src/api/space.js')
    await run(spaceApi)
    return calls
  } finally {
    instance.post = originalPost
  }
}

test.after(async () => {
  if (!serverPromise) return
  const server = await serverPromise
  await server.close()
  serverPromise = null
})

test('销毁请求把当前空间的 spaceId 放进请求体', async () => {
  const calls = await captureRequests(api => api.destroyCoupleSpace({
    spaceId: 3001,
    spaceName: '我们的故事',
    status: 0,
    memberCount: 1,
  }))

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/space/destroy')
  assert.deepEqual(calls[0].body, { spaceId: 3001 })
})

test('数字字符串 spaceId 会被转成数字，不是原样透传', async () => {
  const calls = await captureRequests(api => api.destroyCoupleSpace({ spaceId: '3002' }))
  assert.deepEqual(calls[0].body, { spaceId: 3002 })
  assert.equal(typeof calls[0].body.spaceId, 'number')
})

test('拿到 revision 时一并发送 expectedRevision', async () => {
  const calls = await captureRequests(api => api.destroyCoupleSpace({
    spaceId: 3003,
    revision: 7,
  }))
  assert.deepEqual(calls[0].body, { spaceId: 3003, expectedRevision: 7 })
})

test('revision 不是数字时不发送 expectedRevision（旧后端 VO 没有该字段）', async () => {
  // '' / null / NaN 都会被 Number() 静默转成 0，传出去会把 revision>0 的空间误判成「已变化」。
  for (const revision of [undefined, null, '', 'abc', NaN, {}, [], -1, 1.5]) {
    const calls = await captureRequests(api => api.destroyCoupleSpace({ spaceId: 3004, revision }))
    assert.deepEqual(calls[0].body, { spaceId: 3004 }, JSON.stringify(revision))
  }
})

test('纯数字字符串 revision 视为有效版本号', async () => {
  const calls = await captureRequests(api => api.destroyCoupleSpace({ spaceId: 3006, revision: '3' }))
  assert.deepEqual(calls[0].body, { spaceId: 3006, expectedRevision: 3 })
})

test('revision=0 是合法版本号，必须发送', async () => {
  const calls = await captureRequests(api => api.destroyCoupleSpace({ spaceId: 3007, revision: 0 }))
  assert.deepEqual(calls[0].body, { spaceId: 3007, expectedRevision: 0 })
})

test('参数缺失时退化为空对象，保持与旧版无请求体的后端兼容', async () => {
  const cases = [undefined, null, {}, { spaceId: null }, { spaceId: '' }, { spaceId: 0 }, { spaceId: -1 }]
  for (const space of cases) {
    const calls = await captureRequests(api => api.destroyCoupleSpace(space))
    assert.equal(calls[0].url, '/space/destroy')
    // 不能出现 NaN / null / 0 这类会被后端当成「绑定了某个空间」的脏值。
    assert.deepEqual(calls[0].body, {}, JSON.stringify(space))
  }
})

test('请求体只包含 spaceId / expectedRevision，不透传空间对象其它字段', async () => {
  const calls = await captureRequests(api => api.destroyCoupleSpace({
    spaceId: 3005,
    revision: 2,
    spaceName: '秘密空间',
    description: '不应外发',
    members: [{ userId: 1 }],
    creator: true,
    visibility: 1,
  }))
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['expectedRevision', 'spaceId'])
})
