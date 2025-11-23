import { useState } from 'react'
import { Layout } from './Layout'
import { ProvidersPage } from './pages/Providers'
import { RulesPage } from './pages/Rules'
import { SettingsPage } from './pages/Settings'
import { HomePage } from './pages/Home'
import { LogsPage } from './pages/Logs'

function App() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && <HomePage />} {/* 新增 */}
      {activeTab === 'providers' && <ProvidersPage />}
      {activeTab === 'rules' && <RulesPage />}
      {activeTab === 'settings' && <SettingsPage />}
      {activeTab === 'logs' && <LogsPage />}
    </Layout>
  )
}

export default App
