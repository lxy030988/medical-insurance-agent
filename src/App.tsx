import { useState, useRef, useEffect, useCallback } from 'react'
import { streamChat, type Message } from './lib/deepseek'
import './index.css'

const QUICK_QUESTIONS = [
  { icon: '🏥', text: '职工医保和居民医保有什么区别？' },
  { icon: '💊', text: '医保报销比例是多少？如何计算？' },
  { icon: '🌍', text: '异地就医怎么备案？能报销吗？' },
  { icon: '👶', text: '生育保险可以享受哪些待遇？' },
  { icon: '💳', text: '医保卡忘记密码怎么办？' },
  { icon: '📋', text: '断缴医保后怎么补缴？有影响吗？' },
  { icon: '🏦', text: '退休后医保如何缴纳？免费吗？' },
  { icon: '🔬', text: '门诊慢特病怎么申请认定？' }
]

const TOPICS = [
  { icon: '📑', label: '参保与缴费' },
  { icon: '💰', label: '医保报销' },
  { icon: '🌐', label: '异地就医' },
  { icon: '👶', label: '生育保险' },
  { icon: '⚕️', label: '工伤保险' },
  { icon: '💊', label: '药品目录' },
  { icon: '🏥', label: '定点医院' },
  { icon: '📊', label: '大病保险' }
]

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

// Simple markdown-ish renderer
function renderContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    return (
      <span key={i}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>
          }
          return <span key={j}>{part}</span>
        })}
        {i < lines.length - 1 && <br />}
      </span>
    )
  })
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTopicIdx, setActiveTopicIdx] = useState<number | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('medical-agent-theme') as 'dark' | 'light') || 'dark'
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('medical-agent-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date()
      }

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMsg])
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      setIsLoading(true)

      // Add empty assistant message (streaming)
      setMessages(prev => [...prev, assistantMsg])

      await streamChat(
        [...messages, userMsg],
        chunk => {
          setMessages(prev => prev.map(m => (m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m)))
        },
        () => {
          setIsLoading(false)
        },
        err => {
          setIsLoading(false)
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id
                ? { ...m, content: `⚠️ 请求失败：${err.message}。请检查 API Key 配置或网络连接。` }
                : m
            )
          )
        }
      )
    },
    [messages, isLoading]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setActiveTopicIdx(null)
  }

  const handleTopicClick = (idx: number, label: string) => {
    setActiveTopicIdx(idx)
    sendMessage(`请介绍一下${label}相关的医保政策`)
  }

  const showWelcome = messages.length === 0

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🏥</div>
            <div className="logo-text">
              <div className="logo-title">医保服务智能体</div>
              <div className="logo-subtitle">Medical Insurance AI</div>
            </div>
          </div>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            新建对话
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">常见业务分类</div>
          <div className="topic-list">
            {TOPICS.map((topic, idx) => (
              <div
                key={idx}
                className={`topic-item ${activeTopicIdx === idx ? 'active' : ''}`}
                onClick={() => handleTopicClick(idx, topic.label)}
              >
                <span className="topic-icon">{topic.icon}</span>
                {topic.label}
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="hotline-card">
            <div className="hotline-label">📞 医保服务热线</div>
            <div className="hotline-number">12393</div>
            <div className="hotline-desc">全国统一，24小时服务</div>
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="chat-area">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <div className="agent-avatar">🤖</div>
            <div className="agent-info">
              <div className="agent-name">医保政策助手</div>
              <div className="agent-status">
                <div className="status-dot" />
                在线服务中
              </div>
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title="切换主题">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>

        {/* Messages or Welcome */}
        {showWelcome ? (
          <div className="welcome-screen">
            <div className="welcome-hero">
              <div className="welcome-icon">🏥</div>
              <h1 className="welcome-title">
                您好，我是<span>医保服务智能体</span>
              </h1>
              <p className="welcome-desc">
                我可以为您解答医疗保险政策问题，提供参保、报销、异地就医等业务办理指引。
                <br />
                请放心咨询，我会提供准确权威的政策解读。
              </p>
            </div>

            <div className="quick-questions">
              <div className="quick-questions-title">您可能想了解</div>
              <div className="quick-questions-grid">
                {QUICK_QUESTIONS.map((qq, idx) => (
                  <button key={idx} className="quick-question-card" onClick={() => sendMessage(qq.text)}>
                    <span className="qq-icon">{qq.icon}</span>
                    <span className="qq-text">{qq.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-avatar">{msg.role === 'assistant' ? '🤖' : '👤'}</div>
                <div className="message-content">
                  {msg.role === 'assistant' && isLoading && idx === messages.length - 1 && msg.content === '' ? (
                    <div className="typing-indicator">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  ) : (
                    <div className="message-bubble">{renderContent(msg.content)}</div>
                  )}
                  <div className="message-time">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="请输入您的医保相关问题... (Shift+Enter 换行)"
              value={input}
              onChange={e => {
                setInput(e.target.value)
                autoResize()
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              title="发送"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <div className="input-hint">
            本智能体仅供政策咨询参考，具体业务以当地医保局规定为准 · 紧急情况请拨打 <strong>12393</strong>
          </div>
        </div>
      </main>
    </div>
  )
}
