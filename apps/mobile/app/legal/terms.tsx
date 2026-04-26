import { Text, View } from 'react-native';
import { LegalParagraph, LegalSection, LegalShell } from '../../components/LegalShell';

export default function TermsOfService() {
  return (
    <LegalShell
      title="用户服务协议"
      lastUpdated="2026·04·01"
      intro="使用本平台服务前，请仔细阅读本协议。一旦注册或登录即代表你已理解并接受全部条款。"
      footer={
        <View>
          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
            本协议最后更新于 2026·04·01
          </Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
            如有疑问 · support@example.com
          </Text>
        </View>
      }
    >
      <LegalSection index={1} title="服务说明">
        <LegalParagraph>
          欢迎使用本婚恋交友平台（以下简称"本平台"）。本平台是一款基于人工智能推荐的严肃婚恋社交应用，致力于为适龄单身用户提供安全、真实、高效的婚恋交友服务。
        </LegalParagraph>
        <LegalParagraph>
          本平台提供的服务包括但不限于：用户资料展示、智能匹配推荐、即时通讯、视频交友、线下活动组织、身份认证等。部分高级服务可能需要付费订阅会员后方可使用。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={2} title="用户注册与账号">
        <LegalParagraph>
          1. 你必须年满 18 周岁且具有完全民事行为能力，方可注册使用本平台。未满 18 周岁的未成年人不得注册和使用本平台服务。
        </LegalParagraph>
        <LegalParagraph>
          2. 注册时你须提供真实、准确、完整的个人信息，包括但不限于手机号码、性别、年龄、所在城市等。如因提供虚假信息导致的任何后果，由你自行承担。
        </LegalParagraph>
        <LegalParagraph>
          3. 每位用户仅限注册一个账号。你应妥善保管账号和密码，因保管不当导致的损失由你自行承担。如发现账号被盗用或存在安全漏洞，请立即联系客服。
        </LegalParagraph>
        <LegalParagraph>
          4. 你的账号不得转让、出租、借用给他人使用。本平台有权对违规账号进行冻结或注销处理。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={3} title="用户行为规范">
        <LegalParagraph>
          你在使用本平台服务时，应遵守中华人民共和国相关法律法规，不得利用本平台从事以下行为：
        </LegalParagraph>
        <LegalParagraph>
          1. 发布虚假个人信息，包括但不限于使用他人照片、虚报年龄、学历、收入、婚姻状况等；
        </LegalParagraph>
        <LegalParagraph>
          2. 对其他用户进行骚扰、辱骂、威胁、恐吓或发送色情、暴力、违法内容；
        </LegalParagraph>
        <LegalParagraph>
          3. 利用本平台进行诈骗、传销、非法集资或其他违法犯罪活动；
        </LegalParagraph>
        <LegalParagraph>
          4. 发布商业广告、推广信息或引导用户至其他平台交易；
        </LegalParagraph>
        <LegalParagraph>
          5. 使用自动化工具（如爬虫、外挂）访问本平台或干扰本平台正常运行；
        </LegalParagraph>
        <LegalParagraph>
          6. 收集、存储或传播其他用户的个人信息；
        </LegalParagraph>
        <LegalParagraph>
          7. 其他违反法律法规、社会公德或本平台规则的行为。
        </LegalParagraph>
        <LegalParagraph>
          本平台有权对违规内容进行删除，并视情节轻重对账号采取警告、限制功能、暂停服务或永久封禁等措施。涉嫌违法犯罪的，本平台将配合相关部门依法处理。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={4} title="隐私与数据保护">
        <LegalParagraph>
          本平台高度重视用户隐私保护。我们将按照《隐私保护政策》的规定收集、使用、存储和共享你的个人信息。你注册和使用本平台即表示同意我们按照隐私政策处理你的个人信息。
        </LegalParagraph>
        <LegalParagraph>
          你有权查看、更正、删除你的个人信息，也有权撤回对个人信息处理的同意。具体操作方式请参阅《隐私保护政策》或联系客服。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={5} title="知识产权">
        <LegalParagraph>
          本平台的名称、标识、界面设计、功能架构、技术方案及相关内容均受中华人民共和国知识产权法律法规的保护，未经本平台书面许可，任何人不得复制、模仿、传播或以其他方式使用。
        </LegalParagraph>
        <LegalParagraph>
          你在本平台发布的原创内容（如个人介绍、照片等），其著作权归你所有，但你授予本平台在运营范围内使用该内容的非独占性许可，包括展示、推荐等用途。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={6} title="免责声明">
        <LegalParagraph>
          1. 本平台仅提供信息展示和社交沟通的技术平台服务，不对用户间的交往结果、婚恋关系承担任何保证或责任。
        </LegalParagraph>
        <LegalParagraph>
          2. 尽管本平台采取了多层次的身份认证机制，但无法完全保证所有用户信息的真实性和准确性。请你在交往过程中保持谨慎，注意保护自身人身和财产安全。
        </LegalParagraph>
        <LegalParagraph>
          3. 因不可抗力、网络故障、系统维护等原因导致服务暂时中断的，本平台不承担责任，但将尽快恢复服务。
        </LegalParagraph>
        <LegalParagraph>
          4. 对于用户间的纠纷，本平台可协助调解但不承担连带责任。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={7} title="协议修改">
        <LegalParagraph>
          本平台有权根据法律法规变化、业务发展需要对本协议进行修改。修改后的协议将在本平台上公布，重大变更将以推送通知或弹窗等方式提醒你。如你在协议修改后继续使用本平台服务，即表示你同意修改后的协议。如你不同意修改后的条款，应停止使用本平台服务。
        </LegalParagraph>
      </LegalSection>

      <LegalSection index={8} title="争议解决">
        <LegalParagraph>
          本协议的签订、履行、解释及争议解决均适用中华人民共和国法律（不包括港澳台地区法律）。因本协议引起的或与本协议有关的任何争议，双方应友好协商解决；协商不成的，任何一方可向本平台所在地有管辖权的人民法院提起诉讼。
        </LegalParagraph>
      </LegalSection>
    </LegalShell>
  );
}
