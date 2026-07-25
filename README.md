# 挚爱 (Amour)

全栈项目，包含后台管理系统与前台展示。

## 项目结构

```
amour/
├── amour-springboot/    # 后端 (Spring Boot)
│   ├── amour-web/       # 前台入口 & 启动模块
│   ├── amour-admin/     # 后台管理
│   ├── amour-common/    # 公共模块
│   └── pom.xml          # 父 POM
├── amour-vue3/          # 前端 (Vue 3 + Vite)
└── README.md
```

## 技术栈

**后端**

- Spring Boot 2.6.3 / Java 8 / Maven
- MyBatis Plus — ORM
- Sa-Token + Redis — 认证与权限
- MySQL — 数据库
- 阿里云 OSS — 文件存储
- Lombok / Guava / Hutool — 工具库

**前端**

- Vue 3 + Vite
- Element Plus + Tailwind CSS
- Vue Router

## 快速开始

### 后端

```bash
cd amour-springboot

# 启动（默认 dev 环境，端口 8080）
./mvnw -pl amour-web spring-boot:run -DskipTests
```

激活 `application-prod.yml`，需要配置可用的 MySQL 和 Redis 连接。

### 前端

```bash
cd amour-vue3

npm install
npm run dev
```

Vite 开发服务器默认将 `/api` 请求代理到 `http://localhost:8080`，去掉 `/api` 前缀后转发给后端。可通过环境变量 `VITE_DEV_API_TARGET` 修改代理目标。

### 生产打包

```bash
# 后端
cd amour-springboot
./mvnw -pl amour-web clean package -DskipTests

# 前端
cd amour-vue3
npm run build
```

前端 `dist` 目录部署到 Nginx，参考 `amour-vue3/deploy/nginx/default.conf`。

## 安全

登录密码使用 RSA-OAEP 挑战加密。生产多实例部署时需通过环境变量 `LOGIN_RSA_PUBLIC_KEY` 和 `LOGIN_RSA_PRIVATE_KEY` 配置统一密钥对，否则应用启动时会自动生成临时密钥。
