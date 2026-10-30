// Shared core base git commit: 83a238578810e5b7f108cd9bf4c7a03ff89d8da3; no uncommitted core changes.
// Third-party licenses: see THIRD-PARTY-NOTICES.md distributed with this Skill.
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
// \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res, err) => () => {
	if (err) throw err[0];
	try {
		return fn && (res = fn(fn = 0)), res;
	} catch (e) {
		throw err = [e], e;
	}
};
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp({}, "__esModule", { value: true }), mod);
// src/core/types.ts
/** 新建构件时的默认值（mm / m） */
var DEFAULTS = {
	ceiling: 2.8,
	thickness: {
		exterior: 240,
		bearing: 200,
		partition: 120,
		glass: 80,
		half: 120,
		"half-glass": 120
	},
	lowHeight: 1,
	opening: {
		door: {
			width: 900,
			sill: 0,
			head: 2.1
		},
		sliding: {
			width: 1600,
			sill: 0,
			head: 2.2
		},
		doorway: {
			width: 900,
			sill: 0,
			head: 2.1
		},
		window: {
			width: 1500,
			sill: .9,
			head: 2.4
		},
		"floor-window": {
			width: 2400,
			sill: .05,
			head: 2.5
		},
		"bay-window": {
			width: 1800,
			sill: .45,
			head: 2.4
		},
		"open-balcony": {
			width: 2400,
			sill: 0,
			head: 2.5
		}
	},
	beam: {
		width: 240,
		bottom: 2.5
	}
};
/** 拆除或开洞时需要用户二次确认的墙类型；承重柱（Column.kind = bearing）同样受保护，管道井不可拆（拆除记录一律报 error） */
var PROTECTED_KINDS = ["bearing", "exterior"];
// src/core/levels.ts
/** Array order is floor order; validatePlan requires strictly increasing elevations. */
function levelsOf(plan) {
	return plan.levels?.length ? plan.levels : [{
		id: "L1",
		name: "1F",
		elevation: 0
	}];
}
function levelOf(plan, element) {
	const levels = levelsOf(plan);
	const id = "wall" in element ? plan.walls.find((w) => w.id === element.wall)?.level : element.level;
	return levels.find((l) => l.id === id) ?? levels[0];
}
function levelCeiling(plan, levelId) {
	return levelsOf(plan).find((l) => l.id === levelId)?.ceiling ?? plan.ceiling;
}
/** Enables additive result metadata only for plans that actually use the extension. */
function hasLevelData(plan) {
	return !!(plan.levels?.length || plan.columns?.length || plan.shafts?.length || plan.stairs?.length || plan.voids?.length);
}
/** Read-only view: retains levels so omitted level fields still refer to the original first floor. */
function onLevel(plan, levelId) {
	const matches = (e) => levelOf(plan, e).id === levelId;
	return {
		...plan,
		ceiling: levelCeiling(plan, levelId),
		walls: plan.walls.filter(matches),
		openings: plan.openings.filter(matches),
		beams: plan.beams.filter(matches),
		rooms: plan.rooms.filter(matches),
		questions: plan.questions.filter(matches),
		...plan.columns ? { columns: plan.columns.filter(matches) } : {},
		...plan.shafts ? { shafts: plan.shafts.filter(matches) } : {},
		...plan.stairs ? { stairs: plan.stairs.filter(matches) } : {},
		...plan.voids ? { voids: plan.voids.filter(matches) } : {},
		...plan.levelUnderlays?.[levelId] ? { underlay: plan.levelUnderlays[levelId] } : {}
	};
}
function assertLevel(plan, level) {
	if (level !== void 0 && !levelsOf(plan).some((l) => l.id === level)) throw new Error(`未知楼层：${level}`);
}
var add = (a, b) => [a[0] + b[0], a[1] + b[1]];
var sub$1 = (a, b) => [a[0] - b[0], a[1] - b[1]];
var mul = (a, s) => [a[0] * s, a[1] * s];
var dot$2 = (a, b) => a[0] * b[0] + a[1] * b[1];
var distance$1 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
var clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function wallDir(w) {
	const d = sub$1(w.b, w.a);
	return mul(d, 1 / (Math.hypot(...d) || 1));
}
function wallNormal(w) {
	const d = wallDir(w);
	return [-d[1], d[0]];
}
function arc(w) {
	const chord = distance$1(w.a, w.b), sag = w.bulge || 0;
	if (chord < 1e-7 || Math.abs(sag) < 1e-7) return null;
	const c = sag / 2 - chord * chord / (8 * sag);
	const center = add(mul(add(w.a, w.b), .5), mul(wallNormal(w), c));
	return {
		center,
		radius: distance$1(center, w.a),
		start: Math.atan2(w.a[1] - center[1], w.a[0] - center[0]),
		sweep: -4 * Math.atan(2 * sag / chord)
	};
}
/** Signed angle follows bulge (positive toward n), rather than mathematical sweep. */
function arcParams(w) {
	const a = arc(w);
	return a ? {
		radius: a.radius,
		angle: -a.sweep * 180 / Math.PI,
		sagitta: w.bulge,
		center: a.center
	} : null;
}
function wallLength(w) {
	const a = arc(w);
	return a ? a.radius * Math.abs(a.sweep) : distance$1(w.a, w.b);
}
function pointAt(w, s) {
	const len = wallLength(w), t = len > 1e-7 ? clamp(s / len, 0, 1) : 0;
	if (t === 0) return [...w.a];
	if (t === 1) return [...w.b];
	const a = arc(w);
	return a ? add(a.center, mul([Math.cos(a.start + a.sweep * t), Math.sin(a.start + a.sweep * t)], a.radius)) : add(w.a, mul(sub$1(w.b, w.a), t));
}
/** Exact unit tangent along the centerline, also at circular wall endpoints. */
function wallTangent(w, s) {
	const a = arc(w);
	if (!a) return wallDir(w);
	const angle = a.start + a.sweep * clamp(s / wallLength(w), 0, 1);
	return mul([-Math.sin(angle), Math.cos(angle)], Math.sign(a.sweep));
}
function wallPath(w) {
	if (!arc(w)) return [[...w.a], [...w.b]];
	const len = wallLength(w), n = Math.max(2, Math.ceil(len / 150));
	return Array.from({ length: n + 1 }, (_, i) => pointAt(w, len * i / n));
}
function projectToWall(w, p) {
	const a = arc(w), len = wallLength(w);
	let s = clamp(dot$2(sub$1(p, w.a), wallDir(w)), 0, len);
	if (a) {
		const angle = Math.atan2(p[1] - a.center[1], p[0] - a.center[0]);
		const candidates = [0, len];
		for (let k = -2; k <= 2; k++) {
			const t = (angle - a.start + k * Math.PI * 2) / a.sweep;
			if (t >= 0 && t <= 1) candidates.push(t * len);
		}
		s = candidates.reduce((best, cur) => distance$1(pointAt(w, cur), p) < distance$1(pointAt(w, best), p) ? cur : best);
	}
	const point = pointAt(w, s);
	return {
		s,
		dist: distance$1(point, p),
		point
	};
}
/** Slice preserves the exact circular arc, including its signed sagitta. */
function sliceWall(w, from, to) {
	const a = arc(w), len = wallLength(w), result = {
		...w,
		a: pointAt(w, from),
		b: pointAt(w, to)
	};
	if (a) result.bulge = Math.sign(w.bulge) * a.radius * (1 - Math.cos(Math.abs(a.sweep) * (to - from) / len / 2));
	return result;
}
function wallFootprint(w) {
	const path = wallPath(w), a = arc(w), half = w.thickness / 2;
	const normals = path.map((p) => a ? mul(sub$1(p, a.center), -Math.sign(a.sweep) / a.radius) : wallNormal(w));
	return [...path.map((p, i) => add(p, mul(normals[i], half))), ...path.map((p, i) => add(p, mul(normals[i], -half))).reverse()];
}
function beamFootprint(b) {
	return wallFootprint({
		...b,
		thickness: b.width,
		kind: "partition"
	});
}
function openingSpan(plan, o) {
	const wall = plan.walls.find((w) => w.id === o.wall);
	if (!wall) throw new Error(`洞口 ${o.id} 的宿主墙 ${o.wall} 不存在`);
	const startTangent = wallTangent(wall, o.offset), endTangent = wallTangent(wall, o.offset + o.width);
	const dir = wallTangent(wall, o.offset + o.width / 2), normal = [-dir[1], dir[0]];
	return {
		a: pointAt(wall, o.offset),
		b: pointAt(wall, o.offset + o.width),
		center: pointAt(wall, o.offset + o.width / 2),
		dir,
		normal,
		wall,
		path: wallPath(sliceWall(wall, o.offset, o.offset + o.width)),
		startTangent,
		endTangent,
		startNormal: [-startTangent[1], startTangent[0]],
		endNormal: [-endTangent[1], endTangent[0]]
	};
}
function openingFootprint(plan, o) {
	const { wall } = openingSpan(plan, o);
	return wallFootprint(sliceWall(wall, o.offset, o.offset + o.width));
}
function polygonArea(poly) {
	return Math.abs(poly.reduce((a, p, i) => {
		const q = poly[(i + 1) % poly.length];
		return a + p[0] * q[1] - q[0] * p[1];
	}, 0)) / 2;
}
function pointInPolygon(p, poly) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[j], b = poly[i], d = sub$1(b, a);
		if (distance$1(p, add(a, mul(d, clamp(dot$2(sub$1(p, a), d) / (dot$2(d, d) || 1), 0, 1)))) < 1e-7) return true;
		if (a[1] > p[1] !== b[1] > p[1] && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
	}
	return inside;
}
function labelPoint(poly) {
	if (!poly.length) return [0, 0];
	const ys = [...new Set(poly.map((p) => p[1]))].sort((a, b) => a - b);
	let best = [...poly[0]], width = -1;
	for (let k = 1; k < ys.length; k++) {
		const y = (ys[k - 1] + ys[k]) / 2, xs = [];
		poly.forEach((a, i) => {
			const b = poly[(i + 1) % poly.length];
			if (a[1] > y !== b[1] > y) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
		});
		xs.sort((a, b) => a - b);
		for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > width) {
			width = xs[i + 1] - xs[i];
			best = [(xs[i] + xs[i + 1]) / 2, y];
		}
	}
	return best;
}
function planBounds(plan) {
	const pts = [
		...plan.walls.flatMap(wallFootprint),
		...plan.rooms.flatMap((r) => r.poly),
		...plan.beams.flatMap(beamFootprint),
		...(plan.columns ?? []).flatMap(columnFootprint),
		...[
			...plan.shafts ?? [],
			...plan.stairs ?? [],
			...plan.voids ?? []
		].flatMap((e) => e.poly)
	];
	if (!pts.length) return null;
	return [
		Math.min(...pts.map((p) => p[0])),
		Math.min(...pts.map((p) => p[1])),
		Math.max(...pts.map((p) => p[0])),
		Math.max(...pts.map((p) => p[1]))
	];
}
/** positive = n side, negative = -n side. Multiple rooms can adjoin one merged wall. */
function roomsBesideWall(plan, wallId) {
	const wall = plan.walls.find((w) => w.id === wallId), result = {
		positive: [],
		negative: []
	};
	if (!wall) return result;
	const path = wallPath(wall);
	for (const room of plan.rooms.filter((r) => levelOf(plan, r).id === levelOf(plan, wall).id)) for (let i = 1; i < path.length; i++) {
		const a = path[i - 1], b = path[i], n = wallNormal({
			a,
			b
		}), d = sub$1(b, a);
		const ts = [
			.1,
			.5,
			.9,
			...room.poly.map((p) => clamp(dot$2(sub$1(p, a), d) / (dot$2(d, d) || 1), .001, .999))
		];
		for (const side of ["positive", "negative"]) if (!result[side].includes(room) && ts.some((t) => pointInPolygon(add(add(a, mul(d, t)), mul(n, (wall.thickness / 2 + 1) * (side === "positive" ? 1 : -1))), room.poly))) result[side].push(room);
	}
	return result;
}
function roomCeiling(plan, room) {
	return room.ceiling ?? levelCeiling(plan, levelOf(plan, room).id) ?? DEFAULTS.ceiling;
}
function effectiveWallHeight(plan, w) {
	if (w.height !== void 0) return w.height;
	const sides = roomsBesideWall(plan, w.id), rooms = [...sides.positive, ...sides.negative];
	return rooms.length ? Math.max(...rooms.map((r) => roomCeiling(plan, r))) : levelCeiling(plan, levelOf(plan, w).id);
}
function ceilingAt(plan, p, levelId = levelsOf(plan)[0].id) {
	const rooms = plan.rooms.filter((r) => levelOf(plan, r).id === levelId && pointInPolygon(p, r.poly));
	return rooms.length ? Math.max(...rooms.map((r) => roomCeiling(plan, r))) : levelCeiling(plan, levelId);
}
function columnFootprint(c) {
	const theta = (c.rotation ?? 0) * Math.PI / 180, co = Math.cos(theta), si = Math.sin(theta);
	return (c.shape === "round" ? Array.from({ length: 64 }, (_, i) => [Math.cos(i * Math.PI / 32) * c.size[0] / 2, Math.sin(i * Math.PI / 32) * c.size[0] / 2]) : [
		[-c.size[0] / 2, -c.size[1] / 2],
		[c.size[0] / 2, -c.size[1] / 2],
		[c.size[0] / 2, c.size[1] / 2],
		[-c.size[0] / 2, c.size[1] / 2]
	]).map(([x, y]) => add(c.center, [x * co - y * si, x * si + y * co]));
}
// src/core/protection.ts
/** Runtime guard also catches a malformed/forward-compatible Change targeting a shaft. */
function shaftRemovalError(plan, target) {
	return plan.shafts?.some((s) => s.id === target) ? "管道井 / 烟道不能拆" : void 0;
}
// src/core/mirror-frame.ts
/** Replayed plans retain their source frame so mirror and replay use the same axis. */
function mirrorBounds(plan) {
	const stored = plan.legacy?.__structureReplayFrame;
	if (Array.isArray(stored) && stored.length === 4 && stored.every((v) => typeof v === "number" && Number.isFinite(v))) return stored;
	const bounds = planBounds(plan);
	if (bounds) return bounds;
	const points = plan.changes.flatMap((c) => {
		const d = c.data ?? {};
		return [
			d.a,
			d.b,
			...Array.isArray(d.poly) ? d.poly : []
		].filter((p) => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === "number" && Number.isFinite(v)));
	});
	return points.length ? [
		Math.min(...points.map((p) => p[0])),
		Math.min(...points.map((p) => p[1])),
		Math.max(...points.map((p) => p[0])),
		Math.max(...points.map((p) => p[1]))
	] : null;
}
// node_modules/splaytree/dist/splaytree.js
var f = class {
	constructor(t, e) {
		this.next = null, this.key = t, this.data = e, this.left = null, this.right = null;
	}
};
function d(n, t) {
	return n > t ? 1 : n < t ? -1 : 0;
}
function u$3(n, t, e) {
	const r = new f(null, null);
	let l = r, i = r;
	for (;;) {
		const o = e(n, t.key);
		if (o < 0) {
			if (t.left === null) break;
			if (e(n, t.left.key) < 0) {
				const s = t.left;
				if (t.left = s.right, s.right = t, t = s, t.left === null) break;
			}
			i.left = t, i = t, t = t.left;
		} else if (o > 0) {
			if (t.right === null) break;
			if (e(n, t.right.key) > 0) {
				const s = t.right;
				if (t.right = s.left, s.left = t, t = s, t.right === null) break;
			}
			l.right = t, l = t, t = t.right;
		} else break;
	}
	return l.right = t.left, i.left = t.right, t.left = r.right, t.right = r.left, t;
}
function c(n, t, e, r) {
	const l = new f(n, t);
	if (e === null) return l.left = l.right = null, l;
	e = u$3(n, e, r);
	const i = r(n, e.key);
	return i < 0 ? (l.left = e.left, l.right = e, e.left = null) : i >= 0 && (l.right = e.right, l.left = e, e.right = null), l;
}
function m(n, t, e) {
	let r = null, l = null;
	if (t) {
		t = u$3(n, t, e);
		const i = e(t.key, n);
		i === 0 ? (r = t.left, l = t.right) : i < 0 ? (l = t.right, t.right = null, r = t) : (r = t.left, t.left = null, l = t);
	}
	return {
		left: r,
		right: l
	};
}
function w(n, t, e) {
	return t === null ? n : (n === null || (t = u$3(n.key, t, e), t.left = n), t);
}
function _(n, t, e, r, l) {
	if (n) {
		r(`${t}${e ? "└── " : "├── "}${l(n)}
`);
		const i = t + (e ? "    " : "│   ");
		n.left && _(n.left, i, !1, r, l), n.right && _(n.right, i, !0, r, l);
	}
}
var z = class {
	constructor(t = d) {
		this._root = null, this._size = 0, this._comparator = t;
	}
	/**
	* Inserts a key, allows duplicates
	*/
	insert(t, e) {
		return this._size++, this._root = c(t, e, this._root, this._comparator);
	}
	/**
	* Adds a key, if it is not present in the tree
	*/
	add(t, e) {
		const r = new f(t, e);
		this._root === null && (r.left = r.right = null, this._size++, this._root = r);
		const l = this._comparator, i = u$3(t, this._root, l), o = l(t, i.key);
		return o === 0 ? this._root = i : (o < 0 ? (r.left = i.left, r.right = i, i.left = null) : o > 0 && (r.right = i.right, r.left = i, i.right = null), this._size++, this._root = r), this._root;
	}
	/**
	* @param  {Key} key
	* @return {Node|null}
	*/
	remove(t) {
		this._root = this._remove(t, this._root, this._comparator);
	}
	/**
	* Deletes i from the tree if it's there
	*/
	_remove(t, e, r) {
		let l;
		return e === null ? null : (e = u$3(t, e, r), r(t, e.key) === 0 ? (e.left === null ? l = e.right : (l = u$3(t, e.left, r), l.right = e.right), this._size--, l) : e);
	}
	/**
	* Removes and returns the node with smallest key
	*/
	pop() {
		let t = this._root;
		if (t) {
			for (; t.left;) t = t.left;
			return this._root = u$3(t.key, this._root, this._comparator), this._root = this._remove(t.key, this._root, this._comparator), {
				key: t.key,
				data: t.data
			};
		}
		return null;
	}
	/**
	* Find without splaying
	*/
	findStatic(t) {
		let e = this._root;
		const r = this._comparator;
		for (; e;) {
			const l = r(t, e.key);
			if (l === 0) return e;
			l < 0 ? e = e.left : e = e.right;
		}
		return null;
	}
	find(t) {
		return this._root && (this._root = u$3(t, this._root, this._comparator), this._comparator(t, this._root.key) !== 0) ? null : this._root;
	}
	contains(t) {
		let e = this._root;
		const r = this._comparator;
		for (; e;) {
			const l = r(t, e.key);
			if (l === 0) return !0;
			l < 0 ? e = e.left : e = e.right;
		}
		return !1;
	}
	forEach(t, e) {
		let r = this._root;
		const l = [];
		let i = !1;
		for (; !i;) r !== null ? (l.push(r), r = r.left) : l.length !== 0 ? (r = l.pop(), t.call(e, r), r = r.right) : i = !0;
		return this;
	}
	/**
	* Walk key range from `low` to `high`. Stops if `fn` returns a value.
	*/
	range(t, e, r, l) {
		const i = [], o = this._comparator;
		let s = this._root, h;
		for (; i.length !== 0 || s;) if (s) i.push(s), s = s.left;
		else {
			if (s = i.pop(), h = o(s.key, e), h > 0) break;
			if (o(s.key, t) >= 0 && r.call(l, s)) return this;
			s = s.right;
		}
		return this;
	}
	/**
	* Returns array of keys
	*/
	keys() {
		const t = [];
		return this.forEach(({ key: e }) => {
			t.push(e);
		}), t;
	}
	/**
	* Returns array of all the data in the nodes
	*/
	values() {
		const t = [];
		return this.forEach(({ data: e }) => {
			t.push(e);
		}), t;
	}
	min() {
		return this._root ? this.minNode(this._root).key : null;
	}
	max() {
		return this._root ? this.maxNode(this._root).key : null;
	}
	minNode(t = this._root) {
		if (t) for (; t.left;) t = t.left;
		return t;
	}
	maxNode(t = this._root) {
		if (t) for (; t.right;) t = t.right;
		return t;
	}
	/**
	* Returns node at given index
	*/
	at(t) {
		let e = this._root, r = !1, l = 0;
		const i = [];
		for (; !r;) if (e) i.push(e), e = e.left;
		else if (i.length > 0) {
			if (e = i.pop(), l === t) return e;
			l++, e = e.right;
		} else r = !0;
		return null;
	}
	next(t) {
		let e = this._root, r = null;
		if (t.right) {
			for (r = t.right; r.left;) r = r.left;
			return r;
		}
		const l = this._comparator;
		for (; e;) {
			const i = l(t.key, e.key);
			if (i === 0) break;
			i < 0 ? (r = e, e = e.left) : e = e.right;
		}
		return r;
	}
	prev(t) {
		let e = this._root, r = null;
		if (t.left !== null) {
			for (r = t.left; r.right;) r = r.right;
			return r;
		}
		const l = this._comparator;
		for (; e;) {
			const i = l(t.key, e.key);
			if (i === 0) break;
			i < 0 ? e = e.left : (r = e, e = e.right);
		}
		return r;
	}
	clear() {
		return this._root = null, this._size = 0, this;
	}
	toList() {
		return k(this._root);
	}
	/**
	* Bulk-load items. Both array have to be same size
	*/
	load(t, e = [], r = !1) {
		let l = t.length;
		const i = this._comparator;
		if (r && g(t, e, 0, l - 1, i), this._root === null) this._root = a(t, e, 0, l), this._size = l;
		else {
			const o = y(this.toList(), x(t, e), i);
			l = this._size + l, this._root = p({ head: o }, 0, l);
		}
		return this;
	}
	isEmpty() {
		return this._root === null;
	}
	get size() {
		return this._size;
	}
	get root() {
		return this._root;
	}
	toString(t = (e) => String(e.key)) {
		const e = [];
		return _(this._root, "", !0, (r) => e.push(r), t), e.join("");
	}
	update(t, e, r) {
		const l = this._comparator;
		let { left: i, right: o } = m(t, this._root, l);
		l(t, e) < 0 ? o = c(e, r, o, l) : i = c(e, r, i, l), this._root = w(i, o, l);
	}
	split(t) {
		return m(t, this._root, this._comparator);
	}
	*[Symbol.iterator]() {
		let t = this._root;
		const e = [];
		let r = !1;
		for (; !r;) t !== null ? (e.push(t), t = t.left) : e.length !== 0 ? (t = e.pop(), yield t, t = t.right) : r = !0;
	}
};
function a(n, t, e, r) {
	const l = r - e;
	if (l > 0) {
		const i = e + Math.floor(l / 2), o = n[i], s = t[i], h = new f(o, s);
		return h.left = a(n, t, e, i), h.right = a(n, t, i + 1, r), h;
	}
	return null;
}
function x(n, t) {
	const e = new f(null, null);
	let r = e;
	for (let l = 0; l < n.length; l++) r = r.next = new f(n[l], t[l]);
	return r.next = null, e.next;
}
function k(n) {
	let t = n;
	const e = [];
	let r = !1;
	const l = new f(null, null);
	let i = l;
	for (; !r;) t ? (e.push(t), t = t.left) : e.length > 0 ? (t = i = i.next = e.pop(), t = t.right) : r = !0;
	return i.next = null, l.next;
}
function p(n, t, e) {
	const r = e - t;
	if (r > 0) {
		const l = t + Math.floor(r / 2), i = p(n, t, l), o = n.head;
		return o.left = i, n.head = n.head.next, o.right = p(n, l + 1, e), o;
	}
	return null;
}
function y(n, t, e) {
	const r = new f(null, null);
	let l = r, i = n, o = t;
	for (; i !== null && o !== null;) e(i.key, o.key) < 0 ? (l.next = i, i = i.next) : (l.next = o, o = o.next), l = l.next;
	return i !== null ? l.next = i : o !== null && (l.next = o), r.next;
}
function g(n, t, e, r, l) {
	if (e >= r) return;
	const i = n[e + r >> 1];
	let o = e - 1, s = r + 1;
	for (;;) {
		do
			o++;
		while (l(n[o], i) < 0);
		do
			s--;
		while (l(n[s], i) > 0);
		if (o >= s) break;
		let h = n[o];
		n[o] = n[s], n[s] = h, h = t[o], t[o] = t[s], t[s] = h;
	}
	g(n, t, e, s, l), g(n, t, s + 1, r, l);
}
// node_modules/robust-predicates/esm/util.js
var epsilon$1 = 11102230246251565e-32;
var splitter = 134217729;
var resulterrbound = 3.000000000000001 * epsilon$1;
function sum(elen, e, flen, f, h) {
	let Q, Qnew, hh, bvirt;
	let enow = e[0];
	let fnow = f[0];
	let eindex = 0;
	let findex = 0;
	if (fnow > enow === fnow > -enow) {
		Q = enow;
		enow = e[++eindex];
	} else {
		Q = fnow;
		fnow = f[++findex];
	}
	let hindex = 0;
	if (eindex < elen && findex < flen) {
		if (fnow > enow === fnow > -enow) {
			Qnew = enow + Q;
			hh = Q - (Qnew - enow);
			enow = e[++eindex];
		} else {
			Qnew = fnow + Q;
			hh = Q - (Qnew - fnow);
			fnow = f[++findex];
		}
		Q = Qnew;
		if (hh !== 0) h[hindex++] = hh;
		while (eindex < elen && findex < flen) {
			if (fnow > enow === fnow > -enow) {
				Qnew = Q + enow;
				bvirt = Qnew - Q;
				hh = Q - (Qnew - bvirt) + (enow - bvirt);
				enow = e[++eindex];
			} else {
				Qnew = Q + fnow;
				bvirt = Qnew - Q;
				hh = Q - (Qnew - bvirt) + (fnow - bvirt);
				fnow = f[++findex];
			}
			Q = Qnew;
			if (hh !== 0) h[hindex++] = hh;
		}
	}
	while (eindex < elen) {
		Qnew = Q + enow;
		bvirt = Qnew - Q;
		hh = Q - (Qnew - bvirt) + (enow - bvirt);
		enow = e[++eindex];
		Q = Qnew;
		if (hh !== 0) h[hindex++] = hh;
	}
	while (findex < flen) {
		Qnew = Q + fnow;
		bvirt = Qnew - Q;
		hh = Q - (Qnew - bvirt) + (fnow - bvirt);
		fnow = f[++findex];
		Q = Qnew;
		if (hh !== 0) h[hindex++] = hh;
	}
	if (Q !== 0 || hindex === 0) h[hindex++] = Q;
	return hindex;
}
function estimate(elen, e) {
	let Q = e[0];
	for (let i = 1; i < elen; i++) Q += e[i];
	return Q;
}
function vec(n) {
	return new Float64Array(n);
}
// node_modules/robust-predicates/esm/orient2d.js
var ccwerrboundA = (3 + 16 * epsilon$1) * epsilon$1;
var ccwerrboundB = (2 + 12 * epsilon$1) * epsilon$1;
var ccwerrboundC = (9 + 64 * epsilon$1) * epsilon$1 * epsilon$1;
var B = vec(4);
var C1 = vec(8);
var C2 = vec(12);
var D = vec(16);
var u$2 = vec(4);
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
	let acxtail, acytail, bcxtail, bcytail;
	let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u3;
	const acx = ax - cx;
	const bcx = bx - cx;
	const acy = ay - cy;
	const bcy = by - cy;
	s1 = acx * bcy;
	c = splitter * acx;
	ahi = c - (c - acx);
	alo = acx - ahi;
	c = splitter * bcy;
	bhi = c - (c - bcy);
	blo = bcy - bhi;
	s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
	t1 = acy * bcx;
	c = splitter * acy;
	ahi = c - (c - acy);
	alo = acy - ahi;
	c = splitter * bcx;
	bhi = c - (c - bcx);
	blo = bcx - bhi;
	t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
	_i = s0 - t0;
	bvirt = s0 - _i;
	B[0] = s0 - (_i + bvirt) + (bvirt - t0);
	_j = s1 + _i;
	bvirt = _j - s1;
	_0 = s1 - (_j - bvirt) + (_i - bvirt);
	_i = _0 - t1;
	bvirt = _0 - _i;
	B[1] = _0 - (_i + bvirt) + (bvirt - t1);
	u3 = _j + _i;
	bvirt = u3 - _j;
	B[2] = _j - (u3 - bvirt) + (_i - bvirt);
	B[3] = u3;
	let det = estimate(4, B);
	let errbound = ccwerrboundB * detsum;
	if (det >= errbound || -det >= errbound) return det;
	bvirt = ax - acx;
	acxtail = ax - (acx + bvirt) + (bvirt - cx);
	bvirt = bx - bcx;
	bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
	bvirt = ay - acy;
	acytail = ay - (acy + bvirt) + (bvirt - cy);
	bvirt = by - bcy;
	bcytail = by - (bcy + bvirt) + (bvirt - cy);
	if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) return det;
	errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
	det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
	if (det >= errbound || -det >= errbound) return det;
	s1 = acxtail * bcy;
	c = splitter * acxtail;
	ahi = c - (c - acxtail);
	alo = acxtail - ahi;
	c = splitter * bcy;
	bhi = c - (c - bcy);
	blo = bcy - bhi;
	s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
	t1 = acytail * bcx;
	c = splitter * acytail;
	ahi = c - (c - acytail);
	alo = acytail - ahi;
	c = splitter * bcx;
	bhi = c - (c - bcx);
	blo = bcx - bhi;
	t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
	_i = s0 - t0;
	bvirt = s0 - _i;
	u$2[0] = s0 - (_i + bvirt) + (bvirt - t0);
	_j = s1 + _i;
	bvirt = _j - s1;
	_0 = s1 - (_j - bvirt) + (_i - bvirt);
	_i = _0 - t1;
	bvirt = _0 - _i;
	u$2[1] = _0 - (_i + bvirt) + (bvirt - t1);
	u3 = _j + _i;
	bvirt = u3 - _j;
	u$2[2] = _j - (u3 - bvirt) + (_i - bvirt);
	u$2[3] = u3;
	const C1len = sum(4, B, 4, u$2, C1);
	s1 = acx * bcytail;
	c = splitter * acx;
	ahi = c - (c - acx);
	alo = acx - ahi;
	c = splitter * bcytail;
	bhi = c - (c - bcytail);
	blo = bcytail - bhi;
	s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
	t1 = acy * bcxtail;
	c = splitter * acy;
	ahi = c - (c - acy);
	alo = acy - ahi;
	c = splitter * bcxtail;
	bhi = c - (c - bcxtail);
	blo = bcxtail - bhi;
	t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
	_i = s0 - t0;
	bvirt = s0 - _i;
	u$2[0] = s0 - (_i + bvirt) + (bvirt - t0);
	_j = s1 + _i;
	bvirt = _j - s1;
	_0 = s1 - (_j - bvirt) + (_i - bvirt);
	_i = _0 - t1;
	bvirt = _0 - _i;
	u$2[1] = _0 - (_i + bvirt) + (bvirt - t1);
	u3 = _j + _i;
	bvirt = u3 - _j;
	u$2[2] = _j - (u3 - bvirt) + (_i - bvirt);
	u$2[3] = u3;
	const C2len = sum(C1len, C1, 4, u$2, C2);
	s1 = acxtail * bcytail;
	c = splitter * acxtail;
	ahi = c - (c - acxtail);
	alo = acxtail - ahi;
	c = splitter * bcytail;
	bhi = c - (c - bcytail);
	blo = bcytail - bhi;
	s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
	t1 = acytail * bcxtail;
	c = splitter * acytail;
	ahi = c - (c - acytail);
	alo = acytail - ahi;
	c = splitter * bcxtail;
	bhi = c - (c - bcxtail);
	blo = bcxtail - bhi;
	t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
	_i = s0 - t0;
	bvirt = s0 - _i;
	u$2[0] = s0 - (_i + bvirt) + (bvirt - t0);
	_j = s1 + _i;
	bvirt = _j - s1;
	_0 = s1 - (_j - bvirt) + (_i - bvirt);
	_i = _0 - t1;
	bvirt = _0 - _i;
	u$2[1] = _0 - (_i + bvirt) + (bvirt - t1);
	u3 = _j + _i;
	bvirt = u3 - _j;
	u$2[2] = _j - (u3 - bvirt) + (_i - bvirt);
	u$2[3] = u3;
	return D[sum(C2len, C2, 4, u$2, D) - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
	const detleft = (ay - cy) * (bx - cx);
	const detright = (ax - cx) * (by - cy);
	const det = detleft - detright;
	const detsum = Math.abs(detleft + detright);
	if (Math.abs(det) >= ccwerrboundA * detsum) return det;
	return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(8);
vec(8);
vec(8);
vec(4);
vec(8);
vec(8);
vec(16);
vec(12);
vec(192);
vec(192);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(8);
vec(8);
vec(8);
vec(8);
vec(8);
vec(8);
vec(8);
vec(8);
vec(8);
vec(4);
vec(4);
vec(4);
vec(8);
vec(16);
vec(16);
vec(16);
vec(32);
vec(32);
vec(48);
vec(64);
vec(1152);
vec(1152);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(4);
vec(24);
vec(24);
vec(24);
vec(24);
vec(24);
vec(24);
vec(24);
vec(24);
vec(24);
vec(24);
vec(1152);
vec(1152);
vec(1152);
vec(1152);
vec(1152);
vec(2304);
vec(2304);
vec(3456);
vec(5760);
vec(8);
vec(8);
vec(8);
vec(16);
vec(24);
vec(48);
vec(48);
vec(96);
vec(192);
vec(384);
vec(384);
vec(384);
vec(768);
vec(96);
vec(96);
vec(96);
vec(1152);
// node_modules/polygon-clipping/dist/polygon-clipping.esm.js
/**
* A bounding box has the format:
*
*  { ll: { x: xmin, y: ymin }, ur: { x: xmax, y: ymax } }
*
*/
var isInBbox = (bbox, point) => {
	return bbox.ll.x <= point.x && point.x <= bbox.ur.x && bbox.ll.y <= point.y && point.y <= bbox.ur.y;
};
var getBboxOverlap = (b1, b2) => {
	if (b2.ur.x < b1.ll.x || b1.ur.x < b2.ll.x || b2.ur.y < b1.ll.y || b1.ur.y < b2.ll.y) return null;
	const lowerX = b1.ll.x < b2.ll.x ? b2.ll.x : b1.ll.x;
	const upperX = b1.ur.x < b2.ur.x ? b1.ur.x : b2.ur.x;
	const lowerY = b1.ll.y < b2.ll.y ? b2.ll.y : b1.ll.y;
	const upperY = b1.ur.y < b2.ur.y ? b1.ur.y : b2.ur.y;
	return {
		ll: {
			x: lowerX,
			y: lowerY
		},
		ur: {
			x: upperX,
			y: upperY
		}
	};
};
var epsilon = Number.EPSILON;
if (epsilon === void 0) epsilon = Math.pow(2, -52);
var EPSILON_SQ = epsilon * epsilon;
var cmp = (a, b) => {
	if (-epsilon < a && a < epsilon) {
		if (-epsilon < b && b < epsilon) return 0;
	}
	const ab = a - b;
	if (ab * ab < EPSILON_SQ * a * b) return 0;
	return a < b ? -1 : 1;
};
/**
* This class rounds incoming values sufficiently so that
* floating points problems are, for the most part, avoided.
*
* Incoming points are have their x & y values tested against
* all previously seen x & y values. If either is 'too close'
* to a previously seen value, it's value is 'snapped' to the
* previously seen value.
*
* All points should be rounded by this class before being
* stored in any data structures in the rest of this algorithm.
*/
var PtRounder = class {
	constructor() {
		this.reset();
	}
	reset() {
		this.xRounder = new CoordRounder();
		this.yRounder = new CoordRounder();
	}
	round(x, y) {
		return {
			x: this.xRounder.round(x),
			y: this.yRounder.round(y)
		};
	}
};
var CoordRounder = class {
	constructor() {
		this.tree = new z();
		this.round(0);
	}
	round(coord) {
		const node = this.tree.add(coord);
		const prevNode = this.tree.prev(node);
		if (prevNode !== null && cmp(node.key, prevNode.key) === 0) {
			this.tree.remove(coord);
			return prevNode.key;
		}
		const nextNode = this.tree.next(node);
		if (nextNode !== null && cmp(node.key, nextNode.key) === 0) {
			this.tree.remove(coord);
			return nextNode.key;
		}
		return coord;
	}
};
var rounder = new PtRounder();
var crossProduct = (a, b) => a.x * b.y - a.y * b.x;
var dotProduct = (a, b) => a.x * b.x + a.y * b.y;
var compareVectorAngles = (basePt, endPt1, endPt2) => {
	const res = orient2d(basePt.x, basePt.y, endPt1.x, endPt1.y, endPt2.x, endPt2.y);
	if (res > 0) return -1;
	if (res < 0) return 1;
	return 0;
};
var length = (v) => Math.sqrt(dotProduct(v, v));
var sineOfAngle = (pShared, pBase, pAngle) => {
	const vBase = {
		x: pBase.x - pShared.x,
		y: pBase.y - pShared.y
	};
	const vAngle = {
		x: pAngle.x - pShared.x,
		y: pAngle.y - pShared.y
	};
	return crossProduct(vAngle, vBase) / length(vAngle) / length(vBase);
};
var cosineOfAngle = (pShared, pBase, pAngle) => {
	const vBase = {
		x: pBase.x - pShared.x,
		y: pBase.y - pShared.y
	};
	const vAngle = {
		x: pAngle.x - pShared.x,
		y: pAngle.y - pShared.y
	};
	return dotProduct(vAngle, vBase) / length(vAngle) / length(vBase);
};
var horizontalIntersection = (pt, v, y) => {
	if (v.y === 0) return null;
	return {
		x: pt.x + v.x / v.y * (y - pt.y),
		y
	};
};
var verticalIntersection = (pt, v, x) => {
	if (v.x === 0) return null;
	return {
		x,
		y: pt.y + v.y / v.x * (x - pt.x)
	};
};
var intersection$1 = (pt1, v1, pt2, v2) => {
	if (v1.x === 0) return verticalIntersection(pt2, v2, pt1.x);
	if (v2.x === 0) return verticalIntersection(pt1, v1, pt2.x);
	if (v1.y === 0) return horizontalIntersection(pt2, v2, pt1.y);
	if (v2.y === 0) return horizontalIntersection(pt1, v1, pt2.y);
	const kross = crossProduct(v1, v2);
	if (kross == 0) return null;
	const ve = {
		x: pt2.x - pt1.x,
		y: pt2.y - pt1.y
	};
	const d1 = crossProduct(ve, v1) / kross;
	const d2 = crossProduct(ve, v2) / kross;
	const x1 = pt1.x + d2 * v1.x, x2 = pt2.x + d1 * v2.x;
	const y1 = pt1.y + d2 * v1.y, y2 = pt2.y + d1 * v2.y;
	return {
		x: (x1 + x2) / 2,
		y: (y1 + y2) / 2
	};
};
var SweepEvent = class SweepEvent {
	static compare(a, b) {
		const ptCmp = SweepEvent.comparePoints(a.point, b.point);
		if (ptCmp !== 0) return ptCmp;
		if (a.point !== b.point) a.link(b);
		if (a.isLeft !== b.isLeft) return a.isLeft ? 1 : -1;
		return Segment.compare(a.segment, b.segment);
	}
	static comparePoints(aPt, bPt) {
		if (aPt.x < bPt.x) return -1;
		if (aPt.x > bPt.x) return 1;
		if (aPt.y < bPt.y) return -1;
		if (aPt.y > bPt.y) return 1;
		return 0;
	}
	constructor(point, isLeft) {
		if (point.events === void 0) point.events = [this];
		else point.events.push(this);
		this.point = point;
		this.isLeft = isLeft;
	}
	link(other) {
		if (other.point === this.point) throw new Error("Tried to link already linked events");
		const otherEvents = other.point.events;
		for (let i = 0, iMax = otherEvents.length; i < iMax; i++) {
			const evt = otherEvents[i];
			this.point.events.push(evt);
			evt.point = this.point;
		}
		this.checkForConsuming();
	}
	checkForConsuming() {
		const numEvents = this.point.events.length;
		for (let i = 0; i < numEvents; i++) {
			const evt1 = this.point.events[i];
			if (evt1.segment.consumedBy !== void 0) continue;
			for (let j = i + 1; j < numEvents; j++) {
				const evt2 = this.point.events[j];
				if (evt2.consumedBy !== void 0) continue;
				if (evt1.otherSE.point.events !== evt2.otherSE.point.events) continue;
				evt1.segment.consume(evt2.segment);
			}
		}
	}
	getAvailableLinkedEvents() {
		const events = [];
		for (let i = 0, iMax = this.point.events.length; i < iMax; i++) {
			const evt = this.point.events[i];
			if (evt !== this && !evt.segment.ringOut && evt.segment.isInResult()) events.push(evt);
		}
		return events;
	}
	/**
	* Returns a comparator function for sorting linked events that will
	* favor the event that will give us the smallest left-side angle.
	* All ring construction starts as low as possible heading to the right,
	* so by always turning left as sharp as possible we'll get polygons
	* without uncessary loops & holes.
	*
	* The comparator function has a compute cache such that it avoids
	* re-computing already-computed values.
	*/
	getLeftmostComparator(baseEvent) {
		const cache = /* @__PURE__ */ new Map();
		const fillCache = (linkedEvent) => {
			const nextEvent = linkedEvent.otherSE;
			cache.set(linkedEvent, {
				sine: sineOfAngle(this.point, baseEvent.point, nextEvent.point),
				cosine: cosineOfAngle(this.point, baseEvent.point, nextEvent.point)
			});
		};
		return (a, b) => {
			if (!cache.has(a)) fillCache(a);
			if (!cache.has(b)) fillCache(b);
			const { sine: asine, cosine: acosine } = cache.get(a);
			const { sine: bsine, cosine: bcosine } = cache.get(b);
			if (asine >= 0 && bsine >= 0) {
				if (acosine < bcosine) return 1;
				if (acosine > bcosine) return -1;
				return 0;
			}
			if (asine < 0 && bsine < 0) {
				if (acosine < bcosine) return -1;
				if (acosine > bcosine) return 1;
				return 0;
			}
			if (bsine < asine) return -1;
			if (bsine > asine) return 1;
			return 0;
		};
	}
};
var segmentId = 0;
var Segment = class Segment {
	static compare(a, b) {
		const alx = a.leftSE.point.x;
		const blx = b.leftSE.point.x;
		const arx = a.rightSE.point.x;
		const brx = b.rightSE.point.x;
		if (brx < alx) return 1;
		if (arx < blx) return -1;
		const aly = a.leftSE.point.y;
		const bly = b.leftSE.point.y;
		const ary = a.rightSE.point.y;
		const bry = b.rightSE.point.y;
		if (alx < blx) {
			if (bly < aly && bly < ary) return 1;
			if (bly > aly && bly > ary) return -1;
			const aCmpBLeft = a.comparePoint(b.leftSE.point);
			if (aCmpBLeft < 0) return 1;
			if (aCmpBLeft > 0) return -1;
			const bCmpARight = b.comparePoint(a.rightSE.point);
			if (bCmpARight !== 0) return bCmpARight;
			return -1;
		}
		if (alx > blx) {
			if (aly < bly && aly < bry) return -1;
			if (aly > bly && aly > bry) return 1;
			const bCmpALeft = b.comparePoint(a.leftSE.point);
			if (bCmpALeft !== 0) return bCmpALeft;
			const aCmpBRight = a.comparePoint(b.rightSE.point);
			if (aCmpBRight < 0) return 1;
			if (aCmpBRight > 0) return -1;
			return 1;
		}
		if (aly < bly) return -1;
		if (aly > bly) return 1;
		if (arx < brx) {
			const bCmpARight = b.comparePoint(a.rightSE.point);
			if (bCmpARight !== 0) return bCmpARight;
		}
		if (arx > brx) {
			const aCmpBRight = a.comparePoint(b.rightSE.point);
			if (aCmpBRight < 0) return 1;
			if (aCmpBRight > 0) return -1;
		}
		if (arx !== brx) {
			const ay = ary - aly;
			const ax = arx - alx;
			const by = bry - bly;
			const bx = brx - blx;
			if (ay > ax && by < bx) return 1;
			if (ay < ax && by > bx) return -1;
		}
		if (arx > brx) return 1;
		if (arx < brx) return -1;
		if (ary < bry) return -1;
		if (ary > bry) return 1;
		if (a.id < b.id) return -1;
		if (a.id > b.id) return 1;
		return 0;
	}
	constructor(leftSE, rightSE, rings, windings) {
		this.id = ++segmentId;
		this.leftSE = leftSE;
		leftSE.segment = this;
		leftSE.otherSE = rightSE;
		this.rightSE = rightSE;
		rightSE.segment = this;
		rightSE.otherSE = leftSE;
		this.rings = rings;
		this.windings = windings;
	}
	static fromRing(pt1, pt2, ring) {
		let leftPt, rightPt, winding;
		const cmpPts = SweepEvent.comparePoints(pt1, pt2);
		if (cmpPts < 0) {
			leftPt = pt1;
			rightPt = pt2;
			winding = 1;
		} else if (cmpPts > 0) {
			leftPt = pt2;
			rightPt = pt1;
			winding = -1;
		} else throw new Error(`Tried to create degenerate segment at [${pt1.x}, ${pt1.y}]`);
		const leftSE = new SweepEvent(leftPt, true);
		const rightSE = new SweepEvent(rightPt, false);
		return new Segment(leftSE, rightSE, [ring], [winding]);
	}
	replaceRightSE(newRightSE) {
		this.rightSE = newRightSE;
		this.rightSE.segment = this;
		this.rightSE.otherSE = this.leftSE;
		this.leftSE.otherSE = this.rightSE;
	}
	bbox() {
		const y1 = this.leftSE.point.y;
		const y2 = this.rightSE.point.y;
		return {
			ll: {
				x: this.leftSE.point.x,
				y: y1 < y2 ? y1 : y2
			},
			ur: {
				x: this.rightSE.point.x,
				y: y1 > y2 ? y1 : y2
			}
		};
	}
	vector() {
		return {
			x: this.rightSE.point.x - this.leftSE.point.x,
			y: this.rightSE.point.y - this.leftSE.point.y
		};
	}
	isAnEndpoint(pt) {
		return pt.x === this.leftSE.point.x && pt.y === this.leftSE.point.y || pt.x === this.rightSE.point.x && pt.y === this.rightSE.point.y;
	}
	comparePoint(point) {
		if (this.isAnEndpoint(point)) return 0;
		const lPt = this.leftSE.point;
		const rPt = this.rightSE.point;
		const v = this.vector();
		if (lPt.x === rPt.x) {
			if (point.x === lPt.x) return 0;
			return point.x < lPt.x ? 1 : -1;
		}
		const yDist = (point.y - lPt.y) / v.y;
		const xFromYDist = lPt.x + yDist * v.x;
		if (point.x === xFromYDist) return 0;
		const xDist = (point.x - lPt.x) / v.x;
		const yFromXDist = lPt.y + xDist * v.y;
		if (point.y === yFromXDist) return 0;
		return point.y < yFromXDist ? -1 : 1;
	}
	/**
	* Given another segment, returns the first non-trivial intersection
	* between the two segments (in terms of sweep line ordering), if it exists.
	*
	* A 'non-trivial' intersection is one that will cause one or both of the
	* segments to be split(). As such, 'trivial' vs. 'non-trivial' intersection:
	*
	*   * endpoint of segA with endpoint of segB --> trivial
	*   * endpoint of segA with point along segB --> non-trivial
	*   * endpoint of segB with point along segA --> non-trivial
	*   * point along segA with point along segB --> non-trivial
	*
	* If no non-trivial intersection exists, return null
	* Else, return null.
	*/
	getIntersection(other) {
		const tBbox = this.bbox();
		const oBbox = other.bbox();
		const bboxOverlap = getBboxOverlap(tBbox, oBbox);
		if (bboxOverlap === null) return null;
		const tlp = this.leftSE.point;
		const trp = this.rightSE.point;
		const olp = other.leftSE.point;
		const orp = other.rightSE.point;
		const touchesOtherLSE = isInBbox(tBbox, olp) && this.comparePoint(olp) === 0;
		const touchesThisLSE = isInBbox(oBbox, tlp) && other.comparePoint(tlp) === 0;
		const touchesOtherRSE = isInBbox(tBbox, orp) && this.comparePoint(orp) === 0;
		const touchesThisRSE = isInBbox(oBbox, trp) && other.comparePoint(trp) === 0;
		if (touchesThisLSE && touchesOtherLSE) {
			if (touchesThisRSE && !touchesOtherRSE) return trp;
			if (!touchesThisRSE && touchesOtherRSE) return orp;
			return null;
		}
		if (touchesThisLSE) {
			if (touchesOtherRSE) {
				if (tlp.x === orp.x && tlp.y === orp.y) return null;
			}
			return tlp;
		}
		if (touchesOtherLSE) {
			if (touchesThisRSE) {
				if (trp.x === olp.x && trp.y === olp.y) return null;
			}
			return olp;
		}
		if (touchesThisRSE && touchesOtherRSE) return null;
		if (touchesThisRSE) return trp;
		if (touchesOtherRSE) return orp;
		const pt = intersection$1(tlp, this.vector(), olp, other.vector());
		if (pt === null) return null;
		if (!isInBbox(bboxOverlap, pt)) return null;
		return rounder.round(pt.x, pt.y);
	}
	/**
	* Split the given segment into multiple segments on the given points.
	*  * Each existing segment will retain its leftSE and a new rightSE will be
	*    generated for it.
	*  * A new segment will be generated which will adopt the original segment's
	*    rightSE, and a new leftSE will be generated for it.
	*  * If there are more than two points given to split on, new segments
	*    in the middle will be generated with new leftSE and rightSE's.
	*  * An array of the newly generated SweepEvents will be returned.
	*
	* Warning: input array of points is modified
	*/
	split(point) {
		const newEvents = [];
		const alreadyLinked = point.events !== void 0;
		const newLeftSE = new SweepEvent(point, true);
		const newRightSE = new SweepEvent(point, false);
		const oldRightSE = this.rightSE;
		this.replaceRightSE(newRightSE);
		newEvents.push(newRightSE);
		newEvents.push(newLeftSE);
		const newSeg = new Segment(newLeftSE, oldRightSE, this.rings.slice(), this.windings.slice());
		if (SweepEvent.comparePoints(newSeg.leftSE.point, newSeg.rightSE.point) > 0) newSeg.swapEvents();
		if (SweepEvent.comparePoints(this.leftSE.point, this.rightSE.point) > 0) this.swapEvents();
		if (alreadyLinked) {
			newLeftSE.checkForConsuming();
			newRightSE.checkForConsuming();
		}
		return newEvents;
	}
	swapEvents() {
		const tmpEvt = this.rightSE;
		this.rightSE = this.leftSE;
		this.leftSE = tmpEvt;
		this.leftSE.isLeft = true;
		this.rightSE.isLeft = false;
		for (let i = 0, iMax = this.windings.length; i < iMax; i++) this.windings[i] *= -1;
	}
	consume(other) {
		let consumer = this;
		let consumee = other;
		while (consumer.consumedBy) consumer = consumer.consumedBy;
		while (consumee.consumedBy) consumee = consumee.consumedBy;
		const cmp = Segment.compare(consumer, consumee);
		if (cmp === 0) return;
		if (cmp > 0) {
			const tmp = consumer;
			consumer = consumee;
			consumee = tmp;
		}
		if (consumer.prev === consumee) {
			const tmp = consumer;
			consumer = consumee;
			consumee = tmp;
		}
		for (let i = 0, iMax = consumee.rings.length; i < iMax; i++) {
			const ring = consumee.rings[i];
			const winding = consumee.windings[i];
			const index = consumer.rings.indexOf(ring);
			if (index === -1) {
				consumer.rings.push(ring);
				consumer.windings.push(winding);
			} else consumer.windings[index] += winding;
		}
		consumee.rings = null;
		consumee.windings = null;
		consumee.consumedBy = consumer;
		consumee.leftSE.consumedBy = consumer.leftSE;
		consumee.rightSE.consumedBy = consumer.rightSE;
	}
	prevInResult() {
		if (this._prevInResult !== void 0) return this._prevInResult;
		if (!this.prev) this._prevInResult = null;
		else if (this.prev.isInResult()) this._prevInResult = this.prev;
		else this._prevInResult = this.prev.prevInResult();
		return this._prevInResult;
	}
	beforeState() {
		if (this._beforeState !== void 0) return this._beforeState;
		if (!this.prev) this._beforeState = {
			rings: [],
			windings: [],
			multiPolys: []
		};
		else {
			const seg = this.prev.consumedBy || this.prev;
			this._beforeState = seg.afterState();
		}
		return this._beforeState;
	}
	afterState() {
		if (this._afterState !== void 0) return this._afterState;
		const beforeState = this.beforeState();
		this._afterState = {
			rings: beforeState.rings.slice(0),
			windings: beforeState.windings.slice(0),
			multiPolys: []
		};
		const ringsAfter = this._afterState.rings;
		const windingsAfter = this._afterState.windings;
		const mpsAfter = this._afterState.multiPolys;
		for (let i = 0, iMax = this.rings.length; i < iMax; i++) {
			const ring = this.rings[i];
			const winding = this.windings[i];
			const index = ringsAfter.indexOf(ring);
			if (index === -1) {
				ringsAfter.push(ring);
				windingsAfter.push(winding);
			} else windingsAfter[index] += winding;
		}
		const polysAfter = [];
		const polysExclude = [];
		for (let i = 0, iMax = ringsAfter.length; i < iMax; i++) {
			if (windingsAfter[i] === 0) continue;
			const ring = ringsAfter[i];
			const poly = ring.poly;
			if (polysExclude.indexOf(poly) !== -1) continue;
			if (ring.isExterior) polysAfter.push(poly);
			else {
				if (polysExclude.indexOf(poly) === -1) polysExclude.push(poly);
				const index = polysAfter.indexOf(ring.poly);
				if (index !== -1) polysAfter.splice(index, 1);
			}
		}
		for (let i = 0, iMax = polysAfter.length; i < iMax; i++) {
			const mp = polysAfter[i].multiPoly;
			if (mpsAfter.indexOf(mp) === -1) mpsAfter.push(mp);
		}
		return this._afterState;
	}
	isInResult() {
		if (this.consumedBy) return false;
		if (this._isInResult !== void 0) return this._isInResult;
		const mpsBefore = this.beforeState().multiPolys;
		const mpsAfter = this.afterState().multiPolys;
		switch (operation.type) {
			case "union": {
				const noBefores = mpsBefore.length === 0;
				const noAfters = mpsAfter.length === 0;
				this._isInResult = noBefores !== noAfters;
				break;
			}
			case "intersection": {
				let least;
				let most;
				if (mpsBefore.length < mpsAfter.length) {
					least = mpsBefore.length;
					most = mpsAfter.length;
				} else {
					least = mpsAfter.length;
					most = mpsBefore.length;
				}
				this._isInResult = most === operation.numMultiPolys && least < most;
				break;
			}
			case "xor": {
				const diff = Math.abs(mpsBefore.length - mpsAfter.length);
				this._isInResult = diff % 2 === 1;
				break;
			}
			case "difference": {
				const isJustSubject = (mps) => mps.length === 1 && mps[0].isSubject;
				this._isInResult = isJustSubject(mpsBefore) !== isJustSubject(mpsAfter);
				break;
			}
			default: throw new Error(`Unrecognized operation type found ${operation.type}`);
		}
		return this._isInResult;
	}
};
var RingIn = class {
	constructor(geomRing, poly, isExterior) {
		if (!Array.isArray(geomRing) || geomRing.length === 0) throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
		this.poly = poly;
		this.isExterior = isExterior;
		this.segments = [];
		if (typeof geomRing[0][0] !== "number" || typeof geomRing[0][1] !== "number") throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
		const firstPoint = rounder.round(geomRing[0][0], geomRing[0][1]);
		this.bbox = {
			ll: {
				x: firstPoint.x,
				y: firstPoint.y
			},
			ur: {
				x: firstPoint.x,
				y: firstPoint.y
			}
		};
		let prevPoint = firstPoint;
		for (let i = 1, iMax = geomRing.length; i < iMax; i++) {
			if (typeof geomRing[i][0] !== "number" || typeof geomRing[i][1] !== "number") throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
			let point = rounder.round(geomRing[i][0], geomRing[i][1]);
			if (point.x === prevPoint.x && point.y === prevPoint.y) continue;
			this.segments.push(Segment.fromRing(prevPoint, point, this));
			if (point.x < this.bbox.ll.x) this.bbox.ll.x = point.x;
			if (point.y < this.bbox.ll.y) this.bbox.ll.y = point.y;
			if (point.x > this.bbox.ur.x) this.bbox.ur.x = point.x;
			if (point.y > this.bbox.ur.y) this.bbox.ur.y = point.y;
			prevPoint = point;
		}
		if (firstPoint.x !== prevPoint.x || firstPoint.y !== prevPoint.y) this.segments.push(Segment.fromRing(prevPoint, firstPoint, this));
	}
	getSweepEvents() {
		const sweepEvents = [];
		for (let i = 0, iMax = this.segments.length; i < iMax; i++) {
			const segment = this.segments[i];
			sweepEvents.push(segment.leftSE);
			sweepEvents.push(segment.rightSE);
		}
		return sweepEvents;
	}
};
var PolyIn = class {
	constructor(geomPoly, multiPoly) {
		if (!Array.isArray(geomPoly)) throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
		this.exteriorRing = new RingIn(geomPoly[0], this, true);
		this.bbox = {
			ll: {
				x: this.exteriorRing.bbox.ll.x,
				y: this.exteriorRing.bbox.ll.y
			},
			ur: {
				x: this.exteriorRing.bbox.ur.x,
				y: this.exteriorRing.bbox.ur.y
			}
		};
		this.interiorRings = [];
		for (let i = 1, iMax = geomPoly.length; i < iMax; i++) {
			const ring = new RingIn(geomPoly[i], this, false);
			if (ring.bbox.ll.x < this.bbox.ll.x) this.bbox.ll.x = ring.bbox.ll.x;
			if (ring.bbox.ll.y < this.bbox.ll.y) this.bbox.ll.y = ring.bbox.ll.y;
			if (ring.bbox.ur.x > this.bbox.ur.x) this.bbox.ur.x = ring.bbox.ur.x;
			if (ring.bbox.ur.y > this.bbox.ur.y) this.bbox.ur.y = ring.bbox.ur.y;
			this.interiorRings.push(ring);
		}
		this.multiPoly = multiPoly;
	}
	getSweepEvents() {
		const sweepEvents = this.exteriorRing.getSweepEvents();
		for (let i = 0, iMax = this.interiorRings.length; i < iMax; i++) {
			const ringSweepEvents = this.interiorRings[i].getSweepEvents();
			for (let j = 0, jMax = ringSweepEvents.length; j < jMax; j++) sweepEvents.push(ringSweepEvents[j]);
		}
		return sweepEvents;
	}
};
var MultiPolyIn = class {
	constructor(geom, isSubject) {
		if (!Array.isArray(geom)) throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
		try {
			if (typeof geom[0][0][0] === "number") geom = [geom];
		} catch (ex) {}
		this.polys = [];
		this.bbox = {
			ll: {
				x: Number.POSITIVE_INFINITY,
				y: Number.POSITIVE_INFINITY
			},
			ur: {
				x: Number.NEGATIVE_INFINITY,
				y: Number.NEGATIVE_INFINITY
			}
		};
		for (let i = 0, iMax = geom.length; i < iMax; i++) {
			const poly = new PolyIn(geom[i], this);
			if (poly.bbox.ll.x < this.bbox.ll.x) this.bbox.ll.x = poly.bbox.ll.x;
			if (poly.bbox.ll.y < this.bbox.ll.y) this.bbox.ll.y = poly.bbox.ll.y;
			if (poly.bbox.ur.x > this.bbox.ur.x) this.bbox.ur.x = poly.bbox.ur.x;
			if (poly.bbox.ur.y > this.bbox.ur.y) this.bbox.ur.y = poly.bbox.ur.y;
			this.polys.push(poly);
		}
		this.isSubject = isSubject;
	}
	getSweepEvents() {
		const sweepEvents = [];
		for (let i = 0, iMax = this.polys.length; i < iMax; i++) {
			const polySweepEvents = this.polys[i].getSweepEvents();
			for (let j = 0, jMax = polySweepEvents.length; j < jMax; j++) sweepEvents.push(polySweepEvents[j]);
		}
		return sweepEvents;
	}
};
var RingOut = class RingOut {
	static factory(allSegments) {
		const ringsOut = [];
		for (let i = 0, iMax = allSegments.length; i < iMax; i++) {
			const segment = allSegments[i];
			if (!segment.isInResult() || segment.ringOut) continue;
			let prevEvent = null;
			let event = segment.leftSE;
			let nextEvent = segment.rightSE;
			const events = [event];
			const startingPoint = event.point;
			const intersectionLEs = [];
			while (true) {
				prevEvent = event;
				event = nextEvent;
				events.push(event);
				if (event.point === startingPoint) break;
				while (true) {
					const availableLEs = event.getAvailableLinkedEvents();
					if (availableLEs.length === 0) {
						const firstPt = events[0].point;
						const lastPt = events[events.length - 1].point;
						throw new Error(`Unable to complete output ring starting at [${firstPt.x}, ${firstPt.y}]. Last matching segment found ends at [${lastPt.x}, ${lastPt.y}].`);
					}
					if (availableLEs.length === 1) {
						nextEvent = availableLEs[0].otherSE;
						break;
					}
					let indexLE = null;
					for (let j = 0, jMax = intersectionLEs.length; j < jMax; j++) if (intersectionLEs[j].point === event.point) {
						indexLE = j;
						break;
					}
					if (indexLE !== null) {
						const intersectionLE = intersectionLEs.splice(indexLE)[0];
						const ringEvents = events.splice(intersectionLE.index);
						ringEvents.unshift(ringEvents[0].otherSE);
						ringsOut.push(new RingOut(ringEvents.reverse()));
						continue;
					}
					intersectionLEs.push({
						index: events.length,
						point: event.point
					});
					const comparator = event.getLeftmostComparator(prevEvent);
					nextEvent = availableLEs.sort(comparator)[0].otherSE;
					break;
				}
			}
			ringsOut.push(new RingOut(events));
		}
		return ringsOut;
	}
	constructor(events) {
		this.events = events;
		for (let i = 0, iMax = events.length; i < iMax; i++) events[i].segment.ringOut = this;
		this.poly = null;
	}
	getGeom() {
		let prevPt = this.events[0].point;
		const points = [prevPt];
		for (let i = 1, iMax = this.events.length - 1; i < iMax; i++) {
			const pt = this.events[i].point;
			const nextPt = this.events[i + 1].point;
			if (compareVectorAngles(pt, prevPt, nextPt) === 0) continue;
			points.push(pt);
			prevPt = pt;
		}
		if (points.length === 1) return null;
		const pt = points[0];
		const nextPt = points[1];
		if (compareVectorAngles(pt, prevPt, nextPt) === 0) points.shift();
		points.push(points[0]);
		const step = this.isExteriorRing() ? 1 : -1;
		const iStart = this.isExteriorRing() ? 0 : points.length - 1;
		const iEnd = this.isExteriorRing() ? points.length : -1;
		const orderedPoints = [];
		for (let i = iStart; i != iEnd; i += step) orderedPoints.push([points[i].x, points[i].y]);
		return orderedPoints;
	}
	isExteriorRing() {
		if (this._isExteriorRing === void 0) {
			const enclosing = this.enclosingRing();
			this._isExteriorRing = enclosing ? !enclosing.isExteriorRing() : true;
		}
		return this._isExteriorRing;
	}
	enclosingRing() {
		if (this._enclosingRing === void 0) this._enclosingRing = this._calcEnclosingRing();
		return this._enclosingRing;
	}
	_calcEnclosingRing() {
		let leftMostEvt = this.events[0];
		for (let i = 1, iMax = this.events.length; i < iMax; i++) {
			const evt = this.events[i];
			if (SweepEvent.compare(leftMostEvt, evt) > 0) leftMostEvt = evt;
		}
		let prevSeg = leftMostEvt.segment.prevInResult();
		let prevPrevSeg = prevSeg ? prevSeg.prevInResult() : null;
		while (true) {
			if (!prevSeg) return null;
			if (!prevPrevSeg) return prevSeg.ringOut;
			if (prevPrevSeg.ringOut !== prevSeg.ringOut) {
				if (prevPrevSeg.ringOut.enclosingRing() !== prevSeg.ringOut) return prevSeg.ringOut;
				else return prevSeg.ringOut.enclosingRing();
			}
			prevSeg = prevPrevSeg.prevInResult();
			prevPrevSeg = prevSeg ? prevSeg.prevInResult() : null;
		}
	}
};
var PolyOut = class {
	constructor(exteriorRing) {
		this.exteriorRing = exteriorRing;
		exteriorRing.poly = this;
		this.interiorRings = [];
	}
	addInterior(ring) {
		this.interiorRings.push(ring);
		ring.poly = this;
	}
	getGeom() {
		const geom = [this.exteriorRing.getGeom()];
		if (geom[0] === null) return null;
		for (let i = 0, iMax = this.interiorRings.length; i < iMax; i++) {
			const ringGeom = this.interiorRings[i].getGeom();
			if (ringGeom === null) continue;
			geom.push(ringGeom);
		}
		return geom;
	}
};
var MultiPolyOut = class {
	constructor(rings) {
		this.rings = rings;
		this.polys = this._composePolys(rings);
	}
	getGeom() {
		const geom = [];
		for (let i = 0, iMax = this.polys.length; i < iMax; i++) {
			const polyGeom = this.polys[i].getGeom();
			if (polyGeom === null) continue;
			geom.push(polyGeom);
		}
		return geom;
	}
	_composePolys(rings) {
		const polys = [];
		for (let i = 0, iMax = rings.length; i < iMax; i++) {
			const ring = rings[i];
			if (ring.poly) continue;
			if (ring.isExteriorRing()) polys.push(new PolyOut(ring));
			else {
				const enclosingRing = ring.enclosingRing();
				if (!enclosingRing.poly) polys.push(new PolyOut(enclosingRing));
				enclosingRing.poly.addInterior(ring);
			}
		}
		return polys;
	}
};
/**
* NOTE:  We must be careful not to change any segments while
*        they are in the SplayTree. AFAIK, there's no way to tell
*        the tree to rebalance itself - thus before splitting
*        a segment that's in the tree, we remove it from the tree,
*        do the split, then re-insert it. (Even though splitting a
*        segment *shouldn't* change its correct position in the
*        sweep line tree, the reality is because of rounding errors,
*        it sometimes does.)
*/
var SweepLine = class {
	constructor(queue) {
		let comparator = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Segment.compare;
		this.queue = queue;
		this.tree = new z(comparator);
		this.segments = [];
	}
	process(event) {
		const segment = event.segment;
		const newEvents = [];
		if (event.consumedBy) {
			if (event.isLeft) this.queue.remove(event.otherSE);
			else this.tree.remove(segment);
			return newEvents;
		}
		const node = event.isLeft ? this.tree.add(segment) : this.tree.find(segment);
		if (!node) throw new Error(`Unable to find segment #${segment.id} [${segment.leftSE.point.x}, ${segment.leftSE.point.y}] -> [${segment.rightSE.point.x}, ${segment.rightSE.point.y}] in SweepLine tree.`);
		let prevNode = node;
		let nextNode = node;
		let prevSeg = void 0;
		let nextSeg = void 0;
		while (prevSeg === void 0) {
			prevNode = this.tree.prev(prevNode);
			if (prevNode === null) prevSeg = null;
			else if (prevNode.key.consumedBy === void 0) prevSeg = prevNode.key;
		}
		while (nextSeg === void 0) {
			nextNode = this.tree.next(nextNode);
			if (nextNode === null) nextSeg = null;
			else if (nextNode.key.consumedBy === void 0) nextSeg = nextNode.key;
		}
		if (event.isLeft) {
			let prevMySplitter = null;
			if (prevSeg) {
				const prevInter = prevSeg.getIntersection(segment);
				if (prevInter !== null) {
					if (!segment.isAnEndpoint(prevInter)) prevMySplitter = prevInter;
					if (!prevSeg.isAnEndpoint(prevInter)) {
						const newEventsFromSplit = this._splitSafely(prevSeg, prevInter);
						for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) newEvents.push(newEventsFromSplit[i]);
					}
				}
			}
			let nextMySplitter = null;
			if (nextSeg) {
				const nextInter = nextSeg.getIntersection(segment);
				if (nextInter !== null) {
					if (!segment.isAnEndpoint(nextInter)) nextMySplitter = nextInter;
					if (!nextSeg.isAnEndpoint(nextInter)) {
						const newEventsFromSplit = this._splitSafely(nextSeg, nextInter);
						for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) newEvents.push(newEventsFromSplit[i]);
					}
				}
			}
			if (prevMySplitter !== null || nextMySplitter !== null) {
				let mySplitter = null;
				if (prevMySplitter === null) mySplitter = nextMySplitter;
				else if (nextMySplitter === null) mySplitter = prevMySplitter;
				else mySplitter = SweepEvent.comparePoints(prevMySplitter, nextMySplitter) <= 0 ? prevMySplitter : nextMySplitter;
				this.queue.remove(segment.rightSE);
				newEvents.push(segment.rightSE);
				const newEventsFromSplit = segment.split(mySplitter);
				for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) newEvents.push(newEventsFromSplit[i]);
			}
			if (newEvents.length > 0) {
				this.tree.remove(segment);
				newEvents.push(event);
			} else {
				this.segments.push(segment);
				segment.prev = prevSeg;
			}
		} else {
			if (prevSeg && nextSeg) {
				const inter = prevSeg.getIntersection(nextSeg);
				if (inter !== null) {
					if (!prevSeg.isAnEndpoint(inter)) {
						const newEventsFromSplit = this._splitSafely(prevSeg, inter);
						for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) newEvents.push(newEventsFromSplit[i]);
					}
					if (!nextSeg.isAnEndpoint(inter)) {
						const newEventsFromSplit = this._splitSafely(nextSeg, inter);
						for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) newEvents.push(newEventsFromSplit[i]);
					}
				}
			}
			this.tree.remove(segment);
		}
		return newEvents;
	}
	_splitSafely(seg, pt) {
		this.tree.remove(seg);
		const rightSE = seg.rightSE;
		this.queue.remove(rightSE);
		const newEvents = seg.split(pt);
		newEvents.push(rightSE);
		if (seg.consumedBy === void 0) this.tree.add(seg);
		return newEvents;
	}
};
var POLYGON_CLIPPING_MAX_QUEUE_SIZE = typeof process !== "undefined" && process.env.POLYGON_CLIPPING_MAX_QUEUE_SIZE || 1e6;
var POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS = typeof process !== "undefined" && process.env.POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS || 1e6;
var Operation = class {
	run(type, geom, moreGeoms) {
		operation.type = type;
		rounder.reset();
		const multipolys = [new MultiPolyIn(geom, true)];
		for (let i = 0, iMax = moreGeoms.length; i < iMax; i++) multipolys.push(new MultiPolyIn(moreGeoms[i], false));
		operation.numMultiPolys = multipolys.length;
		if (operation.type === "difference") {
			const subject = multipolys[0];
			let i = 1;
			while (i < multipolys.length) if (getBboxOverlap(multipolys[i].bbox, subject.bbox) !== null) i++;
			else multipolys.splice(i, 1);
		}
		if (operation.type === "intersection") for (let i = 0, iMax = multipolys.length; i < iMax; i++) {
			const mpA = multipolys[i];
			for (let j = i + 1, jMax = multipolys.length; j < jMax; j++) if (getBboxOverlap(mpA.bbox, multipolys[j].bbox) === null) return [];
		}
		const queue = new z(SweepEvent.compare);
		for (let i = 0, iMax = multipolys.length; i < iMax; i++) {
			const sweepEvents = multipolys[i].getSweepEvents();
			for (let j = 0, jMax = sweepEvents.length; j < jMax; j++) {
				queue.insert(sweepEvents[j]);
				if (queue.size > POLYGON_CLIPPING_MAX_QUEUE_SIZE) throw new Error("Infinite loop when putting segment endpoints in a priority queue (queue size too big).");
			}
		}
		const sweepLine = new SweepLine(queue);
		let prevQueueSize = queue.size;
		let node = queue.pop();
		while (node) {
			const evt = node.key;
			if (queue.size === prevQueueSize) {
				const seg = evt.segment;
				throw new Error(`Unable to pop() ${evt.isLeft ? "left" : "right"} SweepEvent [${evt.point.x}, ${evt.point.y}] from segment #${seg.id} [${seg.leftSE.point.x}, ${seg.leftSE.point.y}] -> [${seg.rightSE.point.x}, ${seg.rightSE.point.y}] from queue.`);
			}
			if (queue.size > POLYGON_CLIPPING_MAX_QUEUE_SIZE) throw new Error("Infinite loop when passing sweep line over endpoints (queue size too big).");
			if (sweepLine.segments.length > POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS) throw new Error("Infinite loop when passing sweep line over endpoints (too many sweep line segments).");
			const newEvents = sweepLine.process(evt);
			for (let i = 0, iMax = newEvents.length; i < iMax; i++) {
				const evt = newEvents[i];
				if (evt.consumedBy === void 0) queue.insert(evt);
			}
			prevQueueSize = queue.size;
			node = queue.pop();
		}
		rounder.reset();
		return new MultiPolyOut(RingOut.factory(sweepLine.segments)).getGeom();
	}
};
var operation = new Operation();
var union$1 = function(geom) {
	for (var _len = arguments.length, moreGeoms = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) moreGeoms[_key - 1] = arguments[_key];
	return operation.run("union", geom, moreGeoms);
};
var intersection$2 = function(geom) {
	for (var _len2 = arguments.length, moreGeoms = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) moreGeoms[_key2 - 1] = arguments[_key2];
	return operation.run("intersection", geom, moreGeoms);
};
var xor = function(geom) {
	for (var _len3 = arguments.length, moreGeoms = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) moreGeoms[_key3 - 1] = arguments[_key3];
	return operation.run("xor", geom, moreGeoms);
};
var difference$1 = function(subjectGeom) {
	for (var _len4 = arguments.length, clippingGeoms = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) clippingGeoms[_key4 - 1] = arguments[_key4];
	return operation.run("difference", subjectGeom, clippingGeoms);
};
var index = {
	union: union$1,
	intersection: intersection$2,
	xor,
	difference: difference$1
};
var JOIN_TOLERANCE = 1;
var cross$2 = (a, b) => a[0] * b[1] - a[1] * b[0];
var union = (polys) => {
	const rounded = polys.map((rings) => rings.map((ring) => ring.map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6])));
	return rounded.length ? index.union(rounded[0], ...rounded.slice(1)) : [];
};
/** Outgoing tangent, including circular walls. */
function ray(wall, end) {
	const dir = mul(wallTangent(wall, end === "a" ? 0 : wallLength(wall)), end === "a" ? 1 : -1);
	return {
		wall,
		end,
		dir,
		angle: Math.atan2(dir[1], dir[0])
	};
}
/** Each exterior join is split along its bisector so filtering keeps each wall's own part. */
function endPatches(plan, w, end) {
	const p = w[end];
	const rays = plan.walls.filter((o) => levelOf(plan, o).id === levelOf(plan, w).id && wallLength(o) > 1e-7 && o.thickness > 0).flatMap((o) => ["a", "b"].filter((e) => distance$1(o[e], p) <= JOIN_TOLERANCE).map((e) => ray(o, e))).sort((a, b) => a.angle - b.angle);
	if (rays.length < 2) return [];
	const patches = [];
	for (let i = 0; i < rays.length; i++) {
		const a = rays[i], b = rays[(i + 1) % rays.length];
		if (a.wall.id !== w.id && b.wall.id !== w.id) continue;
		if ((b.angle - a.angle + Math.PI * 2) % (Math.PI * 2) <= Math.PI + 1e-7) continue;
		const na = [-a.dir[1], a.dir[0]], nb = [-b.dir[1], b.dir[0]];
		const ca = add(p, mul(na, a.wall.thickness / 2)), cb = add(p, mul(nb, -b.wall.thickness / 2));
		const det = cross$2(a.dir, b.dir);
		let tip = mul(add(ca, cb), .5);
		if (Math.abs(det) > 1e-8) {
			const intersection = add(ca, mul(a.dir, cross$2(sub$1(cb, ca), b.dir) / det));
			if (distance$1(p, intersection) <= 4 * Math.max(a.wall.thickness, b.wall.thickness) / 2) tip = intersection;
		}
		if (a.wall.id === w.id && a.end === end) patches.push([
			p,
			ca,
			tip
		]);
		if (b.wall.id === w.id && b.end === end) patches.push([
			p,
			tip,
			cb
		]);
	}
	return patches;
}
/** Full-width footprint for a wall interval. Only real endpoints receive joined corners. */
function joinedWallFootprint(plan, w, from = 0, to = wallLength(w)) {
	if (to - from < 1e-7 || w.thickness <= 0) return [];
	const polygons = [[wallFootprint(sliceWall(w, from, to))]];
	if (from <= 1e-7) polygons.push(...endPatches(plan, w, "a").map((p) => [p]));
	if (to >= wallLength(w) - 1e-7) polygons.push(...endPatches(plan, w, "b").map((p) => [p]));
	return union(polygons);
}
/** Full structural footprints (including opening spans), for area and enclosure calculations. */
function wallFootprints(plan, filter = () => true) {
	return union(plan.walls.filter(filter).flatMap((w) => joinedWallFootprint(plan, w)));
}
// src/core/decor/math.ts
var overlap = (a, b, eps = 1e-7) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > eps;
var ordered = (a, b) => [Math.min(a, b), Math.max(a, b)];
var rectPoly = (r) => [
	[r.u[0], r.z[0]],
	[r.u[1], r.z[0]],
	[r.u[1], r.z[1]],
	[r.u[0], r.z[1]]
];
function bounds(points) {
	const p = points.filter((x) => x !== void 0);
	return p.length ? [
		Math.min(...p.map((x) => x[0])),
		Math.min(...p.map((x) => x[1])),
		Math.max(...p.map((x) => x[0])),
		Math.max(...p.map((x) => x[1]))
	] : [
		0,
		0,
		0,
		0
	];
}
var intersection = (a, b) => a.length && b.length ? index.intersection(a, b) : [];
var difference = (a, b) => a.length && b.length ? index.difference(a, b) : a;
/** Split into disjoint rectangles; useful for partial door fronts and box subtraction. */
function subtractRects(rect, cuts) {
	let pieces = [rect];
	for (const c of cuts) pieces = pieces.flatMap((r) => {
		if (!overlap(r.u, c.u) || !overlap(r.z, c.z)) return [r];
		const u = [Math.max(r.u[0], c.u[0]), Math.min(r.u[1], c.u[1])], z = [Math.max(r.z[0], c.z[0]), Math.min(r.z[1], c.z[1])];
		return [
			{
				u: [r.u[0], u[0]],
				z: r.z
			},
			{
				u: [u[1], r.u[1]],
				z: r.z
			},
			{
				u,
				z: [r.z[0], z[0]]
			},
			{
				u,
				z: [z[1], r.z[1]]
			}
		].filter((p) => p.u[1] - p.u[0] > 1e-7 && p.z[1] - p.z[0] > 1e-9);
	});
	return pieces;
}
// src/core/decor/faces.ts
var DecorGeometryError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "DecorGeometryError";
	}
};
function faceWall(plan, face) {
	const wall = plan.walls.find((w) => w.id === face.wall);
	if (!wall) throw new DecorGeometryError("host-missing", `墙 ${face.wall} 不存在，没地方挂了`);
	if (face.side !== 1 && face.side !== -1) throw new DecorGeometryError("invalid", "墙面 side 必须为 1 或 -1");
	return wall;
}
/** s is always from a; u always runs left to right as viewed from the room. */
function faceAxis(plan, face) {
	const wall = faceWall(plan, face), length = wallLength(wall), arc = arcParams(wall);
	const scale = arc ? (arc.radius + Math.sign(wall.bulge) * face.side * wall.thickness / 2) / arc.radius : 1;
	const normalAt = (s) => {
		const d = wallTangent(wall, s);
		return mul([-d[1], d[0]], face.side);
	};
	const at = (s, depth = 0) => add(arc ? pointAt(wall, s) : add(wall.a, mul(wallDir(wall), s)), mul(normalAt(s), wall.thickness / 2 + depth));
	const toU = (s) => (face.side === 1 ? s : length - s) * scale;
	const toS = (u) => face.side === 1 ? u / scale : length - u / scale;
	return {
		wall,
		face,
		length,
		faceLength: length * scale,
		scale,
		origin: at(face.side === 1 ? 0 : length),
		dir: mul(wallDir(wall), face.side),
		normal: normalAt(length / 2),
		at,
		normalAt,
		toU,
		toS
	};
}
/** Connected coplanar chain, expressed in the anchor wall's unbounded s coordinates. */
function faceRun(plan, face) {
	const axis = faceAxis(plan, face), w = axis.wall, d = wallDir(w), n = wallNormal(w);
	if (w.bulge) return [{
		face,
		wall: w,
		s: [0, axis.length],
		reversed: false
	}];
	const candidates = plan.walls.filter((v) => !v.bulge && levelOf(plan, v).id === levelOf(plan, w).id && Math.abs(dot$2(wallDir(v), n)) < 1e-7 && Math.abs(dot$2(sub$1(v.a, w.a), n)) < 1e-5).map((v) => {
		const reversed = dot$2(wallDir(v), d) < 0, side = reversed ? -face.side : face.side;
		return {
			face: {
				wall: v.id,
				side
			},
			wall: v,
			s: ordered(dot$2(sub$1(v.a, w.a), d), dot$2(sub$1(v.b, w.a), d)),
			reversed
		};
	}).filter((v) => Math.abs(dot$2(sub$1(faceAxis(plan, v.face).at(0), axis.at(0)), n)) < 1e-5);
	const chain = candidates.filter((v) => v.wall.id === w.id);
	let changed = true;
	while (changed) {
		changed = false;
		for (const v of candidates) if (!chain.includes(v) && chain.some((c) => Math.abs(c.s[1] - v.s[0]) <= 1 || Math.abs(v.s[1] - c.s[0]) <= 1)) {
			chain.push(v);
			changed = true;
		}
	}
	return chain.sort((a, b) => a.s[0] - b.s[0] || a.wall.id.localeCompare(b.wall.id));
}
/** Visible intervals: intersect a ray just outside the wall face with joined neighboring wall footprints. */
function faceIntervals(plan, face) {
	const axis = faceAxis(plan, face), w = axis.wall;
	if (w.bulge) return [[0, axis.length]];
	const d = wallDir(w), origin = axis.at(0, .001), cuts = [];
	const neighbors = plan.walls.filter((v) => v.id !== w.id && levelOf(plan, v).id === levelOf(plan, w).id);
	for (const v of neighbors) for (const rings of joinedWallFootprint(plan, v)) {
		const ts = [0, axis.length];
		for (const ring of rings) ring.forEach((a, i) => {
			const b = ring[(i + 1) % ring.length], e = sub$1(b, a), det = d[0] * e[1] - d[1] * e[0];
			if (Math.abs(det) < 1e-9) return;
			const q = sub$1(a, origin), t = (q[0] * e[1] - q[1] * e[0]) / det, u = (q[0] * d[1] - q[1] * d[0]) / det;
			if (u >= 0 && u <= 1 && t > 0 && t < axis.length) ts.push(t);
		});
		ts.sort((a, b) => a - b);
		for (let i = 1; i < ts.length; i++) {
			const p = add(origin, mul(d, (ts[i - 1] + ts[i]) / 2));
			if (pointInPolygon(p, rings[0]) && !rings.slice(1).some((r) => pointInPolygon(p, r))) cuts.push([ts[i - 1], ts[i]]);
		}
	}
	let result = [[0, axis.length]];
	for (const [a, b] of cuts) result = result.flatMap(([s, e]) => b <= s || a >= e ? [[s, e]] : [[s, Math.max(s, a)], [Math.min(e, b), e]].filter(([x, y]) => y - x > 1e-6));
	return result;
}
function faceExtent(plan, face) {
	const spans = faceIntervals(plan, face);
	return spans.length ? [spans[0][0], spans[spans.length - 1][1]] : [0, 0];
}
function faceFrame(plan, ref) {
	const face = "face" in ref ? ref.face : ref, axis = faceAxis(plan, face);
	if (axis.wall.bulge && "face" in ref) throw new DecorGeometryError("arc-unsupported", "弧墙暂只支持整面材质，造型和嵌入暂不支持");
	const s = "s" in ref ? ref.s : faceExtent(plan, face), z = "z" in ref ? ref.z : [0, effectiveWallHeight(plan, axis.wall)];
	const run = faceRun(plan, face);
	if (s[0] < run[0].s[0] - 1e-5 || s[1] > run[run.length - 1].s[1] + 1e-5) throw new DecorGeometryError("host-cut", "超出连续墙面，跨墙的宿主链断了");
	return {
		...axis,
		s,
		z,
		u: ordered(axis.toU(s[0]), axis.toU(s[1])),
		a: axis.at(s[0]),
		b: axis.at(s[1]),
		segment: [axis.at(s[0]), axis.at(s[1])],
		run
	};
}
/** Convert a member wall's s coordinate to the anchor wall's s coordinate. */
function runS(part, s) {
	return part.reversed ? part.s[1] - s : part.s[0] + s;
}
// src/core/decor/panels.ts
function panelSpan(plan, panel) {
	if (panel.type !== "arch" && panel.span) return panel.span;
	const opening = plan.openings.find((o) => o.id === panel.opening);
	if (!opening) throw new DecorGeometryError("host-missing", "拱形门套的原门洞不存在");
	return {
		face: panel.span?.face ?? {
			wall: opening.wall,
			side: 1
		},
		s: [opening.offset, opening.offset + opening.width],
		z: [opening.sill, opening.head]
	};
}
/** Coordinates local to the panel's left edge (u mm), heights remain floor-relative m. */
function panelGeometry(plan, panel) {
	const span = panelSpan(plan, panel), f = faceFrame(plan, span), width = f.u[1] - f.u[0], rect = {
		u: [0, width],
		z: span.z
	};
	let polygons = [[rectPoly(rect)]];
	if (panel.type === "arch") {
		const radius = Math.max(width / 2, panel.arch?.radius ?? width / 2), rise = radius - Math.sqrt(Math.max(0, radius * radius - width * width / 4)), base = span.z[1] - rise / 1e3;
		const curve = Array.from({ length: 65 }, (_, i) => {
			const x = width * i / 64;
			return [x, base + (Math.sqrt(Math.max(0, radius * radius - (x - width / 2) ** 2)) - Math.sqrt(Math.max(0, radius * radius - width * width / 4))) / 1e3];
		});
		const hole = [
			[0, span.z[0]],
			[width, span.z[0]],
			...curve.reverse()
		];
		polygons = difference(polygons, [[hole]]);
	} else if (panel.type === "slats") {
		const slat = panel.slats ?? {
			width: 30,
			gap: 30,
			depth: panel.thickness
		};
		if (!(slat.width > 0 && slat.gap >= 0)) throw new DecorGeometryError("invalid", "格栅条宽须为正、间隙不能为负");
		polygons = [];
		for (let x = 0; x < width; x += slat.width + slat.gap) polygons.push([rectPoly({
			u: [x, Math.min(width, x + slat.width)],
			z: span.z
		})]);
	}
	const cuts = [];
	if (panel.type !== "arch" && panel.avoid !== "none") for (const part of faceRun(plan, span.face)) for (const o of plan.openings.filter((o) => o.wall === part.wall.id)) {
		const u = ordered(f.toU(runS(part, o.offset)), f.toU(runS(part, o.offset + o.width)));
		cuts.push([rectPoly({
			u: [u[0] - f.u[0], u[1] - f.u[0]],
			z: [o.sill, o.head]
		})]);
	}
	polygons = difference(polygons, cuts);
	const fronts = (plan.decor?.recesses ?? []).filter((r) => "panel" in r.host && r.host.panel === panel.id && r.rect.u);
	const visible = difference(polygons, fronts.map((r) => [rectPoly({
		u: r.rect.u,
		z: r.rect.z
	})]));
	const grooves = [];
	if (panel.grooves && panel.grooves.spacing > 0) {
		const g = panel.grooves, vertical = g.dir === "v", start = vertical ? 0 : span.z[0], end = vertical ? width : span.z[1], step = vertical ? g.spacing : g.spacing / 1e3;
		for (let v = start + step; v < end; v += step) for (const rings of visible) {
			const hits = [];
			for (const ring of rings) ring.forEach((a, i) => {
				const b = ring[(i + 1) % ring.length], axis = vertical ? 0 : 1, other = 1 - axis;
				if (a[axis] <= v && b[axis] > v || b[axis] <= v && a[axis] > v) hits.push(a[other] + (v - a[axis]) / (b[axis] - a[axis]) * (b[other] - a[other]));
			});
			hits.sort((a, b) => a - b);
			for (let i = 1; i < hits.length; i += 2) grooves.push(vertical ? [[v, hits[i - 1]], [v, hits[i]]] : [[hits[i - 1], v], [hits[i], v]]);
		}
	}
	let frames = [];
	if (panel.frame) {
		const m = panel.frame.margin, inner = {
			u: [m, width - m],
			z: [span.z[0] + m / 1e3, span.z[1] - m / 1e3]
		};
		if (inner.u[1] > inner.u[0] && inner.z[1] > inner.z[0]) frames = difference([[rectPoly(inner)]], [[rectPoly({
			u: [inner.u[0] + 18, inner.u[1] - 18],
			z: [inner.z[0] + .018, inner.z[1] - .018]
		})]]);
		frames = difference(frames, [...cuts, ...fronts.map((r) => [rectPoly({
			u: r.rect.u,
			z: r.rect.z
		})])]);
	}
	return {
		span,
		rect,
		polygons,
		visiblePolygons: visible,
		grooves,
		frames,
		thickness: panel.type === "slats" ? panel.slats?.depth ?? panel.thickness : panel.thickness
	};
}
function panelTransform(plan, panel) {
	const span = panelSpan(plan, panel), axis = faceAxis(plan, span.face), u0 = Math.min(...span.s.map(axis.toU));
	return (u, depth) => axis.at(axis.toS(u0 + u), depth);
}
// src/core/decor/cabinets.ts
/** Only the last width / top cell h may be omitted. No implicit rescaling of explicit dimensions. */
function layoutCabinet(cab) {
	const issues = [], invalid = (text) => issues.push({
		id: cab.id,
		code: "invalid",
		level: "error",
		text
	});
	const columns = [], cells = [], parts = [], cuts = [...cab.cuts ?? []];
	const bodyBottom = cab.z[0] + (cab.plinth ?? 0), height = cab.z[1] - bodyBottom;
	if (!(cab.width > 0 && cab.depth > 0 && height > 0) || !cab.columns.length) invalid("柜宽、柜深、柜高及分列必须有效");
	let x = 0;
	cab.columns.forEach((col, ci) => {
		if (col.width === void 0 && ci !== cab.columns.length - 1) invalid("只有最后一列可以省略宽度");
		const width = col.width ?? cab.width - x;
		if (!(width > 0) || !col.cells.length) invalid("每列必须有正宽度和至少一个格子");
		columns.push({
			width,
			u: [x, x + width]
		});
		let z = bodyBottom;
		col.cells.forEach((cell, ri) => {
			if (cell.h === void 0 && ri !== col.cells.length - 1) invalid("只有最上面一格可以省略高度");
			const h = cell.h ?? cab.z[1] - z, rect = {
				u: [x, x + width],
				z: [z, z + h]
			};
			if (!(h > 0)) invalid("每格高度必须为正");
			cells.push({
				...rect,
				column: ci,
				row: ri,
				cell,
				type: cell.type,
				pieces: subtractRects(rect, cab.cuts ?? [])
			});
			if (cell.type === "void") cuts.push({
				...rect,
				depth: cell.void?.depth ?? "through"
			});
			z += h;
		});
		if (Math.abs(z - cab.z[1]) > 1e-7) invalid("各格高度之和必须等于柜高减踢脚");
		x += width;
	});
	if (Math.abs(x - cab.width) > 1e-5) invalid("各列宽度之和必须等于柜宽；改列宽时仅末列省略值承担余量");
	for (const c of cuts) {
		if (c.depth !== "through" && (!(c.depth > 0) || c.depth > cab.depth)) issues.push({
			id: cab.id,
			code: "host-depth",
			level: "error",
			text: `柜深只有 ${cab.depth} mm`
		});
		if (c.u[0] < 0 || c.u[1] > cab.width || c.z[0] < cab.z[0] || c.z[1] > cab.z[1] || c.u[1] <= c.u[0] || c.z[1] <= c.z[0]) invalid("柜体挖洞范围超出柜体");
	}
	const t = Math.min(18, cab.width / 4, cab.depth / 4), tm = t / 1e3;
	const put = (kind, u, z, depth, material = cab.materials.carcass, column, row) => {
		if (u[1] > u[0] && z[1] > z[0] && depth[1] > depth[0]) parts.push({
			kind,
			u,
			z,
			depth,
			material,
			pieces: [],
			polygons: [],
			...column === void 0 ? {} : {
				column,
				row
			}
		});
	};
	put("carcass", [0, cab.width], [bodyBottom, cab.z[1]], [0, t]);
	put("carcass", [0, t], [bodyBottom, cab.z[1]], [t, cab.depth]);
	put("carcass", [cab.width - t, cab.width], [bodyBottom, cab.z[1]], [t, cab.depth]);
	put("carcass", [t, cab.width - t], [bodyBottom, bodyBottom + tm], [t, cab.depth]);
	put("carcass", [t, cab.width - t], [cab.z[1] - tm, cab.z[1]], [t, cab.depth]);
	for (const col of columns.slice(1)) put("carcass", [col.u[0] - t / 2, col.u[0] + t / 2], [bodyBottom, cab.z[1]], [t, cab.depth]);
	if (cab.plinth) put("plinth", [0, cab.width], [cab.z[0], bodyBottom], [0, Math.max(t, cab.depth - 50)]);
	for (const c of cells) {
		const { u, z, cell } = c, count = Math.max(1, Math.floor(cell.count ?? (cell.type === "drawers" ? 3 : 1)));
		if (c.row > 0) put("shelf", u, [z[0] - tm / 2, z[0] + tm / 2], [t, cab.depth]);
		if ([
			"door",
			"doors",
			"drawers",
			"flap"
		].includes(cell.type)) {
			const nx = cell.type === "doors" ? 2 : 1, nz = cell.type === "drawers" ? count : 1;
			for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) put("front", [u[0] + (u[1] - u[0]) * i / nx + 1.5, u[0] + (u[1] - u[0]) * (i + 1) / nx - 1.5], [z[0] + (z[1] - z[0]) * j / nz + .0015, z[0] + (z[1] - z[0]) * (j + 1) / nz - .0015], [cab.depth - t, cab.depth], cell.material ?? cab.materials.front, c.column, c.row);
		}
		if (cell.type === "open") for (let j = 1; j <= (cell.count ?? 0); j++) {
			const h = z[0] + (z[1] - z[0]) * j / ((cell.count ?? 0) + 1);
			put("shelf", u, [h - tm / 2, h + tm / 2], [t, cab.depth]);
		}
		if (cell.type === "appliance") {
			const size = cell.appliance?.size ?? [
				u[1] - u[0] - t * 2,
				cab.depth - t,
				z[1] - z[0] - tm * 2
			], center = (u[0] + u[1]) / 2;
			put("appliance", [center - size[0] / 2, center + size[0] / 2], [z[0] + tm, z[0] + tm + size[2]], [cab.depth - size[1], cab.depth], void 0, c.column, c.row);
		}
		if (cell.void?.top) put("top", u, [cell.void.top.z - .018, cell.void.top.z], [0, cab.depth + (cell.void.top.overhang ?? 0)], cell.void.top.material ?? cab.top?.material ?? cab.materials.carcass);
	}
	if (cab.top) put("top", [-(cab.top.overhang ?? 0), cab.width + (cab.top.overhang ?? 0)], [cab.z[1], cab.z[1] + cab.top.thickness / 1e3], [0, cab.depth + (cab.top.overhang ?? 0)], cab.top.material);
	for (const part of parts) {
		part.pieces = subtractRects(part, part.kind === "top" ? [] : cuts.filter((c) => c.depth === "through" || c.depth > 0));
		part.polygons = part.pieces.map((p) => [rectPoly(p)]);
	}
	return {
		width: cab.width,
		depth: cab.depth,
		z: [...cab.z],
		columns,
		cells,
		parts,
		cuts,
		footprint: [
			[0, 0],
			[cab.width, 0],
			[cab.width, cab.depth],
			[0, cab.depth]
		],
		issues
	};
}
/** Returns a local-to-world transform; independent cabinets' at is their center. */
function cabinetTransform(plan, cab) {
	if ("face" in cab.place) {
		const place = cab.place, axis = faceAxis(plan, place.face);
		if (axis.wall.bulge) throw new DecorGeometryError("arc-unsupported", "弧墙靠柜暂不支持");
		const start = axis.toU(place.s + (place.face.side === -1 ? cab.width : 0));
		return (u, depth) => axis.at(axis.toS(start + u), (place.gap ?? 0) - (cab.embed ?? 0) + depth);
	}
	const p = cab.place, theta = p.rot * Math.PI / 180, right = [Math.cos(theta), Math.sin(theta)], normal = [-Math.sin(theta), Math.cos(theta)];
	return (u, depth) => add(p.at, add(mul(right, u - cab.width / 2), mul(normal, depth - cab.depth / 2)));
}
function cabinetFootprint(plan, cab) {
	const at = cabinetTransform(plan, cab);
	return [
		[0, 0],
		[cab.width, 0],
		[cab.width, cab.depth],
		[0, cab.depth]
	].map(([u, d]) => at(u, d));
}
// src/core/decor/furniture.ts
var FURNITURE_LIBRARY = [
	[
		"sofa-3",
		"三人沙发",
		"客厅",
		2400,
		900,
		.85
	],
	[
		"sofa-2",
		"双人沙发",
		"客厅",
		1800,
		900,
		.85
	],
	[
		"armchair",
		"单椅",
		"客厅",
		800,
		800,
		.85
	],
	[
		"coffee-table",
		"茶几",
		"客厅",
		1200,
		600,
		.4
	],
	[
		"bed-1800",
		"双人床",
		"卧室",
		1800,
		2e3,
		.5
	],
	[
		"bed-1500",
		"双人床",
		"卧室",
		1500,
		2e3,
		.5
	],
	[
		"bed-1200",
		"单人床",
		"卧室",
		1200,
		2e3,
		.5
	],
	[
		"nightstand",
		"床头柜",
		"卧室",
		500,
		400,
		.5
	],
	[
		"dining-table",
		"餐桌",
		"餐厨",
		1600,
		800,
		.75
	],
	[
		"chair",
		"餐椅",
		"餐厨",
		450,
		500,
		.85
	],
	[
		"desk",
		"书桌",
		"书房",
		1200,
		600,
		.75
	],
	[
		"bookshelf",
		"书架",
		"书房",
		800,
		300,
		2
	],
	[
		"fridge",
		"冰箱",
		"家电",
		900,
		700,
		1.9
	],
	[
		"washer",
		"洗衣机",
		"家电",
		600,
		650,
		.85
	],
	[
		"dryer",
		"烘干机",
		"家电",
		600,
		650,
		.85
	],
	[
		"oven",
		"烤箱",
		"家电",
		600,
		550,
		.6
	],
	[
		"steamer",
		"蒸箱",
		"家电",
		600,
		550,
		.45
	],
	[
		"dishwasher",
		"洗碗机",
		"家电",
		600,
		600,
		.8
	],
	[
		"microwave",
		"微波炉",
		"家电",
		500,
		400,
		.3
	],
	[
		"tv",
		"电视",
		"家电",
		1450,
		80,
		.83
	],
	[
		"rug",
		"地毯",
		"软装",
		2400,
		1600,
		.01
	],
	[
		"toilet",
		"坐便器",
		"卫浴",
		400,
		700,
		.75
	],
	[
		"basin",
		"洗手台",
		"卫浴",
		800,
		500,
		.85
	],
	[
		"bathtub",
		"浴缸",
		"卫浴",
		1700,
		750,
		.6
	],
	[
		"wardrobe",
		"衣柜",
		"收纳",
		1800,
		600,
		2.4
	]
].map(([type, name, category, w, d, height]) => ({
	type: String(type),
	name: String(name),
	category: String(category),
	size: [Number(w), Number(d)],
	height: Number(height),
	symbol: String(type)
}));
function furnitureFootprint(f, plan) {
	if (plan) return furniturePose(plan, f).footprint;
	if (!f.at) throw new Error("宿主家具占地需要传入 plan");
	return footprint(f.at, f.rot ?? 0, f.size);
}
function footprint(at, rot, size) {
	const a = rot * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), [w, d] = size;
	return [
		[-w / 2, -d / 2],
		[w / 2, -d / 2],
		[w / 2, d / 2],
		[-w / 2, d / 2]
	].map(([x, y]) => add(at, [x * co - y * si, x * si + y * co]));
}
function furnitureLevel(plan, f) {
	return levelOf(plan, { level: f.in ? furniturePose(plan, f).level : plan.walls.find((w) => w.id === f.against?.face.wall)?.level ?? f.level });
}
/** World XY in mm; z floor-relative metres; hosted rot is a local offset. */
function furniturePose(plan, f) {
	let center = f.at ?? [0, 0], rotation = f.rot ?? 0, height = f.z ?? 0, level = levelOf(plan, plan.walls.find((w) => w.id === f.against?.face.wall) ?? f).id, missing = false;
	if (f.in) try {
		const decor = plan.decor;
		if (!decor) throw new Error("missing decor");
		const cellRef = /^(.*):cell:(\d+):(\d+)$/.exec(f.in);
		if (cellRef) {
			const cab = decor.cabinets.find((c) => c.id === cellRef[1]);
			if (!cab) throw new Error("missing cabinet");
			const cell = layoutCabinet(cab).cells.find((c) => c.column === +cellRef[2] && c.row === +cellRef[3]);
			if (!cell) throw new Error("missing cell");
			const at = cabinetTransform(plan, cab), n = sub$1(at(0, 1), at(0, 0));
			center = at((cell.u[0] + cell.u[1]) / 2, cab.depth - f.size[1] / 2);
			rotation = Math.atan2(n[1], n[0]) * 180 / Math.PI - 90 + (f.rot ?? 0);
			height = f.z ?? cell.z[0];
			level = levelOf(plan, "face" in cab.place ? faceAxis(plan, cab.place.face).wall : cab).id;
		} else {
			const at = hostTransform(plan, decor, f.in);
			if (!at) throw new Error("missing host");
			const host = [
				...decor.recesses,
				...decor.panels,
				...decor.cabinets
			].find((h) => h.id === f.in);
			let width, front, z, hostLevel;
			if ("host" in host) {
				width = host.rect.u ? host.rect.u[1] - host.rect.u[0] : host.rect.s[1] - host.rect.s[0];
				z = host.rect.z;
				const parent = "panel" in host.host ? decor.panels.find((p) => p.id === host.host.panel) : "cabinet" in host.host ? decor.cabinets.find((c) => c.id === host.host.cabinet) : void 0;
				front = parent ? "thickness" in parent ? parent.type === "slats" ? parent.slats?.depth ?? parent.thickness : parent.thickness : parent.depth : 0;
				hostLevel = "face" in host.host ? faceAxis(plan, host.host.face).wall.level : parent && "thickness" in parent ? faceAxis(plan, panelSpan(plan, parent).face).wall.level : parent && "place" in parent && "face" in parent.place ? faceAxis(plan, parent.place.face).wall.level : parent?.level;
			} else if ("thickness" in host) {
				const span = panelSpan(plan, host);
				width = span.s[1] - span.s[0];
				front = host.type === "slats" ? host.slats?.depth ?? host.thickness : host.thickness;
				z = span.z;
				hostLevel = faceAxis(plan, span.face).wall.level;
			} else {
				width = host.width;
				front = host.depth;
				z = host.z;
				hostLevel = "face" in host.place ? faceAxis(plan, host.place.face).wall.level : host.level;
			}
			center = at(width / 2, front - f.size[1] / 2);
			const normal = sub$1(at(0, 1), at(0, 0));
			rotation = Math.atan2(normal[1], normal[0]) * 180 / Math.PI - 90 + (f.rot ?? 0);
			height = f.z ?? z[0];
			level = levelOf(plan, { level: hostLevel }).id;
		}
	} catch {
		missing = true;
		const cache = plan.decor?.cache?.[f.id];
		if (cache) {
			center = cache.pose?.at ?? [(cache.box[0] + cache.box[2]) / 2, (cache.box[1] + cache.box[3]) / 2];
			rotation = cache.pose?.rot ?? rotation;
			height = cache.pose?.z ?? height;
			level = cache.level ?? level;
		}
	}
	return {
		at: center,
		center,
		rot: rotation,
		z: height,
		level,
		missing,
		footprint: footprint(center, rotation, f.size)
	};
}
// src/core/decor/legacy.ts
var aliases = {
	sofa: "sofa-3",
	bed: "bed-1800",
	table: "dining-table",
	dining: "dining-table",
	coffee: "coffee-table",
	refrigerator: "fridge",
	washing: "washer",
	television: "tv",
	cabinet: "wardrobe",
	single: "armchair"
};
/** Returns converted values without touching either the archival legacy snapshot or plan. */
function fromLegacyFurniture(plan) {
	const legacy = plan.legacy ?? {}, layout = legacy.layout;
	const raw = legacy.furniture ?? layout?.furniture, result = {
		furniture: [],
		materials: [],
		presets: [],
		warnings: []
	};
	const ids = new Set([
		...plan.walls,
		...plan.openings,
		...plan.rooms,
		...plan.beams,
		...plan.questions,
		...plan.changes,
		...plan.levels ?? [],
		...plan.columns ?? [],
		...plan.shafts ?? [],
		...plan.stairs ?? [],
		...plan.voids ?? [],
		...plan.decor?.furniture ?? [],
		...plan.decor?.materials ?? [],
		...plan.decor?.surfaces ?? [],
		...plan.decor?.cabinets ?? [],
		...plan.decor?.panels ?? [],
		...plan.decor?.recesses ?? [],
		...plan.decor?.presets ?? []
	].map((x) => x.id));
	const id = (base) => {
		let next = base, n = 1;
		while (ids.has(next)) next = `${base}-${n++}`;
		ids.add(next);
		return next;
	};
	if (Array.isArray(raw)) raw.forEach((f, i) => {
		if (!f || ![
			f.cx,
			f.cy,
			f.w,
			f.d
		].every(Number.isFinite) || f.w <= 0 || f.d <= 0 || f.rot !== void 0 && !Number.isFinite(f.rot)) {
			result.warnings.push(`旧家具第 ${i + 1} 件尺寸无效，保留在 legacy`);
			return;
		}
		const type = aliases[f.type] ?? f.type, entry = FURNITURE_LIBRARY.find((e) => e.type === type);
		const item = {
			id: id(`legacy-furniture-${i + 1}`),
			type: entry?.type ?? `placeholder:${String(f.type ?? "unknown")}`,
			at: [f.cx, f.cy],
			size: [f.w, f.d],
			rot: f.rot ?? 0,
			height: entry?.height ?? 1,
			by: "user",
			status: "confirmed",
			...typeof f.name === "string" ? { name: f.name } : {}
		};
		if (typeof f.color === "string" && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(f.color)) {
			const material = {
				id: id(`${item.id}-color`),
				name: `${item.name ?? entry?.name ?? "旧家具"}颜色`,
				category: "other",
				color: f.color
			};
			result.materials.push(material);
			item.materials = { body: material.id };
		}
		result.furniture.push(item);
	});
	const color = legacy.wallColor ?? layout?.wallColor;
	if (typeof color === "string" && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color)) {
		const material = {
			id: id("legacy-wall-color"),
			name: "旧方案墙漆",
			category: "paint",
			color
		};
		result.materials.push(material);
		const style = id("legacy-style");
		result.presets.push({
			id: style,
			name: "旧方案配色",
			roles: { "wall.main": material.id },
			by: "user"
		});
		result.style = style;
	}
	return result;
}
// src/core/decor/presets.ts
var sampleMaterials = {
	oak: {
		name: "浅橡木地板",
		cat: "木地板",
		color: "#cfb28a",
		tex: "planks",
		size: [1200, 190]
	},
	oakHb: {
		name: "橡木人字拼",
		cat: "木地板",
		color: "#c9a77c",
		tex: "herring"
	},
	walnut: {
		name: "胡桃木地板",
		cat: "木地板",
		color: "#7f5a3d",
		tex: "herring"
	},
	ash: {
		name: "白蜡木地板",
		cat: "木地板",
		color: "#e2d2b4",
		tex: "planks",
		size: [1200, 160]
	},
	smokeOak: {
		name: "烟熏橡木地板",
		cat: "木地板",
		color: "#8f7d69",
		tex: "planks",
		size: [1500, 200]
	},
	tileWarm: {
		name: "暖灰哑光砖",
		cat: "瓷砖",
		color: "#cdc8bf",
		tex: "tiles",
		size: [600, 600]
	},
	tileGrey: {
		name: "浅灰大板砖",
		cat: "瓷砖",
		color: "#d4d4d1",
		tex: "tiles",
		size: [900, 1800]
	},
	tileSage: {
		name: "灰绿小方砖",
		cat: "瓷砖",
		color: "#aeb8a8",
		tex: "tiles",
		size: [200, 200]
	},
	micro: {
		name: "暖灰微水泥",
		cat: "微水泥",
		color: "#c6bcae",
		tex: "speckle"
	},
	microPale: {
		name: "米灰微水泥",
		cat: "微水泥",
		color: "#d5ccbf",
		tex: "speckle"
	},
	limewash: {
		name: "肌理艺术涂料",
		cat: "涂料",
		color: "#d7ccbc",
		tex: "speckle"
	},
	cream: {
		name: "奶油白乳胶漆",
		cat: "乳胶漆",
		color: "#efe7da"
	},
	white: {
		name: "暖白乳胶漆",
		cat: "乳胶漆",
		color: "#f3f2ee"
	},
	mist: {
		name: "雾霾蓝乳胶漆",
		cat: "乳胶漆",
		color: "#a9b6bf"
	},
	forest: {
		name: "墨绿乳胶漆",
		cat: "乳胶漆",
		color: "#3f5b4d"
	},
	daiqing: {
		name: "黛青乳胶漆",
		cat: "乳胶漆",
		color: "#59686e"
	},
	rice: {
		name: "宣纸白乳胶漆",
		cat: "乳胶漆",
		color: "#eee8dc"
	},
	oakVeneer: {
		name: "白橡木饰面",
		cat: "木饰面",
		color: "#d4bc95",
		tex: "grain"
	},
	elm: {
		name: "老榆木饰面",
		cat: "木饰面",
		color: "#9d8669",
		tex: "grain"
	},
	teak: {
		name: "柚木饰面",
		cat: "木饰面",
		color: "#9b6b44",
		tex: "grain"
	},
	walnutV: {
		name: "黑胡桃木饰面",
		cat: "木饰面",
		color: "#5b4231",
		tex: "grain"
	},
	creamDoor: {
		name: "奶油白哑光柜门",
		cat: "柜门",
		color: "#ebe3d5"
	},
	greyDoor: {
		name: "雾灰哑光柜门",
		cat: "柜门",
		color: "#c9c8c4"
	},
	slab: {
		name: "鱼肚白岩板",
		cat: "石材",
		color: "#e8e5df",
		tex: "veins"
	},
	travertine: {
		name: "米黄洞石",
		cat: "石材",
		color: "#d8ccb6",
		tex: "veins"
	},
	blackSlab: {
		name: "黑色岩板",
		cat: "石材",
		color: "#3a3a3c",
		tex: "veins"
	},
	brass: {
		name: "香槟金",
		cat: "金属",
		color: "#b9a079"
	},
	gunmetal: {
		name: "枪灰金属",
		cat: "金属",
		color: "#4a4b4e"
	},
	bronze: {
		name: "古铜",
		cat: "金属",
		color: "#8b6a48"
	},
	oat: {
		name: "燕麦色布艺",
		cat: "布艺",
		color: "#d8ccb8"
	},
	linen: {
		name: "亚麻原色",
		cat: "布艺",
		color: "#d6cab6"
	},
	charcoal: {
		name: "炭灰布艺",
		cat: "布艺",
		color: "#77797b"
	},
	mustard: {
		name: "芥末黄布艺",
		cat: "布艺",
		color: "#c89b3c"
	},
	caramel: {
		name: "焦糖皮革",
		cat: "皮革",
		color: "#a8673a"
	},
	fog: {
		name: "雾灰布艺",
		cat: "布艺",
		color: "#c9ccca"
	},
	rugWool: {
		name: "米白羊毛地毯",
		cat: "地毯",
		color: "#e7e0d3"
	},
	rugGrey: {
		name: "浅灰手工毯",
		cat: "地毯",
		color: "#d6d6d2"
	},
	rattan: {
		name: "藤编",
		cat: "藤编",
		color: "#c7a87a",
		tex: "weave"
	}
};
var sampleStyles = {
	cream: {
		name: "奶油原木",
		blurb: "浅橡木 · 奶油白 · 岩板",
		roles: {
			"floor.main": "oak",
			"floor.wet": "tileWarm",
			"wall.main": "cream",
			"wall.accent": "micro",
			"wood.main": "oakVeneer",
			"cabinet.front": "creamDoor",
			"stone.top": "slab",
			"metal": "brass",
			"fabric.main": "oat",
			"fabric.accent": "caramel",
			"rug": "rugWool"
		},
		board: [
			"oak",
			"cream",
			"micro",
			"slab",
			"oat",
			"brass"
		]
	},
	wabi: {
		name: "侘寂",
		blurb: "微水泥 · 老榆木 · 亚麻",
		roles: {
			"floor.main": "microPale",
			"floor.wet": "microPale",
			"wall.main": "limewash",
			"wall.accent": "limewash",
			"wood.main": "elm",
			"cabinet.front": "elm",
			"stone.top": "travertine",
			"metal": "gunmetal",
			"fabric.main": "linen",
			"fabric.accent": "charcoal",
			"rug": "rugGrey"
		},
		board: [
			"microPale",
			"limewash",
			"elm",
			"travertine",
			"linen",
			"gunmetal"
		]
	},
	minimal: {
		name: "现代极简",
		blurb: "大板砖 · 暖白 · 黑钛",
		roles: {
			"floor.main": "tileGrey",
			"floor.wet": "tileGrey",
			"wall.main": "white",
			"wall.accent": "white",
			"wood.main": "smokeOak",
			"cabinet.front": "greyDoor",
			"stone.top": "blackSlab",
			"metal": "gunmetal",
			"fabric.main": "fog",
			"fabric.accent": "charcoal",
			"rug": "rugGrey"
		},
		board: [
			"tileGrey",
			"white",
			"greyDoor",
			"blackSlab",
			"smokeOak",
			"gunmetal"
		]
	},
	mid: {
		name: "中古",
		blurb: "胡桃人字拼 · 墨绿 · 焦糖皮",
		roles: {
			"floor.main": "walnut",
			"floor.wet": "tileSage",
			"wall.main": "cream",
			"wall.accent": "forest",
			"wood.main": "teak",
			"cabinet.front": "teak",
			"stone.top": "travertine",
			"metal": "brass",
			"fabric.main": "mustard",
			"fabric.accent": "caramel",
			"rug": "rugWool"
		},
		board: [
			"walnut",
			"forest",
			"teak",
			"caramel",
			"mustard",
			"brass"
		]
	},
	nordic: {
		name: "北欧",
		blurb: "白蜡木 · 雾霾蓝 · 浅灰布",
		roles: {
			"floor.main": "ash",
			"floor.wet": "tileGrey",
			"wall.main": "white",
			"wall.accent": "mist",
			"wood.main": "ash",
			"cabinet.front": "white",
			"stone.top": "slab",
			"metal": "gunmetal",
			"fabric.main": "fog",
			"fabric.accent": "mist",
			"rug": "rugGrey"
		},
		board: [
			"ash",
			"white",
			"mist",
			"fog",
			"slab",
			"rattan"
		]
	},
	zh: {
		name: "新中式",
		blurb: "黑胡桃 · 宣纸白 · 黛青",
		roles: {
			"floor.main": "walnut",
			"floor.wet": "tileWarm",
			"wall.main": "rice",
			"wall.accent": "daiqing",
			"wood.main": "walnutV",
			"cabinet.front": "walnutV",
			"stone.top": "slab",
			"metal": "bronze",
			"fabric.main": "linen",
			"fabric.accent": "daiqing",
			"rug": "rugWool"
		},
		board: [
			"walnutV",
			"rice",
			"daiqing",
			"slab",
			"linen",
			"bronze"
		]
	}
};
var categories = {
	"木地板": "wood-floor",
	"瓷砖": "tile",
	"微水泥": "microcement",
	"涂料": "texture-paint",
	"乳胶漆": "paint",
	"木饰面": "veneer",
	"柜门": "laminate",
	"石材": "stone",
	"金属": "metal",
	"布艺": "fabric",
	"皮革": "leather",
	"地毯": "fabric",
	"藤编": "rattan"
};
var BUILTIN_MATERIALS = Object.entries(sampleMaterials).map(([id, value]) => {
	const m = value;
	return {
		id,
		name: m.name,
		category: categories[m.cat],
		color: m.color,
		...m.tex ? { texture: {
			kind: m.tex === "herring" ? "herringbone" : m.tex,
			...m.size ? { size: [...m.size] } : {}
		} } : {}
	};
});
var STYLE_PRESETS = Object.entries(sampleStyles).map(([id, p]) => ({
	id,
	name: p.name,
	blurb: p.blurb,
	by: "builtin",
	roles: {
		...p.roles,
		"floor.outdoor": p.roles["floor.wet"],
		"wall.wet": p.roles["floor.wet"],
		ceiling: "white",
		skirting: p.roles["wood.main"],
		threshold: p.roles["stone.top"],
		"cabinet.carcass": p.roles["cabinet.front"]
	},
	board: [...p.board],
	rooms: [{
		match: ["卫", "厨"],
		floor: "floor.wet",
		wall: "wall.wet"
	}, {
		match: ["阳台"],
		floor: "floor.outdoor"
	}],
	trims: {
		skirting: {
			height: .08,
			role: "skirting"
		},
		threshold: true
	}
}));
function createDecor(style = "cream") {
	return {
		version: 1,
		style,
		materials: structuredClone(BUILTIN_MATERIALS),
		surfaces: [],
		furniture: [],
		cabinets: [],
		panels: [],
		recesses: []
	};
}
// node_modules/ajv/dist/compile/codegen/code.js
var require_code$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
	var _CodeOrName = class {};
	exports._CodeOrName = _CodeOrName;
	exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
	var Name = class extends _CodeOrName {
		constructor(s) {
			super();
			if (!exports.IDENTIFIER.test(s)) throw new Error("CodeGen: name must be a valid identifier");
			this.str = s;
		}
		toString() {
			return this.str;
		}
		emptyStr() {
			return false;
		}
		get names() {
			return { [this.str]: 1 };
		}
	};
	exports.Name = Name;
	var _Code = class extends _CodeOrName {
		constructor(code) {
			super();
			this._items = typeof code === "string" ? [code] : code;
		}
		toString() {
			return this.str;
		}
		emptyStr() {
			if (this._items.length > 1) return false;
			const item = this._items[0];
			return item === "" || item === "\"\"";
		}
		get str() {
			var _a;
			return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
		}
		get names() {
			var _a;
			return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c) => {
				if (c instanceof Name) names[c.str] = (names[c.str] || 0) + 1;
				return names;
			}, {});
		}
	};
	exports._Code = _Code;
	exports.nil = new _Code("");
	function _(strs, ...args) {
		const code = [strs[0]];
		let i = 0;
		while (i < args.length) {
			addCodeArg(code, args[i]);
			code.push(strs[++i]);
		}
		return new _Code(code);
	}
	exports._ = _;
	var plus = new _Code("+");
	function str(strs, ...args) {
		const expr = [safeStringify(strs[0])];
		let i = 0;
		while (i < args.length) {
			expr.push(plus);
			addCodeArg(expr, args[i]);
			expr.push(plus, safeStringify(strs[++i]));
		}
		optimize(expr);
		return new _Code(expr);
	}
	exports.str = str;
	function addCodeArg(code, arg) {
		if (arg instanceof _Code) code.push(...arg._items);
		else if (arg instanceof Name) code.push(arg);
		else code.push(interpolate(arg));
	}
	exports.addCodeArg = addCodeArg;
	function optimize(expr) {
		let i = 1;
		while (i < expr.length - 1) {
			if (expr[i] === plus) {
				const res = mergeExprItems(expr[i - 1], expr[i + 1]);
				if (res !== void 0) {
					expr.splice(i - 1, 3, res);
					continue;
				}
				expr[i++] = "+";
			}
			i++;
		}
	}
	function mergeExprItems(a, b) {
		if (b === "\"\"") return a;
		if (a === "\"\"") return b;
		if (typeof a == "string") {
			if (b instanceof Name || a[a.length - 1] !== "\"") return;
			if (typeof b != "string") return `${a.slice(0, -1)}${b}"`;
			if (b[0] === "\"") return a.slice(0, -1) + b.slice(1);
			return;
		}
		if (typeof b == "string" && b[0] === "\"" && !(a instanceof Name)) return `"${a}${b.slice(1)}`;
	}
	function strConcat(c1, c2) {
		return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
	}
	exports.strConcat = strConcat;
	function interpolate(x) {
		return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
	}
	function stringify(x) {
		return new _Code(safeStringify(x));
	}
	exports.stringify = stringify;
	function safeStringify(x) {
		return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
	}
	exports.safeStringify = safeStringify;
	function getProperty(key) {
		return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
	}
	exports.getProperty = getProperty;
	function getEsmExportName(key) {
		if (typeof key == "string" && exports.IDENTIFIER.test(key)) return new _Code(`${key}`);
		throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
	}
	exports.getEsmExportName = getEsmExportName;
	function regexpCode(rx) {
		return new _Code(rx.toString());
	}
	exports.regexpCode = regexpCode;
}));
// node_modules/ajv/dist/compile/codegen/scope.js
var require_scope = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
	var code_1 = require_code$1();
	var ValueError = class extends Error {
		constructor(name) {
			super(`CodeGen: "code" for ${name} not defined`);
			this.value = name.value;
		}
	};
	var UsedValueState;
	(function(UsedValueState) {
		UsedValueState[UsedValueState["Started"] = 0] = "Started";
		UsedValueState[UsedValueState["Completed"] = 1] = "Completed";
	})(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
	exports.varKinds = {
		const: new code_1.Name("const"),
		let: new code_1.Name("let"),
		var: new code_1.Name("var")
	};
	var Scope = class {
		constructor({ prefixes, parent } = {}) {
			this._names = {};
			this._prefixes = prefixes;
			this._parent = parent;
		}
		toName(nameOrPrefix) {
			return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
		}
		name(prefix) {
			return new code_1.Name(this._newName(prefix));
		}
		_newName(prefix) {
			const ng = this._names[prefix] || this._nameGroup(prefix);
			return `${prefix}${ng.index++}`;
		}
		_nameGroup(prefix) {
			var _a, _b;
			if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
			return this._names[prefix] = {
				prefix,
				index: 0
			};
		}
	};
	exports.Scope = Scope;
	var ValueScopeName = class extends code_1.Name {
		constructor(prefix, nameStr) {
			super(nameStr);
			this.prefix = prefix;
		}
		setValue(value, { property, itemIndex }) {
			this.value = value;
			this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
		}
	};
	exports.ValueScopeName = ValueScopeName;
	var line = (0, code_1._)`\n`;
	var ValueScope = class extends Scope {
		constructor(opts) {
			super(opts);
			this._values = {};
			this._scope = opts.scope;
			this.opts = {
				...opts,
				_n: opts.lines ? line : code_1.nil
			};
		}
		get() {
			return this._scope;
		}
		name(prefix) {
			return new ValueScopeName(prefix, this._newName(prefix));
		}
		value(nameOrPrefix, value) {
			var _a;
			if (value.ref === void 0) throw new Error("CodeGen: ref must be passed in value");
			const name = this.toName(nameOrPrefix);
			const { prefix } = name;
			const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
			let vs = this._values[prefix];
			if (vs) {
				const _name = vs.get(valueKey);
				if (_name) return _name;
			} else vs = this._values[prefix] = /* @__PURE__ */ new Map();
			vs.set(valueKey, name);
			const s = this._scope[prefix] || (this._scope[prefix] = []);
			const itemIndex = s.length;
			s[itemIndex] = value.ref;
			name.setValue(value, {
				property: prefix,
				itemIndex
			});
			return name;
		}
		getValue(prefix, keyOrRef) {
			const vs = this._values[prefix];
			if (!vs) return;
			return vs.get(keyOrRef);
		}
		scopeRefs(scopeName, values = this._values) {
			return this._reduceValues(values, (name) => {
				if (name.scopePath === void 0) throw new Error(`CodeGen: name "${name}" has no value`);
				return (0, code_1._)`${scopeName}${name.scopePath}`;
			});
		}
		scopeCode(values = this._values, usedValues, getCode) {
			return this._reduceValues(values, (name) => {
				if (name.value === void 0) throw new Error(`CodeGen: name "${name}" has no value`);
				return name.value.code;
			}, usedValues, getCode);
		}
		_reduceValues(values, valueCode, usedValues = {}, getCode) {
			let code = code_1.nil;
			for (const prefix in values) {
				const vs = values[prefix];
				if (!vs) continue;
				const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
				vs.forEach((name) => {
					if (nameSet.has(name)) return;
					nameSet.set(name, UsedValueState.Started);
					let c = valueCode(name);
					if (c) {
						const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
						code = (0, code_1._)`${code}${def} ${name} = ${c};${this.opts._n}`;
					} else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) code = (0, code_1._)`${code}${c}${this.opts._n}`;
					else throw new ValueError(name);
					nameSet.set(name, UsedValueState.Completed);
				});
			}
			return code;
		}
	};
	exports.ValueScope = ValueScope;
}));
// node_modules/ajv/dist/compile/codegen/index.js
var require_codegen = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
	var code_1 = require_code$1();
	var scope_1 = require_scope();
	var code_2 = require_code$1();
	Object.defineProperty(exports, "_", {
		enumerable: true,
		get: function() {
			return code_2._;
		}
	});
	Object.defineProperty(exports, "str", {
		enumerable: true,
		get: function() {
			return code_2.str;
		}
	});
	Object.defineProperty(exports, "strConcat", {
		enumerable: true,
		get: function() {
			return code_2.strConcat;
		}
	});
	Object.defineProperty(exports, "nil", {
		enumerable: true,
		get: function() {
			return code_2.nil;
		}
	});
	Object.defineProperty(exports, "getProperty", {
		enumerable: true,
		get: function() {
			return code_2.getProperty;
		}
	});
	Object.defineProperty(exports, "stringify", {
		enumerable: true,
		get: function() {
			return code_2.stringify;
		}
	});
	Object.defineProperty(exports, "regexpCode", {
		enumerable: true,
		get: function() {
			return code_2.regexpCode;
		}
	});
	Object.defineProperty(exports, "Name", {
		enumerable: true,
		get: function() {
			return code_2.Name;
		}
	});
	var scope_2 = require_scope();
	Object.defineProperty(exports, "Scope", {
		enumerable: true,
		get: function() {
			return scope_2.Scope;
		}
	});
	Object.defineProperty(exports, "ValueScope", {
		enumerable: true,
		get: function() {
			return scope_2.ValueScope;
		}
	});
	Object.defineProperty(exports, "ValueScopeName", {
		enumerable: true,
		get: function() {
			return scope_2.ValueScopeName;
		}
	});
	Object.defineProperty(exports, "varKinds", {
		enumerable: true,
		get: function() {
			return scope_2.varKinds;
		}
	});
	exports.operators = {
		GT: new code_1._Code(">"),
		GTE: new code_1._Code(">="),
		LT: new code_1._Code("<"),
		LTE: new code_1._Code("<="),
		EQ: new code_1._Code("==="),
		NEQ: new code_1._Code("!=="),
		NOT: new code_1._Code("!"),
		OR: new code_1._Code("||"),
		AND: new code_1._Code("&&"),
		ADD: new code_1._Code("+")
	};
	var Node = class {
		optimizeNodes() {
			return this;
		}
		optimizeNames(_names, _constants) {
			return this;
		}
	};
	var Def = class extends Node {
		constructor(varKind, name, rhs) {
			super();
			this.varKind = varKind;
			this.name = name;
			this.rhs = rhs;
		}
		render({ es5, _n }) {
			const varKind = es5 ? scope_1.varKinds.var : this.varKind;
			const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
			return `${varKind} ${this.name}${rhs};` + _n;
		}
		optimizeNames(names, constants) {
			if (!names[this.name.str]) return;
			if (this.rhs) this.rhs = optimizeExpr(this.rhs, names, constants);
			return this;
		}
		get names() {
			return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
		}
	};
	var Assign = class extends Node {
		constructor(lhs, rhs, sideEffects) {
			super();
			this.lhs = lhs;
			this.rhs = rhs;
			this.sideEffects = sideEffects;
		}
		render({ _n }) {
			return `${this.lhs} = ${this.rhs};` + _n;
		}
		optimizeNames(names, constants) {
			if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects) return;
			this.rhs = optimizeExpr(this.rhs, names, constants);
			return this;
		}
		get names() {
			return addExprNames(this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names }, this.rhs);
		}
	};
	var AssignOp = class extends Assign {
		constructor(lhs, op, rhs, sideEffects) {
			super(lhs, rhs, sideEffects);
			this.op = op;
		}
		render({ _n }) {
			return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
		}
	};
	var Label = class extends Node {
		constructor(label) {
			super();
			this.label = label;
			this.names = {};
		}
		render({ _n }) {
			return `${this.label}:` + _n;
		}
	};
	var Break = class extends Node {
		constructor(label) {
			super();
			this.label = label;
			this.names = {};
		}
		render({ _n }) {
			return `break${this.label ? ` ${this.label}` : ""};` + _n;
		}
	};
	var Throw = class extends Node {
		constructor(error) {
			super();
			this.error = error;
		}
		render({ _n }) {
			return `throw ${this.error};` + _n;
		}
		get names() {
			return this.error.names;
		}
	};
	var AnyCode = class extends Node {
		constructor(code) {
			super();
			this.code = code;
		}
		render({ _n }) {
			return `${this.code};` + _n;
		}
		optimizeNodes() {
			return `${this.code}` ? this : void 0;
		}
		optimizeNames(names, constants) {
			this.code = optimizeExpr(this.code, names, constants);
			return this;
		}
		get names() {
			return this.code instanceof code_1._CodeOrName ? this.code.names : {};
		}
	};
	var ParentNode = class extends Node {
		constructor(nodes = []) {
			super();
			this.nodes = nodes;
		}
		render(opts) {
			return this.nodes.reduce((code, n) => code + n.render(opts), "");
		}
		optimizeNodes() {
			const { nodes } = this;
			let i = nodes.length;
			while (i--) {
				const n = nodes[i].optimizeNodes();
				if (Array.isArray(n)) nodes.splice(i, 1, ...n);
				else if (n) nodes[i] = n;
				else nodes.splice(i, 1);
			}
			return nodes.length > 0 ? this : void 0;
		}
		optimizeNames(names, constants) {
			const { nodes } = this;
			let i = nodes.length;
			while (i--) {
				const n = nodes[i];
				if (n.optimizeNames(names, constants)) continue;
				subtractNames(names, n.names);
				nodes.splice(i, 1);
			}
			return nodes.length > 0 ? this : void 0;
		}
		get names() {
			return this.nodes.reduce((names, n) => addNames(names, n.names), {});
		}
	};
	var BlockNode = class extends ParentNode {
		render(opts) {
			return "{" + opts._n + super.render(opts) + "}" + opts._n;
		}
	};
	var Root = class extends ParentNode {};
	var Else = class extends BlockNode {};
	Else.kind = "else";
	var If = class If extends BlockNode {
		constructor(condition, nodes) {
			super(nodes);
			this.condition = condition;
		}
		render(opts) {
			let code = `if(${this.condition})` + super.render(opts);
			if (this.else) code += "else " + this.else.render(opts);
			return code;
		}
		optimizeNodes() {
			super.optimizeNodes();
			const cond = this.condition;
			if (cond === true) return this.nodes;
			let e = this.else;
			if (e) {
				const ns = e.optimizeNodes();
				e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
			}
			if (e) {
				if (cond === false) return e instanceof If ? e : e.nodes;
				if (this.nodes.length) return this;
				return new If(not(cond), e instanceof If ? [e] : e.nodes);
			}
			if (cond === false || !this.nodes.length) return void 0;
			return this;
		}
		optimizeNames(names, constants) {
			var _a;
			this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
			if (!(super.optimizeNames(names, constants) || this.else)) return;
			this.condition = optimizeExpr(this.condition, names, constants);
			return this;
		}
		get names() {
			const names = super.names;
			addExprNames(names, this.condition);
			if (this.else) addNames(names, this.else.names);
			return names;
		}
	};
	If.kind = "if";
	var For = class extends BlockNode {};
	For.kind = "for";
	var ForLoop = class extends For {
		constructor(iteration) {
			super();
			this.iteration = iteration;
		}
		render(opts) {
			return `for(${this.iteration})` + super.render(opts);
		}
		optimizeNames(names, constants) {
			if (!super.optimizeNames(names, constants)) return;
			this.iteration = optimizeExpr(this.iteration, names, constants);
			return this;
		}
		get names() {
			return addNames(super.names, this.iteration.names);
		}
	};
	var ForRange = class extends For {
		constructor(varKind, name, from, to) {
			super();
			this.varKind = varKind;
			this.name = name;
			this.from = from;
			this.to = to;
		}
		render(opts) {
			const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
			const { name, from, to } = this;
			return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
		}
		get names() {
			return addExprNames(addExprNames(super.names, this.from), this.to);
		}
	};
	var ForIter = class extends For {
		constructor(loop, varKind, name, iterable) {
			super();
			this.loop = loop;
			this.varKind = varKind;
			this.name = name;
			this.iterable = iterable;
		}
		render(opts) {
			return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
		}
		optimizeNames(names, constants) {
			if (!super.optimizeNames(names, constants)) return;
			this.iterable = optimizeExpr(this.iterable, names, constants);
			return this;
		}
		get names() {
			return addNames(super.names, this.iterable.names);
		}
	};
	var Func = class extends BlockNode {
		constructor(name, args, async) {
			super();
			this.name = name;
			this.args = args;
			this.async = async;
		}
		render(opts) {
			return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(opts);
		}
	};
	Func.kind = "func";
	var Return = class extends ParentNode {
		render(opts) {
			return "return " + super.render(opts);
		}
	};
	Return.kind = "return";
	var Try = class extends BlockNode {
		render(opts) {
			let code = "try" + super.render(opts);
			if (this.catch) code += this.catch.render(opts);
			if (this.finally) code += this.finally.render(opts);
			return code;
		}
		optimizeNodes() {
			var _a, _b;
			super.optimizeNodes();
			(_a = this.catch) === null || _a === void 0 || _a.optimizeNodes();
			(_b = this.finally) === null || _b === void 0 || _b.optimizeNodes();
			return this;
		}
		optimizeNames(names, constants) {
			var _a, _b;
			super.optimizeNames(names, constants);
			(_a = this.catch) === null || _a === void 0 || _a.optimizeNames(names, constants);
			(_b = this.finally) === null || _b === void 0 || _b.optimizeNames(names, constants);
			return this;
		}
		get names() {
			const names = super.names;
			if (this.catch) addNames(names, this.catch.names);
			if (this.finally) addNames(names, this.finally.names);
			return names;
		}
	};
	var Catch = class extends BlockNode {
		constructor(error) {
			super();
			this.error = error;
		}
		render(opts) {
			return `catch(${this.error})` + super.render(opts);
		}
	};
	Catch.kind = "catch";
	var Finally = class extends BlockNode {
		render(opts) {
			return "finally" + super.render(opts);
		}
	};
	Finally.kind = "finally";
	var CodeGen = class {
		constructor(extScope, opts = {}) {
			this._values = {};
			this._blockStarts = [];
			this._constants = {};
			this.opts = {
				...opts,
				_n: opts.lines ? "\n" : ""
			};
			this._extScope = extScope;
			this._scope = new scope_1.Scope({ parent: extScope });
			this._nodes = [new Root()];
		}
		toString() {
			return this._root.render(this.opts);
		}
		name(prefix) {
			return this._scope.name(prefix);
		}
		scopeName(prefix) {
			return this._extScope.name(prefix);
		}
		scopeValue(prefixOrName, value) {
			const name = this._extScope.value(prefixOrName, value);
			(this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set())).add(name);
			return name;
		}
		getScopeValue(prefix, keyOrRef) {
			return this._extScope.getValue(prefix, keyOrRef);
		}
		scopeRefs(scopeName) {
			return this._extScope.scopeRefs(scopeName, this._values);
		}
		scopeCode() {
			return this._extScope.scopeCode(this._values);
		}
		_def(varKind, nameOrPrefix, rhs, constant) {
			const name = this._scope.toName(nameOrPrefix);
			if (rhs !== void 0 && constant) this._constants[name.str] = rhs;
			this._leafNode(new Def(varKind, name, rhs));
			return name;
		}
		const(nameOrPrefix, rhs, _constant) {
			return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
		}
		let(nameOrPrefix, rhs, _constant) {
			return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
		}
		var(nameOrPrefix, rhs, _constant) {
			return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
		}
		assign(lhs, rhs, sideEffects) {
			return this._leafNode(new Assign(lhs, rhs, sideEffects));
		}
		add(lhs, rhs) {
			return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
		}
		code(c) {
			if (typeof c == "function") c();
			else if (c !== code_1.nil) this._leafNode(new AnyCode(c));
			return this;
		}
		object(...keyValues) {
			const code = ["{"];
			for (const [key, value] of keyValues) {
				if (code.length > 1) code.push(",");
				code.push(key);
				if (key !== value || this.opts.es5) {
					code.push(":");
					(0, code_1.addCodeArg)(code, value);
				}
			}
			code.push("}");
			return new code_1._Code(code);
		}
		if(condition, thenBody, elseBody) {
			this._blockNode(new If(condition));
			if (thenBody && elseBody) this.code(thenBody).else().code(elseBody).endIf();
			else if (thenBody) this.code(thenBody).endIf();
			else if (elseBody) throw new Error("CodeGen: \"else\" body without \"then\" body");
			return this;
		}
		elseIf(condition) {
			return this._elseNode(new If(condition));
		}
		else() {
			return this._elseNode(new Else());
		}
		endIf() {
			return this._endBlockNode(If, Else);
		}
		_for(node, forBody) {
			this._blockNode(node);
			if (forBody) this.code(forBody).endFor();
			return this;
		}
		for(iteration, forBody) {
			return this._for(new ForLoop(iteration), forBody);
		}
		forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
			const name = this._scope.toName(nameOrPrefix);
			return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
		}
		forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
			const name = this._scope.toName(nameOrPrefix);
			if (this.opts.es5) {
				const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
				return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
					this.var(name, (0, code_1._)`${arr}[${i}]`);
					forBody(name);
				});
			}
			return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
		}
		forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
			if (this.opts.ownProperties) return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
			const name = this._scope.toName(nameOrPrefix);
			return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
		}
		endFor() {
			return this._endBlockNode(For);
		}
		label(label) {
			return this._leafNode(new Label(label));
		}
		break(label) {
			return this._leafNode(new Break(label));
		}
		return(value) {
			const node = new Return();
			this._blockNode(node);
			this.code(value);
			if (node.nodes.length !== 1) throw new Error("CodeGen: \"return\" should have one node");
			return this._endBlockNode(Return);
		}
		try(tryBody, catchCode, finallyCode) {
			if (!catchCode && !finallyCode) throw new Error("CodeGen: \"try\" without \"catch\" and \"finally\"");
			const node = new Try();
			this._blockNode(node);
			this.code(tryBody);
			if (catchCode) {
				const error = this.name("e");
				this._currNode = node.catch = new Catch(error);
				catchCode(error);
			}
			if (finallyCode) {
				this._currNode = node.finally = new Finally();
				this.code(finallyCode);
			}
			return this._endBlockNode(Catch, Finally);
		}
		throw(error) {
			return this._leafNode(new Throw(error));
		}
		block(body, nodeCount) {
			this._blockStarts.push(this._nodes.length);
			if (body) this.code(body).endBlock(nodeCount);
			return this;
		}
		endBlock(nodeCount) {
			const len = this._blockStarts.pop();
			if (len === void 0) throw new Error("CodeGen: not in self-balancing block");
			const toClose = this._nodes.length - len;
			if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
			this._nodes.length = len;
			return this;
		}
		func(name, args = code_1.nil, async, funcBody) {
			this._blockNode(new Func(name, args, async));
			if (funcBody) this.code(funcBody).endFunc();
			return this;
		}
		endFunc() {
			return this._endBlockNode(Func);
		}
		optimize(n = 1) {
			while (n-- > 0) {
				this._root.optimizeNodes();
				this._root.optimizeNames(this._root.names, this._constants);
			}
		}
		_leafNode(node) {
			this._currNode.nodes.push(node);
			return this;
		}
		_blockNode(node) {
			this._currNode.nodes.push(node);
			this._nodes.push(node);
		}
		_endBlockNode(N1, N2) {
			const n = this._currNode;
			if (n instanceof N1 || N2 && n instanceof N2) {
				this._nodes.pop();
				return this;
			}
			throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
		}
		_elseNode(node) {
			const n = this._currNode;
			if (!(n instanceof If)) throw new Error("CodeGen: \"else\" without \"if\"");
			this._currNode = n.else = node;
			return this;
		}
		get _root() {
			return this._nodes[0];
		}
		get _currNode() {
			const ns = this._nodes;
			return ns[ns.length - 1];
		}
		set _currNode(node) {
			const ns = this._nodes;
			ns[ns.length - 1] = node;
		}
	};
	exports.CodeGen = CodeGen;
	function addNames(names, from) {
		for (const n in from) names[n] = (names[n] || 0) + (from[n] || 0);
		return names;
	}
	function addExprNames(names, from) {
		return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
	}
	function optimizeExpr(expr, names, constants) {
		if (expr instanceof code_1.Name) return replaceName(expr);
		if (!canOptimize(expr)) return expr;
		return new code_1._Code(expr._items.reduce((items, c) => {
			if (c instanceof code_1.Name) c = replaceName(c);
			if (c instanceof code_1._Code) items.push(...c._items);
			else items.push(c);
			return items;
		}, []));
		function replaceName(n) {
			const c = constants[n.str];
			if (c === void 0 || names[n.str] !== 1) return n;
			delete names[n.str];
			return c;
		}
		function canOptimize(e) {
			return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== void 0);
		}
	}
	function subtractNames(names, from) {
		for (const n in from) names[n] = (names[n] || 0) - (from[n] || 0);
	}
	function not(x) {
		return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
	}
	exports.not = not;
	var andCode = mappend(exports.operators.AND);
	function and(...args) {
		return args.reduce(andCode);
	}
	exports.and = and;
	var orCode = mappend(exports.operators.OR);
	function or(...args) {
		return args.reduce(orCode);
	}
	exports.or = or;
	function mappend(op) {
		return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
	}
	function par(x) {
		return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
	}
}));
// node_modules/ajv/dist/compile/util.js
var require_util = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.checkStrictMode = exports.getErrorPath = exports.Type = exports.useFunc = exports.setEvaluated = exports.evaluatedPropsToName = exports.mergeEvaluated = exports.eachItem = exports.unescapeJsonPointer = exports.escapeJsonPointer = exports.escapeFragment = exports.unescapeFragment = exports.schemaRefOrVal = exports.schemaHasRulesButRef = exports.schemaHasRules = exports.checkUnknownRules = exports.alwaysValidSchema = exports.toHash = void 0;
	var codegen_1 = require_codegen();
	var code_1 = require_code$1();
	function toHash(arr) {
		const hash = {};
		for (const item of arr) hash[item] = true;
		return hash;
	}
	exports.toHash = toHash;
	function alwaysValidSchema(it, schema) {
		if (typeof schema == "boolean") return schema;
		if (Object.keys(schema).length === 0) return true;
		checkUnknownRules(it, schema);
		return !schemaHasRules(schema, it.self.RULES.all);
	}
	exports.alwaysValidSchema = alwaysValidSchema;
	function checkUnknownRules(it, schema = it.schema) {
		const { opts, self } = it;
		if (!opts.strictSchema) return;
		if (typeof schema === "boolean") return;
		const rules = self.RULES.keywords;
		for (const key in schema) if (!rules[key]) checkStrictMode(it, `unknown keyword: "${key}"`);
	}
	exports.checkUnknownRules = checkUnknownRules;
	function schemaHasRules(schema, rules) {
		if (typeof schema == "boolean") return !schema;
		for (const key in schema) if (rules[key]) return true;
		return false;
	}
	exports.schemaHasRules = schemaHasRules;
	function schemaHasRulesButRef(schema, RULES) {
		if (typeof schema == "boolean") return !schema;
		for (const key in schema) if (key !== "$ref" && RULES.all[key]) return true;
		return false;
	}
	exports.schemaHasRulesButRef = schemaHasRulesButRef;
	function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
		if (!$data) {
			if (typeof schema == "number" || typeof schema == "boolean") return schema;
			if (typeof schema == "string") return (0, codegen_1._)`${schema}`;
		}
		return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
	}
	exports.schemaRefOrVal = schemaRefOrVal;
	function unescapeFragment(str) {
		return unescapeJsonPointer(decodeURIComponent(str));
	}
	exports.unescapeFragment = unescapeFragment;
	function escapeFragment(str) {
		return encodeURIComponent(escapeJsonPointer(str));
	}
	exports.escapeFragment = escapeFragment;
	function escapeJsonPointer(str) {
		if (typeof str == "number") return `${str}`;
		return str.replace(/~/g, "~0").replace(/\//g, "~1");
	}
	exports.escapeJsonPointer = escapeJsonPointer;
	function unescapeJsonPointer(str) {
		return str.replace(/~1/g, "/").replace(/~0/g, "~");
	}
	exports.unescapeJsonPointer = unescapeJsonPointer;
	function eachItem(xs, f) {
		if (Array.isArray(xs)) for (const x of xs) f(x);
		else f(xs);
	}
	exports.eachItem = eachItem;
	function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
		return (gen, from, to, toName) => {
			const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
			return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
		};
	}
	exports.mergeEvaluated = {
		props: makeMergeEvaluated({
			mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
				gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
			}),
			mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
				if (from === true) gen.assign(to, true);
				else {
					gen.assign(to, (0, codegen_1._)`${to} || {}`);
					setEvaluated(gen, to, from);
				}
			}),
			mergeValues: (from, to) => from === true ? true : {
				...from,
				...to
			},
			resultToName: evaluatedPropsToName
		}),
		items: makeMergeEvaluated({
			mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
			mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
			mergeValues: (from, to) => from === true ? true : Math.max(from, to),
			resultToName: (gen, items) => gen.var("items", items)
		})
	};
	function evaluatedPropsToName(gen, ps) {
		if (ps === true) return gen.var("props", true);
		const props = gen.var("props", (0, codegen_1._)`{}`);
		if (ps !== void 0) setEvaluated(gen, props, ps);
		return props;
	}
	exports.evaluatedPropsToName = evaluatedPropsToName;
	function setEvaluated(gen, props, ps) {
		Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
	}
	exports.setEvaluated = setEvaluated;
	var snippets = {};
	function useFunc(gen, f) {
		return gen.scopeValue("func", {
			ref: f,
			code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
		});
	}
	exports.useFunc = useFunc;
	var Type;
	(function(Type) {
		Type[Type["Num"] = 0] = "Num";
		Type[Type["Str"] = 1] = "Str";
	})(Type || (exports.Type = Type = {}));
	function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
		if (dataProp instanceof codegen_1.Name) {
			const isNumber = dataPropType === Type.Num;
			return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
		}
		return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
	}
	exports.getErrorPath = getErrorPath;
	function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
		if (!mode) return;
		msg = `strict mode: ${msg}`;
		if (mode === true) throw new Error(msg);
		it.self.logger.warn(msg);
	}
	exports.checkStrictMode = checkStrictMode;
}));
// node_modules/ajv/dist/compile/names.js
var require_names = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	exports.default = {
		data: new codegen_1.Name("data"),
		valCxt: new codegen_1.Name("valCxt"),
		instancePath: new codegen_1.Name("instancePath"),
		parentData: new codegen_1.Name("parentData"),
		parentDataProperty: new codegen_1.Name("parentDataProperty"),
		rootData: new codegen_1.Name("rootData"),
		dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
		vErrors: new codegen_1.Name("vErrors"),
		errors: new codegen_1.Name("errors"),
		this: new codegen_1.Name("this"),
		self: new codegen_1.Name("self"),
		scope: new codegen_1.Name("scope"),
		json: new codegen_1.Name("json"),
		jsonPos: new codegen_1.Name("jsonPos"),
		jsonLen: new codegen_1.Name("jsonLen"),
		jsonPart: new codegen_1.Name("jsonPart")
	};
}));
// node_modules/ajv/dist/compile/errors.js
var require_errors = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var names_1 = require_names();
	exports.keywordError = { message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation` };
	exports.keyword$DataError = { message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)` };
	function reportError(cxt, error = exports.keywordError, errorPaths, overrideAllErrors) {
		const { it } = cxt;
		const { gen, compositeRule, allErrors } = it;
		const errObj = errorObjectCode(cxt, error, errorPaths);
		if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) addError(gen, errObj);
		else returnErrors(it, (0, codegen_1._)`[${errObj}]`);
	}
	exports.reportError = reportError;
	function reportExtraError(cxt, error = exports.keywordError, errorPaths) {
		const { it } = cxt;
		const { gen, compositeRule, allErrors } = it;
		addError(gen, errorObjectCode(cxt, error, errorPaths));
		if (!(compositeRule || allErrors)) returnErrors(it, names_1.default.vErrors);
	}
	exports.reportExtraError = reportExtraError;
	function resetErrorsCount(gen, errsCount) {
		gen.assign(names_1.default.errors, errsCount);
		gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
	}
	exports.resetErrorsCount = resetErrorsCount;
	function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
		/* istanbul ignore if */
		if (errsCount === void 0) throw new Error("ajv implementation error");
		const err = gen.name("err");
		gen.forRange("i", errsCount, names_1.default.errors, (i) => {
			gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
			gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
			gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
			if (it.opts.verbose) {
				gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
				gen.assign((0, codegen_1._)`${err}.data`, data);
			}
		});
	}
	exports.extendErrors = extendErrors;
	function addError(gen, errObj) {
		const err = gen.const("err", errObj);
		gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
		gen.code((0, codegen_1._)`${names_1.default.errors}++`);
	}
	function returnErrors(it, errs) {
		const { gen, validateName, schemaEnv } = it;
		if (schemaEnv.$async) gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
		else {
			gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
			gen.return(false);
		}
	}
	var E = {
		keyword: new codegen_1.Name("keyword"),
		schemaPath: new codegen_1.Name("schemaPath"),
		params: new codegen_1.Name("params"),
		propertyName: new codegen_1.Name("propertyName"),
		message: new codegen_1.Name("message"),
		schema: new codegen_1.Name("schema"),
		parentSchema: new codegen_1.Name("parentSchema")
	};
	function errorObjectCode(cxt, error, errorPaths) {
		const { createErrors } = cxt.it;
		if (createErrors === false) return (0, codegen_1._)`{}`;
		return errorObject(cxt, error, errorPaths);
	}
	function errorObject(cxt, error, errorPaths = {}) {
		const { gen, it } = cxt;
		const keyValues = [errorInstancePath(it, errorPaths), errorSchemaPath(cxt, errorPaths)];
		extraErrorProps(cxt, error, keyValues);
		return gen.object(...keyValues);
	}
	function errorInstancePath({ errorPath }, { instancePath }) {
		const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
		return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
	}
	function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
		let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
		if (schemaPath) schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
		return [E.schemaPath, schPath];
	}
	function extraErrorProps(cxt, { params, message }, keyValues) {
		const { keyword, data, schemaValue, it } = cxt;
		const { opts, propertyName, topSchemaRef, schemaPath } = it;
		keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
		if (opts.messages) keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
		if (opts.verbose) keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
		if (propertyName) keyValues.push([E.propertyName, propertyName]);
	}
}));
// node_modules/ajv/dist/compile/validate/boolSchema.js
var require_boolSchema = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.boolOrEmptySchema = exports.topBoolOrEmptySchema = void 0;
	var errors_1 = require_errors();
	var codegen_1 = require_codegen();
	var names_1 = require_names();
	var boolError = { message: "boolean schema is false" };
	function topBoolOrEmptySchema(it) {
		const { gen, schema, validateName } = it;
		if (schema === false) falseSchemaError(it, false);
		else if (typeof schema == "object" && schema.$async === true) gen.return(names_1.default.data);
		else {
			gen.assign((0, codegen_1._)`${validateName}.errors`, null);
			gen.return(true);
		}
	}
	exports.topBoolOrEmptySchema = topBoolOrEmptySchema;
	function boolOrEmptySchema(it, valid) {
		const { gen, schema } = it;
		if (schema === false) {
			gen.var(valid, false);
			falseSchemaError(it);
		} else gen.var(valid, true);
	}
	exports.boolOrEmptySchema = boolOrEmptySchema;
	function falseSchemaError(it, overrideAllErrors) {
		const { gen, data } = it;
		const cxt = {
			gen,
			keyword: "false schema",
			data,
			schema: false,
			schemaCode: false,
			schemaValue: false,
			params: {},
			it
		};
		(0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
	}
}));
// node_modules/ajv/dist/compile/rules.js
var require_rules = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getRules = exports.isJSONType = void 0;
	var jsonTypes = /* @__PURE__ */ new Set([
		"string",
		"number",
		"integer",
		"boolean",
		"null",
		"object",
		"array"
	]);
	function isJSONType(x) {
		return typeof x == "string" && jsonTypes.has(x);
	}
	exports.isJSONType = isJSONType;
	function getRules() {
		const groups = {
			number: {
				type: "number",
				rules: []
			},
			string: {
				type: "string",
				rules: []
			},
			array: {
				type: "array",
				rules: []
			},
			object: {
				type: "object",
				rules: []
			}
		};
		return {
			types: {
				...groups,
				integer: true,
				boolean: true,
				null: true
			},
			rules: [
				{ rules: [] },
				groups.number,
				groups.string,
				groups.array,
				groups.object
			],
			post: { rules: [] },
			all: {},
			keywords: {}
		};
	}
	exports.getRules = getRules;
}));
// node_modules/ajv/dist/compile/validate/applicability.js
var require_applicability = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.shouldUseRule = exports.shouldUseGroup = exports.schemaHasRulesForType = void 0;
	function schemaHasRulesForType({ schema, self }, type) {
		const group = self.RULES.types[type];
		return group && group !== true && shouldUseGroup(schema, group);
	}
	exports.schemaHasRulesForType = schemaHasRulesForType;
	function shouldUseGroup(schema, group) {
		return group.rules.some((rule) => shouldUseRule(schema, rule));
	}
	exports.shouldUseGroup = shouldUseGroup;
	function shouldUseRule(schema, rule) {
		var _a;
		return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
	}
	exports.shouldUseRule = shouldUseRule;
}));
// node_modules/ajv/dist/compile/validate/dataType.js
var require_dataType = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.reportTypeError = exports.checkDataTypes = exports.checkDataType = exports.coerceAndCheckDataType = exports.getJSONTypes = exports.getSchemaTypes = exports.DataType = void 0;
	var rules_1 = require_rules();
	var applicability_1 = require_applicability();
	var errors_1 = require_errors();
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var DataType;
	(function(DataType) {
		DataType[DataType["Correct"] = 0] = "Correct";
		DataType[DataType["Wrong"] = 1] = "Wrong";
	})(DataType || (exports.DataType = DataType = {}));
	function getSchemaTypes(schema) {
		const types = getJSONTypes(schema.type);
		if (types.includes("null")) {
			if (schema.nullable === false) throw new Error("type: null contradicts nullable: false");
		} else {
			if (!types.length && schema.nullable !== void 0) throw new Error("\"nullable\" cannot be used without \"type\"");
			if (schema.nullable === true) types.push("null");
		}
		return types;
	}
	exports.getSchemaTypes = getSchemaTypes;
	function getJSONTypes(ts) {
		const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
		if (types.every(rules_1.isJSONType)) return types;
		throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
	}
	exports.getJSONTypes = getJSONTypes;
	function coerceAndCheckDataType(it, types) {
		const { gen, data, opts } = it;
		const coerceTo = coerceToTypes(types, opts.coerceTypes);
		const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
		if (checkTypes) {
			const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
			gen.if(wrongType, () => {
				if (coerceTo.length) coerceData(it, types, coerceTo);
				else reportTypeError(it);
			});
		}
		return checkTypes;
	}
	exports.coerceAndCheckDataType = coerceAndCheckDataType;
	var COERCIBLE = /* @__PURE__ */ new Set([
		"string",
		"number",
		"integer",
		"boolean",
		"null"
	]);
	function coerceToTypes(types, coerceTypes) {
		return coerceTypes ? types.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
	}
	function coerceData(it, types, coerceTo) {
		const { gen, data, opts } = it;
		const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
		const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
		if (opts.coerceTypes === "array") gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
		gen.if((0, codegen_1._)`${coerced} !== undefined`);
		for (const t of coerceTo) if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") coerceSpecificType(t);
		gen.else();
		reportTypeError(it);
		gen.endIf();
		gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
			gen.assign(data, coerced);
			assignParentData(it, coerced);
		});
		function coerceSpecificType(t) {
			switch (t) {
				case "string":
					gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
					return;
				case "number":
					gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
					return;
				case "integer":
					gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
					return;
				case "boolean":
					gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
					return;
				case "null":
					gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
					gen.assign(coerced, null);
					return;
				case "array": gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
			}
		}
	}
	function assignParentData({ gen, parentData, parentDataProperty }, expr) {
		gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
	}
	function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
		const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
		let cond;
		switch (dataType) {
			case "null": return (0, codegen_1._)`${data} ${EQ} null`;
			case "array":
				cond = (0, codegen_1._)`Array.isArray(${data})`;
				break;
			case "object":
				cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
				break;
			case "integer":
				cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
				break;
			case "number":
				cond = numCond();
				break;
			default: return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
		}
		return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
		function numCond(_cond = codegen_1.nil) {
			return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
		}
	}
	exports.checkDataType = checkDataType;
	function checkDataTypes(dataTypes, data, strictNums, correct) {
		if (dataTypes.length === 1) return checkDataType(dataTypes[0], data, strictNums, correct);
		let cond;
		const types = (0, util_1.toHash)(dataTypes);
		if (types.array && types.object) {
			const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
			cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
			delete types.null;
			delete types.array;
			delete types.object;
		} else cond = codegen_1.nil;
		if (types.number) delete types.integer;
		for (const t in types) cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
		return cond;
	}
	exports.checkDataTypes = checkDataTypes;
	var typeError = {
		message: ({ schema }) => `must be ${schema}`,
		params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
	};
	function reportTypeError(it) {
		const cxt = getTypeErrorContext(it);
		(0, errors_1.reportError)(cxt, typeError);
	}
	exports.reportTypeError = reportTypeError;
	function getTypeErrorContext(it) {
		const { gen, data, schema } = it;
		const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
		return {
			gen,
			keyword: "type",
			data,
			schema: schema.type,
			schemaCode,
			schemaValue: schemaCode,
			parentSchema: schema,
			params: {},
			it
		};
	}
}));
// node_modules/ajv/dist/compile/validate/defaults.js
var require_defaults = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.assignDefaults = void 0;
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	function assignDefaults(it, ty) {
		const { properties, items } = it.schema;
		if (ty === "object" && properties) for (const key in properties) assignDefault(it, key, properties[key].default);
		else if (ty === "array" && Array.isArray(items)) items.forEach((sch, i) => assignDefault(it, i, sch.default));
	}
	exports.assignDefaults = assignDefaults;
	function assignDefault(it, prop, defaultValue) {
		const { gen, compositeRule, data, opts } = it;
		if (defaultValue === void 0) return;
		const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
		if (compositeRule) {
			(0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
			return;
		}
		let condition = (0, codegen_1._)`${childData} === undefined`;
		if (opts.useDefaults === "empty") condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
		gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
	}
}));
// node_modules/ajv/dist/vocabularies/code.js
var require_code = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.validateUnion = exports.validateArray = exports.usePattern = exports.callValidateCode = exports.schemaProperties = exports.allSchemaProperties = exports.noPropertyInData = exports.propertyInData = exports.isOwnProperty = exports.hasPropFunc = exports.reportMissingProp = exports.checkMissingProp = exports.checkReportMissingProp = void 0;
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var names_1 = require_names();
	var util_2 = require_util();
	function checkReportMissingProp(cxt, prop) {
		const { gen, data, it } = cxt;
		gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
			cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
			cxt.error();
		});
	}
	exports.checkReportMissingProp = checkReportMissingProp;
	function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
		return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
	}
	exports.checkMissingProp = checkMissingProp;
	function reportMissingProp(cxt, missing) {
		cxt.setParams({ missingProperty: missing }, true);
		cxt.error();
	}
	exports.reportMissingProp = reportMissingProp;
	function hasPropFunc(gen) {
		return gen.scopeValue("func", {
			ref: Object.prototype.hasOwnProperty,
			code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
		});
	}
	exports.hasPropFunc = hasPropFunc;
	function isOwnProperty(gen, data, property) {
		return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
	}
	exports.isOwnProperty = isOwnProperty;
	function propertyInData(gen, data, property, ownProperties) {
		const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
		return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
	}
	exports.propertyInData = propertyInData;
	function noPropertyInData(gen, data, property, ownProperties) {
		const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
		return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
	}
	exports.noPropertyInData = noPropertyInData;
	function allSchemaProperties(schemaMap) {
		return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
	}
	exports.allSchemaProperties = allSchemaProperties;
	function schemaProperties(it, schemaMap) {
		return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
	}
	exports.schemaProperties = schemaProperties;
	function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
		const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
		const valCxt = [
			[names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
			[names_1.default.parentData, it.parentData],
			[names_1.default.parentDataProperty, it.parentDataProperty],
			[names_1.default.rootData, names_1.default.rootData]
		];
		if (it.opts.dynamicRef) valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
		const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
		return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
	}
	exports.callValidateCode = callValidateCode;
	var newRegExp = (0, codegen_1._)`new RegExp`;
	function usePattern({ gen, it: { opts } }, pattern) {
		const u = opts.unicodeRegExp ? "u" : "";
		const { regExp } = opts.code;
		const rx = regExp(pattern, u);
		return gen.scopeValue("pattern", {
			key: rx.toString(),
			ref: rx,
			code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`
		});
	}
	exports.usePattern = usePattern;
	function validateArray(cxt) {
		const { gen, data, keyword, it } = cxt;
		const valid = gen.name("valid");
		if (it.allErrors) {
			const validArr = gen.let("valid", true);
			validateItems(() => gen.assign(validArr, false));
			return validArr;
		}
		gen.var(valid, true);
		validateItems(() => gen.break());
		return valid;
		function validateItems(notValid) {
			const len = gen.const("len", (0, codegen_1._)`${data}.length`);
			gen.forRange("i", 0, len, (i) => {
				cxt.subschema({
					keyword,
					dataProp: i,
					dataPropType: util_1.Type.Num
				}, valid);
				gen.if((0, codegen_1.not)(valid), notValid);
			});
		}
	}
	exports.validateArray = validateArray;
	function validateUnion(cxt) {
		const { gen, schema, keyword, it } = cxt;
		/* istanbul ignore if */
		if (!Array.isArray(schema)) throw new Error("ajv implementation error");
		if (schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch)) && !it.opts.unevaluated) return;
		const valid = gen.let("valid", false);
		const schValid = gen.name("_valid");
		gen.block(() => schema.forEach((_sch, i) => {
			const schCxt = cxt.subschema({
				keyword,
				schemaProp: i,
				compositeRule: true
			}, schValid);
			gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
			if (!cxt.mergeValidEvaluated(schCxt, schValid)) gen.if((0, codegen_1.not)(valid));
		}));
		cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
	}
	exports.validateUnion = validateUnion;
}));
// node_modules/ajv/dist/compile/validate/keyword.js
var require_keyword = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.validateKeywordUsage = exports.validSchemaType = exports.funcKeywordCode = exports.macroKeywordCode = void 0;
	var codegen_1 = require_codegen();
	var names_1 = require_names();
	var code_1 = require_code();
	var errors_1 = require_errors();
	function macroKeywordCode(cxt, def) {
		const { gen, keyword, schema, parentSchema, it } = cxt;
		const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
		const schemaRef = useKeyword(gen, keyword, macroSchema);
		if (it.opts.validateSchema !== false) it.self.validateSchema(macroSchema, true);
		const valid = gen.name("valid");
		cxt.subschema({
			schema: macroSchema,
			schemaPath: codegen_1.nil,
			errSchemaPath: `${it.errSchemaPath}/${keyword}`,
			topSchemaRef: schemaRef,
			compositeRule: true
		}, valid);
		cxt.pass(valid, () => cxt.error(true));
	}
	exports.macroKeywordCode = macroKeywordCode;
	function funcKeywordCode(cxt, def) {
		var _a;
		const { gen, keyword, schema, parentSchema, $data, it } = cxt;
		checkAsyncKeyword(it, def);
		const validateRef = useKeyword(gen, keyword, !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate);
		const valid = gen.let("valid");
		cxt.block$data(valid, validateKeyword);
		cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
		function validateKeyword() {
			if (def.errors === false) {
				assignValid();
				if (def.modifying) modifyData(cxt);
				reportErrs(() => cxt.error());
			} else {
				const ruleErrs = def.async ? validateAsync() : validateSync();
				if (def.modifying) modifyData(cxt);
				reportErrs(() => addErrs(cxt, ruleErrs));
			}
		}
		function validateAsync() {
			const ruleErrs = gen.let("ruleErrs", null);
			gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
			return ruleErrs;
		}
		function validateSync() {
			const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
			gen.assign(validateErrs, null);
			assignValid(codegen_1.nil);
			return validateErrs;
		}
		function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
			const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
			const passSchema = !("compile" in def && !$data || def.schema === false);
			gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
		}
		function reportErrs(errors) {
			var _a;
			gen.if((0, codegen_1.not)((_a = def.valid) !== null && _a !== void 0 ? _a : valid), errors);
		}
	}
	exports.funcKeywordCode = funcKeywordCode;
	function modifyData(cxt) {
		const { gen, data, it } = cxt;
		gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
	}
	function addErrs(cxt, errs) {
		const { gen } = cxt;
		gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
			gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
			(0, errors_1.extendErrors)(cxt);
		}, () => cxt.error());
	}
	function checkAsyncKeyword({ schemaEnv }, def) {
		if (def.async && !schemaEnv.$async) throw new Error("async keyword in sync schema");
	}
	function useKeyword(gen, keyword, result) {
		if (result === void 0) throw new Error(`keyword "${keyword}" failed to compile`);
		return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : {
			ref: result,
			code: (0, codegen_1.stringify)(result)
		});
	}
	function validSchemaType(schema, schemaType, allowUndefined = false) {
		return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
	}
	exports.validSchemaType = validSchemaType;
	function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
		/* istanbul ignore if */
		if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) throw new Error("ajv implementation error");
		const deps = def.dependencies;
		if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
		if (def.validateSchema) {
			if (!def.validateSchema(schema[keyword])) {
				const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
				if (opts.validateSchema === "log") self.logger.error(msg);
				else throw new Error(msg);
			}
		}
	}
	exports.validateKeywordUsage = validateKeywordUsage;
}));
// node_modules/ajv/dist/compile/validate/subschema.js
var require_subschema = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.extendSubschemaMode = exports.extendSubschemaData = exports.getSubschema = void 0;
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
		if (keyword !== void 0 && schema !== void 0) throw new Error("both \"keyword\" and \"schema\" passed, only one allowed");
		if (keyword !== void 0) {
			const sch = it.schema[keyword];
			return schemaProp === void 0 ? {
				schema: sch,
				schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
				errSchemaPath: `${it.errSchemaPath}/${keyword}`
			} : {
				schema: sch[schemaProp],
				schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
				errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
			};
		}
		if (schema !== void 0) {
			if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) throw new Error("\"schemaPath\", \"errSchemaPath\" and \"topSchemaRef\" are required with \"schema\"");
			return {
				schema,
				schemaPath,
				topSchemaRef,
				errSchemaPath
			};
		}
		throw new Error("either \"keyword\" or \"schema\" must be passed");
	}
	exports.getSubschema = getSubschema;
	function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
		if (data !== void 0 && dataProp !== void 0) throw new Error("both \"data\" and \"dataProp\" passed, only one allowed");
		const { gen } = it;
		if (dataProp !== void 0) {
			const { errorPath, dataPathArr, opts } = it;
			dataContextProps(gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true));
			subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
			subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
			subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
		}
		if (data !== void 0) {
			dataContextProps(data instanceof codegen_1.Name ? data : gen.let("data", data, true));
			if (propertyName !== void 0) subschema.propertyName = propertyName;
		}
		if (dataTypes) subschema.dataTypes = dataTypes;
		function dataContextProps(_nextData) {
			subschema.data = _nextData;
			subschema.dataLevel = it.dataLevel + 1;
			subschema.dataTypes = [];
			it.definedProperties = /* @__PURE__ */ new Set();
			subschema.parentData = it.data;
			subschema.dataNames = [...it.dataNames, _nextData];
		}
	}
	exports.extendSubschemaData = extendSubschemaData;
	function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
		if (compositeRule !== void 0) subschema.compositeRule = compositeRule;
		if (createErrors !== void 0) subschema.createErrors = createErrors;
		if (allErrors !== void 0) subschema.allErrors = allErrors;
		subschema.jtdDiscriminator = jtdDiscriminator;
		subschema.jtdMetadata = jtdMetadata;
	}
	exports.extendSubschemaMode = extendSubschemaMode;
}));
// node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function equal(a, b) {
		if (a === b) return true;
		if (a && b && typeof a == "object" && typeof b == "object") {
			if (a.constructor !== b.constructor) return false;
			var length, i, keys;
			if (Array.isArray(a)) {
				length = a.length;
				if (length != b.length) return false;
				for (i = length; i-- !== 0;) if (!equal(a[i], b[i])) return false;
				return true;
			}
			if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
			if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
			if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
			keys = Object.keys(a);
			length = keys.length;
			if (length !== Object.keys(b).length) return false;
			for (i = length; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
			for (i = length; i-- !== 0;) {
				var key = keys[i];
				if (!equal(a[key], b[key])) return false;
			}
			return true;
		}
		return a !== a && b !== b;
	};
}));
// node_modules/json-schema-traverse/index.js
var require_json_schema_traverse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var traverse = module.exports = function(schema, opts, cb) {
		if (typeof opts == "function") {
			cb = opts;
			opts = {};
		}
		cb = opts.cb || cb;
		var pre = typeof cb == "function" ? cb : cb.pre || function() {};
		var post = cb.post || function() {};
		_traverse(opts, pre, post, schema, "", schema);
	};
	traverse.keywords = {
		additionalItems: true,
		items: true,
		contains: true,
		additionalProperties: true,
		propertyNames: true,
		not: true,
		if: true,
		then: true,
		else: true
	};
	traverse.arrayKeywords = {
		items: true,
		allOf: true,
		anyOf: true,
		oneOf: true
	};
	traverse.propsKeywords = {
		$defs: true,
		definitions: true,
		properties: true,
		patternProperties: true,
		dependencies: true
	};
	traverse.skipKeywords = {
		default: true,
		enum: true,
		const: true,
		required: true,
		maximum: true,
		minimum: true,
		exclusiveMaximum: true,
		exclusiveMinimum: true,
		multipleOf: true,
		maxLength: true,
		minLength: true,
		pattern: true,
		format: true,
		maxItems: true,
		minItems: true,
		uniqueItems: true,
		maxProperties: true,
		minProperties: true
	};
	function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
		if (schema && typeof schema == "object" && !Array.isArray(schema)) {
			pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
			for (var key in schema) {
				var sch = schema[key];
				if (Array.isArray(sch)) {
					if (key in traverse.arrayKeywords) for (var i = 0; i < sch.length; i++) _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
				} else if (key in traverse.propsKeywords) {
					if (sch && typeof sch == "object") for (var prop in sch) _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
				} else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
			}
			post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
		}
	}
	function escapeJsonPtr(str) {
		return str.replace(/~/g, "~0").replace(/\//g, "~1");
	}
}));
// node_modules/ajv/dist/compile/resolve.js
var require_resolve = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getSchemaRefs = exports.resolveUrl = exports.normalizeId = exports._getFullPath = exports.getFullPath = exports.inlineRef = void 0;
	var util_1 = require_util();
	var equal = require_fast_deep_equal();
	var traverse = require_json_schema_traverse();
	var SIMPLE_INLINED = /* @__PURE__ */ new Set([
		"type",
		"format",
		"pattern",
		"maxLength",
		"minLength",
		"maxProperties",
		"minProperties",
		"maxItems",
		"minItems",
		"maximum",
		"minimum",
		"uniqueItems",
		"multipleOf",
		"required",
		"enum",
		"const"
	]);
	function inlineRef(schema, limit = true) {
		if (typeof schema == "boolean") return true;
		if (limit === true) return !hasRef(schema);
		if (!limit) return false;
		return countKeys(schema) <= limit;
	}
	exports.inlineRef = inlineRef;
	var REF_KEYWORDS = /* @__PURE__ */ new Set([
		"$ref",
		"$recursiveRef",
		"$recursiveAnchor",
		"$dynamicRef",
		"$dynamicAnchor"
	]);
	function hasRef(schema) {
		for (const key in schema) {
			if (REF_KEYWORDS.has(key)) return true;
			const sch = schema[key];
			if (Array.isArray(sch) && sch.some(hasRef)) return true;
			if (typeof sch == "object" && hasRef(sch)) return true;
		}
		return false;
	}
	function countKeys(schema) {
		let count = 0;
		for (const key in schema) {
			if (key === "$ref") return Infinity;
			count++;
			if (SIMPLE_INLINED.has(key)) continue;
			if (typeof schema[key] == "object") (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
			if (count === Infinity) return Infinity;
		}
		return count;
	}
	function getFullPath(resolver, id = "", normalize) {
		if (normalize !== false) id = normalizeId(id);
		return _getFullPath(resolver, resolver.parse(id));
	}
	exports.getFullPath = getFullPath;
	function _getFullPath(resolver, p) {
		return resolver.serialize(p).split("#")[0] + "#";
	}
	exports._getFullPath = _getFullPath;
	var TRAILING_SLASH_HASH = /#\/?$/;
	function normalizeId(id) {
		return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
	}
	exports.normalizeId = normalizeId;
	function resolveUrl(resolver, baseId, id) {
		id = normalizeId(id);
		return resolver.resolve(baseId, id);
	}
	exports.resolveUrl = resolveUrl;
	var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
	function getSchemaRefs(schema, baseId) {
		if (typeof schema == "boolean") return {};
		const { schemaId, uriResolver } = this.opts;
		const schId = normalizeId(schema[schemaId] || baseId);
		const baseIds = { "": schId };
		const pathPrefix = getFullPath(uriResolver, schId, false);
		const localRefs = {};
		const schemaRefs = /* @__PURE__ */ new Set();
		traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
			if (parentJsonPtr === void 0) return;
			const fullPath = pathPrefix + jsonPtr;
			let innerBaseId = baseIds[parentJsonPtr];
			if (typeof sch[schemaId] == "string") innerBaseId = addRef.call(this, sch[schemaId]);
			addAnchor.call(this, sch.$anchor);
			addAnchor.call(this, sch.$dynamicAnchor);
			baseIds[jsonPtr] = innerBaseId;
			function addRef(ref) {
				const _resolve = this.opts.uriResolver.resolve;
				ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
				if (schemaRefs.has(ref)) throw ambiguos(ref);
				schemaRefs.add(ref);
				let schOrRef = this.refs[ref];
				if (typeof schOrRef == "string") schOrRef = this.refs[schOrRef];
				if (typeof schOrRef == "object") checkAmbiguosRef(sch, schOrRef.schema, ref);
				else if (ref !== normalizeId(fullPath)) {
					if (ref[0] === "#") {
						checkAmbiguosRef(sch, localRefs[ref], ref);
						localRefs[ref] = sch;
					} else this.refs[ref] = fullPath;
				}
				return ref;
			}
			function addAnchor(anchor) {
				if (typeof anchor == "string") {
					if (!ANCHOR.test(anchor)) throw new Error(`invalid anchor "${anchor}"`);
					addRef.call(this, `#${anchor}`);
				}
			}
		});
		return localRefs;
		function checkAmbiguosRef(sch1, sch2, ref) {
			if (sch2 !== void 0 && !equal(sch1, sch2)) throw ambiguos(ref);
		}
		function ambiguos(ref) {
			return /* @__PURE__ */ new Error(`reference "${ref}" resolves to more than one schema`);
		}
	}
	exports.getSchemaRefs = getSchemaRefs;
}));
// node_modules/ajv/dist/compile/validate/index.js
var require_validate = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getData = exports.KeywordCxt = exports.validateFunctionCode = void 0;
	var boolSchema_1 = require_boolSchema();
	var dataType_1 = require_dataType();
	var applicability_1 = require_applicability();
	var dataType_2 = require_dataType();
	var defaults_1 = require_defaults();
	var keyword_1 = require_keyword();
	var subschema_1 = require_subschema();
	var codegen_1 = require_codegen();
	var names_1 = require_names();
	var resolve_1 = require_resolve();
	var util_1 = require_util();
	var errors_1 = require_errors();
	function validateFunctionCode(it) {
		if (isSchemaObj(it)) {
			checkKeywords(it);
			if (schemaCxtHasRules(it)) {
				topSchemaObjCode(it);
				return;
			}
		}
		validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
	}
	exports.validateFunctionCode = validateFunctionCode;
	function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
		if (opts.code.es5) gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
			gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
			destructureValCxtES5(gen, opts);
			gen.code(body);
		});
		else gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
	}
	function destructureValCxt(opts) {
		return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
	}
	function destructureValCxtES5(gen, opts) {
		gen.if(names_1.default.valCxt, () => {
			gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
			gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
			gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
			gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
			if (opts.dynamicRef) gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
		}, () => {
			gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
			gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
			gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
			gen.var(names_1.default.rootData, names_1.default.data);
			if (opts.dynamicRef) gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
		});
	}
	function topSchemaObjCode(it) {
		const { schema, opts, gen } = it;
		validateFunction(it, () => {
			if (opts.$comment && schema.$comment) commentKeyword(it);
			checkNoDefault(it);
			gen.let(names_1.default.vErrors, null);
			gen.let(names_1.default.errors, 0);
			if (opts.unevaluated) resetEvaluated(it);
			typeAndKeywords(it);
			returnResults(it);
		});
	}
	function resetEvaluated(it) {
		const { gen, validateName } = it;
		it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
		gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
		gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
	}
	function funcSourceUrl(schema, opts) {
		const schId = typeof schema == "object" && schema[opts.schemaId];
		return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
	}
	function subschemaCode(it, valid) {
		if (isSchemaObj(it)) {
			checkKeywords(it);
			if (schemaCxtHasRules(it)) {
				subSchemaObjCode(it, valid);
				return;
			}
		}
		(0, boolSchema_1.boolOrEmptySchema)(it, valid);
	}
	function schemaCxtHasRules({ schema, self }) {
		if (typeof schema == "boolean") return !schema;
		for (const key in schema) if (self.RULES.all[key]) return true;
		return false;
	}
	function isSchemaObj(it) {
		return typeof it.schema != "boolean";
	}
	function subSchemaObjCode(it, valid) {
		const { schema, gen, opts } = it;
		if (opts.$comment && schema.$comment) commentKeyword(it);
		updateContext(it);
		checkAsyncSchema(it);
		const errsCount = gen.const("_errs", names_1.default.errors);
		typeAndKeywords(it, errsCount);
		gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
	}
	function checkKeywords(it) {
		(0, util_1.checkUnknownRules)(it);
		checkRefsAndKeywords(it);
	}
	function typeAndKeywords(it, errsCount) {
		if (it.opts.jtd) return schemaKeywords(it, [], false, errsCount);
		const types = (0, dataType_1.getSchemaTypes)(it.schema);
		schemaKeywords(it, types, !(0, dataType_1.coerceAndCheckDataType)(it, types), errsCount);
	}
	function checkRefsAndKeywords(it) {
		const { schema, errSchemaPath, opts, self } = it;
		if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
	}
	function checkNoDefault(it) {
		const { schema, opts } = it;
		if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
	}
	function updateContext(it) {
		const schId = it.schema[it.opts.schemaId];
		if (schId) it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
	}
	function checkAsyncSchema(it) {
		if (it.schema.$async && !it.schemaEnv.$async) throw new Error("async schema in sync schema");
	}
	function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
		const msg = schema.$comment;
		if (opts.$comment === true) gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
		else if (typeof opts.$comment == "function") {
			const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
			const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
			gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
		}
	}
	function returnResults(it) {
		const { gen, schemaEnv, validateName, ValidationError, opts } = it;
		if (schemaEnv.$async) gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
		else {
			gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
			if (opts.unevaluated) assignEvaluated(it);
			gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
		}
	}
	function assignEvaluated({ gen, evaluated, props, items }) {
		if (props instanceof codegen_1.Name) gen.assign((0, codegen_1._)`${evaluated}.props`, props);
		if (items instanceof codegen_1.Name) gen.assign((0, codegen_1._)`${evaluated}.items`, items);
	}
	function schemaKeywords(it, types, typeErrors, errsCount) {
		const { gen, schema, data, allErrors, opts, self } = it;
		const { RULES } = self;
		if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
			gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
			return;
		}
		if (!opts.jtd) checkStrictTypes(it, types);
		gen.block(() => {
			for (const group of RULES.rules) groupKeywords(group);
			groupKeywords(RULES.post);
		});
		function groupKeywords(group) {
			if (!(0, applicability_1.shouldUseGroup)(schema, group)) return;
			if (group.type) {
				gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
				iterateKeywords(it, group);
				if (types.length === 1 && types[0] === group.type && typeErrors) {
					gen.else();
					(0, dataType_2.reportTypeError)(it);
				}
				gen.endIf();
			} else iterateKeywords(it, group);
			if (!allErrors) gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
		}
	}
	function iterateKeywords(it, group) {
		const { gen, schema, opts: { useDefaults } } = it;
		if (useDefaults) (0, defaults_1.assignDefaults)(it, group.type);
		gen.block(() => {
			for (const rule of group.rules) if ((0, applicability_1.shouldUseRule)(schema, rule)) keywordCode(it, rule.keyword, rule.definition, group.type);
		});
	}
	function checkStrictTypes(it, types) {
		if (it.schemaEnv.meta || !it.opts.strictTypes) return;
		checkContextTypes(it, types);
		if (!it.opts.allowUnionTypes) checkMultipleTypes(it, types);
		checkKeywordTypes(it, it.dataTypes);
	}
	function checkContextTypes(it, types) {
		if (!types.length) return;
		if (!it.dataTypes.length) {
			it.dataTypes = types;
			return;
		}
		types.forEach((t) => {
			if (!includesType(it.dataTypes, t)) strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
		});
		narrowSchemaTypes(it, types);
	}
	function checkMultipleTypes(it, ts) {
		if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) strictTypesError(it, "use allowUnionTypes to allow union type keyword");
	}
	function checkKeywordTypes(it, ts) {
		const rules = it.self.RULES.all;
		for (const keyword in rules) {
			const rule = rules[keyword];
			if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
				const { type } = rule.definition;
				if (type.length && !type.some((t) => hasApplicableType(ts, t))) strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
			}
		}
	}
	function hasApplicableType(schTs, kwdT) {
		return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
	}
	function includesType(ts, t) {
		return ts.includes(t) || t === "integer" && ts.includes("number");
	}
	function narrowSchemaTypes(it, withTypes) {
		const ts = [];
		for (const t of it.dataTypes) if (includesType(withTypes, t)) ts.push(t);
		else if (withTypes.includes("integer") && t === "number") ts.push("integer");
		it.dataTypes = ts;
	}
	function strictTypesError(it, msg) {
		const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
		msg += ` at "${schemaPath}" (strictTypes)`;
		(0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
	}
	var KeywordCxt = class {
		constructor(it, def, keyword) {
			(0, keyword_1.validateKeywordUsage)(it, def, keyword);
			this.gen = it.gen;
			this.allErrors = it.allErrors;
			this.keyword = keyword;
			this.data = it.data;
			this.schema = it.schema[keyword];
			this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
			this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
			this.schemaType = def.schemaType;
			this.parentSchema = it.schema;
			this.params = {};
			this.it = it;
			this.def = def;
			if (this.$data) this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
			else {
				this.schemaCode = this.schemaValue;
				if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
			}
			if ("code" in def ? def.trackErrors : def.errors !== false) this.errsCount = it.gen.const("_errs", names_1.default.errors);
		}
		result(condition, successAction, failAction) {
			this.failResult((0, codegen_1.not)(condition), successAction, failAction);
		}
		failResult(condition, successAction, failAction) {
			this.gen.if(condition);
			if (failAction) failAction();
			else this.error();
			if (successAction) {
				this.gen.else();
				successAction();
				if (this.allErrors) this.gen.endIf();
			} else if (this.allErrors) this.gen.endIf();
			else this.gen.else();
		}
		pass(condition, failAction) {
			this.failResult((0, codegen_1.not)(condition), void 0, failAction);
		}
		fail(condition) {
			if (condition === void 0) {
				this.error();
				if (!this.allErrors) this.gen.if(false);
				return;
			}
			this.gen.if(condition);
			this.error();
			if (this.allErrors) this.gen.endIf();
			else this.gen.else();
		}
		fail$data(condition) {
			if (!this.$data) return this.fail(condition);
			const { schemaCode } = this;
			this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
		}
		error(append, errorParams, errorPaths) {
			if (errorParams) {
				this.setParams(errorParams);
				this._error(append, errorPaths);
				this.setParams({});
				return;
			}
			this._error(append, errorPaths);
		}
		_error(append, errorPaths) {
			(append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
		}
		$dataError() {
			(0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
		}
		reset() {
			if (this.errsCount === void 0) throw new Error("add \"trackErrors\" to keyword definition");
			(0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
		}
		ok(cond) {
			if (!this.allErrors) this.gen.if(cond);
		}
		setParams(obj, assign) {
			if (assign) Object.assign(this.params, obj);
			else this.params = obj;
		}
		block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
			this.gen.block(() => {
				this.check$data(valid, $dataValid);
				codeBlock();
			});
		}
		check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
			if (!this.$data) return;
			const { gen, schemaCode, schemaType, def } = this;
			gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
			if (valid !== codegen_1.nil) gen.assign(valid, true);
			if (schemaType.length || def.validateSchema) {
				gen.elseIf(this.invalid$data());
				this.$dataError();
				if (valid !== codegen_1.nil) gen.assign(valid, false);
			}
			gen.else();
		}
		invalid$data() {
			const { gen, schemaCode, schemaType, def, it } = this;
			return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
			function wrong$DataType() {
				if (schemaType.length) {
					/* istanbul ignore if */
					if (!(schemaCode instanceof codegen_1.Name)) throw new Error("ajv implementation error");
					const st = Array.isArray(schemaType) ? schemaType : [schemaType];
					return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
				}
				return codegen_1.nil;
			}
			function invalid$DataSchema() {
				if (def.validateSchema) {
					const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
					return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
				}
				return codegen_1.nil;
			}
		}
		subschema(appl, valid) {
			const subschema = (0, subschema_1.getSubschema)(this.it, appl);
			(0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
			(0, subschema_1.extendSubschemaMode)(subschema, appl);
			const nextContext = {
				...this.it,
				...subschema,
				items: void 0,
				props: void 0
			};
			subschemaCode(nextContext, valid);
			return nextContext;
		}
		mergeEvaluated(schemaCxt, toName) {
			const { it, gen } = this;
			if (!it.opts.unevaluated) return;
			if (it.props !== true && schemaCxt.props !== void 0) it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
			if (it.items !== true && schemaCxt.items !== void 0) it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
		}
		mergeValidEvaluated(schemaCxt, valid) {
			const { it, gen } = this;
			if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
				gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
				return true;
			}
		}
	};
	exports.KeywordCxt = KeywordCxt;
	function keywordCode(it, keyword, def, ruleType) {
		const cxt = new KeywordCxt(it, def, keyword);
		if ("code" in def) def.code(cxt, ruleType);
		else if (cxt.$data && def.validate) (0, keyword_1.funcKeywordCode)(cxt, def);
		else if ("macro" in def) (0, keyword_1.macroKeywordCode)(cxt, def);
		else if (def.compile || def.validate) (0, keyword_1.funcKeywordCode)(cxt, def);
	}
	var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
	var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
	function getData($data, { dataLevel, dataNames, dataPathArr }) {
		let jsonPointer;
		let data;
		if ($data === "") return names_1.default.rootData;
		if ($data[0] === "/") {
			if (!JSON_POINTER.test($data)) throw new Error(`Invalid JSON-pointer: ${$data}`);
			jsonPointer = $data;
			data = names_1.default.rootData;
		} else {
			const matches = RELATIVE_JSON_POINTER.exec($data);
			if (!matches) throw new Error(`Invalid JSON-pointer: ${$data}`);
			const up = +matches[1];
			jsonPointer = matches[2];
			if (jsonPointer === "#") {
				if (up >= dataLevel) throw new Error(errorMsg("property/index", up));
				return dataPathArr[dataLevel - up];
			}
			if (up > dataLevel) throw new Error(errorMsg("data", up));
			data = dataNames[dataLevel - up];
			if (!jsonPointer) return data;
		}
		let expr = data;
		const segments = jsonPointer.split("/");
		for (const segment of segments) if (segment) {
			data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
			expr = (0, codegen_1._)`${expr} && ${data}`;
		}
		return expr;
		function errorMsg(pointerType, up) {
			return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
		}
	}
	exports.getData = getData;
}));
// node_modules/ajv/dist/runtime/validation_error.js
var require_validation_error = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var ValidationError = class extends Error {
		constructor(errors) {
			super("validation failed");
			this.errors = errors;
			this.ajv = this.validation = true;
		}
	};
	exports.default = ValidationError;
}));
// node_modules/ajv/dist/compile/ref_error.js
var require_ref_error = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var resolve_1 = require_resolve();
	var MissingRefError = class extends Error {
		constructor(resolver, baseId, ref, msg) {
			super(msg || `can't resolve reference ${ref} from id ${baseId}`);
			this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
			this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
		}
	};
	exports.default = MissingRefError;
}));
// node_modules/ajv/dist/compile/index.js
var require_compile = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.resolveSchema = exports.getCompilingSchema = exports.resolveRef = exports.compileSchema = exports.SchemaEnv = void 0;
	var codegen_1 = require_codegen();
	var validation_error_1 = require_validation_error();
	var names_1 = require_names();
	var resolve_1 = require_resolve();
	var util_1 = require_util();
	var validate_1 = require_validate();
	var SchemaEnv = class {
		constructor(env) {
			var _a;
			this.refs = {};
			this.dynamicAnchors = {};
			let schema;
			if (typeof env.schema == "object") schema = env.schema;
			this.schema = env.schema;
			this.schemaId = env.schemaId;
			this.root = env.root || this;
			this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
			this.schemaPath = env.schemaPath;
			this.localRefs = env.localRefs;
			this.meta = env.meta;
			this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
			this.refs = {};
		}
	};
	exports.SchemaEnv = SchemaEnv;
	function compileSchema(sch) {
		const _sch = getCompilingSchema.call(this, sch);
		if (_sch) return _sch;
		const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
		const { es5, lines } = this.opts.code;
		const { ownProperties } = this.opts;
		const gen = new codegen_1.CodeGen(this.scope, {
			es5,
			lines,
			ownProperties
		});
		let _ValidationError;
		if (sch.$async) _ValidationError = gen.scopeValue("Error", {
			ref: validation_error_1.default,
			code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
		});
		const validateName = gen.scopeName("validate");
		sch.validateName = validateName;
		const schemaCxt = {
			gen,
			allErrors: this.opts.allErrors,
			data: names_1.default.data,
			parentData: names_1.default.parentData,
			parentDataProperty: names_1.default.parentDataProperty,
			dataNames: [names_1.default.data],
			dataPathArr: [codegen_1.nil],
			dataLevel: 0,
			dataTypes: [],
			definedProperties: /* @__PURE__ */ new Set(),
			topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? {
				ref: sch.schema,
				code: (0, codegen_1.stringify)(sch.schema)
			} : { ref: sch.schema }),
			validateName,
			ValidationError: _ValidationError,
			schema: sch.schema,
			schemaEnv: sch,
			rootId,
			baseId: sch.baseId || rootId,
			schemaPath: codegen_1.nil,
			errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
			errorPath: (0, codegen_1._)`""`,
			opts: this.opts,
			self: this
		};
		let sourceCode;
		try {
			this._compilations.add(sch);
			(0, validate_1.validateFunctionCode)(schemaCxt);
			gen.optimize(this.opts.code.optimize);
			const validateCode = gen.toString();
			sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
			if (this.opts.code.process) sourceCode = this.opts.code.process(sourceCode, sch);
			const validate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode)(this, this.scope.get());
			this.scope.value(validateName, { ref: validate });
			validate.errors = null;
			validate.schema = sch.schema;
			validate.schemaEnv = sch;
			if (sch.$async) validate.$async = true;
			if (this.opts.code.source === true) validate.source = {
				validateName,
				validateCode,
				scopeValues: gen._values
			};
			if (this.opts.unevaluated) {
				const { props, items } = schemaCxt;
				validate.evaluated = {
					props: props instanceof codegen_1.Name ? void 0 : props,
					items: items instanceof codegen_1.Name ? void 0 : items,
					dynamicProps: props instanceof codegen_1.Name,
					dynamicItems: items instanceof codegen_1.Name
				};
				if (validate.source) validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
			}
			sch.validate = validate;
			return sch;
		} catch (e) {
			delete sch.validate;
			delete sch.validateName;
			if (sourceCode) this.logger.error("Error compiling schema, function code:", sourceCode);
			throw e;
		} finally {
			this._compilations.delete(sch);
		}
	}
	exports.compileSchema = compileSchema;
	function resolveRef(root, baseId, ref) {
		var _a;
		ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
		const schOrFunc = root.refs[ref];
		if (schOrFunc) return schOrFunc;
		let _sch = resolve.call(this, root, ref);
		if (_sch === void 0) {
			const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
			const { schemaId } = this.opts;
			if (schema) _sch = new SchemaEnv({
				schema,
				schemaId,
				root,
				baseId
			});
		}
		if (_sch === void 0) return;
		return root.refs[ref] = inlineOrCompile.call(this, _sch);
	}
	exports.resolveRef = resolveRef;
	function inlineOrCompile(sch) {
		if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs)) return sch.schema;
		return sch.validate ? sch : compileSchema.call(this, sch);
	}
	function getCompilingSchema(schEnv) {
		for (const sch of this._compilations) if (sameSchemaEnv(sch, schEnv)) return sch;
	}
	exports.getCompilingSchema = getCompilingSchema;
	function sameSchemaEnv(s1, s2) {
		return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
	}
	function resolve(root, ref) {
		let sch;
		while (typeof (sch = this.refs[ref]) == "string") ref = sch;
		return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
	}
	function resolveSchema(root, ref) {
		const p = this.opts.uriResolver.parse(ref);
		const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
		let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
		if (Object.keys(root.schema).length > 0 && refPath === baseId) return getJsonPointer.call(this, p, root);
		const id = (0, resolve_1.normalizeId)(refPath);
		const schOrRef = this.refs[id] || this.schemas[id];
		if (typeof schOrRef == "string") {
			const sch = resolveSchema.call(this, root, schOrRef);
			if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object") return;
			return getJsonPointer.call(this, p, sch);
		}
		if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object") return;
		if (!schOrRef.validate) compileSchema.call(this, schOrRef);
		if (id === (0, resolve_1.normalizeId)(ref)) {
			const { schema } = schOrRef;
			const { schemaId } = this.opts;
			const schId = schema[schemaId];
			if (schId) baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
			return new SchemaEnv({
				schema,
				schemaId,
				root,
				baseId
			});
		}
		return getJsonPointer.call(this, p, schOrRef);
	}
	exports.resolveSchema = resolveSchema;
	var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
		"properties",
		"patternProperties",
		"enum",
		"dependencies",
		"definitions"
	]);
	function getJsonPointer(parsedRef, { baseId, schema, root }) {
		var _a;
		if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/") return;
		for (const part of parsedRef.fragment.slice(1).split("/")) {
			if (typeof schema === "boolean") return;
			const partSchema = schema[(0, util_1.unescapeFragment)(part)];
			if (partSchema === void 0) return;
			schema = partSchema;
			const schId = typeof schema === "object" && schema[this.opts.schemaId];
			if (!PREVENT_SCOPE_CHANGE.has(part) && schId) baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
		}
		let env;
		if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
			const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
			env = resolveSchema.call(this, root, $ref);
		}
		const { schemaId } = this.opts;
		env = env || new SchemaEnv({
			schema,
			schemaId,
			root,
			baseId
		});
		if (env.schema !== env.root.schema) return env;
	}
}));
// node_modules/ajv/dist/refs/data.json
var data_exports = /* @__PURE__ */ __exportAll({
	$id: () => $id$9,
	additionalProperties: () => false,
	default: () => data_default,
	description: () => description$1,
	properties: () => properties$9,
	required: () => required$1,
	type: () => type$9
}), $id$9, description$1, type$9, required$1, properties$9, data_default;
var init_data = __esmMin((() => {
	$id$9 = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
	description$1 = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
	type$9 = "object";
	required$1 = ["$data"];
	properties$9 = { "$data": {
		"type": "string",
		"anyOf": [{ "format": "relative-json-pointer" }, { "format": "json-pointer" }]
	} };
	data_default = {
		$id: $id$9,
		description: description$1,
		type: type$9,
		required: required$1,
		properties: properties$9,
		additionalProperties: false
	};
}));
// node_modules/fast-uri/lib/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/** @type {(value: string) => boolean} */
	var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
	/** @type {(value: string) => boolean} */
	var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
	/** @type {(value: string) => boolean} */
	var isPort = RegExp.prototype.test.bind(/^\d*$/u);
	/** @type {(value: string) => boolean} */
	var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
	/** @type {(value: string) => boolean} */
	var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
	/** @type {(value: string) => boolean} */
	var isPathCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u);
	/** @type {(value: string) => boolean} */
	var isQueryFragmentCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u);
	/** @type {(value: string) => boolean} */
	var isUserinfoCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u);
	var BYTE_HEX = new Array(256);
	{
		const HEX_DIGITS = "0123456789ABCDEF";
		for (let i = 0; i < 256; i++) BYTE_HEX[i] = "%" + HEX_DIGITS[i >> 4] + HEX_DIGITS[i & 15];
	}
	function percentEncodeNonAscii(cp) {
		if (cp < 2048) return BYTE_HEX[192 | cp >> 6] + BYTE_HEX[128 | cp & 63];
		if (cp < 65536) return BYTE_HEX[224 | cp >> 12] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
		return BYTE_HEX[240 | cp >> 18] + BYTE_HEX[128 | cp >> 12 & 63] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
	}
	/**
	* @param {Array<string>} input
	* @returns {string}
	*/
	function stringArrayToHexStripped(input) {
		let acc = "";
		let code = 0;
		let i = 0;
		for (i = 0; i < input.length; i++) {
			code = input[i].charCodeAt(0);
			if (code === 48) continue;
			if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) return "";
			acc += input[i];
			break;
		}
		for (i += 1; i < input.length; i++) {
			code = input[i].charCodeAt(0);
			if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) return "";
			acc += input[i];
		}
		return acc;
	}
	/** @type {(value: string) => boolean} */
	var isHextet = RegExp.prototype.test.bind(/^[\dA-Fa-f]{1,4}$/);
	/** @type {(value: string) => boolean} */
	var isIPvFuture = RegExp.prototype.test.bind(/^[vV][\dA-Fa-f]+\.[A-Za-z\d\-._~!$&'()*+,;=:]+$/);
	/** @type {(value: string) => boolean} */
	var isZoneCharacter = RegExp.prototype.test.bind(/^[A-Za-z\d\-._~]$/);
	/**
	* @param {string} value
	* @returns {boolean}
	*/
	var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
	/**
	* @param {string} zone
	* @returns {boolean}
	*/
	function isZoneIdentifier(zone) {
		if (zone.length === 0) return false;
		for (let i = 0; i < zone.length; i++) {
			if (isZoneCharacter(zone[i])) continue;
			if (zone[i] === "%" && i + 2 < zone.length && isHexPair(zone.slice(i + 1, i + 3))) {
				i += 2;
				continue;
			}
			return false;
		}
		return true;
	}
	/**
	* Compresses the longest run of zero hextets to "::" per RFC 5952. A run of a
	* single zero hextet is left uncompressed. On ties the leftmost run wins.
	*
	* @param {string[]} hextets
	* @returns {string}
	*/
	function compressIPv6ZeroRun(hextets) {
		let bestStart = -1;
		let bestLength = 0;
		let runStart = -1;
		let runLength = 0;
		for (let i = 0; i < hextets.length; i++) if (hextets[i] === "0") {
			if (runStart === -1) runStart = i;
			runLength++;
			if (runLength > bestLength) {
				bestLength = runLength;
				bestStart = runStart;
			}
		} else {
			runStart = -1;
			runLength = 0;
		}
		if (bestLength < 2) return hextets.join(":");
		const head = hextets.slice(0, bestStart).join(":");
		const tail = hextets.slice(bestStart + bestLength).join(":");
		return head + "::" + tail;
	}
	/**
	* Validates an IPv6 address against the alternatives in RFC 3986 section
	* 3.2.2 and returns the same address with leading hextet zeroes removed.
	* An embedded IPv4 address counts as two hextets and is only valid at the end.
	*
	* @param {string} input
	* @returns {string|undefined}
	*/
	function normalizeIPv6Address(input) {
		const compression = input.indexOf("::");
		if (compression !== -1 && input.indexOf("::", compression + 1) !== -1) return void 0;
		const left = compression === -1 ? input.split(":") : input.slice(0, compression).split(":");
		const right = compression === -1 ? [] : input.slice(compression + 2).split(":");
		if (compression !== -1) {
			if (left.length === 1 && left[0] === "") left.length = 0;
			if (right.length === 1 && right[0] === "") right.length = 0;
		}
		const parts = left.concat(right);
		let hextetCount = 0;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part === "") return void 0;
			if (part.indexOf(".") !== -1) {
				if (i !== parts.length - 1 || compression !== -1 && right.length === 0 || !isIPv4(part)) return void 0;
				hextetCount += 2;
				continue;
			}
			if (!isHextet(part)) return void 0;
			parts[i] = parseInt(part, 16).toString(16);
			hextetCount++;
		}
		if (compression === -1) {
			if (hextetCount !== 8) return void 0;
			return compressIPv6ZeroRun(parts);
		}
		if (hextetCount >= 8) return void 0;
		const expanded = parts.slice(0, left.length);
		for (let i = hextetCount; i < 8; i++) expanded.push("0");
		for (let i = left.length; i < parts.length; i++) expanded.push(parts[i]);
		return compressIPv6ZeroRun(expanded);
	}
	/**
	* @typedef {Object} NormalizeIPv6Result
	* @property {string} host - The normalized host.
	* @property {string} [escapedHost] - The escaped host.
	* @property {boolean} isIPV6 - Indicates if the host is an IPv6 address.
	* @property {boolean} [isIPVFuture] - Indicates if the host is an IPvFuture literal.
	* @property {boolean} [error] - Indicates if a bracketed IP literal is malformed.
	*/
	/**
	* Validates and normalizes a bracketed IP literal. Raw zone separators remain
	* accepted for backwards compatibility, while encoded separators and zone
	* contents follow RFC 6874.
	*
	* @param {string} host
	* @returns {NormalizeIPv6Result}
	*/
	function normalizeIPv6(host) {
		const bracketed = host[0] === "[" && host[host.length - 1] === "]";
		if ((host[0] === "[" || host[host.length - 1] === "]") && !bracketed) return {
			host,
			isIPV6: false,
			error: true
		};
		let input = bracketed ? host.slice(1, -1) : host;
		if (bracketed && isIPvFuture(input)) {
			input = input.toLowerCase();
			return {
				host: `[${input}]`,
				escapedHost: input,
				isIPV6: false,
				isIPVFuture: true
			};
		}
		if (findToken(input, ":") < 2) return {
			host,
			isIPV6: false,
			error: bracketed
		};
		let zoneIdentifier = "";
		const zoneSeparator = input.indexOf("%");
		if (zoneSeparator !== -1) {
			const separatorLength = input.slice(zoneSeparator, zoneSeparator + 3).toLowerCase() === "%25" ? 3 : 1;
			zoneIdentifier = input.slice(zoneSeparator + separatorLength);
			if (!isZoneIdentifier(zoneIdentifier)) return {
				host,
				isIPV6: false,
				error: true
			};
			input = input.slice(0, zoneSeparator);
		}
		const address = normalizeIPv6Address(input);
		if (address === void 0) return {
			host,
			isIPV6: false,
			error: true
		};
		return {
			host: address + (zoneIdentifier ? "%" + zoneIdentifier : ""),
			escapedHost: address + (zoneIdentifier ? "%25" + zoneIdentifier : ""),
			isIPV6: true
		};
	}
	/**
	* @param {string} str
	* @param {string} token
	* @returns {number}
	*/
	function findToken(str, token) {
		let ind = 0;
		for (let i = 0; i < str.length; i++) if (str[i] === token) ind++;
		return ind;
	}
	/**
	* @param {string} path
	* @returns {string}
	*
	* @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
	*/
	function removeDotSegments(path) {
		let input = path;
		const output = [];
		let nextSlash = -1;
		let len = 0;
		while (len = input.length) {
			if (len === 1) {
				if (input === ".") break;
				else if (input === "/") {
					output.push("/");
					break;
				} else {
					output.push(input);
					break;
				}
			} else if (len === 2) {
				if (input[0] === ".") {
					if (input[1] === ".") break;
					else if (input[1] === "/") {
						input = input.slice(2);
						continue;
					}
				} else if (input[0] === "/") {
					if (input[1] === "." || input[1] === "/") {
						output.push("/");
						break;
					}
				}
			} else if (len === 3) {
				if (input === "/..") {
					if (output.length !== 0) output.pop();
					output.push("/");
					break;
				}
			}
			if (input[0] === ".") {
				if (input[1] === ".") {
					if (input[2] === "/") {
						input = input.slice(3);
						continue;
					}
				} else if (input[1] === "/") {
					input = input.slice(2);
					continue;
				}
			} else if (input[0] === "/") {
				if (input[1] === ".") {
					if (input[2] === "/") {
						input = input.slice(2);
						continue;
					} else if (input[2] === ".") {
						if (input[3] === "/") {
							input = input.slice(3);
							if (output.length !== 0) output.pop();
							continue;
						}
					}
				}
			}
			if ((nextSlash = input.indexOf("/", 1)) === -1) {
				output.push(input);
				break;
			} else {
				output.push(input.slice(0, nextSlash));
				input = input.slice(nextSlash);
			}
		}
		return output.join("");
	}
	/**
	* Removes dot segments from the path of a relative reference (a path that does
	* not start with "/") without changing what it resolves to against any base.
	* Unlike `removeDotSegments`, leading ".." segments that cannot be collapsed
	* are kept, the result never becomes root-relative, and a result that would be
	* empty or start with an empty segment is prefixed with "." (an empty path
	* means "same document" and a leading "//" would introduce an authority).
	*
	* @param {string} path
	* @returns {string}
	*/
	function removeDotSegmentsRelative(path) {
		if (path === "" || path[0] === "/") return removeDotSegments(path);
		const segments = path.split("/");
		const last = segments.length - 1;
		/** @type {string[]} */
		const output = [];
		let trailingDirectory = false;
		for (let i = 0; i <= last; i++) {
			const segment = segments[i];
			if (segment === "." || segment === "..") {
				if (segment === "..") {
					if (output.length !== 0 && output[output.length - 1] !== "..") output.pop();
					else output.push("..");
				}
				trailingDirectory = i === last;
			} else output.push(segment);
		}
		if (trailingDirectory && output[output.length - 1] !== "..") output.push("");
		if (output.length === 0 || output[0] === "" || output[0].includes(":")) output.unshift(".");
		return output.join("/");
	}
	/**
	* Re-escape RFC 3986 gen-delims that must not appear literally in the host.
	* After the URI regex parses, these characters cannot be literal in the host
	* field, so any that appear after decoding came from percent-encoding and
	* must be restored to prevent authority structure changes.
	*
	* @param {string} host
	* @param {boolean} isIP - true for IPv4/IPv6 hosts (skip colon re-escaping)
	* @returns {string}
	*/
	var HOST_DELIMS = {
		"@": "%40",
		"/": "%2F",
		"?": "%3F",
		"#": "%23",
		":": "%3A"
	};
	var HOST_DELIM_RE = /[@/?#:]/g;
	var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
	function reescapeHostDelimiters(host, isIP) {
		const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
		re.lastIndex = 0;
		return host.replace(re, (ch) => HOST_DELIMS[ch]);
	}
	/**
	* Normalizes percent escapes and optionally decodes only unreserved ASCII bytes.
	* Reserved delimiters such as `%2F` stay escaped; `%2E` is unreserved.
	*
	* @param {string} input
	* @param {boolean} [decodeUnreserved=false]
	* @returns {string}
	*/
	function normalizePercentEncoding(input, decodeUnreserved = false) {
		if (input.indexOf("%") === -1) return input;
		let output = "";
		for (let i = 0; i < input.length; i++) {
			if (input[i] === "%" && i + 2 < input.length) {
				const hex = input.slice(i + 1, i + 3);
				if (isHexPair(hex)) {
					const normalizedHex = hex.toUpperCase();
					const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
					if (decodeUnreserved && isUnreserved(decoded)) output += decoded;
					else output += "%" + normalizedHex;
					i += 2;
					continue;
				}
			}
			output += input[i];
		}
		return output;
	}
	/**
	* Normalizes path data without turning reserved escapes into live path syntax.
	* Valid escapes are uppercased, raw unsafe characters are escaped, and only
	* unreserved bytes that are not `.` are decoded.
	*
	* @param {string} input
	* @returns {string}
	*/
	function normalizePathEncoding(input) {
		let output = "";
		for (let i = 0; i < input.length; i++) {
			const ch = input[i];
			if (ch === "%" && i + 2 < input.length) {
				const hex = input.slice(i + 1, i + 3);
				if (isHexPair(hex)) {
					const normalizedHex = hex.toUpperCase();
					const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
					if (decoded !== "." && isUnreserved(decoded)) output += decoded;
					else output += "%" + normalizedHex;
					i += 2;
					continue;
				}
			}
			if (isPathCharacter(ch)) output += ch;
			else {
				const code = input.charCodeAt(i);
				if (code < 128) output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
				else if (code < 55296 || code > 57343) output += percentEncodeNonAscii(code);
				else if (code <= 56319 && i + 1 < input.length) {
					const low = input.charCodeAt(i + 1);
					if (low >= 56320 && low <= 57343) {
						output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
						i++;
					} else output += percentEncodeNonAscii(65533);
				} else output += percentEncodeNonAscii(65533);
			}
		}
		return output;
	}
	/**
	* Serializes a path without rewriting reserved data. Raw RFC 3986 path
	* characters remain literal, valid escapes are preserved and uppercased, and
	* everything else is UTF-8 percent-encoded. In a path-noscheme, a colon in the
	* first segment must be escaped so the result cannot be parsed as a scheme.
	*
	* @param {string} input
	* @param {boolean} [pathNoScheme=false]
	* @returns {string}
	*/
	function serializePathEncoding(input, pathNoScheme = false) {
		let output = "";
		let firstSegment = pathNoScheme && input[0] !== "/";
		for (let i = 0; i < input.length; i++) {
			const ch = input[i];
			if (ch === "%" && i + 2 < input.length) {
				const hex = input.slice(i + 1, i + 3);
				if (isHexPair(hex)) {
					output += "%" + hex.toUpperCase();
					i += 2;
					continue;
				}
			}
			if (ch === "/") firstSegment = false;
			if (isPathCharacter(ch) && (ch !== ":" || !firstSegment)) output += ch;
			else {
				const code = input.charCodeAt(i);
				if (code < 128) output += BYTE_HEX[code];
				else if (code < 55296 || code > 57343) output += percentEncodeNonAscii(code);
				else if (code <= 56319 && i + 1 < input.length) {
					const low = input.charCodeAt(i + 1);
					if (low >= 56320 && low <= 57343) {
						output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
						i++;
					} else output += percentEncodeNonAscii(65533);
				} else output += percentEncodeNonAscii(65533);
			}
		}
		return output;
	}
	/**
	* Percent-encodes a URI component using its RFC 3986 literal character set.
	* Existing valid escapes are preserved and normalized to uppercase hex.
	*
	* @param {string} input
	* @param {(value: string) => boolean} isAllowed
	* @returns {string}
	*/
	function encodeComponent(input, isAllowed) {
		let output = "";
		for (let i = 0; i < input.length; i++) {
			const ch = input[i];
			if (ch === "%" && i + 2 < input.length) {
				const hex = input.slice(i + 1, i + 3);
				if (isHexPair(hex)) {
					output += "%" + hex.toUpperCase();
					i += 2;
					continue;
				}
			}
			if (isAllowed(ch)) output += ch;
			else {
				const code = input.charCodeAt(i);
				if (code < 128) output += BYTE_HEX[code];
				else if (code < 55296 || code > 57343) output += percentEncodeNonAscii(code);
				else if (code <= 56319 && i + 1 < input.length) {
					const low = input.charCodeAt(i + 1);
					if (low >= 56320 && low <= 57343) {
						output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
						i++;
					} else output += percentEncodeNonAscii(65533);
				} else output += percentEncodeNonAscii(65533);
			}
		}
		return output;
	}
	/**
	* Encodes userinfo while preserving its RFC 3986 §3.2.1 literal characters.
	* In particular, authority delimiters such as `@`, `/`, `?`, and `#` are data.
	*
	* @param {string} input
	* @returns {string}
	*/
	function encodeUserinfo(input) {
		return encodeComponent(input, isUserinfoCharacter);
	}
	/**
	* Encodes query data using the RFC 3986 §3.4 grammar. A literal `#` must be
	* escaped because it would otherwise begin the fragment component.
	*
	* @param {string} input
	* @returns {string}
	*/
	function encodeQuery(input) {
		return encodeComponent(input, isQueryFragmentCharacter);
	}
	/**
	* Encodes fragment data using the RFC 3986 §3.5 grammar.
	*
	* @param {string} input
	* @returns {string}
	*/
	function encodeFragment(input) {
		return encodeComponent(input, isQueryFragmentCharacter);
	}
	function isEscapeSafe(cp) {
		return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 42 || cp === 43 || cp === 45 || cp === 46 || cp === 47 || cp === 64 || cp === 95;
	}
	/**
	* Normalizes the percent-encoding of a query or fragment component.
	*
	* Like `normalizePathEncoding`, but uses the query/fragment character set
	* (which additionally allows `?`) and decodes `.` since it has no dot-segment
	* meaning outside of a path.
	*
	* @param {string} input
	* @returns {string}
	*/
	function normalizeQueryFragmentEncoding(input) {
		let output = "";
		for (let i = 0; i < input.length; i++) {
			const ch = input[i];
			if (ch === "%" && i + 2 < input.length) {
				const hex = input.slice(i + 1, i + 3);
				if (isHexPair(hex)) {
					const normalizedHex = hex.toUpperCase();
					const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
					if (isUnreserved(decoded)) output += decoded;
					else output += "%" + normalizedHex;
					i += 2;
					continue;
				}
			}
			if (isQueryFragmentCharacter(ch)) output += ch;
			else {
				const code = input.charCodeAt(i);
				if (code < 128) output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
				else if (code < 55296 || code > 57343) output += percentEncodeNonAscii(code);
				else if (code <= 56319 && i + 1 < input.length) {
					const low = input.charCodeAt(i + 1);
					if (low >= 56320 && low <= 57343) {
						output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
						i++;
					} else output += percentEncodeNonAscii(65533);
				} else output += percentEncodeNonAscii(65533);
			}
		}
		return output;
	}
	/**
	* Escapes a component while preserving existing valid percent escapes.
	*
	* @param {string} input
	* @returns {string}
	*/
	function escapePreservingEscapes(input) {
		let output = "";
		for (let i = 0; i < input.length; i++) {
			if (input[i] === "%" && i + 2 < input.length) {
				const hex = input.slice(i + 1, i + 3);
				if (isHexPair(hex)) {
					output += "%" + hex.toUpperCase();
					i += 2;
					continue;
				}
			}
			output += escape(input[i]);
		}
		return output;
	}
	/**
	* @param {import('../types/index').URIComponent} component
	* @returns {string|undefined}
	*/
	function recomposeAuthority(component) {
		const uriTokens = [];
		if (component.userinfo !== void 0) {
			uriTokens.push(encodeUserinfo(component.userinfo));
			uriTokens.push("@");
		}
		if (component.host !== void 0) {
			let host = component.host;
			if (!isIPv4(host)) {
				let ipV6res = normalizeIPv6(host);
				if (ipV6res.isIPV6 !== true && ipV6res.isIPVFuture !== true) {
					host = normalizePercentEncoding(host, true);
					ipV6res = normalizeIPv6(host);
				}
				if (ipV6res.isIPV6 === true || ipV6res.isIPVFuture === true) host = `[${ipV6res.escapedHost}]`;
				else host = reescapeHostDelimiters(host, false);
			}
			uriTokens.push(host);
		}
		if (typeof component.port === "number" || typeof component.port === "string") {
			const port = String(component.port);
			if (!isPort(port)) throw new TypeError("URI port is malformed.");
			uriTokens.push(":");
			uriTokens.push(port);
		}
		return uriTokens.length ? uriTokens.join("") : void 0;
	}
	module.exports = {
		nonSimpleDomain,
		recomposeAuthority,
		reescapeHostDelimiters,
		normalizePercentEncoding,
		normalizePathEncoding,
		serializePathEncoding,
		normalizeQueryFragmentEncoding,
		encodeUserinfo,
		encodeQuery,
		encodeFragment,
		escapePreservingEscapes,
		removeDotSegments,
		removeDotSegmentsRelative,
		isIPv4,
		isUUID,
		normalizeIPv6,
		stringArrayToHexStripped
	};
}));
// node_modules/fast-uri/lib/schemes.js
var require_schemes = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { isUUID } = require_utils();
	var URN_REG = /^([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-./:;=@]|%[\da-f]{2})+)$/iu;
	var supportedSchemeNames = [
		"http",
		"https",
		"ws",
		"wss",
		"urn",
		"urn:uuid"
	];
	/** @typedef {supportedSchemeNames[number]} SchemeName */
	/**
	* @param {string} name
	* @returns {name is SchemeName}
	*/
	function isValidSchemeName(name) {
		return supportedSchemeNames.indexOf(name) !== -1;
	}
	/**
	* @callback SchemeFn
	* @param {import('../types/index').URIComponent} component
	* @param {import('../types/index').Options} options
	* @returns {import('../types/index').URIComponent}
	*/
	/**
	* @typedef {Object} SchemeHandler
	* @property {SchemeName} scheme - The scheme name.
	* @property {boolean} [domainHost] - Indicates if the scheme supports domain hosts.
	* @property {SchemeFn} parse - Function to parse the URI component for this scheme.
	* @property {SchemeFn} serialize - Function to serialize the URI component for this scheme.
	* @property {boolean} [skipNormalize] - Indicates if normalization should be skipped for this scheme.
	* @property {boolean} [absolutePath] - Indicates if the scheme uses absolute paths.
	* @property {boolean} [unicodeSupport] - Indicates if the scheme supports Unicode.
	*/
	/**
	* @param {import('../types/index').URIComponent} wsComponent
	* @returns {boolean}
	*/
	function wsIsSecure(wsComponent) {
		if (wsComponent.secure === true) return true;
		else if (wsComponent.secure === false) return false;
		else if (wsComponent.scheme) return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
		else return false;
	}
	/** @type {SchemeFn} */
	function httpParse(component) {
		if (!component.host) component.error = component.error || "HTTP URIs must have a host.";
		return component;
	}
	/** @type {SchemeFn} */
	function httpSerialize(component) {
		const secure = String(component.scheme).toLowerCase() === "https";
		if (component.port === (secure ? 443 : 80) || component.port === "") component.port = void 0;
		if (!component.path) component.path = "/";
		return component;
	}
	/** @type {SchemeFn} */
	function wsParse(wsComponent) {
		wsComponent.secure = wsIsSecure(wsComponent);
		wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
		wsComponent.path = void 0;
		wsComponent.query = void 0;
		return wsComponent;
	}
	/** @type {SchemeFn} */
	function wsSerialize(wsComponent) {
		if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") wsComponent.port = void 0;
		if (typeof wsComponent.secure === "boolean") {
			wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
			wsComponent.secure = void 0;
		}
		if (wsComponent.resourceName) {
			const queryIndex = wsComponent.resourceName.indexOf("?");
			const path = queryIndex === -1 ? wsComponent.resourceName : wsComponent.resourceName.slice(0, queryIndex);
			wsComponent.path = path && path !== "/" ? path : void 0;
			wsComponent.query = queryIndex === -1 ? void 0 : wsComponent.resourceName.slice(queryIndex + 1);
			wsComponent.resourceName = void 0;
		}
		wsComponent.fragment = void 0;
		return wsComponent;
	}
	/** @type {SchemeFn} */
	function urnParse(urnComponent, options) {
		if (!urnComponent.path) {
			urnComponent.error = "URN can not be parsed";
			return urnComponent;
		}
		const matches = urnComponent.path.match(URN_REG);
		if (matches && matches[0] === urnComponent.path) {
			const scheme = options.scheme || urnComponent.scheme || "urn";
			urnComponent.nid = matches[1].toLowerCase();
			urnComponent.nss = matches[2];
			const schemeHandler = getSchemeHandler(`${scheme}:${options.nid || urnComponent.nid}`);
			urnComponent.path = void 0;
			if (schemeHandler) urnComponent = schemeHandler.parse(urnComponent, options);
		} else urnComponent.error = urnComponent.error || "URN can not be parsed.";
		return urnComponent;
	}
	/** @type {SchemeFn} */
	function urnSerialize(urnComponent, options) {
		if (urnComponent.nid === void 0) throw new Error("URN without nid cannot be serialized");
		const scheme = options.scheme || urnComponent.scheme || "urn";
		const nid = urnComponent.nid.toLowerCase();
		const schemeHandler = getSchemeHandler(`${scheme}:${options.nid || nid}`);
		if (schemeHandler) urnComponent = schemeHandler.serialize(urnComponent, options);
		const uriComponent = urnComponent;
		const nss = urnComponent.nss;
		uriComponent.path = `${nid || options.nid}:${nss}`;
		options.skipEscape = true;
		return uriComponent;
	}
	/** @type {SchemeFn} */
	function urnuuidParse(urnComponent, options) {
		const uuidComponent = urnComponent;
		uuidComponent.uuid = uuidComponent.nss;
		uuidComponent.nss = void 0;
		if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) uuidComponent.error = uuidComponent.error || "UUID is not valid.";
		return uuidComponent;
	}
	/** @type {SchemeFn} */
	function urnuuidSerialize(uuidComponent) {
		const urnComponent = uuidComponent;
		urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
		return urnComponent;
	}
	var http = {
		scheme: "http",
		domainHost: true,
		parse: httpParse,
		serialize: httpSerialize
	};
	var https = {
		scheme: "https",
		domainHost: http.domainHost,
		parse: httpParse,
		serialize: httpSerialize
	};
	var ws = {
		scheme: "ws",
		domainHost: true,
		parse: wsParse,
		serialize: wsSerialize
	};
	var SCHEMES = {
		http,
		https,
		ws,
		wss: {
			scheme: "wss",
			domainHost: ws.domainHost,
			parse: ws.parse,
			serialize: ws.serialize
		},
		urn: {
			scheme: "urn",
			parse: urnParse,
			serialize: urnSerialize,
			skipNormalize: true
		},
		"urn:uuid": {
			scheme: "urn:uuid",
			parse: urnuuidParse,
			serialize: urnuuidSerialize,
			skipNormalize: true
		}
	};
	Object.setPrototypeOf(SCHEMES, null);
	/**
	* @param {string|undefined} scheme
	* @returns {SchemeHandler|undefined}
	*/
	function getSchemeHandler(scheme) {
		return scheme && (SCHEMES[scheme] || SCHEMES[scheme.toLowerCase()]) || void 0;
	}
	module.exports = {
		wsIsSecure,
		SCHEMES,
		isValidSchemeName,
		getSchemeHandler
	};
}));
// node_modules/fast-uri/index.js
var require_fast_uri = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { normalizeIPv6, removeDotSegments, removeDotSegmentsRelative, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, serializePathEncoding, normalizeQueryFragmentEncoding, encodeQuery, encodeFragment, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = require_utils();
	var { SCHEMES, getSchemeHandler } = require_schemes();
	var VALID_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
	var MALFORMED_SCHEME_ERROR = "URI scheme is malformed.";
	var MALFORMED_HOST_ERROR = "URI host is malformed.";
	var FORBIDDEN_DOMAIN_HOST_CHARACTER = /[\0-\x20"#/:<>?@[\\\]^`{|}\x7F]/u;
	/**
	* RFC 3986 section 3.1 does not allow percent-encoding in a scheme, so the
	* scheme is validated as-is and never decoded. Decoding would let inert input
	* such as `%6Aavascript:` become a live `javascript:` scheme.
	*
	* @param {string} scheme
	* @returns {string}
	*/
	function validateScheme(scheme) {
		const stringScheme = String(scheme);
		if (!VALID_SCHEME.test(stringScheme)) throw new TypeError(MALFORMED_SCHEME_ERROR);
		return stringScheme;
	}
	/**
	* @template {import('./types/index').URIComponent|string} T
	* @param {T} uri
	* @param {import('./types/index').Options} [options]
	* @returns {T}
	*/
	function normalize(uri, options) {
		if (typeof uri === "string") uri = normalizeString(uri, options);
		else if (typeof uri === "object") uri = parse(serialize(uri, options), options);
		return uri;
	}
	/**
	* @param {string} baseURI
	* @param {string} relativeURI
	* @param {import('./types/index').Options} [options]
	* @returns {string}
	*/
	function resolve(baseURI, relativeURI, options) {
		const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
		const { parsed: baseParsed, malformedAuthorityOrPort: baseMalformed, malformedPercentEncoding: baseMalformedPercentEncoding, malformedSchemeSpecific: baseMalformedSchemeSpecific, malformedHost: baseMalformedHost, malformedScheme: baseMalformedScheme } = parseWithStatus(baseURI, schemelessOptions);
		const { parsed: relativeParsed, malformedAuthorityOrPort: relativeMalformed, malformedPercentEncoding: relativeMalformedPercentEncoding, malformedSchemeSpecific: relativeMalformedSchemeSpecific, malformedHost: relativeMalformedHost, malformedScheme: relativeMalformedScheme } = parseWithStatus(relativeURI, schemelessOptions);
		if (baseMalformed || relativeMalformed || baseMalformedPercentEncoding || relativeMalformedPercentEncoding || baseMalformedSchemeSpecific || relativeMalformedSchemeSpecific || baseMalformedHost || relativeMalformedHost || baseMalformedScheme || relativeMalformedScheme) throw new Error(baseParsed.error || relativeParsed.error || "URI is malformed.");
		const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
		const resolvedSchemeHandler = getSchemeHandler(options && options.scheme || resolved.scheme);
		const resolvedHost = resolved.host;
		const resolvedHostIsIP = resolvedHost !== void 0 && resolvedHost !== "" && (isIPv4(resolvedHost) || normalizeIPv6(resolvedHost).isIPV6);
		if (hasForbiddenDomainHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP)) throw new Error(MALFORMED_HOST_ERROR);
		canonicalizeHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP);
		const encodedASCIIHost = resolvedHost && resolvedHost.indexOf("%") !== -1 && !/\P{ASCII}/u.test(resolvedHost);
		if (resolved.error && !encodedASCIIHost) throw new Error(resolved.error);
		schemelessOptions.skipEscape = true;
		return serialize(resolved, schemelessOptions);
	}
	/**
	* @param {import ('./types/index').URIComponent} base
	* @param {import ('./types/index').URIComponent} relative
	* @param {import('./types/index').Options} [options]
	* @param {boolean} [skipNormalization=false]
	* @returns {import ('./types/index').URIComponent}
	*/
	function resolveComponent(base, relative, options, skipNormalization) {
		/** @type {import('./types/index').URIComponent} */
		const target = {};
		if (!skipNormalization) {
			base = parse(serialize(base, options), options);
			relative = parse(serialize(relative, options), options);
		}
		options = options || {};
		if (!options.tolerant && relative.scheme) {
			target.scheme = relative.scheme;
			target.userinfo = relative.userinfo;
			target.host = relative.host;
			target.port = relative.port;
			target.path = removeDotSegments(relative.path || "");
			target.query = relative.query;
		} else {
			if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
				target.userinfo = relative.userinfo;
				target.host = relative.host;
				target.port = relative.port;
				target.path = removeDotSegments(relative.path || "");
				target.query = relative.query;
			} else {
				if (!relative.path) {
					target.path = base.path;
					if (relative.query !== void 0) target.query = relative.query;
					else target.query = base.query;
				} else {
					if (relative.path[0] === "/") target.path = removeDotSegments(relative.path);
					else {
						const baseHasAuthority = base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0;
						if (baseHasAuthority && !base.path) target.path = "/" + relative.path;
						else if (!base.path) target.path = relative.path;
						else target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
						target.path = base.scheme === void 0 && !baseHasAuthority && target.path[0] !== "/" ? removeDotSegmentsRelative(target.path) : removeDotSegments(target.path);
					}
					target.query = relative.query;
				}
				target.userinfo = base.userinfo;
				target.host = base.host;
				target.port = base.port;
			}
			target.scheme = base.scheme;
		}
		target.fragment = relative.fragment;
		return target;
	}
	/**
	* @param {import ('./types/index').URIComponent|string} uriA
	* @param {import ('./types/index').URIComponent|string} uriB
	* @param {import ('./types/index').Options} options
	* @returns {boolean}
	*/
	function equal(uriA, uriB, options) {
		const normalizedA = normalizeComparableURI(uriA, options);
		const normalizedB = normalizeComparableURI(uriB, options);
		return normalizedA !== void 0 && normalizedB !== void 0 && normalizedA === normalizedB;
	}
	/**
	* @param {Readonly<import('./types/index').URIComponent>} cmpts
	* @param {import('./types/index').Options} [opts]
	* @returns {string}
	*/
	function serialize(cmpts, opts) {
		const component = {
			host: cmpts.host,
			scheme: cmpts.scheme,
			userinfo: cmpts.userinfo,
			port: cmpts.port,
			path: cmpts.path,
			query: cmpts.query,
			nid: cmpts.nid,
			nss: cmpts.nss,
			uuid: cmpts.uuid,
			fragment: cmpts.fragment,
			reference: cmpts.reference,
			resourceName: cmpts.resourceName,
			secure: cmpts.secure,
			error: ""
		};
		const options = Object.assign({}, opts);
		const uriTokens = [];
		if (component.scheme) component.scheme = validateScheme(component.scheme);
		const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
		if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
		const hasAuthority = component.userinfo !== void 0 || component.host !== void 0 || component.port !== void 0;
		const schemelessReference = (component.scheme === void 0 || options.reference === "suffix") && !hasAuthority;
		const pathNoScheme = !options.skipEscape && schemelessReference;
		if (component.path !== void 0) {
			if (!options.skipEscape) component.path = serializePathEncoding(component.path, pathNoScheme);
			else component.path = normalizePercentEncoding(component.path);
		}
		if (options.reference !== "suffix" && component.scheme) {
			component.scheme = validateScheme(component.scheme);
			uriTokens.push(component.scheme, ":");
		}
		const authority = recomposeAuthority(component);
		if (authority !== void 0) {
			if (options.reference !== "suffix") uriTokens.push("//");
			uriTokens.push(authority);
			if (component.path && component.path[0] !== "/") uriTokens.push("/");
		}
		if (component.path !== void 0) {
			let s = component.path;
			if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) s = schemelessReference && s[0] !== "/" ? removeDotSegmentsRelative(s) : removeDotSegments(s);
			if (schemelessReference) s = serializePathEncoding(s, true);
			if (authority === void 0 && s[0] === "/" && s[1] === "/") s = "/%2F" + s.slice(2);
			uriTokens.push(s);
		}
		if (component.query !== void 0) uriTokens.push("?", encodeQuery(component.query));
		if (component.fragment !== void 0) uriTokens.push("#", encodeFragment(component.fragment));
		return uriTokens.join("");
	}
	var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
	var AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
	var AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
	/**
	* @param {import('./types/index').URIComponent} parsed
	* @param {RegExpMatchArray} matches
	* @returns {string|undefined}
	*/
	function getParseError(parsed, matches) {
		if (matches[2] !== void 0 && parsed.path && parsed.path[0] !== "/") return "URI path must start with \"/\" when authority is present.";
		if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535)) return "URI port is malformed.";
	}
	/**
	* Checks percent syntax without decoding the represented octets. RFC 3986
	* percent-encoding is byte-oriented, so sequences such as `%FF` are valid even
	* though they are not independently valid UTF-8.
	*
	* @param {string|undefined} component
	* @returns {boolean}
	*/
	function hasMalformedPercentEncoding(component) {
		if (component === void 0) return false;
		let percent = component.indexOf("%");
		while (percent !== -1) {
			if (percent + 2 >= component.length || !/^[\da-f]{2}$/iu.test(component.slice(percent + 1, percent + 3))) return true;
			percent = component.indexOf("%", percent + 3);
		}
		return false;
	}
	/**
	* Whether the host is a bracketed IP literal (RFC 3986 `IP-literal`).
	* An unterminated `[` is not a literal, so it must still be validated as a
	* reg-name instead of being waved through as an IP.
	*
	* @param {string} host
	* @returns {boolean}
	*/
	function isIPLiteral(host) {
		return host[0] === "[" && host[host.length - 1] === "]";
	}
	/**
	* @param {RegExpMatchArray} matches
	* @returns {boolean}
	*/
	function hasMalformedComponentPercentEncoding(matches) {
		const host = matches[4];
		return hasMalformedPercentEncoding(matches[3]) || host !== void 0 && !isIPLiteral(host) && hasMalformedPercentEncoding(host) || hasMalformedPercentEncoding(matches[6]) || hasMalformedPercentEncoding(matches[7]) || hasMalformedPercentEncoding(matches[8]);
	}
	/**
	* @param {import('./types/index').URIComponent} parsed
	* @param {import('./types/index').Options} options
	* @param {{ domainHost?: boolean, unicodeSupport?: boolean }|undefined} schemeHandler
	* @param {boolean} isIP
	* @returns {boolean} whether host conversion failed
	*/
	function canonicalizeHost(parsed, options, schemeHandler, isIP) {
		if (hasForbiddenDomainHost(parsed, options, schemeHandler, isIP)) {
			parsed.error = parsed.error || MALFORMED_HOST_ERROR;
			return true;
		}
		if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport) && parsed.host && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
			let url;
			try {
				url = new URL("http://" + parsed.host);
			} catch (e) {
				parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
				return true;
			}
			if (!isHostOnlyURL(url)) {
				parsed.error = parsed.error || MALFORMED_HOST_ERROR;
				return true;
			}
			parsed.host = url.hostname;
		}
		return false;
	}
	/**
	* Whether a domain host contains an ASCII character that RFC 3986 does not
	* allow in a reg-name (unreserved, sub-delims, or pct-encoded). Such a host is
	* rejected instead of being handed to the WHATWG URL parser, which would treat
	* "@" as a userinfo delimiter (silently dropping the data before it) and strip
	* TAB, LF, and CR. Non-ASCII characters remain allowed for IDNs.
	*
	* @param {import('./types/index').URIComponent} parsed
	* @param {import('./types/index').Options} options
	* @param {{ domainHost?: boolean }|undefined} schemeHandler
	* @param {boolean} isIP
	* @returns {boolean}
	*/
	function hasForbiddenDomainHost(parsed, options, schemeHandler, isIP) {
		return Boolean(parsed.host && isIP === false && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && FORBIDDEN_DOMAIN_HOST_CHARACTER.test(parsed.host));
	}
	/**
	* @param {URL} url
	* @returns {boolean}
	*/
	function isHostOnlyURL(url) {
		return url.username === "" && url.password === "" && url.port === "" && url.pathname === "/" && url.search === "" && url.hash === "" && url.hostname !== "";
	}
	/**
	* @param {string} uri
	* @param {import('./types/index').Options} [opts]
	* @returns {{ parsed: import('./types/index').URIComponent, malformedAuthorityOrPort: boolean, malformedPercentEncoding: boolean, malformedSchemeSpecific: boolean, malformedHost: boolean, malformedScheme: boolean }}
	*/
	function parseWithStatus(uri, opts) {
		const options = Object.assign({}, opts);
		/** @type {import('./types/index').URIComponent} */
		const parsed = {
			scheme: void 0,
			userinfo: void 0,
			host: "",
			port: void 0,
			path: "",
			query: void 0,
			fragment: void 0
		};
		let malformedAuthorityOrPort = false;
		let malformedPercentEncoding = false;
		let malformedSchemeSpecific = false;
		let malformedHost = false;
		let malformedIPLiteral = false;
		let malformedScheme = false;
		let isIP = false;
		if (options.reference === "suffix") {
			if (options.scheme) uri = options.scheme + ":" + uri;
			else uri = "//" + uri;
		}
		const authorityMatch = uri.match(AUTHORITY_PREFIX);
		if (authorityMatch !== null && authorityMatch[1].indexOf("\\") !== -1) {
			parsed.error = "URI authority must not contain a literal backslash.";
			malformedAuthorityOrPort = true;
		}
		const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
		if (introducerMatch !== null) {
			const region = introducerMatch[1];
			const normalizedRegion = region.replace(/[\t\n\r]/g, "");
			if (normalizedRegion.length >= 2) {
				if (normalizedRegion.slice(0, 2) !== "//") {
					parsed.error = parsed.error || "URI authority must not contain a literal backslash.";
					malformedAuthorityOrPort = true;
				} else if (region.length !== normalizedRegion.length) {
					parsed.error = parsed.error || "URI authority introducer must not contain whitespace.";
					malformedAuthorityOrPort = true;
				}
			}
		}
		const matches = uri.match(URI_PARSE);
		if (matches) {
			parsed.scheme = matches[1];
			parsed.userinfo = matches[3];
			parsed.host = matches[4];
			parsed.port = parseInt(matches[5], 10);
			parsed.path = matches[6] || "";
			parsed.query = matches[7];
			parsed.fragment = matches[8];
			if (parsed.scheme !== void 0) {
				if (VALID_SCHEME.test(parsed.scheme)) parsed.scheme = parsed.scheme.toLowerCase();
				else {
					parsed.error = parsed.error || MALFORMED_SCHEME_ERROR;
					malformedScheme = true;
				}
			}
			malformedPercentEncoding = hasMalformedComponentPercentEncoding(matches);
			if (malformedPercentEncoding) parsed.error = parsed.error || "URI contains malformed percent-encoding.";
			if (isNaN(parsed.port)) parsed.port = matches[5];
			const parseError = getParseError(parsed, matches);
			if (parseError !== void 0) {
				parsed.error = parsed.error || parseError;
				malformedAuthorityOrPort = true;
			}
			if (parsed.host) {
				if (isIPv4(parsed.host) === false) {
					const bracketedIPLiteral = isIPLiteral(parsed.host);
					const hasIPLiteralBracket = parsed.host.indexOf("[") !== -1 || parsed.host.indexOf("]") !== -1;
					const ipv6result = normalizeIPv6(parsed.host);
					isIP = ipv6result.isIPV6 || ipv6result.isIPVFuture === true;
					malformedIPLiteral = hasIPLiteralBracket && (!bracketedIPLiteral || ipv6result.error === true);
					parsed.host = isIP ? ipv6result.host : ipv6result.host.toLowerCase();
					if (malformedIPLiteral) {
						parsed.error = parsed.error || MALFORMED_HOST_ERROR;
						malformedAuthorityOrPort = true;
					}
				} else isIP = true;
			}
			if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) parsed.reference = "same-document";
			else if (parsed.scheme === void 0) parsed.reference = "relative";
			else if (parsed.fragment === void 0) parsed.reference = "absolute";
			else parsed.reference = "uri";
			if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
			const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
			if (!malformedIPLiteral) malformedHost = canonicalizeHost(parsed, options, schemeHandler, isIP);
			if (uri.indexOf("%") !== -1 && parsed.host !== void 0 && !malformedIPLiteral) {
				let host = isIP ? parsed.host : normalizePercentEncoding(parsed.host, true);
				if (!isIP) host = normalizePercentEncoding(host.toLowerCase());
				parsed.host = isIP || options.scheme !== "null" ? reescapeHostDelimiters(host, isIP) : host;
			}
			if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
				if (parsed.path) parsed.path = normalizePathEncoding(parsed.path);
				if (parsed.query) parsed.query = normalizeQueryFragmentEncoding(parsed.query);
				if (parsed.fragment) parsed.fragment = normalizeQueryFragmentEncoding(parsed.fragment);
			}
			if (schemeHandler && schemeHandler.parse) {
				schemeHandler.parse(parsed, options);
				if (schemeHandler === SCHEMES.urn && parsed.nid === void 0) malformedSchemeSpecific = true;
			}
		} else parsed.error = parsed.error || "URI can not be parsed.";
		return {
			parsed,
			malformedAuthorityOrPort,
			malformedPercentEncoding,
			malformedSchemeSpecific,
			malformedHost,
			malformedScheme
		};
	}
	/**
	* @param {string} uri
	* @param {import('./types/index').Options} [opts]
	* @returns
	*/
	function parse(uri, opts) {
		return parseWithStatus(uri, opts).parsed;
	}
	/**
	* @param {string} uri
	* @param {import('./types/index').Options} [opts]
	* @returns {string}
	*/
	function normalizeString(uri, opts) {
		return normalizeStringWithStatus(uri, opts).normalized;
	}
	/**
	* @param {string} uri
	* @param {import('./types/index').Options} [opts]
	* @returns {{ normalized: string, malformedAuthorityOrPort: boolean, malformedPercentEncoding: boolean, malformedSchemeSpecific: boolean, malformedHost: boolean, malformedScheme: boolean }}
	*/
	function normalizeStringWithStatus(uri, opts) {
		const { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = parseWithStatus(uri, opts);
		return {
			normalized: malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? uri : serialize(parsed, opts),
			malformedAuthorityOrPort,
			malformedPercentEncoding,
			malformedSchemeSpecific,
			malformedHost,
			malformedScheme
		};
	}
	/**
	* @param {import ('./types/index').URIComponent|string} uri
	* @param {import('./types/index').Options} [opts]
	* @returns {string|undefined}
	*/
	function normalizeComparableURI(uri, opts) {
		if (typeof uri !== "string" && typeof uri !== "object") return;
		let value;
		try {
			value = typeof uri === "string" ? uri : serialize(uri, opts);
		} catch {
			return;
		}
		const { normalized, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = normalizeStringWithStatus(value, opts);
		return malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? void 0 : normalized;
	}
	var fastUri = {
		SCHEMES,
		normalize,
		resolve,
		resolveComponent,
		equal,
		serialize,
		parse
	};
	module.exports = fastUri;
	module.exports.default = fastUri;
	module.exports.fastUri = fastUri;
}));
// node_modules/ajv/dist/runtime/uri.js
var require_uri = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var uri = require_fast_uri();
	uri.code = "require(\"ajv/dist/runtime/uri\").default";
	exports.default = uri;
}));
// node_modules/ajv/dist/core.js
var require_core$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
	var validate_1 = require_validate();
	Object.defineProperty(exports, "KeywordCxt", {
		enumerable: true,
		get: function() {
			return validate_1.KeywordCxt;
		}
	});
	var codegen_1 = require_codegen();
	Object.defineProperty(exports, "_", {
		enumerable: true,
		get: function() {
			return codegen_1._;
		}
	});
	Object.defineProperty(exports, "str", {
		enumerable: true,
		get: function() {
			return codegen_1.str;
		}
	});
	Object.defineProperty(exports, "stringify", {
		enumerable: true,
		get: function() {
			return codegen_1.stringify;
		}
	});
	Object.defineProperty(exports, "nil", {
		enumerable: true,
		get: function() {
			return codegen_1.nil;
		}
	});
	Object.defineProperty(exports, "Name", {
		enumerable: true,
		get: function() {
			return codegen_1.Name;
		}
	});
	Object.defineProperty(exports, "CodeGen", {
		enumerable: true,
		get: function() {
			return codegen_1.CodeGen;
		}
	});
	var validation_error_1 = require_validation_error();
	var ref_error_1 = require_ref_error();
	var rules_1 = require_rules();
	var compile_1 = require_compile();
	var codegen_2 = require_codegen();
	var resolve_1 = require_resolve();
	var dataType_1 = require_dataType();
	var util_1 = require_util();
	var $dataRefSchema = (init_data(), __toCommonJS(data_exports).default);
	var uri_1 = require_uri();
	var defaultRegExp = (str, flags) => new RegExp(str, flags);
	defaultRegExp.code = "new RegExp";
	var META_IGNORE_OPTIONS = [
		"removeAdditional",
		"useDefaults",
		"coerceTypes"
	];
	var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
		"validate",
		"serialize",
		"parse",
		"wrapper",
		"root",
		"schema",
		"keyword",
		"pattern",
		"formats",
		"validate$data",
		"func",
		"obj",
		"Error"
	]);
	var removedOptions = {
		errorDataPath: "",
		format: "`validateFormats: false` can be used instead.",
		nullable: "\"nullable\" keyword is supported by default.",
		jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
		extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
		missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
		processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
		sourceCode: "Use option `code: {source: true}`",
		strictDefaults: "It is default now, see option `strict`.",
		strictKeywords: "It is default now, see option `strict`.",
		uniqueItems: "\"uniqueItems\" keyword is always validated.",
		unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
		cache: "Map is used as cache, schema object as key.",
		serialize: "Map is used as cache, schema object as key.",
		ajvErrors: "It is default now."
	};
	var deprecatedOptions = {
		ignoreKeywordsWithRef: "",
		jsPropertySyntax: "",
		unicode: "\"minLength\"/\"maxLength\" account for unicode characters by default."
	};
	var MAX_EXPRESSION = 200;
	function requiredOptions(o) {
		var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
		const s = o.strict;
		const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
		const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
		const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
		const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
		return {
			strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
			strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
			strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
			strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
			strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
			code: o.code ? {
				...o.code,
				optimize,
				regExp
			} : {
				optimize,
				regExp
			},
			loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
			loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
			meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
			messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
			inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
			schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
			addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
			validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
			validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
			unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
			int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
			uriResolver
		};
	}
	var Ajv = class {
		constructor(opts = {}) {
			this.schemas = {};
			this.refs = {};
			this.formats = Object.create(null);
			this._compilations = /* @__PURE__ */ new Set();
			this._loading = {};
			this._cache = /* @__PURE__ */ new Map();
			opts = this.opts = {
				...opts,
				...requiredOptions(opts)
			};
			const { es5, lines } = this.opts.code;
			this.scope = new codegen_2.ValueScope({
				scope: {},
				prefixes: EXT_SCOPE_NAMES,
				es5,
				lines
			});
			this.logger = getLogger(opts.logger);
			const formatOpt = opts.validateFormats;
			opts.validateFormats = false;
			this.RULES = (0, rules_1.getRules)();
			checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
			checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
			this._metaOpts = getMetaSchemaOptions.call(this);
			if (opts.formats) addInitialFormats.call(this);
			this._addVocabularies();
			this._addDefaultMetaSchema();
			if (opts.keywords) addInitialKeywords.call(this, opts.keywords);
			if (typeof opts.meta == "object") this.addMetaSchema(opts.meta);
			addInitialSchemas.call(this);
			opts.validateFormats = formatOpt;
		}
		_addVocabularies() {
			this.addKeyword("$async");
		}
		_addDefaultMetaSchema() {
			const { $data, meta, schemaId } = this.opts;
			let _dataRefSchema = $dataRefSchema;
			if (schemaId === "id") {
				_dataRefSchema = { ...$dataRefSchema };
				_dataRefSchema.id = _dataRefSchema.$id;
				delete _dataRefSchema.$id;
			}
			if (meta && $data) this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
		}
		defaultMeta() {
			const { meta, schemaId } = this.opts;
			return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
		}
		validate(schemaKeyRef, data) {
			let v;
			if (typeof schemaKeyRef == "string") {
				v = this.getSchema(schemaKeyRef);
				if (!v) throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
			} else v = this.compile(schemaKeyRef);
			const valid = v(data);
			if (!("$async" in v)) this.errors = v.errors;
			return valid;
		}
		compile(schema, _meta) {
			const sch = this._addSchema(schema, _meta);
			return sch.validate || this._compileSchemaEnv(sch);
		}
		compileAsync(schema, meta) {
			if (typeof this.opts.loadSchema != "function") throw new Error("options.loadSchema should be a function");
			const { loadSchema } = this.opts;
			return runCompileAsync.call(this, schema, meta);
			async function runCompileAsync(_schema, _meta) {
				await loadMetaSchema.call(this, _schema.$schema);
				const sch = this._addSchema(_schema, _meta);
				return sch.validate || _compileAsync.call(this, sch);
			}
			async function loadMetaSchema($ref) {
				if ($ref && !this.getSchema($ref)) await runCompileAsync.call(this, { $ref }, true);
			}
			async function _compileAsync(sch) {
				try {
					return this._compileSchemaEnv(sch);
				} catch (e) {
					if (!(e instanceof ref_error_1.default)) throw e;
					checkLoaded.call(this, e);
					await loadMissingSchema.call(this, e.missingSchema);
					return _compileAsync.call(this, sch);
				}
			}
			function checkLoaded({ missingSchema: ref, missingRef }) {
				if (this.refs[ref]) throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
			}
			async function loadMissingSchema(ref) {
				const _schema = await _loadSchema.call(this, ref);
				if (!this.refs[ref]) await loadMetaSchema.call(this, _schema.$schema);
				if (!this.refs[ref]) this.addSchema(_schema, ref, meta);
			}
			async function _loadSchema(ref) {
				const p = this._loading[ref];
				if (p) return p;
				try {
					return await (this._loading[ref] = loadSchema(ref));
				} finally {
					delete this._loading[ref];
				}
			}
		}
		addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
			if (Array.isArray(schema)) {
				for (const sch of schema) this.addSchema(sch, void 0, _meta, _validateSchema);
				return this;
			}
			let id;
			if (typeof schema === "object") {
				const { schemaId } = this.opts;
				id = schema[schemaId];
				if (id !== void 0 && typeof id != "string") throw new Error(`schema ${schemaId} must be string`);
			}
			key = (0, resolve_1.normalizeId)(key || id);
			this._checkUnique(key);
			this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
			return this;
		}
		addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
			this.addSchema(schema, key, true, _validateSchema);
			return this;
		}
		validateSchema(schema, throwOrLogError) {
			if (typeof schema == "boolean") return true;
			let $schema;
			$schema = schema.$schema;
			if ($schema !== void 0 && typeof $schema != "string") throw new Error("$schema must be a string");
			$schema = $schema || this.opts.defaultMeta || this.defaultMeta();
			if (!$schema) {
				this.logger.warn("meta-schema not available");
				this.errors = null;
				return true;
			}
			const valid = this.validate($schema, schema);
			if (!valid && throwOrLogError) {
				const message = "schema is invalid: " + this.errorsText();
				if (this.opts.validateSchema === "log") this.logger.error(message);
				else throw new Error(message);
			}
			return valid;
		}
		getSchema(keyRef) {
			let sch;
			while (typeof (sch = getSchEnv.call(this, keyRef)) == "string") keyRef = sch;
			if (sch === void 0) {
				const { schemaId } = this.opts;
				const root = new compile_1.SchemaEnv({
					schema: {},
					schemaId
				});
				sch = compile_1.resolveSchema.call(this, root, keyRef);
				if (!sch) return;
				this.refs[keyRef] = sch;
			}
			return sch.validate || this._compileSchemaEnv(sch);
		}
		removeSchema(schemaKeyRef) {
			if (schemaKeyRef instanceof RegExp) {
				this._removeAllSchemas(this.schemas, schemaKeyRef);
				this._removeAllSchemas(this.refs, schemaKeyRef);
				return this;
			}
			switch (typeof schemaKeyRef) {
				case "undefined":
					this._removeAllSchemas(this.schemas);
					this._removeAllSchemas(this.refs);
					this._cache.clear();
					return this;
				case "string": {
					const sch = getSchEnv.call(this, schemaKeyRef);
					if (typeof sch == "object") this._cache.delete(sch.schema);
					delete this.schemas[schemaKeyRef];
					delete this.refs[schemaKeyRef];
					return this;
				}
				case "object": {
					const cacheKey = schemaKeyRef;
					this._cache.delete(cacheKey);
					let id = schemaKeyRef[this.opts.schemaId];
					if (id) {
						id = (0, resolve_1.normalizeId)(id);
						delete this.schemas[id];
						delete this.refs[id];
					}
					return this;
				}
				default: throw new Error("ajv.removeSchema: invalid parameter");
			}
		}
		addVocabulary(definitions) {
			for (const def of definitions) this.addKeyword(def);
			return this;
		}
		addKeyword(kwdOrDef, def) {
			let keyword;
			if (typeof kwdOrDef == "string") {
				keyword = kwdOrDef;
				if (typeof def == "object") {
					this.logger.warn("these parameters are deprecated, see docs for addKeyword");
					def.keyword = keyword;
				}
			} else if (typeof kwdOrDef == "object" && def === void 0) {
				def = kwdOrDef;
				keyword = def.keyword;
				if (Array.isArray(keyword) && !keyword.length) throw new Error("addKeywords: keyword must be string or non-empty array");
			} else throw new Error("invalid addKeywords parameters");
			checkKeyword.call(this, keyword, def);
			if (!def) {
				(0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
				return this;
			}
			keywordMetaschema.call(this, def);
			const definition = {
				...def,
				type: (0, dataType_1.getJSONTypes)(def.type),
				schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
			};
			(0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
			return this;
		}
		getKeyword(keyword) {
			const rule = this.RULES.all[keyword];
			return typeof rule == "object" ? rule.definition : !!rule;
		}
		removeKeyword(keyword) {
			const { RULES } = this;
			delete RULES.keywords[keyword];
			delete RULES.all[keyword];
			for (const group of RULES.rules) {
				const i = group.rules.findIndex((rule) => rule.keyword === keyword);
				if (i >= 0) group.rules.splice(i, 1);
			}
			return this;
		}
		addFormat(name, format) {
			if (typeof format == "string") format = new RegExp(format);
			this.formats[name] = format;
			return this;
		}
		errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
			if (!errors || errors.length === 0) return "No errors";
			return errors.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
		}
		$dataMetaSchema(metaSchema, keywordsJsonPointers) {
			const rules = this.RULES.all;
			metaSchema = JSON.parse(JSON.stringify(metaSchema));
			for (const jsonPointer of keywordsJsonPointers) {
				const segments = jsonPointer.split("/").slice(1);
				let keywords = metaSchema;
				for (const seg of segments) keywords = keywords[seg];
				for (const key in rules) {
					const rule = rules[key];
					if (typeof rule != "object") continue;
					const { $data } = rule.definition;
					const schema = keywords[key];
					if ($data && schema) keywords[key] = schemaOrData(schema);
				}
			}
			return metaSchema;
		}
		_removeAllSchemas(schemas, regex) {
			for (const keyRef in schemas) {
				const sch = schemas[keyRef];
				if (!regex || regex.test(keyRef)) {
					if (typeof sch == "string") delete schemas[keyRef];
					else if (sch && !sch.meta) {
						this._cache.delete(sch.schema);
						delete schemas[keyRef];
					}
				}
			}
		}
		_addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
			let id;
			const { schemaId } = this.opts;
			if (typeof schema == "object") id = schema[schemaId];
			else if (this.opts.jtd) throw new Error("schema must be object");
			else if (typeof schema != "boolean") throw new Error("schema must be object or boolean");
			let sch = this._cache.get(schema);
			if (sch !== void 0) return sch;
			baseId = (0, resolve_1.normalizeId)(id || baseId);
			const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
			sch = new compile_1.SchemaEnv({
				schema,
				schemaId,
				meta,
				baseId,
				localRefs
			});
			this._cache.set(sch.schema, sch);
			if (addSchema && !baseId.startsWith("#")) {
				if (baseId) this._checkUnique(baseId);
				this.refs[baseId] = sch;
			}
			if (validateSchema) this.validateSchema(schema, true);
			return sch;
		}
		_checkUnique(id) {
			if (this.schemas[id] || this.refs[id]) throw new Error(`schema with key or id "${id}" already exists`);
		}
		_compileSchemaEnv(sch) {
			if (sch.meta) this._compileMetaSchema(sch);
			else compile_1.compileSchema.call(this, sch);
			/* istanbul ignore if */
			if (!sch.validate) throw new Error("ajv implementation error");
			return sch.validate;
		}
		_compileMetaSchema(sch) {
			const currentOpts = this.opts;
			this.opts = this._metaOpts;
			try {
				compile_1.compileSchema.call(this, sch);
			} finally {
				this.opts = currentOpts;
			}
		}
	};
	Ajv.ValidationError = validation_error_1.default;
	Ajv.MissingRefError = ref_error_1.default;
	exports.default = Ajv;
	function checkOptions(checkOpts, options, msg, log = "error") {
		for (const key in checkOpts) {
			const opt = key;
			if (opt in options) this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
		}
	}
	function getSchEnv(keyRef) {
		keyRef = (0, resolve_1.normalizeId)(keyRef);
		return this.schemas[keyRef] || this.refs[keyRef];
	}
	function addInitialSchemas() {
		const optsSchemas = this.opts.schemas;
		if (!optsSchemas) return;
		if (Array.isArray(optsSchemas)) this.addSchema(optsSchemas);
		else for (const key in optsSchemas) this.addSchema(optsSchemas[key], key);
	}
	function addInitialFormats() {
		for (const name in this.opts.formats) {
			const format = this.opts.formats[name];
			if (format) this.addFormat(name, format);
		}
	}
	function addInitialKeywords(defs) {
		if (Array.isArray(defs)) {
			this.addVocabulary(defs);
			return;
		}
		this.logger.warn("keywords option as map is deprecated, pass array");
		for (const keyword in defs) {
			const def = defs[keyword];
			if (!def.keyword) def.keyword = keyword;
			this.addKeyword(def);
		}
	}
	function getMetaSchemaOptions() {
		const metaOpts = { ...this.opts };
		for (const opt of META_IGNORE_OPTIONS) delete metaOpts[opt];
		return metaOpts;
	}
	var noLogs = {
		log() {},
		warn() {},
		error() {}
	};
	function getLogger(logger) {
		if (logger === false) return noLogs;
		if (logger === void 0) return console;
		if (logger.log && logger.warn && logger.error) return logger;
		throw new Error("logger must implement log, warn and error methods");
	}
	var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
	function checkKeyword(keyword, def) {
		const { RULES } = this;
		(0, util_1.eachItem)(keyword, (kwd) => {
			if (RULES.keywords[kwd]) throw new Error(`Keyword ${kwd} is already defined`);
			if (!KEYWORD_NAME.test(kwd)) throw new Error(`Keyword ${kwd} has invalid name`);
		});
		if (!def) return;
		if (def.$data && !("code" in def || "validate" in def)) throw new Error("$data keyword must have \"code\" or \"validate\" function");
	}
	function addRule(keyword, definition, dataType) {
		var _a;
		const post = definition === null || definition === void 0 ? void 0 : definition.post;
		if (dataType && post) throw new Error("keyword with \"post\" flag cannot have \"type\"");
		const { RULES } = this;
		let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
		if (!ruleGroup) {
			ruleGroup = {
				type: dataType,
				rules: []
			};
			RULES.rules.push(ruleGroup);
		}
		RULES.keywords[keyword] = true;
		if (!definition) return;
		const rule = {
			keyword,
			definition: {
				...definition,
				type: (0, dataType_1.getJSONTypes)(definition.type),
				schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
			}
		};
		if (definition.before) addBeforeRule.call(this, ruleGroup, rule, definition.before);
		else ruleGroup.rules.push(rule);
		RULES.all[keyword] = rule;
		(_a = definition.implements) === null || _a === void 0 || _a.forEach((kwd) => this.addKeyword(kwd));
	}
	function addBeforeRule(ruleGroup, rule, before) {
		const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
		if (i >= 0) ruleGroup.rules.splice(i, 0, rule);
		else {
			ruleGroup.rules.push(rule);
			this.logger.warn(`rule ${before} is not defined`);
		}
	}
	function keywordMetaschema(def) {
		let { metaSchema } = def;
		if (metaSchema === void 0) return;
		if (def.$data && this.opts.$data) metaSchema = schemaOrData(metaSchema);
		def.validateSchema = this.compile(metaSchema, true);
	}
	var $dataRef = { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" };
	function schemaOrData(schema) {
		return { anyOf: [schema, $dataRef] };
	}
}));
// node_modules/ajv/dist/vocabularies/core/id.js
var require_id = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = {
		keyword: "id",
		code() {
			throw new Error("NOT SUPPORTED: keyword \"id\", use \"$id\" for schema ID");
		}
	};
}));
// node_modules/ajv/dist/vocabularies/core/ref.js
var require_ref = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.callRef = exports.getValidate = void 0;
	var ref_error_1 = require_ref_error();
	var code_1 = require_code();
	var codegen_1 = require_codegen();
	var names_1 = require_names();
	var compile_1 = require_compile();
	var util_1 = require_util();
	var def = {
		keyword: "$ref",
		schemaType: "string",
		code(cxt) {
			const { gen, schema: $ref, it } = cxt;
			const { baseId, schemaEnv: env, validateName, opts, self } = it;
			const { root } = env;
			if (($ref === "#" || $ref === "#/") && baseId === root.baseId) return callRootRef();
			const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
			if (schOrEnv === void 0) throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
			if (schOrEnv instanceof compile_1.SchemaEnv) return callValidate(schOrEnv);
			return inlineRefSchema(schOrEnv);
			function callRootRef() {
				if (env === root) return callRef(cxt, validateName, env, env.$async);
				const rootName = gen.scopeValue("root", { ref: root });
				return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
			}
			function callValidate(sch) {
				callRef(cxt, getValidate(cxt, sch), sch, sch.$async);
			}
			function inlineRefSchema(sch) {
				const schName = gen.scopeValue("schema", opts.code.source === true ? {
					ref: sch,
					code: (0, codegen_1.stringify)(sch)
				} : { ref: sch });
				const valid = gen.name("valid");
				const schCxt = cxt.subschema({
					schema: sch,
					dataTypes: [],
					schemaPath: codegen_1.nil,
					topSchemaRef: schName,
					errSchemaPath: $ref
				}, valid);
				cxt.mergeEvaluated(schCxt);
				cxt.ok(valid);
			}
		}
	};
	function getValidate(cxt, sch) {
		const { gen } = cxt;
		return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
	}
	exports.getValidate = getValidate;
	function callRef(cxt, v, sch, $async) {
		const { gen, it } = cxt;
		const { allErrors, schemaEnv: env, opts } = it;
		const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
		if ($async) callAsyncRef();
		else callSyncRef();
		function callAsyncRef() {
			if (!env.$async) throw new Error("async schema referenced by sync schema");
			const valid = gen.let("valid");
			gen.try(() => {
				gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
				addEvaluatedFrom(v);
				if (!allErrors) gen.assign(valid, true);
			}, (e) => {
				gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
				addErrorsFrom(e);
				if (!allErrors) gen.assign(valid, false);
			});
			cxt.ok(valid);
		}
		function callSyncRef() {
			cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
		}
		function addErrorsFrom(source) {
			const errs = (0, codegen_1._)`${source}.errors`;
			gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
			gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
		}
		function addEvaluatedFrom(source) {
			var _a;
			if (!it.opts.unevaluated) return;
			const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
			if (it.props !== true) {
				if (schEvaluated && !schEvaluated.dynamicProps) {
					if (schEvaluated.props !== void 0) it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
				} else {
					const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
					it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
				}
			}
			if (it.items !== true) {
				if (schEvaluated && !schEvaluated.dynamicItems) {
					if (schEvaluated.items !== void 0) it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
				} else {
					const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
					it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
				}
			}
		}
	}
	exports.callRef = callRef;
	exports.default = def;
}));
// node_modules/ajv/dist/vocabularies/core/index.js
var require_core = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var id_1 = require_id();
	var ref_1 = require_ref();
	exports.default = [
		"$schema",
		"$id",
		"$defs",
		"$vocabulary",
		{ keyword: "$comment" },
		"definitions",
		id_1.default,
		ref_1.default
	];
}));
// node_modules/ajv/dist/vocabularies/validation/limitNumber.js
var require_limitNumber = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var ops = codegen_1.operators;
	var KWDs = {
		maximum: {
			okStr: "<=",
			ok: ops.LTE,
			fail: ops.GT
		},
		minimum: {
			okStr: ">=",
			ok: ops.GTE,
			fail: ops.LT
		},
		exclusiveMaximum: {
			okStr: "<",
			ok: ops.LT,
			fail: ops.GTE
		},
		exclusiveMinimum: {
			okStr: ">",
			ok: ops.GT,
			fail: ops.LTE
		}
	};
	exports.default = {
		keyword: Object.keys(KWDs),
		type: "number",
		schemaType: "number",
		$data: true,
		error: {
			message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
			params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
		},
		code(cxt) {
			const { keyword, data, schemaCode } = cxt;
			cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
		}
	};
}));
// node_modules/ajv/dist/vocabularies/validation/multipleOf.js
var require_multipleOf = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	exports.default = {
		keyword: "multipleOf",
		type: "number",
		schemaType: "number",
		$data: true,
		error: {
			message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
			params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
		},
		code(cxt) {
			const { gen, data, schemaCode, it } = cxt;
			const prec = it.opts.multipleOfPrecision;
			const res = gen.let("res");
			const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
			cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
		}
	};
}));
// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function ucs2length(str) {
		const len = str.length;
		let length = 0;
		let pos = 0;
		let value;
		while (pos < len) {
			length++;
			value = str.charCodeAt(pos++);
			if (value >= 55296 && value <= 56319 && pos < len) {
				value = str.charCodeAt(pos);
				if ((value & 64512) === 56320) pos++;
			}
		}
		return length;
	}
	exports.default = ucs2length;
	ucs2length.code = "require(\"ajv/dist/runtime/ucs2length\").default";
}));
// node_modules/ajv/dist/vocabularies/validation/limitLength.js
var require_limitLength = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var ucs2length_1 = require_ucs2length();
	exports.default = {
		keyword: ["maxLength", "minLength"],
		type: "string",
		schemaType: "number",
		$data: true,
		error: {
			message({ keyword, schemaCode }) {
				const comp = keyword === "maxLength" ? "more" : "fewer";
				return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
			},
			params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
		},
		code(cxt) {
			const { keyword, data, schemaCode, it } = cxt;
			const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
			const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
			cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
		}
	};
}));
// node_modules/ajv/dist/vocabularies/validation/pattern.js
var require_pattern = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var code_1 = require_code();
	var util_1 = require_util();
	var codegen_1 = require_codegen();
	exports.default = {
		keyword: "pattern",
		type: "string",
		schemaType: "string",
		$data: true,
		error: {
			message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
			params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
		},
		code(cxt) {
			const { gen, data, $data, schema, schemaCode, it } = cxt;
			const u = it.opts.unicodeRegExp ? "u" : "";
			if ($data) {
				const { regExp } = it.opts.code;
				const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
				const valid = gen.let("valid");
				gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
				cxt.fail$data((0, codegen_1._)`!${valid}`);
			} else {
				const regExp = (0, code_1.usePattern)(cxt, schema);
				cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/validation/limitProperties.js
var require_limitProperties = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	exports.default = {
		keyword: ["maxProperties", "minProperties"],
		type: "object",
		schemaType: "number",
		$data: true,
		error: {
			message({ keyword, schemaCode }) {
				const comp = keyword === "maxProperties" ? "more" : "fewer";
				return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
			},
			params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
		},
		code(cxt) {
			const { keyword, data, schemaCode } = cxt;
			const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
			cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
		}
	};
}));
// node_modules/ajv/dist/vocabularies/validation/required.js
var require_required = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var code_1 = require_code();
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	exports.default = {
		keyword: "required",
		type: "object",
		schemaType: "array",
		$data: true,
		error: {
			message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
			params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
		},
		code(cxt) {
			const { gen, schema, schemaCode, data, $data, it } = cxt;
			const { opts } = it;
			if (!$data && schema.length === 0) return;
			const useLoop = schema.length >= opts.loopRequired;
			if (it.allErrors) allErrorsMode();
			else exitOnErrorMode();
			if (opts.strictRequired) {
				const props = cxt.parentSchema.properties;
				const { definedProperties } = cxt.it;
				for (const requiredKey of schema) if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
					const msg = `required property "${requiredKey}" is not defined at "${it.schemaEnv.baseId + it.errSchemaPath}" (strictRequired)`;
					(0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
				}
			}
			function allErrorsMode() {
				if (useLoop || $data) cxt.block$data(codegen_1.nil, loopAllRequired);
				else for (const prop of schema) (0, code_1.checkReportMissingProp)(cxt, prop);
			}
			function exitOnErrorMode() {
				const missing = gen.let("missing");
				if (useLoop || $data) {
					const valid = gen.let("valid", true);
					cxt.block$data(valid, () => loopUntilMissing(missing, valid));
					cxt.ok(valid);
				} else {
					gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
					(0, code_1.reportMissingProp)(cxt, missing);
					gen.else();
				}
			}
			function loopAllRequired() {
				gen.forOf("prop", schemaCode, (prop) => {
					cxt.setParams({ missingProperty: prop });
					gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
				});
			}
			function loopUntilMissing(missing, valid) {
				cxt.setParams({ missingProperty: missing });
				gen.forOf(missing, schemaCode, () => {
					gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
					gen.if((0, codegen_1.not)(valid), () => {
						cxt.error();
						gen.break();
					});
				}, codegen_1.nil);
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/validation/limitItems.js
var require_limitItems = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	exports.default = {
		keyword: ["maxItems", "minItems"],
		type: "array",
		schemaType: "number",
		$data: true,
		error: {
			message({ keyword, schemaCode }) {
				const comp = keyword === "maxItems" ? "more" : "fewer";
				return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
			},
			params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
		},
		code(cxt) {
			const { keyword, data, schemaCode } = cxt;
			const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
			cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
		}
	};
}));
// node_modules/ajv/dist/runtime/equal.js
var require_equal = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var equal = require_fast_deep_equal();
	equal.code = "require(\"ajv/dist/runtime/equal\").default";
	exports.default = equal;
}));
// node_modules/ajv/dist/vocabularies/validation/uniqueItems.js
var require_uniqueItems = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var dataType_1 = require_dataType();
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var equal_1 = require_equal();
	exports.default = {
		keyword: "uniqueItems",
		type: "array",
		schemaType: "boolean",
		$data: true,
		error: {
			message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
			params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
		},
		code(cxt) {
			const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
			if (!$data && !schema) return;
			const valid = gen.let("valid");
			const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
			cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
			cxt.ok(valid);
			function validateUniqueItems() {
				const i = gen.let("i", (0, codegen_1._)`${data}.length`);
				const j = gen.let("j");
				cxt.setParams({
					i,
					j
				});
				gen.assign(valid, true);
				gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
			}
			function canOptimize() {
				return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
			}
			function loopN(i, j) {
				const item = gen.name("item");
				const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
				const indices = gen.const("indices", (0, codegen_1._)`{}`);
				gen.for((0, codegen_1._)`;${i}--;`, () => {
					gen.let(item, (0, codegen_1._)`${data}[${i}]`);
					gen.if(wrongType, (0, codegen_1._)`continue`);
					if (itemTypes.length > 1) gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
					gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
						gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
						cxt.error();
						gen.assign(valid, false).break();
					}).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
				});
			}
			function loopN2(i, j) {
				const eql = (0, util_1.useFunc)(gen, equal_1.default);
				const outer = gen.name("outer");
				gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
					cxt.error();
					gen.assign(valid, false).break(outer);
				})));
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/validation/const.js
var require_const = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var equal_1 = require_equal();
	exports.default = {
		keyword: "const",
		$data: true,
		error: {
			message: "must be equal to constant",
			params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
		},
		code(cxt) {
			const { gen, data, $data, schemaCode, schema } = cxt;
			if ($data || schema && typeof schema == "object") cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
			else cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
		}
	};
}));
// node_modules/ajv/dist/vocabularies/validation/enum.js
var require_enum = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var equal_1 = require_equal();
	exports.default = {
		keyword: "enum",
		schemaType: "array",
		$data: true,
		error: {
			message: "must be equal to one of the allowed values",
			params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
		},
		code(cxt) {
			const { gen, data, $data, schema, schemaCode, it } = cxt;
			if (!$data && schema.length === 0) throw new Error("enum must have non-empty array");
			const useLoop = schema.length >= it.opts.loopEnum;
			let eql;
			const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
			let valid;
			if (useLoop || $data) {
				valid = gen.let("valid");
				cxt.block$data(valid, loopEnum);
			} else {
				/* istanbul ignore if */
				if (!Array.isArray(schema)) throw new Error("ajv implementation error");
				const vSchema = gen.const("vSchema", schemaCode);
				valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
			}
			cxt.pass(valid);
			function loopEnum() {
				gen.assign(valid, false);
				gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
			}
			function equalCode(vSchema, i) {
				const sch = schema[i];
				return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/validation/index.js
var require_validation = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var limitNumber_1 = require_limitNumber();
	var multipleOf_1 = require_multipleOf();
	var limitLength_1 = require_limitLength();
	var pattern_1 = require_pattern();
	var limitProperties_1 = require_limitProperties();
	var required_1 = require_required();
	var limitItems_1 = require_limitItems();
	var uniqueItems_1 = require_uniqueItems();
	var const_1 = require_const();
	var enum_1 = require_enum();
	exports.default = [
		limitNumber_1.default,
		multipleOf_1.default,
		limitLength_1.default,
		pattern_1.default,
		limitProperties_1.default,
		required_1.default,
		limitItems_1.default,
		uniqueItems_1.default,
		{
			keyword: "type",
			schemaType: ["string", "array"]
		},
		{
			keyword: "nullable",
			schemaType: "boolean"
		},
		const_1.default,
		enum_1.default
	];
}));
// node_modules/ajv/dist/vocabularies/applicator/additionalItems.js
var require_additionalItems = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.validateAdditionalItems = void 0;
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var def = {
		keyword: "additionalItems",
		type: "array",
		schemaType: ["boolean", "object"],
		before: "uniqueItems",
		error: {
			message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
			params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
		},
		code(cxt) {
			const { parentSchema, it } = cxt;
			const { items } = parentSchema;
			if (!Array.isArray(items)) {
				(0, util_1.checkStrictMode)(it, "\"additionalItems\" is ignored when \"items\" is not an array of schemas");
				return;
			}
			validateAdditionalItems(cxt, items);
		}
	};
	function validateAdditionalItems(cxt, items) {
		const { gen, schema, data, keyword, it } = cxt;
		it.items = true;
		const len = gen.const("len", (0, codegen_1._)`${data}.length`);
		if (schema === false) {
			cxt.setParams({ len: items.length });
			cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
		} else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
			const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
			gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
			cxt.ok(valid);
		}
		function validateItems(valid) {
			gen.forRange("i", items.length, len, (i) => {
				cxt.subschema({
					keyword,
					dataProp: i,
					dataPropType: util_1.Type.Num
				}, valid);
				if (!it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
			});
		}
	}
	exports.validateAdditionalItems = validateAdditionalItems;
	exports.default = def;
}));
// node_modules/ajv/dist/vocabularies/applicator/items.js
var require_items = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.validateTuple = void 0;
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var code_1 = require_code();
	var def = {
		keyword: "items",
		type: "array",
		schemaType: [
			"object",
			"array",
			"boolean"
		],
		before: "uniqueItems",
		code(cxt) {
			const { schema, it } = cxt;
			if (Array.isArray(schema)) return validateTuple(cxt, "additionalItems", schema);
			it.items = true;
			if ((0, util_1.alwaysValidSchema)(it, schema)) return;
			cxt.ok((0, code_1.validateArray)(cxt));
		}
	};
	function validateTuple(cxt, extraItems, schArr = cxt.schema) {
		const { gen, parentSchema, data, keyword, it } = cxt;
		checkStrictTuple(parentSchema);
		if (it.opts.unevaluated && schArr.length && it.items !== true) it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
		const valid = gen.name("valid");
		const len = gen.const("len", (0, codegen_1._)`${data}.length`);
		schArr.forEach((sch, i) => {
			if ((0, util_1.alwaysValidSchema)(it, sch)) return;
			gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
				keyword,
				schemaProp: i,
				dataProp: i
			}, valid));
			cxt.ok(valid);
		});
		function checkStrictTuple(sch) {
			const { opts, errSchemaPath } = it;
			const l = schArr.length;
			const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
			if (opts.strictTuples && !fullTuple) {
				const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
				(0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
			}
		}
	}
	exports.validateTuple = validateTuple;
	exports.default = def;
}));
// node_modules/ajv/dist/vocabularies/applicator/prefixItems.js
var require_prefixItems = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var items_1 = require_items();
	exports.default = {
		keyword: "prefixItems",
		type: "array",
		schemaType: ["array"],
		before: "uniqueItems",
		code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/items2020.js
var require_items2020 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var code_1 = require_code();
	var additionalItems_1 = require_additionalItems();
	exports.default = {
		keyword: "items",
		type: "array",
		schemaType: ["object", "boolean"],
		before: "uniqueItems",
		error: {
			message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
			params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
		},
		code(cxt) {
			const { schema, parentSchema, it } = cxt;
			const { prefixItems } = parentSchema;
			it.items = true;
			if ((0, util_1.alwaysValidSchema)(it, schema)) return;
			if (prefixItems) (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
			else cxt.ok((0, code_1.validateArray)(cxt));
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/contains.js
var require_contains = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	exports.default = {
		keyword: "contains",
		type: "array",
		schemaType: ["object", "boolean"],
		before: "uniqueItems",
		trackErrors: true,
		error: {
			message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
			params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
		},
		code(cxt) {
			const { gen, schema, parentSchema, data, it } = cxt;
			let min;
			let max;
			const { minContains, maxContains } = parentSchema;
			if (it.opts.next) {
				min = minContains === void 0 ? 1 : minContains;
				max = maxContains;
			} else min = 1;
			const len = gen.const("len", (0, codegen_1._)`${data}.length`);
			cxt.setParams({
				min,
				max
			});
			if (max === void 0 && min === 0) {
				(0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
				return;
			}
			if (max !== void 0 && min > max) {
				(0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
				cxt.fail();
				return;
			}
			if ((0, util_1.alwaysValidSchema)(it, schema)) {
				let cond = (0, codegen_1._)`${len} >= ${min}`;
				if (max !== void 0) cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
				cxt.pass(cond);
				return;
			}
			it.items = true;
			const valid = gen.name("valid");
			if (max === void 0 && min === 1) validateItems(valid, () => gen.if(valid, () => gen.break()));
			else if (min === 0) {
				gen.let(valid, true);
				if (max !== void 0) gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
			} else {
				gen.let(valid, false);
				validateItemsWithCount();
			}
			cxt.result(valid, () => cxt.reset());
			function validateItemsWithCount() {
				const schValid = gen.name("_valid");
				const count = gen.let("count", 0);
				validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
			}
			function validateItems(_valid, block) {
				gen.forRange("i", 0, len, (i) => {
					cxt.subschema({
						keyword: "contains",
						dataProp: i,
						dataPropType: util_1.Type.Num,
						compositeRule: true
					}, _valid);
					block();
				});
			}
			function checkLimits(count) {
				gen.code((0, codegen_1._)`${count}++`);
				if (max === void 0) gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
				else {
					gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
					if (min === 1) gen.assign(valid, true);
					else gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
				}
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/dependencies.js
var require_dependencies = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var code_1 = require_code();
	exports.error = {
		message: ({ params: { property, depsCount, deps } }) => {
			const property_ies = depsCount === 1 ? "property" : "properties";
			return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
		},
		params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
	};
	var def = {
		keyword: "dependencies",
		type: "object",
		schemaType: "object",
		error: exports.error,
		code(cxt) {
			const [propDeps, schDeps] = splitDependencies(cxt);
			validatePropertyDeps(cxt, propDeps);
			validateSchemaDeps(cxt, schDeps);
		}
	};
	function splitDependencies({ schema }) {
		const propertyDeps = {};
		const schemaDeps = {};
		for (const key in schema) {
			if (key === "__proto__") continue;
			const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
			deps[key] = schema[key];
		}
		return [propertyDeps, schemaDeps];
	}
	function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
		const { gen, data, it } = cxt;
		if (Object.keys(propertyDeps).length === 0) return;
		const missing = gen.let("missing");
		for (const prop in propertyDeps) {
			const deps = propertyDeps[prop];
			if (deps.length === 0) continue;
			const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
			cxt.setParams({
				property: prop,
				depsCount: deps.length,
				deps: deps.join(", ")
			});
			if (it.allErrors) gen.if(hasProperty, () => {
				for (const depProp of deps) (0, code_1.checkReportMissingProp)(cxt, depProp);
			});
			else {
				gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
				(0, code_1.reportMissingProp)(cxt, missing);
				gen.else();
			}
		}
	}
	exports.validatePropertyDeps = validatePropertyDeps;
	function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
		const { gen, data, keyword, it } = cxt;
		const valid = gen.name("valid");
		for (const prop in schemaDeps) {
			if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop])) continue;
			gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties), () => {
				const schCxt = cxt.subschema({
					keyword,
					schemaProp: prop
				}, valid);
				cxt.mergeValidEvaluated(schCxt, valid);
			}, () => gen.var(valid, true));
			cxt.ok(valid);
		}
	}
	exports.validateSchemaDeps = validateSchemaDeps;
	exports.default = def;
}));
// node_modules/ajv/dist/vocabularies/applicator/propertyNames.js
var require_propertyNames = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	exports.default = {
		keyword: "propertyNames",
		type: "object",
		schemaType: ["object", "boolean"],
		error: {
			message: "property name must be valid",
			params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
		},
		code(cxt) {
			const { gen, schema, data, it } = cxt;
			if ((0, util_1.alwaysValidSchema)(it, schema)) return;
			const valid = gen.name("valid");
			gen.forIn("key", data, (key) => {
				cxt.setParams({ propertyName: key });
				cxt.subschema({
					keyword: "propertyNames",
					data: key,
					dataTypes: ["string"],
					propertyName: key,
					compositeRule: true
				}, valid);
				gen.if((0, codegen_1.not)(valid), () => {
					cxt.error(true);
					if (!it.allErrors) gen.break();
				});
			});
			cxt.ok(valid);
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js
var require_additionalProperties = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var code_1 = require_code();
	var codegen_1 = require_codegen();
	var names_1 = require_names();
	var util_1 = require_util();
	exports.default = {
		keyword: "additionalProperties",
		type: ["object"],
		schemaType: ["boolean", "object"],
		allowUndefined: true,
		trackErrors: true,
		error: {
			message: "must NOT have additional properties",
			params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
		},
		code(cxt) {
			const { gen, schema, parentSchema, data, errsCount, it } = cxt;
			/* istanbul ignore if */
			if (!errsCount) throw new Error("ajv implementation error");
			const { allErrors, opts } = it;
			it.props = true;
			if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema)) return;
			const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
			const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
			checkAdditionalProperties();
			cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
			function checkAdditionalProperties() {
				gen.forIn("key", data, (key) => {
					if (!props.length && !patProps.length) additionalPropertyCode(key);
					else gen.if(isAdditional(key), () => additionalPropertyCode(key));
				});
			}
			function isAdditional(key) {
				let definedProp;
				if (props.length > 8) {
					const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
					definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
				} else if (props.length) definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
				else definedProp = codegen_1.nil;
				if (patProps.length) definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
				return (0, codegen_1.not)(definedProp);
			}
			function deleteAdditional(key) {
				gen.code((0, codegen_1._)`delete ${data}[${key}]`);
			}
			function additionalPropertyCode(key) {
				if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
					deleteAdditional(key);
					return;
				}
				if (schema === false) {
					cxt.setParams({ additionalProperty: key });
					cxt.error();
					if (!allErrors) gen.break();
					return;
				}
				if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
					const valid = gen.name("valid");
					if (opts.removeAdditional === "failing") {
						applyAdditionalSchema(key, valid, false);
						gen.if((0, codegen_1.not)(valid), () => {
							cxt.reset();
							deleteAdditional(key);
						});
					} else {
						applyAdditionalSchema(key, valid);
						if (!allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
					}
				}
			}
			function applyAdditionalSchema(key, valid, errors) {
				const subschema = {
					keyword: "additionalProperties",
					dataProp: key,
					dataPropType: util_1.Type.Str
				};
				if (errors === false) Object.assign(subschema, {
					compositeRule: true,
					createErrors: false,
					allErrors: false
				});
				cxt.subschema(subschema, valid);
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/properties.js
var require_properties = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var validate_1 = require_validate();
	var code_1 = require_code();
	var util_1 = require_util();
	var additionalProperties_1 = require_additionalProperties();
	exports.default = {
		keyword: "properties",
		type: "object",
		schemaType: "object",
		code(cxt) {
			const { gen, schema, parentSchema, data, it } = cxt;
			if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
			const allProps = (0, code_1.allSchemaProperties)(schema);
			for (const prop of allProps) it.definedProperties.add(prop);
			if (it.opts.unevaluated && allProps.length && it.props !== true) it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
			const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
			if (properties.length === 0) return;
			const valid = gen.name("valid");
			for (const prop of properties) {
				if (hasDefault(prop)) applyPropertySchema(prop);
				else {
					gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
					applyPropertySchema(prop);
					if (!it.allErrors) gen.else().var(valid, true);
					gen.endIf();
				}
				cxt.it.definedProperties.add(prop);
				cxt.ok(valid);
			}
			function hasDefault(prop) {
				return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
			}
			function applyPropertySchema(prop) {
				cxt.subschema({
					keyword: "properties",
					schemaProp: prop,
					dataProp: prop
				}, valid);
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/patternProperties.js
var require_patternProperties = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var code_1 = require_code();
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var util_2 = require_util();
	exports.default = {
		keyword: "patternProperties",
		type: "object",
		schemaType: "object",
		code(cxt) {
			const { gen, schema, data, parentSchema, it } = cxt;
			const { opts } = it;
			const patterns = (0, code_1.allSchemaProperties)(schema);
			const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
			if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) return;
			const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
			const valid = gen.name("valid");
			if (it.props !== true && !(it.props instanceof codegen_1.Name)) it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
			const { props } = it;
			validatePatternProperties();
			function validatePatternProperties() {
				for (const pat of patterns) {
					if (checkProperties) checkMatchingProperties(pat);
					if (it.allErrors) validateProperties(pat);
					else {
						gen.var(valid, true);
						validateProperties(pat);
						gen.if(valid);
					}
				}
			}
			function checkMatchingProperties(pat) {
				for (const prop in checkProperties) if (new RegExp(pat).test(prop)) (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
			}
			function validateProperties(pat) {
				gen.forIn("key", data, (key) => {
					gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
						const alwaysValid = alwaysValidPatterns.includes(pat);
						if (!alwaysValid) cxt.subschema({
							keyword: "patternProperties",
							schemaProp: pat,
							dataProp: key,
							dataPropType: util_2.Type.Str
						}, valid);
						if (it.opts.unevaluated && props !== true) gen.assign((0, codegen_1._)`${props}[${key}]`, true);
						else if (!alwaysValid && !it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
					});
				});
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/not.js
var require_not = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var util_1 = require_util();
	exports.default = {
		keyword: "not",
		schemaType: ["object", "boolean"],
		trackErrors: true,
		code(cxt) {
			const { gen, schema, it } = cxt;
			if ((0, util_1.alwaysValidSchema)(it, schema)) {
				cxt.fail();
				return;
			}
			const valid = gen.name("valid");
			cxt.subschema({
				keyword: "not",
				compositeRule: true,
				createErrors: false,
				allErrors: false
			}, valid);
			cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
		},
		error: { message: "must NOT be valid" }
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/anyOf.js
var require_anyOf = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = {
		keyword: "anyOf",
		schemaType: "array",
		trackErrors: true,
		code: require_code().validateUnion,
		error: { message: "must match a schema in anyOf" }
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/oneOf.js
var require_oneOf = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	exports.default = {
		keyword: "oneOf",
		schemaType: "array",
		trackErrors: true,
		error: {
			message: "must match exactly one schema in oneOf",
			params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
		},
		code(cxt) {
			const { gen, schema, parentSchema, it } = cxt;
			/* istanbul ignore if */
			if (!Array.isArray(schema)) throw new Error("ajv implementation error");
			if (it.opts.discriminator && parentSchema.discriminator) return;
			const schArr = schema;
			const valid = gen.let("valid", false);
			const passing = gen.let("passing", null);
			const schValid = gen.name("_valid");
			cxt.setParams({ passing });
			gen.block(validateOneOf);
			cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
			function validateOneOf() {
				schArr.forEach((sch, i) => {
					let schCxt;
					if ((0, util_1.alwaysValidSchema)(it, sch)) gen.var(schValid, true);
					else schCxt = cxt.subschema({
						keyword: "oneOf",
						schemaProp: i,
						compositeRule: true
					}, schValid);
					if (i > 0) gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
					gen.if(schValid, () => {
						gen.assign(valid, true);
						gen.assign(passing, i);
						if (schCxt) cxt.mergeEvaluated(schCxt, codegen_1.Name);
					});
				});
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/allOf.js
var require_allOf = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var util_1 = require_util();
	exports.default = {
		keyword: "allOf",
		schemaType: "array",
		code(cxt) {
			const { gen, schema, it } = cxt;
			/* istanbul ignore if */
			if (!Array.isArray(schema)) throw new Error("ajv implementation error");
			const valid = gen.name("valid");
			schema.forEach((sch, i) => {
				if ((0, util_1.alwaysValidSchema)(it, sch)) return;
				const schCxt = cxt.subschema({
					keyword: "allOf",
					schemaProp: i
				}, valid);
				cxt.ok(valid);
				cxt.mergeEvaluated(schCxt);
			});
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/if.js
var require_if = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var def = {
		keyword: "if",
		schemaType: ["object", "boolean"],
		trackErrors: true,
		error: {
			message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
			params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
		},
		code(cxt) {
			const { gen, parentSchema, it } = cxt;
			if (parentSchema.then === void 0 && parentSchema.else === void 0) (0, util_1.checkStrictMode)(it, "\"if\" without \"then\" and \"else\" is ignored");
			const hasThen = hasSchema(it, "then");
			const hasElse = hasSchema(it, "else");
			if (!hasThen && !hasElse) return;
			const valid = gen.let("valid", true);
			const schValid = gen.name("_valid");
			validateIf();
			cxt.reset();
			if (hasThen && hasElse) {
				const ifClause = gen.let("ifClause");
				cxt.setParams({ ifClause });
				gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
			} else if (hasThen) gen.if(schValid, validateClause("then"));
			else gen.if((0, codegen_1.not)(schValid), validateClause("else"));
			cxt.pass(valid, () => cxt.error(true));
			function validateIf() {
				const schCxt = cxt.subschema({
					keyword: "if",
					compositeRule: true,
					createErrors: false,
					allErrors: false
				}, schValid);
				cxt.mergeEvaluated(schCxt);
			}
			function validateClause(keyword, ifClause) {
				return () => {
					const schCxt = cxt.subschema({ keyword }, schValid);
					gen.assign(valid, schValid);
					cxt.mergeValidEvaluated(schCxt, valid);
					if (ifClause) gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
					else cxt.setParams({ ifClause: keyword });
				};
			}
		}
	};
	function hasSchema(it, keyword) {
		const schema = it.schema[keyword];
		return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
	}
	exports.default = def;
}));
// node_modules/ajv/dist/vocabularies/applicator/thenElse.js
var require_thenElse = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var util_1 = require_util();
	exports.default = {
		keyword: ["then", "else"],
		schemaType: ["object", "boolean"],
		code({ keyword, parentSchema, it }) {
			if (parentSchema.if === void 0) (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
		}
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/index.js
var require_applicator = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var additionalItems_1 = require_additionalItems();
	var prefixItems_1 = require_prefixItems();
	var items_1 = require_items();
	var items2020_1 = require_items2020();
	var contains_1 = require_contains();
	var dependencies_1 = require_dependencies();
	var propertyNames_1 = require_propertyNames();
	var additionalProperties_1 = require_additionalProperties();
	var properties_1 = require_properties();
	var patternProperties_1 = require_patternProperties();
	var not_1 = require_not();
	var anyOf_1 = require_anyOf();
	var oneOf_1 = require_oneOf();
	var allOf_1 = require_allOf();
	var if_1 = require_if();
	var thenElse_1 = require_thenElse();
	function getApplicator(draft2020 = false) {
		const applicator = [
			not_1.default,
			anyOf_1.default,
			oneOf_1.default,
			allOf_1.default,
			if_1.default,
			thenElse_1.default,
			propertyNames_1.default,
			additionalProperties_1.default,
			dependencies_1.default,
			properties_1.default,
			patternProperties_1.default
		];
		if (draft2020) applicator.push(prefixItems_1.default, items2020_1.default);
		else applicator.push(additionalItems_1.default, items_1.default);
		applicator.push(contains_1.default);
		return applicator;
	}
	exports.default = getApplicator;
}));
// node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js
var require_dynamicAnchor = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.dynamicAnchor = void 0;
	var codegen_1 = require_codegen();
	var names_1 = require_names();
	var compile_1 = require_compile();
	var ref_1 = require_ref();
	var def = {
		keyword: "$dynamicAnchor",
		schemaType: "string",
		code: (cxt) => dynamicAnchor(cxt, cxt.schema)
	};
	function dynamicAnchor(cxt, anchor) {
		const { gen, it } = cxt;
		it.schemaEnv.root.dynamicAnchors[anchor] = true;
		const v = (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`;
		const validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
		gen.if((0, codegen_1._)`!${v}`, () => gen.assign(v, validate));
	}
	exports.dynamicAnchor = dynamicAnchor;
	function _getValidate(cxt) {
		const { schemaEnv, schema, self } = cxt.it;
		const { root, baseId, localRefs, meta } = schemaEnv.root;
		const { schemaId } = self.opts;
		const sch = new compile_1.SchemaEnv({
			schema,
			schemaId,
			root,
			baseId,
			localRefs,
			meta
		});
		compile_1.compileSchema.call(self, sch);
		return (0, ref_1.getValidate)(cxt, sch);
	}
	exports.default = def;
}));
// node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js
var require_dynamicRef = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.dynamicRef = void 0;
	var codegen_1 = require_codegen();
	var names_1 = require_names();
	var ref_1 = require_ref();
	var def = {
		keyword: "$dynamicRef",
		schemaType: "string",
		code: (cxt) => dynamicRef(cxt, cxt.schema)
	};
	function dynamicRef(cxt, ref) {
		const { gen, keyword, it } = cxt;
		if (ref[0] !== "#") throw new Error(`"${keyword}" only supports hash fragment reference`);
		const anchor = ref.slice(1);
		if (it.allErrors) _dynamicRef();
		else {
			const valid = gen.let("valid", false);
			_dynamicRef(valid);
			cxt.ok(valid);
		}
		function _dynamicRef(valid) {
			if (it.schemaEnv.root.dynamicAnchors[anchor]) {
				const v = gen.let("_v", (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`);
				gen.if(v, _callRef(v, valid), _callRef(it.validateName, valid));
			} else _callRef(it.validateName, valid)();
		}
		function _callRef(validate, valid) {
			return valid ? () => gen.block(() => {
				(0, ref_1.callRef)(cxt, validate);
				gen.let(valid, true);
			}) : () => (0, ref_1.callRef)(cxt, validate);
		}
	}
	exports.dynamicRef = dynamicRef;
	exports.default = def;
}));
// node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js
var require_recursiveAnchor = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var dynamicAnchor_1 = require_dynamicAnchor();
	var util_1 = require_util();
	exports.default = {
		keyword: "$recursiveAnchor",
		schemaType: "boolean",
		code(cxt) {
			if (cxt.schema) (0, dynamicAnchor_1.dynamicAnchor)(cxt, "");
			else (0, util_1.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
		}
	};
}));
// node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js
var require_recursiveRef = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var dynamicRef_1 = require_dynamicRef();
	exports.default = {
		keyword: "$recursiveRef",
		schemaType: "string",
		code: (cxt) => (0, dynamicRef_1.dynamicRef)(cxt, cxt.schema)
	};
}));
// node_modules/ajv/dist/vocabularies/dynamic/index.js
var require_dynamic = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var dynamicAnchor_1 = require_dynamicAnchor();
	var dynamicRef_1 = require_dynamicRef();
	var recursiveAnchor_1 = require_recursiveAnchor();
	var recursiveRef_1 = require_recursiveRef();
	exports.default = [
		dynamicAnchor_1.default,
		dynamicRef_1.default,
		recursiveAnchor_1.default,
		recursiveRef_1.default
	];
}));
// node_modules/ajv/dist/vocabularies/validation/dependentRequired.js
var require_dependentRequired = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var dependencies_1 = require_dependencies();
	exports.default = {
		keyword: "dependentRequired",
		type: "object",
		schemaType: "object",
		error: dependencies_1.error,
		code: (cxt) => (0, dependencies_1.validatePropertyDeps)(cxt)
	};
}));
// node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js
var require_dependentSchemas = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var dependencies_1 = require_dependencies();
	exports.default = {
		keyword: "dependentSchemas",
		type: "object",
		schemaType: "object",
		code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt)
	};
}));
// node_modules/ajv/dist/vocabularies/validation/limitContains.js
var require_limitContains = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var util_1 = require_util();
	exports.default = {
		keyword: ["maxContains", "minContains"],
		type: "array",
		schemaType: "number",
		code({ keyword, parentSchema, it }) {
			if (parentSchema.contains === void 0) (0, util_1.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
		}
	};
}));
// node_modules/ajv/dist/vocabularies/next.js
var require_next = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var dependentRequired_1 = require_dependentRequired();
	var dependentSchemas_1 = require_dependentSchemas();
	var limitContains_1 = require_limitContains();
	exports.default = [
		dependentRequired_1.default,
		dependentSchemas_1.default,
		limitContains_1.default
	];
}));
// node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js
var require_unevaluatedProperties = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	var names_1 = require_names();
	exports.default = {
		keyword: "unevaluatedProperties",
		type: "object",
		schemaType: ["boolean", "object"],
		trackErrors: true,
		error: {
			message: "must NOT have unevaluated properties",
			params: ({ params }) => (0, codegen_1._)`{unevaluatedProperty: ${params.unevaluatedProperty}}`
		},
		code(cxt) {
			const { gen, schema, data, errsCount, it } = cxt;
			/* istanbul ignore if */
			if (!errsCount) throw new Error("ajv implementation error");
			const { allErrors, props } = it;
			if (props instanceof codegen_1.Name) gen.if((0, codegen_1._)`${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
			else if (props !== true) gen.forIn("key", data, (key) => props === void 0 ? unevaluatedPropCode(key) : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
			it.props = true;
			cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
			function unevaluatedPropCode(key) {
				if (schema === false) {
					cxt.setParams({ unevaluatedProperty: key });
					cxt.error();
					if (!allErrors) gen.break();
					return;
				}
				if (!(0, util_1.alwaysValidSchema)(it, schema)) {
					const valid = gen.name("valid");
					cxt.subschema({
						keyword: "unevaluatedProperties",
						dataProp: key,
						dataPropType: util_1.Type.Str
					}, valid);
					if (!allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
				}
			}
			function unevaluatedDynamic(evaluatedProps, key) {
				return (0, codegen_1._)`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
			}
			function unevaluatedStatic(evaluatedProps, key) {
				const ps = [];
				for (const p in evaluatedProps) if (evaluatedProps[p] === true) ps.push((0, codegen_1._)`${key} !== ${p}`);
				return (0, codegen_1.and)(...ps);
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js
var require_unevaluatedItems = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var util_1 = require_util();
	exports.default = {
		keyword: "unevaluatedItems",
		type: "array",
		schemaType: ["boolean", "object"],
		error: {
			message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
			params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
		},
		code(cxt) {
			const { gen, schema, data, it } = cxt;
			const items = it.items || 0;
			if (items === true) return;
			const len = gen.const("len", (0, codegen_1._)`${data}.length`);
			if (schema === false) {
				cxt.setParams({ len: items });
				cxt.fail((0, codegen_1._)`${len} > ${items}`);
			} else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
				const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items}`);
				gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
				cxt.ok(valid);
			}
			it.items = true;
			function validateItems(valid, from) {
				gen.forRange("i", from, len, (i) => {
					cxt.subschema({
						keyword: "unevaluatedItems",
						dataProp: i,
						dataPropType: util_1.Type.Num
					}, valid);
					if (!it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
				});
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/unevaluated/index.js
var require_unevaluated = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var unevaluatedProperties_1 = require_unevaluatedProperties();
	var unevaluatedItems_1 = require_unevaluatedItems();
	exports.default = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
}));
// node_modules/ajv/dist/vocabularies/format/format.js
var require_format$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	exports.default = {
		keyword: "format",
		type: ["number", "string"],
		schemaType: "string",
		$data: true,
		error: {
			message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
			params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
		},
		code(cxt, ruleType) {
			const { gen, data, $data, schema, schemaCode, it } = cxt;
			const { opts, errSchemaPath, schemaEnv, self } = it;
			if (!opts.validateFormats) return;
			if ($data) validate$DataFormat();
			else validateFormat();
			function validate$DataFormat() {
				const fmts = gen.scopeValue("formats", {
					ref: self.formats,
					code: opts.code.formats
				});
				const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
				const fType = gen.let("fType");
				const format = gen.let("format");
				gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
				cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
				function unknownFmt() {
					if (opts.strictSchema === false) return codegen_1.nil;
					return (0, codegen_1._)`${schemaCode} && !${format}`;
				}
				function invalidFmt() {
					const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
					const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
					return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
				}
			}
			function validateFormat() {
				const formatDef = self.formats[schema];
				if (!formatDef) {
					unknownFormat();
					return;
				}
				if (formatDef === true) return;
				const [fmtType, format, fmtRef] = getFormat(formatDef);
				if (fmtType === ruleType) cxt.pass(validCondition());
				function unknownFormat() {
					if (opts.strictSchema === false) {
						self.logger.warn(unknownMsg());
						return;
					}
					throw new Error(unknownMsg());
					function unknownMsg() {
						return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
					}
				}
				function getFormat(fmtDef) {
					const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
					const fmt = gen.scopeValue("formats", {
						key: schema,
						ref: fmtDef,
						code
					});
					if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) return [
						fmtDef.type || "string",
						fmtDef.validate,
						(0, codegen_1._)`${fmt}.validate`
					];
					return [
						"string",
						fmtDef,
						fmt
					];
				}
				function validCondition() {
					if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
						if (!schemaEnv.$async) throw new Error("async format in sync schema");
						return (0, codegen_1._)`await ${fmtRef}(${data})`;
					}
					return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
				}
			}
		}
	};
}));
// node_modules/ajv/dist/vocabularies/format/index.js
var require_format = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = [require_format$1().default];
}));
// node_modules/ajv/dist/vocabularies/metadata.js
var require_metadata = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.contentVocabulary = exports.metadataVocabulary = void 0;
	exports.metadataVocabulary = [
		"title",
		"description",
		"default",
		"deprecated",
		"readOnly",
		"writeOnly",
		"examples"
	];
	exports.contentVocabulary = [
		"contentMediaType",
		"contentEncoding",
		"contentSchema"
	];
}));
// node_modules/ajv/dist/vocabularies/draft2020.js
var require_draft2020 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var core_1 = require_core();
	var validation_1 = require_validation();
	var applicator_1 = require_applicator();
	var dynamic_1 = require_dynamic();
	var next_1 = require_next();
	var unevaluated_1 = require_unevaluated();
	var format_1 = require_format();
	var metadata_1 = require_metadata();
	exports.default = [
		dynamic_1.default,
		core_1.default,
		validation_1.default,
		(0, applicator_1.default)(true),
		format_1.default,
		metadata_1.metadataVocabulary,
		metadata_1.contentVocabulary,
		next_1.default,
		unevaluated_1.default
	];
}));
// node_modules/ajv/dist/vocabularies/discriminator/types.js
var require_types = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.DiscrError = void 0;
	var DiscrError;
	(function(DiscrError) {
		DiscrError["Tag"] = "tag";
		DiscrError["Mapping"] = "mapping";
	})(DiscrError || (exports.DiscrError = DiscrError = {}));
}));
// node_modules/ajv/dist/vocabularies/discriminator/index.js
var require_discriminator = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var codegen_1 = require_codegen();
	var types_1 = require_types();
	var compile_1 = require_compile();
	var ref_error_1 = require_ref_error();
	var util_1 = require_util();
	exports.default = {
		keyword: "discriminator",
		type: "object",
		schemaType: "object",
		error: {
			message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
			params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
		},
		code(cxt) {
			const { gen, data, schema, parentSchema, it } = cxt;
			const { oneOf } = parentSchema;
			if (!it.opts.discriminator) throw new Error("discriminator: requires discriminator option");
			const tagName = schema.propertyName;
			if (typeof tagName != "string") throw new Error("discriminator: requires propertyName");
			if (schema.mapping) throw new Error("discriminator: mapping is not supported");
			if (!oneOf) throw new Error("discriminator: requires oneOf keyword");
			const valid = gen.let("valid", false);
			const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
			gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, {
				discrError: types_1.DiscrError.Tag,
				tag,
				tagName
			}));
			cxt.ok(valid);
			function validateMapping() {
				const mapping = getMapping();
				gen.if(false);
				for (const tagValue in mapping) {
					gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
					gen.assign(valid, applyTagSchema(mapping[tagValue]));
				}
				gen.else();
				cxt.error(false, {
					discrError: types_1.DiscrError.Mapping,
					tag,
					tagName
				});
				gen.endIf();
			}
			function applyTagSchema(schemaProp) {
				const _valid = gen.name("valid");
				const schCxt = cxt.subschema({
					keyword: "oneOf",
					schemaProp
				}, _valid);
				cxt.mergeEvaluated(schCxt, codegen_1.Name);
				return _valid;
			}
			function getMapping() {
				var _a;
				const oneOfMapping = {};
				const topRequired = hasRequired(parentSchema);
				let tagRequired = true;
				for (let i = 0; i < oneOf.length; i++) {
					let sch = oneOf[i];
					if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
						const ref = sch.$ref;
						sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
						if (sch instanceof compile_1.SchemaEnv) sch = sch.schema;
						if (sch === void 0) throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
					}
					const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
					if (typeof propSch != "object") throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
					tagRequired = tagRequired && (topRequired || hasRequired(sch));
					addMappings(propSch, i);
				}
				if (!tagRequired) throw new Error(`discriminator: "${tagName}" must be required`);
				return oneOfMapping;
				function hasRequired({ required }) {
					return Array.isArray(required) && required.includes(tagName);
				}
				function addMappings(sch, i) {
					if (sch.const) addMapping(sch.const, i);
					else if (sch.enum) for (const tagValue of sch.enum) addMapping(tagValue, i);
					else throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
				}
				function addMapping(tagValue, i) {
					if (typeof tagValue != "string" || tagValue in oneOfMapping) throw new Error(`discriminator: "${tagName}" values must be unique strings`);
					oneOfMapping[tagValue] = i;
				}
			}
		}
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/schema.json
var schema_exports = /* @__PURE__ */ __exportAll({
	$comment: () => $comment,
	$dynamicAnchor: () => $dynamicAnchor$7,
	$id: () => $id$8,
	$schema: () => $schema$8,
	$vocabulary: () => $vocabulary$7,
	allOf: () => allOf,
	default: () => schema_default,
	properties: () => properties$8,
	title: () => title$8,
	type: () => type$8
});
var $schema$8, $id$8, $vocabulary$7, $dynamicAnchor$7, title$8, allOf, type$8, $comment, properties$8, schema_default;
var init_schema = __esmMin((() => {
	$schema$8 = "https://json-schema.org/draft/2020-12/schema";
	$id$8 = "https://json-schema.org/draft/2020-12/schema";
	$vocabulary$7 = {
		"https://json-schema.org/draft/2020-12/vocab/core": true,
		"https://json-schema.org/draft/2020-12/vocab/applicator": true,
		"https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
		"https://json-schema.org/draft/2020-12/vocab/validation": true,
		"https://json-schema.org/draft/2020-12/vocab/meta-data": true,
		"https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
		"https://json-schema.org/draft/2020-12/vocab/content": true
	};
	$dynamicAnchor$7 = "meta";
	title$8 = "Core and Validation specifications meta-schema";
	allOf = [
		{ "$ref": "meta/core" },
		{ "$ref": "meta/applicator" },
		{ "$ref": "meta/unevaluated" },
		{ "$ref": "meta/validation" },
		{ "$ref": "meta/meta-data" },
		{ "$ref": "meta/format-annotation" },
		{ "$ref": "meta/content" }
	];
	type$8 = ["object", "boolean"];
	$comment = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.";
	properties$8 = {
		"definitions": {
			"$comment": "\"definitions\" has been replaced by \"$defs\".",
			"type": "object",
			"additionalProperties": { "$dynamicRef": "#meta" },
			"deprecated": true,
			"default": {}
		},
		"dependencies": {
			"$comment": "\"dependencies\" has been split and replaced by \"dependentSchemas\" and \"dependentRequired\" in order to serve their differing semantics.",
			"type": "object",
			"additionalProperties": { "anyOf": [{ "$dynamicRef": "#meta" }, { "$ref": "meta/validation#/$defs/stringArray" }] },
			"deprecated": true,
			"default": {}
		},
		"$recursiveAnchor": {
			"$comment": "\"$recursiveAnchor\" has been replaced by \"$dynamicAnchor\".",
			"$ref": "meta/core#/$defs/anchorString",
			"deprecated": true
		},
		"$recursiveRef": {
			"$comment": "\"$recursiveRef\" has been replaced by \"$dynamicRef\".",
			"$ref": "meta/core#/$defs/uriReferenceString",
			"deprecated": true
		}
	};
	schema_default = {
		$schema: $schema$8,
		$id: $id$8,
		$vocabulary: $vocabulary$7,
		$dynamicAnchor: $dynamicAnchor$7,
		title: title$8,
		allOf,
		type: type$8,
		$comment,
		properties: properties$8
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json
var applicator_exports = /* @__PURE__ */ __exportAll({
	$defs: () => $defs$3,
	$dynamicAnchor: () => $dynamicAnchor$6,
	$id: () => $id$7,
	$schema: () => $schema$7,
	$vocabulary: () => $vocabulary$6,
	default: () => applicator_default,
	properties: () => properties$7,
	title: () => title$7,
	type: () => type$7
});
var $schema$7, $id$7, $vocabulary$6, $dynamicAnchor$6, title$7, type$7, properties$7, $defs$3, applicator_default;
var init_applicator = __esmMin((() => {
	$schema$7 = "https://json-schema.org/draft/2020-12/schema";
	$id$7 = "https://json-schema.org/draft/2020-12/meta/applicator";
	$vocabulary$6 = { "https://json-schema.org/draft/2020-12/vocab/applicator": true };
	$dynamicAnchor$6 = "meta";
	title$7 = "Applicator vocabulary meta-schema";
	type$7 = ["object", "boolean"];
	properties$7 = {
		"prefixItems": { "$ref": "#/$defs/schemaArray" },
		"items": { "$dynamicRef": "#meta" },
		"contains": { "$dynamicRef": "#meta" },
		"additionalProperties": { "$dynamicRef": "#meta" },
		"properties": {
			"type": "object",
			"additionalProperties": { "$dynamicRef": "#meta" },
			"default": {}
		},
		"patternProperties": {
			"type": "object",
			"additionalProperties": { "$dynamicRef": "#meta" },
			"propertyNames": { "format": "regex" },
			"default": {}
		},
		"dependentSchemas": {
			"type": "object",
			"additionalProperties": { "$dynamicRef": "#meta" },
			"default": {}
		},
		"propertyNames": { "$dynamicRef": "#meta" },
		"if": { "$dynamicRef": "#meta" },
		"then": { "$dynamicRef": "#meta" },
		"else": { "$dynamicRef": "#meta" },
		"allOf": { "$ref": "#/$defs/schemaArray" },
		"anyOf": { "$ref": "#/$defs/schemaArray" },
		"oneOf": { "$ref": "#/$defs/schemaArray" },
		"not": { "$dynamicRef": "#meta" }
	};
	$defs$3 = { "schemaArray": {
		"type": "array",
		"minItems": 1,
		"items": { "$dynamicRef": "#meta" }
	} };
	applicator_default = {
		$schema: $schema$7,
		$id: $id$7,
		$vocabulary: $vocabulary$6,
		$dynamicAnchor: $dynamicAnchor$6,
		title: title$7,
		type: type$7,
		properties: properties$7,
		$defs: $defs$3
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json
var unevaluated_exports = /* @__PURE__ */ __exportAll({
	$dynamicAnchor: () => $dynamicAnchor$5,
	$id: () => $id$6,
	$schema: () => $schema$6,
	$vocabulary: () => $vocabulary$5,
	default: () => unevaluated_default,
	properties: () => properties$6,
	title: () => title$6,
	type: () => type$6
});
var $schema$6, $id$6, $vocabulary$5, $dynamicAnchor$5, title$6, type$6, properties$6, unevaluated_default;
var init_unevaluated = __esmMin((() => {
	$schema$6 = "https://json-schema.org/draft/2020-12/schema";
	$id$6 = "https://json-schema.org/draft/2020-12/meta/unevaluated";
	$vocabulary$5 = { "https://json-schema.org/draft/2020-12/vocab/unevaluated": true };
	$dynamicAnchor$5 = "meta";
	title$6 = "Unevaluated applicator vocabulary meta-schema";
	type$6 = ["object", "boolean"];
	properties$6 = {
		"unevaluatedItems": { "$dynamicRef": "#meta" },
		"unevaluatedProperties": { "$dynamicRef": "#meta" }
	};
	unevaluated_default = {
		$schema: $schema$6,
		$id: $id$6,
		$vocabulary: $vocabulary$5,
		$dynamicAnchor: $dynamicAnchor$5,
		title: title$6,
		type: type$6,
		properties: properties$6
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json
var content_exports = /* @__PURE__ */ __exportAll({
	$dynamicAnchor: () => $dynamicAnchor$4,
	$id: () => $id$5,
	$schema: () => $schema$5,
	$vocabulary: () => $vocabulary$4,
	default: () => content_default,
	properties: () => properties$5,
	title: () => title$5,
	type: () => type$5
});
var $schema$5, $id$5, $vocabulary$4, $dynamicAnchor$4, title$5, type$5, properties$5, content_default;
var init_content = __esmMin((() => {
	$schema$5 = "https://json-schema.org/draft/2020-12/schema";
	$id$5 = "https://json-schema.org/draft/2020-12/meta/content";
	$vocabulary$4 = { "https://json-schema.org/draft/2020-12/vocab/content": true };
	$dynamicAnchor$4 = "meta";
	title$5 = "Content vocabulary meta-schema";
	type$5 = ["object", "boolean"];
	properties$5 = {
		"contentEncoding": { "type": "string" },
		"contentMediaType": { "type": "string" },
		"contentSchema": { "$dynamicRef": "#meta" }
	};
	content_default = {
		$schema: $schema$5,
		$id: $id$5,
		$vocabulary: $vocabulary$4,
		$dynamicAnchor: $dynamicAnchor$4,
		title: title$5,
		type: type$5,
		properties: properties$5
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json
var core_exports = /* @__PURE__ */ __exportAll({
	$defs: () => $defs$2,
	$dynamicAnchor: () => $dynamicAnchor$3,
	$id: () => $id$4,
	$schema: () => $schema$4,
	$vocabulary: () => $vocabulary$3,
	default: () => core_default,
	properties: () => properties$4,
	title: () => title$4,
	type: () => type$4
});
var $schema$4, $id$4, $vocabulary$3, $dynamicAnchor$3, title$4, type$4, properties$4, $defs$2, core_default;
var init_core = __esmMin((() => {
	$schema$4 = "https://json-schema.org/draft/2020-12/schema";
	$id$4 = "https://json-schema.org/draft/2020-12/meta/core";
	$vocabulary$3 = { "https://json-schema.org/draft/2020-12/vocab/core": true };
	$dynamicAnchor$3 = "meta";
	title$4 = "Core vocabulary meta-schema";
	type$4 = ["object", "boolean"];
	properties$4 = {
		"$id": {
			"$ref": "#/$defs/uriReferenceString",
			"$comment": "Non-empty fragments not allowed.",
			"pattern": "^[^#]*#?$"
		},
		"$schema": { "$ref": "#/$defs/uriString" },
		"$ref": { "$ref": "#/$defs/uriReferenceString" },
		"$anchor": { "$ref": "#/$defs/anchorString" },
		"$dynamicRef": { "$ref": "#/$defs/uriReferenceString" },
		"$dynamicAnchor": { "$ref": "#/$defs/anchorString" },
		"$vocabulary": {
			"type": "object",
			"propertyNames": { "$ref": "#/$defs/uriString" },
			"additionalProperties": { "type": "boolean" }
		},
		"$comment": { "type": "string" },
		"$defs": {
			"type": "object",
			"additionalProperties": { "$dynamicRef": "#meta" }
		}
	};
	$defs$2 = {
		"anchorString": {
			"type": "string",
			"pattern": "^[A-Za-z_][-A-Za-z0-9._]*$"
		},
		"uriString": {
			"type": "string",
			"format": "uri"
		},
		"uriReferenceString": {
			"type": "string",
			"format": "uri-reference"
		}
	};
	core_default = {
		$schema: $schema$4,
		$id: $id$4,
		$vocabulary: $vocabulary$3,
		$dynamicAnchor: $dynamicAnchor$3,
		title: title$4,
		type: type$4,
		properties: properties$4,
		$defs: $defs$2
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json
var format_annotation_exports = /* @__PURE__ */ __exportAll({
	$dynamicAnchor: () => $dynamicAnchor$2,
	$id: () => $id$3,
	$schema: () => $schema$3,
	$vocabulary: () => $vocabulary$2,
	default: () => format_annotation_default,
	properties: () => properties$3,
	title: () => title$3,
	type: () => type$3
});
var $schema$3, $id$3, $vocabulary$2, $dynamicAnchor$2, title$3, type$3, properties$3, format_annotation_default;
var init_format_annotation = __esmMin((() => {
	$schema$3 = "https://json-schema.org/draft/2020-12/schema";
	$id$3 = "https://json-schema.org/draft/2020-12/meta/format-annotation";
	$vocabulary$2 = { "https://json-schema.org/draft/2020-12/vocab/format-annotation": true };
	$dynamicAnchor$2 = "meta";
	title$3 = "Format vocabulary meta-schema for annotation results";
	type$3 = ["object", "boolean"];
	properties$3 = { "format": { "type": "string" } };
	format_annotation_default = {
		$schema: $schema$3,
		$id: $id$3,
		$vocabulary: $vocabulary$2,
		$dynamicAnchor: $dynamicAnchor$2,
		title: title$3,
		type: type$3,
		properties: properties$3
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json
var meta_data_exports = /* @__PURE__ */ __exportAll({
	$dynamicAnchor: () => $dynamicAnchor$1,
	$id: () => $id$2,
	$schema: () => $schema$2,
	$vocabulary: () => $vocabulary$1,
	default: () => meta_data_default,
	properties: () => properties$2,
	title: () => title$2,
	type: () => type$2
});
var $schema$2, $id$2, $vocabulary$1, $dynamicAnchor$1, title$2, type$2, properties$2, meta_data_default;
var init_meta_data = __esmMin((() => {
	$schema$2 = "https://json-schema.org/draft/2020-12/schema";
	$id$2 = "https://json-schema.org/draft/2020-12/meta/meta-data";
	$vocabulary$1 = { "https://json-schema.org/draft/2020-12/vocab/meta-data": true };
	$dynamicAnchor$1 = "meta";
	title$2 = "Meta-data vocabulary meta-schema";
	type$2 = ["object", "boolean"];
	properties$2 = {
		"title": { "type": "string" },
		"description": { "type": "string" },
		"default": true,
		"deprecated": {
			"type": "boolean",
			"default": false
		},
		"readOnly": {
			"type": "boolean",
			"default": false
		},
		"writeOnly": {
			"type": "boolean",
			"default": false
		},
		"examples": {
			"type": "array",
			"items": true
		}
	};
	meta_data_default = {
		$schema: $schema$2,
		$id: $id$2,
		$vocabulary: $vocabulary$1,
		$dynamicAnchor: $dynamicAnchor$1,
		title: title$2,
		type: type$2,
		properties: properties$2
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json
var validation_exports = /* @__PURE__ */ __exportAll({
	$defs: () => $defs$1,
	$dynamicAnchor: () => $dynamicAnchor,
	$id: () => $id$1,
	$schema: () => $schema$1,
	$vocabulary: () => $vocabulary,
	default: () => validation_default,
	properties: () => properties$1,
	title: () => title$1,
	type: () => type$1
});
var $schema$1, $id$1, $vocabulary, $dynamicAnchor, title$1, type$1, properties$1, $defs$1, validation_default;
var init_validation = __esmMin((() => {
	$schema$1 = "https://json-schema.org/draft/2020-12/schema";
	$id$1 = "https://json-schema.org/draft/2020-12/meta/validation";
	$vocabulary = { "https://json-schema.org/draft/2020-12/vocab/validation": true };
	$dynamicAnchor = "meta";
	title$1 = "Validation vocabulary meta-schema";
	type$1 = ["object", "boolean"];
	properties$1 = {
		"type": { "anyOf": [{ "$ref": "#/$defs/simpleTypes" }, {
			"type": "array",
			"items": { "$ref": "#/$defs/simpleTypes" },
			"minItems": 1,
			"uniqueItems": true
		}] },
		"const": true,
		"enum": {
			"type": "array",
			"items": true
		},
		"multipleOf": {
			"type": "number",
			"exclusiveMinimum": 0
		},
		"maximum": { "type": "number" },
		"exclusiveMaximum": { "type": "number" },
		"minimum": { "type": "number" },
		"exclusiveMinimum": { "type": "number" },
		"maxLength": { "$ref": "#/$defs/nonNegativeInteger" },
		"minLength": { "$ref": "#/$defs/nonNegativeIntegerDefault0" },
		"pattern": {
			"type": "string",
			"format": "regex"
		},
		"maxItems": { "$ref": "#/$defs/nonNegativeInteger" },
		"minItems": { "$ref": "#/$defs/nonNegativeIntegerDefault0" },
		"uniqueItems": {
			"type": "boolean",
			"default": false
		},
		"maxContains": { "$ref": "#/$defs/nonNegativeInteger" },
		"minContains": {
			"$ref": "#/$defs/nonNegativeInteger",
			"default": 1
		},
		"maxProperties": { "$ref": "#/$defs/nonNegativeInteger" },
		"minProperties": { "$ref": "#/$defs/nonNegativeIntegerDefault0" },
		"required": { "$ref": "#/$defs/stringArray" },
		"dependentRequired": {
			"type": "object",
			"additionalProperties": { "$ref": "#/$defs/stringArray" }
		}
	};
	$defs$1 = {
		"nonNegativeInteger": {
			"type": "integer",
			"minimum": 0
		},
		"nonNegativeIntegerDefault0": {
			"$ref": "#/$defs/nonNegativeInteger",
			"default": 0
		},
		"simpleTypes": { "enum": [
			"array",
			"boolean",
			"integer",
			"null",
			"number",
			"object",
			"string"
		] },
		"stringArray": {
			"type": "array",
			"items": { "type": "string" },
			"uniqueItems": true,
			"default": []
		}
	};
	validation_default = {
		$schema: $schema$1,
		$id: $id$1,
		$vocabulary,
		$dynamicAnchor,
		title: title$1,
		type: type$1,
		properties: properties$1,
		$defs: $defs$1
	};
}));
// node_modules/ajv/dist/refs/json-schema-2020-12/index.js
var require_json_schema_2020_12 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var metaSchema = (init_schema(), __toCommonJS(schema_exports).default);
	var applicator = (init_applicator(), __toCommonJS(applicator_exports).default);
	var unevaluated = (init_unevaluated(), __toCommonJS(unevaluated_exports).default);
	var content = (init_content(), __toCommonJS(content_exports).default);
	var core = (init_core(), __toCommonJS(core_exports).default);
	var format = (init_format_annotation(), __toCommonJS(format_annotation_exports).default);
	var metadata = (init_meta_data(), __toCommonJS(meta_data_exports).default);
	var validation = (init_validation(), __toCommonJS(validation_exports).default);
	var META_SUPPORT_DATA = ["/properties"];
	function addMetaSchema2020($data) {
		[
			metaSchema,
			applicator,
			unevaluated,
			content,
			core,
			with$data(this, format),
			metadata,
			with$data(this, validation)
		].forEach((sch) => this.addMetaSchema(sch, void 0, false));
		return this;
		function with$data(ajv, sch) {
			return $data ? ajv.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
		}
	}
	exports.default = addMetaSchema2020;
}));
// schema/plan.schema.json
var import__2020 = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv2020 = void 0;
	var core_1 = require_core$1();
	var draft2020_1 = require_draft2020();
	var discriminator_1 = require_discriminator();
	var json_schema_2020_12_1 = require_json_schema_2020_12();
	var META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
	var Ajv2020 = class extends core_1.default {
		constructor(opts = {}) {
			super({
				...opts,
				dynamicRef: true,
				next: true,
				unevaluated: true
			});
		}
		_addVocabularies() {
			super._addVocabularies();
			draft2020_1.default.forEach((v) => this.addVocabulary(v));
			if (this.opts.discriminator) this.addKeyword(discriminator_1.default);
		}
		_addDefaultMetaSchema() {
			super._addDefaultMetaSchema();
			const { $data, meta } = this.opts;
			if (!meta) return;
			json_schema_2020_12_1.default.call(this, $data);
			this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
		}
		defaultMeta() {
			return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
		}
	};
	exports.Ajv2020 = Ajv2020;
	module.exports = exports = Ajv2020;
	module.exports.Ajv2020 = Ajv2020;
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Ajv2020;
	var validate_1 = require_validate();
	Object.defineProperty(exports, "KeywordCxt", {
		enumerable: true,
		get: function() {
			return validate_1.KeywordCxt;
		}
	});
	var codegen_1 = require_codegen();
	Object.defineProperty(exports, "_", {
		enumerable: true,
		get: function() {
			return codegen_1._;
		}
	});
	Object.defineProperty(exports, "str", {
		enumerable: true,
		get: function() {
			return codegen_1.str;
		}
	});
	Object.defineProperty(exports, "stringify", {
		enumerable: true,
		get: function() {
			return codegen_1.stringify;
		}
	});
	Object.defineProperty(exports, "nil", {
		enumerable: true,
		get: function() {
			return codegen_1.nil;
		}
	});
	Object.defineProperty(exports, "Name", {
		enumerable: true,
		get: function() {
			return codegen_1.Name;
		}
	});
	Object.defineProperty(exports, "CodeGen", {
		enumerable: true,
		get: function() {
			return codegen_1.CodeGen;
		}
	});
	var validation_error_1 = require_validation_error();
	Object.defineProperty(exports, "ValidationError", {
		enumerable: true,
		get: function() {
			return validation_error_1.default;
		}
	});
	var ref_error_1 = require_ref_error();
	Object.defineProperty(exports, "MissingRefError", {
		enumerable: true,
		get: function() {
			return ref_error_1.default;
		}
	});
})))(), 1);
var plan_schema_default = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	$id: "urn:floorplan-structure:v3",
	title: "户型结构方案 v3（全部长度 mm）",
	description: "所有长度含高度均为 mm；像素坐标为 px、角度为度、面积为 m²、panes.width 为比例。legacy 是不透明旧格式快照，不参与 v3 换算。",
	type: "object",
	properties: {
		"decor": { "$ref": "#/$defs/Decor" },
		"format": { "const": "floorplan-structure" },
		"version": { "const": 3 },
		"title": { "type": "string" },
		"ceiling": {
			"type": "number",
			"exclusiveMinimum": 0
		},
		"north": { "type": "number" },
		"levels": {
			"type": "array",
			"items": { "$ref": "#/$defs/Level" },
			"minItems": 1
		},
		"columns": {
			"type": "array",
			"items": { "$ref": "#/$defs/Column" }
		},
		"shafts": {
			"type": "array",
			"items": { "$ref": "#/$defs/Shaft" }
		},
		"stairs": {
			"type": "array",
			"items": { "$ref": "#/$defs/Stair" }
		},
		"voids": {
			"type": "array",
			"items": { "$ref": "#/$defs/Void" }
		},
		"levelUnderlays": {
			"type": "object",
			"additionalProperties": { "$ref": "#/$defs/Underlay" }
		},
		"walls": {
			"type": "array",
			"items": { "$ref": "#/$defs/Wall" }
		},
		"openings": {
			"type": "array",
			"items": { "$ref": "#/$defs/Opening" }
		},
		"beams": {
			"type": "array",
			"items": { "$ref": "#/$defs/Beam" }
		},
		"rooms": {
			"type": "array",
			"items": { "$ref": "#/$defs/Room" }
		},
		"underlay": { "$ref": "#/$defs/Underlay" },
		"questions": {
			"type": "array",
			"items": { "$ref": "#/$defs/Question" }
		},
		"changes": {
			"type": "array",
			"items": { "$ref": "#/$defs/Change" }
		},
		"legacy": {
			"type": "object",
			"additionalProperties": true
		},
		"meta": {
			"type": "object",
			"properties": {
				"planFile": { "type": "string" },
				"source": { "type": "string" },
				"createdAt": { "type": "string" },
				"updatedAt": { "type": "string" }
			},
			"required": [],
			"additionalProperties": false
		}
	},
	required: [
		"format",
		"version",
		"title",
		"ceiling",
		"walls",
		"openings",
		"beams",
		"rooms",
		"questions",
		"changes"
	],
	additionalProperties: false,
	$defs: /* @__PURE__ */ JSON.parse("{\"Vec2\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"Box\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"},{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":4,\"maxItems\":4},\"Certainty\":{\"type\":\"string\",\"enum\":[\"seen\",\"inferred\",\"unknown\"]},\"WallKind\":{\"type\":\"string\",\"enum\":[\"exterior\",\"bearing\",\"partition\",\"glass\",\"half\",\"half-glass\"]},\"OpeningKind\":{\"type\":\"string\",\"enum\":[\"door\",\"sliding\",\"doorway\",\"window\",\"floor-window\",\"bay-window\",\"open-balcony\"]},\"PaneKind\":{\"type\":\"string\",\"enum\":[\"fixed\",\"casement\",\"sliding\"]},\"Evidence\":{\"type\":\"object\",\"properties\":{\"certainty\":{\"$ref\":\"#/$defs/Certainty\"},\"basis\":{\"type\":\"string\"},\"pixelBox\":{\"$ref\":\"#/$defs/Box\"},\"confirmed\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\",\"minLength\":1},\"at\":{\"type\":\"string\"},\"note\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false}},\"required\":[\"certainty\"],\"additionalProperties\":false},\"Wall\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"a\":{\"$ref\":\"#/$defs/Vec2\"},\"b\":{\"$ref\":\"#/$defs/Vec2\"},\"thickness\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"kind\":{\"$ref\":\"#/$defs/WallKind\"},\"height\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm\"},\"lowHeight\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm\"},\"bulge\":{\"type\":\"number\"},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"a\",\"b\",\"thickness\",\"kind\"],\"additionalProperties\":false},\"Opening\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"wall\":{\"type\":\"string\",\"minLength\":1},\"offset\":{\"type\":\"number\",\"minimum\":0},\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"kind\":{\"$ref\":\"#/$defs/OpeningKind\"},\"sill\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm\"},\"head\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm\"},\"swing\":{\"type\":\"object\",\"properties\":{\"hinge\":{\"type\":\"string\",\"enum\":[\"start\",\"end\"]},\"side\":{\"enum\":[1,-1]}},\"required\":[\"hinge\",\"side\"],\"additionalProperties\":false},\"panes\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"kind\":{\"$ref\":\"#/$defs/PaneKind\"}},\"required\":[\"width\",\"kind\"],\"additionalProperties\":false},\"minItems\":1},\"entry\":{\"type\":\"boolean\"},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"wall\",\"offset\",\"width\",\"kind\",\"sill\",\"head\"],\"additionalProperties\":false},\"Beam\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"a\":{\"$ref\":\"#/$defs/Vec2\"},\"b\":{\"$ref\":\"#/$defs/Vec2\"},\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"bottom\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm\"},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"a\",\"b\",\"width\",\"bottom\"],\"additionalProperties\":false},\"Room\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"poly\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":3},\"ceiling\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm\"},\"floorOffset\":{\"type\":\"number\",\"description\":\"长度单位 mm\"},\"use\":{\"type\":\"string\"},\"counted\":{\"type\":\"boolean\"}},\"required\":[\"id\",\"name\",\"poly\"],\"additionalProperties\":false},\"Level\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"elevation\":{\"type\":\"number\",\"description\":\"长度单位 mm\"},\"ceiling\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm\"}},\"required\":[\"id\",\"name\",\"elevation\"],\"additionalProperties\":false},\"Column\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"center\":{\"$ref\":\"#/$defs/Vec2\"},\"shape\":{\"type\":\"string\",\"enum\":[\"rect\",\"round\"]},\"size\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\",\"exclusiveMinimum\":0},{\"type\":\"number\",\"exclusiveMinimum\":0}],\"minItems\":2,\"maxItems\":2},\"rotation\":{\"type\":\"number\"},\"kind\":{\"type\":\"string\",\"enum\":[\"bearing\",\"decorative\"]},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"center\",\"shape\",\"size\",\"kind\"],\"additionalProperties\":false},\"Shaft\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"poly\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":3},\"kind\":{\"type\":\"string\",\"enum\":[\"flue\",\"pipe\",\"vent\",\"other\"]},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"poly\",\"kind\"],\"additionalProperties\":false},\"Stair\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"to\":{\"type\":\"string\",\"minLength\":1},\"poly\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":3},\"path\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":2},\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"kind\":{\"type\":\"string\",\"enum\":[\"straight\",\"L\",\"U\",\"spiral\"]},\"steps\":{\"type\":\"integer\",\"minimum\":1},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"level\",\"to\",\"poly\",\"path\",\"width\",\"kind\"],\"additionalProperties\":false},\"Void\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"level\":{\"type\":\"string\",\"minLength\":1},\"poly\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":3},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"level\",\"poly\"],\"additionalProperties\":false},\"Underlay\":{\"type\":\"object\",\"properties\":{\"src\":{\"type\":\"string\",\"minLength\":1,\"pattern\":\"^(?:(?![A-Za-z][A-Za-z0-9+.-]*:|[/\\\\\\\\]{2}).+|data:image/(?:png|jpe?g|webp|gif|bmp|avif);base64,.+|data:image/svg\\\\+xml(?:;charset=utf-8)?(?:;base64)?,.+)$\"},\"mmPerPx\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"mmPerPxY\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"origin\":{\"$ref\":\"#/$defs/Vec2\"},\"rotation\":{\"type\":\"number\"},\"flipX\":{\"type\":\"boolean\"},\"flipY\":{\"type\":\"boolean\"},\"opacity\":{\"type\":\"number\",\"minimum\":0,\"maximum\":100},\"visible\":{\"type\":\"boolean\"},\"calibrations\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"p1\":{\"$ref\":\"#/$defs/Vec2\"},\"p2\":{\"$ref\":\"#/$defs/Vec2\"},\"length\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"note\":{\"type\":\"string\"}},\"required\":[\"p1\",\"p2\",\"length\"],\"additionalProperties\":false}}},\"required\":[\"src\",\"mmPerPx\",\"origin\",\"opacity\",\"visible\"],\"additionalProperties\":false},\"QuestionStatus\":{\"type\":\"string\",\"enum\":[\"open\",\"answered\",\"resolved\"]},\"QuestionOutcome\":{\"type\":\"string\",\"enum\":[\"changed\",\"confirmed\",\"inferred\",\"noted\",\"ask\",\"withdrawn\"]},\"QuestionReply\":{\"type\":\"object\",\"properties\":{\"outcome\":{\"$ref\":\"#/$defs/QuestionOutcome\"},\"text\":{\"type\":\"string\"},\"changed\":{\"type\":\"array\",\"items\":{\"type\":\"string\",\"minLength\":1}},\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"}},\"required\":[\"outcome\",\"text\",\"by\",\"at\"],\"additionalProperties\":false},\"QuestionLogEntry\":{\"type\":\"object\",\"properties\":{\"role\":{\"type\":\"string\",\"enum\":[\"user\",\"agent\"]},\"text\":{\"type\":\"string\"},\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"},\"outcome\":{\"$ref\":\"#/$defs/QuestionOutcome\"},\"changed\":{\"type\":\"array\",\"items\":{\"type\":\"string\",\"minLength\":1}}},\"required\":[\"role\",\"text\"],\"additionalProperties\":false},\"Question\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"level\":{\"type\":\"string\",\"minLength\":1},\"text\":{\"type\":\"string\"},\"category\":{\"type\":\"string\",\"enum\":[\"original\",\"renovation\"]},\"certainty\":{\"$ref\":\"#/$defs/Certainty\"},\"bbox\":{\"$ref\":\"#/$defs/Box\"},\"targets\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"options\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"answer\":{\"type\":\"string\"},\"answeredBy\":{\"type\":\"string\"},\"answeredAt\":{\"type\":\"string\"},\"status\":{\"$ref\":\"#/$defs/QuestionStatus\"},\"reply\":{\"$ref\":\"#/$defs/QuestionReply\"},\"log\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/QuestionLogEntry\"}}},\"required\":[\"id\",\"text\",\"category\"],\"additionalProperties\":false},\"Change\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"op\":{\"type\":\"string\",\"enum\":[\"add\",\"remove\",\"update\"]},\"type\":{\"type\":\"string\",\"enum\":[\"wall\",\"opening\",\"beam\",\"room\",\"column\",\"shaft\",\"stair\",\"void\"]},\"target\":{\"type\":\"string\",\"minLength\":1},\"data\":{\"type\":\"object\"},\"range\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\",\"minimum\":0},{\"type\":\"number\",\"minimum\":0}],\"minItems\":2,\"maxItems\":2},\"note\":{\"type\":\"string\"},\"group\":{\"type\":\"string\"},\"by\":{\"type\":\"string\",\"enum\":[\"user\",\"agent\"]},\"status\":{\"type\":\"string\",\"enum\":[\"pending\",\"confirmed\"]},\"confirm\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\",\"minLength\":1},\"at\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false},\"at\":{\"type\":\"string\"}},\"required\":[\"id\",\"op\",\"type\",\"by\",\"status\"],\"additionalProperties\":false,\"allOf\":[{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"}}},\"then\":{\"required\":[\"data\"]},\"else\":{\"required\":[\"target\"]}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"}}},\"then\":{\"required\":[\"data\"]}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"},\"type\":{\"const\":\"wall\"}}},\"then\":{\"properties\":{\"data\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"a\":{\"$ref\":\"#/$defs/Vec2\"},\"b\":{\"$ref\":\"#/$defs/Vec2\"},\"thickness\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"kind\":{\"$ref\":\"#/$defs/WallKind\"},\"height\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm\"},\"lowHeight\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm\"},\"bulge\":{\"type\":\"number\"},\"name\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"},\"type\":{\"const\":\"opening\"}}},\"then\":{\"properties\":{\"data\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"wall\":{\"type\":\"string\",\"minLength\":1},\"offset\":{\"type\":\"number\",\"minimum\":0},\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"kind\":{\"$ref\":\"#/$defs/OpeningKind\"},\"sill\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm\"},\"head\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm\"},\"swing\":{\"type\":\"object\",\"properties\":{\"hinge\":{\"type\":\"string\",\"enum\":[\"start\",\"end\"]},\"side\":{\"enum\":[1,-1]}},\"required\":[\"hinge\",\"side\"],\"additionalProperties\":false},\"panes\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"kind\":{\"$ref\":\"#/$defs/PaneKind\"}},\"required\":[\"width\",\"kind\"],\"additionalProperties\":false},\"minItems\":1},\"entry\":{\"type\":\"boolean\"},\"name\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"},\"type\":{\"const\":\"beam\"}}},\"then\":{\"properties\":{\"data\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"a\":{\"$ref\":\"#/$defs/Vec2\"},\"b\":{\"$ref\":\"#/$defs/Vec2\"},\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"bottom\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm\"},\"name\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"},\"type\":{\"const\":\"room\"}}},\"then\":{\"properties\":{\"data\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"poly\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":3},\"ceiling\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm\"},\"floorOffset\":{\"type\":\"number\",\"description\":\"长度单位 mm\"},\"use\":{\"type\":\"string\"},\"counted\":{\"type\":\"boolean\"}},\"required\":[],\"additionalProperties\":false}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"},\"type\":{\"const\":\"column\"}}},\"then\":{\"properties\":{\"data\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"center\":{\"$ref\":\"#/$defs/Vec2\"},\"shape\":{\"type\":\"string\",\"enum\":[\"rect\",\"round\"]},\"size\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\",\"exclusiveMinimum\":0},{\"type\":\"number\",\"exclusiveMinimum\":0}],\"minItems\":2,\"maxItems\":2},\"rotation\":{\"type\":\"number\"},\"kind\":{\"type\":\"string\",\"enum\":[\"bearing\",\"decorative\"]},\"name\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"},\"type\":{\"const\":\"shaft\"}}},\"then\":{\"properties\":{\"data\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"poly\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":3},\"kind\":{\"type\":\"string\",\"enum\":[\"flue\",\"pipe\",\"vent\",\"other\"]},\"name\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"},\"type\":{\"const\":\"stair\"}}},\"then\":{\"properties\":{\"data\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"evidence\":{\"$ref\":\"#/$defs/Evidence\"},\"level\":{\"type\":\"string\",\"minLength\":1},\"to\":{\"type\":\"string\",\"minLength\":1},\"poly\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":3},\"path\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":2},\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0},\"kind\":{\"type\":\"string\",\"enum\":[\"straight\",\"L\",\"U\",\"spiral\"]},\"steps\":{\"type\":\"integer\",\"minimum\":1},\"name\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"update\"},\"type\":{\"const\":\"void\"}}},\"then\":{\"properties\":{\"data\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"level\":{\"type\":\"string\",\"minLength\":1},\"poly\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Vec2\"},\"minItems\":3},\"name\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"},\"type\":{\"const\":\"wall\"}}},\"then\":{\"properties\":{\"data\":{\"$ref\":\"#/$defs/Wall\"}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"},\"type\":{\"const\":\"opening\"}}},\"then\":{\"properties\":{\"data\":{\"$ref\":\"#/$defs/Opening\"}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"},\"type\":{\"const\":\"beam\"}}},\"then\":{\"properties\":{\"data\":{\"$ref\":\"#/$defs/Beam\"}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"},\"type\":{\"const\":\"room\"}}},\"then\":{\"properties\":{\"data\":{\"$ref\":\"#/$defs/Room\"}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"},\"type\":{\"const\":\"column\"}}},\"then\":{\"properties\":{\"data\":{\"$ref\":\"#/$defs/Column\"}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"},\"type\":{\"const\":\"shaft\"}}},\"then\":{\"properties\":{\"data\":{\"$ref\":\"#/$defs/Shaft\"}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"},\"type\":{\"const\":\"stair\"}}},\"then\":{\"properties\":{\"data\":{\"$ref\":\"#/$defs/Stair\"}}}},{\"if\":{\"properties\":{\"op\":{\"const\":\"add\"},\"type\":{\"const\":\"void\"}}},\"then\":{\"properties\":{\"data\":{\"$ref\":\"#/$defs/Void\"}}}}]},\"DecorLayer\":{\"type\":\"object\",\"properties\":{\"version\":{\"const\":1},\"style\":{\"type\":\"string\"},\"materials\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Material\"}},\"presets\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/StylePreset\"}},\"surfaces\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Surface\"}},\"furniture\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Furniture\"}},\"cabinets\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Cabinet\"}},\"panels\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Panel\"}},\"recesses\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/Recess\"}},\"cache\":{\"type\":\"object\",\"additionalProperties\":{\"type\":\"object\",\"properties\":{\"level\":{\"type\":\"string\"},\"box\":{\"$ref\":\"#/$defs/Box\"},\"anchor\":{\"type\":\"object\",\"properties\":{\"wall\":{\"type\":\"string\"},\"a\":{\"$ref\":\"#/$defs/Vec2\"},\"b\":{\"$ref\":\"#/$defs/Vec2\"}},\"required\":[\"wall\",\"a\",\"b\"],\"additionalProperties\":false},\"pose\":{\"type\":\"object\",\"properties\":{\"at\":{\"$ref\":\"#/$defs/Vec2\"},\"rot\":{\"type\":\"number\"},\"z\":{\"type\":\"number\"}},\"required\":[\"at\",\"rot\",\"z\"],\"additionalProperties\":false},\"face\":{\"type\":\"array\",\"prefixItems\":[{\"$ref\":\"#/$defs/Vec2\"},{\"$ref\":\"#/$defs/Vec2\"}],\"minItems\":2,\"maxItems\":2}},\"required\":[\"box\"],\"additionalProperties\":false}}},\"required\":[\"version\",\"style\",\"materials\",\"surfaces\",\"furniture\",\"cabinets\",\"panels\",\"recesses\"],\"additionalProperties\":false},\"DecorBase\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"level\":{\"type\":\"string\"},\"by\":{\"anyOf\":[{\"const\":\"user\"},{\"const\":\"agent\"}]},\"status\":{\"anyOf\":[{\"const\":\"pending\"},{\"const\":\"confirmed\"}]},\"note\":{\"type\":\"string\"},\"ack\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false}},\"required\":[\"id\",\"by\",\"status\"],\"additionalProperties\":false},\"FaceRef\":{\"type\":\"object\",\"properties\":{\"wall\":{\"type\":\"string\"},\"side\":{\"anyOf\":[{\"const\":1},{\"const\":-1}]}},\"required\":[\"wall\",\"side\"],\"additionalProperties\":false},\"FaceSpan\":{\"type\":\"object\",\"properties\":{\"face\":{\"$ref\":\"#/$defs/FaceRef\"},\"s\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"z\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2,\"description\":\"长度单位 mm（文件 v3）\"}},\"required\":[\"face\",\"s\",\"z\"],\"additionalProperties\":false},\"Recess\":{\"type\":\"object\",\"properties\":{\"kind\":{\"anyOf\":[{\"const\":\"niche\"},{\"const\":\"hole\"}]},\"host\":{\"anyOf\":[{\"type\":\"object\",\"properties\":{\"face\":{\"$ref\":\"#/$defs/FaceRef\"}},\"required\":[\"face\"],\"additionalProperties\":false},{\"type\":\"object\",\"properties\":{\"panel\":{\"type\":\"string\"}},\"required\":[\"panel\"],\"additionalProperties\":false},{\"type\":\"object\",\"properties\":{\"cabinet\":{\"type\":\"string\"}},\"required\":[\"cabinet\"],\"additionalProperties\":false}]},\"rect\":{\"type\":\"object\",\"properties\":{\"s\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"u\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"z\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2}},\"required\":[\"z\"],\"additionalProperties\":false},\"depth\":{\"anyOf\":[{\"type\":\"number\"},{\"const\":\"through\"}]},\"back\":{\"type\":\"string\"},\"shelves\":{\"type\":\"array\",\"items\":{\"type\":\"number\"}},\"trim\":{\"type\":\"string\"},\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"level\":{\"type\":\"string\"},\"by\":{\"anyOf\":[{\"const\":\"user\"},{\"const\":\"agent\"}]},\"status\":{\"anyOf\":[{\"const\":\"pending\"},{\"const\":\"confirmed\"}]},\"note\":{\"type\":\"string\"},\"ack\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false}},\"required\":[\"kind\",\"host\",\"rect\",\"depth\",\"id\",\"by\",\"status\"],\"additionalProperties\":false},\"Cabinet\":{\"type\":\"object\",\"properties\":{\"family\":{\"anyOf\":[{\"const\":\"tall\"},{\"const\":\"base\"},{\"const\":\"wall\"}]},\"place\":{\"anyOf\":[{\"type\":\"object\",\"properties\":{\"face\":{\"$ref\":\"#/$defs/FaceRef\"},\"s\":{\"type\":\"number\"},\"gap\":{\"type\":\"number\"}},\"required\":[\"face\",\"s\"],\"additionalProperties\":false},{\"type\":\"object\",\"properties\":{\"at\":{\"$ref\":\"#/$defs/Vec2\"},\"rot\":{\"type\":\"number\"}},\"required\":[\"at\",\"rot\"],\"additionalProperties\":false}]},\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"depth\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"z\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2,\"description\":\"长度单位 mm（文件 v3）\"},\"plinth\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"embed\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"top\":{\"type\":\"object\",\"properties\":{\"material\":{\"type\":\"string\"},\"thickness\":{\"type\":\"number\"},\"overhang\":{\"type\":\"number\"}},\"required\":[\"material\",\"thickness\"],\"additionalProperties\":false},\"columns\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/CabinetColumn\"}},\"cuts\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"u\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"z\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"depth\":{\"anyOf\":[{\"const\":\"through\"},{\"type\":\"number\"}]}},\"required\":[\"u\",\"z\",\"depth\"],\"additionalProperties\":false}},\"materials\":{\"type\":\"object\",\"properties\":{\"carcass\":{\"type\":\"string\"},\"front\":{\"type\":\"string\"}},\"required\":[\"carcass\",\"front\"],\"additionalProperties\":false},\"handle\":{\"anyOf\":[{\"const\":\"none\"},{\"const\":\"bar\"},{\"const\":\"knob\"},{\"const\":\"edge\"}]},\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"level\":{\"type\":\"string\"},\"by\":{\"anyOf\":[{\"const\":\"user\"},{\"const\":\"agent\"}]},\"status\":{\"anyOf\":[{\"const\":\"pending\"},{\"const\":\"confirmed\"}]},\"note\":{\"type\":\"string\"},\"ack\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false}},\"required\":[\"family\",\"place\",\"width\",\"depth\",\"z\",\"columns\",\"materials\",\"id\",\"by\",\"status\"],\"additionalProperties\":false},\"CabinetColumn\":{\"type\":\"object\",\"properties\":{\"width\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"cells\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/CabinetCell\"}}},\"required\":[\"cells\"],\"additionalProperties\":false},\"ApplianceType\":{\"anyOf\":[{\"const\":\"fridge\"},{\"const\":\"washer\"},{\"const\":\"dryer\"},{\"const\":\"oven\"},{\"const\":\"steamer\"},{\"const\":\"dishwasher\"},{\"const\":\"microwave\"},{\"const\":\"tv\"},{\"const\":\"other\"}]},\"CabinetCell\":{\"type\":\"object\",\"properties\":{\"h\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"type\":{\"anyOf\":[{\"const\":\"door\"},{\"const\":\"doors\"},{\"const\":\"drawers\"},{\"const\":\"flap\"},{\"const\":\"open\"},{\"const\":\"void\"},{\"const\":\"appliance\"}]},\"hinge\":{\"anyOf\":[{\"const\":\"left\"},{\"const\":\"right\"}]},\"count\":{\"type\":\"integer\",\"minimum\":0,\"maximum\":1000},\"void\":{\"type\":\"object\",\"properties\":{\"depth\":{\"anyOf\":[{\"const\":\"through\"},{\"type\":\"number\"}]},\"top\":{\"type\":\"object\",\"properties\":{\"z\":{\"type\":\"number\"},\"overhang\":{\"type\":\"number\"},\"material\":{\"type\":\"string\"}},\"required\":[\"z\"],\"additionalProperties\":false}},\"required\":[\"depth\"],\"additionalProperties\":false},\"appliance\":{\"type\":\"object\",\"properties\":{\"type\":{\"$ref\":\"#/$defs/ApplianceType\"},\"size\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":3,\"maxItems\":3}},\"required\":[\"type\"],\"additionalProperties\":false},\"material\":{\"type\":\"string\"}},\"required\":[\"type\"],\"additionalProperties\":false},\"Panel\":{\"type\":\"object\",\"properties\":{\"type\":{\"anyOf\":[{\"const\":\"feature\"},{\"const\":\"wainscot\"},{\"const\":\"slats\"},{\"const\":\"skirting\"},{\"const\":\"arch\"}]},\"span\":{\"$ref\":\"#/$defs/FaceSpan\"},\"opening\":{\"type\":\"string\"},\"thickness\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"material\":{\"type\":\"string\"},\"grooves\":{\"type\":\"object\",\"properties\":{\"dir\":{\"anyOf\":[{\"const\":\"v\"},{\"const\":\"h\"}]},\"spacing\":{\"type\":\"number\"},\"width\":{\"type\":\"number\"}},\"required\":[\"dir\",\"spacing\"],\"additionalProperties\":false},\"frame\":{\"type\":\"object\",\"properties\":{\"style\":{\"anyOf\":[{\"const\":\"flat\"},{\"const\":\"raised\"}]},\"margin\":{\"type\":\"number\"}},\"required\":[\"style\",\"margin\"],\"additionalProperties\":false},\"slats\":{\"type\":\"object\",\"properties\":{\"width\":{\"type\":\"number\"},\"gap\":{\"type\":\"number\"},\"depth\":{\"type\":\"number\"}},\"required\":[\"width\",\"gap\",\"depth\"],\"additionalProperties\":false},\"arch\":{\"type\":\"object\",\"properties\":{\"radius\":{\"type\":\"number\"}},\"required\":[],\"additionalProperties\":false},\"avoid\":{\"anyOf\":[{\"const\":\"openings\"},{\"const\":\"none\"}]},\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"level\":{\"type\":\"string\"},\"by\":{\"anyOf\":[{\"const\":\"user\"},{\"const\":\"agent\"}]},\"status\":{\"anyOf\":[{\"const\":\"pending\"},{\"const\":\"confirmed\"}]},\"note\":{\"type\":\"string\"},\"ack\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false}},\"required\":[\"type\",\"thickness\",\"material\",\"id\",\"by\",\"status\"],\"additionalProperties\":false},\"Furniture\":{\"oneOf\":[{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\"},\"size\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"height\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"z\":{\"type\":\"number\",\"description\":\"长度单位 mm（文件 v3）\"},\"against\":{\"type\":\"object\",\"properties\":{\"face\":{\"$ref\":\"#/$defs/FaceRef\"},\"gap\":{\"type\":\"number\"}},\"required\":[\"face\",\"gap\"],\"additionalProperties\":false},\"embed\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"materials\":{\"type\":\"object\",\"properties\":{\"body\":{\"type\":\"string\"},\"fabric\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false},\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"level\":{\"type\":\"string\"},\"by\":{\"anyOf\":[{\"const\":\"user\"},{\"const\":\"agent\"}]},\"status\":{\"anyOf\":[{\"const\":\"pending\"},{\"const\":\"confirmed\"}]},\"note\":{\"type\":\"string\"},\"ack\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false},\"at\":{\"$ref\":\"#/$defs/Vec2\"},\"rot\":{\"type\":\"number\"},\"in\":false},\"required\":[\"type\",\"size\",\"height\",\"id\",\"by\",\"status\",\"at\",\"rot\"],\"additionalProperties\":false},{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\"},\"size\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"height\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"z\":{\"type\":\"number\",\"description\":\"长度单位 mm（文件 v3）\"},\"against\":{\"type\":\"object\",\"properties\":{\"face\":{\"$ref\":\"#/$defs/FaceRef\"},\"gap\":{\"type\":\"number\"}},\"required\":[\"face\",\"gap\"],\"additionalProperties\":false},\"embed\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"materials\":{\"type\":\"object\",\"properties\":{\"body\":{\"type\":\"string\"},\"fabric\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false},\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"level\":{\"type\":\"string\"},\"by\":{\"anyOf\":[{\"const\":\"user\"},{\"const\":\"agent\"}]},\"status\":{\"anyOf\":[{\"const\":\"pending\"},{\"const\":\"confirmed\"}]},\"note\":{\"type\":\"string\"},\"ack\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false},\"in\":{\"type\":\"string\"},\"at\":false,\"rot\":{\"type\":\"number\"}},\"required\":[\"type\",\"size\",\"height\",\"id\",\"by\",\"status\",\"in\"],\"additionalProperties\":false}]},\"FurnitureBase\":{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\"},\"size\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"height\":{\"type\":\"number\",\"exclusiveMinimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"z\":{\"type\":\"number\",\"description\":\"长度单位 mm（文件 v3）\"},\"against\":{\"type\":\"object\",\"properties\":{\"face\":{\"$ref\":\"#/$defs/FaceRef\"},\"gap\":{\"type\":\"number\"}},\"required\":[\"face\",\"gap\"],\"additionalProperties\":false},\"embed\":{\"type\":\"number\",\"minimum\":0,\"description\":\"长度单位 mm（文件 v3）\"},\"materials\":{\"type\":\"object\",\"properties\":{\"body\":{\"type\":\"string\"},\"fabric\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false},\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"level\":{\"type\":\"string\"},\"by\":{\"anyOf\":[{\"const\":\"user\"},{\"const\":\"agent\"}]},\"status\":{\"anyOf\":[{\"const\":\"pending\"},{\"const\":\"confirmed\"}]},\"note\":{\"type\":\"string\"},\"ack\":{\"type\":\"object\",\"properties\":{\"by\":{\"type\":\"string\"},\"at\":{\"type\":\"string\"}},\"required\":[\"by\"],\"additionalProperties\":false}},\"required\":[\"type\",\"size\",\"height\",\"id\",\"by\",\"status\"],\"additionalProperties\":false},\"MaterialCategory\":{\"anyOf\":[{\"const\":\"wood-floor\"},{\"const\":\"tile\"},{\"const\":\"stone\"},{\"const\":\"paint\"},{\"const\":\"texture-paint\"},{\"const\":\"wallpaper\"},{\"const\":\"veneer\"},{\"const\":\"microcement\"},{\"const\":\"laminate\"},{\"const\":\"fabric\"},{\"const\":\"leather\"},{\"const\":\"metal\"},{\"const\":\"glass\"},{\"const\":\"rattan\"},{\"const\":\"other\"}]},\"Material\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"category\":{\"$ref\":\"#/$defs/MaterialCategory\"},\"color\":{\"type\":\"string\",\"pattern\":\"^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$\"},\"texture\":{\"type\":\"object\",\"properties\":{\"kind\":{\"anyOf\":[{\"const\":\"planks\"},{\"const\":\"tiles\"},{\"const\":\"herringbone\"},{\"const\":\"grain\"},{\"const\":\"speckle\"},{\"const\":\"veins\"},{\"const\":\"weave\"}]},\"size\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"joint\":{\"type\":\"number\"}},\"required\":[\"kind\"],\"additionalProperties\":false},\"pbr\":{\"type\":\"object\",\"properties\":{\"roughness\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1},\"metalness\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1},\"sheen\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1},\"maps\":{\"type\":\"object\",\"properties\":{\"base\":{\"type\":\"string\",\"minLength\":1,\"pattern\":\"^(?![A-Za-z][A-Za-z0-9+.-]*:|[/\\\\\\\\]|\\\\s)[^\\\\r\\\\n]+$\"},\"normal\":{\"type\":\"string\",\"minLength\":1,\"pattern\":\"^(?![A-Za-z][A-Za-z0-9+.-]*:|[/\\\\\\\\]|\\\\s)[^\\\\r\\\\n]+$\"},\"rough\":{\"type\":\"string\",\"minLength\":1,\"pattern\":\"^(?![A-Za-z][A-Za-z0-9+.-]*:|[/\\\\\\\\]|\\\\s)[^\\\\r\\\\n]+$\"}},\"required\":[],\"additionalProperties\":false}},\"required\":[],\"additionalProperties\":false},\"ref\":{\"type\":\"string\"}},\"required\":[\"id\",\"name\",\"category\",\"color\"],\"additionalProperties\":false},\"MaterialRole\":{\"anyOf\":[{\"const\":\"floor.main\"},{\"const\":\"floor.wet\"},{\"const\":\"floor.outdoor\"},{\"const\":\"threshold\"},{\"const\":\"wall.main\"},{\"const\":\"wall.wet\"},{\"const\":\"wall.accent\"},{\"const\":\"ceiling\"},{\"const\":\"skirting\"},{\"const\":\"wood.main\"},{\"const\":\"cabinet.front\"},{\"const\":\"cabinet.carcass\"},{\"const\":\"stone.top\"},{\"const\":\"metal\"},{\"const\":\"fabric.main\"},{\"const\":\"fabric.accent\"},{\"const\":\"rug\"}]},\"StylePreset\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"name\":{\"type\":\"string\"},\"blurb\":{\"type\":\"string\"},\"roles\":{\"type\":\"object\",\"additionalProperties\":{\"type\":\"string\"}},\"rooms\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"match\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"floor\":{\"$ref\":\"#/$defs/MaterialRole\"},\"wall\":{\"$ref\":\"#/$defs/MaterialRole\"}},\"required\":[\"match\"],\"additionalProperties\":false}},\"trims\":{\"type\":\"object\",\"properties\":{\"skirting\":{\"type\":\"object\",\"properties\":{\"height\":{\"type\":\"number\"},\"role\":{\"$ref\":\"#/$defs/MaterialRole\"}},\"required\":[\"height\",\"role\"],\"additionalProperties\":false},\"threshold\":{\"type\":\"boolean\"}},\"required\":[],\"additionalProperties\":false},\"board\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"by\":{\"anyOf\":[{\"const\":\"builtin\"},{\"const\":\"user\"},{\"const\":\"agent\"}]}},\"required\":[\"id\",\"name\",\"roles\"],\"additionalProperties\":false},\"SurfaceTarget\":{\"anyOf\":[{\"type\":\"object\",\"properties\":{\"floor\":{\"type\":\"string\"}},\"required\":[\"floor\"],\"additionalProperties\":false},{\"type\":\"object\",\"properties\":{\"ceiling\":{\"type\":\"string\"}},\"required\":[\"ceiling\"],\"additionalProperties\":false},{\"type\":\"object\",\"properties\":{\"face\":{\"$ref\":\"#/$defs/FaceRef\"},\"s\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"z\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2}},\"required\":[\"face\"],\"additionalProperties\":false}]},\"Surface\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"minLength\":1},\"target\":{\"$ref\":\"#/$defs/SurfaceTarget\"},\"material\":{\"type\":\"string\"},\"layout\":{\"type\":\"object\",\"properties\":{\"pattern\":{\"anyOf\":[{\"const\":\"straight\"},{\"const\":\"staggered\"},{\"const\":\"herringbone\"},{\"const\":\"chevron\"},{\"const\":\"grid\"},{\"const\":\"diagonal\"}]},\"size\":{\"type\":\"array\",\"prefixItems\":[{\"type\":\"number\"},{\"type\":\"number\"}],\"minItems\":2,\"maxItems\":2},\"origin\":{\"$ref\":\"#/$defs/Vec2\"},\"angle\":{\"type\":\"number\"},\"joint\":{\"type\":\"number\"}},\"required\":[\"pattern\"],\"additionalProperties\":false},\"by\":{\"anyOf\":[{\"const\":\"user\"},{\"const\":\"agent\"}]},\"status\":{\"anyOf\":[{\"const\":\"pending\"},{\"const\":\"confirmed\"}]}},\"required\":[\"id\",\"target\",\"material\",\"by\",\"status\"],\"additionalProperties\":false},\"Decor\":{\"$ref\":\"#/$defs/DecorLayer\"}}")
};
// src/core/schema.ts
var check = new import__2020.default({
	allErrors: true,
	strict: false
}).compile(plan_schema_default);
function validatePlanFile(value) {
	if (check(value)) return [];
	return (check.errors ?? []).filter((e) => e.keyword !== "if").map((e) => ({
		level: "error",
		code: "schema",
		message: `格式错误 ${e.instancePath || "/"}${e.params.additionalProperty ? "/" + e.params.additionalProperty : e.params.missingProperty ? "/" + e.params.missingProperty : ""}：${e.message}`
	}));
}
// src/core/legacy.ts
function importReport(source) {
	return {
		source,
		counts: {},
		approximations: [],
		unsupported: [],
		idMap: {},
		warnings: []
	};
}
function emptyPlan() {
	return {
		format: "floorplan-structure",
		version: 2,
		title: "未命名方案",
		ceiling: DEFAULTS.ceiling,
		walls: [],
		openings: [],
		beams: [],
		rooms: [],
		questions: [],
		changes: []
	};
}
var kinds = {
	b: "bearing",
	e: "exterior",
	n: "partition",
	hg: "half-glass",
	low: "half",
	glass: "glass"
};
var windowKinds = {
	normal: "window",
	floor: "floor-window",
	bay: "bay-window",
	open: "open-balcony"
};
var doorKinds = {
	swing: "door",
	sliding: "sliding",
	open: "doorway"
};
var certainty = (v) => ({
	"看到": "seen",
	"推断": "inferred",
	"不知道": "unknown",
	seen: "seen",
	inferred: "inferred",
	unknown: "unknown"
})[v] ?? "unknown";
function wallKind(v) {
	return kinds[v ?? "n"] ?? (Object.values(kinds).includes(v) ? v : "partition");
}
function rectWall(rect, id, kind) {
	const [x0, y0, x1, y1] = rect, horizontal = x1 - x0 >= y1 - y0;
	return {
		id,
		a: horizontal ? [x0, (y0 + y1) / 2] : [(x0 + x1) / 2, y0],
		b: horizontal ? [x1, (y0 + y1) / 2] : [(x0 + x1) / 2, y1],
		thickness: horizontal ? y1 - y0 : x1 - x0,
		kind
	};
}
function freeWall(o, id) {
	return {
		id,
		a: o.a,
		b: o.b,
		thickness: o.t ?? DEFAULTS.thickness.partition,
		kind: wallKind(o.kind),
		...o.bulge !== void 0 ? { bulge: o.bulge } : {},
		...o.h !== void 0 ? { height: o.h } : {}
	};
}
function paneData(panes) {
	return panes.map((p) => ({
		width: p.w ?? p.width,
		kind: p.kind
	}));
}
function evidence$1(e) {
	return {
		certainty: certainty(e.kind ?? e.certainty),
		...e.basis ? { basis: e.basis } : {},
		...e.pixelBBox ? { pixelBox: e.pixelBBox } : {},
		...e.confirmed && typeof e.confirmed === "object" ? { confirmed: e.confirmed } : {}
	};
}
/** Unknown and original fields remain at their original paths in a complete legacy snapshot. */
function fromLegacy(json) {
	if (!json || typeof json !== "object" || !("layout" in json)) throw new Error("旧方案缺少 layout 对象");
	const source = structuredClone(json), l = source.layout;
	if (!l || typeof l !== "object" || !Array.isArray(l.walls)) throw new Error("旧方案 layout.walls 必须是数组");
	const plan = emptyPlan(), report = importReport("legacy");
	plan.legacy = structuredClone(source);
	plan.title = l.title?.zh ?? (typeof l.title === "string" ? l.title : "导入方案");
	plan.ceiling = l.height ?? DEFAULTS.ceiling;
	if (l.north !== void 0) plan.north = l.north;
	if (source.planFile) plan.meta = { planFile: source.planFile };
	const original = l.walls.map((r, i) => rectWall(r, typeof r[5] === "string" ? r[5] : `w${i}`, wallKind(r[4])));
	const targetMap = {};
	const gaps = [];
	const append = (arr, group) => (arr ?? []).forEach((raw, i) => {
		const obj = Array.isArray(raw) ? {
			rect: raw.slice(0, 4),
			sill: raw[4]
		} : raw;
		if (!Array.isArray(obj.rect)) {
			report.unsupported.push(`${group}[${i}] 缺少矩形，已保留原文`);
			return;
		}
		const kind = group === "wins" ? windowKinds[obj.type ?? "normal"] ?? "window" : group === "slides" ? "sliding" : group === "openings" || group === "lintels" ? "doorway" : doorKinds[obj.type ?? "swing"] ?? "door";
		gaps.push({
			rect: obj.rect,
			raw: obj,
			id: obj.id ?? (group === "wins" ? `window${i}` : `${group}:${i}`),
			key: `${group}[${i}]`,
			kind,
			sill: obj.sill ?? (group === "wins" ? .9 : 0),
			head: obj.head ?? obj.height ?? Math.min(group === "wins" ? 2.4 : group === "slides" ? 2.2 : 2.1, plan.ceiling)
		});
	});
	append(l.wins, "wins");
	append(l.doors, "doors");
	append(l.slides, "slides");
	append(l.openings, "openings");
	(l.lintels ?? []).forEach((v, i) => {
		const existing = gaps.find((g) => JSON.stringify(g.rect) === JSON.stringify(v[0]));
		if (existing) {
			existing.head = v[1];
			targetMap[`lintels[${i}]`] = existing.id;
		} else gaps.push({
			rect: v[0],
			raw: {},
			id: `lintels:${i}`,
			key: `lintels[${i}]`,
			kind: "doorway",
			sill: 0,
			head: v[1]
		});
	});
	const parents = original.map((_, i) => i);
	const root = (i) => parents[i] === i ? i : parents[i] = root(parents[i]);
	const aligned = (a, b) => Math.abs(dot$2(wallDir(a), wallNormal(b))) < 1e-6 && Math.abs(dot$2([b.a[0] - a.a[0], b.a[1] - a.a[1]], wallNormal(a))) <= 15 && Math.abs(a.thickness - b.thickness) <= 30;
	for (let i = 0; i < original.length; i++) for (let j = i + 1; j < original.length; j++) {
		const a = original[i], b = original[j];
		if (a.kind !== b.kind || !aligned(a, b)) continue;
		const d = wallDir(a), start = dot$2(a.a, d), end = dot$2(a.b, d), bs = dot$2(b.a, d), be = dot$2(b.b, d);
		const lo = Math.min(end, be), hi = Math.max(start, bs);
		const intervals = gaps.map((g) => rectWall(g.rect, "", a.kind)).filter((g) => aligned(a, g)).map((g) => [dot$2(g.a, d), dot$2(g.b, d)]).sort((a, b) => a[0] - b[0]);
		let covered = lo;
		for (const [s, e] of intervals) if (s <= covered + 1 && e >= covered) covered = Math.max(covered, e);
		if (hi <= lo + 1 || covered >= hi - 1) parents[root(j)] = root(i);
	}
	const groups = /* @__PURE__ */ new Map();
	original.forEach((w, i) => {
		const key = root(i);
		groups.set(key, [...groups.get(key) ?? [], w]);
	});
	for (const ws of groups.values()) {
		const first = ws[0], d = wallDir(first), all = ws.flatMap((w) => [w.a, w.b]).sort((a, b) => dot$2(a, d) - dot$2(b, d));
		const onLine = (p) => {
			const s = dot$2([p[0] - first.a[0], p[1] - first.a[1]], d);
			return [first.a[0] + d[0] * s, first.a[1] + d[1] * s];
		};
		const w = {
			...first,
			a: onLine(all[0]),
			b: onLine(all[all.length - 1])
		};
		plan.walls.push(w);
		for (const old of ws) report.idMap[old.id] = {
			wall: w.id,
			offset: dot$2([old.a[0] - w.a[0], old.a[1] - w.a[1]], d)
		};
		if (ws.some((x) => x.thickness !== first.thickness || Math.abs(dot$2([x.a[0] - first.a[0], x.a[1] - first.a[1]], wallNormal(first))) > .001)) report.approximations.push(`合并墙 ${w.id} 的厚度及中心线取第一段，容差分别为 30mm、15mm`);
	}
	original.forEach((w, i) => {
		targetMap[`walls[${i}]`] = report.idMap[w.id].wall;
		targetMap[w.id] = report.idMap[w.id].wall;
	});
	for (const gap of gaps) {
		const gw = rectWall(gap.rect, "", "partition"), len = wallLength(gw), d = wallDir(gw);
		let wall = plan.walls.find((w) => aligned(w, gw) && dot$2(w.a, d) <= dot$2(gw.a, d) + 1 && dot$2(w.b, d) >= dot$2(gw.b, d) - 1);
		if (!wall) {
			const neighbors = plan.walls.filter((w) => aligned(w, gw) && Math.min(distance$1(w.a, gw.b), distance$1(w.b, gw.a)) <= 31);
			const requested = gap.raw.wallType ? wallKind(gap.raw.wallType) : void 0;
			let id = `${gap.id}:host`;
			while (plan.walls.some((w) => w.id === id)) id += "_";
			wall = {
				...gw,
				id,
				kind: requested ?? neighbors[0]?.kind ?? "partition"
			};
			plan.walls.push(wall);
			report.approximations.push(`洞口 ${gap.id} 未能跨同类墙合并，单建宿主 ${id}（${wall.kind}）；未将不同类型墙合并`);
		}
		const offset = projectToWall(wall, gw.a).s;
		const o = {
			id: gap.id,
			wall: wall.id,
			offset,
			width: len,
			kind: gap.kind,
			sill: gap.sill,
			head: gap.head
		};
		if (gap.raw.name) o.name = gap.raw.name;
		if (gap.raw.entry !== void 0) o.entry = gap.raw.entry;
		if (gap.raw.panes) o.panes = paneData(gap.raw.panes);
		if (o.kind === "door") o.swing = {
			hinge: gap.raw.h && distance$1(gap.raw.h, gw.b) < distance$1(gap.raw.h, gw.a) ? "end" : "start",
			side: gap.raw.o && dot$2(gap.raw.o, wallNormal(wall)) < 0 ? -1 : 1
		};
		if (gap.raw.source) o.evidence = evidence$1(gap.raw.source);
		plan.openings.push(o);
		targetMap[gap.key] = o.id;
		targetMap[o.id] = o.id;
	}
	(l.freeWalls ?? []).forEach((o, i) => {
		const w = freeWall(o, o.id ?? `free${i}`);
		plan.walls.push(w);
		report.idMap[w.id] = {
			wall: w.id,
			offset: 0
		};
		targetMap[`freeWalls[${i}]`] = w.id;
	});
	plan.beams = (l.beams ?? []).map((o, i) => {
		const w = rectWall(o.rect, o.id ?? `beam${i}`, "partition");
		targetMap[`beams[${i}]`] = w.id;
		return {
			id: w.id,
			a: w.a,
			b: w.b,
			width: w.thickness,
			bottom: o.bottom ?? DEFAULTS.beam.bottom,
			...o.name ? { name: o.name } : {}
		};
	});
	plan.rooms = (l.rooms ?? []).map((r, i) => {
		const id = r.id ?? `room${i}`;
		targetMap[`rooms[${i}]`] = id;
		targetMap[id] = id;
		return {
			id,
			name: r.name ?? id,
			poly: r.poly ?? [],
			...r.height !== void 0 ? { ceiling: r.height } : {},
			...r.floorHeight !== void 0 || id.startsWith("bay") ? { floorOffset: r.floorHeight ?? .45 } : {},
			...r.counted !== void 0 ? { counted: r.counted } : {},
			...r.use ? { use: r.use } : {}
		};
	});
	if (l.underlay) {
		const u = l.underlay;
		plan.underlay = {
			src: u.src,
			mmPerPx: u.mmPerPx,
			origin: u.origin ?? [0, 0],
			opacity: u.opacity ?? 50,
			visible: u.visible ?? true
		};
		for (const k of [
			"mmPerPxY",
			"rotation",
			"flipX",
			"flipY"
		]) if (u[k] !== void 0) plan.underlay[k] = u[k];
		if (u.calibrations) plan.underlay.calibrations = u.calibrations.map((c) => ({
			p1: c.p1 ?? c.points[0],
			p2: c.p2 ?? c.points[1],
			length: c.length,
			...c.note ? { note: c.note } : {}
		}));
	}
	plan.questions = (l.questions ?? []).map((q, i) => {
		if (q.category === "风格") report.approximations.push(`问题 ${q.id ?? i} 的风格分类归入 renovation，原文保留在 legacy.layout.questions`);
		return {
			id: q.id ?? `q${i}`,
			text: q.text ?? "",
			category: q.category === "改造" || q.category === "风格" ? "renovation" : "original",
			...q.kind ? { certainty: certainty(q.kind) } : {},
			...q.bbox ? { bbox: q.bbox } : {},
			...q.targets ? { targets: q.targets.map((t) => targetMap[t] ?? t) } : {},
			...q.options ? { options: q.options.map((o) => typeof o === "string" ? o : o.zh ?? o.en ?? "") } : {},
			...q.answer != null ? { answer: q.answer } : {},
			...q.answeredBy ? { answeredBy: q.answeredBy } : {},
			...q.answeredAt ? { answeredAt: q.answeredAt } : {}
		};
	});
	for (const e of l.evidence ?? []) {
		const id = targetMap[e.target?.replace(/^layout\./, "")] ?? e.target;
		const item = [
			...plan.walls,
			...plan.openings,
			...plan.beams,
			...plan.rooms
		].find((x) => x.id === id);
		if (item) {
			if (item.evidence) report.approximations.push(`构件 ${id} 有多段证据，显示最后一条，全部原证据保留在 legacy.layout.evidence`);
			item.evidence = evidence$1(e);
		} else report.warnings.push(`证据 ${e.id ?? ""} 的目标 ${e.target} 无法挂接，原文已保留`);
	}
	const aliases = {};
	for (const [id, mapping] of Object.entries(report.idMap)) aliases[id] = {
		...mapping,
		length: wallLength(original.find((w) => w.id === id) ?? plan.walls.find((w) => w.id === mapping.wall))
	};
	const deletedAliases = /* @__PURE__ */ new Set();
	let cursor = structuredClone(plan);
	const pushChange = (c, legacyModId) => {
		plan.changes.push(c);
		const before = cursor, replay = applyChanges(cursor, [c]);
		if (!replay.results[0].ok) return;
		cursor = replay.plan;
		if (c.type === "wall" && c.op === "remove") {
			const w = before.walls.find((w) => w.id === c.target), len = wallLength(w), [from, to] = c.range ?? [0, len];
			const intervals = [];
			if (from > 1e-6) intervals.push([0, from]);
			if (to < len - 1e-6) intervals.push([to, len]);
			for (const [id, alias] of Object.entries(aliases)) if (alias.wall === c.target) {
				const spans = intervals.map(([a, b], i) => ({
					wall: i ? `${w.id}~${c.id}` : w.id,
					offset: Math.max(a, alias.offset) - a,
					length: Math.min(b, alias.offset + alias.length) - Math.max(a, alias.offset)
				})).filter((s) => s.length > 1e-6);
				if (spans.length) {
					aliases[id] = spans[0];
					if (spans[1]) aliases[`${id}:${legacyModId}`] = spans[1];
				} else {
					delete aliases[id];
					deletedAliases.add(id);
				}
			}
		} else if (c.type === "wall" && c.op === "add") {
			const w = cursor.walls.find((w) => w.id === c.data.id);
			aliases[w.id] = {
				wall: w.id,
				offset: 0,
				length: wallLength(w)
			};
		}
	};
	for (const mod of source.mods ?? []) {
		const p = mod.params ?? {}, mapping = aliases[mod.target], target = deletedAliases.has(mod.target) ? `${mod.target}~removed` : mapping?.wall ?? targetMap[mod.target] ?? mod.target;
		const c = {
			id: mod.id,
			op: "update",
			type: "wall",
			...target ? { target } : {},
			by: mod.by === "Agent" ? "agent" : "user",
			status: mod.status === "已确认" ? "confirmed" : "pending",
			...mod.note ? { note: mod.note } : {},
			...mod.at ? { at: mod.at } : {}
		};
		if (mod.confirm === "二次确认" && mod.confirmedBy) c.confirm = {
			by: mod.confirmedBy,
			...mod.confirmedAt ? { at: mod.confirmedAt } : {}
		};
		else if (mod.confirm) report.warnings.push(`改造 ${mod.id} 缺少有效 confirmedBy，未生成二次确认`);
		const offset = mapping?.offset ?? 0;
		switch (mod.op) {
			case "demolish": {
				c.op = "remove";
				const merged = cursor.walls.find((w) => w.id === target);
				if (p.from !== void 0 || p.to !== void 0 || mapping && merged && mapping.length < wallLength(merged) - 1) c.range = [offset + (p.from ?? 0), offset + (p.to ?? mapping?.length ?? (merged ? wallLength(merged) : 0))];
				break;
			}
			case "add-wall":
				c.op = "add";
				delete c.target;
				c.data = { ...rectWall(p.rect, p.id ?? `${mod.id}:wall`, wallKind(p.type)) };
				break;
			case "wall-type":
				c.data = { kind: wallKind(p.type) };
				if (mapping && original.filter((w) => report.idMap[w.id].wall === target).length > 1) report.approximations.push(`改造 ${mod.id} 类型调整应用于合并后的整墙 ${target}`);
				break;
			case "open":
				c.op = "add";
				c.type = "opening";
				delete c.target;
				c.data = {
					id: `${mod.id}:opening`,
					wall: target,
					offset: offset + (p.from ?? 0),
					width: p.width,
					sill: 0,
					head: p.height ?? 2.1,
					kind: doorKinds[p.type ?? "open"] ?? "doorway",
					...p.name ? { name: p.name } : {}
				};
				break;
			case "close":
				c.op = "remove";
				c.type = "opening";
				break;
			case "window":
				c.type = "opening";
				c.data = {};
				for (const k of [
					"sill",
					"head",
					"name"
				]) if (p[k] !== void 0) c.data[k] = p[k];
				if (p.type) c.data.kind = windowKinds[p.type];
				if (p.panes) c.data.panes = paneData(p.panes);
				break;
			case "balcony":
				c.type = "opening";
				c.data = { kind: p.enclosed ? "window" : "open-balcony" };
				break;
			case "room":
				c.type = "room";
				c.data = {};
				for (const k of [
					"name",
					"use",
					"poly"
				]) if (p[k] !== void 0) c.data[k] = p[k];
				if (p.height !== void 0) c.data.ceiling = p.height;
				break;
			case "bay-remove":
				c.type = "room";
				c.data = {
					floorOffset: 0,
					counted: true
				};
				c.group = mod.id;
				pushChange(c, mod.id);
				for (const [i, id] of (p.windows ?? []).entries()) pushChange({
					...c,
					id: `${c.id}:window${i}`,
					type: "opening",
					target: targetMap[id] ?? id,
					data: {
						sill: p.sill ?? .9,
						kind: "window"
					}
				}, mod.id);
				report.approximations.push(`改造 ${mod.id} 取消台面并计入面积；父房间和材质信息保留在 legacy.mods`);
				continue;
			case "add-free-wall":
				c.op = "add";
				delete c.target;
				c.data = { ...freeWall(p, p.id ?? `${mod.id}:wall`) };
				break;
			case "free-wall":
				c.data = {};
				for (const k of [
					"a",
					"b",
					"bulge"
				]) if (p[k] !== void 0) c.data[k] = p[k];
				if (p.t !== void 0) c.data.thickness = p.t;
				if (p.h !== void 0) c.data.height = p.h;
				if (p.kind) c.data.kind = wallKind(p.kind);
				break;
			default:
				report.unsupported.push(`改造 ${mod.id}（${mod.op}）不能换算，原文保留在 legacy.mods`);
				continue;
		}
		pushChange(c, mod.id);
	}
	report.counts = {
		walls: plan.walls.length,
		openings: plan.openings.length,
		beams: plan.beams.length,
		rooms: plan.rooms.length,
		questions: plan.questions.length,
		changes: plan.changes.length,
		legacyMods: source.mods?.length ?? 0
	};
	for (const o of plan.openings) {
		const w = plan.walls.find((w) => w.id === o.wall);
		if (o.head > effectiveWallHeight(plan, w)) report.warnings.push(`洞口 ${o.id} 洞顶超过墙高，保留原尺寸，需核对`);
		if (o.sill >= o.head) report.warnings.push(`洞口 ${o.id} 窗台不低于洞顶，保留原尺寸，需核对`);
	}
	for (const issue of validatePlan(plan)) report.warnings.push(`[${issue.code}] ${issue.message}（旧数据原尺寸保留，需核对）`);
	return {
		plan,
		report
	};
}
// src/core/simple.ts
var SIMPLE_FORMAT = "floorplan-simple";
var SIMPLE_BASIS = "简版格式自动生成";
var EPS = 1e-5;
var record = (v) => !!v && typeof v === "object" && !Array.isArray(v);
var finite$3 = (v) => typeof v === "number" && Number.isFinite(v);
var evidence = () => ({
	certainty: "inferred",
	basis: SIMPLE_BASIS
});
var sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
var dot$1 = (a, b) => a[0] * b[0] + a[1] * b[1];
var cross$1 = (a, b) => a[0] * b[1] - a[1] * b[0];
var distance = (a, b) => Math.hypot(...sub(a, b));
var round = (p) => p.map((n) => Math.round(n * 1e6) / 1e6);
var at = (a, d, s) => round([a[0] + d[0] * s, a[1] + d[1] * s]);
var direction = (a, b) => {
	const l = distance(a, b);
	return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
var bbox = (points) => [
	Math.min(...points.map((p) => p[0])),
	Math.min(...points.map((p) => p[1])),
	Math.max(...points.map((p) => p[0])),
	Math.max(...points.map((p) => p[1]))
];
var signedArea$1 = (poly) => poly.reduce((s, p, i) => s + cross$1(p, poly[(i + 1) % poly.length]), 0) / 2;
var area$1 = (polys) => polys.reduce((s, p) => s + polygonArea(p[0]) - p.slice(1).reduce((n, h) => n + polygonArea(h), 0), 0);
var outside = (v) => typeof v === "string" && [
	"外面",
	"室外",
	"户外",
	"outside"
].includes(v);
function simpleObject(value) {
	if (!record(value)) return null;
	if (value.format === "floorplan-simple" || value["floorplan-simple"] === 1 || value["floorplan-simple"] === "version 1") return { value };
	const keys = Object.keys(value), child = value[keys[0]];
	if (keys.length === 1 && record(child) && child.format === "floorplan-simple") return {
		value: child,
		wrapper: keys[0]
	};
	return null;
}
function isSimplePlan(value) {
	return simpleObject(value) !== null;
}
/** Remove closing/collinear vertices from clipping output, without rounding away thin shapes. */
function cleanRing(poly) {
	let points = poly.filter((p, i) => distance(p, poly[(i + 1) % poly.length]) > EPS);
	let changed = true;
	while (changed && points.length > 3) {
		changed = false;
		for (let i = 0; i < points.length; i++) {
			const a = points[(i + points.length - 1) % points.length], p = points[i], b = points[(i + 1) % points.length];
			if (Math.abs(cross$1(sub(p, a), sub(b, a))) <= EPS * distance(a, b) && dot$1(sub(p, a), sub(p, b)) <= EPS) {
				points.splice(i, 1);
				changed = true;
				break;
			}
		}
	}
	return points;
}
/** Cluster vertices across rooms, then project shared clusters together onto nearby edge interiors. */
function snapRooms(rooms, notes) {
	const vertices = rooms.flatMap((r, room) => r.poly.map((p, vertex) => ({
		p,
		room,
		vertex
	})));
	const groups = vertices.map((_, i) => [i]);
	const candidates = [];
	for (let i = 0; i < vertices.length; i++) for (let j = i + 1; j < vertices.length; j++) {
		const d = distance(vertices[i].p, vertices[j].p);
		if (vertices[i].room !== vertices[j].room && d <= 150) candidates.push({
			i,
			j,
			d
		});
	}
	candidates.sort((a, b) => a.d - b.d);
	for (const { i, j } of candidates) {
		const a = groups.find((g) => g.includes(i)), b = groups.find((g) => g.includes(j));
		if (a === b || a.some((x) => b.some((y) => vertices[x].room === vertices[y].room || distance(vertices[x].p, vertices[y].p) > 150))) continue;
		a.push(...b);
		groups.splice(groups.indexOf(b), 1);
	}
	const original = rooms.map((r) => r.poly);
	const clustered = rooms.map((r) => r.poly.map((p) => [...p]));
	for (const group of groups) {
		const p = round(group.reduce((p, i) => [p[0] + vertices[i].p[0] / group.length, p[1] + vertices[i].p[1] / group.length], [0, 0]));
		for (const i of group) clustered[vertices[i].room][vertices[i].vertex] = p;
	}
	if (clustered.some(invalidPolygon)) {
		notes.push("顶点吸附会使房间退化或自交，保留原顶点");
		return;
	}
	const projected = clustered.map((poly) => poly.map((p) => [...p]));
	for (const group of groups) {
		const first = vertices[group[0]], p = clustered[first.room][first.vertex];
		let best, bestDistance = 150.00001;
		for (let ri = 0; ri < rooms.length; ri++) {
			if (group.some((i) => vertices[i].room === ri)) continue;
			const poly = clustered[ri];
			for (let k = 0; k < poly.length; k++) {
				const a = poly[k], b = poly[(k + 1) % poly.length], d = direction(a, b), s = dot$1(sub(p, a), d);
				if (s <= EPS || s >= distance(a, b) - EPS) continue;
				const q = at(a, d, s), gap = distance(p, q);
				if (gap < bestDistance) {
					best = q;
					bestDistance = gap;
				}
			}
		}
		if (best) for (const i of group) projected[vertices[i].room][vertices[i].vertex] = best;
	}
	const final = projected.some(invalidPolygon) ? clustered : projected;
	if (final !== projected) notes.push("边投影会使房间退化或自交，仅保留顶点吸附");
	rooms.forEach((r, i) => {
		r.poly = final[i];
	});
	if (final.some((p, i) => p.some((v, j) => distance(v, original[i][j]) > EPS))) notes.push(`已按 150 mm 容差吸附房间顶点和边`);
}
function splitEdges(rooms) {
	const vertices = rooms.flatMap((r) => r.poly), segments = /* @__PURE__ */ new Map();
	rooms.forEach((r, room) => r.poly.forEach((a, i) => {
		const b = r.poly[(i + 1) % r.poly.length], d = direction(a, b), length = distance(a, b);
		const cuts = [0, length];
		for (const p of vertices) {
			const s = dot$1(sub(p, a), d);
			if (s > EPS && s < length - EPS && Math.abs(cross$1(sub(p, a), d)) <= EPS) cuts.push(s);
		}
		cuts.sort((a, b) => a - b);
		for (let j = 1; j < cuts.length; j++) {
			if (cuts[j] - cuts[j - 1] <= EPS) continue;
			let p = at(a, d, cuts[j - 1]), q = at(a, d, cuts[j]);
			if (p[0] > q[0] || p[0] === q[0] && p[1] > q[1]) [p, q] = [q, p];
			const key = `${p}:${q}`, existing = segments.get(key);
			if (existing) {
				if (!existing.owners.includes(room)) existing.owners.push(room);
			} else segments.set(key, {
				a: p,
				b: q,
				owners: [room]
			});
		}
	}));
	return [...segments.values()];
}
function collinear(a, b) {
	const d = direction(a.a, a.b);
	return Math.abs(cross$1(d, direction(b.a, b.b))) < 1e-8 && Math.abs(cross$1(sub(b.a, a.a), d)) <= EPS;
}
function mergeRuns(edges) {
	const runs = edges.map((e) => ({
		...e,
		kind: e.owners.length > 1 ? "partition" : "exterior",
		pieces: [e]
	}));
	for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
		const a = runs[i], b = runs[j];
		if (a.kind !== b.kind || !collinear(a, b)) continue;
		const d = direction(a.a, a.b), s = dot$1(sub(b.a, a.a), d), t = dot$1(sub(b.b, a.a), d), length = distance(a.a, a.b);
		if (Math.min(s, t) > length + EPS || Math.max(s, t) < -1e-5) continue;
		const start = at(a.a, d, Math.min(0, s, t)), end = at(a.a, d, Math.max(length, s, t));
		a.a = start;
		a.b = end;
		a.pieces.push(...b.pieces);
		a.owners = [.../* @__PURE__ */ new Set([...a.owners, ...b.owners])];
		runs.splice(j, 1);
		i--;
		break;
	}
	return runs;
}
function intervals(run, belongs) {
	const d = direction(run.a, run.b);
	const spans = run.pieces.filter(belongs).map((p) => [dot$1(sub(p.a, run.a), d), dot$1(sub(p.b, run.a), d)].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
	const merged = [];
	for (const span of spans) {
		const last = merged.at(-1);
		if (last && span[0] <= last[1] + EPS) last[1] = Math.max(last[1], span[1]);
		else merged.push([...span]);
	}
	return merged;
}
function wallRect(w) {
	const d = direction(w.a, w.b), n = [-d[1], d[0]], h = w.thickness / 2;
	return [[
		at(w.a, n, h),
		at(w.b, n, h),
		at(w.b, n, -h),
		at(w.a, n, -h)
	]];
}
function simpleToPlan(value) {
	const notes = [], issues = [], parsed = simpleObject(value);
	const error = (message) => issues.push({
		level: "error",
		code: "simple-shape",
		message
	});
	if (!parsed) {
		error("format：要写 \"floorplan-simple\"，version：要写 1");
		return {
			plan: null,
			issues,
			notes
		};
	}
	const input = parsed.value;
	if (parsed.wrapper) notes.push(`已拆掉外面多套的一层 ${parsed.wrapper}`);
	if (input["floorplan-simple"] !== void 0) notes.push("格式标记写成了键，已按 format: \"floorplan-simple\", version: 1 读取");
	if (input.version === void 0 || input.version === "1") notes.push("version 缺失或是字符串，已按 1 读取");
	else if (input.version !== 1) error("version：简版格式只支持 1");
	const extras = /* @__PURE__ */ new Set();
	const extra = (o, allowed) => Object.keys(o).filter((k) => !allowed.includes(k)).forEach((k) => extras.add(k));
	extra(input, [
		"format",
		"version",
		"title",
		"rooms",
		"doors",
		SIMPLE_FORMAT
	]);
	if (!Array.isArray(input.rooms) || !input.rooms.length) {
		error("rooms：至少要写一间房");
		return {
			plan: null,
			issues,
			notes
		};
	}
	const rooms = [], aliases = /* @__PURE__ */ new Map(), names = /* @__PURE__ */ new Set();
	const ids = /* @__PURE__ */ new Set(), reserved = new Set(input.rooms.flatMap((r) => record(r) && typeof r.id === "string" && r.id && !r.id.startsWith("simple-") ? [r.id] : []));
	const unique = (base) => {
		let id = base, i = 2;
		while (ids.has(id) || reserved.has(id)) id = `${base}-${i++}`;
		ids.add(id);
		return id;
	};
	const coordinates = [];
	input.rooms.forEach((raw, index) => {
		const r = record(raw) ? raw : {}, name = typeof r.name === "string" ? r.name.trim() : "";
		const path = `rooms[${index}]${name ? `（${name}）` : ""}`;
		if (!name) error(`${path}.name：每间房要写 name`);
		extra(r, [
			"id",
			"name",
			"rect",
			"poly"
		]);
		let poly = [];
		if (r.rect !== void 0 && r.poly !== void 0) {
			error(`${path}：rect 和 poly 要二选一`);
			return;
		}
		if (r.poly !== void 0) {
			if (!Array.isArray(r.poly) || r.poly.length < 3) {
				error(`${path}.poly：至少要 3 个点`);
				return;
			}
			let objects = false;
			for (const [i, rawPoint] of r.poly.entries()) {
				const p = record(rawPoint) ? (objects = true, extra(rawPoint, ["x", "y"]), [rawPoint.x, rawPoint.y]) : rawPoint;
				if (!Array.isArray(p) || p.length !== 2 || !p.every(finite$3)) {
					error(`${path}.poly[${i}]：坐标要写两个有限数`);
					continue;
				}
				poly.push([p[0], p[1]]);
				coordinates.push(...p);
			}
			if (objects) notes.push(`${path}.poly 的 {x, y} 已转成 [x, y]`);
		} else {
			let rect = r.rect;
			if (record(rect)) {
				extra(rect, [
					"x",
					"y",
					"w",
					"h",
					"width",
					"height"
				]);
				rect = [
					rect.x,
					rect.y,
					rect.w ?? rect.width,
					rect.h ?? rect.height
				];
				notes.push(`${path}.rect 的对象已转成 [x, y, 宽, 深]`);
			}
			if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(finite$3)) {
				error(`${path}.rect：要写 [左上角 x, 左上角 y, 宽, 深] 四个有限数`);
				return;
			}
			const [x, y, w, h] = rect;
			if (w <= 0 || h <= 0) {
				error(`${path}.rect：宽和深必须大于 0`);
				return;
			}
			coordinates.push(...rect);
			poly = [
				[x, y],
				[x + w, y],
				[x + w, y + h],
				[x, y + h]
			];
		}
		if (poly.length < 3 || poly.some((p) => !p.every(finite$3)) || invalidPolygon(poly)) {
			error(`${path}.${r.poly !== void 0 ? "poly" : "rect"}：多边形自交或退化，请按边界顺序写顶点`);
			return;
		}
		let renamed = name, n = 2;
		while (names.has(renamed)) renamed = `${name} ${n++}`;
		if (renamed !== name) notes.push(`${path} 重名，已改成「${renamed}」；doors 引用「${name}」时按第一间`);
		names.add(renamed);
		let id;
		if (typeof r.id === "string" && r.id && !ids.has(r.id) && !r.id.startsWith("simple-")) {
			id = r.id;
			ids.add(id);
		} else {
			id = unique(`r${index + 1}`);
			if (r.id !== void 0) notes.push(`${path}.id 无效、重复或占用 simple- 问题卡前缀，已改为 ${id}`);
		}
		const roomIndex = rooms.length;
		for (const alias of [
			name,
			renamed,
			typeof r.id === "string" ? r.id : id
		]) if (!aliases.has(alias)) aliases.set(alias, roomIndex);
		rooms.push({
			id,
			name: renamed,
			poly
		});
	});
	if (issues.length) return {
		plan: null,
		issues,
		notes
	};
	const plan = {
		...emptyPlan(),
		title: typeof input.title === "string" ? input.title : "简版方案",
		meta: { source: SIMPLE_FORMAT }
	};
	const question = (id, text, fields = {}) => plan.questions.push({
		id: unique(id),
		text,
		category: "original",
		certainty: "inferred",
		status: "open",
		...fields
	});
	const warn = (id, text, fields = {}) => {
		issues.push({
			level: "warn",
			code: id,
			message: text
		});
		question(id, text, fields);
	};
	question("simple-windows", "这是简版方案：窗户没有读出来，请在工具里自己加。", { certainty: "unknown" });
	if (coordinates.every((n) => Math.abs(n) <= 100)) {
		rooms.forEach((r) => {
			r.poly = r.poly.map((p) => [p[0] * 1e3, p[1] * 1e3]);
		});
		const text = "坐标像是米，已按毫米 ×1000 换算，请核对尺寸";
		notes.push(text);
		question("simple-units", text);
	}
	snapRooms(rooms, notes);
	const edges = splitEdges(rooms), doors = [];
	if (input.doors !== void 0 && !Array.isArray(input.doors)) warn("simple-doors", "doors：要写门的数组，已忽略，需自行补门");
	for (const [index, raw] of (Array.isArray(input.doors) ? input.doors : []).entries()) {
		const d = record(raw) ? raw : {};
		extra(d, [
			"between",
			"open",
			"from",
			"to"
		]);
		let between = d.between;
		if (between === void 0 && ("from" in d || "to" in d)) {
			between = [d.from, d.to];
			notes.push(`doors[${index}] 的 from/to 已转成 between`);
		}
		const pair = Array.isArray(between) && between.length === 2 ? between : [];
		const entry = pair.some(outside), refs = entry && outside(pair[0]) ? [pair[1], pair[0]] : pair;
		const a = typeof refs[0] === "string" && !outside(refs[0]) ? aliases.get(refs[0]) : void 0;
		const b = typeof refs[1] === "string" && !outside(refs[1]) ? aliases.get(refs[1]) : void 0;
		const label = `doors[${index}]（${pair.map(String).join(" / ")}）`;
		if (a === void 0 || !entry && b === void 0 || a === b) {
			warn(`simple-door-${index + 1}`, `${label}：房间不存在或两端是同一间房，未生成门`);
			continue;
		}
		if (!entry && !edges.some((e) => e.owners.includes(a) && e.owners.includes(b))) {
			warn(`simple-door-${index + 1}`, `${label}：两间房没有共用边，未生成门`);
			continue;
		}
		doors.push({
			index,
			a,
			b,
			entry,
			open: d.open === true,
			label
		});
	}
	if (extras.size) notes.push(`已忽略多余字段：${[...extras].sort().join("、")}`);
	const openPairs = doors.filter((d) => d.open && !d.entry);
	const runs = mergeRuns(edges.filter((e) => !openPairs.some((d) => e.owners.includes(d.a) && e.owners.includes(d.b))));
	runs.forEach((run, i) => {
		const wall = {
			id: unique(`w${i + 1}`),
			a: run.a,
			b: run.b,
			thickness: DEFAULTS.thickness[run.kind],
			kind: run.kind,
			name: run.owners.map((n) => rooms[n].name).join(" / ") + (run.kind === "exterior" ? " 外墙" : ""),
			evidence: evidence()
		};
		run.wall = wall;
		plan.walls.push(wall);
	});
	for (const door of doors) {
		if (door.open && !door.entry) continue;
		const chosen = runs.flatMap((run) => intervals(run, (e) => door.entry ? run.kind === "exterior" && e.owners.includes(door.a) : e.owners.includes(door.a) && e.owners.includes(door.b)).map((span) => ({
			run,
			span,
			length: span[1] - span[0]
		}))).sort((a, b) => b.length - a.length)[0], qid = `simple-door-${door.index + 1}`;
		if (!chosen) {
			warn(qid, `${door.label}：${door.entry ? "这间房没有外墙" : "共用边为敞开区域，没有墙"}，未生成门`);
			continue;
		}
		const { run, span, length } = chosen, normalWidth = door.entry ? 1e3 : DEFAULTS.opening.door.width;
		const width = Math.min(normalWidth, length - 200);
		if (width < 600) {
			warn(qid, `${door.label}：共用段或外墙段长 ${Math.round(length)} mm，留两侧各 100 mm 后门宽不足 600 mm，未生成门`, { targets: [run.wall.id] });
			continue;
		}
		const offset = Math.max(0, (span[0] + span[1] - width) / 2);
		if (plan.openings.some((o) => o.wall === run.wall.id && Math.min(o.offset + o.width, offset + width) - Math.max(o.offset, offset) > EPS)) {
			warn(qid, `${door.label}：居中位置与已有门重叠，未重复生成门`, { targets: [run.wall.id] });
			continue;
		}
		const id = unique(`o${door.index + 1}`);
		plan.openings.push({
			id,
			wall: run.wall.id,
			offset,
			width,
			kind: "door",
			sill: 0,
			head: DEFAULTS.opening.door.head,
			...door.entry ? { entry: true } : {},
			name: door.label,
			evidence: evidence()
		});
		if (width < normalWidth) notes.push(`${door.label}：门宽已缩为 ${Math.round(width)} mm，两侧各留 100 mm`);
		if (door.entry) question("simple-entry", `入户门放在了『${rooms[door.a].name}』最长的那段外墙中间，是工具猜的，请确认，不对就在工具里挪`, { targets: [id] });
	}
	addGeometryQuestions(rooms, edges, question);
	const wallArea = plan.walls.map(wallRect).reduce((all, footprint) => index.union(all, footprint).map((p) => p.map((r) => r.map(round))), []);
	rooms.forEach((room, index$2) => {
		let net = wallArea.length ? index.difference([room.poly], wallArea) : [[room.poly]];
		const holes = net.flatMap((p) => p.slice(1)), bounds = bbox(room.poly);
		if (holes.length) {
			notes.push(`rooms[${index$2}]（${room.name}）净面含内孔，已用 0.01 mm 细缝连到外缘以保留扣除面积`);
			for (const hole of holes) {
				const p = hole.reduce((a, b) => a[0] < b[0] ? a : b);
				net = index.difference(net, [[
					[bounds[0] - 1, p[1] - .005],
					[p[0] + .005, p[1] - .005],
					[p[0] + .005, p[1] + .005],
					[bounds[0] - 1, p[1] + .005]
				]]);
			}
		}
		net.sort((a, b) => area$1([b]) - area$1([a]));
		const poly = net[0] ? cleanRing(net[0][0]) : [];
		if (poly.length < 3 || invalidPolygon(poly)) {
			warn(`simple-room-${index$2 + 1}`, `rooms[${index$2}]（${room.name}）：扣墙后没有有效净面，未生成房间，请核对尺寸`);
			return;
		}
		if (net.length > 1) notes.push(`rooms[${index$2}]（${room.name}）扣墙后分成 ${net.length} 块，保留面积最大的一块`);
		plan.rooms.push({
			id: room.id,
			name: room.name,
			poly,
			evidence: evidence()
		});
	});
	issues.push(...validatePlan(plan));
	return {
		plan,
		issues,
		notes
	};
}
function addGeometryQuestions(rooms, edges, question) {
	let overlap = 0, gap = 0, hole = 0;
	for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
		const intersection = index.intersection([rooms[i].poly], [rooms[j].poly]);
		if (area$1(intersection) > 5e4) question(`simple-overlap-${++overlap}`, `『${rooms[i].name}』和『${rooms[j].name}』有重叠，墙可能不对，请核对`, {
			bbox: bbox(intersection.flat(2)),
			targets: [rooms[i].id, rooms[j].id]
		});
	}
	const union = index.union([rooms[0].poly], ...rooms.slice(1).map((r) => [r.poly]));
	for (const p of union) for (const ring of p.slice(1)) if (polygonArea(ring) > 1e5) question(`simple-hole-${++hole}`, "这里有一块空白没有房间，可能漏了房间或坐标没对齐", { bbox: bbox(ring) });
	const external = rooms.flatMap((_, i) => mergeRuns(edges.filter((e) => e.owners.length === 1 && e.owners[0] === i)));
	const outward = (e) => {
		const room = rooms[e.owners[0]], d = direction(e.a, e.b);
		const mid = at(e.a, d, distance(e.a, e.b) / 2);
		const index = room.poly.findIndex((a, i) => {
			const b = room.poly[(i + 1) % room.poly.length];
			return Math.abs(cross$1(sub(mid, a), direction(a, b))) <= EPS && dot$1(sub(mid, a), sub(mid, b)) <= EPS;
		});
		const a = room.poly[index], b = room.poly[(index + 1) % room.poly.length];
		const sign = Math.sign(signedArea$1(room.poly) * dot$1(sub(b, a), d));
		return [d[1] * sign, -d[0] * sign];
	};
	for (let i = 0; i < external.length; i++) for (let j = i + 1; j < external.length; j++) {
		const a = external[i], b = external[j], ra = a.owners[0], rb = b.owners[0];
		if (ra === rb) continue;
		const d = direction(a.a, a.b);
		if (Math.abs(cross$1(d, direction(b.a, b.b))) > 1e-8) continue;
		const n = outward(a), m = outward(b), delta = sub(b.a, a.a), separation = dot$1(delta, n);
		if (dot$1(n, m) > -.999999 || separation <= 150.00001 || separation > 600.00001) continue;
		const s = dot$1(delta, d), t = dot$1(sub(b.b, a.a), d);
		const lo = Math.max(0, Math.min(s, t)), hi = Math.min(distance(a.a, a.b), Math.max(s, t));
		if (hi - lo < 299.99999) continue;
		const p = at(a.a, d, lo), q = at(a.a, d, hi), corridor = [
			p,
			q,
			at(q, n, separation),
			at(p, n, separation)
		];
		if (area$1(index.intersection([corridor], union)) > 2 * EPS * (hi - lo + separation)) continue;
		question(`simple-gap-${++gap}`, `『${rooms[ra].name}』和『${rooms[rb].name}』之间有一条 ${Math.round(separation)} mm 的缝，生成了两道外墙，请核对`, {
			bbox: bbox(corridor),
			targets: [rooms[ra].id, rooms[rb].id]
		});
	}
}
// src/core/io.ts
function stable(value) {
	if (Array.isArray(value)) return value.map(stable);
	if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().filter((k) => value[k] !== void 0).map((k) => [k, stable(value[k])]));
	return value;
}
/** Decimal exponent shift avoids introducing binary multiplication noise at file boundaries. */
function lengthUnit(value, exponent = 3) {
	const [coefficient, power = "0"] = String(value).split("e");
	return Number(`${coefficient}e${Number(power) + exponent}`);
}
/** Only explicit metre quantities in prose; pixel values, areas, IDs and unlabelled numbers stay intact. */
function agentUnits(text) {
	return text.replace(/([+−-]?\d+(?:\.\d+)?(?:\s*[–—~～至到-]\s*[+−-]?\d+(?:\.\d+)?)*)\s*(?:m(?![a-zA-Z²³^\d])|米(?![²³]|平方|立方))/g, (_, values) => values.replace(/[+−-]?\d+(?:\.\d+)?/g, (n) => String(lengthUnit(Number(n.replace("−", "-"))))) + " mm");
}
/** Persisted length paths whose in-memory representation is metres. Never recurse by bare key names. */
var METRE_PATHS = [
	"ceiling",
	"walls.*.height",
	"walls.*.lowHeight",
	"openings.*.sill",
	"openings.*.head",
	"beams.*.bottom",
	"rooms.*.ceiling",
	"rooms.*.floorOffset",
	"levels.*.elevation",
	"levels.*.ceiling",
	"decor.furniture.*.height",
	"decor.furniture.*.z",
	"decor.cabinets.*.z.*",
	"decor.cabinets.*.plinth",
	"decor.cabinets.*.columns.*.cells.*.h",
	"decor.cabinets.*.columns.*.cells.*.void.top.z",
	"decor.cabinets.*.columns.*.cells.*.appliance.size.2",
	"decor.cabinets.*.cuts.*.z.*",
	"decor.panels.*.span.z.*",
	"decor.recesses.*.rect.z.*",
	"decor.recesses.*.shelves.*",
	"decor.surfaces.*.target.z.*",
	"decor.presets.*.trims.skirting.height",
	"decor.cache.*.pose.z"
];
var ELEMENT_METRES = {
	wall: ["height", "lowHeight"],
	opening: ["sill", "head"],
	beam: ["bottom"],
	room: ["ceiling", "floorOffset"]
};
function shiftPath(value, path, exponent) {
	if (!value || typeof value !== "object") return;
	const [key, ...rest] = path;
	for (const k of key === "*" ? Object.keys(value) : [key]) if (rest.length) shiftPath(value[k], rest, exponent);
	else if (typeof value[k] === "number") value[k] = lengthUnit(value[k], exponent);
}
function shiftPlan(plan, exponent) {
	for (const path of METRE_PATHS) shiftPath(plan, path.split("."), exponent);
	for (const c of Array.isArray(plan.changes) ? plan.changes : []) for (const key of ELEMENT_METRES[c?.type] ?? []) shiftPath(c?.data, [key], exponent);
}
function planFileValue(plan) {
	const value = structuredClone(plan);
	if (value.legacy) delete value.legacy.__structureReplayFrame;
	shiftPlan(value, 3);
	value.version = 3;
	for (const q of value.questions ?? []) if (q) {
		if (typeof q.text === "string") q.text = agentUnits(q.text);
		if (typeof q.answer === "string") q.answer = agentUnits(q.answer);
		if (Array.isArray(q.options)) q.options = q.options.map((v) => typeof v === "string" ? agentUnits(v) : v);
		if (typeof q.reply?.text === "string") q.reply.text = agentUnits(q.reply.text);
		for (const e of Array.isArray(q.log) ? q.log : []) if (typeof e?.text === "string") e.text = agentUnits(e.text);
	}
	return value;
}
function serializePlan(plan) {
	return JSON.stringify(stable(planFileValue(plan)), null, 2) + "\n";
}
/**
* Format marker and the six arrays of a v2/v3 file. Chat replies often leave out arrays that may be empty
* (beams / questions / changes): those become [] and are reported back; anything else is named, never guessed.
*/
function shapeOf(value) {
	const problems = [], filled = [], seen = (v) => v === void 0 ? "缺失" : v === null ? "null" : Array.isArray(v) ? "数组" : JSON.stringify(v).length <= 24 ? JSON.stringify(v) : typeof v;
	if (value.format !== "floorplan-structure") problems.push(`format 应为 "floorplan-structure"（现在是 ${seen(value.format)}）`);
	if (![2, 3].includes(value.version)) problems.push(`version 应为 3（现在是 ${seen(value.version)}）`);
	for (const k of [
		"walls",
		"openings",
		"beams",
		"rooms",
		"questions",
		"changes"
	]) {
		if (Array.isArray(value[k])) continue;
		if (value[k] === void 0 && [
			"beams",
			"questions",
			"changes"
		].includes(k)) {
			value[k] = [];
			filled.push(k);
			continue;
		}
		problems.push(value[k] === void 0 ? `缺 ${k} 数组（没有就写 []）` : `${k} 应为数组（现在是 ${seen(value[k])}）`);
	}
	if (problems.length) throw new Error(`方案格式不完整：${problems.join("；")}`);
	return filled;
}
function parsePlanText(text) {
	try {
		const value = JSON.parse(text.replace(/^\uFEFF/, ""));
		if (isSimplePlan(value)) {
			const converted = simpleToPlan(value), report = importReport("simple"), plan = converted.plan ?? emptyPlan();
			report.approximations = converted.notes;
			report.counts = Object.fromEntries([
				"walls",
				"openings",
				"beams",
				"rooms",
				"questions",
				"changes"
			].map((k) => [k, plan[k].length]));
			report.warnings = converted.issues.filter((i) => i.level === "warn").map((i) => i.message);
			return {
				plan,
				report,
				issues: converted.issues
			};
		}
		if (value?.format === "floorplan-structure" || [2, 3].includes(value?.version)) {
			const report = importReport("v2"), filled = shapeOf(value);
			if (value.version === 3) shiftPlan(value, -3);
			value.version = 2;
			if (Array.isArray(value.decor?.furniture)) {
				for (const f of value.decor.furniture) if (f && typeof f.in === "string" && f.at !== void 0) {
					delete f.at;
					report.approximations.push(`家具 ${f.id} 已迁移为仅随宿主定位，移除旧 at`);
				}
			}
			if (value.legacy) delete value.legacy.__structureReplayFrame;
			const schemaIssues = validatePlanFile(planFileValue(value));
			const unknown = schemaIssues.find((i) => /不允许的字段|additional propert/i.test(i.message));
			if (unknown) {
				const path = (/^格式错误 (.*?)：/.exec(unknown.message)?.[1] ?? "/").replace(/^\/\//, "/");
				schemaIssues.push({
					level: "error",
					code: "schema",
					message: `方案里有这个版本不认识的字段（${path}）：可能是更新版本的工具或 Skill 写的，请把 try-your-home 和 see-your-home 升级到最新版`
				});
			}
			if (schemaIssues.length) return {
				plan: emptyPlan(),
				report,
				issues: schemaIssues
			};
			report.counts = Object.fromEntries([
				"walls",
				"openings",
				"beams",
				"rooms",
				"questions",
				"changes"
			].map((k) => [k, value[k].length]));
			return {
				plan: value,
				report,
				issues: [...filled.map((k) => ({
					level: "warn",
					code: "missing-array",
					message: `方案里没写 ${k}，已按空数组 [] 载入`
				})), ...validatePlan(value)]
			};
		}
		const converted = fromLegacy(value);
		const furniture = fromLegacyFurniture(converted.plan);
		if (furniture.furniture.length || furniture.style) {
			converted.plan.decor = {
				...createDecor(furniture.style ?? "cream"),
				furniture: furniture.furniture,
				presets: furniture.presets
			};
			converted.plan.decor.materials.push(...furniture.materials);
			converted.report.counts.furniture = furniture.furniture.length;
			converted.report.approximations.push(`家具 ${furniture.furniture.length} 件已转入装修层；未识别类型使用占位块和 1 m 参考高度`);
			converted.report.warnings.push(...furniture.warnings);
		}
		if (converted.plan.legacy) delete converted.plan.legacy.__structureReplayFrame;
		const schemaIssues = validatePlanFile(planFileValue(converted.plan));
		if (schemaIssues.length) return {
			plan: emptyPlan(),
			report: converted.report,
			issues: schemaIssues
		};
		const issues = validatePlan(converted.plan);
		return {
			...converted,
			issues
		};
	} catch (e) {
		return {
			plan: emptyPlan(),
			report: importReport("v2"),
			issues: [{
				level: "error",
				code: "parse",
				message: `无法读取方案：${e instanceof Error ? e.message : String(e)}`
			}]
		};
	}
}
// src/core/decor/surfaces.ts
var NEUTRAL_MATERIAL = {
	id: "__neutral__",
	name: "白模中性色",
	category: "other",
	color: "#f3f2ef"
};
function styleOf(plan) {
	return plan.decor?.presets?.find((p) => p.id === plan.decor.style) ?? STYLE_PRESETS.find((p) => p.id === plan.decor?.style);
}
function materialOf(plan, id) {
	return plan.decor?.materials.find((m) => m.id === id) ?? BUILTIN_MATERIALS.find((m) => m.id === id) ?? NEUTRAL_MATERIAL;
}
function roomRole(plan, room, kind) {
	const text = room ? `${room.name} ${room.use ?? ""}` : "", rule = styleOf(plan)?.rooms?.find((r) => r.match.some((m) => text.includes(m)) && r[kind]);
	if (rule?.[kind]) return rule[kind];
	return /卫|厨|阳台/.test(text) ? `${kind}.wet` : `${kind}.main`;
}
function sameTarget(a, b) {
	return "floor" in a && "floor" in b ? a.floor === b.floor : "ceiling" in a && "ceiling" in b ? a.ceiling === b.ceiling : "face" in a && "face" in b ? a.face.wall === b.face.wall && a.face.side === b.face.side : false;
}
/** A partial overlay may continue onto other records in its connected face run. */
function overlaysOnFace(plan, face) {
	return (plan.decor?.surfaces ?? []).flatMap((surface) => {
		const t = surface.target;
		if (!("face" in t)) return [];
		if (t.face.wall === face.wall && t.face.side === face.side) return [surface];
		if (!t.s) return [];
		try {
			const part = faceRun(plan, t.face).find((p) => p.face.wall === face.wall && p.face.side === face.side);
			if (!part) return [];
			const s = ordered(...t.s.map((v) => part.reversed ? part.s[1] - v : v - part.s[0]));
			return [{
				...surface,
				target: {
					...t,
					face,
					s
				}
			}];
		} catch {
			return [];
		}
	});
}
/** Point-wise finish query; omitted coordinates select only whole-face overrides. Last overlay wins. */
function resolveFinish(plan, target, opts = {}) {
	if (plan.decor && (opts.styleId !== void 0 || opts.keep === false)) plan = {
		...plan,
		decor: {
			...plan.decor,
			style: opts.styleId ?? plan.decor.style,
			surfaces: opts.keep === false ? [] : plan.decor.surfaces
		}
	};
	const override = [..."face" in target ? overlaysOnFace(plan, target.face) : plan.decor?.surfaces ?? []].reverse().find((s) => sameTarget(s.target, target) && (!("face" in s.target) || (!s.target.s || opts.s !== void 0 && opts.s >= s.target.s[0] && opts.s <= s.target.s[1]) && (!s.target.z || opts.z !== void 0 && opts.z >= s.target.z[0] && opts.z <= s.target.z[1])));
	const room = opts.room ?? ("floor" in target ? plan.rooms.find((r) => r.id === target.floor) : "ceiling" in target ? plan.rooms.find((r) => r.id === target.ceiling) : faceRoom(plan, target.face));
	const role = "ceiling" in target ? "ceiling" : "floor" in target && room?.floorOffset ? "stone.top" : roomRole(plan, room, "floor" in target ? "floor" : "wall");
	const material = materialOf(plan, override?.material ?? opts.material ?? styleOf(plan)?.roles[role] ?? styleOf(plan)?.roles["floor" in target ? "floor.main" : "ceiling" in target ? "ceiling" : "wall.main"]);
	return {
		styleMaterial: materialOf(plan, styleOf(plan)?.roles[role]),
		...override ? { surfaceItem: override } : {},
		material,
		materialId: material.id,
		overridden: !!override,
		...override ? {
			surface: override.id,
			by: override.by
		} : {},
		role
	};
}
var polyArea = (polys) => polys.reduce((sum, rings) => sum + polygonArea(rings[0]) - rings.slice(1).reduce((s, r) => s + polygonArea(r), 0), 0);
function previewPlan(plan, opts) {
	return plan.decor && (opts.styleId !== void 0 || opts.keep === false) ? {
		...plan,
		decor: {
			...plan.decor,
			style: opts.styleId ?? plan.decor.style,
			surfaces: opts.keep === false ? [] : plan.decor.surfaces
		}
	} : plan;
}
function resolveSurfaces(plan, opts = {}) {
	plan = previewPlan(plan, opts);
	const floors = [], ceilings = [], walls = [];
	for (const room of plan.rooms) for (const kind of ["floor", "ceiling"]) {
		const target = kind === "floor" ? { floor: room.id } : { ceiling: room.id }, finish = resolveFinish(plan, target, { room });
		(kind === "floor" ? floors : ceilings).push({
			kind,
			target,
			...finish,
			room: room.id,
			polygons: [[room.poly]],
			area: polygonArea(room.poly) / 1e6
		});
	}
	for (const w of plan.walls) for (const side of [1, -1]) {
		const face = {
			wall: w.id,
			side
		}, axis = faceAxis(plan, face), height = w.kind === "half" ? w.lowHeight ?? 1 : effectiveWallHeight(plan, w), adjacent = roomsBesideWall(plan, w.id)[side === 1 ? "positive" : "negative"];
		const overrides = overlaysOnFace(plan, face);
		const ss = [
			0,
			axis.length,
			...overrides.flatMap((s) => "face" in s.target ? s.target.s ?? [] : []),
			...adjacent.flatMap((r) => r.poly.map((p) => w.bulge ? projectToWall(w, p).s : dot$2(sub$1(p, w.a), wallDir(w))))
		].filter((s) => s >= 0 && s <= axis.length);
		const zs = [
			0,
			height,
			...overrides.flatMap((s) => "face" in s.target ? s.target.z ?? [] : [])
		].filter((z) => z >= 0 && z <= height);
		const sx = [...new Set(ss)].sort((a, b) => a - b), zz = [...new Set(zs)].sort((a, b) => a - b);
		const holes = plan.openings.filter((o) => o.wall === w.id).map((o) => [rectPoly({
			u: [o.offset, o.offset + o.width],
			z: [o.sill, o.head]
		})]);
		const intervals = faceIntervals(plan, face);
		for (let i = 1; i < sx.length; i++) for (let j = 1; j < zz.length; j++) {
			const s = [sx[i - 1], sx[i]], z = [zz[j - 1], zz[j]], mid = (s[0] + s[1]) / 2;
			const room = adjacent.find((r) => pointInPolygon(axis.at(mid, 1), r.poly)), target = {
				face,
				s,
				z
			};
			let polygons = intersection([[rectPoly({
				u: s,
				z
			})]], intervals.map((u) => [rectPoly({
				u,
				z: [0, height]
			})]));
			polygons = difference(polygons, holes);
			if (!polygons.length) continue;
			walls.push({
				kind: "wall",
				target,
				...resolveFinish(plan, { face }, {
					s: mid,
					z: (z[0] + z[1]) / 2,
					room
				}),
				...room ? { room: room.id } : {},
				polygons,
				area: polyArea(polygons) * axis.scale / 1e3
			});
		}
	}
	return {
		floors,
		walls,
		ceilings,
		all: [
			...floors,
			...walls,
			...ceilings
		]
	};
}
/** m²; disjoint overlays and opening unions are counted once. No purchasing/waste allowance. */
function materialTakeoff(plan, opts = {}) {
	plan = previewPlan(plan, opts);
	const quantities = /* @__PURE__ */ new Map(), add = (material, kind, area) => {
		const q = quantities.get(material.id) ?? {
			material,
			materialId: material.id,
			area: 0,
			floor: 0,
			wall: 0,
			ceiling: 0,
			panel: 0,
			cabinet: 0,
			countertop: 0,
			approximate: true,
			where: [],
			overridden: false,
			count: 0
		};
		q[kind] += Math.max(0, area);
		q.area += Math.max(0, area);
		quantities.set(material.id, q);
	};
	const surfaces = resolveSurfaces(plan).all;
	for (const s of surfaces) {
		let polygons = s.polygons;
		if ("face" in s.target) {
			const f = s.target.face, axis = faceAxis(plan, f), covers = [];
			for (const panel of plan.decor?.panels ?? []) try {
				const g = panelGeometry(plan, panel), member = faceRun(plan, g.span.face).find((p) => p.face.wall === f.wall && p.face.side === f.side);
				if (!member) continue;
				const pa = faceAxis(plan, g.span.face), u0 = Math.min(...g.span.s.map(pa.toU));
				const through = (plan.decor?.recesses ?? []).filter((r) => "panel" in r.host && r.host.panel === panel.id && r.depth === "through" && r.rect.u).map((r) => [rectPoly({
					u: r.rect.u,
					z: r.rect.z
				})]);
				const covering = difference(g.polygons, through);
				covers.push(...covering.map((rings) => rings.map((r) => r.map(([u, z]) => {
					const v = pa.toS(u0 + u);
					return [member.reversed ? member.s[1] - v : v - member.s[0], z];
				}))));
			} catch {}
			polygons = difference(polygons, covers);
			for (const recess of [...plan.decor?.recesses ?? []].reverse()) if ("face" in recess.host && recess.back && recess.rect.s && typeof recess.depth === "number" && recess.depth < axis.wall.thickness) try {
				const part = faceRun(plan, recess.host.face).find((p) => p.face.wall === f.wall && p.face.side === f.side);
				if (!part) continue;
				const patch = [[rectPoly({
					u: ordered(...recess.rect.s.map((v) => part.reversed ? part.s[1] - v : v - part.s[0])),
					z: recess.rect.z
				})]], covered = intersection(polygons, patch);
				add(materialOf(plan, recess.back), "wall", polyArea(covered) * axis.scale / 1e3);
				polygons = difference(polygons, patch);
			} catch {}
			add(s.material, s.kind, polyArea(polygons) * axis.scale / 1e3);
		} else add(s.material, s.kind, s.area);
	}
	for (const p of plan.decor?.panels ?? []) try {
		const g = panelGeometry(plan, p);
		add(materialOf(plan, p.material), "panel", polyArea(g.visiblePolygons) / 1e3);
		for (const r of plan.decor?.recesses ?? []) if ("panel" in r.host && r.host.panel === p.id && r.depth !== "through" && r.rect.u) add(materialOf(plan, r.back ?? p.material), "panel", polyArea(intersection(g.polygons, [[rectPoly({
			u: r.rect.u,
			z: r.rect.z
		})]])) / 1e3);
	} catch {}
	for (const cab of plan.decor?.cabinets ?? []) {
		const layout = layoutCabinet(cab);
		if (layout.issues.length) continue;
		const full = [[rectPoly({
			u: [0, cab.width],
			z: cab.z
		})]], holes = [...layout.cuts, ...(plan.decor?.recesses ?? []).filter((r) => "cabinet" in r.host && r.host.cabinet === cab.id && r.rect.u).map((r) => ({
			u: r.rect.u,
			z: r.rect.z,
			depth: r.depth
		}))];
		const through = holes.filter((h) => h.depth === "through").map((h) => [rectPoly(h)]), allCuts = holes.map((h) => [rectPoly(h)]), fronts = [];
		for (const part of layout.parts.filter((p) => p.kind === "front" || p.kind === "appliance")) {
			const visible = difference([[rectPoly(part)]], allCuts);
			fronts.push(...visible);
			if (part.kind === "front") add(materialOf(plan, part.material ?? cab.materials.front), "cabinet", polyArea(visible) / 1e3);
		}
		let carcass = difference(difference(full, through), fronts);
		for (const r of [...plan.decor?.recesses ?? []].reverse()) if ("cabinet" in r.host && r.host.cabinet === cab.id && r.depth !== "through" && r.back && r.rect.u) {
			const patch = [[rectPoly({
				u: r.rect.u,
				z: r.rect.z
			})]], covered = intersection(carcass, patch);
			add(materialOf(plan, r.back), "cabinet", polyArea(covered) / 1e3);
			carcass = difference(carcass, patch);
		}
		add(materialOf(plan, cab.materials.carcass), "cabinet", polyArea(carcass) / 1e3);
		for (const top of layout.parts.filter((p) => p.kind === "top")) add(materialOf(plan, top.material), "countertop", (top.u[1] - top.u[0]) * (top.depth[1] - top.depth[0]) / 1e6);
	}
	for (const q of quantities.values()) {
		const matching = surfaces.filter((s) => s.materialId === q.materialId);
		const panels = (plan.decor?.panels ?? []).filter((p) => p.material === q.materialId);
		const cabinets = (plan.decor?.cabinets ?? []).filter((c) => c.materials.front === q.materialId);
		const roomName = (id) => id ? plan.rooms.find((r) => r.id === id)?.name ?? id : void 0;
		const location = (item, seen = /* @__PURE__ */ new Set()) => {
			if (seen.has(item.id)) return void 0;
			seen.add(item.id);
			try {
				const span = itemSpan(plan, item);
				if (span) return wallLocation(plan, span.face, decorRoom(plan, item), (span.s[0] + span.s[1]) / 2);
			} catch {}
			if ("host" in item && !("face" in item.host) && plan.decor) {
				const id = "panel" in item.host ? item.host.panel : item.host.cabinet, parent = decorItems(plan.decor).find((i) => i.id === id);
				if (parent) return location(parent, seen);
			}
			return roomName(decorRoom(plan, item));
		};
		const faceName = (face, room, s) => wallLocation(plan, face, room, s);
		q.where = [.../* @__PURE__ */ new Set([
			...matching.map((s) => "face" in s.target ? faceName(s.target.face, s.room, s.target.s ? (s.target.s[0] + s.target.s[1]) / 2 : void 0) : `${roomName(s.room) ?? s.room ?? "未命名房间"}${s.kind === "ceiling" ? "顶面" : "地面"}`),
			...panels.map((p) => {
				try {
					const sp = panelSpan(plan, p);
					return `${faceName(sp.face, decorRoom(plan, p), (sp.s[0] + sp.s[1]) / 2)}·${p.name ?? p.id}`;
				} catch {
					return `${p.id}（宿主缺失）`;
				}
			}),
			...(plan.decor?.cabinets ?? []).filter((c) => [
				c.materials.front,
				c.materials.carcass,
				...layoutCabinet(c).parts.map((p) => p.material)
			].includes(q.materialId)).map((c) => `${location(c) ?? ("face" in c.place ? faceName(c.place.face, void 0, c.place.s + c.width / 2) : `楼层${c.level ?? "L1"}`)}·${c.name ?? c.id}`),
			...(plan.decor?.recesses ?? []).filter((r) => r.back === q.materialId).map((r) => `${location(r) ?? ("face" in r.host ? faceName(r.host.face) : "宿主" + ("panel" in r.host ? r.host.panel : r.host.cabinet))}·${r.name ?? r.id}`)
		])];
		q.overridden = matching.some((s) => s.overridden) || panels.some((p) => p.material !== styleOf(plan)?.roles["wall.accent"]);
		q.count = cabinets.length;
	}
	return [...quantities.values()].sort((a, b) => a.materialId.localeCompare(b.materialId));
}
/** Longest adjacent room wins for a whole-face query; point queries can pass opts.room. */
function faceRoom(plan, face) {
	const w = plan.walls.find((w) => w.id === face.wall);
	if (!w) return void 0;
	const rooms = roomsBesideWall(plan, w.id)[face.side === 1 ? "positive" : "negative"], axis = faceAxis(plan, face);
	const length = (r) => {
		const ss = r.poly.filter((p) => Math.abs(dot$2(sub$1(p, axis.at(0)), axis.normal)) < 30).map((p) => Math.max(0, Math.min(axis.length, dot$2(sub$1(p, w.a), wallDir(w)))));
		return ss.length ? Math.max(...ss) - Math.min(...ss) : 0;
	};
	return [...rooms].sort((a, b) => length(b) - length(a) || polygonArea(b.poly) - polygonArea(a.poly))[0];
}
/** Direction is from the room toward the wall, rotated by plan.north when present. */
function wallLocation(plan, face, room, s) {
	if (!plan.walls.some((w) => w.id === face.wall)) return `${face.wall}（宿主缺失）`;
	const axis = faceAxis(plan, face), n = axis.normalAt(s ?? axis.length / 2);
	const angle = ((Math.atan2(-n[0], n[1]) * 180 / Math.PI - (plan.north ?? 0)) % 360 + 360) % 360;
	const direction = (plan.north === void 0 ? [
		"上",
		"右",
		"下",
		"左"
	] : [
		"北",
		"东",
		"南",
		"西"
	])[Math.round(angle / 90) % 4];
	const name = room ? plan.rooms.find((r) => r.id === room)?.name ?? room : void 0;
	return name ? `${name}${direction}墙` : `${axis.wall.name ?? axis.wall.id}（${face.side === 1 ? "正侧" : "反侧"}·${direction}）`;
}
// src/core/decor/embed.ts
function wallEmbed(plan, item) {
	if ("host" in item) return "face" in item.host && item.rect.s ? {
		id: item.id,
		face: item.host.face,
		s: item.rect.s,
		z: item.rect.z,
		depth: item.depth
	} : void 0;
	if (!item.embed) return void 0;
	if ("place" in item) return "face" in item.place ? {
		id: item.id,
		face: item.place.face,
		s: [item.place.s, item.place.s + item.width],
		z: item.z,
		depth: item.embed
	} : void 0;
	if (!item.against) return void 0;
	const wall = faceWall(plan, item.against.face), ss = furnitureFootprint(item, plan).map((p) => dot$2(sub$1(p, wall.a), wallDir(wall)));
	return {
		id: item.id,
		face: item.against.face,
		s: [Math.min(...ss), Math.max(...ss)],
		z: [item.z ?? 0, (item.z ?? 0) + item.height],
		depth: item.embed
	};
}
function embedsOf(plan, decor) {
	return [
		...decor.recesses,
		...decor.cabinets,
		...decor.furniture
	].flatMap((item) => {
		try {
			const e = wallEmbed(plan, item);
			return e ? [e] : [];
		} catch {
			return [];
		}
	});
}
function embedFootprint(plan, e) {
	const a = faceAxis(plan, e.face), depth = e.depth === "through" ? a.wall.thickness : e.depth;
	return [
		a.at(e.s[0]),
		a.at(e.s[1]),
		a.at(e.s[1], -depth),
		a.at(e.s[0], -depth)
	];
}
function protectedFact(id, host, label) {
	const certainty = host.evidence?.certainty ?? "unknown";
	return {
		id,
		code: "protected",
		level: "warn",
		text: `这面在方案里标为${label}（${certainty === "seen" ? "读图看到" : certainty === "inferred" ? "读图推断，没确认" : "读图把握程度未知"}）。嵌入、挖槽能不能做、能挖多深，需要专业人员到现场确认。`
	};
}
/** Geometry errors block the edit; protected facts are warnings only. Pass source plan to preserve original protection. */
function checkEmbed(plan, decor, item, originalPlan = plan) {
	const issues = [], issue = (code, text) => issues.push({
		id: item.id,
		code,
		level: "error",
		text
	});
	const requestedDepth = "host" in item ? item.depth : item.embed;
	if (requestedDepth !== void 0 && requestedDepth !== "through" && (!Number.isFinite(requestedDepth) || requestedDepth < 0 || "host" in item && requestedDepth === 0)) {
		issue("invalid", "嵌入深度必须是有效正数");
		return issues;
	}
	if ("host" in item && !("face" in item.host)) {
		const host = "panel" in item.host ? decor.panels.find((p) => p.id === item.host.panel) : decor.cabinets.find((c) => c.id === item.host.cabinet);
		if (!host) {
			issue("host-missing", "挖洞的造型或柜体不存在，没地方挂了");
			return issues;
		}
		const thickness = "thickness" in host ? host.type === "slats" ? host.slats?.depth ?? host.thickness : host.thickness : host.depth;
		if (item.depth !== "through" && item.depth > thickness) issue("host-depth", `宿主只有 ${thickness} mm 厚，要挖墙请按墙面嵌入处理`);
		const span = "thickness" in host ? panelSpan(plan, host) : void 0;
		const width = span ? span.s[1] - span.s[0] : host.width, z = span?.z ?? host.z;
		if (!item.rect.u || item.rect.u[0] < 0 || item.rect.u[1] > width || item.rect.z[0] < z[0] || item.rect.z[1] > z[1]) issue("out-of-face", "挖洞范围超出宿主");
		return issues;
	}
	let e;
	try {
		e = wallEmbed(plan, item);
	} catch {
		issue("host-missing", "宿主墙不存在，没地方挂了");
		return issues;
	}
	if (!e) {
		if ("embed" in item && item.embed) issue("host-missing", "嵌入需要指定靠墙的墙面");
		return issues;
	}
	let wall;
	try {
		wall = faceWall(plan, e.face);
	} catch {
		issue("host-missing", "宿主墙不存在，没地方挂了");
		return issues;
	}
	if (wall.bulge) {
		issue("arc-unsupported", "弧墙暂只支持整面材质，嵌入暂不支持");
		return issues;
	}
	const run = faceRun(plan, e.face), lo = run[0].s[0], hi = run[run.length - 1].s[1];
	if (e.s[0] < lo - 1e-5 || e.s[1] > hi + 1e-5 || e.z[0] < 0) issue("out-of-face", "超出这面墙了");
	const axis = faceAxis(plan, e.face), covered = run.filter((p) => overlap(p.s, e.s));
	for (const part of covered) {
		const w = part.wall, depth = e.depth === "through" ? w.thickness : e.depth, extent = faceExtent(plan, part.face), visible = ordered(runS(part, extent[0]), runS(part, extent[1]));
		if (faceIntervals(plan, part.face).map((v) => ordered(runS(part, v[0]), runS(part, v[1]))).reduce((sum, v) => sum + Math.max(0, Math.min(v[1], e.s[1]) - Math.max(v[0], e.s[0])), 0) < Math.min(part.s[1], e.s[1]) - Math.max(part.s[0], e.s[0]) - .01 || Math.max(e.s[0], part.s[0]) < visible[0] - .01 || Math.min(e.s[1], part.s[1]) > visible[1] + .01 || e.z[1] > effectiveWallHeight(plan, w) + 1e-7) issue("out-of-face", "超出这面墙看得见的范围或墙高了");
		if (depth >= w.thickness) issue("through-wall", `挖到 ${w.thickness} mm 就穿了；请到改造里开洞，添加结构洞口`);
		if (w.kind === "glass" || ["half", "half-glass"].includes(w.kind) && e.z[1] > (w.lowHeight ?? 1)) issue("wall-kind", w.kind === "glass" ? "玻璃隔断上挖不了" : `矮墙实体只有 ${w.lowHeight ?? 1} m 高`);
		for (const o of plan.openings.filter((o) => o.wall === w.id)) if (overlap(e.s, ordered(runS(part, o.offset), runS(part, o.offset + o.width))) && overlap(e.z, [o.sill, o.head])) issue("over-opening", `这里是${o.kind.includes("window") ? "窗洞" : "门洞"} ${o.id}`);
		const protectedWall = [w, originalPlan.walls.find((v) => v.id === w.id) ?? originalPlan.walls.filter((v) => w.id.startsWith(`${v.id}~`)).sort((a, b) => b.id.length - a.id.length)[0]].find((v) => v && ["bearing", "exterior"].includes(v.kind));
		if (protectedWall) issues.push(protectedFact(item.id, protectedWall, protectedWall.kind === "exterior" ? "外墙" : "承重墙"));
	}
	for (const other of embedsOf(plan, decor)) {
		if (other.id === item.id || !overlap(e.z, other.z)) continue;
		const ow = faceWall(plan, other.face);
		if (levelOf(plan, ow).id !== levelOf(plan, wall).id || ow.bulge) continue;
		const oa = faceAxis(plan, other.face);
		if (dot$2(axis.normal, oa.normal) > -.999999) continue;
		const shared = covered.find((p) => p.wall.id === ow.id) ?? covered.find((p) => faceRun(plan, other.face).some((q) => q.wall.id === p.wall.id));
		if (!shared) continue;
		const projected = ordered(...other.s.map((s) => oa.at(s)).map((p) => dot$2(sub$1(p, wall.a), wallDir(wall))));
		const depth = e.depth === "through" ? shared.wall.thickness : e.depth, otherDepth = other.depth === "through" ? shared.wall.thickness : other.depth;
		if (overlap(e.s, projected) && depth + otherDepth >= shared.wall.thickness) issue("meet-other-side", `这面墙另一侧也挖了 ${otherDepth} mm，两边合计 ${depth + otherDepth} mm，达到或超过墙厚 ${shared.wall.thickness} mm`);
	}
	const footprint = embedFootprint(plan, e), intersects = (poly) => intersection([[footprint]], [[poly]]).some((r) => polygonArea(r[0]) > 1e-6);
	for (const s of plan.shafts ?? []) if (levelOf(plan, s).id === levelOf(plan, wall).id && intersects(s.poly)) issue("into-shaft", `这里是管道井 / 烟道 ${s.id} 的位置`);
	for (const c of plan.columns ?? []) {
		const original = originalPlan.columns?.find((v) => v.id === c.id), protectedColumn = c.kind === "bearing" ? c : original?.kind === "bearing" ? original : void 0;
		if (protectedColumn && levelOf(plan, c).id === levelOf(plan, wall).id && intersects(columnFootprint(c))) issues.push(protectedFact(item.id, protectedColumn, "承重柱"));
	}
	return issues.filter((i, n) => issues.findIndex((j) => j.code === i.code && j.text === i.text) === n);
}
// src/core/decor/validate.ts
var finite$2 = (x) => typeof x === "number" && Number.isFinite(x);
var point$2 = (x) => Array.isArray(x) && x.length === 2 && x.every(finite$2);
var interval = (x) => point$2(x) && x[1] > x[0];
var obj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
var face = (x) => obj(x) && typeof x.wall === "string" && [1, -1].includes(x.side);
var span = (x) => obj(x) && face(x.face) && interval(x.s) && interval(x.z);
var positive = (x) => finite$2(x) && x > 0;
var depth = (x) => x === "through" || positive(x);
var optional = (x, check) => x === void 0 || check(x);
var roles = [
	"floor.main",
	"floor.wet",
	"floor.outdoor",
	"threshold",
	"wall.main",
	"wall.wet",
	"wall.accent",
	"ceiling",
	"skirting",
	"wood.main",
	"cabinet.front",
	"cabinet.carcass",
	"stone.top",
	"metal",
	"fabric.main",
	"fabric.accent",
	"rug"
];
function validateDecorData(plan, decor = plan.decor, originalPlan = plan) {
	if (decor === void 0) return [];
	const issues = [], add = (id, code, text, level = "error") => issues.push({
		id,
		code,
		level,
		text
	});
	const invalid = (id, text) => add(id, "invalid", text);
	if (!obj(decor) || decor.version !== 1 || typeof decor.style !== "string") {
		invalid("decor", "装修层必须是 version=1 的对象，并指定 style");
		return issues;
	}
	for (const k of [
		"materials",
		"surfaces",
		"furniture",
		"cabinets",
		"panels",
		"recesses"
	]) if (!Array.isArray(decor[k])) invalid("decor", `${k} 必须为数组`);
	if (!optional(decor.presets, Array.isArray)) invalid("decor", "presets 必须为数组");
	if (issues.length) return issues;
	const structural = [
		...plan.walls,
		...plan.openings,
		...plan.beams,
		...plan.rooms,
		...plan.questions,
		...plan.changes,
		...plan.levels ?? [],
		...plan.columns ?? [],
		...plan.shafts ?? [],
		...plan.stairs ?? [],
		...plan.voids ?? []
	];
	const seen = new Set(structural.map((e) => e.id)), levelIds = levelsOf(plan).map((l) => l.id);
	const groups = {
		materials: decor.materials,
		presets: decor.presets ?? [],
		surfaces: decor.surfaces,
		furniture: decor.furniture,
		cabinets: decor.cabinets,
		panels: decor.panels,
		recesses: decor.recesses
	};
	for (const [key, items] of Object.entries(groups)) for (const e of items) {
		if (!obj(e) || typeof e.id !== "string" || !e.id) {
			invalid("decor", `${key} 条目需要有效 id`);
			continue;
		}
		if (seen.has(e.id)) add(e.id, "duplicate-id", `重复 id：${e.id}`);
		seen.add(e.id);
		if (!["materials", "presets"].includes(key) && (!["user", "agent"].includes(e.by) || !["pending", "confirmed"].includes(e.status))) invalid(e.id, "构件必须指定 by 和 status");
		if (e.level !== void 0 && !levelIds.includes(e.level)) invalid(e.id, "楼层不存在");
		if (e.ack !== void 0 && (!obj(e.ack) || typeof e.ack.by !== "string")) invalid(e.id, "ack 需要 by");
	}
	if (issues.some((i) => i.code === "invalid")) return issues;
	const materialIds = new Set(decor.materials.map((m) => m.id)), mat = (id, value) => {
		if (typeof value !== "string" || !materialIds.has(value)) add(id, "material-missing", `材料 ${String(value)} 未保存在 decor.materials`);
	};
	for (const m of decor.materials) {
		if (typeof m.name !== "string" || ![
			"wood-floor",
			"tile",
			"stone",
			"paint",
			"texture-paint",
			"wallpaper",
			"veneer",
			"microcement",
			"laminate",
			"fabric",
			"leather",
			"metal",
			"glass",
			"rattan",
			"other"
		].includes(m.category) || typeof m.color !== "string" || !/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(m.color)) invalid(m.id, "材料名称、分类或 sRGB 十六进制颜色无效");
		if (m.texture && (!obj(m.texture) || ![
			"planks",
			"tiles",
			"herringbone",
			"grain",
			"speckle",
			"veins",
			"weave"
		].includes(m.texture.kind) || !optional(m.texture.size, (x) => point$2(x) && x.every(positive)) || !optional(m.texture.joint, (x) => finite$2(x) && x >= 0))) invalid(m.id, "材料纹理参数无效");
		if (m.pbr) {
			if (!obj(m.pbr)) invalid(m.id, "PBR 必须是对象");
			for (const v of [
				m.pbr.roughness,
				m.pbr.metalness,
				m.pbr.sheen
			]) if (!optional(v, (x) => finite$2(x) && x >= 0 && x <= 1)) invalid(m.id, "PBR 系数须在 0–1");
			if (m.pbr.maps && !obj(m.pbr.maps)) invalid(m.id, "贴图必须是本地路径对象");
			for (const path of Object.values(m.pbr.maps ?? {})) if (typeof path !== "string" || !path.trim() || /^(?:[a-z][a-z\d+.-]*:|[/\\])/i.test(path.trim())) invalid(m.id, "贴图只能是本地相对路径，禁止远程地址、协议和绝对路径");
		}
	}
	for (const p of decor.presets ?? []) {
		if (typeof p.name !== "string" || !obj(p.roles) || Object.keys(p.roles).some((r) => !roles.includes(r))) {
			invalid(p.id, "风格名称或材料角色无效");
			continue;
		}
		Object.values(p.roles).forEach((v) => mat(p.id, v));
		if (p.rooms && (!Array.isArray(p.rooms) || p.rooms.some((r) => !obj(r) || !Array.isArray(r.match) || !r.match.every((x) => typeof x === "string") || r.floor && !roles.includes(r.floor) || r.wall && !roles.includes(r.wall)))) invalid(p.id, "房间材料规则无效");
	}
	if (![...STYLE_PRESETS, ...decor.presets ?? []].some((s) => s.id === decor.style)) invalid("decor", "整体风格不存在");
	for (const s of decor.surfaces) {
		const t = s.target;
		if (!obj(t) || Object.keys(t).filter((k) => [
			"floor",
			"ceiling",
			"face"
		].includes(k)).length !== 1 || ("face" in t ? !face(t.face) || !optional(t.s, interval) || !optional(t.z, interval) : !("floor" in t || "ceiling" in t))) invalid(s.id, "面的覆盖需要一种有效目标及递增区间");
		mat(s.id, s.material);
		if (s.layout && (![
			"straight",
			"staggered",
			"herringbone",
			"chevron",
			"grid",
			"diagonal"
		].includes(s.layout.pattern) || !optional(s.layout.size, (x) => point$2(x) && x.every(positive)) || !optional(s.layout.origin, point$2) || !optional(s.layout.angle, finite$2))) invalid(s.id, "铺法参数无效");
	}
	for (const f of decor.furniture) {
		if (typeof f.type !== "string" || (f.in !== void 0 ? typeof f.in !== "string" || !f.in || f.at !== void 0 : !point$2(f.at)) || !point$2(f.size) || !f.size.every(positive) || !positive(f.height) || !(f.in ? optional(f.rot, finite$2) : finite$2(f.rot)) || !optional(f.z, finite$2) || !optional(f.embed, (x) => finite$2(x) && x >= 0) || f.against && (!face(f.against.face) || !finite$2(f.against.gap) || f.against.gap < 0)) invalid(f.id, "家具位置、尺寸、高度、旋转或靠墙参数无效");
		Object.values(f.materials ?? {}).forEach((v) => mat(f.id, v));
	}
	for (const c of decor.cabinets) {
		if (![
			"tall",
			"base",
			"wall"
		].includes(c.family) || !obj(c.place) || ("face" in c.place ? !face(c.place.face) || !finite$2(c.place.s) || !optional(c.place.gap, (x) => finite$2(x) && x >= 0) : !("at" in c.place) || !point$2(c.place.at) || !finite$2(c.place.rot)) || !positive(c.width) || !positive(c.depth) || !interval(c.z) || !optional(c.plinth, (x) => finite$2(x) && x >= 0) || !optional(c.embed, (x) => finite$2(x) && x >= 0) || !Array.isArray(c.columns) || !obj(c.materials)) {
			invalid(c.id, "柜体位置、尺寸、分列或材料无效");
			continue;
		}
		mat(c.id, c.materials.carcass);
		mat(c.id, c.materials.front);
		if (c.top && (!positive(c.top.thickness) || !optional(c.top.overhang, (x) => finite$2(x) && x >= 0))) invalid(c.id, "台面尺寸无效");
		if (c.top) mat(c.id, c.top.material);
		if (c.cuts && (!Array.isArray(c.cuts) || c.cuts.some((x) => !obj(x) || !interval(x.u) || !interval(x.z) || !depth(x.depth)))) invalid(c.id, "柜体挖洞参数无效");
		for (const col of c.columns) {
			if (!obj(col) || !optional(col.width, positive) || !Array.isArray(col.cells)) {
				invalid(c.id, "柜列参数无效");
				continue;
			}
			for (const cell of col.cells) {
				if (!obj(cell) || ![
					"door",
					"doors",
					"drawers",
					"flap",
					"open",
					"void",
					"appliance"
				].includes(cell.type) || !optional(cell.h, positive) || !optional(cell.count, (x) => Number.isInteger(x) && x >= 0 && x <= 1e3) || !optional(cell.hinge, (x) => ["left", "right"].includes(x))) {
					invalid(c.id, "柜格参数无效");
					continue;
				}
				if (cell.void && (!obj(cell.void) || !depth(cell.void.depth) || cell.void.top && !finite$2(cell.void.top.z))) invalid(c.id, "柜格挖洞参数无效");
				if (cell.appliance && (!obj(cell.appliance) || ![
					"fridge",
					"washer",
					"dryer",
					"oven",
					"steamer",
					"dishwasher",
					"microwave",
					"tv",
					"other"
				].includes(cell.appliance.type) || !optional(cell.appliance.size, (x) => Array.isArray(x) && x.length === 3 && x.every(positive)))) invalid(c.id, "家电位参数无效");
				if (cell.material) mat(c.id, cell.material);
				if (cell.void?.top?.material) mat(c.id, cell.void.top.material);
			}
		}
	}
	for (const p of decor.panels) {
		if (![
			"feature",
			"wainscot",
			"slats",
			"skirting",
			"arch"
		].includes(p.type) || !positive(p.thickness) || (p.type === "arch" ? typeof p.opening !== "string" || !optional(p.span, span) : !span(p.span))) invalid(p.id, "造型类型、厚度或宿主区间无效");
		if (p.grooves && (!["v", "h"].includes(p.grooves.dir) || !positive(p.grooves.spacing) || !optional(p.grooves.width, positive))) invalid(p.id, "分缝参数无效");
		if (p.slats && (!positive(p.slats.width) || !finite$2(p.slats.gap) || p.slats.gap < 0 || !positive(p.slats.depth))) invalid(p.id, "格栅尺寸无效");
		if (p.frame && (!["flat", "raised"].includes(p.frame.style) || !positive(p.frame.margin))) invalid(p.id, "框线参数无效");
		if (p.arch && !optional(p.arch.radius, positive)) invalid(p.id, "拱半径无效");
		mat(p.id, p.material);
	}
	for (const r of decor.recesses) {
		if (!obj(r.host) || Object.keys(r.host).length !== 1 || !obj(r.rect) || !interval(r.rect.z) || !depth(r.depth) || ("face" in r.host ? !face(r.host.face) || !interval(r.rect.s) || r.rect.u !== void 0 || r.kind !== "niche" : !("panel" in r.host || "cabinet" in r.host) || !interval(r.rect.u) || r.rect.s !== void 0 || r.kind !== "hole")) invalid(r.id, "壁龛 / 挖洞的宿主、类型、区间或深度无效");
		if (r.shelves && (!Array.isArray(r.shelves) || r.shelves.some((h) => !finite$2(h) || h <= r.rect.z[0] || h >= r.rect.z[1]))) invalid(r.id, "层板须在壁龛高度内");
		if (r.back) mat(r.id, r.back);
		if (r.trim) mat(r.id, r.trim);
	}
	if (decor.cache && (!obj(decor.cache) || Object.values(decor.cache).some((c) => !obj(c) || !Array.isArray(c.box) || c.box.length !== 4 || !c.box.every(finite$2) || c.face && (!Array.isArray(c.face) || c.face.length !== 2 || !c.face.every(point$2))))) invalid("decor", "cache 几何无效");
	for (const c of Object.values(decor.cache ?? {})) {
		if (c.pose && (!point$2(c.pose.at) || !finite$2(c.pose.rot) || !finite$2(c.pose.z))) invalid("decor", "cache.pose 几何无效");
		if (c.anchor && (typeof c.anchor.wall !== "string" || !point$2(c.anchor.a) || !point$2(c.anchor.b))) invalid("decor", "cache.anchor 几何无效");
	}
	if (issues.some((i) => i.code === "invalid")) return issues;
	const checkSpan = (id, sp, embedded = false) => {
		try {
			const f = faceFrame(plan, sp), run = faceRun(plan, sp.face);
			if (sp.z[0] < 0 || run.filter((p) => overlap(p.s, sp.s)).some((p) => {
				const e = faceExtent(plan, p.face), s = ordered(runS(p, e[0]), runS(p, e[1]));
				return Math.max(sp.s[0], p.s[0]) < s[0] - .01 || Math.min(sp.s[1], p.s[1]) > s[1] + .01 || sp.z[1] > effectiveWallHeight(plan, p.wall) + 1e-7;
			})) add(id, "out-of-face", "超出这面墙看得见的范围或墙高了");
			if (embedded && (f.wall.kind === "glass" || ["half", "half-glass"].includes(f.wall.kind) && sp.z[1] > (f.wall.lowHeight ?? 1))) add(id, "wall-kind", "玻璃或矮墙实体范围无法容纳这件柜子");
			if (embedded) {
				for (const part of run) for (const o of plan.openings.filter((o) => o.wall === part.wall.id)) if (overlap(sp.s, ordered(runS(part, o.offset), runS(part, o.offset + o.width))) && overlap(sp.z, [o.sill, o.head])) add(id, "over-opening", `柜子与洞口 ${o.id} 重叠`);
			}
		} catch (e) {
			add(id, e.code ?? "invalid", e.message);
		}
	};
	for (const p of decor.panels) try {
		checkSpan(p.id, panelSpan(plan, p));
	} catch (e) {
		add(p.id, "host-missing", e.message);
	}
	for (const c of decor.cabinets) {
		issues.push(...layoutCabinet(c).issues);
		if ("face" in c.place) checkSpan(c.id, {
			face: c.place.face,
			s: [c.place.s, c.place.s + c.width],
			z: c.z
		}, true);
	}
	for (const item of [
		...decor.recesses,
		...decor.cabinets,
		...decor.furniture
	]) try {
		issues.push(...checkEmbed(plan, decor, item, originalPlan));
	} catch (e) {
		add(item.id, "host-missing", e.message);
	}
	for (const f of decor.furniture) {
		if (f.against && !plan.walls.some((w) => w.id === f.against.face.wall)) add(f.id, "host-missing", "靠墙家具的墙没了，保留原地", "info");
		if (f.in && furniturePose({
			...plan,
			decor
		}, f).missing) add(f.id, "host-missing", `家具宿主 ${f.in} 不存在`);
	}
	for (const s of decor.surfaces) if ("face" in s.target) {
		const t = s.target, w = plan.walls.find((w) => w.id === t.face.wall);
		if (!w) add(s.id, "host-missing", "墙面不存在");
		else if (w.bulge && (t.s || t.z)) add(s.id, "arc-unsupported", "弧墙暂只支持整面材质");
		else if (t.s || t.z) checkSpan(s.id, {
			face: t.face,
			s: t.s ?? faceExtent(plan, t.face),
			z: t.z ?? [0, effectiveWallHeight(plan, w)]
		});
	} else if (!plan.rooms.some((r) => r.id === ("floor" in s.target ? s.target.floor : "ceiling" in s.target ? s.target.ceiling : ""))) add(s.id, "room-missing", "房间删了或合并了，覆盖退回风格默认", "info");
	return issues.filter((i, n) => issues.findIndex((j) => j.id === i.id && j.code === i.code && j.text === i.text) === n);
}
/** Imported JSON is untrusted: malformed nested fields are diagnostics, never exceptions. */
function validateDecorRaw(plan, decor = plan.decor, originalPlan = plan) {
	try {
		return validateDecorData(plan, decor, originalPlan);
	} catch (error) {
		return [{
			id: "decor",
			code: "invalid",
			level: "error",
			text: `装修数据结构无效：${error instanceof Error ? error.message : String(error)}`
		}];
	}
}
/** Host diagnostics use the same resolution as the status UI; malformed input stays diagnostic-only. */
function validateDecor(plan, decor = plan.decor, originalPlan = plan) {
	const raw = validateDecorRaw(plan, decor, originalPlan);
	if (raw.some((i) => i.code === "invalid") || !decor) return raw;
	try {
		return originalPlan !== plan ? resolveDecor({
			...originalPlan,
			decor
		}, plan).issues : decorStatus({
			...plan,
			decor
		}).issues;
	} catch {
		return raw;
	}
}
// src/core/decor/integration.ts
function decorStats(plan) {
	const d = plan.decor;
	if (!d) return void 0;
	const after = plan.legacy?.__structureReplayFrame ? plan : applyChanges(plan, plan.changes.filter((c) => c.status === "confirmed")).plan;
	const resolved = resolveDecor(plan, after);
	return {
		furniture: d.furniture.length,
		cabinets: d.cabinets.length,
		panels: d.panels.length,
		recesses: d.recesses.length,
		surfaces: d.surfaces.length,
		materials: d.materials.length,
		pending: decorItems(d).filter((x) => x.status === "pending").length,
		total: decorItems(d).length,
		issues: resolved.issues.length,
		materialAreas: materialTakeoff({
			...after,
			decor: resolved.decor
		})
	};
}
/** Only confirmed structural changes are the decor host context; never replay a changed view twice. */
function validatePlanDecor(plan) {
	if (plan.decor === void 0) return [];
	const shape = validateDecor(plan).filter((i) => [
		"invalid",
		"duplicate-id",
		"material-missing"
	].includes(i.code));
	if (shape.some((i) => i.code === "invalid")) return shape;
	return resolveDecor(plan, plan.legacy?.__structureReplayFrame ? plan : applyChanges(plan, plan.changes.filter((c) => c.status === "confirmed")).plan).issues;
}
// src/core/questions.ts
var QUESTION_STATUSES = [
	"open",
	"answered",
	"resolved"
];
var QUESTION_OUTCOMES = [
	"changed",
	"confirmed",
	"inferred",
	"noted",
	"ask",
	"withdrawn"
];
function questionStatus(q) {
	if (QUESTION_STATUSES.includes(q.status)) return q.status;
	if (!q.answer?.trim()) return "open";
	if (!q.reply) return "answered";
	return q.reply.outcome === "ask" ? "open" : "resolved";
}
function questionCounts(plan) {
	const counts = {
		open: 0,
		answered: 0,
		resolved: 0
	};
	for (const q of plan.questions) counts[questionStatus(q)]++;
	return counts;
}
function answerQuestion(q, text, by, at) {
	text = text.trim();
	if (!text) throw new Error(`问题卡 ${q.id}：答复不能为空，请填写答复`);
	const next = { ...q };
	if (q.reply) {
		next.log = [...q.log ?? []];
		if (q.answer?.trim()) next.log.push({
			role: "user",
			text: q.answer,
			by: q.answeredBy,
			at: q.answeredAt
		});
		next.log.push({
			role: "agent",
			...q.reply,
			...q.reply.changed ? { changed: [...q.reply.changed] } : {}
		});
		delete next.reply;
	}
	return {
		...next,
		answer: text,
		answeredBy: by,
		answeredAt: at,
		status: "answered"
	};
}
function resolveQuestion(q, { outcome, text, changed, by = "Agent", at }) {
	const status = questionStatus(q);
	if (!QUESTION_OUTCOMES.includes(outcome)) throw new Error(`问题卡 ${q.id}：不认识处理结果 ${outcome}，请使用 ${QUESTION_OUTCOMES.join("、")}`);
	if (status !== "answered" && !(outcome === "withdrawn" && status === "open")) throw new Error(`问题卡 ${q.id}：现在是 ${status}（${status === "open" ? "待回答" : "已处理"}），请先记录用户答复，status 变为 answered 后再处理${status === "open" ? "；不用再问可用 withdrawn 撤回" : ""}`);
	text = text.trim();
	if (!text) throw new Error(`问题卡 ${q.id}：回复不能为空，请说明处理结果`);
	return {
		...q,
		status: outcome === "ask" ? "open" : "resolved",
		reply: {
			outcome,
			text,
			...changed ? { changed: [...new Set(changed)] } : {},
			by,
			at
		}
	};
}
/** 包括原始构件及成功改造产生的构件（即使后续又移除）。 */
function questionElementIds(plan) {
	const ids = new Set(Object.keys(collection).flatMap((type) => elements(plan, type).map((e) => e.id)));
	if (plan.changes.length) {
		for (const r of applyChanges(plan, plan.changes).results) if (r.ok) for (const id of r.affected) ids.add(id);
	}
	return ids;
}
// src/core/validate.ts
var WALL_KINDS = [
	"exterior",
	"bearing",
	"partition",
	"glass",
	"half",
	"half-glass"
];
var OPENING_KINDS = [
	"door",
	"sliding",
	"doorway",
	"window",
	"floor-window",
	"bay-window",
	"open-balcony"
];
var finite$1 = (x) => typeof x === "number" && Number.isFinite(x);
var point$1 = (p) => Array.isArray(p) && p.length === 2 && p.every(finite$1);
function intersects$1(a, b, c, d) {
	const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
	const on = (p, q, r) => Math.abs(cross(p, q, r)) < 1e-7 && r[0] >= Math.min(p[0], q[0]) && r[0] <= Math.max(p[0], q[0]) && r[1] >= Math.min(p[1], q[1]) && r[1] <= Math.max(p[1], q[1]);
	const x = cross(a, b, c), y = cross(a, b, d), z = cross(c, d, a), w = cross(c, d, b);
	return x * y < 0 && z * w < 0 || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
}
function invalidPolygon(poly) {
	if (polygonArea(poly) < 1e-7) return true;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i], b = poly[(i + 1) % poly.length];
		if (a[0] === b[0] && a[1] === b[1]) return true;
		for (let j = i + 1; j < poly.length; j++) if (j !== i + 1 && !(i === 0 && j === poly.length - 1) && intersects$1(a, b, poly[j], poly[(j + 1) % poly.length])) return true;
	}
	return false;
}
function validatePlan(plan) {
	const issues = [], error = (code, message, ref) => issues.push({
		level: "error",
		code,
		message,
		...ref ? { ref } : {}
	});
	if (!plan || typeof plan !== "object") {
		error("shape", "方案必须是对象");
		return issues;
	}
	if (plan.format !== "floorplan-structure" || plan.version !== 2) error("format", "方案必须使用 floorplan-structure v2");
	if (typeof plan.title !== "string" || !finite$1(plan.ceiling) || plan.ceiling <= 0) error("plan", "方案标题或层高无效");
	for (const k of [
		"walls",
		"openings",
		"beams",
		"rooms",
		"questions",
		"changes"
	]) if (!Array.isArray(plan[k])) error("shape", `${k} 必须是数组`);
	for (const k of [
		"levels",
		"columns",
		"shafts",
		"stairs",
		"voids"
	]) if (plan[k] !== void 0 && !Array.isArray(plan[k])) error("shape", `${k} 必须是数组`);
	if (issues.some((i) => i.code === "shape")) return issues;
	const seen = /* @__PURE__ */ new Set();
	for (const [type, items] of Object.entries({
		wall: plan.walls,
		opening: plan.openings,
		beam: plan.beams,
		room: plan.rooms,
		question: plan.questions,
		change: plan.changes,
		level: plan.levels ?? [],
		column: plan.columns ?? [],
		shaft: plan.shafts ?? [],
		stair: plan.stairs ?? [],
		void: plan.voids ?? []
	})) for (const item of items) {
		if (!item || typeof item !== "object") {
			error("shape", `${type} 包含非对象条目`);
			continue;
		}
		const ref = [
			"wall",
			"opening",
			"beam",
			"room",
			"column",
			"shaft",
			"stair",
			"void"
		].includes(type) ? {
			type,
			id: item.id
		} : void 0;
		if (typeof item.id !== "string" || !item.id) error("id", `${type} 缺少有效 id`, ref);
		else if (seen.has(item.id)) error("duplicate-id", `重复 id：${item.id}`, ref);
		else seen.add(item.id);
		if ("evidence" in item && item.evidence && ![
			"seen",
			"inferred",
			"unknown"
		].includes(item.evidence.certainty)) error("enum", `${item.id} 的证据确定度不认识`, ref);
	}
	if (issues.some((i) => i.code === "shape")) return issues;
	const levels = levelsOf(plan).filter(Boolean), levelIds = new Set(levels.map((l) => l.id));
	if (plan.levels && !plan.levels.length) error("levels", "levels 至少包含一层，单层可省略 levels");
	levels.forEach((l, i) => {
		if (typeof l.name !== "string" || !finite$1(l.elevation) || l.ceiling !== void 0 && (!finite$1(l.ceiling) || l.ceiling <= 0)) error("level", `楼层 ${l.id} 的名称、标高或层高无效`);
		if (i > 0 && l.elevation <= levels[i - 1].elevation) error("level-order", "各层标高必须按数组顺序严格递增");
	});
	for (const e of [
		...plan.walls,
		...plan.beams,
		...plan.rooms,
		...plan.questions,
		...plan.columns ?? [],
		...plan.shafts ?? [],
		...plan.stairs ?? [],
		...plan.voids ?? []
	].filter(Boolean)) if (e.level !== void 0 && !levelIds.has(e.level)) error("level-reference", `构件 ${e.id} 的楼层 ${e.level} 不存在`);
	for (const e of [
		...plan.shafts ?? [],
		...plan.stairs ?? [],
		...plan.voids ?? []
	].filter(Boolean)) {
		if (!Array.isArray(e.poly) || e.poly.length < 3 || !e.poly.every(point$1)) {
			error("extra-points", `构件 ${e.id} 需要至少三个有效顶点`);
			continue;
		}
		if (invalidPolygon(e.poly)) error("extra-polygon", `构件 ${e.id} 多边形退化或自交`);
	}
	for (const c of (plan.columns ?? []).filter(Boolean)) {
		if (!point$1(c.center) || !point$1(c.size) || c.size.some((s) => s <= 0) || c.shape === "round" && c.size[0] !== c.size[1] || c.rotation !== void 0 && !finite$1(c.rotation)) error("column", `柱 ${c.id} 的位置、尺寸或旋转无效`);
		if (!["rect", "round"].includes(c.shape) || !["bearing", "decorative"].includes(c.kind)) error("enum", `柱 ${c.id} 的类型无效`);
	}
	for (const s of (plan.shafts ?? []).filter(Boolean)) if (![
		"flue",
		"pipe",
		"vent",
		"other"
	].includes(s.kind)) error("enum", `管道井 ${s.id} 类型无效`);
	for (const s of (plan.stairs ?? []).filter(Boolean)) {
		if (!levelIds.has(s.level) || !levelIds.has(s.to) || s.level === s.to) error("stair-level", `楼梯 ${s.id} 的起止楼层必须存在且不同`);
		else if (levels.find((l) => l.id === s.to).elevation <= levels.find((l) => l.id === s.level).elevation) error("stair-direction", `楼梯 ${s.id} 的目标层必须高于起点层`);
		if (!Array.isArray(s.path) || s.path.length < 2 || !s.path.every(point$1) || s.path.slice(1).some((p, i) => p[0] === s.path[i][0] && p[1] === s.path[i][1])) error("stair-path", `楼梯 ${s.id} 的上行路径需要至少两个不重合的有效点`);
		if (!finite$1(s.width) || s.width <= 0 || s.steps !== void 0 && (!Number.isInteger(s.steps) || s.steps <= 0)) error("stair-size", `楼梯 ${s.id} 的宽度或踏步数无效`);
		if (![
			"straight",
			"L",
			"U",
			"spiral"
		].includes(s.kind)) error("enum", `楼梯 ${s.id} 类型无效`);
	}
	for (const v of (plan.voids ?? []).filter(Boolean)) if (!levelIds.has(v.level)) error("level-reference", `挑空 ${v.id} 必须指定有效楼层`);
	const validWalls = plan.walls.filter((w) => w && point$1(w.a) && point$1(w.b) && (w.bulge === void 0 || finite$1(w.bulge)));
	const safePlan = {
		...plan,
		walls: validWalls,
		rooms: plan.rooms.filter((r) => r && Array.isArray(r.poly) && r.poly.every(point$1))
	};
	for (const w of plan.walls.filter(Boolean)) {
		const ref = {
			type: "wall",
			id: w.id
		};
		if (!validWalls.includes(w) || !finite$1(w.thickness) || w.thickness <= 0 || validWalls.includes(w) && wallLength(w) <= 1e-7) error("wall-geometry", `墙 ${w.id} 的端点、厚度或长度无效`, ref);
		if (!WALL_KINDS.includes(w.kind)) error("enum", `墙 ${w.id} 的类型不认识`, ref);
		if (w.height !== void 0 && (!finite$1(w.height) || w.height <= 0) || w.lowHeight !== void 0 && (!finite$1(w.lowHeight) || w.lowHeight < 0)) error("height", `墙 ${w.id} 的高度无效`, ref);
	}
	for (const o of plan.openings.filter(Boolean)) {
		const ref = {
			type: "opening",
			id: o.id
		}, w = validWalls.find((w) => w.id === o.wall);
		if (!OPENING_KINDS.includes(o.kind)) error("enum", `洞口 ${o.id} 的类型不认识`, ref);
		if (!w) error("opening-host", `洞口 ${o.id} 的宿主墙 ${o.wall} 不存在或几何无效`, ref);
		else {
			if (![o.offset, o.width].every(finite$1) || o.width <= 0 || o.offset < 0 || o.offset + o.width > wallLength(w) + 1e-5) error("opening-range", `洞口 ${o.id} 超出墙长或宽度无效`, ref);
			if (o.head > effectiveWallHeight(safePlan, w) + 1e-7) error("opening-head", `洞口 ${o.id} 洞顶超过墙高`, ref);
		}
		if (![o.sill, o.head].every(finite$1) || o.sill < 0 || o.sill >= o.head) error("opening-height", `洞口 ${o.id} 洞底必须非负且低于洞顶`, ref);
		if (o.swing && (!["start", "end"].includes(o.swing.hinge) || ![1, -1].includes(o.swing.side))) error("enum", `洞口 ${o.id} 开向无效`, ref);
		if (o.panes && (!Array.isArray(o.panes) || !o.panes.length || o.panes.some((p) => !p || !finite$1(p.width) || p.width <= 0 || ![
			"fixed",
			"casement",
			"sliding"
		].includes(p.kind)))) error("pane", `洞口 ${o.id} 分扇比例或类型无效`, ref);
	}
	for (let i = 0; i < plan.openings.length; i++) for (let j = i + 1; j < plan.openings.length; j++) {
		const a = plan.openings[i], b = plan.openings[j];
		if (a && b && a.wall === b.wall && Math.min(a.offset + a.width, b.offset + b.width) - Math.max(a.offset, b.offset) > 1e-5) error("opening-overlap", `同墙洞口 ${a.id} 与 ${b.id} 重叠`, {
			type: "opening",
			id: a.id
		});
	}
	for (const r of plan.rooms.filter(Boolean)) {
		const ref = {
			type: "room",
			id: r.id
		};
		if (typeof r.name !== "string" || !Array.isArray(r.poly) || r.poly.length < 3 || !r.poly.every(point$1)) {
			error("room-points", `房间 ${r.id} 需要名称和至少三个有效顶点`, ref);
			continue;
		}
		let invalid = false;
		for (let i = 0; i < r.poly.length; i++) for (let j = i + 1; j < r.poly.length; j++) if (j !== i + 1 && !(i === 0 && j === r.poly.length - 1) && intersects$1(r.poly[i], r.poly[(i + 1) % r.poly.length], r.poly[j], r.poly[(j + 1) % r.poly.length])) invalid = true;
		if (invalid || invalidPolygon(r.poly)) error("room-self-intersection", `房间 ${r.id} 多边形自交`, ref);
		if (r.ceiling !== void 0 && (!finite$1(r.ceiling) || r.ceiling <= 0) || r.floorOffset !== void 0 && !finite$1(r.floorOffset)) error("height", `房间 ${r.id} 层高或地面抬高无效`, ref);
	}
	for (const b of plan.beams.filter(Boolean)) if (!point$1(b.a) || !point$1(b.b) || !finite$1(b.width) || b.width <= 0 || !finite$1(b.bottom) || b.bottom < 0) error("beam", `梁 ${b.id} 的端点、宽度或梁底无效`, {
		type: "beam",
		id: b.id
	});
	for (const q of plan.questions.filter(Boolean)) if (!["original", "renovation"].includes(q.category) || q.certainty !== void 0 && ![
		"seen",
		"inferred",
		"unknown"
	].includes(q.certainty)) error("enum", `问题 ${q.id} 的分类或确定度不认识`);
	const questionIds = plan.questions.some((q) => q?.reply?.changed?.length) ? questionElementIds(plan) : /* @__PURE__ */ new Set();
	for (const q of plan.questions.filter(Boolean)) {
		const status = questionStatus(q), warn = (message) => issues.push({
			level: "warn",
			code: "question-status",
			message: `问题卡 ${q.id}：${message}`
		});
		if (status === "answered" && !q.answer?.trim()) warn("status 是 answered，但没有答复");
		if (status === "answered" && q.reply) warn("status 是 answered，但还挂着 reply");
		if (status === "resolved" && !q.reply) warn("status 是 resolved，但没有 reply");
		if (q.reply?.outcome === "ask" && status !== "open") warn("reply.outcome 是 ask，但 status 不是 open");
		for (const id of q.reply?.changed ?? []) if (!questionIds.has(id)) warn(`reply.changed 里的构件 ${id} 在方案里找不到`);
	}
	for (const c of plan.changes.filter(Boolean)) {
		if (![
			"add",
			"remove",
			"update"
		].includes(c.op) || ![
			"wall",
			"opening",
			"beam",
			"room",
			"column",
			"shaft",
			"stair",
			"void"
		].includes(c.type) || !["user", "agent"].includes(c.by) || !["pending", "confirmed"].includes(c.status)) error("enum", `改造 ${c.id} 的操作、类型、作者或状态不认识`);
		if (c.op !== "add" && !c.target || c.op !== "remove" && (!c.data || typeof c.data !== "object")) error("change-params", `改造 ${c.id} 缺少目标或参数`);
	}
	if (plan.levelUnderlays && (typeof plan.levelUnderlays !== "object" || Array.isArray(plan.levelUnderlays))) error("underlay", "levelUnderlays 必须是按楼层 id 索引的对象");
	for (const id of Object.keys(plan.levelUnderlays ?? {})) if (!levelIds.has(id)) error("level-reference", `底图楼层 ${id} 不存在`);
	for (const u of [plan.underlay, ...Object.values(plan.levelUnderlays ?? {})].filter(Boolean)) {
		if (!u || typeof u !== "object") {
			error("underlay", "底图必须是对象");
			continue;
		}
		const src = typeof u.src === "string" ? u.src.trim() : "";
		if (/^(?:[a-z][a-z\d+.-]*:|[/\\]{2})/i.test(src) && !/^data:image\/(?:(?:png|jpe?g|webp|gif|bmp|avif);base64|svg\+xml(?:;charset=utf-8)?(?:;base64)?),.+$/i.test(src)) error("underlay-remote", "底图必须为本地相对路径或内嵌图片（含 SVG）data URL，禁止远程地址和外部协议");
		if (!src || !finite$1(u.mmPerPx) || u.mmPerPx <= 0 || !point$1(u.origin) || !finite$1(u.opacity) || u.opacity < 0 || u.opacity > 100 || typeof u.visible !== "boolean" || u.mmPerPxY !== void 0 && (!finite$1(u.mmPerPxY) || u.mmPerPxY <= 0)) error("underlay", "底图路径、比例、原点或显示参数无效");
	}
	if (plan.decor !== void 0 && !issues.some((i) => i.level === "error")) for (const i of validatePlanDecor(plan)) issues.push({
		level: i.level === "error" ? "error" : "warn",
		code: "decor-" + i.code,
		message: `${i.id}：${i.text}`
	});
	return issues;
}
// src/core/changes.ts
var replayOrigins = /* @__PURE__ */ new WeakMap();
var collection = {
	wall: "walls",
	opening: "openings",
	beam: "beams",
	room: "rooms",
	column: "columns",
	shaft: "shafts",
	stair: "stairs",
	void: "voids"
};
/** 某类构件的数组；可选集合（柱、管道井、楼梯、挑空）缺省时返回空数组（不写回方案） */
function elements(plan, type) {
	return plan[collection[type]] ?? [];
}
/** 可写的数组：可选集合缺省时在 plan 上建一个空数组 */
function mutableElements(plan, type) {
	const key = collection[type];
	return plan[key] ??= [];
}
var allIds = (plan) => new Set([
	...plan.walls,
	...plan.openings,
	...plan.beams,
	...plan.rooms,
	...plan.changes,
	...plan.questions,
	...plan.levels ?? [],
	...plan.columns ?? [],
	...plan.shafts ?? [],
	...plan.stairs ?? [],
	...plan.voids ?? []
].map((x) => x.id));
var finite = (v) => typeof v === "number" && Number.isFinite(v);
var point = (v) => Array.isArray(v) && v.length === 2 && v.every(finite);
function checkElement(plan, type, item) {
	if (!item || typeof item.id !== "string" || !item.id) return "构件缺少有效 id";
	if (item.level !== void 0 && !levelsOf(plan).some((l) => l.id === item.level)) return "楼层引用不存在";
	if (type === "wall" || type === "beam") {
		if (!point(item.a) || !point(item.b) || Math.hypot(item.b[0] - item.a[0], item.b[1] - item.a[1]) < 1e-7) return "端点缺失或长度为零";
		if (!finite(type === "wall" ? item.thickness : item.width) || (type === "wall" ? item.thickness : item.width) <= 0) return "厚度或宽度必须为正数";
		if (type === "wall" && ![
			"exterior",
			"bearing",
			"partition",
			"glass",
			"half",
			"half-glass"
		].includes(item.kind)) return "墙类型不认识";
		if (type === "wall" && (item.height !== void 0 && (!finite(item.height) || item.height <= 0) || item.bulge !== void 0 && !finite(item.bulge) || item.lowHeight !== void 0 && (!finite(item.lowHeight) || item.lowHeight < 0))) return "墙高或矢高无效";
		if (type === "beam" && (!finite(item.bottom) || item.bottom < 0)) return "梁底高度无效";
	}
	if (type === "room") {
		if (typeof item.name !== "string" || !Array.isArray(item.poly) || item.poly.length < 3 || !item.poly.every(point)) return "房间需要名称和至少三个有效顶点";
		if (item.ceiling !== void 0 && (!finite(item.ceiling) || item.ceiling <= 0) || item.floorOffset !== void 0 && !finite(item.floorOffset)) return "房间高度无效";
	}
	if (type === "opening") {
		const w = plan.walls.find((w) => w.id === item.wall);
		if (!w) return `宿主墙 ${item.wall ?? ""} 不存在`;
		if (![
			"door",
			"sliding",
			"doorway",
			"window",
			"floor-window",
			"bay-window",
			"open-balcony"
		].includes(item.kind)) return "洞口类型不认识";
		if (![
			item.offset,
			item.width,
			item.sill,
			item.head
		].every(finite) || item.width <= 0 || item.offset < 0 || item.offset + item.width > wallLength(w) + 1e-6) return "洞口尺寸缺失或超出墙长";
		if (item.sill < 0 || item.head <= item.sill || item.head > effectiveWallHeight(plan, w) + 1e-7) return "洞底、洞顶与墙高不相容";
		if (plan.openings.some((o) => o.id !== item.id && o.wall === item.wall && Math.min(o.offset + o.width, item.offset + item.width) - Math.max(o.offset, item.offset) > 1e-6)) return "同墙洞口重叠";
		if (item.panes && (!Array.isArray(item.panes) || !item.panes.length || item.panes.some((p) => !finite(p.width) || p.width <= 0 || ![
			"fixed",
			"casement",
			"sliding"
		].includes(p.kind)))) return "窗分扇无效";
		if (item.swing && (!["start", "end"].includes(item.swing.hinge) || ![1, -1].includes(item.swing.side))) return "门开向无效";
	}
	const poly = (v) => Array.isArray(v) && v.length >= 3 && v.every(point) && !invalidPolygon(v);
	if (type === "column") {
		if (!point(item.center) || !point(item.size) || item.size.some((v) => v <= 0)) return "柱的位置或尺寸无效";
		if (!["rect", "round"].includes(item.shape) || !["bearing", "decorative"].includes(item.kind)) return "柱的形状或类型不认识";
		if (item.shape === "round" && item.size[0] !== item.size[1]) return "圆柱的两个尺寸必须相等";
		if (item.rotation !== void 0 && !finite(item.rotation)) return "柱的旋转角无效";
	}
	if (type === "shaft") {
		if (!poly(item.poly)) return "管道井需要至少三个不自交的顶点";
		if (![
			"flue",
			"pipe",
			"vent",
			"other"
		].includes(item.kind)) return "管道井类型不认识";
	}
	if (type === "void") {
		if (!levelsOf(plan).some((l) => l.id === item.level)) return "挑空必须指定有效楼层";
		if (!poly(item.poly)) return "挑空需要至少三个不自交的顶点";
	}
	if (type === "stair") {
		const levels = levelsOf(plan), from = levels.find((l) => l.id === item.level), to = levels.find((l) => l.id === item.to);
		if (!from || !to || from.id === to.id) return "楼梯的起止楼层必须存在且不同";
		if (to.elevation <= from.elevation) return "楼梯要通到更高的一层";
		if (!poly(item.poly)) return "楼梯占地需要至少三个不自交的顶点";
		if (!Array.isArray(item.path) || item.path.length < 2 || !item.path.every(point) || item.path.slice(1).some((p, i) => p[0] === item.path[i][0] && p[1] === item.path[i][1])) return "楼梯上行路径需要至少两个不重合的点";
		if (!finite(item.width) || item.width <= 0 || item.steps !== void 0 && (!Number.isInteger(item.steps) || item.steps <= 0)) return "楼梯宽度或踏步数无效";
		if (![
			"straight",
			"L",
			"U",
			"spiral"
		].includes(item.kind)) return "楼梯类型不认识";
	}
}
function applyChanges(base, changes) {
	let plan = structuredClone(base);
	const results = [], protectedIds = new Set(base.walls.filter((w) => PROTECTED_KINDS.includes(w.kind) || w.evidence?.certainty === "unknown").map((w) => w.id));
	const isProtected = (w) => !!w && (protectedIds.has(w.id) || PROTECTED_KINDS.includes(w.kind));
	const bearingColumns = new Set((base.columns ?? []).filter((c) => c.kind === "bearing").map((c) => c.id));
	for (const change of changes) {
		const r = {
			id: change.id,
			ok: false,
			affected: [],
			removed: []
		}, next = structuredClone(plan);
		try {
			const blocked = change.op === "remove" ? shaftRemovalError(next, change.target) : void 0;
			if (blocked) throw new Error(blocked);
			if (!collection[change.type] || ![
				"add",
				"remove",
				"update"
			].includes(change.op)) throw new Error("改造操作或构件类型不认识");
			if (!["user", "agent"].includes(change.by) || !["pending", "confirmed"].includes(change.status)) throw new Error("改造作者或状态无效");
			const list = mutableElements(next, change.type), old = list.find((x) => x.id === change.target);
			if (change.op !== "add" && !old) throw new Error(`目标 ${change.target ?? "（未指定）"} 不存在`);
			if (change.op !== "remove" && (!change.data || typeof change.data !== "object" || Array.isArray(change.data))) throw new Error("缺少 data 参数");
			if (change.op === "update" && change.data.id !== void 0 && change.data.id !== change.target) throw new Error("更新不能修改构件 id");
			const item = change.op === "add" ? structuredClone(change.data) : change.op === "update" ? {
				...old,
				...structuredClone(change.data)
			} : old;
			let protectedWall;
			if (change.type === "wall" && change.op !== "add") {
				const before = old, after = item;
				const moved = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
				if (change.op === "remove" || moved(before.a, after.a) || moved(before.b, after.b) || (before.bulge ?? 0) !== (after.bulge ?? 0) || (before.level ?? levelsOf(next)[0].id) !== (after.level ?? levelsOf(next)[0].id) || after.thickness < before.thickness || effectiveWallHeight(next, after) < effectiveWallHeight(next, before) || (after.lowHeight ?? 1) < (before.lowHeight ?? 1) || after.kind !== before.kind) protectedWall = before;
			}
			if (change.type === "opening" && change.op !== "remove") {
				const o = item, prev = old;
				if (!prev || o.wall !== prev.wall || o.offset !== prev.offset || o.width > prev.width || o.sill < prev.sill || o.head > prev.head) protectedWall = next.walls.find((w) => w.id === o.wall);
			}
			const beforeColumn = old, afterColumn = item;
			const protectedColumn = change.type === "column" && change.op !== "add" && (bearingColumns.has(old.id) || beforeColumn?.kind === "bearing") && (change.op === "remove" || JSON.stringify(beforeColumn.center) !== JSON.stringify(afterColumn.center) || afterColumn.size?.some((v, i) => v < beforeColumn.size[i]) || afterColumn.kind !== beforeColumn.kind || afterColumn.shape !== beforeColumn.shape || (afterColumn.rotation ?? 0) !== (beforeColumn.rotation ?? 0) || (afterColumn.level ?? levelsOf(next)[0].id) !== (beforeColumn.level ?? levelsOf(next)[0].id));
			if ((isProtected(protectedWall) || protectedColumn) && !(change.confirm && typeof change.confirm.by === "string" && change.confirm.by.trim())) {
				r.needsConfirm = true;
				r.error = protectedColumn ? "削减、移动或拆除承重柱需要用户二次确认" : "削减、移动、改类型、拆除或开洞承重墙、外墙、承重情况不确定的墙需要用户二次确认";
				results.push(r);
				continue;
			}
			if (change.op === "add") {
				const error = checkElement(next, change.type, item);
				if (error) throw new Error(error);
				if (allIds(next).has(item.id)) throw new Error(`id ${item.id} 已存在`);
				list.push(item);
				r.affected.push(item.id);
			} else if (change.op === "update") {
				const error = checkElement(next, change.type, item);
				if (error) throw new Error(error);
				list[list.indexOf(old)] = item;
				r.affected.push(old.id);
				if (change.type === "wall") {
					const openings = next.openings.filter((o) => o.wall === old.id).sort((a, b) => a.offset - b.offset || a.id.localeCompare(b.id));
					if (Object.hasOwn(change.data, "bulge")) {
						const length = wallLength(item);
						if (openings.length === 1 && openings[0].width > length) {
							openings[0].width = length;
							(r.warnings ??= []).push(`洞口 ${openings[0].id} 宽度超过新墙长，已缩至 ${length.toFixed(1)}mm`);
						}
						if (openings.reduce((sum, o) => sum + o.width, 0) > length + 1e-6) throw new Error("新墙长不足以容纳所有洞口，未修改墙和洞口");
						let end = length;
						for (const o of [...openings].reverse()) {
							const offset = Math.max(0, Math.min(o.offset, end - o.width));
							if (Math.abs(offset - o.offset) > 1e-7 || openings.length === 1 && o.width !== plan.openings.find((p) => p.id === o.id)?.width) {
								if (offset !== o.offset) (r.warnings ??= []).push(`洞口 ${o.id} 超出新墙长或与夹回洞口相遇，offset 已从 ${o.offset.toFixed(1)} 夹至 ${offset.toFixed(1)}mm`);
								o.offset = offset;
								r.affected.push(o.id);
							}
							end = offset;
						}
					}
					for (const o of openings) {
						const err = checkElement(next, "opening", o);
						if (err) throw new Error(`墙更新导致洞口 ${o.id} 无效：${err}`);
					}
				}
			} else if (change.type === "wall") {
				const wall = old, len = wallLength(wall), range = change.range ?? [0, len], [from, to] = range;
				if (range.length !== 2 || !range.every(finite) || from < 0 || to > len + 1e-6 || to <= from) throw new Error("拆除区间必须在墙长范围内，且起点小于终点");
				const intervals = [];
				if (from > 1e-6) intervals.push([0, from]);
				if (to < len - 1e-6) intervals.push([to, len]);
				const segments = intervals.map(([a, b], i) => ({
					...sliceWall(wall, a, b),
					id: i ? `${wall.id}~${change.id}` : wall.id
				}));
				if (segments[1] && allIds(next).has(segments[1].id)) throw new Error(`分段 id ${segments[1].id} 已存在`);
				next.walls.splice(next.walls.indexOf(wall), 1, ...segments);
				next.openings = next.openings.filter((o) => {
					if (o.wall !== wall.id) return true;
					const i = intervals.findIndex(([a, b]) => o.offset >= a - 1e-6 && o.offset + o.width <= b + 1e-6);
					if (i < 0) {
						r.removed.push(o.id);
						return false;
					}
					o.wall = segments[i].id;
					o.offset -= intervals[i][0];
					r.affected.push(o.id);
					return true;
				});
				r.affected.push(...segments.map((s) => s.id));
				if (!segments.length) r.removed.push(wall.id);
				if (isProtected(wall)) segments.forEach((s) => protectedIds.add(s.id));
			} else {
				list.splice(list.indexOf(old), 1);
				r.removed.push(old.id);
			}
			for (const w of next.walls) if (PROTECTED_KINDS.includes(w.kind)) protectedIds.add(w.id);
			for (const c of next.columns ?? []) if (c.kind === "bearing") bearingColumns.add(c.id);
			r.ok = true;
			plan = next;
		} catch (error) {
			r.error = error instanceof Error ? error.message : String(error);
			r.affected = [];
			r.removed = [];
			delete r.warnings;
		}
		results.push(r);
	}
	if (changes.length && changes.every((c) => base.changes.some((saved) => saved.id === c.id)) && results.some((r) => r.ok)) {
		const frame = mirrorBounds(base);
		if (frame) {
			plan.legacy ??= {};
			plan.legacy.__structureReplayFrame = frame;
		}
	}
	replayOrigins.set(plan, {
		base: replayOrigins.get(base)?.base ?? base,
		protectedWalls: protectedIds,
		bearingColumns
	});
	return {
		plan,
		results
	};
}
/** Validate the final replay once; attach contributing change IDs to each diagnostic. */
function validateReplay(replay, changes, base) {
	const issues = validatePlan(replay.plan);
	const introduced = /* @__PURE__ */ new Map();
	const key = (issue) => JSON.stringify([
		issue.code,
		issue.ref,
		issue.message
	]);
	if (base && issues.some((i) => i.level === "error")) {
		let previous = new Set(validatePlan(base).filter((i) => i.level === "error").map(key));
		for (let i = 0; i < changes.length; i++) {
			const current = new Set(validatePlan(applyChanges(base, changes.slice(0, i + 1)).plan).filter((i) => i.level === "error").map(key));
			for (const id of current) if (!previous.has(id)) introduced.set(id, changes[i].id);
			for (const id of previous) if (!current.has(id)) introduced.delete(id);
			previous = current;
		}
	}
	return issues.map((issue) => {
		const related = replay.results.filter((r) => r.ok && (!issue.ref || [...r.affected, ...r.removed].includes(issue.ref.id)));
		const cause = introduced.get(key(issue));
		const changeIds = cause ? [cause] : (related.length ? related : replay.results.filter((r) => r.ok)).map((r) => r.id);
		return {
			...issue,
			changeIds,
			message: `${issue.message}${changeIds.length ? `（改造 ${changeIds.join("、")}；${changes.filter((c) => changeIds.includes(c.id)).map((c) => `${c.type}:${c.target ?? c.data?.id ?? ""}`).join("、")}）` : ""}`
		};
	});
}
// src/core/decor/resolve.ts
var decorItems = (d) => [
	...d.surfaces,
	...d.furniture,
	...d.cabinets,
	...d.panels,
	...d.recesses
];
function itemSpan(plan, item) {
	if ("span" in item || "thickness" in item) return panelSpan(plan, item);
	if ("place" in item) return "face" in item.place ? {
		face: item.place.face,
		s: [item.place.s, item.place.s + item.width],
		z: item.z
	} : void 0;
	if ("host" in item) return "face" in item.host && item.rect.s ? {
		face: item.host.face,
		s: item.rect.s,
		z: item.rect.z
	} : void 0;
	if ("target" in item && "face" in item.target) {
		const a = faceAxis(plan, item.target.face);
		return {
			face: item.target.face,
			s: item.target.s ?? [0, a.length],
			z: item.target.z ?? [0, plan.ceiling]
		};
	}
	if ("against" in item && item.against) {
		const a = faceAxis(plan, item.against.face), values = furnitureFootprint(item, plan).map((p) => dot$2(sub$1(p, a.wall.a), wallDir(a.wall)));
		return {
			face: item.against.face,
			s: [Math.min(...values), Math.max(...values)],
			z: [item.z ?? 0, (item.z ?? 0) + item.height]
		};
	}
}
/** Local horizontal u and outward depth to plan coordinates; recesses use the host's left origin. */
function hostTransform(plan, decor, id) {
	const panel = decor.panels.find((p) => p.id === id);
	if (panel) return panelTransform(plan, panel);
	const cabinet = decor.cabinets.find((c) => c.id === id);
	if (cabinet) return cabinetTransform(plan, cabinet);
	const recess = decor.recesses.find((r) => r.id === id);
	if (!recess) return void 0;
	if ("face" in recess.host && recess.rect.s) {
		const a = faceAxis(plan, recess.host.face), start = Math.min(...recess.rect.s.map(a.toU));
		return (u, d) => a.at(a.toS(start + u), d);
	}
	const parent = "panel" in recess.host ? panelTransform(plan, decor.panels.find((p) => p.id === recess.host.panel)) : "cabinet" in recess.host ? cabinetTransform(plan, decor.cabinets.find((c) => c.id === recess.host.cabinet)) : void 0;
	return parent && ((u, d) => parent(u + (recess.rect.u?.[0] ?? 0), d));
}
function itemFootprint(plan, decor, item) {
	if ("size" in item) return furniturePose({
		...plan,
		decor
	}, item).footprint;
	if ("place" in item) return cabinetFootprint(plan, item);
	if ("thickness" in item) {
		const g = panelSpan(plan, item), at = panelTransform(plan, item), width = g.s[1] - g.s[0];
		return [
			at(0, 0),
			at(width, 0),
			at(width, item.type === "slats" ? item.slats?.depth ?? item.thickness : item.thickness),
			at(0, item.type === "slats" ? item.slats?.depth ?? item.thickness : item.thickness)
		];
	}
	if ("host" in item) {
		const at = hostTransform(plan, decor, item.id);
		if (!at) return [];
		const width = item.rect.u ? item.rect.u[1] - item.rect.u[0] : item.rect.s ? item.rect.s[1] - item.rect.s[0] : 0;
		const host = "panel" in item.host ? decor.panels.find((p) => p.id === item.host.panel) : "cabinet" in item.host ? decor.cabinets.find((c) => c.id === item.host.cabinet) : void 0;
		const thick = host ? "thickness" in host ? host.type === "slats" ? host.slats?.depth ?? host.thickness : host.thickness : host.depth : 0, dep = item.depth === "through" ? thick : item.depth;
		return [
			at(0, thick),
			at(width, thick),
			at(width, thick - dep),
			at(0, thick - dep)
		];
	}
	if (!("target" in item)) return [];
	if ("floor" in item.target || "ceiling" in item.target) return plan.rooms.find((r) => r.id === ("floor" in item.target ? item.target.floor : "ceiling" in item.target ? item.target.ceiling : ""))?.poly ?? [];
	const a = faceAxis(plan, item.target.face), s = item.target.s ?? [0, a.length];
	return [
		a.at(s[0]),
		a.at(s[1]),
		a.at(s[1], 1),
		a.at(s[0], 1)
	];
}
function resolveDecor(plan, afterOrDecor) {
	const after = afterOrDecor && "walls" in afterOrDecor ? afterOrDecor : plan, source = afterOrDecor && !("walls" in afterOrDecor) ? afterOrDecor : plan.decor;
	if (!source) return {
		placed: [],
		items: [],
		issues: []
	};
	const decor = structuredClone(source), items = decorItems(decor), issues = [], moved = /* @__PURE__ */ new Set(), missing = /* @__PURE__ */ new Set();
	const problem = (id, code, text) => {
		issues.push({
			id,
			code,
			level: "error",
			text,
			fix: [
				"move",
				"clip",
				"keep",
				"delete"
			]
		});
		missing.add(id);
	};
	const remap = (id, sp) => {
		const saved = source.cache?.[id]?.anchor;
		const original = plan.walls.find((w) => w.id === sp.face.wall) ?? plan.walls.find((w) => sp.face.wall.startsWith(w.id + "~")) ?? after.walls.find((w) => sp.face.wall.startsWith(w.id + "~"));
		const before = saved?.wall === sp.face.wall && original ? {
			...original,
			id: saved.wall,
			a: saved.a,
			b: saved.b
		} : original?.id === sp.face.wall ? original : void 0;
		const current = after.walls.find((w) => w.id === sp.face.wall);
		const root = sp.face.wall.split("~")[0];
		const split = before && current && wallLength(current) > wallLength(before) + 1e-5 && (saved || plan.changes.some((c) => c.op === "remove" && c.type === "wall" && c.target === root && c.range)) || sp.face.wall.includes("~") || after.walls.some((w) => w.id.startsWith(`${sp.face.wall}~`)) || after.changes.some((c) => c.type === "wall" && c.op === "remove" && c.target === sp.face.wall && c.range);
		if (!before || !split || before.bulge) {
			if (!current) {
				problem(id, "host-missing", "宿主墙拆了，没地方挂了");
				return;
			}
			return sp;
		}
		const dir = wallDir(before), candidates = after.walls.filter((w) => (w.id === root || w.id.startsWith(`${root}~`)) && !w.bulge && levelOf(after, w).id === levelOf(plan, before).id);
		const match = candidates.find((w) => {
			const ss = ordered(dot$2(sub$1(w.a, before.a), dir), dot$2(sub$1(w.b, before.a), dir));
			return sp.s[0] >= ss[0] - 1e-5 && sp.s[1] <= ss[1] + 1e-5;
		});
		if (!match) {
			problem(id, candidates.length ? "host-cut" : "host-missing", candidates.length ? "构件跨过拆掉的墙段，需裁到剩下的墙上或挪位置" : "宿主墙拆了，没地方挂了");
			return;
		}
		const shift = dot$2(sub$1(match.a, before.a), dir), reversed = dot$2(wallDir(match), dir) < 0;
		const s = ordered((sp.s[0] - shift) * (reversed ? -1 : 1), (sp.s[1] - shift) * (reversed ? -1 : 1)), face = {
			wall: match.id,
			side: reversed ? -sp.face.side : sp.face.side
		};
		if (face.wall !== sp.face.wall || s.some((v, i) => Math.abs(v - sp.s[i]) > 1e-7)) moved.add(id);
		return {
			...sp,
			face,
			s
		};
	};
	for (const item of items) {
		if ("in" in item && item.in) continue;
		let sp;
		try {
			sp = itemSpan(plan, item);
		} catch {
			try {
				sp = itemSpan(after, item);
			} catch {
				problem(item.id, "host-missing", "装修宿主不存在");
				continue;
			}
		}
		if (!sp) continue;
		const next = remap(item.id, sp);
		if (!next) {
			if ("against" in item) {
				delete item.against;
				missing.delete(item.id);
				const warning = issues.find((i) => i.id === item.id && i.code === "host-missing");
				if (warning) warning.level = "info";
			}
			continue;
		}
		if ("thickness" in item) {
			if (item.type !== "arch") item.span = next;
			else if (item.span) item.span.face = next.face;
		} else if ("place" in item && "face" in item.place) {
			item.place.face = next.face;
			item.place.s = next.s[0];
		} else if ("host" in item && "face" in item.host) {
			item.host.face = next.face;
			item.rect.s = next.s;
		} else if ("target" in item && "face" in item.target) {
			item.target.face = next.face;
			if (item.target.s) item.target.s = next.s;
		} else if ("at" in item && item.against) {
			item.against.face = next.face;
			const a = faceAxis(after, next.face), old = source.furniture.find((f) => f.id === item.id), theta = Math.atan2(a.normal[1], a.normal[0]) * 180 / Math.PI - 90;
			if (after !== plan && JSON.stringify(plan.walls.find((w) => w.id === sp.face.wall)) !== JSON.stringify(a.wall)) {
				item.rot = theta;
				item.at = a.at((next.s[0] + next.s[1]) / 2, item.against.gap + item.size[1] / 2 - (item.embed ?? 0));
			} else item.at = [...old.at];
		}
	}
	for (const r of decor.recesses) if (!("face" in r.host)) {
		const id = "panel" in r.host ? r.host.panel : r.host.cabinet;
		if (missing.has(id)) problem(r.id, "host-missing", `宿主 ${id} 没地方挂了`);
		else if (moved.has(id)) moved.add(r.id);
	}
	for (const f of decor.furniture) if (f.in) {
		const parent = f.in.split(":cell:")[0];
		if (moved.has(parent)) moved.add(f.id);
		if (missing.has(parent) || furniturePose({
			...after,
			decor
		}, f).missing) problem(f.id, "host-missing", "家具的宿主链不存在");
	}
	const resolvedPlan = {
		...after,
		decor
	};
	issues.push(...validateDecorRaw(resolvedPlan, decor, plan));
	for (const i of issues) if (i.code === "host-cut" && after !== plan) {
		const item = items.find((x) => x.id === i.id);
		try {
			const sp = item && itemSpan(plan, item), before = plan.walls.find((w) => w.id === sp?.face.wall), current = after.walls.find((w) => w.id === sp?.face.wall);
			if (sp && before && current && faceRun(plan, sp.face).length === 1 && wallLength(current) < wallLength(before) && !after.changes.some((c) => c.type === "wall" && c.op === "remove" && c.target === before.id && c.range)) {
				i.code = "out-of-face";
				i.text = "墙变短了，构件保持原 s 后超出墙面";
			}
		} catch {}
	}
	for (const i of [...issues]) {
		if ([
			"host-missing",
			"host-cut",
			"out-of-face",
			"arc-unsupported",
			"room-missing"
		].includes(i.code) && (i.level === "error" || i.code === "room-missing")) missing.add(i.id);
		if (i.code === "through-wall" && after !== plan) {
			const sp = (() => {
				try {
					return itemSpan(after, items.find((x) => x.id === i.id));
				} catch {
					return;
				}
			})(), oldWall = plan.walls.find((w) => w.id === sp?.face.wall), newWall = after.walls.find((w) => w.id === sp?.face.wall);
			if (oldWall && newWall && newWall.thickness < oldWall.thickness) issues.push({
				...i,
				code: "too-deep",
				text: `墙变薄了。${i.text}`
			});
		}
	}
	for (const r of decor.recesses) if (!("face" in r.host)) {
		const parent = "panel" in r.host ? r.host.panel : r.host.cabinet;
		if (missing.has(parent) && !missing.has(r.id)) problem(r.id, "host-missing", `宿主 ${parent} 没地方挂了`);
	}
	for (const f of decor.furniture) if (f.in && missing.has(f.in.split(":cell:")[0]) && !missing.has(f.id)) problem(f.id, "host-missing", "家具的宿主链不存在");
	const placed = items.map((item) => {
		let footprint = [], face, level = levelOf(after, "level" in item ? item : {}).id;
		try {
			const sp = itemSpan(after, item);
			if (sp) {
				const wholeSurface = "target" in item && "face" in item.target && !item.target.s && !item.target.z;
				const f = faceFrame(after, wholeSurface ? sp.face : sp);
				face = {
					a: f.a,
					b: f.b,
					side: sp.face.side
				};
				level = levelOf(after, f.wall).id;
			}
			if (!missing.has(item.id)) footprint = itemFootprint(resolvedPlan, decor, item);
		} catch {
			missing.add(item.id);
		}
		if (missing.has(item.id)) {
			const c = decor.cache?.[item.id];
			if (c) {
				const [x0, y0, x1, y1] = c.box;
				footprint = "size" in item && c.pose ? furniturePose(resolvedPlan, item).footprint : [
					[x0, y0],
					[x1, y0],
					[x1, y1],
					[x0, y1]
				];
				level = c.level ?? level;
			} else try {
				footprint = itemFootprint(plan, source, decorItems(source).find((x) => x.id === item.id));
			} catch {}
		}
		const status = missing.has(item.id) ? "missing" : moved.has(item.id) ? "moved" : "placed";
		return {
			id: item.id,
			status,
			reasons: [...new Set(issues.filter((i) => i.id === item.id).map((i) => i.text))],
			text: status === "missing" ? "没地方挂了" : status === "moved" ? "挪到剩下那段" : "挂得上",
			footprint,
			...face ? { face } : {},
			level,
			item
		};
	});
	const byId = new Map(placed.map((p) => [p.id, p]));
	for (const p of placed) if ("host" in p.item && !("face" in p.item.host)) {
		const parent = byId.get("panel" in p.item.host ? p.item.host.panel : p.item.host.cabinet);
		if (parent) p.level = parent.level;
	}
	for (const p of placed) if ("in" in p.item && p.item.in) {
		const parent = byId.get(p.item.in.split(":cell:")[0]);
		if (parent) p.level = parent.level;
	}
	return {
		decor,
		placed,
		items: placed,
		issues: issues.filter((i, n) => issues.findIndex((j) => j.id === i.id && j.code === i.code) === n)
	};
}
/** Resolve by the actual span/footprint, then host; never select an unrelated floor. */
function decorRoom(plan, item, visited = /* @__PURE__ */ new Set()) {
	if (visited.has(item.id)) return void 0;
	visited.add(item.id);
	if ("target" in item && "floor" in item.target) return item.target.floor;
	if ("target" in item && "ceiling" in item.target) return item.target.ceiling;
	if (plan.decor) {
		const host = "in" in item ? item.in?.split(":cell:")[0] : "host" in item ? "panel" in item.host ? item.host.panel : "cabinet" in item.host ? item.host.cabinet : void 0 : void 0;
		const parent = host && decorItems(plan.decor).find((i) => i.id === host);
		if (parent) return decorRoom(plan, parent, visited);
	}
	try {
		const span = itemSpan(plan, item);
		if (span) {
			const axis = faceAxis(plan, span.face), mid = (span.s[0] + span.s[1]) / 2;
			const room = plan.rooms.find((r) => levelOf(plan, r).id === levelOf(plan, axis.wall).id && pointInPolygon(axis.at(mid, 1), r.poly));
			if (room) return room.id;
			const neighbors = roomsBesideWall(plan, axis.wall.id)[span.face.side === 1 ? "positive" : "negative"];
			if (neighbors.length === 1) return neighbors[0].id;
		}
		if (plan.decor) {
			const fp = itemFootprint(plan, plan.decor, item), box = bounds(fp), center = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
			const level = "size" in item ? furniturePose(plan, item).level : levelOf(plan, "level" in item ? { level: item.level } : {}).id;
			return fp.length ? plan.rooms.find((r) => levelOf(plan, r).id === level && pointInPolygon(center, r.poly))?.id : void 0;
		}
	} catch {}
}
/** Persistable reattachment, including last valid ghost geometry. */
function rehostDecor(before, after, decor) {
	const resolved = resolveDecor({
		...before,
		decor
	}, after), result = resolved.decor;
	result.cache ??= {};
	for (const p of resolved.placed) if (p.status !== "missing" && p.footprint.length) {
		const span = itemSpan({
			...after,
			decor: result
		}, p.item), wall = after.walls.find((w) => w.id === span?.face.wall);
		const pose = "size" in p.item ? furniturePose({
			...after,
			decor: result
		}, p.item) : void 0;
		result.cache[p.id] = {
			level: p.level,
			box: bounds(p.footprint),
			...p.face ? { face: [p.face.a, p.face.b] } : {},
			...wall ? { anchor: {
				wall: wall.id,
				a: [...wall.a],
				b: [...wall.b]
			} } : {},
			...pose ? { pose: {
				at: pose.at,
				rot: pose.rot,
				z: pose.z
			} } : {}
		};
	}
	for (const p of resolved.placed) if (p.status === "missing" && !result.cache[p.id]) try {
		const original = decorItems(decor).find((i) => i.id === p.id), footprint = itemFootprint({
			...before,
			decor
		}, decor, original);
		if (!footprint.length) continue;
		const pose = "size" in original ? furniturePose({
			...before,
			decor
		}, original) : void 0;
		result.cache[p.id] = {
			level: pose?.level ?? p.level,
			box: bounds(footprint),
			...pose && !pose.missing ? { pose: {
				at: pose.at,
				rot: pose.rot,
				z: pose.z
			} } : {}
		};
	} catch {}
	return result;
}
function decorStatus(plan) {
	return resolveDecor(plan, plan.legacy?.__structureReplayFrame ? plan : applyChanges(plan, plan.changes.filter((c) => c.status === "confirmed")).plan);
}
// src/core/persistence.ts
var decorBlocksPersistence = {
	"host-missing": false,
	"host-cut": false,
	"out-of-face": false,
	"too-deep": false,
	"wall-kind": false,
	"over-opening": false,
	"through-wall": false,
	"meet-other-side": false,
	"into-shaft": false,
	"host-depth": false,
	protected: false,
	"room-missing": false,
	"arc-unsupported": false,
	invalid: true,
	"duplicate-id": true,
	"material-missing": true
};
function blocksPersistence(issue) {
	return issue.level === "error" && !(issue.code.startsWith("decor-") && decorBlocksPersistence[issue.code.slice(6)] === false);
}
/** Blank parser fallback/new document; an underlay or actual decor item is user data too. */
function isEmptyPlan(plan) {
	return ![
		"walls",
		"openings",
		"beams",
		"rooms",
		"columns",
		"shafts",
		"stairs",
		"voids",
		"questions",
		"changes"
	].some((k) => plan[k]?.length) && !plan.underlay && !Object.keys(plan.levelUnderlays ?? {}).length && ![
		"furniture",
		"cabinets",
		"panels",
		"recesses",
		"surfaces"
	].some((k) => (plan.decor?.[k])?.length);
}
function loadError(issues) {
	const errors = issues.filter(blocksPersistence);
	if (!errors.length) return null;
	return `这个方案文件有${errors.some((i) => i.code === "schema" || i.code === "parse") ? "格式" : "几何"}错误，没有载入：\n${errors.slice(0, 3).map((i) => i.message).join("\n")}${errors.length > 3 ? `\n另有 ${errors.length - 3} 条错误` : ""}`;
}
// node_modules/earcut/src/earcut.js
/**
* A vertex in a circular doubly linked list representing a polygon ring.
* `prev`/`next` are always linked (set immediately after {@link createNode}), so they're typed
* non-null; `prevZ`/`nextZ` are the z-order list links and are null at the ends.
*
* @typedef {object} Node
* @property {number} i vertex index in the coordinates array
* @property {number} x vertex x coordinate
* @property {number} y vertex y coordinate
* @property {Node} prev previous vertex node in the polygon ring
* @property {Node} next next vertex node in the polygon ring
* @property {number} z z-order curve value; doubles as the owning block index during eliminateHoles
* @property {Node | null} prevZ previous node in z-order
* @property {Node | null} nextZ next node in z-order
*/
/** @type {Set<Node>} */
var steiners = /* @__PURE__ */ new Set();
var filteredOut = false;
/**
* Triangulate a polygon given as a flat array of vertex coordinates.
*
* @param {ArrayLike<number>} data flat array of vertex coordinates
* @param {ArrayLike<number> | null} [holeIndices] indices (in vertices, not coordinates) where each hole ring starts
* @param {number} [dim=2] number of coordinates per vertex in `data`
* @returns {number[]} triangles as triplets of vertex indices into `data`
* @example earcut([10,0, 0,50, 60,60, 70,10]); // [1,0,3, 3,2,1]
*/
function earcut(data, holeIndices, dim = 2) {
	const hasHoles = holeIndices && holeIndices.length;
	const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
	if (steiners.size) steiners.clear();
	let outerNode = linkedList(data, 0, outerLen, dim, true);
	/** @type {number[]} */
	const triangles = [];
	if (!outerNode || outerNode.next === outerNode.prev) return triangles;
	let minX = 0, minY = 0, invSize = 0;
	if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);
	if (data.length > 80 * dim) {
		minX = data[0];
		minY = data[1];
		let maxX = minX;
		let maxY = minY;
		for (let i = dim; i < outerLen; i += dim) {
			const x = data[i];
			const y = data[i + 1];
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		}
		invSize = Math.max(maxX - minX, maxY - minY);
		invSize = invSize !== 0 ? 32767 / invSize : 0;
	}
	earcutLinked(outerNode, triangles, minX, minY, invSize);
	return triangles;
}
/** @param {ArrayLike<number>} data @param {number} start @param {number} end @param {number} dim @param {boolean} clockwise @returns {Node | null} */
function linkedList(data, start, end, dim, clockwise) {
	/** @type {Node | null} */
	let last = null;
	if (clockwise === signedArea(data, start, end, dim) > 0) for (let i = start; i < end; i += dim) last = insertNode(i / dim | 0, data[i], data[i + 1], last);
	else for (let i = end - dim; i >= start; i -= dim) last = insertNode(i / dim | 0, data[i], data[i + 1], last);
	if (last && equals(last, last.next)) {
		removeNode(last);
		last = last.next;
	}
	return last;
}
/** @param {Node} start @param {Node} [end] @returns {Node} */
function filterPoints(start, end = start) {
	const full = end === start;
	let p = start, again;
	do {
		again = false;
		if (p !== p.next && (steiners.size === 0 || !steiners.has(p)) && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
			if (full || p === end) end = p.prev;
			filteredOut = true;
			removeNode(p);
			p = p.prev;
			again = true;
		} else if (full || p !== end) {
			p = p.next;
			again = !full;
		}
	} while (again || p !== end);
	return end;
}
/** @param {Node} ear @param {number[]} triangles @param {number} minX @param {number} minY @param {number} invSize */
function earcutLinked(ear, triangles, minX, minY, invSize) {
	if (invSize) indexCurve(ear, minX, minY, invSize);
	let stop = ear, cured = false;
	while (ear.prev !== ear.next) {
		const prev = ear.prev;
		/** @type {Node} */
		const next = ear.next;
		if (area(prev, ear, next) < 0 && (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear))) {
			triangles.push(prev.i, ear.i, next.i);
			removeNode(ear);
			ear = next;
			stop = next;
			continue;
		}
		ear = next;
		if (ear === stop) {
			filteredOut = false;
			ear = filterPoints(ear);
			if (filteredOut) {
				stop = ear;
				continue;
			}
			if (!cured) {
				ear = cureLocalIntersections(ear, triangles);
				stop = ear;
				cured = true;
				continue;
			}
			splitEarcut(ear, triangles, minX, minY, invSize);
			break;
		}
	}
}
/** @param {Node} ear @returns {boolean} */
function isEar(ear) {
	const a = ear.prev, b = ear, c = ear.next, ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y, x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy), x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy);
	let p = c.next;
	while (p !== a) {
		if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && !(ax === p.x && ay === p.y) && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
		p = p.next;
	}
	return true;
}
/** @param {Node} ear @param {number} minX @param {number} minY @param {number} invSize @returns {boolean} */
function isEarHashed(ear, minX, minY, invSize) {
	const a = ear.prev, b = ear, c = ear.next, ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y, x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy), x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy), minZ = zOrder(x0, y0, minX, minY, invSize), maxZ = zOrder(x1, y1, minX, minY, invSize);
	let p = ear.prevZ;
	while (p && p.z >= minZ) {
		if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== c && !(ax === p.x && ay === p.y) && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
		p = p.prevZ;
	}
	let n = ear.nextZ;
	while (n && n.z <= maxZ) {
		if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== c && !(ax === n.x && ay === n.y) && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;
		n = n.nextZ;
	}
	return true;
}
/** @param {Node} start @param {number[]} triangles @returns {Node} */
function cureLocalIntersections(start, triangles) {
	let p = start;
	let cured = false;
	do {
		const a = p.prev, b = p.next.next;
		if (intersects(a, p, p.next, b, false) && locallyInside(a, b) && locallyInside(b, a)) {
			triangles.push(a.i, p.i, b.i);
			removeNode(p);
			removeNode(p.next);
			p = start = b;
			cured = true;
		}
		p = p.next;
	} while (p !== start);
	return cured ? filterPoints(p) : p;
}
/** @param {Node} start @param {number[]} triangles @param {number} minX @param {number} minY @param {number} invSize */
function splitEarcut(start, triangles, minX, minY, invSize) {
	let a = start;
	do {
		let b = a.next.next;
		while (b !== a.prev) {
			if (a.i !== b.i && isValidDiagonal(a, b)) {
				let c = splitPolygon(a, b);
				a = filterPoints(a, a.next);
				c = filterPoints(c, c.next);
				earcutLinked(a, triangles, minX, minY, invSize);
				earcutLinked(c, triangles, minX, minY, invSize);
				return;
			}
			b = b.next;
		}
		a = a.next;
	} while (a !== start);
}
var indexActive = false;
/** @param {ArrayLike<number>} data @param {ArrayLike<number>} holeIndices @param {Node} outerNode @param {number} dim @returns {Node} */
function eliminateHoles(data, holeIndices, outerNode, dim) {
	const queue = [];
	for (let i = 0, len = holeIndices.length; i < len; i++) {
		const list = linkedList(data, holeIndices[i] * dim, i < len - 1 ? holeIndices[i + 1] * dim : data.length, dim, false);
		if (list === list.next) steiners.add(list);
		queue.push(getLeftmost(list));
	}
	queue.sort(compareXYSlope);
	buildBlockIndex(data.length / dim, holeIndices.length);
	indexSegment(outerNode, outerNode);
	indexActive = true;
	for (let i = 0; i < queue.length; i++) outerNode = eliminateHole(queue[i], outerNode);
	indexActive = false;
	return filterPoints(outerNode);
}
/** @param {Node} a @param {Node} b @returns {number} */
function compareXYSlope(a, b) {
	return a.x - b.x || a.y - b.y || (a.next.y - a.y) / (a.next.x - a.x) - (b.next.y - b.y) / (b.next.x - b.x);
}
/** @param {Node} hole @param {Node} outerNode @returns {Node} */
function eliminateHole(hole, outerNode) {
	const bridge = findHoleBridge(hole, outerNode);
	if (!bridge) return outerNode;
	const bridgeReverse = splitPolygon(bridge, hole);
	const bridge2 = bridgeReverse.next;
	indexSegment(bridge, bridge2.next);
	filterPoints(bridgeReverse, bridgeReverse.next);
	return filterPoints(bridge, bridge.next);
}
var K = 16;
var blockBBox = /* @__PURE__ */ new Float64Array(0);
var numBlocks = 0;
/** @type {Node[]} */
var blockHead = [];
/** @type {Node[]} */
var blockStop = [];
/** @param {number} maxNodes @param {number} numHoles */
function buildBlockIndex(maxNodes, numHoles) {
	const maxBlocks = Math.ceil((maxNodes + 2 * numHoles) / K) + numHoles + 2;
	if (blockBBox.length < maxBlocks * 4) blockBBox = new Float64Array(maxBlocks * 4);
	numBlocks = 0;
}
/** @param {Node} head @param {Node} stop */
function indexSegment(head, stop) {
	let p = head;
	do {
		const b = numBlocks++;
		blockHead[b] = p;
		let minX = p.x, minY = p.y, maxX = p.x, maxY = p.y;
		let k = 0;
		do {
			const c = p.next;
			p.z = b;
			if (c.x < minX) minX = c.x;
			if (c.x > maxX) maxX = c.x;
			if (c.y < minY) minY = c.y;
			if (c.y > maxY) maxY = c.y;
			p = c;
		} while (++k < K && p !== stop);
		blockStop[b] = p;
		const g = b * 4;
		blockBBox[g] = minX;
		blockBBox[g + 1] = minY;
		blockBBox[g + 2] = maxX;
		blockBBox[g + 3] = maxY;
	} while (p !== stop);
}
/** @param {Node} head @param {Node} tail */
function growBlock(head, tail) {
	const g = head.z * 4;
	if (tail.x < blockBBox[g]) blockBBox[g] = tail.x;
	if (tail.y < blockBBox[g + 1]) blockBBox[g + 1] = tail.y;
	if (tail.x > blockBBox[g + 2]) blockBBox[g + 2] = tail.x;
	if (tail.y > blockBBox[g + 3]) blockBBox[g + 3] = tail.y;
}
/** @param {number} b @returns {Node} */
function liveBlockStop(b) {
	let stop = blockStop[b];
	while (stop.prev.next !== stop) stop = stop.next;
	blockStop[b] = stop;
	return stop;
}
/** @param {number} b @returns {Node} */
function liveBlockHead(b) {
	let head = blockHead[b];
	while (head.prev.next !== head) head = head.next;
	blockHead[b] = head;
	return head;
}
/** @param {Node} hole @param {Node} outerNode @returns {Node | null} */
function findHoleBridge(hole, outerNode) {
	let p = outerNode;
	const hx = hole.x;
	const hy = hole.y;
	let qx = -Infinity;
	/** @type {Node | undefined} */
	let m;
	if (equals(hole, p)) return p;
	for (let b = 0, g = 0; b < numBlocks; b++, g += 4) {
		if (hy < blockBBox[g + 1] || hy > blockBBox[g + 3] || blockBBox[g] > hx || blockBBox[g + 2] <= qx) continue;
		const stop = liveBlockStop(b);
		p = liveBlockHead(b);
		do {
			if (p.prev.next === p) {
				if (equals(hole, p.next)) return p.next;
				else if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
					const x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
					if (x <= hx && x > qx) {
						qx = x;
						m = p.x < p.next.x ? p : p.next;
						if (x === hx) return m;
					}
				}
			}
			p = p.next;
		} while (p !== stop);
	}
	if (!m) return null;
	const mx = m.x;
	const my = m.y;
	const tminY = Math.min(hy, my);
	const tmaxY = Math.max(hy, my);
	let tanMin = Infinity;
	for (let b = 0, g = 0; b < numBlocks; b++, g += 4) {
		if (blockBBox[g + 2] < mx || blockBBox[g] > hx || blockBBox[g + 3] < tminY || blockBBox[g + 1] > tmaxY) continue;
		const stop = liveBlockStop(b);
		p = liveBlockHead(b);
		do {
			if (p.prev.next === p && hx >= p.x && p.x >= mx && hx !== p.x && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
				const tan = Math.abs(hy - p.y) / (hx - p.x);
				if ((locallyInside(p, hole) || p.y === hy && p.next.y === hy && p.next.x > hx) && (tan < tanMin || tan === tanMin && (p.x > m.x || p.x === m.x && sectorContainsSector(m, p)))) {
					m = p;
					tanMin = tan;
				}
			}
			p = p.next;
		} while (p !== stop);
	}
	return m;
}
/** @param {Node} m @param {Node} p @returns {boolean} */
function sectorContainsSector(m, p) {
	return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}
/** @type {Node[]} */
var sortArr = [];
/** @type {Node[]} */
var sortBuf = [];
var zArr = /* @__PURE__ */ new Uint32Array(0);
var zBuf = /* @__PURE__ */ new Uint32Array(0);
var counts = /* @__PURE__ */ new Uint32Array(256);
/** @param {Node} start @param {number} minX @param {number} minY @param {number} invSize */
function indexCurve(start, minX, minY, invSize) {
	let p = start;
	let n = 0;
	do {
		p.z = zOrder(p.x, p.y, minX, minY, invSize);
		sortArr[n++] = p;
		p = p.next;
	} while (p !== start);
	sortNodes(n);
	/** @type {Node | null} */
	let prev = null;
	for (let i = 0; i < n; i++) {
		const node = sortArr[i];
		node.prevZ = prev;
		if (prev) prev.nextZ = node;
		prev = node;
	}
	/** @type {Node} */ prev.nextZ = null;
	sortArr.fill(null, 0, n);
	sortBuf.fill(null, 0, n);
}
/** @param {number} n */
function sortNodes(n) {
	if (n <= 32) {
		for (let i = 1; i < n; i++) {
			const node = sortArr[i], z = node.z;
			let j = i - 1;
			while (j >= 0 && sortArr[j].z > z) {
				sortArr[j + 1] = sortArr[j];
				j--;
			}
			sortArr[j + 1] = node;
		}
		return;
	}
	if (zArr.length < n) {
		zArr = new Uint32Array(n);
		zBuf = new Uint32Array(n);
		sortBuf = new Array(n);
	}
	for (let i = 0; i < n; i++) zArr[i] = sortArr[i].z;
	radixPass(n, sortArr, zArr, sortBuf, zBuf, 0);
	radixPass(n, sortBuf, zBuf, sortArr, zArr, 8);
	radixPass(n, sortArr, zArr, sortBuf, zBuf, 16);
	radixPass(n, sortBuf, zBuf, sortArr, zArr, 24);
}
/** @param {number} n @param {Node[]} src @param {Uint32Array} srcZ @param {Node[]} dst @param {Uint32Array} dstZ @param {number} shift */
function radixPass(n, src, srcZ, dst, dstZ, shift) {
	counts.fill(0);
	for (let i = 0; i < n; i++) counts[srcZ[i] >>> shift & 255]++;
	let sum = 0;
	for (let b = 0; b < 256; b++) {
		const c = counts[b];
		counts[b] = sum;
		sum += c;
	}
	for (let i = 0; i < n; i++) {
		const z = srcZ[i];
		const pos = counts[z >>> shift & 255]++;
		dst[pos] = src[i];
		dstZ[pos] = z;
	}
}
/** @param {number} x @param {number} y @param {number} minX @param {number} minY @param {number} invSize @returns {number} */
function zOrder(x, y, minX, minY, invSize) {
	x = (x - minX) * invSize | 0;
	y = (y - minY) * invSize | 0;
	x = (x | x << 8) & 16711935;
	x = (x | x << 4) & 252645135;
	x = (x | x << 2) & 858993459;
	x = (x | x << 1) & 1431655765;
	y = (y | y << 8) & 16711935;
	y = (y | y << 4) & 252645135;
	y = (y | y << 2) & 858993459;
	y = (y | y << 1) & 1431655765;
	return x | y << 1;
}
/** @param {Node} start @returns {Node} */
function getLeftmost(start) {
	let p = start, leftmost = start;
	do {
		if (p.x < leftmost.x || p.x === leftmost.x && p.y < leftmost.y) leftmost = p;
		p = p.next;
	} while (p !== start);
	return leftmost;
}
/** @param {number} ax @param {number} ay @param {number} bx @param {number} by @param {number} cx @param {number} cy @param {number} px @param {number} py @returns {boolean} */
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
	return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
}
/** @param {Node} a @param {Node} b @returns {boolean} true when the diagonal is valid */
function isValidDiagonal(a, b) {
	const zeroLength = equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0;
	return a.next.i !== b.i && (zeroLength || locallyInside(a, b) && locallyInside(b, a) && (area(a.prev, a, b.prev) !== 0 || area(a, b.prev, b) !== 0)) && !intersectsPolygon(a, b) && (zeroLength || middleInside(a, b));
}
/** @param {Node} p @param {Node} q @param {Node} r @returns {number} */
function area(p, q, r) {
	return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}
/** @param {Node} p1 @param {Node} p2 @returns {boolean} */
function equals(p1, p2) {
	return p1.x === p2.x && p1.y === p2.y;
}
/** @param {Node} p1 @param {Node} q1 @param {Node} p2 @param {Node} q2 @param {boolean} [includeBoundary] @returns {boolean} */
function intersects(p1, q1, p2, q2, includeBoundary = true) {
	const o1 = area(p1, q1, p2);
	const o2 = area(p1, q1, q2);
	const o3 = area(p2, q2, p1);
	const o4 = area(p2, q2, q1);
	if ((o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0)) return true;
	if (!includeBoundary) return false;
	if (o1 === 0 && onSegment(p1, p2, q1)) return true;
	if (o2 === 0 && onSegment(p1, q2, q1)) return true;
	if (o3 === 0 && onSegment(p2, p1, q2)) return true;
	if (o4 === 0 && onSegment(p2, q1, q2)) return true;
	return false;
}
/** @param {Node} p @param {Node} q @param {Node} r @returns {boolean} */
function onSegment(p, q, r) {
	return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}
/** @param {Node} a @param {Node} b @returns {boolean} */
function intersectsPolygon(a, b) {
	const minX = Math.min(a.x, b.x);
	const maxX = Math.max(a.x, b.x);
	const minY = Math.min(a.y, b.y);
	const maxY = Math.max(a.y, b.y);
	let p = a;
	do {
		const n = p.next;
		if (p.x > maxX && n.x > maxX || p.x < minX && n.x < minX || p.y > maxY && n.y > maxY || p.y < minY && n.y < minY) {
			p = n;
			continue;
		}
		if (p.i !== a.i && n.i !== a.i && p.i !== b.i && n.i !== b.i && intersects(p, n, a, b)) return true;
		p = n;
	} while (p !== a);
	return false;
}
/** @param {Node} a @param {Node} b @returns {boolean} */
function locallyInside(a, b) {
	return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}
/** @param {Node} a @param {Node} b @returns {boolean} */
function middleInside(a, b) {
	let p = a;
	let inside = false;
	const px = (a.x + b.x) / 2;
	const py = (a.y + b.y) / 2;
	do {
		const n = p.next;
		if (p.y > py !== n.y > py && px < (n.x - p.x) * (py - p.y) / (n.y - p.y) + p.x) inside = !inside;
		p = n;
	} while (p !== a);
	return inside;
}
/** @param {Node} a @param {Node} b @returns {Node} */
function splitPolygon(a, b) {
	const a2 = createNode(a.i, a.x, a.y), b2 = createNode(b.i, b.x, b.y), an = a.next, bp = b.prev;
	a.next = b;
	b.prev = a;
	a2.next = an;
	an.prev = a2;
	b2.next = a2;
	a2.prev = b2;
	bp.next = b2;
	b2.prev = bp;
	return b2;
}
/** @param {number} i @param {number} x @param {number} y @param {Node | null} last @returns {Node} */
function insertNode(i, x, y, last) {
	const p = createNode(i, x, y);
	if (!last) {
		p.prev = p;
		p.next = p;
	} else {
		p.next = last.next;
		p.prev = last;
		last.next.prev = p;
		last.next = p;
	}
	return p;
}
/** @param {Node} p */
function removeNode(p) {
	p.next.prev = p.prev;
	p.prev.next = p.next;
	if (p.prevZ) p.prevZ.nextZ = p.nextZ;
	if (p.nextZ) p.nextZ.prevZ = p.prevZ;
	if (indexActive) growBlock(p.prev, p.next);
}
/** @param {number} i @param {number} x @param {number} y @returns {Node} */
function createNode(i, x, y) {
	return {
		i,
		x,
		y,
		prev: null,
		next: null,
		z: 0,
		prevZ: null,
		nextZ: null
	};
}
/** @param {ArrayLike<number>} data @param {number} start @param {number} end @param {number} dim @returns {number} */
function signedArea(data, start, end, dim) {
	let sum = 0;
	for (let i = start, j = end - dim; i < end; i += dim) {
		sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
		j = i;
	}
	return sum;
}
// src/core/opening-symbol.ts
function openingPath(w, from, to, depth = 0) {
	const arc = arcParams(w), n = arc ? Math.max(2, Math.ceil(Math.abs(to - from) / 150), Math.ceil(Math.abs(to - from) / wallLength(w) * Math.abs(arc.angle) / 5)) : 1;
	return Array.from({ length: n + 1 }, (_, i) => {
		const s = from + (to - from) * i / n, d = wallTangent(w, s);
		return add(pointAt(w, s), mul([-d[1], d[0]], depth));
	});
}
function openingStrip(w, from, to, thickness) {
	return [...openingPath(w, from, to, thickness / 2), ...openingPath(w, from, to, -thickness / 2).reverse()];
}
function openingPanes(o) {
	return o.kind === "door" ? o.panes?.length ? o.panes.map((p) => ({
		width: p.width,
		kind: "door"
	})) : [{
		width: 1,
		kind: "door"
	}] : o.kind === "doorway" || o.kind === "open-balcony" ? [] : o.panes?.length ? o.panes : o.kind === "sliding" ? [{
		width: 1,
		kind: "sliding"
	}, {
		width: 1,
		kind: "sliding"
	}] : [{
		width: 1,
		kind: "fixed"
	}];
}
function openingSymbol(plan, id, opts = {}) {
	const o = plan.openings.find((o) => o.id === id), w = plan.walls.find((w) => w.id === o?.wall);
	if (!o || !w) throw new Error(`洞口或宿主墙不存在：${id}`);
	const end = o.offset + o.width, edges = [openingPath(w, o.offset, end, w.thickness / 2), openingPath(w, o.offset, end, -w.thickness / 2)];
	const divider = (s) => {
		const p = pointAt(w, s), d = wallTangent(w, s), n = [-d[1], d[0]];
		return [add(p, mul(n, w.thickness / 2)), add(p, mul(n, -w.thickness / 2))];
	};
	const result = {
		id,
		wall: w.id,
		curved: !!w.bulge,
		path: openingPath(w, o.offset, end),
		edges,
		jambs: [divider(o.offset), divider(end)],
		divisions: [],
		leaves: []
	};
	const panes = openingPanes(o).filter((p) => p.width > 0), total = panes.reduce((s, p) => s + p.width, 0);
	let from = o.offset;
	panes.forEach((pane, index) => {
		const to = index === panes.length - 1 ? end : from + o.width * pane.width / total;
		let path = openingPath(w, from, to), footprint = openingStrip(w, from, to, pane.kind === "door" ? 40 : 30), hinge;
		if (pane.kind === "door") {
			const swing = o.swing ?? {
				hinge: panes.length > 1 && index === panes.length - 1 ? "end" : "start",
				side: 1
			}, angle = Math.max(0, Math.min(90, opts.doorAngle ?? 60)) * Math.PI / 180 * swing.side * (swing.hinge === "start" ? 1 : -1);
			hinge = pointAt(w, swing.hinge === "start" ? from : to);
			const rotate = (p) => {
				const x = p[0] - hinge[0], y = p[1] - hinge[1];
				return [hinge[0] + x * Math.cos(angle) - y * Math.sin(angle), hinge[1] + x * Math.sin(angle) + y * Math.cos(angle)];
			};
			path = path.map(rotate);
			footprint = footprint.map(rotate);
		}
		result.leaves.push({
			index,
			kind: pane.kind,
			s: [from, to],
			path,
			footprint,
			...hinge ? { hinge } : {}
		});
		if (index < panes.length - 1) result.divisions.push(divider(to));
		from = to;
	});
	return result;
}
// src/core/solids.ts
function unionPolygons(polys) {
	return polys.length ? index.union(polys[0], ...polys.slice(1)) : [];
}
function buildLevelSolids(plan, filter = () => true) {
	const pieces = [], result = [];
	const push = (kind, poly, z0, z1, ids, wallKind) => {
		if (z1 - z0 > 1e-8 && poly.length >= 3) pieces.push({
			kind,
			polygons: [[poly]],
			z0,
			z1,
			ids,
			...wallKind ? { wallKind } : {}
		});
	};
	for (const w of plan.walls.filter(filter)) {
		const len = wallLength(w), height = effectiveWallHeight(plan, w), low = Math.min(w.lowHeight ?? DEFAULTS.lowHeight, height);
		if (len <= 1e-7 || w.thickness <= 0 || height <= 0) continue;
		const openings = plan.openings.filter((o) => o.wall === w.id), cuts = [.../* @__PURE__ */ new Set([
			0,
			len,
			...openings.flatMap((o) => [Math.max(0, Math.min(len, o.offset)), Math.max(0, Math.min(len, o.offset + o.width))])
		])].sort((a, b) => a - b);
		for (let i = 1; i < cuts.length; i++) {
			const a = cuts[i - 1], b = cuts[i], middle = (a + b) / 2, holes = openings.filter((o) => o.offset < middle && o.offset + o.width > middle), polygons = joinedWallFootprint(plan, w, a, b);
			const zs = [.../* @__PURE__ */ new Set([
				0,
				height,
				...w.kind === "half" || w.kind === "half-glass" ? [low] : [],
				...holes.flatMap((o) => [Math.max(0, Math.min(height, o.sill)), Math.max(0, Math.min(height, o.head))])
			])].sort((a, b) => a - b);
			for (let j = 1; j < zs.length; j++) {
				const z0 = zs[j - 1], z1 = zs[j], z = (z0 + z1) / 2;
				if (holes.some((o) => z > o.sill && z < o.head) || w.kind === "half" && z > low) continue;
				const kind = w.kind === "glass" || w.kind === "half-glass" && z >= low ? "glass" : holes.length ? holes.every((o) => z >= o.head) ? "lintel" : "sill" : "wall";
				if (z1 - z0 > 1e-8 && polygons.length) pieces.push({
					kind,
					polygons,
					z0,
					z1,
					ids: [w.id, ...holes.map((o) => o.id)],
					wallKind: w.kind
				});
			}
		}
	}
	for (const b of plan.beams) {
		const d = [b.b[0] - b.a[0], b.b[1] - b.a[1]], ts = [0, 1];
		const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
		for (const r of plan.rooms.filter((r) => levelOf(plan, r).id === levelOf(plan, b).id)) r.poly.forEach((a, i) => {
			const q = r.poly[(i + 1) % r.poly.length], e = [q[0] - a[0], q[1] - a[1]], v = [a[0] - b.a[0], a[1] - b.a[1]], det = cross(d, e);
			if (Math.abs(det) > 1e-8) {
				const t = cross(v, e) / det, u = cross(v, d) / det;
				if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
			}
		});
		const cuts = [...new Set(ts)].sort((a, b) => a - b);
		for (let i = 1; i < cuts.length; i++) push("beam", beamFootprint({
			...b,
			a: add(b.a, mul(d, cuts[i - 1])),
			b: add(b.a, mul(d, cuts[i]))
		}), b.bottom, ceilingAt(plan, add(b.a, mul(d, (cuts[i - 1] + cuts[i]) / 2)), levelOf(plan, b).id), [b.id]);
	}
	const priority = {
		wall: 0,
		sill: 1,
		lintel: 2,
		beam: 3,
		glass: 4,
		floor: 5,
		platform: 6,
		slab: 7,
		stair: 8,
		column: 9,
		shaft: 10
	};
	pieces.sort((a, b) => priority[a.kind] - priority[b.kind] || (a.wallKind ?? "").localeCompare(b.wallKind ?? ""));
	const occupied = [];
	for (const piece of pieces) {
		let cells = [piece];
		for (const blocker of occupied) {
			cells = cells.flatMap((cell) => {
				const z0 = Math.max(cell.z0, blocker.z0), z1 = Math.min(cell.z1, blocker.z1);
				if (z1 - z0 <= 1e-8) return [cell];
				const inside = index.intersection(cell.polygons, blocker.polygons);
				if (!inside.length) return [cell];
				const outside = index.difference(cell.polygons, blocker.polygons);
				const rest = [];
				if (outside.length) rest.push({
					...cell,
					polygons: outside
				});
				if (z0 > cell.z0 + 1e-8) rest.push({
					...cell,
					polygons: inside,
					z1: z0
				});
				if (z1 < cell.z1 - 1e-8) rest.push({
					...cell,
					polygons: inside,
					z0: z1
				});
				return rest;
			});
			if (!cells.length) break;
		}
		const bands = /* @__PURE__ */ new Map();
		for (const cell of cells) {
			const key = `${cell.z0}:${cell.z1}`, prev = bands.get(key);
			bands.set(key, prev ? {
				...prev,
				polygons: unionPolygons([...prev.polygons, ...cell.polygons])
			} : cell);
		}
		result.push(...bands.values());
		occupied.push(piece);
	}
	for (const r of plan.rooms) if (r.poly.length >= 3) {
		result.push({
			kind: "floor",
			polygons: [[r.poly]],
			z0: Math.min(0, r.floorOffset ?? 0) - .08,
			z1: Math.min(0, r.floorOffset ?? 0),
			ids: [r.id]
		});
		if ((r.floorOffset ?? 0) > 0) result.push({
			kind: "platform",
			polygons: [[r.poly]],
			z0: 0,
			z1: r.floorOffset,
			ids: [r.id]
		});
	}
	return result;
}
/** Generate each level independently, then translate local heights to absolute elevations. */
function buildSolids(plan, filter = () => true) {
	if (!hasLevelData(plan)) return buildLevelSolids(plan, filter);
	return levelsOf(plan).flatMap((level, index$1) => {
		const view = onLevel(plan, level.id), holes = (view.voids ?? []).map((v) => [v.poly]);
		const cut = (polys) => holes.length && polys.length ? index.difference(polys, ...holes) : polys;
		const solids = buildLevelSolids(view, filter).map((s) => {
			if (s.kind === "floor" || s.kind === "platform") s = {
				...s,
				polygons: cut(s.polygons)
			};
			if (index$1 > 0 && s.kind === "floor") s = {
				...s,
				kind: "slab",
				z0: s.z1 - .12
			};
			return {
				...s,
				level: level.id,
				z0: s.z0 + level.elevation,
				z1: s.z1 + level.elevation
			};
		}).filter((s) => s.polygons.length);
		if (index$1 > 0) {
			let polys = wallFootprints(view);
			const rooms = view.rooms.filter((r) => r.poly.length >= 3).map((r) => [r.poly]);
			if (polys.length && rooms.length) polys = index.difference(polys, ...rooms);
			polys = cut(polys);
			if (polys.length) solids.push({
				kind: "slab",
				polygons: polys,
				z0: level.elevation - .12,
				z1: level.elevation,
				ids: view.walls.map((w) => w.id),
				level: level.id
			});
		}
		for (const c of view.columns ?? []) solids.push({
			kind: "column",
			polygons: [[columnFootprint(c)]],
			z0: level.elevation,
			z1: level.elevation + levelCeiling(plan, level.id),
			ids: [c.id],
			level: level.id
		});
		for (const shaft of view.shafts ?? []) if (shaft.poly.length >= 3) solids.push({
			kind: "shaft",
			polygons: [[shaft.poly]],
			z0: level.elevation,
			z1: level.elevation + levelCeiling(plan, level.id),
			ids: [shaft.id],
			level: level.id
		});
		for (const stair of view.stairs ?? []) {
			const target = levelsOf(plan).find((l) => l.id === stair.to);
			if (!target || target.elevation <= level.elevation || stair.path.length < 2) continue;
			const lengths = stair.path.slice(1).map((p, i) => distance$1(stair.path[i], p)), total = lengths.reduce((a, b) => a + b, 0);
			const count = stair.steps ?? Math.max(1, Math.ceil((target.elevation - level.elevation) / .17));
			if (!total || !Number.isInteger(count) || count < 1) continue;
			for (let step = 0; step < count; step++) {
				const from = total * step / count, to = total * (step + 1) / count;
				let offset = 0;
				const strips = [];
				lengths.forEach((length, i) => {
					const a = Math.max(from, offset), b = Math.min(to, offset + length);
					if (b > a && length > 0) {
						const origin = stair.path[i], d = mul(sub$1(stair.path[i + 1], origin), 1 / length);
						strips.push([beamFootprint({
							id: stair.id,
							a: add(origin, mul(d, a - offset)),
							b: add(origin, mul(d, b - offset)),
							width: stair.width,
							bottom: 0
						})]);
					}
					offset += length;
				});
				const polys = unionPolygons(strips);
				const polygons = polys.length ? index.intersection(polys, [stair.poly]) : [];
				if (polygons.length) solids.push({
					kind: "stair",
					polygons,
					z0: level.elevation,
					z1: level.elevation + (target.elevation - level.elevation) * (step + 1) / count,
					ids: [stair.id],
					level: level.id
				});
			}
		}
		return solids;
	});
}
/** Plan dimensions remain mm; vertical dimensions are m; opening angle is degrees. */
function buildLocalFixtures(plan, opts = {}) {
	const result = [];
	for (const o of plan.openings) {
		if (!plan.walls.some((w) => w.id === o.wall) || o.head <= o.sill) continue;
		const s = openingSpan(plan, o);
		if (s.wall.bulge && o.kind !== "open-balcony" && o.kind !== "doorway") {
			const symbol = openingSymbol(plan, o.id, opts);
			for (const leaf of symbol.leaves) {
				const a = leaf.path[0], b = leaf.path.at(-1), dir = wallDir({
					a,
					b
				}), normal = [-dir[1], dir[0]], width = leaf.s[1] - leaf.s[0];
				const common = {
					id: o.id,
					wall: o.wall,
					path: leaf.path,
					footprint: leaf.footprint,
					paneIndex: leaf.index,
					dir,
					normal,
					width,
					z0: o.sill
				};
				if (leaf.kind === "door") result.push({
					...common,
					kind: "door",
					hinge: leaf.hinge,
					position: leaf.path[Math.floor(leaf.path.length / 2)],
					thickness: 40,
					height: o.head - o.sill,
					angle: Math.max(0, Math.min(90, opts.doorAngle ?? 60)),
					side: o.swing?.side ?? 1
				});
				else result.push({
					...common,
					kind: "pane",
					openingKind: o.kind,
					paneKind: leaf.kind,
					a,
					b,
					center: leaf.path[Math.floor(leaf.path.length / 2)],
					thickness: 30,
					z1: o.head
				});
			}
			continue;
		}
		if (o.kind === "door") {
			const chordDir = wallDir({
				a: s.a,
				b: s.b
			}), chordNormal = [-chordDir[1], chordDir[0]], width = s.wall.bulge ? distance$1(s.a, s.b) : o.width;
			const swing = o.swing ?? {
				hinge: "start",
				side: 1
			}, hinge = swing.hinge === "start" ? s.a : s.b, closed = mul(chordDir, swing.hinge === "start" ? 1 : -1), angle = Math.max(0, Math.min(90, opts.doorAngle ?? 60)), rad = angle * Math.PI / 180;
			const dir = add(mul(closed, Math.cos(rad)), mul(chordNormal, swing.side * Math.sin(rad)));
			result.push({
				kind: "door",
				id: o.id,
				wall: o.wall,
				hinge,
				position: add(hinge, mul(dir, width / 2)),
				dir,
				normal: [-dir[1], dir[0]],
				width,
				thickness: 40,
				height: o.head - o.sill,
				z0: o.sill,
				angle,
				side: swing.side
			});
		} else if (o.kind === "open-balcony") result.push({
			kind: "railing",
			id: o.id,
			wall: o.wall,
			a: s.a,
			b: s.b,
			z0: o.sill,
			z1: o.sill + 1.1,
			height: 1.1
		});
		else if (o.kind !== "doorway") {
			const panes = o.panes?.length ? o.panes : o.kind === "sliding" ? [{
				width: 1,
				kind: "sliding"
			}, {
				width: 1,
				kind: "sliding"
			}] : [{
				width: 1,
				kind: "fixed"
			}], total = panes.reduce((sum, p) => sum + Math.max(0, p.width), 0);
			if (!total) continue;
			let offset = o.offset;
			for (const pane of panes) {
				const width = Math.max(0, pane.width) / total * o.width, count = s.wall.bulge ? Math.max(1, Math.ceil(width / 300)) : 1;
				for (let i = 0; i < count; i++) {
					const a = pointAt(s.wall, offset + width * i / count), b = pointAt(s.wall, offset + width * (i + 1) / count), dir = wallDir({
						a,
						b
					});
					result.push({
						kind: "pane",
						id: o.id,
						wall: o.wall,
						openingKind: o.kind,
						paneKind: pane.kind,
						a,
						b,
						center: s.wall.bulge ? mul(add(a, b), .5) : pointAt(s.wall, offset + width / 2),
						dir: s.wall.bulge ? dir : s.dir,
						normal: s.wall.bulge ? [-dir[1], dir[0]] : s.normal,
						width: s.wall.bulge ? distance$1(a, b) : width,
						thickness: 30,
						z0: o.sill,
						z1: o.head
					});
				}
				offset += width;
			}
		}
	}
	return result;
}
function buildFixtures(plan, opts = {}) {
	return buildLocalFixtures(plan, opts).map((f) => {
		const level = levelOf(plan, plan.walls.find((w) => w.id === f.wall));
		return {
			...f,
			z0: f.z0 + level.elevation,
			..."z1" in f ? { z1: f.z1 + level.elevation } : {},
			...hasLevelData(plan) ? { level: level.id } : {}
		};
	});
}
// src/core/mesh.ts
/** White-model palette = the tool's clay3 set in three/materials.ts (sRGB). Glass is a pale cool white, drawn see-through.
* Decor follows the tool's decor-mode clay look: furniture in the platform tone, cabinets and panels in the wall tone. */
var CLAY_COLORS = {
	wall: "#f4f4f3",
	sill: "#f4f4f3",
	lintel: "#f4f4f3",
	glass: "#eef3f7",
	beam: "#f1f1f0",
	floor: "#e8e8e6",
	platform: "#f0f0ee",
	slab: "#f4f4f3",
	stair: "#f0f0ee",
	column: "#f4f4f3",
	shaft: "#f4f4f3",
	leaf: "#f6f6f5",
	pane: "#eef3f7",
	rail: "#ececea",
	plinth: "#f2f2f1",
	ceiling: "#f4f4f3",
	furniture: "#f0f0ee",
	cabinet: "#f4f4f3"
};
/** Kinds drawn as light see-through glass (GLB alpha blend, raster one-layer see-through). */
var GLASS_KINDS = /* @__PURE__ */ new Set(["glass", "pane"]);
var GLASS_OPACITY = .3;
function modelPlan(plan, state = "original") {
	if (state !== "original" && state !== "renovated") throw new Error("state 必须为 original 或 renovated");
	if (state === "original") return plan;
	const changes = plan.changes.filter((c) => c.status === "confirmed");
	const replay = plan.legacy?.__structureReplayFrame ? {
		plan,
		results: changes.map((c) => ({
			id: c.id,
			ok: true,
			affected: [c.target ?? String(c.data?.id ?? "")],
			removed: []
		}))
	} : applyChanges(plan, changes);
	const failed = replay.results.filter((r) => !r.ok);
	if (failed.length) throw new Error(`改造重放失败：${failed.map((r) => `${r.id}: ${r.error}`).join("; ")}`);
	const errors = validateReplay(replay, changes, plan.legacy?.__structureReplayFrame ? void 0 : plan).filter((i) => i.level === "error");
	if (errors.length) throw new Error(`改造最终校验失败：${errors.map((i) => `${i.code}: ${i.message}`).join("; ")}`);
	return replay.plan;
}
var ringArea = (r) => r.reduce((s, a, i) => {
	const b = r[(i + 1) % r.length];
	return s + a[0] * b[1] - b[0] * a[1];
}, 0);
/** Extrude rings with earcut caps and explicit hole-facing side walls. Heights already use metres. */
function solidMesh(solid) {
	const positions = [], normals = [];
	const triangle = (a, b, c) => {
		const u = b.map((x, i) => x - a[i]), v = c.map((x, i) => x - a[i]);
		const n = [
			u[1] * v[2] - u[2] * v[1],
			u[2] * v[0] - u[0] * v[2],
			u[0] * v[1] - u[1] * v[0]
		], l = Math.hypot(...n);
		if (l < 1e-12) return;
		positions.push(...a, ...b, ...c);
		for (let i = 0; i < 3; i++) normals.push(...n.map((x) => x / l));
	};
	if (solid.z1 <= solid.z0) return {
		...solid,
		positions,
		normals
	};
	for (const poly of solid.polygons) {
		const rings = poly.map((ring, i) => {
			let r = ring.filter((p, j) => j === 0 || p[0] !== ring[j - 1][0] || p[1] !== ring[j - 1][1]);
			if (r.length > 1 && r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1]) r = r.slice(0, -1);
			return ringArea(r) > 0 === (i === 0) ? r : [...r].reverse();
		}).filter((r) => r.length >= 3);
		if (!rings.length) continue;
		const points = rings.flat(), holes = [];
		let offset = rings[0].length;
		for (const r of rings.slice(1)) {
			holes.push(offset);
			offset += r.length;
		}
		const indices = earcut(points.flat(), holes, 2);
		const p = (v, h) => [
			v[0] / 1e3,
			h,
			v[1] / 1e3
		];
		for (let i = 0; i < indices.length; i += 3) {
			const a = points[indices[i]], b = points[indices[i + 1]], c = points[indices[i + 2]];
			const ccw = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
			const B = ccw ? c : b, C = ccw ? b : c;
			triangle(p(a, solid.z1), p(B, solid.z1), p(C, solid.z1));
			triangle(p(a, solid.z0), p(C, solid.z0), p(B, solid.z0));
		}
		for (const ring of rings) ring.forEach((a, i) => {
			const b = ring[(i + 1) % ring.length];
			triangle(p(a, solid.z0), p(a, solid.z1), p(b, solid.z1));
			triangle(p(a, solid.z0), p(b, solid.z1), p(b, solid.z0));
		});
	}
	return {
		kind: solid.kind,
		ids: [...solid.ids],
		level: solid.level,
		positions,
		normals
	};
}
function buildMesh(plan, options = {}) {
	const full = modelPlan(plan, options.state);
	assertLevel(full, options.level);
	const selected = options.level ? onLevel(full, options.level) : full, parts = [];
	const add = (s) => {
		if (options.cutHeight !== void 0) {
			const elevation = levelOf(selected, { level: s.level }).elevation;
			s = {
				...s,
				z1: Math.min(s.z1, elevation + options.cutHeight)
			};
		}
		const mesh = solidMesh(s);
		if (mesh.positions.length) parts.push(mesh);
	};
	buildSolids(selected).forEach(add);
	for (const o of selected.openings) {
		const wall = selected.walls.find((w) => w.id === o.wall);
		if (!wall || o.sill > .001) continue;
		const el = levelOf(selected, wall).elevation;
		add({
			kind: "floor",
			ids: [o.id],
			level: levelOf(selected, wall).id,
			polygons: [[openingFootprint(selected, o)]],
			z0: el - .08,
			z1: el
		});
	}
	const box = (kind, id, level, center, dir, width, depth, z0, z1) => {
		const poly = [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1]
		].map(([x, y]) => [center[0] + dir[0] * x * width / 2 - dir[1] * y * depth / 2, center[1] + dir[1] * x * width / 2 + dir[0] * y * depth / 2]);
		add({
			kind,
			ids: [id],
			level,
			polygons: [[poly]],
			z0,
			z1
		});
	};
	for (const f of buildFixtures(selected, { doorAngle: 68 })) if (f.footprint && f.kind !== "railing") add({
		kind: f.kind === "door" ? "leaf" : "pane",
		ids: [f.id],
		level: f.level,
		polygons: [[f.footprint]],
		z0: f.z0,
		z1: f.kind === "door" ? f.z0 + f.height : f.z1
	});
	else if (f.kind === "door") box("leaf", f.id, f.level, f.position, f.dir, Math.max(1, f.width - 20), f.thickness, f.z0 + .01, f.z0 + f.height - .01);
	else if (f.kind === "pane") box("pane", f.id, f.level, f.center, f.dir, Math.max(10, f.width - 30), f.thickness, f.z0, f.z1);
	else {
		const length = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]), d = [(f.b[0] - f.a[0]) / (length || 1), (f.b[1] - f.a[1]) / (length || 1)], c = [(f.a[0] + f.b[0]) / 2, (f.a[1] + f.b[1]) / 2];
		box("rail", f.id, f.level, c, d, length, 50, f.z1 - .05, f.z1);
		box("pane", f.id, f.level, c, d, Math.max(1, length - 40), 16, f.z0 + .05, f.z1 - .05);
	}
	for (const o of selected.openings) {
		const w = selected.walls.find((w) => w.id === o.wall);
		if (!w?.bulge || o.kind === "doorway" || o.kind === "open-balcony") continue;
		const symbol = openingSymbol(selected, o.id), level = levelOf(selected, w), z0 = level.elevation + o.sill, z1 = level.elevation + o.head;
		for (const [a, b] of [...symbol.jambs, ...symbol.divisions]) {
			const center = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = Math.hypot(b[0] - a[0], b[1] - a[1]);
			box("leaf", o.id, level.id, center, [-(b[1] - a[1]) / n, (b[0] - a[0]) / n], 30, 40, z0, z1);
		}
		const polygons = [[openingStrip(w, o.offset, o.offset + o.width, 40)]];
		add({
			kind: "leaf",
			ids: [o.id],
			level: level.id,
			polygons,
			z0: z1 - .03,
			z1
		});
		if (o.kind !== "door") add({
			kind: "leaf",
			ids: [o.id],
			level: level.id,
			polygons,
			z0,
			z1: z0 + .03
		});
	}
	const groups = /* @__PURE__ */ new Map();
	for (const p of parts) {
		if (!groups.has(p.kind)) groups.set(p.kind, []);
		groups.get(p.kind).push(p);
	}
	return [...groups].map(([kind, parts]) => ({
		kind,
		parts
	}));
}
// src/core/glb.ts
/** glTF uses linear material factors; the tool's palette is authored in sRGB. */
var linearColor = (hex) => [
	1,
	3,
	5
].map((i) => {
	const s = parseInt(hex.slice(i, i + 2), 16) / 255;
	return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
});
function meshToGlb(groups) {
	const chunks = [], bufferViews = [], accessors = [], meshes = [], materials = [], nodes = [], sceneNodes = [];
	let byteLength = 0;
	const attribute = (values, bounds) => {
		const bytes = new Uint8Array(values.length * 4), view = new DataView(bytes.buffer);
		values.forEach((x, i) => view.setFloat32(i * 4, x, true));
		const bufferView = bufferViews.length;
		bufferViews.push({
			buffer: 0,
			byteOffset: byteLength,
			byteLength: bytes.length,
			target: 34962
		});
		chunks.push(bytes);
		byteLength += bytes.length;
		const min = [
			Infinity,
			Infinity,
			Infinity
		], max = [
			-Infinity,
			-Infinity,
			-Infinity
		];
		values.forEach((x, i) => {
			const v = Math.fround(x);
			min[i % 3] = Math.min(min[i % 3], v);
			max[i % 3] = Math.max(max[i % 3], v);
		});
		accessors.push({
			bufferView,
			componentType: 5126,
			count: values.length / 3,
			type: "VEC3",
			...bounds ? {
				min,
				max
			} : {}
		});
		return accessors.length - 1;
	};
	for (const group of groups.filter((g) => g.parts.some((p) => p.positions.length))) {
		const index = meshes.length, ids = [...new Set(group.parts.flatMap((p) => p.ids))];
		const glass = GLASS_KINDS.has(group.kind);
		materials.push({
			name: group.kind,
			pbrMetallicRoughness: {
				baseColorFactor: [...linearColor(CLAY_COLORS[group.kind]), glass ? GLASS_OPACITY : 1],
				metallicFactor: 0,
				roughnessFactor: glass ? .15 : .92
			},
			...glass ? {
				alphaMode: "BLEND",
				doubleSided: true
			} : { doubleSided: false }
		});
		const primitives = group.parts.filter((p) => p.positions.length).map((p) => ({
			attributes: {
				POSITION: attribute(p.positions, true),
				NORMAL: attribute(p.normals, false)
			},
			material: index,
			mode: 4,
			extras: {
				ids: p.ids,
				level: p.level
			}
		}));
		meshes.push({
			name: group.kind,
			primitives
		});
		const nodeIndex = nodes.length;
		nodes.push({
			name: ids.join(", ") || group.kind,
			mesh: index,
			extras: {
				kind: group.kind,
				ids
			},
			children: []
		});
		for (const id of ids) {
			nodes[nodeIndex].children.push(nodes.length);
			nodes.push({
				name: id,
				extras: {
					kind: group.kind,
					primitives: primitives.flatMap((p, i) => p.extras.ids.includes(id) ? [i] : [])
				}
			});
		}
		if (!ids.length) delete nodes[nodeIndex].children;
		sceneNodes.push(nodeIndex);
	}
	const json = {
		asset: {
			version: "2.0",
			generator: "floorplan-structure core",
			extras: {
				units: "metres",
				upAxis: "Y"
			}
		},
		scene: 0,
		scenes: [sceneNodes.length ? { nodes: sceneNodes } : {}],
		...meshes.length ? {
			nodes,
			meshes,
			materials,
			accessors,
			bufferViews,
			buffers: [{ byteLength }]
		} : {}
	};
	const raw = new TextEncoder().encode(JSON.stringify(json)), jsonLength = Math.ceil(raw.length / 4) * 4, binLength = Math.ceil(byteLength / 4) * 4;
	const out = new Uint8Array(20 + jsonLength + (binLength ? 8 + binLength : 0)), header = new DataView(out.buffer);
	header.setUint32(0, 1179937895, true);
	header.setUint32(4, 2, true);
	header.setUint32(8, out.length, true);
	header.setUint32(12, jsonLength, true);
	header.setUint32(16, 1313821514, true);
	out.fill(32, 20, 20 + jsonLength);
	out.set(raw, 20);
	if (binLength) {
		const start = 20 + jsonLength;
		header.setUint32(start, binLength, true);
		header.setUint32(start + 4, 5130562, true);
		let offset = start + 8;
		for (const chunk of chunks) {
			out.set(chunk, offset);
			offset += chunk.length;
		}
	}
	return out;
}
function exportGlb(plan, options = {}) {
	return meshToGlb(buildMesh(plan, options));
}
// src/core/merge-rooms.ts
var ring = (poly) => [poly];
/**
* 房间贴着这面墙的那段（沿墙 mm）：墙带和房间多边形求交，再取沿墙范围。
* 不能靠房间顶点：房间比墙长时，顶点都在墙端以外，投影过去离墙很远。
*/
function roomSpanOnWall(w, poly) {
	const hit = index.intersection(ring(wallFootprint({
		...w,
		thickness: w.thickness + 120
	})), ring(poly)).flat(2);
	if (!hit.length) return null;
	const s = hit.map((p) => projectToWall(w, p).s);
	return [Math.min(...s), Math.max(...s)];
}
// src/core/decor/solids.ts
/** A complete structural scene, with real recesses subtracted; buildSolids stays untouched. */
function decorWallSolids(plan, decor = plan.decor) {
	const base = buildSolids(plan);
	if (!decor) return base;
	const source = decorItems(decor), cuts = embedsOf(plan, decor).filter((e) => {
		return !checkEmbed(plan, decor, source.find((x) => x.id === e.id)).some((i) => i.level === "error");
	}).map((e) => {
		const level = levelOf(plan, faceWall(plan, e.face));
		return {
			...e,
			wallIds: faceRun(plan, e.face).filter((p) => overlap(p.s, e.s)).map((p) => p.wall.id),
			level: level.id,
			z: [e.z[0] + level.elevation, e.z[1] + level.elevation],
			poly: embedFootprint(plan, e)
		};
	});
	return base.flatMap((s) => {
		if (![
			"wall",
			"sill",
			"lintel"
		].includes(s.kind)) return [s];
		const active = cuts.filter((c) => s.ids.some((id) => c.wallIds.includes(id)) && c.level === (s.level ?? levelsOf(plan)[0].id) && overlap(c.z, [s.z0, s.z1]));
		if (!active.length) return [s];
		const zs = [.../* @__PURE__ */ new Set([
			s.z0,
			s.z1,
			...active.flatMap((c) => c.z.filter((z) => z > s.z0 && z < s.z1))
		])].sort((a, b) => a - b);
		return zs.slice(1).flatMap((z1, i) => {
			const z0 = zs[i], polygons = difference(s.polygons, active.filter((c) => c.z[0] < z1 && c.z[1] > z0).map((c) => [c.poly]));
			return polygons.length ? [{
				...s,
				z0,
				z1,
				polygons
			}] : [];
		});
	});
}
/** Extruded elevation rectangles, with arbitrary overlapping blind/through box cuts. */
function cutBox(kind, id, rect, depth, cuts, at, level, material) {
	const active = cuts.filter((c) => overlap(c.z, rect.z) && overlap(c.u, rect.u) && overlap(c.depth, depth)), zs = [.../* @__PURE__ */ new Set([...rect.z, ...active.flatMap((c) => c.z.filter((z) => z > rect.z[0] && z < rect.z[1]))])].sort((a, b) => a - b);
	const local = [[rectPoly({
		u: rect.u,
		z: depth
	})]];
	return zs.slice(1).flatMap((z1, i) => {
		const z0 = zs[i], polygons = difference(local, active.filter((c) => c.z[0] < z1 && c.z[1] > z0).map((c) => [rectPoly({
			u: c.u,
			z: c.depth
		})])).map((rings) => rings.map((r) => r.map(([u, d]) => at(u, d))));
		return polygons.length && z1 > z0 ? [{
			kind,
			ids: [id],
			polygons,
			z0: z0 + level.elevation,
			z1: z1 + level.elevation,
			level: level.id,
			...material ? { material } : {}
		}] : [];
	});
}
function buildDecorSolids(plan) {
	if (!plan.decor) return Object.assign([], { hideWallIds: [] });
	const resolved = plan.decor.furniture.some((f) => f.in) ? resolveDecor(plan) : void 0, d = resolved?.decor ?? plan.decor;
	plan = {
		...plan,
		decor: d
	};
	const missing = new Set((resolved?.placed ?? []).filter((p) => p.status === "missing").map((p) => p.id));
	const result = [], structural = decorWallSolids(plan);
	const affected = new Set(embedsOf(plan, d).filter((e) => {
		const item = decorItems(d).find((i) => i.id === e.id);
		return !checkEmbed(plan, d, item).some((i) => i.level === "error");
	}).flatMap((e) => faceRun(plan, e.face).filter((p) => overlap(p.s, e.s)).map((p) => p.wall.id)));
	for (const s of structural) if (s.ids.some((id) => affected.has(id)) && [
		"wall",
		"sill",
		"lintel",
		"glass"
	].includes(s.kind)) result.push({
		...s,
		kind: `decor-${s.kind}`,
		replaces: s.kind
	});
	for (const cab of d.cabinets.filter((c) => !missing.has(c.id))) {
		const layout = layoutCabinet(cab);
		if (layout.issues.some((i) => i.level === "error")) continue;
		try {
			const at = cabinetTransform(plan, cab), level = levelOf(plan, "face" in cab.place ? faceWall(plan, cab.place.face) : cab);
			const cuts = [...layout.cuts, ...d.recesses.filter((r) => "cabinet" in r.host && r.host.cabinet === cab.id && r.rect.u).map((r) => ({
				u: r.rect.u,
				z: r.rect.z,
				depth: r.depth
			}))].map((c) => ({
				u: c.u,
				z: c.z,
				depth: [c.depth === "through" ? 0 : cab.depth - c.depth, cab.depth]
			}));
			for (const p of layout.parts) result.push(...cutBox(`decor-cabinet-${p.kind}`, cab.id, p, p.depth, p.kind === "top" ? [] : cuts, at, level, p.material));
		} catch {}
	}
	for (const panel of d.panels.filter((p) => !missing.has(p.id))) try {
		const g = panelGeometry(plan, panel), at = panelTransform(plan, panel), level = levelOf(plan, faceWall(plan, g.span.face));
		const cuts = d.recesses.filter((r) => "panel" in r.host && r.host.panel === panel.id && r.rect.u && !checkEmbed(plan, d, r).some((i) => i.level === "error")).map((r) => ({
			u: r.rect.u,
			z: r.rect.z,
			depth: [r.depth === "through" ? 0 : g.thickness - r.depth, g.thickness]
		}));
		const drawPolys = (polys, depth, kind) => {
			const zs = [...new Set(polys.flatMap((rings) => rings.flatMap((r) => r.map((p) => p[1]))))].sort((a, b) => a - b);
			for (let i = 1; i < zs.length; i++) {
				const z0 = zs[i - 1], z1 = zs[i], z = (z0 + z1) / 2;
				for (const rings of polys) {
					const xs = [];
					for (const ring of rings) ring.forEach((a, j) => {
						const b = ring[(j + 1) % ring.length];
						if (a[1] <= z && b[1] > z || b[1] <= z && a[1] > z) xs.push(a[0] + (z - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
					});
					xs.sort((a, b) => a - b);
					for (let j = 1; j < xs.length; j += 2) result.push(...cutBox(kind, panel.id, {
						u: [xs[j - 1], xs[j]],
						z: [z0, z1]
					}, depth, cuts, at, level, panel.material));
				}
			}
		};
		drawPolys(g.polygons, [0, g.thickness], "decor-panel");
		if (panel.frame?.style === "raised") drawPolys(g.frames, [g.thickness, g.thickness + 8], "decor-panel-frame");
	} catch {}
	for (const f of d.furniture.filter((f) => !missing.has(f.id) || d.cache?.[f.id])) {
		const level = furnitureLevel(plan, f);
		result.push({
			kind: "decor-furniture",
			...missing.has(f.id) ? { missing: true } : {},
			ids: [f.id],
			polygons: [[furniturePose(plan, f).footprint]],
			z0: furniturePose(plan, f).z + level.elevation,
			z1: furniturePose(plan, f).z + f.height + level.elevation,
			level: level.id,
			...f.materials?.body ? { material: f.materials.body } : {}
		});
	}
	for (const r of d.recesses) if (r.shelves?.length && !checkEmbed(plan, d, r).some((i) => i.level === "error")) try {
		const at = hostTransform(plan, d, r.id), width = r.rect.u ? r.rect.u[1] - r.rect.u[0] : r.rect.s[1] - r.rect.s[0];
		const host = "panel" in r.host ? d.panels.find((p) => p.id === r.host.panel) : "cabinet" in r.host ? d.cabinets.find((c) => c.id === r.host.cabinet) : void 0;
		const thickness = host ? "thickness" in host ? host.type === "slats" ? host.slats?.depth ?? host.thickness : host.thickness : host.depth : 0, dep = r.depth === "through" ? thickness : r.depth;
		const level = levelOf(plan, "face" in r.host ? faceWall(plan, r.host.face) : host && "place" in host && "face" in host.place ? faceWall(plan, host.place.face) : host && "thickness" in host ? faceWall(plan, panelGeometry(plan, host).span.face) : r);
		if (at) for (const z of r.shelves) result.push(...cutBox("decor-recess-shelf", r.id, {
			u: [0, width],
			z: [z - .018, z]
		}, [thickness - dep, thickness], [], at, level, r.back));
	} catch {}
	return Object.assign(result, { hideWallIds: [...new Set(result.filter((s) => s.replaces).flatMap((s) => s.ids).filter((id) => plan.walls.some((w) => w.id === id)))] });
}
// src/core/raster.ts
/**
* All appearance controls live here (tuned against the tool's D3 white model).
* The key light follows the camera like a studio key: `key` = [toward viewer's left, up, toward viewer], so every
* view gets a front-left key. Ambient is a three-band hemisphere (up / vertical / down faces).
* Preset view azimuths refer to model axes, independent of plan.north.
*/
var RENDER_STYLE = {
	supersample: 2,
	/** Floor sits one step below the walls in the render (the tool reaches the same through tone mapping). */
	colors: {
		...CLAY_COLORS,
		floor: "#e3e3e0"
	},
	background: "#ffffff",
	light: {
		key: [
			.32,
			.9,
			.3
		],
		keyStrength: .36,
		keyTint: [
			1,
			.985,
			.955
		],
		fill: [
			-.25,
			.25,
			.93
		],
		fillStrength: .12,
		fillTint: [
			.97,
			.985,
			1
		],
		sky: .66,
		horizon: .74,
		ground: .86,
		ambientTint: [
			.99,
			.993,
			1
		],
		/** Eye-level views inside a room (with ceilings) get flatter, more ambient light, like a lit interior. */
		interior: {
			keyStrength: .22,
			fillStrength: .14,
			sky: .74,
			horizon: .78,
			ground: .86
		}
	},
	/** Soft shadow map for the key light only; ceilings and glass do not cast. Interior (ceilinged) views skip it. */
	shadow: {
		strength: .45,
		interiorStrength: 0,
		texel: .02,
		bias: .03,
		softness: .07,
		samples: 12,
		maxSize: 4096
	},
	glass: {
		opacity: GLASS_OPACITY,
		rim: .5,
		rimColor: "#ffffff"
	},
	outline: {
		width: .65,
		strength: .07,
		color: "#58606b",
		depthThreshold: .035,
		normalThreshold: .7
	},
	ao: {
		strength: .38,
		radius: .24,
		bias: .012,
		samples: 8,
		radii: [.45, 1],
		contactStrength: .22,
		contactRadius: .09,
		contactSoftStrength: .16,
		contactSoftRadius: .4,
		contactGrid: .035,
		contactHeightTolerance: .18
	},
	base: {
		color: "#f2f2f1",
		shadow: .07,
		shadowRadius: .9,
		margin: .7,
		thickness: .075,
		gap: .005,
		radius: .6,
		cornerSegments: 6
	},
	/** Oblique presets sit 24° off the main axis at 50° elevation, like the tool's default oblique view. */
	camera: {
		elevation: 50,
		azimuth: {
			"iso-sw": 114,
			"iso-ne": -66,
			"iso-se": 66,
			"iso-nw": -114
		},
		padding: .09
	},
	cutHeight: 1.2
};
var rgb = (hex) => [
	1,
	3,
	5
].map((i) => parseInt(hex.slice(i, i + 2), 16));
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross = (a, b) => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
var unit = (v) => {
	const d = Math.hypot(...v);
	return v.map((x) => x / d);
};
var sub3 = (a, b) => a.map((v, i) => v - b[i]);
var dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Eye-level room cameras: height above the room floor, vertical fov, the evaluation raster and how far the camera may tilt down. */
var ROOM_CAMERA = {
	eye: 1450,
	fov: 75,
	clearances: [
		900,
		600,
		450,
		300,
		180
	],
	furnitureClearances: [600, 200],
	grid: 7,
	yaws: 36,
	pitches: [
		0,
		3,
		6
	],
	probe: {
		width: 96,
		height: 64
	},
	coarseProbe: {
		width: 48,
		height: 32
	}
};
var renderCaches = /* @__PURE__ */ new WeakMap();
function preparedPlan(source, state = "original") {
	const cache = renderCaches.get(source);
	if (!cache) return modelPlan(source, state);
	let states = cache.states.get(source);
	if (!states) cache.states.set(source, states = /* @__PURE__ */ new Map());
	let plan = states.get(state);
	if (!plan) {
		plan = modelPlan(source, state);
		states.set(state, plan);
		renderCaches.set(plan, cache);
	}
	return plan;
}
function selectedLevel(plan, level) {
	const cache = renderCaches.get(plan);
	if (!cache) return onLevel(plan, level);
	let floors = cache.floors.get(plan);
	if (!floors) cache.floors.set(plan, floors = /* @__PURE__ */ new Map());
	let floor = floors.get(level);
	if (!floor) {
		floor = onLevel(plan, level);
		floors.set(level, floor);
		renderCaches.set(floor, cache);
	}
	return floor;
}
function sharedMesh(plan, options = {}) {
	const cache = renderCaches.get(plan);
	if (!cache) return buildMesh(plan, options);
	let meshes = cache.meshes.get(plan);
	if (!meshes) cache.meshes.set(plan, meshes = /* @__PURE__ */ new Map());
	const key = JSON.stringify(options);
	let mesh = meshes.get(key);
	if (!mesh) {
		mesh = buildMesh(plan, options);
		meshes.set(key, mesh);
	}
	return mesh;
}
/** Snapshot ownership prevents stale geometry when callers edit their live Plan between renders. */
function createRenderSession(source) {
	const plan = structuredClone(source);
	renderCaches.set(plan, {
		states: /* @__PURE__ */ new WeakMap(),
		floors: /* @__PURE__ */ new WeakMap(),
		meshes: /* @__PURE__ */ new WeakMap()
	});
	return { renderKit: (options = {}) => renderKit(plan, options) };
}
var roomScenes = /* @__PURE__ */ new WeakMap();
/** Everything an eye-level photo on this level can see: structure, fixtures, room ceilings and opening volumes. */
function roomScene(plan, levelId) {
	let byLevel = roomScenes.get(plan);
	if (!byLevel) roomScenes.set(plan, byLevel = /* @__PURE__ */ new Map());
	const cached = byLevel.get(levelId);
	if (cached) return cached;
	const floor = selectedLevel(plan, levelId), parts = sharedMesh(floor).flatMap((g) => g.parts);
	for (const r of floor.rooms) {
		const y = levelOf(floor, r).elevation + roomCeiling(floor, r);
		parts.push(solidMesh({
			kind: "ceiling",
			ids: [r.id],
			level: levelId,
			polygons: [[r.poly]],
			z0: y,
			z1: y + .04
		}));
	}
	const scene = {
		parts,
		proxies: floor.openings.flatMap((o) => {
			const wall = floor.walls.find((w) => w.id === o.wall);
			if (!wall) return [];
			const widened = {
				...floor,
				walls: floor.walls.map((w) => w.id === wall.id ? {
					...w,
					thickness: w.thickness + 20
				} : w)
			}, el = levelOf(floor, wall).elevation;
			return [{
				opening: o,
				part: solidMesh({
					kind: "pane",
					ids: [o.id],
					polygons: [[openingFootprint(widened, o)]],
					z0: el + o.sill,
					z1: el + o.head
				})
			}];
		})
	};
	byLevel.set(levelId, scene);
	return scene;
}
var isWindow = (o) => o.kind.includes("window") || o.kind === "open-balcony";
/** Rasterise a tiny probe frame and score it like a photo: room floor, doors/windows and the key wall in view; no wall in the face. */
function probeView(scene, room, area, pos, yaw, pitch, focus, coarse = false) {
	const { width: W, height: H } = coarse ? ROOM_CAMERA.coarseProbe : ROOM_CAMERA.probe, fy = H / 2 / Math.tan(ROOM_CAMERA.fov * Math.PI / 360), p = pitch * Math.PI / 180;
	const toward = [
		-Math.cos(yaw) * Math.cos(p),
		Math.sin(p),
		-Math.sin(yaw) * Math.cos(p)
	], right = unit(cross([
		0,
		1,
		0
	], toward)), up = cross(toward, right);
	const target = {
		W,
		H,
		right,
		up,
		toward,
		pos: pos.map((v) => v / 1e3),
		fx: fy,
		fy,
		camera: {
			projection: "perspective",
			near: 50,
			far: 1e5
		}
	};
	const depth = new Float32Array(W * H).fill(Infinity), at = new Int32Array(W * H).fill(-1), facing = new Uint8Array(W * H);
	scene.parts.forEach((part, index) => rasterPart(target, part, (i, z, n) => {
		if (z < depth[i]) {
			depth[i] = z;
			at[i] = index;
			facing[i] = dot(n, toward) > .75 ? 1 : 0;
		}
	}));
	const openingAt = new Int32Array(W * H).fill(-1);
	scene.proxies.forEach(({ part }, index) => rasterPart(target, part, (i, z) => {
		if (z <= depth[i] + .05) openingAt[i] = index;
	}));
	let ceiling = 0, floor = 0, roomFloor = 0, roomArea = 0, centerNear = 0, near = 0, crowd = 0, centerCount = 0, leaf = 0, centerWindow = 0;
	const openings = /* @__PURE__ */ new Map(), walls = /* @__PURE__ */ new Map(), centerWalls = /* @__PURE__ */ new Map();
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const i = y * W + x, center = x >= W * .3 && x < W * .7 && y >= H * .25 && y < H * .75;
		if (center) {
			centerCount++;
			if (depth[i] < 1.5) centerNear++;
		}
		if (depth[i] < 1) near++;
		if (depth[i] < 2) crowd++;
		if (openingAt[i] >= 0) {
			const o = scene.proxies[openingAt[i]].opening;
			openings.set(o.id, (openings.get(o.id) ?? 0) + 1);
			if (center && isWindow(o)) centerWindow++;
		}
		if (at[i] < 0) continue;
		const part = scene.parts[at[i]];
		if (part.kind === "ceiling") ceiling++;
		else if (part.kind === "leaf") leaf++;
		else if ([
			"floor",
			"platform",
			"slab",
			"stair"
		].includes(part.kind)) {
			floor++;
			if (part.ids.includes(room.id)) {
				const cx = (x + .5 - W / 2) / fy, cy = (H / 2 - y - .5) / fy, ray = [
					0,
					1,
					2
				].map((k) => right[k] * cx + up[k] * cy - toward[k]);
				roomFloor++;
				roomArea += (depth[i] / fy) ** 2 * Math.hypot(...ray) / Math.max(.05, Math.abs(ray[1]));
			}
		} else if ([
			"wall",
			"sill",
			"lintel"
		].includes(part.kind)) {
			walls.set(part.ids[0], (walls.get(part.ids[0]) ?? 0) + 1);
			if (center && facing[i]) centerWalls.set(part.ids[0], (centerWalls.get(part.ids[0]) ?? 0) + 1);
		}
	}
	const N = W * H, f = (v) => v / N;
	const openingValue = [...openings].reduce((sum, [id, px]) => {
		const o = scene.proxies.find((q) => q.opening.id === id).opening;
		return sum + f(px) * (isWindow(o) ? 1 : .6);
	}, 0);
	const wallValue = [...walls].reduce((sum, [id, px]) => sum + f(px) * (focus.walls.get(id) ?? 0), 0);
	const result = {
		score: 0,
		crowd: f(crowd),
		leaf: f(leaf),
		ceiling: f(ceiling),
		floor: f(floor),
		roomFloor: f(roomFloor),
		roomArea: Math.min(1, roomArea / area),
		centerNear: centerNear / centerCount,
		near: f(near),
		openings,
		walls,
		centerWall: [...centerWalls].sort((a, b) => b[1] - a[1])[0]?.[0]
	};
	result.score = 3 * result.roomArea + 3 * Math.min(openingValue, .15) + 2.5 * Math.min(wallValue, .3) + (result.centerWall && focus.walls.get(result.centerWall) ? focus.centre : 0) + focus.window * Math.min(centerWindow / centerCount, .25) - 8 * result.leaf + (focus.wall ? 5 * Math.min(f(walls.get(focus.wall) ?? 0) + [...openings].filter(([id]) => scene.proxies.find((q) => q.opening.id === id).opening.wall === focus.wall).reduce((s, [, px]) => s + f(px), 0), .5) : 0) - 6 * result.centerNear - 3 * Math.max(0, result.near - .08) - 2 * Math.max(0, result.crowd - .15) - 4 * Math.max(0, result.ceiling - .22) - 3 * Math.max(0, .12 - result.floor) - 2 * Math.max(0, result.floor - .45) - .05 * pitch;
	return result;
}
/**
* Pick an eye-level camera like a photographer would: stand ≥ 0.6 m from walls (relaxed only for narrow rooms), keep the
* frame centre clear of near walls, ceiling ≲ 1/4, and show this room's floor, doors/windows and its longest solid wall
* (the TV / bed wall in most homes). With wallId the camera faces that wall from the most useful spot.
*/
function cameraRoomEligible(room) {
	return room.counted !== false && polygonArea(room.poly) >= 15e5 && (room.floorOffset ?? 0) <= .3;
}
function roomCamera(plan, room, wallId, obstacles = []) {
	if (!cameraRoomEligible(room)) throw new Error(`房间 ${room.id} 不适合站人平视：不计入面积、面积小于 1.5 m² 或地面抬高超过 0.3 m`);
	const level = levelOf(plan, room), floorY = (level.elevation + (room.floorOffset ?? 0)) * 1e3, eye = floorY + ROOM_CAMERA.eye;
	const walls = plan.walls.filter((w) => levelOf(plan, w).id === level.id), wall = wallId ? walls.find((w) => w.id === wallId) : void 0;
	if (wallId && !wall) throw new Error(`房间机位的墙不存在：${wallId}`);
	const doors = plan.openings.filter((o) => o.kind === "door" && levelOf(plan, o).id === level.id).map((o) => ({
		o,
		span: openingSpan(plan, o)
	}));
	const edgeDistance = (p, a, b) => {
		const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
		return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
	};
	const clearOf = (p, gap) => pointInPolygon(p, room.poly) && room.poly.every((a, i) => edgeDistance(p, a, room.poly[(i + 1) % room.poly.length]) >= gap) && walls.every((w) => projectToWall(w, p).dist > w.thickness / 2 + gap) && !(plan.columns ?? []).some((c) => levelOf(plan, c).id === level.id && pointInPolygon(p, columnFootprint(c))) && !(plan.shafts ?? []).some((s) => levelOf(plan, s).id === level.id && pointInPolygon(p, s.poly)) && doors.every(({ o, span }) => dist2(p, o.swing?.hinge === "end" ? span.b : span.a) > o.width + 200);
	const blockers = obstacles.filter((o) => levelOf(plan, { level: o.level }).id === level.id && o.z1 > floorY / 1e3 + .1 && o.z0 < eye / 1e3).flatMap((o) => o.rings);
	const free = (p, margin) => blockers.every((r) => !pointInPolygon(p, r) && r.every((a, i) => edgeDistance(p, a, r[(i + 1) % r.length]) >= margin));
	const xs = room.poly.map((p) => p[0]), ys = room.poly.map((p) => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), dx = Math.max(...xs) - x0, dy = Math.max(...ys) - y0;
	const grid = [], n = ROOM_CAMERA.grid;
	for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) grid.push([x0 + dx * i / n, y0 + dy * j / n]);
	for (const corner of room.poly) {
		const c = labelPoint(room.poly), l = dist2(corner, c);
		for (const inset of [700, 1e3]) if (l > inset) grid.push([corner[0] + (c[0] - corner[0]) * inset / l, corner[1] + (c[1] - corner[1]) * inset / l]);
	}
	let gap = 0, usable = [];
	search: for (const margin of blockers.length ? [...ROOM_CAMERA.furnitureClearances, 0] : [0]) for (gap of ROOM_CAMERA.clearances) {
		usable = grid.filter((p) => clearOf(p, gap) && (!margin || free(p, margin)));
		if (usable.length) break search;
	}
	if (!usable.length) throw new Error(`房间 ${room.id} 没有避开墙体和门扇的机位，请提供自定义相机`);
	const focusWalls = /* @__PURE__ */ new Map();
	for (const w of walls) {
		if (![
			"exterior",
			"bearing",
			"partition"
		].includes(w.kind) || !Object.values(roomsBesideWall(plan, w.id)).flat().some((r) => r.id === room.id)) continue;
		let spans = room.poly.flatMap((a, i) => {
			const b = room.poly[(i + 1) % room.poly.length], pa = projectToWall(w, a), pb = projectToWall(w, b);
			return pa.dist <= w.thickness / 2 + 60 && pb.dist <= w.thickness / 2 + 60 ? [[Math.min(pa.s, pb.s), Math.max(pa.s, pb.s)]] : [];
		});
		if (!spans.length) {
			const span = roomSpanOnWall(w, room.poly);
			if (span) spans = [span];
		}
		for (const o of plan.openings.filter((o) => o.wall === w.id)) spans = spans.flatMap(([a, b]) => [[a, Math.min(b, o.offset)], [Math.max(a, o.offset + o.width), b]].filter(([p, q]) => q > p));
		focusWalls.set(w.id, Math.max(0, ...spans.map(([a, b]) => b - a)));
	}
	const longest = Math.max(1, ...focusWalls.values());
	for (const [id, v] of focusWalls) focusWalls.set(id, v / longest >= .8 ? 1 : 0);
	const living = /客|起居|living|lounge/i.test(room.name ?? ""), scene = roomScene(plan, level.id), focus = {
		wall: wall?.id,
		walls: focusWalls,
		centre: wall ? 0 : living ? 1 : .5,
		window: wall || living ? 0 : 2
	}, area = Math.max(.5, polygonArea(room.poly) / 1e6);
	const aimAt = (w) => {
		const edges = room.poly.map((a, i) => [a, room.poly[(i + 1) % room.poly.length]]).filter((e) => e.every((p) => projectToWall(w, p).dist <= w.thickness / 2 + 60));
		const total = edges.reduce((s, [a, b]) => s + dist2(a, b), 0);
		return total ? edges.reduce((m, [a, b]) => [m[0] + (a[0] + b[0]) / 2 * dist2(a, b) / total, m[1] + (a[1] + b[1]) / 2 * dist2(a, b) / total], [0, 0]) : (() => {
			const span = roomSpanOnWall(w, room.poly);
			return span ? pointAt(w, (span[0] + span[1]) / 2) : projectToWall(w, labelPoint(room.poly)).point;
		})();
	};
	const glazing = (w) => plan.openings.filter((o) => o.wall === w.id && o.kind !== "door" && o.kind !== "doorway").reduce((s, o) => s + o.width, 0);
	const lightWall = walls.filter((w) => Object.values(roomsBesideWall(plan, w.id)).flat().some((r) => r.id === room.id)).sort((a, b) => glazing(b) - glazing(a))[0];
	const direction = (w) => {
		const d = [w.b[0] - w.a[0], w.b[1] - w.a[1]], l = Math.hypot(d[0], d[1]) || 1;
		return [d[0] / l, d[1] / l];
	};
	const keyWalls = walls.filter((w) => focusWalls.get(w.id)), square = lightWall && glazing(lightWall) ? keyWalls.filter((w) => Math.abs(direction(w)[0] * direction(lightWall)[0] + direction(w)[1] * direction(lightWall)[1]) < .3) : [];
	const aims = wall ? [aimAt(wall)] : living ? (square.length ? square : keyWalls).map(aimAt) : [];
	const boundaryAims = wall ? [] : walls.filter((w) => Object.values(roomsBesideWall(plan, w.id)).flat().some((r) => r.id === room.id)).map(aimAt);
	const yawsFor = (p) => [.../* @__PURE__ */ new Set([...aims.length ? aims.flatMap((a) => (wall ? [0] : [
		-12,
		0,
		12
	]).map((d) => Math.atan2(a[1] - p[1], a[0] - p[0]) + d * Math.PI / 180)) : Array.from({ length: ROOM_CAMERA.yaws }, (_, k) => k * 2 * Math.PI / ROOM_CAMERA.yaws), ...boundaryAims.map((a) => Math.atan2(a[1] - p[1], a[0] - p[0]))])];
	const pitch0 = ROOM_CAMERA.pitches[1];
	const coarse = usable.flatMap((p) => yawsFor(p).map((yaw) => ({
		p,
		yaw,
		view: probeView(scene, room, area, [
			p[0],
			eye,
			p[1]
		], yaw, pitch0, focus, true)
	}))).sort((a, b) => b.view.score - a.view.score);
	const seesOpening = (view, pixels) => [...view.openings.values()].some((px) => px >= pixels);
	const refine = (c) => ROOM_CAMERA.pitches.map((pitch) => ({
		...c,
		pitch,
		view: probeView(scene, room, area, [
			c.p[0],
			eye,
			c.p[1]
		], c.yaw, pitch, focus)
	}));
	const withOpenings = wall ? [] : coarse.filter((c) => seesOpening(c.view, 3)).sort((a, b) => Number(seesOpening(b.view, 16)) - Number(seesOpening(a.view, 16)) || b.view.score - a.view.score);
	const finalists = [.../* @__PURE__ */ new Set([...coarse.slice(0, 6), ...withOpenings.slice(0, 6)])].flatMap(refine);
	let visible = finalists.filter((c) => seesOpening(c.view, 12));
	if (!wall && scene.proxies.length && !visible.length) for (const c of coarse.slice(6)) {
		const candidates = refine(c).filter((c) => seesOpening(c.view, 12));
		if (candidates.length) {
			visible = candidates;
			break;
		}
	}
	const informative = visible.filter((c) => seesOpening(c.view, Math.ceil(ROOM_CAMERA.probe.width * ROOM_CAMERA.probe.height * .01)));
	const { p: pos, yaw, pitch, view } = (!wall && informative.length ? informative : !wall && visible.length ? visible : finalists).sort((a, b) => b.view.score - a.view.score)[0], reach = 4e3, drop = Math.tan(pitch * Math.PI / 180) * reach;
	const name = (id) => id ? walls.find((w) => w.id === id)?.name ?? plan.openings.find((o) => o.id === id)?.name ?? id : "";
	const sees = [...view.openings].filter(([, px]) => px >= 12).sort((a, b) => b[1] - a[1]).map(([id]) => name(id));
	const back = [...walls].sort((a, b) => projectToWall(a, pos).dist - projectToWall(b, pos).dist)[0];
	const narrow = gap < 600;
	const facing = name(wall?.id ?? view.centerWall);
	const openBalcony = plan.openings.some((o) => o.kind === "open-balcony" && Object.values(roomsBesideWall(plan, o.wall)).flat().some((r) => r.id === room.id));
	const description = `${room.name}${openBalcony ? "（开敞阳台，平视多半是天空）" : ""}，${back ? `靠${name(back.id)}站，` : ""}${facing ? `看向${facing}` : "平视"}${sees.length ? `；画面里有${sees.join("、")}` : ""}${narrow ? "（房间窄，平视画面有限，建议同时看俯视或斜视）" : ""}`;
	return {
		projection: "perspective",
		pos: [
			pos[0],
			eye,
			pos[1]
		],
		target: [
			pos[0] + Math.cos(yaw) * reach,
			eye - drop,
			pos[1] + Math.sin(yaw) * reach
		],
		fov: ROOM_CAMERA.fov,
		near: 50,
		far: 1e5,
		level: level.id,
		id: `room:${room.id}${wallId ? ":" + wallId : ""}`,
		description
	};
}
function listCameras(source, state = "original", opts = {}) {
	const plan = preparedPlan(source, state), result = [], obstacles = decorObstacles(source, plan, { state });
	assertLevel(plan, opts.level);
	for (const level of levelsOf(plan)) {
		if (opts.level && level.id !== opts.level) continue;
		const floor = selectedLevel(plan, level.id);
		if (sharedMesh(floor).length) for (const id of [
			"iso-sw",
			"iso-ne",
			"iso-se",
			"iso-nw",
			"top"
		]) {
			const camera = resolveCamera(floor, {
				view: id,
				level: level.id,
				width: 2400,
				height: 1600
			});
			result.push({
				id,
				level: level.id,
				description: `${level.name}，${{
					"iso-sw": "西南斜视",
					"iso-ne": "东北斜视",
					"iso-se": "东南斜视",
					"iso-nw": "西北斜视",
					top: "俯视剖切"
				}[id]}`,
				camera
			});
		}
		const add = (room, wallId) => {
			try {
				const camera = roomCamera(floor, room, wallId, obstacles);
				result.push({
					id: camera.id,
					description: camera.description,
					level: level.id,
					camera
				});
			} catch {}
		};
		for (const room of floor.rooms) {
			if (!cameraRoomEligible(room)) continue;
			add(room);
			if (opts.all) for (const wall of floor.walls.filter((w) => Object.values(roomsBesideWall(floor, w.id)).flat().some((r) => r.id === room.id))) add(room, wall.id);
		}
	}
	return result;
}
function resolveCamera(source, options = {}) {
	const selected = preparedPlan(source, options.state), plan = options.level ? selectedLevel(selected, options.level) : selected;
	assertLevel(selected, options.level);
	if (typeof options.camera === "object") {
		const c = structuredClone(options.camera);
		if (!["perspective", "orthographic"].includes(c.projection) || ![c.pos, c.target].every((v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) || Math.hypot(...sub3(c.pos, c.target)) < 1e-6) throw new Error("无效相机：pos/target 必须是不同的有限三维 mm 坐标");
		if (c.projection === "perspective" && (!Number.isFinite(c.fov ?? 75) || (c.fov ?? 75) <= 1 || (c.fov ?? 75) >= 179)) throw new Error("fov 须在 1–179 度之间");
		if (c.projection === "orthographic" && (!(c.span > 0) || !Number.isFinite(c.span))) throw new Error("正交相机需要正数 span（画幅垂直跨度 mm）");
		if (!Number.isFinite(c.near ?? 50) || !Number.isFinite(c.far ?? 1e5)) throw new Error("near/far 必须是有限 mm 数值");
		if (!((c.near ?? 50) > 0)) throw new Error("near 必须大于 0");
		if ((c.far ?? 1e5) <= (c.near ?? 50)) throw new Error("far 必须大于 near");
		return c;
	}
	if (options.camera?.startsWith("pos=")) {
		const m = /^pos=([^;]+);target=([^;]+);fov=([^;]+)$/.exec(options.camera);
		if (!m) throw new Error("相机格式：pos=x,y,z;target=x,y,z;fov=75，单位 mm");
		return resolveCamera(plan, {
			...options,
			camera: {
				projection: "perspective",
				pos: m[1].split(",").map(Number),
				target: m[2].split(",").map(Number),
				fov: Number(m[3])
			}
		});
	}
	if (options.camera?.startsWith("room:")) {
		const suffix = options.camera.slice(5), room = [...plan.rooms].sort((a, b) => b.id.length - a.id.length).find((r) => suffix === r.id || suffix.startsWith(r.id + ":"));
		if (!room) throw new Error(`未知房间机位：${options.camera}`);
		return roomCamera(plan, room, suffix === room.id ? void 0 : suffix.slice(room.id.length + 1), decorObstacles(source, selected, options));
	}
	const view = options.camera ?? options.view ?? "iso-sw";
	if (![
		"iso-sw",
		"iso-ne",
		"iso-se",
		"iso-nw",
		"top"
	].includes(view)) throw new Error(`未知视角：${view}`);
	const parts = sharedMesh(plan, { cutHeight: options.section !== void 0 ? options.section / 1e3 : view === "top" ? RENDER_STYLE.cutHeight : options.cutHeight }).flatMap((g) => g.parts);
	if (!parts.length) throw new Error("方案没有可渲染的实体");
	const S = RENDER_STYLE, az = (view === "top" ? 0 : S.camera.azimuth[view]) * Math.PI / 180, el = S.camera.elevation * Math.PI / 180;
	const toward = view === "top" ? [
		0,
		1,
		0
	] : [
		Math.cos(az) * Math.cos(el),
		Math.sin(el),
		Math.sin(az) * Math.cos(el)
	], right = view === "top" ? [
		1,
		0,
		0
	] : unit(cross([
		0,
		1,
		0
	], toward)), up = cross(toward, right);
	const lo = [
		Infinity,
		Infinity,
		Infinity
	], hi = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (const p of parts) for (let i = 0; i < p.positions.length; i += 3) {
		const v = p.positions.slice(i, i + 3);
		[
			right,
			up,
			toward
		].forEach((axis, k) => {
			const d = dot(v, axis);
			lo[k] = Math.min(lo[k], d);
			hi[k] = Math.max(hi[k], d);
		});
	}
	const mid = lo.map((v, i) => (v + hi[i]) / 2), target = right.map((v, i) => (v * mid[0] + up[i] * mid[1] + toward[i] * mid[2]) * 1e3);
	const span = Math.max(hi[1] - lo[1] + 2 * S.base.margin, (hi[0] - lo[0] + 2 * S.base.margin) * (options.height ?? 1600) / (options.width ?? 2400)) / (1 - 2 * S.camera.padding) * 1e3;
	const distance = Math.max(span, (hi[2] - lo[2]) * 1e3) * 2 + 1e3;
	return {
		projection: "orthographic",
		id: view,
		pos: target.map((v, i) => v + toward[i] * distance),
		target,
		up,
		span,
		near: 1,
		far: distance * 3,
		level: options.level
	};
}
var decorInfo = /* @__PURE__ */ new WeakMap();
/** Library types → ADE20K classes; sized variants (bed-1500) fall back to their family, anything unknown is a box. */
var FURNITURE_SEG = {
	sofa: "sofa",
	armchair: "armchair",
	"coffee-table": "table",
	"dining-table": "table",
	table: "table",
	desk: "desk",
	chair: "chair",
	"desk-chair": "chair",
	bed: "bed",
	nightstand: "cabinet",
	"tv-stand": "cabinet",
	bookshelf: "shelf",
	wardrobe: "wardrobe",
	fridge: "refrigerator",
	washer: "cabinet",
	dryer: "cabinet",
	oven: "cabinet",
	steamer: "cabinet",
	dishwasher: "cabinet",
	microwave: "cabinet",
	rug: "rug",
	toilet: "toilet",
	basin: "sink",
	bathtub: "bathtub"
};
var furnitureSeg = (type) => FURNITURE_SEG[type] ?? FURNITURE_SEG[type.replace(/-\d+$/, "")] ?? "box";
/**
* The decor layer as the tool's decor mode shows it in clay: furniture boxes, cabinet and panel solids, recess shelves,
* and walls with niches swapped for their cut replacements (`replaced` keys the structural parts to drop).
*/
function decorSkipped(source, full, options) {
	if (options.decor === false) return "disabled";
	if (!full.decor) return "none";
	if ((options.state ?? "original") === "original" && source.changes.some((c) => c.status === "confirmed")) return "original-state";
}
/** Footprints of the furniture and cabinets a render will draw, so room cameras stand clear of them. */
function decorObstacles(source, full, options) {
	if (decorSkipped(source, full, options)) return [];
	try {
		return buildDecorSolids(full).filter((s) => !s.replaces && !s.missing && (s.kind === "decor-furniture" || s.kind.startsWith("decor-cabinet"))).map((s) => ({
			level: s.level,
			z0: s.z0,
			z1: s.z1,
			rings: s.polygons.map((p) => p[0])
		}));
	} catch {
		return [];
	}
}
function decorScene(source, full, options, level, cutHeight) {
	const parts = [], replaced = /* @__PURE__ */ new Set(), skip = (skipped, error) => ({
		parts,
		replaced,
		view: {
			drawn: false,
			skipped,
			...error ? { error } : {},
			visible: []
		}
	});
	const skipped = decorSkipped(source, full, options);
	if (skipped) return skip(skipped);
	let solids;
	try {
		solids = buildDecorSolids(full);
	} catch (e) {
		return skip("error", e instanceof Error ? e.message : String(e));
	}
	const d = full.decor, first = levelsOf(full)[0].id;
	for (const s of solids) {
		const lv = s.level ?? first;
		if (s.missing || level && lv !== level) continue;
		const z1 = cutHeight === void 0 ? s.z1 : Math.min(s.z1, levelOf(full, { level: lv }).elevation + cutHeight);
		const part = solidMesh({
			kind: s.replaces ?? (s.kind === "decor-furniture" ? "furniture" : "cabinet"),
			ids: s.ids,
			level: lv,
			polygons: s.polygons,
			z0: s.z0,
			z1
		});
		if (s.replaces) replaced.add(`${s.replaces}|${s.ids.join(",")}`);
		if (!part.positions.length) continue;
		const id = s.ids[0], f = d.furniture.find((x) => x.id === id), c = d.cabinets.find((x) => x.id === id), panel = d.panels.find((x) => x.id === id);
		if (s.replaces) {} else if (f) decorInfo.set(part, {
			id,
			kind: "furniture",
			type: f.type,
			name: f.name ?? FURNITURE_LIBRARY.find((e) => e.type === f.type)?.name ?? f.type,
			seg: furnitureSeg(f.type)
		});
		else if (c) decorInfo.set(part, {
			id,
			kind: "cabinet",
			name: c.name ?? "柜体",
			seg: "cabinet"
		});
		else if (panel) decorInfo.set(part, {
			id,
			kind: "panel",
			name: panel.name ?? "墙面造型",
			seg: "wall"
		});
		else decorInfo.set(part, {
			id,
			kind: "shelf",
			name: "壁龛层板",
			seg: "shelf"
		});
		parts.push(part);
	}
	return {
		parts,
		replaced,
		view: {
			drawn: true,
			visible: []
		}
	};
}
/** Visible decor items in the final frame (supersampled hits folded back to output pixels), largest first. */
function visibleDecor(frame) {
	const counts = /* @__PURE__ */ new Map();
	for (const index of frame.partAt) {
		const item = index >= 0 ? decorInfo.get(frame.parts[index]) : void 0;
		if (item) {
			const c = counts.get(item.id);
			if (c) c.n++;
			else counts.set(item.id, {
				item,
				n: 1
			});
		}
	}
	return [...counts.values()].map(({ item, n }) => ({
		...item,
		visible_px: Math.round(n / frame.ss ** 2)
	})).filter((v) => v.visible_px > 0).sort((a, b) => b.visible_px - a.visible_px);
}
function cameraBasis(c) {
	const toward = unit(sub3(c.pos, c.target)), hint = c.up ?? (Math.abs(toward[1]) > .999 ? [
		0,
		0,
		-1
	] : [
		0,
		1,
		0
	]);
	if (hint.length !== 3 || !hint.every(Number.isFinite) || Math.hypot(...cross(hint, toward)) < 1e-8) throw new Error("相机 up 不得与视线平行");
	const right = unit(cross(hint, toward));
	return {
		right,
		up: cross(toward, right),
		toward
	};
}
function rasterPart(frame, part, visit) {
	const { W, H, right, up, toward, pos, camera, fx, fy } = frame, perspective = camera.projection === "perspective", near = (camera.near ?? 50) / 1e3, far = (camera.far ?? 1e5) / 1e3;
	const clip = (poly, plane, greater) => {
		const out = [];
		poly.forEach((a, i) => {
			const b = poly[(i + 1) % poly.length], ia = greater ? a[2] >= plane : a[2] <= plane, ib = greater ? b[2] >= plane : b[2] <= plane;
			if (ia) out.push(a);
			if (ia !== ib) {
				const t = (plane - a[2]) / (b[2] - a[2]);
				out.push(a.map((v, k) => v + (b[k] - v) * t));
			}
		});
		return out;
	};
	for (let t = 0; t < part.positions.length; t += 9) {
		let verts = [];
		for (let k = t; k < t + 9; k += 3) {
			const x = part.positions[k] - pos[0], y = part.positions[k + 1] - pos[1], z = part.positions[k + 2] - pos[2];
			verts.push([
				x * right[0] + y * right[1] + z * right[2],
				x * up[0] + y * up[1] + z * up[2],
				-(x * toward[0] + y * toward[1] + z * toward[2])
			]);
		}
		const minZ = Math.min(verts[0][2], verts[1][2], verts[2][2]), maxZ = Math.max(verts[0][2], verts[1][2], verts[2][2]);
		if (maxZ < near || minZ > far) continue;
		if (minZ < near) verts = clip(verts, near, true);
		if (maxZ > far) verts = clip(verts, far, false);
		if (verts.length < 3) continue;
		let n = part.normals.slice(t, t + 3);
		const world = part.positions.slice(t, t + 3);
		if (dot(n, sub3(pos, world)) < 0) n = n.map((v) => -v);
		const screen = verts.map((p) => [
			W / 2 + p[0] * fx / (perspective ? p[2] : 1),
			H / 2 - p[1] * fy / (perspective ? p[2] : 1),
			p[2]
		]);
		for (let j = 1; j < screen.length - 1; j++) {
			const [a, b, c] = [
				screen[0],
				screen[j],
				screen[j + 1]
			], area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
			if (Math.abs(area) < 1e-10) continue;
			const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
			for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
				const px = x + .5, py = y + .5, u = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area, v = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area, w = 1 - u - v;
				if (u < -1e-9 || v < -1e-9 || w < -1e-9) continue;
				const z = perspective ? 1 / (u / a[2] + v / b[2] + w / c[2]) : u * a[2] + v * b[2] + w * c[2];
				visit(y * W + x, z, n, part);
			}
		}
	}
}
function worldAt(f, i) {
	return worldAtDepth(f, i, f.depth[i]);
}
function worldAtDepth(f, i, z) {
	const x = (i % f.W + .5 - f.W / 2) / f.fx * (f.camera.projection === "perspective" ? z : 1), y = (f.H / 2 - (Math.floor(i / f.W) + .5)) / f.fy * (f.camera.projection === "perspective" ? z : 1);
	return f.pos.map((v, k) => v + f.right[k] * x + f.up[k] * y - f.toward[k] * z);
}
function edgeAt(f, i, dx, dy) {
	const x = i % f.W, y = Math.floor(i / f.W), X = x + dx, Y = y + dy;
	if (X < 0 || X >= f.W || Y < 0 || Y >= f.H) return false;
	const j = Y * f.W + X, a = Number.isFinite(f.depth[i]), b = Number.isFinite(f.depth[j]);
	if (!a || !b) return a !== b;
	const k = i * 3, l = j * 3, nx = f.normals[k], ny = f.normals[k + 1], nz = f.normals[k + 2];
	if (nx * f.normals[l] + ny * f.normals[l + 1] + nz * f.normals[l + 2] < RENDER_STYLE.outline.normalThreshold) return true;
	const zi = f.depth[i], zj = f.depth[j], perspective = f.camera.projection === "perspective";
	const dxCam = perspective ? ((X + .5 - f.W / 2) * zj - (x + .5 - f.W / 2) * zi) / f.fx : dx / f.fx;
	const dyCam = perspective ? ((f.H / 2 - Y - .5) * zj - (f.H / 2 - y - .5) * zi) / f.fy : -dy / f.fy;
	const nr = nx * f.right[0] + ny * f.right[1] + nz * f.right[2], nu = nx * f.up[0] + ny * f.up[1] + nz * f.up[2], nt = nx * f.toward[0] + ny * f.toward[1] + nz * f.toward[2];
	return Math.abs(nr * dxCam + nu * dyCam - nt * (zj - zi)) > RENDER_STYLE.outline.depthThreshold;
}
/** Retain O1's world-space contact field so top views also read wall/floor junctions. */
function contactField(parts, lo, hi) {
	const S = RENDER_STYLE, step = S.ao.contactGrid, x0 = lo[0] - S.base.margin, z0 = lo[2] - S.base.margin, gw = Math.ceil((hi[0] - lo[0] + 2 * S.base.margin) / step) + 1, gh = Math.ceil((hi[2] - lo[2] + 2 * S.base.margin) / step) + 1;
	const segments = [], seen = /* @__PURE__ */ new Set(), fields = /* @__PURE__ */ new Map();
	for (const p of parts.filter((p) => ![
		"floor",
		"slab",
		"platform",
		"plinth",
		"ceiling"
	].includes(p.kind))) for (let t = 0; t < p.positions.length; t += 9) {
		if (Math.abs(p.normals[t + 1]) > .01) continue;
		const v = [
			0,
			3,
			6
		].map((k) => p.positions.slice(t + k, t + k + 3)), low = Math.min(...v.map((p) => p[1])), high = Math.max(...v.map((p) => p[1]));
		for (let j = 0; j < 3; j++) {
			const a = v[j], b = v[(j + 1) % 3];
			if (Math.abs(a[1] - b[1]) > 1e-6) continue;
			const key = [
				a[0],
				a[2],
				b[0],
				b[2],
				low,
				high
			].map((x) => x.toFixed(5)).join(",");
			if (!seen.has(key)) {
				seen.add(key);
				segments.push({
					a,
					b,
					low,
					high
				});
			}
		}
	}
	return (world, elevation) => {
		let field = fields.get(elevation);
		if (!field) {
			field = new Float32Array(gw * gh);
			const r = Math.max(S.ao.contactRadius, S.ao.contactSoftRadius);
			for (const { a, b, low, high } of segments) {
				if (low > elevation + S.ao.contactHeightTolerance || high <= elevation + .01) continue;
				const ix0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r - x0) / step)), ix1 = Math.min(gw - 1, Math.ceil((Math.max(a[0], b[0]) + r - x0) / step)), iz0 = Math.max(0, Math.floor((Math.min(a[2], b[2]) - r - z0) / step)), iz1 = Math.min(gh - 1, Math.ceil((Math.max(a[2], b[2]) + r - z0) / step)), dx = b[0] - a[0], dz = b[2] - a[2], l2 = dx * dx + dz * dz;
				for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
					const px = x0 + ix * step, pz = z0 + iz * step, t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[2]) * dz) / (l2 || 1))), d = Math.hypot(px - a[0] - dx * t, pz - a[2] - dz * t, Math.max(0, low - elevation));
					field[iz * gw + ix] = Math.max(field[iz * gw + ix], S.ao.contactStrength * Math.max(0, 1 - d / S.ao.contactRadius) ** 2 + S.ao.contactSoftStrength * Math.max(0, 1 - d / S.ao.contactSoftRadius) ** 2);
				}
			}
			fields.set(elevation, field);
		}
		const fx = Math.max(0, Math.min(gw - 1.001, (world[0] - x0) / step)), fz = Math.max(0, Math.min(gh - 1.001, (world[2] - z0) / step)), ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
		const a = field[iz * gw + ix] * (1 - tx) + field[iz * gw + ix + 1] * tx, b = field[(iz + 1) * gw + ix] * (1 - tx) + field[(iz + 1) * gw + ix + 1] * tx;
		return 1 - (a * (1 - tz) + b * tz);
	};
}
/** Orthographic depth map seen from the key light; returns 0 (lit) … 1 (fully shadowed) with PCF softening. Furniture boxes do not cast, as in the tool. */
function shadowMap(parts, key, strength) {
	const S = RENDER_STYLE.shadow, casters = parts.filter((p) => !GLASS_KINDS.has(p.kind) && p.kind !== "ceiling" && p.kind !== "plinth" && p.kind !== "furniture");
	if (!casters.length || strength <= 0) return (_) => 0;
	const toward = key, right = unit(cross(Math.abs(key[1]) > .999 ? [
		0,
		0,
		1
	] : [
		0,
		1,
		0
	], toward)), up = cross(toward, right);
	const lo = [
		Infinity,
		Infinity,
		Infinity
	], hi = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (const p of casters) for (let i = 0; i < p.positions.length; i += 3) {
		const v = p.positions.slice(i, i + 3);
		[
			right,
			up,
			toward
		].forEach((a, k) => {
			const d = dot(v, a);
			lo[k] = Math.min(lo[k], d);
			hi[k] = Math.max(hi[k], d);
		});
	}
	const pad = S.softness * 2 + S.texel * 2, texel = Math.max(S.texel, (Math.max(hi[0] - lo[0], hi[1] - lo[1]) + 2 * pad) / S.maxSize);
	const W = Math.ceil((hi[0] - lo[0] + 2 * pad) / texel), H = Math.ceil((hi[1] - lo[1] + 2 * pad) / texel), cx = (lo[0] + hi[0]) / 2, cy = (lo[1] + hi[1]) / 2, cz = hi[2] + 1;
	const pos = [
		0,
		1,
		2
	].map((k) => right[k] * cx + up[k] * cy + toward[k] * cz), map = new Float32Array(W * H).fill(Infinity);
	const target = {
		W,
		H,
		right,
		up,
		toward,
		pos,
		fx: 1 / texel,
		fy: 1 / texel,
		camera: {
			projection: "orthographic",
			near: 1,
			far: (hi[2] - lo[2] + 2) * 1e3
		}
	};
	for (const p of casters) rasterPart(target, p, (i, z) => {
		if (z < map[i]) map[i] = z;
	});
	const taps = Array.from({ length: S.samples }, (_, j) => {
		const r = S.softness * Math.sqrt((j + .5) / S.samples), a = j * 2.39996;
		return [Math.cos(a) * r, Math.sin(a) * r];
	});
	return (p) => {
		const q = sub3(p, pos), x = dot(q, right), y = dot(q, up), z = -dot(q, toward);
		let hidden = 0;
		for (const [dx, dy] of taps) {
			const X = Math.floor(W / 2 + (x + dx) / texel), Y = Math.floor(H / 2 - (y + dy) / texel);
			if (X >= 0 && X < W && Y >= 0 && Y < H && z > map[Y * W + X] + S.bias) hidden++;
		}
		return strength * hidden / taps.length;
	};
}
function renderFrame(source, options = {}) {
	const width = options.width ?? 2400, height = options.height ?? 1600, S = RENDER_STYLE, ss = S.supersample, W = width * ss, H = height * ss;
	if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 16e6 || width > 8192 || height > 8192) throw new Error("图片尺寸须为正整数，单边不超过 8192，总像素不超过 1600 万");
	if (options.section !== void 0 && (!Number.isFinite(options.section) || options.section <= 0)) throw new Error("--section 必须是正数 mm");
	const c = resolveCamera(source, options), full = preparedPlan(source, options.state), level = options.level ?? c.level, plan = level ? selectedLevel(full, level) : full;
	const cutHeight = options.section !== void 0 ? options.section / 1e3 : c.id === "top" ? S.cutHeight : options.cutHeight;
	const decor = decorScene(source, full, options, level, cutHeight);
	const parts = [...sharedMesh(plan, { cutHeight }).flatMap((g) => g.parts).filter((p) => !decor.replaced.has(`${p.kind}|${p.ids.join(",")}`)), ...decor.parts];
	if (!parts.length) throw new Error("方案没有可渲染的实体");
	const lo = [
		Infinity,
		Infinity,
		Infinity
	], hi = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (const part of parts) part.positions.forEach((v, i) => {
		lo[i % 3] = Math.min(lo[i % 3], v);
		hi[i % 3] = Math.max(hi[i % 3], v);
	});
	if (c.projection === "perspective" && cutHeight === void 0) for (const r of plan.rooms) {
		const y = levelOf(plan, r).elevation + roomCeiling(plan, r);
		parts.push(solidMesh({
			kind: "ceiling",
			ids: [r.id],
			level: levelOf(plan, r).id,
			polygons: [[r.poly]],
			z0: y,
			z1: y + .04
		}));
	}
	let plinth;
	if (c.projection === "orthographic") {
		const x0 = lo[0] - S.base.margin, x1 = hi[0] + S.base.margin, z0 = lo[2] - S.base.margin, z1 = hi[2] + S.base.margin, radius = Math.min(S.base.radius, (x1 - x0) / 2, (z1 - z0) / 2), poly = [];
		for (const [cx, cz, angle] of [
			[
				x1 - radius,
				z1 - radius,
				0
			],
			[
				x0 + radius,
				z1 - radius,
				Math.PI / 2
			],
			[
				x0 + radius,
				z0 + radius,
				Math.PI
			],
			[
				x1 - radius,
				z0 + radius,
				Math.PI * 1.5
			]
		]) for (let i = 0; i <= S.base.cornerSegments; i++) {
			const a = angle + i / S.base.cornerSegments * Math.PI / 2;
			poly.push([(cx + Math.cos(a) * radius) * 1e3, (cz + Math.sin(a) * radius) * 1e3]);
		}
		parts.push(solidMesh({
			kind: "plinth",
			ids: [],
			polygons: [[poly]],
			z0: lo[1] - S.base.gap - S.base.thickness,
			z1: lo[1] - S.base.gap
		}));
		plinth = {
			x0,
			x1,
			z0,
			z1,
			radius,
			y: lo[1] - S.base.gap - S.base.thickness
		};
	}
	const { right, up, toward } = cameraBasis(c), pos = c.pos.map((v) => v / 1e3), perspective = c.projection === "perspective";
	const fy = perspective ? H / 2 / Math.tan((c.fov ?? 75) * Math.PI / 360) : H / (c.span / 1e3), fx = fy, near = c.near ?? 50, far = c.far ?? 1e5;
	const viewMatrix = [
		right[0],
		up[0],
		toward[0],
		0,
		right[1],
		up[1],
		toward[1],
		0,
		right[2],
		up[2],
		toward[2],
		0,
		-dot(c.pos, right),
		-dot(c.pos, up),
		-dot(c.pos, toward),
		1
	];
	const projectionMatrix = perspective ? [
		2 * fx / W,
		0,
		0,
		0,
		0,
		2 * fy / H,
		0,
		0,
		0,
		0,
		-(far + near) / (far - near),
		-1,
		0,
		0,
		-2 * far * near / (far - near),
		0
	] : [
		2 * fx / W / 1e3,
		0,
		0,
		0,
		0,
		2 * fy / H / 1e3,
		0,
		0,
		0,
		0,
		-2 / (far - near),
		0,
		0,
		0,
		-(far + near) / (far - near),
		1
	];
	const camera = {
		...c,
		up,
		format: "floorplan-camera",
		version: 1,
		unit: "mm",
		width,
		height,
		state: options.state ?? "original",
		section: options.section ?? (options.cutHeight !== void 0 ? options.cutHeight * 1e3 : c.id === "top" ? S.cutHeight * 1e3 : void 0),
		transparent: options.transparent ?? false,
		passes: options.passes ?? ["clay"],
		level,
		near,
		far,
		intrinsics: {
			fx: fx / ss / (perspective ? 1 : 1e3),
			fy: fy / ss / (perspective ? 1 : 1e3),
			cx: width / 2,
			cy: height / 2
		},
		viewMatrix,
		projectionMatrix,
		world: "右手系 mm；x=平面 x，z=平面 y，y 向上；矩阵列主序，相机看向 -Z；bbox 为左上原点闭区间像素",
		openings: []
	};
	const frame = {
		width,
		height,
		W,
		H,
		ss,
		rgba: new Uint8Array(width * height * 4),
		depth: new Float32Array(W * H).fill(Infinity),
		normals: new Float32Array(W * H * 3),
		partAt: new Int32Array(W * H).fill(-1),
		parts,
		camera,
		plan,
		right,
		up,
		toward,
		pos,
		fx,
		fy
	};
	parts.forEach((part, index) => rasterPart(frame, part, (i, z, n) => {
		if (z >= frame.depth[i] - 1e-6) return;
		frame.depth[i] = z;
		frame.partAt[i] = index;
		frame.normals.set(n, i * 3);
	}));
	camera.decor = {
		...decor.view,
		visible: decor.view.drawn ? visibleDecor(frame) : []
	};
	const contactAt = contactField(parts, lo, hi), floorElevations = parts.map((p) => p.positions.reduce((h, v, i) => i % 3 === 1 ? Math.max(h, v) : h, -Infinity));
	const bg = rgb(S.background), line = rgb(S.outline.color), rim = rgb(S.glass.rimColor), palette = parts.map((p) => rgb(p.kind === "plinth" ? S.base.color : S.colors[p.kind])), er = Math.max(1, Math.round(S.outline.width * ss));
	const flat = (v) => {
		const l = Math.hypot(v[0], v[2]);
		return l > 1e-6 ? [
			v[0] / l,
			0,
			v[2] / l
		] : void 0;
	};
	const front = flat(sub3(toward, up)) ?? [
		0,
		0,
		1
	], side = flat(right) ?? [
		1,
		0,
		0
	];
	const relative = ([l, u, f]) => unit([
		-side[0] * l + front[0] * f,
		u,
		-side[2] * l + front[2] * f
	]);
	const interior = parts.some((p) => p.kind === "ceiling"), key = relative(S.light.key), fill = relative(S.light.fill), shadowAt = shadowMap(parts, key, interior ? S.shadow.interiorStrength : S.shadow.strength);
	const L = {
		...S.light,
		...interior ? S.light.interior : {}
	};
	const lightAt = (n, p) => {
		const ambient = n[1] >= 0 ? L.horizon + (L.sky - L.horizon) * n[1] : L.horizon + (L.ground - L.horizon) * -n[1];
		const nk = dot(n, key), k = nk > 0 ? L.keyStrength * nk * (1 - shadowAt(p)) : 0, f = L.fillStrength * Math.max(0, dot(n, fill));
		return [
			0,
			1,
			2
		].map((c) => ambient * S.light.ambientTint[c] + k * S.light.keyTint[c] + f * S.light.fillTint[c]);
	};
	const halo = (X, Y) => {
		if (!plinth || perspective || S.base.shadow <= 0 || toward[1] <= 1e-6) return 1;
		const cx = (X + .5 - W / 2) / fy, cy = (H / 2 - Y - .5) / fy, o = [
			0,
			1,
			2
		].map((k) => pos[k] + right[k] * cx + up[k] * cy), t = (o[1] - plinth.y) / toward[1], px = o[0] - toward[0] * t, pz = o[2] - toward[2] * t;
		const qx = Math.abs(px - (plinth.x0 + plinth.x1) / 2) - ((plinth.x1 - plinth.x0) / 2 - plinth.radius), qz = Math.abs(pz - (plinth.z0 + plinth.z1) / 2) - ((plinth.z1 - plinth.z0) / 2 - plinth.radius);
		const d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - plinth.radius;
		return 1 - S.base.shadow * Math.max(0, 1 - Math.max(0, d) / S.base.shadowRadius) ** 2;
	};
	const glassy = parts.map((p) => GLASS_KINDS.has(p.kind));
	let behind;
	if (glassy.some(Boolean)) {
		const b = {
			depth: new Float32Array(W * H).fill(Infinity),
			part: new Int32Array(W * H).fill(-1),
			normals: new Int8Array(W * H * 3)
		};
		parts.forEach((part, index) => {
			if (!glassy[index]) rasterPart(frame, part, (i, z, n) => {
				const f = frame.partAt[i];
				if (f < 0 || !glassy[f] || z >= b.depth[i] - 1e-6) return;
				b.depth[i] = z;
				b.part[i] = index;
				for (let k = 0; k < 3; k++) b.normals[i * 3 + k] = Math.round(n[k] * 127);
			});
		});
		behind = b;
	}
	const surface = (index, n, p) => {
		const l = lightAt(n, p), contact = n[1] > .99 && [
			"floor",
			"slab",
			"platform",
			"plinth"
		].includes(parts[index].kind) ? contactAt(p, floorElevations[index]) : 1;
		return palette[index].map((v, k) => v * l[k] * contact);
	};
	const aoTaps = S.ao.radii.flatMap((r) => Array.from({ length: S.ao.samples }, (_, j) => {
		const angle = j / S.ao.samples * Math.PI * 2;
		return [Math.cos(angle) * S.ao.radius * r, Math.sin(angle) * S.ao.radius * r];
	}));
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const sum = [
			0,
			0,
			0
		];
		let alpha = 0;
		for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
			const X = x * ss + sx, Y = y * ss + sy, i = Y * W + X, index = frame.partAt[i];
			if (index < 0) {
				if (!options.transparent) {
					const h = halo(X, Y);
					bg.forEach((v, k) => sum[k] += v * h);
					alpha++;
				}
				continue;
			}
			const n = [
				frame.normals[i * 3],
				frame.normals[i * 3 + 1],
				frame.normals[i * 3 + 2]
			], edge = edgeAt(frame, i, -er, 0) || edgeAt(frame, i, er, 0) || edgeAt(frame, i, 0, -er) || edgeAt(frame, i, 0, er);
			if (glassy[index]) {
				const pane = surface(index, n, worldAt(frame, i)), o = S.glass.opacity, j = behind.part[i];
				let color, weight = 1;
				if (j >= 0) color = surface(j, Array.from(behind.normals.subarray(i * 3, i * 3 + 3), (v) => v / 127), worldAtDepth(frame, i, behind.depth[i])).map((v, k) => v * (1 - o) + pane[k] * o);
				else if (!options.transparent) color = bg.map((v, k) => v * (1 - o) + pane[k] * o);
				else {
					color = pane;
					weight = o;
				}
				if (edge) color = color.map((v, k) => v * (1 - S.glass.rim) + rim[k] * S.glass.rim);
				color.forEach((v, k) => sum[k] += Math.min(255, v) * weight);
				alpha += weight;
				continue;
			}
			const scale = perspective ? fy / frame.depth[i] : fy, nr = dot(n, right), nu = dot(n, up), nt = dot(n, toward), camX = (X + .5 - W / 2) / scale, camY = (H / 2 - Y - .5) / scale;
			let occlusion = 0;
			for (let j = 0; j < aoTaps.length; j++) {
				const dx = Math.round(aoTaps[j][0] * scale), dy = Math.round(aoTaps[j][1] * scale), xx = X + dx, yy = Y + dy;
				if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
				const q = yy * W + xx;
				if (!Number.isFinite(frame.depth[q])) continue;
				const qs = perspective ? fy / frame.depth[q] : fy, dxCam = (xx + .5 - W / 2) / qs - camX, dyCam = (H / 2 - yy - .5) / qs - camY, dzCam = frame.depth[q] - frame.depth[i], length = Math.hypot(dxCam, dyCam, dzCam);
				if (length <= S.ao.radius && length > 1e-6) occlusion += Math.max(0, (nr * dxCam + nu * dyCam - nt * dzCam - S.ao.bias) / length) * (1 - length / S.ao.radius);
			}
			const shade = 1 - S.ao.strength * Math.min(1, occlusion / (S.ao.radii.length * S.ao.samples) * 4), mix = edge ? S.outline.strength : 0;
			surface(index, n, worldAt(frame, i)).forEach((v, k) => sum[k] += Math.min(255, v * shade) * (1 - mix) + line[k] * mix);
			alpha++;
		}
		const i = (y * width + x) * 4;
		sum.forEach((v, k) => frame.rgba[i + k] = alpha ? Math.round(v / alpha) : 0);
		frame.rgba[i + 3] = Math.round(alpha / (ss * ss) * 255);
	}
	return frame;
}
/** ADE20K palette. Decor classes come from the furniture type; their names are listed in DECOR_SEG_CLASSES. */
var SEG_CLASSES = {
	wall: [
		120,
		120,
		120
	],
	floor: [
		80,
		50,
		50
	],
	ceiling: [
		120,
		120,
		80
	],
	window: [
		230,
		230,
		230
	],
	door: [
		8,
		255,
		51
	],
	bed: [
		204,
		5,
		255
	],
	cabinet: [
		224,
		5,
		255
	],
	table: [
		255,
		6,
		82
	],
	chair: [
		204,
		70,
		3
	],
	sofa: [
		11,
		102,
		255
	],
	shelf: [
		255,
		7,
		71
	],
	rug: [
		255,
		9,
		92
	],
	armchair: [
		8,
		255,
		214
	],
	desk: [
		10,
		255,
		71
	],
	wardrobe: [
		7,
		255,
		255
	],
	bathtub: [
		102,
		8,
		255
	],
	box: [
		0,
		255,
		20
	],
	sink: [
		0,
		163,
		255
	],
	refrigerator: [
		20,
		255,
		0
	],
	toilet: [
		0,
		255,
		133
	],
	none: [
		0,
		0,
		0
	]
};
/** Furniture and cabinet classes: gen_score.py leaves their edges out of the structure score. */
var DECOR_SEG_CLASSES = [
	"bed",
	"cabinet",
	"table",
	"chair",
	"sofa",
	"shelf",
	"rug",
	"armchair",
	"desk",
	"wardrobe",
	"bathtub",
	"box",
	"sink",
	"refrigerator",
	"toilet"
];
function classOf(part) {
	const decor = decorInfo.get(part);
	if (decor) return decor.seg;
	const kind = part.kind;
	if (kind === "ceiling") return "ceiling";
	if ([
		"floor",
		"platform",
		"slab",
		"stair",
		"plinth"
	].includes(kind)) return "floor";
	if ([
		"glass",
		"pane",
		"rail"
	].includes(kind)) return "window";
	if (kind === "leaf") return "door";
	return "wall";
}
function renderKit(plan, options = {}) {
	const passes = options.passes ?? ["clay"];
	if (!passes.length || passes.some((p) => ![
		"clay",
		"depth",
		"lines",
		"seg",
		"openings"
	].includes(p))) throw new Error("passes 只支持 clay,depth,lines,seg,openings");
	const f = renderFrame(plan, options), { width, height, W, H, ss } = f, N = width * height;
	const files = {}, sample = new Int32Array(N).fill(-1), mm = new Uint16Array(N);
	let min = Infinity, max = 0;
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const i = y * width + x;
		let best = Infinity;
		for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
			const j = (y * ss + sy) * W + x * ss + sx;
			if (f.depth[j] < best) {
				best = f.depth[j];
				sample[i] = j;
			}
		}
		if (Number.isFinite(best)) {
			mm[i] = Math.max(1, Math.min(65535, Math.round(best * 1e3)));
			min = Math.min(min, best * 1e3);
			max = Math.max(max, best * 1e3);
		}
	}
	const pixels = (fn) => {
		const data = new Uint8Array(N * 4);
		for (let i = 0; i < N; i++) {
			const v = fn(i);
			data.set([
				v[0],
				v[1] ?? v[0],
				v[2] ?? v[0],
				255
			], i * 4);
		}
		return encodePng(width, height, data);
	};
	if (passes.includes("clay")) files["clay.png"] = encodePng(width, height, f.rgba);
	if (passes.includes("depth")) {
		let invMin = Infinity, invMax = 0;
		for (const d of mm) if (d) {
			invMin = Math.min(invMin, 1 / d);
			invMax = Math.max(invMax, 1 / d);
		}
		files["depth16.png"] = encodeGray16(width, height, mm);
		files["depth-inv.png"] = pixels((i) => [mm[i] ? invMax === invMin ? 255 : Math.round(255 * (1 / mm[i] - invMin) / (invMax - invMin)) : 0]);
		files["depth.png"] = files["depth-inv.png"];
		files["raw-depthmm.png"] = pixels((i) => [
			mm[i] >> 8,
			mm[i] & 255,
			0
		]);
	}
	if (passes.includes("lines")) {
		const ink = new Uint8Array(N), radius = Math.max(1, Math.round(RENDER_STYLE.outline.width * ss));
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
			const i = (y * ss + sy) * W + x * ss + sx;
			if ([
				[-radius, 0],
				[radius, 0],
				[0, -radius],
				[0, radius]
			].some(([dx, dy]) => edgeAt(f, i, dx, dy))) ink[y * width + x] = 1;
		}
		files["lines.png"] = pixels((i) => [ink[i] ? 0 : 255]);
		files["lines-inv.png"] = pixels((i) => [ink[i] ? 255 : 0]);
	}
	const idAt = new Int32Array(W * H), openingDepth = new Float32Array(W * H).fill(Infinity);
	f.plan.openings.forEach((o, index) => {
		const wall = f.plan.walls.find((w) => w.id === o.wall);
		if (!wall) return;
		const widened = {
			...f.plan,
			walls: f.plan.walls.map((w) => w.id === wall.id ? {
				...w,
				thickness: w.thickness + 20
			} : w)
		}, el = levelOf(f.plan, wall).elevation;
		const cap = f.camera.section !== void 0 ? el + f.camera.section / 1e3 : Infinity;
		const proxy = solidMesh({
			kind: "pane",
			ids: [o.id],
			polygons: [[openingFootprint(widened, o)]],
			z0: el + o.sill,
			z1: Math.min(el + o.head, cap)
		});
		rasterPart(f, proxy, (i, z) => {
			if (z <= f.depth[i] + .012 && z < openingDepth[i]) {
				openingDepth[i] = z;
				idAt[i] = index + 1;
			}
		});
	});
	const instance = new Uint16Array(N), counts = new Uint32Array(f.plan.openings.length), boxes = f.plan.openings.map(() => [
		width,
		height,
		-1,
		-1
	]);
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		let closest = Infinity, id = 0;
		for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
			const j = (y * ss + sy) * W + x * ss + sx;
			if (idAt[j] && openingDepth[j] < closest) {
				id = idAt[j];
				closest = openingDepth[j];
			}
		}
		if (id) {
			instance[y * width + x] = id;
			counts[id - 1]++;
			const b = boxes[id - 1];
			b[0] = Math.min(b[0], x);
			b[1] = Math.min(b[1], y);
			b[2] = Math.max(b[2], x);
			b[3] = Math.max(b[3], y);
		}
	}
	const instances = f.plan.openings.map((o, i) => ({
		idx: i + 1,
		id: o.id,
		name: o.name ?? o.id,
		kind: o.kind,
		cls: o.kind.includes("window") || o.kind === "open-balcony" ? "window" : "door",
		width_mm: o.width,
		sill_mm: o.sill * 1e3,
		head_mm: o.head * 1e3,
		visible_px: counts[i],
		bbox_xyxy: boxes[i],
		mask: `opening-${String(i + 1).padStart(3, "0")}.png`
	}));
	f.camera.openings = instances.filter((o) => o.visible_px > 0);
	if (passes.includes("openings")) {
		files["openings.png"] = encodeGray16(width, height, instance);
		for (const o of instances) files[o.mask] = pixels((i) => [instance[i] === o.idx ? 255 : 0]);
	}
	if (passes.includes("seg")) {
		files["seg-ade20k.png"] = pixels((i) => {
			const opening = instance[i] ? instances[instance[i] - 1] : void 0, j = sample[i];
			return SEG_CLASSES[opening?.cls ?? (j < 0 ? "none" : classOf(f.parts[f.partAt[j]]))];
		});
		files["seg.png"] = files["seg-ade20k.png"];
	}
	return {
		files,
		camera: {
			...f.camera,
			depth: {
				encoding: "depth16.png：16-bit gray，线性相机 z 毫米；0=无几何；超过65535截断。raw-depthmm.png：R*256+G。depth-inv.png：1/z 单张 min-max 归一化，近白远黑。",
				min_mm: Number.isFinite(min) ? min : 0,
				max_mm: max,
				clipped: max > 65535
			},
			segClasses: SEG_CLASSES,
			segDecorClasses: DECOR_SEG_CLASSES,
			openingId: "openings.png：16-bit gray = idx，0=无洞口；单扇 opening-NNN.png 为白色可见区域、黑色遮挡/背景；bbox 为闭区间",
			openingMasks: instances
		}
	};
}
var crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
	for (let k = 0; k < 8; k++) n = n & 1 ? 3988292384 ^ n >>> 1 : n >>> 1;
	return n >>> 0;
});
var crc32 = (data) => {
	let crc = 4294967295;
	for (const b of data) crc = crcTable[(crc ^ b) & 255] ^ crc >>> 8;
	return (crc ^ 4294967295) >>> 0;
};
function pngBytes(width, height, bytes, channels, bitDepth) {
	if (bytes.length !== width * height * channels * bitDepth / 8) throw new Error("像素长度与尺寸不符");
	const stride = width * channels * bitDepth / 8;
	const chunk = (type, bytes) => {
		const out = Buffer.alloc(bytes.length + 12);
		out.writeUInt32BE(bytes.length, 0);
		out.write(type, 4, 4, "ascii");
		out.set(bytes, 8);
		out.writeUInt32BE(crc32(out.subarray(4, bytes.length + 8)), bytes.length + 8);
		return out;
	};
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = bitDepth;
	header[9] = channels === 4 ? 6 : 0;
	const scanlines = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) scanlines.set(bytes.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
	return Buffer.concat([
		Buffer.from([
			137,
			80,
			78,
			71,
			13,
			10,
			26,
			10
		]),
		chunk("IHDR", header),
		chunk("sRGB", Uint8Array.of(0)),
		chunk("IDAT", deflateSync(scanlines, { level: 9 })),
		chunk("IEND", /* @__PURE__ */ new Uint8Array())
	]);
}
function encodePng(width, height, rgba) {
	return pngBytes(width, height, rgba, 4, 8);
}
function encodeGray16(width, height, values) {
	const bytes = Buffer.alloc(values.length * 2);
	values.forEach((v, i) => bytes.writeUInt16BE(v, i * 2));
	return pngBytes(width, height, bytes, 1, 16);
}
// src/core/summary.ts
function areaValues(plan) {
	const excluded = plan.rooms.filter((r) => r.counted === false);
	const countedGross = difference(unionPolygons([...wallFootprints(plan, (w) => {
		const sides = roomsBesideWall(plan, w.id), rooms = [...sides.positive, ...sides.negative];
		return !rooms.length || rooms.some((r) => r.counted !== false);
	}), ...plan.rooms.filter((r) => r.counted !== false && r.poly.length >= 3).map((r) => [r.poly])]).map((rings) => [rings[0]]), excluded.map((r) => [r.poly]));
	return {
		netArea: plan.rooms.filter((r) => r.counted !== false).reduce((sum, r) => sum + polygonArea(r.poly), 0),
		wallArea: wallFootprints(plan).reduce((sum, rings) => sum + polygonArea(rings[0]) - rings.slice(1).reduce((holes, ring) => holes + polygonArea(ring), 0), 0),
		grossArea: countedGross.reduce((sum, rings) => sum + polygonArea(rings[0]) - rings.slice(1).reduce((s, r) => s + polygonArea(r), 0), 0),
		excludedArea: excluded.reduce((sum, r) => sum + polygonArea(r.poly), 0)
	};
}
function planStats(plan) {
	const questions = questionCounts(plan);
	const roomAreas = plan.rooms.map((r) => ({
		id: r.id,
		name: r.name,
		area: Math.round(polygonArea(r.poly) / 1e5) / 10,
		counted: r.counted !== false
	}));
	const roundArea = (area) => Math.round(area / 1e5) / 10;
	const extended = hasLevelData(plan), floors = levelsOf(plan).map((level) => ({
		level,
		view: onLevel(plan, level.id)
	}));
	const raw = extended ? floors.map(({ view }) => areaValues(view)) : [areaValues(plan)];
	const netArea = roundArea(raw.reduce((sum, s) => sum + s.netArea, 0)), grossArea = roundArea(raw.reduce((sum, s) => sum + s.grossArea, 0)), wallArea = roundArea(raw.reduce((sum, s) => sum + s.wallArea, 0));
	const counts = (p) => ({
		columns: p.columns?.length ?? 0,
		shafts: p.shafts?.length ?? 0,
		stairs: p.stairs?.length ?? 0,
		voids: p.voids?.length ?? 0
	});
	const excludedRooms = (p) => p.rooms.filter((r) => r.counted === false).map((r) => ({
		id: r.id,
		name: r.name,
		area: roundArea(polygonArea(r.poly))
	}));
	const byLevel = extended ? floors.map(({ level, view }, i) => ({
		id: level.id,
		name: level.name,
		elevation: level.elevation,
		excludedRooms: excludedRooms(view),
		excludedArea: roundArea(raw[i].excludedArea),
		netArea: roundArea(raw[i].netArea),
		grossArea: roundArea(raw[i].grossArea),
		wallArea: roundArea(raw[i].wallArea),
		walls: view.walls.length,
		openings: view.openings.length,
		beams: view.beams.length,
		rooms: view.rooms.length,
		...counts(view)
	})) : void 0;
	return {
		...plan.decor ? { decor: decorStats(plan) } : {},
		netArea,
		grossArea,
		wallArea,
		...plan.rooms.some((r) => r.counted === false) || extended ? {
			excludedRooms: excludedRooms(plan),
			excludedArea: roundArea(raw.reduce((s, x) => s + x.excludedArea, 0))
		} : {},
		walls: plan.walls.length,
		doors: plan.openings.filter((o) => [
			"door",
			"sliding",
			"doorway"
		].includes(o.kind)).length,
		windows: plan.openings.filter((o) => [
			"window",
			"floor-window",
			"bay-window",
			"open-balcony"
		].includes(o.kind)).length,
		openings: plan.openings.length,
		beams: plan.beams.length,
		rooms: plan.rooms.length,
		area: netArea,
		roomAreas,
		questions,
		unansweredQuestions: questions.open,
		pendingChanges: plan.changes.filter((c) => c.status === "pending").length,
		...byLevel ? {
			byLevel,
			...counts(plan)
		} : {}
	};
}
// schema/generate.ts
var generate_exports = /* @__PURE__ */ __exportAll({});
var init_generate = __esmMin((() => {
	mkdirSync("schema", { recursive: true });
	writeFileSync("schema/plan.schema.json", "{\n  \"$schema\": \"https://json-schema.org/draft/2020-12/schema\",\n  \"$id\": \"urn:floorplan-structure:v3\",\n  \"title\": \"户型结构方案 v3（全部长度 mm）\",\n  \"description\": \"所有长度含高度均为 mm；像素坐标为 px、角度为度、面积为 m²、panes.width 为比例。legacy 是不透明旧格式快照，不参与 v3 换算。\",\n  \"type\": \"object\",\n  \"properties\": {\n    \"decor\": {\n      \"$ref\": \"#/$defs/Decor\"\n    },\n    \"format\": {\n      \"const\": \"floorplan-structure\"\n    },\n    \"version\": {\n      \"const\": 3\n    },\n    \"title\": {\n      \"type\": \"string\"\n    },\n    \"ceiling\": {\n      \"type\": \"number\",\n      \"exclusiveMinimum\": 0\n    },\n    \"north\": {\n      \"type\": \"number\"\n    },\n    \"levels\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Level\"\n      },\n      \"minItems\": 1\n    },\n    \"columns\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Column\"\n      }\n    },\n    \"shafts\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Shaft\"\n      }\n    },\n    \"stairs\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Stair\"\n      }\n    },\n    \"voids\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Void\"\n      }\n    },\n    \"levelUnderlays\": {\n      \"type\": \"object\",\n      \"additionalProperties\": {\n        \"$ref\": \"#/$defs/Underlay\"\n      }\n    },\n    \"walls\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Wall\"\n      }\n    },\n    \"openings\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Opening\"\n      }\n    },\n    \"beams\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Beam\"\n      }\n    },\n    \"rooms\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Room\"\n      }\n    },\n    \"underlay\": {\n      \"$ref\": \"#/$defs/Underlay\"\n    },\n    \"questions\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Question\"\n      }\n    },\n    \"changes\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"$ref\": \"#/$defs/Change\"\n      }\n    },\n    \"legacy\": {\n      \"type\": \"object\",\n      \"additionalProperties\": true\n    },\n    \"meta\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"planFile\": {\n          \"type\": \"string\"\n        },\n        \"source\": {\n          \"type\": \"string\"\n        },\n        \"createdAt\": {\n          \"type\": \"string\"\n        },\n        \"updatedAt\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [],\n      \"additionalProperties\": false\n    }\n  },\n  \"required\": [\n    \"format\",\n    \"version\",\n    \"title\",\n    \"ceiling\",\n    \"walls\",\n    \"openings\",\n    \"beams\",\n    \"rooms\",\n    \"questions\",\n    \"changes\"\n  ],\n  \"additionalProperties\": false,\n  \"$defs\": {\n    \"Vec2\": {\n      \"type\": \"array\",\n      \"prefixItems\": [\n        {\n          \"type\": \"number\"\n        },\n        {\n          \"type\": \"number\"\n        }\n      ],\n      \"minItems\": 2,\n      \"maxItems\": 2\n    },\n    \"Box\": {\n      \"type\": \"array\",\n      \"prefixItems\": [\n        {\n          \"type\": \"number\"\n        },\n        {\n          \"type\": \"number\"\n        },\n        {\n          \"type\": \"number\"\n        },\n        {\n          \"type\": \"number\"\n        }\n      ],\n      \"minItems\": 4,\n      \"maxItems\": 4\n    },\n    \"Certainty\": {\n      \"type\": \"string\",\n      \"enum\": [\n        \"seen\",\n        \"inferred\",\n        \"unknown\"\n      ]\n    },\n    \"WallKind\": {\n      \"type\": \"string\",\n      \"enum\": [\n        \"exterior\",\n        \"bearing\",\n        \"partition\",\n        \"glass\",\n        \"half\",\n        \"half-glass\"\n      ]\n    },\n    \"OpeningKind\": {\n      \"type\": \"string\",\n      \"enum\": [\n        \"door\",\n        \"sliding\",\n        \"doorway\",\n        \"window\",\n        \"floor-window\",\n        \"bay-window\",\n        \"open-balcony\"\n      ]\n    },\n    \"PaneKind\": {\n      \"type\": \"string\",\n      \"enum\": [\n        \"fixed\",\n        \"casement\",\n        \"sliding\"\n      ]\n    },\n    \"Evidence\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"certainty\": {\n          \"$ref\": \"#/$defs/Certainty\"\n        },\n        \"basis\": {\n          \"type\": \"string\"\n        },\n        \"pixelBox\": {\n          \"$ref\": \"#/$defs/Box\"\n        },\n        \"confirmed\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"by\": {\n              \"type\": \"string\",\n              \"minLength\": 1\n            },\n            \"at\": {\n              \"type\": \"string\"\n            },\n            \"note\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"by\"\n          ],\n          \"additionalProperties\": false\n        }\n      },\n      \"required\": [\n        \"certainty\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Wall\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"evidence\": {\n          \"$ref\": \"#/$defs/Evidence\"\n        },\n        \"level\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"a\": {\n          \"$ref\": \"#/$defs/Vec2\"\n        },\n        \"b\": {\n          \"$ref\": \"#/$defs/Vec2\"\n        },\n        \"thickness\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0\n        },\n        \"kind\": {\n          \"$ref\": \"#/$defs/WallKind\"\n        },\n        \"height\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm\"\n        },\n        \"lowHeight\": {\n          \"type\": \"number\",\n          \"minimum\": 0,\n          \"description\": \"长度单位 mm\"\n        },\n        \"bulge\": {\n          \"type\": \"number\"\n        },\n        \"name\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"a\",\n        \"b\",\n        \"thickness\",\n        \"kind\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Opening\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"evidence\": {\n          \"$ref\": \"#/$defs/Evidence\"\n        },\n        \"wall\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"offset\": {\n          \"type\": \"number\",\n          \"minimum\": 0\n        },\n        \"width\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0\n        },\n        \"kind\": {\n          \"$ref\": \"#/$defs/OpeningKind\"\n        },\n        \"sill\": {\n          \"type\": \"number\",\n          \"minimum\": 0,\n          \"description\": \"长度单位 mm\"\n        },\n        \"head\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm\"\n        },\n        \"swing\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"hinge\": {\n              \"type\": \"string\",\n              \"enum\": [\n                \"start\",\n                \"end\"\n              ]\n            },\n            \"side\": {\n              \"enum\": [\n                1,\n                -1\n              ]\n            }\n          },\n          \"required\": [\n            \"hinge\",\n            \"side\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"panes\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"width\": {\n                \"type\": \"number\",\n                \"exclusiveMinimum\": 0\n              },\n              \"kind\": {\n                \"$ref\": \"#/$defs/PaneKind\"\n              }\n            },\n            \"required\": [\n              \"width\",\n              \"kind\"\n            ],\n            \"additionalProperties\": false\n          },\n          \"minItems\": 1\n        },\n        \"entry\": {\n          \"type\": \"boolean\"\n        },\n        \"name\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"wall\",\n        \"offset\",\n        \"width\",\n        \"kind\",\n        \"sill\",\n        \"head\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Beam\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"evidence\": {\n          \"$ref\": \"#/$defs/Evidence\"\n        },\n        \"level\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"a\": {\n          \"$ref\": \"#/$defs/Vec2\"\n        },\n        \"b\": {\n          \"$ref\": \"#/$defs/Vec2\"\n        },\n        \"width\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0\n        },\n        \"bottom\": {\n          \"type\": \"number\",\n          \"minimum\": 0,\n          \"description\": \"长度单位 mm\"\n        },\n        \"name\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"a\",\n        \"b\",\n        \"width\",\n        \"bottom\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Room\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"evidence\": {\n          \"$ref\": \"#/$defs/Evidence\"\n        },\n        \"level\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"poly\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Vec2\"\n          },\n          \"minItems\": 3\n        },\n        \"ceiling\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm\"\n        },\n        \"floorOffset\": {\n          \"type\": \"number\",\n          \"description\": \"长度单位 mm\"\n        },\n        \"use\": {\n          \"type\": \"string\"\n        },\n        \"counted\": {\n          \"type\": \"boolean\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"name\",\n        \"poly\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Level\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"elevation\": {\n          \"type\": \"number\",\n          \"description\": \"长度单位 mm\"\n        },\n        \"ceiling\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"name\",\n        \"elevation\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Column\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"evidence\": {\n          \"$ref\": \"#/$defs/Evidence\"\n        },\n        \"level\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"center\": {\n          \"$ref\": \"#/$defs/Vec2\"\n        },\n        \"shape\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"rect\",\n            \"round\"\n          ]\n        },\n        \"size\": {\n          \"type\": \"array\",\n          \"prefixItems\": [\n            {\n              \"type\": \"number\",\n              \"exclusiveMinimum\": 0\n            },\n            {\n              \"type\": \"number\",\n              \"exclusiveMinimum\": 0\n            }\n          ],\n          \"minItems\": 2,\n          \"maxItems\": 2\n        },\n        \"rotation\": {\n          \"type\": \"number\"\n        },\n        \"kind\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"bearing\",\n            \"decorative\"\n          ]\n        },\n        \"name\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"center\",\n        \"shape\",\n        \"size\",\n        \"kind\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Shaft\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"evidence\": {\n          \"$ref\": \"#/$defs/Evidence\"\n        },\n        \"level\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"poly\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Vec2\"\n          },\n          \"minItems\": 3\n        },\n        \"kind\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"flue\",\n            \"pipe\",\n            \"vent\",\n            \"other\"\n          ]\n        },\n        \"name\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"poly\",\n        \"kind\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Stair\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"evidence\": {\n          \"$ref\": \"#/$defs/Evidence\"\n        },\n        \"level\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"to\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"poly\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Vec2\"\n          },\n          \"minItems\": 3\n        },\n        \"path\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Vec2\"\n          },\n          \"minItems\": 2\n        },\n        \"width\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0\n        },\n        \"kind\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"straight\",\n            \"L\",\n            \"U\",\n            \"spiral\"\n          ]\n        },\n        \"steps\": {\n          \"type\": \"integer\",\n          \"minimum\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"level\",\n        \"to\",\n        \"poly\",\n        \"path\",\n        \"width\",\n        \"kind\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Void\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"level\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"poly\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Vec2\"\n          },\n          \"minItems\": 3\n        },\n        \"name\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"level\",\n        \"poly\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Underlay\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"src\": {\n          \"type\": \"string\",\n          \"minLength\": 1,\n          \"pattern\": \"^(?:(?![A-Za-z][A-Za-z0-9+.-]*:|[/\\\\\\\\]{2}).+|data:image/(?:png|jpe?g|webp|gif|bmp|avif);base64,.+|data:image/svg\\\\+xml(?:;charset=utf-8)?(?:;base64)?,.+)$\"\n        },\n        \"mmPerPx\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0\n        },\n        \"mmPerPxY\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0\n        },\n        \"origin\": {\n          \"$ref\": \"#/$defs/Vec2\"\n        },\n        \"rotation\": {\n          \"type\": \"number\"\n        },\n        \"flipX\": {\n          \"type\": \"boolean\"\n        },\n        \"flipY\": {\n          \"type\": \"boolean\"\n        },\n        \"opacity\": {\n          \"type\": \"number\",\n          \"minimum\": 0,\n          \"maximum\": 100\n        },\n        \"visible\": {\n          \"type\": \"boolean\"\n        },\n        \"calibrations\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"p1\": {\n                \"$ref\": \"#/$defs/Vec2\"\n              },\n              \"p2\": {\n                \"$ref\": \"#/$defs/Vec2\"\n              },\n              \"length\": {\n                \"type\": \"number\",\n                \"exclusiveMinimum\": 0\n              },\n              \"note\": {\n                \"type\": \"string\"\n              }\n            },\n            \"required\": [\n              \"p1\",\n              \"p2\",\n              \"length\"\n            ],\n            \"additionalProperties\": false\n          }\n        }\n      },\n      \"required\": [\n        \"src\",\n        \"mmPerPx\",\n        \"origin\",\n        \"opacity\",\n        \"visible\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"QuestionStatus\": {\n      \"type\": \"string\",\n      \"enum\": [\n        \"open\",\n        \"answered\",\n        \"resolved\"\n      ]\n    },\n    \"QuestionOutcome\": {\n      \"type\": \"string\",\n      \"enum\": [\n        \"changed\",\n        \"confirmed\",\n        \"inferred\",\n        \"noted\",\n        \"ask\",\n        \"withdrawn\"\n      ]\n    },\n    \"QuestionReply\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"outcome\": {\n          \"$ref\": \"#/$defs/QuestionOutcome\"\n        },\n        \"text\": {\n          \"type\": \"string\"\n        },\n        \"changed\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"string\",\n            \"minLength\": 1\n          }\n        },\n        \"by\": {\n          \"type\": \"string\"\n        },\n        \"at\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"outcome\",\n        \"text\",\n        \"by\",\n        \"at\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"QuestionLogEntry\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"role\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"user\",\n            \"agent\"\n          ]\n        },\n        \"text\": {\n          \"type\": \"string\"\n        },\n        \"by\": {\n          \"type\": \"string\"\n        },\n        \"at\": {\n          \"type\": \"string\"\n        },\n        \"outcome\": {\n          \"$ref\": \"#/$defs/QuestionOutcome\"\n        },\n        \"changed\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"string\",\n            \"minLength\": 1\n          }\n        }\n      },\n      \"required\": [\n        \"role\",\n        \"text\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Question\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"level\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"text\": {\n          \"type\": \"string\"\n        },\n        \"category\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"original\",\n            \"renovation\"\n          ]\n        },\n        \"certainty\": {\n          \"$ref\": \"#/$defs/Certainty\"\n        },\n        \"bbox\": {\n          \"$ref\": \"#/$defs/Box\"\n        },\n        \"targets\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"string\"\n          }\n        },\n        \"options\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"string\"\n          }\n        },\n        \"answer\": {\n          \"type\": \"string\"\n        },\n        \"answeredBy\": {\n          \"type\": \"string\"\n        },\n        \"answeredAt\": {\n          \"type\": \"string\"\n        },\n        \"status\": {\n          \"$ref\": \"#/$defs/QuestionStatus\"\n        },\n        \"reply\": {\n          \"$ref\": \"#/$defs/QuestionReply\"\n        },\n        \"log\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/QuestionLogEntry\"\n          }\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"text\",\n        \"category\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Change\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"op\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"add\",\n            \"remove\",\n            \"update\"\n          ]\n        },\n        \"type\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"wall\",\n            \"opening\",\n            \"beam\",\n            \"room\",\n            \"column\",\n            \"shaft\",\n            \"stair\",\n            \"void\"\n          ]\n        },\n        \"target\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"data\": {\n          \"type\": \"object\"\n        },\n        \"range\": {\n          \"type\": \"array\",\n          \"prefixItems\": [\n            {\n              \"type\": \"number\",\n              \"minimum\": 0\n            },\n            {\n              \"type\": \"number\",\n              \"minimum\": 0\n            }\n          ],\n          \"minItems\": 2,\n          \"maxItems\": 2\n        },\n        \"note\": {\n          \"type\": \"string\"\n        },\n        \"group\": {\n          \"type\": \"string\"\n        },\n        \"by\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"user\",\n            \"agent\"\n          ]\n        },\n        \"status\": {\n          \"type\": \"string\",\n          \"enum\": [\n            \"pending\",\n            \"confirmed\"\n          ]\n        },\n        \"confirm\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"by\": {\n              \"type\": \"string\",\n              \"minLength\": 1\n            },\n            \"at\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"by\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"at\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"op\",\n        \"type\",\n        \"by\",\n        \"status\"\n      ],\n      \"additionalProperties\": false,\n      \"allOf\": [\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              }\n            }\n          },\n          \"then\": {\n            \"required\": [\n              \"data\"\n            ]\n          },\n          \"else\": {\n            \"required\": [\n              \"target\"\n            ]\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              }\n            }\n          },\n          \"then\": {\n            \"required\": [\n              \"data\"\n            ]\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              },\n              \"type\": {\n                \"const\": \"wall\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"id\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"evidence\": {\n                    \"$ref\": \"#/$defs/Evidence\"\n                  },\n                  \"level\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"a\": {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  },\n                  \"b\": {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  },\n                  \"thickness\": {\n                    \"type\": \"number\",\n                    \"exclusiveMinimum\": 0\n                  },\n                  \"kind\": {\n                    \"$ref\": \"#/$defs/WallKind\"\n                  },\n                  \"height\": {\n                    \"type\": \"number\",\n                    \"exclusiveMinimum\": 0,\n                    \"description\": \"长度单位 mm\"\n                  },\n                  \"lowHeight\": {\n                    \"type\": \"number\",\n                    \"minimum\": 0,\n                    \"description\": \"长度单位 mm\"\n                  },\n                  \"bulge\": {\n                    \"type\": \"number\"\n                  },\n                  \"name\": {\n                    \"type\": \"string\"\n                  }\n                },\n                \"required\": [],\n                \"additionalProperties\": false\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              },\n              \"type\": {\n                \"const\": \"opening\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"id\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"evidence\": {\n                    \"$ref\": \"#/$defs/Evidence\"\n                  },\n                  \"wall\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"offset\": {\n                    \"type\": \"number\",\n                    \"minimum\": 0\n                  },\n                  \"width\": {\n                    \"type\": \"number\",\n                    \"exclusiveMinimum\": 0\n                  },\n                  \"kind\": {\n                    \"$ref\": \"#/$defs/OpeningKind\"\n                  },\n                  \"sill\": {\n                    \"type\": \"number\",\n                    \"minimum\": 0,\n                    \"description\": \"长度单位 mm\"\n                  },\n                  \"head\": {\n                    \"type\": \"number\",\n                    \"exclusiveMinimum\": 0,\n                    \"description\": \"长度单位 mm\"\n                  },\n                  \"swing\": {\n                    \"type\": \"object\",\n                    \"properties\": {\n                      \"hinge\": {\n                        \"type\": \"string\",\n                        \"enum\": [\n                          \"start\",\n                          \"end\"\n                        ]\n                      },\n                      \"side\": {\n                        \"enum\": [\n                          1,\n                          -1\n                        ]\n                      }\n                    },\n                    \"required\": [\n                      \"hinge\",\n                      \"side\"\n                    ],\n                    \"additionalProperties\": false\n                  },\n                  \"panes\": {\n                    \"type\": \"array\",\n                    \"items\": {\n                      \"type\": \"object\",\n                      \"properties\": {\n                        \"width\": {\n                          \"type\": \"number\",\n                          \"exclusiveMinimum\": 0\n                        },\n                        \"kind\": {\n                          \"$ref\": \"#/$defs/PaneKind\"\n                        }\n                      },\n                      \"required\": [\n                        \"width\",\n                        \"kind\"\n                      ],\n                      \"additionalProperties\": false\n                    },\n                    \"minItems\": 1\n                  },\n                  \"entry\": {\n                    \"type\": \"boolean\"\n                  },\n                  \"name\": {\n                    \"type\": \"string\"\n                  }\n                },\n                \"required\": [],\n                \"additionalProperties\": false\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              },\n              \"type\": {\n                \"const\": \"beam\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"id\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"evidence\": {\n                    \"$ref\": \"#/$defs/Evidence\"\n                  },\n                  \"level\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"a\": {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  },\n                  \"b\": {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  },\n                  \"width\": {\n                    \"type\": \"number\",\n                    \"exclusiveMinimum\": 0\n                  },\n                  \"bottom\": {\n                    \"type\": \"number\",\n                    \"minimum\": 0,\n                    \"description\": \"长度单位 mm\"\n                  },\n                  \"name\": {\n                    \"type\": \"string\"\n                  }\n                },\n                \"required\": [],\n                \"additionalProperties\": false\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              },\n              \"type\": {\n                \"const\": \"room\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"id\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"evidence\": {\n                    \"$ref\": \"#/$defs/Evidence\"\n                  },\n                  \"level\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"name\": {\n                    \"type\": \"string\"\n                  },\n                  \"poly\": {\n                    \"type\": \"array\",\n                    \"items\": {\n                      \"$ref\": \"#/$defs/Vec2\"\n                    },\n                    \"minItems\": 3\n                  },\n                  \"ceiling\": {\n                    \"type\": \"number\",\n                    \"exclusiveMinimum\": 0,\n                    \"description\": \"长度单位 mm\"\n                  },\n                  \"floorOffset\": {\n                    \"type\": \"number\",\n                    \"description\": \"长度单位 mm\"\n                  },\n                  \"use\": {\n                    \"type\": \"string\"\n                  },\n                  \"counted\": {\n                    \"type\": \"boolean\"\n                  }\n                },\n                \"required\": [],\n                \"additionalProperties\": false\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              },\n              \"type\": {\n                \"const\": \"column\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"id\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"evidence\": {\n                    \"$ref\": \"#/$defs/Evidence\"\n                  },\n                  \"level\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"center\": {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  },\n                  \"shape\": {\n                    \"type\": \"string\",\n                    \"enum\": [\n                      \"rect\",\n                      \"round\"\n                    ]\n                  },\n                  \"size\": {\n                    \"type\": \"array\",\n                    \"prefixItems\": [\n                      {\n                        \"type\": \"number\",\n                        \"exclusiveMinimum\": 0\n                      },\n                      {\n                        \"type\": \"number\",\n                        \"exclusiveMinimum\": 0\n                      }\n                    ],\n                    \"minItems\": 2,\n                    \"maxItems\": 2\n                  },\n                  \"rotation\": {\n                    \"type\": \"number\"\n                  },\n                  \"kind\": {\n                    \"type\": \"string\",\n                    \"enum\": [\n                      \"bearing\",\n                      \"decorative\"\n                    ]\n                  },\n                  \"name\": {\n                    \"type\": \"string\"\n                  }\n                },\n                \"required\": [],\n                \"additionalProperties\": false\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              },\n              \"type\": {\n                \"const\": \"shaft\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"id\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"evidence\": {\n                    \"$ref\": \"#/$defs/Evidence\"\n                  },\n                  \"level\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"poly\": {\n                    \"type\": \"array\",\n                    \"items\": {\n                      \"$ref\": \"#/$defs/Vec2\"\n                    },\n                    \"minItems\": 3\n                  },\n                  \"kind\": {\n                    \"type\": \"string\",\n                    \"enum\": [\n                      \"flue\",\n                      \"pipe\",\n                      \"vent\",\n                      \"other\"\n                    ]\n                  },\n                  \"name\": {\n                    \"type\": \"string\"\n                  }\n                },\n                \"required\": [],\n                \"additionalProperties\": false\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              },\n              \"type\": {\n                \"const\": \"stair\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"id\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"evidence\": {\n                    \"$ref\": \"#/$defs/Evidence\"\n                  },\n                  \"level\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"to\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"poly\": {\n                    \"type\": \"array\",\n                    \"items\": {\n                      \"$ref\": \"#/$defs/Vec2\"\n                    },\n                    \"minItems\": 3\n                  },\n                  \"path\": {\n                    \"type\": \"array\",\n                    \"items\": {\n                      \"$ref\": \"#/$defs/Vec2\"\n                    },\n                    \"minItems\": 2\n                  },\n                  \"width\": {\n                    \"type\": \"number\",\n                    \"exclusiveMinimum\": 0\n                  },\n                  \"kind\": {\n                    \"type\": \"string\",\n                    \"enum\": [\n                      \"straight\",\n                      \"L\",\n                      \"U\",\n                      \"spiral\"\n                    ]\n                  },\n                  \"steps\": {\n                    \"type\": \"integer\",\n                    \"minimum\": 1\n                  },\n                  \"name\": {\n                    \"type\": \"string\"\n                  }\n                },\n                \"required\": [],\n                \"additionalProperties\": false\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"update\"\n              },\n              \"type\": {\n                \"const\": \"void\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"id\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"level\": {\n                    \"type\": \"string\",\n                    \"minLength\": 1\n                  },\n                  \"poly\": {\n                    \"type\": \"array\",\n                    \"items\": {\n                      \"$ref\": \"#/$defs/Vec2\"\n                    },\n                    \"minItems\": 3\n                  },\n                  \"name\": {\n                    \"type\": \"string\"\n                  }\n                },\n                \"required\": [],\n                \"additionalProperties\": false\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              },\n              \"type\": {\n                \"const\": \"wall\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"$ref\": \"#/$defs/Wall\"\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              },\n              \"type\": {\n                \"const\": \"opening\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"$ref\": \"#/$defs/Opening\"\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              },\n              \"type\": {\n                \"const\": \"beam\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"$ref\": \"#/$defs/Beam\"\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              },\n              \"type\": {\n                \"const\": \"room\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"$ref\": \"#/$defs/Room\"\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              },\n              \"type\": {\n                \"const\": \"column\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"$ref\": \"#/$defs/Column\"\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              },\n              \"type\": {\n                \"const\": \"shaft\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"$ref\": \"#/$defs/Shaft\"\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              },\n              \"type\": {\n                \"const\": \"stair\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"$ref\": \"#/$defs/Stair\"\n              }\n            }\n          }\n        },\n        {\n          \"if\": {\n            \"properties\": {\n              \"op\": {\n                \"const\": \"add\"\n              },\n              \"type\": {\n                \"const\": \"void\"\n              }\n            }\n          },\n          \"then\": {\n            \"properties\": {\n              \"data\": {\n                \"$ref\": \"#/$defs/Void\"\n              }\n            }\n          }\n        }\n      ]\n    },\n    \"DecorLayer\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"version\": {\n          \"const\": 1\n        },\n        \"style\": {\n          \"type\": \"string\"\n        },\n        \"materials\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Material\"\n          }\n        },\n        \"presets\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/StylePreset\"\n          }\n        },\n        \"surfaces\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Surface\"\n          }\n        },\n        \"furniture\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Furniture\"\n          }\n        },\n        \"cabinets\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Cabinet\"\n          }\n        },\n        \"panels\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Panel\"\n          }\n        },\n        \"recesses\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/Recess\"\n          }\n        },\n        \"cache\": {\n          \"type\": \"object\",\n          \"additionalProperties\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"level\": {\n                \"type\": \"string\"\n              },\n              \"box\": {\n                \"$ref\": \"#/$defs/Box\"\n              },\n              \"anchor\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"wall\": {\n                    \"type\": \"string\"\n                  },\n                  \"a\": {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  },\n                  \"b\": {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  }\n                },\n                \"required\": [\n                  \"wall\",\n                  \"a\",\n                  \"b\"\n                ],\n                \"additionalProperties\": false\n              },\n              \"pose\": {\n                \"type\": \"object\",\n                \"properties\": {\n                  \"at\": {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  },\n                  \"rot\": {\n                    \"type\": \"number\"\n                  },\n                  \"z\": {\n                    \"type\": \"number\"\n                  }\n                },\n                \"required\": [\n                  \"at\",\n                  \"rot\",\n                  \"z\"\n                ],\n                \"additionalProperties\": false\n              },\n              \"face\": {\n                \"type\": \"array\",\n                \"prefixItems\": [\n                  {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  },\n                  {\n                    \"$ref\": \"#/$defs/Vec2\"\n                  }\n                ],\n                \"minItems\": 2,\n                \"maxItems\": 2\n              }\n            },\n            \"required\": [\n              \"box\"\n            ],\n            \"additionalProperties\": false\n          }\n        }\n      },\n      \"required\": [\n        \"version\",\n        \"style\",\n        \"materials\",\n        \"surfaces\",\n        \"furniture\",\n        \"cabinets\",\n        \"panels\",\n        \"recesses\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"DecorBase\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"level\": {\n          \"type\": \"string\"\n        },\n        \"by\": {\n          \"anyOf\": [\n            {\n              \"const\": \"user\"\n            },\n            {\n              \"const\": \"agent\"\n            }\n          ]\n        },\n        \"status\": {\n          \"anyOf\": [\n            {\n              \"const\": \"pending\"\n            },\n            {\n              \"const\": \"confirmed\"\n            }\n          ]\n        },\n        \"note\": {\n          \"type\": \"string\"\n        },\n        \"ack\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"by\": {\n              \"type\": \"string\"\n            },\n            \"at\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"by\"\n          ],\n          \"additionalProperties\": false\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"by\",\n        \"status\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"FaceRef\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"wall\": {\n          \"type\": \"string\"\n        },\n        \"side\": {\n          \"anyOf\": [\n            {\n              \"const\": 1\n            },\n            {\n              \"const\": -1\n            }\n          ]\n        }\n      },\n      \"required\": [\n        \"wall\",\n        \"side\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"FaceSpan\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"face\": {\n          \"$ref\": \"#/$defs/FaceRef\"\n        },\n        \"s\": {\n          \"type\": \"array\",\n          \"prefixItems\": [\n            {\n              \"type\": \"number\"\n            },\n            {\n              \"type\": \"number\"\n            }\n          ],\n          \"minItems\": 2,\n          \"maxItems\": 2\n        },\n        \"z\": {\n          \"type\": \"array\",\n          \"prefixItems\": [\n            {\n              \"type\": \"number\"\n            },\n            {\n              \"type\": \"number\"\n            }\n          ],\n          \"minItems\": 2,\n          \"maxItems\": 2,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        }\n      },\n      \"required\": [\n        \"face\",\n        \"s\",\n        \"z\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Recess\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"kind\": {\n          \"anyOf\": [\n            {\n              \"const\": \"niche\"\n            },\n            {\n              \"const\": \"hole\"\n            }\n          ]\n        },\n        \"host\": {\n          \"anyOf\": [\n            {\n              \"type\": \"object\",\n              \"properties\": {\n                \"face\": {\n                  \"$ref\": \"#/$defs/FaceRef\"\n                }\n              },\n              \"required\": [\n                \"face\"\n              ],\n              \"additionalProperties\": false\n            },\n            {\n              \"type\": \"object\",\n              \"properties\": {\n                \"panel\": {\n                  \"type\": \"string\"\n                }\n              },\n              \"required\": [\n                \"panel\"\n              ],\n              \"additionalProperties\": false\n            },\n            {\n              \"type\": \"object\",\n              \"properties\": {\n                \"cabinet\": {\n                  \"type\": \"string\"\n                }\n              },\n              \"required\": [\n                \"cabinet\"\n              ],\n              \"additionalProperties\": false\n            }\n          ]\n        },\n        \"rect\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"s\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            },\n            \"u\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            },\n            \"z\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            }\n          },\n          \"required\": [\n            \"z\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"depth\": {\n          \"anyOf\": [\n            {\n              \"type\": \"number\"\n            },\n            {\n              \"const\": \"through\"\n            }\n          ]\n        },\n        \"back\": {\n          \"type\": \"string\"\n        },\n        \"shelves\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"number\"\n          }\n        },\n        \"trim\": {\n          \"type\": \"string\"\n        },\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"level\": {\n          \"type\": \"string\"\n        },\n        \"by\": {\n          \"anyOf\": [\n            {\n              \"const\": \"user\"\n            },\n            {\n              \"const\": \"agent\"\n            }\n          ]\n        },\n        \"status\": {\n          \"anyOf\": [\n            {\n              \"const\": \"pending\"\n            },\n            {\n              \"const\": \"confirmed\"\n            }\n          ]\n        },\n        \"note\": {\n          \"type\": \"string\"\n        },\n        \"ack\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"by\": {\n              \"type\": \"string\"\n            },\n            \"at\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"by\"\n          ],\n          \"additionalProperties\": false\n        }\n      },\n      \"required\": [\n        \"kind\",\n        \"host\",\n        \"rect\",\n        \"depth\",\n        \"id\",\n        \"by\",\n        \"status\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Cabinet\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"family\": {\n          \"anyOf\": [\n            {\n              \"const\": \"tall\"\n            },\n            {\n              \"const\": \"base\"\n            },\n            {\n              \"const\": \"wall\"\n            }\n          ]\n        },\n        \"place\": {\n          \"anyOf\": [\n            {\n              \"type\": \"object\",\n              \"properties\": {\n                \"face\": {\n                  \"$ref\": \"#/$defs/FaceRef\"\n                },\n                \"s\": {\n                  \"type\": \"number\"\n                },\n                \"gap\": {\n                  \"type\": \"number\"\n                }\n              },\n              \"required\": [\n                \"face\",\n                \"s\"\n              ],\n              \"additionalProperties\": false\n            },\n            {\n              \"type\": \"object\",\n              \"properties\": {\n                \"at\": {\n                  \"$ref\": \"#/$defs/Vec2\"\n                },\n                \"rot\": {\n                  \"type\": \"number\"\n                }\n              },\n              \"required\": [\n                \"at\",\n                \"rot\"\n              ],\n              \"additionalProperties\": false\n            }\n          ]\n        },\n        \"width\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"depth\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"z\": {\n          \"type\": \"array\",\n          \"prefixItems\": [\n            {\n              \"type\": \"number\"\n            },\n            {\n              \"type\": \"number\"\n            }\n          ],\n          \"minItems\": 2,\n          \"maxItems\": 2,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"plinth\": {\n          \"type\": \"number\",\n          \"minimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"embed\": {\n          \"type\": \"number\",\n          \"minimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"top\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"material\": {\n              \"type\": \"string\"\n            },\n            \"thickness\": {\n              \"type\": \"number\"\n            },\n            \"overhang\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [\n            \"material\",\n            \"thickness\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"columns\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/CabinetColumn\"\n          }\n        },\n        \"cuts\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"u\": {\n                \"type\": \"array\",\n                \"prefixItems\": [\n                  {\n                    \"type\": \"number\"\n                  },\n                  {\n                    \"type\": \"number\"\n                  }\n                ],\n                \"minItems\": 2,\n                \"maxItems\": 2\n              },\n              \"z\": {\n                \"type\": \"array\",\n                \"prefixItems\": [\n                  {\n                    \"type\": \"number\"\n                  },\n                  {\n                    \"type\": \"number\"\n                  }\n                ],\n                \"minItems\": 2,\n                \"maxItems\": 2\n              },\n              \"depth\": {\n                \"anyOf\": [\n                  {\n                    \"const\": \"through\"\n                  },\n                  {\n                    \"type\": \"number\"\n                  }\n                ]\n              }\n            },\n            \"required\": [\n              \"u\",\n              \"z\",\n              \"depth\"\n            ],\n            \"additionalProperties\": false\n          }\n        },\n        \"materials\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"carcass\": {\n              \"type\": \"string\"\n            },\n            \"front\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"carcass\",\n            \"front\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"handle\": {\n          \"anyOf\": [\n            {\n              \"const\": \"none\"\n            },\n            {\n              \"const\": \"bar\"\n            },\n            {\n              \"const\": \"knob\"\n            },\n            {\n              \"const\": \"edge\"\n            }\n          ]\n        },\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"level\": {\n          \"type\": \"string\"\n        },\n        \"by\": {\n          \"anyOf\": [\n            {\n              \"const\": \"user\"\n            },\n            {\n              \"const\": \"agent\"\n            }\n          ]\n        },\n        \"status\": {\n          \"anyOf\": [\n            {\n              \"const\": \"pending\"\n            },\n            {\n              \"const\": \"confirmed\"\n            }\n          ]\n        },\n        \"note\": {\n          \"type\": \"string\"\n        },\n        \"ack\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"by\": {\n              \"type\": \"string\"\n            },\n            \"at\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"by\"\n          ],\n          \"additionalProperties\": false\n        }\n      },\n      \"required\": [\n        \"family\",\n        \"place\",\n        \"width\",\n        \"depth\",\n        \"z\",\n        \"columns\",\n        \"materials\",\n        \"id\",\n        \"by\",\n        \"status\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"CabinetColumn\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"width\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"cells\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"$ref\": \"#/$defs/CabinetCell\"\n          }\n        }\n      },\n      \"required\": [\n        \"cells\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"ApplianceType\": {\n      \"anyOf\": [\n        {\n          \"const\": \"fridge\"\n        },\n        {\n          \"const\": \"washer\"\n        },\n        {\n          \"const\": \"dryer\"\n        },\n        {\n          \"const\": \"oven\"\n        },\n        {\n          \"const\": \"steamer\"\n        },\n        {\n          \"const\": \"dishwasher\"\n        },\n        {\n          \"const\": \"microwave\"\n        },\n        {\n          \"const\": \"tv\"\n        },\n        {\n          \"const\": \"other\"\n        }\n      ]\n    },\n    \"CabinetCell\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"h\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"type\": {\n          \"anyOf\": [\n            {\n              \"const\": \"door\"\n            },\n            {\n              \"const\": \"doors\"\n            },\n            {\n              \"const\": \"drawers\"\n            },\n            {\n              \"const\": \"flap\"\n            },\n            {\n              \"const\": \"open\"\n            },\n            {\n              \"const\": \"void\"\n            },\n            {\n              \"const\": \"appliance\"\n            }\n          ]\n        },\n        \"hinge\": {\n          \"anyOf\": [\n            {\n              \"const\": \"left\"\n            },\n            {\n              \"const\": \"right\"\n            }\n          ]\n        },\n        \"count\": {\n          \"type\": \"integer\",\n          \"minimum\": 0,\n          \"maximum\": 1000\n        },\n        \"void\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"depth\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"through\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ]\n            },\n            \"top\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"z\": {\n                  \"type\": \"number\"\n                },\n                \"overhang\": {\n                  \"type\": \"number\"\n                },\n                \"material\": {\n                  \"type\": \"string\"\n                }\n              },\n              \"required\": [\n                \"z\"\n              ],\n              \"additionalProperties\": false\n            }\n          },\n          \"required\": [\n            \"depth\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"appliance\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"type\": {\n              \"$ref\": \"#/$defs/ApplianceType\"\n            },\n            \"size\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 3,\n              \"maxItems\": 3\n            }\n          },\n          \"required\": [\n            \"type\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"material\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"type\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Panel\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"type\": {\n          \"anyOf\": [\n            {\n              \"const\": \"feature\"\n            },\n            {\n              \"const\": \"wainscot\"\n            },\n            {\n              \"const\": \"slats\"\n            },\n            {\n              \"const\": \"skirting\"\n            },\n            {\n              \"const\": \"arch\"\n            }\n          ]\n        },\n        \"span\": {\n          \"$ref\": \"#/$defs/FaceSpan\"\n        },\n        \"opening\": {\n          \"type\": \"string\"\n        },\n        \"thickness\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"material\": {\n          \"type\": \"string\"\n        },\n        \"grooves\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"dir\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"v\"\n                },\n                {\n                  \"const\": \"h\"\n                }\n              ]\n            },\n            \"spacing\": {\n              \"type\": \"number\"\n            },\n            \"width\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [\n            \"dir\",\n            \"spacing\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"frame\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"style\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"flat\"\n                },\n                {\n                  \"const\": \"raised\"\n                }\n              ]\n            },\n            \"margin\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [\n            \"style\",\n            \"margin\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"slats\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"width\": {\n              \"type\": \"number\"\n            },\n            \"gap\": {\n              \"type\": \"number\"\n            },\n            \"depth\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [\n            \"width\",\n            \"gap\",\n            \"depth\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"arch\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"radius\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [],\n          \"additionalProperties\": false\n        },\n        \"avoid\": {\n          \"anyOf\": [\n            {\n              \"const\": \"openings\"\n            },\n            {\n              \"const\": \"none\"\n            }\n          ]\n        },\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"level\": {\n          \"type\": \"string\"\n        },\n        \"by\": {\n          \"anyOf\": [\n            {\n              \"const\": \"user\"\n            },\n            {\n              \"const\": \"agent\"\n            }\n          ]\n        },\n        \"status\": {\n          \"anyOf\": [\n            {\n              \"const\": \"pending\"\n            },\n            {\n              \"const\": \"confirmed\"\n            }\n          ]\n        },\n        \"note\": {\n          \"type\": \"string\"\n        },\n        \"ack\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"by\": {\n              \"type\": \"string\"\n            },\n            \"at\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"by\"\n          ],\n          \"additionalProperties\": false\n        }\n      },\n      \"required\": [\n        \"type\",\n        \"thickness\",\n        \"material\",\n        \"id\",\n        \"by\",\n        \"status\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Furniture\": {\n      \"oneOf\": [\n        {\n          \"type\": \"object\",\n          \"properties\": {\n            \"type\": {\n              \"type\": \"string\"\n            },\n            \"size\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            },\n            \"height\": {\n              \"type\": \"number\",\n              \"exclusiveMinimum\": 0,\n              \"description\": \"长度单位 mm（文件 v3）\"\n            },\n            \"z\": {\n              \"type\": \"number\",\n              \"description\": \"长度单位 mm（文件 v3）\"\n            },\n            \"against\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"face\": {\n                  \"$ref\": \"#/$defs/FaceRef\"\n                },\n                \"gap\": {\n                  \"type\": \"number\"\n                }\n              },\n              \"required\": [\n                \"face\",\n                \"gap\"\n              ],\n              \"additionalProperties\": false\n            },\n            \"embed\": {\n              \"type\": \"number\",\n              \"minimum\": 0,\n              \"description\": \"长度单位 mm（文件 v3）\"\n            },\n            \"materials\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"body\": {\n                  \"type\": \"string\"\n                },\n                \"fabric\": {\n                  \"type\": \"string\"\n                }\n              },\n              \"required\": [],\n              \"additionalProperties\": false\n            },\n            \"id\": {\n              \"type\": \"string\",\n              \"minLength\": 1\n            },\n            \"name\": {\n              \"type\": \"string\"\n            },\n            \"level\": {\n              \"type\": \"string\"\n            },\n            \"by\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"user\"\n                },\n                {\n                  \"const\": \"agent\"\n                }\n              ]\n            },\n            \"status\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"pending\"\n                },\n                {\n                  \"const\": \"confirmed\"\n                }\n              ]\n            },\n            \"note\": {\n              \"type\": \"string\"\n            },\n            \"ack\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"by\": {\n                  \"type\": \"string\"\n                },\n                \"at\": {\n                  \"type\": \"string\"\n                }\n              },\n              \"required\": [\n                \"by\"\n              ],\n              \"additionalProperties\": false\n            },\n            \"at\": {\n              \"$ref\": \"#/$defs/Vec2\"\n            },\n            \"rot\": {\n              \"type\": \"number\"\n            },\n            \"in\": false\n          },\n          \"required\": [\n            \"type\",\n            \"size\",\n            \"height\",\n            \"id\",\n            \"by\",\n            \"status\",\n            \"at\",\n            \"rot\"\n          ],\n          \"additionalProperties\": false\n        },\n        {\n          \"type\": \"object\",\n          \"properties\": {\n            \"type\": {\n              \"type\": \"string\"\n            },\n            \"size\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            },\n            \"height\": {\n              \"type\": \"number\",\n              \"exclusiveMinimum\": 0,\n              \"description\": \"长度单位 mm（文件 v3）\"\n            },\n            \"z\": {\n              \"type\": \"number\",\n              \"description\": \"长度单位 mm（文件 v3）\"\n            },\n            \"against\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"face\": {\n                  \"$ref\": \"#/$defs/FaceRef\"\n                },\n                \"gap\": {\n                  \"type\": \"number\"\n                }\n              },\n              \"required\": [\n                \"face\",\n                \"gap\"\n              ],\n              \"additionalProperties\": false\n            },\n            \"embed\": {\n              \"type\": \"number\",\n              \"minimum\": 0,\n              \"description\": \"长度单位 mm（文件 v3）\"\n            },\n            \"materials\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"body\": {\n                  \"type\": \"string\"\n                },\n                \"fabric\": {\n                  \"type\": \"string\"\n                }\n              },\n              \"required\": [],\n              \"additionalProperties\": false\n            },\n            \"id\": {\n              \"type\": \"string\",\n              \"minLength\": 1\n            },\n            \"name\": {\n              \"type\": \"string\"\n            },\n            \"level\": {\n              \"type\": \"string\"\n            },\n            \"by\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"user\"\n                },\n                {\n                  \"const\": \"agent\"\n                }\n              ]\n            },\n            \"status\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"pending\"\n                },\n                {\n                  \"const\": \"confirmed\"\n                }\n              ]\n            },\n            \"note\": {\n              \"type\": \"string\"\n            },\n            \"ack\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"by\": {\n                  \"type\": \"string\"\n                },\n                \"at\": {\n                  \"type\": \"string\"\n                }\n              },\n              \"required\": [\n                \"by\"\n              ],\n              \"additionalProperties\": false\n            },\n            \"in\": {\n              \"type\": \"string\"\n            },\n            \"at\": false,\n            \"rot\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [\n            \"type\",\n            \"size\",\n            \"height\",\n            \"id\",\n            \"by\",\n            \"status\",\n            \"in\"\n          ],\n          \"additionalProperties\": false\n        }\n      ]\n    },\n    \"FurnitureBase\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"type\": {\n          \"type\": \"string\"\n        },\n        \"size\": {\n          \"type\": \"array\",\n          \"prefixItems\": [\n            {\n              \"type\": \"number\"\n            },\n            {\n              \"type\": \"number\"\n            }\n          ],\n          \"minItems\": 2,\n          \"maxItems\": 2\n        },\n        \"height\": {\n          \"type\": \"number\",\n          \"exclusiveMinimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"z\": {\n          \"type\": \"number\",\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"against\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"face\": {\n              \"$ref\": \"#/$defs/FaceRef\"\n            },\n            \"gap\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [\n            \"face\",\n            \"gap\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"embed\": {\n          \"type\": \"number\",\n          \"minimum\": 0,\n          \"description\": \"长度单位 mm（文件 v3）\"\n        },\n        \"materials\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"body\": {\n              \"type\": \"string\"\n            },\n            \"fabric\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [],\n          \"additionalProperties\": false\n        },\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"level\": {\n          \"type\": \"string\"\n        },\n        \"by\": {\n          \"anyOf\": [\n            {\n              \"const\": \"user\"\n            },\n            {\n              \"const\": \"agent\"\n            }\n          ]\n        },\n        \"status\": {\n          \"anyOf\": [\n            {\n              \"const\": \"pending\"\n            },\n            {\n              \"const\": \"confirmed\"\n            }\n          ]\n        },\n        \"note\": {\n          \"type\": \"string\"\n        },\n        \"ack\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"by\": {\n              \"type\": \"string\"\n            },\n            \"at\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"by\"\n          ],\n          \"additionalProperties\": false\n        }\n      },\n      \"required\": [\n        \"type\",\n        \"size\",\n        \"height\",\n        \"id\",\n        \"by\",\n        \"status\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"MaterialCategory\": {\n      \"anyOf\": [\n        {\n          \"const\": \"wood-floor\"\n        },\n        {\n          \"const\": \"tile\"\n        },\n        {\n          \"const\": \"stone\"\n        },\n        {\n          \"const\": \"paint\"\n        },\n        {\n          \"const\": \"texture-paint\"\n        },\n        {\n          \"const\": \"wallpaper\"\n        },\n        {\n          \"const\": \"veneer\"\n        },\n        {\n          \"const\": \"microcement\"\n        },\n        {\n          \"const\": \"laminate\"\n        },\n        {\n          \"const\": \"fabric\"\n        },\n        {\n          \"const\": \"leather\"\n        },\n        {\n          \"const\": \"metal\"\n        },\n        {\n          \"const\": \"glass\"\n        },\n        {\n          \"const\": \"rattan\"\n        },\n        {\n          \"const\": \"other\"\n        }\n      ]\n    },\n    \"Material\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"category\": {\n          \"$ref\": \"#/$defs/MaterialCategory\"\n        },\n        \"color\": {\n          \"type\": \"string\",\n          \"pattern\": \"^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$\"\n        },\n        \"texture\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"kind\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"planks\"\n                },\n                {\n                  \"const\": \"tiles\"\n                },\n                {\n                  \"const\": \"herringbone\"\n                },\n                {\n                  \"const\": \"grain\"\n                },\n                {\n                  \"const\": \"speckle\"\n                },\n                {\n                  \"const\": \"veins\"\n                },\n                {\n                  \"const\": \"weave\"\n                }\n              ]\n            },\n            \"size\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            },\n            \"joint\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [\n            \"kind\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"pbr\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"roughness\": {\n              \"type\": \"number\",\n              \"minimum\": 0,\n              \"maximum\": 1\n            },\n            \"metalness\": {\n              \"type\": \"number\",\n              \"minimum\": 0,\n              \"maximum\": 1\n            },\n            \"sheen\": {\n              \"type\": \"number\",\n              \"minimum\": 0,\n              \"maximum\": 1\n            },\n            \"maps\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"base\": {\n                  \"type\": \"string\",\n                  \"minLength\": 1,\n                  \"pattern\": \"^(?![A-Za-z][A-Za-z0-9+.-]*:|[/\\\\\\\\]|\\\\s)[^\\\\r\\\\n]+$\"\n                },\n                \"normal\": {\n                  \"type\": \"string\",\n                  \"minLength\": 1,\n                  \"pattern\": \"^(?![A-Za-z][A-Za-z0-9+.-]*:|[/\\\\\\\\]|\\\\s)[^\\\\r\\\\n]+$\"\n                },\n                \"rough\": {\n                  \"type\": \"string\",\n                  \"minLength\": 1,\n                  \"pattern\": \"^(?![A-Za-z][A-Za-z0-9+.-]*:|[/\\\\\\\\]|\\\\s)[^\\\\r\\\\n]+$\"\n                }\n              },\n              \"required\": [],\n              \"additionalProperties\": false\n            }\n          },\n          \"required\": [],\n          \"additionalProperties\": false\n        },\n        \"ref\": {\n          \"type\": \"string\"\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"name\",\n        \"category\",\n        \"color\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"MaterialRole\": {\n      \"anyOf\": [\n        {\n          \"const\": \"floor.main\"\n        },\n        {\n          \"const\": \"floor.wet\"\n        },\n        {\n          \"const\": \"floor.outdoor\"\n        },\n        {\n          \"const\": \"threshold\"\n        },\n        {\n          \"const\": \"wall.main\"\n        },\n        {\n          \"const\": \"wall.wet\"\n        },\n        {\n          \"const\": \"wall.accent\"\n        },\n        {\n          \"const\": \"ceiling\"\n        },\n        {\n          \"const\": \"skirting\"\n        },\n        {\n          \"const\": \"wood.main\"\n        },\n        {\n          \"const\": \"cabinet.front\"\n        },\n        {\n          \"const\": \"cabinet.carcass\"\n        },\n        {\n          \"const\": \"stone.top\"\n        },\n        {\n          \"const\": \"metal\"\n        },\n        {\n          \"const\": \"fabric.main\"\n        },\n        {\n          \"const\": \"fabric.accent\"\n        },\n        {\n          \"const\": \"rug\"\n        }\n      ]\n    },\n    \"StylePreset\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"name\": {\n          \"type\": \"string\"\n        },\n        \"blurb\": {\n          \"type\": \"string\"\n        },\n        \"roles\": {\n          \"type\": \"object\",\n          \"additionalProperties\": {\n            \"type\": \"string\"\n          }\n        },\n        \"rooms\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"match\": {\n                \"type\": \"array\",\n                \"items\": {\n                  \"type\": \"string\"\n                }\n              },\n              \"floor\": {\n                \"$ref\": \"#/$defs/MaterialRole\"\n              },\n              \"wall\": {\n                \"$ref\": \"#/$defs/MaterialRole\"\n              }\n            },\n            \"required\": [\n              \"match\"\n            ],\n            \"additionalProperties\": false\n          }\n        },\n        \"trims\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"skirting\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"height\": {\n                  \"type\": \"number\"\n                },\n                \"role\": {\n                  \"$ref\": \"#/$defs/MaterialRole\"\n                }\n              },\n              \"required\": [\n                \"height\",\n                \"role\"\n              ],\n              \"additionalProperties\": false\n            },\n            \"threshold\": {\n              \"type\": \"boolean\"\n            }\n          },\n          \"required\": [],\n          \"additionalProperties\": false\n        },\n        \"board\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"string\"\n          }\n        },\n        \"by\": {\n          \"anyOf\": [\n            {\n              \"const\": \"builtin\"\n            },\n            {\n              \"const\": \"user\"\n            },\n            {\n              \"const\": \"agent\"\n            }\n          ]\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"name\",\n        \"roles\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"SurfaceTarget\": {\n      \"anyOf\": [\n        {\n          \"type\": \"object\",\n          \"properties\": {\n            \"floor\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"floor\"\n          ],\n          \"additionalProperties\": false\n        },\n        {\n          \"type\": \"object\",\n          \"properties\": {\n            \"ceiling\": {\n              \"type\": \"string\"\n            }\n          },\n          \"required\": [\n            \"ceiling\"\n          ],\n          \"additionalProperties\": false\n        },\n        {\n          \"type\": \"object\",\n          \"properties\": {\n            \"face\": {\n              \"$ref\": \"#/$defs/FaceRef\"\n            },\n            \"s\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            },\n            \"z\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            }\n          },\n          \"required\": [\n            \"face\"\n          ],\n          \"additionalProperties\": false\n        }\n      ]\n    },\n    \"Surface\": {\n      \"type\": \"object\",\n      \"properties\": {\n        \"id\": {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        \"target\": {\n          \"$ref\": \"#/$defs/SurfaceTarget\"\n        },\n        \"material\": {\n          \"type\": \"string\"\n        },\n        \"layout\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"pattern\": {\n              \"anyOf\": [\n                {\n                  \"const\": \"straight\"\n                },\n                {\n                  \"const\": \"staggered\"\n                },\n                {\n                  \"const\": \"herringbone\"\n                },\n                {\n                  \"const\": \"chevron\"\n                },\n                {\n                  \"const\": \"grid\"\n                },\n                {\n                  \"const\": \"diagonal\"\n                }\n              ]\n            },\n            \"size\": {\n              \"type\": \"array\",\n              \"prefixItems\": [\n                {\n                  \"type\": \"number\"\n                },\n                {\n                  \"type\": \"number\"\n                }\n              ],\n              \"minItems\": 2,\n              \"maxItems\": 2\n            },\n            \"origin\": {\n              \"$ref\": \"#/$defs/Vec2\"\n            },\n            \"angle\": {\n              \"type\": \"number\"\n            },\n            \"joint\": {\n              \"type\": \"number\"\n            }\n          },\n          \"required\": [\n            \"pattern\"\n          ],\n          \"additionalProperties\": false\n        },\n        \"by\": {\n          \"anyOf\": [\n            {\n              \"const\": \"user\"\n            },\n            {\n              \"const\": \"agent\"\n            }\n          ]\n        },\n        \"status\": {\n          \"anyOf\": [\n            {\n              \"const\": \"pending\"\n            },\n            {\n              \"const\": \"confirmed\"\n            }\n          ]\n        }\n      },\n      \"required\": [\n        \"id\",\n        \"target\",\n        \"material\",\n        \"by\",\n        \"status\"\n      ],\n      \"additionalProperties\": false\n    },\n    \"Decor\": {\n      \"$ref\": \"#/$defs/DecorLayer\"\n    }\n  }\n}\n");
}));
// scripts/plan.ts
var [command, input, output, ...flags] = process.argv.slice(2);
if (command === "schema") await Promise.resolve().then(() => (init_generate(), generate_exports));
else try {
	if (![
		"convert",
		"validate",
		"apply",
		"stats",
		"decor",
		"export",
		"render",
		"cameras",
		"questions",
		"answer",
		"resolve"
	].includes(command) || !input || [
		"convert",
		"export",
		"render",
		"answer",
		"resolve"
	].includes(command) && !output) throw new Error("用法：先设置 $SKILL 为 Skill 根目录的绝对路径，$WORK 为用户工作目录的绝对路径；在 $WORK 执行，输入输出用全路径。\nSKILL=\"/绝对路径/see-your-home\"\nWORK=\"/用户的/工作目录\"\ncd \"$WORK\"\n" + [
		"schema",
		"cameras \"$WORK/方案.json\" [--json] [--all] [--state original|renovated] [--level id]",
		"convert \"$WORK/旧.json\" \"$WORK/新.json\"",
		"validate \"$WORK/方案.json\"",
		"apply \"$WORK/方案.json\"",
		"stats \"$WORK/方案.json\"",
		"decor \"$WORK/方案.json\"",
		"questions \"$WORK/方案.json\" [--status open|answered|resolved]",
		"answer \"$WORK/方案.json\" <问题id> --text \"答复\" [--by 业主] [--at YYYY-MM-DD]（原地写入 v3）",
		"resolve \"$WORK/方案.json\" <问题id> --outcome changed|confirmed|inferred|noted|ask|withdrawn --reply \"回复\" [--changed id,id] [--by Agent] [--at YYYY-MM-DD]（原地写入 v3）",
		"export \"$WORK/方案.json\" \"$WORK/输出.glb\" [--state original|renovated] [--level id]",
		"render \"$WORK/方案.json\" \"$WORK/输出目录\" [--camera 预设|room:id|\"$WORK/相机.json\"（可重复）] [--cameras \"$WORK/列表.json\"] [--state original|renovated] [--views iso-sw,iso-ne,iso-se,iso-nw,top] [--level id] [--section mm] [--passes clay,depth,lines,seg,openings] [--size 2400x1600] [--transparent] [--no-decor]",
		"render \"$WORK/方案.json\" \"$WORK/输出目录\" --camera \"pos=2000,1450,1000;target=2000,1450,4000;fov=75\""
	].map((line) => "node \"$SKILL/scripts/plan-cli.mjs\" " + line).join("\n"));
	const source = readFileSync(input === "-" ? 0 : input, "utf8");
	const { plan, report, issues } = parsePlanText(source);
	if (issues.some((i) => i.code === "parse" || i.code === "schema") && command !== "validate") throw new Error(issues.map((i) => i.message).join("\n"));
	if (command === "questions" || command === "answer" || command === "resolve") {
		const args = command === "questions" ? [output, ...flags].filter((v) => v !== void 0) : flags;
		const allowed = command === "questions" ? ["--status"] : command === "answer" ? [
			"--text",
			"--by",
			"--at"
		] : [
			"--outcome",
			"--reply",
			"--changed",
			"--by",
			"--at"
		];
		const values = {};
		for (let i = 0; i < args.length; i++) {
			const flag = args[i];
			if (!allowed.includes(flag)) throw new Error(`未知参数：${flag}`);
			const value = args[++i];
			if (value === void 0 || value.startsWith("--")) throw new Error(`${flag} 缺少值`);
			values[flag] = value;
		}
		if (command === "questions") {
			const status = values["--status"];
			if (status !== void 0 && !QUESTION_STATUSES.includes(status)) throw new Error("--status 必须为 open、answered 或 resolved");
			process.stdout.write(JSON.stringify(plan.questions.filter((q) => !status || questionStatus(q) === status).map((q) => ({
				id: q.id,
				status: questionStatus(q),
				category: q.category,
				text: q.text,
				targets: q.targets,
				options: q.options,
				answer: q.answer,
				answeredBy: q.answeredBy,
				answeredAt: q.answeredAt,
				reply: q.reply,
				log: q.log
			})), null, 2) + "\n");
		} else {
			if (input === "-") throw new Error("原地写入需要方案文件路径，不能使用标准输入");
			const raw = JSON.parse(source.replace(/^\uFEFF/, ""));
			if (raw.format !== "floorplan-structure" || raw.version !== 3) throw new Error("原地写入只支持 v3 方案，请先用 convert 转换并核对");
			const index = raw.questions?.findIndex((q) => q.id === output) ?? -1;
			if (index < 0) throw new Error(`找不到问题卡 ${output}，请先用 questions 查看问题 id`);
			const today = /* @__PURE__ */ new Date(), at = values["--at"] ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
			let next;
			if (command === "answer") {
				if (values["--text"] === void 0) throw new Error("--text 缺少答复文字");
				next = answerQuestion(raw.questions[index], values["--text"], values["--by"] ?? "业主", at);
			} else {
				const outcome = values["--outcome"];
				if (!QUESTION_OUTCOMES.includes(outcome)) throw new Error(`--outcome 必须为 ${QUESTION_OUTCOMES.join("、")}`);
				if (values["--reply"] === void 0) throw new Error("--reply 缺少回复文字");
				const changed = values["--changed"]?.split(",").map((id) => id.trim());
				if (changed) {
					const ids = questionElementIds(plan), missing = changed.filter((id) => !ids.has(id));
					if (missing.length) throw new Error(`--changed 里的构件 ${missing.map((id) => id || "（空 id）").join("、")} 在方案里找不到，请核对构件 id`);
				}
				next = resolveQuestion(raw.questions[index], {
					outcome,
					text: values["--reply"],
					changed,
					by: values["--by"],
					at
				});
			}
			raw.questions[index] = next;
			const text = JSON.stringify(raw, null, 2) + "\n", errors = parsePlanText(text).issues.filter((i) => i.level === "error");
			if (errors.length) throw new Error(`修改后的方案校验未通过，文件未写入：\n${errors.map((i) => i.message).join("\n")}`);
			const temp = join(dirname(input), `.${basename(input)}.${randomUUID()}.tmp`);
			let fd;
			try {
				fd = openSync(temp, "wx", statSync(input).mode & 511);
				writeFileSync(fd, text);
				fsyncSync(fd);
				closeSync(fd);
				fd = void 0;
				renameSync(temp, input);
			} finally {
				if (fd !== void 0) closeSync(fd);
				rmSync(temp, { force: true });
			}
			const { bbox, ...card } = next;
			process.stdout.write(JSON.stringify(card) + "\n");
		}
	} else if (command === "export" || command === "render" || command === "cameras") {
		if (issues.some((i) => i.level === "error")) throw new Error(issues.filter((i) => i.level === "error").map((i) => i.message).join("\n"));
		let all = false, json = false;
		const cameras = [];
		const addCamera = (value) => {
			if (typeof value !== "string" && (!value || typeof value !== "object")) throw new Error("相机清单项须为机位字符串或相机对象");
			if (typeof value === "string" && (value.startsWith("room:") || value.startsWith("pos=") || [
				"iso-sw",
				"iso-ne",
				"iso-se",
				"iso-nw",
				"top"
			].includes(value))) cameras.push({
				camera: value,
				record: {}
			});
			else {
				const data = typeof value === "string" ? JSON.parse(readFileSync(value, "utf8")) : value;
				const record = data.camera ? {
					...data.camera,
					level: data.level ?? data.camera.level
				} : data;
				if (record.unit !== void 0 && record.unit !== "mm") throw new Error("相机文件单位必须为 mm");
				cameras.push({
					camera: record,
					record
				});
			}
		};
		let passes, state = "original", level, section, sizeSet = false, stateSet = false, transparentSet = false, views = [
			"iso-sw",
			"iso-ne",
			"top"
		], width = 2400, height = 1600, transparent = false, noDecor = false;
		const args = command === "cameras" ? [output, ...flags].filter((v) => v !== void 0) : flags;
		for (let i = 0; i < args.length; i++) {
			const flag = args[i];
			if (flag === "--state") {
				const v = args[++i];
				if (v !== "original" && v !== "renovated") throw new Error("--state 必须为 original 或 renovated");
				state = v;
				stateSet = true;
			} else if (flag === "--json" && command === "cameras") json = true;
			else if (flag === "--all" && command === "cameras") all = true;
			else if (flag === "--transparent" && command === "render") {
				transparent = true;
				transparentSet = true;
			} else if (flag === "--no-decor" && command === "render") noDecor = true;
			else if (flag === "--level") {
				level = args[++i];
				if (!level) throw new Error("--level 缺少楼层 id");
			} else if (flag === "--section" && command === "render") {
				section = Number(args[++i]);
				if (!Number.isFinite(section) || section <= 0) throw new Error("--section 必须是正数 mm");
			} else if (flag === "--camera" && command === "render") {
				const value = args[++i];
				if (!value) throw new Error("--camera 缺少值");
				addCamera(value);
			} else if (flag === "--cameras" && command === "render") {
				const file = args[++i];
				if (!file) throw new Error("--cameras 缺少 JSON 列表文件");
				const values = JSON.parse(readFileSync(file, "utf8"));
				if (!Array.isArray(values) || !values.length) throw new Error("--cameras 必须是非空 JSON 数组");
				values.forEach(addCamera);
			} else if (flag === "--passes" && command === "render") {
				passes = args[++i]?.split(",");
				if (!passes?.length) throw new Error("--passes 缺少通道清单");
			} else if (flag === "--views" && command === "render") {
				const v = args[++i]?.split(",");
				if (!v?.length || v.some((x) => ![
					"iso-sw",
					"iso-ne",
					"iso-se",
					"iso-nw",
					"top"
				].includes(x))) throw new Error("--views 只支持 iso-sw,iso-ne,iso-se,iso-nw,top");
				views = [...new Set(v)];
			} else if (flag === "--size" && command === "render") {
				const v = args[++i];
				if (!/^\d+x\d+$/.test(v ?? "")) throw new Error("--size 格式为 宽x高");
				sizeSet = true;
				[width, height] = v.split("x").map(Number);
			} else throw new Error(`未知参数：${flag}`);
		}
		if (command === "cameras") {
			const choices = listCameras(plan, state, {
				all,
				level
			});
			process.stdout.write(json ? JSON.stringify(choices, null, 2) + "\n" : choices.map((c) => `${c.id} [${c.level}] ${c.description}`).join("\n") + "\n");
		} else if (command === "export") {
			mkdirSync(dirname(output), { recursive: true });
			writeFileSync(output, exportGlb(plan, {
				state,
				level
			}));
			process.stdout.write(`GLB: ${output}\n`);
		} else {
			const session = createRenderSession(plan);
			const usedNames = /* @__PURE__ */ new Set();
			const selections = cameras.length ? cameras : views.map((camera) => ({
				camera,
				record: {}
			}));
			for (const [index, { camera, record }] of selections.entries()) {
				const view = typeof camera === "string" ? camera : camera.id ?? `custom-${index + 1}`;
				const bg = transparentSet ? transparent : record.transparent ?? transparent;
				process.stderr.write(`渲染 ${index + 1}/${selections.length}：${view}\n`);
				const { files, camera: savedCamera } = session.renderKit({
					state: stateSet ? state : record.state ?? state,
					camera,
					level: level ?? record.level,
					section: section ?? record.section,
					width: sizeSet ? width : record.width ?? width,
					height: sizeSet ? height : record.height ?? height,
					transparent: bg,
					passes: passes ?? record.passes,
					decor: !noDecor && record.decor?.skipped !== "disabled"
				});
				const dv = savedCamera.decor;
				if (dv?.drawn) process.stderr.write(`装修层：画面里有 ${dv.visible.length} 件（${dv.visible.map((v) => v.name).join("、") || "都在画外或被挡住"}）\n`);
				else if (dv?.skipped === "original-state") process.stderr.write("装修层：没画。装修是按改造后的格局摆的，原始状态有已确认改造；要带家具出图加 --state renovated\n");
				else if (dv?.skipped === "error") process.stderr.write(`装修层：没画，装修数据有问题：${dv.error}\n`);
				mkdirSync(output, { recursive: true });
				let stem = view.replace(/[^a-zA-Z0-9_-]/g, "_");
				if (usedNames.has(stem)) stem += `-${savedCamera.level ?? "all"}-${index + 1}`.replace(/[^a-zA-Z0-9_-]/g, "_");
				while (usedNames.has(stem)) stem += "_";
				usedNames.add(stem);
				const target = join(output, `${stem}-${bg ? "transparent" : "white"}.png`);
				for (const [name, bytes] of Object.entries(files)) {
					const file = name === "clay.png" ? target : target.replace(/\.png$/, "." + name);
					writeFileSync(file, bytes);
					process.stdout.write(`PNG: ${file}\n`);
				}
				const prefix = target.split(/[\\/]/).at(-1).replace(/\.png$/, "");
				for (const o of savedCamera.openingMasks) o.mask = `${prefix}.${o.mask}`;
				writeFileSync(target.replace(/\.png$/, ".camera.json"), JSON.stringify(savedCamera, null, 2) + "\n");
			}
		}
	} else if (command === "convert") {
		if (issues.some((i) => i.level === "error")) throw new Error(issues.map((i) => i.message).join("\n"));
		if (output !== "-" && output !== "/dev/stdout" && existsSync(output) && isEmptyPlan(plan)) {
			const old = parsePlanText(readFileSync(output, "utf8"));
			if (loadError(old.issues) || !isEmptyPlan(old.plan)) throw new Error("拒绝用空方案覆盖含有数据或无法读取的旧文件");
		}
		const text = serializePlan(plan);
		if (output === "/dev/stdout" || output === "-") process.stdout.write(text);
		else {
			mkdirSync(dirname(output), { recursive: true });
			writeFileSync(output, text);
		}
		process.stderr.write(JSON.stringify({
			...report,
			approximations: report.approximations.map(agentUnits),
			warnings: report.warnings.map(agentUnits)
		}, null, 2) + "\n");
		if (issues.some((i) => i.level === "error")) process.exitCode = 1;
	} else if (command === "validate") {
		process.stdout.write(JSON.stringify({
			valid: !issues.some((i) => i.level === "error"),
			issues: issues.map((i) => ({
				...i,
				message: agentUnits(i.message)
			}))
		}, null, 2) + "\n");
		if (issues.some((i) => i.level === "error")) process.exitCode = 1;
	} else if (command === "apply") {
		if (issues.some((i) => i.level === "error")) throw new Error(issues.map((i) => i.message).join("\n"));
		const replay = applyChanges(plan, plan.changes), after = validateReplay(replay, plan.changes, plan);
		process.stdout.write(JSON.stringify({
			results: replay.results.map((r) => ({
				...r,
				...r.error ? { error: agentUnits(r.error) } : {},
				...r.warnings ? { warnings: r.warnings.map(agentUnits) } : {}
			})),
			issues: after.map((i) => ({
				...i,
				message: agentUnits(i.message)
			}))
		}, null, 2) + "\n");
		if (replay.results.some((r) => !r.ok) || after.some((i) => i.level === "error")) process.exitCode = 1;
	} else if (command === "decor") {
		const after = plan.legacy?.__structureReplayFrame ? plan : applyChanges(plan, plan.changes.filter((c) => c.status === "confirmed")).plan, resolved = decorStatus(plan);
		const decor = planFileValue({
			...plan,
			decor: resolved.decor
		}).decor;
		const items = new Map(decor ? decorItems(decor).map((i) => [i.id, i]) : []);
		const storedItems = (list) => list.map((i) => ({
			...i,
			item: items.get(i.id),
			reasons: i.reasons.map(agentUnits)
		}));
		process.stdout.write(JSON.stringify({
			...resolved,
			decor,
			items: storedItems(resolved.items),
			placed: storedItems(resolved.placed),
			issues: resolved.issues.map((i) => ({
				...i,
				text: agentUnits(i.text)
			})),
			rehosted: plan.decor ? planFileValue({
				...plan,
				decor: rehostDecor(plan, after, plan.decor)
			}).decor : void 0,
			materials: materialTakeoff({
				...after,
				decor: resolved.decor
			})
		}, null, 2) + "\n");
		if (resolved.issues.some((i) => i.level === "error")) process.exitCode = 1;
	} else {
		const stats = planStats(plan);
		stats.byLevel?.forEach((l) => {
			l.elevation = lengthUnit(l.elevation);
		});
		process.stdout.write(JSON.stringify(stats, null, 2) + "\n");
	}
} catch (error) {
	process.stderr.write(`错误：${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
}
export {};
