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
    adjacentTop: 0,
    detailOffset: 0,
    detailTransition: false,
    previewPhotos: [],
    previewCategories: [],
    backReveal: false,
    backDragging: false,
    scrollTop: 0,
    pageScrollEnabled: true,
    error: '',
  },

  onLoad(options) {
    const id = Number(options.id)
    this.detailBackCommitting = false
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
    // 切换照片后回到页面顶部，让新照片的卡片完整露出：
    // 滑动过渡期间相邻面板已锚定在当前可视窗口（top = 当前滚动偏移），
    // 过渡结束时新照片的卡片正位于屏幕顶部，此时 scrollTop 归零是"隐形"的，
    // 不会像旧实现那样在空白过渡之后整页瞬间弹跳
    // （onDetailTouchEnd 切换提交时已把 scrollTop 同步为实际滚动位置，这里的 0 才会真正触发回顶）
    this.scrollOffsetPx = 0
    const previewPhotos = validPhotos.slice(0, 6).map((photo, index) => ({
      ...formatPhoto(photo),
      number: photo.number || String(index + 1).padStart(2, '0'),
      date: photo.takenTime ? photo.takenTime.slice(0, 10).replace(/-/g, '.') : '日期未记录',
    }))
    const previewCategories = Array.from(
      new Set(validPhotos.map((photo) => photo.categoryName).filter(Boolean)),
    )
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
      adjacentTop: 0,
      detailOffset: 0,
      detailTransition: false,
      previewPhotos,
      previewCategories,
      backReveal: false,
      backDragging: false,
      // scrollTop 归零：切换提交时已把 scroll-top 属性同步为实际滚动位置，
      // 这里 0 会真正触发一次回顶，使新照片卡片停留在过渡结束时的屏幕位置；
      // 初次加载时属性本就为 0，属于无操作，不会产生滚动指令
      scrollTop: 0,
      error: '',
    })
  },

  onDetailScroll(event) {
    // 记录滚动偏移（px）：滑动切换时把相邻面板锚定到当前可视窗口，
    // 避免页面滚动到下方后（描述文字较多时）下一张照片被定位在可视区之外而显示空白。
    // 只写实例字段、不做 setData，避免逐帧触发重渲染
    this.scrollOffsetPx = event.detail.scrollTop || 0
  },

  onDetailTouchStart(event) {
    const touch = event.touches && event.touches[0]
    if (!touch || this.detailSwitchTimer || this.detailBackCommitting) return
    if (this.detailResetTimer) {
      clearTimeout(this.detailResetTimer)
      this.detailResetTimer = null
    }
    const windowWidth = wx.getSystemInfoSync().windowWidth
    // 返回手势触发区：仅屏幕最左侧边缘一条窄带（约屏宽 8%，16px～32px）。
    // 只有从这里开始右滑才返回上一级恋爱相册；
    // 其余区域（包括描述文字区左侧，未贴屏幕边缘）一律用于切换上一张/下一张照片。
    const edgeWidth = Math.max(16, Math.min(32, windowWidth * 0.08))
    this.detailTouchStart = { x: touch.clientX, y: touch.clientY }
    this.detailGestureDirection = ''
    this.detailBackGesture = false
    this.detailEdgeBackCandidate = touch.clientX <= edgeWidth
    // 每次触摸开始先恢复纵向滚动，避免上次手势异常结束时遗留锁定状态
    this.setData({
      detailTransition: false,
      backDragging: false,
      backReveal: false,
      pageScrollEnabled: true,
      // 相邻面板锚定到当前滚动位置：页面向下滚动后（描述文字较长时），
      // 下一张照片仍从屏幕右侧滑入，而不是被定位在可视区之外导致空白
      adjacentTop: this.scrollOffsetPx || 0,
    })
  },

  onDetailTouchMove(event) {
    const start = this.detailTouchStart
    const touch = event.touches && event.touches[0]
    if (!start || !touch) return

    const offsetX = touch.clientX - start.x
    const offsetY = touch.clientY - start.y
    if (!this.detailGestureDirection && (Math.abs(offsetX) > 8 || Math.abs(offsetY) > 8)) {
      this.detailGestureDirection = Math.abs(offsetX) > Math.abs(offsetY) ? 'horizontal' : 'vertical'
      // 一旦判定为左右切换手势，立即禁用页面纵向滚动：
      // 避免手指在左右拖动过程中同时触发上下滚动（只在方向判定时切换一次，不逐帧 setData）
      if (this.detailGestureDirection === 'horizontal' && this.data.pageScrollEnabled) {
        this.setData({ pageScrollEnabled: false })
      }
    }
    if (this.detailGestureDirection !== 'horizontal') return

    const windowWidth = wx.getSystemInfoSync().windowWidth

    // 从左边缘开始右滑：锁定为返回手势，当前面板跟手右移，相册内容从左侧逐步露出
    if (this.detailEdgeBackCandidate && offsetX > 0) this.detailBackGesture = true
    if (this.detailBackGesture) {
      const clampedOffset = Math.max(0, Math.min(offsetX, windowWidth))
      this.setData({
        detailOffset: clampedOffset,
        adjacentPhoto: null,
        adjacentOffset: 0,
        backReveal: true,
        backDragging: true,
      })
      return
    }

    const direction = offsetX < 0 ? 1 : -1
    const adjacentIndex = this.data.currentIndex + direction
    const hasAdjacentPhoto = adjacentIndex >= 0 && adjacentIndex < this.data.photos.length
    const displayOffset = hasAdjacentPhoto ? offsetX : offsetX * 0.28
    const adjacentPhoto = hasAdjacentPhoto ? formatPhoto(this.data.photos[adjacentIndex]) : null
    this.setData({
      detailOffset: displayOffset,
      adjacentPhoto,
      adjacentFormattedDateTime: adjacentPhoto ? formatDateTime(adjacentPhoto.takenTime) : '',
      adjacentIndexNumber: hasAdjacentPhoto ? String(adjacentIndex + 1).padStart(2, '0') : '',
      adjacentOffset: hasAdjacentPhoto ? displayOffset + (offsetX < 0 ? windowWidth : -windowWidth) : 0,
      // 方向判定前后可能产生少量纵向滚动，随手指移动刷新锚点，保证面板始终落在可视窗口内
      adjacentTop: this.scrollOffsetPx || 0,
    })
  },

  onDetailTouchEnd(event) {
    const start = this.detailTouchStart
    const touch = event.changedTouches && event.changedTouches[0]
    const direction = this.detailGestureDirection
    const wasBackGesture = this.detailBackGesture
    this.detailTouchStart = null
    this.detailGestureDirection = ''
    this.detailBackGesture = false
    this.detailEdgeBackCandidate = false
    if (!start || !touch || direction !== 'horizontal') return

    // 手势结束，恢复页面纵向滚动
    this.setData({ pageScrollEnabled: true })

    const offsetX = touch.clientX - start.x
    const windowWidth = wx.getSystemInfoSync().windowWidth

    // 左边缘右滑返回：超过阈值先把当前页滑出屏幕、露出完整相册，再执行真正的返回；否则回弹复位
    if (wasBackGesture) {
      if (offsetX >= windowWidth * 0.3) {
        this.detailBackCommitting = true
        this.setData({ detailOffset: windowWidth, detailTransition: true, backDragging: false })
        this.detailResetTimer = setTimeout(() => {
          this.detailResetTimer = null
          this.setData({ backReveal: false })
          this.backToAlbum()
        }, 220)
      } else {
        this.setData({ detailOffset: 0, adjacentOffset: 0, detailTransition: true, backDragging: false })
        this.detailResetTimer = setTimeout(() => {
          this.detailResetTimer = null
          this.setData({
            adjacentPhoto: null,
            adjacentFormattedDateTime: '',
            adjacentIndexNumber: '',
            backReveal: false,
          })
        }, 220)
      }
      return
    }

    const nextIndex = this.data.currentIndex + (offsetX < 0 ? 1 : -1)
    const canSwitch = nextIndex >= 0 && nextIndex < this.data.photos.length
    // 切换上一张/下一张的触发距离：约屏宽 12%（不小于 36px），轻滑即可切换
    const switchThreshold = Math.max(36, windowWidth * 0.12)
    const shouldSwitch = canSwitch && Math.abs(offsetX) >= switchThreshold
    if (!shouldSwitch) {
      this.setData({ detailOffset: 0, adjacentOffset: 0, detailTransition: true })
      // 计时略长于过渡时长（220ms），等面板完全回弹后再卸载相邻面板，避免中途闪现
      this.detailResetTimer = setTimeout(() => {
        this.detailResetTimer = null
        this.setData({ adjacentPhoto: null, adjacentFormattedDateTime: '', adjacentIndexNumber: '' })
      }, 250)
      return
    }

    const targetOffset = offsetX < 0 ? -windowWidth : windowWidth
    this.setData({
      detailOffset: targetOffset,
      adjacentOffset: 0,
      detailTransition: true,
      // 把 scroll-top 属性同步为当前实际滚动位置（本身是原地滚动、无视觉变化），
      // 这样 applyCollection 里归零 scrollTop 时才会真正触发一次回顶，
      // 使新照片停留在过渡结束时它所在的屏幕位置
      scrollTop: this.scrollOffsetPx || 0,
    })
    // 计时略长于过渡时长（220ms），等面板完全滑出屏幕后再切换照片，避免回摆/瞬跳
    this.detailSwitchTimer = setTimeout(() => {
      this.detailSwitchTimer = null
      this.applyCollection(this.data.photos, nextIndex)
    }, 250)
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
