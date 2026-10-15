"use strict";

const path = require("path");

const os = require("os");

const {fork: fork} = require("child_process");

const SRC = path.join(__dirname, "..", "src");

const parseNodes = v => {
    if (v == null || v === "" || v === 0) return null;
    if (typeof v === "object") return v;
    if (/^\d+$/.test(String(v))) return {
        "*": +v
    };
    const o = {};
    for (const kv of String(v).split(",")) {
        const [k, n] = kv.split("=");
        o[k.trim()] = +n;
    }
    return o;
};

const applyNodes = (LEVELS, spec, extra = {}) => {
    if (!spec) return;
    for (const k of Object.keys(LEVELS)) {
        const base = k.replace(/Save$/, "");
        const lv = extra[base] || base;
        const n = spec[lv] != null ? spec[lv] : spec["*"];
        if (n) LEVELS[k].nodes = n;
    }
};

const PRESETS = {
    baseline: {
        set: {
            "merit.start": 0,
            "merit.autoIncomeFromRound": 99999,
            "merit.checkReward": 0,
            "merit.pawnCrossRiverReward": 0,
            "merit.lostPieceCompensation": 0,
            "merit.killRewardPerLevel": 0,
            "merit.killReward": {
                p: 0,
                a: 0,
                e: 0,
                n: 0,
                c: 0,
                r: 0
            },
            "upgrade.autoByPlates": false
        },
        noArts: true
    },
    "no-simian": {
        set: {
            "ultimates.simian.usesPerGame": 0
        }
    },
    "no-hongmen": {
        set: {
            "ultimates.hongmen.usesPerGame": 0
        }
    },
    "no-ult": {
        set: {
            "ultimates.simian.usesPerGame": 0,
            "ultimates.hongmen.usesPerGame": 0
        }
    },
    "no-revive": {
        set: {
            "generalArts.xiaohe.usesPerGame": 0
        }
    },
    "no-pofu": {
        set: {
            "generalArts.pofu.usesPerGame": 0
        }
    },
    "no-arts": {
        set: {
            "generalArts.xiaohe.usesPerGame": 0,
            "generalArts.pofu.usesPerGame": 0
        }
    },
    "no-e4": {
        set: {
            "upgrade.maxLevel": {
                r: 4,
                p: 4,
                a: 4,
                e: 3
            }
        }
    }
};

PRESETS["pofu-noup"] = {
    set: {},
    patches: [ "pofu-noup" ]
};

PRESETS["pofu-1kill"] = {
    set: {},
    patches: [ "pofu-1kill" ]
};

PRESETS["pofu-2pc"] = {
    set: {},
    patches: [ "pofu-2pc" ]
};

PRESETS["pofu-a"] = {
    set: {},
    patches: [ "pofu-noup" ]
};

PRESETS["pofu-b"] = {
    set: {},
    patches: [ "pofu-noup", "pofu-1kill" ]
};

PRESETS["pofu-a2pc"] = {
    set: {},
    patches: [ "pofu-noup", "pofu-2pc" ]
};

PRESETS["pofu-a16"] = {
    set: {},
    patches: [ "pofu-noup", "pofu-from16" ]
};

PRESETS["revive-free"] = {
    set: {},
    patches: [ "revive-free" ]
};

PRESETS["arts-from16"] = {
    set: {},
    patches: [ "pofu-from16", "revive-from16" ]
};

PRESETS["pofu-a+arts-from16"] = {
    set: {},
    patches: [ "pofu-noup", "pofu-from16", "revive-from16" ]
};

PRESETS["pofu-a+arts-from16+revive-free"] = {
    set: {},
    patches: [ "pofu-noup", "pofu-from16", "revive-from16", "revive-free" ]
};

const CTR = "tools/variants/engine_counter.js";

PRESETS["ctr-survive"] = {
    engine: CTR,
    set: {
        "counter.a": true,
        "counter.e": true,
        "counter.dmg": 1,
        "counter.onDeath": false
    }
};

PRESETS["ctr-death"] = {
    engine: CTR,
    set: {
        "counter.a": true,
        "counter.e": true,
        "counter.dmg": 1,
        "counter.onDeath": true
    }
};

PRESETS["ctr-atk"] = {
    engine: CTR,
    set: {
        "counter.a": true,
        "counter.e": true,
        "counter.dmg": "atk",
        "counter.onDeath": false
    }
};

PRESETS["huichun"] = {
    engine: CTR,
    set: {
        "skills.huichun.level": 4
    }
};

PRESETS["pofu-a+revive-free"] = {
    set: {},
    patches: [ "pofu-noup", "revive-free" ]
};

const BSE = "tools/variants/engine_beishui.js";

PRESETS["bs-a"] = {
    engine: BSE,
    set: {
        "beishui.on": true,
        "beishui.fewer.b": true,
        "beishui.check": "none"
    }
};

PRESETS["bs-b"] = {
    engine: BSE,
    set: {
        "beishui.on": true,
        "beishui.fewer.b": true,
        "beishui.check": "allow"
    }
};

PRESETS["revive-few"] = {
    engine: BSE,
    set: {
        "beishui.fewer.r": true
    }
};

const BSE2 = "tools/variants/engine_beishui2.js", BS2 = {
    "beishui.on": true,
    "beishui.fewer.b": true,
    "beishui.persist": true,
    "beishui.noKing": true,
    "beishui.strictEscape": true
};

PRESETS["bs2-a"] = {
    engine: BSE2,
    set: {
        ...BS2,
        "beishui.check": "none"
    }
};

PRESETS["bs2-b"] = {
    engine: BSE2,
    set: {
        ...BS2,
        "beishui.check": "allow"
    }
};

const BS3 = {
    "beishui.on": true,
    "beishui.fewer.b": true,
    "beishui.maxLeft.b": 3,
    "beishui.strictEscape": true
};

PRESETS["bs3-a"] = {
    engine: BSE2,
    set: {
        ...BS3,
        "beishui.check": "none"
    }
};

PRESETS["bs3-b"] = {
    engine: BSE2,
    set: {
        ...BS3,
        "beishui.check": "allow"
    }
};

PRESETS["bs4"] = {
    engine: BSE2,
    set: {
        ...BS3,
        "beishui.check": "none",
        "beishui.finalOnly": true
    }
};

PRESETS["revive-few4"] = {
    engine: BSE2,
    set: {
        "beishui.fewer.r": true,
        "beishui.maxLeft.r": 3
    }
};

PRESETS["revive-few3"] = {
    engine: BSE2,
    set: {
        "beishui.fewer.r": true
    }
};

PRESETS["revive-few2"] = {
    engine: BSE2,
    set: {
        "beishui.fewer.r": true
    }
};

function applyPatches(BF, names) {
    if (!names || !names.length) return;
    const has = n => names.includes(n);
    const fromN = (names.map(n => /^pofu-from(\d+)$/.exec(n)).find(Boolean) || [])[1];
    const isPofu = a => a && a.k === "art" && a.steps;
    const eq = (x, y) => x[0] === y[0] && x[1] === y[1];
    const round = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
    const locked = S => S.turn === "b" && S.cnt.b < S.fx.pf;
    const kills = ev => (ev || []).filter(e => e.e === "kill" && !e.friendly && e.s === "r").length;
    const samePiece = a => eq(a.steps[1].from, a.steps[0].to) || eq(a.steps[1].from, a.steps[0].from);
    const gated = S => fromN && round(S) < +fromN;
    const bad = (S, a, r) => isPofu(a) && (has("pofu-noup") && S.upgraded || gated(S) || has("pofu-2pc") && samePiece(a) || has("pofu-1kill") && r && kills(r.ev) > 1);
    const U = BF.CFG.upgrade, PASSIVE = [ "jianta", "shensu", "huifang", "jinwei" ];
    const noAuto = (S, a, fn) => {
        if (!has("pofu-noup") || !S || S.turn !== "b" || !(isPofu(a) || locked(S))) return fn();
        const saved = U.autoByPlates, lv = PASSIVE.map(k => BF.CFG.skills[k].level);
        U.autoByPlates = false;
        if (locked(S)) for (const k of PASSIVE) BF.CFG.skills[k].level = 99;
        try {
            return fn();
        } finally {
            U.autoByPlates = saved;
            PASSIVE.forEach((k, i) => {
                BF.CFG.skills[k].level = lv[i];
            });
        }
    };
    const promoteAfterLock = S => {
        if (!has("pofu-noup") || S.turn !== "b" || !S.fx.pf || S.cnt.b !== S.fx.pf) return;
        for (const row of S.board) for (const p of row) {
            if (!p || p.s !== "b" || p.t === "k" || p.lv >= BF.maxLvOf(p.t)) continue;
            const cost = U.cost[p.t] && U.cost[p.t][p.lv - 1];
            if (cost && (p.xp || 0) * U.killDiscount >= cost) {
                p.lv++;
                p.hp = BF.hpOf(p.t, p.lv);
                p.xp = 0;
            }
        }
    };
    const attempt0 = BF.attempt;
    BF.attempt = (S, a) => {
        if (isPofu(a) && bad(S, a, null)) return null;
        const r = noAuto(S, a, () => attempt0(S, a));
        return r && bad(S, a, r) ? null : r;
    };
    const pairs0 = BF.ai.pofuPairs;
    BF.ai.pofuPairs = (S, ...rest) => has("pofu-noup") && S.upgraded || gated(S) ? [] : noAuto(S, {
        k: "art",
        steps: []
    }, () => pairs0(S, ...rest)).filter(x => !bad(S, x.a, x));
    const exp0 = BF.ai.expand, gen0 = BF.ai.gen, mt0 = BF.ai.moveTargets;
    BF.ai.expand = S => noAuto(S, null, () => exp0(S));
    BF.ai.gen = (S, c) => noAuto(S, null, () => gen0(S, c));
    BF.ai.moveTargets = (S, f, r) => noAuto(S, null, () => mt0(S, f, r));
    if (has("pofu-noup")) {
        const up0 = BF.ai.upgradeState;
        BF.ai.upgradeState = (S, at) => locked(S) ? null : up0(S, at);
        const can0 = BF.Game.prototype.canUpgrade;
        BF.Game.prototype.canUpgrade = function(f, r) {
            return locked(this.S) ? false : can0.call(this, f, r);
        };
    }
    const apply0 = BF.Game.prototype.apply;
    BF.Game.prototype.apply = function(e) {
        if (isPofu(e) && (bad(this.S, e, null) || bad(this.S, e, noAuto(this.S, e, () => attempt0(this.S, e))))) return null;
        const r = noAuto(this.S, e, () => apply0.call(this, e));
        if (r) promoteAfterLock(this.S);
        return r;
    };
    const legal0 = BF.Game.prototype.legalFrom;
    BF.Game.prototype.legalFrom = function(f, r) {
        return noAuto(this.S, null, () => legal0.call(this, f, r));
    };
    const reviveFrom = (names.map(n => /^revive-from(\d+)$/.exec(n)).find(Boolean) || [])[1];
    if (reviveFrom) applyReviveGate(BF, +reviveFrom);
    if (fromN) applyGateMate(BF, S => S.turn === "b" && gated(S), a => isPofu(a));
    if (has("revive-free")) {
        const xh = BF.CFG.generalArts.xiaohe;
        if ((xh.reviveLevel || 1) !== 1 || xh.reviveCap || xh.reviveUp || xh.reviveHalf) throw new Error("revive-free 预设自己实现召回（回来一级），不认 reviveLevel / reviveCap / reviveUp / reviveHalf，不能一起用");
        applyReviveFree(BF);
    }
    if (has("pofu-noup") && BF.CFG.counter) BF.CFG.counter.pfSeal = true;
}

