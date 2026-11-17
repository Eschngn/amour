// 底部主导航：广场、故事、相册、我的空间（中间品牌入口）、留言、我的。
// 只保留这一套导航实现，各页面通过 current 属性高亮所在栏目。
const { hasFrontendQueryPermission } = require('../../utils/auth')

const ROUTES = {
  // 恋爱广场是公开浏览入口，匿名可访问，不依赖登录态与查询权限。
  plaza: '/pages/plaza/index',
  home: '/pages/index/index',
  story: '/pages/story/story',
  photo: '/pages/photo/photo',
  message: '/pages/message/message',
  profile: '/pages/profile/profile',
}

Component({
  properties: {
    current: {
      type: String,
      value: 'home',
    },
  },

  data: {
    showStory: false,
    showPhoto: false,
    showMessage: false,
  },

  lifetimes: {
    attached() {
      const app = getApp()
      const authReady = app && app.globalData && app.globalData.authReady
      const refreshPermissions = () => this.setData({
        showStory: hasFrontendQueryPermission('story'),
        showPhoto: hasFrontendQueryPermission('photo'),
        showMessage: hasFrontendQueryPermission('message'),
      })
      refreshPermissions()
      if (authReady && typeof authReady.then === 'function') authReady.then(refreshPermissions)
    },
  },

  methods: {
    hasQueryPermission(module) {
      return hasFrontendQueryPermission(module)
    },

    navigate(event) {
      const page = String(event.currentTarget.dataset.page || '')
      if (!page || page === this.data.current) return
      const url = ROUTES[page]
      if (!url) return
      // 广场与我的空间、我的都只依赖公开或本地状态；私密模块沿用原有权限判断。
      const allowed = page === 'plaza'
        || page === 'home'
        || page === 'profile'
        || hasFrontendQueryPermission(page)
      if (!allowed) return
      wx.reLaunch({ url })
    },
  },
})
