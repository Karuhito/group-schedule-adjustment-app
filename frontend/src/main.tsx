import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// アプリケーションのエントリポイント（後続タスクで App コンポーネントを追加予定）
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div>GroupSync</div>
  </StrictMode>,
)
