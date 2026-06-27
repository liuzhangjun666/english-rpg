# Docker + 腾讯云 CVM 部署指南

使用 Docker Compose 在腾讯云服务器上一键部署 English RPG（Laravel + Vue + MySQL）。

## 架构

```
                    ┌─────────────┐
  用户 ──HTTP:80──► │    web      │  Nginx 静态资源 + 反代
                    │  (nginx)    │
                    └──────┬──────┘
                           │ fastcgi
                    ┌──────▼──────┐
                    │    app      │  PHP 8.3-FPM
                    │  (php-fpm)  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   mysql     │ │   queue     │ │  scheduler  │
    │   8.0       │ │  worker     │ │ schedule:work│
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 一、腾讯云 CVM 准备

### 1. 购买与系统

- 建议：**2核4G 及以上**，系统 **Ubuntu 22.04** 或 **OpenCloudOS 8**
- 磁盘建议 **40GB+**（题库与 Docker 镜像占用较大）

### 2. 安全组放行

| 端口 | 用途 |
|------|------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS（配置证书后） |

**不要**对公网开放 `3306`，数据库仅在 Docker 内网访问。

### 3. 安装 Docker

SSH 登录服务器后：

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker

# Docker Compose 插件
sudo apt install -y docker-compose-plugin

docker --version
docker compose version
```

---

## 二、上传代码

```bash
sudo mkdir -p /opt/english-rpg
cd /opt/english-rpg

# 方式 A：Git
sudo git clone <你的仓库地址> .

# 方式 B：本地打包上传后解压
```

将当前用户加入 docker 组（可选，避免每次 sudo）：

```bash
sudo usermod -aG docker $USER
# 重新登录 SSH 生效
```

---

## 三、配置环境变量

```bash
cd /opt/english-rpg
cp .env.docker.example .env
nano .env
```

**必须修改的项：**

```env
APP_URL=https://你的域名.com
APP_DEBUG=false

DB_PASSWORD=强密码
MYSQL_ROOT_PASSWORD=另一个强密码

# 首次上线初始化题库时临时设为 true
RUN_BOOTSTRAP=true
```

生成 `APP_KEY`：

```bash
docker compose run --rm --entrypoint php app artisan key:generate
```

执行后 `.env` 里会自动写入 `APP_KEY=`。

填写腾讯云短信等配置（见 `.env.example`）。

---

## 四、宿主机预构建（国内服务器必做）

Docker 镜像**不再**在构建时执行 `composer install` / `npm run build`（避免 GitHub 超时）。

在 **启动 Docker 之前**，于项目目录执行：

```bash
cd ~/english-rpg-main

# PHP 依赖（你已完成可跳过）
composer install --no-dev --optimize-autoloader

# 前端资源（必须）
npm ci
npm run build

# 确认目录存在
ls vendor/autoload.php public/build/manifest.json
```

---

## 五、首次启动 Docker

```bash
cd ~/english-rpg-main

# 生成 APP_KEY（仅需一次）
sudo docker compose run --rm --entrypoint php app artisan key:generate

# 构建并启动（此时只打包 vendor + public/build，很快）
sudo docker compose up -d --build
```

查看状态：

```bash
sudo docker compose ps
sudo docker compose logs -f app
```

首次 `RUN_BOOTSTRAP=true` 时会执行 `app:bootstrap-content --fresh`（**清空并重建题库**，仅首次使用）。

初始化完成后，改回：

```env
RUN_BOOTSTRAP=false
```

然后重启 app：

```bash
docker compose up -d app queue scheduler
```

浏览器访问：`http://服务器公网IP` 或你的域名。

---

## 五、导入本地数据库（可选）

若要从本地 MySQL 迁移数据，而不是用 bootstrap 重建：

1. 本地导出：

```bash
mysqldump -u root -p --default-character-set=utf8mb4 levelup > levelup.sql
```

2. 上传到服务器 `/opt/english-rpg/levelup.sql`

3. 确保 `.env` 中 `RUN_BOOTSTRAP=false`

4. 导入：

```bash
docker compose exec -T mysql mysql -u levelup -p levelup < levelup.sql
```

---

## 六、域名与 HTTPS

### 方式 A：腾讯云 CLB + SSL 证书（推荐生产）

1. 购买/绑定域名，DNS 解析到 CLB
2. CLB 监听 443，挂载腾讯云免费 SSL 证书
3. 后端指向 CVM `80` 端口

### 方式 B：服务器上 Certbot（单机）

在宿主机安装 certbot，或使用 nginx 反向代理容器；当前 compose 的 `web` 服务监听 80，可将证书挂到 `docker/nginx` 并扩展 `default.conf` 的 443 配置。

口语/麦克风功能**强烈建议 HTTPS**。

---

## 七、日常运维命令

```bash
cd /opt/english-rpg

# 查看日志
docker compose logs -f
docker compose logs -f app web

# 重启
docker compose restart

# 进入容器
docker compose exec app sh
docker compose exec app php artisan migrate --force

# 停止
docker compose down

# 停止并删除数据库卷（危险！会丢数据）
docker compose down -v
```

### 更新发布

```bash
git pull
docker compose up -d --build
docker compose exec app php artisan migrate --force
```

---

## 八、验收清单

- [ ] 首页可打开，无 502
- [ ] 注册 / 登录正常
- [ ] 单词 / 语法 / 听力 / 口语 / 写作 / 阅读各测一关
- [ ] 坊市、秘境、储物袋功能正常
- [ ] `docker compose ps` 五个服务均为 running

---

## 九、常见问题

### 502 Bad Gateway

```bash
docker compose logs app
docker compose ps
```

多为 app 未就绪或数据库未连通，等待 MySQL healthcheck 通过。

### 数据库连接失败

确认 `.env` 中 `DB_HOST=mysql`（不是 `127.0.0.1`）。

### 静态资源 404

重新构建：`docker compose up -d --build web`

### 题库为空

首次部署设 `RUN_BOOTSTRAP=true` 后重建，或手动：

```bash
docker compose exec app php artisan app:bootstrap-content
```

### 端口被占用

修改 `.env`：`HTTP_PORT=8080`，安全组同步放行 8080。

---

## 十、文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 多阶段构建：Node 前端 + Composer + PHP-FPM + Nginx |
| `docker-compose.yml` | app / web / mysql / queue / scheduler |
| `.env.docker.example` | Docker 环境变量模板 |
| `docker/nginx/default.conf` | Nginx 配置 |
| `docker/entrypoint.sh` | 启动时迁移、缓存、可选 bootstrap |

传统宝塔/Nginx 部署见根目录 [DEPLOY.md](../DEPLOY.md)。
