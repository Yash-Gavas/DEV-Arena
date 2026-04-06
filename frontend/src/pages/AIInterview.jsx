import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import {
  BrainCircuit, Send, ArrowRight, AlertTriangle, Shield, Eye, Loader2,
  Mic, MicOff, Volume2, VolumeX, Camera, CameraOff, Play, Code2, User
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROUNDS = [
  { num: 1, name: 'Intro & DSA', color: 'text-blue-400' },
  { num: 2, name: 'Projects & Core', color: 'text-green-400' },
  { num: 3, name: 'Managerial & SD', color: 'text-yellow-400' },
  { num: 4, name: 'HR Round', color: 'text-purple-400' },
];

const LANGUAGES = [
  { value: 'python', label: 'Python', template: 'def solution():\n    # Write your solution here\n    pass\n' },
  { value: 'javascript', label: 'JavaScript', template: 'function solution() {\n  // Write your solution here\n}\n' },
  { value: 'java', label: 'Java', template: 'class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n' },
  { value: 'cpp', label: 'C++', template: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // Write your solution here\n    return 0;\n}\n' },
];

const AI_AVATAR = "https://static.prod-images.emergentagent.com/jobs/808f257a-41bf-4244-a650-c63e9d50cfe0/images/9926d6aa9334a206d34eda3e3941143c62da0d12515ba175884c395792e48357.png";

// Speaking waveform visualization
function SpeakingWave({ active }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-0.5 px-2" data-testid="speaking-wave">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-blue-400 rounded-full animate-pulse"
          style={{
            height: `${12 + Math.random() * 12}px`,
            animationDelay: `${i * 100}ms`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}

export default function AIInterview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState(interviewId ? 'interview' : 'setup');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [interview, setInterview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [ending, setEnding] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Voice state - auto mode
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const autoListenRef = useRef(true);

  // Camera / proctoring
  const [cameraOn, setCameraOn] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // IDE state for DSA round
  const [showIDE, setShowIDE] = useState(false);
  const [ideCode, setIdeCode] = useState(LANGUAGES[0].template);
  const [ideLanguage, setIdeLanguage] = useState('python');
  const [ideResult, setIdeResult] = useState(null);
  const [ideSubmitting, setIdeSubmitting] = useState(false);

  useEffect(() => {
    if (!interviewId) return;
    axios.get(`${API}/interviews/${interviewId}`, { withCredentials: true })
      .then(r => {
        setInterview(r.data.interview);
        setMessages(r.data.messages || []);
        setMode('interview');
      })
      .catch(() => navigate('/interview'));
  }, [interviewId, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-speak new AI messages + auto-listen after speaking
  useEffect(() => {
    if (!voiceEnabled || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'interviewer') {
      speakText(last.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, voiceEnabled]);

  // Show IDE automatically during DSA round (round 1)
  useEffect(() => {
    if (!interview) return;
    const round = interview.current_round || 1;
    if (round === 1 && messages.length > 2) {
      setShowIDE(true);
    } else {
      setShowIDE(false);
    }
  }, [interview, messages.length]);

  // Proctoring - tab switch
  const handleVisibility = useCallback(() => {
    if (document.hidden && interview) {
      setTabSwitches(p => p + 1);
      axios.post(`${API}/proctoring/event`, {
        interview_id: interview.interview_id,
        event_type: 'tab_switch',
        details: `Tab switch at ${new Date().toISOString()}`
      }, { withCredentials: true }).catch(() => {});
    }
  }, [interview]);

  useEffect(() => {
    if (mode === 'interview') {
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }
  }, [mode, handleVisibility]);

  // Camera proctoring
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraOn(true);
      startFaceDetection();
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const startFaceDetection = () => {
    const detectInterval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current) {
        clearInterval(detectInterval);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Simple brightness-based motion detection as a proxy
      // Real face detection would use face-api.js or MediaPipe
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let brightPixels = 0;
      for (let i = 0; i < data.length; i += 16) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness > 60 && brightness < 220) brightPixels++;
      }
      const coverage = brightPixels / (data.length / 16);
      // If very low coverage, might indicate no face or multiple obstructions
      if (coverage < 0.1 && interview) {
        axios.post(`${API}/proctoring/event`, {
          interview_id: interview.interview_id,
          event_type: 'face_not_detected',
          details: 'No face detected in camera feed'
        }, { withCredentials: true }).catch(() => {});
      }
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Voice functions
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[#*`_~\[\]()]/g, '').replace(/```[\s\S]*?```/g, 'code block').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      // Auto-listen after AI finishes speaking
      if (autoListenRef.current && voiceEnabled) {
        setTimeout(() => startListening(), 500);
      }
    };
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let finalText = '';
    let silenceTimer = null;
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInput(finalText + interim);
      // Reset silence timer
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        // Auto-send after 2.5s of silence if we have content
        if (finalText.trim().length > 5) {
          recognition.stop();
        }
      }, 2500);
    };
    recognition.onend = () => {
      setListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);
      // Auto-send if we have content
      if (finalText.trim()) {
        setInput(finalText.trim());
        setTimeout(() => {
          const sendBtn = document.querySelector('[data-testid="send-btn"]');
          if (sendBtn) sendBtn.click();
        }, 200);
      }
    };
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    startListening();
  };

  const startInterview = async () => {
    if (!role.trim()) return;
    setStarting(true);
    try {
      const res = await axios.post(`${API}/interviews/start`, { role, jd }, { withCredentials: true });
      setInterview(res.data.interview);
      setMessages(res.data.messages || []);
      setMode('interview');
      navigate(`/interview/${res.data.interview.interview_id}`, { replace: true });
      // Start camera for proctoring
      startCamera();
    } catch (err) {
      console.error('Start failed:', err);
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); }
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); }
    const text = input;
    setInput('');
    setSending(true);
    try {
      const res = await axios.post(`${API}/interviews/${interview.interview_id}/message`,
        { content: text }, { withCredentials: true });
      setMessages(prev => [...prev, res.data.user_message, res.data.ai_message]);
    } catch (err) {
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const nextRound = async () => {
    setSending(true);
    try {
      const res = await axios.post(`${API}/interviews/${interview.interview_id}/next-round`, {}, { withCredentials: true });
      setInterview(prev => ({ ...prev, current_round: res.data.current_round }));
      setMessages(prev => [...prev, res.data.message]);
    } catch {}
    setSending(false);
  };

  const endInterview = async () => {
    setEnding(true);
    stopCamera();
    try {
      const res = await axios.post(`${API}/interviews/${interview.interview_id}/end`, {}, { withCredentials: true });
      navigate(`/reports/${res.data.report_id}`);
    } catch {}
    setEnding(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // IDE submit during interview
  const submitIdeCode = async () => {
    if (!ideCode.trim() || ideSubmitting) return;
    setIdeSubmitting(true);
    setIdeResult(null);
    try {
      // Send code as part of interview conversation
      const codeMsg = `Here's my solution in ${ideLanguage}:\n\`\`\`${ideLanguage}\n${ideCode}\n\`\`\``;
      setInput(codeMsg);
      setTimeout(() => {
        const sendBtn = document.querySelector('[data-testid="send-btn"]');
        if (sendBtn) sendBtn.click();
      }, 100);
      setIdeResult({ submitted: true });
    } catch {}
    setIdeSubmitting(false);
  };

  // Setup Screen
  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="interview-setup">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <img src={AI_AVATAR} alt="AI Interviewer" className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-blue-500/30" />
            <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo']">Meet Alex Chen</h1>
            <p className="text-zinc-400 text-sm mt-2">Your AI Technical Interviewer. 4 rounds. Real questions. No mercy.</p>
          </div>
          <Card className="bg-[#141414] border-white/10">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-2 block">Target Role *</label>
                <Input data-testid="role-input" value={role} onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Frontend Developer, SDE-2"
                  className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-2 block">Job Description (optional)</label>
                <Textarea data-testid="jd-input" value={jd} onChange={e => setJd(e.target.value)}
                  placeholder="Paste the JD here for a tailored interview..."
                  className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500 min-h-[120px]" />
              </div>
              <div className="bg-black/50 rounded-md p-4 border border-white/5">
                <p className="text-xs text-zinc-400 mb-3 font-semibold">Interview Rounds:</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROUNDS.map(r => (
                    <div key={r.num} className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold ${r.color}`}>R{r.num}</span>
                      <span className="text-xs text-zinc-300">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Shield className="w-4 h-4 text-red-400" />
                <span>Camera + tab proctoring active. Voice auto-enabled. Mic auto-listens after AI speaks.</span>
              </div>
              <Button data-testid="start-interview-btn" onClick={startInterview} disabled={!role.trim() || starting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 font-semibold">
                {starting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Preparing...</> : 'Start Interview'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentRound = interview?.current_round || 1;

  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col" data-testid="interview-screen" style={{ paddingTop: '56px' }}>
      {/* Header */}
      <div className="bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={AI_AVATAR} alt="Alex" className="w-8 h-8 rounded-full border border-blue-500/30" />
            {speaking && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Alex Chen</p>
              {speaking && <SpeakingWave active={speaking} />}
              {speaking && <span className="text-[10px] text-blue-400 animate-pulse">Speaking...</span>}
            </div>
            <p className="text-[10px] text-zinc-500">Senior Technical Interviewer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ROUNDS.map(r => (
            <div key={r.num} data-testid={`round-indicator-${r.num}`}
              className={`px-2 py-1 rounded text-[10px] font-bold font-mono ${
                r.num === currentRound ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' :
                r.num < currentRound ? 'bg-green-600/20 text-green-400' : 'bg-white/5 text-zinc-600'
              }`}>
              R{r.num}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { autoListenRef.current = !voiceEnabled; if (speaking) window.speechSynthesis.cancel(); setVoiceEnabled(!voiceEnabled); }}
            data-testid="toggle-voice-btn"
            className={`h-7 px-2 text-[10px] border-white/10 ${voiceEnabled ? 'text-blue-400 border-blue-500/30' : 'text-zinc-500'}`}>
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>

          <Button variant="outline" onClick={cameraOn ? stopCamera : startCamera}
            data-testid="toggle-camera-btn"
            className={`h-7 px-2 text-[10px] border-white/10 ${cameraOn ? 'text-green-400 border-green-500/30' : 'text-zinc-500'}`}>
            {cameraOn ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
          </Button>

          {tabSwitches > 0 && (
            <Badge className="bg-red-600/20 text-red-400 border-red-500/30 text-[10px]" data-testid="tab-switch-warning">
              <AlertTriangle className="w-3 h-3 mr-1" /> {tabSwitches}
            </Badge>
          )}
          <div className="flex items-center gap-1" data-testid="proctoring-indicator">
            <Eye className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] text-green-400">Proctored</span>
          </div>
        </div>
      </div>

      {/* Main body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className={`flex flex-col ${showIDE ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
          {/* Camera preview */}
          {cameraOn && (
            <div className="absolute top-[100px] right-4 z-20" data-testid="camera-preview">
              <div className="relative rounded-lg overflow-hidden border border-white/20 shadow-lg">
                <video ref={videoRef} className="w-32 h-24 object-cover" muted playsInline autoPlay />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-1 left-1 flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[8px] text-white bg-black/60 px-1 rounded">LIVE</span>
                </div>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" data-testid="chat-area">
            {messages.map((msg, i) => (
              <div key={msg.message_id || i} className={`flex gap-3 ${msg.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'interviewer' && (
                  <img src={AI_AVATAR} alt="Alex" className="w-8 h-8 rounded-full border border-blue-500/30 flex-shrink-0 mt-1" />
                )}
                {msg.role === 'candidate' && (
                  <div className="w-8 h-8 bg-emerald-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'candidate' ? 'ml-auto' : ''}`}>
                  <div className={`rounded-md px-4 py-3 text-sm ${
                    msg.role === 'interviewer' ? 'bg-[#141414] border border-white/10 text-zinc-200' : 'bg-blue-600/20 border border-blue-500/30 text-white'
                  }`}>
                    {msg.role === 'interviewer' ? (
                      <div className="chat-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <p className="text-[10px] text-zinc-600">{msg.role === 'interviewer' ? 'Alex Chen' : user?.name} - R{msg.round_number}</p>
                    {msg.role === 'interviewer' && (
                      <button onClick={() => speakText(msg.content)} className="text-zinc-600 hover:text-blue-400" title="Read aloud">
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <img src={AI_AVATAR} alt="Alex" className="w-8 h-8 rounded-full border border-blue-500/30 flex-shrink-0 mt-1" />
                <div className="bg-[#141414] border border-white/10 rounded-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 bg-black/60 backdrop-blur-xl p-3 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              {currentRound < 4 && (
                <Button data-testid="next-round-btn" onClick={nextRound} disabled={sending} variant="outline"
                  className="text-xs border-white/10 hover:border-white/30 h-7 px-3">
                  Next Round <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
              {currentRound === 1 && (
                <Button variant="outline" onClick={() => setShowIDE(!showIDE)}
                  data-testid="toggle-ide-btn"
                  className={`text-xs h-7 px-3 ${showIDE ? 'text-blue-400 border-blue-500/30' : 'border-white/10 text-zinc-400'}`}>
                  <Code2 className="w-3 h-3 mr-1" /> {showIDE ? 'Hide IDE' : 'Show IDE'}
                </Button>
              )}
              <Button data-testid="end-interview-btn" onClick={endInterview} disabled={ending} variant="outline"
                className="text-xs border-red-500/30 text-red-400 hover:bg-red-600/10 h-7 px-3 ml-auto">
                {ending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} End Interview
              </Button>
            </div>
            <div className="flex gap-2">
              <Textarea ref={inputRef} data-testid="message-input" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown} placeholder={listening ? "Listening... speak your answer" : "Type or speak your answer..."}
                className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500 min-h-[44px] max-h-[120px] resize-none flex-1"
                rows={1} />
              <Button data-testid="mic-btn" onClick={toggleListening} variant="outline"
                className={`px-3 self-end ${listening ? 'text-red-400 border-red-500/30 bg-red-600/10' : 'text-zinc-500 border-white/10'}`}
                title={listening ? 'Stop recording' : 'Speak your answer'}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button data-testid="send-btn" onClick={sendMessage} disabled={!input.trim() || sending}
                className="bg-blue-600 hover:bg-blue-500 px-4 self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {listening && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex gap-0.5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: `${6 + Math.random() * 10}px`, animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
                <p className="text-[10px] text-red-400 animate-pulse">Listening... speak naturally (auto-sends after pause)</p>
              </div>
            )}
          </div>
        </div>

        {/* IDE Panel (visible in DSA round) */}
        {showIDE && (
          <div className="w-1/2 flex flex-col bg-[#0A0A0A]" data-testid="interview-ide">
            <div className="flex items-center justify-between px-3 py-2 bg-[#111] border-b border-white/10">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-zinc-300">Code Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={ideLanguage} onValueChange={v => { setIdeLanguage(v); setIdeCode(LANGUAGES.find(l => l.value === v)?.template || ''); }}>
                  <SelectTrigger className="w-[110px] h-7 bg-black border-white/10 text-xs" data-testid="ide-language-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-white/10">
                    {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  data-testid="ide-submit-btn"
                  onClick={submitIdeCode}
                  disabled={ideSubmitting}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-xs px-3"
                >
                  {ideSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                  Submit
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language={ideLanguage === 'cpp' ? 'cpp' : ideLanguage}
                value={ideCode}
                onChange={v => setIdeCode(v || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 12 },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>
            {ideResult?.submitted && (
              <div className="px-3 py-2 bg-emerald-600/10 border-t border-emerald-500/20 text-xs text-emerald-400">
                Code submitted to interviewer for review.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
