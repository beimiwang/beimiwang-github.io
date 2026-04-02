const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const {
  authenticateUser,
  createOrUpdateHomeLink,
  createFrontUser,
  createUserSession,
  getAdminByCredentials,
  getAdminCheckins,
  getAdminDashboardData,
  getAdminMessages,
  getAdminOrders,
  getAdminPartnerApplications,
  getAdminPosts,
  getAdminServiceConversation,
  getAdminServiceConversations,
  getAdminWithdrawRequests,
  getAdminSystemData,
  getAdminUsers,
  getCategoryBanner,
  getOrderById,
  createAdminUser,
  createCategory,
  createMembershipBenefit,
  createMembershipPlan,
  createNotice,
  createOrder,
  createPost,
  createUserReport,
  createServiceQuickReply,
  createWithdrawRequest,
  deletePost,
  deleteAdminUser,
  deleteCategory,
  deleteMembershipBenefit,
  deleteMembershipPlan,
  deleteNotice,
  deleteServiceQuickReply,
  deleteUserSession,
  getHomeData,
  getPostById,
  getPostsByCategory,
  getPublishFormData,
  getRefreshSettings,
  getServiceAgents,
  getServiceQuickReplies,
  getUserBySession,
  getUserSettingsData,
  getUserProfileEditData,
  getUserProfile,
  getUserWalletData,
  getWallet,
  incrementLike,
  incrementShare,
  incrementViews,
  init,
  refreshPost,
  recordUserHomepageView,
  togglePostStatus,
  topUpWallet,
  toggleUserBlock,
  toggleUserFollow,
  upsertCategoryBanner,
  updateServiceAgent,
  updateServiceQuickReply,
  updateOrderStatus,
  updateUserMembership,
  updateAdminUser,
  updateCategory,
  updateMembershipBenefit,
  updateMembershipPlan,
  updateNotice,
  getMembershipPlans,
  getMembershipCenterData,
  getMessageCenterData,
  getMessageRelationData,
  getMyCenterData,
  getServiceMessagesAfter,
  getMessageThreadData,
  getUserUnreadSummary,
  getUserAllOrdersData,
  getUserCallLogsData,
  getUserCommentsData,
  getUserFavoritesData,
  getUserFootprintsData,
  getUserHomepageData,
  getUserSubscriptionsData,
  getUserVerificationData,
  getCheckinData,
  getMembershipPlanById,
  markOrderEffectApplied,
  markAllServiceConversationsReadForUser,
  markMessagesRead,
  markServiceConversationReadForAdmin,
  getPartnerCenterData,
  getPartnerFansData,
  getPartnerIncomeDetailsData,
  getPartnerTrendData,
  createUserMessage,
  topUpUserWallet,
  signInToday,
  assignServiceConversation,
  sendAdminServiceReply,
  sendServiceUserMessage,
  submitPartnerApplication,
  updateServiceConversationStatus,
  updateWithdrawRequestReview,
  updateMessageReadStatus,
  updatePartnerApplicationStatus,
  updateUserPhone,
  updateUserPassword,
  updatePost,
  updateUserProfileEdit,
  updateUserSettings,
  updateRefreshSettings
  ,
  upsertUserAddress,
  upsertUserWithdrawProfile
} = require("./db");

init();

