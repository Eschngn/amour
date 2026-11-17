/**
 * 列表底部状态。
 *
 * loading / error / hasMore / 到底 四种状态互斥，由页面根据 Pager 状态决定传哪一组；
 * 组件只做展示并触发 loadmore / retry，不自行发起请求。
 */
Component({
  properties: {
    loading: {
      type: Boolean,
      value: false,
    },
    error: {
      type: String,
      value: '',
    },
    hasMore: {
      type: Boolean,
      value: false,
    },
    showEnd: {
      type: Boolean,
      value: false,
    },
    endText: {
      type: String,
      value: '已经看到全部公开空间',
    },
  },

  methods: {
    onLoadMore() {
      if (this.data.loading) return
      this.triggerEvent('loadmore')
    },

    onRetry() {
      if (this.data.loading) return
      this.triggerEvent('retry')
    },
  },
})
