import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo users
  const users = [
    { phone: '13800000001', nickname: '小明', gender: 'MALE' as const, birthday: new Date('1995-06-15'), city: '北京', bio: '热爱旅行和摄影', height: 178, education: 'BACHELOR' as const, verificationLevel: 'L3' as const },
    { phone: '13800000002', nickname: '小红', gender: 'FEMALE' as const, birthday: new Date('1997-03-20'), city: '北京', bio: '喜欢读书和美食', height: 165, education: 'MASTER' as const, verificationLevel: 'L3' as const },
    { phone: '13800000003', nickname: '大伟', gender: 'MALE' as const, birthday: new Date('1993-11-08'), city: '上海', bio: '程序员，周末喜欢户外', height: 175, education: 'BACHELOR' as const, verificationLevel: 'L2' as const },
    { phone: '13800000004', nickname: '晓雯', gender: 'FEMALE' as const, birthday: new Date('1996-09-12'), city: '上海', bio: '设计师，猫奴一枚', height: 162, education: 'BACHELOR' as const, verificationLevel: 'L3' as const },
    { phone: '13800000005', nickname: '志强', gender: 'MALE' as const, birthday: new Date('1994-01-25'), city: '深圳', bio: '创业中，寻找志同道合的人', height: 180, education: 'MASTER' as const, verificationLevel: 'L4' as const },
    { phone: '13800000006', nickname: '雨薇', gender: 'FEMALE' as const, birthday: new Date('1998-07-30'), city: '广州', bio: '瑜伽爱好者，素食主义', height: 168, education: 'BACHELOR' as const, verificationLevel: 'L2' as const },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { phone: userData.phone },
      update: {},
      create: userData,
    });

    // Add tags
    const tags = ['旅行', '美食', '读书', '运动', '音乐'].slice(0, 3 + Math.floor(Math.random() * 3));
    for (const tag of tags) {
      await prisma.userTag.create({ data: { userId: user.id, tag } }).catch(() => {});
    }

    // Add preferences
    await prisma.preference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        ageMin: 22,
        ageMax: 35,
        cities: [userData.city],
        heightMin: 155,
        heightMax: 190,
        acceptLongDistance: false,
      },
    });

    console.log(`  Created user: ${userData.nickname} (${userData.phone})`);
  }

  // Create a sample activity
  await prisma.activity.create({
    data: {
      title: '周末露营交友',
      description: '一起去郊外露营，认识新朋友',
      coverUrl: 'https://picsum.photos/seed/camp/800/600',
      category: '户外',
      location: '北京·怀柔',
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxMale: 10,
      maxFemale: 10,
      fee: 199,
    },
  });

  console.log('Seed completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
