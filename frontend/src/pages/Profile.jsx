import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { User, Save, BrainCircuit, Award, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ bio: '', college: '', target_role: '' });
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (user) {
      setForm({ bio: user.bio || '', college: user.college || '', target_role: user.target_role || '' });
    }
    axios.get(`${API}/reports`, { withCredentials: true })
      .then(r => setReports(r.data.reports || []))
      .catch(() => {});
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/profile`, form, { withCredentials: true });
      setUser(res.data);
    } catch {}
    setSaving(false);
  };

  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((a, r) => a + (r.overall_score || 0), 0) / reports.length) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="profile-page">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] mb-6 flex items-center gap-2">
          <User className="w-7 h-7 text-blue-500" /> Profile
        </h1>

        {/* User Info */}
        <Card className="bg-[#141414] border-white/10 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              {user?.picture && (
                <img src={user.picture} alt="" className="w-16 h-16 rounded-full border-2 border-blue-500/30" />
              )}
              <div>
                <h2 className="text-xl font-bold font-['Chivo']">{user?.name}</h2>
                <p className="text-sm text-zinc-400">{user?.email}</p>
                <p className="text-xs text-zinc-600 mt-1">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-black/50 rounded-md border border-white/5">
                <BrainCircuit className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold font-['Chivo']">{user?.interviews_completed || 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Interviews</p>
              </div>
              <div className="text-center p-3 bg-black/50 rounded-md border border-white/5">
                <Award className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold font-['Chivo']">{avgScore || '--'}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Score</p>
              </div>
              <div className="text-center p-3 bg-black/50 rounded-md border border-white/5">
                <BookOpen className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xl font-bold font-['Chivo']">{reports.length}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Reports</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-1.5 block">Bio</label>
                <Textarea
                  data-testid="bio-input"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-1.5 block">College</label>
                  <Input
                    data-testid="college-input"
                    value={form.college}
                    onChange={e => setForm(f => ({ ...f, college: e.target.value }))}
                    placeholder="Your college"
                    className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-1.5 block">Target Role</label>
                  <Input
                    data-testid="target-role-input"
                    value={form.target_role}
                    onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}
                    placeholder="e.g. SDE-2 at Google"
                    className="bg-black border-white/10 text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <Button
                data-testid="save-profile-btn"
                onClick={save}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
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
                  <a
                    key={r.report_id}
                    href={`/reports/${r.report_id}`}
                    data-testid={`report-${r.report_id}`}
                    className="flex items-center justify-between p-3 rounded-md bg-[#0A0A0A] hover:bg-[#1E1E1E] transition-colors"
                  >
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
