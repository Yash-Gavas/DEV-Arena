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
  BookOpen, FlaskConical, Lightbulb, ChevronDown, ChevronUp,
  Eye, Bug, ChevronRight, Clock, Zap
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

const COMPLEXITIES = [
  { label: 'O(1)', fn: () => 1, color: '#22C55E' },
  { label: 'O(log n)', fn: (n) => Math.log2(n + 1), color: '#3B82F6' },
  { label: 'O(n)', fn: (n) => n, color: '#06B6D4' },
  { label: 'O(n log n)', fn: (n) => n * Math.log2(n + 1), color: '#A855F7' },
  { label: 'O(n\u00B2)', fn: (n) => n * n, color: '#F59E0B' },
  { label: 'O(2\u207F)', fn: (n) => Math.pow(2, n), color: '#EF4444' },
  { label: 'O(n!)', fn: (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; }, color: '#DC2626' },
];

function matchComplexity(str) {
  if (!str) return -1;
  const s = str.toLowerCase().replace(/\s/g, '');
  if (s.includes('o(1)') || s.includes('constant')) return 0;
  if (s.includes('o(logn)') || s.includes('o(log(n))') || s.includes('logarithmic')) return 1;
  if (s.includes('o(nlogn)') || s.includes('o(n*logn)') || s.includes('o(nlog(n))')) return 3;
  if (s.includes('o(n)') || s === 'linear' || s.includes('o(m+n)') || s.includes('o(n+m)')) return 2;
  if (s.includes('o(n^2)') || s.includes('o(n²)') || s.includes('quadratic') || s.includes('o(m*n)') || s.includes('o(mn)')) return 4;
  if (s.includes('o(2^n)') || s.includes('o(2ⁿ)') || s.includes('exponential')) return 5;
  if (s.includes('o(n!)') || s.includes('factorial')) return 6;
  return -1;
}

function ComplexityGraph({ currentComplexity }) {
  const canvasRef = useRef(null);
  const matchIdx = matchComplexity(currentComplexity);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pad = { l: 45, r: 12, t: 12, b: 30 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const x = pad.l + (cw / 5) * i;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ch); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ch); ctx.lineTo(pad.l + cw, pad.t + ch); ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#555';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Input Size (n)', pad.l + cw / 2, H - 4);
    ctx.save();
    ctx.translate(10, pad.t + ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Operations', 0, 0);
    ctx.restore();

    // N range ticks
    const nMax = 12;
    for (let i = 0; i <= 4; i++) {
      const n = Math.round((nMax / 4) * i);
      const x = pad.l + (cw / 4) * i;
      ctx.fillStyle = '#444';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(n), x, pad.t + ch + 14);
    }

    // Compute max value for scaling (clamp exponential)
    const yMax = 80;

    // Draw curves
    COMPLEXITIES.forEach((c, idx) => {
      const isMatch = idx === matchIdx;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = isMatch ? 2.5 : 1;
      ctx.globalAlpha = isMatch ? 1 : 0.25;
      ctx.beginPath();
      for (let px = 0; px <= cw; px++) {
        const n = (px / cw) * nMax;
        let y = c.fn(Math.max(n, 0.01));
        y = Math.min(y, yMax);
        const plotY = pad.t + ch - (y / yMax) * ch;
        const plotX = pad.l + px;
        if (px === 0) ctx.moveTo(plotX, plotY);
        else ctx.lineTo(plotX, plotY);
      }
      ctx.stroke();

      // Label at end of curve
      const endN = nMax;
      let endY = Math.min(c.fn(endN), yMax);
      const labelY = pad.t + ch - (endY / yMax) * ch;
      ctx.globalAlpha = isMatch ? 1 : 0.4;
      ctx.fillStyle = c.color;
      ctx.font = isMatch ? 'bold 9px monospace' : '8px monospace';
      ctx.textAlign = 'left';
      const labelX = pad.l + cw + 2;
      if (labelX + 50 < W) {
        // No room for right labels in our width, so skip
      }
    });

    ctx.globalAlpha = 1;

    // Legend
    const legendY = pad.t + 4;
    COMPLEXITIES.forEach((c, idx) => {
      const isMatch = idx === matchIdx;
      const lx = pad.l + 6 + idx * 62;
      const ly = legendY;
      ctx.globalAlpha = isMatch ? 1 : 0.35;
      ctx.fillStyle = c.color;
      ctx.fillRect(lx, ly, 8, 8);
      ctx.font = isMatch ? 'bold 8px monospace' : '8px monospace';
      ctx.fillStyle = isMatch ? '#fff' : '#666';
      ctx.textAlign = 'left';
      ctx.fillText(c.label, lx + 11, ly + 7);
    });
    ctx.globalAlpha = 1;

    // "Your solution" indicator
    if (matchIdx >= 0) {
      const c = COMPLEXITIES[matchIdx];
      const midN = nMax * 0.6;
      let midY = Math.min(c.fn(midN), yMax);
      const px = pad.l + (midN / nMax) * cw;
      const py = pad.t + ch - (midY / yMax) * ch;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Your Solution', px + 8, py + 3);
    }
  }, [matchIdx]);

  return (
    <div className="bg-[#111] rounded-md p-3 border border-white/5" data-testid="complexity-graph">
      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Time Complexity Comparison</p>
      <canvas ref={canvasRef} width={450} height={200} className="w-full rounded" style={{ imageRendering: 'auto' }} />
      {matchIdx === -1 && currentComplexity && (
        <p className="text-[9px] text-zinc-500 mt-2 italic">Complexity: {currentComplexity}</p>
      )}
    </div>
  );
}

