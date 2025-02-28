import { useState, useRef, useEffect } from 'react'
import { IoCamera, IoImagesOutline } from 'react-icons/io5'
import './App.css'
import logo from './assets/logo.png'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

if (!BACKEND_URL) {
  throw new Error('VITE_BACKEND_URL is not set in environment variables')
}

interface AnalysisResult {
  category: string;
  instruction: string;
}

function parseAnalysis(markdownText: string): AnalysisResult[] {
  if (!markdownText) return [];
  
  const lines = markdownText.split('\n');
  const results: AnalysisResult[] = [];
  let currentCategory = '';
  
  lines.forEach(line => {
    if (line.startsWith('## ')) {
      currentCategory = line.replace('## ', '');
    } else if (line.startsWith('• ')) {
      const instruction = line.replace('• ', '').replace(/[\[\]]/g, '');
      if (currentCategory && instruction) {
        results.push({ category: currentCategory, instruction });
      }
    }
  });
  
  return results;
}

function App() {
  const [analysis, setAnalysis] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [error, setError] = useState<string>('')
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMobile(/mobile|android|ios|iphone|ipad|ipod|windows phone/i.test(navigator.userAgent.toLowerCase()))
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)

    setLoading(true)
    setError('')
    setShowSuccess(false)
    setShowError(false)
    setAnalysis('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${BACKEND_URL}/analyze-label`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Server error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.valid) {
        setLoading(false)
        setShowError(true)
        setTimeout(() => {
          setShowError(false)
          setAnalysis(`## Error\n\n${data.message}`)
        }, 1500)
        return
      }

      setLoading(false)
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setAnalysis(data.analysis)
      }, 1000)

    } catch (err) {
      console.error('Error details:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing the image')
      setLoading(false)
    }
  }

  const renderAnalysisTable = (analysisText: string) => {
    if (analysisText.startsWith('## Error')) {
      return (
        <div className="error-message">
          {analysisText.replace('## Error\n\n', '')}
        </div>
      );
    }

    const results = parseAnalysis(analysisText);
    
    return (
      <table className="analysis-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Instruction</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={index}>
              <td>{result.category}</td>
              <td>{result.instruction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="app-container">
      <img src={logo} alt="AI Laundry Advisor Logo" className="app-logo" />
      <h1>AI Laundry Advisor <sup className="beta-tag">Beta</sup></h1>
      <p className="app-description">
        AI-powered laundry care decoder at your fingertips.
      </p>
      
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        
        {isMobile && (
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            ref={cameraInputRef}
            style={{ display: 'none' }}
            capture="environment"
          />
        )}
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          title="Upload from gallery"
        >
          <IoImagesOutline size={24} />
        </button>
        
        {isMobile && (
          <button 
            onClick={() => cameraInputRef.current?.click()}
            title="Take photo"
          >
            <IoCamera size={24} />
          </button>
        )}
      </div>
      
      {error && !imagePreview && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <br />
          <small>Please make sure the backend server is started with the host flag and VITE_BACKEND_URL is set properly in frontend/.env.local.</small>
        </div>
      )}
      
      {imagePreview && (
        <div className="image-preview">
          <img 
            src={imagePreview} 
            alt="Laundry care label" 
            className={analysis || loading || showSuccess || showError ? 'blurred' : ''}
          />
          {(loading || showSuccess || showError || error) && (
            <div className="image-overlay">
              {loading && <div className="loading" />}
              {showSuccess && <div className="success-check" />}
              {showError && <div className="error-cross" />}
              {error && !loading && !showSuccess && !showError && (
                <div className="error-message">{error}</div>
              )}
            </div>
          )}
          {analysis && (
            <div className="analysis-overlay">
              {renderAnalysisTable(analysis)}
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <div className="footer-content">
          <span>© 2025 nerdyStuff</span>
          <a href="https://www.nerdystuff.xyz" target="_blank" rel="noopener noreferrer">About us</a>
          <a href="https://www.nerdystuff.xyz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a>
          <a href="https://buymeacoffee.com/nerdystuff" target="_blank" rel="noopener noreferrer" className="coffee-link">☕️ Buy me a coffee</a>
        </div>
      </footer>
    </div>
  )
}

export default App
