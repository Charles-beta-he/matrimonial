import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed script — idempotent via upsert on unique fields.
 *
 * Produces:
 *   - 1 ADMIN user (phone 13800000001 / nickname 管理员)
 *   - 10 regular USERs (2 BANNED)
 *   - 6 PENDING photos
 *   - 4 PENDING TextAuditItems
 *   - 5 PENDING/REVIEWING Reports
 *   - 6 Matchmakers (backed by 6 dedicated MATCHMAKER users)
 *   - 6 Activities (mixed status)
 *   - 5 PushCampaigns (historical sends)
 *   - Sample Activity + tags/preferences for each user
 */
async function main() {
  console.log('Seeding database...');

  // ---------- 1. ADMIN user ----------
  const admin = await prisma.user.upsert({
    where: { phone: '13800000001' },
    update: { role: 'ADMIN', nickname: '管理员', status: 'ACTIVE' },
    create: {
      phone: '13800000001',
      nickname: '管理员',
      gender: 'MALE',
      birthday: new Date('1990-01-01'),
      city: '北京',
      bio: '平台运营管理员',
      height: 175,
      education: 'MASTER',
      verificationLevel: 'L4',
      realNameVerified: true,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ ADMIN: ${admin.nickname} (${admin.phone})`);

  // ---------- 2. Regular users ----------
  type SeedUser = {
    phone: string;
    nickname: string;
    gender: 'MALE' | 'FEMALE';
    birthday: Date;
    city: string;
    bio: string;
    height: number;
    education: 'HIGH_SCHOOL' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'PHD';
    verificationLevel: 'L1' | 'L2' | 'L3' | 'L4';
    status?: 'ACTIVE' | 'BANNED';
    banReason?: string;
  };

  const regularUsersData: SeedUser[] = [
    { phone: '13900000001', nickname: '晴天小熊', gender: 'MALE',   birthday: new Date('1995-06-15'), city: '北京', bio: '热爱旅行和摄影',       height: 178, education: 'BACHELOR',  verificationLevel: 'L3' },
    { phone: '13900000002', nickname: '月光仙子', gender: 'FEMALE', birthday: new Date('1997-03-20'), city: '北京', bio: '喜欢读书和美食',       height: 165, education: 'MASTER',    verificationLevel: 'L3' },
    { phone: '13900000003', nickname: '阳光大叔', gender: 'MALE',   birthday: new Date('1988-11-08'), city: '上海', bio: '程序员，周末喜欢户外', height: 175, education: 'BACHELOR',  verificationLevel: 'L2' },
    { phone: '13900000004', nickname: '晓雯设计', gender: 'FEMALE', birthday: new Date('1996-09-12'), city: '上海', bio: '设计师，猫奴一枚',     height: 162, education: 'BACHELOR',  verificationLevel: 'L3' },
    { phone: '13900000005', nickname: '志强创业', gender: 'MALE',   birthday: new Date('1994-01-25'), city: '深圳', bio: '创业中，寻找同伴',     height: 180, education: 'MASTER',    verificationLevel: 'L4' },
    { phone: '13900000006', nickname: '雨薇瑜伽', gender: 'FEMALE', birthday: new Date('1998-07-30'), city: '广州', bio: '瑜伽爱好者，素食',     height: 168, education: 'BACHELOR',  verificationLevel: 'L2' },
    { phone: '13900000007', nickname: '大海哥',   gender: 'MALE',   birthday: new Date('1992-02-14'), city: '杭州', bio: '海钓爱好者',           height: 182, education: 'ASSOCIATE', verificationLevel: 'L1' },
    { phone: '13900000008', nickname: '星辰少女', gender: 'FEMALE', birthday: new Date('1999-12-01'), city: '成都', bio: '爱猫的插画师',         height: 160, education: 'BACHELOR',  verificationLevel: 'L2' },
    { phone: '13900000009', nickname: '狼叔黑户', gender: 'MALE',   birthday: new Date('1985-05-05'), city: '未知', bio: '多次发布违规内容',     height: 170, education: 'HIGH_SCHOOL', verificationLevel: 'L1', status: 'BANNED', banReason: '多次发布营销内容' },
    { phone: '13900000010', nickname: '诈骗小号', gender: 'FEMALE', birthday: new Date('2000-08-18'), city: '未知', bio: '可疑账号',             height: 165, education: 'HIGH_SCHOOL', verificationLevel: 'L1', status: 'BANNED', banReason: '被多人举报为诈骗账号' },
  ];

  const regularUsers: { id: string; nickname: string }[] = [];
  for (const u of regularUsersData) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      update: {
        nickname: u.nickname,
        status: u.status ?? 'ACTIVE',
        bannedAt: u.status === 'BANNED' ? new Date() : null,
        banReason: u.banReason ?? null,
      },
      create: {
        phone: u.phone,
        nickname: u.nickname,
        gender: u.gender,
        birthday: u.birthday,
        city: u.city,
        bio: u.bio,
        height: u.height,
        education: u.education,
        verificationLevel: u.verificationLevel,
        role: 'USER',
        status: u.status ?? 'ACTIVE',
        bannedAt: u.status === 'BANNED' ? new Date() : null,
        banReason: u.banReason ?? null,
      },
    });
    regularUsers.push({ id: user.id, nickname: user.nickname });

    // tags
    const tags = ['旅行', '美食', '读书', '运动', '音乐'].slice(0, 3);
    for (const tag of tags) {
      await prisma.userTag
        .create({ data: { userId: user.id, tag } })
        .catch(() => {});
    }

    // preference
    await prisma.preference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        ageMin: 22,
        ageMax: 35,
        cities: [u.city],
        heightMin: 155,
        heightMax: 190,
        acceptLongDistance: false,
      },
    });
    console.log(`  ✓ USER: ${u.nickname} (${u.phone}) ${u.status === 'BANNED' ? '[BANNED]' : ''}`);
  }

  // ---------- 3. PENDING photos for first 6 regular users ----------
  for (let i = 0; i < 6; i++) {
    const target = regularUsers[i];
    const exists = await prisma.photo.findFirst({
      where: { userId: target.id, url: `https://picsum.photos/seed/photo${i + 1}/400/400` },
    });
    if (!exists) {
      await prisma.photo.create({
        data: {
          userId: target.id,
          url: `https://picsum.photos/seed/photo${i + 1}/400/400`,
          order: 0,
          isAvatar: i === 0,
          auditStatus: 'PENDING',
        },
      });
    }
  }
  console.log('  ✓ 6 PENDING photos');

  // ---------- 4. PENDING TextAuditItems ----------
  const textAuditSeeds: Array<{
    text: string;
    context: 'MESSAGE' | 'BIO' | 'NICKNAME';
  }> = [
    { text: '加我微信号 abc123 详聊',      context: 'MESSAGE' },
    { text: '投资理财保证翻倍，私聊我',     context: 'BIO' },
    { text: '扫码领红包',                  context: 'MESSAGE' },
    { text: '可以借点钱给我吗',            context: 'NICKNAME' },
  ];
  // Clear existing seed rows by context+text dedupe
  for (let i = 0; i < textAuditSeeds.length; i++) {
    const seed = textAuditSeeds[i];
    const owner = regularUsers[i % regularUsers.length];
    const exists = await prisma.textAuditItem.findFirst({
      where: { userId: owner.id, text: seed.text, context: seed.context },
    });
    if (!exists) {
      await prisma.textAuditItem.create({
        data: {
          userId: owner.id,
          text: seed.text,
          context: seed.context,
          status: 'PENDING',
        },
      });
    }
  }
  console.log('  ✓ 4 PENDING TextAuditItems');

  // ---------- 5. Reports ----------
  const reportSeeds: Array<{
    reporterIdx: number;
    reportedIdx: number;
    reason: 'FAKE_PROFILE' | 'HARASSMENT' | 'SCAM' | 'INAPPROPRIATE_CONTENT' | 'OTHER';
    description: string;
    status: 'PENDING' | 'REVIEWING';
  }> = [
    { reporterIdx: 0, reportedIdx: 9, reason: 'SCAM',                  description: '怀疑是诈骗账号，索要转账', status: 'PENDING' },
    { reporterIdx: 1, reportedIdx: 8, reason: 'INAPPROPRIATE_CONTENT', description: '发送不雅照片',              status: 'REVIEWING' },
    { reporterIdx: 2, reportedIdx: 9, reason: 'FAKE_PROFILE',          description: '照片与本人不符',            status: 'PENDING' },
    { reporterIdx: 3, reportedIdx: 8, reason: 'HARASSMENT',            description: '多次骚扰信息',              status: 'PENDING' },
    { reporterIdx: 4, reportedIdx: 7, reason: 'OTHER',                 description: '频繁发送广告链接',          status: 'REVIEWING' },
  ];
  for (const r of reportSeeds) {
    const reporter = regularUsers[r.reporterIdx];
    const reported = regularUsers[r.reportedIdx];
    const exists = await prisma.report.findFirst({
      where: { reporterId: reporter.id, reportedId: reported.id, reason: r.reason },
    });
    if (!exists) {
      await prisma.report.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: r.reason,
          description: r.description,
          evidence: [],
          status: r.status,
        },
      });
    }
  }
  console.log('  ✓ 5 Reports (PENDING/REVIEWING)');

  // ---------- 6. Matchmakers (6 dedicated MATCHMAKER users) ----------
  const matchmakerSeeds = [
    { phone: '13700000001', nickname: '红娘·春风',   gender: 'FEMALE' as const, city: '北京' },
    { phone: '13700000002', nickname: '红娘·夏雨',   gender: 'FEMALE' as const, city: '上海' },
    { phone: '13700000003', nickname: '红娘·秋月',   gender: 'FEMALE' as const, city: '广州' },
    { phone: '13700000004', nickname: '红娘·冬雪',   gender: 'FEMALE' as const, city: '深圳' },
    { phone: '13700000005', nickname: '月老·老张',   gender: 'MALE'   as const, city: '成都' },
    { phone: '13700000006', nickname: '月老·老李',   gender: 'MALE'   as const, city: '杭州' },
  ];
  for (let i = 0; i < matchmakerSeeds.length; i++) {
    const m = matchmakerSeeds[i];
    const user = await prisma.user.upsert({
      where: { phone: m.phone },
      update: { role: 'MATCHMAKER', nickname: m.nickname },
      create: {
        phone: m.phone,
        nickname: m.nickname,
        gender: m.gender,
        birthday: new Date('1980-01-01'),
        city: m.city,
        bio: '资深红娘，专注高质量牵线',
        role: 'MATCHMAKER',
        status: 'ACTIVE',
        verificationLevel: 'L4',
        realNameVerified: true,
      },
    });
    await prisma.matchmaker.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        activeClients: 5 + i * 3,
        totalMatches: 20 + i * 11,
        successRate: 0.35 + i * 0.05,
        rating: 4.2 + (i % 4) * 0.15,
        isOnline: i % 2 === 0,
      },
    });
  }
  console.log('  ✓ 6 Matchmakers');

  // ---------- 7. Activities ----------
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const activitySeeds: Array<{
    title: string;
    description: string;
    category: string;
    location: string;
    startTime: Date;
    maxMale: number;
    maxFemale: number;
    fee: number;
    status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  }> = [
    { title: '周末露营交友',   description: '郊外露营，认识新朋友', category: '线下活动', location: '北京·怀柔', startTime: new Date(now + 7 * DAY),  maxMale: 10, maxFemale: 10, fee: 199, status: 'UPCOMING'  },
    { title: '城市夜跑局',     description: '5 公里夜跑 + 轻食',    category: '线下活动', location: '上海·外滩', startTime: new Date(now + 3 * DAY),  maxMale: 15, maxFemale: 15, fee: 0,   status: 'UPCOMING'  },
    { title: '线上读书会',     description: 'Zoom 共读一本书',      category: '线上活动', location: '线上',       startTime: new Date(now + 1 * DAY),  maxMale: 20, maxFemale: 20, fee: 0,   status: 'UPCOMING'  },
    { title: '春节团圆派对',   description: '一起过年不孤单',       category: '节日活动', location: '北京·朝阳', startTime: new Date(now - 30 * DAY), maxMale: 12, maxFemale: 12, fee: 299, status: 'COMPLETED' },
    { title: '中秋赏月会',     description: '湖边赏月，汉服主题',   category: '节日活动', location: '杭州·西湖', startTime: new Date(now - 90 * DAY), maxMale: 10, maxFemale: 10, fee: 159, status: 'COMPLETED' },
    { title: '直播剧本杀',     description: '线上剧本杀破冰',       category: '线上活动', location: '线上',       startTime: new Date(now - 1 * DAY),  maxMale: 8,  maxFemale: 8,  fee: 59,  status: 'ONGOING'   },
  ];
  for (const a of activitySeeds) {
    const exists = await prisma.activity.findFirst({ where: { title: a.title } });
    if (!exists) {
      await prisma.activity.create({
        data: {
          title: a.title,
          description: a.description,
          coverUrl: `https://picsum.photos/seed/${encodeURIComponent(a.title)}/800/600`,
          category: a.category,
          location: a.location,
          startTime: a.startTime,
          maxMale: a.maxMale,
          maxFemale: a.maxFemale,
          fee: new Prisma.Decimal(a.fee),
          status: a.status,
        },
      });
    }
  }
  console.log('  ✓ 6 Activities');

  // ---------- 8. PushCampaigns ----------
  const pushSeeds: Array<{
    title: string;
    body: string;
    audience: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'MALE' | 'FEMALE' | 'VERIFIED' | 'PREMIUM';
    delivered: number;
    opened: number;
    daysAgo: number;
  }> = [
    { title: '新年快乐',       body: '新的一年，遇见新的心动',     audience: 'ALL',      delivered: 12400, opened: 3200, daysAgo: 30 },
    { title: '周末活动提醒',   body: '本周末露营报名开启',        audience: 'ACTIVE',   delivered: 5800,  opened: 1700, daysAgo: 7  },
    { title: '女神节特辑',     body: '女性用户专享福利',          audience: 'FEMALE',   delivered: 4200,  opened: 1100, daysAgo: 14 },
    { title: '会员限时折扣',   body: '月度会员 5 折',             audience: 'PREMIUM',  delivered: 980,   opened: 420,  daysAgo: 3  },
    { title: '认证用户福利',   body: '实名用户专享 Super Like',   audience: 'VERIFIED', delivered: 3300,  opened: 760,  daysAgo: 2  },
  ];
  for (const p of pushSeeds) {
    const exists = await prisma.pushCampaign.findFirst({ where: { title: p.title } });
    if (!exists) {
      await prisma.pushCampaign.create({
        data: {
          title: p.title,
          body: p.body,
          audience: p.audience,
          sentAt: new Date(now - p.daysAgo * DAY),
          delivered: p.delivered,
          opened: p.opened,
          createdBy: admin.id,
        },
      });
    }
  }
  console.log('  ✓ 5 PushCampaigns');

  // ---------- 9. Cold-start seed users (60 realistic profiles) ----------
  await seedColdStartUsers();

  console.log('Seed completed!');
}

