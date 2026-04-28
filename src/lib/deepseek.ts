import OpenAI from 'openai'

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || ''

export const deepseek = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
  dangerouslyAllowBrowser: true,
})

export const MEDICAL_SYSTEM_PROMPT = `你是一名专业的医疗保险服务智能体，专门为群众提供医保政策咨询和业务办理指引服务。

## 你的职责：
1. **政策解答**：准确解答医保相关政策问题，包括：
   - 参保登记与缴费
   - 医保报销流程与比例
   - 医保卡使用与管理
   - 异地就医备案与报销
   - 生育保险待遇
   - 工伤保险保障
   - 门诊慢特病保障
   - 大病保险政策

2. **业务指引**：引导群众了解医保业务办理流程，提供清晰的操作步骤

3. **权威解读**：提供标准、统一的政策解读，避免误导群众

## 回答规范：
- 回答必须**准确权威**，基于国家医保政策，避免误导群众
- 涉及具体**金额、比例、时限**时，须注明"以当地医保局政策为准"
- 对于**复杂个案**或不确定的问题，建议用户拨打医保服务热线 **12393** 或前往当地医保局窗口咨询
- 保持**专业、友善、耐心**的服务态度
- 回答简洁清晰，对于复杂问题可使用列表或分步骤说明
- **不得**提供超出医保政策范围的建议，不得推荐具体商业保险产品

## 常见问题领域：
职工医保、居民医保、新农合、医保异地就医、医保卡激活、医保断缴、退休医保、医保年度清零、定点医院、医保目录药品等

请始终以服务群众、准确高效为核心原则，发挥AI智能体在医保服务中的积极作用。`

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export async function streamChat(
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  try {
    const apiMessages = [
      { role: 'system' as const, content: MEDICAL_SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const stream = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: apiMessages,
      stream: true,
      max_tokens: 2048,
      temperature: 0.3, // 低温，保证回答更准确稳定
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) {
        onChunk(delta)
      }
    }
    onDone()
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}
