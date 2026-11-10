<template>
  <div class="admin-login-shell flex min-h-screen flex-col font-sans">
    <main class="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
      <div class="login-card relative flex w-full max-w-5xl overflow-hidden rounded-3xl lg:min-h-[600px]">
        <section class="login-brand-pane hidden w-[46%] flex-col justify-between p-10 lg:flex" aria-label="品牌介绍">
          <div>
            <div class="flex items-center gap-3">
              <span class="login-logo flex h-11 w-11 items-center justify-center rounded-2xl" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6">
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span class="font-display text-lg font-semibold tracking-wide text-stone-900">恋语间</span>
            </div>
            <p class="mt-20 text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Admin Console</p>
            <h2 class="mt-4 max-w-[22rem] text-3xl font-semibold leading-snug tracking-tight text-stone-900">让每一段被分享的故事，<br>都被认真守护。</h2>
            <p class="mt-5 max-w-sm text-sm leading-7 text-stone-600">在这里查看情侣空间状态、处理内容举报，并在必要时留痕处置违规内容。</p>
          </div>
          <div class="flex items-center gap-2 text-xs text-stone-500">
            <span class="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            内容空间安全运行中
          </div>
        </section>

        <section class="login-form-pane w-full p-7 sm:p-10 lg:w-[54%] lg:p-14" aria-label="管理员登录">
          <div class="mx-auto max-w-md">
            <div class="flex items-center gap-3 lg:hidden">
              <span class="login-logo flex h-10 w-10 items-center justify-center rounded-xl" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" class="h-[21px] w-[21px]">
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span class="font-display text-base font-semibold tracking-wide text-stone-900">恋语间</span>
            </div>
            <div class="mt-8 lg:mt-5">
              <p class="text-[11px] font-semibold tracking-[0.18em] text-rose-700">管理员登录</p>
              <h1 class="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">欢迎回到管理后台</h1>
              <p class="mt-2 text-sm leading-6 text-stone-500">登录后查看空间状态、内容举报与治理记录。</p>
            </div>
            <p v-if="sessionExpired" class="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800" role="alert">
              登录已过期，请重新登录。
            </p>

            <form class="mt-8 space-y-5" @submit.prevent="onSubmit">
              <div>
                <label class="mb-2 block text-xs font-semibold text-stone-700" for="admin-username">用户名</label>
                <input id="admin-username" v-model="username" type="text" name="username" autocomplete="username" class="login-input" placeholder="输入用户名">
              </div>
              <div>
                <label class="mb-2 block text-xs font-semibold text-stone-700" for="admin-password">密码</label>
                <div class="relative">
                  <input id="admin-password" v-model="password" type="password" name="password" autocomplete="current-password" class="login-input login-input--password" placeholder="输入密码">
                  <Lock class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </div>
              <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700" role="alert">{{ error }}</p>
              <p v-if="!apiReady" class="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
                接口地址配置无效，请检查 <code class="rounded bg-amber-100 px-1 py-0.5 text-amber-900">VITE_API_BASE_URL</code>。
              </p>
              <button type="submit" class="login-submit flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60" :disabled="loading">
                {{ loading ? '登录中…' : '进入管理后台' }}
                <ArrowRight v-if="!loading" class="h-4 w-4" />
              </button>
            </form>

            <p class="mt-7 text-center">
              <RouterLink to="/" class="login-link text-sm underline-offset-2 transition hover:underline">返回前台首页</RouterLink>
            </p>
          </div>
        </section>
      </div>
    </main>
    <footer class="px-4 py-6 text-center text-xs text-stone-500">
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" class="transition hover:text-rose-700 hover:underline">浙ICP备2026073792号</a>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ArrowRight, Lock } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { adminLogin, isApiReachableConfigured } from '@/utils/adminApi.js'
import { clearAdminSession, sanitizeAdminRedirect, setAdminPermissions } from '@/utils/adminAuth.js'
import { fetchAdminPermissions } from '@/api/admin/auth'

const route = useRoute()
const router = useRouter()

const sessionExpired = computed(() => route.query.expired === '1')

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const apiReady = computed(() => isApiReachableConfigured())

async function onSubmit() {
  error.value = ''
  if (!username.value.trim()) {
    error.value = '请输入用户名。'
    return
  }
  if (!password.value) {
    error.value = '请输入密码。'
    return
  }
  loading.value = true
  try {
    await adminLogin(username.value.trim(), password.value)
    const { data } = await fetchAdminPermissions()
    if (!data?.success || !Array.isArray(data.data?.permissions)) {
      throw new Error(data?.message || '管理员权限加载失败')
    }
    setAdminPermissions(data.data.permissions)
    const next = sanitizeAdminRedirect(
      typeof route.query.redirect === 'string' ? route.query.redirect : '',
    )
    router.replace(next)
  } catch (e) {
    clearAdminSession()
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    password.value = ''
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login-shell {
  background: var(--admin-canvas);
  color: var(--admin-text);
}

.login-card {
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  box-shadow: 0 28px 70px -42px rgba(28, 25, 23, 0.35);
}

.login-brand-pane {
  border-right: 1px solid var(--admin-border);
  background: var(--admin-brand-wash);
}

.login-form-pane {
  background: var(--admin-surface);
}

.login-logo {
  background: var(--admin-brand-soft);
  color: var(--admin-brand-strong);
  box-shadow: inset 0 0 0 1px var(--admin-brand-soft-border);
}

.login-input {
  width: 100%;
  min-height: 46px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--admin-border-strong);
  border-radius: 12px;
  background: var(--admin-surface);
  color: var(--admin-text);
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.login-input::placeholder {
  color: var(--admin-text-placeholder);
}

.login-input:hover {
  border-color: var(--admin-border-hover);
}

.login-input:focus {
  border-color: var(--admin-brand);
  box-shadow: 0 0 0 3px var(--admin-focus-ring);
}

.login-input:disabled {
  cursor: not-allowed;
  background: var(--admin-surface-sunken);
  color: var(--admin-text-muted);
}

.login-input--password {
  padding-right: 2.75rem;
}

.login-submit {
  background: var(--admin-brand);
  box-shadow: 0 1px 2px rgba(28, 25, 23, 0.08);
}

.login-submit:hover:not(:disabled) {
  background: var(--admin-brand-strong);
}

.login-submit:focus-visible {
  outline: 2px solid var(--admin-brand-strong);
  outline-offset: 2px;
}

.login-link {
  color: var(--admin-text-muted);
}

.login-link:hover {
  color: var(--admin-brand-strong);
}

.login-link:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--admin-brand-soft-border);
  outline-offset: 2px;
}
</style>
