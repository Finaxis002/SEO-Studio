'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Search, Plus, MoreHorizontal, Eye, Pencil, Copy, Archive, Trash2, FileText, ChevronDown, RotateCcw, LayoutGrid } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, fetcher, fmtNum, fmtDate, initials } from '@/lib/client'
import { StatusBadge, ScoreRing, EmptyState, SkeletonTable, ConfirmDialog, Pagination } from '../bits'

const TABS = [
  { v: 'all', l: 'All' }, { v: 'draft', l: 'Drafts' }, { v: 'in_review', l: 'In Review' }, { v: 'approved', l: 'Approved' },
  { v: 'scheduled', l: 'Scheduled' }, { v: 'published', l: 'Published' }, { v: 'archived', l: 'Archived' },
]

export default function Blogs({ statusFilter, navigate, can }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(statusFilter || 'all')
  const [author, setAuthor] = useState('all')
  const [category, setCategory] = useState('all')
  const [band, setBand] = useState('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    setStatus(statusFilter || 'all')
    setPage(1)
  }, [statusFilter])

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (status !== 'all') p.set('status', status)
    if (author !== 'all') p.set('author', author)
    if (category !== 'all') p.set('category', category)
    if (band !== 'all') p.set('seoBand', band)
    p.set('sort', sort)
    p.set('page', String(page))
    p.set('limit', '9')
    return '/api/blogs?' + p.toString()
  }, [q, status, author, category, band, sort, page])

  const { data, error, mutate } = useSWR(query, fetcher)
  const { data: team } = useSWR('/api/team', fetcher)

  const items = data?.items || []
  const counts = data?.counts || {}

  const refresh = () => { mutate(); window.dispatchEvent(new Event('ss-refresh')) }

  const actionsFor = (b) => {
    const acts = [
      { label: 'View', icon: Eye, show: true, onClick: () => navigate('blog', { id: b.id }) },
      { label: 'Edit', icon: Pencil, show: can('blogs.edit'), onClick: () => navigate('editor', { id: b.id }) },
      { label: 'Duplicate', icon: Copy, show: can('blogs.create'), onClick: () => api('/blogs/' + b.id + '/duplicate', { method: 'POST' }).then(refresh) },
      { label: 'Archive', icon: Archive, show: b.status !== 'archived' && can('blogs.archive'), onClick: () => api('/blogs/' + b.id + '/transition', { method: 'POST', body: { to: 'archived' } }).then(refresh) },
      { label: 'Move to Draft', icon: RotateCcw, show: b.status === 'published' || b.status === 'scheduled' || b.status === 'archived', onClick: () => api('/blogs/' + b.id + '/transition', { method: 'POST', body: { to: 'draft' } }).then(refresh) },
    ]
    return acts
  }

  const hasFilters = q || status !== (statusFilter || 'all') || author !== 'all' || category !== 'all' || band !== 'all'

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{statusFilter ? TABS.find((t) => t.v === statusFilter)?.l + ' Blogs' : 'All Blogs'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data ? data.total + ' blogs in your workspace' : 'Loading…'}</p>
        </div>
        {can('blogs.create') && (
          <Button onClick={() => navigate('editor', { id: null })} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25">
            <Plus className="h-4 w-4 mr-1.5" /> Create Blog
          </Button>
        )}
      </div>

      {/* Tabs */}
      {!statusFilter && (
        <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <TabsList className="h-9 bg-muted/60 p-1 overflow-x-auto w-full justify-start sm:w-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.v} value={t.v} className="text-xs h-7 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {t.l} <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">{counts[t.v] ?? ''}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3.5">
          <div className="flex flex-col lg:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search blogs…" className="pl-9 bg-muted/40" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={author} onValueChange={(v) => { setAuthor(v); setPage(1) }}>
                <SelectTrigger className="w-[140px] h-9 bg-muted/40"><SelectValue placeholder="Author" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All authors</SelectItem>
                  {(team || []).map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
                <SelectTrigger className="w-[150px] h-9 bg-muted/40"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {['SEO Fundamentals', 'Technical SEO', 'Content Marketing', 'Link Building', 'Local SEO', 'Keyword Research', 'Analytics & Reporting', 'Digital Marketing'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={band} onValueChange={(v) => { setBand(v); setPage(1) }}>
                <SelectTrigger className="w-[140px] h-9 bg-muted/40"><SelectValue placeholder="SEO score" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any SEO score</SelectItem>
                  <SelectItem value="high">High (80+)</SelectItem>
                  <SelectItem value="mid">Medium (60–79)</SelectItem>
                  <SelectItem value="low">Low (&lt;60)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[160px] h-9 bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="views">Most views</SelectItem>
                  <SelectItem value="seo_high">Highest SEO score</SelectItem>
                  <SelectItem value="seo_low">Lowest SEO score</SelectItem>
                  <SelectItem value="alpha">Title A–Z</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setQ(''); setStatus(statusFilter || 'all'); setAuthor('all'); setCategory('all'); setBand('all'); setPage(1) }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden card-hover">
        {error ? (
          <EmptyState icon={FileText} title="Something went wrong" description="Unable to load your blogs. Please try again." onRetry={() => mutate()} action={null} />
        ) : !data ? (
          <SkeletonTable rows={7} cols={7} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? LayoutGrid : FileText}
            title={hasFilters ? 'No matching blogs' : 'No blogs yet'}
            description={hasFilters ? 'Try adjusting your search or filters to find what you are looking for.' : 'Create your first optimized article and start building organic traffic.'}
            action={!hasFilters && can('blogs.create') ? <Button onClick={() => navigate('editor', { id: null })}><Plus className="h-4 w-4 mr-1.5" />Create Blog</Button> : null}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                    <th className="text-left font-semibold px-4 py-3">Blog</th>
                    <th className="text-left font-semibold px-3 py-3 hidden lg:table-cell">Author</th>
                    <th className="text-left font-semibold px-3 py-3 hidden xl:table-cell">Category</th>
                    <th className="text-left font-semibold px-3 py-3 hidden md:table-cell">Date</th>
                    <th className="text-right font-semibold px-3 py-3">Views</th>
                    <th className="text-center font-semibold px-3 py-3">SEO</th>
                    <th className="text-left font-semibold px-3 py-3">Status</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors group cursor-pointer" onClick={() => navigate('blog', { id: b.id })}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {b.featuredImage?.url ? <img src={b.featuredImage.url} alt="" className="h-11 w-16 rounded-lg object-cover border border-border" /> : <div className="h-11 w-16 rounded-lg bg-muted border border-border flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>}
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[280px] group-hover:text-primary transition-colors">{b.title}</p>
                            <p className="text-[11.5px] text-muted-foreground truncate max-w-[280px]">/blog/{b.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">{initials(b.author)}</AvatarFallback></Avatar>
                          <span className="text-[13px] text-muted-foreground">{b.author}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell"><Badge variant="outline" className="text-[11px] font-normal">{b.category || '—'}</Badge></td>
                      <td className="px-3 py-3 hidden md:table-cell text-[13px] text-muted-foreground">{b.publishedAt ? fmtDate(b.publishedAt) : fmtDate(b.updatedAt)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{fmtNum(b.analytics?.views)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center"><ScoreRing value={b.seo?.score || 0} size={38} thickness={4.5} showLabel={false} /></div>
                        <span className="sr-only">SEO score {b.seo?.score}</span>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {actionsFor(b).filter((a) => a.show).map((a, i) => (
                              <DropdownMenuItem key={i} onClick={a.onClick}><a.icon className="h-4 w-4 mr-2" />{a.label}</DropdownMenuItem>
                            ))}
                            {can('blogs.delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => setConfirm({ id: b.id, title: b.title })}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </Card>

      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Delete this blog?" description={'“' + (confirm?.title || '') + '” will be permanently removed. This action cannot be undone.'} onConfirm={() => { api('/blogs/' + confirm.id, { method: 'DELETE' }).then(refresh); setConfirm(null) }} />
    </div>
  )
}
