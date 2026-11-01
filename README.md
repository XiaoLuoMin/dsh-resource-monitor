# dsh-resource-monitor · 资源监控

A DeepSeek Harness (dsh) sidebar plugin that samples your Windows machine **once a minute**, keeps a **30-day** history, and tells you when sustained CPU load, memory pressure, or frequency throttling actually happened — instead of showing a live gauge you have to stare at.

DSH 侧栏插件：每分钟采集一次本机资源，保留 30 天历史，直接用「连续多久超阈值」判定长期高占用、内存吃紧与降频，而不是只给一个需要一直盯着看的实时仪表盘。

## What it does / 功能

- Sidebar tab **资源监控**; a matching entry button also sits in the session title bar. / 侧栏 tab「资源监控」，会话标题栏也有入口按钮。
- Three charts: CPU + memory (%), frequency (% of maximum), disk + network (MB/s). / 三张折线图：CPU+内存、频率、磁盘+网络。
- KPI row: current CPU, current memory (used / total GB), current frequency. / KPI：当前 CPU、当前内存（已用/总量 GB）、当前频率。
- Summary: range average/peak, minutes spent at ≥85% CPU, minutes at ≥90% memory, throttled minutes. / 结论：区间平均/峰值、超阈值累计分钟、降频分钟。
- Incident list (last 7 days): CPU sustained load, memory near capacity, frequency held down under load. / 异常列表（近 7 天）：CPU 长时间高占用、内存接近上限、负载下降频。
- 24h / 7d toggle, auto-refresh every 30 s. / 24 小时 / 7 天切换，30 秒自动刷新。

## Detection rules / 判定规则

| Item / 项目 | Rule / 规则 |
| --- | --- |
| Sample interval / 采样间隔 | 60 s |
| Retention / 历史保留 | 30 days (`samples.jsonl`, append-only) |
| CPU alert | ≥ 85% for ≥ 10 consecutive minutes |
| Memory alert | ≥ 90% for ≥ 10 consecutive minutes |
| Throttle alert | CPU ≥ 50% while frequency ≤ 70% of maximum, for ≥ 5 consecutive minutes |

## Data sources / 数据来源

- CPU / memory: Node `os.cpus()` time deltas, `os.totalmem()` / `os.freemem()`.
- Frequency: Windows performance counter `\Processor Information(_Total)\% of Maximum Frequency`.
- Disk: `\PhysicalDisk(_Total)\Disk Read Bytes/sec`, `Disk Write Bytes/sec`.
- Network: `Get-NetAdapterStatistics` cumulative bytes, converted to a rate between two samples.
- Disk and network figures come from one `powershell.exe` child process per sample (~2–4 s, async, never blocks the UI).

## No temperature readings / 不采集温度

Reading CPU core temperature on Windows (MSR / SMBus) needs a kernel driver. This plugin does not ship or load one; it deliberately infers throttling from the **frequency / maximum-frequency ratio**, which reflects the throttling event itself and needs no driver or elevation.

Windows 上读取 CPU 核心温度需要内核驱动。本插件不附带、也不加载任何驱动，改用「当前频率 / 最高频率」判定降频 —— 这个信号直接反映降频事实，且不需要驱动或提权。

## Install / 安装

```sh
dsh plugin --profile desktop add github:XiaoLuoMin/dsh-resource-monitor
```

Then restart the DSH app so both the host and the client half load. / 装完重启 DSH 应用（host 与 client 两半都要重新加载）。

Uninstall / 卸载:

```sh
dsh plugin --profile desktop remove dsh-resource-monitor
```

## Data location / 数据位置

```
%USERPROFILE%\.dsh\data\resource-monitor\samples.jsonl
```

One JSON object per line, one line per minute. Delete the file to reset the history. / 每行一个 JSON 样本，每分钟一行；删除该文件即清空历史。

## Layout / 结构

```
lib/index.js        host: sampling loop, 30-day history, POST /api/resource-monitor.snapshot
client/client.js    client: sidebar tab, entry button, three canvas charts, summary and incident list
cordis.patch.yml    bundle insert declaration
```

## License

MIT — see [LICENSE](LICENSE).
