'use client'

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import dayjs from 'dayjs'

export function Sparkline({ data = [], color = '#7c3aed', height = 40, className = '' }) {
  const d = (data || []).filter((v) => typeof v === 'number')
  if (d.length < 2) return <div style={{ height }} className={className} />
  const w = 120, h = height
  const min = Math.min(...d), max = Math.max(...d)
  const range = max - min || 1
  const pts = d.map((v, i) => [ (i / (d.length - 1)) * (w - 4) + 2, h - 4 - ((v - min) / range) * (h - 10) ])
  const line = pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
  const gid = 'sg' + color.replace(/[^a-z0-9]/gi, '')
  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} className={className} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={'2,' + (h - 2) + ' ' + line + ' ' + (w - 2) + ',' + (h - 2)} fill={'url(#' + gid + ')'} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  )
}

const axisStyle = { fontSize: 11, fill: 'hsl(240 4% 55%)' }

function ChartTip({ active, payload, label, fmt }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 shadow-xl text-popover-foreground" style={{ fontSize: 12 }}>
      <div className="font-semibold mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="ml-auto font-semibold pl-3">{fmt ? fmt(p.value, p.dataKey) : (p.value || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export function TrendChart({ data = [], xKey = 'date', series = [], height = 280, fmt, stacked = false }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={'grad-' + s.key} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="4 8" stroke="hsl(240 6% 88%)" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={(v) => (xKey === 'date' ? dayjs(v).format('MMM D') : v)} tick={axisStyle} axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v)} />
        <Tooltip content={<ChartTip fmt={fmt} />} cursor={{ stroke: 'hsl(262 83% 58% / 0.25)', strokeWidth: 1.5 }} />
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key} stroke={s.color} strokeWidth={2.2} fill={'url(#grad-' + s.key + ')'} stackId={stacked ? '1' : undefined} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function BarsChart({ data = [], xKey, bars = [], height = 260, stacked = false, fmt }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={stacked ? 0 : 4}>
        <CartesianGrid strokeDasharray="4 8" stroke="hsl(240 6% 88%)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v)} />
        <Tooltip content={<ChartTip fmt={fmt} />} cursor={{ fill: 'hsl(240 6% 50% / 0.06)' }} />
        {bars.map((b, i) => (
          <Bar key={b.key} dataKey={b.key} name={b.label || b.key} fill={b.color} stackId={stacked ? '1' : i} radius={stacked ? [0, 0, 0, 0] : [6, 6, 0, 0]} maxBarSize={26} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PositionChart({ data = [], height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 8" stroke="hsl(240 6% 88%)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format('MMM D')} tick={axisStyle} axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis reversed tick={axisStyle} axisLine={false} tickLine={false} domain={['dataMax', 1]} />
        <Tooltip content={<ChartTip />} />
        <Line type="monotone" dataKey="position" name="Avg position" stroke="#7c3aed" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data = [], size = 160, thickness = 18, center, sub }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(240 6% 92%)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total
          const dash = frac * c
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeDasharray={dash + ' ' + (c - dash)} strokeDashoffset={-offset} strokeLinecap="butt" style={{ transition: 'stroke-dasharray .6s ease' }} />
          )
          offset += dash
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {center !== undefined && <span className="text-2xl font-bold tracking-tight">{center}</span>}
        {sub && <span className="text-xs text-muted-foreground mt-0.5">{sub}</span>}
      </div>
    </div>
  )
}
