import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { BrainCircuit, Code2, BookOpen, BarChart3, Clock, ChevronRight, Swords, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [reports, setReports] = useState([]);
  const [problemCount, setProblemCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [intRes, rptRes, probRes] = await Promise.all([
          axios.get(`${API}/interviews`, { withCredentials: true }),
          axios.get(`${API}/reports`, { withCredentials: true }),
          axios.get(`${API}/problems?limit=1`, { withCredentials: true }),
        ]);
        setInterviews(intRes.data.interviews || []);
        setReports(rptRes.data.reports || []);
        setProblemCount(probRes.data.total || 0);
      } catch {}
    };
    load();
  }, []);

  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((a, r) => a + (r.overall_score || 0), 0) / reports.length)
    : 0;

  const stats = [
    { label: 'Interviews', value: user?.interviews_completed || 0, icon: BrainCircuit, color: 'text-blue-500' },
    { label: 'Avg Score', value: avgScore || '--', icon: TrendingUp, color: 'text-green-500' },
    { label: 'DSA Problems', value: problemCount, icon: Code2, color: 'text-yellow-500' },
    { label: 'Reports', value: reports.length, icon: BarChart3, color: 'text-purple-500' },
  ];

  const quickActions = [
    { label: 'Start Interview', desc: 'Face the AI interviewer', icon: BrainCircuit, path: '/interview', color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'Code IDE', desc: 'Solve DSA problems', icon: Code2, path: '/ide', color: 'bg-[#1E1E1E] hover:bg-[#252525] border border-white/10' },
    { label: 'DSA Mentor', desc: 'AI chatbot helper', icon: BookOpen, path: '/chatbot', color: 'bg-[#1E1E1E] hover:bg-[#252525] border border-white/10' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl tracking-tight font-bold font-['Chivo']">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Your command center for interview preparation</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <Card key={i} className="bg-[#141414] border-white/10 hover:border-white/20 transition-all" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold font-['Chivo']">{s.value}</p>
                  <p className="text-xs text-zinc-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {quickActions.map((a, i) => (
            <button
              key={i}
              onClick={() => navigate(a.path)}
              data-testid={`action-${a.label.toLowerCase().replace(/\s/g, '-')}`}
              className={`${a.color} rounded-md p-5 text-left transition-all duration-150 group`}
            >
              <a.icon className="w-6 h-6 mb-3 text-white" />
              <h3 className="font-semibold text-white mb-1">{a.label}</h3>
              <p className="text-sm text-zinc-300">{a.desc}</p>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white mt-2 transition-colors" />
            </button>
          ))}
        </div>

        {/* Recent Interviews */}
        <Card className="bg-[#141414] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-['Chivo'] flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" /> Recent Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {interviews.length === 0 ? (
              <div className="text-center py-8">
                <Swords className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No interviews yet. Start your first one!</p>
                <Button
                  data-testid="first-interview-btn"
                  onClick={() => navigate('/interview')}
                  className="mt-4 bg-blue-600 hover:bg-blue-500 text-sm"
                >
                  Start Interview
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {interviews.slice(0, 5).map(iv => (
                  <Link
                    key={iv.interview_id}
                    to={iv.report_id ? `/reports/${iv.report_id}` : `/interview/${iv.interview_id}`}
                    data-testid={`interview-${iv.interview_id}`}
                    className="flex items-center justify-between p-3 rounded-md bg-[#0A0A0A] hover:bg-[#1E1E1E] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">{iv.role || 'Software Engineer'}</p>
                        <p className="text-xs text-zinc-500">{new Date(iv.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={iv.status === 'completed' ? 'default' : 'secondary'}
                        className={iv.status === 'completed' ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30'}>
                        {iv.status === 'completed' ? 'Completed' : `Round ${iv.current_round}/4`}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
