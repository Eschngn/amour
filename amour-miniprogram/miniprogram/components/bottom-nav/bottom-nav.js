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

  methods: {
    navigate(event) {
      const page = String(event.currentTarget.dataset.page || '')
      if (!page || page === this.data.current) return
      const url = ROUTES[page]
      if (url) wx.reLaunch({ url })
    },
  },
})
