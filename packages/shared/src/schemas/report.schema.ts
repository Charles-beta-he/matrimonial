import { z } from 'zod';

export const createReportSchema = z.object({
  reportedId: z.string().min(1, '被举报用户ID不能为空'),
  reason: z.enum(
    ['FAKE_PROFILE', 'HARASSMENT', 'SCAM', 'INAPPROPRIATE_CONTENT', 'OTHER'],
    { required_error: '请选择举报原因' },
  ),
  description: z.string().min(10, '描述至少10个字符').max(1000, '描述最多1000个字符'),
  evidence: z.array(z.string().url('请提供有效的证据链接')).max(5, '最多上传5个证据').optional(),
});