const app = express();
const port = process.env.PORT || 3000;
const DEMO_USER_ID = 18681;
const uploadsDir = path.join(__dirname, "..", "public", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  }
});
const upload = multer({ storage });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "templates"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader.split(";").reduce((acc, pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function getAdminSession(req) {
  const cookies = parseCookies(req);
  if (cookies.admin_auth === "1" && cookies.admin_user) {
    return { loggedIn: true, username: cookies.admin_user };
  }
  return { loggedIn: false, username: "" };
}

function getUserSession(req) {
  const cookies = parseCookies(req);
  const token = cookies.user_session || "";
  if (!token) {
    return { loggedIn: false, token: "", user: null };
  }
  const user = getUserBySession(token);
  if (!user) {
    return { loggedIn: false, token: "", user: null };
  }
  return { loggedIn: true, token, user };
}

function requireUser(req, res) {
  const session = getUserSession(req);
  if (!session.loggedIn) {
    res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录后再继续");
    return null;
  }
  return session;
}

function requireAdmin(req, res) {
  const session = getAdminSession(req);
  if (!session.loggedIn) {
    res.redirect("/admin?error=请先登录后台");
    return null;
  }
  return session;
}

app.use((req, res, next) => {
  const userSession = getUserSession(req);
  res.locals.unreadSummary = userSession.loggedIn
    ? getUserUnreadSummary(userSession.user.id)
    : { message: 0, service: 0, chat: 0 };
  next();
});

function xmlResult(message) {
  return `<?xml version="1.0" encoding="utf-8"?><root><![CDATA[${message}]]></root>`;
}

function redirectWithMessage(res, url, message) {
  const separator = url.includes("?") ? "&" : "?";
  res.redirect(`${url}${separator}msg=${encodeURIComponent(message)}`);
}

function parsePostForm(body) {
  const form = body.form || body;
  const categoryId = Number(form.category_id || form.categoryId || 1035);
  const title = String(form.title || "").trim();
  const content = String(form.content || "").trim();
  const summary = String(form.summary || content.slice(0, 48) || "").trim();
  const tags = String(form.tags || "")
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (categoryId === 1038) {
    const rideType = String(form.ride_type || "车找人").trim() || "车找人";
    const origin = String(form.ride_origin || "").trim();
    const destination = String(form.ride_destination || "").trim();
    const departureTime = String(form.ride_departure_time || "").trim();
    const passengers = String(form.ride_passengers || "").trim();
    const fee = String(form.ride_fee || "").trim();
    const note = String(form.ride_note || "").trim();
    const composedTitle = `${origin || "出发地"}到${destination || "目的地"}顺风车`;
    const composedSummary = `${rideType}${passengers ? `，${passengers}` : ""}${note ? `，${note}` : ""}`.trim();
    const contentLines = [
      composedTitle,
      departureTime ? `出发时间：${departureTime}` : "",
      passengers ? `人数说明：${passengers}` : "",
      fee ? `费用说明：${fee}` : "",
      note ? `补充说明：${note}` : "",
      `联系电话：${String(form.phone || "").trim() || "请在详情页查看"}`
    ].filter(Boolean);
    return {
      categoryId,
      title: composedTitle,
      summary: composedSummary || departureTime || "时间待定",
      content: contentLines.join("，"),
      cover: "",
      priceLabel: fee || "电话联系",
      location: origin || "未填写位置",
      tags: [rideType].filter(Boolean),
      status: form.status === "ended" ? "ended" : "active",
      userId: DEMO_USER_ID
    };
  }

  return {
    categoryId,
    title,
    summary,
    content,
    cover: String(form.cover || "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80").trim(),
    priceLabel: String(form.price_label || form.priceLabel || "面议").trim(),
    location: String(form.location || "未填写位置").trim(),
    tags,
    status: form.status === "ended" ? "ended" : "active",
    userId: DEMO_USER_ID
  };
}

function getUploadedFiles() {
  return fs
    .readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const fullPath = path.join(uploadsDir, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        url: `/uploads/${entry.name}`,
        sizeKb: Math.max(1, Math.round(stat.size / 1024)),
        updatedAt: stat.mtime.toISOString().slice(0, 19).replace("T", " ")
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 12);
}

function formatMembershipExpiry(durationDays) {
  const expiry = new Date();
  expiry.setHours(23, 59, 59, 0);
  expiry.setDate(expiry.getDate() + Math.max(0, Number(durationDays || 0)));
  const pad = (value) => String(value).padStart(2, "0");
  return `${expiry.getFullYear()}-${pad(expiry.getMonth() + 1)}-${pad(expiry.getDate())} ${pad(expiry.getHours())}:${pad(expiry.getMinutes())}:${pad(expiry.getSeconds())}`;
}

function applyPaidOrderEffects(order) {
  if (!order || order.status !== "paid" || Number(order.effect_applied) === 1) return;

  if (order.order_type === "membership" && order.plan_id) {
    const plan = getMembershipPlanById(order.plan_id);
    if (!plan) return;
    updateUserMembership(order.user_id, {
      membershipStatus: "active",
      membershipExpiresAt: formatMembershipExpiry(plan.duration_days),
      membershipPlanId: plan.id
    });
    markOrderEffectApplied(order.id);
    return;
  }

  if (order.order_type === "wallet_topup") {
    topUpWallet(Number(order.amount || 0));
    markOrderEffectApplied(order.id);
  }
}

function renderPlugin(req, res) {
  const {
    id,
    ac,
    cat_id: catId,
    pubid,
    do: action,
    edit,
    keyword = "",
    msg = ""
  } = req.query;
  const userSession = getUserSession(req);

  if (id === "xigua_hb") {
    if (!ac) {
      return res.render("home", {
        currentTab: "home",
        pageTitle: "伊兰马丁拉面联盟信息平台",
        data: getHomeData(keyword),
        message: msg
      });
    }

    if (ac === "auth") {
      return res.render("auth", {
        currentTab: "mine",
        pageTitle: "登录 / 注册",
        message: msg,
        userSession,
        mode: req.query.mode === "register" ? "register" : "login"
      });
    }

    if (ac === "view") {
      incrementViews(Number(pubid));
      const post = getPostById(Number(pubid));
      if (!post) {
        return res.status(404).render("message", { title: "内容不存在", body: "对应信息已删除或不存在。" });
      }
      return res.render("detail", { currentTab: "home", pageTitle: post.title, post, message: msg });
    }

    if (ac === "ride_api") {
      const data = getPostsByCategory(1038, {
        sort: req.query.sort || "default",
        rideType: req.query.ride_type || "",
        origin: req.query.origin || "",
        destination: req.query.destination || "",
        routeChip: req.query.route_chip || ""
      });
      return res.json({
        ok: true,
        filters: data.rideData || {},
        sort: data.filters || {},
        posts: data.posts.map((post) => ({
          id: post.id,
          title: post.title,
          route: `${post.ride_origin || "出发地"} -> ${post.ride_destination || "目的地"}`,
          rideType: post.ride_type || "车找人",
          departureText: post.ride_departure_text || "时间待定",
          description: post.ride_description || post.summary || "",
          location: post.location || "",
          createdAt: post.created_at,
          views: post.views,
          phone: post.phone || "",
          href: `/plugin.php?id=xigua_hb&ac=view&pubid=${post.id}`
        }))
      });
    }

    if (ac === "cat") {
      const data = getPostsByCategory(Number(catId), {
        keyword,
        area: req.query.area || "",
        tag: req.query.tag || "",
        sort: req.query.sort || "default",
        rideType: req.query.ride_type || "",
        origin: req.query.origin || "",
        destination: req.query.destination || "",
        routeChip: req.query.route_chip || ""
      });
      return res.render("list", {
        currentTab: "home",
        pageTitle: data.category ? data.category.name : "分类信息",
        data,
        message: msg
      });
    }

    if (ac === "my") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("profile", {
        currentTab: "mine",
        pageTitle: "我的",
        data: getMyCenterData(userSession.user.id),
        message: msg
      });
    }

    if (ac === "my_posts") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("my-posts", {
        currentTab: "mine",
        pageTitle: "我的同城信息",
        data: getUserProfile(userSession.user.id),
        message: msg,
        statusTab: req.query.tab || "active"
      });
    }

    if (ac === "pub") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录后发布");
      }
      if (req.query.del) {
        deletePost(Number(req.query.del));
        return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=my&high=4", "删除成功");
      }

      return res.render("publish", {
        currentTab: "publish",
        pageTitle: edit ? "编辑信息" : "发布信息",
        data: getPublishFormData(edit ? Number(edit) : null),
        message: msg
      });
    }

    if (ac === "qianbao") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("wallet", {
        currentTab: "mine",
        pageTitle: "钱包",
        data: getUserWalletData(userSession.user.id),
        message: msg
      });
    }

    if (ac === "settings") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("settings", {
        currentTab: "mine",
        pageTitle: "个人设置",
        settingsView: String(req.query.view || "").trim(),
        data: getUserSettingsData(userSession.user.id),
        message: msg
      });
    }

    if (ac === "profile_edit") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("profile-edit", {
        currentTab: "mine",
        pageTitle: "个人资料",
        data: getUserProfileEditData(userSession.user.id),
        message: ""
      });
    }

    if (ac === "homepage") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      const targetUserId = Number(req.query.uid || userSession.user.id);
      const homepageTab = String(req.query.tab || "posts").trim();
      recordUserHomepageView(targetUserId, userSession.user.id);
      return res.render("user-homepage", {
        currentTab: "mine",
        pageTitle: "个人主页",
        data: getUserHomepageData(targetUserId, userSession.user.id, homepageTab),
        message: msg
      });
    }

    if (ac === "homepage_follow") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      const targetUserId = Number(req.query.uid || 0);
      toggleUserFollow(userSession.user.id, targetUserId);
      return res.redirect(`/plugin.php?id=xigua_hb&ac=homepage&high=4&uid=${encodeURIComponent(targetUserId)}`);
    }

    if (ac === "homepage_block") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      const targetUserId = Number(req.query.uid || 0);
      const result = toggleUserBlock(userSession.user.id, targetUserId);
      return redirectWithMessage(
        res,
        `/plugin.php?id=xigua_hb&ac=homepage&high=4&uid=${encodeURIComponent(targetUserId)}`,
        result.blocked ? "已加入黑名单" : "已取消拉黑"
      );
    }

    if (ac === "homepage_report") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      const targetUserId = Number(req.query.uid || 0);
      createUserReport(userSession.user.id, targetUserId, "举报个人主页");
      return redirectWithMessage(
        res,
        `/plugin.php?id=xigua_hb&ac=homepage&high=4&uid=${encodeURIComponent(targetUserId)}`,
        "举报已提交"
      );
    }

    if (ac === "orders") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("user-orders", {
        currentTab: "mine",
        pageTitle: "我的订单",
        data: getUserAllOrdersData(userSession.user.id),
        message: msg
      });
    }

    if (ac === "subscriptions") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("user-list-page", {
        currentTab: "mine",
        pageTitle: "我的订阅",
        message: msg,
        listType: "subscriptions",
        data: getUserSubscriptionsData(userSession.user.id)
      });
    }

    if (ac === "verify") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("verification-center", {
        currentTab: "mine",
        pageTitle: "认证中心",
        message: msg,
        data: getUserVerificationData(userSession.user.id)
      });
    }

    if (ac === "comments") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("user-list-page", {
        currentTab: "mine",
        pageTitle: "我的评论",
        message: msg,
        listType: "comments",
        data: getUserCommentsData(userSession.user.id)
      });
    }

    if (ac === "favorites") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("user-list-page", {
        currentTab: "mine",
        pageTitle: "收藏/关注",
        message: msg,
        listType: "favorites",
        data: getUserFavoritesData(userSession.user.id)
      });
    }

    if (ac === "footprints") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("user-list-page", {
        currentTab: "mine",
        pageTitle: "我的足迹",
        message: msg,
        listType: "footprints",
        data: getUserFootprintsData(userSession.user.id)
      });
    }

    if (ac === "call_logs") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("user-list-page", {
        currentTab: "mine",
        pageTitle: "来电记录",
        message: msg,
        listType: "call_logs",
        data: getUserCallLogsData(userSession.user.id)
      });
    }

    if (ac === "coupons") {
      return res.render("coupons", {
        currentTab: "mine",
        pageTitle: "我的卡券",
        message: msg
      });
    }

    if (ac === "refresh" && action === "sxtc") {
      if (!userSession.loggedIn) {
        return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
      }
      return res.render("refresh", {
        currentTab: "mine",
        pageTitle: "刷新套餐",
        wallet: getWallet(),
        settings: getRefreshSettings(),
        message: msg
      });
    }

    if (ac === "reach") {
      return res.type("application/xml").send(xmlResult("success|reach"));
    }

    if (ac === "wc") {
      const post = togglePostStatus(Number(pubid), Boolean(req.query.huifu));
      const text = post && post.status === "active" ? "success|上架成功" : "success|下架成功";
      return res.type("application/xml").send(xmlResult(text));
    }
  }

  if (id === "xigua_wr") {
    if (!userSession.loggedIn) {
      return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
    }
    const profile = getUserProfile(userSession.user.id);
    const checkin = getCheckinData(userSession.user.id);
    return res.render("checkin", {
      currentTab: "mine",
      pageTitle: "每日签到",
      data: {
        user: profile.user,
        wallet: profile.wallet,
        streak: checkin.streak,
        signedToday: checkin.signedToday,
        history: checkin.history.map((item) => item.checkin_date.slice(5))
      }
    });
  }

  if (id === "xigua_hk") {
    if (!userSession.loggedIn) {
      return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
    }
    return res.render("vip", {
      currentTab: "vip",
      pageTitle: "会员中心",
      data: getMembershipCenterData(userSession.user.id)
    });
  }

  if (id === "xigua_lt") {
    if (!userSession.loggedIn) {
      return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
    }
    if (ac === "chat_poll") {
      const thread = getMessageThreadData(userSession.user.id, String(req.query.channel || "martin"));
      if (!thread) {
        return res.json({ ok: false, message: "not_found" });
      }
      const items = getServiceMessagesAfter(thread.channel.conversationId, Number(req.query.after_id || 0));
      if (items.some((item) => item.sender_type === "agent" || item.sender_type === "system")) {
        getMessageThreadData(userSession.user.id, String(req.query.channel || "martin"));
      }
      return res.json({
        ok: true,
        conversationId: thread.channel.conversationId,
        items
      });
    }
    const type = String(req.query.type || "sx");
    if (type === "follow" || type === "fans") {
      return res.render("message-relations", {
        currentTab: "chat",
        pageTitle: type === "fans" ? "我的粉丝" : "我的关注",
        data: getMessageRelationData(userSession.user.id, type)
      });
    }
    if (type === "thread") {
      const threadData = getMessageThreadData(userSession.user.id, String(req.query.channel || "martin"));
      res.locals.unreadSummary = getUserUnreadSummary(userSession.user.id);
      return res.render("message-thread", {
        currentTab: "chat",
        pageTitle: "消息详情",
        message: req.query.msg || "",
        data: threadData
      });
    }
    markMessagesRead(userSession.user.id);
    markAllServiceConversationsReadForUser(userSession.user.id);
    res.locals.unreadSummary = getUserUnreadSummary(userSession.user.id);
    return res.render("chat-center", {
      currentTab: "chat",
      pageTitle: "我的消息",
      message: req.query.msg || "",
      data: getMessageCenterData(userSession.user.id)
    });
  }

  if (id === "xigua_hh") {
    if (!userSession.loggedIn) {
      return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=请先登录");
    }
    const view = String(req.query.view || "detail").trim();
    if (view === "fans") {
      return res.render("user-list-page", {
        currentTab: "mine",
        pageTitle: "我的粉丝",
        backHref: "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5",
        message: req.query.msg || "",
        listType: "partner_fans",
        data: getPartnerFansData(userSession.user.id)
      });
    }
    if (view === "income") {
      return res.render("user-list-page", {
        currentTab: "mine",
        pageTitle: "收入明细",
        backHref: "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5",
        message: req.query.msg || "",
        listType: "partner_income",
        data: getPartnerIncomeDetailsData(userSession.user.id)
      });
    }
    if (view === "trend") {
      return res.render("user-list-page", {
        currentTab: "mine",
        pageTitle: "收入趋势",
        backHref: "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5",
        message: req.query.msg || "",
        listType: "partner_trend",
        data: getPartnerTrendData(userSession.user.id)
      });
    }
    if (view === "service") {
      return res.redirect("/plugin.php?id=xigua_lt&type=thread&channel=martin&mobile=2&high=3");
    }
    return res.render("partner", {
      currentTab: "mine",
      pageTitle: "加盟合伙人",
      data: {
        ...getPartnerCenterData(userSession.user.id),
        mode: view === "privilege" || view === "rules" ? "privilege" : "detail"
      }
    });
  }

  return res.render("message", { title: "页面占位", body: "该页面入口已识别，但还没有完全复刻。" });
}

