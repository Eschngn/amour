function formatDateTime(value) {
  if (!value) return '拍摄时间未记录'
  const text = String(value)
  const datePart = text.slice(0, 10)
  const timePart = text.slice(11, 16)
  const parts = datePart.split('-')
  const date = parts.length === 3 ? `${parts[0]}年${parts[1]}月${parts[2]}日` : datePart
  return `${date}${timePart ? ` ${timePart}` : ''}`
}

Page({
  data: {
    photo: null,
    photos: [],
    currentIndex: 0,
    displayNumber: '01',
    formattedDateTime: '拍摄时间未记录',
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
      photo: {
        ...photo,
        title: photo.title || '未命名照片',
        description: photo.description || '这一刻还没有写下文字。',
        categoryName: photo.categoryName || '共同回忆',
        location: photo.location || '地点未记录',
      },
      photos: validPhotos,
      currentIndex: safeIndex,
      displayNumber: String(safeIndex + 1).padStart(2, '0'),
      formattedDateTime,
      error: '',
      scrollIntoView: 'photo-detail-top',
    })
  },

  onSwiperChange(event) {
    const nextIndex = Number(event.detail.current)
    if (!Number.isInteger(nextIndex) || nextIndex === this.data.currentIndex) return
    if (nextIndex < 0 || nextIndex >= this.data.photos.length) return
    this.applyCollection(this.data.photos, nextIndex)
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
