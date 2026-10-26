// ===== NN 评估试点：数据格式 + 特征编码 v1（唯一权威定义）=====
// 这份文件同时定义：
//   1) positions.bin 的二进制布局（56 字节定长头 + 每子 5 字节）
//   2) v1 稀疏二值特征布局（偏移/维度由下面的 B() 自动累加）
//   3) 从局面状态 S 提取「记录」（record）的函数
// 训练端 ai-work/nn/features.py 必须与本文件逐位一致；两侧一致性用
//   `node make-selfplay.js ... --audit` + `python features.py --check-audit` 自动校验。
//
// 坐标：cell = r*9 + f，r=0 是汉方底线，f=0..8 从汉方左到右；side: 'r'=汉(0), 'b'=楚(1)。
// 视角：不做先后手翻转（本游戏汉楚规则不对称：兵法/终极兵法/技能都不同）。
//   特征里带绝对方 + 走子方标记，网络输出 = 走子方视角的评估分（和 BFAI.score(S, me) 同口径）。
'use strict';

const FEAT_VERSION = 1;
const BIN_MAGIC = 'NNP1';
const BIN_FMT_VERSION = 1;
const PREFIX_BYTES = 56;      // 定长记录头
const PIECE_BYTES = 5;        // 每子 5 字节

const TYPE_ORDER = ['k', 'a', 'e', 'r', 'n', 'c', 'p'];   // typeIdx 0..6
const N6 = ['a', 'e', 'r', 'n', 'c', 'p'];                // 无帅子种（技能相关块用）
const TYPE_IDX = {}; TYPE_ORDER.forEach((t, i) => { TYPE_IDX[t] = i; });
const T6_IDX = {}; N6.forEach((t, i) => { T6_IDX[t] = i; });
const CELLS = 90, SIDES = 2, TYPES = 7, HP = 4, LV = 4;

// ---------- 特征块（offset 自动累加） ----------
const blocks = [];
let _off = 0;
const B = (name, dim, note) => { const b = { name, offset: _off, dim, note }; blocks.push(b); _off += dim; return b; };
B('piece', SIDES * TYPES * HP * LV * CELLS, '每子一维: side,type,hp-1,lv-1,cell');
B('xp', SIDES * TYPES * 6, '甲片 xp=1..6（>6 记 6）');
B('cd', SIDES * N6.length, '该方该兵种有子主技能冷却中');
B('frozen', SIDES * N6.length, '该方该兵种有子被背水冻结');
B('revived', SIDES, '该方有刚召回的子在场上');
B('junlock', SIDES * N6.length, '该方该兵种有子已决战解禁(j)');
B('jm', SIDES, '该方有拒马生效中的兵');
B('stm', SIDES, '走子方');
B('round', 41, '回合 1..40 各一维，41+ 合并');
B('meritR', 31, '汉方军功 0..30');
B('meritB', 31, '楚方军功 0..30');
B('usedArtR', 3, '汉方主帅兵法已用次数 0/1/2');
B('usedArtB', 3, '楚方主帅兵法已用次数 0/1/2');
B('usedUltR', 2, '汉方终极兵法已用 0/1');
B('usedUltB', 2, '楚方终极兵法已用 0/1');
B('fxHm', 9, '鸿门宴剩余 0..8');
B('fxSm', 9, '四面楚歌剩余 0..8');
B('fxPf', 9, '破釜沉舟封锁剩余 0..8');
B('final', 1, '已进入决战');
B('occR', 5, '汉方决战占宫计数 0..4');
B('occB', 5, '楚方决战占宫计数 0..4');
B('dead', SIDES * TYPES * 3, '每方每兵种阵亡数 0/1/2+');
B('deadBestR', TYPES * HP, '汉方每兵种阵亡子最高等级(召回用) lv1..4');
B('flags', 4, 'upgraded / freeUsed / jmLock / 走子方被将军');

