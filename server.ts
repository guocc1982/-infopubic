import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ServerResponse } from 'http';
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

console.log("Starting server...");

let db: Database.Database;
try {
  db = new Database("hub.db");
  db.pragma('foreign_keys = ON');
  console.log("Database connected");
} catch (err) {
  console.error("Failed to connect to database:", err);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenant Middleware
const tenantMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const tenantId = req.header('X-Tenant-ID') || 'default';
  (req as any).tenantId = tenantId;
  next();
};

// Initialize Database
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      parent_id INTEGER,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      icon TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      title TEXT NOT NULL,
      subtitle TEXT,
      category_id INTEGER,
      summary TEXT,
      content TEXT,
      thumbnail_url TEXT,
      status TEXT DEFAULT 'draft',
      publish_date TEXT,
      view_count INTEGER DEFAULT 0,
      reading_time INTEGER DEFAULT 5,
      author TEXT,
      is_pinned INTEGER DEFAULT 0,
      allow_anonymous INTEGER DEFAULT 1,
      allow_all_registered INTEGER DEFAULT 0,
      allowed_roles TEXT,
      allowed_users TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )
  `);

  // Ensure columns exist if table was created before
  try { db.exec("ALTER TABLE articles ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch(e) {}
  try { db.exec("ALTER TABLE articles ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch(e) {}
  try { db.exec("ALTER TABLE articles ADD COLUMN is_pinned INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE articles ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'"); } catch(e) {}
  try { db.exec("ALTER TABLE categories ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'"); } catch(e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      article_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      is_approved INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { db.exec("ALTER TABLE comments ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'"); } catch(e) {}
  try { db.exec("ALTER TABLE comments ADD COLUMN is_approved INTEGER DEFAULT 1"); } catch(e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL
    )
  `);
  try { db.exec("ALTER TABLE roles ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'"); } catch(e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT,
      role TEXT DEFAULT 'user'
    )
  `);
  try { db.exec("ALTER TABLE users ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN password TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch(e) {}
  try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)"); } catch(e) {}

  // Add missing columns if they don't exist
  const tableInfo = db.prepare("PRAGMA table_info(articles)").all() as any[];
  const columns = tableInfo.map(c => c.name);
  
  if (!columns.includes('allow_anonymous')) {
    db.exec("ALTER TABLE articles ADD COLUMN allow_anonymous INTEGER DEFAULT 1");
  }
  if (!columns.includes('allow_all_registered')) {
    db.exec("ALTER TABLE articles ADD COLUMN allow_all_registered INTEGER DEFAULT 0");
  }
  if (!columns.includes('allowed_roles')) {
    db.exec("ALTER TABLE articles ADD COLUMN allowed_roles TEXT");
  }
  if (!columns.includes('allowed_users')) {
    db.exec("ALTER TABLE articles ADD COLUMN allowed_users TEXT");
  }
  if (!columns.includes('is_pinned')) {
    db.exec("ALTER TABLE articles ADD COLUMN is_pinned INTEGER DEFAULT 0");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      tenant_id TEXT PRIMARY KEY,
      site_name TEXT DEFAULT 'AI Studio App',
      site_description TEXT DEFAULT 'A polished AI-powered application',
      language TEXT DEFAULT 'zh-CN',
      theme TEXT DEFAULT 'light',
      primary_color TEXT DEFAULT '#4f46e5',
      email_notifications INTEGER DEFAULT 1,
      push_notifications INTEGER DEFAULT 1,
      enable_comments INTEGER DEFAULT 1,
      require_comment_approval INTEGER DEFAULT 0,
      allow_registration INTEGER DEFAULT 1,
      default_role TEXT DEFAULT 'user',
      timezone TEXT DEFAULT 'UTC+8'
    )
  `);

  // Add missing columns to settings if they don't exist
  try { db.exec("ALTER TABLE settings ADD COLUMN enable_comments INTEGER DEFAULT 1"); } catch(e) {}
  try { db.exec("ALTER TABLE settings ADD COLUMN require_comment_approval INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE settings ADD COLUMN allow_registration INTEGER DEFAULT 1"); } catch(e) {}
  try { db.exec("ALTER TABLE settings ADD COLUMN default_role TEXT DEFAULT 'user'"); } catch(e) {}
  try { db.exec("ALTER TABLE settings ADD COLUMN timezone TEXT DEFAULT 'UTC+8'"); } catch(e) {}

  // Seed default settings if not exists
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings WHERE tenant_id = 'default'").get() as any;
  if (settingsCount.count === 0) {
    db.prepare("INSERT INTO settings (tenant_id) VALUES ('default')").run();
  }

  // Seed data if empty
  const roleCount = db.prepare("SELECT COUNT(*) as count FROM roles").get() as any;
  if (roleCount.count === 0) {
    const roles = ["管理员", "编辑", "普通员工", "人力资源", "技术委员会", "财务部", "市场部"];
    const insert = db.prepare("INSERT INTO roles (name) VALUES (?)");
    roles.forEach(role => insert.run(role));
    console.log("Roles seeded");
  }

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  if (userCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const defaultPassword = bcrypt.hashSync("password123", salt);
    
    const users = [
      ["admin", defaultPassword, "系统管理员", "admin"],
      ["sarah_j", defaultPassword, "Sarah J.", "editor"],
      ["hr_admin", defaultPassword, "HR Admin", "hr"],
      ["zhang_g", defaultPassword, "张工", "tech"],
      ["finance_user", defaultPassword, "财务专员", "finance"],
      ["marketing_user", defaultPassword, "市场专员", "marketing"],
      ["wang_x", defaultPassword, "小王", "user"]
    ];
    const insert = db.prepare("INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)");
    users.forEach(user => insert.run(...user));
    console.log("Users seeded");
  }

  const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as any;
  if (categoryCount.count === 0) {
    db.exec("INSERT INTO categories (name, description, icon) VALUES ('公司新闻', '公司最新的动态和公告', 'newspaper')");
    db.exec("INSERT INTO categories (name, description, icon) VALUES ('部门资源', '各部门的规章制度和资源', 'folder')");
    
    const newsCat = db.prepare("SELECT id FROM categories WHERE name = '公司新闻'").get() as any;
    const deptCat = db.prepare("SELECT id FROM categories WHERE name = '部门资源'").get() as any;
    
    if (newsCat) db.exec(`INSERT INTO categories (name, parent_id, icon) VALUES ('公告', ${newsCat.id}, 'campaign')`);
    if (deptCat) db.exec(`INSERT INTO categories (name, parent_id, icon) VALUES ('人力资源政策', ${deptCat.id}, 'description')`);
    console.log("Categories seeded");
  }

  const articleCount = db.prepare("SELECT COUNT(*) as count FROM articles").get() as any;
  if (articleCount.count === 0) {
    const mockArticles = [
      ["2024年第一季度战略回顾", "Sarah J. 更新于 2 小时前", 3, "探索多模态模型如何在 2024 年重塑创意产业和软件工程的格局。", "<h2>战略重点</h2><p>本季度我们将重点放在 AI 原生应用的开发上...</p>", "published", "2024-05-12", 12450, 8, "Sarah J."],
      ["新员工入职指南", "HR 部门", 4, "欢迎加入公司！这份指南将帮助你快速熟悉环境和流程。", "<h3>欢迎加入！</h3><p>你的入职第一天将从领取电脑开始...</p>", "published", "2024-04-01", 3500, 15, "HR Admin"],
      ["关于端午节放假的通知", "行政部", 3, "2024年端午节放假安排及注意事项。", "<p>根据国家法定节假日安排，公司端午节放假时间为...</p>", "published", "2024-06-01", 890, 2, "行政部"],
      ["AI 技术在产品中的应用探索", "技术委员会", 1, "讨论如何将最新的大语言模型集成到我们的核心产品线中。", "<p>我们正在评估 Gemini Pro 的集成方案...</p>", "draft", "2024-06-10", 0, 12, "张工"],
      ["2023 年度优秀员工表彰名单", "总裁办", 3, "回顾过去一年中表现卓越的团队 and 个人。", "<p>恭喜以下同事获得年度优秀员工称号...</p>", "published", "2024-02-15", 5600, 5, "总裁办"],
      ["远程办公安全规范 (V2.0)", "IT 安全组", 4, "更新后的远程访问 VPN 使用规范和数据安全要求。", "<p>为了保障公司数据安全，请务必遵守以下 VPN 使用规范...</p>", "pending", "2024-06-15", 0, 10, "Security Team"],
      ["公司十周年庆典策划草案", "市场部", 1, "初步构思公司十周年庆典的主题、场地 and 活动流程。", "<p>庆典主题：十年同行，共创未来...</p>", "draft", "2024-06-20", 0, 20, "市场部"],
      ["2022 年差旅报销政策 (已废止)", "财务部", 4, "旧版的差旅报销标准和流程说明。", "<p>本政策已失效，请查看 2024 最新版...</p>", "archived", "2022-01-10", 1200, 8, "Finance"],
      ["季度团建活动投票", "行政部", 3, "请大家在三个备选方案中选出最喜欢的团建目的地。", "<p>方案 A：莫干山民宿；方案 B：崇明岛骑行...</p>", "published", "2024-05-20", 2100, 3, "行政部"],
      ["新版办公系统操作手册", "IT 部门", 4, "详细介绍新上线的 OA 系统各项功能的使用方法。", "<p>第一步：使用公司邮箱登录；第二步：完善个人资料...</p>", "pending", "2024-06-18", 0, 25, "IT Support"],
      ["五月份销售业绩简报", "销售管理部", 1, "分析五月份各区域销售目标的达成情况及市场反馈。", "<p>本月销售额同比增长 15%...</p>", "published", "2024-06-05", 1500, 6, "Sales Manager"],
      ["关于办公区绿化升级的建议", "员工委员会", 2, "收集员工对改善办公环境绿植布置的意见。", "<p>我们计划在每个工位增加一盆绿植...</p>", "archived", "2023-11-20", 450, 4, "小王"],
      ["2024年夏季团建活动安排", "行政部", 3, "关于今年夏季团建的详细行程和注意事项。", "<p>我们将前往三亚进行为期三天的团建活动...</p>", "published", "2024-06-25", 120, 5, "行政部"],
      ["技术沙龙：大模型微调实践", "技术委员会", 1, "本周五下午的技术分享会预告。", "<p>主讲人：李博士；地点：3号会议室...</p>", "published", "2024-06-28", 450, 10, "张工"]
    ];

    const insert = db.prepare(`
      INSERT INTO articles (title, subtitle, category_id, summary, content, status, publish_date, view_count, reading_time, author)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    mockArticles.forEach(article => insert.run(...article));
    console.log("Articles seeded");
  }
}

// Auth Middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

initDb();
const app = express();

// Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(tenantMiddleware);

// Swagger Definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Studio App API",
      version: "1.0.0",
      description: "API documentation for the AI Studio application",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./server.ts"], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/swagger-ui", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get("/swagger-ui.html", (req, res) => res.redirect("/swagger-ui"));

// Auth Routes
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const tenantId = req.header('X-Tenant-ID') || 'default';

  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND tenant_id = ?").get(username, tenantId) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, tenantId: user.tenant_id },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: (req as any).user });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check system health
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System is healthy
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: !!db, javaBackend: !!process.env.JAVA_BACKEND_URL });
});

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get system settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: System settings retrieved
 */
app.get("/api/settings", (req, res) => {
  const tenantId = (req as any).tenantId;
  let settings = db.prepare("SELECT * FROM settings WHERE tenant_id = ?").get(tenantId) as any;
  
  if (!settings) {
    // Return default settings if none found for this tenant
    settings = {
      tenant_id: tenantId,
      site_name: 'AI Studio App',
      site_description: 'A polished AI-powered application',
      language: 'zh-CN',
      theme: 'light',
      primary_color: '#4f46e5',
      email_notifications: 1,
      push_notifications: 1
    };
  }
  
  // Convert 1/0 to boolean
  res.json({
    ...settings,
    email_notifications: !!settings.email_notifications,
    push_notifications: !!settings.push_notifications,
    enable_comments: !!settings.enable_comments,
    require_comment_approval: !!settings.require_comment_approval,
    allow_registration: !!settings.allow_registration
  });
});

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Save system settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings saved
 */
app.post("/api/settings", authMiddleware, (req, res) => {
  console.log(`Saving settings for tenant: ${(req as any).tenantId}`);
  
  try {
    const { 
      site_name, 
      site_description, 
      language, 
      theme, 
      primary_color, 
      email_notifications, 
      push_notifications,
      enable_comments,
      require_comment_approval,
      allow_registration,
      default_role,
      timezone
    } = req.body || {};

    if (!req.body) {
      return res.status(400).json({ error: "Missing request body" });
    }

    const tenantId = (req as any).tenantId;

    db.prepare(`
      INSERT INTO settings (
        tenant_id, site_name, site_description, language, theme, primary_color, 
        email_notifications, push_notifications, enable_comments, 
        require_comment_approval, allow_registration, default_role, timezone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        site_name = excluded.site_name,
        site_description = excluded.site_description,
        language = excluded.language,
        theme = excluded.theme,
        primary_color = excluded.primary_color,
        email_notifications = excluded.email_notifications,
        push_notifications = excluded.push_notifications,
        enable_comments = excluded.enable_comments,
        require_comment_approval = excluded.require_comment_approval,
        allow_registration = excluded.allow_registration,
        default_role = excluded.default_role,
        timezone = excluded.timezone
    `).run(
      tenantId, 
      site_name || 'Hub CMS', 
      site_description || '', 
      language || 'zh-CN', 
      theme || 'light', 
      primary_color || '#4f46e5', 
      email_notifications ? 1 : 0, 
      push_notifications ? 1 : 0,
      enable_comments ? 1 : 0,
      require_comment_approval ? 1 : 0,
      allow_registration ? 1 : 0,
      default_role || 'user',
      timezone || 'UTC+8'
    );
    
    console.log(`Settings saved successfully for tenant: ${tenantId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Local API Routes (Take precedence)
/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *               description:
 *                 type: string
 *               display_order:
 *                 type: integer
 *               is_published:
 *                 type: boolean
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category created
 */
app.get("/api/categories", (req, res) => {
  const categories = db.prepare("SELECT * FROM categories WHERE tenant_id = ? ORDER BY display_order ASC").all((req as any).tenantId);
  res.json(categories);
});

app.post("/api/categories", authMiddleware, (req, res) => {
  const { name, parent_id, description, display_order, is_published, icon } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO categories (name, parent_id, description, display_order, is_published, icon, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, parent_id, description, display_order, is_published ? 1 : 0, icon, (req as any).tenantId);
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Category updated
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted
 */
app.put("/api/categories/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, parent_id, description, display_order, is_published, icon } = req.body;
  try {
    db.prepare(`
      UPDATE categories 
      SET name = ?, parent_id = ?, description = ?, display_order = ?, is_published = ?, icon = ?
      WHERE id = ? AND tenant_id = ?
    `).run(name, parent_id, description, display_order, is_published ? 1 : 0, icon, id, (req as any).tenantId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete("/api/categories/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare("DELETE FROM categories WHERE id = ? AND tenant_id = ?").run(id, (req as any).tenantId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: Get all articles
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: List of articles
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               summary:
 *                 type: string
 *               content:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *               status:
 *                 type: string
 *               publish_date:
 *                 type: string
 *               reading_time:
 *                 type: integer
 *               allow_anonymous:
 *                 type: boolean
 *               allow_all_registered:
 *                 type: boolean
 *               is_pinned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Article created
 */
app.get("/api/articles", (req, res) => {
  const articles = db.prepare(`
    SELECT a.*, c.name as category_name 
    FROM articles a 
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.tenant_id = ?
    ORDER BY a.is_pinned DESC, a.publish_date DESC
  `).all((req as any).tenantId);
  res.json(articles);
});

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Article details
 *   put:
 *     summary: Update an article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Article updated
 *   patch:
 *     summary: Partially update an article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Article partially updated
 *   delete:
 *     summary: Delete an article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Article deleted
 */
app.get("/api/articles/:id", (req, res) => {
  const article = db.prepare(`
    SELECT a.*, c.name as category_name 
    FROM articles a 
    LEFT JOIN categories c ON a.category_id = c.id 
    WHERE a.id = ? AND a.tenant_id = ?
  `).get(req.params.id, (req as any).tenantId);
  res.json(article);
});

app.post("/api/articles", authMiddleware, (req, res) => {
  const { title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users, is_pinned } = req.body;
  const finalCategoryId = category_id || null;
  console.log('Creating new article:', { title, status, category_id: finalCategoryId, tenantId: (req as any).tenantId });
  try {
    const result = db.prepare(`
      INSERT INTO articles (title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users, is_pinned, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, subtitle, finalCategoryId, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous ? 1 : 0, allow_all_registered ? 1 : 0, allowed_roles, allowed_users, is_pinned ? 1 : 0, (req as any).tenantId);
    console.log('Article created successfully, ID:', result.lastInsertRowid);
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put("/api/articles/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users, is_pinned } = req.body;
  const finalCategoryId = category_id || null;
  console.log('Updating article:', { id, title, status, category_id: finalCategoryId, tenantId: (req as any).tenantId });
  try {
    db.prepare(`
      UPDATE articles 
      SET title = ?, subtitle = ?, category_id = ?, summary = ?, content = ?, thumbnail_url = ?, status = ?, publish_date = ?, reading_time = ?, allow_anonymous = ?, allow_all_registered = ?, allowed_roles = ?, allowed_users = ?, is_pinned = ?
      WHERE id = ? AND tenant_id = ?
    `).run(title, subtitle, finalCategoryId, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous ? 1 : 0, allow_all_registered ? 1 : 0, allowed_roles, allowed_users, is_pinned ? 1 : 0, id, (req as any).tenantId);
    console.log('Article updated successfully, ID:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.patch("/api/articles/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const fields = Object.keys(updates);
  if (fields.length === 0) return res.json({ success: true });

  const setClause = fields.map(field => `${field} = ?`).join(", ");
  const values = fields.map(field => {
    if (field === 'allow_anonymous' || field === 'allow_all_registered' || field === 'is_pinned') {
      return updates[field] ? 1 : 0;
    }
    if (field === 'category_id') {
      return updates[field] || null;
    }
    return updates[field];
  });
  
  db.prepare(`UPDATE articles SET ${setClause} WHERE id = ? AND tenant_id = ?`).run(...values, id, (req as any).tenantId);
  res.json({ success: true });
});

app.delete("/api/articles/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM articles WHERE id = ? AND tenant_id = ?").run(id, (req as any).tenantId);
  res.json({ success: true });
});

/**
 * @swagger
 * /api/articles/{id}/comments:
 *   get:
 *     summary: Get comments for an article
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of comments
 *   post:
 *     summary: Post a comment to an article
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [author, content]
 *             properties:
 *               author:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment posted
 */
/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get all comments (for management)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all comments
 */
app.get("/api/comments", authMiddleware, (req, res) => {
  const tenantId = (req as any).tenantId;
  if ((req as any).user.role !== 'admin' && (req as any).user.role !== 'editor') {
    return res.status(403).json({ error: "Only admins and editors can manage comments" });
  }

  const comments = db.prepare("SELECT * FROM comments WHERE tenant_id = ? ORDER BY created_at DESC").all(tenantId);
  res.json(comments);
});

app.get("/api/articles/:id/comments", (req, res) => {
  const tenantId = (req as any).tenantId;
  const articleId = req.params.id;
  
  // If user is authenticated and is admin/editor, show all comments
  // Otherwise only show approved ones
  const authHeader = req.headers.authorization;
  let showAll = false;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role === 'admin' || decoded.role === 'editor') {
        showAll = true;
      }
    } catch (e) {}
  }

  const query = showAll 
    ? "SELECT * FROM comments WHERE article_id = ? AND tenant_id = ? ORDER BY created_at DESC"
    : "SELECT * FROM comments WHERE article_id = ? AND tenant_id = ? AND is_approved = 1 ORDER BY created_at DESC";
    
  const comments = db.prepare(query).all(articleId, tenantId);
  res.json(comments);
});

app.post("/api/articles/:id/comments", (req, res) => {
  const { id } = req.params;
  const { author, content } = req.body;
  const tenantId = (req as any).tenantId;

  // Check if comments are enabled and if approval is required
  const settings = db.prepare("SELECT enable_comments, require_comment_approval FROM settings WHERE tenant_id = ?").get(tenantId) as any;
  
  if (settings && !settings.enable_comments) {
    return res.status(403).json({ error: "Comments are disabled" });
  }

  const isApproved = (settings && settings.require_comment_approval) ? 0 : 1;

  const result = db.prepare(`
    INSERT INTO comments (article_id, author, content, is_approved, tenant_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, author, content, isApproved, tenantId);
  
  res.json({ 
    id: result.lastInsertRowid, 
    is_approved: !!isApproved,
    message: isApproved ? "Comment posted" : "Comment submitted for approval"
  });
});

/**
 * @swagger
 * /api/comments/{id}:
 *   patch:
 *     summary: Update comment status (approve/reject)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_approved:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Comment updated
 */
app.patch("/api/comments/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body;
  const tenantId = (req as any).tenantId;

  if ((req as any).user.role !== 'admin' && (req as any).user.role !== 'editor') {
    return res.status(403).json({ error: "Only admins and editors can approve comments" });
  }

  try {
    db.prepare("UPDATE comments SET is_approved = ? WHERE id = ? AND tenant_id = ?")
      .run(is_approved ? 1 : 0, id, tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete("/api/comments/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const tenantId = (req as any).tenantId;

  if ((req as any).user.role !== 'admin' && (req as any).user.role !== 'editor') {
    return res.status(403).json({ error: "Only admins and editors can delete comments" });
  }

  try {
    db.prepare("DELETE FROM comments WHERE id = ? AND tenant_id = ?").run(id, tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/articles/{id}/view:
 *   post:
 *     summary: Increment article view count
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: View count incremented
 */
app.post("/api/articles/:id/view", (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE articles SET view_count = view_count + 1 WHERE id = ? AND tenant_id = ?").run(id, (req as any).tenantId);
  res.json({ success: true });
});

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of roles
 */
app.get("/api/roles", (req, res) => {
  const roles = db.prepare("SELECT * FROM roles WHERE tenant_id = ?").all((req as any).tenantId);
  res.json(roles);
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT * FROM users WHERE tenant_id = ?").all((req as any).tenantId);
  res.json(users);
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
app.put("/api/users/me", authMiddleware, (req, res) => {
  const { display_name, password } = req.body;
  const userId = (req as any).user.id;
  const tenantId = (req as any).tenantId;

  try {
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      db.prepare("UPDATE users SET display_name = ?, password = ? WHERE id = ? AND tenant_id = ?")
        .run(display_name, hashedPassword, userId, tenantId);
    } else {
      db.prepare("UPDATE users SET display_name = ? WHERE id = ? AND tenant_id = ?")
        .run(display_name, userId, tenantId);
    }
    
    const updatedUser = db.prepare("SELECT id, username, display_name, role FROM users WHERE id = ?").get(userId) as any;
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// API Proxy to Java Backend (Fallback for non-local routes)
let JAVA_BACKEND_URL = process.env.JAVA_BACKEND_URL;
console.log('JAVA_BACKEND_URL:', JAVA_BACKEND_URL || 'Not set');
if (JAVA_BACKEND_URL) {
  if (!JAVA_BACKEND_URL.startsWith('http')) {
    JAVA_BACKEND_URL = 'http://' + JAVA_BACKEND_URL;
  }
  console.log(`Proxying API, Swagger, and Webjars requests to Java Backend: ${JAVA_BACKEND_URL}`);
  app.use(['/api', '/swagger-ui', '/swagger-ui.html', '/v3/api-docs', '/webjars'], createProxyMiddleware({
    target: JAVA_BACKEND_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req, res) => {
        const tenantId = (req as any).tenantId;
        if (tenantId) {
          proxyReq.setHeader('X-Tenant-ID', tenantId);
        }
        console.log(`Proxying ${req.method} ${req.url} to ${JAVA_BACKEND_URL}`);
      },
      error: (err, req, res) => {
        console.error('Proxy Error:', err);
        if (res && 'statusCode' in res && typeof (res as any).end === 'function') {
          (res as any).statusCode = 500;
          (res as any).end('Proxy Error: ' + err.message);
        }
      }
    },
    secure: false,
    timeout: 5000,
    proxyTimeout: 5000
  }));
}

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  try {
    console.log("Initializing Vite server...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware integrated");
  } catch (err) {
    console.error("Failed to initialize Vite server:", err);
  }
} else {
  console.log("Running in production mode, serving static files from dist");
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = 3000;
console.log(`Attempting to start server on port ${PORT}...`);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server successfully started and running on http://localhost:${PORT}`);
});
