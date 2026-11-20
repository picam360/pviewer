import { A as e, C as t, D as n, E as r, F as i, I as a, L as o, M as s, N as c, O as l, P as u, S as d, T as f, _ as p, a as m, b as h, d as g, f as _, g as ee, h as te, i as ne, j as re, k as ie, l as v, m as y, n as ae, o as oe, p as se, r as ce, s as le, u as ue, v as de, w as b, x as fe, y as pe } from "../share.js";
// src/reader/zxing_reader.js
function me(e, t, n) {
	return t in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
async function x() {
	let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
	var t, n, r = e, i = !!globalThis.window, a = !!globalThis.WorkerGlobalScope;
	(n = globalThis.process) != null && (t = n.versions) != null && t.node && globalThis.process;
	var o = (e, t) => {
		throw t;
	}, s = void 0, c = "";
	function l(e) {
		return r.locateFile ? r.locateFile(e, c) : c + e;
	}
	var u, d;
	if (i || a || typeof fetch == "function") {
		try {
			c = new URL(".", s).href;
		} catch {}
		a && (d = (e) => {
			var t = new XMLHttpRequest();
			return t.open("GET", e, !1), t.responseType = "arraybuffer", t.send(null), new Uint8Array(t.response);
		}), u = async (e) => {
			var t = await fetch(e, { credentials: "same-origin" });
			if (t.ok) return t.arrayBuffer();
			throw Error(t.status + " : " + t.url);
		};
	}
	console.log.bind(console);
	var f = console.error.bind(console), p, m = !1, h;
	class g {}
	class _ extends g {
		constructor(e) {
			super(), this.excPtr = e;
		}
	}
	function ee() {
		return pn.buffer;
	}
	function te() {
		var e;
		if (!(b != null && (e = b.buffer) != null && e.resizable)) {
			var t = ee();
			b = new Int8Array(t), K = new Int16Array(t), r.HEAPU8 = L = new Uint8Array(t), J = new Uint16Array(t), q = new Int32Array(t), E = new Uint32Array(t), gt = new Float32Array(t), _t = new Float64Array(t);
		}
	}
	function ne() {
		var e = r.preRun;
		e && (typeof e == "function" && (e = [e]), x.push(...e)), fe(x);
	}
	function re() {
		$.ra();
	}
	function ie() {
		var e = r.postRun;
		e && (typeof e == "function" && (e = [e]), pe.push(...e)), fe(pe);
	}
	function v(e) {
		var t;
		throw (t = r.onAbort) == null || t.call(r, e), e = `Aborted(${e})`, f(e), m = !0, e += ". Build with -sASSERTIONS for more info.", new WebAssembly.RuntimeError(e);
	}
	var y;
	function ae() {
		return l("zxing_reader.wasm");
	}
	function oe(e) {
		if (e == y && p) return new Uint8Array(p);
		if (d) return d(e);
		throw "both async and sync fetching of the wasm failed";
	}
	async function se(e) {
		if (!p) try {
			return await u(e);
		} catch {}
		return oe(e);
	}
	async function ce(e, t) {
		try {
			var n = await se(e);
			return await WebAssembly.instantiate(n, t);
		} catch (e) {
			f(`failed to asynchronously prepare wasm: ${e}`), v(e);
		}
	}
	async function le(e, t, n) {
		if (!e) try {
			var r = fetch(t, { credentials: "same-origin" });
			return await WebAssembly.instantiateStreaming(r, n);
		} catch (e) {
			f(`wasm streaming compile failed: ${e}`), f("falling back to ArrayBuffer instantiation");
		}
		return ce(t, n);
	}
	function ue() {
		return { a: gn };
	}
	class de {
		constructor(e) {
			me(this, "name", "ExitStatus"), this.message = `Program terminated with exit(${e})`, this.status = e;
		}
	}
	var b, fe = (e) => {
		for (; e.length > 0;) e.shift()(r);
	}, pe = [], x = [], S = !0, C = (e) => on(e), w = () => cn(), he = [], T = (e) => {
		var t = he[e];
		return t || (he[e] = t = mn.get(e)), t;
	}, E;
	class ge {
		set_type(e) {
			E[this.ptr + 4 >> 2] = e;
		}
		get_type() {
			return E[this.ptr + 4 >> 2];
		}
		set_destructor(e) {
			E[this.ptr + 8 >> 2] = e;
		}
		get_destructor() {
			return E[this.ptr + 8 >> 2];
		}
		set_caught(e) {
			e = +!!e, b[this.ptr + 12] = e;
		}
		get_caught() {
			return b[this.ptr + 12] != 0;
		}
		set_rethrown(e) {
			e = +!!e, b[this.ptr + 13] = e;
		}
		get_rethrown() {
			return b[this.ptr + 13] != 0;
		}
		init(e, t) {
			this.set_adjusted_ptr(0), this.set_type(e), this.set_destructor(t);
		}
		set_adjusted_ptr(e) {
			E[this.ptr + 16 >> 2] = e;
		}
		get_adjusted_ptr() {
			return E[this.ptr + 16 >> 2];
		}
		constructor(e) {
			this.excPtr = e, this.ptr = e - 24;
		}
	}
	var D = [], _e = 0, O = null, k = (e) => an(e), ve = (e) => {
		var t = O == null ? void 0 : O.excPtr;
		if (!t) return k(0), 0;
		var n = new ge(t);
		n.set_adjusted_ptr(t);
		var r = n.get_type();
		if (!r) return k(0), t;
		for (var i of e) {
			if (!i || i === r) break;
			var a = n.ptr + 16;
			if (dn(i, r, a)) return k(i), t;
		}
		return k(r), t;
	}, ye = (e) => {
		throw e;
	}, be = (e) => {
		throw e;
	};
	function A(e) {
		return this.fromWireType(E[e >> 2]);
	}
	var xe = (e) => {
		for (; e.length;) {
			var t = e.pop();
			e.pop()(t);
		}
	}, Se = (e) => sn(e), Ce = {}, we = {}, j = {};
	class M extends Error {
		constructor(e) {
			super(e), this.name = "BindingError";
		}
	}
	var N = (e) => {
		throw new M(e);
	}, Te = {};
	function Ee(e, t) {
		let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
		var r = t.name;
		if (e || N(`type "${r}" must have a positive integer typeid pointer`), j[e]) {
			if (n.ignoreDuplicateRegistrations) return;
			N(`Cannot register type '${r}' twice`);
		}
		if (j[e] = t, delete Te[e], we[e]) {
			var i = we[e];
			delete we[e], i.forEach((e) => e());
		}
	}
	function P(e, t) {
		return Ee(e, t, arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {});
	}
	class De extends Error {
		constructor(e) {
			super(e), this.name = "InternalError";
		}
	}
	var F = (e) => {
		throw new De(e);
	}, I = (e, t, n) => {
		e.forEach((e) => Te[e] = t);
		function r(t) {
			var r = n(t);
			r.length !== e.length && F("Mismatched type converter count");
			for (var i = 0; i < e.length; ++i) P(e[i], r[i]);
		}
		var i = Array(t.length), a = [], o = 0;
		for (let [e, n] of t.entries()) if (j[n]) i[e] = j[n];
		else {
			var s, c, l;
			a.push(n), ((l = (s = we)[c = n]) == null ? s[c] = [] : l).push(() => {
				i[e] = j[n], ++o, o === a.length && r(i);
			});
		}
		a.length === 0 && r(i);
	}, L, Oe = (e, t) => L.fill(0, e, e + t), R = (e) => {
		for (var t = "";;) {
			var n = L[e++];
			if (!n) return t;
			t += String.fromCharCode(n);
		}
	}, ke = !1, Ae = () => {}, je = (e) => {
		e.smartPtr ? e.smartPtrType.rawDestructor(e.smartPtr) : e.ptrType.registeredClass.rawDestructor(e.ptr);
	}, Me = (e) => {
		--e.count.value, e.count.value === 0 && je(e);
	}, z = (e) => globalThis.FinalizationRegistry ? (ke = new FinalizationRegistry((e) => {
		Me(e.$$);
	}), z = (e) => {
		var t = e.$$;
		if (t.smartPtr) {
			var n = { $$: t };
			ke.register(e, n, e);
		}
		return e;
	}, Ae = (e) => ke.unregister(e), z(e)) : (z = (e) => e, e), Ne = [], Pe = (e) => ({
		count: e.count,
		deleteScheduled: e.deleteScheduled,
		preservePointerOnDelete: e.preservePointerOnDelete,
		ptr: e.ptr,
		ptrType: e.ptrType,
		smartPtr: e.smartPtr,
		smartPtrType: e.smartPtrType
	}), Fe = (e) => {
		N(function(e) {
			return e.$$.ptrType.registeredClass.name;
		}(e) + " instance already deleted");
	};
	function B() {}
	function Ie(e, t, n, r, i, a, o, s) {
		this.name = e, this.constructor = t, this.instancePrototype = n, this.rawDestructor = r, this.baseClass = i, this.getActualType = a, this.upcast = o, this.downcast = s, this.pureVirtualFunctions = [];
	}
	var Le = (e) => {
		if (e === null) return "null";
		var t = typeof e;
		return t === "object" || t === "array" || t === "function" ? e.toString() : "" + e;
	}, Re = (e, t, n) => {
		for (; t !== n;) t.upcast || N(`Expected null or instance of ${n.name}, got an instance of ${t.name}`), e = t.upcast(e), t = t.baseClass;
		return e;
	};
	function ze(e, t) {
		if (t === null) return this.isReference && N(`null is not a valid ${this.name}`), 0;
		t.$$ || N(`Cannot pass "${Le(t)}" as a ${this.name}`), t.$$.ptr || N(`Cannot pass deleted object as a pointer of type ${this.name}`);
		var n = t.$$.ptrType.registeredClass;
		return Re(t.$$.ptr, n, this.registeredClass);
	}
	var Be = [], V = [
		0,
		1,
		,
		1,
		null,
		1,
		!0,
		1,
		!1,
		1
	], H = {
		toValue: (e) => (e || N(`Cannot use deleted val. handle = ${e}`), V[e]),
		toHandle: (e) => {
			switch (e) {
				case void 0: return 2;
				case null: return 4;
				case !0: return 6;
				case !1: return 8;
				default: {
					let t = Be.pop() || V.length;
					return V[t] = e, V[t + 1] = 1, t;
				}
			}
		}
	};
	function Ve(e, t) {
		var n;
		if (t === null) return this.isReference && N(`null is not a valid ${this.name}`), this.isSmartPointer ? (n = this.rawConstructor(), e !== null && e.push(this.rawDestructor, n), n) : 0;
		t && t.$$ || N(`Cannot pass "${Le(t)}" as a ${this.name}`), t.$$.ptr || N(`Cannot pass deleted object as a pointer of type ${this.name}`), !this.isConst && t.$$.ptrType.isConst && N(`Cannot convert argument of type ${t.$$.smartPtrType ? t.$$.smartPtrType.name : t.$$.ptrType.name} to parameter type ${this.name}`);
		var r = t.$$.ptrType.registeredClass;
		if (n = Re(t.$$.ptr, r, this.registeredClass), this.isSmartPointer) switch (t.$$.smartPtr === void 0 && N("Passing raw pointer to smart pointer is illegal"), this.sharingPolicy) {
			case 0:
				t.$$.smartPtrType === this ? n = t.$$.smartPtr : N(`Cannot convert argument of type ${t.$$.smartPtrType ? t.$$.smartPtrType.name : t.$$.ptrType.name} to parameter type ${this.name}`);
				break;
			case 1:
				n = t.$$.smartPtr;
				break;
			case 2:
				if (t.$$.smartPtrType === this) n = t.$$.smartPtr;
				else {
					var i = t.clone();
					n = this.rawShare(n, H.toHandle(() => i.delete())), e !== null && e.push(this.rawDestructor, n);
				}
				break;
			default: N("Unsupported sharing policy");
		}
		return n;
	}
	var He = (e, t, n) => {
		if (t === n) return e;
		if (n.baseClass === void 0) return null;
		var r = He(e, t, n.baseClass);
		return r === null ? null : n.downcast(r);
	}, Ue = (e, t) => {
		for (t === void 0 && N("ptr should not be undefined"); e.baseClass;) t = e.upcast(t), e = e.baseClass;
		return t;
	}, We = {}, Ge = (e, t) => (t = Ue(e, t), We[t]), U = (e, t) => (t.ptrType && t.ptr || F("makeClassHandle requires ptr and ptrType"), !!t.smartPtrType != !!t.smartPtr && F("Both smartPtrType and smartPtr must be specified"), t.count = { value: 1 }, z(Object.create(e, { $$: {
		value: t,
		writable: !0
	} }))), Ke = {};
	function qe(e) {
		var t = this.getPointee(e);
		if (!t) return this.destructor(e), null;
		var n = Ge(this.registeredClass, t);
		if (n !== void 0) {
			if (n.$$.count.value === 0) return n.$$.ptr = t, n.$$.smartPtr = e, n.clone();
			var r = n.clone();
			return this.destructor(e), r;
		}
		function i() {
			return this.isSmartPointer ? U(this.registeredClass.instancePrototype, {
				ptrType: this.pointeeType,
				ptr: t,
				smartPtrType: this,
				smartPtr: e
			}) : U(this.registeredClass.instancePrototype, {
				ptrType: this,
				ptr: e
			});
		}
		var a = Ke[this.registeredClass.getActualType(t)];
		if (!a) return i.call(this);
		var o = this.isConst ? a.constPointerType : a.pointerType, s = He(t, this.registeredClass, o.registeredClass);
		return s === null ? i.call(this) : this.isSmartPointer ? U(o.registeredClass.instancePrototype, {
			ptrType: o,
			ptr: s,
			smartPtrType: this,
			smartPtr: e
		}) : U(o.registeredClass.instancePrototype, {
			ptrType: o,
			ptr: s
		});
	}
	function Je(e, t) {
		if (t === null) return this.isReference && N(`null is not a valid ${this.name}`), 0;
		t.$$ || N(`Cannot pass "${Le(t)}" as a ${this.name}`), t.$$.ptr || N(`Cannot pass deleted object as a pointer of type ${this.name}`), t.$$.ptrType.isConst && N(`Cannot convert argument of type ${t.$$.ptrType.name} to parameter type ${this.name}`);
		var n = t.$$.ptrType.registeredClass;
		return Re(t.$$.ptr, n, this.registeredClass);
	}
	function W(e, t, n, r, i, a, o, s, c, l, u) {
		this.name = e, this.registeredClass = t, this.isReference = n, this.isConst = r, this.isSmartPointer = i, this.pointeeType = a, this.sharingPolicy = o, this.rawGetPointee = s, this.rawConstructor = c, this.rawShare = l, this.rawDestructor = u, !i && t.baseClass === void 0 ? r ? (this.toWireType = ze, this.destructorFunction = null) : (this.toWireType = Je, this.destructorFunction = null) : this.toWireType = Ve;
	}
	var Ye = (e, t) => Object.defineProperty(t, "name", { value: e }), Xe = {}, Ze = (e, t, n) => {
		e = e.replace(/p/g, "i");
		var r = Xe[e];
		return r(t, ...n);
	}, Qe = function(e, t) {
		let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : [];
		return e.includes("j") ? Ze(e, t, n) : function(e) {
			return e;
		}(T(t)(...n));
	}, $e = (e, t) => function() {
		return Qe(e, t, [...arguments]);
	}, G = (e, t) => {
		e = R(e);
		var n = function() {
			return e.includes("j") ? $e(e, t) : T(t);
		}();
		return typeof n != "function" && N(`unknown function pointer with signature ${e}: ${t}`), n;
	}, et = (e, t, n) => {
		if (e[t].overloadTable === void 0) {
			var r = e[t];
			e[t] = function() {
				var r = [...arguments];
				return e[t].overloadTable[r.length] || N(`Function '${n}' called with an invalid number of arguments (${r.length}) - expects one of (${e[t].overloadTable})!`), e[t].overloadTable[r.length].apply(this, r);
			}, e[t].overloadTable = [], e[t].overloadTable[r.argCount] = r;
		}
	}, tt = (e, t) => Object.prototype.hasOwnProperty.call(e, t), nt = (e, t, n) => {
		tt(r, e) ? ((n === void 0 || r[e].overloadTable !== void 0 && r[e].overloadTable[n] !== void 0) && N(`Cannot register public name '${e}' twice`), et(r, e, e), r[e].overloadTable[n] && N(`Cannot register multiple overloads of a function with the same number of arguments (${n})!`), r[e].overloadTable[n] = t) : (r[e] = t, r[e].argCount = n);
	}, rt = (e) => {
		e = e.replace(/[^a-zA-Z0-9_]/g, "$");
		var t = e.charCodeAt(0);
		return t >= 48 && t <= 57 ? `_${e}` : e;
	}, it = (e, t, n) => {
		tt(r, e) || F("Replacing nonexistent public symbol"), r[e].overloadTable !== void 0 && n !== void 0 ? r[e].overloadTable[n] = t : (r[e] = t, r[e].argCount = n);
	};
	class at extends Error {}
	var ot = (e) => {
		var t = en(e), n = R(t);
		return Z(t), n;
	}, st = (e, t) => {
		var n = [], r = {};
		throw t.forEach(function e(t) {
			r[t] || j[t] || (Te[t] ? Te[t].forEach(e) : (n.push(t), r[t] = !0));
		}), new at(`${e}: ` + n.map(ot).join([", "]));
	};
	function ct(e) {
		for (var t = 1; t < e.length; ++t) if (e[t] !== null && e[t].argStackAlloc) return !0;
		return !1;
	}
	function lt(e) {
		for (var t = 1; t < e.length; ++t) if (e[t] !== null && e[t].destructorFunction === void 0) return !0;
		return !1;
	}
	function ut(e, t, n, r, i, a) {
		var o = t.length;
		o < 2 && N("argTypes array size mismatch! Must at least get return value and receiver (this) types!");
		var s = t[1] !== null && n !== null, c = lt(t), l = ct(t), u = l && !a && !c;
		l && !u && (c = !0);
		var d = !t[0].isVoid, f = o - 2, p = Array(f), m = [], h = [];
		return Ye(e, function() {
			var e = [...arguments];
			h.length = 0;
			var n;
			u && (n = w());
			var a;
			m.length = s ? 2 : 1, m[0] = i, s && (a = t[1].toWireType(h, this), m[1] = a);
			for (var o = 0; o < f; ++o) {
				var l = t[o + 2];
				p[o] = l.toWireType(u && l.argStackAlloc ? null : h, e[o]), m.push(p[o]);
			}
			var g = r(...m);
			return u && C(n), function(e) {
				if (c) xe(h);
				else for (var n = s ? 1 : 2; n < t.length; n++) {
					var r = n === 1 ? a : p[n - 2];
					t[n].destructorFunction !== null && t[n].destructorFunction(r);
				}
				if (d) return t[0].fromWireType(e);
			}(g);
		});
	}
	var dt = (e, t) => {
		for (var n = [], r = 0; r < e; r++) n.push(E[t + r * 4 >> 2]);
		return n;
	}, ft = (e) => {
		e = e.trim();
		let t = e.indexOf("(");
		return t === -1 ? e : e.slice(0, t);
	}, pt = [], mt = (e) => {
		if (e > 9 && --V[e + 1] === 0) {
			var t = V[e];
			V[e] = void 0;
			var n = pt[e];
			n && (pt[e] = void 0, n(t)), Be.push(e);
		}
	}, ht = {
		name: "emscripten::val",
		fromWireType: (e) => {
			var t = H.toValue(e);
			return mt(e), t;
		},
		toWireType: (e, t) => H.toHandle(t),
		readValueFromPointer: A,
		destructorFunction: null
	}, gt, _t, vt = (e, t) => {
		switch (t) {
			case 4: return function(e) {
				return this.fromWireType(gt[e >> 2]);
			};
			case 8: return function(e) {
				return this.fromWireType(_t[e >> 3]);
			};
			default: throw TypeError(`invalid float width (${t}): ${e}`);
		}
	}, K, q, J, yt = (e, t, n) => {
		switch (t) {
			case 1: return n ? (e) => b[e] : (e) => L[e];
			case 2: return n ? (e) => K[e >> 1] : (e) => J[e >> 1];
			case 4: return n ? (e) => q[e >> 2] : (e) => E[e >> 2];
			default: throw TypeError(`invalid integer width (${t}): ${e}`);
		}
	}, bt = (e, t, n) => {
		let r = (e, t) => {
			let n = 0;
			return {
				next() {
					if (n >= e) return { done: !0 };
					let r = n;
					return n++, {
						value: t(r),
						done: !1
					};
				},
				[Symbol.iterator]() {
					return this;
				}
			};
		};
		e[Symbol.iterator] || (e[Symbol.iterator] = function() {
			let e = this[t]();
			return r(e, (e) => this[n](e));
		});
	}, xt = Object.assign({ optional: !0 }, ht), St = globalThis.TextDecoder && new TextDecoder(), Ct = (e, t, n, r) => {
		var i = t + n;
		if (r) return i;
		for (; e[t] && !(t >= i);) ++t;
		return t;
	}, wt = function(e) {
		let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = arguments.length > 2 ? arguments[2] : void 0, r = arguments.length > 3 ? arguments[3] : void 0;
		var i = Ct(e, t, n, r);
		if (i - t > 16 && e.buffer && St) return St.decode(e.subarray(t, i));
		for (var a = ""; t < i;) {
			var o = e[t++];
			if (!(o & 128)) a += String.fromCharCode(o);
			else {
				var s = e[t++] & 63;
				if ((o & 224) == 192) a += String.fromCharCode((o & 31) << 6 | s);
				else {
					var c = e[t++] & 63;
					if (o = (o & 240) == 224 ? (o & 15) << 12 | s << 6 | c : (o & 7) << 18 | s << 12 | c << 6 | e[t++] & 63, o < 65536) a += String.fromCharCode(o);
					else {
						var l = o - 65536;
						a += String.fromCharCode(55296 | l >> 10, 56320 | l & 1023);
					}
				}
			}
		}
		return a;
	}, Tt = (e, t, n) => e ? wt(L, e, t, n) : "", Et = (e) => {
		for (var t = 0, n = 0; n < e.length; ++n) {
			var r = e.codePointAt(n);
			r <= 127 ? t++ : r <= 2047 ? t += 2 : r <= 65535 ? t += 3 : (t += 4, n++);
		}
		return t;
	}, Dt = (e, t, n, r) => {
		if (!(r > 0)) return 0;
		for (var i = n, a = n + r - 1, o = 0; o < e.length; ++o) {
			var s = e.codePointAt(o);
			if (s <= 127) {
				if (n >= a) break;
				t[n++] = s;
			} else if (s <= 2047) {
				if (n + 1 >= a) break;
				t[n++] = 192 | s >> 6, t[n++] = 128 | s & 63;
			} else if (s <= 65535) {
				if (n + 2 >= a) break;
				t[n++] = 224 | s >> 12, t[n++] = 128 | s >> 6 & 63, t[n++] = 128 | s & 63;
			} else {
				if (n + 3 >= a) break;
				t[n++] = 240 | s >> 18, t[n++] = 128 | s >> 12 & 63, t[n++] = 128 | s >> 6 & 63, t[n++] = 128 | s & 63, o++;
			}
		}
		return t[n] = 0, n - i;
	}, Ot = (e, t, n) => Dt(e, L, t, n), kt = globalThis.TextDecoder ? new TextDecoder("utf-16le") : void 0, At = (e, t, n) => {
		var r = e >> 1, i = Ct(J, r, t / 2, n);
		if (i - r > 16 && kt) return kt.decode(J.subarray(r, i));
		for (var a = "", o = r; o < i; ++o) {
			var s = J[o];
			a += String.fromCharCode(s);
		}
		return a;
	}, jt = (e, t, n) => {
		for (var r = "", i = e >> 2, a = 0; !(a >= t / 4); a++) {
			var o = E[i + a];
			if (!o && !n) break;
			r += String.fromCodePoint(o);
		}
		return r;
	}, Mt = (e) => e.length * 2, Nt = (e) => {
		for (var t = 0, n = 0; n < e.length; ++n) e.codePointAt(n) > 65535 && n++, t += 4;
		return t;
	}, Pt = function(e, t) {
		let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 2147483647;
		if (n < 2) return 0;
		n -= 2;
		for (var r = t, i = n < e.length * 2 ? n / 2 : e.length, a = 0; a < i; ++a) {
			var o = e.charCodeAt(a);
			K[t >> 1] = o, t += 2;
		}
		return K[t >> 1] = 0, t - r;
	}, Ft = function(e, t) {
		let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 2147483647;
		if (n < 4) return 0;
		for (var r = t, i = r + n - 4, a = 0; a < e.length; ++a) {
			var o = e.codePointAt(a);
			if (o > 65535 && a++, q[t >> 2] = o, t += 4, t + 4 > i) break;
		}
		return q[t >> 2] = 0, t - r;
	}, It = 0, Lt = [], Rt = (e) => {
		var t = Lt.length;
		return Lt.push(e), t;
	}, zt = (e, t) => {
		var n = j[e];
		return n === void 0 && N(`${t} has unknown type ${ot(e)}`), n;
	}, Bt = (e, t) => {
		for (var n = Array(e), r = 0; r < e; ++r) n[r] = zt(E[t + r * 4 >> 2], `parameter ${r}`);
		return n;
	}, Vt = (e, t, n) => {
		var r = [], i = e(r, n);
		return r.length && (E[t >> 2] = H.toHandle(r)), i;
	}, Ht = {}, Ut = (e) => {
		var t = Ht[e];
		return t === void 0 ? R(e) : t;
	}, Wt = (e) => {
		if (e instanceof de || e == "unwind") return h;
		o(0, e);
	}, Gt = () => S || It > 0, Kt = (e) => {
		if (h = e, !Gt()) {
			var t;
			(t = r.onExit) == null || t.call(r, e), m = !0;
		}
		o(0, new de(e));
	}, qt = () => {
		if (!Gt()) try {
			$t(h);
		} catch (e) {
			Wt(e);
		}
	}, Jt = function(e) {
		var t = [...arguments].slice(1);
		if (!m) try {
			return e(...t);
		} catch (e) {
			Wt(e);
		} finally {
			qt();
		}
	}, Y = {}, Yt = () => performance.now(), Xt = (e, t) => Math.ceil(e / t) * t, Zt = () => 2147483648, Qt = (e) => {
		var t = (e - pn.buffer.byteLength + 65535) / 65536 | 0;
		try {
			return pn.grow(t), te(), 1;
		} catch {}
	}, $t = (e) => {
		h = e, Kt(e);
	};
	(() => {
		let e = B.prototype;
		Object.assign(e, {
			isAliasOf(e) {
				if (!(this instanceof B) || !(e instanceof B)) return !1;
				var t = this.$$.ptrType.registeredClass, n = this.$$.ptr;
				e.$$ = e.$$;
				for (var r = e.$$.ptrType.registeredClass, i = e.$$.ptr; t.baseClass;) n = t.upcast(n), t = t.baseClass;
				for (; r.baseClass;) i = r.upcast(i), r = r.baseClass;
				return t === r && n === i;
			},
			clone() {
				if (this.$$.ptr || Fe(this), this.$$.preservePointerOnDelete) return this.$$.count.value += 1, this;
				var e = z(Object.create(Object.getPrototypeOf(this), { $$: { value: Pe(this.$$) } }));
				return e.$$.count.value += 1, e.$$.deleteScheduled = !1, e;
			},
			delete() {
				this.$$.ptr || Fe(this), this.$$.deleteScheduled && !this.$$.preservePointerOnDelete && N("Object already scheduled for deletion"), Ae(this), Me(this.$$), this.$$.preservePointerOnDelete || (this.$$.smartPtr = void 0, this.$$.ptr = void 0);
			},
			isDeleted() {
				return !this.$$.ptr;
			},
			deleteLater() {
				return this.$$.ptr || Fe(this), this.$$.deleteScheduled && !this.$$.preservePointerOnDelete && N("Object already scheduled for deletion"), Ne.push(this), Ne.length, this.$$.deleteScheduled = !0, this;
			}
		});
		let t = Symbol.dispose;
		t && (e[t] = e.delete);
	})(), Object.assign(W.prototype, {
		getPointee(e) {
			return this.rawGetPointee && (e = this.rawGetPointee(e)), e;
		},
		destructor(e) {
			var t, n;
			(t = (n = this).rawDestructor) == null || t.call(n, e);
		},
		readValueFromPointer: A,
		fromWireType: qe
	}), r.noExitRuntime && (S = r.noExitRuntime), r.print && r.print, r.printErr && (f = r.printErr), r.wasmBinary && (p = r.wasmBinary), r.arguments && r.arguments, r.thisProgram && r.thisProgram;
	var X = r.preInit;
	if (X) for (typeof X == "function" && (r.preInit = X = [X]); X.length > 0;) X.shift()();
	var en, tn, Z, nn, rn, Q, an, on, sn, cn, ln, un, dn, fn, pn, mn;
	function hn(e) {
		en = e.sa, tn = r._malloc = e.ta, Z = r._free = e.ua, nn = e.va, rn = e.xa, Q = e.ya, an = e.za, on = e.Aa, sn = e.Ba, cn = e.Ca, ln = e.Da, un = e.Ea, dn = e.Fa, fn = Xe.iiij = e.Ga, pn = e.qa, mn = e.wa;
	}
	var gn = {
		aa: (e, t) => T(e)(t),
		t: (e) => {
			var t = new ge(e);
			return t.get_caught() || (t.set_caught(!0), _e--), t.set_rethrown(!1), D.push(t), nn(e);
		},
		J: () => {
			Q(0, 0);
			var e = D.pop();
			un(e.excPtr), O = null;
		},
		a: () => ve([]),
		i: (e) => ve([e]),
		m: (e, t) => ve([e, t]),
		fa: () => {
			D.length || v("no exception to throw");
			var e = D[D.length - 1], t = e.excPtr;
			e.set_rethrown(!0), e.set_caught(!1), _e++, ln(t), t = O = new _(t), ye(t);
		},
		r: (e, t, n) => {
			new ge(e).init(t, n), ln(e), e = O = new _(e), _e++, ye(e);
		},
		d: (e) => {
			e = O == null ? O = new _(e) : O, be(e);
		},
		ea: () => v(""),
		T: (e) => {
			var t = Ce[e];
			delete Ce[e];
			var n = t.rawConstructor, r = t.rawDestructor, i = t.valueSize, a = t.isTrivial, o = t.fields, s = o.map((e) => e.getterReturnTypeID).concat(o.map((e) => e.setterArgumentTypeID));
			I([e], s, (e) => {
				var s = {};
				for (var [c, l] of o.entries()) {
					let t = e[c], n = l.getter, r = l.getterContext, i = e[c + o.length], a = l.setter, d = l.setterContext;
					var u = i.destructorFunction === null && !i.argStackAlloc ? (e, t) => a(d, e, i.toWireType(null, t)) : (e, t) => {
						var n = [];
						a(d, e, i.toWireType(n, t)), xe(n);
					};
					s[l.fieldName] = {
						read: (e) => t.fromWireType(n(r, e)),
						write: u,
						optional: t.optional
					};
				}
				return [{
					name: t.name,
					fromWireType: (e) => {
						var t = {};
						for (var n in s) t[n] = s[n].read(e);
						return r(e), t;
					},
					toWireType: (e, t) => {
						for (var o in s) if (!(o in t) && !s[o].optional) throw TypeError(`Missing field: "${o}"`);
						var c;
						for (o in a && !e ? (c = Se(i), Oe(c, i)) : (c = n(), e && e.push(r, c)), s) s[o].write(c, t[o]);
						return c;
					},
					readValueFromPointer: A,
					destructorFunction: a ? null : r,
					argStackAlloc: a
				}];
			});
		},
		W: () => {},
		ia: (e, t, n, r) => {
			t = R(t), P(e, {
				name: t,
				fromWireType: function(e) {
					return !!e;
				},
				toWireType: function(e, t) {
					return t ? n : r;
				},
				readValueFromPointer: function(e) {
					return this.fromWireType(L[e]);
				},
				destructorFunction: null
			});
		},
		pa: (e, t, n, r, i, a, o, s, c, l, u, d, f) => {
			u = R(u), a = G(i, a), s && (s = G(o, s)), l && (l = G(c, l)), f = G(d, f);
			var p = rt(u);
			nt(p, function() {
				st(`Cannot construct ${u} due to unbound types`, [r]);
			}), I([
				e,
				t,
				n
			], r ? [r] : [], (t) => {
				t = t[0];
				var n, i;
				r ? (n = t.registeredClass, i = n.instancePrototype) : i = B.prototype;
				var o = Ye(u, function() {
					var e = [...arguments];
					if (Object.getPrototypeOf(this) !== c) throw new M(`Use 'new' to construct ${u}`);
					if (d.constructor_body === void 0) throw new M(`${u} has no accessible constructor`);
					var t = d.constructor_body[e.length];
					if (t === void 0) throw new M(`Tried to invoke ctor of ${u} with invalid number of parameters (${e.length}) - expected (${Object.keys(d.constructor_body).toString()}) parameters instead!`);
					return t.apply(this, e);
				}), c = Object.create(i, { constructor: { value: o } });
				o.prototype = c;
				var d = new Ie(u, o, c, f, n, a, s, l);
				if (d.baseClass) {
					var m;
					(m = d.baseClass).__derivedClasses != null || (m.__derivedClasses = []), d.baseClass.__derivedClasses.push(d);
				}
				var h = new W(u, d, !0, !1, !1), g = new W(u + "*", d, !1, !1, !1), _ = new W(u + " const*", d, !1, !0, !1);
				return Ke[e] = {
					pointerType: g,
					constPointerType: _
				}, it(p, o), [
					h,
					g,
					_
				];
			});
		},
		oa: (e, t, n, r, i, a) => {
			var o = dt(t, n);
			i = G(r, i), I([], [e], (e) => {
				e = e[0];
				var n = `constructor ${e.name}`;
				if (e.registeredClass.constructor_body === void 0 && (e.registeredClass.constructor_body = []), e.registeredClass.constructor_body[t - 1] !== void 0) throw new M(`Cannot register multiple constructors with identical number of parameters (${t - 1}) for class '${e.name}'! Overload resolution is currently only performed using the parameter count, not actual type info!`);
				return e.registeredClass.constructor_body[t - 1] = () => {
					st(`Cannot construct ${e.name} due to unbound types`, o);
				}, I([], o, (r) => (r.splice(1, 0, null), e.registeredClass.constructor_body[t - 1] = ut(n, r, null, i, a), [])), [];
			});
		},
		E: (e, t, n, r, i, a, o, s, c) => {
			var l = dt(n, r);
			t = R(t), t = ft(t), a = G(i, a), I([], [e], (e) => {
				e = e[0];
				var r = `${e.name}.${t}`;
				t.startsWith("@@") && (t = Symbol[t.substring(2)]), s && e.registeredClass.pureVirtualFunctions.push(t);
				function i() {
					st(`Cannot call ${r} due to unbound types`, l);
				}
				var u = e.registeredClass.instancePrototype, d = u[t];
				return d === void 0 || d.overloadTable === void 0 && d.className !== e.name && d.argCount === n - 2 ? (i.argCount = n - 2, i.className = e.name, u[t] = i) : (et(u, t, r), u[t].overloadTable[n - 2] = i), I([], l, (i) => {
					var s = ut(r, i, e, a, o, c);
					return u[t].overloadTable === void 0 ? (s.argCount = n - 2, u[t] = s) : u[t].overloadTable[n - 2] = s, [];
				}), [];
			});
		},
		ga: (e) => P(e, ht),
		Q: (e, t, n) => {
			t = R(t), P(e, {
				name: t,
				fromWireType: (e) => e,
				toWireType: (e, t) => t,
				readValueFromPointer: vt(t, n),
				destructorFunction: null
			});
		},
		R: (e, t, n, r, i, a, o) => {
			var s = dt(t, n);
			e = R(e), e = ft(e), i = G(r, i), nt(e, function() {
				st(`Cannot call ${e} due to unbound types`, s);
			}, t - 1), I([], s, (n) => {
				var r = [n[0], null].concat(n.slice(1));
				return it(e, ut(e, r, null, i, a, o), t - 1), [];
			});
		},
		y: (e, t, n, r, i) => {
			t = R(t);
			let a = r === 0, o = (e) => e;
			if (a) {
				var s = 32 - 8 * n;
				o = (e) => e << s >>> s, i = o(i);
			}
			P(e, {
				name: t,
				fromWireType: o,
				toWireType: (e, t) => t,
				readValueFromPointer: yt(t, n, r !== 0),
				destructorFunction: null
			});
		},
		ka: (e, t, n, r) => {
			n = R(n), r = R(r), I([], [e, t], (e) => {
				let t = e[0];
				return bt(t.registeredClass.instancePrototype, n, r), [];
			});
		},
		u: (e, t, n) => {
			var r = [
				Int8Array,
				Uint8Array,
				Int16Array,
				Uint16Array,
				Int32Array,
				Uint32Array,
				Float32Array,
				Float64Array
			][t];
			function i(e) {
				var t = E[e >> 2], n = E[e + 4 >> 2];
				return new r(b.buffer, n, t);
			}
			n = R(n), P(e, {
				name: n,
				fromWireType: i,
				readValueFromPointer: i
			}, { ignoreDuplicateRegistrations: !0 });
		},
		S: (e) => {
			P(e, xt);
		},
		ha: (e, t) => {
			t = R(t), P(e, {
				name: t,
				fromWireType(e) {
					var t = E[e >> 2], n = Tt(e + 4, t, !0);
					return Z(e), n;
				},
				toWireType(e, t) {
					t instanceof ArrayBuffer && (t = new Uint8Array(t));
					var n, r = typeof t == "string";
					r || ArrayBuffer.isView(t) && t.BYTES_PER_ELEMENT == 1 || N("Cannot pass non-string to std::string"), n = r ? Et(t) : t.length;
					var i = tn(4 + n + 1), a = i + 4;
					return E[i >> 2] = n, r ? Ot(t, a, n + 1) : L.set(t, a), e !== null && e.push(Z, i), i;
				},
				readValueFromPointer: A,
				destructorFunction(e) {
					Z(e);
				}
			});
		},
		L: (e, t, n) => {
			n = R(n);
			var r, i, a;
			t === 2 ? (r = At, i = Pt, a = Mt) : (r = jt, i = Ft, a = Nt), P(e, {
				name: n,
				fromWireType: (e) => {
					var n = E[e >> 2], i = r(e + 4, n * t, !0);
					return Z(e), i;
				},
				toWireType: (e, r) => {
					typeof r != "string" && N(`Cannot pass non-string to C++ string type ${n}`);
					var o = a(r), s = tn(4 + o + t);
					return E[s >> 2] = o / t, i(r, s + 4, o + t), e !== null && e.push(Z, s), s;
				},
				readValueFromPointer: A,
				destructorFunction(e) {
					Z(e);
				}
			});
		},
		C: (e, t, n, r, i, a, o, s) => {
			Ce[e] = {
				name: R(t),
				rawConstructor: G(n, r),
				rawDestructor: G(i, a),
				valueSize: o,
				isTrivial: !!s,
				fields: []
			};
		},
		U: (e, t, n, r, i, a, o, s, c, l) => {
			Ce[e].fields.push({
				fieldName: R(t),
				getterReturnTypeID: n,
				getter: G(r, i),
				getterContext: a,
				setterArgumentTypeID: o,
				setter: G(s, c),
				setterContext: l
			});
		},
		ja: (e, t) => {
			t = R(t), P(e, {
				isVoid: !0,
				name: t,
				fromWireType: () => {},
				toWireType: () => {}
			});
		},
		da: () => {
			S = !1, It = 0;
		},
		na: (e, t, n) => {
			var [r, ...i] = Bt(e, t), a = r.toWireType.bind(r), o = i.map((e) => e.readValueFromPointer.bind(e));
			e--;
			var s = Array(e);
			return Rt(Ye(`methodCaller<(${i.map((e) => e.name)}) => ${r.name}>`, (t, r, i, c) => {
				for (var l = 0, u = 0; u < e; ++u) s[u] = o[u](c + l), l += 8;
				var d;
				switch (n) {
					case 0:
						d = H.toValue(t)(...s);
						break;
					case 2:
						d = Reflect.construct(H.toValue(t), s);
						break;
					case 3:
						d = s[0];
						break;
					case 1: d = H.toValue(t)[Ut(r)](...s);
				}
				return Vt(a, i, d);
			}));
		},
		ba: mt,
		B: (e) => e ? (e = Ut(e), H.toHandle(globalThis[e])) : H.toHandle(globalThis),
		P: (e) => {
			e > 9 && (V[e + 1] += 1);
		},
		ma: (e, t, n, r, i) => Lt[e](t, n, r, i),
		la: (e) => {
			xe(H.toValue(e)), mt(e);
		},
		_: (e, t) => (Y[e] && (clearTimeout(Y[e].id), delete Y[e]), t && (Y[e] = {
			id: setTimeout(() => {
				delete Y[e], Jt(rn, e, Yt());
			}, t),
			timeout_ms: t
		}), 0),
		$: (e) => {
			var t = L.length;
			e >>>= 0;
			var n = Zt();
			if (e > n) return !1;
			for (var r = 1; r <= 4; r *= 2) {
				var i = t * (1 + .2 / r);
				if (i = Math.min(i, e + 100663296), Qt(Math.min(n, Xt(Math.max(e, i), 65536)))) return !0;
			}
			return !1;
		},
		Z: function(e, t, n) {
			var r = w();
			try {
				return T(e)(t, n);
			} catch (e) {
				if (C(r), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		N: function(e, t, n, r) {
			var i = w();
			try {
				return T(e)(t, n, r);
			} catch (e) {
				if (C(i), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		A: function(e, t, n, r, i, a) {
			var o = w();
			try {
				return T(e)(t, n, r, i, a);
			} catch (e) {
				if (C(o), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		b: function(e, t) {
			var n = w();
			try {
				return T(e)(t);
			} catch (e) {
				if (C(n), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		z: function(e, t, n, r) {
			var i = w();
			try {
				return T(e)(t, n, r);
			} catch (e) {
				if (C(i), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		h: function(e, t, n) {
			var r = w();
			try {
				return T(e)(t, n);
			} catch (e) {
				if (C(r), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		D: function(e, t, n, r, i) {
			var a = w();
			try {
				return T(e)(t, n, r, i);
			} catch (e) {
				if (C(a), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		g: function(e, t, n, r) {
			var i = w();
			try {
				return T(e)(t, n, r);
			} catch (e) {
				if (C(i), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		l: function(e, t, n, r, i) {
			var a = w();
			try {
				return T(e)(t, n, r, i);
			} catch (e) {
				if (C(a), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		n: function(e, t, n, r, i, a) {
			var o = w();
			try {
				return T(e)(t, n, r, i, a);
			} catch (e) {
				if (C(o), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		K: function(e, t, n, r, i, a, o) {
			var s = w();
			try {
				return T(e)(t, n, r, i, a, o);
			} catch (e) {
				if (C(s), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		O: function(e, t, n, r, i, a, o) {
			var s = w();
			try {
				return T(e)(t, n, r, i, a, o);
			} catch (e) {
				if (C(s), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		I: function(e, t, n, r, i, a, o, s) {
			var c = w();
			try {
				return T(e)(t, n, r, i, a, o, s);
			} catch (e) {
				if (C(c), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		H: function(e, t, n, r, i, a, o, s, c) {
			var l = w();
			try {
				return T(e)(t, n, r, i, a, o, s, c);
			} catch (e) {
				if (C(l), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		V: function(e, t, n, r, i) {
			var a = w();
			try {
				return fn(e, t, n, r, i);
			} catch (e) {
				if (C(a), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		c: function(e) {
			var t = w();
			try {
				T(e)();
			} catch (e) {
				if (C(t), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		j: function(e, t) {
			var n = w();
			try {
				T(e)(t);
			} catch (e) {
				if (C(n), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		X: function(e, t, n) {
			var r = w();
			try {
				T(e)(t, n);
			} catch (e) {
				if (C(r), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		e: function(e, t, n) {
			var r = w();
			try {
				T(e)(t, n);
			} catch (e) {
				if (C(r), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		M: function(e, t, n, r, i, a, o, s, c) {
			var l = w();
			try {
				T(e)(t, n, r, i, a, o, s, c);
			} catch (e) {
				if (C(l), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		G: function(e, t, n, r, i) {
			var a = w();
			try {
				T(e)(t, n, r, i);
			} catch (e) {
				if (C(a), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		f: function(e, t, n, r) {
			var i = w();
			try {
				T(e)(t, n, r);
			} catch (e) {
				if (C(i), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		F: function(e, t, n, r, i, a, o) {
			var s = w();
			try {
				T(e)(t, n, r, i, a, o);
			} catch (e) {
				if (C(s), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		k: function(e, t, n, r, i) {
			var a = w();
			try {
				T(e)(t, n, r, i);
			} catch (e) {
				if (C(a), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		Y: function(e, t, n, r, i, a, o, s) {
			var c = w();
			try {
				T(e)(t, n, r, i, a, o, s);
			} catch (e) {
				if (C(c), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		o: function(e, t, n, r, i, a) {
			var o = w();
			try {
				T(e)(t, n, r, i, a);
			} catch (e) {
				if (C(o), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		s: function(e, t, n, r, i, a, o) {
			var s = w();
			try {
				T(e)(t, n, r, i, a, o);
			} catch (e) {
				if (C(s), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		x: function(e, t, n, r, i, a, o, s) {
			var c = w();
			try {
				T(e)(t, n, r, i, a, o, s);
			} catch (e) {
				if (C(c), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		q: function(e, t, n, r, i, a, o, s, c) {
			var l = w();
			try {
				T(e)(t, n, r, i, a, o, s, c);
			} catch (e) {
				if (C(l), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		v: function(e, t, n, r, i, a, o, s, c, l) {
			var u = w();
			try {
				T(e)(t, n, r, i, a, o, s, c, l);
			} catch (e) {
				if (C(u), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		p: function(e, t, n, r, i, a, o, s, c, l, u) {
			var d = w();
			try {
				T(e)(t, n, r, i, a, o, s, c, l, u);
			} catch (e) {
				if (C(d), !(e instanceof g)) throw e;
				Q(1, 0);
			}
		},
		w: (e) => e,
		ca: Kt
	}, $ = await async function() {
		function e(e) {
			return $ = e.exports, hn($), te(), $;
		}
		var t = ue(), n = r.instantiateWasm;
		return n ? new Promise((r) => {
			n(t, (t) => r(e(t)));
		}) : (y != null || (y = ae()), function(t) {
			return e(t.instance);
		}(await le(p, y, t)));
	}();
	return await async function() {
		var e;
		ne();
		var t = r.setStatus;
		t && (t("Running..."), await new Promise((e) => setTimeout(e, 1)), setTimeout(t, 1, "")), m || (re(), (e = r.onRuntimeInitialized) == null || e.call(r), ie());
	}(), r;
}
// src/reader/index.ts
function S(e) {
	return m(x, e);
}
function C() {
	return oe(x);
}
function w(e) {
	return S({
		overrides: e,
		equalityFn: Object.is,
		fireImmediately: !0
	});
}
function he(e) {
	S({
		overrides: e,
		equalityFn: Object.is,
		fireImmediately: !1
	});
}
async function T(e, t) {
	return le(x, e, t);
}
async function E(e, t) {
	return T(e, t);
}
async function ge(e, t) {
	return T(e, t);
}
var D = "33c8c50be17d0bb05454b4fd3ffb5b5ab9a8e8d1c0ebeb21a1adf4a89c1a8b59";
export { pe as BARCODE_FORMATS, h as BARCODE_HRI_LABELS, fe as BARCODE_META_FORMATS, d as BARCODE_SYMBOLOGIES, p as BINARIZERS, te as CHARACTER_SETS, se as CONTENT_TYPES, t as CREATABLE_BARCODE_FORMATS, g as EAN_ADD_ON_SYMBOLS, b as GS1_BARCODE_FORMATS, f as INDUSTRIAL_BARCODE_FORMATS, r as LINEAR_BARCODE_FORMATS, n as MATRIX_BARCODE_FORMATS, l as READABLE_BARCODE_FORMATS, ie as RETAIL_BARCODE_FORMATS, v as TEXT_MODES, ce as ZXING_CPP_COMMIT, D as ZXING_WASM_SHA256, ne as ZXING_WASM_VERSION, e as barcodeFormats, de as binarizers, ee as characterSets, y as contentTypes, ae as defaultReaderOptions, _ as eanAddOnSymbols, re as encodeFormat, s as encodeFormats, c as formatToLabel, u as formatToSymbology, w as getZXingModule, i as linearBarcodeFormats, a as matrixBarcodeFormats, S as prepareZXingModule, C as purgeZXingModule, T as readBarcodes, ge as readBarcodesFromImageData, E as readBarcodesFromImageFile, he as setZXingModuleOverrides, o as symbologyToFormats, ue as textModes };
