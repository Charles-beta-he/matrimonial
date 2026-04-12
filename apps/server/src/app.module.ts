import { Module } from '@nestjs/common';
import { ActivityModule } from './modules/activity/activity.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CircleModule } from './modules/circle/circle.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { MatchingModule } from './modules/matching/matching.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ReportModule } from './modules/report/report.module';
import { UserModule } from './modules/user/user.module';
import { UploadModule } from './modules/upload/upload.module';
import { VerificationModule } from './modules/verification/verification.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    VerificationModule,
    MatchingModule,
    ConversationModule,
    PaymentModule,
    ActivityModule,
    CircleModule,
    ReportModule,
    NotificationModule,
    AdminModule,
    UploadModule,
  ],
})
export class AppModule {}
