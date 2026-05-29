import React from 'react'
import { Routes, Route, useNavigate, BrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './components/HomePage'
import LabelSetup from './components/LabelSetup'
import FileUpload from './components/FileUpload'
import LabelEditor from './components/LabelEditor'

function AppContent() {
  const navigate = useNavigate()
  const [labelConfig, setLabelConfig] = React.useState(null)
  const [uploadedFile, setUploadedFile] = React.useState(null)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false)
  const [editorSettings, setEditorSettings] = React.useState({
    font: 'Heebo',
    fontSize: '12pt',
    verticalAlign: 'top',
    editorDoc: null,
    hasHeader: true,
  })

  return (
    <Layout>
      <Routes future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}>
        <Route path="/" element={
          <HomePage
            onSelectEnvelopes={() => {}}
            onSelectLabels={() => {}}
          />
        } />
        <Route path="/madbakot" element={
          <LabelSetup
            initialConfig={labelConfig}
            onCancel={() => navigate('/')}
            onSave={(config) => {
              setLabelConfig(config)
              navigate('/madbakot/upload')
            }}
            onImport={(settings) => setEditorSettings(settings)}
          />
        } />
        <Route path="/madbakot/upload" element={
          <FileUpload
            onFileUploaded={(fileInfo) => {
              setUploadedFile(fileInfo)
              navigate('/madbakot/editor')
            }}
            onCancel={() => navigate('/madbakot')}
          />
        } />
        <Route path="/madbakot/editor" element={
          <LabelEditor
            config={labelConfig}
            file={uploadedFile}
            onBack={() => navigate('/madbakot/upload')}
            onFileUpdate={setUploadedFile}
            onReupload={() => navigate('/madbakot/upload')}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            editorSettings={editorSettings}
            onEditorSettingsChange={setEditorSettings}
          />
        } />
      </Routes>

      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">הגדרות מדבקות</h3>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                סגור
              </button>
            </div>
            <div className="p-4">
              <LabelSetup
                initialConfig={labelConfig}
                onCancel={() => setIsSettingsModalOpen(false)}
                onSave={(config) => {
                  setLabelConfig(config)
                  setIsSettingsModalOpen(false)
                }}
                onImport={(settings) => setEditorSettings(settings)}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
