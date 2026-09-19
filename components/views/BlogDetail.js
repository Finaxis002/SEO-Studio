'use client'

import useSWR from 'swr'
import { ArrowLeft, Pencil, Eye, Copy, Archive, MoreHorizontal, FileText, Globe, Clock, MousePointerClick, Hash, Image as ImageIcon, Link2, Activity as ActivityIcon, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api, fetcher, fmtNum, fmtDate, timeAgo, initials } from '@/lib/client'
import { analyzeSeo } from '@/lib/seo'
import { StatusBadge, ScoreRing, EmptyState, CheckItem } from '../bits'
import { Donut } from '../charts'
import { useState } from 'react'
import { ConfirmDialog } from '../bits'

export default function BlogDetail({ blogId, navigate, can }) {
  const { data: b, error, mutate } = useSWR(blogId ? '/api/blogs/' + blogId : null, fetcher)
  const { data: activity } = useSWR('/api/activity', fetcher)
  const { data: media } = useSWR('/api/media', fetcher)
  const [confirm, setConfirm] = useState(false)

  if (error) return <EmptyState title="Blog not found" description="It may have been deleted." action={<Button onClick={() => navigate('blogs', {})}>Back to blogs</Button>} />
  if (!b) return <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /></div>

  const analysis = analyzeSeo(b)
  const blogActivity = (activity?.items || []).filter((a) => a.resource && a.resource.includes(b.title.slice(0, 20))).slice(0, 10)
  const usedMedia = (media || []).filter((m) => (m.usedIn || []).some((u) => u.blogId === b.id))
  const hrefs = [...(b.contentHtml || '').matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1])
  const internalHrefs = hrefs.filter((h) => h.startsWith('/'))
  const externalHrefs = hrefs.filter((h) => /^https?:\/\//.test(h))

  const metrics = [
    { label: 'Views', value: fmtNum(b.analytics?.views), icon: Eye, color: 'text-violet-600' },
    { label: 'Organic Traffic', value: fmtNum(b.analytics?.organic), icon: Globe, color: 'text-emerald-600' },
    { label: 'Avg Time', value: Math.round((b.analytics?.avgTime || 0) / 60) + 'm', icon: Clock, color: 'text-sky-600' },
    { label: 'Bounce Rate', value: (b.analytics?.bounce || 0) + '%', icon: MousePointerClick, color: 'text-amber-600' },
    { label: 'Conversions', value: fmtNum(b.analytics?.conversions), icon: CheckCircle2, color: 'text-indigo-600' },
    { label: 'Impressions', value: fmtNum(b.analytics?.impressions), icon: Hash, color: 'text-fuchsia-600' },
  ]

  return (
    <div className="space-y-5 animate-fade-up">
      <button onClick={() => navigate('blogs', {})} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" /> Back to all blogs</button>

      {/* Header */}
      <Card className="card-hover overflow-hidden">
        <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center gap-5">
          {b.featuredImage?.url && <img src={b.featuredImage.url} alt="" className="w-full lg:w-56 h-32 object-cover rounded-xl border border-border" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={b.status} />
              <Badge variant="outline" className="text-[11px] font-normal">{b.category}</Badge>
              {b.scheduledAt && b.status === 'scheduled' && <Badge variant="outline" className="text-[11px] font-normal border-violet-200 text-violet-600 dark:border-violet-900 dark:text-violet-300">⏰ {fmtDate(b.scheduledAt)}</Badge>}
            </div>
            <h1 className="text-xl font-bold tracking-tight mt-2 leading-snug">{b.title}</h1>
            <div className="flex items-center gap-3 mt-3 text-[12.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-violet-100 text-violet-700">{initials(b.author)}</AvatarFallback></Avatar>{b.author}</span>
              <span>·</span><span>{b.publishedAt ? 'Published ' + fmtDate(b.publishedAt) : 'Created ' + fmtDate(b.createdAt)}</span>
              <span>·</span><span>{b.wordCount} words</span>
            </div>
          </div>
          <div className="flex lg:flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <ScoreRing value={b.seo?.score || 0} size={58} thickness={6} />
              <div className="text-[12px] leading-tight"><p className="font-bold">SEO Score</p><p className="text-muted-foreground">{analysis.checks.filter((c) => c.ok).length}/{analysis.checks.length} checks</p></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('editor', { id: b.id })}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="px-2"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('editor', { id: b.id })}><Eye className="h-4 w-4 mr-2" />Preview in editor</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => api('/blogs/' + b.id + '/duplicate', { method: 'POST' }).then(() => { mutate(); window.dispatchEvent(new Event('ss-refresh')) })}><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
                  {can('blogs.archive') && b.status !== 'archived' && <DropdownMenuItem onClick={() => api('/blogs/' + b.id + '/transition', { method: 'POST', body: { to: 'archived' } }).then(mutate)}><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>}
                  {can('blogs.delete') && <DropdownMenuItem className="text-rose-600" onClick={() => setConfirm(true)}><FileText className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="content">
        <TabsList className="h-9 justify-start overflow-x-auto w-full bg-muted/60 p-1">
          <TabsTrigger value="content" className="text-xs px-3 h-7">Content</TabsTrigger>
          <TabsTrigger value="seo" className="text-xs px-3 h-7">SEO Information</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs px-3 h-7">Analytics</TabsTrigger>
          <TabsTrigger value="images" className="text-xs px-3 h-7">Images ({usedMedia.length})</TabsTrigger>
          <TabsTrigger value="links" className="text-xs px-3 h-7">Internal Links ({internalHrefs.length})</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs px-3 h-7">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <Card><CardContent className="p-6 lg:p-8">
            <div className="prose-studio max-w-3xl" dangerouslySetInnerHTML={{ __html: b.contentHtml }} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="seo" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-[15px]">Metadata</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-[13px]">
                {[['SEO title', b.seo?.metaTitle || b.title], ['Meta description', b.seo?.metaDescription || '—'], ['Focus keyword', b.seo?.focusKeyword || '—'], ['Slug', '/blog/' + b.slug], ['Canonical', b.seo?.canonical || '—'], ['Robots', (b.seo?.robots?.index ? 'Index' : 'No Index') + ' · ' + (b.seo?.robots?.follow ? 'Follow' : 'No Follow')], ['Secondary keywords', (b.seo?.secondaryKeywords || []).join(', ') || '—']].map(([k, v]) => (
                  <div key={k} className="flex gap-4 border-b border-border/60 pb-2.5 last:border-0">
                    <span className="w-40 shrink-0 text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[15px]">SEO Checklist</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analysis.checks.map((c) => (
                  <CheckItem key={c.id} status={c.ok ? 'pass' : c.warn ? 'warn' : 'fail'}>
                    {c.label} {c.value && c.value !== '—' ? <span className="text-muted-foreground">({c.value})</span> : null}
                  </CheckItem>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {metrics.map((m) => (
              <Card key={m.label}><CardContent className="p-4">
                <m.icon className={'h-4 w-4 ' + m.color} />
                <p className="text-lg font-bold mt-2 tabular-nums">{m.value}</p>
                <p className="text-[11px] text-muted-foreground">{m.label}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card className="mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-[15px]">Keyword rankings for this page</CardTitle></CardHeader>
            <CardContent>
              {b.seo?.focusKeyword ? (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <KeyRoundIcon />
                  <div className="flex-1"><p className="text-[13px] font-semibold">{b.seo.focusKeyword}</p><p className="text-[11.5px] text-muted-foreground">Focus keyword</p></div>
                  <Badge variant="outline">Check Keyword Manager →</Badge>
                </div>
              ) : <p className="text-sm text-muted-foreground">No focus keyword set.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="mt-4">
          {usedMedia.length === 0 ? <Card><CardContent><EmptyState icon={ImageIcon} title="No images used" description="Images from the media library used in this blog will appear here." /></CardContent></Card> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {usedMedia.map((m) => (
                <Card key={m.id} className="card-hover overflow-hidden"><img src={m.url} alt={m.alt} className="h-36 w-full object-cover" />
                  <CardContent className="p-3"><p className="text-[12.5px] font-medium truncate">{m.name}</p><p className="text-[11px] text-muted-foreground">{m.dimensions?.width}×{m.dimensions?.height} · {Math.round(m.size / 1024)} KB</p></CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-[14px]">Internal links</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {internalHrefs.length ? internalHrefs.map((h, i) => <div key={i} className="flex items-center gap-2 text-[13px] rounded-lg border border-border px-3 py-2"><Link2 className="h-3.5 w-3.5 text-violet-500" /><span className="truncate">{h}</span></div>) : <p className="text-[13px] text-muted-foreground">No internal links — add some from the editor&apos;s Links tab.</p>}
              </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-[14px]">External links</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {externalHrefs.length ? externalHrefs.map((h, i) => <div key={i} className="flex items-center gap-2 text-[13px] rounded-lg border border-border px-3 py-2"><ExternalLink className="h-3.5 w-3.5 text-sky-500" /><span className="truncate">{h}</span></div>) : <p className="text-[13px] text-muted-foreground">No external links yet.</p>}
              </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card><CardContent className="p-4 space-y-3">
            {blogActivity.length ? blogActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-[13px] flex-1"><span className="font-semibold">{a.user}</span> {a.action.replace(/_/g, ' ')} <span className="text-muted-foreground">— {a.resource}</span></p>
                <span className="text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No activity recorded for this blog yet.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Delete this blog?" description="This action cannot be undone." onConfirm={() => { api('/blogs/' + b.id, { method: 'DELETE' }).then(() => navigate('blogs', {})); setConfirm(false) }} />
    </div>
  )
}

function KeyRoundIcon() {
  return <span className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 flex items-center justify-center"><Hash className="h-4 w-4 text-violet-500" /></span>
}