const DIM = _off;
const OFF = {}; blocks.forEach(b => { OFF[b.name] = b.offset; });
const BLOCK = {}; blocks.forEach(b => { BLOCK[b.name] = b; });

// ---------- 记录（二进制）布局 ----------
// 定长头 56 字节（小端）：
//   0  u32 game      对局号
//   4  u16 ply       第几手（0 起）
//   6  u8  side      走子方 0=汉 1=楚
//   7  u8  depth     搜索完成层数（think.last.depth）
//   8  u8  flags     bit0=开局阶段(手数<10), bit1=走子方被将军, bit2=局面已决战
//   9  u8  nPieces   盘上子数
//   10 u16 reserved
//   12 u32 nodes     搜索节点数
//   16 i32 v100      搜索分（走子方视角）×100
//   20 i32 e100      手写静态分 BFAI.score（走子方视角）×100
//   24 u16 cntR      汉方已走行动数
//   26 u16 cntB      楚方已走行动数
//   28 u8  round     当前回合
//   29 u8  meritR    29..30 军功
//   30 u8  meritB
//   31 u8  usedArtR  主帅兵法已用次数
//   32 u8  usedArtB
//   33 u8  usedUltR  终极兵法已用次数
//   34 u8  usedUltB
//   35 u8  fxHm      鸿门宴剩余
//   36 u8  fxSm      四面楚歌剩余
//   37 u8  fxPf      破釜沉舟封锁剩余
//   38 u8  occR
//   39 u8  occB
//   40 u8  deadR     阵亡总数
//   41 u8  deadB
//   42 u8  deadMaskR 阵亡兵种掩码 bit(typeIdx)
//   43 u8  deadMaskB
//   44 u8  flags2    bit0=本回合已升级, bit1=已用不占行动拒马, bit2=有子被拒马锁住
//   45 u8  reserved
//   46 u16 reserved
//   48 u32 deadBestR 汉方每兵种阵亡最高等级，3bit/兵种（0=无，1..4=等级）
//   52 u32 reserved
// 之后 nPieces × 5 字节：
//   b0 u8 cell 0..89
//   b1 u8 typeIdx | side<<3 | (hp-1)<<4 | (lv-1)<<6
//   b2 u8 xp(0..7) | j<<3 | frozen<<4 | revived<<5 | reserved(2b)
//   b3 u8 cdRemain(0..15) | jmActive(0/1)<<4
//   b4 u8 bzRemain(0..15) | rh<<4 | cCdCount(0..7)<<5
const HEADER_BYTES = 24;   // 文件头：magic4 + fmt u16 + feat u16 + recCount u32 + gameCount u32 + epoch u32 + reserved u32
const REC_HEADER = PREFIX_BYTES;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const u8 = v => clamp(Math.round(v) || 0, 0, 255);
const u16 = v => clamp(Math.round(v) || 0, 0, 65535);

function packTypeIdx(t) { const i = TYPE_IDX[t]; return i == null ? 0 : i; }

