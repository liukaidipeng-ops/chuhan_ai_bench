// ===== 自对弈数据生成（NN 评估试点 Day1）=====
// 用指定 AI（默认 r15 默认产品档）自对弈，记录每个根局面的：
//   原始紧凑局面状态（二进制）、走子方搜索分 v（伪标签）、手写静态分 e、节点数、完成层数、
//   以及整局胜负/终局原因（games.jsonl）。
// 小样本 / 大批量同一份脚本，多进程分片；小样本先验证格式与速度。
//
// 用法（在 ai-work\nn 下）：
//   node make-selfplay.js --games 2 --depth 3 --out data/sample            # 冒烟
//   node make-selfplay.js --positions 2000 --depth 3 --jobs 3 --out data/pilot-2000
//   node make-selfplay.js --positions 2000 --depth 3 --seed 20261026 --jobs 3 --out ...
//
// 关键参数：
//   --ai FILE       电脑文件（默认 ../lab-repo/lab/candidates/release_r15.js）
//   --engine DIR    规则引擎目录（默认 ../lab-repo/lab/src，含 rules.js/bingfa.js）
//   --depth N       教师搜索固定层数（默认 3；固定层数 = 标签可复现，不被机器快慢影响）
//   --nodes N       改用固定节点数收手（与 --depth 二选一）
//   --budget MS     改用时间制收手（与上面二选一；不推荐做标签：r15 根节点枚举不计节点，实际远超预算）
//   --q N           静态搜索深度（默认 4，和产品 hard 档一致）
//   --open N        开局随机步数（只随合法走子，默认 4；0 = 不随机）
//   --seed N        起始种子；第 i 局用 seed+i
//   --jobs N        并行进程数（默认 2；本机还有别的任务时别开大）
//   --positions N   目标局面数（达到即不再派新对局；会略微超出，最多 jobs-1 局）
//   --games N       目标对局数（--positions 为 0 时使用）
//   --max-rounds N  回合上限（超过判和/未分，默认 150）
//   --audit N       每进程导出前 N 条局面的特征索引，供 Python 端校验编码一致（默认 8）
//   --save-moves    在 games.jsonl 里存每局走法（小样本调试用，大数据别开）
//   --env K=V       给 AI 设环境变量（可多次；进程内先清空所有 BFAI_*，保证可复现）
//   --print-spec    打印特征规格 JSON 后退出
//
// 输出（--out 前缀）：
//   <out>.pos.bin        局面记录（格式见 features.js，56 字节头 + 每子 5 字节）
//   <out>.games.jsonl    每局一行：胜负/原因/回合/手数/局面数/耗时/走法(可选)
//   <out>.meta.json      本次运行的配置、引擎/AI 的 sha256、耗时、位置数/分钟
//   <out>.audit.jsonl    特征索引审计样例（--audit > 0）
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { fork } = require('child_process');
const F = require('./features.js');

const ARGS = parseArgs(process.argv.slice(2));
if (ARGS.printSpec) { console.log(JSON.stringify(F.SPEC, null, 1)); process.exit(0); }
if (ARGS.worker != null) { workerMain(ARGS); } else { main(ARGS); }

