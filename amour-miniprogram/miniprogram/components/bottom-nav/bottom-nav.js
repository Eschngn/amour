const { hasFrontendQueryPermission } = require('../../utils/auth')

const ROUTES = {
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
      if (url && (page === 'home' || page === 'profile' || hasFrontendQueryPermission(page))) wx.reLaunch({ url })
    },
  },
})
