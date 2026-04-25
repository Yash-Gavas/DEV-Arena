import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  BrainCircuit, Code2, BookOpen, BarChart3, Clock, ChevronRight, Swords,
  TrendingUp, Award, Flame, Zap
} from 'lucide-react';
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
  const [profileStats, setProfileStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [intRes, rptRes, probRes, statsRes] = await Promise.all([
          axios.get(`${API}/interviews`, { withCredentials: true }),
          axios.get(`${API}/reports`, { withCredentials: true }),
          axios.get(`${API}/problems?limit=1`, { withCredentials: true }),
          axios.get(`${API}/profile/stats`, { withCredentials: true }),
        ]);
        setInterviews(intRes.data.interviews || []);
        setReports(rptRes.data.reports || []);
        setProblemCount(probRes.data.total || 0);
        setProfileStats(statsRes.data);
      } catch {}
    };
    load();
  }, []);

  const rank = profileStats?.rank || { name: 'Novice', color: '#6B7280' };
  const xp = profileStats?.xp || 0;
  const streak = profileStats?.streak || 0;
  const earnedBadges = (profileStats?.badges || []).filter(b => b.earned);

  const stats = [
    { label: 'XP', value: xp.toLocaleString(), icon: Zap, color: rank.color },
    { label: 'Streak', value: `${streak}d`, icon: Flame, color: 'text-orange-500', rawColor: '#F97316' },
    { label: 'Problems Solved', value: profileStats?.stats?.problems_solved || 0, icon: Code2, color: 'text-emerald-500', rawColor: '#22C55E' },
    { label: 'Interviews', value: profileStats?.stats?.interviews_completed || 0, icon: BrainCircuit, color: 'text-blue-500', rawColor: '#3B82F6' },
  ];

  const quickActions = [
    { label: 'Start Interview', desc: 'Face the AI interviewer', icon: BrainCircuit, path: '/interview', color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'Solve Problems', desc: 'DSA with built-in IDE & AI help', icon: Code2, path: '/problems', color: 'bg-[#1E1E1E] hover:bg-[#252525] border border-white/10' },
    { label: 'Resources', desc: 'CS fundamentals & guides', icon: BookOpen, path: '/resources', color: 'bg-[#1E1E1E] hover:bg-[#252525] border border-white/10' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Welcome + Rank */}
        <div className="flex items-start justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl tracking-tight font-bold font-['Chivo']">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">Your command center for interview preparation</p>
          </div>
          <button onClick={() => navigate('/profile')}
            className="flex items-center gap-2 bg-[#141414] border border-white/10 rounded-md px-3 py-2 hover:border-white/20 transition-all"
            data-testid="rank-badge">
            <TrendingUp className="w-4 h-4" style={{ color: rank.color }} />
            <span className="text-sm font-bold font-['Chivo']" style={{ color: rank.color }}>{rank.name}</span>
            <span className="text-xs text-zinc-500">{xp} XP</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <Card key={i} className="bg-[#141414] border-white/10 hover:border-white/20 transition-all" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className="w-8 h-8" style={{ color: s.rawColor || s.color }} />
                <div>
                  <p className="text-2xl font-bold font-['Chivo']">{s.value}</p>
                  <p className="text-xs text-zinc-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Earned Badges Preview */}
        {earnedBadges.length > 0 && (
          <Card className="bg-[#141414] border-white/10 mb-8" data-testid="badges-preview">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold font-['Chivo'] flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" /> Your Badges
                </h3>
                <button onClick={() => navigate('/profile')} className="text-xs text-blue-400 hover:text-blue-300">
                  View All <ChevronRight className="w-3 h-3 inline" />
                </button>
              </div>
              <div className="flex gap-3 flex-wrap">
                {earnedBadges.map(b => (
                  <div key={b.id} className="flex items-center gap-1.5 bg-black/50 rounded-md px-2.5 py-1.5 border border-white/5"
                    data-testid={`earned-badge-${b.id}`}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${b.color}20` }}>
                      <Award className="w-3 h-3" style={{ color: b.color }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: b.color }}>{b.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {quickActions.map((a, i) => (
            <button key={i} onClick={() => navigate(a.path)}
              data-testid={`action-${a.label.toLowerCase().replace(/\s/g, '-')}`}
              className={`${a.color} rounded-md p-5 text-left transition-all duration-150 group`}>
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
                <Button data-testid="first-interview-btn" onClick={() => navigate('/interview')}
                  className="mt-4 bg-blue-600 hover:bg-blue-500 text-sm">
                  Start Interview
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {interviews.slice(0, 5).map(iv => (
                  <Link key={iv.interview_id}
                    to={iv.report_id ? `/reports/${iv.report_id}` : `/interview/${iv.interview_id}`}
                    data-testid={`interview-${iv.interview_id}`}
                    className="flex items-center justify-between p-3 rounded-md bg-[#0A0A0A] hover:bg-[#1E1E1E] transition-colors group">
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
