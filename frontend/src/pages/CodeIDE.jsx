import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { Play, ChevronRight, CheckCircle, XCircle, Code2, Loader2, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LANGUAGES = [
  { value: 'python', label: 'Python', template: '# Write your solution here\ndef solution():\n    pass\n' },
  { value: 'javascript', label: 'JavaScript', template: '// Write your solution here\nfunction solution() {\n  \n}\n' },
  { value: 'java', label: 'Java', template: '// Write your solution here\nclass Solution {\n    public void solve() {\n        \n    }\n}\n' },
  { value: 'cpp', label: 'C++', template: '// Write your solution here\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n' },
];

const diffColors = {
  Easy: 'bg-green-600/20 text-green-400 border-green-500/30',
  Medium: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
  Hard: 'bg-red-600/20 text-red-400 border-red-500/30',
};

export default function CodeIDE() {
  const [searchParams] = useSearchParams();
  const [problems, setProblems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [language, setLanguage] = useState('python');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    axios.get(`${API}/problems?limit=200`, { withCredentials: true })
      .then(r => {
        setProblems(r.data.problems || []);
        const pid = searchParams.get('problem');
        if (pid) {
          const found = r.data.problems.find(p => p.problem_id === pid);
          if (found) setSelected(found);
        }
      }).catch(() => {});
  }, [searchParams]);

  const selectProblem = (p) => {
    setSelected(p);
    setResult(null);
    const lang = LANGUAGES.find(l => l.value === language);
    setCode(lang?.template || '');
  };

  const submit = async () => {
    if (!selected || !code.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/code/evaluate`, {
        problem_id: selected.problem_id, code, language
      }, { withCredentials: true });
      setResult(res.data);
    } catch (err) {
      setResult({ passed: false, feedback: 'Submission failed. Please try again.', test_results: [] });
    }
    setSubmitting(false);
  };

  const filteredProblems = problems.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col" data-testid="code-ide-page" style={{ paddingTop: '56px' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Problem Sidebar */}
        {sidebarOpen && (
          <div className="w-72 bg-[#0A0A0A] border-r border-white/10 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  data-testid="ide-search"
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search problems..."
                  className="pl-8 bg-black border-white/10 text-white h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredProblems.slice(0, 100).map(p => (
                <button
                  key={p.problem_id}
                  onClick={() => selectProblem(p)}
                  data-testid={`ide-problem-${p.problem_id}`}
                  className={`w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selected?.problem_id === p.problem_id ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <p className="text-xs font-medium text-white truncate">{p.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] px-1 py-0.5 rounded ${diffColors[p.difficulty] || ''}`}>{p.difficulty}</span>
                    <span className="text-[9px] text-zinc-500">{p.topic}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#141414] border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-400 hover:text-white" data-testid="toggle-sidebar">
                <Code2 className="w-4 h-4" />
              </button>
              {selected && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{selected.title}</span>
                  <Badge className={`text-[10px] ${diffColors[selected.difficulty] || ''}`}>{selected.difficulty}</Badge>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={v => { setLanguage(v); setCode(LANGUAGES.find(l => l.value === v)?.template || ''); }}>
                <SelectTrigger className="w-32 h-8 bg-black border-white/10 text-xs" data-testid="language-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                data-testid="submit-code-btn"
                onClick={submit}
                disabled={!selected || submitting}
                className="bg-green-600 hover:bg-green-500 text-white h-8 text-xs px-3"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                Submit
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Problem Description */}
            {selected && (
              <div className="w-[35%] border-r border-white/10 overflow-y-auto p-4 bg-[#0A0A0A]">
                <h2 className="text-lg font-bold font-['Chivo'] mb-3">{selected.title}</h2>
                <div className="flex gap-2 mb-3">
                  <Badge className={`text-xs ${diffColors[selected.difficulty]}`}>{selected.difficulty}</Badge>
                  <Badge variant="outline" className="text-xs border-white/20 text-zinc-300">{selected.topic}</Badge>
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">{selected.pattern}</Badge>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-4">{selected.description}</p>
                {selected.companies && (
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 mb-1.5">Companies:</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {selected.companies.map(c => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-zinc-400">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Code Editor */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={language === 'cpp' ? 'cpp' : language}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false }, fontSize: 14,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: { top: 12 }, scrollBeyondLastLine: false,
                  }}
                />
              </div>

              {/* Results Panel */}
              {result && (
                <div className="border-t border-white/10 bg-[#141414] p-4 max-h-[200px] overflow-y-auto" data-testid="code-results">
                  <div className="flex items-center gap-2 mb-3">
                    {result.passed ? (
                      <><CheckCircle className="w-5 h-5 text-green-500" /><span className="text-green-400 font-semibold text-sm">Accepted</span></>
                    ) : (
                      <><XCircle className="w-5 h-5 text-red-500" /><span className="text-red-400 font-semibold text-sm">Needs Improvement</span></>
                    )}
                    {result.score !== undefined && <Badge className="ml-2 bg-blue-600/20 text-blue-400">{result.score}/100</Badge>}
                    {result.time_complexity && <span className="text-xs text-zinc-400">Time: {result.time_complexity}</span>}
                    {result.space_complexity && <span className="text-xs text-zinc-400">Space: {result.space_complexity}</span>}
                  </div>
                  {result.feedback && (
                    <div className="text-xs text-zinc-300 chat-markdown mb-2">
                      <ReactMarkdown>{result.feedback}</ReactMarkdown>
                    </div>
                  )}
                  {result.test_results?.length > 0 && (
                    <div className="space-y-1">
                      {result.test_results.map((t, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded ${t.passed ? 'bg-green-600/10' : 'bg-red-600/10'}`}>
                          {t.passed ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                          <span className="text-zinc-300">Test {i+1}: {t.input?.substring(0, 50)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!selected && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Code2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Select a problem from the sidebar to start coding</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
