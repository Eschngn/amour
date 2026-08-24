const { getStoredAuth, updateStoredProfile } = require('../../utils/auth')
const { post, uploadFile } = require('../../utils/request')

const USERNAME_PATTERN = /^[A-Za-z0-9_]{4,20}$/

function getInitial(value) {
  const normalized = String(value || '').trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : 'A'
}

function getErrorMessage(error) {
  return error instanceof Error && error.message ? error.message : '暂时无法连接服务'
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

Page({
  data: {
    saving: false,
    avatarUploading: false,
    originalUsername: '',
    usernameChangeAvailableAt: '',
    usernameChangeAvailableAtText: '',
    usernameChangeLocked: false,
    avatarError: false,
    initial: 'A',
    form: {
      username: '',
      displayName: '',
      avatar: '',
    },
  },

  onLoad() {
    this.loadProfile()
  },

  async loadProfile() {
    const stored = getStoredAuth()
    this.applyProfile(stored)
    try {
      const profile = await post('/user/profile')
      this.applyProfile(profile || {})
    } catch (error) {
      wx.showToast({ title: getErrorMessage(error), icon: 'none' })
    }
  },

  applyProfile(profile = {}) {
    const stored = getStoredAuth()
    const next = {
      username: typeof profile.username === 'string' ? profile.username : stored.username,
      displayName: typeof profile.displayName === 'string' ? profile.displayName : stored.displayName,
      avatar: typeof profile.avatar === 'string' ? profile.avatar : stored.avatar,
    }
    const usernameChangeAvailableAt = typeof profile.usernameChangeAvailableAt === 'string'
      ? profile.usernameChangeAvailableAt
      : ''
    this.setData({
      form: next,
      originalUsername: next.username,
      usernameChangeAvailableAt,
      usernameChangeAvailableAtText: formatUsernameChangeAvailableAt(usernameChangeAvailableAt),
      usernameChangeLocked: this.isUsernameChangeLocked(usernameChangeAvailableAt),
      initial: getInitial(next.displayName),
      avatarError: false,
    })
  },

  isUsernameChangeLocked(availableAt) {
    const timestamp = Date.parse(String(availableAt || '').replace(' ', 'T'))
    return Number.isFinite(timestamp) && Date.now() < timestamp
  },

  onInput(event) {
    const field = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.field
      : ''
    if (!field) return
    this.setData({ [`form.${field}`]: event.detail.value || '' })
  },

  onAvatarError() {
    this.setData({ avatarError: true })
  },

  async onChooseAvatar(event) {
    const filePath = event && event.detail && event.detail.avatarUrl
    if (!filePath || this.data.avatarUploading) return
    this.setData({ avatarUploading: true, avatarError: false })
    wx.showLoading({ title: '上传头像', mask: true })
    try {
      const profile = await uploadFile('/user/profile/avatar', filePath)
      const auth = updateStoredProfile(profile || {})
      this.applyProfile(profile || auth)
      wx.showToast({ title: '头像已更新', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: getErrorMessage(error), icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ avatarUploading: false })
    }
  },

  async onSave(event) {
    if (this.data.saving) return
    // Use the form submission snapshot for nickname input. WeChat may run
    // nickname safety checks asynchronously after blur and clear the input.
    const submitted = event && event.detail && event.detail.value
      ? event.detail.value
      : {}
    const form = this.data.form
    const username = String(
      Object.prototype.hasOwnProperty.call(submitted, 'username')
        ? submitted.username
        : form.username || '',
    )
    const displayName = String(
      Object.prototype.hasOwnProperty.call(submitted, 'displayName')
        ? submitted.displayName
        : form.displayName || '',
    ).trim()
    if (!USERNAME_PATTERN.test(username)) {
      wx.showToast({ title: '用户名需为 4-20 位英文、数字或下划线', icon: 'none' })
      return
    }
    if (username !== this.data.originalUsername && this.isUsernameChangeLocked(this.data.usernameChangeAvailableAt)) {
      wx.showToast({ title: '用户名修改后 30 天内不能再次修改', icon: 'none' })
      return
    }
    if (!displayName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      const profile = await post('/user/profile/update', { username, displayName })
      const auth = updateStoredProfile(profile || { username, displayName })
      this.applyProfile(profile || auth)
      const app = getApp()
      if (app && app.globalData) app.globalData.auth = auth
      wx.showToast({ title: '资料已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack({ delta: 1 }), 500)
    } catch (error) {
      wx.showToast({ title: getErrorMessage(error), icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },
})
