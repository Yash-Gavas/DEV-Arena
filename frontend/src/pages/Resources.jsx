import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Monitor, Database, Globe, Layout, Box, Terminal, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Monitor, Database, Globe, Layout, Box, Terminal
};

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/resources`, { withCredentials: true })
      .then(r => setResources(r.data.resources || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="resources-page">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-500" /> CS Resources
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Master core CS subjects for technical interviews</p>
        </div>

        {resources.length === 0 ? (
          <p className="text-zinc-500 text-center py-10">No resources available</p>
        ) : (
          <Tabs defaultValue={resources[0]?.subject_slug} className="w-full">
            <TabsList className="bg-[#141414] border border-white/10 p-1 flex-wrap h-auto gap-1 mb-6" data-testid="resource-tabs">
              {resources.map(res => {
                const IconComp = iconMap[res.icon] || BookOpen;
                return (
                  <TabsTrigger
                    key={res.subject_slug}
                    value={res.subject_slug}
                    data-testid={`tab-${res.subject_slug}`}
                    className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 text-zinc-400 text-xs px-3 py-1.5 rounded-sm"
                  >
                    <IconComp className="w-3.5 h-3.5 mr-1.5" />
                    {res.subject.split(' ').slice(0, 2).join(' ')}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {resources.map(res => {
              const IconComp = iconMap[res.icon] || BookOpen;
              return (
                <TabsContent key={res.subject_slug} value={res.subject_slug}>
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <IconComp className="w-6 h-6" style={{ color: res.color }} />
                      <h2 className="text-xl font-bold font-['Chivo']">{res.subject}</h2>
                    </div>
                    {res.interview_tips && (
                      <div className="bg-blue-600/10 border border-blue-500/20 rounded-md p-3 mt-3">
                        <p className="text-xs text-blue-400 font-semibold mb-1">Interview Tip</p>
                        <p className="text-sm text-zinc-300">{res.interview_tips}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(res.topics || []).map((topic, i) => (
                      <Card key={i} className="bg-[#141414] border-white/10 hover:border-white/20 transition-all" data-testid={`topic-card-${i}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <ChevronRight className="w-4 h-4" style={{ color: res.color }} />
                            {topic.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1.5">
                            {(topic.concepts || []).map((c, j) => (
                              <Badge
                                key={j}
                                variant="outline"
                                className="text-[10px] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/25 transition-colors"
                              >
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
}
