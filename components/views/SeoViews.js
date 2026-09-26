'use client'

import useSWR from 'swr'
import { AlertTriangle, CheckCircle2, Gauge, ShieldAlert, Wand2, ArrowRight, FileText, XCircle, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/client'
import { analyzeSeo } from '@/lib/seo'
import { ScoreRing, SevBadge, EmptyState } from '../bits'
import { Donut } from '../charts'

// ---------------- SEO OVERVIEW ----------------
export function SeoOverview({ navigate }) {
  const { data: stats } = useSWR('/api/stats', fetcher)
  const { data: issues } = useSWR('/api/seo-issues', fetcher)
  const { data: blogs } = useSWR('/api/blogs?limit=100&status=published', fetcher)

  const bands = { high: 0, mid: 0, low: 0 }
  ;(blogs?.items || []).forEach((b) => { const s = b.seo?.score || 0; if (s >= 80) bands.high++; else if (s >= 60) bands.mid++; else bands.low++ })

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">SEO Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Content health across your whole workspace.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2"><CardTitle className="text-[15px]">Average score</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-5">
            <Donut size={110} thickness={12} center={stats?.kpis?.seoScore?.value ?? '—'} sub="/ 100" data={[{ name: 'score', value: Math.max(stats?.kpis?.seoScore?.value || 1, 1), color: '#7c3aed' }, { name: 'rest', value: 100 - (stats?.kpis?.seoScore?.value || 0), color: '#ececf1' }]} />
            <div className="text-[12.5px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Score distribution</p>
              <p>{bands.high} excellent · {bands.mid} fair · {bands.low} poor</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2"><CardTitle className="text-[15px]">Open issues</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <button onClick={() => navigate('issues', {})} className="w-full flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30 px-3 py-2.5 hover:border-rose-300 transition-colors">
              <span className="text-[13px] font-medium text-rose-700 dark:text-rose-300">Critical</span><span className="font-bold text-rose-600">{issues?.summary?.critical ?? '—'}</span>
            </button>
            <button onClick={() => navigate('issues', {})} className="w-full flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2.5 hover:border-amber-300 transition-colors">
              <span className="text-[13px] font-medium text-amber-700 dark:text-amber-300">Warnings</span><span className="font-bold text-amber-600">{issues?.summary?.warnings ?? '—'}</span>
            </button>
            <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 px-3 py-2.5">
              <span className="text-[13px] font-medium text-emerald-700 dark:text-emerald-300">Passed audits</span><span className="font-bold text-emerald-600">{issues?.summary?.passed ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2"><CardTitle className="text-[15px]">Quick wins</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-[12.5px] text-muted-foreground">
            {[['Write meta descriptions for drafts', 'issues'], ['Add alt text to every image', 'issues'], ['Reach 600+ words on thin pages', 'optimization'], ['Add internal links to new posts', 'optimization']].map(([l, to]) => (
              <button key={l} onClick={() => navigate(to, {})} className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent transition-colors text-left"><Sparkles className="h-3.5 w-3.5 text-violet-500" /><span className="flex-1 text-foreground">{l}</span><ArrowRight className="h-3.5 w-3.5" /></button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-[15px]">Published content scores</CardTitle></CardHeader>
        <CardContent>
          {!blogs ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
            <div className="space-y-1.5">
              {blogs.items.map((b) => (
                <button key={b.id} onClick={() => navigate('editor', { id: b.id })} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors text-left">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-[13px] font-medium truncate flex-1">{b.title}</span>
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block"><div className={'h-full rounded-full ' + (b.seo?.score >= 75 ? 'bg-emerald-500' : b.seo?.score >= 50 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: (b.seo?.score || 0) + '%' }} /></div>
                  <span className="text-[12px] font-bold tabular-nums w-8 text-right">{b.seo?.score}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------- SEO ISSUES ----------------
export function SeoIssues({ navigate }) {
  const { data, error } = useSWR('/api/seo-issues', fetcher)
  if (error) return <EmptyState title="Something went wrong" onRetry={() => location.reload()} />
  if (!data) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>

  const cards = [
    { label: 'Critical', value: data.summary.critical, icon: XCircle, cls: 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30', icls: 'text-rose-500', sub: 'Fix immediately' },
    { label: 'Warnings', value: data.summary.warnings, icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30', icls: 'text-amber-500', sub: 'Should fix soon' },
    { label: 'Passed', value: data.summary.passed, icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30', icls: 'text-emerald-500', sub: 'Audits passing' },
  ]

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">SEO Issues</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Crawler-style audit across all active blogs and media.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={c.cls + ' card-hover'}><CardContent className="p-5 flex items-center gap-4">
            <span className={'h-11 w-11 rounded-xl bg-white/70 dark:bg-black/20 flex items-center justify-center ' + c.icls}><c.icon className="h-5.5 w-5.5" style={{ width: 22, height: 22 }} /></span>
            <div><p className="text-2xl font-bold tabular-nums leading-none">{c.value}</p><p className="text-[12px] font-medium mt-1">{c.label} · <span className="text-muted-foreground font-normal">{c.sub}</span></p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="space-y-3">
        {data.issues.length === 0 && <Card><CardContent><EmptyState icon={CheckCircle2} title="No issues found" description="Every audited blog passes the SEO checklist. Great job!" /></CardContent></Card>}
        {data.issues.map((iss) => (
          <Card key={iss.id} className="card-hover">
            <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-[14px]">{iss.title}</h3>
                  <SevBadge severity={iss.severity} />
                  <Badge variant="outline" className="text-[11px] font-normal">{iss.affected.length} affected</Badge>
                </div>
                <p className="text-[12.5px] text-muted-foreground mt-1">{iss.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {iss.affected.slice(0, 6).map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (iss.fixTarget === 'media') navigate('media', {})
                        else if (a.id) navigate('editor', { id: a.id, focus: iss.fixTarget })
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/80 bg-muted/40 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 dark:hover:bg-violet-950/40 dark:hover:border-violet-700 dark:hover:text-violet-300 text-[11px] font-medium max-w-[280px] truncate transition-colors cursor-pointer text-left group"
                      title={`Fix in "${a.title || a.name || 'this item'}"`}
                    >
                      <span className="truncate">{a.title || a.name || 'Untitled'}</span>
                      <ArrowRight className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 shrink-0 transition-opacity" />
                    </button>
                  ))}
                  {iss.affected.length > 6 && (
                    <Badge variant="outline" className="text-[10.5px] font-normal self-center">
                      +{iss.affected.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
              <Button onClick={() => {
                if (iss.fixTarget === 'media') navigate('media', {})
                else if (iss.affected[0] && iss.affected[0].id) navigate('editor', { id: iss.affected[0].id, focus: iss.fixTarget })
              }}>
                Fix issue <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------- CONTENT OPTIMIZATION ----------------
export function ContentOptimization({ navigate }) {
  const { data: blogs, error } = useSWR('/api/blogs?limit=100&status=published', fetcher)
  if (error) return <EmptyState title="Something went wrong" onRetry={() => location.reload()} />

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Content Optimization</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Keep published posts sharp — fix the top failing checks first.</p>
      </div>
      {!blogs ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div> : blogs.items.length === 0 ? (
        <Card><CardContent><EmptyState icon={FileText} title="No published blogs" description="Publish a blog to start optimizing it." /></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {blogs.items.map((b) => {
            const a = analyzeSeo(b)
            const failing = a.checks.filter((c) => !c.ok).slice(0, 3)
            return (
              <Card key={b.id} className="card-hover">
                <CardContent className="p-4 flex flex-col lg:flex-row gap-4 lg:items-center">
                  <ScoreRing value={a.score} size={56} thickness={6} />
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate('blog', { id: b.id })} className="text-[14px] font-semibold hover:text-primary transition-colors text-left">{b.title}</button>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {failing.length === 0 && <Badge variant="outline" className="text-[10.5px] border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300">All checks passing ✓</Badge>}
                      {failing.map((f) => <Badge key={f.id} variant="outline" className="text-[10.5px] font-normal border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300">{f.label}</Badge>)}
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => navigate('editor', { id: b.id, focus: 'seo' })}><Wand2 className="h-4 w-4 mr-1.5" />Optimize</Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
