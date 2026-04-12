import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SectionTitle({ children }: { children: string }) {
  return <Text className="text-base font-bold text-gray-900 mb-2">{children}</Text>;
}

function Paragraph({ children }: { children: string }) {
  return <Text className="text-sm text-gray-700 leading-5 mb-3">{children}</Text>;
}

export default function PrivacyPolicy() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">隐私保护政策</Text>
        <Text className="text-xs text-gray-400 mb-6 text-center">更新日期：2026年4月1日</Text>

        <Paragraph>
          本平台深知个人信息对您的重要性，并会尽全力保护您的个人信息安全。我们致力于维持您对我们的信任，恪守以下原则保护您的个人信息：权责一致原则、目的明确原则、选择同意原则、最少够用原则、确保安全原则、主体参与原则、公开透明原则。本隐私保护政策遵守《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》及相关法律法规的要求。
        </Paragraph>

        {/* 信息收集范围 */}
        <View className="mb-6">
          <SectionTitle>一、信息收集范围</SectionTitle>
          <Paragraph>
            为向您提供婚恋交友服务，我们会收集以下类别的个人信息：
          </Paragraph>
          <Paragraph>
            1. 账号注册信息：手机号码（用于身份验证和账号安全），该信息为必要信息，不提供将无法完成注册。
          </Paragraph>
          <Paragraph>
            2. 个人资料信息：昵称、性别、出生日期、身高、体重、学历、职业、收入范围、所在城市、个人介绍、兴趣标签等。这些信息用于完善您的交友档案，提升匹配精准度。
          </Paragraph>
          <Paragraph>
            3. 照片与影像：您上传的个人照片、头像。照片将用于资料展示和身份认证。我们会对照片进行合规审核，确保不含违法违规内容。
          </Paragraph>
          <Paragraph>
            4. 位置信息：经您授权后，我们可能收集您的地理位置信息，用于基于位置的推荐和同城匹配功能。您可以随时在设备设置中关闭位置权限。
          </Paragraph>
          <Paragraph>
            5. 设备信息：设备型号、操作系统版本、设备标识符、网络类型、IP地址等，用于保障账号安全和优化服务体验。
          </Paragraph>
          <Paragraph>
            6. 使用记录：浏览、点赞、匹配、聊天等交互行为数据，用于优化推荐算法和提升服务质量。
          </Paragraph>
          <Paragraph>
            7. 认证信息：如您选择进行身份认证，我们可能收集您的身份证信息、学历证明、工作证明等。认证信息仅用于核实身份，验证完成后原件将在规定期限内删除。
          </Paragraph>
        </View>

        {/* 信息使用目的 */}
        <View className="mb-6">
          <SectionTitle>二、信息使用目的</SectionTitle>
          <Paragraph>
            我们收集的个人信息将用于以下目的：
          </Paragraph>
          <Paragraph>
            1. 账号管理：创建和管理您的用户账号，提供登录验证、密码找回等基础服务。
          </Paragraph>
          <Paragraph>
            2. 推荐匹配：基于您的个人资料、择偶偏好和行为数据，通过AI智能算法为您推荐合适的交友对象。
          </Paragraph>
          <Paragraph>
            3. 安全保障：识别和防范欺诈、骚扰等违规行为，保障平台生态安全和用户权益。包括实名认证、内容审核、风险预警等措施。
          </Paragraph>
          <Paragraph>
            4. 服务优化：分析用户使用习惯，改进产品功能和用户体验。
          </Paragraph>
          <Paragraph>
            5. 客户服务：处理您的咨询、投诉和建议，提供技术支持。
          </Paragraph>
          <Paragraph>
            6. 法律合规：履行法律法规规定的义务，配合相关部门依法调取信息。
          </Paragraph>
        </View>

        {/* 信息存储与保护 */}
        <View className="mb-6">
          <SectionTitle>三、信息存储与保护</SectionTitle>
          <Paragraph>
            1. 存储地点：您的个人信息将存储在中华人民共和国境内的服务器上。如因业务需要向境外传输，我们将严格遵循相关法律法规，并采取必要的安全措施。
          </Paragraph>
          <Paragraph>
            2. 存储期限：我们仅在实现服务目的所必需的期限内保存您的个人信息。账号注销后，我们将在合理期限内删除或匿名化处理您的个人信息，法律法规另有规定的除外。
          </Paragraph>
          <Paragraph>
            3. 安全措施：我们已通过等保二级认证，采用加密存储、访问控制、安全审计等技术手段保护您的个人信息。具体措施包括：数据传输使用TLS/SSL加密；敏感信息（如手机号、身份证号）采用AES-256加密存储；实施严格的内部数据访问权限管理；定期进行安全漏洞扫描和渗透测试。
          </Paragraph>
          <Paragraph>
            4. 安全事件响应：如不幸发生个人信息安全事件，我们将按照法律法规的要求，及时向您告知安全事件的基本情况和可能的影响、我们已采取或将要采取的处置措施、您可自主防范和降低风险的建议等。
          </Paragraph>
        </View>

        {/* 信息共享 */}
        <View className="mb-6">
          <SectionTitle>四、信息共享</SectionTitle>
          <Paragraph>
            1. 我们承诺不会将您的个人信息出售给任何第三方。
          </Paragraph>
          <Paragraph>
            2. 在以下情形下，我们可能会与第三方共享您的部分信息：
          </Paragraph>
          <Paragraph>
            (1) 经您明确同意或授权的情况下；
          </Paragraph>
          <Paragraph>
            (2) 为完成身份认证，我们可能将相关信息提供给认证服务提供商（如公安身份核验接口），该过程仅传输必要字段且全程加密；
          </Paragraph>
          <Paragraph>
            (3) 为提供支付服务，我们可能将订单信息提供给支付渠道（如支付宝、微信支付）；
          </Paragraph>
          <Paragraph>
            (4) 根据法律法规的规定，或应政府部门、司法机关的合法要求；
          </Paragraph>
          <Paragraph>
            (5) 在涉及合并、收购、资产转让等交易时，如涉及个人信息转让，我们会要求新的持有方继续受本政策约束。
          </Paragraph>
        </View>

        {/* 用户权利 */}
        <View className="mb-6">
          <SectionTitle>五、用户权利</SectionTitle>
          <Paragraph>
            根据《个人信息保护法》等法律法规，您对您的个人信息享有以下权利：
          </Paragraph>
          <Paragraph>
            1. 查看权：您可以在"个人资料"页面查看您提交的个人信息。
          </Paragraph>
          <Paragraph>
            2. 更正权：如发现个人信息有误，您可以随时修改和更新。
          </Paragraph>
          <Paragraph>
            3. 删除权：在以下情形下，您可以请求删除个人信息：处理目的已实现或无法实现；我们停止提供服务；保存期限已届满；您撤回同意；我们违反法律法规或协议约定处理个人信息。
          </Paragraph>
          <Paragraph>
            4. 撤回同意权：您可以通过关闭设备权限（如位置、相机）撤回对相关信息收集的同意。撤回同意不影响此前已进行的信息处理的效力。
          </Paragraph>
          <Paragraph>
            5. 注销权：您可以通过"设置 - 注销账号"功能申请注销账号。注销后我们将停止提供服务，并在合理期限内删除您的个人信息。
          </Paragraph>
          <Paragraph>
            6. 获取副本权：您有权获取您个人信息的副本，我们将在15个工作日内响应您的请求。
          </Paragraph>
        </View>

        {/* Cookie 与类似技术 */}
        <View className="mb-6">
          <SectionTitle>六、Cookie 与类似技术</SectionTitle>
          <Paragraph>
            我们可能使用Cookie和类似的本地存储技术（如设备标识符、本地缓存）来保障服务安全运行、改善用户体验。这些技术不会用于本政策所述目的之外的用途。您可以通过设备设置清除本地存储数据，但这可能会影响部分功能的正常使用。
          </Paragraph>
        </View>

        {/* 未成年人保护 */}
        <View className="mb-6">
          <SectionTitle>七、未成年人保护</SectionTitle>
          <Paragraph>
            本平台仅面向年满18周岁的成年用户。我们不会故意收集未满18周岁未成年人的个人信息。如果我们发现在未获得可证实的监护人同意的情况下收集了未成年人的个人信息，将尽快删除相关信息。如您是未成年人的监护人，发现您的被监护人在本平台注册了账号，请及时联系我们，我们将协助处理。
          </Paragraph>
        </View>

        {/* 政策更新 */}
        <View className="mb-6">
          <SectionTitle>八、政策更新</SectionTitle>
          <Paragraph>
            我们可能适时修订本政策。当政策发生重大变更时，我们将以推送通知、弹窗提醒等方式通知您。重大变更包括但不限于：个人信息处理目的发生变化；收集的个人信息类型发生变化；个人信息的共享、转让或公开披露的对象发生变化；您参与个人信息处理的权利及行使方式发生变化。
          </Paragraph>
        </View>

        {/* 联系我们 */}
        <View className="mb-6">
          <SectionTitle>九、联系我们</SectionTitle>
          <Paragraph>
            如果您对本隐私保护政策有任何疑问、意见或建议，或需要行使您的个人信息权利，您可以通过以下方式联系我们：
          </Paragraph>
          <Paragraph>
            客服邮箱：privacy@example.com
          </Paragraph>
          <Paragraph>
            客服电话：400-000-0000（工作日 9:00-18:00）
          </Paragraph>
          <Paragraph>
            我们将在收到您的请求后15个工作日内予以回复。如您对我们的回复不满意，可以向有管辖权的个人信息保护部门进行投诉。
          </Paragraph>
        </View>

        <View className="border-t border-gray-100 pt-4 mb-8">
          <Text className="text-xs text-gray-400 text-center">
            本政策最后更新于 2026年4月1日
          </Text>
          <Text className="text-xs text-gray-400 text-center mt-1">
            本政策依据《中华人民共和国个人信息保护法》制定
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