function applyReviveGate(BF, N) {
    const isRevive = a => a && a.k === "art" && a.id != null && !a.steps;
    const round = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
    const shut = S => S.turn === "r" && round(S) < N;
    BF.__reviveGate = S => !shut(S);
    const attempt0 = BF.attempt, gen0 = BF.ai.gen, exp0 = BF.ai.expand, apply0 = BF.Game.prototype.apply;
    BF.attempt = (S, a) => isRevive(a) && shut(S) ? null : attempt0(S, a);
    BF.ai.gen = (S, c) => {
        const out = gen0(S, c);
        return shut(S) ? out.filter(it => !isRevive(it.a)) : out;
    };
    BF.ai.expand = S => {
        const out = exp0(S);
        return shut(S) ? out.filter(k => !isRevive(k.a)) : out;
    };
    BF.Game.prototype.apply = function(e) {
        return isRevive(e) && shut(this.S) ? null : apply0.call(this, e);
    };
    applyGateMate(BF, shut, isRevive);
}

function applyGateMate(BF, shut, isArt) {
    const exp0 = BF.ai.expand, apply0 = BF.Game.prototype.apply;
    BF.Game.prototype.apply = function(e) {
        const info = apply0.call(this, e);
        if (info && !this.result && this.status && this.status.check && !this.S.freeUsed && shut(this.S) && !exp0(this.S).some(k => !isArt(k.a) && k.a.k !== "pass")) {
            const lose = this.S.turn;
            this.result = {
                winner: lose === "r" ? "b" : "r",
                loser: lose,
                reason: "checkmate"
            };
            this.status = {
                result: this.result
            };
            info.result = this.result;
        }
        return info;
    };
}

function applyReviveFree(BF) {
    const A = BF.ai, isRevive = a => a && a.k === "art" && a.id != null && !a.steps;
    const usesLeft = S => S.used.art.r < BF.CFG.generalArts.xiaohe.usesPerGame;
    const freeRevive = (S, id) => {
        if (S.turn !== "r" || S.freeUsed || !usesLeft(S) || BF.__reviveGate && !BF.__reviveGate(S)) return null;
        if (Math.floor((S.cnt.r + S.cnt.b) / 2) + 1 < (BF.CFG.generalArts.fromRound || 1)) return null;
        const i = S.dead.r.findIndex(d => d.id === id);
        if (i < 0) return null;
        const d = S.dead.r[i], st = BF.START[d.id];
        if (!st || S.board[st[1]][st[0]]) return null;
        const T = BF.cloneState(S);
        T.dead.r.splice(i, 1);
        T.board[st[1]][st[0]] = {
            s: "r",
            t: d.t,
            id: d.id,
            lv: 1,
            hp: BF.hpOf(d.t, 1),
            cd: 0,
            jm: 0,
            xp: 0,
            kills: 0
        };
        T.used.art.r++;
        T.freeUsed = true;
        T.jmLock = d.id;
        return {
            T: T,
            ev: [ {
                e: "revive",
                id: d.id,
                t: d.t,
                at: st.slice()
            } ]
        };
    };
    const reviveIds = S => {
        const seen = [];
        if (S.turn === "r" && !S.freeUsed && usesLeft(S)) for (const d of S.dead.r) if (!seen.includes(d.id)) seen.push(d.id);
        return seen;
    };
    const attempt0 = BF.attempt;
    BF.attempt = (S, a) => {
        if (!isRevive(a) || S.turn !== "r") return attempt0(S, a);
        if (!a.then || a.then.k !== "mv") return null;
        const f = freeRevive(S, a.id);
        if (!f) return null;
        const T = a.up ? A.upgradeState(f.T, f.ev[0].at) : f.T;
        if (!T) return null;
        const r = attempt0(T, a.then);
        if (!r || r.free) return null;
        return {
            ...r,
            kind: "art",
            ev: f.ev.concat(r.ev)
        };
    };
    const threatened = (T, at_) => {
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = T.board[r][f];
            if (p && p.s === "b" && A.moveTargets(T, f, r).some(m => m.to[0] === at_[0] && m.to[1] === at_[1])) return true;
        }
        return false;
    };
    const variants = (f, inner) => {
        const U = A.upgradeState(f.T, f.ev[0].at);
        return U && (!inner || threatened(f.T, f.ev[0].at)) ? [ [ f.T, false ], [ U, true ] ] : [ [ f.T, false ] ];
    };
    const compound = (id, up, then) => up ? {
        k: "art",
        id: id,
        up: true,
        then: then
    } : {
        k: "art",
        id: id,
        then: then
    };
    const rookOn = S => S.board.some(row => row.some(p => p && p.s === "r" && p.t === "r"));
    const searchable = (S, t) => t === "r" || (t === "c" || t === "n") && (!rookOn(S) || S.used.art.b > 0);
    const gen0 = A.gen, exp0 = A.expand;
    A.gen = (S, caps) => {
        const out = gen0(S, caps);
        if (caps || S.turn !== "r" || !out.some(it => isRevive(it.a))) return out;
        const res = out.filter(it => !isRevive(it.a));
        for (const id of reviveIds(S)) {
            const f = freeRevive(S, id);
            if (!f) continue;
            const t = f.ev[0].t;
            if (!searchable(S, t) && !A.inCheck(S, "r")) continue;
            for (const [T, up] of variants(f, true)) for (const it of gen0(T, false)) if (it.a.k === "mv" && it.p.id !== id) res.push({
                a: compound(id, up, it.a),
                p: it.p,
                q: it.q,
                art: t
            });
        }
        return res;
    };
    A.expand = S => {
        const out = exp0(S), ids = reviveIds(S);
        if (S.turn !== "r" || !ids.length) return out;
        const res = out.filter(k => !isRevive(k.a));
        for (const id of ids) {
            const f = freeRevive(S, id);
            if (!f) continue;
            for (const [T, up] of variants(f, false)) for (const k of exp0(T)) if (k.a.k === "mv") res.push({
                a: compound(id, up, k.a),
                S: k.S,
                ev: f.ev.concat(k.ev)
            });
        }
        return res;
    };
    const hasCompound = S => reviveIds(S).some(id => {
        const f = freeRevive(S, id);
        return f && exp0(f.T).some(k => k.a.k === "mv");
    });
    const fixMate = (g, info) => {
        const S = g.S;
        if (S.turn !== "r" || S.freeUsed || !reviveIds(S).length) return;
        const mated = g.result && g.result.reason === "checkmate" && g.result.loser === "r";
        if (g.result ? !mated : !(g.status && g.status.check)) return;
        const alive = !mated && exp0(S).some(k => !isRevive(k.a) && k.a.k !== "pass") || hasCompound(S);
        if (mated && alive) {
            g.result = null;
            g.status = {
                check: true
            };
            info.result = null;
        } else if (!mated && !alive) {
            g.result = {
                winner: "b",
                loser: "r",
                reason: "checkmate"
            };
            g.status = {
                result: g.result
            };
            info.result = g.result;
        }
    };
    const apply0 = BF.Game.prototype.apply;
    function applyRF(e) {
        if (this.result || !isRevive(e) || this.S.turn !== "r") return apply0.call(this, e);
        const f = freeRevive(this.S, e.id);
        if (!f) return null;
        if (e.then ? !BF.attempt(this.S, e) : e.up || !exp0(f.T).some(k => k.a.k === "mv")) return null;
        const before = this.S, n = this.entries.length, st0 = this.status, last0 = this.last;
        this.S = f.T;
        this.entries.push({
            k: "art",
            id: e.id
        });
        this.sides.push("r");
        this.ends.push(0);
        this.status = {
            free: true,
            check: this.inCheck("r")
        };
        const info = {
            k: "art",
            free: true,
            side: "r",
            mover: "r",
            from: null,
            to: null,
            pid: e.id,
            cap: null,
            kills: [],
            ev: f.ev,
            extra: {},
            e: e,
            check: false,
            result: null,
            before: before,
            after: this.S
        };
        this.last = info;
        if (!e.then) return info;
        const back = () => {
            this.S = before;
            this.entries.length = this.sides.length = this.ends.length = n;
            this.status = st0;
            this.last = last0;
            return null;
        };
        let upInfo = null;
        if (e.up && !(upInfo = apply0.call(this, {
            k: "up",
            at: f.ev[0].at
        }))) return back();
        const r = apply0.call(this, e.then);
        if (!r) return back();
        const out = {
            ...r,
            ev: f.ev.concat(r.ev || []),
            revived: e.id,
            upInfo: upInfo
        };
        this.last = out;
        return out;
    }
    BF.Game.prototype.apply = function(e) {
        const info = applyRF.call(this, e);
        if (info) fixMate(this, info);
        return info;
    };
}

function wrapThinkForNoUp(X, BF) {
    if (!BF.ai.__noUpHook) {
        const up0 = BF.ai.upgradeState;
        const hook = {
            cntb: null
        };
        BF.ai.upgradeState = (S2, at) => hook.cntb != null && S2.turn === "b" && S2.cnt.b === hook.cntb ? null : up0(S2, at);
        BF.ai.__noUpHook = hook;
    }
    const hook = BF.ai.__noUpHook, think0 = X.think;
    const wrapped = async (S, L, tick) => {
        const pofuLeft = S.turn === "b" && S.used.art.b < BF.CFG.generalArts.pofu.usesPerGame && !S.upgraded && !(S.cnt.b < S.fx.pf);
        if (pofuLeft) {
            hook.cntb = S.cnt.b;
            let alt, lastAlt;
            try {
                alt = await think0(BF.cloneState(S), L, tick);
                lastAlt = think0.last;
            } finally {
                hook.cntb = null;
            }
            const m = alt[alt.length - 1];
            if (m && m.k === "art" && m.steps) {
                const seq = await think0(S, L, tick), last = think0.last;
                if (lastAlt && last && lastAlt.v > last.v) {
                    wrapped.last = lastAlt;
                    return alt;
                }
                wrapped.last = last;
                return seq;
            }
        }
        const seq = await think0(S, L, tick);
        wrapped.last = think0.last;
        return seq;
    };
    X.think = wrapped;
}