// 从引擎局面状态 S 提取一条记录（不含 game/ply/labels，由调用方补）
// S: bingfa Game.S（board/turn/cnt/merit/used/fx/dead/occ/final/upgraded/freeUsed/jmLock）
function recordFromState(S) {
  const pieces = [];
  const frz = { r: new Set(), b: new Set() }, cds = { r: new Set(), b: new Set() }, jun = { r: new Set(), b: new Set() };
  const jmSide = { r: 0, b: 0 }, revived = { r: 0, b: 0 };
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
    const p = S.board[r][f]; if (!p) continue;
    const side = p.s === 'r' ? 0 : 1, all = S.cnt[p.s] || 0;
    const frozen = !!(p.bz && all < p.bz);
    const cd = Math.max(0, (p.cd || 0) - all);
    const rv = !!(p.rv && S.cnt.r === p.rv && S.turn === 'b');
    let cCd = 0;
    for (const k of Object.keys(p)) if (k.startsWith('c_') && (p[k] || 0) > all) cCd++;
    const t = p.t;
    if (t !== 'k') {
      const t6 = T6_IDX[t];
      if (frozen) frz[p.s].add(t6);
      if (cd > 0) cds[p.s].add(t6);
      if (p.j) jun[p.s].add(t6);
    }
    // 拒马生效：p.jm 是“到第几次对方行动前有效”，活着的兵且 jm > 对方已走行动数
    const jmActive = !!(t === 'p' && p.jm && p.jm > (S.cnt[p.s === 'r' ? 'b' : 'r'] || 0));
    if (jmActive) jmSide[p.s] = 1;
    if (rv) revived[p.s] = 1;
    pieces.push({
      cell: r * 9 + f, side, type: packTypeIdx(t),
      hp: clamp(p.hp || 1, 1, 4), lv: clamp(p.lv || 1, 1, 4),
      xp: clamp(p.xp || 0, 0, 7),
      j: p.j ? 1 : 0, frozen: frozen ? 1 : 0, revived: rv ? 1 : 0,
      cd: clamp(cd, 0, 15), jm: jmActive ? 1 : 0,
      bz: clamp(p.bz ? Math.max(0, p.bz - all) : 0, 0, 15),
      rh: p.rh ? 1 : 0, cCd: clamp(cCd, 0, 7),
    });
  }
  // 阵亡统计
  const dead = { r: S.dead.r || [], b: S.dead.b || [] };
  const deadMask = { r: 0, b: 0 };
  let deadBestR = 0;
  for (const s of ['r', 'b']) for (const d of dead[s]) deadMask[s] |= 1 << packTypeIdx(d.t);
  for (const d of dead.r) { const lv = clamp(d.lv || 1, 1, 4); const sh = 3 * packTypeIdx(d.t); deadBestR |= lv << sh; }
  const fx = S.fx || { hm: 0, sm: 0, pf: 0 };
  return {
    side: S.turn === 'r' ? 0 : 1,
    round: clamp(Math.floor(((S.cnt.r || 0) + (S.cnt.b || 0)) / 2) + 1, 1, 255),
    cntR: u16(S.cnt.r), cntB: u16(S.cnt.b),
    meritR: u8(S.merit.r), meritB: u8(S.merit.b),
    usedArtR: u8((S.used.art || {}).r), usedArtB: u8((S.used.art || {}).b),
    usedUltR: u8((S.used.ult || {}).r), usedUltB: u8((S.used.ult || {}).b),
    fxHm: u8(Math.max(0, (fx.hm || 0) - (S.cnt.r || 0))),
    fxSm: u8(Math.max(0, (fx.sm || 0) - (S.cnt.b || 0))),
    fxPf: u8(Math.max(0, (fx.pf || 0) - (S.cnt.b || 0))),
    occR: u8((S.occ || {}).r), occB: u8((S.occ || {}).b),
    final: S.final ? 1 : 0,
    deadR: u8(dead.r.length), deadB: u8(dead.b.length),
    deadMaskR: u8(deadMask.r), deadMaskB: u8(deadMask.b), deadBestR: deadBestR >>> 0,
    upgraded: S.upgraded ? 1 : 0, freeUsed: S.freeUsed ? 1 : 0, jmLock: S.jmLock != null ? 1 : 0,
    pieces,
  };
}

