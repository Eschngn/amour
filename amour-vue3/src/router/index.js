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
import AdminSpaceManage from '@/pages/admin/AdminSpaceManage.vue'
import AdminUserManage from '@/pages/admin/AdminUserManage.vue'
import AnniversaryPage from '@/pages/frontend/AnniversaryPage.vue'
import LovePlazaPage from '@/pages/frontend/LovePlazaPage.vue'
import MessageBoardPage from '@/pages/frontend/MessageBoardPage.vue'
import OurStoryPage from '@/pages/frontend/OurStoryPage.vue'
import PublicSpaceDetailPage from '@/pages/frontend/PublicSpaceDetailPage.vue'
import SpaceSetupPage from '@/pages/frontend/SpaceSetupPage.vue'
import SpaceStudioPage from '@/pages/frontend/SpaceStudioPage.vue'
import StoryDetail from '@/pages/frontend/StoryDetail.vue'
import FrontendLogin from '@/pages/frontend/FrontendLogin.vue'
import UserProfilePage from '@/pages/frontend/UserProfilePage.vue'
import PhotoAlbumPage from '@/pages/frontend/PhotoAlbumPage.vue'
import { ADMIN_PERMISSIONS, isAdminAuthenticated } from '@/utils/adminAuth.js'
import { clearFrontendSession, hasFrontendQueryPermission, isFrontendAuthenticated, setFrontendProfile } from '@/utils/auth.js'
import { isSpaceReady, isSpaceStatusUnknown, refreshSpaceStatus, spaceStatus } from '@/composables/useFrontendSpace.js'
import { canEditSpaceContent } from '@/utils/spaceState.js'
import api from '@/axios'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: Index,
    meta: { title: '恋语间 首页' },
  },
  {
    path: '/plaza',
    name: 'plaza',
    component: LovePlazaPage,
    meta: { title: '恋爱广场 · 恋语间' },
  },
  {
    path: '/plaza/:spaceId',
    name: 'public-space-detail',
    component: PublicSpaceDetailPage,
    meta: { title: '公开情侣空间 · 恋语间' },
  },
  {
    path: '/space/setup',
    name: 'space-setup',
    component: SpaceSetupPage,
    // 要求登录；只有带 ?token= 的邀请深链接允许未登录预览（见守卫中的 allowsFrontendGuest）。
    // 该页面同时承载创建/绑定、空间状态、邀请管理、空间设置与解绑。
    meta: { title: '情侣空间 · 恋语间', requiresFrontendAuth: true, allowsFrontendGuest: true },
  },
  {
    // 等待绑定与正常状态下都可以进入的空间内容编辑页。
    path: '/space/studio',
    name: 'space-studio',
    component: SpaceStudioPage,
    meta: {
      title: '布置情侣空间 · 恋语间',
      requiresFrontendAuth: true,
      requiresSpaceStudio: true,
    },
  },
  {
    // 旧入口兼容：空间状态与空间设置已合并到 /space/setup，保留查询参数与锚点。
    path: '/space/settings',
    redirect: to => ({
      path: '/space/setup',
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: '/story',
    component: OurStoryPage,
    meta: { title: '我们的故事 · 恋语间', requiresFrontendAuth: true, requiresCoupleSpace: true },
  },
  {
    path: '/story/:id',
    component: StoryDetail,
    meta: { title: '故事详情 · 恋语间', requiresFrontendAuth: true, requiresCoupleSpace: true },
  },
  {
    path: '/message',
    component: MessageBoardPage,
    meta: { title: '留言板 · 恋语间', requiresFrontendAuth: true, requiresCoupleSpace: true },
  },
  {
    path: '/photo',
    component: PhotoAlbumPage,
    meta: { title: '相册 · 恋语间', requiresFrontendAuth: true, requiresCoupleSpace: true },
  },
  {
    path: '/anniversary',
    component: AnniversaryPage,
    meta: { title: '纪念日 · 恋语间', requiresFrontendAuth: true, requiresCoupleSpace: true },
  },
  {
    path: '/login',
    component: FrontendLogin,
    meta: { title: '登录 · 恋语间' },
  },
  {
    path: '/profile',
    component: UserProfilePage,
    meta: { title: '个人设置 · 恋语间', requiresFrontendAuth: true },
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLogin,
    meta: { title: '后台登录 · 恋语间' },
  },
  {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/story',
    meta: { title: '后台管理 · 恋语间' },
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
      {
        path: 'user',
        name: 'admin-user',
        component: AdminUserManage,
        meta: { title: '用户管理 · 后台', pageTitle: '用户管理' },
      },
      {
        path: 'space',
        name: 'admin-space',
        component: AdminSpaceManage,
        meta: {
          title: '空间管理 · 后台',
          pageTitle: '空间管理',
          adminPermission: ADMIN_PERMISSIONS.SPACE_QUERY,
          adminRestorePermission: ADMIN_PERMISSIONS.SPACE_RESTORE,
        },
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
    .then(async (response) => {
      const valid = response.data?.success !== false && response.data?.data !== false
      if (!valid) {
        clearFrontendSession()
        return false
      }
      try {
        const profile = await api.post('/user/profile')
        if (profile.data?.success && profile.data.data) setFrontendProfile(profile.data.data)
      } catch {
        // 网络波动时保留当前会话和已有权限缓存。
      }
      return true
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

/**
 * 深链接里是否带有可预览的邀请 token。
 *
 * 只用它决定“是否允许游客停留预览”，不读取、不存储 token 本身；
 * token 始终只存在于 URL 与页面内存中。
 */
function hasInvitationToken(query) {
  const raw = query?.token
  const token = Array.isArray(raw) ? raw[0] : raw
  return typeof token === 'string' && token.trim().length > 0
}

/**
 * 需要情侣空间的页面（故事/相册等）在进入前的检查。
 *
 * 返回 true 表示放行；false 表示确实没有可用空间，应引导去 setup。
 * 网络失败时不能返回 false —— 那会把“暂时连不上”误判成“没有空间”，
 * 这里改为抛出故障，交给调用方原样放行并保留 spaceError。
 */
async function ensureCoupleSpaceReady() {
  if (isSpaceReady.value) return true
  await refreshSpaceStatus()
  if (isSpaceReady.value) return true
  // 状态无法确认（网络/服务异常）：保留错误，不要重定向到 setup。
  if (isSpaceStatusUnknown.value) return true
  return false
}

router.beforeEach(async (to) => {
  const hadFrontendSession = isFrontendAuthenticated()
  const frontendSessionValid = await validateFrontendSession()
  const frontendSessionExpired = hadFrontendSession && !frontendSessionValid
  // allowsFrontendGuest：带邀请 token 的深链接允许未登录预览，
  // 其它情况（包括不带 token 的 /space/setup）仍然要求登录。
  const guestInvitationPreview = Boolean(to.meta?.allowsFrontendGuest) && hasInvitationToken(to.query)
  const requiresAuth = to.meta?.requiresFrontendAuth && !guestInvitationPreview
  if (requiresAuth && (!hadFrontendSession || !frontendSessionValid || frontendSessionExpired)) {
    return {
      path: '/login',
      query: {
        ...(frontendSessionExpired ? { expired: '1' } : {}),
        redirect: to.fullPath,
      },
    }
  }
  if (!to.path.startsWith('/admin')) {
    if (to.meta?.requiresCoupleSpace && !(await ensureCoupleSpaceReady())) {
      return {
        path: '/space/setup',
        query: { redirect: to.fullPath },
      }
    }

    // 空间内容编辑页：等待绑定（status=0）与正常（status=1）都允许进入，
    // 但必须是有效成员；状态无法确认时放行，由页面展示重试提示。
    if (to.meta?.requiresSpaceStudio) {
      await refreshSpaceStatus()
      if (isSpaceStatusUnknown.value) return true
      if (!canEditSpaceContent(spaceStatus.value)) {
        return {
          path: '/space/setup',
          query: { redirect: to.fullPath },
        }
      }
    }

    // 个人设置只依赖登录态，不参与模块权限控制（后端也未下发 frontend:profile:query）。
    const moduleByPath = { '/story': 'story', '/message': 'message', '/photo': 'photo', '/anniversary': 'anniversary' }
    const module = Object.entries(moduleByPath).find(([path]) => to.path === path || to.path.startsWith(`${path}/`))?.[1]
    if (module && !hasFrontendQueryPermission(module)) return { path: '/' }
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
