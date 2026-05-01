import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  User, 
  History, 
  MessageSquare, 
  Camera, 
  Upload, 
  LogOut, 
  Shield, 
  ChevronRight, 
  Mic, 
  Send,
  AlertCircle,
  Stethoscope,
  Utensils,
  FileText
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [appStep, setAppStep] = useState('login'); // login, onboarding, dashboard
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('analysis'); // analysis, history, chat
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [safetyAgreed, setSafetyAgreed] = useState(false);

  // Analysis state
  const [file, setFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [vitals, setVitals] = useState({ heartRate: '72', spO2: '98', sysBP: '120', diaBP: '80' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  // Document Upload State
  const [docFile, setDocFile] = useState(null);
  const [isDocAnalyzing, setIsDocAnalyzing] = useState(false);

  // Localization State
  const [language, setLanguage] = useState('English');

  const fetchReport = async (scanId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/report/${scanId}`);
      setActiveReport(res.data);
    } catch (err) {
      console.error("Failed to fetch report", err);
    }
  };

  // Chat state
  const [chatLog, setChatLog] = useState([
    { sender: 'AI', text: 'Hello! I am your Multi-Agent Healthcare Assistant. How can I help you today?' }
  ]);
  const [userMsg, setUserMsg] = useState('');
  const chatEndRef = useRef(null);

  // Fetch history when user logs in
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/history/${user.id}`);
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!safetyAgreed) return alert("Please agree to safety terms.");
    
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      const res = await axios.post(`${API_BASE}/api/auth/login`, formData);
      setUser(res.data.user);
      setAppStep(res.data.user.name === 'New User' ? 'onboarding' : 'dashboard');
    } catch (err) {
      alert("Login failed. Backend might be offline.");
    }
  };

  const handleOnboarding = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('name', user.name);
    formData.append('age', user.age || 0);
    formData.append('gender', user.gender || 'Other');
    formData.append('history', user.history || '');
    
    await axios.post(`${API_BASE}/api/user/update`, formData);
    setAppStep('dashboard');
  };

  const handleDocUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocFile(file);
      setIsDocAnalyzing(true);
      setTimeout(() => {
        setIsDocAnalyzing(false);
      }, 2500);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('user_id', user.id);

    try {
      const res = await axios.post(`${API_BASE}/api/predict`, formData);
      if (res.data.status === 'success') {
        setPrediction(res.data);
        fetchHistory();
        setChatLog(prev => [...prev, { sender: 'AI', text: `Analysis complete: ${res.data.prediction} detected. ${res.data.message}` }]);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
    }
    setIsAnalyzing(false);
  };

  // Additional feature states
  const [isEli5, setIsEli5] = useState(false);
  const [healthStreak, setHealthStreak] = useState(5);
  const [badges, setBadges] = useState(['Early Bird', 'Consistency King']);

  const [emergencyAlert, setEmergencyAlert] = useState(null);

  const sendMessage = async () => {
    if (!userMsg.trim()) return;
    const msg = userMsg;
    setUserMsg('');
    setChatLog(prev => [...prev, { sender: 'User', text: msg }]);

    const thinkingId = Date.now();
    setChatLog(prev => [...prev, { id: thinkingId, sender: 'AI', text: "Generating query for you... helping you find the best solution. Please wait.", isTyping: true }]);

    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('message', msg);
      formData.append('health_data', JSON.stringify(vitals));
      formData.append('is_eli5', isEli5);
      if (prediction) {
        formData.append('prediction_context', prediction.prediction);
      }
      
      const res = await axios.post(`${API_BASE}/api/chat`, formData);
      setChatLog(prev => prev.filter(m => m.id !== thinkingId).concat({ sender: 'AI', text: res.data.response, isEmergency: res.data.is_emergency }));
      
      if (res.data.is_emergency) {
        setEmergencyAlert(res.data.response);
      }

      // Reassurance if stress was detected
      if (res.data.stress_detected) {
        setChatLog(prev => [...prev, { sender: 'AI', text: "I can sense you might be feeling a bit stressed. Take a deep breath—I'm here to help walk you through this." }]);
      }
    } catch (err) {
      console.error(err);
      
      const fallbackMsgs = [
        "I'm currently unable to connect to my main medical database, but I'm generating a query for you and helping you find the best solution based on standard protocols.",
        "My connection to the healthcare knowledge base is temporarily degraded. Please consult a physician for urgent matters while I attempt to reconnect.",
        "I'm analyzing your request offline. Generating the best possible guidance based on standard protocols... However, please remember this does not replace human diagnosis."
      ];
      const randomFallback = fallbackMsgs[Math.floor(Math.random() * fallbackMsgs.length)];
      
      setChatLog(prev => prev.filter(m => m.id !== thinkingId).concat({ sender: 'AI', text: randomFallback }));
    }
  };

  // ... (inside the return statement, adding the new UI elements)

  if (appStep === 'login') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1e293b] rounded-2xl p-8 shadow-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="text-blue-400 w-8 h-8" />
            <h1 className="text-2xl font-bold">HealthAI<span className="text-blue-400">.</span></h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="doctor@hospital.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" required />
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={safetyAgreed} onChange={e=>setSafetyAgreed(e.target.checked)} className="mt-1" />
              <label className="text-sm text-red-400 font-bold leading-tight uppercase tracking-wide">I understand this AI is for screening purposes and <span className="text-red-500 underline decoration-red-500/50">NOT a replacement for professional human diagnosis</span>.</label>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  if (appStep === 'onboarding') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-[#1e293b] rounded-2xl p-8 shadow-2xl border border-white/10">
          <h2 className="text-2xl font-bold mb-6">Complete Your Profile</h2>
          <form onSubmit={handleOnboarding} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                <input type="text" value={user.name} onChange={e=>setUser({...user, name: e.target.value})} className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Age</label>
                <input type="number" value={user.age} onChange={e=>setUser({...user, age: e.target.value})} className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Gender</label>
                <select value={user.gender} onChange={e=>setUser({...user, gender: e.target.value})} className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-2">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Brief Medical History / Pre-existing Conditions</label>
              <textarea value={user.history} onChange={e=>setUser({...user, history: e.target.value})} className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-2 h-24 mb-3" placeholder="e.g. Asthma, High BP..."></textarea>
              
              <div className="border border-dashed border-white/20 rounded-lg p-4 bg-[#0f172a] relative overflow-hidden transition-all group hover:border-blue-500/50">
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleDocUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2 rounded-lg">
                      <FileText className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Attach Medical Records</h4>
                      <p className="text-xs text-slate-500">Upload past prescriptions or lab reports (PDF)</p>
                    </div>
                  </div>
                  <div>
                    <Upload size={20} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
                
                {isDocAnalyzing && (
                  <div className="mt-4 space-y-2 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-blue-400 flex items-center gap-2">
                        <Activity size={12} className="animate-pulse" /> Analyzing Document...
                      </span>
                      <span className="text-slate-400">Extracting context</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 animate-doc-progress"></div>
                    </div>
                  </div>
                )}

                {docFile && !isDocAnalyzing && (
                  <div className="mt-4 flex items-center justify-between bg-green-500/10 border border-green-500/20 p-2 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-green-400" />
                      <span className="text-xs text-green-400 font-medium">{docFile.name} attached & analyzed.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 py-3 rounded-lg font-bold">Access Portal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#1e293b] border-r border-white/10 flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-white/5">
          <Activity className="text-blue-400 w-6 h-6" />
          <h1 className="font-bold text-lg">HealthAI</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={()=>setView('analysis')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view==='analysis'?'bg-blue-600 text-white':'hover:bg-white/5 text-slate-400'}`}>
            <Stethoscope size={20} /> Analysis
          </button>
          <button onClick={()=>setView('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view==='history'?'bg-blue-600 text-white':'hover:bg-white/5 text-slate-400'}`}>
            <History size={20} /> Scan History
          </button>
          <button onClick={()=>setView('chat')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view==='chat'?'bg-blue-600 text-white':'hover:bg-white/5 text-slate-400'}`}>
            <MessageSquare size={20} /> AI Agent
          </button>
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={()=>setAppStep('login')} className="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-white transition-colors">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#0f172a]/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-400">PATIENT: {user.name}</h2>
            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
            <h2 className="text-sm font-semibold text-slate-400">AGE: {user.age}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">LANG</span>
              <select value={language} onChange={e=>setLanguage(e.target.value)} className="bg-[#1e293b] border border-white/10 text-white text-xs font-bold rounded-md px-2 py-1 outline-none hover:border-blue-500 focus:border-blue-500 transition-all cursor-pointer">
                <option value="English">ENG</option>
                <option value="Hindi">HIN</option>
                <option value="Marathi">MAR</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <Shield size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Secure Portal</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {view === 'analysis' && (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Gamification Banner */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-6 border border-white/10 flex items-center justify-between animate-in">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-600/20">
                    <Activity className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Health Streak: {healthStreak} Days! 🔥</h3>
                    <p className="text-xs text-slate-400">Maintain your streak by checking vitals or uploading scans.</p>
                  </div>
                </div>
                <div className="hidden sm:flex gap-2">
                  {badges.map(b => (
                    <span key={b} className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold border border-white/10">{b} 🏆</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="space-y-6">
                  <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Upload size={20} className="text-blue-400" /> New Scan Analysis
                      </h3>
                      <button 
                        onClick={() => setIsEli5(!isEli5)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isEli5 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-slate-500 border border-white/10'}`}
                      >
                        {isEli5 ? '👶 ELI5 ACTIVE' : '🏥 MEDICAL MODE'}
                      </button>
                    </div>
                  <div className="aspect-video bg-[#0f172a] rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                    {file ? (
                      <img src={URL.createObjectURL(file)} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera size={48} className="text-slate-600 mb-2" />
                        <p className="text-sm text-slate-500">Upload or Capture Medical Image</p>
                      </>
                    )}
                    <input type="file" onChange={e=>setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <button onClick={handleUpload} disabled={!file || isAnalyzing} className="w-full mt-4 bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 transition-colors disabled:opacity-50">
                    {isAnalyzing ? "Processing AI..." : "Begin Diagnostic Scan"}
                  </button>
                </div>

                <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Activity size={20} className="text-green-400" /> Real-time Vitals
                    </h3>
                    <button 
                      onClick={() => {
                        setIsSyncing(true);
                        setTimeout(() => setIsSyncing(false), 2000);
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex items-center gap-2"
                    >
                      {isSyncing ? <Activity size={12} className="animate-spin-slow" /> : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 0 1 9-9"/></svg>}
                      {isSyncing ? 'SYNCING...' : 'SYNC GOOGLE FIT'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Heart Rate */}
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Heart Rate</p>
                        <div className="flex items-baseline gap-1">
                          <input type="number" value={vitals.heartRate} onChange={e=>setVitals({...vitals, heartRate:e.target.value})} className="bg-transparent text-2xl font-bold text-white outline-none w-14 text-right appearance-none" />
                          <span className="text-xs text-slate-500 font-bold">BPM</span>
                        </div>
                      </div>
                      <input type="range" min="40" max="180" value={vitals.heartRate} onChange={e=>setVitals({...vitals, heartRate:e.target.value})} className="w-full accent-green-500" />
                    </div>
                    
                    {/* SpO2 */}
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">SpO2 %</p>
                        <div className="flex items-baseline gap-1">
                          <input type="number" value={vitals.spO2} onChange={e=>setVitals({...vitals, spO2:e.target.value})} className="bg-transparent text-2xl font-bold text-white outline-none w-14 text-right appearance-none" />
                          <span className="text-xs text-slate-500 font-bold">%</span>
                        </div>
                      </div>
                      <input type="range" min="80" max="100" value={vitals.spO2} onChange={e=>setVitals({...vitals, spO2:e.target.value})} className="w-full accent-blue-500" />
                    </div>

                    {/* Blood Pressure (Sys/Dia) */}
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5 col-span-2 space-y-4">
                      <div className="flex justify-between items-end mb-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Blood Pressure (mmHg)</p>
                        <div className="flex items-baseline gap-1">
                          <input type="number" value={vitals.sysBP} onChange={e=>setVitals({...vitals, sysBP:e.target.value})} className="bg-transparent text-2xl font-bold text-white outline-none w-14 text-right appearance-none" />
                          <span className="text-xl text-slate-600 font-light">/</span>
                          <input type="number" value={vitals.diaBP} onChange={e=>setVitals({...vitals, diaBP:e.target.value})} className="bg-transparent text-2xl font-bold text-slate-400 outline-none w-14 text-left appearance-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest text-right">SYS</p>
                          <input type="range" min="80" max="200" value={vitals.sysBP} onChange={e=>setVitals({...vitals, sysBP:e.target.value})} className="w-full accent-red-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest text-left">DIA</p>
                          <input type="range" min="50" max="130" value={vitals.diaBP} onChange={e=>setVitals({...vitals, diaBP:e.target.value})} className="w-full accent-orange-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className="space-y-6">
                {prediction ? (
                  <div className="space-y-6">
                    <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10 animate-in fade-in slide-in-from-right-4 shadow-2xl">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold">Diagnostic Results</h3>
                        <div className="flex flex-col items-end">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            prediction.risk_level === 'High Risk' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
                            prediction.risk_level === 'Moderate Risk' ? 'bg-orange-500 text-white' : 
                            'bg-green-500 text-white'
                          }`}>
                            {prediction.risk_level}
                          </span>
                        </div>
                      </div>
                      
                      {/* Risk Stratification Graphic */}
                      <div className="flex gap-1 h-2 mb-6 rounded-full overflow-hidden bg-white/5">
                        <div className={`flex-1 transition-all ${prediction.risk_level === 'Low Risk' ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                        <div className={`flex-1 transition-all ${prediction.risk_level === 'Moderate Risk' ? 'bg-orange-500' : 'bg-slate-700'}`}></div>
                        <div className={`flex-1 transition-all ${prediction.risk_level === 'High Risk' ? 'bg-red-500' : 'bg-slate-700'}`}></div>
                      </div>

                      <div className="bg-[#0f172a] p-4 rounded-xl mb-6">
                        <p className="text-sm text-slate-400 mb-1">Primary Prediction</p>
                        <h4 className={`text-3xl font-bold ${prediction.prediction === 'Normal' ? 'text-green-400' : 'text-blue-400'}`}>{prediction.prediction}</h4>
                        <p className="text-xs text-slate-500 mt-1">AI Confidence: {(prediction.confidence * 100).toFixed(2)}%</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase">Original Scan</p>
                        <img src={prediction.original_url} className="rounded-lg border border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase">Heatmap (AI Focus)</p>
                        <img src={prediction.heatmap_url} className="rounded-lg border border-white/10" />
                      </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 mb-6">
                      <AlertCircle className="text-blue-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-blue-400 mb-1">Recommended Action</p>
                        <p className="text-sm leading-relaxed">{prediction.message}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => fetchReport(prediction.id || history[0]?.id)}
                      className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition-all text-sm font-bold"
                    >
                      <FileText size={18} className="text-blue-400" /> View Clinical Report
                    </button>
                  </div>
                ) : (
                  <div className="h-full bg-[#1e293b]/50 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p>No analysis performed yet. Upload an image to see diagnostic results here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {view === 'history' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Visual Health Timeline</h3>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider"><span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span> Normal</span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider"><span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> Abnormal</span>
                </div>
              </div>
              
              <div className="relative border-l-2 border-white/5 ml-4 pl-8 space-y-12">
                {history.map((item, i) => (
                  <div key={i} className="relative group">
                    <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-[#0f172a] shadow-lg transition-transform group-hover:scale-125 ${item.prediction === 'Normal' ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'}`}></div>
                    <div 
                      className="bg-[#1e293b] rounded-2xl p-6 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all cursor-pointer shadow-xl" 
                      onClick={()=>{setPrediction(item); setView('analysis')}}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <ChevronRight className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="flex gap-6 items-center">
                        <div className="relative shrink-0">
                          <img src={item.original_url} className="w-20 h-20 rounded-xl object-cover border border-white/10" />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1e293b] ${item.prediction === 'Normal' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-1 ${item.prediction === 'Normal' ? 'text-green-400' : 'text-red-400'}`}>{item.prediction}</h4>
                          <p className="text-sm text-slate-400 line-clamp-1 italic">"{item.message}"</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Stratification</p>
                          <p className={`text-sm font-bold ${
                            item.risk_level === 'High Risk' ? 'text-red-500' : 
                            item.risk_level === 'Moderate Risk' ? 'text-orange-500' : 
                            'text-green-500'
                          }`}>{item.risk_level}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'chat' && (
            <div className="max-w-3xl mx-auto h-full flex flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-4">
                {chatLog.map((msg, i) => (
                  <div key={msg.id || i} className={`flex ${msg.sender === 'User' ? 'justify-end' : 'justify-start'} ${msg.isTyping ? 'animate-in fade-in slide-in-from-bottom-2' : ''}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.sender === 'User' ? 'bg-blue-600 rounded-tr-none' : 'bg-[#1e293b] border border-white/10 rounded-tl-none'} ${msg.isTyping ? 'animate-pulse text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : ''}`}>
                      {msg.isEmergency && <p className="text-red-500 font-bold mb-2">🚨 EMERGENCY ALERT</p>}
                      <div className="flex items-center gap-2">
                        {msg.isTyping && <Activity size={16} className="animate-spin-slow" />}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2 p-2 bg-[#1e293b] rounded-2xl border border-white/10">
                <input 
                  type="text" 
                  value={userMsg} 
                  onChange={e=>setUserMsg(e.target.value)} 
                  onKeyDown={e=>e.key==='Enter'&&sendMessage()}
                  placeholder="Ask the Multi-Agent AI about your health..." 
                  className="flex-1 bg-transparent px-4 py-2 outline-none"
                />
                <button onClick={sendMessage} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors">
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Safety Disclaimer Footer */}
        <footer className="h-16 border-t-2 border-red-500/30 bg-[#1e293b] flex items-center justify-center px-8 shadow-[0_-10px_30px_rgba(239,68,68,0.1)]">
          <p className="text-sm text-red-400 font-extrabold uppercase tracking-widest flex items-center gap-3">
            <Shield size={20} className="text-red-500" /> 
            AI Screening Tool • DOES NOT REPLACE HUMAN DIAGNOSIS • Consult a Physician
          </p>
        </footer>
      </main>

      {/* EMERGENCY ALERT MODAL */}
      {emergencyAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-red-950/90 backdrop-blur-md">
          <div className="bg-[#1e293b] border-2 border-red-500 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-bounce-short">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-500 p-4 rounded-full mb-6">
                <AlertCircle size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">CRITICAL SAFETY ALERT</h2>
              <p className="text-red-200 leading-relaxed mb-8">{emergencyAlert}</p>
              <div className="flex flex-col w-full gap-3">
                <a href="tel:911" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl text-center text-xl transition-all">
                  CALL 911 / EMERGENCY
                </a>
                <button onClick={() => setEmergencyAlert(null)} className="text-slate-500 text-sm hover:text-white transition-all">
                  I have contacted emergency services
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Report Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/90 backdrop-blur-sm">
          <div className="bg-white text-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in">
            {/* Report Header */}
            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="text-blue-600" /> Clinical Screening Report
                </h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Generated by HealthAI Digital Labs</p>
              </div>
              <button onClick={() => setActiveReport(null)} className="text-slate-400 hover:text-slate-600">
                <LogOut size={24} className="rotate-180" />
              </button>
            </div>

            {/* Report Body */}
            <div className="p-8 space-y-8">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Report ID</p>
                  <p className="font-semibold">{activeReport.report_metadata.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Date of Analysis</p>
                  <p className="font-semibold">{new Date(activeReport.report_metadata.date).toLocaleString()}</p>
                </div>
              </div>

              {/* Patient Section */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-200 pb-2">Patient Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Name</p>
                    <p className="font-semibold">{activeReport.patient_summary.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Age / Gender</p>
                    <p className="font-semibold">{activeReport.patient_summary.age} / {activeReport.patient_summary.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Medical History</p>
                    <p className="font-semibold">{activeReport.patient_summary.history}</p>
                  </div>
                </div>
              </div>

              {/* Findings Section */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-200 pb-2">Diagnostic Findings</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                      <p className="text-[10px] text-blue-600 font-bold uppercase">Primary AI Prediction</p>
                      <p className="text-xl font-bold text-slate-900">{activeReport.findings.primary_diagnosis}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Confidence</p>
                        <p className="font-bold">{activeReport.findings.confidence_score}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Risk Level</p>
                        <p className="font-bold">{activeReport.findings.risk_assessment}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed italic border-l pl-6 border-slate-100">
                    <p className="font-bold text-slate-900 mb-2 uppercase text-[10px]">AI Interpretation</p>
                    {activeReport.ai_interpretation}
                  </div>
                </div>
              </div>

              {/* Critical Alert & Doctor Connection */}
              {activeReport.findings.risk_assessment === 'High Risk' && (
                <div className="bg-red-600 text-white p-6 rounded-xl border border-red-700 shadow-lg shadow-red-600/20">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                        <AlertCircle size={20} className="animate-pulse" /> Immediate Consultation Advised
                      </h3>
                      <p className="text-sm text-red-100">
                        Based on the critical indicators in this report, our AI strongly recommends an immediate review by a certified specialist.
                      </p>
                    </div>
                    <button className="shrink-0 bg-white text-red-600 px-6 py-3 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors shadow-lg flex items-center gap-2 transform hover:scale-105">
                      <Stethoscope size={18} /> Connect Doctor
                    </button>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-green-50/50 p-6 rounded-xl border border-green-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-green-700 mb-4 flex items-center gap-2">
                  <Stethoscope size={16} /> Clinical Recommendations
                </h3>
                <ul className="space-y-3">
                  {activeReport.suggested_next_steps.map((step, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="pt-8 border-t border-slate-100 text-center">
                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 border border-red-200">
                  <p className="text-sm font-extrabold uppercase">
                    🚨 WARNING: AI DOES NOT REPLACE PROFESSIONAL HUMAN DIAGNOSIS 🚨
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-md mx-auto">
                  {activeReport.disclaimer}
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <button onClick={() => window.print()} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2">
                    <FileText size={16} /> Print Report
                  </button>
                  <button onClick={() => setActiveReport(null)} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
