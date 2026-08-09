function getInitial(value) {
  const normalized = value.trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : 'A'
}

Component({
  data: {
    loggedIn: false,
    displayName: 'Amour 用户',
    username: '',
    avatar: '',
    initial: 'A',
  },

  lifetimes: {
    attached() {
      this.loadProfile()
    },
  },

  pageLifetimes: {
    show() {
      this.loadProfile()
    },
  },

  methods: {
    loadProfile() {
      const token = wx.getStorageSync('amour_token')
      const username = wx.getStorageSync('amour_username')
      const storedDisplayName = wx.getStorageSync('amour_display_name')
      const avatar = wx.getStorageSync('amour_avatar')
      const displayName = typeof storedDisplayName === 'string' && storedDisplayName.trim()
        ? storedDisplayName.trim()
        : 'Amour 用户'
      this.setData({
        loggedIn: typeof token === 'string' && Boolean(token.trim()),
        displayName,
        username: typeof username === 'string' ? username : '',
        avatar: typeof avatar === 'string' ? avatar : '',
        initial: getInitial(displayName),
      })
    },
  },
})
