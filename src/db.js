const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { categories, notices, posts, users } = require("./data");

const dbDir = path.join(__dirname, "..", "data");
const dbFile = path.join(dbDir, "clone.db");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbFile);

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      nickname TEXT NOT NULL,
      city TEXT,
      avatar TEXT,
      phone TEXT,
      bio TEXT,
      wallet_balance REAL DEFAULT 0,
      gold_balance INTEGER DEFAULT 18,
      background_image TEXT DEFAULT '',
      notify_comment INTEGER DEFAULT 1,
      notify_message INTEGER DEFAULT 1,
      membership_status TEXT DEFAULT 'inactive',
      membership_expires_at TEXT DEFAULT '',
      membership_plan_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      cover TEXT,
      price_label TEXT,
      location TEXT,
      created_at TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      tags_json TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS wallet (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      balance REAL DEFAULT 98.66,
      refresh_package_count INTEGER DEFAULT 20
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS refresh_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      interval_minutes INTEGER DEFAULT 60,
      max_refreshes INTEGER DEFAULT 10
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      role TEXT DEFAULT 'operator'
    );

    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      duration_days INTEGER NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS membership_benefits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS category_banners (
      category_id INTEGER PRIMARY KEY,
      image_url TEXT DEFAULT '',
      target_url TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_type TEXT NOT NULL,
      plan_id INTEGER,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      note TEXT,
      effect_applied INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_auth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS withdraw_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      account_name TEXT,
      account_no TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      contact_name TEXT,
      phone TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS user_withdraw_profiles (
      user_id INTEGER PRIMARY KEY,
      account_name TEXT,
      account_type TEXT,
      account_no TEXT
    );

    CREATE TABLE IF NOT EXISTS home_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      action_type TEXT NOT NULL DEFAULT 'qr',
      target_url TEXT DEFAULT '',
      qr_image TEXT DEFAULT '',
      modal_title TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS checkin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL,
      reward_gold INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      href TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS partner_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      city TEXT,
      phone TEXT,
      intro TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);

  const count = db.prepare("SELECT COUNT(*) AS count FROM posts").get().count;
  if (count === 0) {
    seedDatabase();
  }

  const userColumns = db.prepare("PRAGMA table_info(users)").all().map((col) => col.name);
  if (!userColumns.includes("membership_status")) {
    db.exec("ALTER TABLE users ADD COLUMN membership_status TEXT DEFAULT 'inactive'");
  }
  if (!userColumns.includes("membership_expires_at")) {
    db.exec("ALTER TABLE users ADD COLUMN membership_expires_at TEXT DEFAULT ''");
  }
  if (!userColumns.includes("membership_plan_id")) {
    db.exec("ALTER TABLE users ADD COLUMN membership_plan_id INTEGER");
  }
  if (!userColumns.includes("wallet_balance")) {
    db.exec("ALTER TABLE users ADD COLUMN wallet_balance REAL DEFAULT 0");
  }
  if (!userColumns.includes("gold_balance")) {
    db.exec("ALTER TABLE users ADD COLUMN gold_balance INTEGER DEFAULT 18");
  }
  if (!userColumns.includes("background_image")) {
    db.exec("ALTER TABLE users ADD COLUMN background_image TEXT DEFAULT ''");
  }
  if (!userColumns.includes("notify_comment")) {
    db.exec("ALTER TABLE users ADD COLUMN notify_comment INTEGER DEFAULT 1");
  }
  if (!userColumns.includes("notify_message")) {
    db.exec("ALTER TABLE users ADD COLUMN notify_message INTEGER DEFAULT 1");
  }
  const categoryColumns = db.prepare("PRAGMA table_info(categories)").all().map((col) => col.name);
  if (!categoryColumns.includes("sort_order")) {
    db.exec("ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0");
  }
  const noticeColumns = db.prepare("PRAGMA table_info(notices)").all().map((col) => col.name);
  if (!noticeColumns.includes("sort_order")) {
    db.exec("ALTER TABLE notices ADD COLUMN sort_order INTEGER DEFAULT 0");
  }
  const adminColumns = db.prepare("PRAGMA table_info(admin_users)").all().map((col) => col.name);
  if (!adminColumns.includes("role")) {
    db.exec("ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'operator'");
  }
  const planColumns = db.prepare("PRAGMA table_info(membership_plans)").all().map((col) => col.name);
  if (!planColumns.includes("sort_order")) {
    db.exec("ALTER TABLE membership_plans ADD COLUMN sort_order INTEGER DEFAULT 0");
  }
  const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map((col) => col.name);
  if (!orderColumns.includes("effect_applied")) {
    db.exec("ALTER TABLE orders ADD COLUMN effect_applied INTEGER DEFAULT 0");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS membership_benefits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_banners (
      category_id INTEGER PRIMARY KEY,
      image_url TEXT DEFAULT '',
      target_url TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1
    );
  `);
  db.prepare("UPDATE orders SET effect_applied = 1 WHERE status = 'paid'").run();

  db.prepare("INSERT OR IGNORE INTO refresh_settings (id, interval_minutes, max_refreshes) VALUES (1, 60, 10)").run();
  db.prepare("INSERT OR IGNORE INTO wallet (id, balance, refresh_package_count) VALUES (1, 98.66, 20)").run();
  db.prepare(`
    INSERT OR IGNORE INTO admin_users (id, username, password, nickname, role)
    VALUES (1, 'admin', 'admin123', '超级管理员', 'super_admin')
  `).run();
  db.prepare("UPDATE admin_users SET role = 'super_admin' WHERE id = 1").run();
  db.prepare("UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0), gold_balance = COALESCE(gold_balance, 18)").run();

  if (db.prepare("SELECT COUNT(*) AS count FROM home_links").get().count === 0) {
    const insertHomeLink = db.prepare(`
      INSERT INTO home_links (link_key, label, action_type, target_url, qr_image, modal_title, enabled, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertHomeLink.run("follow", "关注", "qr", "", "/wj/lamian21.png", "长按二维码关注平台", 1, 10);
    insertHomeLink.run("admin", "管理员", "qr", "", "/wj/lamian21.png", "长按二维码添加管理员", 1, 20);
    insertHomeLink.run("group", "进拉面群", "qr", "", "/wj/lamian21.png", "邀请你加入你所在城市拉面群", 1, 30);
    insertHomeLink.run("shop", "马丁商城", "qr", "", "/wj/SYLF1.png", "商城入口已预留，可继续接入商品系统", 1, 40);
    insertHomeLink.run("partner", "加盟合伙人", "link", "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5", "", "加盟合伙人", 1, 50);
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM membership_plans").get().count === 0) {
    const insertPlan = db.prepare(`
      INSERT INTO membership_plans (name, price, original_price, duration_days, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPlan.run("会员月卡", 12, 69, 30, "免费打电话发布信息", 10);
    insertPlan.run("会员季卡", 29, 159, 90, "免费打电话发布信息", 20);
    insertPlan.run("会员年卡", 89, 459, 365, "免费打电话发布信息", 30);
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM membership_benefits").get().count === 0) {
    const insertBenefit = db.prepare(`
      INSERT INTO membership_benefits (content, sort_order)
      VALUES (?, ?)
    `);
    insertBenefit.run("每日免费发布2条信息", 10);
    insertBenefit.run("免费查看所有联系方式", 20);
    insertBenefit.run("置顶消息5折", 30);
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM orders").get().count === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO orders (user_id, order_type, plan_id, amount, status, created_at, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertOrder.run(18681, "membership", 1, 12, "paid", "2026-03-20 09:30:00", "会员月卡");
    insertOrder.run(71724, "membership", 2, 29, "paid", "2026-03-19 14:15:00", "会员季卡");
    insertOrder.run(73255, "wallet_topup", null, 50, "paid", "2026-03-18 20:12:00", "钱包充值");
  }

  db.prepare(`
    UPDATE users
    SET membership_status = 'active',
        membership_expires_at = '2026-04-19 23:59:59',
        membership_plan_id = 1
    WHERE id = 18681 AND (membership_status IS NULL OR membership_status = 'inactive')
  `).run();
  db.prepare(`
    UPDATE users
    SET wallet_balance = 88.5,
        gold_balance = 18,
        background_image = 'https://images.unsplash.com/photo-1498579809087-ef1e558fd1da?auto=format&fit=crop&w=1200&q=80'
    WHERE id = 18681
  `).run();
  db.prepare(`
    INSERT OR IGNORE INTO user_auth (user_id, phone, password, created_at)
    VALUES (18681, '13800000001', '123456', datetime('now', 'localtime'))
  `).run();
  db.prepare(`
    INSERT OR IGNORE INTO user_withdraw_profiles (user_id, account_name, account_type, account_no)
    VALUES (18681, '王釜嵊', 'wechat', 'wx-demo-18681')
  `).run();
  db.prepare(`
    INSERT OR IGNORE INTO user_addresses (user_id, contact_name, phone, address)
    VALUES (18681, '王釜嵊', '13800000001', '拉面城东区 88 号')
  `).run();
  if (db.prepare("SELECT COUNT(*) AS count FROM wallet_transactions WHERE user_id = 18681").get().count === 0) {
    const insertWalletTransaction = db.prepare(`
      INSERT INTO wallet_transactions (user_id, type, amount, status, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertWalletTransaction.run(18681, "topup", 50, "success", "初始化充值", "2026-03-20 10:00:00");
    insertWalletTransaction.run(18681, "consume", -12, "success", "购买会员月卡", "2026-03-20 10:02:00");
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM checkin_logs WHERE user_id = 18681").get().count === 0) {
    const insertCheckin = db.prepare(`
      INSERT INTO checkin_logs (user_id, checkin_date, reward_gold, created_at)
      VALUES (?, ?, ?, ?)
    `);
    ["2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19", "2026-03-20", "2026-03-21"].forEach((day) => {
      insertCheckin.run(18681, day, 1, `${day} 09:00:00`);
    });
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM user_messages WHERE user_id = 18681").get().count === 0) {
    const insertMessage = db.prepare(`
      INSERT INTO user_messages (user_id, type, title, content, href, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMessage.run(18681, "system", "平台公告", "平台不能保证信息真实性，请勿提前支付任何费用", "", 0, "2026-03-22 09:30:00");
    insertMessage.run(18681, "wallet", "钱包通知", "您有一笔充值已到账，当前余额可用于刷新或会员开通。", "/plugin.php?id=xigua_hb&ac=qianbao", 0, "2026-03-21 10:15:00");
  }
}

function seedDatabase() {
  const insertUser = db.prepare(`
    INSERT INTO users (id, nickname, city, avatar, phone, bio)
    VALUES (@id, @nickname, @city, @avatar, @phone, @bio)
  `);
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, icon, sort_order)
    VALUES (@id, @name, @icon, @sort_order)
  `);
  const insertPost = db.prepare(`
    INSERT INTO posts (
      id, user_id, category_id, title, summary, content, cover, price_label,
      location, created_at, views, likes, shares, tags_json, status
    ) VALUES (
      @id, @userId, @categoryId, @title, @summary, @content, @cover, @priceLabel,
      @location, @createdAt, @views, @likes, @shares, @tagsJson, 'active'
    )
  `);
  const insertNotice = db.prepare("INSERT INTO notices (text, sort_order) VALUES (?, ?)");

  const seed = db.transaction(() => {
    users.forEach((user) => insertUser.run(user));
    categories.forEach((category, index) => insertCategory.run({ ...category, sort_order: (index + 1) * 10 }));
    posts.forEach((post) => insertPost.run({ ...post, tagsJson: JSON.stringify(post.tags) }));
    notices.forEach((notice, index) => insertNotice.run(notice, (index + 1) * 10));
    db.prepare("INSERT OR REPLACE INTO wallet (id, balance, refresh_package_count) VALUES (1, 98.66, 20)").run();
    db.prepare("INSERT OR REPLACE INTO refresh_settings (id, interval_minutes, max_refreshes) VALUES (1, 60, 10)").run();
  });

  seed();
}

function normalizePost(row) {
  return {
    ...row,
    tags: JSON.parse(row.tags_json || "[]")
  };
}

function getCategories() {
  return db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, id ASC").all();
}

function getNotices() {
  return db.prepare("SELECT * FROM notices ORDER BY sort_order ASC, id ASC").all();
}

function buildHomeTickerItems(posts) {
  const latestPosts = posts
    .filter((post) => post.status === "active")
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  const officialItems = getNotices().map((notice, index) => ({
    type: "official",
    text: notice.text,
    // Keep pure platform notices non-clickable, but let publish-style notices jump to details.
    href: notice.text.includes("发布了") && latestPosts[index - 1]
      ? `/plugin.php?id=xigua_hb&ac=view&pubid=${latestPosts[index - 1].id}`
      : ""
  }));

  const userItems = latestPosts
    .slice(0, 5)
    .map((post) => ({
      type: "post",
      text: `[${String(post.created_at).slice(5, 10)}]${post.nickname}发布了${post.title}`,
      href: `/plugin.php?id=xigua_hb&ac=view&pubid=${post.id}`
    }));

  return [...officialItems, ...userItems];
}

function getStats() {
  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(views), 0) AS total_views,
      COUNT(*) AS total_posts,
      (SELECT COUNT(*) FROM users) AS total_users
    FROM posts
  `).get();

  return {
    views: (stats.total_views / 100000000).toFixed(2),
    posts: (stats.total_posts / 10000).toFixed(1),
    users: (stats.total_users / 10000).toFixed(1)
  };
}

function basePostQuery(whereClause = "WHERE 1=1", orderBy = "ORDER BY datetime(posts.created_at) DESC") {
  return `
    SELECT posts.*, users.nickname, users.avatar, users.city, users.phone, users.bio, categories.name AS category_name
    FROM posts
    JOIN users ON users.id = posts.user_id
    JOIN categories ON categories.id = posts.category_id
    ${whereClause}
    ${orderBy}
  `;
}

function getHomeData(keyword = "") {
  const hasKeyword = keyword && keyword.trim();
  const whereClause = hasKeyword
    ? "WHERE posts.status = 'active' AND (posts.title LIKE @keyword OR posts.summary LIKE @keyword OR posts.location LIKE @keyword)"
    : "WHERE posts.status = 'active'";
  const postRows = db.prepare(basePostQuery(whereClause)).all(
    hasKeyword ? { keyword: `%${keyword.trim()}%` } : {}
  );

  return {
    categories: getCategories(),
    homeLinks: getHomeLinks(),
    notices: getNotices(),
    tickerItems: buildHomeTickerItems(postRows),
    posts: postRows.map(normalizePost),
    wallet: getWallet(),
    stats: getStats(),
    keyword: keyword || ""
  };
}

function getPostById(id) {
  const row = db.prepare(basePostQuery("WHERE posts.id = ?")).get(id);
  return row ? normalizePost(row) : null;
}

function getPostsByCategory(categoryId, options = "") {
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(categoryId);
  const normalizedOptions = typeof options === "string" ? { keyword: options } : (options || {});
  const keyword = String(normalizedOptions.keyword || "").trim();
  const area = String(normalizedOptions.area || "").trim();
  const tag = String(normalizedOptions.tag || "").trim();
  const sort = String(normalizedOptions.sort || "default").trim();

  const clauses = ["posts.category_id = @categoryId", "posts.status = 'active'"];
  const params = { categoryId };

  if (keyword) {
    clauses.push("(posts.title LIKE @keyword OR posts.summary LIKE @keyword OR posts.location LIKE @keyword OR users.city LIKE @keyword OR posts.content LIKE @keyword)");
    params.keyword = `%${keyword}%`;
  }
  if (area) {
    clauses.push("(users.city LIKE @area OR posts.location LIKE @area)");
    params.area = `%${area}%`;
  }
  if (tag) {
    clauses.push("posts.tags_json LIKE @tag");
    params.tag = `%${tag}%`;
  }

  let orderBy = "ORDER BY datetime(posts.created_at) DESC";
  if (sort === "views") {
    orderBy = "ORDER BY posts.views DESC, datetime(posts.created_at) DESC";
  } else if (sort === "likes") {
    orderBy = "ORDER BY posts.likes DESC, datetime(posts.created_at) DESC";
  } else if (sort === "oldest") {
    orderBy = "ORDER BY datetime(posts.created_at) ASC";
  }

  const allCategoryRows = db.prepare(basePostQuery("WHERE posts.category_id = ? AND posts.status = 'active'")).all(categoryId);
  const normalizedAllPosts = allCategoryRows.map(normalizePost);
  const postRows = db.prepare(basePostQuery(`WHERE ${clauses.join(" AND ")}`, orderBy)).all(params);
  const posts = postRows.map(normalizePost);

  const presetTagsByCategory = {
    1034: ["面匠求职", "炒匠求职", "两口求职", "跑堂求职", "服务员求职", "洗碗求职"],
    1035: ["招聘面匠", "招聘炒匠", "招聘两口", "招聘跑堂", "招聘服务员", "招聘洗碗工"],
    28: ["整店转让", "空店转让", "设备带转", "旺铺转让"],
    1038: ["同城拼车", "跨城顺风车", "人找车", "车找人"],
    1079: ["饭店用品", "二手设备", "桌椅转让", "厨房设备"]
  };

  const areas = Array.from(new Set(
    normalizedAllPosts
      .map((post) => (post.city || post.location || "").trim())
      .filter(Boolean)
  )).slice(0, 8);
  const dynamicTags = normalizedAllPosts
    .flatMap((post) => post.tags || [])
    .filter(Boolean);
  const tags = Array.from(new Set([
    ...((category && presetTagsByCategory[category.id]) || []),
    ...dynamicTags
  ])).slice(0, 8);

  return {
    category,
    banner: getCategoryBanner(categoryId),
    posts,
    keyword,
    filters: {
      area,
      tag,
      sort
    },
    filterOptions: {
      areas,
      tags,
      sorts: [
        { value: "default", label: "默认排序" },
        { value: "views", label: "浏览优先" },
        { value: "likes", label: "点赞优先" },
        { value: "oldest", label: "最早发布" }
      ]
    }
  };
}

function getCategoryBanner(categoryId) {
  return db.prepare("SELECT * FROM category_banners WHERE category_id = ?").get(categoryId) || null;
}

function getUserProfile(userId = 18681) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const userPosts = db.prepare(basePostQuery("WHERE posts.user_id = ?")).all(userId).map(normalizePost);
  const totalViews = userPosts.reduce((sum, post) => sum + Number(post.views || 0), 0);
  return {
    user,
    posts: userPosts,
    wallet: getUserWallet(userId),
    stats: {
      totalPosts: userPosts.length,
      totalViews,
      myViews: 0
    }
  };
}

function getPublishFormData(editId) {
  return {
    categories: getCategories(),
    post: editId ? getPostById(editId) : null
  };
}

function incrementShare(postId) {
  db.prepare("UPDATE posts SET shares = shares + 1 WHERE id = ?").run(postId);
  return getPostById(postId);
}

function incrementLike(postId) {
  db.prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?").run(postId);
  return getPostById(postId);
}

function incrementViews(postId) {
  db.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").run(postId);
}

function getWallet() {
  return db.prepare("SELECT * FROM wallet WHERE id = 1").get();
}

function getUserById(userId) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
}

function getUserWallet(userId) {
  const user = getUserById(userId);
  return {
    balance: Number(user?.wallet_balance || 0),
    gold: Number(user?.gold_balance || 0)
  };
}

function getUserWalletData(userId) {
  return {
    wallet: getUserWallet(userId),
    transactions: db.prepare(`
      SELECT * FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 20
    `).all(userId),
    withdrawRequests: db.prepare(`
      SELECT * FROM withdraw_requests
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 20
    `).all(userId),
    withdrawProfile: db.prepare("SELECT * FROM user_withdraw_profiles WHERE user_id = ?").get(userId)
  };
}

function getUserOrders(userId, orderType = "") {
  const params = { userId };
  const where = ["orders.user_id = @userId"];
  if (orderType) {
    where.push("orders.order_type = @orderType");
    params.orderType = orderType;
  }
  return db.prepare(`
    SELECT
      orders.*,
      membership_plans.name AS plan_name
    FROM orders
    LEFT JOIN membership_plans ON membership_plans.id = orders.plan_id
    WHERE ${where.join(" AND ")}
    ORDER BY datetime(orders.created_at) DESC, orders.id DESC
  `).all(params);
}

function getMembershipCenterData(userId) {
  const user = getUserById(userId);
  return {
    user,
    plans: getMembershipPlans(),
    benefits: getMembershipBenefits(),
    orders: getUserOrders(userId, "membership")
  };
}

function getMessageCenterData(userId) {
  const user = getUserById(userId);
  const messages = db.prepare(`
    SELECT * FROM user_messages
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
  `).all(userId);
  const myPosts = db.prepare(basePostQuery("WHERE posts.user_id = ?")).all(userId).map(normalizePost).slice(0, 5);
  const dynamic = myPosts.map((post) => ({
    type: "post",
    title: "信息动态",
    content: `${post.title}，当前浏览 ${post.views} 次，点赞 ${post.likes} 次`,
    created_at: post.created_at,
    href: `/plugin.php?id=xigua_hb&ac=view&pubid=${post.id}`,
    is_read: 0
  }));
  return {
    user,
    items: [...messages, ...dynamic]
  };
}

function getPartnerCenterData(userId) {
  const profile = getUserProfile(userId);
  const application = db.prepare(`
    SELECT * FROM partner_applications
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 1
  `).get(userId);
  return {
    user: profile.user,
    stats: profile.stats,
    wallet: profile.wallet,
    application,
    benefits: [
      "邀请好友加入后可建立城市群资源",
      "优先获得平台活动与流量支持",
      "后续可扩展佣金、分销和城市合伙人体系"
    ]
  };
}

function getCheckinData(userId) {
  const history = db.prepare(`
    SELECT * FROM checkin_logs
    WHERE user_id = ?
    ORDER BY checkin_date DESC, id DESC
    LIMIT 7
  `).all(userId);
  const today = new Date().toISOString().slice(0, 10);
  const signedToday = history.some((item) => item.checkin_date === today);
  return {
    history,
    signedToday,
    streak: history.length
  };
}

function signInToday(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const exists = db.prepare("SELECT 1 FROM checkin_logs WHERE user_id = ? AND checkin_date = ?").get(userId, today);
  if (exists) {
    return { ok: false, message: "今天已经签到过了" };
  }
  db.prepare(`
    INSERT INTO checkin_logs (user_id, checkin_date, reward_gold, created_at)
    VALUES (?, ?, 1, datetime('now', 'localtime'))
  `).run(userId, today);
  db.prepare("UPDATE users SET gold_balance = gold_balance + 1 WHERE id = ?").run(userId);
  db.prepare(`
    INSERT INTO user_messages (user_id, type, title, content, href, is_read, created_at)
    VALUES (?, 'checkin', '签到成功', '今日签到成功，金币 +1', '/plugin.php?id=xigua_wr&high=1', 0, datetime('now', 'localtime'))
  `).run(userId);
  return { ok: true, message: "签到成功，金币 +1" };
}

function createUserMessage(userId, { type, title, content, href = "" }) {
  db.prepare(`
    INSERT INTO user_messages (user_id, type, title, content, href, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, datetime('now', 'localtime'))
  `).run(userId, type, title, content, href);
}

function markMessagesRead(userId) {
  db.prepare("UPDATE user_messages SET is_read = 1 WHERE user_id = ?").run(userId);
}

function submitPartnerApplication(userId, { city, phone, intro }) {
  const existing = db.prepare(`
    SELECT * FROM partner_applications
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 1
  `).get(userId);
  if (existing && existing.status === "pending") {
    return { ok: false, message: "您已有待审核申请，请耐心等待" };
  }
  db.prepare(`
    INSERT INTO partner_applications (user_id, city, phone, intro, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', datetime('now', 'localtime'))
  `).run(userId, city, phone, intro);
  createUserMessage(userId, {
    type: "partner",
    title: "合伙人申请已提交",
    content: "平台已收到您的合伙人申请，我们会尽快审核。",
    href: "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5"
  });
  return { ok: true, message: "申请已提交，等待审核" };
}

function getRefreshSettings() {
  return db.prepare("SELECT * FROM refresh_settings WHERE id = 1").get();
}

function updateRefreshSettings(intervalMinutes, maxRefreshes) {
  db.prepare(`
    INSERT INTO refresh_settings (id, interval_minutes, max_refreshes)
    VALUES (1, @intervalMinutes, @maxRefreshes)
    ON CONFLICT(id) DO UPDATE SET
      interval_minutes = excluded.interval_minutes,
      max_refreshes = excluded.max_refreshes
  `).run({ intervalMinutes, maxRefreshes });
  return getRefreshSettings();
}

function refreshPost(postId) {
  const wallet = getWallet();
  if (wallet.refresh_package_count > 0) {
    db.prepare("UPDATE wallet SET refresh_package_count = refresh_package_count - 1 WHERE id = 1").run();
  } else if (wallet.balance >= 0.01) {
    db.prepare("UPDATE wallet SET balance = balance - 0.01 WHERE id = 1").run();
  } else {
    return { ok: false, message: "error|余额不足，请先充值" };
  }

  db.prepare("UPDATE posts SET created_at = datetime('now', 'localtime') WHERE id = ?").run(postId);
  return { ok: true, message: "success|刷新成功" };
}

function createPost(payload) {
  const maxId = db.prepare("SELECT COALESCE(MAX(id), 137000) + 1 AS next_id FROM posts").get().next_id;
  db.prepare(`
    INSERT INTO posts (
      id, user_id, category_id, title, summary, content, cover, price_label,
      location, created_at, views, likes, shares, tags_json, status
    ) VALUES (
      @id, @userId, @categoryId, @title, @summary, @content, @cover, @priceLabel,
      @location, datetime('now', 'localtime'), 0, 0, 0, @tagsJson, @status
    )
  `).run({
    id: maxId,
    userId: payload.userId || 18681,
    categoryId: payload.categoryId,
    title: payload.title,
    summary: payload.summary,
    content: payload.content,
    cover: payload.cover,
    priceLabel: payload.priceLabel,
    location: payload.location,
    tagsJson: JSON.stringify(payload.tags),
    status: payload.status || "active"
  });

  return getPostById(maxId);
}

function updatePost(postId, payload) {
  db.prepare(`
    UPDATE posts
    SET category_id = @categoryId,
        title = @title,
        summary = @summary,
        content = @content,
        cover = @cover,
        price_label = @priceLabel,
        location = @location,
        tags_json = @tagsJson,
        status = @status
    WHERE id = @postId
  `).run({
    postId,
    categoryId: payload.categoryId,
    title: payload.title,
    summary: payload.summary,
    content: payload.content,
    cover: payload.cover,
    priceLabel: payload.priceLabel,
    location: payload.location,
    tagsJson: JSON.stringify(payload.tags),
    status: payload.status || "active"
  });

  return getPostById(postId);
}

function deletePost(postId) {
  db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
}

function togglePostStatus(postId, isRestore = false) {
  db.prepare("UPDATE posts SET status = ? WHERE id = ?").run(isRestore ? "active" : "ended", postId);
  return getPostById(postId);
}

function topUpWallet(amount) {
  db.prepare("UPDATE wallet SET balance = balance + ? WHERE id = 1").run(amount);
  return getWallet();
}

function topUpUserWallet(userId, amount, note = "钱包充值") {
  db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(amount, userId);
  db.prepare(`
    INSERT INTO wallet_transactions (user_id, type, amount, status, note, created_at)
    VALUES (?, 'topup', ?, 'success', ?, datetime('now', 'localtime'))
  `).run(userId, amount, note);
  return getUserWallet(userId);
}

function createWithdrawRequest(userId, amount) {
  const wallet = getUserWallet(userId);
  if (wallet.balance < amount) {
    return { ok: false, message: "余额不足" };
  }
  const profile = db.prepare("SELECT * FROM user_withdraw_profiles WHERE user_id = ?").get(userId);
  if (!profile || !profile.account_no) {
    return { ok: false, message: "请先完善提现设置" };
  }

  db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(amount, userId);
  db.prepare(`
    INSERT INTO withdraw_requests (user_id, amount, status, account_name, account_no, created_at)
    VALUES (?, ?, 'pending', ?, ?, datetime('now', 'localtime'))
  `).run(userId, amount, profile.account_name, profile.account_no);
  db.prepare(`
    INSERT INTO wallet_transactions (user_id, type, amount, status, note, created_at)
    VALUES (?, 'withdraw', ?, 'pending', '提现申请', datetime('now', 'localtime'))
  `).run(userId, -Math.abs(amount));

  return { ok: true, message: "提现申请已提交" };
}

function upsertUserWithdrawProfile(userId, { accountName, accountType, accountNo }) {
  db.prepare(`
    INSERT INTO user_withdraw_profiles (user_id, account_name, account_type, account_no)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      account_name = excluded.account_name,
      account_type = excluded.account_type,
      account_no = excluded.account_no
  `).run(userId, accountName, accountType, accountNo);
}

function upsertUserAddress(userId, { contactName, phone, address }) {
  db.prepare(`
    INSERT INTO user_addresses (user_id, contact_name, phone, address)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      contact_name = excluded.contact_name,
      phone = excluded.phone,
      address = excluded.address
  `).run(userId, contactName, phone, address);
}

function updateUserSettings(userId, payload) {
  db.prepare(`
    UPDATE users
    SET nickname = ?,
        city = ?,
        bio = ?,
        avatar = ?,
        background_image = ?,
        notify_comment = ?,
        notify_message = ?
    WHERE id = ?
  `).run(
    payload.nickname,
    payload.city,
    payload.bio,
    payload.avatar,
    payload.backgroundImage,
    payload.notifyComment ? 1 : 0,
    payload.notifyMessage ? 1 : 0,
    userId
  );
}

function updateUserPhone(userId, phone) {
  db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(phone, userId);
  db.prepare("UPDATE user_auth SET phone = ? WHERE user_id = ?").run(phone, userId);
}

function getUserSettingsData(userId) {
  return {
    user: getUserById(userId),
    address: db.prepare("SELECT * FROM user_addresses WHERE user_id = ?").get(userId),
    withdrawProfile: db.prepare("SELECT * FROM user_withdraw_profiles WHERE user_id = ?").get(userId)
  };
}

function authenticateUser(phone, password) {
  return db.prepare(`
    SELECT users.*
    FROM user_auth
    JOIN users ON users.id = user_auth.user_id
    WHERE user_auth.phone = ? AND user_auth.password = ?
  `).get(phone, password);
}

function getUserBySession(token) {
  return db.prepare(`
    SELECT users.*
    FROM user_sessions
    JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token = ?
  `).get(token);
}

function createUserSession(token, userId) {
  db.prepare(`
    INSERT INTO user_sessions (token, user_id, created_at)
    VALUES (?, ?, datetime('now', 'localtime'))
  `).run(token, userId);
}

function deleteUserSession(token) {
  db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
}

function createFrontUser({ phone, password, nickname, city }) {
  const exists = db.prepare("SELECT 1 FROM user_auth WHERE phone = ?").get(phone);
  if (exists) {
    return { ok: false, message: "手机号已注册" };
  }

  const nextId = db.prepare("SELECT COALESCE(MAX(id), 18680) + 1 AS next_id FROM users").get().next_id;
  db.prepare(`
    INSERT INTO users (
      id, nickname, city, avatar, phone, bio, wallet_balance, gold_balance, background_image, notify_comment, notify_message
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 18, '', 1, 1)
  `).run(
    nextId,
    nickname,
    city,
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    phone,
    "这个人很低调，正在完善资料"
  );
  db.prepare(`
    INSERT INTO user_auth (user_id, phone, password, created_at)
    VALUES (?, ?, ?, datetime('now', 'localtime'))
  `).run(nextId, phone, password);
  db.prepare(`
    INSERT INTO user_addresses (user_id, contact_name, phone, address)
    VALUES (?, ?, ?, '')
  `).run(nextId, nickname, phone);
  db.prepare(`
    INSERT INTO user_withdraw_profiles (user_id, account_name, account_type, account_no)
    VALUES (?, ?, 'wechat', '')
  `).run(nextId, nickname);

  return { ok: true, user: getUserById(nextId) };
}

function getAdminDashboardData() {
  const overview = db.prepare(`
    SELECT
      COUNT(*) AS total_posts,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_posts,
      SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) AS ended_posts,
      COALESCE(SUM(views), 0) AS total_views,
      COALESCE(SUM(likes), 0) AS total_likes,
      COALESCE(SUM(shares), 0) AS total_shares
    FROM posts
  `).get();

  const usersCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const recentPosts = db.prepare(basePostQuery("WHERE 1=1", "ORDER BY datetime(posts.created_at) DESC LIMIT 8")).all().map(normalizePost);

  return {
    overview: {
      ...overview,
      total_users: usersCount
    },
    wallet: getWallet(),
    refreshSettings: getRefreshSettings(),
    recentPosts
  };
}

function getAdminPosts(keyword = "", status = "") {
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push("posts.status = @status");
    params.status = status;
  }
  if (keyword && keyword.trim()) {
    clauses.push("(posts.title LIKE @keyword OR users.nickname LIKE @keyword OR posts.location LIKE @keyword)");
    params.keyword = `%${keyword.trim()}%`;
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "WHERE 1=1";
  const posts = db.prepare(basePostQuery(whereClause)).all(params).map(normalizePost);
  return { posts, keyword, status };
}

function getAdminUsers(keyword = "") {
  const hasKeyword = keyword && keyword.trim();
  const usersRows = db.prepare(`
    SELECT
      users.*,
      COUNT(posts.id) AS post_count,
      COALESCE(SUM(posts.views), 0) AS total_views,
      membership_plans.name AS membership_plan_name
    FROM users
    LEFT JOIN posts ON posts.user_id = users.id
    LEFT JOIN membership_plans ON membership_plans.id = users.membership_plan_id
    ${hasKeyword ? "WHERE users.nickname LIKE @keyword OR users.phone LIKE @keyword OR users.city LIKE @keyword" : ""}
    GROUP BY users.id
    ORDER BY users.id DESC
  `).all(hasKeyword ? { keyword: `%${keyword.trim()}%` } : {});
  return { users: usersRows, keyword };
}

function getAdminSystemData() {
  return {
    wallet: getWallet(),
    refreshSettings: getRefreshSettings(),
    categories: getCategories(),
    categoryBanners: getCategoryBanners(),
    homeLinks: getHomeLinks(),
    membershipBenefits: getMembershipBenefits(),
    notices: getNotices(),
    plans: getMembershipPlans(),
    adminUsers: getAdminUsersList()
  };
}

function getCategoryBanners() {
  return db.prepare(`
    SELECT
      categories.id AS category_id,
      categories.name,
      COALESCE(category_banners.image_url, '') AS image_url,
      COALESCE(category_banners.target_url, '') AS target_url,
      COALESCE(category_banners.enabled, 1) AS enabled
    FROM categories
    LEFT JOIN category_banners ON category_banners.category_id = categories.id
    ORDER BY categories.sort_order ASC, categories.id ASC
  `).all();
}

function getAdminCheckins(keyword = "") {
  const hasKeyword = keyword && keyword.trim();
  const rows = db.prepare(`
    SELECT
      checkin_logs.*,
      users.nickname,
      users.phone,
      users.city
    FROM checkin_logs
    JOIN users ON users.id = checkin_logs.user_id
    ${hasKeyword ? "WHERE users.nickname LIKE @keyword OR users.phone LIKE @keyword OR users.city LIKE @keyword OR checkin_logs.checkin_date LIKE @keyword" : ""}
    ORDER BY checkin_logs.checkin_date DESC, checkin_logs.id DESC
  `).all(hasKeyword ? { keyword: `%${keyword.trim()}%` } : {});
  return { records: rows, keyword };
}

function getAdminMessages(keyword = "", type = "") {
  const clauses = [];
  const params = {};
  if (type) {
    clauses.push("user_messages.type = @type");
    params.type = type;
  }
  if (keyword && keyword.trim()) {
    clauses.push("(users.nickname LIKE @keyword OR user_messages.title LIKE @keyword OR user_messages.content LIKE @keyword)");
    params.keyword = `%${keyword.trim()}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`
    SELECT
      user_messages.*,
      users.nickname,
      users.phone
    FROM user_messages
    JOIN users ON users.id = user_messages.user_id
    ${where}
    ORDER BY datetime(user_messages.created_at) DESC, user_messages.id DESC
  `).all(params);
  return { messages: rows, keyword, type };
}

function getAdminPartnerApplications(status = "", keyword = "") {
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push("partner_applications.status = @status");
    params.status = status;
  }
  if (keyword && keyword.trim()) {
    clauses.push("(users.nickname LIKE @keyword OR partner_applications.city LIKE @keyword OR partner_applications.phone LIKE @keyword OR partner_applications.intro LIKE @keyword)");
    params.keyword = `%${keyword.trim()}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`
    SELECT
      partner_applications.*,
      users.nickname,
      users.avatar
    FROM partner_applications
    JOIN users ON users.id = partner_applications.user_id
    ${where}
    ORDER BY datetime(partner_applications.created_at) DESC, partner_applications.id DESC
  `).all(params);
  return { applications: rows, status, keyword };
}

function getHomeLinks() {
  return db.prepare("SELECT * FROM home_links ORDER BY sort_order ASC, id ASC").all();
}

function createOrUpdateHomeLink(linkKey, payload) {
  db.prepare(`
    INSERT INTO home_links (
      link_key, label, action_type, target_url, qr_image, modal_title, enabled, sort_order
    ) VALUES (
      @linkKey, @label, @actionType, @targetUrl, @qrImage, @modalTitle, @enabled, @sortOrder
    )
    ON CONFLICT(link_key) DO UPDATE SET
      label = excluded.label,
      action_type = excluded.action_type,
      target_url = excluded.target_url,
      qr_image = excluded.qr_image,
      modal_title = excluded.modal_title,
      enabled = excluded.enabled,
      sort_order = excluded.sort_order
  `).run({
    linkKey,
    label: payload.label,
    actionType: payload.actionType || "qr",
    targetUrl: payload.targetUrl || "",
    qrImage: payload.qrImage || "",
    modalTitle: payload.modalTitle || "",
    enabled: payload.enabled ? 1 : 0,
    sortOrder: payload.sortOrder || 0
  });
}

function upsertCategoryBanner(categoryId, payload) {
  db.prepare(`
    INSERT INTO category_banners (category_id, image_url, target_url, enabled)
    VALUES (@categoryId, @imageUrl, @targetUrl, @enabled)
    ON CONFLICT(category_id) DO UPDATE SET
      image_url = excluded.image_url,
      target_url = excluded.target_url,
      enabled = excluded.enabled
  `).run({
    categoryId,
    imageUrl: payload.imageUrl || "",
    targetUrl: payload.targetUrl || "",
    enabled: payload.enabled ? 1 : 0
  });
}

function getAdminByCredentials(username, password) {
  return db.prepare("SELECT * FROM admin_users WHERE username = ? AND password = ?").get(username, password);
}

function getMembershipPlans() {
  return db.prepare("SELECT * FROM membership_plans ORDER BY sort_order ASC, duration_days ASC").all();
}

function getMembershipBenefits() {
  return db.prepare("SELECT * FROM membership_benefits ORDER BY sort_order ASC, id ASC").all();
}

function getMembershipPlanById(id) {
  return db.prepare("SELECT * FROM membership_plans WHERE id = ?").get(id);
}

function getAdminOrders(keyword = "", orderType = "") {
  const conditions = [];
  const params = {};
  if (orderType) {
    conditions.push("orders.order_type = @orderType");
    params.orderType = orderType;
  }
  if (keyword && keyword.trim()) {
    conditions.push("(users.nickname LIKE @keyword OR orders.note LIKE @keyword OR orders.status LIKE @keyword)");
    params.keyword = `%${keyword.trim()}%`;
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orders = db.prepare(`
    SELECT
      orders.*,
      users.nickname,
      membership_plans.name AS plan_name
    FROM orders
    JOIN users ON users.id = orders.user_id
    LEFT JOIN membership_plans ON membership_plans.id = orders.plan_id
    ${whereClause}
    ORDER BY datetime(orders.created_at) DESC
  `).all(params);
  return { orders, keyword, orderType };
}

function getOrderById(id) {
  return db.prepare(`
    SELECT
      orders.*,
      users.nickname,
      membership_plans.name AS plan_name
    FROM orders
    JOIN users ON users.id = orders.user_id
    LEFT JOIN membership_plans ON membership_plans.id = orders.plan_id
    WHERE orders.id = ?
  `).get(id);
}

function updateOrderStatus(id, status) {
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  return getOrderById(id);
}

function createOrder({ userId, orderType, planId, amount, status, note }) {
  const info = db.prepare(`
    INSERT INTO orders (user_id, order_type, plan_id, amount, status, created_at, note, effect_applied)
    VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, 0)
  `).run(userId, orderType, planId || null, amount, status, note);
  return getOrderById(info.lastInsertRowid);
}

function markOrderEffectApplied(id) {
  db.prepare("UPDATE orders SET effect_applied = 1 WHERE id = ?").run(id);
  return getOrderById(id);
}

function updateMessageReadStatus(id, isRead) {
  db.prepare("UPDATE user_messages SET is_read = ? WHERE id = ?").run(isRead ? 1 : 0, id);
}

function updatePartnerApplicationStatus(id, status) {
  db.prepare("UPDATE partner_applications SET status = ? WHERE id = ?").run(status, id);
  return db.prepare("SELECT * FROM partner_applications WHERE id = ?").get(id);
}

function updateUserMembership(userId, { membershipStatus, membershipExpiresAt, membershipPlanId }) {
  db.prepare(`
    UPDATE users
    SET membership_status = ?,
        membership_expires_at = ?,
        membership_plan_id = ?
    WHERE id = ?
  `).run(membershipStatus, membershipExpiresAt, membershipPlanId || null, userId);
}

function createCategory({ name, icon, sortOrder }) {
  db.prepare("INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)").run(name, icon, sortOrder || 0);
}

function updateCategory(id, { name, icon, sortOrder }) {
  db.prepare("UPDATE categories SET name = ?, icon = ?, sort_order = ? WHERE id = ?").run(name, icon, sortOrder || 0, id);
}

function deleteCategory(id) {
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}

function createNotice(text, sortOrder = 0) {
  db.prepare("INSERT INTO notices (text, sort_order) VALUES (?, ?)").run(text, sortOrder);
}

function updateNotice(id, text, sortOrder = 0) {
  db.prepare("UPDATE notices SET text = ?, sort_order = ? WHERE id = ?").run(text, sortOrder, id);
}

function deleteNotice(id) {
  db.prepare("DELETE FROM notices WHERE id = ?").run(id);
}

function createMembershipPlan({ name, price, originalPrice, durationDays, description, sortOrder }) {
  db.prepare(`
    INSERT INTO membership_plans (name, price, original_price, duration_days, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, price, originalPrice, durationDays, description, sortOrder || 0);
}

