import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code2, LayoutDashboard, BookOpen, BrainCircuit, LogOut, Swords, Database, Eye, Menu, X } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/interview', label: 'Interview', icon: BrainCircuit },
  { path: '/problems', label: 'Problems', icon: Code2 },
  { path: '/sql', label: 'SQL Lab', icon: Database },
  { path: '/visualizer', label: '3D View', icon: Eye },
  { path: '/resources', label: 'Resources', icon: BookOpen },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10" data-testid="main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/dashboard" className="flex items-center gap-2 group" data-testid="logo-link">
            <Swords className="w-6 h-6 text-blue-500" />
            <span className="font-black text-lg tracking-tight font-['Chivo']">DEV-Arena</span>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {user.picture && <img src={user.picture} alt="" className="w-7 h-7 rounded-full border border-white/20" />}
              <span className="text-xs text-zinc-300 hidden sm:block">{user.name?.split(' ')[0]}</span>
            </Link>
            <button onClick={logout} data-testid="logout-btn" className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-1.5 text-zinc-400" data-testid="mobile-menu-btn">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-white/5 py-2 px-4">
          <div className="grid grid-cols-3 gap-2">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md text-[10px] ${
                    isActive ? 'text-blue-400 bg-blue-600/10' : 'text-zinc-500'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