app.get("/", (req, res) => {
  res.redirect("/plugin.php?id=xigua_hb&mobile=2&high=0");
});

app.get("/plugin.php", (req, res, next) => {
  if (!(req.query.id === "xigua_hb" && req.query.ac === "ride_api")) {
    return next();
  }
  const data = getPostsByCategory(1038, {
    sort: req.query.sort || "default",
    rideType: req.query.ride_type || "",
    origin: req.query.origin || "",
    destination: req.query.destination || "",
    routeChip: req.query.route_chip || ""
  });
  return res.json({
    ok: true,
    filters: data.rideData || {},
    sort: data.filters || {},
    posts: data.posts.map((post) => ({
      id: post.id,
      title: post.title,
      route: `${post.ride_origin || "出发地"} -> ${post.ride_destination || "目的地"}`,
      rideType: post.ride_type || "车找人",
      departureText: post.ride_departure_text || "时间待定",
      description: post.ride_description || post.summary || "",
      location: post.location || "",
      createdAt: post.created_at,
      views: post.views,
      phone: post.phone || "",
      href: `/plugin.php?id=xigua_hb&ac=view&pubid=${post.id}`
    }))
  });
});

app.get("/plugin.php", renderPlugin);

app.get("/admin", (req, res) => {
  const session = getAdminSession(req);
  if (!session.loggedIn) {
    return res.render("admin/login", {
      pageTitle: "后台登录",
      error: req.query.error || "",
      token: ""
    });
  }

  return res.render("admin/dashboard", {
    pageTitle: "后台概览",
    token: session.username,
    data: getAdminDashboardData()
  });
});

