function formatDateTime(value) {
  if (!value) return '拍摄时间未记录'
  const text = String(value)
  const datePart = text.slice(0, 10)
  const timePart = text.slice(11, 16)
  const parts = datePart.split('-')
  const date = parts.length === 3 ? `${parts[0]}年${parts[1]}月${parts[2]}日` : datePart
  return `${date}${timePart ? ` ${timePart}` : ''}`
}

function formatPhoto(photo) {
  return {
    ...photo,
    title: photo.title || '未命名照片',
    description: photo.description || '这一刻还没有写下文字。',
    categoryName: photo.categoryName || '共同回忆',
    location: photo.location || '地点未记录',
  }
}

Page({
  data: {
    photo: null,
    photos: [],
    currentIndex: 0,
    displayNumber: '01',
    formattedDateTime: '拍摄时间未记录',
    adjacentPhoto: null,
    adjacentFormattedDateTime: '',
    adjacentIndexNumber: '',
    adjacentOffset: 0,
    detailOffset: 0,
    detailTransition: false,
    error: '',
    scrollIntoView: '',
  },

  onLoad(options) {
    const id = Number(options.id)
    const storedPhotos = wx.getStorageSync('photoDetailCollection')
    if (Array.isArray(storedPhotos) && storedPhotos.length) {
      const storedIndex = storedPhotos.findIndex((item) => Number(item.id) === id)
      this.applyCollection(storedPhotos, storedIndex >= 0 ? storedIndex : 0)
    }

    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('photoData', ({ photos, index }) => {
      if (Array.isArray(photos) && photos.length) this.applyCollection(photos, Number(index) || 0)
    })

    if (!this.data.photo) this.setData({ error: '照片信息已失效，请返回相册重新打开' })
  },

  applyCollection(photos, index) {
    const validPhotos = photos.filter((photo) => photo && photo.url)
    if (!validPhotos.length) {
      this.setData({ error: '照片信息不存在' })
      return
    }
    const safeIndex = Math.min(Math.max(0, index), validPhotos.length - 1)
    const photo = validPhotos[safeIndex]
    const formattedDateTime = formatDateTime(photo.takenTime)
    this.setData({
      photo: formatPhoto(photo),
      photos: validPhotos,
      currentIndex: safeIndex,
      displayNumber: String(safeIndex + 1).padStart(2, '0'),
      formattedDateTime,
      adjacentPhoto: null,
      adjacentFormattedDateTime: '',
      adjacentIndexNumber: '',
      adjacentOffset: 0,
      detailOffset: 0,
      detailTransition: false,
      error: '',
      scrollIntoView: 'photo-detail-top',
    })
  },

  onDetailTouchStart(event) {
    const touch = event.touches && event.touches[0]
    if (!touch || this.detailSwitchTimer) return
    if (this.detailResetTimer) {
      clearTimeout(this.detailResetTimer)
      this.detailResetTimer = null
    }
    this.detailTouchStart = { x: touch.clientX, y: touch.clientY }
    this.detailGestureDirection = ''
    this.setData({ detailTransition: false })
  },

  onDetailTouchMove(event) {
    const start = this.detailTouchStart
    const touch = event.touches && event.touches[0]
    if (!start || !touch) return

    const offsetX = touch.clientX - start.x
    const offsetY = touch.clientY - start.y
    if (!this.detailGestureDirection && (Math.abs(offsetX) > 8 || Math.abs(offsetY) > 8)) {
      this.detailGestureDirection = Math.abs(offsetX) > Math.abs(offsetY) ? 'horizontal' : 'vertical'
    }
    if (this.detailGestureDirection !== 'horizontal') return

    const direction = offsetX < 0 ? 1 : -1
    const adjacentIndex = this.data.currentIndex + direction
    const hasAdjacentPhoto = adjacentIndex >= 0 && adjacentIndex < this.data.photos.length
    const displayOffset = hasAdjacentPhoto ? offsetX : offsetX * 0.28
    const adjacentPhoto = hasAdjacentPhoto ? formatPhoto(this.data.photos[adjacentIndex]) : null
    const windowWidth = wx.getSystemInfoSync().windowWidth
    this.setData({
      detailOffset: displayOffset,
      adjacentPhoto,
      adjacentFormattedDateTime: adjacentPhoto ? formatDateTime(adjacentPhoto.takenTime) : '',
      adjacentIndexNumber: hasAdjacentPhoto ? String(adjacentIndex + 1).padStart(2, '0') : '',
      adjacentOffset: hasAdjacentPhoto ? displayOffset + (offsetX < 0 ? windowWidth : -windowWidth) : 0,
    })
  },

  onDetailTouchEnd(event) {
    const start = this.detailTouchStart
    const touch = event.changedTouches && event.changedTouches[0]
    const direction = this.detailGestureDirection
    this.detailTouchStart = null
    this.detailGestureDirection = ''
    if (!start || !touch || direction !== 'horizontal') return

    const offsetX = touch.clientX - start.x
    const nextIndex = this.data.currentIndex + (offsetX < 0 ? 1 : -1)
    const canSwitch = nextIndex >= 0 && nextIndex < this.data.photos.length
    const shouldSwitch = canSwitch && Math.abs(offsetX) >= 120
    if (!shouldSwitch) {
      this.setData({ detailOffset: 0, adjacentOffset: 0, detailTransition: true })
      this.detailResetTimer = setTimeout(() => {
        this.detailResetTimer = null
        this.setData({ adjacentPhoto: null, adjacentFormattedDateTime: '', adjacentIndexNumber: '' })
      }, 220)
      return
    }

    const windowWidth = wx.getSystemInfoSync().windowWidth
    const targetOffset = offsetX < 0 ? -windowWidth : windowWidth
    this.setData({ detailOffset: targetOffset, adjacentOffset: 0, detailTransition: true })
    this.detailSwitchTimer = setTimeout(() => {
      this.detailSwitchTimer = null
      this.applyCollection(this.data.photos, nextIndex)
    }, 220)
  },

  onUnload() {
    if (this.detailSwitchTimer) clearTimeout(this.detailSwitchTimer)
    if (this.detailResetTimer) clearTimeout(this.detailResetTimer)
  },

  previewImage() {
    if (!this.data.photo) return
    const urls = this.data.photos.map((photo) => photo.url).filter(Boolean)
    wx.previewImage({ current: this.data.photo.url, urls })
  },

  backToAlbum() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/photo/photo' })
  },
})
