(function(global) {
    const XQ = global.XQ || require("./rules.js");
    const {pseudoMoves: pseudoMoves, inCheck: inCheck, findKing: findKing, inBoard: inBoard, ownHalf: ownHalf, other: other, initialBoard: initialBoard, checkers: checkers, inPalace: inPalace} = XQ;
    const CFG = {
        finalKingHp: 3,
        finalOccupyRounds: 3,
        merit: {
            start: 3,
            cap: 30,
            autoIncomeFromRound: 15,
            autoIncomePerRound: 1,
            phase3FromRound: 45,
            phase3PerRound: 2,
            killReward: {
                p: 1,
                a: 2,
                e: 2,
                n: 3,
                c: 3,
                r: 5
            },
            killRewardPerLevel: 1,
            checkReward: 1,
            pawnCrossRiverReward: 1,
            lostPieceCompensation: 1
        },
        upgrade: {
            cost: {
                p: [ 3, 5, 8 ],
                a: [ 2, 3, 4 ],
                e: [ 2, 3, 5 ],
                n: [ 5, 7 ],
                c: [ 5, 7 ],
                r: [ 6, 8, 20 ]
            },
            maxLevel: {
                r: 4,
                p: 4,
                a: 4,
                e: 4
            },
            autoByPlates: true,
            defaultMaxLevel: 3,
            maxPerTurn: 1,
            healOnUpgrade: true,
            cooldownOnUnlock: 1,
            killDiscount: 1,
            minCost: 1
        },
        hp: [ 1, 2, 3, 4 ],
        hpByType: {
            p: [ 1, 2, 3, 3 ],
            a: [ 1, 2, 3, 3 ],
            e: [ 1, 2, 3, 3 ]
        },
        attack: {
            a: [ 1, 2, 2, 2 ],
            e: [ 1, 2, 2, 2 ]
        },
        skillLevel: 3,
        skills: {
            juma: {
                level: 2,
                cooldown: 4,
                duration: 2,
                damage: 1,
                free: true,
                rooted: true,
                counterCannon: false,
                counterElephant: false
            },
            shensu: {
                level: 4,
                passive: true,
                move: true,
                cooldown: 5,
                range: 2
            },
            huifang: {
                level: 4,
                passive: true,
                move: true,
                cooldown: 2
            },
            jinwei: {
                level: 4,
                passive: true,
                move: true,
                cooldown: 2
            },
            chongzhen: {
                cooldown: 3,
                springDamage: 1
            },
            taying: {
                cooldown: 2,
                enemyHalfOnly: true,
                passive: true,
                move: true
            },
            pili: {
                cooldown: 4,
                splashDamage: 1,
                splashMinLevel: 2
            },
            feiyue: {
                cooldown: 5,
                passive: true,
                move: true
            },
            qishe: {
                level: 4,
                cooldown: 3,
                range: 2,
                damage: 1
            },
            jianta: {
                level: 4,
                passive: true,
                splashDamage: 1,
                splashMinLevel: 1,
                ring8: true
            },
            hujia: {
                cooldown: 4
            }
        },
        generalArts: {
            fromRound: 1,
            xiaohe: {
                usesPerGame: 1
            },
            pofu: {
                usesPerGame: 1,
                steps: 2,
                mayEndInCheck: false,
                skillLockRounds: 3
            }
        },
        ultimates: {
            cost: 20,
            hongmen: {
                usesPerGame: 1,
                rounds: 3
            },
            simian: {
                usesPerGame: 1,
                rounds: 2,
                radius: 2,
                minPiecesInRadius: 3
            }
        },
        longCheckLimit: 3,
        beishui: {
            on: true,
            maxLeft: 3,
            twoPieces: false,
            maxKills: 1,
            freeze: 1,
            strictEscape: true
        },
        r6: {
            on: true,
            attack: {
                r: [ 1, 1, 2, 2 ],
                p: [ 1, 1, 2, 2 ],
                n: [ 1, 1, 2 ],
                c: [ 1, 1, 2 ]
            },
            hpByType: {
                r: [ 1, 2, 3, 3 ]
            },
            cost: {
                r: [ 10, 12, 20 ]
            },
            reviveLevel: 2,
            reviveCap: true,
            reviveUp: true,
            reviveHalf: true,
            reviveBest: true,
            revivePlace: true
        }
    };
    const SKILL_OF = (t, s) => ({
        p: "juma",
        r: "chongzhen",
        n: "taying",
        c: "pili",
        a: "hujia",
        e: s === "r" ? "qishe" : "jianta"
    }[t] || null);
    const SKILLS_OF = (t, s) => ({
        p: [ "juma", "shensu", "huifang" ],
        a: [ "hujia", "jinwei" ],
        e: [ s === "r" ? "qishe" : "jianta", "feiyue" ]
    }[t] || (SKILL_OF(t, s) ? [ SKILL_OF(t, s) ] : []));
    const SKILL_CN = {
        juma: "拒马",
        chongzhen: "冲阵",
        taying: "踏营",
        pili: "霹雳",
        qishe: "齐射",
        jianta: "践踏",
        hujia: "护驾",
        shensu: "神速营",
        huifang: "回防",
        jinwei: "铁甲禁卫",
        feiyue: "飞越"
    };
    const ART_CN = {
        r: "召回良将",
        get b() {
            return CFG.beishui && CFG.beishui.on ? "背水一战" : "破釜沉舟";
        }
    }, ULT_CN = {
        r: "四面楚歌",
        b: "鸿门宴"
    };
    const ORTHO = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ];
    const RING8 = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ], [ 1, 1 ], [ 1, -1 ], [ -1, 1 ], [ -1, -1 ] ];
    const RANK_CN = {
        r: {
            p: [ "汉军兵", "汉伍长", "汉什长", "无当飞军" ],
            r: [ "汉军车", "汉轻车", "汉武刚车", "虎贲车骑" ],
            n: [ "汉军马", "汉骁骑", "郎中骑" ],
            c: [ "汉军炮", "汉抛石", "汉霹雳车" ],
            e: [ "汉军相", "汉材官", "蹶张强弩", "大黄弩士" ],
            a: [ "汉军士", "汉郎卫", "汉中涓", "参乘虎卫" ],
            k: [ "汉王刘邦" ]
        },
        b: {
            p: [ "楚军卒", "楚锐卒", "楚持戟", "江东甲士" ],
            r: [ "楚军车", "楚戎车", "楚陷阵车", "霸王车骑" ],
            n: [ "楚军马", "楚骁骑", "乌骓骑" ],
            c: [ "楚军炮", "楚抛石", "楚霹雳炮" ],
            e: [ "楚军象", "楚战象", "云梦巨象", "金甲象军" ],
            a: [ "楚军士", "楚郎卫", "楚执戟郎", "重瞳亲卫" ],
            k: [ "西楚霸王" ]
        }
    };
    const TIGER_RANKS = [ "汉军相", "驭虎长史", "持节护军", "白虎相国" ];
    const rankName = (s, t, lv) => {
        const a = (RANK_CN[s] || {})[t] || [];
        return a[Math.max(1, Math.min(a.length, lv || 1)) - 1] || "";
    };
    const HERO_CN = {
        r: {
            r: [ "韩信", "夏侯婴" ],
            p: [ "周勃", "曹参", "王陵", "卢绾", "傅宽" ],
            a: [ "樊哙", "纪信" ],
            e: [ "张良", "萧何" ]
        },
        b: {
            r: [ "龙且", "钟离昧" ],
            p: [ "季布", "英布", "虞子期", "桓楚", "周殷" ],
            a: [ "项庄", "项伯" ],
            e: [ "范增", "项佗" ]
        }
    };
    const heroName = p => p && p.nm != null ? ((HERO_CN[p.s] || {})[p.t] || [])[p.nm] || "" : "";
    function promote(S, p) {
        if (p.rh) delete p.rh;
        p.lv++;
        p.hp = CFG_CUR.upgrade.healOnUpgrade ? hpOf(p.t, p.lv) : p.hp + 1;
        for (const sk of SKILLS_OF(p.t, p.s)) if (skLevel(sk) === p.lv && !isPassive(sk)) {
            const k = cdKey(p, sk);
            p[k] = Math.max(p[k] || 0, S.cnt[p.s] + CFG_CUR.upgrade.cooldownOnUnlock);
        }
        if (p.lv === 4 && p.nm == null) {
            const N = S.named || (S.named = {
                r: {},
                b: {}
            }), i = N[p.s][p.t] || 0;
            if (i < ((HERO_CN[p.s] || {})[p.t] || []).length) {
                p.nm = i;
                N[p.s][p.t] = i + 1;
            }
        }
    }
    const SKILL_DESC = {
        juma: "原地驻营架矛，不占行动（架完还能走别的子）。持续两回合，期间这枚兵不能移动；对方近身来犯的棋子先挨一点伤害，炮隔子打来不受影响。",
        chongzhen: "撞开前方第一枚子（它挨 1 点），冲到它身后一格；那格有子，能杀就杀，杀不了就扣血退回。",
        shensu: "八个方向疾行 1～2 格，可以越子，只能落在空格。",
        huifang: "可以后退一格。",
        jinwei: "士在田字格内获得自由移动的能力：可上下左右走一格。",
        taying: "被动：在敌方半场、冷却好了，马腿被蹩住也能跳过去（会先问你用不用）。",
        feiyue: "被动：冷却好了，象眼被塞住也能走田字（会先问你用不用；仍不能过河）。",
        pili: "炮击一个敌子，落点四周二级以上的敌子各扣 1 点。",
        qishe: "不动身，射斜线 1～2 格内的一个敌子，扣 1 点。",
        jianta: "攻击或吃子后，落点周围一圈的敌子各扣 1 点。",
        hujia: "与帅（将）互换位置，可解将；鸿门宴期间可救出汉王。"
    };
    const START = {};
    const START_R = {};
    (() => {
        const b = initialBoard();
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (b[r][f]) {
            START[b[r][f].id] = [ f, r ];
            if (b[r][f].s === "r") (START_R[b[r][f].t] = START_R[b[r][f].t] || []).push([ f, r ]);
        }
    })();
    function newState(cfg) {
        const b = initialBoard();
        for (const row of b) for (const p of row) if (p) {
            p.lv = 1;
            p.hp = 1;
            p.cd = 0;
            p.jm = 0;
            p.xp = 0;
            p.kills = 0;
        }
        return {
            board: b,
            turn: "r",
            cnt: {
                r: 0,
                b: 0
            },
            merit: {
                r: cfg.merit.start,
                b: cfg.merit.start
            },
            used: {
                art: {
                    r: 0,
                    b: 0
                },
                ult: {
                    r: 0,
                    b: 0
                }
            },
            fx: {
                hm: 0,
                sm: 0,
                pf: 0
            },
            crossed: {},
            dead: {
                r: [],
                b: []
            },
            upgraded: false,
            ckHist: {
                r: [],
                b: []
            },
            named: {
                r: {},
                b: {}
            },
            occ: {
                r: 0,
                b: 0
            },
            final: false,
            freeUsed: false,
            jmLock: null
        };
    }
    function cloneState(S) {
        return {
            board: S.board.map(row => row.map(p => p ? {
                ...p
            } : null)),
            turn: S.turn,
            cnt: {
                ...S.cnt
            },
            merit: {
                ...S.merit
            },
            used: {
                art: {
                    ...S.used.art
                },
                ult: {
                    ...S.used.ult
                }
            },
            fx: {
                ...S.fx
            },
            crossed: {
                ...S.crossed
            },
            dead: {
                r: S.dead.r.slice(),
                b: S.dead.b.slice()
            },
            upgraded: S.upgraded,
            ckHist: {
                r: S.ckHist.r.slice(),
                b: S.ckHist.b.slice()
            },
            freeUsed: !!S.freeUsed,
            jmLock: S.jmLock == null ? null : S.jmLock,
            final: !!S.final,
            occ: {
                r: (S.occ || {}).r || 0,
                b: (S.occ || {}).b || 0
            },
            named: {
                r: {
                    ...(S.named || {}).r || {}
                },
                b: {
                    ...(S.named || {}).b || {}
                }
            }
        };
    }
    const at = (S, f, r) => inBoard(f, r) ? S.board[r][f] : null;
    const round = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
    const BSon = () => CFG_CUR.beishui && CFG_CUR.beishui.on ? CFG_CUR.beishui : null;
    const majors = (S, s) => {
        let m = 0, o = 0;
        for (const row of S.board) for (const p of row) if (p && (p.t === "r" || p.t === "n" || p.t === "c")) {
            if (p.s === s) m++; else o++;
        }
        return [ m, o ];
    };
    const artOpen = S => {
        if (round(S) < (CFG_CUR.generalArts.fromRound || 1)) return false;
        const B = BSon();
        if (!B) return true;
        const [m, o] = majors(S, S.turn);
        return m < o && (B.maxLeft == null || m <= B.maxLeft);
    };
    const frozen = (S, p) => !!(p && p.bz && S.cnt[p.s] < p.bz);
    const revived = (S, p) => !!(p && p.rv && S.cnt.r === p.rv && S.turn === "b");
    const hmActive = S => S.cnt.r < S.fx.hm;
    const smActive = S => S.cnt.b < S.fx.sm;
    const pfActive = S => S.cnt.b < S.fx.pf;
    const restricted = (S, s) => s === "r" ? hmActive(S) : smActive(S);
    const facing = b => {
        const k = findKing(b, "r"), K = findKing(b, "b");
        if (!k || !K || k[0] !== K[0] || b[k[1]][k[0]].w) return false;
        for (let r = Math.min(k[1], K[1]) + 1; r < Math.max(k[1], K[1]); r++) if (b[r][k[0]]) return false;
        return true;
    };
    const inCheckS = (S, s) => S.final ? false : s === "r" && smActive(S) ? facing(S.board) : inCheck(S.board, s);
    const inCheckF = (S, s) => !S.final && inCheck(S.board, s);
    const jmActive = (S, p) => p && p.t === "p" && p.jm > S.cnt[other(p.s)];
    const jmRooted = (S, p) => !!(CFG_CUR.skills.juma.rooted && jmActive(S, p));
    const jmHits = P => P.t !== "k" && !(P.t === "c" && !CFG_CUR.skills.juma.counterCannon) && !(P.t === "e" && !CFG_CUR.skills.juma.counterElephant);
    const maxLv = t => t === "k" ? 1 : CFG_CUR.upgrade.maxLevel[t] || CFG_CUR.upgrade.defaultMaxLevel;
    const bestDeadLv = (S, t) => {
        let m = 1;
        for (const d of S.dead.r) if (d.t === t && (d.lv || 1) > m) m = d.lv || 1;
        return m;
    };
    const bestDead = (S, t) => {
        let b = null;
        for (const d of S.dead.r) if (d.t === t && (!b || (d.lv || 1) > (b.lv || 1))) b = d;
        return b;
    };
    function reviveActs(S) {
        const R = R6(), out = [], seen = new Set;
        if (R && R.revivePlace) {
            for (const d of S.dead.r) {
                if (seen.has(d.t)) continue;
                seen.add(d.t);
                const b = bestDead(S, d.t);
                for (const q of START_R[d.t] || []) if (!at(S, q[0], q[1])) out.push({
                    k: "art",
                    id: b.id,
                    at: q.slice(),
                    t: d.t
                });
            }
        } else for (const d of S.dead.r) {
            if (seen.has(d.id)) continue;
            seen.add(d.id);
            out.push({
                k: "art",
                id: d.id,
                t: d.t
            });
        }
        return out;
    }
    const R6 = (cfg = CFG_CUR) => cfg.r6 && cfg.r6.on ? cfg.r6 : null;
    const atkTbl = (t, cfg = CFG_CUR) => {
        const R = R6(cfg);
        return R && R.attack && R.attack[t] || cfg.attack[t] || [];
    };
    const hpTbl = (t, cfg = CFG_CUR) => {
        const R = R6(cfg);
        return R && R.hpByType && R.hpByType[t] || cfg.hpByType[t] || cfg.hp;
    };
    const costTbl = (t, cfg = CFG_CUR) => {
        const R = R6(cfg);
        return R && R.cost && R.cost[t] || cfg.upgrade.cost[t];
    };
    const atk = p => atkTbl(p.t)[(p.lv || 1) - 1] || 1;
    const hpOf = (t, lv, cfg = CFG_CUR) => hpTbl(t, cfg)[lv - 1];
    const isPassive = sk => !!(sk && CFG_CUR.skills[sk] && CFG_CUR.skills[sk].passive);
    const skLevel = sk => CFG_CUR.skills[sk] && CFG_CUR.skills[sk].level || CFG_CUR.skillLevel;
    const cdKey = (p, sk) => sk === SKILL_OF(p.t, p.s) ? "cd" : "c_" + sk;
    const cdReady = (S, p, sk) => S.cnt[p.s] >= (p[cdKey(p, sk)] || 0);
    const setCd = (S, p, sk) => {
        p[cdKey(p, sk)] = S.cnt[p.s] + CFG_CUR.skills[sk].cooldown + 1;
    };
    const hasSkill = (p, sk) => SKILLS_OF(p.t, p.s).includes(sk) && p.lv >= skLevel(sk);
    const skillOk = (S, p, sk) => hasSkill(p, sk) && !isPassive(sk) && cdReady(S, p, sk) && !S.freeUsed && !(p.s === "b" && (pfActive(S) || smActive(S)));
    const skillReady = (S, p, sk) => skillOk(S, p, sk || SKILL_OF(p.t, p.s));
    const baseCostOf = p => {
        const b = costTbl(p.t)[p.lv - 1], R = R6();
        return p.rh && R && R.reviveHalf ? Math.ceil(b / 2) : b;
    };
    const upCost = p => {
        const U = CFG_CUR.upgrade;
        if (!p || p.t === "k" || p.lv >= maxLv(p.t)) return null;
        const base = baseCostOf(p);
        return Math.max(U.minCost, base - (p.xp || 0) * U.killDiscount);
    };
    function addMerit(S, s, n, ev, why) {
        if (!n) return;
        const before = S.merit[s];
        S.merit[s] = Math.min(CFG_CUR.merit.cap, S.merit[s] + n);
        if (ev && S.merit[s] !== before) ev.push({
            e: "merit",
            s: s,
            n: S.merit[s] - before,
            why: why
        });
    }
    let CFG_CUR = CFG;
    function kill(S, f, r, killerSide, ev, how, by) {
        const v = S.board[r][f];
        if (!v) return null;
        S.board[r][f] = null;
        S.dead[v.s].push({
            id: v.id,
            t: v.t,
            s: v.s,
            lv: v.lv
        });
        const m = CFG_CUR.merit, friendly = v.s === killerSide, gain = friendly ? 0 : (m.killReward[v.t] || 0) + (v.lv - 1) * m.killRewardPerLevel;
        ev.push({
            e: "kill",
            id: v.id,
            t: v.t,
            s: v.s,
            lv: v.lv,
            at: [ f, r ],
            how: how,
            by: by ? by.id : null,
            gain: gain,
            friendly: friendly
        });
        if (friendly) return v;
        addMerit(S, killerSide, gain, ev, "击杀");
        addMerit(S, v.s, m.lostPieceCompensation, ev, "哀兵");
        if (by && by.s === killerSide && by.t !== "k") {
            by.xp = (by.xp || 0) + 1;
            by.kills = (by.kills || 0) + 1;
            ev.push({
                e: "xp",
                id: by.id,
                xp: by.xp
            });
            const U = CFG_CUR.upgrade;
            if (U.autoByPlates && by.hp > 0 && by.lv < maxLv(by.t) && by.xp * U.killDiscount >= baseCostOf(by)) {
                const used = by.xp;
                by.xp = 0;
                promote(S, by);
                ev.push({
                    e: "autoup",
                    id: by.id,
                    s: by.s,
                    t: by.t,
                    lv: by.lv,
                    hp: by.hp,
                    usedXp: used,
                    nm: by.nm
                });
            }
        }
        return v;
    }
    function damage(S, f, r, n, killerSide, ev, how, by) {
        const v = S.board[r][f];
        if (!v || v.t === "k") return;
        v.hp -= n;
        if (v.hp <= 0) kill(S, f, r, killerSide, ev, how, by); else ev.push({
            e: "hit",
            id: v.id,
            at: [ f, r ],
            hp: v.hp,
            how: how
        });
    }
    function moveTo(S, from, to, ev) {
        const p = S.board[from[1]][from[0]];
        S.board[to[1]][to[0]] = p;
        S.board[from[1]][from[0]] = null;
        ev.push({
            e: "move",
            id: p.id,
            from: from.slice(),
            to: to.slice()
        });
        if (p.t === "p" && !ownHalf(p.s, to[1]) && !S.crossed[p.id]) {
            S.crossed[p.id] = 1;
            addMerit(S, p.s, CFG_CUR.merit.pawnCrossRiverReward, ev, "过河");
        }
    }
    function strike(S, from, to, side, ev, how) {
        const P = S.board[from[1]][from[0]], T = S.board[to[1]][to[0]];
        if (!T) {
            moveTo(S, from, to, ev);
            return "move";
        }
        if (jmActive(S, T) && jmHits(P) && T.s !== P.s) {
            ev.push({
                e: "counter",
                id: P.id,
                at: from.slice(),
                by: T.id,
                target: to.slice()
            });
            P.hp -= CFG_CUR.skills.juma.damage;
            if (P.hp <= 0) {
                kill(S, from[0], from[1], T.s, ev, "juma", T);
                return "died";
            }
        }
        const A = atk(P);
        if (T.hp <= A) {
            kill(S, to[0], to[1], side, ev, how || "capture", P);
            moveTo(S, from, to, ev);
            return "kill";
        }
        T.hp -= A;
        ev.push({
            e: "hit",
            id: T.id,
            at: to.slice(),
            hp: T.hp,
            how: how || "attack"
        });
        ev.push({
            e: "repel",
            id: P.id,
            from: from.slice(),
            to: to.slice()
        });
        return "hit";
    }
    function splash(S, c, side, ev, how, by) {
        const minLv = CFG_CUR.skills[how].splashMinLevel, n = CFG_CUR.skills[how].splashDamage;
        ev.push({
            e: "splash",
            how: how,
            at: c.slice()
        });
        const K = CFG_CUR.skills[how];
        for (const [df, dr] of K.ring8 ? RING8 : ORTHO) {
            const f = c[0] + df, r = c[1] + dr, q = at(S, f, r);
            if (!q || q.s === side || q.t === "k") continue;
            if (q.lv >= minLv) damage(S, f, r, n, side, ev, how, by);
        }
    }
    function trample(S, P, to, res, side, ev) {
        if (!P || SKILL_OF(P.t, P.s) !== "jianta" || P.lv < skLevel("jianta")) return;
        if (side === "b" && smActive(S)) return;
        const c = to;
        if (res !== "kill" && res !== "hit") return;
        if (c && P.hp > 0) splash(S, c, side, ev, "jianta", P);
    }
    function moveTargets(S, f, r, ignoreLeg = false) {
        const p = at(S, f, r);
        if (!p) return [];
        let ms;
        if (ignoreLeg && p.t === "n") {
            ms = [];
            for (const [df, dr] of [ [ 1, 2 ], [ -1, 2 ], [ 1, -2 ], [ -1, -2 ], [ 2, 1 ], [ 2, -1 ], [ -2, 1 ], [ -2, -1 ] ]) {
                const tf = f + df, tr = r + dr;
                if (!inBoard(tf, tr)) continue;
                const q = S.board[tr][tf];
                if (q && q.s === p.s) continue;
                ms.push({
                    from: [ f, r ],
                    to: [ tf, tr ]
                });
            }
        } else if (ignoreLeg && p.t === "e") {
            ms = [];
            for (const [df, dr] of [ [ 2, 2 ], [ 2, -2 ], [ -2, 2 ], [ -2, -2 ] ]) {
                const tf = f + df, tr = r + dr;
                if (!inBoard(tf, tr) || !p.j && !ownHalf(p.s, tr)) continue;
                const q = S.board[tr][tf];
                if (q && q.s === p.s) continue;
                ms.push({
                    from: [ f, r ],
                    to: [ tf, tr ]
                });
            }
        } else ms = pseudoMoves(S.board, f, r);
        const seen = new Set(ms.map(m => m.to[0] + "," + m.to[1]));
        const extra = (sk, tf, tr, emptyOnly) => {
            if (!inBoard(tf, tr) || !hasSkill(p, sk) || !cdReady(S, p, sk) || seen.has(tf + "," + tr)) return;
            const q = S.board[tr][tf];
            if (q && (q.s === p.s || emptyOnly)) return;
            seen.add(tf + "," + tr);
            ms.push({
                from: [ f, r ],
                to: [ tf, tr ],
                via: sk
            });
        };
        if (!ignoreLeg && p.t === "n" && hasSkill(p, "taying") && cdReady(S, p, "taying") && !(CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r))) for (const [df, dr] of [ [ 1, 2 ], [ -1, 2 ], [ 1, -2 ], [ -1, -2 ], [ 2, 1 ], [ 2, -1 ], [ -2, 1 ], [ -2, -1 ] ]) {
            const lf = Math.abs(df) === 2 ? f + Math.sign(df) : f, lr = Math.abs(dr) === 2 ? r + Math.sign(dr) : r;
            if (inBoard(lf, lr) && S.board[lr][lf]) extra("taying", f + df, r + dr);
        }
        if (!ignoreLeg && p.t === "e" && hasSkill(p, "feiyue") && cdReady(S, p, "feiyue")) for (const [df, dr] of [ [ 2, 2 ], [ 2, -2 ], [ -2, 2 ], [ -2, -2 ] ]) if (p.j || ownHalf(p.s, r + dr)) extra("feiyue", f + df, r + dr);
        if (!ignoreLeg && p.t === "p") {
            extra("huifang", f, r + (p.s === "r" ? -1 : 1));
            if (hasSkill(p, "shensu") && cdReady(S, p, "shensu")) for (const m of dashTargets(S, f, r)) extra("shensu", m.to[0], m.to[1], true);
        }
        if (!ignoreLeg && p.t === "a" && (p.j || inPalace(p.s, f, r))) for (const [df, dr] of ORTHO) if (p.j || inPalace(p.s, f + df, r + dr)) extra("jinwei", f + df, r + dr);
        const sm = p.s === "b" && p.t !== "k" && smActive(S), ck = sm ? checkers(S.board, "r") : null;
        return ms.filter(m => {
            const q = S.board[m.to[1]][m.to[0]];
            if (q && q.t === "k" && !S.final) return false;
            if (p.s === "r" && p.t === "k" && hmActive(S)) return false;
            if (sm && (!q || !ck.includes(q.id))) return false;
            return true;
        });
    }
    function cannonShots(S, f, r) {
        return pseudoMoves(S.board, f, r).filter(m => {
            const q = S.board[m.to[1]][m.to[0]];
            return q && q.s !== S.board[r][f].s && q.t !== "k";
        });
    }
    function arrowTargets(S, f, r) {
        const p = at(S, f, r), out = [];
        for (const [df, dr] of [ [ 1, 1 ], [ 1, -1 ], [ -1, 1 ], [ -1, -1 ] ]) {
            for (let k = 1; k <= CFG_CUR.skills.qishe.range; k++) {
                const tf = f + df * k, tr = r + dr * k;
                if (!inBoard(tf, tr)) break;
                const q = S.board[tr][tf];
                if (q) {
                    if (q.s !== p.s && q.t !== "k") out.push({
                        from: [ f, r ],
                        to: [ tf, tr ]
                    });
                    break;
                }
            }
        }
        return out;
    }
    function springTargets(S, f, r) {
        const out = [];
        for (const [df, dr] of ORTHO) {
            let tf = f + df, tr = r + dr;
            while (inBoard(tf, tr) && !S.board[tr][tf]) {
                tf += df;
                tr += dr;
            }
            if (!inBoard(tf, tr)) continue;
            const q = S.board[tr][tf];
            if (q.t === "k") continue;
            const lf = tf + df, lr = tr + dr;
            if (!inBoard(lf, lr)) continue;
            const lp = S.board[lr][lf];
            if (lp && lp.t === "k") continue;
            out.push({
                from: [ f, r ],
                to: [ tf, tr ],
                land: [ lf, lr ]
            });
        }
        return out;
    }
    function dashTargets(S, f, r) {
        const out = [], R = CFG_CUR.skills.shensu.range;
        for (const [df, dr] of [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ], [ 1, 1 ], [ 1, -1 ], [ -1, 1 ], [ -1, -1 ] ]) for (let k = 1; k <= R; k++) {
            const tf = f + df * k, tr = r + dr * k;
            if (inBoard(tf, tr) && !S.board[tr][tf]) out.push({
                from: [ f, r ],
                to: [ tf, tr ]
            });
        }
        return out;
    }
    const findMove = (S, from, to) => moveTargets(S, from[0], from[1]).find(m => m.to[0] === to[0] && m.to[1] === to[1]) || null;
    function bsFinish(S, BS, ids, ev, ev00) {
        if (BS && ev.slice(ev00).filter(e => e.e === "kill" && !e.friendly && e.s === "r").length > BS.maxKills) return false;
        if ((BS || !CFG_CUR.generalArts.pofu.mayEndInCheck) && inCheckF(S, "r")) return false;
        S.fx.pf = S.cnt.b + 1 + (BS ? 0 : CFG_CUR.generalArts.pofu.skillLockRounds);
        if (BS) for (const row of S.board) for (const q of row) if (q && q.s === "b" && ids.includes(q.id)) q.bz = S.cnt.b + 1 + BS.freeze;
        return true;
    }
    function resolve(S, a) {
        const side = S.turn, ev = [];
        const own = (f, r) => {
            const p = at(S, f, r);
            return p && p.s === side ? p : null;
        };
        const has = (list, to) => list.some(m => m.to[0] === to[0] && m.to[1] === to[1]);
        let kind = a.k, extra = {};
        if (S.freeUsed && a.k !== "mv") return null;
        if (a.k === "mv") {
            const p = own(a.from[0], a.from[1]);
            if (!p) return null;
            if (S.jmLock != null && p.id === S.jmLock) return null;
            if (jmRooted(S, p)) return null;
            const fz = frozen(S, p);
            if (fz) {
                const q = at(S, a.to[0], a.to[1]), strict = CFG_CUR.beishui && CFG_CUR.beishui.strictEscape;
                if (!(inCheckF(S, side) && q && q.s !== side && (!strict || checkers(S.board, other(side)).includes(q.id)))) return null;
            }
            const m = findMove(S, a.from, a.to);
            if (!m) return null;
            extra.res = strike(S, a.from, a.to, side, ev);
            if (fz && CFG_CUR.beishui && CFG_CUR.beishui.strictEscape && extra.res !== "kill") return null;
            if (m.via) {
                setCd(S, p, m.via);
                extra.via = m.via;
                ev.push({
                    e: "passive",
                    sk: m.via,
                    id: p.id
                });
            }
            trample(S, p, a.to, extra.res, side, ev);
        } else if (a.k === "sk") {
            const p = own(a.at[0], a.at[1]);
            if (!p) return null;
            const sk = a.sk || SKILL_OF(p.t, p.s);
            const legacyFy = (sk === "feiyue" || sk === "taying") && isPassive(sk) && hasSkill(p, sk) && cdReady(S, p, sk) && !S.freeUsed;
            if (!sk || !(skillOk(S, p, sk) || legacyFy)) return null;
            if (frozen(S, p) && sk !== "juma" && sk !== "qishe") return null;
            extra.sk = sk;
            const cd = () => {
                const q = S.board.flat().find(x => x && x.id === p.id);
                if (q) setCd(S, q, sk);
            };
            if (sk === "juma") {
                p.jm = S.cnt[other(side)] + CFG_CUR.skills.juma.duration;
                ev.push({
                    e: "juma",
                    id: p.id,
                    at: a.at.slice()
                });
                if (CFG_CUR.skills.juma.free) {
                    cd();
                    S.freeUsed = true;
                    S.jmLock = p.id;
                    return {
                        kind: kind,
                        ev: ev,
                        extra: extra,
                        free: true
                    };
                }
            } else if (sk === "chongzhen") {
                const t = a.to && springTargets(S, a.at[0], a.at[1]).find(m => m.to[0] === a.to[0] && m.to[1] === a.to[1]);
                if (!t) return null;
                const q = S.board[a.to[1]][a.to[0]];
                extra.land = t.land.slice();
                let dead = false;
                if (q.s !== side && jmActive(S, q)) {
                    ev.push({
                        e: "counter",
                        id: p.id,
                        at: a.at.slice(),
                        by: q.id,
                        target: a.to.slice()
                    });
                    p.hp -= CFG_CUR.skills.juma.damage;
                    if (p.hp <= 0) {
                        kill(S, a.at[0], a.at[1], q.s, ev, "juma", q);
                        dead = true;
                        extra.res = "died";
                    }
                }
                if (!dead) {
                    damage(S, a.to[0], a.to[1], CFG_CUR.skills.chongzhen.springDamage, side, ev, "chongzhen", p);
                    extra.spring = {
                        at: a.to.slice(),
                        killed: !S.board[a.to[1]][a.to[0]]
                    };
                    extra.res = strike(S, a.at, t.land, side, ev, "chongzhen");
                }
            } else if (sk === "taying") {
                if (CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(side, a.at[1])) return null;
                if (!a.to || !has(moveTargets(S, a.at[0], a.at[1], true), a.to)) return null;
                extra.res = strike(S, a.at, a.to, side, ev, "taying");
            } else if (sk === "feiyue") {
                if (!a.to || !has(moveTargets(S, a.at[0], a.at[1], true), a.to)) return null;
                extra.res = strike(S, a.at, a.to, side, ev, "feiyue");
                trample(S, p, a.to, extra.res, side, ev);
            } else if (sk === "pili") {
                if (!a.to || !has(cannonShots(S, a.at[0], a.at[1]), a.to)) return null;
                if (p.s === "b" && smActive(S)) return null;
                const res = strike(S, a.at, a.to, side, ev, "pili");
                extra.res = res;
                if (res !== "died") splash(S, a.to, side, ev, "pili", p);
            } else if (sk === "qishe") {
                if (!a.to || !has(arrowTargets(S, a.at[0], a.at[1]), a.to)) return null;
                damage(S, a.to[0], a.to[1], CFG_CUR.skills.qishe.damage, side, ev, "qishe", p);
            } else if (sk === "hujia") {
                const k = findKing(S.board, side);
                if (!k) return null;
                const K = S.board[k[1]][k[0]];
                if (frozen(S, K)) return null;
                S.board[k[1]][k[0]] = p;
                S.board[a.at[1]][a.at[0]] = K;
                ev.push({
                    e: "swap",
                    a: p.id,
                    b: K.id,
                    pa: a.at.slice(),
                    pb: k.slice()
                });
                if (side === "r" && hmActive(S)) {
                    S.fx.hm = S.cnt.r;
                    extra.rescue = true;
                    ev.push({
                        e: "rescue",
                        id: p.id,
                        at: k.slice()
                    });
                }
            } else return null;
            cd();
        } else if (a.k === "art") {
            if (!artOpen(S) || S.used.art[side] >= CFG_CUR.generalArts[side === "r" ? "xiaohe" : "pofu"].usesPerGame) return null;
            if (side === "b" && smActive(S)) return null;
            if (side === "r") {
                const i = S.dead.r.findIndex(d => d.id === a.id);
                if (i < 0) return null;
                const d = S.dead.r[i], R = R6(), own = START[d.id];
                const st = a.at ? (START_R[d.t] || []).find(q => q[0] === a.at[0] && q[1] === a.at[1]) : own;
                if (!st || at(S, st[0], st[1])) return null;
                if (own && (st[0] !== own[0] || st[1] !== own[1]) && !(R && R.revivePlace)) return null;
                const lvDead = R && R.reviveBest ? bestDeadLv(S, d.t) : d.lv || 1;
                S.dead.r.splice(i, 1);
                const top = R ? Math.max(1, Math.min(maxLv(d.t), R.reviveLevel || 1)) : 1, rlv = R && R.reviveCap ? Math.max(1, Math.min(top, lvDead)) : top;
                const pr = S.board[st[1]][st[0]] = {
                    s: "r",
                    t: d.t,
                    id: d.id,
                    lv: rlv,
                    hp: hpOf(d.t, rlv),
                    cd: 0,
                    jm: 0,
                    xp: 0,
                    kills: 0,
                    rv: S.cnt.r + 1
                };
                if (R && R.reviveHalf) pr.rh = 1;
                ev.push({
                    e: "revive",
                    id: d.id,
                    t: d.t,
                    at: st.slice(),
                    lv: rlv
                });
                if (a.up) {
                    const c = upCost(pr);
                    if (!R || !R.reviveUp || S.upgraded || c == null || S.merit.r < c) return null;
                    S.merit.r -= c;
                    promote(S, pr);
                    pr.xp = 0;
                    S.upgraded = true;
                    ev.push({
                        e: "reviveUp",
                        id: d.id,
                        t: d.t,
                        lv: pr.lv,
                        hp: pr.hp,
                        cost: c,
                        nm: pr.nm
                    });
                }
            } else {
                const steps = a.steps || [];
                if (steps.length !== CFG_CUR.generalArts.pofu.steps) return null;
                extra.steps = [];
                const BS = BSon(), ids = [], ev00 = ev.length;
                for (const m of steps) {
                    const p = own(m.from[0], m.from[1]);
                    if (!p) return null;
                    if (BS && BS.twoPieces && ids.includes(p.id)) return null;
                    ids.push(p.id);
                    const mm = findMove(S, m.from, m.to);
                    if (!mm) return null;
                    const n0 = ev.length;
                    const res = strike(S, m.from, m.to, side, ev);
                    if (mm.via) {
                        setCd(S, p, mm.via);
                        ev.push({
                            e: "passive",
                            sk: mm.via,
                            id: p.id
                        });
                    }
                    trample(S, p, m.to, res, side, ev);
                    extra.steps.push({
                        from: m.from,
                        to: m.to,
                        res: res,
                        ev0: n0,
                        ev1: ev.length
                    });
                    if (!BS && inCheckF(S, side)) return null;
                }
                if (!bsFinish(S, BS, ids, ev, ev00)) return null;
            }
            S.used.art[side]++;
        } else if (a.k === "ult") {
            const U = CFG_CUR.ultimates;
            if (S.merit[side] < U.cost || S.used.ult[side] >= U[side === "r" ? "simian" : "hongmen"].usesPerGame) return null;
            if (side === "b" && smActive(S)) return null;
            if (side === "r") {
                const k = findKing(S.board, "b");
                if (!k) return null;
                if (simianCount(S) < U.simian.minPiecesInRadius) return null;
                S.fx.sm = S.cnt.b + U.simian.rounds;
            } else S.fx.hm = S.cnt.r + U.hongmen.rounds;
            S.merit[side] -= U.cost;
            S.used.ult[side]++;
            ev.push({
                e: "ult",
                s: side
            });
        } else if (a.k === "pass") {
            if (side === "b" && smActive(S)) {
                if (inCheckF(S, "b")) return null;
            } else if (!restricted(S, side) || legalMoves(S, side, true).length) return null;
        } else return null;
        if (inCheckS(S, side)) return null;
        return {
            kind: kind,
            ev: ev,
            extra: extra
        };
    }
    function simianCount(S) {
        const k = findKing(S.board, "b"), R = CFG_CUR.ultimates.simian.radius;
        if (!k) return 0;
        let n = 0;
        for (let r = k[1] - R; r <= k[1] + R; r++) for (let f = k[0] - R; f <= k[0] + R; f++) {
            const p = at(S, f, r);
            if (p && p.s === "r") n++;
        }
        return n;
    }
    const posOf = (S, id) => {
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (p && p.id === id) return [ f, r ];
        }
        return null;
    };
    const ATTACKERS = "rncp";
    function syncFinal(S, ev) {
        if (!S.final) {
            for (const row of S.board) for (const p of row) if (p && ATTACKERS.includes(p.t)) return;
            S.final = true;
            if (ev) ev.push({
                e: "final"
            });
        }
        for (const row of S.board) for (const p of row) if (p) {
            if (p.t === "k") {
                if (!p.w) {
                    p.w = 1;
                    p.hp = CFG_CUR.finalKingHp;
                }
            } else if (p.t === "a" || p.t === "e") p.j = 1;
        }
    }
    function settle(S, side, ev) {
        const opp = other(side);
        syncFinal(S, ev);
        if (S.final) {
            if (!S.occ) S.occ = {
                r: 0,
                b: 0
            };
            for (const s of [ "r", "b" ]) {
                const k = findKing(S.board, s), inside = k && inPalace(other(s), k[0], k[1]);
                if (!inside) S.occ[s] = 0; else if (s !== side) {
                    S.occ[s]++;
                    ev.push({
                        e: "occupy",
                        s: s,
                        n: S.occ[s]
                    });
                }
            }
        }
        const ck = S.final || side === "b" && smActive(S) ? [] : checkers(S.board, side);
        S.ckHist[side].push(ck);
        S.cnt[side]++;
        if (inCheckS(S, opp)) {
            addMerit(S, side, CFG_CUR.merit.checkReward, ev, "将军");
            ev.push({
                e: "check",
                s: opp
            });
        }
        S.upgraded = false;
        S.freeUsed = false;
        S.jmLock = null;
        S.turn = opp;
        const M = CFG_CUR.merit, rd = round(S);
        if (side === "b" && rd >= M.autoIncomeFromRound) {
            const p3 = M.phase3FromRound && rd >= M.phase3FromRound, per = p3 ? M.phase3PerRound : M.autoIncomePerRound;
            if (rd === M.autoIncomeFromRound) ev.push({
                e: "phase",
                n: 2,
                round: rd,
                per: M.autoIncomePerRound
            });
            if (M.phase3FromRound && rd === M.phase3FromRound) ev.push({
                e: "phase",
                n: 3,
                round: rd,
                per: M.phase3PerRound
            });
            addMerit(S, "r", per, ev, "回合");
            addMerit(S, "b", per, ev, "回合");
        }
    }
    function attempt(S, a) {
        const T = cloneState(S);
        const r = resolve(T, a);
        if (!r) return null;
        if (r.free) {
            if (!legalMoves(T, T.turn).length) return null;
            return {
                S: T,
                ...r
            };
        }
        const lim = CFG_CUR.longCheckLimit, side = S.turn;
        if (lim) {
            const hist = S.ckHist[side];
            if (hist.length >= lim) {
                const ck = side === "b" && smActive(T) ? [] : checkers(T.board, side);
                const last = hist.slice(-lim);
                if (ck.some(id => last.every(h => h.includes(id)))) return null;
            }
        }
        settle(T, side, r.ev);
        return {
            S: T,
            ...r
        };
    }
    function legalMoves(S, side, normalOnly = false) {
        const out = [];
        const Sx = S.turn === side ? S : {
            ...cloneState(S),
            turn: side
        };
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = Sx.board[r][f];
            if (!p || p.s !== side) continue;
            for (const m of moveTargets(Sx, f, r)) {
                const a = {
                    k: "mv",
                    from: m.from,
                    to: m.to
                };
                if (attempt(Sx, a)) out.push(a);
            }
        }
        return out;
    }
    function skillActions(S, f, r, only) {
        const p = at(S, f, r);
        if (!p || p.s !== S.turn) return [];
        const out = [], main = SKILL_OF(p.t, p.s);
        for (const sk of SKILLS_OF(p.t, p.s)) {
            if (only && sk !== only || !skillOk(S, p, sk)) continue;
            const tg = sk === "chongzhen" ? springTargets(S, f, r) : sk === "taying" ? CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r) ? [] : moveTargets(S, f, r, true) : sk === "feiyue" ? moveTargets(S, f, r, true) : sk === "pili" ? cannonShots(S, f, r) : sk === "qishe" ? arrowTargets(S, f, r) : null;
            const mk = to => {
                const a = {
                    k: "sk",
                    at: [ f, r ]
                };
                if (to) a.to = to;
                if (sk !== main) a.sk = sk;
                return a;
            };
            if (tg) {
                for (const m of tg) {
                    const a = mk(m.to);
                    if (attempt(S, a)) out.push(a);
                }
            } else {
                const a = mk(null);
                if (attempt(S, a)) out.push(a);
            }
        }
        return out;
    }
    function expand(S) {
        const out = [], side = S.turn;
        const push = a => {
            const r = attempt(S, a);
            if (r && !r.free) out.push({
                a: a,
                S: r.S,
                ev: r.ev
            });
        };
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== side) continue;
            for (const m of moveTargets(S, f, r)) push({
                k: "mv",
                from: m.from,
                to: m.to
            });
            if (p.t === "k" || p.lv < 3 || S.freeUsed) continue;
            const main = SKILL_OF(p.t, p.s);
            for (const sk of SKILLS_OF(p.t, p.s)) {
                if (sk === "juma" || !skillOk(S, p, sk)) continue;
                const tg = sk === "chongzhen" ? springTargets(S, f, r) : sk === "taying" ? CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r) ? [] : moveTargets(S, f, r, true) : sk === "feiyue" ? moveTargets(S, f, r, true) : sk === "pili" ? cannonShots(S, f, r) : sk === "qishe" ? arrowTargets(S, f, r) : null;
                const mk = to => {
                    const a = {
                        k: "sk",
                        at: [ f, r ]
                    };
                    if (to) a.to = to;
                    if (sk !== main) a.sk = sk;
                    return a;
                };
                if (tg) for (const m of tg) push(mk(m.to)); else push(mk(null));
            }
        }
        if (!S.freeUsed) {
            if (side === "r" && artOpen(S) && S.used.art.r < CFG_CUR.generalArts.xiaohe.usesPerGame) {
                const up = R6() && R6().reviveUp;
                for (const {t: t, ...a} of reviveActs(S)) {
                    push(a);
                    if (up) push({
                        ...a,
                        up: true
                    });
                }
            }
            const U = CFG_CUR.ultimates;
            if (S.merit[side] >= U.cost && S.used.ult[side] < U[side === "r" ? "simian" : "hongmen"].usesPerGame) push({
                k: "ult"
            });
        }
        if (!out.length) push({
            k: "pass"
        });
        return out;
    }
    function gen(S, capsOnly) {
        const out = [], side = S.turn, b = S.board;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = b[r][f];
            if (!p || p.s !== side) continue;
            for (const m of moveTargets(S, f, r)) {
                const q = b[m.to[1]][m.to[0]];
                if (capsOnly && !q) continue;
                out.push({
                    a: {
                        k: "mv",
                        from: m.from,
                        to: m.to
                    },
                    p: p,
                    q: q || null
                });
            }
            if (p.t === "k" || p.lv < 3 || S.freeUsed) continue;
            const main = SKILL_OF(p.t, p.s);
            for (const sk of SKILLS_OF(p.t, p.s)) {
                if (sk === "juma" || !skillOk(S, p, sk)) continue;
                if (capsOnly && sk === "hujia") continue;
                const tg = sk === "chongzhen" ? springTargets(S, f, r) : sk === "taying" ? CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r) ? [] : moveTargets(S, f, r, true) : sk === "feiyue" ? moveTargets(S, f, r, true) : sk === "pili" ? cannonShots(S, f, r) : sk === "qishe" ? arrowTargets(S, f, r) : null;
                const mk = to => {
                    const a = {
                        k: "sk",
                        at: [ f, r ]
                    };
                    if (to) a.to = to;
                    if (sk !== main) a.sk = sk;
                    return a;
                };
                if (tg) for (const m of tg) {
                    const q = b[m.to[1]][m.to[0]];
                    if (capsOnly && !(q && q.s !== side)) continue;
                    out.push({
                        a: mk(m.to),
                        p: p,
                        q: q && q.s !== side ? q : null,
                        sk: sk
                    });
                } else out.push({
                    a: mk(null),
                    p: p,
                    q: null,
                    sk: sk
                });
            }
        }
        if (!capsOnly && !S.freeUsed) {
            if (side === "r" && artOpen(S) && S.used.art.r < CFG_CUR.generalArts.xiaohe.usesPerGame) {
                const up = R6() && R6().reviveUp && !S.upgraded;
                for (const {t: t, ...a} of reviveActs(S)) {
                    out.push({
                        a: a,
                        p: null,
                        q: null,
                        art: t
                    });
                    if (up) out.push({
                        a: {
                            ...a,
                            up: true
                        },
                        p: null,
                        q: null,
                        art: t
                    });
                }
            }
            const U = CFG_CUR.ultimates;
            if (S.merit[side] >= U.cost && S.used.ult[side] < U[side === "r" ? "simian" : "hongmen"].usesPerGame) out.push({
                a: {
                    k: "ult"
                },
                p: null,
                q: null,
                ult: true
            });
        }
        return out;
    }
    function jumaState(S, at_) {
        const r = attempt(S, {
            k: "sk",
            at: at_
        });
        return r && r.free ? r.S : null;
    }
    function upgradeState(S, at_) {
        const p0 = at(S, at_[0], at_[1]);
        if (!p0 || p0.s !== S.turn || p0.t === "k" || p0.lv >= maxLv(p0.t) || S.upgraded || S.merit[p0.s] < upCost(p0)) return null;
        const T = cloneState(S), p = T.board[at_[1]][at_[0]];
        T.merit[p.s] -= upCost(p);
        promote(T, p);
        p.xp = 0;
        T.upgraded = true;
        return T;
    }
    function pofuPairs(S, only, keep) {
        if (S.turn !== "b" || S.freeUsed || !artOpen(S) || S.used.art.b >= CFG_CUR.generalArts.pofu.usesPerGame || smActive(S)) return [];
        const out = [], side = "b", lim = CFG_CUR.longCheckLimit, hist = S.ckHist[side];
        const BS = BSon(), bsDef = !!BS && inCheckF(S, "b");
        const step = (T, m, ev) => {
            const p = T.board[m.from[1]][m.from[0]];
            const res = strike(T, m.from, m.to, side, ev);
            if (m.via) {
                setCd(T, p, m.via);
                ev.push({
                    e: "passive",
                    sk: m.via,
                    id: p.id
                });
            }
            trample(T, p, m.to, res, side, ev);
            return !!BS || !inCheckF(T, side);
        };
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== "b") continue;
            const mine1 = only == null || p.id === only;
            for (const m1 of moveTargets(S, f, r)) {
                const t1 = at(S, m1.to[0], m1.to[1]), hit1 = !!t1;
                const T = cloneState(S), ev1 = [];
                if (!step(T, m1, ev1)) continue;
                for (let r2 = 0; r2 < 10; r2++) for (let f2 = 0; f2 < 9; f2++) {
                    const q = T.board[r2][f2];
                    if (!q || q.s !== "b") continue;
                    if (!mine1 && q.id !== only) continue;
                    if (BS && BS.twoPieces && q.id === p.id) continue;
                    for (const m2 of moveTargets(T, f2, r2)) {
                        const t2 = at(T, m2.to[0], m2.to[1]);
                        if (!hit1 && !t2 && !bsDef) continue;
                        if (keep && !keep(m1, t1, m2, t2)) continue;
                        const U = cloneState(T), ev = ev1.slice();
                        if (!step(U, m2, ev)) continue;
                        if (!bsFinish(U, BS, [ p.id, q.id ], ev, 0)) continue;
                        U.used.art[side]++;
                        if (inCheckS(U, side)) continue;
                        if (lim && hist.length >= lim) {
                            const ck = smActive(U) ? [] : checkers(U.board, side), last = hist.slice(-lim);
                            if (ck.some(id => last.every(h => h.includes(id)))) continue;
                        }
                        settle(U, side, ev);
                        out.push({
                            a: {
                                k: "art",
                                steps: [ {
                                    from: m1.from,
                                    to: m1.to
                                }, {
                                    from: m2.from,
                                    to: m2.to
                                } ]
                            },
                            S: U,
                            ev: ev
                        });
                    }
                }
            }
        }
        return out;
    }
    function pofuPairsRef(S, only, keep) {
        if (S.turn !== "b" || S.freeUsed || !artOpen(S) || S.used.art.b >= CFG_CUR.generalArts.pofu.usesPerGame || smActive(S)) return [];
        const out = [];
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== "b") continue;
            const mine1 = only == null || p.id === only;
            for (const m1 of moveTargets(S, f, r)) {
                const t1 = at(S, m1.to[0], m1.to[1]), hit1 = !!t1;
                const T = cloneState(S), ev = [];
                strike(T, m1.from, m1.to, "b", ev);
                if (!T.final && inCheck(T.board, "b") && !BSon()) continue;
                for (let r2 = 0; r2 < 10; r2++) for (let f2 = 0; f2 < 9; f2++) {
                    const q = T.board[r2][f2];
                    if (!q || q.s !== "b") continue;
                    if (!mine1 && q.id !== only) continue;
                    for (const m2 of moveTargets(T, f2, r2)) {
                        const t2 = at(T, m2.to[0], m2.to[1]);
                        if (!hit1 && !t2 && !(BSon() && inCheckF(S, "b"))) continue;
                        if (keep && !keep(m1, t1, m2, t2)) continue;
                        const a = {
                            k: "art",
                            steps: [ {
                                from: m1.from,
                                to: m1.to
                            }, {
                                from: m2.from,
                                to: m2.to
                            } ]
                        };
                        const res = attempt(S, a);
                        if (res) out.push({
                            a: a,
                            S: res.S,
                            ev: res.ev
                        });
                    }
                }
            }
        }
        return out;
    }
    function reviveOptions(S) {
        if (S.turn !== "r" || S.freeUsed || !artOpen(S) || S.used.art.r >= CFG_CUR.generalArts.xiaohe.usesPerGame) return [];
        const seen = new Set, out = [];
        const R = R6(), by = new Map;
        for (const {t: t, ...a} of reviveActs(S)) {
            const T = attempt(S, a);
            if (!T) continue;
            const st = a.at || START[a.id], key = R && R.revivePlace ? t : a.id;
            let o = by.get(key);
            if (!o) {
                const pr = T.S.board[st[1]][st[0]];
                o = {
                    k: "art",
                    id: a.id,
                    t: t,
                    at: st,
                    squares: [],
                    lv: pr ? pr.lv : 1
                };
                if (R && R.reviveUp && pr) {
                    const c = upCost(pr);
                    if (c != null) {
                        o.upCost = c;
                        o.upLv = pr.lv + 1;
                        o.canUp = !!attempt(S, {
                            ...a,
                            up: true
                        });
                    }
                }
                by.set(key, o);
                out.push(o);
            }
            o.squares.push(st);
        }
        return out;
    }
    function pofuFirst(S) {
        if (S.turn !== "b" || S.freeUsed || !artOpen(S) || S.used.art.b >= CFG_CUR.generalArts.pofu.usesPerGame || smActive(S)) return [];
        const out = [];
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== "b") continue;
            for (const m of moveTargets(S, f, r)) if (pofuSecond(S, m, true).length) out.push(m);
        }
        return out;
    }
    function pofuSecond(S, m1, any = false) {
        const T = cloneState(S), ev = [];
        if (!at(T, m1.from[0], m1.from[1])) return [];
        strike(T, m1.from, m1.to, "b", ev);
        if (!T.final && inCheck(T.board, "b") && !BSon()) return [];
        const out = [];
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = T.board[r][f];
            if (!p || p.s !== "b") continue;
            for (const m2 of moveTargets(T, f, r)) {
                if (attempt(S, {
                    k: "art",
                    steps: [ {
                        from: m1.from,
                        to: m1.to
                    }, {
                        from: m2.from,
                        to: m2.to
                    } ]
                })) {
                    out.push(m2);
                    if (any) return out;
                }
            }
        }
        return out;
    }
    function ultReady(S) {
        const side = S.turn, U = CFG_CUR.ultimates;
        if (S.freeUsed) return false;
        if (S.merit[side] < U.cost || S.used.ult[side] >= U[side === "r" ? "simian" : "hongmen"].usesPerGame) return false;
        return !!attempt(S, {
            k: "ult"
        });
    }
    function hasAnyAction(S, noUp) {
        if (legalMoves(S, S.turn).length) return true;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (p && p.s === S.turn && skillActions(S, f, r).length) return true;
        }
        if (reviveOptions(S).length || pofuFirst(S).length || ultReady(S)) return true;
        return !noUp && upEscape(S);
    }
    function upEscape(S) {
        if (S.upgraded) return false;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== S.turn || p.t === "k") continue;
            const T = upgradeState(S, [ f, r ]);
            if (T && hasAnyAction(T, true)) return true;
        }
        return false;
    }
    function plainMoves(S) {
        return legalMoves(S, S.turn).filter(a => {
            const q = at(S, a.to[0], a.to[1]);
            return !q || q.hp <= atk(at(S, a.from[0], a.from[1]));
        });
    }
    function evaluate(S) {
        const side = S.turn, opp = other(side);
        if (S.final) for (const s of [ "r", "b" ]) if (!findKing(S.board, s)) return {
            result: {
                winner: other(s),
                loser: s,
                reason: "kingdead"
            }
        };
        if (S.final && S.occ) for (const s of [ opp, side ]) if (S.occ[s] >= CFG_CUR.finalOccupyRounds) return {
            result: {
                winner: s,
                loser: other(s),
                reason: "occupy"
            }
        };
        if (inCheckS(S, side)) {
            if (!hasAnyAction(S, true)) return upEscape(S) ? {
                check: true,
                upOnly: true
            } : {
                result: {
                    winner: opp,
                    loser: side,
                    reason: "checkmate"
                }
            };
            return {
                check: true
            };
        }
        if (side === "b" && smActive(S)) return {
            mayPass: true,
            mustPass: !legalMoves(S, side).length
        };
        if (!plainMoves(S).length) {
            if (restricted(S, side)) return {
                mustPass: !legalMoves(S, side).length,
                mayPass: !legalMoves(S, side).length
            };
            return {
                result: {
                    winner: opp,
                    loser: side,
                    reason: "stalemate"
                }
            };
        }
        return {};
    }
    const LVCN = [ "", "一", "二", "三", "四" ];
    function skillWhy(S, f, r, sk) {
        const p = at(S, f, r);
        if (!p || !SKILLS_OF(p.t, p.s).includes(sk)) return "";
        if (p.lv < skLevel(sk)) return `升到${LVCN[skLevel(sk)]}级解锁`;
        const left = Math.max(0, (p[cdKey(p, sk)] || 0) - S.cnt[p.s]);
        if (isPassive(sk)) {
            if (p.s === "b" && smActive(S)) return CFG_CUR.skills[sk].move ? "四面楚歌期间楚军不能移动" : "四面楚歌期间楚军没有技能";
            return CFG_CUR.skills[sk].cooldown && left ? `冷却中，还要 ${left} 回合` : "";
        }
        if (p.s === "b" && smActive(S)) return "四面楚歌期间楚军不能用技能";
        if (p.s === "b" && pfActive(S)) return "破釜沉舟之后楚军暂时不能用技能";
        if (S.freeUsed) return "已经架了拒马，这回合只能再走一步棋";
        if (left) return `冷却中，还要 ${left} 回合`;
        if (sk === "taying" && CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r)) return "踏营只能在敌方半场使用——这匹马要先过河";
        if (p.s === S.turn && !skillActions(S, f, r, sk).length) return sk === "juma" ? "架了拒马就无棋可走" : "现在没有可用的目标";
        return "";
    }
    class Game {
        constructor(cfg) {
            this.cfg = cfg || CFG;
            CFG_CUR = this.cfg;
            this.reset();
        }
        reset(base) {
            this.base = base ? cloneState(base) : newState(this.cfg);
            this.S = cloneState(this.base);
            this.entries = [];
            this.sides = [];
            this.ends = [];
            this.history = [];
            this.result = null;
            this.last = null;
            this.status = evaluate(this.S);
        }
        get bf() {
            return true;
        }
        get board() {
            return this.S.board;
        }
        get turn() {
            return this.S.turn;
        }
        get round() {
            return round(this.S);
        }
        at(f, r) {
            return at(this.S, f, r);
        }
        inCheck(s) {
            return inCheckS(this.S, s || this.S.turn);
        }
        kingPos(s) {
            return findKing(this.S.board, s);
        }
        legalFrom(f, r) {
            const p = this.at(f, r);
            if (!p || p.s !== this.turn || this.result) return [];
            return moveTargets(this.S, f, r).filter(m => attempt(this.S, {
                k: "mv",
                from: m.from,
                to: m.to
            }));
        }
        isLegal(m) {
            return this.legalFrom(m.from[0], m.from[1]).some(x => x.to[0] === m.to[0] && x.to[1] === m.to[1]);
        }
        selfCheckFrom(f, r) {
            CFG_CUR = this.cfg;
            const p = this.at(f, r), S = this.S;
            if (!p || p.s !== this.turn || this.result || S.final || S.jmLock != null && p.id === S.jmLock || jmRooted(S, p) || frozen(S, p)) return [];
            const out = [];
            for (const m of moveTargets(S, f, r)) {
                const T = cloneState(S);
                if (resolve(T, {
                    k: "mv",
                    from: m.from,
                    to: m.to
                })) continue;
                out.push({
                    ...m,
                    why: XQ.kingsFace(T.board) ? "face" : "self"
                });
            }
            return out;
        }
        skillTargets(f, r, sk) {
            CFG_CUR = this.cfg;
            return this.result ? [] : skillActions(this.S, f, r, sk);
        }
        skillOf(p) {
            return p && p.t !== "k" ? SKILL_OF(p.t, p.s) : null;
        }
        skillsOf(p) {
            return p && p.t !== "k" ? SKILLS_OF(p.t, p.s) : [];
        }
        skLevel(sk) {
            CFG_CUR = this.cfg;
            return skLevel(sk);
        }
        hasSkill(p, sk) {
            CFG_CUR = this.cfg;
            return !!p && hasSkill(p, sk);
        }
        skillReady(p, sk) {
            CFG_CUR = this.cfg;
            return !!p && skillReady(this.S, p, sk);
        }
        skillWhy(f, r, sk) {
            CFG_CUR = this.cfg;
            return skillWhy(this.S, f, r, sk);
        }
        rankName(p, lv) {
            return p ? rankName(p.s, p.t, lv || p.lv) : "";
        }
        heroName(p) {
            return heroName(p);
        }
        reviveOptions() {
            CFG_CUR = this.cfg;
            return this.result ? [] : reviveOptions(this.S);
        }
        reviveBlocked() {
            CFG_CUR = this.cfg;
            if (this.result) return [];
            const ok = new Set(reviveOptions(this.S).map(o => o.t)), out = [];
            for (const d of this.S.dead.r) if (!ok.has(d.t) && !out.includes(d.t)) out.push(d.t);
            return out;
        }
        pofuFirst() {
            return this.result ? [] : pofuFirst(this.S);
        }
        pofuSecond(m1) {
            return pofuSecond(this.S, m1);
        }
        pofuPreview(m1) {
            return pofuPreview(this.S, m1);
        }
        revived(p) {
            return revived(this.S, p);
        }
        bsFree(m1) {
            CFG_CUR = this.cfg;
            return bsFree(this.S, m1);
        }
        bsJudge(steps) {
            CFG_CUR = this.cfg;
            return bsJudge(this.S, steps);
        }
        ultReady() {
            return !this.result && ultReady(this.S);
        }
        upgradeCost(p) {
            CFG_CUR = this.cfg;
            return upCost(p);
        }
        baseCost(p) {
            CFG_CUR = this.cfg;
            if (!p || p.t === "k" || p.lv >= maxLv(p.t)) return null;
            return baseCostOf(p);
        }
        maxLv(p) {
            CFG_CUR = this.cfg;
            return p ? maxLv(p.t) : 1;
        }
        atkOf(p) {
            CFG_CUR = this.cfg;
            return p ? atk(p) : 1;
        }
        isPassive(sk) {
            CFG_CUR = this.cfg;
            return isPassive(sk);
        }
        get freeUsed() {
            return !!this.S.freeUsed;
        }
        get jmLock() {
            return this.S.jmLock;
        }
        canUpgrade(f, r) {
            CFG_CUR = this.cfg;
            const p = this.at(f, r), S = this.S;
            if (this.result || !p || p.s !== S.turn || p.t === "k" || p.lv >= maxLv(p.t) || S.upgraded) return false;
            return S.merit[p.s] >= upCost(p) && this.upEscapes(f, r);
        }
        upEscapes(f, r) {
            CFG_CUR = this.cfg;
            if (!this.status || !this.status.upOnly) return true;
            const T = upgradeState(this.S, [ f, r ]);
            return !!(T && hasAnyAction(T, true));
        }
        apply(e) {
            const r = this._apply(e);
            if (r && this.noCd) for (const row of this.S.board) for (const p of row) if (p) {
                p.cd = 0;
                for (const k of Object.keys(p)) if (k.startsWith("c_")) p[k] = 0;
            }
            return r;
        }
        _apply(e) {
            CFG_CUR = this.cfg;
            if (this.result) return null;
            const S = this.S;
            if (e.k === "sk" && e.sk === "shensu" && e.to) e = {
                k: "mv",
                from: e.at,
                to: e.to
            };
            if (e.k === "up") {
                if (!this.canUpgrade(e.at[0], e.at[1])) return null;
                const p = this.at(e.at[0], e.at[1]);
                const cost = upCost(p), xp = p.xp || 0;
                S.merit[p.s] -= cost;
                promote(S, p);
                p.xp = 0;
                S.upgraded = true;
                this.entries.push({
                    k: "up",
                    at: e.at.slice()
                });
                this.sides.push(p.s);
                this.ends.push(0);
                if (this.status && this.status.upOnly) {
                    const st = evaluate(S);
                    this.status = st;
                    if (st.result) this.result = st.result;
                }
                const info = {
                    k: "up",
                    side: p.s,
                    id: p.id,
                    t: p.t,
                    at: e.at.slice(),
                    lv: p.lv,
                    hp: p.hp,
                    cost: cost,
                    usedXp: xp,
                    nm: p.nm,
                    ev: [],
                    after: S,
                    result: this.result
                };
                this.last = info;
                return info;
            }
            const before = S, side = S.turn;
            const r = attempt(S, e);
            if (!r) return null;
            this.S = r.S;
            this.entries.push(JSON.parse(JSON.stringify(e)));
            this.sides.push(side);
            this.ends.push(r.free ? 0 : 1);
            if (r.free) {
                const piece = before.board[e.at[1]][e.at[0]];
                this.status = {
                    free: true,
                    check: inCheckS(this.S, side)
                };
                const info = {
                    k: "sk",
                    free: true,
                    side: side,
                    mover: side,
                    from: e.at.slice(),
                    to: null,
                    pid: piece ? piece.id : null,
                    cap: null,
                    kills: [],
                    ev: r.ev,
                    extra: r.extra,
                    e: e,
                    check: false,
                    result: null,
                    before: before,
                    after: this.S
                };
                this.last = info;
                return info;
            }
            const kills = r.ev.filter(x => x.e === "kill");
            const capE = kills.find(x => x.s !== side);
            const piece = e.from ? before.board[e.from[1]][e.from[0]] : e.at ? before.board[e.at[1]][e.at[0]] : null;
            const h = {
                k: e.k,
                side: side,
                from: e.from || e.at || null,
                to: e.to || null,
                pid: piece ? piece.id : null,
                cap: capE ? {
                    s: capE.s,
                    t: capE.t,
                    id: capE.id,
                    lv: capE.lv
                } : null,
                kills: kills,
                ev: r.ev,
                extra: r.extra,
                e: e
            };
            this.history.push(h);
            const st = evaluate(this.S);
            this.status = st;
            if (st.result) this.result = st.result;
            const info = {
                ...h,
                mover: side,
                check: inCheckS(this.S, other(side)),
                result: this.result,
                ply: this.history.length - 1,
                before: before,
                after: this.S
            };
            this.last = info;
            return info;
        }
        rebuild(n) {
            const es = this.entries.slice(0, n);
            const base = this.base;
            this.reset(base);
            for (const e of es) if (!this.apply(e)) return false;
            return true;
        }
        undoActions(k) {
            return this.rebuild(this.undoTarget(k));
        }
        undoTarget(k) {
            let n = this.entries.length, left = k;
            while (n > 0 && left > 0) {
                n--;
                if (this.ends[n]) left--;
            }
            while (n > 0 && !this.ends[n - 1]) n--;
            return n;
        }
        timeout(side) {
            if (this.result) return null;
            this.result = {
                winner: other(side),
                loser: side,
                reason: "timeout"
            };
            return this.result;
        }
        resign(side) {
            if (this.result) return null;
            this.result = {
                winner: other(side),
                loser: side,
                reason: "resign"
            };
            return this.result;
        }
        setup(fn) {
            CFG_CUR = this.cfg;
            const T = cloneState(this.S);
            fn(T);
            const still = !T.board.some(row => row.some(p => p && ATTACKERS.includes(p.t)));
            if (!still) {
                T.final = false;
                T.occ = {
                    r: 0,
                    b: 0
                };
                for (const row of T.board) for (const p of row) if (p) {
                    if (p.w) p.hp = 1;
                    delete p.w;
                    delete p.j;
                }
            }
            syncFinal(T);
            this.reset(T);
            this.status = evaluate(this.S);
        }
        get final() {
            return !!this.S.final;
        }
        get occ() {
            return this.S.occ || {
                r: 0,
                b: 0
            };
        }
        get merit() {
            return this.S.merit;
        }
        get used() {
            return this.S.used;
        }
        get fx() {
            return {
                hm: Math.max(0, this.S.fx.hm - this.S.cnt.r),
                sm: Math.max(0, this.S.fx.sm - this.S.cnt.b),
                pf: Math.max(0, this.S.fx.pf - this.S.cnt.b)
            };
        }
        get dead() {
            return this.S.dead;
        }
        get upgraded() {
            return this.S.upgraded;
        }
        jmActive(p) {
            return jmActive(this.S, p);
        }
        jmRooted(p) {
            CFG_CUR = this.cfg;
            return jmRooted(this.S, p);
        }
        frozen(p) {
            return frozen(this.S, p);
        }
        simianCount() {
            return simianCount(this.S);
        }
        cdLeft(p, sk) {
            if (!p) return 0;
            const k = sk ? cdKey(p, sk) : "cd";
            return Math.max(0, (p[k] || 0) - this.S.cnt[p.s]);
        }
        mustPass() {
            return !!this.status.mustPass;
        }
        upOnly() {
            return !this.result && !!this.status.upOnly;
        }
        mayPass() {
            return !this.result && !!(this.status.mustPass || this.status.mayPass);
        }
        quietPlies() {
            return 0;
        }
    }
    function view(S) {
        return {
            bf: true,
            board: S.board,
            fx: {
                hm: Math.max(0, S.fx.hm - S.cnt.r),
                sm: Math.max(0, S.fx.sm - S.cnt.b),
                pf: Math.max(0, S.fx.pf - S.cnt.b)
            },
            jmActive: p => jmActive(S, p),
            frozen: p => frozen(S, p)
        };
    }
    function pofuPreview(S, m1) {
        const T = cloneState(S), ev = [];
        strike(T, m1.from, m1.to, "b", ev);
        return {
            S: T,
            ev: ev
        };
    }
    function bsFree(S, m1) {
        const BS = BSon(), list = [];
        let T = S, ev = [], moved = null;
        if (m1) {
            T = cloneState(S);
            const p = at(T, m1.from[0], m1.from[1]), mm = p && p.s === "b" && findMove(T, m1.from, m1.to);
            if (!mm) return {
                S: T,
                ev: ev,
                list: list
            };
            moved = p.id;
            const res = strike(T, m1.from, m1.to, "b", ev);
            if (mm.via) {
                setCd(T, p, mm.via);
                ev.push({
                    e: "passive",
                    sk: mm.via,
                    id: p.id
                });
            }
            trample(T, p, m1.to, res, "b", ev);
        }
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const q = T.board[r][f];
            if (!q || q.s !== "b") continue;
            if (moved != null && BS && BS.twoPieces && q.id === moved) continue;
            for (const m of moveTargets(T, f, r)) list.push(m);
        }
        return {
            S: T,
            ev: ev,
            list: list
        };
    }
    function bsJudge(S, steps) {
        if (attempt(S, {
            k: "art",
            steps: steps
        })) return {
            ok: true
        };
        const BS = BSon(), T = cloneState(S), ev = [], out = {
            ok: false,
            why: "other",
            marks: [],
            links: [],
            S: T,
            ev: ev
        };
        for (const m of steps) {
            const p = at(T, m.from[0], m.from[1]), mm = p && p.s === "b" && findMove(T, m.from, m.to);
            if (!mm) return out;
            const res = strike(T, m.from, m.to, "b", ev);
            if (mm.via) {
                setCd(T, p, mm.via);
                ev.push({
                    e: "passive",
                    sk: mm.via,
                    id: p.id
                });
            }
            trample(T, p, m.to, res, "b", ev);
        }
        const where = id => {
            for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
                const q = T.board[r][f];
                if (q && q.id === id) return [ f, r ];
            }
            return null;
        };
        const kb = findKing(T.board, "b"), kr = findKing(T.board, "r");
        const byCheck = (why, king, ids) => {
            out.why = why;
            if (king) out.marks.push(king);
            for (const id of ids) {
                const c = where(id);
                if (c) {
                    out.marks.push(c);
                    if (king) out.links.push([ c, king ]);
                }
            }
            return out;
        };
        if (T.final) return out;
        if (kb && kr && facing(T.board)) {
            out.why = "face";
            out.marks.push(kb, kr);
            out.links.push([ kb, kr ]);
            return out;
        }
        if (inCheckF(T, "b")) return byCheck("self", kb, checkers(T.board, "r"));
        if (inCheckF(T, "r")) return byCheck("give", kr, checkers(T.board, "b"));
        const dead = ev.filter(e => e.e === "kill" && !e.friendly && e.s === "r");
        if (BS && dead.length > BS.maxKills) {
            out.why = "kills";
            for (const e of dead) if (e.at) out.marks.push(e.at.slice());
            return out;
        }
        const lim = CFG_CUR.longCheckLimit, hist = S.ckHist.b;
        if (lim && hist.length >= lim) out.why = "long";
        return out;
    }
    function levelInfo(t, s, lv, cfg = CFG) {
        const sk = t === "k" ? null : SKILL_OF(t, s);
        const lvOf = k => cfg.skills[k] && cfg.skills[k].level || cfg.skillLevel;
        return {
            hp: hpTbl(t, cfg)[lv - 1],
            atk: atkTbl(t, cfg)[lv - 1] || 1,
            skill: sk && lv >= lvOf(sk) ? sk : null,
            skills: t === "k" ? [] : SKILLS_OF(t, s).filter(k => lv >= lvOf(k)),
            maxLv: t === "k" ? 1 : cfg.upgrade.maxLevel[t] || cfg.upgrade.defaultMaxLevel
        };
    }
    const BF = {
        Game: Game,
        CFG: CFG,
        view: view,
        pofuPreview: pofuPreview,
        SKILL_OF: SKILL_OF,
        SKILLS_OF: SKILLS_OF,
        SKILL_CN: SKILL_CN,
        SKILL_DESC: SKILL_DESC,
        ART_CN: ART_CN,
        ULT_CN: ULT_CN,
        RANK_CN: RANK_CN,
        TIGER_RANKS: TIGER_RANKS,
        HERO_CN: HERO_CN,
        heroName: heroName,
        rankName: rankName,
        START: START,
        START_R: START_R,
        newState: newState,
        cloneState: cloneState,
        attempt: attempt,
        evaluate: evaluate,
        levelInfo: levelInfo,
        maxLvOf: t => maxLv(t),
        ai: {
            version: 1,
            gen: (S, c) => {
                CFG_CUR = CFG;
                return gen(S, c);
            },
            atk: p => {
                CFG_CUR = CFG;
                return atk(p);
            },
            expand: S => {
                CFG_CUR = CFG;
                return expand(S);
            },
            upgradeState: (S, a) => {
                CFG_CUR = CFG;
                return upgradeState(S, a);
            },
            jumaState: (S, a) => {
                CFG_CUR = CFG;
                return jumaState(S, a);
            },
            pofuPairs: (S, only, keep) => {
                CFG_CUR = CFG;
                return pofuPairs(S, only, keep);
            },
            pofuPairsRef: (S, only, keep) => {
                CFG_CUR = CFG;
                return pofuPairsRef(S, only, keep);
            },
            artReady: S => {
                CFG_CUR = CFG;
                const sd = S.turn;
                return !S.freeUsed && artOpen(S) && S.used.art[sd] < CFG.generalArts[sd === "r" ? "xiaohe" : "pofu"].usesPerGame && !(sd === "b" && smActive(S));
            },
            inCheck: (S, s) => inCheckS(S, s),
            upCost: p => {
                CFG_CUR = CFG;
                return upCost(p);
            },
            moveTargets: (S, f, r) => {
                CFG_CUR = CFG;
                return moveTargets(S, f, r);
            }
        },
        hpOf: (t, lv) => hpOf(t, lv, CFG)
    };
    if (typeof module !== "undefined" && module.exports) module.exports = BF;
    global.BF = BF;
})(typeof window !== "undefined" ? window : globalThis);