// ---------------- 参数 ----------------
function parseArgs(argv) {
  const o = {
    ai: path.resolve(__dirname, '..', 'lab-repo', 'lab', 'candidates', 'release_r15.js'),
    engine: path.resolve(__dirname, '..', 'lab-repo', 'lab', 'src'),
    out: path.resolve(__dirname, 'data', 'selfplay'),
    depth: 3, nodes: 0, budget: 0, q: 4, open: 4,
    seed: 20261026, jobs: 2,
    positions: 0, games: 0, maxRounds: 150, audit: 8,
    saveMoves: false, env: {}, level: 'hard',
    minNodes: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => { const v = argv[++i]; if (v == null) throw new Error(k + ' 缺少值'); return v; };
    switch (k) {
      case '--ai': o.ai = path.resolve(next()); break;
      case '--engine': o.engine = path.resolve(next()); break;
      case '--out': o.out = path.resolve(next()); break;
      case '--depth': o.depth = +next(); break;
      case '--nodes': o.nodes = +next(); break;
      case '--budget': o.budget = +next(); break;
      case '--q': o.q = +next(); break;
      case '--open': o.open = +next(); break;
      case '--seed': o.seed = +next(); break;
      case '--jobs': o.jobs = Math.max(1, +next()); break;
      case '--positions': o.positions = +next(); break;
      case '--games': o.games = +next(); break;
      case '--max-rounds': o.maxRounds = +next(); break;
      case '--audit': o.audit = +next(); break;
      case '--save-moves': o.saveMoves = true; break;
      case '--level': o.level = next(); break;
      case '--min-nodes': o.minNodes = +next(); break;
      case '--env': { const s = next(), p = s.indexOf('='); if (p < 0) throw new Error('--env 要写 K=V'); o.env[s.slice(0, p)] = s.slice(p + 1); break; }
      case '--print-spec': o.printSpec = true; break;
      // 内部：worker 模式
      case '--worker': o.worker = true; break;
      case '--worker-id': o.workerId = +next(); break;
      case '--config': o.configPath = path.resolve(next()); break;
      default: throw new Error('未知参数 ' + k);
    }
  }
  return o;
}

// ---------------- 引擎 / AI 加载 ----------------
function sanitizeEnv(extra) {
  for (const k of Object.keys(process.env)) if (k.startsWith('BFAI_')) delete process.env[k];
  for (const [k, v] of Object.entries(extra || {})) process.env[k] = String(v);
}
function loadEngineAndAI(cfg) {
  sanitizeEnv(cfg.env);
  global.XQ = require(path.join(cfg.engine, 'rules.js'));
  global.BF = require(path.join(cfg.engine, 'bingfa.js'));
  const AI = require(cfg.ai);
  // 教师档：固定层数（可复现）/ 固定节点 / 时间制，三选一
  const base = AI.LEVELS[cfg.level] || AI.LEVELS.hard;
  let L;
  if (cfg.depth > 0) {
    L = { ...base, depth: cfg.depth, q: cfg.q, noise: 0, top: 1, up: 0, budget: 1e9, fixedDepth: cfg.depth, minNodes: 0, dyn: 0 };
    // 固定层数时 r15 的 think 会把 L.depth 改回 fixedDepth；这里 depth 一致即可
  } else if (cfg.nodes > 0) {
    L = { ...base, depth: base.depth || 7, q: cfg.q, noise: 0, top: 1, up: 0, nodes: cfg.nodes, budget: 1e9, minNodes: 0, dyn: 0 };
  } else {
    L = { ...base, q: cfg.q, budget: cfg.budget || 500, nodes: 0, minNodes: cfg.minNodes, dyn: 0, noise: 0, top: 1, up: 0 };
  }
  AI.LEVELS.__nnplay = L;
  return { AI, BF: global.BF, L };
}
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------- 一局自对弈 ----------------
async function playGame(env, gameIdx, seed, cfg) {
  const { AI, BF } = env;
  Math.random = mulberry32((seed >>> 0) * 2654435761);
  const g = new BF.Game();
  const t0 = Date.now();
  const recs = [];
  const audit = [];
  let plies = 0, thinkMs = 0, nodes = 0, moves = 0;
  const actionLog = cfg.saveMoves ? [] : null;
  const recordOf = (side, st) => {
    const rec = F.recordFromState(g.S);
    rec.game = gameIdx;
    rec.ply = plies;
    rec.depth = st && st.depth || 0;
    rec.nodes = st && st.nodes || 0;
    rec.side = side === 'r' ? 0 : 1;
    rec.v100 = Math.round((st && isFinite(st.v) ? st.v : 0) * 100);
    let e = 0; try { e = AI.score(g.S, side); } catch (err) { e = 0; }
    rec.e100 = Math.round((isFinite(e) ? e : 0) * 100);
    let chk = 0; try { chk = BF.ai.inCheck(g.S, side) ? 1 : 0; } catch (err) { }
    rec.check = chk;
    rec.flags = (plies < 10 ? 1 : 0) | (chk << 1) | ((rec.final ? 1 : 0) << 2);
    return rec;
  };
  try {
    while (!g.result) {
      if (g.round > cfg.maxRounds) { return finish('cap'); }
      if (plies > cfg.maxRounds * 8) throw new Error('对局走不完（防呆）');
      if (g.status && g.status.mustPass) {
        if (!g.apply({ k: 'pass' })) throw new Error('停着失败');
        plies++;
        continue;
      }
      const side = g.turn;
      let seq;
      if (plies < cfg.open) {
        // 随机开局：只随合法走子（不含停着/技能/兵法），保证多样性又不至于开局就乱放兵法
        const mv = BF.ai.expand(g.S).filter(k => k.a.k === 'mv');
        if (!mv.length) {
          const any = BF.ai.expand(g.S);
          if (!any.length) throw new Error('没有合法行动');
          seq = [any[Math.floor(Math.random() * any.length)].a];
        } else seq = [mv[Math.floor(Math.random() * mv.length)].a];
      } else {
        const t1 = Date.now();
        seq = await AI.think(BF.cloneState(g.S), '__nnplay');
        const dt = Date.now() - t1;
        const st = AI.think.last || {};
        moves++; thinkMs += dt; nodes += st.nodes || 0;
        const rec = recordOf(side, st);
        recs.push(rec);
        if (cfg.audit > 0 && audit.length < cfg.audit) {
          audit.push({ g: gameIdx, ply: rec.ply, side: rec.side, dim: F.DIM, idx: F.encodeRecord(rec) });
        }
      }
      if (!seq || !seq.length) throw new Error(`电脑没有给出行动（第 ${g.round} 回合，${side === 'r' ? '汉' : '楚'}）`);
      for (const a of seq) {
        if (actionLog) actionLog.push(a);
        const info = g.apply(a);
        if (!info) throw new Error('非法行动 ' + JSON.stringify(a) + '（第 ' + g.round + ' 回合 seed=' + seed + '）');
      }
      plies++;
    }
    return finish(g.result ? g.result.reason : 'result');
  } catch (err) {
    const meta = finish('error');
    meta.error = String(err && err.stack || err);
    return meta;
  }
  function finish(reason) {
    const ms = Date.now() - t0;
    const meta = {
      g: gameIdx, seed, winner: g.result ? g.result.winner : null,
      reason: g.result ? g.result.reason : reason,
      rounds: g.round, plies, nPos: recs.length, moves, nodes, ms,
      open: cfg.open, endMerit: [g.S.merit.r, g.S.merit.b], final: !!g.S.final,
      recs, audit,
    };
    if (actionLog) meta.moves = actionLog;
    return meta;
  }
}

