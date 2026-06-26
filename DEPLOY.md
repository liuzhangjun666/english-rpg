# English RPG 上线部署指南

修仙主题英语学习 RPG（Laravel + Vue 3 + Vite）。

> **Docker 部署（腾讯云 CVM）**：见 [docs/docker-deploy.md](docs/docker-deploy.md)

## 环境要求

| 组件 | 版本建议 |
|------|----------|
| PHP | 8.2+（扩展：pdo_mysql, mbstring, openssl, fileinfo） |
| Composer | 2.x |
| Node.js | 18+ |
| MySQL | 8.0+（或 MariaDB 10.6+） |
| Nginx / Apache | 任选 |

浏览器建议：**Chrome / Edge**（口语语音识别、听力 TTS 依赖现代浏览器 API）。

---

## 1. 获取代码

```bash
git clone <your-repo-url> english-rpg
cd english-rpg
composer install --no-dev --optimize-autoloader
npm ci
```

---

## 2. 环境配置

```bash
cp .env.example .env
php artisan key:generate
```

编辑 `.env` 关键项：

```env
APP_NAME="English RPG"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=levelup
DB_USERNAME=your_user
DB_PASSWORD=your_password

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

创建数据库：

```sql
CREATE DATABASE levelup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 3. 一键初始化内容（重要）

本项目练功题目来自种子 + JSON 导入，**首次部署必须执行**：

```bash
# 全新环境（清空所有表后重建）
php artisan app:bootstrap-content --fresh

# 已有库增量更新（不删用户数据）
php artisan app:bootstrap-content
```

该命令会：

1. 执行迁移
2. 种子：关卡配置、语法/技能题、写作 prompt、词汇库、阅读库
3. 导入 `database/data/elementary_grammar_from_xiaoxue_cihuiti.json` 语法题

### 题库覆盖范围

| 境界代码 | 说明 | 模块 |
|----------|------|------|
| L1–L3 | 练气（小学） | 单词/语法/听/说/读/写/阅读 |
| Z1 | 筑基（初中） | 同上 + 初中词汇 |
| J1 | 金丹（高中） | 同上 + 高中词汇 |
| Y1 | 元婴（大学/CET） | 技能题 + 阅读 + 写作 |
| H1 | 化神（研究生） | 技能题 + 阅读 + 写作 |

词汇按 `vocabulary_words.level_tag`（小学/初中/高中）与年级标签自动匹配用户境界。

---

## 4. 构建前端

```bash
npm run build
```

产物在 `public/build/`，由 Laravel 通过 `@vite` 引用。

---

## 5. Web 服务器

### Nginx 示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/english-rpg/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realdocument_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### 开发环境（本地）

```bash
php artisan serve
npm run dev
```

访问：`http://127.0.0.1:8000`

---

## 6. 生产优化

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

定时任务（可选，灵力恢复等）：

```cron
* * * * * cd /var/www/english-rpg && php artisan schedule:run >> /dev/null 2>&1
```

---

## 7. 功能验收清单

部署后按顺序自测：

- [ ] 注册 / 登录 → 进入宗门大厅
- [ ] 灵根测试（`/vocab-assessment`）完成
- [ ] **单词** L1-01：拉题 → 作答 → 提交 → 有修为结算
- [ ] **语法** 阵法峰：桥段显示 → 提交
- [ ] **听力**：点「朗读题目」或播放 → 作答
- [ ] **口语**：按住朗读 → 显示识别结果与相似度 → 提交
- [ ] **写作**：输入 → 提交 → 有分数
- [ ] **藏经阁** `/reading`：阅读 → 提交本关
- [ ] 故意答错 → 心魔殿有记录 → 可挑战
- [ ] **温故复盘** 可做错题
- [ ] **渡劫** `/exam` 可开考并提交

---

## 8. 常见问题

### 单词模块 404 / 无题目

词汇表为空。执行：

```bash
php artisan db:seed --class=VocabularyWordsSeeder --force
```

或确认 `database/seeders/data/vocabulary_words_import_*.json` 存在。

### 语法关只有 demo 题

重新导入语法 JSON：

```bash
php artisan grammar:import-json database/data/elementary_grammar_from_xiaoxue_cihuiti.json --replace=GR
```

### 阅读提交全错

确认已部署含 `POST /api/reading/submit-batch` 的版本，并执行：

```bash
php artisan db:seed --class=ReadingBankSeeder --force
```

### 口语无法识别

- 使用 **HTTPS** 或 `localhost`（麦克风 / 语音识别权限）
- 推荐 Chrome / Edge
- 可点「已完成朗读，继续」跳过识别

### 修改题目后

```bash
php artisan db:seed --class=SkillModuleTestDataSeeder --force
php artisan db:seed --class=ReadingBankSeeder --force
php artisan db:seed --class=WritingPromptSeeder --force
```

---

## 9. 目录与命令速查

| 路径 | 说明 |
|------|------|
| `app/Services/QuestionResolverService.php` | 统一题目解析（VW-/RQ-/普通题） |
| `database/seeders/` | 各模块种子 |
| `database/data/` | 语法 JSON 等导入源 |
| `resources/js/vue/` | 前端 SPA |
| `routes/api.php` | API 路由 |

| 命令 | 用途 |
|------|------|
| `php artisan app:bootstrap-content` | 一键上线初始化 |
| `php artisan grammar:import-json` | 导入语法题 |
| `php artisan vocab:import-words-json` | 导入词汇 JSON |
| `php artisan reading:import-json` | 导入阅读 JSON |

---

## 10. 安全提示

- 生产环境务必 `APP_DEBUG=false`
- 不要将 `.env` 提交到 Git
- 为 MySQL 使用独立账号、最小权限
- 配置 HTTPS（语音识别与麦克风在多数浏览器要求安全上下文）
