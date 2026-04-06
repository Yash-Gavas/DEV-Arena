import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Send, Loader2, Trash2, Bot } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DSAChatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I'm your DEV-Arena AI Mentor. Ask me anything about DSA, algorithms, data structures, time complexity, or problem-solving strategies. I can help you understand concepts, debug code, and suggest approaches." }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await axios.post(`${API}/chatbot`, {
        message: text,
        context: messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')
      }, { withCredentials: true });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble processing that. Please try again.' }]);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: "Chat cleared! What would you like to learn about?" }]);
  };

  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col" data-testid="dsa-chatbot" style={{ paddingTop: '56px' }}>
      {/* Header */}
      <div className="bg-[#141414] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-['Chivo']">DSA Mentor</h1>
            <p className="text-[10px] text-zinc-500">AI-powered coding assistant</p>
          </div>
        </div>
        <button onClick={clearChat} className="text-zinc-500 hover:text-zinc-300 p-1.5" data-testid="clear-chat-btn" title="Clear chat">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" data-testid="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
              <div className={`rounded-md px-4 py-3 text-sm ${
                msg.role === 'assistant'
                  ? 'bg-[#141414] border border-white/10 text-zinc-200'
                  : 'bg-blue-600/20 border border-blue-500/30 text-white'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="chat-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
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

      {/* Input */}
      <div className="border-t border-white/10 bg-[#141414] p-3 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Textarea
            ref={inputRef}
            data-testid="chatbot-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about DSA, algorithms, complexity, debugging..."
            className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500 min-h-[44px] max-h-[120px] resize-none flex-1"
            rows={1}
          />
          <Button
            data-testid="chatbot-send-btn"
            onClick={send}
            disabled={!input.trim() || sending}
            className="bg-blue-600 hover:bg-blue-500 px-4 self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
