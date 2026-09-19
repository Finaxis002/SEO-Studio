'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Search, Plus, Upload, Download, KeyRound, TrendingUp, TrendingDown, Trash2, Sparkles, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { api, fetcher, fmtNum, downloadCsv } from '@/lib/client'
import { EmptyState, Labeled, ConfirmDialog } from '../bits'
import { Sparkline, PositionChart } from '../charts'

const diffColor = (d) => d >= 70 ? 'bg-rose-500' : d >= 40 ? 'bg-amber-500' : 'bg-emerald-500'

export default function Keywords({ navigate, can }) {
  const [q, setQ] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [csv, setCsv] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [nk, setNk] = useState({ keyword: '', volume: '', difficulty: '', position: '' })

  const { data: keywords, error, mutate } = useSWR('/api/keywords?q=' + encodeURIComponent(q), fetcher)

  const exportCsv = () => {
    if (!keywords?.length) return
    downloadCsv('keywords.csv', [['Keyword', 'Volume', 'Difficulty', 'Position', 'Previous', 'Target URL'], ...keywords.map((k) => [k.keyword, k.volume, k.difficulty, k.position, k.previousPosition, k.targetUrl])])
    toast.success('Exported ' + keywords.length + ' keywords')
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Keyword Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{keywords ? keywords.length + ' tracked keywords · ' + (keywords || []).filter((k) => k.position <= 10).length + ' in top 10' : 'Loading…'}</p>
        </div>
        {can('seo.keywords') && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1.5" />Import CSV</Button>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Keyword</Button>
          </div>
        )}
      </div>

      <Card><CardContent className="p-3.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search keywords…" className="pl-9 bg-muted/40" />
        </div>
      </CardContent></Card>

      <Card className="overflow-hidden card-hover">
        {error ? <EmptyState title="Something went wrong" onRetry={() => mutate()} />
          : !keywords ? <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : keywords.length === 0 ? <EmptyState icon={KeyRound} title="No keywords yet" description="Track the keywords that matter to your content strategy." action={can('seo.keywords') ? <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Keyword</Button> : null} />
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                        {['Keyword', 'Volume', 'Difficulty', 'Position', 'Trend', 'Target URL', 'Status'].map((h, i) => <th key={h} className={'font-semibold px-3 py-3 ' + (i === 0 ? 'text-left pl-4' : i === 3 || i === 1 ? 'text-right' : 'text-left')}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map((k) => (
                        <tr key={k.id} onClick={() => setSelected(k)} className="border-b border-border/60 last:border-0 hover:bg-accent/40 cursor-pointer transition-colors">
                          <td className="pl-4 pr-3 py-3 font-medium">{k.keyword}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{fmtNum(k.volume)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden"><div className={'h-full rounded-full ' + diffColor(k.difficulty)} style={{ width: k.difficulty + '%' }} /></div>
                              <span className="text-xs tabular-nums text-muted-foreground">{k.difficulty}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="font-bold tabular-nums">#{k.position}</span>
                            <span className={'ml-1.5 text-[11px] font-semibold ' + (k.position <= k.previousPosition ? 'text-emerald-600' : 'text-rose-600')}>
                              {k.position <= k.previousPosition ? '▲' : '▼'}{Math.abs(k.previousPosition - k.position)}
                            </span>
                          </td>
                          <td className="px-3 py-3 w-24"><Sparkline data={k.trend} color={k.position <= k.previousPosition ? '#10b981' : '#f43f5e'} height={28} /></td>
                          <td className="px-3 py-3 text-[12.5px] text-muted-foreground truncate max-w-[180px]">{k.targetUrl || '—'}</td>
                          <td className="px-3 py-3">
                            <Badge variant="outline" className={'text-[11px] ' + (k.status === 'top3' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300' : k.status === 'improving' ? 'border-violet-200 text-violet-700 dark:border-violet-900 dark:text-violet-300' : 'border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300')}>
                              {k.status === 'top3' ? 'Top 3' : k.status === 'improving' ? 'Improving' : 'Needs attention'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
      </Card>

      {/* Add keyword */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add keyword</DialogTitle><DialogDescription>Start tracking a new keyword. Metrics can be edited later.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-1">
            <Labeled label="Keyword" required><Input value={nk.keyword} onChange={(e) => setNk({ ...nk, keyword: e.target.value })} placeholder="e.g. technical SEO" /></Labeled>
            <div className="grid grid-cols-3 gap-2">
              <Labeled label="Volume"><Input type="number" value={nk.volume} onChange={(e) => setNk({ ...nk, volume: e.target.value })} placeholder="5400" /></Labeled>
              <Labeled label="Difficulty"><Input type="number" value={nk.difficulty} onChange={(e) => setNk({ ...nk, difficulty: e.target.value })} placeholder="62" /></Labeled>
              <Labeled label="Position"><Input type="number" value={nk.position} onChange={(e) => setNk({ ...nk, position: e.target.value })} placeholder="12" /></Labeled>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!nk.keyword.trim()) { toast.error('Keyword is required'); return } api('/keywords', { method: 'POST', body: nk }).then(() => { toast.success('Keyword added'); setAddOpen(false); setNk({ keyword: '', volume: '', difficulty: '', position: '' }); mutate() }).catch((e) => toast.error(e.message)) }}>Add keyword</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Import keywords from CSV</DialogTitle><DialogDescription>Paste CSV rows: keyword, volume, difficulty, position, target URL</DialogDescription></DialogHeader>
          <Textarea rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'keyword,volume,difficulty,position,target url\ntechnical seo,5400,62,4,/blog/audit'} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={() => api('/keywords/import', { method: 'POST', body: { csv } }).then((r) => { toast.success(r.imported + ' keywords imported'); setImportOpen(false); setCsv(''); mutate() }).catch((e) => toast.error(e.message))}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:w-[460px] overflow-y-auto sm:max-w-[460px] p-5">
          {selected && <KeywordDetail k={selected} mutate={mutate} can={can} setConfirmDel={setConfirmDel} navigate={navigate} />}
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} title="Delete keyword?" description={'Tracking for “' + (confirmDel?.keyword || '') + '” will be removed.'} onConfirm={() => { api('/keywords/' + confirmDel.id, { method: 'DELETE' }).then(() => { toast.success('Keyword deleted'); mutate(); setSelected(null) }); setConfirmDel(null) }} />
    </div>
  )
}

function KeywordDetail({ k, mutate, can, setConfirmDel, navigate }) {
  const history = (k.history || []).map((h, i) => ({ date: new Date(Date.now() - (11 - i) * 7 * 86400000).toISOString(), position: h.position }))
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{k.keyword}</h3>
          {can('seo.keywords') && <Button size="icon" variant="ghost" className="text-rose-600" onClick={() => setConfirmDel(k)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
        <p className="text-[12.5px] text-muted-foreground">{k.country} · {k.intent} intent</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['Volume', fmtNum(k.volume)], ['Difficulty', k.difficulty], ['Position', '#' + k.position]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border p-3 text-center"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-base font-bold mt-1">{v}</p></div>
        ))}
      </div>
      <div>
        <p className="text-[12px] font-semibold mb-1.5">Search volume &amp; ranking trend</p>
        <PositionChart data={history} height={180} />
      </div>
      <div>
        <p className="text-[12px] font-semibold mb-1.5">SERP features</p>
        <div className="flex flex-wrap gap-1.5">{(k.serpFeatures || []).length ? k.serpFeatures.map((f) => <Badge key={f} variant="outline" className="text-[10.5px] font-normal">{f}</Badge>) : <span className="text-[12px] text-muted-foreground">None</span>}</div>
      </div>
      <div>
        <p className="text-[12px] font-semibold mb-1.5">Related keywords</p>
        <div className="flex flex-wrap gap-1.5">{(k.related || []).map((r) => <Badge key={r} variant="outline" className="text-[10.5px] font-normal bg-muted/50">{r}</Badge>)}</div>
      </div>
      {k.targetBlog && (
        <div>
          <p className="text-[12px] font-semibold mb-1.5">Target blog</p>
          <div className="flex items-center gap-2 rounded-xl border border-border p-3">
            <FileText className="h-4 w-4 text-violet-500" />
            <span className="text-[13px] flex-1 truncate">{k.targetBlog}</span>
            <Button size="sm" variant="outline" onClick={() => navigate('keywords', {})}>View</Button>
          </div>
        </div>
      )}
      <div>
        <p className="text-[12px] font-semibold mb-1.5">Content opportunities</p>
        <ul className="space-y-1.5 text-[12.5px] text-muted-foreground">
          <li>• Add an FAQ section targeting “{k.keyword}” questions for featured snippets.</li>
          <li>• Update the target page with fresh 2025 data to defend the position.</li>
          <li>• Build internal links from newer posts using descriptive anchors.</li>
        </ul>
      </div>
    </div>
  )
}
