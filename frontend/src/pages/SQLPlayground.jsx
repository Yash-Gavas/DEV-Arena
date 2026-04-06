import { useState, useEffect } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { Play, Database, Table, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SQLPlayground() {
  const [query, setQuery] = useState('SELECT * FROM employees LIMIT 10;');
  const [result, setResult] = useState(null);
  const [schema, setSchema] = useState([]);
  const [problems, setProblems] = useState([]);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('playground');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/sql/schema`, { withCredentials: true }),
      axios.get(`${API}/sql/problems`, { withCredentials: true }),
    ]).then(([schemaRes, probRes]) => {
      setSchema(schemaRes.data.tables || []);
      setProblems(probRes.data.problems || []);
    }).catch(() => {});
  }, []);

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

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="sql-playground">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] flex items-center gap-2">
            <Database className="w-7 h-7 text-cyan-500" /> SQL Playground
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Practice SQL queries against a sample database</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#141414] border border-white/10 mb-4" data-testid="sql-tabs">
            <TabsTrigger value="playground" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Playground
            </TabsTrigger>
            <TabsTrigger value="problems" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Problems
            </TabsTrigger>
            <TabsTrigger value="schema" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
              <Table className="w-3.5 h-3.5 mr-1.5" /> Schema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="playground">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Schema sidebar */}
              <Card className="bg-[#141414] border-white/10 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Table className="w-4 h-4 text-cyan-500" /> Tables</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schema.map(t => (
                    <div key={t.name} className="bg-black/50 rounded p-2.5 border border-white/5">
                      <p className="text-xs font-semibold text-cyan-400 font-mono mb-1.5">{t.name}</p>
                      <div className="space-y-0.5">
                        {t.columns.map(c => (
                          <p key={c} className="text-[10px] text-zinc-400 font-mono pl-2">{c}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Editor + Results */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-[#141414] border-white/10">
                  <CardContent className="p-0">
                    <div className="h-[200px] border-b border-white/10">
                      <Editor
                        height="100%"
                        language="sql"
                        value={query}
                        onChange={v => setQuery(v || '')}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false }, fontSize: 14,
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: { top: 12 }, scrollBeyondLastLine: false,
                          lineNumbers: 'on',
                        }}
                      />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <p className="text-xs text-zinc-500">Only SELECT queries allowed</p>
                      <Button
                        data-testid="run-sql-btn"
                        onClick={runQuery}
                        disabled={running}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white h-8 text-xs px-4"
                      >
                        {running ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" /> : <Play className="w-3 h-3 mr-1.5" />}
                        Run Query
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Results */}
                {result && (
                  <Card className="bg-[#141414] border-white/10" data-testid="sql-results">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {result.error ? (
                          <><AlertTriangle className="w-4 h-4 text-red-500" /> Error</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 text-green-500" /> Results ({result.row_count} rows)</>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.error ? (
                        <p className="text-sm text-red-400 font-mono">{result.error}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-mono">
                            <thead>
                              <tr className="border-b border-white/10">
                                {result.columns.map(c => (
                                  <th key={c} className="text-left p-2 text-cyan-400 font-semibold">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.rows.map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                  {row.map((cell, j) => (
                                    <td key={j} className="p-2 text-zinc-300">{cell === null ? 'NULL' : String(cell)}</td>
                                  ))}
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
            </div>
          </TabsContent>

          <TabsContent value="problems">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {problems.map(p => (
                <Card key={p.sql_id} className="bg-[#141414] border-white/10 hover:border-white/20 transition-all cursor-pointer"
                      onClick={() => loadProblem(p)} data-testid={`sql-problem-${p.sql_id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">{p.title}</h3>
                      <Badge className={`text-[10px] ${p.difficulty === 'Easy' ? 'bg-green-600/20 text-green-400' : p.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-red-600/20 text-red-400'}`}>{p.difficulty}</Badge>
                    </div>
                    <p className="text-xs text-zinc-400">{p.description}</p>
                    <Badge variant="outline" className="mt-2 text-[10px] border-cyan-500/30 text-cyan-400">{p.category}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="schema">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schema.map(t => (
                <Card key={t.name} className="bg-[#141414] border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono text-cyan-400">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {t.columns.map(c => (
                        <p key={c} className="text-xs text-zinc-300 font-mono bg-black/30 px-2 py-1 rounded">{c}</p>
                      ))}
                    </div>
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