app.get("/admin/posts", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/posts", {
    pageTitle: "帖子管理",
    token: session.username,
    data: getAdminPosts(req.query.keyword || "", req.query.status || "", Number(req.query.user_id || 0))
  });
});

app.get("/admin/users", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/users", {
    pageTitle: "用户管理",
    token: session.username,
    data: getAdminUsers(req.query.keyword || ""),
    plans: getMembershipPlans(),
    msg: req.query.msg || ""
  });
});

app.get("/admin/orders", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/orders", {
    pageTitle: "订单管理",
    token: session.username,
    data: getAdminOrders(req.query.keyword || "", req.query.orderType || ""),
    plans: getMembershipPlans(),
    msg: req.query.msg || ""
  });
});

app.get("/admin/withdraws", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/withdraws", {
    pageTitle: "提现审核",
    token: session.username,
    data: {
      keyword: req.query.keyword || "",
      status: req.query.status || "",
      requests: getAdminWithdrawRequests(req.query.keyword || "", req.query.status || "")
    },
    msg: req.query.msg || ""
  });
});

app.get("/admin/checkins", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/checkins", {
    pageTitle: "签到记录",
    token: session.username,
    data: getAdminCheckins(req.query.keyword || ""),
    msg: req.query.msg || ""
  });
});

app.get("/admin/messages", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/messages", {
    pageTitle: "站内消息",
    token: session.username,
    data: getAdminMessages(req.query.keyword || "", req.query.type || ""),
    msg: req.query.msg || ""
  });
});

app.get("/admin/service", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/service-list", {
    pageTitle: "客服会话",
    token: session.username,
    data: {
      keyword: req.query.keyword || "",
      status: req.query.status || "",
      unreadOnly: req.query.unread === "1",
      conversations: getAdminServiceConversations(req.query.keyword || "", req.query.status || "", req.query.unread === "1")
    },
    msg: req.query.msg || ""
  });
});

app.get("/admin/service/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const data = getAdminServiceConversation(Number(req.params.id));
  if (!data) {
    return res.redirect("/admin/service?msg=" + encodeURIComponent("会话不存在"));
  }
  assignServiceConversation(Number(req.params.id), session.username);
  markServiceConversationReadForAdmin(Number(req.params.id));
  res.render("admin/service-thread", {
    pageTitle: "客服会话详情",
    token: session.username,
    data,
    conversationList: getAdminServiceConversations("", "", false),
    quickReplies: getServiceQuickReplies(),
    msg: req.query.msg || ""
  });
});

app.get("/admin/service/:id/user", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const detail = getAdminServiceConversation(Number(req.params.id));
  if (!detail) {
    return res.redirect("/admin/service?msg=" + encodeURIComponent("会话不存在"));
  }
  res.render("admin/service-user-preview", {
    pageTitle: "用户主页预览",
    token: session.username,
    data: {
      conversation: detail.conversation,
      profile: getUserProfile(detail.conversation.user_id)
    }
  });
});

app.get("/admin/service/:id/posts", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const detail = getAdminServiceConversation(Number(req.params.id));
  if (!detail) {
    return res.redirect("/admin/service?msg=" + encodeURIComponent("会话不存在"));
  }
  return res.redirect(`/admin/posts?user_id=${encodeURIComponent(detail.conversation.user_id)}`);
});

app.get("/admin/service/:id/poll", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return res.status(401).json({ ok: false, message: "unauthorized" });
  const conversationId = Number(req.params.id);
  const detail = getAdminServiceConversation(conversationId);
  if (!detail) return res.status(404).json({ ok: false, message: "not_found" });
  const items = getServiceMessagesAfter(conversationId, Number(req.query.after_id || 0));
  if (items.some((item) => item.sender_type === "user")) {
    markServiceConversationReadForAdmin(conversationId);
  }
  return res.json({
    ok: true,
    status: detail.conversation.status,
    assignedAdmin: detail.conversation.assigned_admin || "",
    items
  });
});

app.get("/admin/partners", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/partners", {
    pageTitle: "合伙人申请",
    token: session.username,
    data: getAdminPartnerApplications(req.query.status || "", req.query.keyword || ""),
    msg: req.query.msg || ""
  });
});

app.get("/admin/system", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  res.render("admin/system", {
    pageTitle: "系统配置",
    token: session.username,
    data: getAdminSystemData(),
    uploads: getUploadedFiles(),
    message: req.query.msg || ""
  });
});

app.post("/admin/login", (req, res) => {
  const username = String(req.body.username || "admin");
  const password = String(req.body.password || "");
  const admin = getAdminByCredentials(username, password);
  if (!admin) {
    return res.redirect("/admin?error=密码错误");
  }
  res.setHeader("Set-Cookie", [
    `admin_auth=1; Path=/; HttpOnly`,
    `admin_user=${encodeURIComponent(admin.username)}; Path=/; HttpOnly`
  ]);
  res.redirect("/admin");
});

