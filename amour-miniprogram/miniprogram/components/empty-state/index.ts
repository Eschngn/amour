/**
 * 通用状态占位（空列表 / 加载失败 / 空间不存在）。
 *
 * 纯展示组件：只通过 properties 接收文案，通过 action / secondary 事件通知页面，
 * 自己不做导航、不请求数据。
 */
Component({
  properties: {
    /** error 时使用警示图标与错误色；默认空状态 */
    variant: {
      type: String,
      value: 'empty',
    },
    title: {
      type: String,
      value: '',
    },
    description: {
      type: String,
      value: '',
    },
    actionText: {
      type: String,
      value: '',
    },
    secondaryText: {
      type: String,
      value: '',
    },
    compact: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    onAction() {
      this.triggerEvent('action')
    },

    onSecondary() {
      this.triggerEvent('secondary')
    },
  },
})
