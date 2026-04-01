import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db-dm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INT,
        description CLOB,
        display_order INT DEFAULT 0,
        is_published INT DEFAULT 1,
        icon VARCHAR(50)
      )
    `);
  } catch (e) {}

  try {
    await db.execute(`
      CREATE TABLE articles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        category_id INT,
        summary CLOB,
        content CLOB,
        thumbnail_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'draft',
        publish_date VARCHAR(50),
        view_count INT DEFAULT 0,
        reading_time INT DEFAULT 5,
        author VARCHAR(100),
        is_pinned INT DEFAULT 0,
        allow_anonymous INT DEFAULT 1,
        allow_all_registered INT DEFAULT 0,
        allowed_roles CLOB,
        allowed_users CLOB
      )
    `);
  } catch (e) {}

  try {
    await db.execute(`
      CREATE TABLE comments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        article_id INT NOT NULL,
        author VARCHAR(100) NOT NULL,
        content CLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {}

  try {
    await db.execute(`
      CREATE TABLE roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);
  } catch (e) {}

  try {
    await db.execute(`
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100)
      )
    `);
  } catch (e) {}

  // Add missing columns if they don't exist (Dameng syntax)
  const alterTable = async (table: string, column: string, type: string) => {
    try {
      await db.execute(`ALTER TABLE ${table} ADD ${column} ${type}`);
    } catch (e) {}
  };

  await alterTable('articles', 'allow_anonymous', 'INT DEFAULT 1');
  await alterTable('articles', 'allow_all_registered', 'INT DEFAULT 0');
  await alterTable('articles', 'allowed_roles', 'CLOB');
  await alterTable('articles', 'allowed_users', 'CLOB');
  await alterTable('articles', 'is_pinned', 'INT DEFAULT 0');

  // Seed data if empty
  const roleCount = await db.queryOne("SELECT COUNT(*) as count FROM roles");
  if (roleCount && roleCount.count === 0) {
    const roles = ["管理员", "编辑", "普通员工", "人力资源", "技术委员会", "财务部", "市场部"];
    for (const role of roles) {
      await db.execute("INSERT INTO roles (name) VALUES (?)", [role]);
    }
    console.log("Roles seeded");
  }

  const userCount = await db.queryOne("SELECT COUNT(*) as count FROM users");
  if (userCount && userCount.count === 0) {
    const users = [
      ["admin", "系统管理员"],
      ["sarah_j", "Sarah J."],
      ["hr_admin", "HR Admin"],
      ["zhang_g", "张工"],
      ["finance_user", "财务专员"],
      ["marketing_user", "市场专员"],
      ["wang_x", "小王"]
    ];
    for (const user of users) {
      await db.execute("INSERT INTO users (username, display_name) VALUES (?, ?)", user);
    }
    console.log("Users seeded");
  }

  const categoryCount = await db.queryOne("SELECT COUNT(*) as count FROM categories");
  if (categoryCount && categoryCount.count === 0) {
    await db.execute("INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)", ["公司新闻", "公司最新的动态和公告", "newspaper"]);
    await db.execute("INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)", ["部门资源", "各部门的规章制度和资源", "folder"]);
    
    const newsCat = await db.queryOne("SELECT id FROM categories WHERE name = ?", ["公司新闻"]);
    const deptCat = await db.queryOne("SELECT id FROM categories WHERE name = ?", ["部门资源"]);
    
    if (newsCat) await db.execute("INSERT INTO categories (name, parent_id, icon) VALUES (?, ?, ?)", ["公告", newsCat.id, "campaign"]);
    if (deptCat) await db.execute("INSERT INTO categories (name, parent_id, icon) VALUES (?, ?, ?)", ["人力资源政策", deptCat.id, "description"]);
    console.log("Categories seeded");
  }

  const articleCount = await db.queryOne("SELECT COUNT(*) as count FROM articles");
  if (articleCount && articleCount.count === 0) {
    // Fetch actual category IDs to avoid hardcoding issues
    const newsCat = await db.queryOne("SELECT id FROM categories WHERE name = ?", ["公司新闻"]);
    const deptCat = await db.queryOne("SELECT id FROM categories WHERE name = ?", ["部门资源"]);
    const noticeCat = await db.queryOne("SELECT id FROM categories WHERE name = ?", ["公告"]);
    const hrPolicyCat = await db.queryOne("SELECT id FROM categories WHERE name = ?", ["人力资源政策"]);

    const newsId = newsCat?.id || 1;
    const deptId = deptCat?.id || 2;
    const noticeId = noticeCat?.id || 3;
    const hrPolicyId = hrPolicyCat?.id || 4;

    const mockArticles = [
      ["2024年第一季度战略回顾", "Sarah J. 更新于 2 小时前", noticeId, "探索多模态模型如何在 2024 年重塑创意产业和软件工程的格局。", "这是正文内容...", "published", "2024-05-12", 12450, 8, "Sarah J."],
      ["新员工入职指南", "HR 部门", hrPolicyId, "欢迎加入公司！这份指南将帮助你快速熟悉环境和流程。", "入职第一天需要准备...", "published", "2024-04-01", 3500, 15, "HR Admin"],
      ["关于端午节放假的通知", "行政部", noticeId, "2024年端午节放假安排及注意事项。", "根据国家法定节假日安排...", "published", "2024-06-01", 890, 2, "行政部"],
      ["AI 技术在产品中的应用探索", "技术委员会", newsId, "讨论如何将最新的大语言模型集成到我们的核心产品线中。", "技术架构方案如下...", "draft", "2024-06-10", 0, 12, "张工"],
      ["2023 年度优秀员工表彰名单", "总裁办", noticeId, "回顾过去一年中表现卓越的团队 and 个人。", "经过严格评选...", "published", "2024-02-15", 5600, 5, "总裁办"],
      ["远程办公安全规范 (V2.0)", "IT 安全组", hrPolicyId, "更新后的远程访问 VPN 使用规范和数据安全要求。", "请所有员工务必遵守...", "pending", "2024-06-15", 0, 10, "Security Team"],
      ["公司十周年庆典策划草案", "市场部", newsId, "初步构思公司十周年庆典的主题、场地和活动流程。", "方案 A：户外团建...", "draft", "2024-06-20", 0, 20, "市场部"],
      ["2022 年差旅报销政策 (已废止)", "财务部", hrPolicyId, "旧版的差旅报销标准和流程说明。", "本政策已由 2024 版取代...", "archived", "2022-01-10", 1200, 8, "Finance"],
      ["季度团建活动投票", "行政部", noticeId, "请大家在三个备选方案中选出最喜欢的团建目的地。", "方案 1：海边烧烤...", "published", "2024-05-20", 2100, 3, "行政部"],
      ["新版办公系统操作手册", "IT 部门", hrPolicyId, "详细介绍新上线的 OA 系统各项功能的使用方法。", "登录方式、审批流...", "pending", "2024-06-18", 0, 25, "IT Support"],
      ["五月份销售业绩简报", "销售管理部", newsId, "分析五月份各区域销售目标的达成情况及市场反馈。", "华东区表现亮眼...", "published", "2024-06-05", 1500, 6, "Sales Manager"],
      ["关于办公区绿化升级的建议", "员工委员会", deptId, "收集员工对改善办公环境绿植布置的意见。", "希望能增加一些多肉植物...", "archived", "2023-11-20", 450, 4, "小王"]
    ];

    for (const article of mockArticles) {
      await db.execute(`
        INSERT INTO articles (title, subtitle, category_id, summary, content, status, publish_date, view_count, reading_time, author)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, article);
    }
    console.log("Articles seeded");
  }
}

