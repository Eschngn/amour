/**
 * 空间头像。
 *
 * - src 由页面 / 卡片通过适配层传入，组件不请求任何数据，也不修改页面状态；
 * - 加载失败只影响自身显示；src 变化时重置失败标记；
 * - 首字母优先使用上层传入的 initial，缺省时使用 name 生成，都没有则展示图形占位。
 */
Component({
  properties: {
    src: {
      type: String,
      value: '',
    },
    /** 昵称，用于生成首字母占位与读屏文本 */
    name: {
      type: String,
      value: '',
    },
    initial: {
      type: String,
      value: '',
    },
    /** normal | large | small */
    size: {
      type: String,
      value: 'normal',
    },
    lazyLoad: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    failed: false,
    fallbackInitial: '',
  },

  lifetimes: {
    attached() {
      // 部分基础库在初始属性赋值时不触发 observers，这里补一次，保证首屏就有正确占位。
      this.setData({
        fallbackInitial: this.data.initial || this.buildInitial(this.data.name),
      })
    },
  },

  observers: {
    'src, initial, name': function onSourceChange(_src: string, initial: string, name: string) {
      this.setData({
        failed: false,
        fallbackInitial: initial || this.buildInitial(name),
      })
    },
  },

  methods: {
    /** 英文取前两个词首字母，中文取首个字符。 */
    buildInitial(name: string): string {
      const text = typeof name === 'string' ? name.trim() : ''
      if (!text) return ''
      const words = text.split(/\s+/).filter(Boolean)
      if (words.length >= 2 && /^[a-z]/i.test(words[0])) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
      }
      return Array.from(text).slice(0, 1).join('').toUpperCase()
    },

    onImageError() {
      if (this.data.failed) return
      this.setData({ failed: true })
    },
  },
})