app.post("/admin/logout", (req, res) => {
  res.setHeader("Set-Cookie", [
    "admin_auth=; Path=/; Max-Age=0; HttpOnly",
    "admin_user=; Path=/; Max-Age=0; HttpOnly"
  ]);
  res.redirect("/admin");
});

app.post("/admin/posts/:id/status", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  togglePostStatus(Number(req.params.id), req.body.status === "active");
  res.redirect(`/admin/posts?status=${encodeURIComponent(req.query.status || "")}`);
});

app.post("/admin/posts/:id/delete", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  deletePost(Number(req.params.id));
  res.redirect(`/admin/posts`);
});

app.post("/admin/system/refresh", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const intervalMinutes = Math.max(1, Number(req.body.interval_minutes || 60));
  const maxRefreshes = Math.max(1, Number(req.body.max_refreshes || 10));
  updateRefreshSettings(intervalMinutes, maxRefreshes);
  res.redirect(`/admin/system?msg=${encodeURIComponent("刷新配置已保存")}`);
});

app.post("/admin/system/categories", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const name = String(req.body.name || "").trim();
  const icon = String(req.body.icon || "").trim();
  const sortOrder = Number(req.body.sort_order || 0);
  if (!name) return res.redirect("/admin/system?msg=" + encodeURIComponent("分类名称不能为空"));
  createCategory({ name, icon, sortOrder });
  res.redirect("/admin/system?msg=" + encodeURIComponent("分类已新增"));
});

app.post("/admin/system/categories/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  if (req.body.action === "delete") {
    deleteCategory(Number(req.params.id));
    return res.redirect("/admin/system?msg=" + encodeURIComponent("分类已删除"));
  }
  updateCategory(Number(req.params.id), {
    name: String(req.body.name || "").trim(),
    icon: String(req.body.icon || "").trim(),
    sortOrder: Number(req.body.sort_order || 0)
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("分类已更新"));
});

app.post("/admin/system/notices", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const text = String(req.body.text || "").trim();
  const sortOrder = Number(req.body.sort_order || 0);
  if (!text) return res.redirect("/admin/system?msg=" + encodeURIComponent("公告内容不能为空"));
  createNotice(text, sortOrder);
  res.redirect("/admin/system?msg=" + encodeURIComponent("公告已新增"));
});

app.post("/admin/system/notices/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  if (req.body.action === "delete") {
    deleteNotice(Number(req.params.id));
    return res.redirect("/admin/system?msg=" + encodeURIComponent("公告已删除"));
  }
  updateNotice(Number(req.params.id), String(req.body.text || "").trim(), Number(req.body.sort_order || 0));
  res.redirect("/admin/system?msg=" + encodeURIComponent("公告已更新"));
});

app.post("/admin/system/plans", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  createMembershipPlan({
    name: String(req.body.name || "").trim(),
    price: Number(req.body.price || 0),
    originalPrice: Number(req.body.original_price || 0),
    durationDays: Number(req.body.duration_days || 0),
    description: String(req.body.description || "").trim(),
    sortOrder: Number(req.body.sort_order || 0)
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("套餐已新增"));
});

app.post("/admin/system/plans/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  if (req.body.action === "delete") {
    deleteMembershipPlan(Number(req.params.id));
    return res.redirect("/admin/system?msg=" + encodeURIComponent("套餐已删除"));
  }
  updateMembershipPlan(Number(req.params.id), {
    name: String(req.body.name || "").trim(),
    price: Number(req.body.price || 0),
    originalPrice: Number(req.body.original_price || 0),
    durationDays: Number(req.body.duration_days || 0),
    description: String(req.body.description || "").trim(),
    sortOrder: Number(req.body.sort_order || 0)
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("套餐已更新"));
});

app.post("/admin/system/benefits", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const content = String(req.body.content || "").trim();
  const sortOrder = Number(req.body.sort_order || 0);
  if (!content) return res.redirect("/admin/system?msg=" + encodeURIComponent("会员特权内容不能为空"));
  createMembershipBenefit({ content, sortOrder });
  res.redirect("/admin/system?msg=" + encodeURIComponent("会员特权已新增"));
});

app.post("/admin/system/benefits/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  if (req.body.action === "delete") {
    deleteMembershipBenefit(Number(req.params.id));
    return res.redirect("/admin/system?msg=" + encodeURIComponent("会员特权已删除"));
  }
  updateMembershipBenefit(Number(req.params.id), {
    content: String(req.body.content || "").trim(),
    sortOrder: Number(req.body.sort_order || 0)
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("会员特权已更新"));
});

app.post("/admin/system/admin-users", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  createAdminUser({
    username: String(req.body.username || "").trim(),
    password: String(req.body.password || "").trim(),
    nickname: String(req.body.nickname || "").trim(),
    role: String(req.body.role || "operator").trim()
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("管理员已新增"));
});

app.post("/admin/system/admin-users/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  if (req.body.action === "delete") {
    deleteAdminUser(Number(req.params.id));
    return res.redirect("/admin/system?msg=" + encodeURIComponent("管理员已删除"));
  }
  updateAdminUser(Number(req.params.id), {
    username: String(req.body.username || "").trim(),
    password: String(req.body.password || "").trim(),
    nickname: String(req.body.nickname || "").trim(),
    role: String(req.body.role || "operator").trim()
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("管理员已更新"));
});

app.post("/admin/system/home-links/:key", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  createOrUpdateHomeLink(String(req.params.key || "").trim(), {
    label: String(req.body.label || "").trim(),
    actionType: String(req.body.action_type || "qr").trim(),
    targetUrl: String(req.body.target_url || "").trim(),
    qrImage: String(req.body.qr_image || "").trim(),
    modalTitle: String(req.body.modal_title || "").trim(),
    enabled: req.body.enabled === "1",
    sortOrder: Number(req.body.sort_order || 0)
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("首页入口已更新"));
});

app.post("/admin/system/service-agents/:key", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  updateServiceAgent(String(req.params.key || "martin"), {
    name: String(req.body.name || "").trim() || "客服",
    avatar: String(req.body.avatar || "").trim() || "/wj/lamian21.png",
    status: String(req.body.status || "online").trim() || "online"
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("客服资料已更新"));
});

app.post("/admin/system/service-quick-replies", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const content = String(req.body.content || "").trim();
  if (!content) {
    return res.redirect("/admin/system?msg=" + encodeURIComponent("快捷回复内容不能为空"));
  }
  createServiceQuickReply({
    content,
    sortOrder: Number(req.body.sort_order || 0),
    enabled: req.body.enabled === "1"
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("快捷回复已新增"));
});

