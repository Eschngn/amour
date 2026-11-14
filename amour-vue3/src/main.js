import '@/assets/main.css'

import { createApp } from 'vue'
import App from '@/App.vue'

// 导入路由
import router from '@/router'

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import 'flowbite'

const app = createApp(App)

// Element Plus 必须在挂载前完成注册与 locale 注入，
// 否则首屏组件解析和 MessageBox 等命令式组件的上下文会拿不到组件注册表。
app.use(ElementPlus, {
    locale: zhCn,
})

// 应用路由
app.use(router)
app.mount('#app')
