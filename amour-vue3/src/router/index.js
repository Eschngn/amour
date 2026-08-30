import Index from '@/pages/frontend/index.vue'
import AdminLayout from '@/pages/admin/index.vue'
import AdminAnniversaryManage from '@/pages/admin/AdminAnniversaryManage.vue'
import AdminDictManage from '@/pages/admin/AdminDictManage.vue'
import AdminLogin from '@/pages/admin/AdminLogin.vue'
import AdminMessageManage from '@/pages/admin/AdminMessageManage.vue'
import AdminPhotoManage from '@/pages/admin/AdminPhotoManage.vue'
import AdminStoryManage from '@/pages/admin/AdminStoryManage.vue'
import AdminRoleManage from '@/pages/admin/AdminRoleManage.vue'
import AdminPermissionManage from '@/pages/admin/AdminPermissionManage.vue'
import AnniversaryPage from '@/pages/frontend/AnniversaryPage.vue'
import MessageBoardPage from '@/pages/frontend/MessageBoardPage.vue'
import OurStoryPage from '@/pages/frontend/OurStoryPage.vue'
import StoryDetail from '@/pages/frontend/StoryDetail.vue'
import FrontendLogin from '@/pages/frontend/FrontendLogin.vue'
import UserProfilePage from '@/pages/frontend/UserProfilePage.vue'
import PhotoAlbumPage from '@/pages/frontend/PhotoAlbumPage.vue'
import { isAdminAuthenticated } from '@/utils/adminAuth.js'
import { clearFrontendSession, isFrontendAuthenticated } from '@/utils/auth.js'
import api from '@/axios'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: Index,
    meta: { title: 'Amour 首页' },
  },
  {
    path: '/story',
    component: OurStoryPage,
    meta: { title: '我们的故事 · Amour' },
  },
  {
    path: '/story/:id',
    component: StoryDetail,
    meta: { title: '故事详情 · Amour' },
  },
  {
    path: '/message',
    component: MessageBoardPage,
    meta: { title: '留言板 · Amour' },
  },
  {
    path: '/photo',
    component: PhotoAlbumPage,
    meta: { title: '相册 · Amour' },
  },
  {
    path: '/anniversary',
    component: AnniversaryPage,
    meta: { title: '纪念日 · Amour' },
  },
  {
    path: '/login',
    component: FrontendLogin,
    meta: { title: '登录 · Amour' },
  },
  {
    path: '/profile',
    component: UserProfilePage,
    meta: { title: '个人设置 · Amour', requiresFrontendAuth: true },
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLogin,
    meta: { title: '后台登录 · Amour' },
  },
  {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/story',
    meta: { title: '后台管理 · Amour' },
    children: [
      {
        path: 'story',
        name: 'admin-story',
        component: AdminStoryManage,
        meta: { title: '故事管理 · 后台', pageTitle: '故事管理' },
      },
      {
        path: 'message',
        name: 'admin-message',
        component: AdminMessageManage,
        meta: { title: '留言板管理 · 后台', pageTitle: '留言板管理' },
      },
      {
        path: 'photo',
        name: 'admin-photo',
        component: AdminPhotoManage,
        meta: { title: '相册管理 · 后台', pageTitle: '相册管理' },
      },
      {
        path: 'anniversary',
        name: 'admin-anniversary',
        component: AdminAnniversaryManage,
        meta: { title: '纪念日管理 · 后台', pageTitle: '纪念日管理' },
      },
      {
        path: 'dict',
        name: 'admin-dict',
        component: AdminDictManage,
        meta: { title: '字典配置 · 后台', pageTitle: '字典配置' },
      },
      {
        path: 'role',
        name: 'admin-role',
        component: AdminRoleManage,
        meta: { title: '角色管理 · 后台', pageTitle: '角色管理' },
      },
      {
        path: 'permission',
        name: 'admin-permission',
        component: AdminPermissionManage,
        meta: { title: '权限管理 · 后台', pageTitle: '权限管理' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let frontendAuthCheck = null

async function validateFrontendSession() {
  if (!isFrontendAuthenticated()) return true
  if (frontendAuthCheck) return frontendAuthCheck
  frontendAuthCheck = api.post('/login/status')
    .then((response) => {
      const valid = response.data?.success !== false && response.data?.data !== false
      if (!valid) clearFrontendSession()
      return valid
    })
    .catch((error) => {
      // 网络异常不清除本地登录态，避免暂时断网导致误退出。
      return true
    })
    .finally(() => {
      frontendAuthCheck = null
    })
  return frontendAuthCheck
}

router.beforeEach(async (to) => {
  const hadFrontendSession = isFrontendAuthenticated()
  const frontendSessionValid = await validateFrontendSession()
  const frontendSessionExpired = hadFrontendSession && !frontendSessionValid
  if (to.meta?.requiresFrontendAuth && (!frontendSessionValid || frontendSessionExpired)) {
    return { path: '/login', query: { expired: '1', redirect: to.fullPath } }
  }
  if (!to.path.startsWith('/admin')) {
    return true
  }
  if (to.path === '/admin/login') {
    if (isAdminAuthenticated()) {
      return { path: '/admin/story' }
    }
    return true
  }
  if (isAdminAuthenticated()) {
    return true
  }
  return {
    path: '/admin/login',
    query: { redirect: to.fullPath },
  }
})

router.afterEach((to) => {
  const t = to.meta?.title
  if (typeof t === 'string' && t.length) {
    document.title = t
  }
})

export default router
