import Index from '@/pages/frontend/index.vue'
import AdminLayout from '@/pages/admin/index.vue'
import AdminAnniversaryManage from '@/pages/admin/AdminAnniversaryManage.vue'
import AdminDictManage from '@/pages/admin/AdminDictManage.vue'
import AdminLogin from '@/pages/admin/AdminLogin.vue'
import AdminMessageManage from '@/pages/admin/AdminMessageManage.vue'
import AdminPhotoManage from '@/pages/admin/AdminPhotoManage.vue'
import AdminStoryManage from '@/pages/admin/AdminStoryManage.vue'
import AnniversaryPage from '@/pages/frontend/AnniversaryPage.vue'
import MessageBoardPage from '@/pages/frontend/MessageBoardPage.vue'
import OurStoryPage from '@/pages/frontend/OurStoryPage.vue'
import StoryDetail from '@/pages/frontend/StoryDetail.vue'
import FrontendLogin from '@/pages/frontend/FrontendLogin.vue'
import UserProfilePage from '@/pages/frontend/UserProfilePage.vue'
import PhotoAlbumPage from '@/pages/frontend/PhotoAlbumPage.vue'
import { isAdminAuthenticated } from '@/utils/adminAuth.js'
import { isFrontendAuthenticated } from '@/utils/auth.js'
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
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta?.requiresFrontendAuth && !isFrontendAuthenticated()) {
    return { path: '/login', query: { redirect: to.fullPath } }
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