// ==================== Cold-start seed data ====================

const SEED_CITIES = ['北京', '上海', '深圳', '广州', '杭州', '成都', '南京', '武汉', '重庆', '西安'];

const SEED_MALE_NAMES = [
  '李明', '王浩', '张伟', '刘洋', '陈晨', '杨帆', '赵磊', '黄海', '周杰', '吴鑫',
  '徐强', '孙宇', '马超', '朱鹏', '胡彬', '郭锋', '林涛', '何昊', '罗文', '高峰',
  '宋杰', '唐宁', '许辉', '邓凯', '韩宇', '曹伟', '彭飞', '潘磊', '冯岩', '蒋波',
];
const SEED_FEMALE_NAMES = [
  '王雪', '李婷', '张静', '刘晓', '陈思', '杨薇', '赵欣', '黄丽', '周倩', '吴琪',
  '徐慧', '孙雨', '马瑶', '朱萌', '胡悦', '郭颖', '林芳', '何婉', '罗梦', '高雅',
  '宋佳', '唐韵', '许珊', '邓楠', '韩冰', '曹文', '彭秀', '潘月', '冯娜', '蒋雯',
];

const SEED_TAGS = [
  '户外控', '美食家', '电影迷', '旅行达人', '健身爱好者', '阅读', '音乐', '摄影',
  '烹饪', '瑜伽', '游戏', '宠物控', '咖啡控', '茶道', '书法', '绘画', '舞蹈', '钢琴',
];