function updateMembershipPlan(id, { name, price, originalPrice, durationDays, description, sortOrder }) {
  db.prepare(`
    UPDATE membership_plans
    SET name = ?, price = ?, original_price = ?, duration_days = ?, description = ?, sort_order = ?
    WHERE id = ?
  `).run(name, price, originalPrice, durationDays, description, sortOrder || 0, id);
}

function deleteMembershipPlan(id) {
  db.prepare("DELETE FROM membership_plans WHERE id = ?").run(id);
}

function createMembershipBenefit({ content, sortOrder }) {
  db.prepare(`
    INSERT INTO membership_benefits (content, sort_order)
    VALUES (?, ?)
  `).run(content, sortOrder || 0);
}

function updateMembershipBenefit(id, { content, sortOrder }) {
  db.prepare(`
    UPDATE membership_benefits
    SET content = ?, sort_order = ?
    WHERE id = ?
  `).run(content, sortOrder || 0, id);
}

function deleteMembershipBenefit(id) {
  db.prepare("DELETE FROM membership_benefits WHERE id = ?").run(id);
}

function getAdminUsersList() {
  return db.prepare("SELECT * FROM admin_users ORDER BY id ASC").all();
}

function createAdminUser({ username, password, nickname, role }) {
  db.prepare("INSERT INTO admin_users (username, password, nickname, role) VALUES (?, ?, ?, ?)").run(username, password, nickname, role || "operator");
}