// 从二进制解码出的裸记录（features.py 用同样的字段名）→ 特征索引。
// rec 需含：side, round, meritR/meritB, usedArtR/.../usedUltB, fxHm/fxSm/fxPf, occR/occB, final,
//   deadR/deadB/deadMaskR/deadMaskB, deadBestR, upgraded/freeUsed/jmLock/check, pieces[]
// pieces[]：{cell,side,type,hp,lv,xp,j,frozen,revived,cd,jm,bz,rh,cCd}
function encodeRecord(rec, out) {
  const idx = out || new Set();
  const add = (block, k) => { const b = BLOCK[block]; if (b && k >= 0 && k < b.dim) idx.add(b.offset + k); };
  const t6 = t => (t === 0 ? -1 : t - 1);   // typeIdx→N6 idx（k=0 时无）
  const frz = { 0: new Set(), 1: new Set() }, cds = { 0: new Set(), 1: new Set() }, jun = { 0: new Set(), 1: new Set() };
  const jmSide = { 0: 0, 1: 0 }, revived = { 0: 0, 1: 0 };
  for (const p of rec.pieces) {
    add('piece', ((((p.side * TYPES + p.type) * HP + (p.hp - 1)) * LV + (p.lv - 1)) * CELLS) + p.cell);
    if (p.xp > 0) add('xp', (((p.side * TYPES + p.type) * 6) + (Math.min(p.xp, 6) - 1)));
    const k6 = t6(p.type);
    if (k6 >= 0) {
      if (p.frozen) frz[p.side].add(k6);
      if (p.cd > 0 || p.cCd > 0) cds[p.side].add(k6);
      if (p.j) jun[p.side].add(k6);
    }
    if (p.type === 6 && p.jm > 0) jmSide[p.side] = 1;   // 6 = 'p'
    if (p.revived) revived[p.side] = 1;
  }
  for (const s of [0, 1]) {
    for (const k6 of frz[s]) add('frozen', s * N6.length + k6);
    for (const k6 of cds[s]) add('cd', s * N6.length + k6);
    for (const k6 of jun[s]) add('junlock', s * N6.length + k6);
    if (revived[s]) add('revived', s);
    if (jmSide[s]) add('jm', s);
  }
  const stm = rec.side | 0;
  add('stm', stm);
  add('round', Math.min(rec.round, 41) - 1);
  add('meritR', Math.min(rec.meritR, 30));
  add('meritB', Math.min(rec.meritB, 30));
  add('usedArtR', Math.min(rec.usedArtR, 2));
  add('usedArtB', Math.min(rec.usedArtB, 2));
  add('usedUltR', rec.usedUltR ? 1 : 0);
  add('usedUltB', rec.usedUltB ? 1 : 0);
  add('fxHm', Math.min(rec.fxHm, 8));
  add('fxSm', Math.min(rec.fxSm, 8));
  add('fxPf', Math.min(rec.fxPf, 8));
  if (rec.final) add('final', 0);
  add('occR', Math.min(rec.occR, 4));
  add('occB', Math.min(rec.occB, 4));
  // 阵亡计数：每方每兵种 0/1/2+
  // 由 deadMask + deadR 精确到兵种的计数不存二进制，只存总数与掩码；
  // 近似：阵亡数按掩码里的兵种均摊？不行——改为只编码掩码层面的 0/1（v1 用掩码，不用计数）
  for (const s of [0, 1]) {
    const mask = s === 0 ? rec.deadMaskR : rec.deadMaskB;
    const cnt = s === 0 ? rec.deadR : rec.deadB;
    for (let ti = 0; ti < TYPES; ti++) if (mask & (1 << ti)) {
      add('dead', (s * TYPES + ti) * 3 + (cnt >= 2 ? 2 : 1));
    }
  }
  // 汉方召回：每兵种阵亡最高等级（deadBestR 3bit/兵种）
  for (let ti = 0; ti < TYPES; ti++) {
    const lv = (rec.deadBestR >>> (3 * ti)) & 7;
    if (lv >= 1 && lv <= 4) add('deadBestR', ti * HP + (lv - 1));
  }
  if (rec.upgraded) add('flags', 0);
  if (rec.freeUsed) add('flags', 1);
  if (rec.jmLock) add('flags', 2);
  if (rec.check) add('flags', 3);
  // Set → 排序数组（与 Python 端一致）
  const arr = Array.from(idx); arr.sort((a, b) => a - b);
  return arr;
}

