'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Search, History as HistoryIcon, Globe, PenLine, Image as ImageIcon, RefreshCw, Trash2, CheckCircle2, CalendarClock, Copy, Archive, Users2, Upload, Download, Wand2, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher, initials, timeAgo } from '@/lib/client'
import { EmptyState, Pagination } from '../bits'

const ACTIONS = ['created', 'updated', 'published', 'changed_status', 'approved', 'scheduled', 'archived', 'duplicated', 'deleted', 'uploaded', 'updated_seo_title', 'invited', 'removed', 'imported', 'exported', 'resolved']
const ACT_ICON = { published: Globe, created: PenLine, uploaded: ImageIcon, changed_status: RefreshCw, updated: PenLine, approved: CheckCircle2, deleted: Trash2, scheduled: CalendarClock, duplicated: Copy, archived: Archive, invited: Users2, removed: Trash2, imported: Upload, exported: Download, resolved: CheckCircle2, updated_seo_title: PenLine }

export default function ActivityView() {
  const [q, setQ] = useState('')
  const [userF, setUserF] = useState('all')
  const [actionF, setActionF] = useState('all')
  const [page, setPage] = useState(1)

  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (userF !== 'all') p.set('user', userF)
    if (actionF !== 'all') p.set('action', actionF)
    p.set('page', String(page))
    return '/api/activity?' + p.toString()
  }, [q, userF, actionF, page])

  const { data, error } = useSWR(url, fetcher)
  const { data: team } = useSWR('/api/team', fetcher)

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Activity Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{data ? data.total + ' events across your workspace' : 'Loading…'}</p>
      </div>

      <Card><CardContent className="p-3.5 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search by resource…" className="pl-9 bg-muted/40" />
        </div>
        <Select value={userF} onValueChange={(v) => { setUserF(v); setPage(1) }}>
          <SelectTrigger className="w-[170px] h-9 bg-muted/40"><SelectValue placeholder="User" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All users</SelectItem>{(team || []).map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={actionF} onValueChange={(v) => { setActionF(v); setPage(1) }}>
          <SelectTrigger className="w-[160px] h-9 bg-muted/40"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All actions</SelectItem>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </CardContent></Card>

      <Card className="overflow-hidden card-hover">
        {error ? <EmptyState icon={HistoryIcon} title="Something went wrong" onRetry={() => setPage(1)} />
          : !data ? <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            : data.items.length === 0 ? <EmptyState icon={HistoryIcon} title="No activity found" description="Try different filters." />
              : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                          {['User', 'Action', 'Resource', 'Device · IP', 'Status', 'When'].map((h, i) => <th key={i} className={'font-semibold px-3 py-3 ' + (i === 0 ? 'text-left pl-4' : 'text-left')}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((a) => {
                          const Icon = ACT_ICON[a.action] || HistoryIcon
                          return (
                            <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors">
                              <td className="pl-4 pr-3 py-3">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[9px] font-bold bg-gradient-to-br from-violet-500 to-indigo-500 text-white">{initials(a.user)}</AvatarFallback></Avatar>
                                  <div><p className="font-medium text-[13px]">{a.user}</p><p className="text-[11px] text-muted-foreground">{a.userRole}</p></div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium"><Icon className="h-3.5 w-3.5 text-violet-500" />{a.action.replace(/_/g, ' ')}</span>
                              </td>
                              <td className="px-3 py-3 text-[12.5px]">
                                <span className="text-muted-foreground capitalize">{a.resourceType}</span> · <span className="font-medium">{a.resource}</span>
                              </td>
                              <td className="px-3 py-3 text-[12px] text-muted-foreground">{a.device}<br />{a.ip}</td>
                              <td className="px-3 py-3"><Badge variant="outline" className={'text-[11px] ' + (a.status === 'success' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300' : 'border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-300')}>{a.status}</Badge></td>
                              <td className="px-3 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{timeAgo(a.createdAt)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={data.page} pages={data.pages} onPage={setPage} />
                </>
              )}
      </Card>
    </div>
  )
}