app.post("/admin/system/service-quick-replies/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  if (req.body.action === "delete") {
    deleteServiceQuickReply(Number(req.params.id));
    return res.redirect("/admin/system?msg=" + encodeURIComponent("快捷回复已删除"));
  }
  updateServiceQuickReply(Number(req.params.id), {
    content: String(req.body.content || "").trim(),
    sortOrder: Number(req.body.sort_order || 0),
    enabled: req.body.enabled === "1"
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("快捷回复已更新"));
});

app.post("/admin/system/category-banners/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  upsertCategoryBanner(Number(req.params.id), {
    imageUrl: String(req.body.image_url || "").trim(),
    targetUrl: String(req.body.target_url || "").trim(),
    enabled: req.body.enabled === "1"
  });
  res.redirect("/admin/system?msg=" + encodeURIComponent("分类页 Banner 已更新"));
});

app.post("/admin/system/category-banners/:id/upload", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  upload.single("image")(req, res, (error) => {
    if (error) {
      return res.redirect("/admin/system?msg=" + encodeURIComponent("Banner 上传失败，请重试"));
    }
    const current = getCategoryBanner(Number(req.params.id));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || current?.image_url || "").trim();
    upsertCategoryBanner(Number(req.params.id), {
      imageUrl,
      targetUrl: String(req.body.target_url || current?.target_url || "").trim(),
      enabled: req.body.enabled === "1"
    });
    return res.redirect("/admin/system?msg=" + encodeURIComponent("分类页 Banner 上传成功"));
  });
});

app.post("/admin/upload", (req, res, next) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  upload.single("image")(req, res, (error) => {
    if (error) {
      return res.redirect("/admin/system?msg=" + encodeURIComponent("上传失败，请重试"));
    }
    if (!req.file) {
      return res.redirect("/admin/system?msg=" + encodeURIComponent("请选择要上传的图片"));
    }
    return res.redirect(`/admin/system?msg=${encodeURIComponent(`上传成功：/uploads/${req.file.filename}`)}`);
  });
});