async function startServer() {
  console.log("Starting server...");
  try {
    await initDb();
    console.log("Database initialized");
  } catch (e) {
    console.error("Database initialization failed:", e);
  }
  
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await db.query("SELECT * FROM categories ORDER BY display_order ASC");
      res.json(categories);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name, parent_id, description, display_order, is_published, icon } = req.body;
      const lastId = await db.withConnection(async (conn) => {
        await conn.execute(`
          INSERT INTO categories (name, parent_id, description, display_order, is_published, icon)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [name, parent_id, description, display_order, is_published, icon]);
        
        const result = await conn.execute("SELECT @@IDENTITY as id");
        const rows = result.rows || [];
        const metaData = result.metaData || [];
        if (rows.length > 0) {
          const obj: any = {};
          metaData.forEach((meta: any, index: number) => {
            obj[meta.name.toLowerCase()] = rows[0][index];
          });
          return obj.id;
        }
        return null;
      });
      res.json({ id: lastId });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, parent_id, description, display_order, is_published, icon } = req.body;
      await db.execute(`
        UPDATE categories 
        SET name = ?, parent_id = ?, description = ?, display_order = ?, is_published = ?, icon = ?
        WHERE id = ?
      `, [name, parent_id, description, display_order, is_published, icon, id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("DELETE FROM categories WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("/api/articles", async (req, res) => {
    try {
      const articles = await db.query(`
        SELECT a.*, c.name as category_name 
        FROM articles a 
        LEFT JOIN categories c ON a.category_id = c.id
        ORDER BY a.is_pinned DESC, a.publish_date DESC
      `);
      res.json(articles);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const article = await db.queryOne(`
        SELECT a.*, c.name as category_name 
        FROM articles a 
        LEFT JOIN categories c ON a.category_id = c.id 
        WHERE a.id = ?
      `, [req.params.id]);
      res.json(article);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/api/articles", async (req, res) => {
    try {
      const { title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users } = req.body;
      const lastId = await db.withConnection(async (conn) => {
        await conn.execute(`
          INSERT INTO articles (title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous ? 1 : 0, allow_all_registered ? 1 : 0, allowed_roles, allowed_users]);
        
        const result = await conn.execute("SELECT @@IDENTITY as id");
        const rows = result.rows || [];
        const metaData = result.metaData || [];
        if (rows.length > 0) {
          const obj: any = {};
          metaData.forEach((meta: any, index: number) => {
            obj[meta.name.toLowerCase()] = rows[0][index];
          });
          return obj.id;
        }
        return null;
      });
      res.json({ id: lastId });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.put("/api/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous, allow_all_registered, allowed_roles, allowed_users } = req.body;
      await db.execute(`
        UPDATE articles 
        SET title = ?, subtitle = ?, category_id = ?, summary = ?, content = ?, thumbnail_url = ?, status = ?, publish_date = ?, reading_time = ?, allow_anonymous = ?, allow_all_registered = ?, allowed_roles = ?, allowed_users = ?
        WHERE id = ?
      `, [title, subtitle, category_id, summary, content, thumbnail_url, status, publish_date, reading_time, allow_anonymous ? 1 : 0, allow_all_registered ? 1 : 0, allowed_roles, allowed_users, id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.patch("/api/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const fields = Object.keys(updates);
      if (fields.length === 0) return res.json({ success: true });

      const setClause = fields.map(field => `${field} = ?`).join(", ");
      const values = fields.map(field => {
        if (field === 'allow_anonymous' || field === 'allow_all_registered' || field === 'is_pinned') {
          return updates[field] ? 1 : 0;
        }
        return updates[field];
      });
      
      await db.execute(`UPDATE articles SET ${setClause} WHERE id = ?`, [...values, id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.delete("/api/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("DELETE FROM articles WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("/api/articles/:id/comments", async (req, res) => {
    try {
      const comments = await db.query("SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC", [req.params.id]);
      res.json(comments);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/api/articles/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const { author, content } = req.body;
      const lastId = await db.withConnection(async (conn) => {
        await conn.execute(`
          INSERT INTO comments (article_id, author, content)
          VALUES (?, ?, ?)
        `, [id, author, content]);
        
        const result = await conn.execute("SELECT @@IDENTITY as id");
        const rows = result.rows || [];
        const metaData = result.metaData || [];
        if (rows.length > 0) {
          const obj: any = {};
          metaData.forEach((meta: any, index: number) => {
            obj[meta.name.toLowerCase()] = rows[0][index];
          });
          return obj.id;
        }
        return null;
      });
      res.json({ id: lastId });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/api/articles/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("UPDATE articles SET view_count = view_count + 1 WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("/api/roles", async (req, res) => {
    try {
      const roles = await db.query("SELECT * FROM roles");
      res.json(roles);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await db.query("SELECT * FROM users");
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
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
