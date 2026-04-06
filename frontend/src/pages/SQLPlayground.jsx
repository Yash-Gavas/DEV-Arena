import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import {
  Play, Database, Table, AlertTriangle, CheckCircle, BookOpen,
  Send, Bot, Search, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['all','Basic SELECT','WHERE Clause','Aggregate Functions','GROUP BY','HAVING','JOINs','Subqueries','Window Functions','Advanced','NULL Handling','String Functions','Date Functions','Set Operations','Optimization'];

export default function SQLPlayground() {
  const [query, setQuery] = useState('SELECT * FROM employees LIMIT 10;');
  const [result, setResult] = useState(null);
  const [schema, setSchema] = useState([]);
  const [problems, setProblems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('playground');

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "I'm your **SQL Mentor**! Ask me anything about SQL — query help, optimization tips, or concept explanations." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/sql/schema`, { withCredentials: true }).then(r => setSchema(r.data.tables || [])).catch(() => {});
  }, []);

  useEffect(() => {
    axios.get(`${API}/sql/problems`, {
      params: { page, limit: 30, category: category !== 'all' ? category : undefined, difficulty: difficulty !== 'all' ? difficulty : undefined },
      withCredentials: true
    }).then(r => {
      setProblems(r.data.problems || []);
      setTotal(r.data.total || 0);
      setTotalPages(r.data.total_pages || 1);
    }).catch(() => {});
  }, [page, category, difficulty]);

  const runQuery = async () => {
    if (!query.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/sql/execute`, { query }, { withCredentials: true });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.detail || 'Execution failed', columns: [], rows: [], row_count: 0 });
    }
    setRunning(false);
  };

  const loadProblem = (p) => {
    setQuery(`-- ${p.title}\n-- ${p.description}\n\n`);
    setActiveTab('playground');
  };

  // Chatbot
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatSending) return;
    const text = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatSending(true);
    try {
      const ctx = chatMessages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
      const queryCtx = query.trim() !== 'SELECT * FROM employees LIMIT 10;' ? `\n\nUser's current query:\n\`\`\`sql\n${query}\n\`\`\`` : '';
      const res = await axios.post(`${API}/sql/chat`, {
        message: text + queryCtx,
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

  const diffColor = (d) => d === 'Easy' ? 'bg-green-600/20 text-green-400' : d === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-red-600/20 text-red-400';

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="sql-playground">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] flex items-center gap-2">
            <Database className="w-7 h-7 text-cyan-500" /> SQL Lab
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{total} problems across {CATEGORIES.length - 1} categories</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#141414] border border-white/10 mb-4" data-testid="sql-tabs">
            <TabsTrigger value="playground" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Playground
            </TabsTrigger>
            <TabsTrigger value="problems" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Problems ({total})
            </TabsTrigger>
            <TabsTrigger value="schema" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
              <Table className="w-3.5 h-3.5 mr-1.5" /> Schema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="playground">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Schema sidebar */}
              <div className="lg:col-span-2">
                <Card className="bg-[#141414] border-white/10">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-1.5"><Table className="w-3.5 h-3.5 text-cyan-500" /> Tables</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-3 pb-3">
                    {schema.map(t => (
                      <div key={t.name} className="bg-black/50 rounded p-2 border border-white/5">
                        <p className="text-[10px] font-semibold text-cyan-400 font-mono mb-1">{t.name}</p>
                        <div className="space-y-0.5">
                          {t.columns.map(c => <p key={c} className="text-[9px] text-zinc-500 font-mono pl-1.5">{c}</p>)}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Editor + Results */}
              <div className="lg:col-span-6 space-y-4">
                <Card className="bg-[#141414] border-white/10">
                  <CardContent className="p-0">
                    <div className="h-[200px] border-b border-white/10">
                      <Editor height="100%" language="sql" value={query} onChange={v => setQuery(v || '')} theme="vs-dark"
                        options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", padding: { top: 12 }, scrollBeyondLastLine: false }} />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <p className="text-xs text-zinc-500">SELECT queries only</p>
                      <Button data-testid="run-sql-btn" onClick={runQuery} disabled={running} className="bg-cyan-600 hover:bg-cyan-500 text-white h-8 text-xs px-4">
                        {running ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Play className="w-3 h-3 mr-1.5" />} Run Query
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                {result && (
                  <Card className="bg-[#141414] border-white/10" data-testid="sql-results">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {result.error ? <><AlertTriangle className="w-4 h-4 text-red-500" /> Error</> : <><CheckCircle className="w-4 h-4 text-green-500" /> Results ({result.row_count} rows)</>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.error ? (
                        <p className="text-sm text-red-400 font-mono">{result.error}</p>
                      ) : (
                        <div className="overflow-x-auto max-h-[300px]">
                          <table className="w-full text-xs font-mono">
                            <thead className="sticky top-0 bg-[#141414]">
                              <tr className="border-b border-white/10">
                                {result.columns.map(c => <th key={c} className="text-left p-2 text-cyan-400 font-semibold">{c}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {result.rows.map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                  {row.map((cell, j) => <td key={j} className="p-2 text-zinc-300">{cell === null ? 'NULL' : String(cell)}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* SQL Chatbot */}
              <div className="lg:col-span-4">
                <Card className="bg-[#141414] border-white/10 h-[calc(100vh-220px)] flex flex-col">
                  <CardHeader className="pb-2 pt-3 px-3 border-b border-white/10 flex-shrink-0">
                    <CardTitle className="text-xs flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-cyan-400" /> SQL Mentor</CardTitle>
                  </CardHeader>
                  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" data-testid="sql-chat-messages">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.role === 'assistant' && (
                          <div className="w-5 h-5 bg-cyan-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bot className="w-3 h-3 text-cyan-400" />
                          </div>
                        )}
                        <div className={`max-w-[90%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                          <div className={`rounded-md px-2.5 py-1.5 text-xs ${
                            msg.role === 'assistant' ? 'bg-[#0C0C0C] border border-white/10 text-zinc-300' : 'bg-cyan-600/20 border border-cyan-500/30 text-white'
                          }`}>
                            {msg.role === 'assistant' ? <div className="chat-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chatSending && (
                      <div className="flex gap-2">
                        <div className="w-5 h-5 bg-cyan-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3 h-3 text-cyan-400" />
                        </div>
                        <div className="bg-[#0C0C0C] border border-white/10 rounded-md px-2.5 py-1.5">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="px-3 py-2 border-t border-white/10 flex gap-2 flex-shrink-0">
                    <Textarea data-testid="sql-chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={chatKeyDown}
                      placeholder="Ask about SQL queries..." className="bg-black border-white/10 text-white text-xs min-h-[32px] max-h-[60px] resize-none flex-1 py-1.5" rows={1} />
                    <Button data-testid="sql-chat-send" onClick={sendChat} disabled={!chatInput.trim() || chatSending} size="sm" className="bg-cyan-600 hover:bg-cyan-500 h-8 px-2.5 self-end">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="problems">
            <div className="flex items-center gap-3 mb-4">
              <Select value={category} onValueChange={v => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="w-[180px] bg-[#141414] border-white/10 text-xs h-8" data-testid="sql-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10 max-h-[300px]">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={v => { setDifficulty(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] bg-[#141414] border-white/10 text-xs h-8" data-testid="sql-diff-filter">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-zinc-500 ml-auto">{total} problems</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {problems.map(p => (
                <Card key={p.sql_id} className="bg-[#141414] border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                      onClick={() => loadProblem(p)} data-testid={`sql-problem-${p.sql_id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-xs font-semibold truncate mr-2">{p.title}</h3>
                      <Badge className={`text-[9px] flex-shrink-0 ${diffColor(p.difficulty)}`}>{p.difficulty}</Badge>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2">{p.description}</p>
                    <Badge variant="outline" className="mt-1.5 text-[9px] border-cyan-500/30 text-cyan-400">{p.category}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="border-white/10 text-zinc-400 h-8 text-xs"><ChevronLeft className="w-3.5 h-3.5" /></Button>
                <span className="text-xs text-zinc-400">{page} / {totalPages}</span>
                <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="border-white/10 text-zinc-400 h-8 text-xs"><ChevronRight className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="schema">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schema.map(t => (
                <Card key={t.name} className="bg-[#141414] border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-mono text-cyan-400">{t.name}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1">{t.columns.map(c => <p key={c} className="text-xs text-zinc-300 font-mono bg-black/30 px-2 py-1 rounded">{c}</p>)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
