import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, Code2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const diffColors = {
  Easy: 'bg-green-600/20 text-green-400 border-green-500/30',
  Medium: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
  Hard: 'bg-red-600/20 text-red-400 border-red-500/30',
};

export default function DSAProblems() {
  const [problems, setProblems] = useState([]);
  const [meta, setMeta] = useState({ topics: [], patterns: [], companies: [], difficulties: [] });
  const [filters, setFilters] = useState({ topic: '', pattern: '', difficulty: '', company: '', search: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/problems/meta`, { withCredentials: true }).then(r => setMeta(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 50 });
    if (filters.topic) params.set('topic', filters.topic);
    if (filters.pattern) params.set('pattern', filters.pattern);
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.company) params.set('company', filters.company);
    if (filters.search) params.set('search', filters.search);
    axios.get(`${API}/problems?${params}`, { withCredentials: true })
      .then(r => {
        setProblems(r.data.problems || []);
        setTotalPages(r.data.pages || 1);
        setTotal(r.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, page]);

  const clearFilters = () => {
    setFilters({ topic: '', pattern: '', difficulty: '', company: '', search: '' });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="dsa-problems-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] flex items-center gap-2">
            <Code2 className="w-7 h-7 text-blue-500" /> DSA Problem Bank
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{total} problems across topics, patterns, and companies</p>
        </div>

        {/* Filters */}
        <Card className="bg-[#141414] border-white/10 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  data-testid="search-input"
                  placeholder="Search problems..."
                  value={filters.search}
                  onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                  className="pl-9 bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500 h-9"
                />
              </div>
              <Select value={filters.topic} onValueChange={v => { setFilters(f => ({ ...f, topic: v === 'all' ? '' : v })); setPage(1); }}>
                <SelectTrigger className="w-[160px] bg-black border-white/10 h-9" data-testid="topic-filter">
                  <SelectValue placeholder="Topic" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  <SelectItem value="all">All Topics</SelectItem>
                  {meta.topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.pattern} onValueChange={v => { setFilters(f => ({ ...f, pattern: v === 'all' ? '' : v })); setPage(1); }}>
                <SelectTrigger className="w-[180px] bg-black border-white/10 h-9" data-testid="pattern-filter">
                  <SelectValue placeholder="Pattern" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  <SelectItem value="all">All Patterns</SelectItem>
                  {meta.patterns.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.difficulty} onValueChange={v => { setFilters(f => ({ ...f, difficulty: v === 'all' ? '' : v })); setPage(1); }}>
                <SelectTrigger className="w-[140px] bg-black border-white/10 h-9" data-testid="difficulty-filter">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.company} onValueChange={v => { setFilters(f => ({ ...f, company: v === 'all' ? '' : v })); setPage(1); }}>
                <SelectTrigger className="w-[160px] bg-black border-white/10 h-9" data-testid="company-filter">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  <SelectItem value="all">All Companies</SelectItem>
                  {meta.companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {Object.values(filters).some(v => v) && (
                <button onClick={clearFilters} className="text-xs text-blue-400 hover:text-blue-300" data-testid="clear-filters">
                  Clear all
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Problems Table */}
        <Card className="bg-[#141414] border-white/10">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : problems.length === 0 ? (
              <div className="text-center py-16">
                <Code2 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No problems found with these filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="problems-table">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-zinc-500 uppercase tracking-wider">
                      <th className="text-left p-3 w-12">#</th>
                      <th className="text-left p-3">Title</th>
                      <th className="text-left p-3 hidden sm:table-cell">Topic</th>
                      <th className="text-left p-3 hidden md:table-cell">Pattern</th>
                      <th className="text-left p-3">Difficulty</th>
                      <th className="text-left p-3 hidden lg:table-cell">Companies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.map((p, i) => (
                      <tr
                        key={p.problem_id}
                        onClick={() => navigate(`/problems/${p.problem_id}`)}
                        data-testid={`problem-row-${p.problem_id}`}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="p-3 text-zinc-500 font-mono text-xs">{(page - 1) * 50 + i + 1}</td>
                        <td className="p-3 font-medium text-white">{p.title}</td>
                        <td className="p-3 hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs border-white/20 text-zinc-300">{p.topic}</Badge>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">{p.pattern}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={`text-xs ${diffColors[p.difficulty] || ''}`}>{p.difficulty}</Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {p.companies?.slice(0, 3).map(c => (
                              <span key={c} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-zinc-400">{c}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-white/10">
                <p className="text-xs text-zinc-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
