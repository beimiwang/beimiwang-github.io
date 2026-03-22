const categories = [
  { id: 1034, name: "求职", icon: "https://lzlm1.oss-cn-beijing.aliyuncs.com/xigua/20250701/wx686332344dd81.png" },
  { id: 1035, name: "招聘", icon: "https://lzlm1.oss-cn-beijing.aliyuncs.com/xigua/20250701/wx68633248596e0.png" },
  { id: 28, name: "饭店转让", icon: "https://lzlm1.oss-cn-beijing.aliyuncs.com/xigua/20250701/wx6863325c9ff85.png" },
  { id: 1038, name: "顺风车", icon: "https://lzlm1.oss-cn-beijing.aliyuncs.com/xigua/20251110/wx6911d54baf82b.png" },
  { id: 1079, name: "饭店用品", icon: "https://lzlm1.oss-cn-beijing.aliyuncs.com/xigua/20251110/wx691187f534712.jpg" }
];

const users = [
  {
    id: 18681,
    nickname: "孤5873",
    city: "兰州",
    avatar: "https://lm.lzlm.vip/uc_server/avatar.php?uid=18681&size=middle",
    phone: "13800001234",
    bio: "十年拉面经验，正在找稳定面匠岗位。"
  },
  {
    id: 71724,
    nickname: "伊峰麻辣烫～麻",
    city: "西安",
    avatar: "https://lm.lzlm.vip/uc_server/avatar.php?uid=71724&size=middle",
    phone: "13900005678",
    bio: "店里长期招人，提供食宿。"
  },
  {
    id: 73255,
    nickname: "拾影Machine",
    city: "杭州",
    avatar: "https://lm.lzlm.vip/uc_server/avatar.php?uid=73255&size=middle",
    phone: "13700008888",
    bio: "想找靠谱团队，长期合作。"
  }
];

const posts = [
  {
    id: 137038,
    userId: 18681,
    categoryId: 1034,
    title: "面匠求职，10 年经验，可长期驻店",
    summary: "擅长拉面、炒面、浇头搭配，接受外地包吃住。",
    content:
      "本人从事兰州拉面相关工作 10 年，熟悉后厨流程、开档收档和基础带徒。希望寻找正规门店，包吃住优先，可一周内到岗。",
    cover: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=900&q=80",
    priceLabel: "9k-12k",
    location: "兰州七里河",
    createdAt: "2026-03-22 09:12:00",
    views: 982,
    likes: 21,
    shares: 7,
    tags: ["包吃住", "可外派", "拉面师傅"]
  },
  {
    id: 137037,
    userId: 71724,
    categoryId: 1035,
    title: "招聘跑堂 2 名，月休 2 天，包食宿",
    summary: "门店稳定营业，急招跑堂和前厅帮手。",
    content:
      "西安门店现招聘跑堂 2 名，要求勤快踏实，能接受高峰时段节奏。包吃住，工资按月准时发放，可视频看店。",
    cover: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80",
    priceLabel: "4.5k-5.5k",
    location: "西安未央区",
    createdAt: "2026-03-22 08:47:00",
    views: 1145,
    likes: 34,
    shares: 12,
    tags: ["招聘", "包食宿", "跑堂"]
  },
  {
    id: 137036,
    userId: 73255,
    categoryId: 1035,
    title: "招聘面匠，夫妻工优先，店稳事少",
    summary: "新店开业，找熟练面匠 1 名，夫妻工优先。",
    content:
      "杭州新店开业，现招面匠 1 名，夫妻工优先考虑。店里设备齐全，工资面议，干得好可长期合作分红。",
    cover: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    priceLabel: "10k-13k",
    location: "杭州余杭区",
    createdAt: "2026-03-22 08:21:00",
    views: 1326,
    likes: 56,
    shares: 16,
    tags: ["面匠", "夫妻工", "分红"]
  },
  {
    id: 137021,
    userId: 71724,
    categoryId: 28,
    title: "饭店转让，接手即可营业",
    summary: "成熟商圈，设备齐全，人流稳定。",
    content:
      "店面位于成熟商圈，附近写字楼和社区密集，设备九成新，可整体转让，支持现场考察。",
    cover: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
    priceLabel: "18.8万",
    location: "银川金凤区",
    createdAt: "2026-03-21 18:12:00",
    views: 635,
    likes: 8,
    shares: 3,
    tags: ["转让", "成熟店", "设备齐全"]
  },
  {
    id: 137010,
    userId: 18681,
    categoryId: 1038,
    title: "西安到兰州顺风车，今天下午出发",
    summary: "还能带 2 人，可捎小件行李。",
    content:
      "西安到兰州顺风车，今天下午 3 点出发，还能坐 2 人，可帮带小件行李，路上可在天水短暂停靠。",
    cover: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
    priceLabel: "120元/位",
    location: "西安北站",
    createdAt: "2026-03-21 12:00:00",
    views: 451,
    likes: 5,
    shares: 2,
    tags: ["顺风车", "当日出发"]
  },
  {
    id: 137002,
    userId: 73255,
    categoryId: 1079,
    title: "二手拉面锅和保温台打包出",
    summary: "饭店用品成套出售，支持视频验货。",
    content:
      "二手拉面锅和保温台打包出售，正常使用中，成色不错，适合刚开店的朋友，支持视频验货后同城自提。",
    cover: "https://images.unsplash.com/photo-1584990347449-a64f83aab0d1?auto=format&fit=crop&w=900&q=80",
    priceLabel: "2600元",
    location: "杭州拱墅区",
    createdAt: "2026-03-20 20:18:00",
    views: 378,
    likes: 4,
    shares: 1,
    tags: ["饭店用品", "同城自提"]
  }
];

const notices = [
  "平台不能保证信息真实性，请勿提前支付任何费用",
  "[03-22]孤5873发布了面匠求职信息",
  "[03-22]伊峰麻辣烫～麻发布了招聘跑堂信息",
  "[03-22]拾影Machine发布了招聘面匠信息"
];

module.exports = {
  categories,
  notices,
  posts,
  users
};
