window.__ModuleLoader__.load({
  id: 'dsh-resource-monitor',
  factory: (require) => {
    var React = require('react')
    var module = { exports: {} }
    var exports = module.exports

    var TYPE_ID = 'dsh-resource-monitor'
    var KIND = 'resource-monitor'
    var SNAPSHOT_PATH = '/api/resource-monitor.snapshot'
    var h = React.createElement
    var POLL_MS = 30_000

    var ZH = {
      tabTitle: '资源监控',
      title: '资源监控',
      description: 'CPU 与内存长期占用的告警判定、降频检测，以及 24 小时 / 7 天历史',
      headerButtonOpen: '打开资源监控面板',
      range24h: '24 小时',
      range7d: '7 天',
      cpu: 'CPU',
      memory: '内存',
      freq: '频率',
      disk: '磁盘',
      network: '网络',
      read: '读',
      write: '写',
      rx: '下行',
      tx: '上行',
      current: '当前',
      average: '平均',
      peak: '峰值',
      summary: '结论',
      summaryLine: '过去 {span}：CPU 平均 {avgCpu}，峰值 {maxCpu}；内存平均 {avgMem}，峰值 {maxMem}',
      hotCpu: 'CPU ≥ {pct}% 累计 {minutes} 分钟',
      hotMem: '内存 ≥ {pct}% 累计 {minutes} 分钟',
      throttle: '疑似降频累计 {minutes} 分钟',
      idle: 'CPU < 20% 累计 {minutes} 分钟',
      events: '近期异常',
      noEvents: '没有触发阈值的长时段异常：CPU、内存、频率都在正常范围。',
      eventCpu: 'CPU 长时间高占用',
      eventMem: '内存接近上限',
      eventThrottle: '负载下频率被压低（疑似过热降频）',
      minutes: '{minutes} 分钟',
      start: '开始',
      end: '结束',
      empty: '还没有历史数据。采样每 60 秒一次，首个样本在几秒后写入，随后会逐步积累。',
      loading: '正在读取…',
      failed: '读取失败：{message}',
      retry: '重试',
      footer: '每 {seconds} 秒采样 · 保留 30 天 · 只在本机采集，不依赖外部服务',
      footerNote: '不采集核心温度：Windows 下需要内核驱动；降频由「当前频率 / 最高频率」判定。',
      noFreq: '频率读数不可用',
      spanHours: '覆盖 {hours} 小时',
      samples: '{count} 个样本',
      memUsed: '{used} / {total} GB',
      freqCardNote: '低于 {freq}% 且 CPU ≥ {cpu}% 持续 {minutes} 分钟才算疑似降频；空闲时频率降低是正常的',
      freqThreshold: '降频线 {value}',
    hotThreshold: '告警线 {value}',
      diskRate: '{value} MB/s',
      netRate: '{value} MB/s'
    }

    var EN = {
      tabTitle: 'Resource monitor',
      title: 'Resource monitor',
      description: 'Sustained CPU and memory alerts, throttle detection and 24h / 7d history',
      headerButtonOpen: 'Open resource trends',
      range24h: '24h',
      range7d: '7d',
      cpu: 'CPU',
      memory: 'Memory',
      freq: 'Frequency',
      disk: 'Disk',
      network: 'Network',
      read: 'read',
      write: 'write',
      rx: 'down',
      tx: 'up',
      current: 'Now',
      average: 'Average',
      peak: 'Peak',
      summary: 'Summary',
      summaryLine: 'Last {span}: CPU avg {avgCpu} (peak {maxCpu}), memory avg {avgMem} (peak {maxMem})',
      hotCpu: 'CPU ≥ {pct}% for {minutes} min',
      hotMem: 'Memory ≥ {pct}% for {minutes} min',
      throttle: 'Throttling for {minutes} min',
      idle: 'CPU < 20% for {minutes} min',
      events: 'Recent incidents',
      noEvents: 'No sustained threshold breaches: CPU, memory and frequency stayed in range.',
      eventCpu: 'CPU sustained load',
      eventMem: 'Memory near capacity',
      eventThrottle: 'Frequency held down under load (likely thermal throttling)',
      minutes: '{minutes} min',
      start: 'start',
      end: 'end',
      empty: 'No history yet. Sampling runs every 60 s; the first sample lands within seconds.',
      loading: 'Loading…',
      failed: 'Could not load: {message}',
      retry: 'Retry',
      footer: 'Sampled every {seconds} s · 30-day retention · local only, no external services',
      footerNote: 'Core temperature is not collected (needs a kernel driver on Windows); throttling is inferred from current / max frequency.',
      noFreq: 'Frequency unavailable',
      spanHours: '{hours} h covered',
      samples: '{count} samples',
      memUsed: '{used} / {total} GB',
      freqCardNote: 'Counted as likely throttling only below {freq}% while CPU ≥ {cpu}% for {minutes} min; a low frequency at idle is normal',
      freqThreshold: 'limit {value}',
    hotThreshold: 'alert {value}',
      diskRate: '{value} MB/s',
      netRate: '{value} MB/s'
    }

    function resolveLanguage() {
      var lang = (document && document.documentElement && document.documentElement.lang) || ''
      if (lang.toLowerCase().indexOf('zh') === 0) return 'zh'
      var nav = (navigator && navigator.language) || ''
      return nav.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en'
    }

    function createTranslator() {
      return function (key, values) {
        var dictionary = resolveLanguage() === 'zh' ? ZH : EN
        var template = dictionary[key]
        if (typeof template !== 'string') return key
        if (values === undefined) return template
        return template.replace(/\{(\w+)\}/g, function (match, name) {
          var value = values[name]
          return value === undefined ? match : String(value)
        })
      }
    }

    var CSS = [
      '.dsh-rt-root{display:flex;flex-direction:column;gap:10px;padding:10px 12px;height:100%;overflow-y:auto;font-size:12px;line-height:1.5}',
      '.dsh-rt-head{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.dsh-rt-title{font-size:13px;font-weight:600}',
      '.dsh-rt-seg{display:inline-flex;border:1px solid var(--dsh-border, rgba(127,127,127,.28));border-radius:6px;overflow:hidden}',
      '.dsh-rt-seg>button{border:0;background:transparent;color:inherit;padding:2px 8px;font-size:11px;cursor:pointer;opacity:.7}',
      '.dsh-rt-seg>button[data-on="true"]{background:var(--dsh-accent-soft, rgba(99,132,255,.18));opacity:1;font-weight:600}',
      '.dsh-rt-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
      '.dsh-rt-kpi{border:1px solid var(--dsh-border, rgba(127,127,127,.22));border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dsh-rt-kpi-label{font-size:10px;opacity:.6;letter-spacing:.02em}',
      '.dsh-rt-kpi-value{font-size:16px;font-weight:600;font-variant-numeric:tabular-nums}',
      '.dsh-rt-kpi-note{font-size:10px;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dsh-rt-card{border:1px solid var(--dsh-border, rgba(127,127,127,.22));border-radius:8px;padding:8px 9px;display:flex;flex-direction:column;gap:6px}',
      '.dsh-rt-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:6px}',
      '.dsh-rt-card-title{font-size:11px;font-weight:600;opacity:.9}',
      '.dsh-rt-card-note{font-size:10px;opacity:.55}',
      '.dsh-rt-legend{display:flex;flex-wrap:wrap;gap:10px;font-size:10px;opacity:.75}',
      '.dsh-rt-legend span{display:inline-flex;align-items:center;gap:4px}',
      '.dsh-rt-dot{width:7px;height:7px;border-radius:2px;display:inline-block}',
      '.dsh-rt-chart{position:relative;width:100%}',
      '.dsh-rt-chart canvas{display:block;width:100%}',
      '.dsh-rt-summary{display:flex;flex-direction:column;gap:3px;font-size:11px;opacity:.85}',
      '.dsh-rt-pill{border:1px solid var(--dsh-border, rgba(127,127,127,.25));border-radius:999px;padding:1px 8px;font-size:10px;opacity:.8}',
      '.dsh-rt-events{display:flex;flex-direction:column;gap:6px}',
      '.dsh-rt-event{display:flex;flex-direction:column;gap:1px;border-left:2px solid var(--dsh-warn, #e0a03a);padding-left:7px}',
      '.dsh-rt-event[data-kind="throttle"]{border-left-color:var(--dsh-danger, #d16262)}',
      '.dsh-rt-event-title{font-size:11px;font-weight:600}',
      '.dsh-rt-event-meta{font-size:10px;opacity:.6}',
      '.dsh-rt-footer{display:flex;flex-direction:column;gap:2px;font-size:10px;opacity:.55;margin-top:2px}',
      '.dsh-rt-empty{border:1px dashed var(--dsh-border, rgba(127,127,127,.3));border-radius:8px;padding:14px 10px;font-size:11px;opacity:.7;text-align:center}',
      '.dsh-rt-error{color:var(--dsh-danger, #d16262);font-size:11px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.dsh-rt-btn{border:1px solid var(--dsh-border, rgba(127,127,127,.3));background:transparent;color:inherit;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer}',
      '.dsh-rt-hbtn{border:0;background:transparent;color:inherit;padding:2px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;opacity:.8;border-radius:5px}',
      '.dsh-rt-hbtn:hover{opacity:1;background:var(--dsh-hover, rgba(127,127,127,.14))}'
    ].join('')

    var stylesInstalled = false
    function installStyles() {
      if (stylesInstalled) return function () {}
      var node = document.createElement('style')
      node.setAttribute('data-dsh-resource-monitor', '')
      node.textContent = CSS
      document.head.appendChild(node)
      stylesInstalled = true
      return function () {
        stylesInstalled = false
        node.remove()
      }
    }

    function formatPercent(value) {
      if (typeof value !== 'number' || !isFinite(value)) return '—'
      return Math.round(value) + '%'
    }

    function formatRate(value) {
      if (typeof value !== 'number' || !isFinite(value)) return '—'
      var mb = value / 1024 / 1024
      if (mb >= 100) return Math.round(mb) + ' MB/s'
      if (mb >= 10) return mb.toFixed(1) + ' MB/s'
      return mb.toFixed(2) + ' MB/s'
    }

    function formatClock(ts) {
      if (typeof ts !== 'number') return '—'
      var date = new Date(ts)
      var pad = function (n) { return String(n).padStart(2, '0') }
      return pad(date.getHours()) + ':' + pad(date.getMinutes())
    }

    function formatMoment(ts) {
      if (typeof ts !== 'number') return '—'
      var date = new Date(ts)
      var pad = function (n) { return String(n).padStart(2, '0') }
      return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
    }

    function formatSpan(minutes) {
      if (typeof minutes !== 'number' || minutes <= 0) return '0'
      if (minutes < 60) return Math.round(minutes) + 'm'
      var hours = minutes / 60
      if (hours < 48) return hours.toFixed(1) + 'h'
      return (hours / 24).toFixed(1) + 'd'
    }

    function postJson(path, body, signal) {
      return fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
        signal: signal
      })
        .then(function (response) {
          return response.text().then(function (text) {
            var payload
            try {
              payload = JSON.parse(text)
            } catch (error) {
              throw new Error('Unexpected response from the host route (HTTP ' + String(response.status) + ').')
            }
            if (payload && payload.ok === true) return payload.value
            var message = payload && payload.error && payload.error.message
            throw new Error(typeof message === 'string' && message !== '' ? message : 'HTTP ' + String(response.status))
          })
        })
    }

    function fetchSnapshot(range, signal) {
      return postJson(SNAPSHOT_PATH, { range: range }, signal)
    }

    function HeaderButton(props) {
      var t = props.t
      return h(
        'button',
        {
          type: 'button',
          className: 'dsh-rt-hbtn',
          title: t('headerButtonOpen'),
          'aria-label': t('headerButtonOpen'),
          onClick: function () {
            props.open()
          }
        },
        h(
          'svg',
          { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
          h('path', { d: 'M1.5 11.5 L5 7 L8.5 9.5 L11.5 5.5 L14.5 8.5' }),
          h('path', { d: 'M1.5 14 H14.5' })
        )
      )
    }

    function drawChart(canvas, width, height, payload) {
      var dpr = (window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      var ctx = canvas.getContext('2d')
      if (ctx === null) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      var padLeft = 26
      var padRight = 4
      var padTop = 5
      var padBottom = 5
      var plotW = Math.max(1, width - padLeft - padRight)
      var plotH = Math.max(1, height - padTop - padBottom)

      ctx.strokeStyle = 'rgba(127,127,127,.20)'
      ctx.lineWidth = 1
      ctx.fillStyle = 'rgba(127,127,127,.75)'
      ctx.font = '9px system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      var steps = 3
      for (var i = 0; i <= steps; i += 1) {
        var ratio = i / steps
        var y = padTop + plotH * (1 - ratio)
        ctx.beginPath()
        ctx.moveTo(padLeft, y)
        ctx.lineTo(padLeft + plotW, y)
        ctx.stroke()
        var label = payload.axisLabel(ratio)
        ctx.fillText(label, padLeft - 4, y)
      }

      var times = payload.times || []
      var count = times.length
      if (count === 0) return
      var xAt = function (index) {
        if (count === 1) return padLeft + plotW / 2
        return padLeft + (plotW * index) / (count - 1)
      }
      var yAt = function (value) {
        var scaled = (value - payload.min) / (payload.max - payload.min || 1)
        return padTop + plotH * (1 - Math.min(1, Math.max(0, scaled)))
      }

      var threshold = payload.threshold
      if (threshold !== undefined && threshold !== null && typeof threshold.value === 'number') {
        var thresholdY = yAt(threshold.value)
        ctx.save()
        ctx.setLineDash([4, 3])
        ctx.lineWidth = 1
        ctx.strokeStyle = threshold.color || 'rgba(209,98,98,.45)'
        ctx.beginPath()
        ctx.moveTo(padLeft, thresholdY)
        ctx.lineTo(padLeft + plotW, thresholdY)
        ctx.stroke()
        ctx.restore()
        if (threshold.label) {
          ctx.fillStyle = threshold.color || 'rgba(209,98,98,.75)'
          ctx.textAlign = 'right'
          ctx.fillText(threshold.label, padLeft + plotW, Math.max(padTop + 6, thresholdY - 3))
        }
      }

      for (var lineIndex = 0; lineIndex < payload.lines.length; lineIndex += 1) {
        var line = payload.lines[lineIndex]
        var data = line.data || []
        ctx.beginPath()
        ctx.lineWidth = 1.4
        ctx.strokeStyle = line.color
        var open = false
        for (var index = 0; index < count; index += 1) {
          var value = data[index]
          if (typeof value !== 'number' || !isFinite(value)) {
            open = false
            continue
          }
          var px = xAt(index)
          var py = yAt(value)
          if (!open) {
            ctx.moveTo(px, py)
            open = true
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.stroke()
      }
    }

    function TrendChart(props) {
      var t = props.t
      var lines = props.lines || []
      var wrapperRef = React.useRef(null)
      var canvasRef = React.useRef(null)
      var sizeState = React.useState({ width: 0, height: props.height || 110 })
      var size = sizeState[0]
      var setSize = sizeState[1]

      React.useEffect(function () {
        var node = wrapperRef.current
        if (node === null) return function () {}
        var measure = function () {
          setSize({ width: node.clientWidth || 260, height: props.height || 110 })
        }
        measure()
        var observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
        if (observer !== null) observer.observe(node)
        return function () {
          if (observer !== null) observer.disconnect()
        }
      }, [props.height])

      React.useEffect(function () {
        var canvas = canvasRef.current
        if (canvas === null) return
        drawChart(canvas, size.width, size.height, {
          times: props.times || [],
          lines: lines,
          min: 0,
          max: props.max,
          threshold: props.threshold,
          axisLabel: props.axisLabel
        })
      }, [size.width, size.height, props.times, props.max, props.threshold, lines])

      var latest = function (line) {
        var data = line.data || []
        for (var index = data.length - 1; index >= 0; index -= 1) {
          var value = data[index]
          if (typeof value === 'number' && isFinite(value)) return line.format ? line.format(value) : formatPercent(value)
        }
        return '—'
      }

      return h(
        'div',
        { className: 'dsh-rt-chart', ref: wrapperRef },
        h('canvas', { ref: canvasRef, style: { height: String(size.height) + 'px' } }),
        h(
          'div',
          { className: 'dsh-rt-legend' },
          lines.map(function (line) {
            return h(
              'span',
              { key: line.key },
              h('i', { className: 'dsh-rt-dot', style: { background: line.color } }),
              line.label + ' ' + latest(line)
            )
          })
        )
      )
    }

    function Kpi(props) {
      return h(
        'div',
        { className: 'dsh-rt-kpi' },
        h('span', { className: 'dsh-rt-kpi-label' }, props.label),
        h('span', { className: 'dsh-rt-kpi-value' }, props.value),
        props.note ? h('span', { className: 'dsh-rt-kpi-note', title: props.note }, props.note) : null
      )
    }

    function Body(props) {
      var t = props.t
      var rangeState = React.useState('24h')
      var range = rangeState[0]
      var setRange = rangeState[1]
      var dataState = React.useState({ status: 'loading', value: null, error: null })
      var data = dataState[0]
      var setData = dataState[1]
      var nonceState = React.useState(0)
      var nonce = nonceState[0]
      var bump = nonceState[1]

      React.useEffect(function () {
        var alive = true
        var controller = typeof AbortController === 'function' ? new AbortController() : null
        var load = function (initial) {
          if (!initial && controller !== null && controller.signal.aborted) return
          setData(function (previous) {
            return { status: initial && previous.value === null ? 'loading' : previous.status, value: previous.value, error: null }
          })
          fetchSnapshot(range, controller ? controller.signal : undefined)
            .then(function (value) {
              if (!alive) return
              setData({ status: 'ready', value: value, error: null })
            })
            .catch(function (error) {
              if (!alive) return
              setData({ status: 'error', value: null, error: error && error.message ? error.message : String(error) })
            })
        }
        load(true)
        var timer = setInterval(function () {
          load(false)
        }, POLL_MS)
        return function () {
          alive = false
          clearInterval(timer)
          if (controller !== null) controller.abort()
        }
      }, [range, nonce])

      var value = data.value
      var current = value && value.current ? value.current : null
      var series = (value && value.series) || { times: [], cpu: [], mem: [], freq: [], diskR: [], diskW: [], netRx: [], netTx: [] }
      var summary = (value && value.summary) || null
      var rules = (value && value.rules) || { cpuHotPct: 85, memHotPct: 90 }
      var events = (value && value.events) || []
      var totals = (value && value.totals) || null

      var cpuLine = [
        { key: 'cpu', label: t('cpu'), color: '#4f9cf9', data: series.cpu, format: formatPercent }
      ]
      var memLine = [
        { key: 'mem', label: t('memory'), color: '#a97cf3', data: series.mem, format: formatPercent }
      ]
      var cpuHotPct = typeof rules.cpuHotPct === 'number' ? rules.cpuHotPct : 85
      var memHotPct = typeof rules.memHotPct === 'number' ? rules.memHotPct : 90
      var cpuThreshold = { value: cpuHotPct, label: t('hotThreshold', { value: cpuHotPct + '%' }), color: 'rgba(209,98,98,.45)' }
      var memThreshold = { value: memHotPct, label: t('hotThreshold', { value: memHotPct + '%' }), color: 'rgba(209,98,98,.45)' }
      var freqLines = [
        { key: 'freq', label: t('freq'), color: '#e0a03a', data: series.freq, format: function (v) { return Math.round(v) + '%' } },
        { key: 'cpu', label: t('cpu'), color: '#4f9cf9', data: series.cpu, format: formatPercent }
      ]
      var throttleFreqPct = typeof rules.throttleFreqPct === 'number' ? rules.throttleFreqPct : 70
      var throttleCpuPct = typeof rules.throttleCpuPct === 'number' ? rules.throttleCpuPct : 50
      var throttleMinutesNeeded = typeof rules.throttleMinutes === 'number' ? rules.throttleMinutes : 5
      var throttleThreshold = {
        value: throttleFreqPct,
        label: t('freqThreshold', { value: throttleFreqPct + '%' }),
        color: 'rgba(209,98,98,.45)'
      }

      var empty = data.status === 'ready' && series.times.length <= 1

      var body = null
      if (data.status === 'loading' && value === null) {
        body = h('div', { className: 'dsh-rt-empty' }, t('loading'))
      } else if (data.status === 'error') {
        body = h(
          'div',
          { className: 'dsh-rt-error' },
          h('span', null, t('failed', { message: data.error })),
          h('button', { type: 'button', className: 'dsh-rt-btn', onClick: function () { bump(nonce + 1) } }, t('retry'))
        )
      } else if (empty) {
        body = h('div', { className: 'dsh-rt-empty' }, t('empty'))
      }

      var coverage = totals && totals.stored ? t('spanHours', { hours: formatSpan((totals.lastAt - totals.firstAt) / 60_000) }) + ' · ' + t('samples', { count: totals.stored }) : ''

      return h(
        'div',
        { className: 'dsh-rt-root' },
        h(
          'div',
          { className: 'dsh-rt-head' },
          h('span', { className: 'dsh-rt-title' }, t('title')),
          h(
            'div',
            { className: 'dsh-rt-seg' },
            h('button', { type: 'button', 'data-on': String(range === '24h'), onClick: function () { setRange('24h') } }, t('range24h')),
            h('button', { type: 'button', 'data-on': String(range === '7d'), onClick: function () { setRange('7d') } }, t('range7d'))
          )
        ),
        body,
        empty || data.status !== 'ready' || value === null ? null : h(
          'div',
          { className: 'dsh-rt-kpis' },
          h(Kpi, { label: t('cpu'), value: current ? formatPercent(current.cpu) : '—', note: summary ? t('average') + ' ' + formatPercent(summary.avgCpu) : '' }),
          h(Kpi, { label: t('memory'), value: current ? formatPercent(current.mem) : '—', note: current && typeof current.memUsedGb === 'number' ? t('memUsed', { used: current.memUsedGb.toFixed(1), total: (current.memTotalGb || 0).toFixed(1) }) : '' }),
          h(Kpi, { label: t('freq'), value: current && typeof current.freq === 'number' ? Math.round(current.freq) + '%' : '—', note: current && typeof current.freq !== 'number' ? t('noFreq') : (summary ? t('average') + ' ' + formatPercent(summary.avgFreq) : '') })
        ),
        empty || data.status !== 'ready' || summary === null ? null : h(
          'div',
          { className: 'dsh-rt-card' },
          h('div', { className: 'dsh-rt-card-head' }, h('span', { className: 'dsh-rt-card-title' }, t('summary'))),
          h(
            'div',
            { className: 'dsh-rt-summary' },
            h('span', null, t('summaryLine', {
              span: formatSpan(summary.spanMinutes),
              avgCpu: formatPercent(summary.avgCpu),
              maxCpu: formatPercent(summary.maxCpu),
              avgMem: formatPercent(summary.avgMem),
              maxMem: formatPercent(summary.maxMem)
            })),
            h('div', { className: 'dsh-rt-legend' },
              h('span', { className: 'dsh-rt-pill' }, t('hotCpu', { pct: rules.cpuHotPct, minutes: summary.cpuHotMinutes })),
              h('span', { className: 'dsh-rt-pill' }, t('hotMem', { pct: rules.memHotPct, minutes: summary.memHotMinutes })),
              h('span', { className: 'dsh-rt-pill' }, t('throttle', { minutes: summary.throttleMinutes })),
              h('span', { className: 'dsh-rt-pill' }, t('idle', { minutes: summary.idleMinutes }))
            )
          )
        ),

        empty || data.status !== 'ready' || value === null ? null : h(
          'div',
          { className: 'dsh-rt-card' },
          h('div', { className: 'dsh-rt-card-head' },
            h('span', { className: 'dsh-rt-card-title' }, t('cpu')),
            h('span', { className: 'dsh-rt-card-note' }, coverage)
          ),
          h(TrendChart, { t: t, times: series.times, lines: cpuLine, max: 100, height: 120, threshold: cpuThreshold, axisLabel: function (ratio) { return Math.round(ratio * 100) + '%' } })
        ),
        empty || data.status !== 'ready' || value === null ? null : h(
          'div',
          { className: 'dsh-rt-card' },
          h('div', { className: 'dsh-rt-card-head' },
            h('span', { className: 'dsh-rt-card-title' }, t('memory')),
            h('span', { className: 'dsh-rt-card-note' }, current && typeof current.memUsedGb === 'number' ? t('memUsed', { used: current.memUsedGb.toFixed(1), total: (current.memTotalGb || 0).toFixed(1) }) : '')
          ),
          h(TrendChart, { t: t, times: series.times, lines: memLine, max: 100, height: 120, threshold: memThreshold, axisLabel: function (ratio) { return Math.round(ratio * 100) + '%' } })
        ),
        empty || data.status !== 'ready' || value === null ? null : h(
          'div',
          { className: 'dsh-rt-card' },
          h('div', { className: 'dsh-rt-card-head' },
            h('span', { className: 'dsh-rt-card-title' }, t('freq')),
            h('span', { className: 'dsh-rt-card-note' }, t('freqCardNote', { freq: throttleFreqPct, cpu: throttleCpuPct, minutes: throttleMinutesNeeded }))
          ),
          h(TrendChart, { t: t, times: series.times, lines: freqLines, max: 100, height: 90, threshold: throttleThreshold, axisLabel: function (ratio) { return Math.round(ratio * 100) + '%' } })
        ),

        empty || data.status !== 'ready' ? null : h(
          'div',
          { className: 'dsh-rt-card' },
          h('div', { className: 'dsh-rt-card-head' }, h('span', { className: 'dsh-rt-card-title' }, t('events'))),
          events.length === 0
            ? h('div', { className: 'dsh-rt-card-note' }, t('noEvents'))
            : h(
                'div',
                { className: 'dsh-rt-events' },
                events.slice(0, 8).map(function (event, index) {
                  var title = event.kind === 'cpu' ? t('eventCpu') : event.kind === 'mem' ? t('eventMem') : t('eventThrottle')
                  return h(
                    'div',
                    { className: 'dsh-rt-event', key: String(event.start) + '-' + String(index), 'data-kind': event.kind },
                    h('span', { className: 'dsh-rt-event-title' }, title),
                    h('span', { className: 'dsh-rt-event-meta' }, formatMoment(event.start) + ' · ' + t('minutes', { minutes: event.minutes }))
                  )
                })
              )
        ),
        h(
          'div',
          { className: 'dsh-rt-footer' },
          h('span', null, t('footer', { seconds: Math.round(((value && value.sampleMs) || 60000) / 1000) })),
          h('span', null, t('footerNote'))
        )
      )
    }

    function apply(ctx) {
      var t = createTranslator()
      ctx.effect(function () {
        return installStyles()
      }, 'resource-monitor: stylesheet')

      ctx.inject(['slots'], function (ui) {
        ui.slots.inject(
          'conversation.session.header.utilities',
          function () {
            return ui.slots.register(
              {
                name: 'conversation.session.header.utilities',
                id: TYPE_ID,
                order: 110,
                inject: function () {
                  return {
                    t: t,
                    open: function () {
                      try {
                        ctx.get('sidebarRight').openTab(KIND, {})
                      } catch (error) {
                        ctx.logger && ctx.logger.warn && ctx.logger.warn('resource-monitor: could not open the alerts page: %s', (error && error.message) || String(error))
                      }
                    }
                  }
                }
              },
              HeaderButton
            )
          }
        )

        ui.inject(['sidebarRightTabs'], function (tabs) {
          tabs.effect(
            function () {
              return tabs.sidebarRightTabs.register({
                id: TYPE_ID,
                kind: KIND,
                priority: 'extension',
                title: function () {
                  return t('tabTitle')
                },
                guide: [
                  {
                    id: KIND,
                    order: 40,
                    title: function () {
                      return t('title')
                    },
                    description: function () {
                      return t('description')
                    }
                  }
                ]
              })
            },
            'resource-monitor: tab type'
          )
        })

        ui.slots.inject(
          'sidebar.right.pane.tab',
          function () {
            return ui.slots.register(
              {
                name: 'sidebar.right.pane.tab',
                key: TYPE_ID,
                inject: function () {
                  return { t: t }
                }
              },
              Body
            )
          }
        )
      })
    }

    module.exports = { name: TYPE_ID, apply: apply }
    return module.exports
  }
})