for (const sk of [ "juma", "chongzhen", "taying", "pili", "feiyue", "hujia", "qishe", "jianta", "shensu", "huifang", "jinwei" ]) PRESETS["no-" + sk] = {
    set: {
        [`skills.${sk}.level`]: 99
    }
};

function parseArgs(argv) {
    const o = {
        games: 200,
        level: "mid",
        red: null,
        black: null,
        budget: null,
        jobs: os.cpus().length,
        maxRounds: 150,
        open: 6,
        seed: 1,
        presets: [],
        sets: [],
        json: null,
        quiet: false,
        saveUlt: false,
        ai: "ai/baseline.js",
        aiR: null,
        aiB: null,
        match: null,
        sprt: null,
        nodes: 0
    };
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i], v = () => argv[++i];
        if (k === "--games") o.games = +v(); else if (k === "--level") o.level = v(); else if (k === "--match-levels") o.matchLevels = v().split(","); else if (k === "--red") o.red = v(); else if (k === "--black") o.black = v(); else if (k === "--budget") o.budget = +v(); else if (k === "--journal") o.journal = v(); else if (k === "--jobs") o.jobs = +v(); else if (k === "--max-rounds") o.maxRounds = +v(); else if (k === "--open") o.open = +v(); else if (k === "--open-ai") o.openAI = v(); else if (k === "--open-nodes") o.openNodes = +v(); else if (k === "--open-seq") o.openSeq = v().split("/").map(ply => ply.split("+").map(t => {
            const m = t.trim().match(/^(mv|up):(\d),(\d)(?:>(\d),(\d))?$/);
            if (!m) throw new Error("--open-seq 看不懂：" + t);
            return m[1] === "up" ? {
                k: "up",
                at: [ +m[2], +m[3] ]
            } : {
                k: "mv",
                from: [ +m[2], +m[3] ],
                to: [ +m[4], +m[5] ]
            };
        })); else if (k === "--seed") o.seed = +v(); else if (k === "--preset") o.presets.push(...v().split(",").filter(Boolean)); else if (k === "--set") o.sets.push(v()); else if (k === "--json") o.json = v(); else if (k === "--quiet") o.quiet = true; else if (k === "--save-ult") o.saveUlt = true; else if (k === "--dump-pos") o.dumpPos = true; else if (k === "--seedlist") {
            const raw = v();
            o.seedlist = String(raw == null ? "" : raw).split(/[\s,]+/).filter(Boolean).map(Number);
            if (!o.seedlist.length || o.seedlist.some(x => !Number.isInteger(x))) throw new Error("--seedlist 要写成逗号分隔的整数种子，现在是：" + raw);
        } else if (k === "--stop-after-revive") o.stopAfterRevive = true; else if (k === "--ai") o.ai = v(); else if (k === "--ai-r") o.aiR = v(); else if (k === "--ai-b") o.aiB = v(); else if (k === "--match") o.match = v().split(","); else if (k === "--sprt") o.sprt = v().split(",").map(Number); else if (k === "--fixed") o.fixed = true; else if (k === "--nodes") o.nodes = v(); else if (k === "--worker") o.worker = true; else if (k === "--merge") o.merge = v().split(",").filter(Boolean); else throw new Error("未知参数 " + k);
    }
    if (o.budget != null && (!Number.isFinite(o.budget) || o.budget <= 0)) throw Error("--budget must be positive");
    if (o.matchLevels && (!o.match || o.matchLevels.length !== 2 || o.matchLevels.some(x => !["easy", "mid", "hard", "xhard"].includes(x)) || o.red || o.black)) throw Error("--match-levels requires two valid A,B levels and --match; do not combine with --red/--black");
    return o;
}

function matchLevels(o, flip) {
    return o.matchLevels ? {red:o.matchLevels[flip ? 1 : 0], black:o.matchLevels[flip ? 0 : 1]} : {red:o.red || o.level, black:o.black || o.level};
}

function setPath(obj, p, val) {
    const ks = p.split(".");
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
        if (o[ks[i]] == null || typeof o[ks[i]] !== "object") throw new Error("配置里没有 " + p);
        o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
}

function overrides(o) {
    const set = {};
    let noArts = false;
    const patches = [];
    for (const n of o.presets) {
        const P = PRESETS[n];
        if (!P) throw new Error("没有这个预设 " + n + "（可选：" + Object.keys(PRESETS).join(" ") + "）");
        Object.assign(set, P.set);
        if (P.noArts) noArts = true;
        for (const x of P.patches || []) if (!patches.includes(x)) patches.push(x);
        if (P.engine) {
            if (process.env.BFSIM_ENGINE && process.env.BFSIM_ENGINE !== P.engine) throw new Error(`预设 ${n} 要用引擎 ${P.engine}，可环境变量 BFSIM_ENGINE 已经是 ${process.env.BFSIM_ENGINE}`);
            process.env.BFSIM_ENGINE = P.engine;
        }
    }
    for (const s of o.sets) {
        const i = s.indexOf("=");
        if (i < 0) throw new Error("--set 要写成 PATH=JSON");
        const raw = s.slice(i + 1);
        let v;
        try {
            v = JSON.parse(raw);
        } catch (e) {
            v = raw;
        }
        set[s.slice(0, i)] = v;
    }
    return {
        set: set,
        noArts: noArts,
        patches: patches
    };
}

