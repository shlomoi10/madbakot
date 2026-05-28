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
        <LabelEditor config={labelConfig} file={uploadedFile} onBack={() => setView('file-upload')} />
      ) : null}
    </Layout>
  )
}

export default App
