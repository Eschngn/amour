<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <header class="rounded-[2rem] border border-rose-100/80 bg-white/75 px-6 py-8 shadow-sm shadow-rose-100/50 backdrop-blur sm:px-9">
          <p class="text-xs font-bold uppercase tracking-[0.26em] text-rose-400">Personal space</p>
          <h1 class="mt-2 font-display text-3xl font-bold text-rose-950 sm:text-4xl">个人设置</h1>
          <p class="mt-3 max-w-2xl text-sm leading-7 text-rose-800/60">
            在这里管理你的昵称、用户名和头像，保存后会同步到个人空间。
          </p>
        </header>

        <div v-if="loading" class="mt-8 rounded-[1.75rem] border border-rose-100 bg-white/80 px-6 py-16 text-center text-sm text-rose-500">
          正在读取个人资料…
        </div>

        <div v-else class="mt-8 grid items-start gap-8 lg:grid-cols-2">
          <section class="rounded-[1.75rem] border border-rose-100 bg-white/90 p-6 shadow-lg shadow-rose-100/40 sm:p-8">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-rose-400">Profile</p>
              <h2 class="mt-1 font-display text-2xl font-bold text-rose-950">资料与头像</h2>
            </div>

            <div class="mt-7 flex items-center gap-5 rounded-2xl bg-rose-50/70 p-4">
              <div class="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-rose-400 to-pink-500 text-xl font-bold text-white shadow-md shadow-rose-200">
                {{ initials(form.displayName) }}
                <img v-if="form.avatar" :src="form.avatar" alt="当前头像" class="absolute inset-0 h-full w-full object-cover" @load="$event.currentTarget.style.display = ''" @error="$event.currentTarget.style.display = 'none'">
              </div>
              <div class="min-w-0">
                <p class="truncate font-semibold text-rose-950">{{ form.displayName || '你的昵称' }}</p>
                <p class="mt-1 text-xs leading-5 text-rose-700/50">支持 JPG、PNG、WebP、GIF，最大 5MB</p>
                <button type="button" class="mt-3 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50" :disabled="avatarUploading" @click="avatarInput?.click()">
                  {{ avatarUploading ? '上传中…' : '更换头像' }}
                </button>
                <input ref="avatarInput" class="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="onAvatarSelected">
              </div>
            </div>

            <form class="mt-7 space-y-5" @submit.prevent="saveProfile">
              <div>
                <label for="profile-display-name" class="block text-sm font-semibold text-rose-900">昵称</label>
                <input id="profile-display-name" v-model="form.displayName" maxlength="20" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="请输入昵称">
                <p class="mt-1.5 text-xs text-rose-700/45">昵称会显示在留言和回复中。</p>
              </div>
              <div>
                <label for="profile-username" class="block text-sm font-semibold text-rose-900">用户名</label>
                <p class="mt-1.5 text-xs leading-5 text-rose-700/45">用户名可用于网页端登录，30 天可修改一次</p>
                <p v-if="usernameChangeLocked" class="mt-1 text-xs leading-5 text-rose-700/45">下次可编辑日期：{{ usernameChangeAvailableAtText }}</p>
                <p v-else class="mt-1 text-xs leading-5 text-rose-700/45">4-20 位，仅英文大小写、数字和下划线</p>
                <input id="profile-username" v-model="form.username" minlength="4" maxlength="20" pattern="[A-Za-z0-9_]{4,20}" autocomplete="username" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-rose-50" placeholder="请输入 4-20 位用户名" :disabled="profileSaving || usernameChangeLocked">
              </div>
              <button type="submit" class="w-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 py-3 text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" :disabled="profileSaving">
                {{ profileSaving ? '保存中…' : '保存资料' }}
              </button>
            </form>
          </section>

          <section class="rounded-[1.75rem] border border-rose-100 bg-white/90 p-6 shadow-lg shadow-rose-100/40 sm:p-8">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-rose-400">Security</p>
              <h2 class="mt-1 font-display text-2xl font-bold text-rose-950">修改密码</h2>
              <p class="mt-2 text-xs leading-5 text-rose-700/50">修改密码后需要重新登录。</p>
            </div>

            <form class="mt-7 space-y-5" @submit.prevent="changePassword">
              <div>
                <label for="current-password" class="block text-sm font-semibold text-rose-900">当前密码</label>
                <input id="current-password" v-model="passwordForm.current" type="password" autocomplete="current-password" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="请输入当前密码">
              </div>
              <div>
                <label for="new-password" class="block text-sm font-semibold text-rose-900">新密码</label>
                <input id="new-password" v-model="passwordForm.next" type="password" minlength="6" maxlength="64" autocomplete="new-password" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="6-64 个字符">
              </div>
              <div>
                <label for="confirm-password" class="block text-sm font-semibold text-rose-900">确认新密码</label>
                <input id="confirm-password" v-model="passwordForm.confirm" type="password" minlength="6" maxlength="64" autocomplete="new-password" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="请再次输入新密码">
              </div>
              <button type="submit" class="w-full rounded-full border border-rose-300 bg-rose-50 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60" :disabled="passwordSaving">
                {{ passwordSaving ? '修改中…' : '确认修改密码' }}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import api from '@/axios'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import { clearFrontendSession, setFrontendAvatar, setFrontendProfile } from '@/utils/auth'
