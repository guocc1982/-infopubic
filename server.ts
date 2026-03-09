import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("hub.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    icon TEXT,
    FOREIGN KEY (parent_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT,
    category_id INTEGER,
    summary TEXT,
    content TEXT,
    thumbnail_url TEXT,
    status TEXT DEFAULT 'draft', -- draft, pending, published, archived
    publish_date TEXT,
    view_count INTEGER DEFAULT 0,
    reading_time INTEGER DEFAULT 5,
    author TEXT,
    allow_anonymous INTEGER DEFAULT 1,
    allow_all_registered INTEGER DEFAULT 0,
    allowed_roles TEXT,
    allowed_users TEXT,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles (id)
  );
`);

// Add missing columns if they don't exist
try {
  db.prepare("ALTER TABLE articles ADD COLUMN allow_anonymous INTEGER DEFAULT 1").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE articles ADD COLUMN allow_all_registered INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE articles ADD COLUMN allowed_roles TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE articles ADD COLUMN allowed_users TEXT").run();
} catch (e) {}

// Seed data if empty
const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (categoryCount.count === 0) {
  db.prepare("INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)").run("公司新闻", "公司最新的动态和公告", "newspaper");
  db.prepare("INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)").run("部门资源", "各部门的规章制度和资源", "folder");
  db.prepare("INSERT INTO categories (name, parent_id, icon) VALUES (?, ?, ?)").run("公告", 1, "campaign");
  db.prepare("INSERT INTO categories (name, parent_id, icon) VALUES (?, ?, ?)").run("人力资源政策", 2, "description");
}

const articleCount = db.prepare("SELECT COUNT(*) as count FROM articles").get() as { count: number };
if (articleCount.count === 0) {
  const insertArticle = db.prepare(`
    INSERT INTO articles (title, subtitle, category_id, summary, content, status, publish_date, view_count, reading_time, author)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const mockArticles = [
    ["2024年第一季度战略回顾", "Sarah J. 更新于 2 小时前", 3, "探索多模态模型如何在 2024 年重塑创意产业和软件工程的格局。", "这是正文内容...", "published", "2024-05-12", 12450, 8, "Sarah J."],
    ["新员工入职指南", "HR 部门", 4, "欢迎加入公司！这份指南将帮助你快速熟悉环境和流程。", "入职第一天需要准备...", "published", "2024-04-01", 3500, 15, "HR Admin"],
    ["关于端午节放假的通知", "行政部", 3, "2024年端午节放假安排及注意事项。", "根据国家法定节假日安排...", "published", "2024-06-01", 890, 2, "行政部"],
    ["AI 技术在产品中的应用探索", "技术委员会", 1, "讨论如何将最新的大语言模型集成到我们的核心产品线中。", "技术架构方案如下...", "draft", "2024-06-10", 0, 12, "张工"],
    ["2023 年度优秀员工表彰名单", "总裁办", 3, "回顾过去一年中表现卓越的团队和个人。", "经过严格评选...", "published", "2024-02-15", 5600, 5, "总裁办"],
    ["远程办公安全规范 (V2.0)", "IT 安全组", 4, "更新后的远程访问 VPN 使用规范和数据安全要求。", "请所有员工务必遵守...", "pending", "2024-06-15", 0, 10, "Security Team"],
    ["公司十周年庆典策划草案", "市场部", 1, "初步构思公司十周年庆典的主题、场地和活动流程。", "方案 A：户外团建...", "draft", "2024-06-20", 0, 20, "市场部"],
    ["2022 年差旅报销政策 (已废止)", "财务部", 4, "旧版的差旅报销标准和流程说明。", "本政策已由 2024 版取代...", "archived", "2022-01-10", 1200, 8, "Finance"],
    ["季度团建活动投票", "行政部", 3, "请大家在三个备选方案中选出最喜欢的团建目的地。", "方案 1：海边烧烤...", "published", "2024-05-20", 2100, 3, "行政部"],
    ["新版办公系统操作手册", "IT 部门", 4, "详细介绍新上线的 OA 系统各项功能的使用方法。", "登录方式、审批流...", "pending", "2024-06-18", 0, 25, "IT Support"],
    ["五月份销售业绩简报", "销售管理部", 1, "分析五月份各区域销售目标的达成情况及市场反馈。", "华东区表现亮眼...", "published", "2024-06-05", 1500, 6, "Sales Manager"],
    ["关于办公区绿化升级的建议", "员工委员会", 2, "收集员工对改善办公环境绿植布置的意见。", "希望能增加一些多肉植物...", "archived", "2023-11-20", 450, 4, "小王"]
  ];

  for (const article of mockArticles) {
    insertArticle.run(...article);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories ORDER BY display_order ASC").all();
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const { name, parent_id, description, display_order, is_published, icon } = req.body;
    const result = db.prepare(`
      INSERT INTO categories (name, parent_id, description, display_order, is_published, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, parent_id, description, display_order, is_published, icon);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    const { name, parent_id, description, display_order, is_published, icon } = req.body;
    db.prepare(`
      UPDATE categories 
      SET name = ?, parent_id = ?, description = ?, display_order = ?, is_published = ?, icon = ?
      WHERE id = ?
    `).run(name, parent_id, description, display_order, is_published, icon, id);
    res.json({ success: true });
  });

  app.delete("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/articles", (req, res) => {
    const articles = db.prepare(`
      SELECT a.*, c.name as category_name 
      FROM articles a 
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY a.publish_date DESC
    `).all();
    res.json(articles);
  });

  app.get("/api/articles/:id", (req, res) => {
    const article = db.prepare("SELECT * FROM articles WHERE id = ?").get(req.params.id);
    res.json(article);
  });

  app.post("/api/articles", (req, res) => {
    const { title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users } = req.body;
    const result = db.prepare(`
      INSERT INTO articles (title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous ? 1 : 0, allow_all_registered ? 1 : 0, allowed_roles, allowed_users);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/articles/:id", (req, res) => {
    const { id } = req.params;
    const { title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users } = req.body;
    db.prepare(`
      UPDATE articles 
      SET title = ?, subtitle = ?, category_id = ?, summary = ?, content = ?, thumbnail_url = ?, status = ?, publish_date = ?, reading_time = ?, allow_anonymous = ?, allow_all_registered = ?, allowed_roles = ?, allowed_users = ?
      WHERE id = ?
    `).run(title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous ? 1 : 0, allow_all_registered ? 1 : 0, allowed_roles, allowed_users, id);
    res.json({ success: true });
  });

  app.delete("/api/articles/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM articles WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/articles/:id/comments", (req, res) => {
    const comments = db.prepare("SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(comments);
  });

  app.post("/api/articles/:id/comments", (req, res) => {
    const { id } = req.params;
    const { author, content } = req.body;
    const result = db.prepare(`
      INSERT INTO comments (article_id, author, content)
      VALUES (?, ?, ?)
    `).run(id, author, content);
    res.json({ id: result.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