// ---------------- worker 进程 ----------------
function workerMain(args) {
  const cfg = JSON.parse(fs.readFileSync(args.configPath, 'utf8'));
  const id = args.workerId;
  const partPath = cfg.out + '.part' + id + '.bin';
  const auditPath = cfg.out + '.part' + id + '.audit.jsonl';
  const fd = fs.openSync(partPath, 'w');
  fs.writeSync(fd, F.fileHeaderBytes(0, 0, 0));
  let recCount = 0, gameCount = 0;
  let auditFd = cfg.audit > 0 ? fs.openSync(auditPath, 'w') : null;
  let env;
  try {
    env = loadEngineAndAI(cfg);
  } catch (e) {
    process.send({ type: 'fatal', error: String(e && e.stack || e) });
    process.exit(1);
  }
  process.send({ type: 'ready', worker: id, dim: F.DIM });
  let busy = false;
  process.on('message', async (m) => {
    if (m.type === 'job') {
      if (busy) { process.send({ type: 'fatal', error: 'worker busy' }); return; }
      busy = true;
      let meta;
      try {
        meta = await playGame(env, m.g, m.seed, cfg);
      } catch (e) {
        meta = { g: m.g, seed: m.seed, winner: null, reason: 'error', error: String(e && e.stack || e), recs: [], audit: [], nPos: 0 };
      }
      // 写本进程分片（记录缓冲后一次性写，避免大量小写）
      const bufs = [];
      let chunk = Buffer.alloc(1 << 20), off = 0;
      const flush = () => { if (off > 0) { fs.writeSync(fd, chunk.subarray(0, off)); off = 0; } };
      for (const rec of meta.recs) {
        const n = F.recordBytes(rec);
        if (off + n > chunk.length) { flush(); if (n > chunk.length) chunk = Buffer.alloc(n + 1024); }
        F.writeRecord(chunk, off, rec); off += n;
        recCount++;
      }
      flush();
      if (auditFd != null) for (const a of meta.audit) fs.writeSync(auditFd, JSON.stringify(a) + '\n');
      gameCount++;
      delete meta.recs; delete meta.audit;
      process.send({ type: 'game', worker: id, meta });
      busy = false;
    } else if (m.type === 'exit') {
      try { fs.writeSync(fd, Buffer.alloc(0)); fs.closeSync(fd); } catch (e) { }
      if (auditFd != null) { try { fs.closeSync(auditFd); } catch (e) { } }
      // 用另一个小文件记本分片统计（主进程合并时不需要，仅调试）
      fs.writeFileSync(partPath + '.stats.json', JSON.stringify({ recCount, gameCount }));
      process.send({ type: 'exit', worker: id, recCount, gameCount });
      process.exit(0);
    }
  });
}

