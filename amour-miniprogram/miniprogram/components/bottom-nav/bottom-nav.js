// 底部主导航：广场、故事、相册、首页（中间品牌入口）、留言、我的。
//
// Tab 展示内容由 utils/session-state 的唯一用户状态决定，不在页面里硬编码：
// - loading：不渲染真实 Tab，只保留等高占位，避免首屏出现完整 Tab 再收回的闪烁；
// - unauthenticated / authenticated_without_space / error：
//   只展示「恋爱广场」和「我的」，隐藏所有依赖情侣空间的 Tab；
// - authenticated_with_space：展示项目原有的完整 Tab 结构与顺序。
//
// 隐藏 Tab 只是入口收敛，真正的权限拦截在 utils/access-control 的页面守卫里，
// 因此深链 / 分享 / 历史栈进入受限页面仍会被跳回「我的」。
const { canOpenTab, resolveVisibleTabIds, findTabDefinition } = require('../../utils/session-rules')
const {
  SESSION_STATUS,
  TAB_ID,
  PLAZA_ROUTE,
  PROFILE_ROUTE,
} = require('../../utils/session-constants')
const sessionState = require('../../utils/session-state')
const { hasFrontendQueryPermission } = require('../../utils/auth')

/** 依赖模块查询权限的 Tab：未授权时不展示（沿用原有权限逻辑）。 */
const MODULE_TAB_IDS = {
  [TAB_ID.STORY]: 'story',
  [TAB_ID.PHOTO]: 'photo',
  [TAB_ID.MESSAGE]: 'message',
}

/** 各 Tab 的路由（与 app.json 注册路径一致）。 */
const ROUTES = {
  [TAB_ID.PLAZA]: PLAZA_ROUTE,
  [TAB_ID.HOME]: '/pages/index/index',
  [TAB_ID.STORY]: '/pages/story/story',
  [TAB_ID.PHOTO]: '/pages/photo/photo',
  [TAB_ID.MESSAGE]: '/pages/message/message',
  [TAB_ID.PROFILE]: PROFILE_ROUTE,
}

Component({
  properties: {
    current: {
      type: String,
      value: 'home',
    },
  },

  data: {
    /** 状态确认中：骨架占位，不渲染任何真实 Tab */
    tabLoading: true,
    /** 是否只展示「恋爱广场」+「我的」 */
    minimalTabs: true,
    showPlaza: true,
    showHome: false,
    showStory: false,
    showPhoto: false,
    showMessage: false,
    showProfile: true,
  },

  lifetimes: {
    attached() {
      this.unsubscribe = sessionState.subscribe(snapshot => this.applySession(snapshot))
    },

    detached() {
      if (typeof this.unsubscribe === 'function') this.unsubscribe()
      this.unsubscribe = undefined
    },
  },

  methods: {
    /** 根据唯一状态计算可见 Tab；loading 时保持骨架，不渲染真实 Tab。 */
    applySession(snapshot) {
      const status = snapshot && snapshot.status ? snapshot.status : SESSION_STATUS.LOADING
      const loading = status === SESSION_STATUS.LOADING
      const visibleIds = resolveVisibleTabIds(status)

      if (loading) {
        this.setData({
          tabLoading: true,
          minimalTabs: true,
          showPlaza: false,
          showHome: false,
          showStory: false,
          showPhoto: false,
          showMessage: false,
          showProfile: false,
        })
        return
      }

      const canShow = tabId => visibleIds.indexOf(tabId) !== -1 && this.hasModulePermission(tabId)
      this.setData({
        tabLoading: false,
        minimalTabs: visibleIds.length <= 2,
        showPlaza: canShow(TAB_ID.PLAZA),
        showHome: canShow(TAB_ID.HOME),
        showStory: canShow(TAB_ID.STORY),
        showPhoto: canShow(TAB_ID.PHOTO),
        showMessage: canShow(TAB_ID.MESSAGE),
        showProfile: canShow(TAB_ID.PROFILE),
      })
    },

    /** 模块级查询权限：项目原有逻辑，缺失权限时对应 Tab 不展示。 */
    hasModulePermission(tabId) {
      const module = MODULE_TAB_IDS[tabId]
      if (!module) return true
      return hasFrontendQueryPermission(module)
    },

    navigate(event) {
      const page = String(event.currentTarget.dataset.page || '')
      if (!page || page === this.data.current) return
      const url = ROUTES[page]
      if (!url) return

      const status = sessionState.getSnapshot().status
      // 双重保险：即使某个 Tab 因状态变化被隐藏，点击也不会进入受限页面。
      if (!canOpenTab(page, status)) {
        const target = findTabDefinition(TAB_ID.PROFILE)
        wx.showToast({ title: '创建或绑定情侣空间后才能使用', icon: 'none' })
        wx.reLaunch({ url: target ? target.route : PROFILE_ROUTE })
        return
      }
      wx.reLaunch({ url })
    },
  },
})