function updateAdminUser(id, { username, password, nickname, role }) {
  if (password) {
    db.prepare("UPDATE admin_users SET username = ?, password = ?, nickname = ?, role = ? WHERE id = ?").run(username, password, nickname, role || "operator", id);
  } else {
    db.prepare("UPDATE admin_users SET username = ?, nickname = ?, role = ? WHERE id = ?").run(username, nickname, role || "operator", id);
  }
}

function deleteAdminUser(id) {
  db.prepare("DELETE FROM admin_users WHERE id = ? AND id != 1").run(id);
}

module.exports = {
  authenticateUser,
  createOrUpdateHomeLink,
  createFrontUser,
  createUserSession,
  createAdminUser,
  createCategory,
  createMembershipBenefit,
  createMembershipPlan,
  createNotice,
  createUserMessage,
  deleteAdminUser,
  deleteCategory,
  deleteMembershipBenefit,
  deleteMembershipPlan,
  deleteNotice,
  deleteUserSession,
  getAdminByCredentials,
  getAdminCheckins,
  getAdminDashboardData,
  getAdminMessages,
  getAdminOrders,
  getAdminPartnerApplications,
  getAdminPosts,
  getAdminSystemData,
  getAdminUsers,
  getAdminUsersList,
  getCategoryBanner,
  getMembershipBenefits,
  getMembershipPlans,
  getMembershipCenterData,
  getCheckinData,
  getMessageCenterData,
  getMembershipPlanById,
  markOrderEffectApplied,
  getOrderById,
  getPartnerCenterData,
  createPost,
  createOrder,
  createWithdrawRequest,
  db,
  deletePost,
  getCategories,
  getHomeData,
  getHomeLinks,
  getPostById,
  getPostsByCategory,
  getPublishFormData,
  getRefreshSettings,
  getUserBySession,
  getUserSettingsData,
  getUserProfile,
  getUserOrders,
  getUserWallet,
  getUserWalletData,
  getWallet,
  incrementLike,
  incrementShare,
  incrementViews,
  init,
  refreshPost,
  signInToday,
  submitPartnerApplication,
  togglePostStatus,
  topUpUserWallet,
  topUpWallet,
  upsertCategoryBanner,
  updateOrderStatus,
  updateMessageReadStatus,
  updateUserPhone,
  updateUserMembership,
  updateUserSettings,
  updateAdminUser,
  updatePartnerApplicationStatus,
  updateCategory,
  updateMembershipBenefit,
  updateMembershipPlan,
  updateNotice,
  updatePost,
  upsertUserAddress,
  upsertUserWithdrawProfile,
  updateRefreshSettings,
  markMessagesRead
};
