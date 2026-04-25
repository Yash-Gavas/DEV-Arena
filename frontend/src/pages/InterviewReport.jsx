import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, ArrowLeft, CheckCircle, XCircle, TrendingUp, AlertTriangle, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const recColors = {
  'Strong Hire': 'bg-green-600/20 text-green-400 border-green-500/30',
  'Hire': 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  'Lean Hire': 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
  'No Hire': 'bg-red-600/20 text-red-400 border-red-500/30',
};

export default function InterviewReport() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/reports/${reportId}`, { withCredentials: true })
      .then(r => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pt-20 flex items-center justify-center">
        <p className="text-zinc-500">Report not found</p>
      </div>
    );
  }

  const scoreColor = report.overall_score >= 75 ? 'text-green-400' : report.overall_score >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="interview-report">
      <div className="max-w-4xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <BarChart3 className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo']">Interview Report</h1>
          <p className="text-zinc-400 text-sm mt-1">{report.role} - {new Date(report.created_at).toLocaleDateString()}</p>
        </div>

        {/* Overall Score */}
        <Card className="bg-[#141414] border-white/10 mb-6">
          <CardContent className="p-6 text-center">
            <p className="text-xs tracking-[0.15em] uppercase font-bold text-zinc-400 mb-2">Overall Score</p>
            <p className={`text-6xl font-black font-['Chivo'] ${scoreColor}`} data-testid="overall-score">
              {report.overall_score}
            </p>
            <p className="text-sm text-zinc-500 mt-1">out of 100</p>
            <Badge className={`mt-3 ${recColors[report.recommendation] || 'bg-zinc-600/20 text-zinc-400'}`} data-testid="recommendation">
              <Award className="w-3 h-3 mr-1" /> {report.recommendation}
            </Badge>
            {report.proctoring_violations > 0 && (
              <p className="text-xs text-red-400 mt-2 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {report.proctoring_violations} proctoring violations detected (-{Math.min(report.proctoring_violations * 5, 30)} points)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Round Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {(report.rounds || []).map(r => {
            const notConducted = r.score === 0 || r.feedback?.toLowerCase().includes('not conducted');
            return (
              <Card key={r.round} className={`bg-[#141414] border-white/10 ${notConducted ? 'opacity-50' : ''}`} data-testid={`round-score-${r.round}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">R{r.round}: {r.name}</p>
                    {notConducted ? (
                      <span className="text-xs text-zinc-600 font-mono">N/A</span>
                    ) : (
                      <span className={`text-lg font-bold font-['Chivo'] ${
                        r.score >= 75 ? 'text-green-400' : r.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{r.score}</span>
                    )}
                  </div>
                  {!notConducted && <Progress value={r.score} className="h-1.5 mb-2" />}
                  <p className="text-xs text-zinc-400">{r.feedback}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-[#141414] border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(report.strengths || []).map((s, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-[#141414] border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-400">
                <XCircle className="w-4 h-4" /> Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(report.improvements || []).map((s, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Feedback */}
        <Card className="bg-[#141414] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Detailed Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap" data-testid="detailed-feedback">
              {report.detailed_feedback}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
