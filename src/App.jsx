import React from 'react'
import Layout from './components/Layout'
import HomePage from './components/HomePage'
import LabelSetup from './components/LabelSetup'
import FileUpload from './components/FileUpload'
import LabelEditor from './components/LabelEditor'

function App() {
  const [view, setView] = React.useState('home')
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
      {view === 'home' ? (
        <HomePage
          onSelectEnvelopes={() => {}}
          onSelectLabels={() => setView('label-setup')}
        />
      ) : null}

      {view === 'label-setup' ? (
        <LabelSetup
          initialConfig={labelConfig}
          onCancel={() => setView('home')}
          onSave={(config) => {
            setLabelConfig(config)
            setView('file-upload')
          }}
          onImport={(settings) => setEditorSettings(settings)}
        />
      ) : null}

      {view === 'file-upload' ? (
        <FileUpload
          onFileUploaded={(fileInfo) => {
            setUploadedFile(fileInfo)
            setView('label-editor')
          }}
          onCancel={() => setView('label-setup')}
        />
      ) : null}

      {view === 'label-editor' ? (
        <LabelEditor
          config={labelConfig}
          file={uploadedFile}
          onBack={() => setView('file-upload')}
          onFileUpdate={setUploadedFile}
          onReupload={() => setView('file-upload')}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          editorSettings={editorSettings}
          onEditorSettingsChange={setEditorSettings}
        />
      ) : null}

      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">הגדרות תוויות</h3>
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

export default App
