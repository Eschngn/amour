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

## 情侣空间销毁与留档恢复

创建者可以在**另一半尚未加入**时销毁并清空自己的情侣空间；销毁后空间对普通用户完全不可见、
不可访问，平台管理员可以从留档恢复。

### 规则

- 只有空间**创建者**可以发起，且服务端以数据库成员关系判断「另一半尚未加入」，不信任前端传参；
- 另一半已加入时接口拒绝并返回 `20094`，非创建者返回 `20093`，状态不允许返回 `20095`；
- 销毁**不做物理删除**：空间标记为 `couple_space.status = 6`，成员关系标记为已退出，
  完整快照写入 `couple_space_archive`；重复提交按幂等返回同一份结果；
- 销毁后普通用户的 `/space/status` 返回 `data=null`，内容接口、邀请接口与公开广场都不再返回该空间；
- 管理员从留档恢复需要 `admin:space:restore` 权限，必须填写原因并写审计
  （`SPACE_ARCHIVE_RESTORE`）；成员已加入其它未销毁空间等冲突会返回 `20100` 并拒绝整笔恢复，
  不覆盖现存数据；
- 恢复后空间回到「等待绑定」并保持私密，由创建者重新邀请另一半，不会自动重新公开；
- 图片资源只在快照中保留 URL 引用，销毁不会触发对象存储删除，恢复后仍可按原引用访问。

### 接口

| 端 | 接口 | 说明 |
| --- | --- | --- |
| Web / 小程序 | `POST /space/destroy` | 创建者销毁；无请求体，身份由登录态推导 |
| 管理控制台 | `POST /admin/space/archive/list` | 查询留档分页（`admin:space:query`） |
| 管理控制台 | `POST /admin/space/archive/detail` | 留档详情、完整性与冲突（`admin:space:query`） |
| 管理控制台 | `POST /admin/space/archive/restore` | 从留档恢复，必须填原因（`admin:space:restore`） |

### 数据库迁移（部署必做）

应用启动**不会**自动执行增量迁移，生产库需要手工执行对应脚本：

```bash
# MySQL 生产库
cd amour-springboot/amour-web/src/main/resources/db/migrations
mysql -h <host> -u <user> -p amour < 20261118_space_destroy_archive_mysql.sql

# SQLite（本地 / 单机部署）
sqlite3 /path/to/amour.db < 20261118_space_destroy_archive_sqlite.sql
```

迁移内容：`couple_space` 增加 `destroyed_at` 列，新增 `couple_space_archive` 留档表。
两个脚本都可重复执行（MySQL 用 `information_schema` 判断；SQLite 重复执行 `ALTER` 会报
duplicate column，属预期且发生在任何写操作之前，建议先备份）。

## 访问渠道统计

管理控制台「平台活跃度」按渠道（Web 网页端 / 微信小程序端）统计 PV / UV。
渠道字段、采集口径与数据库迁移步骤见
[`docs/analytics-client-type.md`](docs/analytics-client-type.md)。

## 安全

登录密码使用 RSA-OAEP 挑战加密。生产多实例部署时需通过环境变量 `LOGIN_RSA_PUBLIC_KEY` 和 `LOGIN_RSA_PRIVATE_KEY` 配置统一密钥对，否则应用启动时会自动生成临时密钥。

## 页面展示

### 首页

![](https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour/amour-index1.png)

![](https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour/amour-index2.png)

### 我们的故事

![](https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour/amour-story.png)

### 留言板

![](https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour/amour-message.png)

### 相册

![](https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour/amour-photo.png)

### 纪念日

![](https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour/amour-anniversary.png)

### 管理控制台

![](https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour/amour-admin.png)