import { encryptPassword } from '@/utils/loginCrypto'

const USERNAME_PATTERN = /^[A-Za-z0-9_]{4,20}$/
const router = useRouter()
const loading = ref(true)
const profileSaving = ref(false)
const avatarUploading = ref(false)
const passwordSaving = ref(false)
const avatarInput = ref(null)
const form = reactive({ username: '', displayName: '', avatar: '' })
const passwordForm = reactive({ current: '', next: '', confirm: '' })
const originalUsername = ref('')
const usernameChangeAvailableAt = ref('')
const usernameChangeLocked = computed(() => {
  const timestamp = Date.parse(String(usernameChangeAvailableAt.value || '').replace(' ', 'T'))
  return Number.isFinite(timestamp) && Date.now() < timestamp
})
const usernameChangeAvailableAtText = computed(() => formatUsernameChangeAvailableAt(usernameChangeAvailableAt.value))

function initials(name) {
  return String(name || '恋人').trim().slice(0, 2).toUpperCase()
}

function formatUsernameChangeAvailableAt(value) {
  if (!value) return ''
  const text = String(value)
  const dateParts = text.slice(0, 10).split('-')
  if (dateParts.length !== 3) return text
  const year = Number(dateParts[0])
  const month = Number(dateParts[1])
  const day = Number(dateParts[2])
  if (![year, month, day].every(Number.isInteger)) return text.slice(0, 10)
  const displayDate = new Date(year, month - 1, day)
  displayDate.setDate(displayDate.getDate() + 1)
  const displayMonth = String(displayDate.getMonth() + 1).padStart(2, '0')
  const displayDay = String(displayDate.getDate()).padStart(2, '0')
  return `${displayDate.getFullYear()}年${displayMonth}月${displayDay}日`
}

function applyProfile(profile) {
  form.username = profile?.username || ''
  form.displayName = profile?.displayName || ''
  form.avatar = profile?.avatar || ''
  originalUsername.value = form.username
  usernameChangeAvailableAt.value = profile?.usernameChangeAvailableAt || ''
  setFrontendProfile(profile)
}

async function loadProfile() {
  loading.value = true
  try {
    const { data } = await api.post('/user/profile')
    if (!data.success || !data.data) throw new Error(data.message || '个人资料加载失败')
    applyProfile(data.data)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '个人资料加载失败')
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  const username = form.username
  const displayName = form.displayName.trim()
  if (!USERNAME_PATTERN.test(username)) return ElMessage.warning('用户名需为 4-20 位英文、数字或下划线')
  if (username !== originalUsername.value && usernameChangeLocked.value) {
    return ElMessage.warning('用户名修改后 30 天内不能再次修改')
  }
  if (!displayName) return ElMessage.warning('请输入昵称')
  profileSaving.value = true
  try {
    const { data } = await api.post('/user/profile/update', { username, displayName })
    if (!data.success || !data.data) throw new Error(data.message || '保存失败')
    applyProfile(data.data)
    ElMessage.success('资料已保存')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '保存失败，请稍后重试')
  } finally {
    profileSaving.value = false
  }
}

async function onAvatarSelected(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    ElMessage.warning('请选择 5MB 以内的 JPG、PNG、WebP 或 GIF 图片')
    return
  }
  const body = new FormData()
  body.append('file', file)
  avatarUploading.value = true
  try {
    const { data } = await api.post('/user/profile/avatar', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (!data.success || !data.data) throw new Error(data.message || '头像上传失败')
    // 头像接口只负责头像，不能用它的整份响应覆盖正在编辑或刚保存的用户名资料。
    form.avatar = data.data.avatar || ''
    setFrontendAvatar(form.avatar)
    ElMessage.success('头像已更新')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '头像上传失败，请稍后重试')
  } finally {
    avatarUploading.value = false
  }
}

async function changePassword() {
  if (!passwordForm.current) return ElMessage.warning('请输入当前密码')
  if (passwordForm.next.length < 6 || passwordForm.next.length > 64) return ElMessage.warning('新密码长度需为 6-64 个字符')
  if (passwordForm.next !== passwordForm.confirm) return ElMessage.warning('两次输入的新密码不一致')
  if (passwordForm.current === passwordForm.next) return ElMessage.warning('新密码不能与当前密码相同')

  passwordSaving.value = true
  try {
    const currentPayload = await encryptPassword('/login/challenge', passwordForm.current)
    const newPayload = await encryptPassword('/login/challenge', passwordForm.next)
    const { data } = await api.post('/user/password/change', {
      currentChallengeId: currentPayload.challengeId,
      encryptedCurrentPassword: currentPayload.encryptedPassword,
      newChallengeId: newPayload.challengeId,
      encryptedNewPassword: newPayload.encryptedPassword,
    })
    if (!data.success) throw new Error(data.message || '密码修改失败')
    clearFrontendSession()
    ElMessage.success('密码已修改，请重新登录')
    router.replace({ path: '/login', query: { redirect: '/profile' } })
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '密码修改失败，请稍后重试')
  } finally {
    passwordForm.current = ''
    passwordForm.next = ''
    passwordForm.confirm = ''
    passwordSaving.value = false
  }
}

onMounted(loadProfile)
</script>