// 从局面状态直接编码（Node 推理用；内部用 recordFromState）
function encodeState(S, check) {
  const rec = recordFromState(S);
  rec.check = check == null ? 0 : (check ? 1 : 0);
  return encodeRecord(rec);
}

// 推理热路径：不建 record 对象、不建 Set，直接写 Int32Array + 位掩码去重 + TypedArray 数值排序。
// 与 encodeState(S, check) 逐位一致（bench-inference.js 里逐局面核对过 60/60）。
// check：走子方是否被将军（0/1，可选；训练/审计数据里含该特征，推理时要传一致的值）。
let _fastBuf = null;
function encodeStateFast(S, check) {
  if (!_fastBuf) _fastBuf = new Int32Array(256);
  const idx = _fastBuf;
  let n = 0;
  const frzMask = _frzMask || (_frzMask = [0, 0]), cdMask = _cdMask || (_cdMask = [0, 0]), junMask = _junMask || (_junMask = [0, 0]);
  frzMask[0] = frzMask[1] = cdMask[0] = cdMask[1] = junMask[0] = junMask[1] = 0;
  let jmSide = 0, revivedSide = 0;
  const cnt = S.cnt;
  for (let r = 0; r < 10; r++) {
    const row = S.board[r];
    for (let f = 0; f < 9; f++) {
      const p = row[f];
      if (!p) continue;
      const side = p.s === 'r' ? 0 : 1;
      const t = TYPE_IDX[p.t];
      const hp = p.hp < 1 ? 1 : p.hp > 4 ? 4 : p.hp;
      const lv = p.lv < 1 ? 1 : p.lv > 4 ? 4 : p.lv;
      idx[n++] = (((((side * 7 + t) * 4 + (hp - 1)) * 4) + (lv - 1)) * 90) + r * 9 + f;
      const xp = p.xp || 0;
      if (xp > 0) idx[n++] = OFF.xp + (side * 7 + t) * 6 + (xp > 6 ? 5 : xp - 1);
      const all = cnt[p.s];
      if (p.t !== 'k') {
        const k6 = T6_IDX[p.t];
        if (p.bz && all < p.bz) frzMask[side] |= 1 << k6;
        if (((p.cd || 0) - all) > 0) cdMask[side] |= 1 << k6;
        else {
          let cc = 0;
          for (const k in p) if (k.charCodeAt(0) === 99 && k.charCodeAt(1) === 95 && (p[k] || 0) > all) cc++;   // 'c_'
          if (cc) cdMask[side] |= 1 << k6;
        }
        if (p.j) junMask[side] |= 1 << k6;
      }
      if (p.t === 'p' && p.jm && p.jm > cnt[p.s === 'r' ? 'b' : 'r']) jmSide |= 1 << side;
      if (p.rv && cnt.r === p.rv && S.turn === 'b') revivedSide |= 1 << side;
    }
  }
  for (let s = 0; s < 2; s++) {
    for (let k6 = 0; k6 < 6; k6++) {
      if (frzMask[s] & (1 << k6)) idx[n++] = OFF.frozen + s * 6 + k6;
      if (cdMask[s] & (1 << k6)) idx[n++] = OFF.cd + s * 6 + k6;
      if (junMask[s] & (1 << k6)) idx[n++] = OFF.junlock + s * 6 + k6;
    }
    if (revivedSide & (1 << s)) idx[n++] = OFF.revived + s;
    if (jmSide & (1 << s)) idx[n++] = OFF.jm + s;
  }
  const stm = S.turn === 'r' ? 0 : 1;
  idx[n++] = OFF.stm + stm;
  const rnd = Math.floor((cnt.r + cnt.b) / 2) + 1;
  idx[n++] = OFF.round + (rnd > 41 ? 40 : rnd - 1);
  idx[n++] = OFF.meritR + Math.min(S.merit.r, 30);
  idx[n++] = OFF.meritB + Math.min(S.merit.b, 30);
  const U = S.used || {};
  idx[n++] = OFF.usedArtR + Math.min(((U.art || {}).r || 0), 2);
  idx[n++] = OFF.usedArtB + Math.min(((U.art || {}).b || 0), 2);
  idx[n++] = OFF.usedUltR + (((U.ult || {}).r) ? 1 : 0);
  idx[n++] = OFF.usedUltB + (((U.ult || {}).b) ? 1 : 0);
  const fx = S.fx || { hm: 0, sm: 0, pf: 0 };
  const b9 = v => (v > 8 ? 8 : v < 0 ? 0 : v);
  idx[n++] = OFF.fxHm + b9((fx.hm || 0) - cnt.r);
  idx[n++] = OFF.fxSm + b9((fx.sm || 0) - cnt.b);
  idx[n++] = OFF.fxPf + b9((fx.pf || 0) - cnt.b);
  if (S.final) idx[n++] = OFF.final;
  const occ = S.occ || {};
  idx[n++] = OFF.occR + Math.min(occ.r || 0, 4);
  idx[n++] = OFF.occB + Math.min(occ.b || 0, 4);
  for (const s of ['r', 'b']) {
    const dd = S.dead[s] || [];
    if (!dd.length) continue;
    let mask = 0;
    for (const d of dd) mask |= 1 << TYPE_IDX[d.t];
    const cntD = dd.length;
    for (let ti = 0; ti < 7; ti++) if (mask & (1 << ti)) idx[n++] = OFF.dead + ((s === 'r' ? 0 : 1) * 7 + ti) * 3 + (cntD >= 2 ? 2 : 1);
  }
  const bestR = _bestR || (_bestR = [0, 0, 0, 0, 0, 0, 0]);
  for (let ti = 0; ti < 7; ti++) bestR[ti] = 0;
  for (const d of (S.dead.r || [])) { const ti = TYPE_IDX[d.t]; const lv = d.lv < 1 ? 1 : d.lv > 4 ? 4 : d.lv; if (lv > bestR[ti]) bestR[ti] = lv; }
  for (let ti = 0; ti < 7; ti++) if (bestR[ti]) idx[n++] = OFF.deadBestR + ti * 4 + bestR[ti] - 1;
  if (S.upgraded) idx[n++] = OFF.flags;
  if (S.freeUsed) idx[n++] = OFF.flags + 1;
  if (S.jmLock != null) idx[n++] = OFF.flags + 2;
  if (check) idx[n++] = OFF.flags + 3;
  const sub = idx.subarray(0, n);
  sub.sort();
  return sub;
}
let _frzMask = null, _cdMask = null, _junMask = null, _bestR = null;