const SEED_MBTI = [
  'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP',
  'ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP',
];

const SEED_ZODIAC = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
];

const SEED_BIOS_MALE = [
  '阳光开朗，热爱生活，周末喜欢去爬山',
  '程序员一枚，但不无趣，会做饭会弹吉他',
  '金融从业者，稳重靠谱，寻找温柔的你',
  '建筑师，对设计和美学有执着追求',
  '创业中，忙碌但懂得经营感情',
  '医生一枚，工作虽忙但会给你满满的安全感',
  '喜欢摄影和旅行，用镜头记录生活的美好',
  '运动达人，篮球游泳样样来，也会陪你逛街',
  '文艺青年，周末爱泡书店和咖啡馆',
  '海归回来，开放包容，寻找三观一致的伴侣',
  '国企稳定工作，性格温和，家庭观念强',
  '热爱烹饪，朋友都说我做的菜比餐厅好吃',
  '音乐是我的灵魂，吉他钢琴都略通一二',
  '养了一只金毛，它比我还受欢迎',
  '喜欢户外徒步，也能安静陪你看一下午书',
];

const SEED_BIOS_FEMALE = [
  '温柔似水，外表安静内心丰富',
  '设计师，热爱美的事物，周末爱逛展',
  '教师一枚，性格开朗，喜欢旅行和美食',
  '心理学专业，善于倾听，温暖治愈系',
  '爱笑的女生运气不会太差，希望遇到有趣的灵魂',
  '独立但不强势，会撒娇也会讲道理',
  '喜欢瑜伽和冥想，追求内心的平静',
  '吃货一枚，人生理想是吃遍全世界',
  '文艺女青年，喜欢写手账记录生活',
  '护士姐姐，外表柔弱内心坚强',
  '舞蹈专业，热爱生活中的每一个节拍',
  '财务工作者，理性与感性并存',
  '喜欢养花种草，在城市里营造小花园',
  '周末喜欢去露营，享受大自然的宁静',
  '爱猫人士，家里有两只小可爱等你来撸',
];

