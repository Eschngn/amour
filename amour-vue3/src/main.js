import '@/assets/main.css'

import { createApp } from 'vue'
import App from '@/App.vue'

// 导入路由
import router from '@/router'

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import 'flowbite'

const app = createApp(App)

// 应用路由
app.use(router)
app.mount('#app')
app.use(ElementPlus, {
    locale: zhCn,
})
