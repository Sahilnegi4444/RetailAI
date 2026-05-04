with open('client/src/pages/DataUpload.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add getTrainingStatus to imports
content = content.replace('checkHealth, getDataPreview } from "../api";', 'checkHealth, getDataPreview, getTrainingStatus } from "../api";')

# Add state
state_code = '''
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [trainingStatusData, setTrainingStatusData] = useState({status: "idle", progress: 0, message: ""});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getTrainingStatus();
        if (data && data.status) {
            setTrainingStatusData(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    const interval = setInterval(fetchStatus, 2000);
    fetchStatus();
    
    return () => clearInterval(interval);
  }, []);
'''
content = content.replace('  const [checkingHealth, setCheckingHealth] = useState(false);', state_code)

# Add Progress Banner UI at the top under Page Header
banner_code = '''
      {trainingStatusData.status === "training" && (
        <div className="model-health-card" style={{marginBottom: '20px', borderLeft: '4px solid #4caf50'}}>
          <div className="health-content" style={{width: '100%'}}>
            <span className="health-icon">⚙️</span>
            <div className="health-info" style={{width: '100%'}}>
              <h3>Background Training in Progress</h3>
              <p>{trainingStatusData.message}</p>
              <div style={{width: '100%', height: '12px', backgroundColor: '#333', borderRadius: '6px', overflow: 'hidden', marginTop: '10px'}}>
                <div style={{width: `${trainingStatusData.progress}%`, height: '100%', backgroundColor: '#4caf50', transition: 'width 0.5s ease'}}></div>
              </div>
              <p style={{textAlign: 'right', fontSize: '12px', marginTop: '5px', color: '#aaa'}}>{trainingStatusData.progress}% Complete</p>
            </div>
          </div>
        </div>
      )}
'''

content = content.replace('      {/* Model Health Status */}', banner_code + '\n      {/* Model Health Status */}')

with open('client/src/pages/DataUpload.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated DataUpload.jsx successfully")