// ---------------- 主进程：派活、汇总、拼接输出 ----------------
function main(args) {
  const t0 = Date.now();
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  const gameTarget = args.positions > 0 ? 0 : (args.games > 0 ? args.games : 2);
  const jobs = Math.max(1, Math.min(args.jobs, gameTarget > 0 ? gameTarget : args.jobs));
  const cfg = { ...args };
  delete cfg.worker; delete cfg.workerId; delete cfg.configPath; delete cfg.printSpec;
  const cfgPath = args.out + '.cfg.json';
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 1));
  const sha = f => { try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch (e) { return null; } };
  const fingerprints = {
    ai: args.ai, aiSha256: sha(args.ai),
    engineRules: path.join(args.engine, 'rules.js'), engineRulesSha256: sha(path.join(args.engine, 'rules.js')),
    engineBingfa: path.join(args.engine, 'bingfa.js'), engineBingfaSha256: sha(path.join(args.engine, 'bingfa.js')),
    node: process.version, platform: process.platform, arch: process.arch,
    cpus: os.cpus().length, featVersion: F.FEAT_VERSION, dim: F.DIM,
  };
  const teacher = args.depth > 0 ? 'fixedDepth=' + args.depth : args.nodes > 0 ? 'nodes=' + args.nodes : 'budget=' + args.budget + 'ms';
  console.log(`[nn selfplay] engine=${args.engine}`);
  console.log(`[nn selfplay] ai=${args.ai}`);
  console.log(`[nn selfplay] 教师=${teacher} q=${args.q} 开局随机=${args.open}手 jobs=${jobs}`);
  console.log(`[nn selfplay] 目标=${args.positions > 0 ? args.positions + ' 局面' : gameTarget + ' 局'} out=${args.out}`);

  const workers = [], busy = [], ready = [], dead = [], exited = [];
  let nextGame = 0, done = 0, posTotal = 0, errors = 0, stopping = false, finishing = false;
  const gamesMeta = [];
  // 对局元数据边说边写：即使进程被强杀（Windows 上 SIGINT 处理不一定跑得到），已下完的局也能用；
  // 分片 .part*.bin 里是已落盘的局面记录，配合 merge-selfplay.js 可手动收尾。
  let gamesFd = fs.openSync(args.out + '.games.jsonl', 'w');
  const maxGames = args.positions > 0 ? 1000000 : gameTarget;
  const allStopped = () => workers.every((w, i) => !w || dead[i] || exited[i]);

  const onGame = (id, meta) => {
    busy[id] = false;
    done++;
    posTotal += meta.nPos || 0;
    if (meta.error) { errors++; console.error(`[w${id}] game ${meta.g} 出错：${String(meta.error).split('\n')[0]}`); }
    gamesMeta.push(meta);
    try { fs.writeSync(gamesFd, JSON.stringify(meta) + '\n'); } catch (e) { }
    console.log(`[w${id}] #${meta.g} seed=${meta.seed} ${meta.winner ? (meta.winner === 'r' ? '汉胜' : '楚胜') : '未分'}(${meta.reason}) 回合=${meta.rounds} 手=${meta.plies} 局面+${meta.nPos} 总=${posTotal} ${(meta.ms / 1000).toFixed(1)}s`);
    // 进度行（每 10 局）：局面/分钟 + 预计剩余，方便夜间盯速率（lead 定的 150 局面/分钟报警线）
    if (done === 1 || done % 10 === 0) {
      const el = (Date.now() - t0) / 1000, rate = posTotal / (el / 60);
      let eta = '';
      if (args.positions > 0 && rate > 0) { const left = Math.max(0, args.positions - posTotal); eta = ` 剩余约 ${(left / rate / 60).toFixed(1)}h`; }
      console.log(`[进度] ${done} 局 / ${posTotal} 局面 / ${(el / 60).toFixed(1)} 分钟 = ${rate.toFixed(1)} 局面/分钟${eta}`);
    }
  };
  const maybeStop = () => {
    if (stopping || finishing) return;
    const reached = args.positions > 0 ? posTotal >= args.positions : done >= gameTarget;
    const noMore = nextGame >= maxGames;
    const tooManyErrors = errors >= 20 && posTotal === 0;
    if (reached || (noMore && workers.every((w, i) => !w || busy[i] === false)) || allStopped() || tooManyErrors) {
      if (tooManyErrors) console.error('[nn selfplay] 连续出错且没有数据，中止');
      stopping = true;
      console.log(`[nn selfplay] 停止派新对局（已完成 ${done} 局 / ${posTotal} 局面）`);
      for (let i = 0; i < jobs; i++) {
        const w = workers[i];
        if (w && !dead[i] && !exited[i] && w.connected) { try { w.send({ type: 'exit' }); } catch (e) { } }
      }
      if (allStopped()) finalize();
    }
  };
  const pump = () => {
    if (stopping) return;
    for (let i = 0; i < jobs; i++) {
      if (!ready[i] || busy[i] || dead[i] || exited[i]) continue;
      if (args.positions > 0 ? posTotal >= args.positions : done >= gameTarget) break;
      if (nextGame >= maxGames) break;
      const g = nextGame++;
      busy[i] = true;
      try { workers[i].send({ type: 'job', g, seed: args.seed + g }); }
      catch (e) { busy[i] = false; dead[i] = true; errors++; console.error(`[w${i}] send 失败：${e.message}`); }
    }
    maybeStop();
  };

  for (let id = 0; id < jobs; id++) {
    const child = fork(__filename, ['--worker', '--worker-id', String(id), '--config', cfgPath], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    workers[id] = child; busy[id] = false; ready[id] = false; dead[id] = false; exited[id] = false;
    child.on('message', m => {
      if (m.type === 'ready') { ready[id] = true; pump(); }
      else if (m.type === 'fatal') { dead[id] = true; errors++; console.error(`[w${id}] fatal：${m.error}`); maybeStop(); }
      else if (m.type === 'game') { onGame(id, m.meta); pump(); maybeStop(); }
      else if (m.type === 'exit') { /* 等 exit 事件 */ }
    });
    child.on('exit', (code) => {
      exited[id] = true;
      if (!stopping && code !== 0) { errors++; console.error(`[w${id}] 意外退出 code=${code}`); }
      maybeStop();
      if (stopping === false && allStopped()) maybeStop();
      if (stopping && allStopped()) finalize();
    });
    child.on('error', e => { errors++; console.error(`[w${id}] error：${e.message}`); });
  }
  const tick = setInterval(() => { pump(); }, 500);
  process.on('SIGINT', () => {
    if (!stopping && !finishing) {
      console.log('\n[nn selfplay] 收到中断：把已完成的局写盘后退出');
      stopping = true;
      for (let i = 0; i < jobs; i++) { const w = workers[i]; if (w && !dead[i] && !exited[i] && w.connected) { try { w.send({ type: 'exit' }); } catch (e) { } } }
    }
  });

  let finalized = false;
  function finalize() {
    if (finalized) return;
    finalized = true;
    clearInterval(tick);
    try { fs.closeSync(gamesFd); } catch (e) { }
    try { fs.unlinkSync(cfgPath); } catch (e) { }
    const outBin = args.out + '.pos.bin';
    const outFd = fs.openSync(outBin, 'w');
    fs.writeSync(outFd, F.fileHeaderBytes(0, 0, 0));
    let recCount = 0;
    for (let i = 0; i < workers.length; i++) {
      const p = args.out + '.part' + i + '.bin';
      if (!fs.existsSync(p)) continue;
      const buf = fs.readFileSync(p);
      if (buf.length > F.HEADER_BYTES) {
        fs.writeSync(outFd, buf.subarray(F.HEADER_BYTES));
        // 分片记录数：按每条记录长度扫描（比信任 stats 更稳）
        let off = F.HEADER_BYTES;
        while (off + F.PREFIX_BYTES <= buf.length) {
          const n = buf[off + 9];
          off += F.PREFIX_BYTES + F.PIECE_BYTES * n;
          recCount++;
        }
      }
      try { fs.unlinkSync(p); fs.unlinkSync(p + '.stats.json'); } catch (e) { }
    }
    fs.writeSync(outFd, F.fileHeaderBytes(recCount, gamesMeta.length, Math.floor(t0 / 1000)), 0, F.HEADER_BYTES, 0);
    fs.closeSync(outFd);
    // 审计样例合并
    const auditParts = [];
    for (let i = 0; i < workers.length; i++) {
      const p = args.out + '.part' + i + '.audit.jsonl';
      if (fs.existsSync(p)) { auditParts.push(fs.readFileSync(p, 'utf8')); try { fs.unlinkSync(p); } catch (e) { } }
    }
    fs.writeFileSync(args.out + '.audit.jsonl', auditParts.join(''));
    // games.jsonl
    gamesMeta.sort((a, b) => a.g - b.g);
    fs.writeFileSync(args.out + '.games.jsonl', gamesMeta.map(m => JSON.stringify(m)).join('\n') + (gamesMeta.length ? '\n' : ''));
    // meta.json
    const elapsed = Date.now() - t0;
    const wins = { r: gamesMeta.filter(m => m.winner === 'r').length, b: gamesMeta.filter(m => m.winner === 'b').length, draw: gamesMeta.filter(m => !m.winner).length };
    const reasons = {};
    for (const m of gamesMeta) reasons[m.reason] = (reasons[m.reason] || 0) + 1;
    const meta = {
      ...fingerprints, args, elapsedMs: elapsed,
      games: gamesMeta.length, positions: recCount, jobs,
      positionsPerMin: recCount ? +(recCount / (elapsed / 60000)).toFixed(1) : 0,
      positionsPerSec: recCount ? +(recCount / (elapsed / 1000)).toFixed(2) : 0,
      avgGameMs: gamesMeta.length ? Math.round(gamesMeta.reduce((a, m) => a + m.ms, 0) / gamesMeta.length) : 0,
      avgPosPerGame: gamesMeta.length ? +(recCount / gamesMeta.length).toFixed(1) : 0,
      posFileBytes: fs.statSync(outBin).size,
      wins, reasons, errors,
    };
    fs.writeFileSync(args.out + '.meta.json', JSON.stringify(meta, null, 1));
    console.log(`[nn selfplay] 完成：${recCount} 局面 / ${gamesMeta.length} 局，耗时 ${(elapsed / 1000).toFixed(1)}s，${meta.positionsPerMin} 局面/分钟`);
    console.log(`[nn selfplay] 输出：${outBin}（${(fs.statSync(outBin).size / 1024).toFixed(1)} KB） + .games.jsonl / .meta.json / .audit.jsonl`);
    process.exit(recCount > 0 ? 0 : 1);
  }
}
