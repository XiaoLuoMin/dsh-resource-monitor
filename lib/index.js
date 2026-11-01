// dsh-resource-monitor — host half.
// Samples the local Windows machine once a minute, keeps a 30-day history on disk,
// and serves a downsampled view to the sidebar tab.
import { execFile } from 'node:child_process'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { cpus, freemem, homedir, totalmem } from 'node:os'
import { join } from 'node:path'

export const name = 'dsh-resource-monitor'
export const inject = ['connection']

const SNAPSHOT_PATH = '/api/resource-monitor.snapshot'
const SAMPLE_MS = 60_000
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_ROWS = 31 * 1440 + 120

// Thresholds used by the alert rules. Kept in one place so the UI copy and the
// host rules cannot drift apart.
const RULES = {
  cpuHotPct: 85,
  cpuHotMinutes: 10,
  memHotPct: 90,
  memHotMinutes: 10,
  throttleFreqPct: 70,
  throttleCpuPct: 50,
  throttleMinutes: 5
}

const DATA_DIR = join(homedir(), '.dsh', 'data', 'resource-monitor')
const DATA_FILE = join(DATA_DIR, 'samples.jsonl')

const PS_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$out = [ordered]@{ freq = $null; diskR = $null; diskW = $null; netRxCum = $null; netTxCum = $null }
try {
  $s = (Get-Counter '\\Processor Information(_Total)\\% of Maximum Frequency', '\\PhysicalDisk(_Total)\\Disk Read Bytes/sec', '\\PhysicalDisk(_Total)\\Disk Write Bytes/sec' -MaxSamples 1).CounterSamples
  if ($s -and $s.Count -ge 3) {
    $out.freq = [Math]::Round([double]$s[0].CookedValue, 1)
    $out.diskR = [Math]::Round([double]$s[1].CookedValue, 0)
    $out.diskW = [Math]::Round([double]$s[2].CookedValue, 0)
  }
} catch {}
try {
  $rx = (Get-NetAdapterStatistics | Measure-Object ReceivedBytes -Sum).Sum
  $tx = (Get-NetAdapterStatistics | Measure-Object SentBytes -Sum).Sum
  if ($null -ne $rx) { $out.netRxCum = [double]$rx }
  if ($null -ne $tx) { $out.netTxCum = [double]$tx }
} catch {}
ConvertTo-Json -InputObject ([pscustomobject]$out) -Compress
`

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })
}

function readCpuTimes() {
  let idle = 0
  let total = 0
  for (const cpu of cpus()) {
    for (const [key, value] of Object.entries(cpu.times)) {
      total += value
      if (key === 'idle') idle += value
    }
  }
  return { idle, total }
}

function round(value, digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function runPowerShell(script, timeoutMs = 20_000) {
  const attempt = (binary) =>
    new Promise((resolve) => {
      const done = (error, stdout) => {
        if (error) {
          resolve({ binary, error, value: null })
          return
        }
        if (typeof stdout !== 'string' || stdout.trim() === '') {
          resolve({ binary, error: null, value: null })
          return
        }
        const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop()
        try {
          resolve({ binary, error: null, value: JSON.parse(line) })
        } catch {
          resolve({ binary, error: null, value: null })
        }
      }
      try {
        execFile(binary, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { timeout: timeoutMs, windowsHide: true, maxBuffer: 1 << 20 }, done)
      } catch (error) {
        resolve({ binary, error, value: null })
      }
    })

  return attempt('powershell.exe').then(async (result) => {
    if (result.value !== null) return result.value
    if (result.error?.code === 'ENOENT') {
      const fallback = await attempt('pwsh')
      return fallback.value
    }
    return null
  })
}

function average(values) {
  const list = values.filter((value) => typeof value === 'number' && Number.isFinite(value))
  if (list.length === 0) return null
  return list.reduce((sum, value) => sum + value, 0) / list.length
}

function parseRow(line) {
  try {
    const row = JSON.parse(line)
    if (typeof row?.t !== 'number' || typeof row?.cpu !== 'number' || typeof row?.mem !== 'number') return null
    return row
  } catch {
    return null
  }
}

function downsample(rows, target = 360) {
  if (rows.length <= target) return rows
  const bucket = Math.ceil(rows.length / target)
  const out = []
  for (let index = 0; index < rows.length; index += bucket) {
    const chunk = rows.slice(index, index + bucket)
    out.push({
      t: chunk[0].t,
      cpu: average(chunk.map((row) => row.cpu)),
      mem: average(chunk.map((row) => row.mem)),
      freq: average(chunk.map((row) => row.freq)),
      diskR: average(chunk.map((row) => row.diskR)),
      diskW: average(chunk.map((row) => row.diskW)),
      netRx: average(chunk.map((row) => row.netRx)),
      netTx: average(chunk.map((row) => row.netTx))
    })
  }
  return out
}

// A run is a stretch of consecutive samples (allowing a missed minute) that all
// satisfy `test`. Each run shorter than `minCount` samples is discarded.
function collectRuns(rows, test, minCount) {
  const runs = []
  let current = null
  for (const row of rows) {
    if (test(row)) {
      if (current === null || row.t - current.end > SAMPLE_MS * 2) {
        if (current !== null && current.count >= minCount) runs.push(current)
        current = { start: row.t, end: row.t, count: 1 }
      } else {
        current.end = row.t
        current.count += 1
      }
    } else if (current !== null) {
      if (current.count >= minCount) runs.push(current)
      current = null
    }
  }
  if (current !== null && current.count >= minCount) runs.push(current)
  return runs
}

function buildEvents(rows) {
  const cpuRuns = collectRuns(rows, (row) => row.cpu >= RULES.cpuHotPct, RULES.cpuHotMinutes)
  const memRuns = collectRuns(rows, (row) => row.mem >= RULES.memHotPct, RULES.memHotMinutes)
  const throttleRuns = collectRuns(
    rows,
    (row) => typeof row.freq === 'number' && row.freq <= RULES.throttleFreqPct && row.cpu >= RULES.throttleCpuPct,
    RULES.throttleMinutes
  )
  const events = []
  for (const run of cpuRuns) {
    events.push({ kind: 'cpu', level: 'warn', start: run.start, end: run.end, minutes: run.count, text: `CPU 持续 ≥ ${RULES.cpuHotPct}%` })
  }
  for (const run of memRuns) {
    events.push({ kind: 'mem', level: 'warn', start: run.start, end: run.end, minutes: run.count, text: `内存持续 ≥ ${RULES.memHotPct}%` })
  }
  for (const run of throttleRuns) {
    events.push({ kind: 'throttle', level: 'info', start: run.start, end: run.end, minutes: run.count, text: `频率 ≤ 最高频率 ${RULES.throttleFreqPct}%（有负载时）` })
  }
  return events.sort((a, b) => b.start - a.start).slice(0, 40)
}

function buildSummary(rows) {
  const spanMinutes = rows.length === 0 ? 0 : Math.max(0, (rows[rows.length - 1].t - rows[0].t) / 60_000) + 1
  const samples = rows.map((row) => row.pressure ?? 0)
  const cpuHot = rows.filter((row) => row.cpu >= RULES.cpuHotPct).length
  const memHot = rows.filter((row) => row.mem >= RULES.memHotPct).length
  const idle = rows.filter((row) => row.cpu < 20).length
  const throttle = rows.filter(
    (row) => typeof row.freq === 'number' && row.freq <= RULES.throttleFreqPct && row.cpu >= RULES.throttleCpuPct
  ).length
  return {
    spanMinutes,
    samples: rows.length,
    avgCpu: round(average(rows.map((row) => row.cpu))),
    maxCpu: round(Math.max(0, ...rows.map((row) => row.cpu))),
    avgMem: round(average(rows.map((row) => row.mem))),
    maxMem: round(Math.max(0, ...rows.map((row) => row.mem))),
    avgFreq: round(average(rows.map((row) => row.freq))),
    cpuHotMinutes: cpuHot,
    memHotMinutes: memHot,
    idleMinutes: idle,
    throttleMinutes: throttle,
    peakPressure: samples.length === 0 ? 0 : Math.max(...samples)
  }
}

function selectRows(rows, range) {
  if (rows.length === 0) return []
  const span = range === '7d' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const cutoff = rows[rows.length - 1].t - span
  const kept = rows.filter((row) => row.t >= cutoff)
  return kept.length === 0 ? rows.slice(-1) : kept
}

function snapshot(rows, range) {
  const windowRows = selectRows(rows, range)
  const current = windowRows[windowRows.length - 1] ?? null
  const seriesRows = downsample(windowRows)
  const value = {
    generatedAt: Date.now(),
    range,
    sampleMs: SAMPLE_MS,
    retentionDays: 30,
    rules: RULES,
    current,
    series: {
      times: seriesRows.map((row) => row.t),
      cpu: seriesRows.map((row) => row.cpu),
      mem: seriesRows.map((row) => row.mem),
      freq: seriesRows.map((row) => row.freq),
      diskR: seriesRows.map((row) => row.diskR),
      diskW: seriesRows.map((row) => row.diskW),
      netRx: seriesRows.map((row) => row.netRx),
      netTx: seriesRows.map((row) => row.netTx)
    },
    summary: buildSummary(windowRows),
    events: buildEvents(selectRows(rows, '7d')),
    totals: {
      stored: rows.length,
      firstAt: rows.length === 0 ? null : rows[0].t,
      lastAt: rows.length === 0 ? null : rows[rows.length - 1].t
    }
  }
  return value
}

export function apply(ctx) {
  const rows = []
  let sampling = false
  let prevCpu = readCpuTimes()
  let prevNet = null
  let disposed = false

  const persist = async (row) => {
    try {
      await mkdir(DATA_DIR, { recursive: true })
      await appendFile(DATA_FILE, `${JSON.stringify(row)}\n`, 'utf8')
    } catch (error) {
      ctx.logger?.warn?.('resource-monitor: could not append sample: %s', error?.message ?? String(error))
    }
  }

  const trim = () => {
    const cutoff = Date.now() - RETENTION_MS
    while (rows.length > 0 && rows[0].t < cutoff) rows.shift()
    while (rows.length > MAX_ROWS) rows.shift()
  }

  const load = async () => {
    if (!existsSync(DATA_FILE)) return
    try {
      const text = await readFile(DATA_FILE, 'utf8')
      for (const line of text.split(/\r?\n/)) {
        if (line.trim() === '') continue
        const row = parseRow(line)
        if (row !== null) rows.push(row)
      }
      rows.sort((a, b) => a.t - b.t)
      trim()
    } catch (error) {
      ctx.logger?.warn?.('resource-monitor: could not read history: %s', error?.message ?? String(error))
    }
  }

  const sampleOnce = async () => {
    if (sampling || disposed) return
    sampling = true
    try {
      const now = Date.now()
      const nowCpu = readCpuTimes()
      const totalDelta = nowCpu.total - prevCpu.total
      const idleDelta = nowCpu.idle - prevCpu.idle
      prevCpu = nowCpu
      const cpuPct = totalDelta > 0 ? Math.min(100, Math.max(0, 100 * (1 - idleDelta / totalDelta))) : null
      const total = totalmem()
      const memPct = total > 0 ? 100 * (1 - freemem() / total) : null

      const perf = await runPowerShell(PS_SCRIPT)
      let netRx = null
      let netTx = null
      if (perf !== null && typeof perf.netRxCum === 'number' && typeof perf.netTxCum === 'number') {
        if (prevNet !== null) {
          const elapsed = (now - prevNet.at) / 1000
          const rx = perf.netRxCum - prevNet.rx
          const tx = perf.netTxCum - prevNet.tx
          if (elapsed > 0 && rx >= 0 && tx >= 0) {
            netRx = rx / elapsed
            netTx = tx / elapsed
          }
        }
        prevNet = { at: now, rx: perf.netRxCum, tx: perf.netTxCum }
      }

      const row = {
        t: now,
        cpu: round(cpuPct ?? 0, 1),
        mem: round(memPct ?? 0, 1),
        memUsedGb: round((total - freemem()) / 1024 ** 3, 2),
        memTotalGb: round(total / 1024 ** 3, 1),
        freq: perf !== null ? round(perf.freq) : null,
        diskR: perf !== null ? round(perf.diskR, 0) : null,
        diskW: perf !== null ? round(perf.diskW, 0) : null,
        netRx: netRx === null ? null : round(netRx, 0),
        netTx: netTx === null ? null : round(netTx, 0),
        pressure: null
      }
      row.pressure = round(Math.min(100, Math.max(0, row.cpu)), 1)
      rows.push(row)
      trim()
      await persist(row)
    } catch (error) {
      ctx.logger?.warn?.('resource-monitor: sample failed: %s', error?.message ?? String(error))
    } finally {
      sampling = false
    }
  }

  let timer = null
  let bootTimer = null
  // The history file is read in the background: the route answers from whatever
  // rows are known so far, and the append-only log fills the rest in shortly.
  void load()

  ctx.effect(() => {
    timer = setInterval(() => {
      void sampleOnce()
    }, SAMPLE_MS)
    bootTimer = setTimeout(() => {
      void sampleOnce()
    }, 3_000)
    return () => {
      disposed = true
      if (timer !== null) clearInterval(timer)
      if (bootTimer !== null) clearTimeout(bootTimer)
      timer = null
      bootTimer = null
    }
  }, 'resource-monitor: sampler')

  const unregister = ctx.connection.fetch.register({
    path: SNAPSHOT_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      let body = {}
      try {
        const text = await request.text()
        if (text.trim() !== '') body = JSON.parse(text)
      } catch {
        return json({ ok: false, error: { code: 'bad-request', message: 'Request body is not JSON.' } }, 400)
      }
      try {
        const range = body?.range === '7d' ? '7d' : '24h'
        const value = snapshot(rows, range)
        return json({ ok: true, value })
      } catch (error) {
        ctx.logger?.warn?.('resource-monitor: snapshot failed: %s', error?.message ?? String(error))
        return json({ ok: false, error: { code: 'snapshot-failed', message: 'Could not build a snapshot.' } }, 500)
      }
    }
  })

  ctx.effect(() => () => {
    try {
      unregister?.()
    } catch {}
  }, 'resource-monitor: unregister route')
}
