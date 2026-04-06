import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle
} from '../components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Play, CheckCircle, XCircle, Loader2, Send, Bot, ArrowLeft,
  BookOpen, FlaskConical, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LANGUAGES = [
  { value: 'python', label: 'Python', monaco: 'python', template: 'def solution():\n    # Write your solution here\n    pass\n' },
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript', template: 'function solution() {\n  // Write your solution here\n  \n}\n' },
  { value: 'typescript', label: 'TypeScript', monaco: 'typescript', template: 'function solution(): void {\n  // Write your solution here\n  \n}\n' },
  { value: 'java', label: 'Java', monaco: 'java', template: 'class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n' },
  { value: 'cpp', label: 'C++', monaco: 'cpp', template: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n' },
  { value: 'c', label: 'C', monaco: 'c', template: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n' },
  { value: 'csharp', label: 'C#', monaco: 'csharp', template: 'using System;\n\nclass Solution {\n    static void Main() {\n        // Write your solution here\n    }\n}\n' },
  { value: 'go', label: 'Go', monaco: 'go', template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println("Hello")\n}\n' },
  { value: 'rust', label: 'Rust', monaco: 'rust', template: 'fn main() {\n    // Write your solution here\n}\n' },
  { value: 'ruby', label: 'Ruby', monaco: 'ruby', template: '# Write your solution here\ndef solution()\n  \nend\n' },
  { value: 'php', label: 'PHP', monaco: 'php', template: '<?php\n// Write your solution here\nfunction solution() {\n    \n}\n' },
  { value: 'swift', label: 'Swift', monaco: 'swift', template: '// Write your solution here\nfunc solution() {\n    \n}\n' },
  { value: 'kotlin', label: 'Kotlin', monaco: 'kotlin', template: 'fun main() {\n    // Write your solution here\n}\n' },
  { value: 'scala', label: 'Scala', monaco: 'scala', template: 'object Solution {\n  def main(args: Array[String]): Unit = {\n    // Write your solution here\n  }\n}\n' },
  { value: 'r', label: 'R', monaco: 'r', template: '# Write your solution here\nsolution <- function() {\n  \n}\n' },
  { value: 'perl', label: 'Perl', monaco: 'perl', template: '#!/usr/bin/perl\n# Write your solution here\nsub solution {\n    \n}\n' },
  { value: 'lua', label: 'Lua', monaco: 'lua', template: '-- Write your solution here\nfunction solution()\n    \nend\n' },
  { value: 'haskell', label: 'Haskell', monaco: 'haskell', template: '-- Write your solution here\nmain :: IO ()\nmain = do\n    putStrLn "Hello"\n' },
  { value: 'dart', label: 'Dart', monaco: 'dart', template: 'void main() {\n  // Write your solution here\n}\n' },
  { value: 'elixir', label: 'Elixir', monaco: 'elixir', template: 'defmodule Solution do\n  def solve() do\n    # Write your solution here\n  end\nend\n' },
  { value: 'julia', label: 'Julia', monaco: 'julia', template: '# Write your solution here\nfunction solution()\n    \nend\n' },
  { value: 'matlab', label: 'MATLAB', monaco: 'matlab', template: '% Write your solution here\nfunction result = solution()\n    \nend\n' },
];

const diffColors = {
  Easy: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  Medium: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  Hard: 'bg-red-600/20 text-red-400 border-red-500/30',
};

export default function ProblemWorkspace() {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [testcases, setTestcases] = useState([]);
  const [loadingTc, setLoadingTc] = useState(false);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [leftTab, setLeftTab] = useState('description');

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(true);

  // Load problem
  useEffect(() => {
    axios.get(`${API}/problems/${problemId}`, { withCredentials: true })
      .then(r => {
        setProblem(r.data);
        setChatMessages([{
          role: 'assistant',
          content: `I'm your AI mentor for **${r.data.title}**. Ask me for hints, approach guidance, or help debugging your code!`
        }]);
      })
      .catch(() => navigate('/problems'));
  }, [problemId, navigate]);

  // Load test cases
  useEffect(() => {
    if (!problemId) return;
    setLoadingTc(true);
    axios.get(`${API}/problems/${problemId}/testcases`, { withCredentials: true })
      .then(r => setTestcases(r.data.testcases || []))
      .catch(() => {})
      .finally(() => setLoadingTc(false));
  }, [problemId]);

  // Language change
  const changeLanguage = useCallback((val) => {
    setLanguage(val);
    const lang = LANGUAGES.find(l => l.value === val);
    setCode(lang?.template || '');
    setResult(null);
  }, []);

  // Submit code
  const submitCode = async () => {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/code/evaluate`, {
        problem_id: problemId, code, language
      }, { withCredentials: true });
      setResult(res.data);
    } catch {
      setResult({ passed: false, feedback: 'Submission failed. Try again.', test_results: [] });
    }
    setSubmitting(false);
  };

  // Chatbot
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatSending) return;
    const text = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatSending(true);
    try {
      const ctx = chatMessages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
      const codeCtx = code.trim() !== (LANGUAGES.find(l => l.value === language)?.template || '') ? `\n\nUser's current code (${language}):\n\`\`\`\n${code}\n\`\`\`` : '';
      const res = await axios.post(`${API}/problems/${problemId}/chat`, {
        message: text + codeCtx,
        context: ctx
      }, { withCredentials: true });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }]);
    }
    setChatSending(false);
  };

  const chatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  };

  if (!problem) {
    return (
      <div className="h-screen bg-[#0A0A0A] flex items-center justify-center" style={{ paddingTop: '56px' }}>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col" data-testid="problem-workspace" style={{ paddingTop: '56px' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/problems')} className="text-zinc-500 hover:text-white p-1" data-testid="back-to-problems">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white truncate max-w-[300px]" data-testid="problem-title">{problem.title}</span>
          <Badge className={`text-[10px] ${diffColors[problem.difficulty] || ''}`} data-testid="problem-difficulty">{problem.difficulty}</Badge>
          <Badge variant="outline" className="text-[10px] border-white/20 text-zinc-400">{problem.topic}</Badge>
          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">{problem.pattern}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-[130px] h-7 bg-black border-white/10 text-xs" data-testid="language-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#141414] border-white/10 max-h-[300px]">
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            data-testid="run-code-btn"
            onClick={submitCode}
            disabled={submitting}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-xs px-3"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            Run & Evaluate
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* LEFT PANEL - Description + Test Cases */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className="h-full flex flex-col bg-[#0A0A0A] overflow-hidden">
            <Tabs value={leftTab} onValueChange={setLeftTab} className="flex flex-col h-full">
              <TabsList className="bg-[#111] border-b border-white/10 rounded-none h-8 w-full justify-start px-2">
                <TabsTrigger value="description" className="text-[11px] h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded px-2.5">
                  <BookOpen className="w-3 h-3 mr-1" /> Description
                </TabsTrigger>
                <TabsTrigger value="testcases" className="text-[11px] h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded px-2.5">
                  <FlaskConical className="w-3 h-3 mr-1" /> Test Cases
                </TabsTrigger>
                {result && (
                  <TabsTrigger value="results" className="text-[11px] h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded px-2.5">
                    {result.passed ? <CheckCircle className="w-3 h-3 mr-1 text-emerald-400" /> : <XCircle className="w-3 h-3 mr-1 text-red-400" />}
                    Results
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="description" className="flex-1 overflow-y-auto m-0 p-4">
                <h2 className="text-lg font-bold font-['Chivo'] mb-2" data-testid="problem-desc-title">{problem.title}</h2>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <Badge className={`text-xs ${diffColors[problem.difficulty]}`}>{problem.difficulty}</Badge>
                  <Badge variant="outline" className="text-xs border-white/20 text-zinc-300">{problem.topic}</Badge>
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">{problem.pattern}</Badge>
                </div>
                <div className="text-sm text-zinc-300 leading-relaxed mb-4 chat-markdown">
                  <ReactMarkdown>{problem.description}</ReactMarkdown>
                </div>
                {problem.companies?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 mb-1.5 font-semibold uppercase tracking-wider">Companies</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {problem.companies.map(c => (
                        <span key={c} className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-zinc-400 border border-white/5">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {testcases.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">Examples</p>
                    {testcases.slice(0, 2).map((tc, i) => (
                      <div key={i} className="mb-3 bg-[#111] rounded-md p-3 border border-white/5">
                        <p className="text-[11px] font-mono text-zinc-400 mb-1">Input: <span className="text-white">{tc.input}</span></p>
                        <p className="text-[11px] font-mono text-zinc-400">Output: <span className="text-emerald-400">{tc.expected_output}</span></p>
                        {tc.explanation && <p className="text-[11px] text-zinc-500 mt-1">{tc.explanation}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="testcases" className="flex-1 overflow-y-auto m-0 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Test Cases</h3>
                  {loadingTc && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                </div>
                {testcases.length === 0 && !loadingTc ? (
                  <p className="text-xs text-zinc-500">No test cases loaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {testcases.map((tc, i) => (
                      <div key={i} className="bg-[#111] rounded-md p-3 border border-white/5" data-testid={`testcase-${i}`}>
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Case {i + 1}</p>
                        <div className="space-y-1.5">
                          <div>
                            <p className="text-[10px] text-zinc-500">Input</p>
                            <pre className="text-xs font-mono text-white bg-black/50 p-2 rounded mt-0.5 overflow-x-auto">{tc.input}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500">Expected Output</p>
                            <pre className="text-xs font-mono text-emerald-400 bg-black/50 p-2 rounded mt-0.5 overflow-x-auto">{tc.expected_output}</pre>
                          </div>
                          {tc.explanation && (
                            <p className="text-[11px] text-zinc-400 flex items-start gap-1">
                              <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                              {tc.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {result && (
                <TabsContent value="results" className="flex-1 overflow-y-auto m-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    {result.passed ? (
                      <><CheckCircle className="w-5 h-5 text-emerald-500" /><span className="text-emerald-400 font-semibold text-sm">Accepted</span></>
                    ) : (
                      <><XCircle className="w-5 h-5 text-red-500" /><span className="text-red-400 font-semibold text-sm">Needs Work</span></>
                    )}
                    {result.score !== undefined && (
                      <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-xs">{result.score}/100</Badge>
                    )}
                  </div>
                  {(result.time_complexity || result.space_complexity) && (
                    <div className="flex gap-3 mb-3">
                      {result.time_complexity && <span className="text-xs text-zinc-400 bg-[#111] px-2 py-1 rounded border border-white/5">Time: {result.time_complexity}</span>}
                      {result.space_complexity && <span className="text-xs text-zinc-400 bg-[#111] px-2 py-1 rounded border border-white/5">Space: {result.space_complexity}</span>}
                    </div>
                  )}
                  {result.feedback && (
                    <div className="text-xs text-zinc-300 chat-markdown mb-4 bg-[#111] p-3 rounded border border-white/5">
                      <ReactMarkdown>{result.feedback}</ReactMarkdown>
                    </div>
                  )}
                  {result.test_results?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Test Results</p>
                      {result.test_results.map((t, i) => (
                        <div key={i} className={`flex items-start gap-2 text-xs p-2.5 rounded border ${
                          t.passed ? 'bg-emerald-600/5 border-emerald-500/20' : 'bg-red-600/5 border-red-500/20'
                        }`} data-testid={`result-${i}`}>
                          {t.passed ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-mono text-zinc-300 truncate">Input: {t.input}</p>
                            <p className="font-mono text-zinc-400">Expected: {t.expected}</p>
                            {!t.passed && <p className="font-mono text-red-400">Got: {t.actual}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.suggestions?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Suggestions</p>
                      <ul className="space-y-1">
                        {result.suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                            <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-white/10 hover:bg-blue-500/50 transition-colors" />

        {/* RIGHT PANEL - Editor + Chatbot */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <ResizablePanelGroup direction="vertical">
            {/* CODE EDITOR */}
            <ResizablePanel defaultSize={chatOpen ? 60 : 90} minSize={30}>
              <div className="h-full flex flex-col">
                <Editor
                  height="100%"
                  language={LANGUAGES.find(l => l.value === language)?.monaco || language}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    padding: { top: 12 },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    renderLineHighlight: 'gutter',
                    bracketPairColorization: { enabled: true },
                    smoothScrolling: true,
                  }}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-white/10 hover:bg-blue-500/50 transition-colors" />

            {/* CHATBOT */}
            <ResizablePanel defaultSize={chatOpen ? 40 : 10} minSize={6} maxSize={70}>
              <div className="h-full flex flex-col bg-[#0C0C0C] border-t border-white/10">
                {/* Chat Header */}
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className="flex items-center justify-between px-3 py-2 bg-[#111] border-b border-white/10 flex-shrink-0 hover:bg-[#161616] transition-colors"
                  data-testid="toggle-chatbot"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-zinc-300">AI Mentor</span>
                    <span className="text-[10px] text-zinc-600">Ask for hints & help</span>
                  </div>
                  {chatOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />}
                </button>

                {chatOpen && (
                  <>
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5" data-testid="problem-chat-messages">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          {msg.role === 'assistant' && (
                            <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Bot className="w-3 h-3 text-blue-400" />
                            </div>
                          )}
                          <div className={`max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                            <div className={`rounded-md px-3 py-2 text-xs ${
                              msg.role === 'assistant'
                                ? 'bg-[#141414] border border-white/10 text-zinc-300'
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
                      {chatSending && (
                        <div className="flex gap-2">
                          <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-blue-400" />
                          </div>
                          <div className="bg-[#141414] border border-white/10 rounded-md px-3 py-2">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="px-3 py-2 border-t border-white/10 flex gap-2 flex-shrink-0">
                      <Textarea
                        data-testid="problem-chat-input"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={chatKeyDown}
                        placeholder="Ask for hints, explain approach, debug help..."
                        className="bg-black border-white/10 text-white text-xs min-h-[32px] max-h-[80px] resize-none flex-1 py-1.5"
                        rows={1}
                      />
                      <Button
                        data-testid="problem-chat-send"
                        onClick={sendChat}
                        disabled={!chatInput.trim() || chatSending}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-500 h-8 px-2.5 self-end"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
