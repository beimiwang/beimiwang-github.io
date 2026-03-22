# 拉面联盟 Clone 交付报告

## 访问地址

- 前台首页: `http://localhost:3000/plugin.php?id=xigua_hb&mobile=2&high=0`
- 后台登录: `http://localhost:3000/admin`
- 默认后台账号: `admin`
- 默认后台密码: `admin123`

## 已完成

### 前台

- 复刻了 `plugin.php?id=xigua_hb` 的移动端主流程
- 首页、分类页、详情页、发布页、我的、钱包、设置、卡券、刷新套餐已可访问
- 点赞、分享、刷新、短信、上下架等前端接口已返回兼容结果
- 发布、编辑、删除、上下架、搜索、钱包充值、自动刷新设置已接通 SQLite
- 新增前台用户登录 / 注册 / 退出登录
- 新增前台用户会话表，登录后“我的 / 钱包 / 设置 / 发布”走真实用户态
- 设置页支持保存个人资料、绑定手机、收货地址、提现账户
- 钱包页支持充值、提现申请、钱包流水和提现记录展示
- 首页 5 个运营入口支持后台配置：
  - 管理员
  - 关注
  - 进拉面群
  - 马丁商城
  - 加盟合伙人
- 每个入口可配置文字、显示状态、排序、跳转链接或二维码弹窗

### 后台

- 管理员登录、Cookie 鉴权、退出登录
- 概览、帖子管理、用户管理、订单管理、系统配置
- 分类、公告、会员套餐、管理员账号的新增/编辑/删除
- 排序字段管理: 分类、公告、套餐支持 `sort_order`
- 管理员角色字段管理: `super_admin` / `editor` / `operator`
- 图片上传到 `public/uploads`，可直接回填给前台图片 URL
- 首页入口配置支持修改点击效果：
  - `qr` 弹二维码图片
  - `link` 跳转外链或站内链接
- 用户会员状态、到期时间、套餐绑定后台维护
- 后台新建订单、修改订单状态
- 订单支付联动:
  - 会员订单支付后自动给用户开通对应套餐
  - 钱包充值订单支付后自动增加钱包余额
  - 已生效订单会写入 `effect_applied=1`，避免重复生效

## 数据库

SQLite 文件:

- `data/clone.db`

当前主要表:

- `users`
- `user_auth`
- `user_sessions`
- `categories`
- `posts`
- `wallet`
- `wallet_transactions`
- `withdraw_requests`
- `notices`
- `refresh_settings`
- `user_addresses`
- `user_withdraw_profiles`
- `home_links`
- `admin_users`
- `membership_plans`
- `orders`

## 关键实现文件

- `src/server.js`
- `src/db.js`
- `templates/admin/system.ejs`
- `templates/admin/orders.ejs`
- `templates/admin/users.ejs`
- `templates/profile.ejs`
- `templates/wallet.ejs`
- `templates/settings.ejs`
- `templates/auth.ejs`

## 已验证

- 后台登录成功并返回 Cookie
- 系统配置页可显示图片上传、排序字段、角色字段
- 上传图片成功，示例文件已写入 `/uploads/1774119232723-sousuo.png`
- 新增待支付会员订单后，改为 `paid` 会自动更新用户会员状态与到期时间
- 新增已支付钱包充值订单后，钱包余额已自动增加
- 前台演示账号 `13800000001 / 123456` 可成功登录
- 前台注册新用户后会自动写入 `users`、`user_auth`、`user_sessions`
- 设置页保存后能回写数据库并在页面回显
- 钱包充值会新增 `wallet_transactions`
- 提现申请会新增 `withdraw_requests` 和负向钱包流水
- 后台修改首页入口配置后，前台首页按钮文字和点击行为会即时变化

## 当前状态

- 服务已可本地运行
- 后台已经具备日常运营所需的基础能力
- 这套后台样式不是原站后台，而是根据前台业务结构倒推出的一套可用管理端
- 前台账号体系已经从纯演示账号切到可注册、可登录、可持久化的基础版本

## 后续可继续扩展

- 管理员权限真正按角色拦截
- 支付渠道、短信平台、对象存储配置
- 上传图片直接嵌入前台发布表单
- 订单退款/取消后的反向回滚逻辑
- 消息中心、聊天、论坛、合伙人等关联插件完整复刻
