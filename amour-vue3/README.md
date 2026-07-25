# amour-vue3

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

生产环境请将 `dist` 目录内容发布到 Nginx 的 `/usr/share/nginx/html`，并使用
[`deploy/nginx/default.conf`](deploy/nginx/default.conf) 作为站点配置。前端接口默认请求同源
`/api`，Nginx 会移除此前缀并转发到 `10.255.0.1:8080`。

> `npm run dev` 只启动 Vite 开发服务器，不会生成 `dist`；生产打包必须执行 `npm run build`。

登录密码会使用一次性 RSA-OAEP 挑战加密。HTTPS 环境使用浏览器原生 Web Crypto；公网 IP 的
HTTP 环境会自动使用兼容实现，因此不会再提示“当前页面无法使用安全加密”。但应用层密码加密
不能替代 HTTPS：HTTP 下登录令牌和其他响应仍可能被窃取或篡改，生产环境仍建议配置 HTTPS。