const SEED_OCCUPATIONS_MALE = [
  '软件工程师', '金融分析师', '建筑师', '医生', '产品经理',
  '律师', '设计师', '教师', '创业者', '公务员',
];
const SEED_OCCUPATIONS_FEMALE = [
  'UI设计师', '会计师', '护士', '教师', '市场营销',
  '心理咨询师', '翻译', '编辑', '人力资源', '运营经理',
];

const SEED_PROMPTS: Record<string, string[]> = {
  ideal_weekend: [
    '睡到自然醒，去市集买菜做一顿丰盛的brunch',
    '约上朋友去郊外露营，晚上围着篝火聊天',
    '泡一壶好茶，窝在沙发上看一下午的书',
    '去新开的展览逛逛，再找家小店吃晚饭',
    '早起跑步，下午看电影，晚上和朋友聚餐',
  ],
  first_date: [
    '安静的咖啡馆，聊聊彼此的故事',
    '一起去看一场展览或音乐会',
    '找个公园散步，自然不做作',
    '去一家有特色的餐厅，边吃边聊',
    '周末去爬山，在运动中了解彼此',
  ],
  life_goal: [
    '找到一个相互理解、共同成长的伴侣',
    '事业有成的同时，也有温暖的家',
    '看遍世界的风景，体验不同的文化',
    '做自己热爱的事，和喜欢的人在一起',
    '成为更好的自己，给身边的人带来温暖',
  ],
  love_language: [
    '陪伴，安安静静待在一起就很好',
    '言语肯定，经常说我爱你和鼓励的话',
    '肢体接触，牵手拥抱是日常',
    '精心准备的小惊喜和仪式感',
    '为对方做力所能及的事情',
  ],
  deal_breaker: [
    '不诚实，信任是一切的基础',
    '没有上进心，生活需要共同进步',
    '不尊重家人和朋友',
    '情绪不稳定，动不动就冷暴力',
    '三观不合，尤其是金钱观',
  ],
};
const SEED_PROMPT_IDS = Object.keys(SEED_PROMPTS);

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffleSlice<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function randomBday(minAge: number, maxAge: number): Date {
  const yr = new Date().getFullYear();
  const age = minAge + Math.floor(Math.random() * (maxAge - minAge));
  return new Date(yr - age, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
}

async function seedColdStartUsers() {
  console.log('  Seeding 60 cold-start users...');

  for (let i = 0; i < 60; i++) {
    const isMale = i < 30;
    const name = isMale ? SEED_MALE_NAMES[i] : SEED_FEMALE_NAMES[i - 30];
    const phone = `138${String(10000000 + i).padStart(8, '0')}`;
    const city = pick(SEED_CITIES);

    // Upsert to stay idempotent
    const user = await prisma.user.upsert({
      where: { phone },
      update: { nickname: name },
      create: {
        phone,
        nickname: name,
        gender: isMale ? 'MALE' : 'FEMALE',
        birthday: randomBday(23, 35),
        city,
        bio: pick(isMale ? SEED_BIOS_MALE : SEED_BIOS_FEMALE),
        height: isMale ? 170 + Math.floor(Math.random() * 15) : 158 + Math.floor(Math.random() * 12),
        education: pick(['BACHELOR', 'MASTER', 'PHD', 'ASSOCIATE'] as const),
        occupation: pick(isMale ? SEED_OCCUPATIONS_MALE : SEED_OCCUPATIONS_FEMALE),
        incomeRange: pick(['K5_10', 'K10_20', 'K20_50'] as const),
        hometown: pick(SEED_CITIES),
        zodiac: pick(SEED_ZODIAC),
        mbti: pick(SEED_MBTI),
        verificationLevel: pick(['L2', 'L3', 'L3', 'L4'] as const),
        realNameVerified: true,
        faceVerified: Math.random() > 0.3,
        lastActiveAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        isOnline: Math.random() > 0.7,
      },
    });

    // Photos (3-5) — skip if already exist
    const existingPhotos = await prisma.photo.count({ where: { userId: user.id } });
    if (existingPhotos === 0) {
      const photoCount = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < photoCount; p++) {
        await prisma.photo.create({
          data: {
            userId: user.id,
            url: `https://picsum.photos/seed/${user.id}-${p}/400/600`,
            order: p,
            isAvatar: p === 0,
            auditStatus: 'APPROVED',
          },
        });
      }
    }

    // Tags (3-5)
    const existingTags = await prisma.userTag.count({ where: { userId: user.id } });
    if (existingTags === 0) {
      const selectedTags = shuffleSlice(SEED_TAGS, 3 + Math.floor(Math.random() * 3));
      for (const tag of selectedTags) {
        await prisma.userTag.create({ data: { userId: user.id, tag } }).catch(() => {});
      }
    }

    // Prompts (2-3)
    const existingPrompts = await prisma.userPrompt.count({ where: { userId: user.id } });
    if (existingPrompts === 0) {
      const promptIds = shuffleSlice(SEED_PROMPT_IDS, 2 + Math.floor(Math.random() * 2));
      for (let p = 0; p < promptIds.length; p++) {
        const qId = promptIds[p];
        await prisma.userPrompt.create({
          data: {
            userId: user.id,
            questionId: qId,
            answerText: pick(SEED_PROMPTS[qId]),
            order: p,
          },
        });
      }
    }

    // Preference
    await prisma.preference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        ageMin: 22,
        ageMax: 38,
        cities: [city, pick(SEED_CITIES)],
        heightMin: isMale ? 155 : 170,
        heightMax: isMale ? 175 : 190,
      },
    });

    if (i % 10 === 9) console.log(`    ... ${i + 1}/60`);
  }
  console.log('  ✓ 60 cold-start seed users');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
