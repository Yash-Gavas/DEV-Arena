import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  User, Save, BrainCircuit, Award, BookOpen, Zap, Code2, Star,
  Users, Flame, Compass, Database, Shield, Lock, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BADGE_ICONS = {
  zap: Zap, code: Code2, award: Award, brain: BrainCircuit, star: Star,
  users: Users, flame: Flame, compass: Compass, database: Database, shield: Shield,
};

function BadgeCard({ badge }) {
  const Icon = BADGE_ICONS[badge.icon] || Award;
  const earned = badge.earned;
  return (
    <div data-testid={`badge-${badge.id}`}
      className={`relative p-3 rounded-lg border text-center transition-all ${
        earned
          ? 'bg-[#141414] border-white/15 hover:border-white/25'
          : 'bg-[#0C0C0C] border-white/5 opacity-50'
      }`}>
      <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${
        earned ? '' : 'bg-zinc-900'
      }`} style={earned ? { backgroundColor: `${badge.color}20` } : {}}>
        {earned ? (
          <Icon className="w-5 h-5" style={{ color: badge.color }} />
        ) : (
          <Lock className="w-4 h-4 text-zinc-700" />
        )}
      </div>
      <p className={`text-xs font-semibold ${earned ? 'text-white' : 'text-zinc-600'}`}>{badge.name}</p>
      <p className="text-[9px] text-zinc-500 mt-0.5 leading-tight">{badge.desc}</p>
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ bio: '', college: '', target_role: '' });
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState([]);
  const [profileStats, setProfileStats] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({ bio: user.bio || '', college: user.college || '', target_role: user.target_role || '' });
    }
    const load = async () => {
      try {
        const [rptRes, statsRes] = await Promise.all([
          axios.get(`${API}/reports`, { withCredentials: true }),
          axios.get(`${API}/profile/stats`, { withCredentials: true }),
        ]);
        setReports(rptRes.data.reports || []);
        setProfileStats(statsRes.data);
      } catch {}
    };
    load();
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/profile`, form, { withCredentials: true });
      setUser(res.data);
    } catch {}
    setSaving(false);
  };

  const xp = profileStats?.xp || 0;
  const rank = profileStats?.rank || { name: 'Novice', color: '#6B7280' };
  const nextRank = rank.next;
  const xpProgress = nextRank ? ((xp - (xp < 100 ? 0 : xp < 500 ? 100 : xp < 1500 ? 500 : xp < 5000 ? 1500 : 5000)) / (nextRank.xp_needed - (xp < 100 ? 0 : xp < 500 ? 100 : xp < 1500 ? 500 : xp < 5000 ? 1500 : 5000))) * 100 : 100;
  const earnedBadges = (profileStats?.badges || []).filter(b => b.earned).length;
  const totalBadges = (profileStats?.badges || []).length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="profile-page">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] mb-6 flex items-center gap-2">
          <User className="w-7 h-7 text-blue-500" /> Profile
        </h1>

        {/* Rank & XP Card */}
        <Card className="bg-[#141414] border-white/10 mb-6" data-testid="rank-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-16 h-16 rounded-full border-2" style={{ borderColor: rank.color }} />
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center bg-zinc-900" style={{ borderColor: rank.color }}>
                    <User className="w-7 h-7 text-zinc-500" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold font-['Chivo']">{user?.name}</h2>
                  <p className="text-sm text-zinc-400">{user?.email}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <TrendingUp className="w-4 h-4" style={{ color: rank.color }} />
                  <span className="text-lg font-bold font-['Chivo']" style={{ color: rank.color }} data-testid="rank-name">
                    {rank.name}
                  </span>
                </div>
                <p className="text-xs text-zinc-500" data-testid="xp-display">{xp.toLocaleString()} XP</p>
              </div>
            </div>

            {/* XP Progress Bar */}
            {nextRank && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-500">{rank.name}</span>
                  <span className="text-[10px] text-zinc-500">{nextRank.name} ({nextRank.xp_needed} XP)</span>
                </div>
                <div className="w-full bg-[#0A0A0A] rounded-full h-2 border border-white/5" data-testid="xp-progress-bar">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(2, xpProgress))}%`, backgroundColor: rank.color }} />
                </div>
              </div>
            )}

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Interviews', value: profileStats?.stats?.interviews_completed || 0, icon: BrainCircuit, color: 'text-blue-500' },
                { label: 'Problems Solved', value: profileStats?.stats?.problems_solved || 0, icon: Code2, color: 'text-emerald-500' },
                { label: 'Streak', value: `${profileStats?.streak || 0}d`, icon: Flame, color: 'text-orange-500' },
                { label: 'Badges', value: `${earnedBadges}/${totalBadges}`, icon: Award, color: 'text-amber-500' },
              ].map(s => (
                <div key={s.label} className="text-center p-2.5 bg-black/50 rounded-md border border-white/5">
                  <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                  <p className="text-lg font-bold font-['Chivo']">{s.value}</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Badges Grid */}
        <Card className="bg-[#141414] border-white/10 mb-6" data-testid="badges-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-['Chivo'] flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Badges
              <span className="text-xs text-zinc-500 font-normal ml-auto">{earnedBadges} / {totalBadges} earned</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {(profileStats?.badges || []).map(b => (
                <BadgeCard key={b.id} badge={b} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card className="bg-[#141414] border-white/10 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-['Chivo']">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-1.5 block">Bio</label>
                <Textarea data-testid="bio-input" value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500 min-h-[80px]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-1.5 block">College</label>
                  <Input data-testid="college-input" value={form.college}
                    onChange={e => setForm(f => ({ ...f, college: e.target.value }))}
                    placeholder="Your college" className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-1.5 block">Target Role</label>
                  <Input data-testid="target-role-input" value={form.target_role}
                    onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}
                    placeholder="e.g. SDE-2 at Google" className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <Button data-testid="save-profile-btn" onClick={save} disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white">
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Interview History */}
        <Card className="bg-[#141414] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-['Chivo']">Interview History</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6">No interview reports yet</p>
            ) : (
              <div className="space-y-2">
                {reports.map(r => (
                  <a key={r.report_id} href={`/reports/${r.report_id}`} data-testid={`report-${r.report_id}`}
                    className="flex items-center justify-between p-3 rounded-md bg-[#0A0A0A] hover:bg-[#1E1E1E] transition-colors">
                    <div>
                      <p className="text-sm font-medium">{r.role || 'Software Engineer'}</p>
                      <p className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold font-['Chivo'] ${
                        r.overall_score >= 75 ? 'text-green-400' : r.overall_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{r.overall_score}</span>
                      <Badge className={`text-[10px] ${
                        r.recommendation === 'Strong Hire' || r.recommendation === 'Hire' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                      }`}>{r.recommendation}</Badge>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
