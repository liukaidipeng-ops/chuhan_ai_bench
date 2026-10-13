(function(global) {
    const BF = global.BF || require("./bingfa.js");
    const A = BF.ai, CFG = BF.CFG;
    const other = s => s === "r" ? "b" : "r";
    const WIN = 9e3, INF = 1e9;
    const VAL = {
        r: 9,
        c: 4.6,
        n: 4.2,
        e: 2.3,
        a: 2.1,
        p: 1.1,
        k: 0
    };
    const now = () => typeof performance !== "undefined" ? performance.now() : Date.now();
    const KD = typeof process !== "undefined" && process.env && process.env.BFAI_KD ? process.env.BFAI_KD.split(",").map(Number) : [ 2, 1, .4, .9, 1.2, .6 ];
    const ENV = typeof process !== "undefined" && process.env || {};
    const CX = ENV.BFAI_CX != null ? +ENV.BFAI_CX : 2;
    const PFX = ENV.BFAI_PFX != null ? +ENV.BFAI_PFX : 1;
    const PFK = ENV.BFAI_PFK != null ? +ENV.BFAI_PFK : 1;
    const PFG = ENV.BFAI_PFG != null ? +ENV.BFAI_PFG : 0;
    const UPK = ENV.BFAI_UPK != null ? +ENV.BFAI_UPK : 4;
    const bsOn = () => CFG.beishui && CFG.beishui.on ? CFG.beishui : null;
    const BSMIN = ENV.BFAI_BSMIN != null ? +ENV.BFAI_BSMIN : 1;
    const BSV = ENV.BFAI_BSV != null ? +ENV.BFAI_BSV : 3;
    const PFC = +(ENV.BFAI_PFC || 0), PFA = +(ENV.BFAI_PFA || 0), PFD = +(ENV.BFAI_PFD || 0);
    const HPF = [ 0, 1, 1.5, 1.9, 2.2 ], HPF_DEF = [ 0, 1, 1.15, 1.28, 1.36 ], HPF_ADV = [ 0, 1, 1.55, 1.75, 1.85 ];
    const heavyAt = (p, f, r) => {
        if (p.hp < 2) return false;
        const adv = p.s === "r" ? r : 9 - r;
        return p.t === "r" ? adv >= 5 || f >= 3 && f <= 5 : (p.t === "n" || p.t === "p") && adv >= 6 && f >= 2 && f <= 6;
    };
    function baseVal(p, heavy) {
        if (p.t === "a" && !p.j && heavy) return VAL.a * (HPF_ADV[Math.min(4, Math.max(1, p.hp))] + (p.lv >= 2 && p.hp < 2 ? .2 : 0)) + (p.lv >= 3 ? .4 : 0) + (p.lv >= 4 ? .9 : 0) + .14 * Math.min(6, p.xp || 0);
        const def = (p.t === "a" || p.t === "e") && !p.j;
        let v = VAL[p.t] * ((def ? HPF_DEF : HPF)[Math.min(4, Math.max(1, p.hp))] + (def ? .03 : .06) * (p.lv - 1));
        if (p.lv >= 3) v += def ? .4 : .9;
        if (p.lv >= 4) v += .9;
        return v + .14 * Math.min(6, p.xp || 0);
    }
    const EW = {
        r_hp1: 8.8253,
        r_hp2: 13.5643,
        r_hp3: 17.8881,
        r_hp4: 19.8,
        r_lv: .8644,
        c_hp1: 4.7547,
        c_hp2: 6.8023,
        c_hp3: 8.3302,
        c_hp4: 10.12,
        c_lv: .0677,
        n_hp1: 3.6449,
        n_hp2: 5.8748,
        n_hp3: 7.6822,
        n_hp4: 9.24,
        n_lv: -.0303,
        p_hp1: .9584,
        p_hp2: 1.5277,
        p_hp3: 2.2982,
        p_hp4: 2.42,
        p_lv: .0929,
        a_hp1: 2.3083,
        a_hp2: 2.782,
        a_hp3: 3.2205,
        a_hp4: 2.856,
        a_lv: .2725,
        e_hp1: 2.5341,
        e_hp2: 2.3927,
        e_hp3: 3.1808,
        e_hp4: 3.128,
        e_lv: .0963,
        aadv_hp1: 1.7186,
        aadv_hp2: 3.1445,
        aadv_hp3: 3.2389,
        aadv_hp4: 3.885,
        aadv_lv2hp1: .1143,
        atk_lv3: .8633,
        atk_lv4: 1.1512,
        def_lv3: .4171,
        def_lv4: .7228,
        xp: .124,
        r_out: .9549,
        r_adv: .1097,
        r_line: .1259,
        r_near: .1386,
        c_file: .8659,
        c_mid: .6878,
        c_adv14: .2496,
        c_near: .038,
        n_out: .0454,
        n_adv: .0795,
        n_near: .2104,
        n_edge: -.5901,
        p_cross: 1.0115,
        p_deep: .3405,
        p_near: .666,
        p_adv4: .2468,
        p_mid: .4771,
        fin_def_adv: .12,
        fin_def_near: .05,
        jm: .0489,
        kd_r1: 2,
        kd_r2: 1.8007,
        kd_rline: .4589,
        kd_n: 1.0135,
        kd_p1: 1.2,
        kd_p2: 2.6055,
        k_adv: -.825,
        k_off: -.6122,
        fk_hp: 5,
        fk_adv: .35,
        fk_in: 2.5,
        fk_off: -.15,
        merit: .3218,
        art_r: 2.7232,
        art_b: 3.519,
        sm: 1.5,
        sm_att: .6,
        hm: 1.3911,
        hm_att: 1.0408,
        occ: 7,
        up_r: .6128,
        up_n: .1035,
        up_c: .3913,
        up_p: .0714,
        up_a: .2631,
        up_e: .1596,
        r_gap3: .7523,
        skill_up: .089,
        hurt_up: .3839,
        ult_ready: -.989,
        ult_near: .2653,
        skr_r: 0,
        skr_n: 0,
        skr_c: 0,
        skr_p: 0,
        skr_a: 0,
        skr_e: 0,
        att2: 0,
        att4: 0,
        heavy: 0,
        art_r_open: 0,
        art_b_open: 0,
        k_free: 0
    };
    const EHP = {}, ELV = {}, EUP = {};
    for (const t of [ "r", "c", "n", "p", "a", "e" ]) {
        EHP[t] = [ 0, EW[t + "_hp1"], EW[t + "_hp2"], EW[t + "_hp3"], EW[t + "_hp4"] ];
        ELV[t] = EW[t + "_lv"];
        EUP[t] = EW["up_" + t] || 0;
    }
    const EAADV = [ 0, EW.aadv_hp1, EW.aadv_hp2, EW.aadv_hp3, EW.aadv_hp4 ];
    const EKD = [ EW.kd_r1, EW.kd_r2, EW.kd_rline, EW.kd_n, EW.kd_p1, EW.kd_p2 ];
    const ESKR = {
        r: EW.skr_r || 0,
        n: EW.skr_n || 0,
        c: EW.skr_c || 0,
        p: EW.skr_p || 0,
        a: EW.skr_a || 0,
        e: EW.skr_e || 0
    }, ESK = Object.values(ESKR).some(x => x);
    let skC = null;
    function skInfo(s, t) {
        if (!skC) skC = {
            r: {},
            b: {}
        };
        let x = skC[s][t];
        if (x === undefined) {
            const sk = BF.SKILL_OF(t, s), C = sk && CFG.skills[sk];
            x = skC[s][t] = sk && !(C && C.passive) ? C && C.level || CFG.skillLevel : 99;
        }
        return x;
    }
    const EART = !!(EW.art_r_open || EW.art_b_open);
    const KFD = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ];
    function artOpenW(S, s) {
        if (Math.floor((S.cnt.r + S.cnt.b) / 2) + 1 < (CFG.generalArts.fromRound || 1)) return false;
        const B = bsOn();
        if (!B) return true;
        let m = 0, o = 0;
        for (const row of S.board) for (const p of row) if (p && (p.t === "r" || p.t === "n" || p.t === "c")) {
            if (p.s === s) m++; else o++;
        }
        return m < o && (B.maxLeft == null || m <= B.maxLeft);
    }
    const EPOT = [ "up_r", "up_n", "up_c", "up_p", "up_a", "up_e", "r_gap3", "skill_up", "hurt_up", "ult_ready", "ult_near" ].some(k => EW[k]);
    function baseValW(p, heavy) {
        const h = Math.min(4, Math.max(1, p.hp)), xp = EW.xp * Math.min(6, p.xp || 0);
        if (p.t === "a" && !p.j && heavy) return EAADV[h] + (p.lv >= 2 && p.hp < 2 ? EW.aadv_lv2hp1 : 0) + (p.lv >= 3 ? EW.def_lv3 : 0) + (p.lv >= 4 ? EW.def_lv4 : 0) + xp;
        if (p.t === "a" || p.t === "e") {
            if (p.j) return VAL[p.t] * (HPF[h] + .06 * (p.lv - 1)) + (p.lv >= 3 ? .9 : 0) + (p.lv >= 4 ? .9 : 0) + xp;
            return EHP[p.t][h] + ELV[p.t] * (p.lv - 1) + (p.lv >= 3 ? EW.def_lv3 : 0) + (p.lv >= 4 ? EW.def_lv4 : 0) + xp;
        }
        return EHP[p.t][h] + ELV[p.t] * (p.lv - 1) + (p.lv >= 3 ? EW.atk_lv3 : 0) + (p.lv >= 4 ? EW.atk_lv4 : 0) + xp;
    }
    let potC = null;
    function potInfo(s, t, lv) {
        if (!potC) potC = {
            r: {},
            b: {}
        };
        const a = potC[s][t] || (potC[s][t] = []);
        let x = a[lv];
        if (x === undefined) {
            const skLv = sk => CFG.skills[sk] && CFG.skills[sk].level || CFG.skillLevel;
            const info = BF.levelInfo ? BF.levelInfo(t, s, lv) : null;
            x = a[lv] = {
                sk: BF.SKILLS_OF(t, s).some(sk => skLv(sk) === lv + 1),
                hp: info && info.hp != null ? info.hp : -Infinity
            };
        }
        return x;
    }
    function potW(S) {
        const U = CFG.ultimates, mr = S.merit.r, mb = S.merit.b;
        let v = 0, gapR = 99, gapB = 99;
        for (const row of S.board) for (const p of row) {
            if (!p || p.t === "k" || p.lv >= BF.maxLvOf(p.t)) continue;
            const c = A.upCost(p);
            if (c == null) continue;
            const red = p.s === "r", m = red ? mr : mb;
            if (p.t === "r") {
                const g = c - m;
                if (red) {
                    if (g < gapR) gapR = g;
                } else if (g < gapB) gapB = g;
            }
            if (c > m) continue;
            const I = potInfo(p.s, p.t, p.lv), u = EUP[p.t] + (I.sk ? EW.skill_up : 0) + (p.hp < I.hp ? EW.hurt_up : 0);
            v += red ? u : -u;
        }
        if (gapR >= 1 && gapR <= 3) v += EW.r_gap3;
        if (gapB >= 1 && gapB <= 3) v -= EW.r_gap3;
        for (const s of [ "r", "b" ]) {
            const m = S.merit[s], left = (S.used.ult[s] || 0) < U[s === "r" ? "simian" : "hongmen"].usesPerGame, sg = s === "r" ? 1 : -1;
            if (left && m >= U.cost) v += sg * EW.ult_ready; else if (left && m >= U.cost - 5) v += sg * EW.ult_near;
        }
        return v;
    }
    function score(S, me, P) {
        const b = S.board, fin = !!S.final;
        let kr = null, kb = null;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = b[r][f];
            if (p && p.t === "k") {
                if (p.s === "r") kr = [ f, r ]; else kb = [ f, r ];
            }
        }
        let v = 0, attR = 0, attB = 0;
        let hvR = false, hvB = false;
        let dR = 1, dB = 1;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = b[r][f];
            if (!p) continue;
            if (heavyAt(p, f, r)) {
                if (p.s === "r") hvR = true; else hvB = true;
            }
            if (p.t === "k" || p.t === "a") {
                const k = A.atk(p);
                if (p.s === "r") {
                    if (k > dR) dR = k;
                } else if (k > dB) dB = k;
            }
        }
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = b[r][f];
            if (!p) continue;
            const s = p.s, adv = s === "r" ? r : 9 - r, ek = s === "r" ? kb : kr;
            let x, xb = 0, xp = 0;
            if (p.t === "k") {
                if (fin) {
                    const inside = f >= 3 && f <= 5 && adv >= 7;
                    x = 6 + p.hp * EW.fk_hp + adv * EW.fk_adv + (inside ? EW.fk_in : 0) + Math.abs(f - 4) * EW.fk_off;
                } else {
                    x = EW.k_adv * adv + (f !== 4 ? EW.k_off : 0);
                    if (EW.k_free) {
                        let c = 0;
                        for (const [df, dr] of KFD) {
                            const F = f + df, R = r + dr;
                            if (F >= 3 && F <= 5 && (s === "r" ? R >= 0 && R <= 2 : R >= 7 && R <= 9) && !b[R][F]) c++;
                        }
                        x += EW.k_free * c;
                    }
                }
            } else {
                x = baseValW(p, s === "r" ? hvB : hvR);
                if (P) xb = x;
                const dk = ek ? Math.abs(f - ek[0]) + Math.abs(r - ek[1]) : 9;
                switch (p.t) {
                  case "r":
                    x += (adv > 0 || f !== 0 && f !== 8 ? EW.r_out : 0) + EW.r_adv * Math.min(adv, 6) + (ek && (f === ek[0] || r === ek[1]) ? EW.r_line : 0) + EW.r_near * Math.max(0, 8 - dk);
                    break;

                  case "c":
                    x += (ek && f === ek[0] ? EW.c_file : 0) + (f === 4 ? EW.c_mid : 0) + (adv >= 1 && adv <= 4 ? EW.c_adv14 : 0) + EW.c_near * Math.max(0, 8 - dk);
                    break;

                  case "n":
                    x += (adv >= 1 ? EW.n_out : 0) + EW.n_adv * Math.min(adv, 6) + EW.n_near * Math.max(0, 7 - dk) + (f === 0 || f === 8 ? EW.n_edge : 0);
                    break;

                  case "p":
                    x += (adv >= 5 ? EW.p_cross + (adv - 5) * EW.p_deep + EW.p_near * Math.max(0, 5 - dk) : adv === 4 ? EW.p_adv4 : 0) + (f === 4 ? EW.p_mid : 0);
                    break;

                  default:
                    if (fin) x += adv * EW.fin_def_adv + EW.fin_def_near * Math.max(0, 8 - dk);
                }
                if (p.jm && p.jm > S.cnt[other(s)]) x += EW.jm;
                if (dk <= 4 && (p.t === "r" || p.t === "c" || p.t === "n" || p.t === "p" && adv >= 5)) {
                    if (s === "r") attR++; else attB++;
                    x += EW.att4;
                    if (dk <= 2) x += EW.att2;
                }
                if (ESK && p.lv >= skInfo(s, p.t) && S.cnt[s] >= (p.cd || 0)) x += ESKR[p.t];
                if (P) xp = x;
                if (!fin && ek && dk <= 4 && p.hp > (s === "r" ? dB : dR)) {
                    if (p.t === "r") x += dk <= 1 ? EKD[0] : dk === 2 ? EKD[1] : f === ek[0] || r === ek[1] ? EKD[2] : 0; else if (p.t === "n") x += dk <= 3 ? EKD[3] : 0; else if (p.t === "p" && adv >= 5) x += dk <= 1 ? EKD[4] : dk === 2 ? EKD[5] : 0;
                }
            }
            v += s === me ? x : -x;
            if (P) {
                const g = s === me ? 1 : -1;
                if (p.t === "k") P["帅"] += g * x; else {
                    P["子力"] += g * xb;
                    P["位置"] += g * (xp - xb);
                    P["贴脸"] += g * (x - xp);
                }
            }
        }
        if (EW.heavy && hvR !== hvB) {
            const u = (me === "r" ? 1 : -1) * EW.heavy * (hvR ? 1 : -1);
            v += u;
            if (P) P["贴脸"] += u;
        }
        const mt = EW.merit * (S.merit[me] - S.merit[other(me)]);
        v += mt;
        if (P) P["军功"] += mt;
        if (EPOT) {
            const u = (me === "r" ? 1 : -1) * potW(S);
            v += u;
            if (P) P["军功"] += u;
        }
        const art = s => S.used.art[s] ? 0 : (s === "r" ? EW.art_r : EW.art_b) + (EART && artOpenW(S, s) ? s === "r" ? EW.art_r_open : EW.art_b_open : 0);
        const at_ = art(me) - art(other(me));
        v += at_;
        if (P) P["兵法"] += at_;
        const sm = Math.max(0, S.fx.sm - S.cnt.b), hm = Math.max(0, S.fx.hm - S.cnt.r);
        if (sm) {
            const u = (me === "r" ? 1 : -1) * sm * (EW.sm + EW.sm_att * Math.min(4, attR));
            v += u;
            if (P) P["终极兵法"] += u;
        }
        if (hm) {
            const u = (me === "b" ? 1 : -1) * hm * (EW.hm + EW.hm_att * Math.min(4, attB));
            v += u;
            if (P) P["终极兵法"] += u;
        }
        const pf = Math.max(0, (S.fx.pf || 0) - S.cnt.b);
        if (pf && (PFC || PFA)) {
            const u = (me === "r" ? 1 : -1) * Math.min(1, pf / CFG.generalArts.pofu.skillLockRounds) * (PFC + PFA * Math.min(4, attR));
            v += u;
            if (P) P["兵法"] += u;
        }
        if (fin && S.occ) {
            const u = EW.occ * ((S.occ[me] || 0) - (S.occ[other(me)] || 0));
            v += u;
            if (P) P["决战"] += u;
        }
        return v;
    }
    function scoreParts(S, me) {
        const P = {
            "子力": 0,
            "位置": 0,
            "贴脸": 0,
            "帅": 0,
            "军功": 0,
            "兵法": 0,
            "终极兵法": 0,
            "决战": 0
        };
        P["合计"] = score(S, me, P);
        return P;
    }
    function decided(S, ev) {
        if (!S.final) return null;
        for (const e of ev) if (e.e === "kill" && e.t === "k") return other(e.s);
        const N = CFG.finalOccupyRounds;
        if (S.occ) {
            if (S.occ.r >= N) return "r";
            if (S.occ.b >= N) return "b";
        }
        return null;
    }
    function stuck(S) {
        const kids = A.expand(S);
        if (!kids.length) return true;
        if (kids.length === 1 && kids[0].a.k === "pass") return false;
        if (A.inCheck(S, S.turn)) return false;
        for (const k of kids) {
            if (k.a.k !== "mv") continue;
            const q = S.board[k.a.to[1]][k.a.to[0]], q2 = k.S.board[k.a.to[1]][k.a.to[0]];
            if (!q || !q2 || q2.s === S.turn) return false;
        }
        return !kids.some(k => k.a.k === "pass");
    }
    const fewPieces = S => {
        let n = 0;
        for (const row of S.board) for (const p of row) if (p && p.s === S.turn) n++;
        return n <= 4;
    };
    let nodes = 0, deadline = Infinity, qMax = 3, lmrOn = false;
    let nodeCap = Infinity;
    const TIMEOUT = {
        timeout: true
    };
    const hist = new Map;
    const hk = a => a.k === "mv" ? a.from[0] + a.from[1] * 9 + (a.to[0] + a.to[1] * 9) * 90 : -1;
    function order(list, killer) {
        for (const it of list) {
            let w = 0;
            if (it.q) {
                const lethal = it.p && it.q.hp <= A.atk(it.p);
                w = 1e3 + 10 * baseVal(it.q) * (lethal || it.sk ? 1 : .45) - (it.p ? VAL[it.p.t] : 0) + (it.q.t === "k" ? 500 : 0);
            } else if (it.art) w = 600 + VAL[it.art] * 10; else if (it.ult) w = 500; else if (it.sk) w = 200; else {
                const k = hk(it.a);
                w = (killer && k === killer ? 400 : 0) + (hist.get(k) || 0);
            }
            it.w = w;
        }
        list.sort((x, y) => y.w - x.w);
        return list;
    }
    function qs(S, alpha, beta, ply, qd) {
        if (++nodes > nodeCap || (nodes & 63) === 0 && now() > deadline) throw TIMEOUT;
        const side = S.turn;
        const stand = score(S, side);
        if (qd >= qMax) return stand;
        if (stand >= beta) return stand;
        if (stand > alpha) alpha = stand;
        const caps = order(A.gen(S, true));
        let best = stand, n = 0;
        for (const it of caps) {
            if (n >= 6) break;
            const r = BF.attempt(S, it.a);
            if (!r || r.free) continue;
            n++;
            const w = decided(r.S, r.ev);
            const v = w ? w === side ? WIN - ply : -WIN + ply : -qs(r.S, -beta, -alpha, ply + 1, qd + 1);
            if (v > best) best = v;
            if (v > alpha) alpha = v;
            if (alpha >= beta) break;
        }
        return best;
    }
    const killers = [];
    let kdMe = null;
    let upPly = -1;
    let upAll = false;
    const upAt = (S, ply) => (ply === upPly || upAll && ply === 3 && upPly >= 0) && !S.upgraded;
    let pfPly = -1;
    const pfCache = new Map;
    const upCache = new Map;
    const pfAlias = new Map;
    const pfUp = new Map;
    const keyA = a => JSON.stringify(a);
    function upsOf(S, side) {
        let ups = upCache.get(S);
        if (ups) return ups;
        const base = score(S, side);
        ups = [];
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== side || p.t === "k") continue;
            const T = A.upgradeState(S, [ f, r ]);
            if (T) ups.push({
                S: T,
                g: score(T, side) - base,
                id: p.id
            });
        }
        ups.sort((x, y) => y.g - x.g);
        if (!upAll) ups = ups.slice(0, 3);
        if (side === "b" && PFX) for (const u of ups) {
            pfAlias.set(u.S, S);
            pfUp.set(u.S, u.id);
        }
        upCache.set(S, ups);
        return ups;
    }
    function pfKeep(S) {
        if (!PFK || S.final) return null;
        let kf = -9, kr = -9;
        const direct = new Set;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p) continue;
            if (p.t === "k" && p.s === "r") {
                kf = f;
                kr = r;
            }
            if (p.s === "b") for (const m of A.moveTargets(S, f, r)) if (S.board[m.to[1]][m.to[0]]) direct.add(f + r * 9 + (m.to[0] + m.to[1] * 9) * 90);
        }
        const near = m => Math.abs(m.to[0] - kf) + Math.abs(m.to[1] - kr) <= 2;
        const same = (m1, m2) => m2.from[0] === m1.to[0] && m2.from[1] === m1.to[1] || m2.from[0] === m1.from[0] && m2.from[1] === m1.from[1];
        return (m1, t1, m2, t2) => {
            if (near(m1) || near(m2)) return true;
            if (!t1 && !t2) return false;
            if (t1 && t2) return true;
            if (t1) return t1.t !== "p" && same(m1, m2);
            return t2.t !== "p" && !direct.has(m2.from[0] + m2.from[1] * 9 + (m2.to[0] + m2.to[1] * 9) * 90);
        };
    }
    const posKey = S => S.board.map(row => row.map(p => p ? p.id + ":" + p.hp + ":" + p.lv : "").join(",")).join("/");
    function pfOf(S) {
        let pf = pfCache.get(S);
        if (pf) return pf;
        const base = score(S, "b"), src = PFX ? pfAlias.get(S) : null;
        const def = !!bsOn() && A.inCheck(S, "b");
        if (def) {
            pf = A.pofuPairs(S);
            for (const k of pf) k.q = score(k.S, "b") - base;
            const seen = new Set;
            pf = pf.sort((x, y) => y.q - x.q).filter(k => {
                const key = posKey(k.S);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).slice(0, 4);
            pfCache.set(S, pf);
            return pf;
        }
        if (src) {
            pf = [];
            for (const k of pfOf(src)) {
                const r = BF.attempt(S, k.a);
                if (r) pf.push({
                    a: k.a,
                    S: r.S,
                    ev: r.ev,
                    q: score(r.S, "b") - base
                });
            }
            const upId = pfUp.get(S);
            if (upId != null) for (const k of A.pofuPairs(S, upId, pfKeep(S))) {
                if (!pf.some(x => keyA(x.a) === keyA(k.a))) {
                    k.q = score(k.S, "b") - base;
                    pf.push(k);
                }
            }
        } else {
            pf = A.pofuPairs(S, null, pfKeep(S));
            for (const k of pf) k.q = score(k.S, "b") - base;
        }
        pf = pf.filter(k => k.q >= 3 || decided(k.S, k.ev)).sort((x, y) => y.q - x.q).slice(0, src ? 2 : 4);
        pfCache.set(S, pf);
        return pf;
    }
    function kdDanger(S, side) {
        if (S.final) return false;
        let k = null, dmax = 1;
        const near = [];
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p) continue;
            if (p.s === side && (p.t === "k" || p.t === "a")) {
                if (p.t === "k") k = [ f, r ];
                dmax = Math.max(dmax, A.atk(p));
            }
        }
        if (!k) return false;
        for (let r = Math.max(0, k[1] - 2); r <= Math.min(9, k[1] + 2); r++) for (let f = Math.max(0, k[0] - 2); f <= Math.min(8, k[0] + 2); f++) {
            const p = S.board[r][f];
            if (p && p.s !== side && p.t !== "k" && p.hp > dmax && Math.abs(f - k[0]) + Math.abs(r - k[1]) <= 2) near.push(p);
        }
        if (!near.length) return false;
        for (const m of A.moveTargets(S, k[0], k[1])) {
            const x = BF.attempt(S, {
                k: "mv",
                from: m.from,
                to: m.to
            });
            if (x && !x.free) return false;
        }
        const T = BF.cloneState(S);
        T.turn = side === "r" ? "b" : "r";
        T.upgraded = false;
        T.freeUsed = false;
        T.jmLock = null;
        for (let r = Math.max(0, k[1] - 2); r <= Math.min(9, k[1] + 2); r++) for (let f = Math.max(0, k[0] - 2); f <= Math.min(8, k[0] + 2); f++) {
            const p = S.board[r][f];
            if (!p || p.s === side || p.t === "k" || p.hp <= dmax || Math.abs(f - k[0]) + Math.abs(r - k[1]) > 2) continue;
            for (const m of A.moveTargets(T, f, r)) {
                if (Math.abs(m.to[0] - k[0]) + Math.abs(m.to[1] - k[1]) !== 1) continue;
                const x = BF.attempt(T, {
                    k: "mv",
                    from: m.from,
                    to: m.to
                });
                if (x && !x.free && A.inCheck(x.S, side)) return true;
            }
        }
        return false;
    }
    const TTB = new Map, wasNull = [];
    function fp(S) {
        let h1 = 2166136261, h2 = 5381;
        const mix = x => {
            h1 = Math.imul(h1 ^ x, 16777619);
            h2 = Math.imul(h2, 33) ^ x | 0;
        };
        const mixS = t => {
            for (let i = 0; i < t.length; i++) mix(t.charCodeAt(i));
        };
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p) continue;
            mix(1e3 + r * 9 + f);
            for (const k in p) {
                mixS(k);
                const v = p[k];
                if (typeof v === "number") {
                    mix(v | 0);
                    mix(Math.round(v * 4096) | 0);
                } else if (typeof v === "string") {
                    mix(7);
                    mixS(v);
                } else if (typeof v === "boolean") mix(v ? 3 : 5); else if (v == null) mix(9); else mixS(JSON.stringify(v));
            }
        }
        mixS(JSON.stringify([ S.turn, S.cnt, S.merit, S.used, S.fx, S.crossed, S.dead, S.upgraded, S.ckHist, S.freeUsed, S.jmLock, S.final, S.occ, S.named ]));
        return (h1 >>> 0) * 2097152 + (h2 >>> 0 & 2097151);
    }
    const toTT = (v, ply) => v > WIN / 2 ? v + ply : v < -WIN / 2 ? v - ply : v, fromTT = (v, ply) => v > WIN / 2 ? v - ply : v < -WIN / 2 ? v + ply : v;
    const mkey = a => a.k === "mv" ? hk(a) : JSON.stringify(a);
    function ab(S, depth, alpha, beta, ply, ext = 0) {
        if (++nodes > nodeCap || (nodes & 63) === 0 && now() > deadline) throw TIMEOUT;
        const side = S.turn, inChk = A.inCheck(S, side);
        const extd = ply >= 1 && (inChk && ext < CX || !inChk && ext < CX + 1 && side === kdMe && kdDanger(S, side)) ? 1 : 0;
        depth += extd;
        ext += extd;
        if (depth <= 0) {
            if (inChk && ply < 8) depth = 1; else return qs(S, alpha, beta, ply, 0);
        }
        if (fewPieces(S) && stuck(S)) return -WIN + ply;
        const tkey = fp(S) + ":" + depth + ":" + ext + ":" + (upAt(S, ply) ? 1 : 0) + (ply === pfPly ? 2 : 0), tte = TTB.get(tkey), a0 = alpha;
        if (tte) {
            const v = fromTT(tte.v, ply);
            if (tte.f === 0 || tte.f === 1 && v >= beta || tte.f === 2 && v <= alpha) return v;
        }
        if (lmrOn && ply >= 1 && depth >= 3 && !inChk && !wasNull[ply] && beta < WIN / 2 && !S.upgraded && !S.final) {
            let big = false;
            for (const row of S.board) for (const p of row) if (p && p.s === side && (p.t === "r" || p.t === "n" || p.t === "c")) big = true;
            if (big) {
                const T = BF.cloneState(S);
                T.turn = side === "r" ? "b" : "r";
                T.upgraded = false;
                T.freeUsed = false;
                T.jmLock = null;
                wasNull[ply + 1] = true;
                let v;
                try {
                    v = -ab(T, depth - 1 - 2, -beta, -beta + .01, ply + 1, ext);
                } finally {
                    wasNull[ply + 1] = false;
                }
                if (v >= beta) return v;
            }
        }
        let best = -INF, legal = 0, bm = null;
        if (upAt(S, ply)) {
            const ups = upsOf(S, side);
            for (const u of ups) {
                const v = ab(u.S, depth - extd, alpha, beta, ply, ext - extd);
                if (v > best) {
                    best = v;
                    bm = null;
                }
                if (v > alpha) alpha = v;
                if (alpha >= beta) {
                    if (TTB.size < 3e5) TTB.set(tkey, {
                        v: toTT(best, ply),
                        f: 1,
                        m: null
                    });
                    return best;
                }
            }
        }
        const list = order(A.gen(S, false), killers[ply]);
        let mi = 0;
        if (tte && tte.m != null) {
            const i = list.findIndex(it => mkey(it.a) === tte.m);
            if (i > 0) {
                const x = list[i];
                list.splice(i, 1);
                list.unshift(x);
            }
        }
        for (const it of list) {
            const r = BF.attempt(S, it.a);
            if (!r || r.free) continue;
            legal++;
            mi++;
            const w = decided(r.S, r.ev);
            let v;
            if (w) v = w === side ? WIN - ply : -WIN + ply; else if (lmrOn && ply >= 1 && depth >= 2 && mi > 2 && !inChk && it.a.k === "mv" && !it.q && !A.inCheck(r.S, r.S.turn)) {
                v = -ab(r.S, depth - 2 - (mi > 6 && depth >= 4 ? 1 : 0), -alpha - .01, -alpha, ply + 1, ext);
                if (v > alpha) v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);
            } else v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);
            if (v > best) {
                best = v;
                bm = it.a;
            }
            if (v > alpha) alpha = v;
            if (alpha >= beta) {
                if (!it.q && it.a.k === "mv") {
                    const k = hk(it.a);
                    killers[ply] = k;
                    hist.set(k, Math.min(300, (hist.get(k) || 0) + depth * depth));
                }
                break;
            }
        }
        let pfHit = false;
        if (ply === pfPly && side === "b" && (legal || inChk && bsOn()) && alpha < beta && !S.used.art.b && (!A.artReady || A.artReady(S))) {
            const fresh = !pfCache.has(S), pf = pfOf(S);
            if (fresh && now() > deadline) throw TIMEOUT;
            pfHit = pf.length > 0;
            for (const k of pf) {
                const w = decided(k.S, k.ev);
                const v = w ? w === side ? WIN - ply : -WIN + ply : -ab(k.S, Math.max(0, depth - 1), -beta, -alpha, ply + 1, ext);
                if (v > best) best = v;
                if (v > alpha) alpha = v;
                if (alpha >= beta) break;
            }
        }
        if (!legal) {
            if (pfHit) return best;
            if (inChk && !S.upgraded) {
                let bu = -INF;
                for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
                    const p = S.board[r][f];
                    if (!p || p.s !== side || p.t === "k") continue;
                    const T = A.upgradeState(S, [ f, r ]);
                    if (!T) continue;
                    const v = ab(T, depth - extd, alpha, beta, ply, ext - extd);
                    if (v > bu) bu = v;
                    if (bu >= beta) return bu;
                }
                if (bu > -INF) return bu;
            }
            const r = BF.attempt(S, {
                k: "pass"
            });
            if (!r) return -WIN + ply;
            return -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);
        }
        if (TTB.size < 3e5) TTB.set(tkey, {
            v: toTT(best, ply),
            f: best <= a0 ? 2 : best >= beta ? 1 : 0,
            m: bm ? mkey(bm) : null
        });
        return best;
    }
    const LEVELS = {
        easy: {
            depth: 1,
            q: 2,
            noise: 1.3,
            top: 3,
            up: .5,
            budget: 500
        },
        mid: {
            depth: 3,
            q: 3,
            noise: .3,
            top: 1,
            up: 1,
            budget: 2500
        },
        hard: {
            depth: 7,
            q: 4,
            noise: .05,
            top: 1,
            up: 1,
            budget: 3e3,
            minNodes: 2e4,
            dyn: 2.7
        },
        xhard: {
            depth: 7,
            q: 4,
            noise: .05,
            top: 1,
            up: 1,
            budget: 9e3,
            minNodes: 6e4,
            dyn: 2.7
        },
        ana: {
            depth: 3,
            q: 3,
            noise: 0,
            top: 1,
            up: 1,
            budget: 1200
        }
    };
    function pressure(S, side) {
        let k = null, n = 0;
        for (let r = 0; r < 10 && !k; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (p && p.t === "k" && p.s !== side) {
                k = [ f, r ];
                break;
            }
        }
        if (!k) return 0;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== side) continue;
            const adv = side === "r" ? r : 9 - r;
            if (Math.abs(f - k[0]) + Math.abs(r - k[1]) <= 4 && (p.t === "r" || p.t === "c" || p.t === "n" || p.t === "p" && adv >= 5)) n++;
        }
        return n;
    }
    function threatened(S, at_) {
        const p = S.board[at_[1]][at_[0]];
        if (!p) return false;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const e = S.board[r][f];
            if (!e || e.s === p.s) continue;
            if (A.atk(e) < p.hp || !A.moveTargets(S, f, r).some(m => m.to[0] === at_[0] && m.to[1] === at_[1])) continue;
            const V = Object.assign({}, S, {
                turn: e.s,
                freeUsed: false,
                upgraded: false,
                jmLock: null
            });
            if (BF.attempt(V, {
                k: "mv",
                from: [ f, r ],
                to: [ at_[0], at_[1] ]
            })) return true;
        }
        return false;
    }
    function upgradeCands(S, L, rec) {
        if (S.upgraded) return [];
        const me = S.turn, U = CFG.ultimates, fin = !!S.final;
        const base = score(S, me), chk = A.inCheck(S, me), cand = [], skipped = [];
        let heavy = false;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (p && p.s !== me && heavyAt(p, f, r)) heavy = true;
        }
        let rookNeed = 0;
        for (const row of S.board) for (const p of row) if (p && p.s === me && p.t === "r" && p.lv < BF.maxLvOf("r")) {
            const c = A.upCost(p);
            if (c > S.merit[me] && (!rookNeed || c < rookNeed)) rookNeed = c;
        }
        const saving = rookNeed && rookNeed - S.merit[me] <= 3;
        const ultLeft = S.used.ult[me] < U[me === "r" ? "simian" : "hongmen"].usesPerGame;
        const hoard = L.depth >= 3 && ultLeft && S.merit[me] >= U.cost - 6 && S.merit[me] < U.cost && pressure(S, me) >= 2;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== me || p.t === "k") continue;
            const T = A.upgradeState(S, [ f, r ]);
            if (!T) continue;
            const thr = p.t !== "p" && threatened(S, [ f, r ]), must = thr || chk && p.t !== "e" && p.t !== "p";
            const defender = (p.t === "a" || p.t === "e") && !fin;
            const unlock = defender && !must && p.lv >= 2 && !(saving || hoard);
            const keep0 = !(defender && !must && !unlock && !(p.t === "a" && heavy && p.lv < 2)) && !((saving || hoard) && p.t !== "r" && !must);
            if (!keep0) {
                skipped.push({
                    at: [ f, r ],
                    S: T,
                    gain: score(T, me) - base,
                    must: must,
                    unlock: unlock
                });
                continue;
            }
            cand.push({
                at: [ f, r ],
                S: T,
                gain: score(T, me) - base,
                must: must,
                unlock: unlock
            });
        }
        cand.sort((x, y) => (y.must ? 1 : 0) - (x.must ? 1 : 0) || y.gain - x.gain);
        const top = cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock);
        if (ex) top.push(ex);
        if (rec) for (const c of cand) if (!top.includes(c)) {
            const p = S.board[c.at[1]][c.at[0]];
            rec.push({
                at: c.at,
                t: p.t,
                lv: p.lv,
                gain: +c.gain.toFixed(2),
                why: "名额满了（只留前三种）"
            });
        }
        {
            const rest = skipped.concat(cand.filter(c => !top.includes(c))).sort((x, y) => y.gain - x.gain);
            const F = BF.cloneState(S);
            F.turn = me === "r" ? "b" : "r";
            F.upgraded = false;
            F.freeUsed = false;
            F.jmLock = null;
            const thr = new Map;
            try {
                for (const it of A.gen(F, true)) if (it.q && it.q.s === me && it.p) thr.set(it.q.id, Math.max(thr.get(it.q.id) || 0, A.atk(it.p)));
            } catch (e) {}
            let added = 0;
            for (const c of rest) {
                if (added >= 1) break;
                const f = c.at[0], r = c.at[1], p0 = S.board[r][f], p1 = c.S.board[r][f];
                if (!p0 || !p1) continue;
                const m = thr.get(p0.id) || 0;
                let rel = m > 0 && p0.hp <= m && p1.hp > m;
                if (!rel) {
                    const a0 = A.atk(p0), a1 = A.atk(p1), before = new Set;
                    for (const mv of A.moveTargets(S, f, r)) {
                        const q = S.board[mv.to[1]][mv.to[0]];
                        if (q && q.s !== me && (q.hp <= a0 || q.t === "k")) before.add(q.id);
                    }
                    for (const mv of A.moveTargets(c.S, f, r)) {
                        const q = c.S.board[mv.to[1]][mv.to[0]];
                        if (q && q.s !== me && (q.hp <= a1 || q.t === "k") && !before.has(q.id)) {
                            rel = true;
                            break;
                        }
                    }
                }
                if (rel && A.atk(p1) > A.atk(p0)) {
                    top.push(c);
                    added++;
                }
            }
        }
        return top;
    }
    function upgradeAll(S) {
        if (S.upgraded) return [];
        const me = S.turn, base = score(S, me), out = [];
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S.board[r][f];
            if (!p || p.s !== me || p.t === "k") continue;
            const T = A.upgradeState(S, [ f, r ]);
            if (T) out.push({
                at: [ f, r ],
                S: T,
                gain: score(T, me) - base,
                must: false,
                unlock: false
            });
        }
        return out.sort((x, y) => y.gain - x.gain);
    }
    function ttFind(S, d) {
        const f = fp(S);
        let best = null;
        for (let dd = d + 2; dd >= Math.max(1, d - 1); dd--) for (let ex = 0; ex <= 3; ex++) for (const fl of [ "00", "10", "02", "12" ]) {
            const e = TTB.get(f + ":" + dd + ":" + ex + ":" + fl);
            if (e && e.m != null && (!best || dd > best.dd || dd === best.dd && e.f === 0 && best.e.f !== 0)) best = {
                e: e,
                dd: dd
            };
        }
        return best && best.e;
    }
    function pvOf(S0, dr, n = 8) {
        const line = [];
        let S = S0, d = dr;
        while (line.length < n && S) {
            let e = d > 0 ? ttFind(S, d) : null, U = null;
            if (d > 0 && (!e || e.m == null) && !S.upgraded) {
                let bu = null;
                for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
                    const p = S.board[r][f];
                    if (!p || p.s !== S.turn || p.t === "k") continue;
                    const T = A.upgradeState(S, [ f, r ]);
                    if (!T) continue;
                    const e2 = ttFind(T, d);
                    if (e2 && e2.m != null && (!bu || e2.v > bu.e.v)) bu = {
                        T: T,
                        e: e2,
                        at: [ f, r ]
                    };
                }
                if (bu) {
                    U = bu;
                    e = bu.e;
                }
            }
            const X = U ? U.T : S;
            let a = null, R = null, tail = false;
            if (e && e.m != null) {
                const it = A.gen(X, false).find(x => mkey(x.a) === e.m);
                if (it) {
                    R = BF.attempt(X, it.a);
                    if (R) a = it.a;
                }
            }
            if (!a) {
                let bk = null;
                const side = S.turn;
                for (const k of A.expand(S)) {
                    if (k.a.k === "pass") continue;
                    const v = score(k.S, side);
                    if (!bk || v > bk.v) bk = {
                        k: k,
                        v: v
                    };
                }
                if (!bk) break;
                a = bk.k.a;
                R = {
                    S: bk.k.S
                };
                U = null;
                tail = true;
            }
            line.push(Object.assign(U ? {
                up: U.at
            } : {}, a, tail ? {
                est: 1
            } : {}));
            if (BF.evaluate(R.S).result) break;
            S = R.S;
            d--;
        }
        return line;
    }
    const actOf = k => JSON.parse(JSON.stringify(k.up ? {
        up: k.up.at,
        ...k.a
    } : k.a));
    async function think(S0, level, tick, opt) {
        const L0 = LEVELS[level] || LEVELS.mid, t0 = now(), me = S0.turn, seq = [];
        let L = tick ? {
            ...L0,
            budget: Math.min(L0.budget, 1400)
        } : L0;
        if (opt && opt.maxMs > 0 && !L.nodes && !L.fixedDepth) {
            const b = Math.max(150, Math.min(L.budget, opt.maxMs / 3.5));
            if (b < L.budget) L = {
                ...L,
                budget: b,
                minNodes: Math.round((L.minNodes || 0) * b / L.budget)
            };
        }
        const hardEnd = opt && opt.maxMs > 0 && !L.nodes && !L.fixedDepth ? t0 + opt.maxMs * .75 : Infinity, hardEnd2 = hardEnd === Infinity ? Infinity : t0 + opt.maxMs * .9;
        const TR = BFAI.trace ? {
            v: 1,
            level: level,
            side: me,
            round: {
                ...S0.cnt
            },
            iter: []
        } : null;
        upAll = !!L.upAll;
        if (L.fixedDepth) L = {
            ...L,
            depth: L.fixedDepth
        };
        let S = S0, last = now();
        const breathe = async () => {
            if (tick && now() - last > 12) {
                await tick();
                last = now();
            }
        };
        lmrOn = L.depth > 3;
        kdMe = S0.turn;
        nodes = 0;
        qMax = L.q;
        hist.clear();
        killers.length = 0;
        potC = null;
        skC = null;
        upPly = -1;
        pfPly = -1;
        pfCache.clear();
        upCache.clear();
        TTB.clear();
        pfAlias.clear();
        pfUp.clear();
        deadline = Infinity;
        nodeCap = Infinity;
        const fin0 = !!S0.final, chk0 = A.inCheck(S0, me);
        if (PFD && me === "r" && L.depth >= 3 && S0.cnt.b < (S0.fx.pf || 0)) L = {
            ...L,
            depth: L.depth + PFD
        };
        const byNodes = L.nodes > 0;
        let ups = L.rootUpAll ? upgradeAll(S) : upgradeCands(S, L, TR ? TR.upOff = [] : null);
        if (TR) TR.ups = ups.map(c => ({
            at: c.at,
            gain: +c.gain.toFixed(2),
            must: !!c.must
        }));
        if (L.depth < 2) {
            const c = Math.random() <= L.up ? ups.find(x => x.must || x.gain > .25) : null;
            if (c) {
                seq.push({
                    k: "up",
                    at: c.at
                });
                S = c.S;
            }
            ups = [];
        }
        if (L.depth >= 3) upPly = 1;
        const pfGuard = me === "r" && L.depth >= 2 && !S.used.art.b;
        if (pfGuard) pfPly = 1;
        let kids = A.expand(S), pofu = [], artOff = [];
        const keyOf = a => JSON.stringify(a), plain = new Map(kids.map(k => [ keyOf(k.a), k ]));
        for (const c of ups) for (const k of A.expand(c.S)) {
            k.up = c;
            k.base = plain.get(keyOf(k.a)) || null;
            const at = k.a.k === "mv" ? k.a.from : k.a.k === "sk" ? k.a.at : null;
            k.own = !!at && at[0] === c.at[0] && at[1] === c.at[1];
            kids.push(k);
        }
        if (me === "b" && (L.depth >= 2 || bsOn() && chk0 && !kids.length)) {
            try {
                const base = score(S, me);
                pofu = A.pofuPairs(S);
                for (const c of ups) for (const k of A.pofuPairs(c.S)) {
                    k.up = c;
                    pofu.push(k);
                }
                const BS = bsOn();
                pofu = pofu.map(k => {
                    k.gain = score(k.S, me) - base;
                    return k;
                }).filter(k => k.gain >= (BS ? 2 : 4.5) || decided(k.S, k.ev) === me || BS && chk0);
                pofu.sort((x, y) => y.gain - x.gain);
                if (BS) {
                    const seen = new Set;
                    pofu = pofu.filter(k => {
                        const key = (k.up ? k.up.at.join(",") : "") + "|" + posKey(k.S);
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                }
                pofu = pofu.slice(0, 8);
            } catch (e) {
                pofu = [];
            }
        }
        if (me === "r") {
            const tOf = id => {
                const d = S.dead.r.find(x => x.id === id);
                return d ? d.t : "";
            };
            let rook = false;
            for (const row of S.board) for (const p of row) if (p && p.s === "r" && p.t === "r") rook = true;
            const ok = k => {
                const t = tOf(k.a.id);
                return t === "r" || (!rook || S.used.art.b > 0) && (t === "c" || t === "n");
            };
            const rest = kids.filter(k => !(k.a.k === "art" && k.a.id != null) || ok(k));
            if (rest.some(k => k.a.k !== "art")) {
                artOff = kids.filter(k => !rest.includes(k));
                kids = rest;
            }
            if (TR) TR.artOff = artOff.map(k => {
                const t = tOf(k.a.id);
                return {
                    a: k.a,
                    t: t,
                    why: "aep".includes(t) ? "士象兵不救" : "车还在、楚的破釜没用：只救车"
                };
            });
        }
        if (!kids.length && chk0 && !pofu.length && !S0.upgraded) {
            if (S !== S0) {
                S = S0;
                seq.length = 0;
            }
            const all = upgradeAll(S);
            for (const c of all) for (const k of A.expand(c.S)) {
                k.up = c;
                k.base = null;
                k.own = false;
                kids.push(k);
            }
            if (!kids.length && me === "b") {
                for (const c of all) for (const k of A.pofuPairs(c.S)) {
                    k.up = c;
                    k.gain = score(k.S, me);
                    pofu.push(k);
                }
                pofu.sort((x, y) => y.gain - x.gain);
            }
            if (TR && (kids.length || pofu.length)) TR.upEscape = true;
        }
        if (!kids.length) {
            if (pofu.length) {
                const k = pofu[0];
                if (k.up) seq.push({
                    k: "up",
                    at: k.up.at
                });
                seq.push(k.a);
            }
            think.last = {
                nodes: nodes,
                ms: now() - t0,
                v: 0,
                n: 0,
                depth: 0,
                top: []
            };
            if (TR) {
                TR.why = pofu.length ? "only-art" : "no-move";
                TR.seq = JSON.parse(JSON.stringify(seq));
                think.last.trace = TR;
            }
            return seq;
        }
        for (const k of kids) {
            const w = decided(k.S, k.ev);
            k.done = !!w;
            k.q = w ? w === me ? WIN : -WIN : score(k.S, me);
            k.v = k.q;
        }
        kids.sort((x, y) => y.q - x.q);
        let depthDone = 0, why = "depth";
        const n0 = nodes;
        let dynB = L.budget, dynN = L.nodes, dynOn = false, crit = false, prevBK = null, prevV = null;
        const dynX = L.depth > 3 && L.dyn > 1 ? L.dyn : 0;
        for (let d = 1; d <= L.depth; d++) {
            if (d > 1 && now() > hardEnd) {
                why = "time";
                break;
            }
            let soft = t0 + dynB;
            if (L.fixedDepth) {
                deadline = Infinity;
                nodeCap = Infinity;
            } else if (byNodes) {
                if (dynX && !dynOn && d > 2 && nodes - n0 > L.nodes * .5 && (crit || depthDone <= 3)) {
                    dynOn = true;
                    dynN = Math.round(L.nodes * dynX);
                    if (TR) TR.dyn = d;
                }
                if (d > 2 && nodes - n0 > dynN * .5) {
                    why = "nodes";
                    break;
                }
                nodeCap = d <= 2 ? Infinity : n0 + dynN;
            } else {
                const thin = L.minNodes > 0 && nodes - n0 < L.minNodes;
                if (dynX && !dynOn && d > 3 && now() - t0 > L.budget * .3 && (crit || depthDone <= 3)) {
                    dynOn = true;
                    dynB = L.budget * dynX;
                    soft = t0 + dynB;
                    if (TR) TR.dyn = d;
                }
                if (d > 3 && !thin && now() - t0 > dynB * .3) {
                    why = "time";
                    break;
                }
                deadline = Math.min(hardEnd, d < 3 ? Infinity : d === 3 ? t0 + L.budget * 2 : thin ? t0 + L.budget * 1.5 : soft + L.budget * .3);
            }
            let alpha = -INF, n = 0, cut = false;
            const M = L.noise * 1.6 + .02;
            if (UPK > 0 && d >= 2 && ups.length) {
                const topPlain = new Set(kids.filter(k => !k.up).slice(0, UPK)), seen = new Map;
                for (const k of kids) {
                    if (!k.up) {
                        k.off = false;
                        continue;
                    }
                    const i = seen.get(k.up) || 0;
                    seen.set(k.up, i + 1);
                    k.off = !(chk0 || k.own || k.done || i < UPK || k.base && topPlain.has(k.base));
                }
            }
            if (pfGuard) {
                let i = 0;
                for (const k of kids) k.gn = PFG <= 0 || !k.off && i++ < PFG;
            }
            try {
                for (const k of kids) {
                    if (k.off) {
                        k.nv = -INF;
                        n++;
                        continue;
                    }
                    if (pfGuard) pfPly = k.gn ? 1 : -1;
                    k.nv = k.done ? k.q : -ab(k.S, d - 1, -INF, -alpha + M, 1);
                    if (k.nv > alpha) alpha = k.nv;
                    n++;
                    await breathe();
                    if (!L.fixedDepth && !byNodes && d > 3 && now() > soft && (!(L.minNodes > 0 && nodes - n0 < L.minNodes) || now() > t0 + L.budget * 1.5)) {
                        cut = true;
                        break;
                    }
                }
            } catch (e) {
                if (e !== TIMEOUT) throw e;
                cut = true;
            }
            deadline = Infinity;
            nodeCap = Infinity;
            if (cut) {
                const doneK = kids.slice(0, n);
                if (doneK.length) {
                    const head = kids[0], better = doneK.filter(k => !pfGuard || k.gn).sort((x, y) => y.nv - x.nv)[0];
                    if (better && better !== head && better.nv > head.nv) {
                        better.v = head.v + .01;
                        better.vg = true;
                    }
                }
                for (const k of kids) k.nv = null;
                kids.sort((x, y) => y.v - x.v);
                why = byNodes ? "nodes" : "time";
                if (TR) TR.iter.push({
                    d: d,
                    best: actOf(kids[0]),
                    v: +kids[0].v.toFixed(3),
                    done: n,
                    of: kids.length,
                    nodes: nodes - n0,
                    ms: Math.round(now() - t0),
                    cut: true
                });
                break;
            }
            for (const k of kids) {
                k.v = k.nv;
                k.nv = null;
                k.vg = !!k.gn;
            }
            kids.sort((x, y) => y.v - x.v);
            if (pfGuard && d >= 2) for (let i = 0; i < 8 && !kids[0].vg && !kids[0].done; i++) {
                const b = kids[0];
                pfPly = 1;
                b.v = -ab(b.S, d - 1, -INF, INF, 1);
                b.vg = true;
                kids.sort((x, y) => y.v - x.v);
            }
            depthDone = d;
            {
                const bk = JSON.stringify(actOf(kids[0]));
                if (d >= 3 && (prevBK && bk !== prevBK || prevV != null && kids[0].v < prevV - 1)) crit = true;
                prevBK = bk;
                prevV = kids[0].v;
            }
            if (TR) TR.iter.push({
                d: d,
                best: actOf(kids[0]),
                v: +kids[0].v.toFixed(3),
                nodes: nodes - n0,
                ms: Math.round(now() - t0)
            });
            if (kids[0].v > WIN / 2 || kids[0].v < -WIN / 2) {
                why = "mate";
                break;
            }
        }
        const bestV = kids[0].v;
        for (const k of kids) {
            k.w = k.v > bestV - (L.noise * 1.6 + .02) * .95 ? k.v + (Math.random() * 2 - 1) * L.noise : k.v - 100;
        }
        if (pfGuard && kids.some(k => k.vg)) for (const k of kids) if (!k.vg && !k.done) k.w = k.v - 100;
        const plainBest = kids.reduce((m, k) => !k.up && k.v > m ? k.v : m, -INF);
        for (const k of kids) {
            if (!k.up || fin0) continue;
            const t = S0.board[k.up.at[1]][k.up.at[0]].t;
            if ((t === "a" || t === "e") && k.v < plainBest + .4) k.w = k.v - 100;
        }
        const pool = kids.slice().sort((x, y) => y.w - x.w);
        let pick = pool[0];
        if (L.top > 1 && pool.length > 1 && Math.random() < .3) {
            const c = pool.slice(0, L.top).filter(k => k.w > -50), i = Math.floor(Math.random() * c.length);
            if (c.length) pick = c[i];
        }
        const pick0 = pick;
        if (pofu.length && bestV < WIN / 2) {
            const PF_MIN = bsOn() ? BSMIN : 5, need = bestV + PF_MIN, d1 = Math.max(1, depthDone) - 1;
            let bp = null;
            if (byNodes) nodeCap = nodes + Math.round(L.nodes * .4); else deadline = Math.min(hardEnd2, now() + Math.max(400, L.budget * .4));
            try {
                for (const k of pofu) {
                    const w = decided(k.S, k.ev);
                    k.v = w ? w === me ? WIN : -WIN : -ab(k.S, d1, -INF, -need + .01, 1);
                    if (k.v >= need && (!bp || k.v > bp.v)) bp = k;
                    await breathe();
                }
            } catch (e) {
                if (e !== TIMEOUT) throw e;
            }
            deadline = Infinity;
            nodeCap = Infinity;
            if (bp) {
                pick = bp;
                kids = kids.concat([ bp ]);
                if (TR) TR.art = {
                    a: actOf(bp),
                    v: +bp.v.toFixed(3),
                    need: +need.toFixed(3)
                };
            }
        }
        if (L.depth >= 2 && !fin0 && pick && pick.S && !pick.done) {
            const mate1 = T => {
                if (!T || T.final) return false;
                const opp = T.turn, st = [ T ];
                if (!T.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
                    const p = T.board[r][f];
                    if (p && p.s === opp && p.t !== "k") {
                        const U = A.upgradeState(T, [ f, r ]);
                        if (U) st.push(U);
                    }
                }
                for (const X of st) for (const e of A.gen(X, false)) {
                    const R = BF.attempt(X, e.a);
                    if (!R || R.free || !A.inCheck(R.S, me)) continue;
                    const ev = BF.evaluate(R.S);
                    if (ev && ev.result && ev.result.winner === opp) return true;
                }
                return false;
            };
            try {
                if (mate1(pick.S)) {
                    let alt = null;
                    for (const k of pool.filter(k => k !== pick && k.S && !k.done).slice(0, 80).concat(artOff.filter(k => k.S))) {
                        if (now() > hardEnd2) break;
                        if (!mate1(k.S)) {
                            alt = k;
                            break;
                        }
                    }
                    if (alt) {
                        if (TR) TR.mateGuard = {
                            from: actOf(pick),
                            to: actOf(alt)
                        };
                        pick = alt;
                        think.mateGuard = (think.mateGuard || 0) + 1;
                    }
                }
            } catch (e) {}
        }
        if (pick.up) {
            seq.push({
                k: "up",
                at: pick.up.at
            });
            S = pick.up.S;
        }
        if (L.depth >= 2 && !pick.done && !S.freeUsed && pick.a.k !== "pass") {
            try {
                const T = pick.S;
                let jm = null;
                for (let r = 0; r < 10 && !jm; r++) for (let f = 0; f < 9; f++) {
                    const p = S.board[r][f];
                    if (!p || p.s !== me || p.t !== "p" || p.lv < (CFG.skills.juma && CFG.skills.juma.level || CFG.skillLevel)) continue;
                    const q = T.board[r][f];
                    if (!q || q.id !== p.id) continue;
                    let hit = false;
                    for (let r2 = 0; r2 < 10 && !hit; r2++) for (let f2 = 0; f2 < 9; f2++) {
                        const e = T.board[r2][f2];
                        if (e && e.s !== me && e.t !== "k" && (e.t !== "c" || CFG.skills.juma.counterCannon) && (e.t !== "e" || CFG.skills.juma.counterElephant) && A.moveTargets(T, f2, r2).some(m => m.to[0] === f && m.to[1] === r)) {
                            hit = true;
                            break;
                        }
                    }
                    if (!hit) continue;
                    const J = A.jumaState(S, [ f, r ]);
                    if (J && BF.attempt(J, pick.a)) {
                        jm = {
                            k: "sk",
                            at: [ f, r ]
                        };
                        break;
                    }
                }
                if (jm) seq.push(jm);
            } catch (e) {}
        }
        seq.push(pick.a);
        think.last = {
            nodes: nodes,
            ms: now() - t0,
            v: pick.v,
            n: kids.length,
            depth: depthDone,
            top: kids.slice(0, 5).map(k => [ k.up ? {
                up: k.up.at,
                ...k.a
            } : k.a, +k.v.toFixed(2) ])
        };
        if (TR) {
            const Mw = (L.noise * 1.6 + .02) * .95;
            try {
                TR.cand = kids.slice(0, 8).map(k => ({
                    a: actOf(k),
                    v: +k.v.toFixed(3),
                    exact: !k.off && (k === kids[0] || k.v > bestV - Mw),
                    pv: k.S && !k.done ? pvOf(k.S, Math.max(0, depthDone - 1), 7) : []
                }));
            } catch (e) {
                TR.cand = kids.slice(0, 8).map(k => ({
                    a: actOf(k),
                    v: +k.v.toFixed(3)
                }));
                TR.pvErr = String(e);
            }
            TR.pofuN = pofu.length;
            TR.pick = {
                a: actOf(pick),
                rank: kids.indexOf(pick),
                best: actOf(kids[0]),
                random: pick0 !== kids[0],
                noise: L.noise,
                top: L.top
            };
            Object.assign(TR, {
                ms: Math.round(now() - t0),
                nodes: nodes,
                depth: depthDone,
                why: L.fixedDepth ? "fixed" : why,
                seq: JSON.parse(JSON.stringify(seq))
            });
            think.last.trace = TR;
        }
        return seq;
    }
    const BFAI = {
        think: think,
        score: score,
        scoreParts: scoreParts,
        LEVELS: LEVELS,
        apiVersion: 1,
        obsVersion: 1,
        trace: false
    };
    if (typeof module !== "undefined" && module.exports) module.exports = BFAI; else global.BFAI = BFAI;
})(typeof window !== "undefined" ? window : globalThis);
