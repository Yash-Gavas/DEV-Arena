import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Swords, BrainCircuit, Code2, Shield, BarChart3, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';

const features = [
  { icon: BrainCircuit, title: 'AI Interviewer', desc: 'Real interview experience with an AI that asks DSA, projects, core CS, and system design questions across 4 rounds.' },
  { icon: Code2, title: '150+ DSA Problems', desc: 'Topic-wise and pattern-wise problem bank. Sliding Window, Two Pointers, DP, Graphs, and more.' },
  { icon: Shield, title: 'Proctored Sessions', desc: 'Tab switch detection and integrity monitoring. Your interview, kept honest.' },
  { icon: BarChart3, title: 'Detailed Reports', desc: 'AI-generated evaluation with scores per round, strengths, improvements, and hire recommendation.' },
  { icon: BookOpen, title: '15,000+ Problems', desc: 'Massive DSA bank with topic, pattern, and company filters. Code IDE with AI evaluation.' },
  { icon: Swords, title: 'Voice + Proctored', desc: 'Answer verbally with speech input. AI reads questions aloud. Tab switch monitoring.' },
];

export default function LandingPage() {
  const { user, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="landing-page">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://static.prod-images.emergentagent.com/jobs/808f257a-41bf-4244-a650-c63e9d50cfe0/images/ad7b2e61289a1f3e868b3f78fe20c6c46b346ea94d5f35c2b2f69c0b7bd404d3.png"
            alt="" className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />
          <div className="absolute inset-0 grid-overlay" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6 animate-fade-in-up">
              <Swords className="w-8 h-8 text-blue-500" />
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-zinc-400">Technical Interview Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black font-['Chivo'] mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              DEV-Arena
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed mb-8 max-w-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Face a real AI interviewer. 4 rounds. DSA, projects, core CS, system design.
              Proctored. Scored. Never the same questions twice.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Button
                data-testid="get-started-btn"
                onClick={login}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 text-base font-semibold rounded-md transition-all duration-150 flex items-center gap-2"
              >
                Start Your Interview <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-zinc-500 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> 15,000+ Problems</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> 4-Round Interviews</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Proctored</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
        <div className="mb-12">
          <span className="text-xs tracking-[0.2em] uppercase font-bold text-blue-500">Features</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl tracking-tight font-bold font-['Chivo'] mt-2">Everything you need to crack interviews</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-[#141414] border border-white/10 rounded-md p-6 hover:border-white/25 hover:-translate-y-1 transition-all duration-150"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <f.icon className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center border-t border-white/5">
        <h2 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] mb-4">Ready to prove yourself?</h2>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">Sign in with Google and face your AI interviewer. No fluff, just real preparation.</p>
        <Button
          data-testid="cta-get-started-btn"
          onClick={login}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 text-base font-semibold rounded-md"
        >
          Enter the Arena
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Swords className="w-5 h-5 text-blue-500" />
          <span className="font-bold font-['Chivo']">DEV-Arena</span>
        </div>
        <p className="text-xs text-zinc-600">AI-Powered Technical Interview Platform</p>
      </footer>
    </div>
  );
}
