<template>
  <div class="admin-login-shell flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 font-sans sm:px-6">
    <div class="relative flex w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/40 backdrop-blur-xl lg:min-h-[600px]">
      <div class="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 p-10 lg:flex">
        <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[32px] border-white/10" />
        <div class="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[48px] border-white/[0.06]" />
        <div class="relative">
          <div class="flex items-center gap-3">
            <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold text-white ring-1 ring-white/20">A</span>
            <span class="text-lg font-semibold tracking-wide text-white">Amour</span>
          </div>
          <p class="mt-20 text-xs font-semibold uppercase tracking-[0.24em] text-rose-100/75">Your little universe</p>
          <h2 class="mt-4 max-w-xs text-4xl font-semibold leading-tight tracking-tight text-white">把每个值得记住的瞬间，认真收藏。</h2>
          <p class="mt-5 max-w-sm text-sm leading-7 text-rose-100/80">在这里整理故事、照片与纪念日，让属于你们的时间线持续生长。</p>
        </div>
        <div class="relative flex items-center gap-2 text-xs text-rose-100/70">
          <span class="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)]" />
          内容空间安全运行中
        </div>
      </div>

      <div class="w-full p-7 sm:p-10 lg:w-[54%] lg:p-14">
        <div class="mx-auto max-w-md">
          <div class="flex items-center gap-3 lg:hidden">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-sm font-bold text-white">A</span>
            <span class="text-base font-semibold tracking-wide text-white">Amour</span>
          </div>
          <div class="mt-8 lg:mt-5">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">Content studio</p>
            <h1 class="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">欢迎回到管理后台</h1>
            <p class="mt-2 text-sm leading-6 text-slate-400">登录后继续管理你们的专属内容。</p>
          </div>
          <p v-if="sessionExpired" class="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-300" role="alert">
            登录已过期，请重新登录。
          </p>

          <form class="mt-8 space-y-5" @submit.prevent="onSubmit">
            <div>
              <label class="mb-2 block text-xs font-semibold text-slate-300" for="admin-username">用户名</label>
              <input id="admin-username" v-model="username" type="text" name="username" autocomplete="username" class="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" placeholder="输入用户名">
            </div>
            <div>
              <label class="mb-2 block text-xs font-semibold text-slate-300" for="admin-password">密码</label>
              <div class="relative">
                <input id="admin-password" v-model="password" type="password" name="password" autocomplete="current-password" class="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" placeholder="输入密码">
                <Lock class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              </div>
            </div>
            <p v-if="error" class="text-sm text-rose-400" role="alert">{{ error }}</p>
            <p v-if="!apiReady" class="text-xs leading-relaxed text-amber-400/90">
              接口地址配置无效，请检查 <code class="rounded bg-slate-950 px-1 py-0.5 text-amber-200">VITE_API_BASE_URL</code>。
            </p>
            <button type="submit" class="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60" :disabled="loading">
              {{ loading ? '登录中…' : '进入管理后台' }}
              <ArrowRight v-if="!loading" class="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <p class="mt-7 text-center">
            <RouterLink to="/" class="text-sm text-slate-500 underline-offset-2 transition hover:text-white hover:underline">返回前台首页</RouterLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ArrowRight, Lock } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { adminLogin, isApiReachableConfigured } from '@/utils/adminApi.js'
import { sanitizeAdminRedirect } from '@/utils/adminAuth.js'

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
    const next = sanitizeAdminRedirect(
      typeof route.query.redirect === 'string' ? route.query.redirect : '',
    )
    router.replace(next)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    password.value = ''
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login-shell {
  background:
    radial-gradient(circle at 15% 20%, rgba(225, 29, 72, 0.18), transparent 28rem),
    radial-gradient(circle at 85% 82%, rgba(99, 102, 241, 0.1), transparent 26rem),
    #0e1422;
}
</style>