// ---------- 二进制写入 ----------
function writeRecord(buf, o, rec) {
  buf.writeUInt32LE(rec.game >>> 0, o); o += 4;
  buf.writeUInt16LE(rec.ply & 0xffff, o); o += 2;
  buf.writeUInt8(rec.side & 1, o); o += 1;
  buf.writeUInt8(clamp(rec.depth || 0, 0, 255), o); o += 1;
  buf.writeUInt8(clamp(rec.flags || 0, 0, 255), o); o += 1;
  buf.writeUInt8(rec.pieces.length, o); o += 1;
  o += 2; // reserved
  buf.writeUInt32LE(rec.nodes >>> 0, o); o += 4;
  buf.writeInt32LE(rec.v100 | 0, o); o += 4;
  buf.writeInt32LE(rec.e100 | 0, o); o += 4;
  buf.writeUInt16LE(rec.cntR, o); o += 2;
  buf.writeUInt16LE(rec.cntB, o); o += 2;
  buf.writeUInt8(rec.round, o); o += 1;
  buf.writeUInt8(rec.meritR, o); o += 1;
  buf.writeUInt8(rec.meritB, o); o += 1;
  buf.writeUInt8(rec.usedArtR, o); o += 1;
  buf.writeUInt8(rec.usedArtB, o); o += 1;
  buf.writeUInt8(rec.usedUltR, o); o += 1;
  buf.writeUInt8(rec.usedUltB, o); o += 1;
  buf.writeUInt8(rec.fxHm, o); o += 1;
  buf.writeUInt8(rec.fxSm, o); o += 1;
  buf.writeUInt8(rec.fxPf, o); o += 1;
  buf.writeUInt8(rec.occR, o); o += 1;
  buf.writeUInt8(rec.occB, o); o += 1;
  buf.writeUInt8(rec.deadR, o); o += 1;
  buf.writeUInt8(rec.deadB, o); o += 1;
  buf.writeUInt8(rec.deadMaskR, o); o += 1;
  buf.writeUInt8(rec.deadMaskB, o); o += 1;
  buf.writeUInt8((rec.upgraded ? 1 : 0) | ((rec.freeUsed ? 1 : 0) << 1) | ((rec.jmLock ? 1 : 0) << 2), o); o += 1;
  o += 1; // reserved
  o += 2; // reserved
  buf.writeUInt32LE(rec.deadBestR >>> 0, o); o += 4;
  o += 4; // reserved
  for (const p of rec.pieces) {
    buf.writeUInt8(p.cell, o); o += 1;
    buf.writeUInt8((p.type & 7) | ((p.side & 1) << 3) | (((p.hp - 1) & 3) << 4) | (((p.lv - 1) & 3) << 6), o); o += 1;
    buf.writeUInt8((Math.min(p.xp, 7) & 7) | ((p.j ? 1 : 0) << 3) | ((p.frozen ? 1 : 0) << 4) | ((p.revived ? 1 : 0) << 5), o); o += 1;
    buf.writeUInt8((Math.min(p.cd, 15) & 15) | ((Math.min(p.jm, 15) & 15) << 4), o); o += 1;
    buf.writeUInt8((Math.min(p.bz, 15) & 15) | ((p.rh ? 1 : 0) << 4) | ((Math.min(p.cCd, 7) & 7) << 5), o); o += 1;
  }
  return PREFIX_BYTES + PIECE_BYTES * rec.pieces.length;
}
function recordBytes(rec) { return PREFIX_BYTES + PIECE_BYTES * rec.pieces.length; }
function fileHeaderBytes(recCount, gameCount, epoch) {
  const b = Buffer.alloc(HEADER_BYTES);
  b.write(BIN_MAGIC, 0, 'latin1');
  b.writeUInt16LE(BIN_FMT_VERSION, 4);
  b.writeUInt16LE(FEAT_VERSION, 6);
  b.writeUInt32LE(recCount >>> 0, 8);
  b.writeUInt32LE(gameCount >>> 0, 12);
  b.writeUInt32LE((epoch || 0) >>> 0, 16);
  b.writeUInt32LE(0, 20);
  return b;
}

const SPEC = {
  featVersion: FEAT_VERSION, dim: DIM, blocks,
  bin: { magic: BIN_MAGIC, fmtVersion: BIN_FMT_VERSION, headerBytes: HEADER_BYTES, prefixBytes: PREFIX_BYTES, pieceBytes: PIECE_BYTES },
  typeOrder: TYPE_ORDER,
};

module.exports = {
  FEAT_VERSION, DIM, OFF, blocks, SPEC,
  TYPE_ORDER, TYPE_IDX, T6_IDX, N6, CELLS,
  HEADER_BYTES, PREFIX_BYTES, PIECE_BYTES, BIN_MAGIC,
  recordFromState, encodeRecord, encodeState, encodeStateFast,
  writeRecord, recordBytes, fileHeaderBytes,
};