app.post("/profile-edit-save", (req, res) => {
  const session = requireUser(req, res);
  if (!session) return;
  upload.single("avatar")(req, res, (error) => {
    const wantsJson = req.get("x-requested-with") === "XMLHttpRequest" || req.body.ajax === "1";
    if (error) {
      if (wantsJson) {
        return res.status(400).json({ ok: false, message: "头像上传失败，请重试" });
      }
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=profile_edit&high=4", "头像上传失败，请重试");
    }
    const current = getUserProfileEditData(session.user.id);
    const nickname = String(req.body.nickname || "").trim() || current?.user?.nickname || session.user.nickname;
    const gender = ["male", "female", "secret"].includes(String(req.body.gender || "")) ? String(req.body.gender) : "secret";
    const year = String(req.body.birthday_year || "").trim();
    const month = String(req.body.birthday_month || "").trim();
    const day = String(req.body.birthday_day || "").trim();
    const birthday = year && month && day
      ? `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : "";
    const avatar = req.file
      ? `/uploads/${req.file.filename}`
      : String(req.body.avatar_current || current?.user?.avatar || "").trim();
    updateUserProfileEdit(session.user.id, {
      nickname,
      avatar,
      gender,
      birthday
    });
    const nextPassword = String(req.body.password || "").trim();
    if (nextPassword) {
      if (nextPassword.length < 6) {
        if (wantsJson) {
          return res.status(400).json({ ok: false, message: "新密码至少 6 位" });
        }
        return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=profile_edit&high=4", "新密码至少 6 位");
      }
      updateUserPassword(session.user.id, nextPassword);
    }
    if (wantsJson) {
      return res.json({
        ok: true,
        message: "个人资料已保存",
        user: getUserProfileEditData(session.user.id)?.user || null
      });
    }
    return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=profile_edit&high=4", "个人资料已保存");
  });
});

app.post("/admin/orders", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const order = createOrder({
    userId: Number(req.body.user_id || 18681),
    orderType: String(req.body.order_type || "membership"),
    planId: req.body.plan_id ? Number(req.body.plan_id) : null,
    amount: Number(req.body.amount || 0),
    status: String(req.body.status || "paid"),
    note: String(req.body.note || "").trim()
  });
  applyPaidOrderEffects(order);
  res.redirect("/admin/orders?msg=" + encodeURIComponent("订单已新增"));
});

app.post("/admin/orders/:id/status", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const orderId = Number(req.params.id);
  const previousOrder = getOrderById(orderId);
  const nextStatus = String(req.body.status || "paid");
  const order = updateOrderStatus(orderId, nextStatus);
  if (previousOrder && previousOrder.status !== "paid" && nextStatus === "paid") {
    applyPaidOrderEffects(order);
  }
  res.redirect("/admin/orders?msg=" + encodeURIComponent("订单状态已更新"));
});

app.post("/admin/withdraws/:id/status", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const requestId = Number(req.params.id);
  const status = String(req.body.status || "pending");
  const reviewNote = String(req.body.review_note || "").trim();
  const request = updateWithdrawRequestReview(requestId, {
    status,
    reviewNote,
    reviewedBy: session.username
  });
  if (request) {
    createUserMessage(request.user_id, {
      type: "wallet",
      title: "提现审核通知",
      content: status === "approved" ? "您的提现申请已审核通过。" : (status === "rejected" ? `您的提现申请未通过：${reviewNote || "请联系平台客服"}` : "您的提现申请状态已更新。"),
      href: "/plugin.php?id=xigua_hb&ac=qianbao"
    });
  }
  res.redirect("/admin/withdraws?msg=" + encodeURIComponent("提现状态已更新"));
});

app.post("/admin/users/:id/membership", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  updateUserMembership(Number(req.params.id), {
    membershipStatus: String(req.body.membership_status || "inactive"),
    membershipExpiresAt: String(req.body.membership_expires_at || "").trim(),
    membershipPlanId: req.body.membership_plan_id ? Number(req.body.membership_plan_id) : null
  });
  res.redirect("/admin/users?msg=" + encodeURIComponent("会员状态已更新"));
});

app.post("/admin/messages/:id/read", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  updateMessageReadStatus(Number(req.params.id), req.body.is_read === "1");
  res.redirect("/admin/messages?msg=" + encodeURIComponent("消息状态已更新"));
});

app.post("/admin/service/:id/reply", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const result = sendAdminServiceReply(Number(req.params.id), session.username, String(req.body.content || ""));
  const target = `/admin/service/${encodeURIComponent(req.params.id)}`;
  const wantsJson = req.get("x-requested-with") === "XMLHttpRequest" || req.body.ajax === "1";
  if (!result.ok) {
    if (wantsJson) {
      return res.status(400).json(result);
    }
    return res.redirect(`${target}?msg=${encodeURIComponent(result.message)}`);
  }
  if (wantsJson) {
    return res.json(result);
  }
  res.redirect(`${target}?msg=${encodeURIComponent("回复已发送")}`);
});

app.post("/admin/service/:id/status", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const status = String(req.body.status || "open");
  updateServiceConversationStatus(Number(req.params.id), status);
  assignServiceConversation(Number(req.params.id), session.username);
  res.redirect(`/admin/service/${encodeURIComponent(req.params.id)}?msg=${encodeURIComponent("会话状态已更新")}`);
});

app.post("/admin/partners/:id/status", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  const status = String(req.body.status || "pending");
  const record = updatePartnerApplicationStatus(Number(req.params.id), status);
  if (record && status === "approved") {
    createUserMessage(record.user_id, {
      type: "partner",
      title: "合伙人申请已通过",
      content: "您的合伙人申请已审核通过，请留意后续平台通知。",
      href: "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5"
    });
  }
  if (record && status === "rejected") {
    createUserMessage(record.user_id, {
      type: "partner",
      title: "合伙人申请未通过",
      content: "本次申请暂未通过，您可完善资料后再次提交。",
      href: "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5"
    });
  }
  res.redirect("/admin/partners?msg=" + encodeURIComponent("申请状态已更新"));
});

app.post("/plugin.php", (req, res) => {
  const { id, ac, do: action, pubid, incr_type: incrType, edit } = req.query;
  const userSession = getUserSession(req);

  if (id === "xigua_hb" && ac === "auth" && action === "login") {
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "").trim();
    const user = authenticateUser(phone, password);
    if (!user) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=auth", "手机号或密码错误");
    }
    const token = crypto.randomBytes(24).toString("hex");
    createUserSession(token, user.id);
    res.setHeader("Set-Cookie", `user_session=${token}; Path=/; HttpOnly`);
    return res.redirect("/plugin.php?id=xigua_hb&ac=my&high=4");
  }

  if (id === "xigua_hb" && ac === "auth" && action === "register") {
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "").trim();
    const nickname = String(req.body.nickname || "").trim() || `用户${phone.slice(-4)}`;
    const city = String(req.body.city || "未设置城市").trim();
    if (!/^1\d{10}$/.test(phone)) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=auth&mode=register", "请输入正确手机号");
    }
    if (password.length < 6) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=auth&mode=register", "密码至少 6 位");
    }
    const result = createFrontUser({ phone, password, nickname, city });
    if (!result.ok) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=auth&mode=register", result.message);
    }
    const token = crypto.randomBytes(24).toString("hex");
    createUserSession(token, result.user.id);
    res.setHeader("Set-Cookie", `user_session=${token}; Path=/; HttpOnly`);
    return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=my&high=4", "注册成功");
  }

  if (id === "xigua_hb" && ac === "auth" && action === "logout") {
    const cookies = parseCookies(req);
    if (cookies.user_session) {
      deleteUserSession(cookies.user_session);
    }
    res.setHeader("Set-Cookie", "user_session=; Path=/; Max-Age=0; HttpOnly");
    return res.redirect("/plugin.php?id=xigua_hb&ac=auth&msg=已退出登录");
  }

  if (id === "xigua_hb" && ac === "incr" && incrType === "shares") {
    incrementShare(Number(pubid));
    return res.type("application/xml").send(xmlResult("success|分享次数已增加"));
  }

  if (id === "xigua_hb" && ac === "refresh" && action === "ref1") {
    const result = refreshPost(Number(pubid));
    return res.type("application/xml").send(xmlResult(result.message));
  }

  if (id === "xigua_hb" && ac === "refresh" && action === "auto") {
    const form = req.body.form || req.body;
    const intervalMinutes = Math.max(1, Number(form.jiange || 60));
    const maxRefreshes = Math.max(1, Number(form.jiangemax || 10));
    updateRefreshSettings(intervalMinutes, maxRefreshes);
    return res.type("application/xml").send(xmlResult("success|自动刷新已开启"));
  }

  if (id === "xigua_lt" && ac === "chat_send") {
    const session = requireUser(req, res);
    if (!session) return;
    const channel = String(req.query.channel || "martin");
    const result = sendServiceUserMessage(session.user.id, channel, String(req.body.content || ""));
    const target = `/plugin.php?id=xigua_lt&type=thread&channel=${encodeURIComponent(channel)}&mobile=2&high=3`;
    if (!result.ok) {
      return redirectWithMessage(res, target, result.message);
    }
    return res.redirect(target);
  }

  if (id === "xigua_hb" && ac === "sendsms") {
    return res.type("application/xml").send(xmlResult("success|验证码已发送（演示环境）"));
  }

  if (id === "xigua_hb" && ac === "reach") {
    return res.type("application/xml").send(xmlResult("success|reach"));
  }

  if (id === "xigua_hb" && ac === "praise") {
    incrementLike(Number(pubid));
    return res.type("application/xml").send(xmlResult("success|点赞成功"));
  }

  if (id === "xigua_hb" && ac === "pub") {
    if (!userSession.loggedIn) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=auth", "请先登录后发布");
    }
    const payload = parsePostForm(req.body);
    payload.userId = userSession.user.id;
    if (!payload.title || !payload.content) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=pub", "标题和内容不能为空");
    }

    if (edit) {
      const post = updatePost(Number(edit), payload);
      return redirectWithMessage(res, `/plugin.php?id=xigua_hb&ac=view&pubid=${post.id}`, "编辑成功");
    }

    const post = createPost(payload);
    return redirectWithMessage(res, `/plugin.php?id=xigua_hb&ac=view&pubid=${post.id}`, "发布成功");
  }

  if (id === "xigua_hb" && ac === "qianbao" && action === "topup") {
    if (!userSession.loggedIn) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=auth", "请先登录");
    }
    const amount = Math.max(0, Number((req.body.amount || req.body.form?.amount || 0)));
    if (!amount) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=qianbao", "请输入正确的充值金额");
    }
    topUpUserWallet(userSession.user.id, amount, "前台钱包充值");
    createUserMessage(userSession.user.id, {
      type: "wallet",
      title: "充值成功",
      content: `您已成功充值 ${amount.toFixed(2)} 元`,
      href: "/plugin.php?id=xigua_hb&ac=qianbao"
    });
    return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=qianbao", "充值成功");
  }

  if (id === "xigua_hb" && ac === "qianbao" && action === "withdraw") {
    if (!userSession.loggedIn) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=auth", "请先登录");
    }
    const amount = Math.max(0, Number(req.body.amount || 0));
    if (!amount) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=qianbao", "请输入正确提现金额");
    }
    const result = createWithdrawRequest(userSession.user.id, amount);
    return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=qianbao", result.message);
  }

  if (id === "xigua_hb" && ac === "settings" && action === "profile") {
    const session = requireUser(req, res);
    if (!session) return;
    updateUserSettings(session.user.id, {
      nickname: String(req.body.nickname || "").trim() || session.user.nickname,
      city: String(req.body.city || "").trim(),
      bio: String(req.body.bio || "").trim(),
      avatar: String(req.body.avatar || "").trim(),
      backgroundImage: String(req.body.background_image || "").trim(),
      notifyComment: req.body.notify_comment === "1",
      notifyMessage: req.body.notify_message === "1"
    });
    return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=profile", "个人资料已保存");
  }

  if (id === "xigua_hb" && ac === "settings" && action === "notifications") {
    const session = requireUser(req, res);
    if (!session) return;
    const current = getUserSettingsData(session.user.id);
    updateUserSettings(session.user.id, {
      nickname: current.user.nickname,
      city: current.user.city || "",
      bio: current.user.bio || "",
      avatar: current.user.avatar || "",
      backgroundImage: current.user.background_image || "",
      notifyComment: req.body.notify_comment === "1",
      notifyMessage: req.body.notify_message === "1"
    });
    return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=notifications", "提醒设置已保存");
  }

  if (id === "xigua_hb" && ac === "settings" && action === "background") {
    const session = requireUser(req, res);
    if (!session) return;
    return upload.single("background_image_file")(req, res, (error) => {
      if (error) {
        return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=background", "背景图上传失败，请重试");
      }
      const current = getUserSettingsData(session.user.id);
      const currentUser = current?.user || session.user || {};
      const backgroundImage = req.file
        ? `/uploads/${req.file.filename}`
        : String(req.body.background_image_current || currentUser.background_image || "").trim();
      updateUserSettings(session.user.id, {
        nickname: currentUser.nickname || session.user.nickname,
        city: currentUser.city || "",
        bio: currentUser.bio || "",
        avatar: currentUser.avatar || "",
        backgroundImage,
        notifyComment: Number(currentUser.notify_comment) === 1,
        notifyMessage: Number(currentUser.notify_message) === 1
      });
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=background", "个人主页背景已保存");
    });
  }

  if (id === "xigua_hb" && ac === "settings" && action === "address") {
    const session = requireUser(req, res);
    if (!session) return;
    upsertUserAddress(session.user.id, {
      contactName: String(req.body.contact_name || "").trim(),
      phone: String(req.body.address_phone || "").trim(),
      address: String(req.body.address || "").trim()
    });
    return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=address", "收货地址已保存");
  }

  if (id === "xigua_hb" && ac === "settings" && action === "withdraw_profile") {
    const session = requireUser(req, res);
    if (!session) return;
    return upload.single("wechat_qr_file")(req, res, (error) => {
      if (error) {
        return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=withdraw", "收款码上传失败，请重试");
      }
      const current = getUserSettingsData(session.user.id);
      const existing = current.withdrawProfile || {};
      const realName = String(req.body.real_name || "").trim();
      const wechatQrImage = req.file
        ? `/uploads/${req.file.filename}`
        : String(req.body.wechat_qr_current || existing.wechat_qr_image || existing.account_no || "").trim();
      upsertUserWithdrawProfile(session.user.id, {
        accountName: realName,
        accountType: "wechat",
        accountNo: wechatQrImage,
        realName,
        wechatQrImage
      });
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=withdraw", "提现设置已保存");
    });
  }

  if (id === "xigua_hb" && ac === "settings" && action === "bind_phone") {
    const session = requireUser(req, res);
    if (!session) return;
    const phone = String(req.body.phone || "").trim();
    const code = String(req.body.code || "").trim();
    const nextView = String(req.body.next || "bind_phone").trim();
    if (!/^1\d{10}$/.test(phone)) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=bind_phone", "请输入正确手机号");
    }
    if (code !== "123456") {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hb&ac=settings&high=4&view=bind_phone", "请输入正确验证码");
    }
    updateUserPhone(session.user.id, phone);
    return redirectWithMessage(res, `/plugin.php?id=xigua_hb&ac=settings&high=4&view=${encodeURIComponent(nextView)}`, "手机号已绑定");
  }

  if (id === "xigua_hb" && ac === "homepage_follow") {
    const session = requireUser(req, res);
    if (!session) return;
    const targetUserId = Number(req.body.target_user_id || req.query.uid || 0);
    toggleUserFollow(session.user.id, targetUserId);
    return res.redirect(`/plugin.php?id=xigua_hb&ac=homepage&high=4&uid=${encodeURIComponent(targetUserId)}`);
  }

  if (id === "xigua_wr" && action === "sign") {
    const session = requireUser(req, res);
    if (!session) return;
    const result = signInToday(session.user.id);
    return redirectWithMessage(res, "/plugin.php?id=xigua_wr&high=1", result.message);
  }

  if (id === "xigua_hh" && (ac === "apply" || action === "apply")) {
    const session = requireUser(req, res);
    if (!session) return;
    const city = String(req.body.city || session.user.city || "").trim();
    const phone = String(req.body.phone || session.user.phone || "").trim();
    const intro = String(req.body.intro || "").trim();
    if (!city || !phone || !intro) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5", "请完整填写申请资料");
    }
    const result = submitPartnerApplication(session.user.id, { city, phone, intro });
    return redirectWithMessage(res, "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5", result.message);
  }

  if (id === "xigua_hh" && (ac === "join" || action === "join")) {
    const session = requireUser(req, res);
    if (!session) return;
    const planKey = String(req.body.plan_key || "").trim();
    const planMap = {
      gold_month: { name: "金牌合伙人", amount: 69, note: "合伙人订单：金牌合伙人 1个月/69元" },
      gold_lifetime: { name: "金牌合伙人", amount: 99, note: "合伙人订单：金牌合伙人 永久/99元" }
    };
    const plan = planMap[planKey];
    if (!plan) {
      return redirectWithMessage(res, "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5", "请选择有效套餐");
    }
    createOrder({
      userId: session.user.id,
      orderType: "partner",
      planId: null,
      amount: plan.amount,
      status: "pending",
      note: plan.note
    });
    createUserMessage(session.user.id, {
      type: "partner",
      title: "合伙人订单已创建",
      content: `${plan.name}${plan.amount === 69 ? "1个月/69元" : "永久/99元"} 已提交，请等待平台处理。`,
      href: "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5"
    });
    return redirectWithMessage(res, "/plugin.php?id=xigua_hh&mobile=2&ac=my&idu=5", "已提交合伙人订单");
  }

  return res.type("application/xml").send(xmlResult("success|请求已接收"));
});

app.listen(port, () => {
  console.log(`Clone app running on http://localhost:${port}`);
});
