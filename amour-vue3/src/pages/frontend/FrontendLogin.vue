<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-rose-50 to-pink-50 px-4 font-sans">
    <div class="w-full max-w-md rounded-2xl border border-rose-100 bg-white/80 p-8 shadow-xl shadow-rose-100/50 backdrop-blur">
      <div class="text-center">
        <span
          class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-lg text-white shadow-md shadow-rose-300/60"
          aria-hidden="true"
        >♥</span>
        <h1 class="mt-3 text-xl font-semibold text-rose-950">欢迎回来</h1>
        <p class="mt-1 text-sm text-rose-700/60">登录以继续使用</p>
      </div>

      <form
        class="mt-8 space-y-4"
        @submit.prevent="onSubmit"
      >
        <div>
          <label
            class="block text-sm font-medium text-rose-800"
            for="login-username"
          >用户名</label>
          <input
            id="login-username"
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            class="mt-1.5 w-full rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-rose-900 placeholder:text-rose-300 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300/50"
            placeholder="请输入用户名"
          >
        </div>
        <div>
          <label
            class="block text-sm font-medium text-rose-800"
            for="login-password"
          >密码</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            class="mt-1.5 w-full rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-rose-900 placeholder:text-rose-300 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300/50"
            placeholder="请输入密码"
          >
        </div>
        <p
          v-if="error"
          class="text-sm text-rose-500"
          role="alert"
        >
          {{ error }}
        </p>
        <button
          type="submit"
          class="w-full rounded-lg bg-gradient-to-r from-rose-400 to-pink-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-300/40 transition hover:from-rose-500 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
        >
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>

      <p class="mt-6 text-center">
        <RouterLink
          to="/"
          class="text-sm text-rose-400 underline-offset-2 hover:text-rose-600 hover:underline"
        >
          返回首页
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/axios'
import { setFrontendProfile, setFrontendToken } from '@/utils/auth'
import { createEncryptedLoginPayload } from '@/utils/loginCrypto'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

function getSafeRedirect() {
  const redirect = route.query.redirect
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/'
  }
  if (redirect.startsWith('/admin') || redirect.startsWith('/login')) {
    return '/'
  }
  return redirect
}

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
    const payload = await createEncryptedLoginPayload(
      '/login/challenge',
      username.value.trim(),
      password.value,
    )
    const { data } = await api.post('/login/userLogin', payload)
    if (data.success && data.data?.token) {
      setFrontendToken(data.data.token)
      setFrontendProfile(data.data)
      router.replace(getSafeRedirect())
    } else {
      error.value = data.message || '登录失败，请重试。'
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || '登录失败，请检查网络连接。'
  } finally {
    password.value = ''
    loading.value = false
  }
}
</script>