export default function ProblemWorkspace() {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [enhancedDesc, setEnhancedDesc] = useState(null);
  const [loadingDesc, setLoadingDesc] = useState(false);
  const [testcases, setTestcases] = useState([]);
  const [loadingTc, setLoadingTc] = useState(false);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [leftTab, setLeftTab] = useState('description');

  // Pattern visualizer state
  const [vizData, setVizData] = useState(null);
  const [loadingViz, setLoadingViz] = useState(false);
  const [debugStep, setDebugStep] = useState(0);

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

  // Load enhanced description
  useEffect(() => {
    if (!problemId) return;
    setLoadingDesc(true);
    axios.get(`${API}/problems/${problemId}/description`, { withCredentials: true })
      .then(r => setEnhancedDesc(r.data))
      .catch(() => {})
      .finally(() => setLoadingDesc(false));
  }, [problemId]);

  // Load test cases
  useEffect(() => {
    if (!problemId) return;
    setLoadingTc(true);
    axios.get(`${API}/problems/${problemId}/testcases`, { withCredentials: true })
      .then(r => setTestcases(r.data.testcases || []))
      .catch(() => {})
      .finally(() => setLoadingTc(false));
  }, [problemId]);

  // Load pattern visualizer (lazy - on tab switch)
  const loadVisualizer = useCallback(() => {
    if (vizData || loadingViz) return;
    setLoadingViz(true);
    axios.get(`${API}/problems/${problemId}/visualizer`, { withCredentials: true })
      .then(r => { setVizData(r.data); setDebugStep(0); })
      .catch(() => {})
      .finally(() => setLoadingViz(false));
  }, [problemId, vizData, loadingViz]);

  // Load viz when tab switches to visualizer or debugger
  useEffect(() => {
    if (leftTab === 'visualizer' || leftTab === 'debugger') loadVisualizer();
  }, [leftTab, loadVisualizer]);

  const changeLanguage = useCallback((val) => {
    setLanguage(val);
    const lang = LANGUAGES.find(l => l.value === val);
    setCode(lang?.template || '');
    setResult(null);
  }, []);

  const submitCode = async () => {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setResult(null);
    setLeftTab('results');
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

  const desc = enhancedDesc;

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
          <Button data-testid="run-code-btn" onClick={submitCode} disabled={submitting} size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-xs px-3">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            Run & Evaluate
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* LEFT PANEL */}
        <ResizablePanel defaultSize={38} minSize={25} maxSize={55}>
          <div className="h-full flex flex-col bg-[#0A0A0A] overflow-hidden">
            <Tabs value={leftTab} onValueChange={setLeftTab} className="flex flex-col h-full">
              <TabsList className="bg-[#111] border-b border-white/10 rounded-none h-8 w-full justify-start px-1 flex-shrink-0">
                <TabsTrigger value="description" className="text-[10px] h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded px-2">
                  <BookOpen className="w-3 h-3 mr-1" /> Description
                </TabsTrigger>
                <TabsTrigger value="testcases" className="text-[10px] h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded px-2">
                  <FlaskConical className="w-3 h-3 mr-1" /> Tests
                </TabsTrigger>
                <TabsTrigger value="visualizer" className="text-[10px] h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded px-2">
                  <Eye className="w-3 h-3 mr-1" /> Pattern
                </TabsTrigger>
                <TabsTrigger value="debugger" className="text-[10px] h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded px-2">
                  <Bug className="w-3 h-3 mr-1" /> Debugger
                </TabsTrigger>
                {result && (
                  <TabsTrigger value="results" className="text-[10px] h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded px-2">
                    {result.passed ? <CheckCircle className="w-3 h-3 mr-1 text-emerald-400" /> : <XCircle className="w-3 h-3 mr-1 text-red-400" />}
                    Results
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ===== DESCRIPTION TAB ===== */}
              <TabsContent value="description" className="flex-1 overflow-y-auto m-0 p-4">
                <h2 className="text-lg font-bold font-['Chivo'] mb-2" data-testid="problem-desc-title">{problem.title}</h2>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <Badge className={`text-xs ${diffColors[problem.difficulty]}`}>{problem.difficulty}</Badge>
                  <Badge variant="outline" className="text-xs border-white/20 text-zinc-300">{problem.topic}</Badge>
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">{problem.pattern}</Badge>
                </div>

                {loadingDesc && !desc ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading detailed description...
                  </div>
                ) : null}

                {/* Enhanced description */}
                <div className="text-sm text-zinc-300 leading-relaxed mb-4 chat-markdown" data-testid="problem-description">
                  <ReactMarkdown>{desc?.description || problem.description}</ReactMarkdown>
                </div>

                {/* Examples */}
                {(desc?.examples || []).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">Examples</p>
                    {desc.examples.map((ex, i) => (
                      <div key={i} className="mb-3 bg-[#111] rounded-md p-3 border border-white/5" data-testid={`example-${i}`}>
                        <p className="text-[10px] text-zinc-500 font-semibold mb-1.5">Example {i + 1}</p>
                        <div className="space-y-1">
                          <p className="text-[11px] font-mono text-zinc-400">Input: <span className="text-white">{ex.input}</span></p>
                          <p className="text-[11px] font-mono text-zinc-400">Output: <span className="text-emerald-400">{ex.output}</span></p>
                          {ex.explanation && (
                            <p className="text-[11px] text-zinc-500 mt-1 border-t border-white/5 pt-1">
                              <span className="text-zinc-400 font-semibold">Explanation:</span> {ex.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {(desc?.constraints || []).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 mb-1.5 font-semibold uppercase tracking-wider">Constraints</p>
                    <ul className="space-y-1">
                      {desc.constraints.map((c, i) => (
                        <li key={i} className="text-[11px] font-mono text-zinc-400 bg-[#111] px-2.5 py-1 rounded border border-white/5">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hints */}
                {(desc?.hints || []).length > 0 && (
                  <details className="mb-4">
                    <summary className="text-xs text-amber-400 cursor-pointer hover:text-amber-300 font-semibold flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Show Hints
                    </summary>
                    <div className="mt-2 space-y-1.5 pl-4">
                      {desc.hints.map((h, i) => (
                        <p key={i} className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                          <span className="text-amber-400 font-mono text-[10px]">{i + 1}.</span> {h}
                        </p>
                      ))}
                    </div>
                  </details>
                )}

                {/* Complexity */}
                {(desc?.time_complexity || desc?.space_complexity) && (
                  <div className="mb-4">
                    <div className="flex gap-3 mb-3">
                      {desc.time_complexity && (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-[#111] px-2.5 py-1.5 rounded border border-white/5">
                          <Clock className="w-3 h-3 text-blue-400" /> Time: <span className="text-white font-mono">{desc.time_complexity}</span>
                        </div>
                      )}
                      {desc.space_complexity && (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-[#111] px-2.5 py-1.5 rounded border border-white/5">
                          <Zap className="w-3 h-3 text-amber-400" /> Space: <span className="text-white font-mono">{desc.space_complexity}</span>
                        </div>
                      )}
                    </div>
                    {/* Time Complexity Comparison Graph */}
                    {desc.time_complexity && <ComplexityGraph currentComplexity={desc.time_complexity} />}
                  </div>
                )}

                {/* Companies */}
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
              </TabsContent>

              {/* ===== TEST CASES TAB ===== */}
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
                          <div><p className="text-[10px] text-zinc-500">Input</p><pre className="text-xs font-mono text-white bg-black/50 p-2 rounded mt-0.5 overflow-x-auto">{tc.input}</pre></div>
                          <div><p className="text-[10px] text-zinc-500">Expected Output</p><pre className="text-xs font-mono text-emerald-400 bg-black/50 p-2 rounded mt-0.5 overflow-x-auto">{tc.expected_output}</pre></div>
                          {tc.explanation && (
                            <p className="text-[11px] text-zinc-400 flex items-start gap-1">
                              <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />{tc.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ===== PATTERN VISUALIZER TAB ===== */}
              <TabsContent value="visualizer" className="flex-1 overflow-y-auto m-0 p-4">
                {loadingViz ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> Generating pattern visualization...</div>
                ) : !vizData ? (
                  <div className="text-xs text-zinc-500">Loading...</div>
                ) : (
                  <div data-testid="pattern-visualizer">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold">{vizData.pattern_name}</h3>
                    </div>
                    <p className="text-xs text-zinc-300 mb-4 bg-[#111] p-3 rounded border border-white/5">{vizData.pattern_explanation}</p>

                    {vizData.key_insight && (
                      <div className="mb-4 bg-amber-600/10 border border-amber-500/20 rounded-md p-3">
                        <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-1">Key Insight</p>
                        <p className="text-xs text-amber-200">{vizData.key_insight}</p>
                      </div>
                    )}

                    {(vizData.when_to_use || []).length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5">When to Use</p>
                        <ul className="space-y-1">
                          {vizData.when_to_use.map((w, i) => (
                            <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                              <ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(vizData.similar_problems || []).length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5">Similar Problems</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {vizData.similar_problems.map((sp, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-600/10 text-blue-400 rounded border border-blue-500/20">{sp}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Algorithm Steps */}
                    <div>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Algorithm Steps</p>
                      <div className="space-y-2">
                        {(vizData.steps || []).map((step, i) => (
                          <div key={i} className="bg-[#111] rounded-md p-3 border border-white/5" data-testid={`viz-step-${i}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-600/20 px-1.5 py-0.5 rounded">{step.step}</span>
                              <span className="text-xs font-semibold text-white">{step.title}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mb-1.5">{step.description}</p>
                            {step.state && (
                              <pre className="text-[11px] font-mono text-emerald-400 bg-black/50 p-2 rounded overflow-x-auto">{step.state}</pre>
                            )}
                            {step.highlight && (
                              <p className="text-[10px] text-amber-400 mt-1.5 flex items-start gap-1">
                                <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />{step.highlight}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ===== STEP-BY-STEP DEBUGGER TAB ===== */}
              <TabsContent value="debugger" className="flex-1 overflow-y-auto m-0 p-4">
                {loadingViz ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading debugger...</div>
                ) : !vizData?.steps?.length ? (
                  <div className="text-xs text-zinc-500">No debug steps available.</div>
                ) : (
                  <div data-testid="step-debugger">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-red-400" />
                        <h3 className="text-sm font-bold">Step-by-Step Debugger</h3>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">Step {debugStep + 1} / {vizData.steps.length}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-[#111] rounded-full h-1.5 mb-4 border border-white/5">
                      <div className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${((debugStep + 1) / vizData.steps.length) * 100}%` }} />
                    </div>

                    {/* Current step display */}
                    <div className="bg-[#111] rounded-md p-4 border border-blue-500/20 mb-4" data-testid="debug-current-step">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono font-bold text-blue-400 bg-blue-600/20 px-2 py-0.5 rounded">Step {vizData.steps[debugStep].step}</span>
                        <span className="text-sm font-semibold text-white">{vizData.steps[debugStep].title}</span>
                      </div>
                      <p className="text-xs text-zinc-300 mb-3">{vizData.steps[debugStep].description}</p>
                      {vizData.steps[debugStep].state && (
                        <div className="mb-2">
                          <p className="text-[10px] text-zinc-500 mb-1 font-semibold">State:</p>
                          <pre className="text-sm font-mono text-emerald-400 bg-black/70 p-3 rounded border border-white/5 overflow-x-auto">{vizData.steps[debugStep].state}</pre>
                        </div>
                      )}
                      {vizData.steps[debugStep].highlight && (
                        <div className="bg-amber-600/10 border border-amber-500/20 rounded p-2 mt-2">
                          <p className="text-xs text-amber-300 flex items-start gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                            {vizData.steps[debugStep].highlight}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <Button variant="outline" onClick={() => setDebugStep(s => Math.max(0, s - 1))} disabled={debugStep === 0}
                        className="border-white/10 text-zinc-400 h-8 text-xs px-3" data-testid="debug-prev">
                        <ArrowLeft className="w-3 h-3 mr-1" /> Prev
                      </Button>
                      <div className="flex gap-1">
                        {vizData.steps.map((_, i) => (
                          <button key={i} onClick={() => setDebugStep(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === debugStep ? 'bg-blue-500 scale-125' : i < debugStep ? 'bg-blue-500/40' : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <Button variant="outline" onClick={() => setDebugStep(s => Math.min(vizData.steps.length - 1, s + 1))}
                        disabled={debugStep === vizData.steps.length - 1}
                        className="border-white/10 text-zinc-400 h-8 text-xs px-3" data-testid="debug-next">
                        Next <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>

                    {/* Mini-timeline */}
                    <div className="mt-4 space-y-1">
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5">All Steps</p>
                      {vizData.steps.map((step, i) => (
                        <button key={i} onClick={() => setDebugStep(i)}
                          className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] transition-all ${
                            i === debugStep ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' :
                            i < debugStep ? 'text-zinc-500 bg-[#111]' : 'text-zinc-400 hover:bg-white/5'
                          }`}>
                          <span className="font-mono text-[10px] mr-1.5">{step.step}.</span>{step.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ===== RESULTS TAB ===== */}
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
        <ResizablePanel defaultSize={62} minSize={40}>
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
                    minimap: { enabled: false }, fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    padding: { top: 12 }, scrollBeyondLastLine: false,
                    wordWrap: 'on', lineNumbers: 'on', renderLineHighlight: 'gutter',
                    bracketPairColorization: { enabled: true }, smoothScrolling: true,
                  }}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-white/10 hover:bg-blue-500/50 transition-colors" />

            {/* CHATBOT */}
            <ResizablePanel defaultSize={chatOpen ? 40 : 10} minSize={6} maxSize={70}>
              <div className="h-full flex flex-col bg-[#0C0C0C] border-t border-white/10">
                <button onClick={() => setChatOpen(!chatOpen)}
                  className="flex items-center justify-between px-3 py-2 bg-[#111] border-b border-white/10 flex-shrink-0 hover:bg-[#161616] transition-colors"
                  data-testid="toggle-chatbot">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-zinc-300">AI Mentor</span>
                    <span className="text-[10px] text-zinc-600">Ask for hints & help</span>
                  </div>
                  {chatOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
                {chatOpen && (
                  <>
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
                              msg.role === 'assistant' ? 'bg-[#141414] border border-white/10 text-zinc-300' : 'bg-blue-600/20 border border-blue-500/30 text-white'
                            }`}>
                              {msg.role === 'assistant' ? (
                                <div className="chat-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                              ) : <p className="whitespace-pre-wrap">{msg.content}</p>}
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
                    <div className="px-3 py-2 border-t border-white/10 flex gap-2 flex-shrink-0">
                      <Textarea data-testid="problem-chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={chatKeyDown}
                        placeholder="Ask for hints, explain approach, debug help..."
                        className="bg-black border-white/10 text-white text-xs min-h-[32px] max-h-[80px] resize-none flex-1 py-1.5" rows={1} />
                      <Button data-testid="problem-chat-send" onClick={sendChat} disabled={!chatInput.trim() || chatSending}
                        size="sm" className="bg-blue-600 hover:bg-blue-500 h-8 px-2.5 self-end">
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