function mulberry32(a) {
    return () => {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const VAL = {
    r: 9,
    c: 4.5,
    n: 4,
    e: 2,
    a: 2,
    p: 1,
    k: 0
};

function worker() {
    global.XQ = require(path.join(SRC, "rules.js"));
    const BF = global.BF = require(path.join(SRC, "bingfa.js"));
    let AIMAP = null;
    let OPENSEQ = null;
    let journal = null;
    let ov = null;
    const inc = (o, k, n = 1) => {
        o[k] = (o[k] || 0) + n;
    };
    const other = s => s === "r" ? "b" : "r";
    const neutral = S => {
        let v = 0;
        for (const row of S.board) for (const p of row) if (p && p.t !== "k") v += (p.s === "r" ? 1 : -1) * VAL[p.t] * (1 + .45 * (p.hp - 1));
        return v + .3 * (S.merit.r - S.merit.b);
    };
    const material = S => {
        const m = {
            r: 0,
            b: 0
        };
        for (const row of S.board) for (const p of row) if (p) m[p.s] += VAL[p.t];
        return m;
    };
    async function play(job) {
        const emit = event => {
            if (journal) require("fs").appendFileSync(path.join(journal, `game-${job.seed}-${job.flip ? 1 : 0}.jsonl`), JSON.stringify({seed:job.seed,flip:!!job.flip,at:Date.now(),...event})+"\n");
        };
        emit({type:"start",job});
        Math.random = mulberry32(job.seed * 2654435761);
        const lvl = {
            r: job.red,
            b: job.black
        };
        const AIS = {
            r: AIMAP[job.aiR],
            b: AIMAP[job.aiB]
        };
        const g = new BF.Game;
        if (ov.noArts) g.setup(T => {
            T.used.art = {
                r: 99,
                b: 99
            };
            T.used.ult = {
                r: 99,
                b: 99
            };
        });
        const side2 = () => ({
            r: {},
            b: {}
        });
        const R = {
            seed: job.seed,
            levels: {...lvl},
            effectiveLevels: {r: {...AIS.r.LEVELS[lvl.r]}, b: {...AIS.b.LEVELS[lvl.b]}},
            decisions: [],
            flip: !!job.flip,
            winner: null,
            reason: null,
            rounds: 0,
            plies: 0,
            final: false,
            finalRound: null,
            act: side2(),
            up: side2(),
            kills: side2(),
            hits: side2(),
            meritBy: side2(),
            friendly: side2(),
            ultRound: {},
            artRound: {},
            artKind: {},
            firstLv: {
                r: {},
                b: {}
            },
            samples: [],
            rescue: 0,
            jumaCounter: side2(),
            msMax: 0,
            ms: 0,
            upHp: {
                r: {
                    full: 0,
                    hurt: 0,
                    last: 0
                },
                b: {
                    full: 0,
                    hurt: 0,
                    last: 0
                }
            },
            avail: {},
            fewEnd: {},
            sus: {},
            susN: {
                r: 0,
                b: 0
            },
            bs: !!(BF.CFG.beishui && BF.CFG.beishui.on),
            firstR2: {},
            rev: null
        };
        const deathLv = {};
        let lastRound = 0, guard = 0;
        const POS = null, TUNE = null;
        let cand = null;
        const sample = () => {
            const rd = g.round;
            if (rd !== lastRound && rd % 5 === 0) {
                lastRound = rd;
                const m = material(g.S);
                R.samples.push({
                    round: rd,
                    score: +neutral(g.S).toFixed(2),
                    mat: m,
                    merit: {
                        ...g.merit
                    },
                    lv: lvSum(g.S)
                });
            }
        };
        const lvSum = S => {
            const o = {
                r: 0,
                b: 0
            };
            for (const row of S.board) for (const p of row) if (p && p.t !== "k") o[p.s] += p.lv - 1;
            return o;
        };
        const record = (a, info, side) => {
            const A = R.act[side];
            const r2 = (t, lv, s) => {
                if (t === "r" && lv === 2 && R.firstR2[s] == null) R.firstR2[s] = g.round;
            };
            if (a.k === "up") {
                r2(info.t, info.lv, side);
                inc(R.up[side], info.t + info.lv);
                if (R.firstLv[side][info.lv] == null) R.firstLv[side][info.lv] = g.round;
                if (R.rev && R.rev.id === info.id && !R.rev.up1) R.rev.up1 = {
                    round: g.round,
                    lv: info.lv,
                    cost: info.cost,
                    how: "manual"
                };
                return;
            }
            let key;
            if (a.k === "mv") key = info.extra && info.extra.via ? "via_" + info.extra.via : "mv"; else if (a.k === "sk") key = "sk_" + (info.extra && info.extra.sk || "?"); else if (a.k === "art") {
                key = a.steps ? "art_pofu" : "art_revive";
                if (R.artRound[side] == null) {
                    R.artRound[side] = g.round;
                    R.artKind[side] = a.steps ? "pofu" : (BF.START && info.ev.find(e => e.e === "revive") || {}).t;
                }
            } else if (a.k === "ult") {
                key = "ult";
                if (R.ultRound[side] == null) R.ultRound[side] = g.round;
            } else key = a.k;
            inc(A, key);
            if (a.k === "art" && a.then) inc(A, info.extra && info.extra.via ? "via_" + info.extra.via : "mv");
            if (a.k === "art" && a.up && info.upInfo) {
                r2(info.upInfo.t, info.upInfo.lv, side);
                inc(A, "art_revive_up");
                inc(R.up[side], info.upInfo.t + info.upInfo.lv);
                if (R.firstLv[side][info.upInfo.lv] == null) R.firstLv[side][info.upInfo.lv] = g.round;
            }
            const via = info.extra && info.extra.via;
            for (const e of info.ev || []) {
                if (e.e === "kill") {
                    if (e.lv != null) deathLv[e.id] = e.lv;
                    const killer = e.friendly ? e.s : other(e.s);
                    let how = e.how || "capture";
                    if (how === "capture" && via) how = "via_" + via;
                    if (e.friendly) inc(R.friendly[killer], how); else inc(R.kills[killer], how);
                } else if (e.e === "hit") {
                    inc(R.hits[side], e.how || "attack");
                } else if (e.e === "merit") inc(R.meritBy[e.s], e.why, e.n); else if (e.e === "autoup") {
                    if (R.rev && R.rev.id === e.id && !R.rev.up1) R.rev.up1 = {
                        round: g.round,
                        lv: e.lv,
                        cost: 0,
                        how: "plates"
                    };
                    r2(e.t, e.lv, e.s);
                    inc(R.up[e.s], e.t + e.lv + "*");
                    if (R.firstLv[e.s][e.lv] == null) R.firstLv[e.s][e.lv] = g.round;
                } else if (e.e === "final" && !R.final) {
                    R.final = true;
                    R.finalRound = g.round;
                } else if (e.e === "rescue") R.rescue++; else if (e.e === "revive" && !R.rev) {
                    const q = e.at && g.S.board[e.at[1]] && g.S.board[e.at[1]][e.at[0]];
                    R.rev = {
                        id: e.id,
                        t: e.t,
                        dl: deathLv[e.id] != null ? deathLv[e.id] : null,
                        rl: e.lv != null ? e.lv : q && q.id === e.id ? q.lv : null,
                        up: false,
                        round: g.round,
                        up1: null
                    };
                } else if (e.e === "reviveUp") {
                    r2(e.t, e.lv, "r");
                    inc(R.act.r, "art_revive_up");
                    inc(R.up.r, e.t + e.lv);
                    if (R.firstLv.r[e.lv] == null) R.firstLv.r[e.lv] = g.round;
                    if (R.rev && R.rev.up === false) R.rev.up = true;
                    if (R.rev && R.rev.id === e.id && !R.rev.up1) R.rev.up1 = {
                        round: g.round,
                        lv: e.lv,
                        cost: e.cost,
                        how: "spot"
                    };
                } else if (e.e === "counter") inc(R.jumaCounter[other(side)], "hit"); else if (e.e === "fanji") inc(R.jumaCounter[other(side)], "fanji"); else if (e.e === "heal") inc(R.jumaCounter[side], "heal");
            }
        };
        const matDiff = S => {
            const m = material(S);
            return m.r - m.b;
        };
        const atkCount = S => {
            const c = {
                r: 0,
                b: 0
            };
            for (const row of S.board) for (const p of row) if (p && (p.t === "r" || p.t === "n" || p.t === "c")) c[p.s]++;
            return c;
        };
        const pfEnd = () => {
            if (R.pf && R.pf.s2 == null) {
                R.pf.s2 = +neutral(g.S).toFixed(2);
                R.pf.m2 = matDiff(g.S);
                R.pf.endRound = g.round;
            }
        };
        while (!g.result) {
            if (g.round > job.maxRounds) {
                R.reason = "cap";
                break;
            }
            if (++guard > job.maxRounds * 6) {
                R.reason = "stuck";
                break;
            }
            const side = g.turn;
            if (BF.CFG.beishui && BF.CFG.beishui.fewer && BF.CFG.beishui.fewer[side] && R.avail[side] == null && !g.S.used.art[side] && (side === "b" || g.S.dead.r.length)) {
                const c = {
                    r: 0,
                    b: 0
                };
                for (const row of g.S.board) for (const p of row) if (p && (p.t === "r" || p.t === "n" || p.t === "c")) c[p.s]++;
                const ML = BF.CFG.beishui.maxLeft && BF.CFG.beishui.maxLeft[side];
                if (c[side] < c[side === "r" ? "b" : "r"] && (ML == null || c[side] <= ML)) R.avail[side] = g.round;
            } else if (BF.CFG.beishui && BF.CFG.beishui.on && !BF.CFG.beishui.fewer && BF.ai.artReady && R.avail[side] == null && !g.S.used.art[side] && (side === "b" || g.S.dead.r.length) && BF.ai.artReady(g.S)) R.avail[side] = g.round;
            {
                const c = atkCount(g.S), o = side === "r" ? "b" : "r";
                if (R.fewEnd[side] && c[side] < c[o]) {
                    if (R.sus[side] == null) R.sus[side] = g.round;
                    R.susN[side]++;
                }
            }
            if (side === "b" && R.pf && g.S.cnt.b >= g.S.fx.pf) pfEnd();
            const pre = side === "b" && !R.pf ? {
                s: +neutral(g.S).toFixed(2),
                m: matDiff(g.S)
            } : null;
            if (g.status && g.status.mustPass) {
                R.decisions.push({ply:R.plies,side,phase:"forced-pass",ai:null,startedAt:Date.now(),endedAt:Date.now(),ms:0,nodes:0,depth:0,actions:[{k:"pass"}]});
                emit({type:"decision",decision:R.decisions.at(-1)});
                const info = g.apply({
                    k: "pass"
                });
                if (!info) throw new Error("pass 失败");
                record({
                    k: "pass"
                }, info, side);
                R.plies++;
                sample();
                cand = null;
                continue;
            }
            const pk = POS && R.plies >= job.open + 2 && !BF.ai.inCheck(g.S, side) ? TUNE.pack(g.S) : null;
            const t0 = Date.now();
            let L = R.plies < job.open ? "open" : lvl[side];
            if (job.saveUlt && L !== "hard") {
                const U = BF.CFG.ultimates, left = g.used.ult[side] < U[side === "r" ? "simian" : "hongmen"].usesPerGame;
                if (left && g.merit[side] >= U.cost - 7) L += "Save";
            }
            const AI = R.plies < job.open && AIMAP.O ? AIMAP.O : AIS[side];
            emit({type:"thinking",ply:R.plies,side,level:L,levelConfig:{...AI.LEVELS[L]}});
            const seq = OPENSEQ && R.plies < OPENSEQ.length ? JSON.parse(JSON.stringify(OPENSEQ[R.plies])) : await AI.think(BF.cloneState(g.S), L);
            const dt = Date.now() - t0;
            R.ms += dt;
            if (dt > R.msMax) R.msMax = dt;
            const st = OPENSEQ && R.plies < OPENSEQ.length ? null : AI.think.last;
            R.decisions.push({ply:R.plies,side,phase:R.plies<job.open?"opening":"search",ai:R.plies<job.open?"opening":job[side==="r"?"aiR":"aiB"],level:L,levelConfig:{...AI.LEVELS[L]},startedAt:t0,endedAt:t0+dt,ms:dt,nodes:st?.nodes??null,depth:st?.depth??null,actions:JSON.parse(JSON.stringify(seq))});
            emit({type:"decision",decision:R.decisions.at(-1)});
            if (st && st.nodes != null) {
                R.nodes = (R.nodes || 0) + st.nodes;
                R.nodeMoves = (R.nodeMoves || 0) + 1;
            }
            if (!seq.length) {
                let why = "";
                try {
                    why = `（${side === "r" ? "汉" : "楚"}方，第 ${g.round} 回合，${BF.ai.inCheck(g.S, side) ? "被将军" : "没被将军"}，普通行动 ${BF.ai.expand(g.S).length} 种，破釜 / 背水组合 ${side === "b" && !g.S.used.art.b && BF.ai.pofuPairs ? BF.ai.pofuPairs(g.S).length : 0} 种）`;
                } catch (e) {
                    why = "（" + e.message + "）";
                }
                throw new Error("电脑没有给出行动" + why);
            }
            let noisy = false;
            for (const a of seq) {
                const up0 = a.k === "up" ? g.at(a.at[0], a.at[1]) : null, hp0 = up0 && {
                    hp: up0.hp,
                    max: BF.hpOf(up0.t, up0.lv)
                };
                if (R.plies < job.open) {
                    const at = a.at || a.from, p0 = at && g.at(at[0], at[1]);
                    (R.openSeq = R.openSeq || []).push(side + ":" + a.k + (p0 ? ":" + p0.t + (p0.lv || 1) : "") + (at ? "@" + at.join(",") : "") + (a.to ? ">" + a.to.join(",") : ""));
                }
                const info = g.apply(a);
                if (info && hp0) {
                    const H = R.upHp[side];
                    if (hp0.hp >= hp0.max) H.full++; else {
                        H.hurt++;
                        if (hp0.hp === 1) H.last++;
                    }
                }
                if (!info) throw new Error("非法行动 " + JSON.stringify(a) + " seed=" + job.seed);
                if (POS && (info.ev || []).some(e => e.e === "kill" || e.e === "hit")) noisy = true;
                record(a, info, side);
            }
            if (POS) {
                if (cand && !noisy) POS.push(cand);
                cand = pk && !noisy ? [ pk, st && st.v != null && isFinite(st.v) ? +(side === "r" ? st.v : -st.v).toFixed(2) : null ] : null;
            }
            if (job.stopAfterRevive && R.rev) {
                R.reason = "probe";
                R.plies++;
                break;
            }
            {
                const c = atkCount(g.S), o = side === "r" ? "b" : "r";
                R.fewEnd[side] = c[side] < c[o];
            }
            if (pre && seq.some(a => a.k === "art" && a.steps)) R.pf = {
                round: g.round,
                s0: pre.s,
                m0: pre.m,
                s1: +neutral(g.S).toFixed(2),
                m1: matDiff(g.S),
                lockTo: g.S.fx.pf
            };
            R.plies++;
            sample();
        }
        if (R.pf && R.pf.s2 == null) {
            pfEnd();
            R.pf.ended = true;
        }
        if (g.result) {
            R.winner = g.result.winner;
            R.reason = g.result.reason;
        }
        if (R.reason === "checkmate") {
            const w = R.winner, k = global.XQ.findKing(g.board, other(w));
            const cks = global.XQ.checkers(g.board, w).map(id => {
                for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
                    const p = g.board[r][f];
                    if (p && p.id === id) return {
                        t: p.t,
                        hp: p.hp,
                        lv: p.lv,
                        adj: k ? Math.max(Math.abs(f - k[0]), Math.abs(r - k[1])) <= 1 : false
                    };
                }
                return null;
            }).filter(Boolean);
            R.mate = {
                n: cks.length,
                hp: Math.max(0, ...cks.map(c => c.hp)),
                adj: cks.some(c => c.adj),
                hardAdj: cks.some(c => c.adj && c.hp >= 2),
                t: cks.map(c => c.t + c.lv).join(",")
            };
        }
        R.rounds = g.round;
        R.endMerit = {
            ...g.merit
        };
        {
            const d = {
                r: 0,
                b: 0
            };
            for (const row of g.board) for (const p of row) if (p && (p.t === "a" || p.t === "e")) d[p.s]++;
            R.endDef = d;
        }
        R.endMat = material(g.S);
        R.finalState = BF.cloneState(g.S);
        if (POS) R.pos = POS;
        emit({type:"end",result:R});
        return R;
    }
    process.on("message", async m => {
        if (m.init) try {
            ov = m.init;
            journal = m.journal;
            if (journal) require("fs").mkdirSync(journal,{recursive:true});
            for (const [k, v] of Object.entries(ov.set)) setPath(BF.CFG, k, v);
            applyPatches(BF, ov.patches);
            const warns = [];
            const guard = (obj, name) => new Proxy(obj, {
                get(t, k) {
                    if (k in t || typeof k === "symbol" || k === "then" || k === "toJSON" || k === "inspect") return k === "ai" && name === "BF" ? guard(t.ai, "BF.ai") : t[k];
                    throw new Error(`电脑 ${cur} 用到了当前引擎里没有的接口 ${name}.${String(k)}`);
                }
            });
            let cur = "";
            const load = spec => {
                const file = path.resolve(__dirname, "..", spec.file);
                if (!spec.guard) return require(file);
                cur = spec.label;
                const real = global.BF;
                global.BF = guard(real, "BF");
                try {
                    delete require.cache[file];
                    return require(file);
                } finally {
                    global.BF = real;
                }
            };
            AIMAP = {};
            OPENSEQ = m.openSeq || null;
            for (const [k, spec] of Object.entries(m.ais)) {
                const X = AIMAP[k] = load(spec);
                if (BF.ai.version != null && X.apiVersion != null && X.apiVersion !== BF.ai.version) warns.push(`${spec.label} 按接口第 ${X.apiVersion} 版写的，当前引擎是第 ${BF.ai.version} 版`);
                if (parseNodes(m.nodes) && !/nodeCap|\bL\.nodes\b/.test(require("fs").readFileSync(path.resolve(__dirname, "..", spec.file), "utf8"))) warns.push(`${spec.label} 不支持按节点数收手（--nodes 对它无效），它按时间算：结果和机器快慢有关，不能精确复现。和上一版比请用 git:25eb911 或更新的版本`);
            }
            for (const X of new Set(Object.values(AIMAP))) {
                if (m.budget != null) X.LEVELS.hard.budget = m.budget;
                applyNodes(X.LEVELS, parseNodes(m.nodes), {
                    open: "mid"
                });
                X.LEVELS.open = {
                    ...X.LEVELS.mid,
                    noise: .9,
                    top: 3
                };
                if (m.openNodes > 0) X.LEVELS.open.nodes = m.openNodes;
                for (const k of [ "easy", "mid", "open" ]) X.LEVELS[k + "Save"] = {
                    ...X.LEVELS[k],
                    up: -1
                };
            }
            if ((ov.patches || []).includes("pofu-noup")) for (const X of new Set(Object.values(AIMAP))) wrapThinkForNoUp(X, BF);
            process.send({
                ready: true,
                warns: warns
            });
            return;
        } catch (e) {
            process.send({
                fatal: String(e && e.message || e)
            });
            process.exit(1);
        }
        if (m.job) {
            try {
                process.send({
                    result: await play(m.job)
                });
            } catch (e) {
                process.send({
                    error: String(e && e.stack || e),
                    seed: m.job.seed
                });
            }
        }
        if (m.exit) process.exit(0);
    });
}

function resolveAI(spec) {
    if (![ "ai/candidate.js", "ai/baseline.js", "ai/opening.js" ].includes(spec)) throw Error("Only frozen local AI modules are allowed");
    return {
        file: spec,
        label: spec,
        guard: false
    };
}

const eloOf = p => -400 * Math.log10(1 / Math.min(.999, Math.max(.001, p)) - 1);

function matchStats(rs, sprt) {
    const xs = rs.map(r => !r.winner ? .5 : r.winner === (r.flip ? "b" : "r") ? 1 : 0);
    const n = xs.length, m = n ? xs.reduce((a, b) => a + b, 0) / n : .5, v = n ? xs.reduce((a, b) => a + b * b, 0) / n - m * m : .25;
    const se = Math.sqrt(Math.max(v, 1e-6) / Math.max(n, 1));
    const out = {
        n: n,
        score: m,
        elo: eloOf(m),
        lo: eloOf(m - 1.96 * se),
        hi: eloOf(m + 1.96 * se)
    };
    if (sprt) {
        const s0 = 1 / (1 + Math.pow(10, -sprt[0] / 400)), s1 = 1 / (1 + Math.pow(10, -sprt[1] / 400));
        out.llr = v > 1e-9 ? (s1 - s0) * (2 * m * n - n * (s0 + s1)) / (2 * v) : 0;
        out.bound = Math.log(.95 / .05);
        out.verdict = out.llr >= out.bound ? "H1" : out.llr <= -out.bound ? "H0" : null;
    }
    const by = side => {
        const g = rs.filter(r => (r.flip ? "b" : "r") === side);
        return {
            n: g.length,
            w: g.filter(r => r.winner === side).length,
            d: g.filter(r => !r.winner).length
        };
    };
    out.asR = by("r");
    out.asB = by("b");
    return out;
}

async function run(o) {
    const ov = overrides(o);
    const jobs = [];
    let ais;
    if (o.match) {
        if (o.match.length !== 2) throw new Error("--match 要写成 新,旧");
        if (o.seedlist || o.stopAfterRevive) throw new Error("--seedlist / --stop-after-revive 不能和 --match 一起用");
        ais = {
            A: resolveAI(o.match[0]),
            B: resolveAI(o.match[1])
        };
        if (!o.sprt) o.sprt = [ -30, 10 ];
        for (let i = 0; i < Math.ceil(o.games / 2); i++) for (const flip of [ false, true ]) jobs.push({
            seed: o.seed + i,
            flip: flip,
            aiR: flip ? "B" : "A",
            aiB: flip ? "A" : "B",
            ...matchLevels(o, flip),
            maxRounds: o.maxRounds,
            open: o.open,
            saveUlt: o.saveUlt,
            dumpPos: !!o.dumpPos
        });
    } else {
        ais = {
            R: resolveAI(o.aiR || o.ai),
            B: resolveAI(o.aiB || o.ai)
        };
        const seeds = o.seedlist || [];
        if (!o.seedlist) for (let i = 0; i < o.games; i++) seeds.push(o.seed + i);
        for (const seed of seeds) jobs.push({
            seed: seed,
            aiR: "R",
            aiB: "B",
            red: o.red || o.level,
            black: o.black || o.level,
            maxRounds: o.maxRounds,
            open: o.open,
            saveUlt: o.saveUlt,
            stopAfterRevive: !!o.stopAfterRevive,
            dumpPos: !!o.dumpPos
        });
    }
    if (o.openAI) ais.O = resolveAI(o.openAI);
    const results = [], errors = [], warned = new Set;
    let next = 0, done = 0, stopped = null;
    const t0 = Date.now();
    await new Promise(resolve => {
        const n = Math.max(1, Math.min(o.jobs, jobs.length));
        let alive = n;
        for (let w = 0; w < n; w++) {
            const c = fork(__filename, [ "--worker" ], {
                stdio: [ "ignore", "inherit", "inherit", "ipc" ]
            });
            const feed = () => {
                if (next < jobs.length) c.send({
                    job: jobs[next++]
                }); else {
                    c.send({
                        exit: true
                    });
                }
            };
            c.on("message", m => {
                if (m.ready) {
                    for (const w of m.warns || []) if (!warned.has(w)) {
                        warned.add(w);
                        console.log("⚠ " + w);
                    }
                    return feed();
                }
                if (m.fatal) {
                    if (!warned.has(m.fatal)) {
                        warned.add(m.fatal);
                        console.log("✗ 加载电脑失败：" + m.fatal);
                    }
                    next = jobs.length;
                    return;
                }
                if (m.result) results.push(m.result);
                if (m.error) errors.push(m);
                done++;
                if (o.match && !o.fixed && !stopped && done % 2 === 0) {
                    const st = matchStats(results, o.sprt);
                    if (st.verdict) {
                        stopped = st;
                        next = jobs.length;
                    }
                }
                if (!o.quiet && process.stderr.isTTY) process.stderr.write(`\r${done}/${jobs.length}`); else if (done % 25 === 0 || done === jobs.length) process.stderr.write(`进度 ${done}/${jobs.length}  ${Math.round((Date.now() - t0) / 1e3)}s` + (o.match ? (st => `  新版得分 ${pct(st.score)}  Elo ${st.elo.toFixed(0)}  LLR ${st.llr.toFixed(2)}`)(matchStats(results, o.sprt)) : (w => `  汉 ${w.r} 楚 ${w.b} 和 ${results.length - w.r - w.b}` + (w.r + w.b ? `  汉方胜率 ${pct(w.r / (w.r + w.b))}` : ""))({
                    r: results.filter(r => r.winner === "r").length,
                    b: results.filter(r => r.winner === "b").length
                })) + "\n");
                feed();
            });
            c.on("exit", () => {
                if (--alive === 0) resolve();
            });
            c.send({
                init: ov,
                budget: o.budget,
                journal: o.journal,
                ais: ais,
                nodes: o.nodes,
                openNodes: o.openNodes,
                openSeq: o.openSeq || null
            });
        }
    });
    if (!o.quiet && process.stderr.isTTY) process.stderr.write("\n");
    results.sort((a, b) => a.seed - b.seed);
    if (o.json) require("fs").writeFileSync(o.json, JSON.stringify({
        args: o,
        overrides: ov,
        results: results,
        errors: errors
    }, null, 1));
    if (o.match) {
        const st = matchStats(results, o.sprt), f = x => (x >= 0 ? "+" : "") + x.toFixed(0);
        const nodeMoves = results.reduce((t, r) => t + (r.nodeMoves || 0), 0), nodes = results.reduce((t, r) => t + (r.nodes || 0), 0);
        console.log(`== 对打：新 ${o.match[0]} vs 旧 ${o.match[1]} | ${o.red || o.level} 档 | ${st.n} 局（每个种子换边各一局）| ${Math.round((Date.now() - t0) / 1e3)}s ==`);
        console.log(`新版得分 ${pct(st.score)}，Elo 差 ${f(st.elo)}（95% 区间 ${f(st.lo)} ～ ${f(st.hi)}）`);
        console.log(`  新版执汉：${st.asR.n} 局 胜 ${st.asR.w} 和 ${st.asR.d}；新版执楚：${st.asB.n} 局 胜 ${st.asB.w} 和 ${st.asB.d}`);
        const verdict = stopped ? stopped.verdict : st.verdict;
        const when = stopped && stopped.n !== st.n ? `；第 ${stopped.n} 局时 LLR ${stopped.llr.toFixed(2)} 越界，提前停，之后只把正在下的 ${st.n - stopped.n} 局下完` : "";
        console.log(`序贯检验（Elo ${o.sprt[0]} 对 ${o.sprt[1]}）：LLR ${st.llr.toFixed(2)}（界 ±${st.bound.toFixed(2)}${when}）→ ${verdict === "H1" ? "通过（新版不比旧版明显弱" + (o.sprt[0] >= 0 ? "，而且更强" : "") + "）" : verdict === "H0" ? "不通过（新版明显" + (o.sprt[0] >= 0 ? "没有更强" : "变弱") + "）" : "还没有结论（局数上限到了，加大 --games 再跑）"}`);
        if (o.nodes) console.log(nodeMoves ? `按节点数收手：平均每步 ${Math.round(nodes / nodeMoves)} 个节点（设定 ${o.nodes}）` : "⚠ 设了 --nodes，但电脑没有报告节点数，可能还不支持按节点数收手");
        if (errors.length) console.log(`✗ 有 ${errors.length} 局出错，这次对打的结论无效：`, errors.slice(0, 2).map(e => e.seed + " " + e.error.split("\n")[0]).join(" | "));
        if (o.json) require("fs").writeFileSync(o.json, JSON.stringify({
            args: o,
            results: results,
            errors: errors,
            stats: {
                ...st,
                verdict: verdict,
                stoppedAt: stopped && {
                    n: stopped.n,
                    llr: stopped.llr,
                    verdict: stopped.verdict
                }
            }
        }, null, 1));
        return st;
    }
    const sum = summarize(results);
    sum.errors = errors.length;
    sum.seconds = Math.round((Date.now() - t0) / 1e3);
    sum.label = [ o.presets.join("+"), ...o.sets, o.saveUlt ? "save-ult" : "" ].filter(Boolean).join(" ") || "current";
    sum.level = (o.red || o.level) + " vs " + (o.black || o.level) + (o.aiR || o.aiB || o.ai !== "src/bfai.js" ? `  [汉 ${o.aiR || o.ai} | 楚 ${o.aiB || o.ai}]` : "");
    if (o.openAI) sum.level += `  [开局 ${o.open} 步由 ${o.openAI} 挑]`;
    if (o.openNodes) sum.level += `  [开局按 ${o.openNodes} 节点]`;
    if (o.openSeq) sum.level += `  [开局强制 ${o.openSeq.length} 步]`;
    print(sum, o);
    if (errors.length) console.log(`✗ 出错的局 ${errors.length} 个（没算进胜负；出错的局往往不是随便哪局，结果可能有偏差）：`, errors.slice(0, 3).map(e => e.seed + " " + e.error.split("\n")[0]).join(" | "));
    return sum;
}

function merge(o) {
    const fs = require("fs");
    const parts = o.merge.map(f => JSON.parse(fs.readFileSync(f, "utf8")));
    const a0 = parts[0].args;
    if (a0.match) throw new Error("--merge 暂不支持对打（--match）的结果");
    const same = a => JSON.stringify({
        ...a,
        games: 0,
        seed: 0,
        json: null,
        jobs: 0,
        quiet: false,
        merged: null
    });
    for (const [i, p] of parts.entries()) if (same(p.args) !== same(a0)) throw new Error(`第 ${i + 1} 份的参数和第 1 份不一样（只许种子、局数、并行数不同）`);
    const results = parts.flatMap(p => p.results).sort((x, y) => x.seed - y.seed), errors = parts.flatMap(p => p.errors || []);
    const seen = new Set;
    for (const r of [ ...results, ...errors ]) {
        if (seen.has(r.seed)) throw new Error("种子重复：" + r.seed);
        seen.add(r.seed);
    }
    const seeds = [ ...seen ].sort((x, y) => x - y);
    const args = {
        ...a0,
        seed: seeds[0],
        games: seeds.length,
        json: o.json || null,
        merged: o.merge,
        quiet: false
    };
    if (seeds[seeds.length - 1] - seeds[0] + 1 !== seeds.length) console.log(`注意：种子不连续（${seeds[0]}～${seeds[seeds.length - 1]} 共 ${seeds.length} 个）`);
    if (o.json) fs.writeFileSync(o.json, JSON.stringify({
        args: args,
        overrides: parts[0].overrides,
        results: results,
        errors: errors
    }, null, 1));
    const sum = summarize(results);
    sum.errors = errors.length;
    sum.seconds = 0;
    sum.label = [ a0.presets.join("+"), ...a0.sets, a0.saveUlt ? "save-ult" : "" ].filter(Boolean).join(" ") || "current";
    sum.level = (a0.red || a0.level) + " vs " + (a0.black || a0.level) + (a0.aiR || a0.aiB || a0.ai !== "src/bfai.js" ? `  [汉 ${a0.aiR || a0.ai} | 楚 ${a0.aiB || a0.ai}]` : "");
    print(sum, args);
    if (errors.length) console.log(`✗ 出错的局 ${errors.length} 个（没算进胜负；出错的局往往不是随便哪局，结果可能有偏差）：`, errors.slice(0, 3).map(e => e.seed + " " + e.error.split("\n")[0]).join(" | "));
    console.log(`（合并 ${parts.length} 份：${o.merge.join("、")}）`);
    return sum;
}

function wilson(k, n) {
    if (!n) return [ 0, 0 ];
    const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [ (c - m) / d, (c + m) / d ];
}

const pct = x => (100 * x).toFixed(1) + "%";

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

const quant = (a, q) => {
    if (!a.length) return 0;
    const s = a.slice().sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

function summarize(rs) {
    const N = rs.length, S = {
        n: N
    };
    const w = {
        r: 0,
        b: 0,
        draw: 0
    };
    const reasons = {};
    for (const r of rs) {
        if (r.winner) w[r.winner]++; else w.draw++;
        reasons[(r.winner || "-") + ":" + r.reason] = (reasons[(r.winner || "-") + ":" + r.reason] || 0) + 1;
    }
    S.win = w;
    S.reasons = reasons;
    const dec = w.r + w.b;
    S.redShareDecisive = dec ? w.r / dec : 0;
    S.redCI = wilson(w.r, dec);
    const rounds = rs.map(r => r.rounds);
    S.rounds = {
        mean: mean(rounds),
        median: quant(rounds, .5),
        p90: quant(rounds, .9),
        within60: rounds.filter(x => x <= 60).length / N
    };
    S.final = rs.filter(r => r.final).length / N;
    const uh = s => {
        const t = {
            full: 0,
            hurt: 0,
            last: 0
        };
        for (const r of rs) if (r.upHp) for (const k in t) t[k] += r.upHp[s][k];
        return t;
    };
    S.upHp = {
        r: uh("r"),
        b: uh("b")
    };
    {
        const g2 = rs.filter(r => r.firstR2 && r.winner);
        const first = g2.filter(r => r.firstR2.r != null && r.firstR2.b != null && r.firstR2.r !== r.firstR2.b), only = g2.filter(r => r.firstR2.r == null !== (r.firstR2.b == null));
        const who = r => r.firstR2.b == null || r.firstR2.r != null && r.firstR2.r < r.firstR2.b ? "r" : "b";
        S.firstR2 = {
            n: first.length,
            win: first.filter(r => r.winner === who(r)).length,
            onlyN: only.length,
            onlyWin: only.filter(r => r.winner === who(r)).length
        };
    }
    const jc = (s, k) => rs.reduce((t, r) => t + (r.jumaCounter && r.jumaCounter[s] && r.jumaCounter[s][k] || 0), 0);
    S.counter = {
        fanji: {
            r: jc("r", "fanji"),
            b: jc("b", "fanji")
        },
        heal: {
            r: jc("r", "heal"),
            b: jc("b", "heal")
        },
        juma: {
            r: jc("r", "hit"),
            b: jc("b", "hit")
        }
    };
    S.avail = {};
    for (const s of [ "r", "b" ]) {
        const g = rs.filter(r => r.avail && r.avail[s] != null);
        if (!g.length) continue;
        const used = g.filter(r => r.act[s][s === "r" ? "art_revive" : "art_pofu"]);
        S.avail[s] = {
            n: g.length,
            round: mean(g.map(r => r.avail[s])),
            win: g.filter(r => r.winner === s).length,
            used: used.length,
            usedWin: used.filter(r => r.winner === s).length
        };
    }
    S.sus = {};
    for (const s of [ "r", "b" ]) {
        const g = rs.filter(r => r.sus && r.sus[s] != null);
        if (!g.length) continue;
        const used = g.filter(r => r.act[s][s === "r" ? "art_revive" : "art_pofu"]);
        S.sus[s] = {
            n: g.length,
            round: mean(g.map(r => r.sus[s])),
            turns: mean(g.map(r => r.susN[s])),
            win: g.filter(r => r.winner === s).length,
            used: used.length,
            usedWin: used.filter(r => r.winner === s).length
        };
    }
    S.bs = rs.some(r => r.bs);
    const pfs = rs.filter(r => r.pf);
    if (pfs.length) {
        const avg = f => mean(pfs.map(f));
        S.pf = {
            n: pfs.length,
            gain: avg(r => r.pf.s1 - r.pf.s0),
            gainM: avg(r => r.pf.m1 - r.pf.m0),
            back: avg(r => r.pf.s2 - r.pf.s1),
            backM: avg(r => r.pf.m2 - r.pf.m1),
            half: pfs.filter(r => r.pf.s2 - r.pf.s1 >= -(r.pf.s1 - r.pf.s0) / 2).length / pfs.length,
            ended: pfs.filter(r => r.pf.ended).length,
            redWin: pfs.filter(r => r.winner === "r").length / pfs.length
        };
    }
    const mates = rs.filter(r => r.mate);
    if (mates.length) {
        const tl = r => String(r.mate.t || "").split(",");
        const md = mates.filter(r => r.endDef), lost = md.map(r => 4 - r.endDef[r.winner === "r" ? "b" : "r"]);
        const per = f => rs.reduce((t, r) => t + f(r, "r") + f(r, "b"), 0) / N;
        const A_ = (r, s, k) => r.act && r.act[s] && r.act[s][k] || 0, K_ = (r, s, k) => r.kills && r.kills[s] && r.kills[s][k] || 0, H_ = (r, s, k) => r.hits && r.hits[s] && r.hits[s][k] || 0;
        S.atkdef = {
            rook: mates.filter(r => tl(r).some(t => t[0] === "r")).length / mates.length,
            rook3: mates.filter(r => tl(r).some(t => t[0] === "r" && +t.slice(1) >= 3)).length / mates.length,
            adj: mates.filter(r => r.mate.adj).length / mates.length,
            n: md.length,
            defLost: md.length ? mean(lost) : null,
            dist: [ 0, 1, 2, 3, 4 ].map(k => lost.filter(x => x === k).length),
            sk: {
                hujia: per((r, s) => A_(r, s, "sk_hujia")),
                jinwei: per((r, s) => A_(r, s, "via_jinwei")),
                feiyue: per((r, s) => A_(r, s, "sk_feiyue")),
                qishe: per((r, s) => A_(r, s, "sk_qishe")),
                jianta: per((r, s) => K_(r, s, "jianta") + H_(r, s, "jianta")),
                fanji: per((r, s) => r.jumaCounter && r.jumaCounter[s] && r.jumaCounter[s].fanji || 0)
            }
        };
    }
    S.mate = {
        n: mates.length,
        hard: mates.filter(r => r.mate.hp >= 2).length,
        hardAdj: mates.filter(r => r.mate.hardAdj).length,
        double: mates.filter(r => r.mate.n >= 2).length
    };
    const keys = new Set;
    for (const r of rs) for (const s of [ "r", "b" ]) for (const k of Object.keys(r.act[s])) keys.add(k);
    S.act = {};
    for (const k of [ ...keys ].sort()) S.act[k] = {
        r: use(rs, r => r.act.r[k]),
        b: use(rs, r => r.act.b[k])
    };
    const ukeys = new Set;
    for (const r of rs) for (const s of [ "r", "b" ]) for (const k of Object.keys(r.up[s])) ukeys.add(k);
    S.up = {};
    for (const k of [ ...ukeys ].sort()) S.up[k] = {
        r: use(rs, r => r.up.r[k]),
        b: use(rs, r => r.up.b[k])
    };
    const kkeys = new Set;
    for (const r of rs) for (const s of [ "r", "b" ]) for (const k of Object.keys(r.kills[s])) kkeys.add(k);
    S.kills = {};
    for (const k of [ ...kkeys ].sort()) S.kills[k] = {
        r: use(rs, r => r.kills.r[k]),
        b: use(rs, r => r.kills.b[k])
    };
    const hkeys = new Set;
    for (const r of rs) for (const s of [ "r", "b" ]) for (const k of Object.keys(r.hits[s])) hkeys.add(k);
    S.hits = {};
    for (const k of [ ...hkeys ].sort()) S.hits[k] = {
        r: use(rs, r => r.hits.r[k]),
        b: use(rs, r => r.hits.b[k])
    };
    const mkeys = new Set;
    for (const r of rs) for (const s of [ "r", "b" ]) for (const k of Object.keys(r.meritBy[s])) mkeys.add(k);
    S.merit = {};
    for (const k of [ ...mkeys ].sort()) S.merit[k] = {
        r: mean(rs.map(r => r.meritBy.r[k] || 0)),
        b: mean(rs.map(r => r.meritBy.b[k] || 0))
    };
    const usedWin = pick => {
        const g = {
            r: [ 0, 0 ],
            b: [ 0, 0 ]
        };
        for (const r of rs) for (const s of [ "r", "b" ]) if (pick(r)[s] != null) {
            g[s][0]++;
            if (r.winner === s) g[s][1]++;
        }
        return g;
    };
    S.ult = {
        used: usedWin(r => r.ultRound),
        round: {
            r: mean(rs.filter(r => r.ultRound.r != null).map(r => r.ultRound.r)),
            b: mean(rs.filter(r => r.ultRound.b != null).map(r => r.ultRound.b))
        }
    };
    S.art = {
        used: usedWin(r => r.artRound),
        round: {
            r: mean(rs.filter(r => r.artRound.r != null).map(r => r.artRound.r)),
            b: mean(rs.filter(r => r.artRound.b != null).map(r => r.artRound.b))
        }
    };
    S.rescue = rs.filter(r => r.rescue).length;
    {
        const g = rs.filter(r => r.rev);
        if (g.length) {
            const cnt = f => {
                const o = {};
                for (const r of g) {
                    const k = f(r);
                    o[k] = (o[k] || 0) + 1;
                }
                return o;
            };
            const done = r => r.winner != null || r.reason !== "probe", lo = g.filter(r => r.rev.dl === 1 && done(r)), hi = g.filter(r => r.rev.dl != null && r.rev.dl >= 2 && done(r));
            S.rev = {
                n: g.length,
                t: cnt(r => r.rev.t),
                dl: cnt(r => r.rev.dl == null ? "?" : r.rev.dl),
                rl: cnt(r => r.rev.rl == null ? "?" : r.rev.rl),
                up: g.filter(r => r.rev.up).length,
                up1: g.filter(r => r.rev.up1).map(r => ({
                    wait: r.rev.up1.round - r.rev.round,
                    cost: r.rev.up1.cost,
                    how: r.rev.up1.how || (r.rev.up && r.rev.up1.round === r.rev.round ? "spot" : r.rev.up1.cost ? "manual" : "plates")
                })),
                lo: [ lo.length, lo.filter(r => r.winner === "r").length ],
                hi: [ hi.length, hi.filter(r => r.winner === "r").length ]
            };
        }
    }
    S.comeback = {};
    for (const rd of [ 10, 20, 30 ]) for (const T of [ 2, 4 ]) {
        let n = 0, k = 0, nd = 0;
        for (const r of rs) {
            const s = r.samples.find(x => x.round === rd);
            if (!s || Math.abs(s.score) < T) continue;
            n++;
            const behind = s.score < 0 ? "r" : "b";
            if (r.winner === behind) k++;
            if (!r.winner) nd++;
        }
        S.comeback[`R${rd}≥${T}`] = {
            n: n,
            trailingWins: k,
            draws: nd
        };
    }
    S.scoreByRound = {};
    for (const rd of [ 5, 10, 15, 20, 30, 40 ]) {
        const xs = rs.map(r => r.samples.find(x => x.round === rd)).filter(Boolean);
        if (xs.length >= N * .2) S.scoreByRound[rd] = {
            n: xs.length,
            score: mean(xs.map(x => x.score)),
            meritR: mean(xs.map(x => x.merit.r)),
            meritB: mean(xs.map(x => x.merit.b)),
            lvR: mean(xs.map(x => x.lv.r)),
            lvB: mean(xs.map(x => x.lv.b))
        };
    }
    S.firstLv = {};
    for (const L of [ 2, 3, 4 ]) S.firstLv[L] = {
        r: mean(rs.filter(r => r.firstLv.r[L] != null).map(r => r.firstLv.r[L])),
        b: mean(rs.filter(r => r.firstLv.b[L] != null).map(r => r.firstLv.b[L])),
        rn: rs.filter(r => r.firstLv.r[L] != null).length / N,
        bn: rs.filter(r => r.firstLv.b[L] != null).length / N
    };
    S.msPerPly = mean(rs.map(r => r.ms / Math.max(1, r.plies)));
    return S;
    function use(rs, f) {
        let g = 0, t = 0;
        for (const r of rs) {
            const v = f(r) || 0;
            if (v) g++;
            t += v;
        }
        return {
            games: g / N,
            avg: t / N
        };
    }
}

const CN = {
    mv: "普通走子",
    pass: "停着",
    ult: "终极兵法",
    art_revive: "召回良将",
    art_revive_up: "召回后马上升级",
    art_pofu: "破釜沉舟",
    sk_juma: "拒马",
    sk_huichun: "回春",
    fanji: "反击",
    sk_chongzhen: "冲阵",
    sk_taying: "踏营",
    sk_pili: "霹雳",
    sk_qishe: "齐射",
    sk_hujia: "护驾",
    sk_feiyue: "飞越",
    via_shensu: "神速营(被动)",
    via_huifang: "回防(被动)",
    via_jinwei: "铁甲禁卫(被动)",
    capture: "普通吃子",
    chongzhen: "冲阵",
    taying: "踏营",
    pili: "霹雳",
    qishe: "齐射",
    jianta: "践踏",
    juma: "拒马反伤",
    feiyue: "飞越",
    attack: "强攻"
};

function print(S, o) {
    const L = [];
    const cn = k => CN[k] || k;
    const ci = S.redCI.map(x => (100 * x).toFixed(0)).join("–");
    L.push(`== ${S.label} | ${S.level} | ${S.n} 局 | ${S.seconds}s ==`);
    L.push(`胜负：汉 ${S.win.r}  楚 ${S.win.b}  和/超时 ${S.win.draw}   汉方胜率（分胜负的局）${pct(S.redShareDecisive)}  95%CI ${ci}%${S.errors ? `  ✗ 另有 ${S.errors} 局出错、没算进来，结果可能有偏差` : ""}`);
    L.push(`结局：${Object.entries(S.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join("  ")}`);
    L.push(`回合：平均 ${S.rounds.mean.toFixed(1)}  中位 ${S.rounds.median}  P90 ${S.rounds.p90}  60 回合内结束 ${pct(S.rounds.within60)}  进入决战 ${pct(S.final)}`);
    if (S.mate && S.mate.n) L.push(`将死 ${S.mate.n} 局：将军的子有 2 血以上 ${pct(S.mate.hard / S.mate.n)}（其中贴在帅将身边 ${pct(S.mate.hardAdj / S.mate.n)}），双将 ${pct(S.mate.double / S.mate.n)}`);
    if (S.atkdef) {
        const D = S.atkdef, k = D.sk;
        L.push(`攻防指标：车参与的将死 ${pct(D.rook)}（三级以上的车 ${pct(D.rook3)}）；贴脸将死 ${pct(D.adj)}；被将死的一方开局 4 个士象，终局平均丢 ${D.defLost == null ? "-" : D.defLost.toFixed(2)} 个（丢 0/1/2/3/4 个的局：${D.dist.join("/")}）`);
        L.push(`士象技能（两方合计，每局平均次数）：护驾 ${k.hujia.toFixed(2)}，铁甲禁卫 ${k.jinwei.toFixed(2)}，飞越 ${k.feiyue.toFixed(2)}，齐射 ${k.qishe.toFixed(2)}，践踏打中 ${k.jianta.toFixed(2)}，反击 ${k.fanji.toFixed(2)}`);
    }
    if (o.quiet) {
        console.log(L.join("\n"));
        return;
    }
    L.push("行动（用过的局占比 / 每局平均次数）  汉 | 楚");
    for (const [k, v] of Object.entries(S.act)) L.push(`  ${cn(k).padEnd(10)} ${pct(v.r.games).padStart(6)} ${v.r.avg.toFixed(2).padStart(6)} | ${pct(v.b.games).padStart(6)} ${v.b.avg.toFixed(2).padStart(6)}`);
    L.push("升级（* = 甲片自动晋升）  汉 | 楚 （用过的局占比 / 每局平均）");
    for (const [k, v] of Object.entries(S.up)) L.push(`  ${k.padEnd(5)} ${pct(v.r.games).padStart(6)} ${v.r.avg.toFixed(2).padStart(5)} | ${pct(v.b.games).padStart(6)} ${v.b.avg.toFixed(2).padStart(5)}`);
    L.push("击杀来源（每局平均）  汉 | 楚");
    for (const [k, v] of Object.entries(S.kills)) L.push(`  ${cn(k).padEnd(10)} ${v.r.avg.toFixed(2).padStart(6)} | ${v.b.avg.toFixed(2).padStart(6)}`);
    L.push("造成伤害但没打死（每局平均）  汉 | 楚");
    for (const [k, v] of Object.entries(S.hits)) L.push(`  ${cn(k).padEnd(10)} ${v.r.avg.toFixed(2).padStart(6)} | ${v.b.avg.toFixed(2).padStart(6)}`);
    L.push("军功来源（每局平均）  汉 | 楚");
    for (const [k, v] of Object.entries(S.merit)) L.push(`  ${k.padEnd(6)} ${v.r.toFixed(1).padStart(6)} | ${v.b.toFixed(1).padStart(6)}`);
    const ur = S.ult.used, ar = S.art.used;
    L.push(`终极兵法：汉用 ${ur.r[0]} 局（平均第 ${S.ult.round.r.toFixed(1)} 回合，用了的局胜 ${ur.r[0] ? pct(ur.r[1] / ur.r[0]) : "-"}）  楚用 ${ur.b[0]} 局（第 ${S.ult.round.b.toFixed(1)} 回合，胜 ${ur.b[0] ? pct(ur.b[1] / ur.b[0]) : "-"}）  护驾破鸿门宴 ${S.rescue} 局`);
    L.push(`主帅兵法：汉召回 ${ar.r[0]} 局（第 ${S.art.round.r.toFixed(1)} 回合，胜 ${ar.r[0] ? pct(ar.r[1] / ar.r[0]) : "-"}）  楚${S.bs ? "背水" : "破釜"} ${ar.b[0]} 局（第 ${S.art.round.b.toFixed(1)} 回合，胜 ${ar.b[0] ? pct(ar.b[1] / ar.b[0]) : "-"}）`);
    if (S.rev) {
        const TN = {
            r: "车",
            n: "马",
            c: "炮",
            p: "兵",
            a: "士",
            e: "象"
        }, j = o => Object.entries(o).sort().map(([k, v]) => `${TN[k] || k} ${v}`).join("、"), jl = o => Object.entries(o).sort().map(([k, v]) => `${k} 级 ${v}`).join("、");
        L.push(`召回的子（${S.rev.n} 次）：${j(S.rev.t)}；死时 ${jl(S.rev.dl)}；回来 ${jl(S.rev.rl)}${(() => {
            const U = S.rev.up1 || [], sp = U.filter(x => x.how === "spot"), mn = U.filter(x => x.how === "manual"), pl = U.filter(x => x.how === "plates");
            return U.length ? `；召回的子第一次升级：当场 ${sp.length} 次${sp.length ? `（平均花 ${mean(sp.map(x => x.cost)).toFixed(1)}）` : ""}、之后手动 ${mn.length} 次${mn.length ? `（召回后平均 ${mean(mn.map(x => x.wait)).toFixed(1)} 回合、平均花 ${mean(mn.map(x => x.cost)).toFixed(1)}）` : ""}、甲片自动 ${pl.length} 次；没升过 ${S.rev.n - U.length} 次` : S.rev.up ? `；当场花军功升了一级 ${S.rev.up} 次` : "";
        })()}；死时一级的那些局汉胜 ${S.rev.lo[0] ? pct(S.rev.lo[1] / S.rev.lo[0]) : "-"}（${S.rev.lo[0]} 局），二级以上 ${S.rev.hi[0] ? pct(S.rev.hi[1] / S.rev.hi[0]) : "-"}（${S.rev.hi[0]} 局）`);
    }
    for (const s of [ "r", "b" ]) {
        const A = S.avail && S.avail[s];
        if (A) L.push(`少子才能用的主帅兵法（${s === "r" ? "汉召回" : "楚背水"}）：轮到自己时满足用的条件（车马炮比对方少；第三版还要至少丢了一半）过 ${A.n} 局，第一次平均第 ${A.round.toFixed(1)} 回合；真用了 ${A.used} 局（胜 ${A.used ? pct(A.usedWin / A.used) : "-"}）`);
    }
    if (S.sus && (S.sus.r || S.sus.b)) L.push("车马炮持续落后（自己走完还少、到下回合还少）：" + [ "r", "b" ].map(s => {
        const A = S.sus[s];
        return `${s === "r" ? "汉" : "楚"} ${A ? `${A.n} 局（${pct(A.n / S.n)}，第一次平均第 ${A.round.toFixed(1)} 回合、平均落后 ${A.turns.toFixed(1)} 回合；这些局${s === "r" ? "汉" : "楚"}胜 ${pct(A.win / A.n)}；其中用了主帅兵法 ${A.used} 局、胜 ${A.used ? pct(A.usedWin / A.used) : "-"}）` : "0 局"}`;
    }).join(" | "));
    {
        const f = H => {
            const n = H.full + H.hurt;
            return n ? `满血 ${pct(H.full / n)}、掉过血 ${pct(H.hurt / n)}（只剩 1 血 ${pct(H.last / n)}），共 ${n} 次` : "-";
        };
        L.push(`手动升级时的血量（升级回满血，掉了血再升更划算）：汉 ${f(S.upHp.r)} | 楚 ${f(S.upHp.b)}`);
    }
    if (S.counter && S.counter.fanji.r + S.counter.fanji.b + S.counter.heal.r + S.counter.heal.b) L.push(`反击 / 回春（每局平均）：士象还手 汉 ${(S.counter.fanji.r / S.n).toFixed(2)} | 楚 ${(S.counter.fanji.b / S.n).toFixed(2)}；回春回血 汉 ${(S.counter.heal.r / S.n).toFixed(2)} | 楚 ${(S.counter.heal.b / S.n).toFixed(2)}；拒马反伤 汉 ${(S.counter.juma.r / S.n).toFixed(2)} | 楚 ${(S.counter.juma.b / S.n).toFixed(2)}`);
    if (S.firstR2 && (S.firstR2.n || S.firstR2.onlyN)) L.push(`先有二级车的一方：两边都有的 ${S.firstR2.n} 局里先到的胜 ${S.firstR2.n ? pct(S.firstR2.win / S.firstR2.n) : "-"}；只有一方有的 ${S.firstR2.onlyN} 局里有的一方胜 ${S.firstR2.onlyN ? pct(S.firstR2.onlyWin / S.firstR2.onlyN) : "-"}`);
    if (S.pf && S.bs) L.push(`背水前后（${S.pf.n} 局，分数 + 汉优；背水没有封锁期，这里的“之后”只是汉方紧接着的一手）：背水那一手汉方 ${S.pf.gain.toFixed(2)} 分（子力 ${S.pf.gainM.toFixed(2)}）；汉方随后一手 ${S.pf.back >= 0 ? "+" : ""}${S.pf.back.toFixed(2)} 分；这些局汉胜 ${pct(S.pf.redWin)}`); else if (S.pf) L.push(`破釜前后（${S.pf.n} 局，分数 + 汉优）：破釜那一手汉方 ${S.pf.gain.toFixed(2)} 分（子力 ${S.pf.gainM.toFixed(2)}）；之后封锁期汉方 ${S.pf.back >= 0 ? "+" : ""}${S.pf.back.toFixed(2)} 分（子力 ${S.pf.backM >= 0 ? "+" : ""}${S.pf.backM.toFixed(2)}）；追回一半以上 ${pct(S.pf.half)}；封锁期内就分了胜负 ${S.pf.ended} 局；这些局汉胜 ${pct(S.pf.redWin)}`);
    L.push("首次升到 N 级（平均回合 / 出现的局占比）  汉 | 楚");
    for (const [k, v] of Object.entries(S.firstLv)) L.push(`  ${k} 级  第 ${v.r.toFixed(1)} 回合 ${pct(v.rn)} | 第 ${v.b.toFixed(1)} 回合 ${pct(v.bn)}`);
    L.push("局面分随回合（汉方视角，正 = 汉优）/ 军功 / 等级总和");
    for (const [k, v] of Object.entries(S.scoreByRound)) L.push(`  R${k}（${v.n} 局在下）分 ${v.score.toFixed(2)}  军功 汉 ${v.meritR.toFixed(1)} 楚 ${v.meritB.toFixed(1)}  等级 汉 ${v.lvR.toFixed(1)} 楚 ${v.lvB.toFixed(1)}`);
    L.push("翻盘（某回合落后 ≥ T 分的一方最后赢了）");
    for (const [k, v] of Object.entries(S.comeback)) if (v.n) L.push(`  ${k}：${v.n} 局，落后方赢 ${v.trailingWins}（${pct(v.trailingWins / v.n)}），和 ${v.draws}`);
    L.push(`每步平均 ${S.msPerPly.toFixed(0)}ms`);
    console.log(L.join("\n"));
}

if (require.main === module) {
    const o = parseArgs(process.argv.slice(2));
    if (o.worker) worker(); else if (o.merge) merge(o); else run(o).catch(e => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = {
    parseArgs, matchLevels,
    PRESETS: PRESETS,
    summarize: summarize,
    applyPatches: applyPatches,
    wrapThinkForNoUp: wrapThinkForNoUp
};
