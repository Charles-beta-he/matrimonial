import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SectionTitle({ children }: { children: string }) {
  return <Text className="text-base font-bold text-gray-900 mb-2">{children}</Text>;
}

function Paragraph({ children }: { children: string }) {
  return <Text className="text-sm text-gray-700 leading-5 mb-3">{children}</Text>;
}

export default function TermsOfService() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">用户服务协议</Text>
        <Text className="text-xs text-gray-400 mb-6 text-center">更新日期：2026年4月1日</Text>

        {/* 服务说明 */}
        <View className="mb-6">
          <SectionTitle>一、服务说明</SectionTitle>
          <Paragraph>
            欢迎使用本婚恋交友平台（以下简称"本平台"）。本平台是一款基于人工智能推荐的严肃婚恋社交应用，致力于为适龄单身用户提供安全、真实、高效的婚恋交友服务。在注册和使用本平台前，请您仔细阅读本协议。一旦您注册、登录或以其他方式使用本平台服务，即表示您已阅读、理解并同意接受本协议的全部条款。
          </Paragraph>
          <Paragraph>
            本平台提供的服务包括但不限于：用户资料展示、智能匹配推荐、即时通讯、视频交友、线下活动组织、身份认证等。部分高级服务可能需要付费订阅会员后方可使用。
          </Paragraph>
        </View>

        {/* 用户注册与账号 */}
        <View className="mb-6">
          <SectionTitle>二、用户注册与账号</SectionTitle>
          <Paragraph>
            1. 您必须年满18周岁且具有完全民事行为能力，方可注册使用本平台。未满18周岁的未成年人不得注册和使用本平台服务。
          </Paragraph>
          <Paragraph>
            2. 注册时您须提供真实、准确、完整的个人信息，包括但不限于手机号码、性别、年龄、所在城市等。如因提供虚假信息导致的任何后果，由您自行承担。
          </Paragraph>
          <Paragraph>
            3. 每位用户仅限注册一个账号。您应妥善保管账号和密码，因保管不当导致的损失由您自行承担。如发现账号被盗用或存在安全漏洞，请立即联系客服。
          </Paragraph>
          <Paragraph>
            4. 您的账号不得转让、出租、借用给他人使用。本平台有权对违规账号进行冻结或注销处理。
          </Paragraph>
        </View>

        {/* 用户行为规范 */}
        <View className="mb-6">
          <SectionTitle>三、用户行为规范</SectionTitle>
          <Paragraph>
            您在使用本平台服务时，应遵守中华人民共和国相关法律法规，不得利用本平台从事以下行为：
          </Paragraph>
          <Paragraph>
            1. 发布虚假个人信息，包括但不限于使用他人照片、虚报年龄、学历、收入、婚姻状况等；
          </Paragraph>
          <Paragraph>
            2. 对其他用户进行骚扰、辱骂、威胁、恐吓或发送色情、暴力、违法内容；
          </Paragraph>
          <Paragraph>
            3. 利用本平台进行诈骗、传销、非法集资或其他违法犯罪活动；
          </Paragraph>
          <Paragraph>
            4. 发布商业广告、推广信息或引导用户至其他平台交易；
          </Paragraph>
          <Paragraph>
            5. 使用自动化工具（如爬虫、外挂）访问本平台或干扰本平台正常运行；
          </Paragraph>
          <Paragraph>
            6. 收集、存储或传播其他用户的个人信息；
          </Paragraph>
          <Paragraph>
            7. 其他违反法律法规、社会公德或本平台规则的行为。
          </Paragraph>
          <Paragraph>
            本平台有权对违规内容进行删除，并视情节轻重对账号采取警告、限制功能、暂停服务或永久封禁等措施。涉嫌违法犯罪的，本平台将配合相关部门依法处理。
          </Paragraph>
        </View>

        {/* 隐私与数据保护 */}
        <View className="mb-6">
          <SectionTitle>四、隐私与数据保护</SectionTitle>
          <Paragraph>
            本平台高度重视用户隐私保护。我们将按照《隐私保护政策》的规定收集、使用、存储和共享您的个人信息。您注册和使用本平台即表示同意我们按照隐私政策处理您的个人信息。
          </Paragraph>
          <Paragraph>
            您有权查看、更正、删除您的个人信息，也有权撤回对个人信息处理的同意。具体操作方式请参阅《隐私保护政策》或联系客服。
          </Paragraph>
        </View>

        {/* 知识产权 */}
        <View className="mb-6">
          <SectionTitle>五、知识产权</SectionTitle>
          <Paragraph>
            本平台的名称、标识、界面设计、功能架构、技术方案及相关内容均受中华人民共和国知识产权法律法规的保护，未经本平台书面许可，任何人不得复制、模仿、传播或以其他方式使用。
          </Paragraph>
          <Paragraph>
            您在本平台发布的原创内容（如个人介绍、照片等），其著作权归您所有，但您授予本平台在运营范围内使用该内容的非独占性许可，包括展示、推荐等用途。
          </Paragraph>
        </View>

        {/* 免责声明 */}
        <View className="mb-6">
          <SectionTitle>六、免责声明</SectionTitle>
          <Paragraph>
            1. 本平台仅提供信息展示和社交沟通的技术平台服务，不对用户间的交往结果、婚恋关系承担任何保证或责任。
          </Paragraph>
          <Paragraph>
            2. 尽管本平台采取了多层次的身份认证机制，但无法完全保证所有用户信息的真实性和准确性。请您在交往过程中保持谨慎，注意保护自身人身和财产安全。
          </Paragraph>
          <Paragraph>
            3. 因不可抗力、网络故障、系统维护等原因导致服务暂时中断的，本平台不承担责任，但将尽快恢复服务。
          </Paragraph>
          <Paragraph>
            4. 对于用户间的纠纷，本平台可协助调解但不承担连带责任。
          </Paragraph>
        </View>

        {/* 协议修改 */}
        <View className="mb-6">
          <SectionTitle>七、协议修改</SectionTitle>
          <Paragraph>
            本平台有权根据法律法规变化、业务发展需要对本协议进行修改。修改后的协议将在本平台上公布，重大变更将以推送通知或弹窗等方式提醒您。如您在协议修改后继续使用本平台服务，即表示您同意修改后的协议。如您不同意修改后的条款，应停止使用本平台服务。
          </Paragraph>
        </View>

        {/* 争议解决 */}
        <View className="mb-6">
          <SectionTitle>八、争议解决</SectionTitle>
          <Paragraph>
            本协议的签订、履行、解释及争议解决均适用中华人民共和国法律（不包括港澳台地区法律）。因本协议引起的或与本协议有关的任何争议，双方应友好协商解决；协商不成的，任何一方可向本平台所在地有管辖权的人民法院提起诉讼。
          </Paragraph>
        </View>

        <View className="border-t border-gray-100 pt-4 mb-8">
          <Text className="text-xs text-gray-400 text-center">
            本协议最后更新于 2026年4月1日
          </Text>
          <Text className="text-xs text-gray-400 text-center mt-1">
            如有疑问，请联系客服：support@example.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
