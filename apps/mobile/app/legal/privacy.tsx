import { Text, View } from 'react-native';
import { LegalParagraph, LegalSection, LegalShell } from '../../components/LegalShell';

export default function PrivacyPolicy() {
  return (
    <LegalShell
      title="隐私保护政策"
      lastUpdated="2026·04·01"
      intro="本平台深知个人信息对你的重要性，并恪守权责一致、目的明确、最少够用、确保安全等原则。"
      footer={
        <View>
          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
            本政策最后更新于 2026·04·01
          </Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
            依据《中华人民共和国个人信息保护法》制定
          </Text>
        </View>
      }
    >
      <LegalSection index={1} title="信息收集范围">
        <LegalParagraph>为向你提供婚恋交友服务，我们会收集以下类别的个人信息：</LegalParagraph>
        <LegalParagraph>
          1. 账号注册信息：手机号码（用于身份验证和账号安全），该信息为必要信息，不提供将无法完成注册。
        </LegalParagraph>
        <LegalParagraph>
          2. 个人资料信息：昵称、性别、出生日期、身高、体重、学历、职业、收入范围、所在城市、个人介绍、兴趣标签等。这些信息用于完善你的交友档案，提升匹配精准度。
        </LegalParagraph>
        <LegalParagraph>
          3. 照片与影像：你上传的个人照片、头像。照片将用于资料展示和身份认证。我们会对照片进行合规审核，确保不含违法违规内容。
        </LegalParagraph>
        <LegalParagraph>
          4. 位置信息：经你授权后，我们可能收集你的地理位置信息，用于基于位置的推荐和同城匹配功能。你可以随时在设备设置中关闭位置权限。
        </LegalParagraph>
        <LegalParagraph>
          5. 设备信息：设备型号、操作系统版本、设备标识符、网络类型、IP 地址等，用于保障账号安全和优化服务体验。
        </LegalParagraph>
        <LegalParagraph>
          6. 使用记录：浏览、点赞、匹配、聊天等交互行为数据，用于优化推荐算法和提升服务质量。
        </LegalParagraph>
        <LegalParagraph>
          7. 认证信息：如你选择进行身份认证，我们可能收集你的身份证信息、学历证明、工作证明等。认证信息仅用于核实身份，验证完成后原件将在规定期限内删除。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={2} title="信息使用目的">
        <LegalParagraph>我们收集的个人信息将用于以下目的：</LegalParagraph>
        <LegalParagraph>
          1. 账号管理：创建和管理你的用户账号，提供登录验证、密码找回等基础服务。
        </LegalParagraph>
        <LegalParagraph>
          2. 推荐匹配：基于你的个人资料、择偶偏好和行为数据，通过 AI 智能算法为你推荐合适的交友对象。
        </LegalParagraph>
        <LegalParagraph>
          3. 安全保障：识别和防范欺诈、骚扰等违规行为，保障平台生态安全和用户权益。包括实名认证、内容审核、风险预警等措施。
        </LegalParagraph>
        <LegalParagraph>4. 服务优化：分析用户使用习惯，改进产品功能和用户体验。</LegalParagraph>
        <LegalParagraph>5. 客户服务：处理你的咨询、投诉和建议，提供技术支持。</LegalParagraph>
        <LegalParagraph>6. 法律合规：履行法律法规规定的义务，配合相关部门依法调取信息。</LegalParagraph>
      </LegalSection>

      <LegalSection index={3} title="信息存储与保护">
        <LegalParagraph>
          1. 存储地点：你的个人信息将存储在中华人民共和国境内的服务器上。如因业务需要向境外传输，我们将严格遵循相关法律法规，并采取必要的安全措施。
        </LegalParagraph>
        <LegalParagraph>
          2. 存储期限：我们仅在实现服务目的所必需的期限内保存你的个人信息。账号注销后，我们将在合理期限内删除或匿名化处理你的个人信息，法律法规另有规定的除外。
        </LegalParagraph>
        <LegalParagraph>
          3. 安全措施：我们已通过等保二级认证，采用加密存储、访问控制、安全审计等技术手段保护你的个人信息。具体措施包括：数据传输使用 TLS/SSL 加密；敏感信息（如手机号、身份证号）采用 AES-256 加密存储；实施严格的内部数据访问权限管理；定期进行安全漏洞扫描和渗透测试。
        </LegalParagraph>
        <LegalParagraph>
          4. 安全事件响应：如不幸发生个人信息安全事件，我们将按照法律法规的要求，及时向你告知安全事件的基本情况和可能的影响、我们已采取或将要采取的处置措施、你可自主防范和降低风险的建议等。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={4} title="信息共享">
        <LegalParagraph>1. 我们承诺不会将你的个人信息出售给任何第三方。</LegalParagraph>
        <LegalParagraph>2. 在以下情形下，我们可能会与第三方共享你的部分信息：</LegalParagraph>
        <LegalParagraph>(1) 经你明确同意或授权的情况下；</LegalParagraph>
        <LegalParagraph>
          (2) 为完成身份认证，我们可能将相关信息提供给认证服务提供商（如公安身份核验接口），该过程仅传输必要字段且全程加密；
        </LegalParagraph>
        <LegalParagraph>
          (3) 为提供支付服务，我们可能将订单信息提供给支付渠道（如支付宝、微信支付）；
        </LegalParagraph>
        <LegalParagraph>(4) 根据法律法规的规定，或应政府部门、司法机关的合法要求；</LegalParagraph>
        <LegalParagraph>
          (5) 在涉及合并、收购、资产转让等交易时，如涉及个人信息转让，我们会要求新的持有方继续受本政策约束。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={5} title="用户权利">
        <LegalParagraph>根据《个人信息保护法》等法律法规，你对你的个人信息享有以下权利：</LegalParagraph>
        <LegalParagraph>1. 查看权：你可以在"个人资料"页面查看你提交的个人信息。</LegalParagraph>
        <LegalParagraph>2. 更正权：如发现个人信息有误，你可以随时修改和更新。</LegalParagraph>
        <LegalParagraph>
          3. 删除权：在以下情形下，你可以请求删除个人信息：处理目的已实现或无法实现；我们停止提供服务；保存期限已届满；你撤回同意；我们违反法律法规或协议约定处理个人信息。
        </LegalParagraph>
        <LegalParagraph>
          4. 撤回同意权：你可以通过关闭设备权限（如位置、相机）撤回对相关信息收集的同意。撤回同意不影响此前已进行的信息处理的效力。
        </LegalParagraph>
        <LegalParagraph>
          5. 注销权：你可以通过"设置 - 注销账号"功能申请注销账号。注销后我们将停止提供服务，并在合理期限内删除你的个人信息。
        </LegalParagraph>
        <LegalParagraph>
          6. 获取副本权：你有权获取你个人信息的副本，我们将在 15 个工作日内响应你的请求。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={6} title="Cookie 与类似技术">
        <LegalParagraph>
          我们可能使用 Cookie 和类似的本地存储技术（如设备标识符、本地缓存）来保障服务安全运行、改善用户体验。这些技术不会用于本政策所述目的之外的用途。你可以通过设备设置清除本地存储数据，但这可能会影响部分功能的正常使用。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={7} title="未成年人保护">
        <LegalParagraph>
          本平台仅面向年满 18 周岁的成年用户。我们不会故意收集未满 18 周岁未成年人的个人信息。如果我们发现在未获得可证实的监护人同意的情况下收集了未成年人的个人信息，将尽快删除相关信息。如你是未成年人的监护人，发现你的被监护人在本平台注册了账号，请及时联系我们，我们将协助处理。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={8} title="政策更新">
        <LegalParagraph>
          我们可能适时修订本政策。当政策发生重大变更时，我们将以推送通知、弹窗提醒等方式通知你。重大变更包括但不限于：个人信息处理目的发生变化；收集的个人信息类型发生变化；个人信息的共享、转让或公开披露的对象发生变化；你参与个人信息处理的权利及行使方式发生变化。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={9} title="联系我们">
        <LegalParagraph>
          如果你对本隐私保护政策有任何疑问、意见或建议，或需要行使你的个人信息权利，你可以通过以下方式联系我们：
        </LegalParagraph>
        <LegalParagraph>客服邮箱：privacy@example.com</LegalParagraph>
        <LegalParagraph>客服电话：400-000-0000（工作日 9:00-18:00）</LegalParagraph>
        <LegalParagraph>
          我们将在收到你的请求后 15 个工作日内予以回复。如你对我们的回复不满意，可以向有管辖权的个人信息保护部门进行投诉。
        </LegalParagraph>
      </LegalSection>
    </LegalShell>
  );
}
