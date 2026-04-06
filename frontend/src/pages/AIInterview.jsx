import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { BrainCircuit, Send, ArrowRight, AlertTriangle, Shield, Eye, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROUNDS = [
  { num: 1, name: 'DSA & Coding', color: 'text-blue-400' },
  { num: 2, name: 'Projects & Experience', color: 'text-green-400' },
  { num: 3, name: 'Core CS Fundamentals', color: 'text-yellow-400' },
  { num: 4, name: 'System Design', color: 'text-purple-400' },
];

const AI_AVATAR = "https://static.prod-images.emergentagent.com/jobs/808f257a-41bf-4244-a650-c63e9d50cfe0/images/9926d6aa9334a206d34eda3e3941143c62da0d12515ba175884c395792e48357.png";

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
  // Voice state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

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

  // Auto-speak new AI messages
  useEffect(() => {
    if (!voiceEnabled || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'interviewer') {
      speakText(last.content);
    }
  }, [messages, voiceEnabled]);

  // Proctoring
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
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Speech recognition not supported in this browser. Use Chrome.'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let finalText = input;
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
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
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
    try {
      const res = await axios.post(`${API}/interviews/${interview.interview_id}/end`, {}, { withCredentials: true });
      navigate(`/reports/${res.data.report_id}`);
    } catch {}
    setEnding(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
                <span>Proctoring active. Tab switches monitored. Voice input available.</span>
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
    <div className="h-screen bg-[#0A0A0A] flex flex-col" data-testid="interview-screen">
      {/* Header */}
      <div className="bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 flex items-center justify-between flex-shrink-0" style={{ marginTop: '56px' }}>
        <div className="flex items-center gap-3">
          <img src={AI_AVATAR} alt="Alex" className="w-8 h-8 rounded-full border border-blue-500/30" />
          <div>
            <p className="text-sm font-semibold">Alex Chen</p>
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
          {/* Voice Controls */}
          <Button variant="outline" onClick={() => { if (speaking) window.speechSynthesis.cancel(); setVoiceEnabled(!voiceEnabled); }}
            data-testid="toggle-voice-btn"
            className={`h-7 px-2 text-[10px] border-white/10 ${voiceEnabled ? 'text-blue-400 border-blue-500/30' : 'text-zinc-500'}`}
            title={voiceEnabled ? 'Mute AI voice' : 'Enable AI voice'}>
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
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

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" data-testid="chat-area">
        {messages.map((msg, i) => (
          <div key={msg.message_id || i} className={`flex gap-3 animate-slide-in ${msg.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'interviewer' && (
              <img src={AI_AVATAR} alt="Alex" className="w-8 h-8 rounded-full border border-blue-500/30 flex-shrink-0 mt-1" />
            )}
            <div className={`max-w-[75%] ${msg.role === 'candidate' ? 'ml-auto' : ''}`}>
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            {currentRound < 4 && (
              <Button data-testid="next-round-btn" onClick={nextRound} disabled={sending} variant="outline"
                className="text-xs border-white/10 hover:border-white/30 h-7 px-3">
                Next Round <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
            <Button data-testid="end-interview-btn" onClick={endInterview} disabled={ending} variant="outline"
              className="text-xs border-red-500/30 text-red-400 hover:bg-red-600/10 h-7 px-3 ml-auto">
              {ending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} End Interview
            </Button>
          </div>
          <div className="flex gap-2">
            <Textarea ref={inputRef} data-testid="message-input" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Type or speak your answer... (Shift+Enter for new line)"
              className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500 min-h-[44px] max-h-[120px] resize-none flex-1"
              rows={1} />
            <Button data-testid="mic-btn" onClick={toggleListening} variant="outline"
              className={`px-3 self-end ${listening ? 'text-red-400 border-red-500/30 animate-pulse-glow' : 'text-zinc-500 border-white/10'}`}
              title={listening ? 'Stop recording' : 'Speak your answer'}>
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button data-testid="send-btn" onClick={sendMessage} disabled={!input.trim() || sending}
              className="bg-blue-600 hover:bg-blue-500 px-4 self-end">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {listening && <p className="text-[10px] text-red-400 mt-1 animate-pulse">Recording... Speak your answer</p>}
        </div>
      </div>
    </div>
  );
}
