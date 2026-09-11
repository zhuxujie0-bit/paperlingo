import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

// 防白屏护栏：任何渲染崩溃都显示可读错误，而不是一片白
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, maxWidth: 640, margin: '60px auto', fontFamily: 'sans-serif', lineHeight: 1.8 }}>
          <h2 style={{ color: '#d93766' }}>页面出错了</h2>
          <p>请把下面这段错误文字截图或抄给开发者：</p>
          <pre style={{ background: '#fff5f0', border: '1px solid #f0b9cc', borderRadius: 12, padding: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 13 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: '10px 24px', borderRadius: 12, border: 'none', background: '#d93766', color: '#fff', fontSize: 15 }}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
