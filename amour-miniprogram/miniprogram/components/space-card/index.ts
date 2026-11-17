import type { SpaceCardView } from '../../types/plaza'

/**
 * 公开空间卡片。
 *
 * - 只通过 properties 接收适配后的 SpaceCardView，不请求接口、不改页面状态；
 * - 整卡是一个点击区域，点击后只 triggerEvent('open')，由页面校验 spaceId 并导航；
 * - 封面加载失败只影响自身显示，地址变化时自动恢复。
 */
Component({
  properties: {
    space: {
      type: Object,
      value: {},
    },
    /** 首次加载时的骨架占位，结构与真实卡片一致 */
    skeleton: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    coverFailed: false,
  },

  observers: {
    'space.coverUrl': function onCoverChange(coverUrl: string) {
      if (this.data.coverFailed && coverUrl) this.setData({ coverFailed: false })
    },
  },

  methods: {
    onCoverError() {
      if (this.data.coverFailed) return
      this.setData({ coverFailed: true })
    },

    onOpen() {
      const space = this.data.space as SpaceCardView | null
      if (!space || !space.spaceId) return
      this.triggerEvent('open', { spaceId: space.spaceId })
    },
  },
})
