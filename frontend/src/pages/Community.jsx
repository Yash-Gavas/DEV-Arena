import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import {
  Users, Plus, Heart, MessageCircle, Building2, Briefcase, Star,
  ChevronLeft, ChevronRight, Send, X, Loader2, TrendingUp, Filter, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const resultColors = {
  Selected: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  Rejected: 'bg-red-600/20 text-red-400 border-red-500/30',
  Pending: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
};
const diffColors = {
  Easy: 'bg-emerald-600/20 text-emerald-400', Medium: 'bg-amber-600/20 text-amber-400', Hard: 'bg-red-600/20 text-red-400',
};

function StarRating({ rating, onChange, readonly = false }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => !readonly && onChange?.(i)} disabled={readonly}
          className={`${readonly ? '' : 'hover:scale-110 cursor-pointer'} transition-transform`}>
          <Star className={`w-4 h-4 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
        </button>
      ))}
    </div>
  );
}

function PostCard({ post, onLike, onComment, onDelete, currentUserId }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isAuthor = currentUserId && post.user_id === currentUserId;

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(true);
    await onDelete(post.post_id);
    setDeleting(false);
  };

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    await onComment(post.post_id, commentText);
    setCommentText('');
    setSubmitting(false);
  };

  const timeAgo = (iso) => {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Card className="bg-[#141414] border-white/10 hover:border-white/20 transition-all" data-testid={`post-${post.post_id}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">
                {(post.author?.name || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">{post.author?.name || 'Anonymous'}</p>
              <p className="text-[10px] text-zinc-500">{timeAgo(post.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {post.type === 'review' && post.rating && <StarRating rating={post.rating} readonly />}
            {post.result && <Badge className={`text-[9px] ${resultColors[post.result] || 'bg-white/5 text-zinc-400'}`}>{post.result}</Badge>}
            {post.difficulty && <Badge className={`text-[9px] ${diffColors[post.difficulty] || ''}`}>{post.difficulty}</Badge>}
            {isAuthor && (
              <button onClick={handleDelete} disabled={deleting}
                className="text-zinc-600 hover:text-red-400 transition-colors ml-1"
                data-testid={`delete-post-${post.post_id}`} title="Delete post">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Company + Role */}
        {(post.company || post.role) && (
          <div className="flex items-center gap-3 mb-2">
            {post.company && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                <Building2 className="w-3 h-3" /> {post.company}
              </span>
            )}
            {post.role && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                <Briefcase className="w-3 h-3" /> {post.role}
              </span>
            )}
          </div>
        )}

        {/* Title + Content */}
        <h3 className="text-sm font-semibold mb-2">{post.title}</h3>
        <div className="text-xs text-zinc-300 leading-relaxed mb-3 chat-markdown line-clamp-6">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {post.tags.map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 bg-blue-600/10 text-blue-400 rounded border border-blue-500/20">{t}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t border-white/5">
          <button onClick={() => onLike(post.post_id)}
            className={`flex items-center gap-1 text-xs transition-colors ${post.liked_by_me ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'}`}
            data-testid={`like-${post.post_id}`}>
            <Heart className={`w-3.5 h-3.5 ${post.liked_by_me ? 'fill-red-400' : ''}`} />
            <span>{post.likes_count || 0}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-400 transition-colors"
            data-testid={`comment-toggle-${post.post_id}`}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{post.comments_count || 0}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-white/5">
            {(post.comments || []).map(c => (
              <div key={c.comment_id} className="mb-2 pl-3 border-l-2 border-white/10">
                <p className="text-[10px] text-zinc-500 mb-0.5"><span className="font-semibold text-zinc-400">{c.author_name}</span> - {timeAgo(c.created_at)}</p>
                <p className="text-xs text-zinc-300">{c.content}</p>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-black border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                data-testid={`comment-input-${post.post_id}`} />
              <Button size="sm" onClick={handleComment} disabled={!commentText.trim() || submitting}
                className="bg-blue-600 hover:bg-blue-500 h-7 px-2" data-testid={`comment-send-${post.post_id}`}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('newest');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formType, setFormType] = useState('experience');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formDifficulty, setFormDifficulty] = useState('Medium');
  const [formResult, setFormResult] = useState('');
  const [formTags, setFormTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/community/posts`, {
        params: { type: tab !== 'all' ? tab : undefined, page, limit: 20, sort },
        withCredentials: true
      });
      setPosts(res.data.posts || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch {}
    setLoading(false);
  }, [tab, page, sort]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    axios.get(`${API}/community/stats`, { withCredentials: true })
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  const handleLike = async (postId) => {
    try {
      const res = await axios.post(`${API}/community/posts/${postId}/like`, {}, { withCredentials: true });
      setPosts(prev => prev.map(p => p.post_id === postId
        ? { ...p, liked_by_me: res.data.liked, likes_count: res.data.likes_count }
        : p
      ));
    } catch {}
  };

  const handleComment = async (postId, content) => {
    try {
      const res = await axios.post(`${API}/community/posts/${postId}/comment`, { content }, { withCredentials: true });
      setPosts(prev => prev.map(p => p.post_id === postId
        ? { ...p, comments: [...(p.comments || []), res.data], comments_count: (p.comments_count || 0) + 1 }
        : p
      ));
    } catch {}
  };

  const handleDelete = async (postId) => {
    try {
      await axios.delete(`${API}/community/posts/${postId}`, { withCredentials: true });
      setPosts(prev => prev.filter(p => p.post_id !== postId));
      setTotal(prev => prev - 1);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/community/posts`, {
        type: formType,
        company: formCompany,
        role: formRole,
        title: formTitle,
        content: formContent,
        rating: formType === 'review' ? formRating : null,
        difficulty: formType === 'experience' ? formDifficulty : '',
        result: formType === 'experience' ? formResult : '',
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean)
      }, { withCredentials: true });
      setShowForm(false);
      setFormTitle(''); setFormContent(''); setFormCompany(''); setFormRole('');
      setFormTags(''); setFormResult('');
      fetchPosts();
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="community-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-500" /> Community
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Share interview experiences & review DEV-Arena</p>
          </div>
          <Button data-testid="create-post-btn" onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-4">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Share
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Posts', value: stats.total || 0, color: 'text-blue-400' },
            { label: 'Experiences', value: stats.experiences || 0, color: 'text-emerald-400' },
            { label: 'Reviews', value: stats.reviews || 0, color: 'text-purple-400' },
            { label: 'Avg Rating', value: stats.avg_rating ? `${stats.avg_rating}/5` : '-', color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#141414] rounded-md p-3 border border-white/10 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1); }}>
            <TabsList className="bg-[#141414] border border-white/10" data-testid="community-tabs">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">All</TabsTrigger>
              <TabsTrigger value="experience" className="text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">Experiences</TabsTrigger>
              <TabsTrigger value="review" className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">Reviews</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={sort} onValueChange={v => { setSort(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] bg-[#141414] border-white/10 text-xs h-8" data-testid="sort-select">
              <Filter className="w-3 h-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#141414] border-white/10">
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Liked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(p => (
              <PostCard key={p.post_id} post={p} onLike={handleLike} onComment={handleComment} onDelete={handleDelete} currentUserId={user?.user_id} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="border-white/10 text-zinc-400 h-8 text-xs"><ChevronLeft className="w-3.5 h-3.5" /></Button>
            <span className="text-xs text-zinc-400">{page} / {totalPages}</span>
            <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="border-white/10 text-zinc-400 h-8 text-xs"><ChevronRight className="w-3.5 h-3.5" /></Button>
          </div>
        )}

        {/* Create Post Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" data-testid="create-post-modal">
            <div className="bg-[#141414] border border-white/10 rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-sm font-bold">Share with Community</h2>
                <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                {/* Type Toggle */}
                <div className="flex gap-2">
                  <button onClick={() => setFormType('experience')} data-testid="type-experience-btn"
                    className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${formType === 'experience' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-black border border-white/10 text-zinc-400'}`}>
                    Interview Experience
                  </button>
                  <button onClick={() => setFormType('review')} data-testid="type-review-btn"
                    className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${formType === 'review' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-black border border-white/10 text-zinc-400'}`}>
                    Platform Review
                  </button>
                </div>

                {/* Company + Role (for experience) */}
                {formType === 'experience' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input value={formCompany} onChange={e => setFormCompany(e.target.value)} placeholder="Company name"
                      className="bg-black border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      data-testid="form-company" />
                    <input value={formRole} onChange={e => setFormRole(e.target.value)} placeholder="Role applied for"
                      className="bg-black border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      data-testid="form-role" />
                  </div>
                )}

                {/* Rating (for review) */}
                {formType === 'review' && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">Rating:</span>
                    <StarRating rating={formRating} onChange={setFormRating} />
                  </div>
                )}

                {/* Title */}
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Title"
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  data-testid="form-title" />

                {/* Content */}
                <Textarea value={formContent} onChange={e => setFormContent(e.target.value)}
                  placeholder={formType === 'experience'
                    ? "Share your interview experience... rounds, questions asked, difficulty, tips..."
                    : "Share your review of DEV-Arena... what you liked, improvements, features..."
                  }
                  className="bg-black border-white/10 text-white text-xs min-h-[150px]"
                  data-testid="form-content" />

                {/* Difficulty + Result (for experience) */}
                {formType === 'experience' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={formDifficulty} onValueChange={setFormDifficulty}>
                      <SelectTrigger className="bg-black border-white/10 text-xs h-8" data-testid="form-difficulty">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-white/10">
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={formResult} onValueChange={setFormResult}>
                      <SelectTrigger className="bg-black border-white/10 text-xs h-8" data-testid="form-result">
                        <SelectValue placeholder="Result" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-white/10">
                        <SelectItem value="Selected">Selected</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Tags */}
                <input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="Tags (comma separated): DSA, System Design, Google"
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  data-testid="form-tags" />

                <Button onClick={handleSubmit} disabled={!formTitle.trim() || !formContent.trim() || submitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2.5 font-semibold" data-testid="submit-post-btn">
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Plus className="w-3 h-3 mr-1.5" />}
                  Post
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
