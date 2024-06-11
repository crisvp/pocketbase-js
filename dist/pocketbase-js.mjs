var U = Object.defineProperty;
var _ = (c, i, e) => i in c ? U(c, i, { enumerable: !0, configurable: !0, writable: !0, value: e }) : c[i] = e;
var l = (c, i, e) => (_(c, typeof i != "symbol" ? i + "" : i, e), e);
class f extends Error {
  constructor(e) {
    var t, s, n, r;
    super("ClientResponseError");
    l(this, "url", "");
    l(this, "status", 0);
    l(this, "response", {});
    l(this, "isAbort", !1);
    l(this, "originalError", null);
    Object.setPrototypeOf(this, f.prototype), e !== null && typeof e == "object" && (this.url = typeof e.url == "string" ? e.url : "", this.status = typeof e.status == "number" ? e.status : 0, this.isAbort = !!e.isAbort, this.originalError = e.originalError, e.response !== null && typeof e.response == "object" ? this.response = e.response : e.data !== null && typeof e.data == "object" ? this.response = e.data : this.response = {}), !this.originalError && !(e instanceof f) && (this.originalError = e), typeof DOMException < "u" && e instanceof DOMException && (this.isAbort = !0), this.name = "ClientResponseError " + this.status, this.message = (t = this.response) == null ? void 0 : t.message, this.message || (this.isAbort ? this.message = "The request was autocancelled. You can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation." : (r = (n = (s = this.originalError) == null ? void 0 : s.cause) == null ? void 0 : n.message) != null && r.includes("ECONNREFUSED ::1") ? this.message = "Failed to connect to the PocketBase server. Try changing the SDK URL from localhost to 127.0.0.1 (https://github.com/pocketbase/js-sdk/issues/21)." : this.message = "Something went wrong while processing your request.");
  }
  /**
   * Alias for `this.response` to preserve the backward compatibility.
   */
  get data() {
    return this.response;
  }
  /**
   * Make a POJO's copy of the current error class instance.
   * @see https://github.com/vuex-orm/vuex-orm/issues/255
   */
  toJSON() {
    return { ...this };
  }
}
const C = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
function F(c, i) {
  const e = {};
  if (typeof c != "string")
    return e;
  const s = Object.assign({}, i || {}).decode || N;
  let n = 0;
  for (; n < c.length; ) {
    const r = c.indexOf("=", n);
    if (r === -1)
      break;
    let o = c.indexOf(";", n);
    if (o === -1)
      o = c.length;
    else if (o < r) {
      n = c.lastIndexOf(";", r - 1) + 1;
      continue;
    }
    const a = c.slice(n, r).trim();
    if (e[a] === void 0) {
      let h = c.slice(r + 1, o).trim();
      h.charCodeAt(0) === 34 && (h = h.slice(1, -1));
      try {
        e[a] = s(h);
      } catch {
        e[a] = h;
      }
    }
    n = o + 1;
  }
  return e;
}
function v(c, i, e) {
  const t = Object.assign({}, e || {}), s = t.encode || K;
  if (!C.test(c))
    throw new TypeError("argument name is invalid");
  const n = s(i);
  if (n && !C.test(n))
    throw new TypeError("argument val is invalid");
  let r = c + "=" + n;
  if (t.maxAge != null) {
    const o = t.maxAge - 0;
    if (isNaN(o) || !isFinite(o))
      throw new TypeError("option maxAge is invalid");
    r += "; Max-Age=" + Math.floor(o);
  }
  if (t.domain) {
    if (!C.test(t.domain))
      throw new TypeError("option domain is invalid");
    r += "; Domain=" + t.domain;
  }
  if (t.path) {
    if (!C.test(t.path))
      throw new TypeError("option path is invalid");
    r += "; Path=" + t.path;
  }
  if (t.expires) {
    if (!W(t.expires) || isNaN(t.expires.valueOf()))
      throw new TypeError("option expires is invalid");
    r += "; Expires=" + t.expires.toUTCString();
  }
  if (t.httpOnly && (r += "; HttpOnly"), t.secure && (r += "; Secure"), t.priority)
    switch (typeof t.priority == "string" ? t.priority.toLowerCase() : t.priority) {
      case "low":
        r += "; Priority=Low";
        break;
      case "medium":
        r += "; Priority=Medium";
        break;
      case "high":
        r += "; Priority=High";
        break;
      default:
        throw new TypeError("option priority is invalid");
    }
  if (t.sameSite)
    switch (typeof t.sameSite == "string" ? t.sameSite.toLowerCase() : t.sameSite) {
      case !0:
        r += "; SameSite=Strict";
        break;
      case "lax":
        r += "; SameSite=Lax";
        break;
      case "strict":
        r += "; SameSite=Strict";
        break;
      case "none":
        r += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  return r;
}
function N(c) {
  return c.indexOf("%") !== -1 ? decodeURIComponent(c) : c;
}
function K(c) {
  return encodeURIComponent(c);
}
function W(c) {
  return Object.prototype.toString.call(c) === "[object Date]" || c instanceof Date;
}
const B = typeof navigator < "u" && navigator.product === "ReactNative" || typeof global < "u" && global.HermesInternal;
let k;
typeof atob == "function" && !B ? k = atob : k = (c) => {
  const i = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let e = String(c).replace(/=+$/, "");
  if (e.length % 4 == 1)
    throw new Error(
      "'atob' failed: The string to be decoded is not correctly encoded."
    );
  for (
    var t = 0, s, n, r = 0, o = "";
    // get next character
    n = e.charAt(r++);
    // character found in table? initialize bit storage and add its ascii value;
    ~n && (s = t % 4 ? s * 64 + n : n, // and if not first of each 4 characters,
    // convert the first 8 bits to one ascii character
    t++ % 4) ? o += String.fromCharCode(255 & s >> (-2 * t & 6)) : 0
  )
    n = i.indexOf(n);
  return o;
};
function w(c) {
  if (c)
    try {
      const i = decodeURIComponent(
        k(c.split(".")[1]).split("").map(function(e) {
          return "%" + ("00" + e.charCodeAt(0).toString(16)).slice(-2);
        }).join("")
      );
      return JSON.parse(i) || {};
    } catch {
    }
  return {};
}
function E(c, i = 0) {
  let e = w(c);
  return !(Object.keys(e).length > 0 && (!e.exp || e.exp - i > Date.now() / 1e3));
}
const P = "pb_auth";
class R {
  constructor() {
    l(this, "baseToken", "");
    l(this, "baseModel", null);
    l(this, "_onChangeCallbacks", []);
  }
  /**
   * Retrieves the stored token (if any).
   */
  get token() {
    return this.baseToken;
  }
  /**
   * Retrieves the stored model data (if any).
   */
  get model() {
    return this.baseModel;
  }
  /**
   * Loosely checks if the store has valid token (aka. existing and unexpired exp claim).
   */
  get isValid() {
    return !E(this.token);
  }
  /**
   * Checks whether the current store state is for admin authentication.
   */
  get isAdmin() {
    return w(this.token).type === "admin";
  }
  /**
   * Checks whether the current store state is for auth record authentication.
   */
  get isAuthRecord() {
    return w(this.token).type === "authRecord";
  }
  /**
   * Saves the provided new token and model data in the auth store.
   */
  save(i, e) {
    this.baseToken = i || "", this.baseModel = e || null, this.triggerChange();
  }
  /**
   * Removes the stored token and model data form the auth store.
   */
  clear() {
    this.baseToken = "", this.baseModel = null, this.triggerChange();
  }
  /**
   * Parses the provided cookie string and updates the store state
   * with the cookie's token and model data.
   *
   * NB! This function doesn't validate the token or its data.
   * Usually this isn't a concern if you are interacting only with the
   * PocketBase API because it has the proper server-side security checks in place,
   * but if you are using the store `isValid` state for permission controls
   * in a node server (eg. SSR), then it is recommended to call `authRefresh()`
   * after loading the cookie to ensure an up-to-date token and model state.
   * For example:
   *
   * ```js
   * pb.authStore.loadFromCookie("cookie string...");
   *
   * try {
   *     // get an up-to-date auth store state by veryfing and refreshing the loaded auth model (if any)
   *     pb.authStore.isValid && await pb.collection('users').authRefresh();
   * } catch (_) {
   *     // clear the auth store on failed refresh
   *     pb.authStore.clear();
   * }
   * ```
   */
  loadFromCookie(i, e = P) {
    const t = F(i || "")[e] || "";
    let s = {};
    try {
      s = JSON.parse(t), (typeof s === null || typeof s != "object" || Array.isArray(s)) && (s = {});
    } catch {
    }
    this.save(s.token || "", s.model || null);
  }
  /**
   * Exports the current store state as cookie string.
   *
   * By default the following optional attributes are added:
   * - Secure
   * - HttpOnly
   * - SameSite=Strict
   * - Path=/
   * - Expires={the token expiration date}
   *
   * NB! If the generated cookie exceeds 4096 bytes, this method will
   * strip the model data to the bare minimum to try to fit within the
   * recommended size in https://www.rfc-editor.org/rfc/rfc6265#section-6.1.
   */
  exportToCookie(i, e = P) {
    var a, h;
    const t = {
      secure: !0,
      sameSite: !0,
      httpOnly: !0,
      path: "/"
    }, s = w(this.token);
    s != null && s.exp ? t.expires = new Date(s.exp * 1e3) : t.expires = /* @__PURE__ */ new Date("1970-01-01"), i = Object.assign({}, t, i);
    const n = {
      token: this.token,
      model: this.model ? JSON.parse(JSON.stringify(this.model)) : null
    };
    let r = v(e, JSON.stringify(n), i);
    const o = typeof Blob < "u" ? new Blob([r]).size : r.length;
    if (n.model && o > 4096) {
      n.model = { id: (a = n == null ? void 0 : n.model) == null ? void 0 : a.id, email: (h = n == null ? void 0 : n.model) == null ? void 0 : h.email };
      const u = ["collectionId", "username", "verified"];
      for (const m in this.model)
        u.includes(m) && (n.model[m] = this.model[m]);
      r = v(e, JSON.stringify(n), i);
    }
    return r;
  }
  /**
   * Register a callback function that will be called on store change.
   *
   * You can set the `fireImmediately` argument to true in order to invoke
   * the provided callback right after registration.
   *
   * Returns a removal function that you could call to "unsubscribe" from the changes.
   */
  onChange(i, e = !1) {
    return this._onChangeCallbacks.push(i), e && i(this.token, this.model), () => {
      for (let t = this._onChangeCallbacks.length - 1; t >= 0; t--)
        if (this._onChangeCallbacks[t] == i) {
          delete this._onChangeCallbacks[t], this._onChangeCallbacks.splice(t, 1);
          return;
        }
    };
  }
  triggerChange() {
    for (const i of this._onChangeCallbacks)
      i && i(this.token, this.model);
  }
}
class $ extends R {
  constructor(e = "pocketbase_auth") {
    super();
    l(this, "storageFallback", {});
    l(this, "storageKey");
    this.storageKey = e, this._bindStorageEvent();
  }
  /**
   * @inheritdoc
   */
  get token() {
    return (this._storageGet(this.storageKey) || {}).token || "";
  }
  /**
   * @inheritdoc
   */
  get model() {
    return (this._storageGet(this.storageKey) || {}).model || null;
  }
  /**
   * @inheritdoc
   */
  save(e, t) {
    this._storageSet(this.storageKey, {
      token: e,
      model: t
    }), super.save(e, t);
  }
  /**
   * @inheritdoc
   */
  clear() {
    this._storageRemove(this.storageKey), super.clear();
  }
  // ---------------------------------------------------------------
  // Internal helpers:
  // ---------------------------------------------------------------
  /**
   * Retrieves `key` from the browser's local storage
   * (or runtime/memory if local storage is undefined).
   */
  _storageGet(e) {
    if (typeof window < "u" && (window != null && window.localStorage)) {
      const t = window.localStorage.getItem(e) || "";
      try {
        return JSON.parse(t);
      } catch {
        return t;
      }
    }
    return this.storageFallback[e];
  }
  /**
   * Stores a new data in the browser's local storage
   * (or runtime/memory if local storage is undefined).
   */
  _storageSet(e, t) {
    if (typeof window < "u" && (window != null && window.localStorage)) {
      let s = t;
      typeof t != "string" && (s = JSON.stringify(t)), window.localStorage.setItem(e, s);
    } else
      this.storageFallback[e] = t;
  }
  /**
   * Removes `key` from the browser's local storage and the runtime/memory.
   */
  _storageRemove(e) {
    var t;
    typeof window < "u" && (window != null && window.localStorage) && ((t = window.localStorage) == null || t.removeItem(e)), delete this.storageFallback[e];
  }
  /**
   * Updates the current store state on localStorage change.
   */
  _bindStorageEvent() {
    typeof window > "u" || !(window != null && window.localStorage) || !window.addEventListener || window.addEventListener("storage", (e) => {
      if (e.key != this.storageKey)
        return;
      const t = this._storageGet(this.storageKey) || {};
      super.save(t.token || "", t.model || null);
    });
  }
}
class p {
  constructor(i) {
    l(this, "client");
    this.client = i;
  }
}
class H extends p {
  /**
   * Fetch all available app settings.
   *
   * @throws {ClientResponseError}
   */
  async getAll(i) {
    return i = Object.assign(
      {
        method: "GET"
      },
      i
    ), this.client.send("/api/settings", i);
  }
  /**
   * Bulk updates app settings.
   *
   * @throws {ClientResponseError}
   */
  async update(i, e) {
    return e = Object.assign(
      {
        method: "PATCH",
        body: i
      },
      e
    ), this.client.send("/api/settings", e);
  }
  /**
   * Performs a S3 filesystem connection test.
   *
   * The currently supported `filesystem` are "storage" and "backups".
   *
   * @throws {ClientResponseError}
   */
  async testS3(i = "storage", e) {
    return e = Object.assign(
      {
        method: "POST",
        body: {
          filesystem: i
        }
      },
      e
    ), this.client.send("/api/settings/test/s3", e).then(() => !0);
  }
  /**
   * Sends a test email.
   *
   * The possible `emailTemplate` values are:
   * - verification
   * - password-reset
   * - email-change
   *
   * @throws {ClientResponseError}
   */
  async testEmail(i, e, t) {
    return t = Object.assign(
      {
        method: "POST",
        body: {
          email: i,
          template: e
        }
      },
      t
    ), this.client.send("/api/settings/test/email", t).then(() => !0);
  }
  /**
   * Generates a new Apple OAuth2 client secret.
   *
   * @throws {ClientResponseError}
   */
  async generateAppleClientSecret(i, e, t, s, n, r) {
    return r = Object.assign(
      {
        method: "POST",
        body: {
          clientId: i,
          teamId: e,
          keyId: t,
          privateKey: s,
          duration: n
        }
      },
      r
    ), this.client.send("/api/settings/apple/generate-client-secret", r);
  }
}
class T extends p {
  /**
   * Response data decoder.
   */
  decode(i) {
    return i;
  }
  async getFullList(i, e) {
    if (typeof i == "number")
      return this._getFullList(i, e);
    e = Object.assign({}, i, e);
    let t = 500;
    return e.batch && (t = e.batch, delete e.batch), this._getFullList(t, e);
  }
  /**
   * Returns paginated items list.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * @throws {ClientResponseError}
   */
  async getList(i = 1, e = 30, t) {
    return t = Object.assign(
      {
        method: "GET"
      },
      t
    ), t.query = Object.assign(
      {
        page: i,
        perPage: e
      },
      t.query
    ), this.client.send(this.baseCrudPath, t).then((s) => {
      var n;
      return s.items = ((n = s.items) == null ? void 0 : n.map((r) => this.decode(r))) || [], s;
    });
  }
  /**
   * Returns the first found item by the specified filter.
   *
   * Internally it calls `getList(1, 1, { filter, skipTotal })` and
   * returns the first found item.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * For consistency with `getOne`, this method will throw a 404
   * ClientResponseError if no item was found.
   *
   * @throws {ClientResponseError}
   */
  async getFirstListItem(i, e) {
    return e = Object.assign(
      {
        requestKey: "one_by_filter_" + this.baseCrudPath + "_" + i
      },
      e
    ), e.query = Object.assign(
      {
        filter: i,
        skipTotal: 1
      },
      e.query
    ), this.getList(1, 1, e).then((t) => {
      var s;
      if (!((s = t == null ? void 0 : t.items) != null && s.length))
        throw new f({
          status: 404,
          response: {
            code: 404,
            message: "The requested resource wasn't found.",
            data: {}
          }
        });
      return t.items[0];
    });
  }
  /**
   * Returns single item by its id.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * If `id` is empty it will throw a 404 error.
   *
   * @throws {ClientResponseError}
   */
  async getOne(i, e) {
    if (!i)
      throw new f({
        url: this.client.buildUrl(this.baseCrudPath + "/"),
        status: 404,
        response: {
          code: 404,
          message: "Missing required record id.",
          data: {}
        }
      });
    return e = Object.assign(
      {
        method: "GET"
      },
      e
    ), this.client.send(this.baseCrudPath + "/" + encodeURIComponent(i), e).then((t) => this.decode(t));
  }
  /**
   * Creates a new item.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * @throws {ClientResponseError}
   */
  async create(i, e) {
    return e = Object.assign(
      {
        method: "POST",
        body: i
      },
      e
    ), this.client.send(this.baseCrudPath, e).then((t) => this.decode(t));
  }
  /**
   * Updates an existing item by its id.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * @throws {ClientResponseError}
   */
  async update(i, e, t) {
    return t = Object.assign(
      {
        method: "PATCH",
        body: e
      },
      t
    ), this.client.send(this.baseCrudPath + "/" + encodeURIComponent(i), t).then((s) => this.decode(s));
  }
  /**
   * Deletes an existing item by its id.
   *
   * @throws {ClientResponseError}
   */
  async delete(i, e) {
    return e = Object.assign(
      {
        method: "DELETE"
      },
      e
    ), this.client.send(this.baseCrudPath + "/" + encodeURIComponent(i), e).then(() => !0);
  }
  /**
   * Returns a promise with all list items batch fetched at once.
   */
  _getFullList(i = 500, e) {
    e = e || {}, e.query = Object.assign(
      {
        skipTotal: 1
      },
      e.query
    );
    let t = [], s = async (n) => this.getList(n, i || 500, e).then((r) => {
      const a = r.items;
      return t = t.concat(a), a.length == r.perPage ? s(n + 1) : t;
    });
    return s(1);
  }
}
function d(c, i, e, t) {
  const s = typeof e < "u", n = typeof t < "u";
  return !n && !s ? i : n ? (console.warn(c), i.body = Object.assign({}, i.body, e), i.query = Object.assign({}, i.query, t), i) : Object.assign(i, e);
}
function O(c) {
  var i;
  (i = c._resetAutoRefresh) == null || i.call(c);
}
function J(c, i, e, t) {
  O(c);
  const s = c.beforeSend, n = c.authStore.model, r = c.authStore.onChange((o, a) => {
    (!o || (a == null ? void 0 : a.id) != (n == null ? void 0 : n.id) || // check the collection id in case an admin and auth record share the same id
    (a != null && a.collectionId || n != null && n.collectionId) && (a == null ? void 0 : a.collectionId) != (n == null ? void 0 : n.collectionId)) && O(c);
  });
  c._resetAutoRefresh = function() {
    r(), c.beforeSend = s, delete c._resetAutoRefresh;
  }, c.beforeSend = async (o, a) => {
    var S;
    const h = c.authStore.token;
    if ((S = a.query) != null && S.autoRefresh)
      return s ? s(o, a) : { url: o, sendOptions: a };
    let u = c.authStore.isValid;
    if (
      // is loosely valid
      u && // but it is going to expire in the next "threshold" seconds
      E(c.authStore.token, i)
    )
      try {
        await e();
      } catch {
        u = !1;
      }
    u || await t();
    const m = a.headers || {};
    for (let y in m)
      if (y.toLowerCase() == "authorization" && // the request wasn't sent with a custom token
      h == m[y] && c.authStore.token) {
        m[y] = c.authStore.token;
        break;
      }
    return a.headers = m, s ? s(o, a) : { url: o, sendOptions: a };
  };
}
class G extends T {
  /**
   * @inheritdoc
   */
  get baseCrudPath() {
    return "/api/admins";
  }
  // ---------------------------------------------------------------
  // Post update/delete AuthStore sync
  // ---------------------------------------------------------------
  /**
   * @inheritdoc
   *
   * If the current `client.authStore.model` matches with the updated id, then
   * on success the `client.authStore.model` will be updated with the result.
   */
  async update(i, e, t) {
    return super.update(i, e, t).then((s) => {
      var n, r;
      return ((n = this.client.authStore.model) == null ? void 0 : n.id) === s.id && typeof ((r = this.client.authStore.model) == null ? void 0 : r.collectionId) > "u" && this.client.authStore.save(this.client.authStore.token, s), s;
    });
  }
  /**
   * @inheritdoc
   *
   * If the current `client.authStore.model` matches with the deleted id,
   * then on success the `client.authStore` will be cleared.
   */
  async delete(i, e) {
    return super.delete(i, e).then((t) => {
      var s, n;
      return t && ((s = this.client.authStore.model) == null ? void 0 : s.id) === i && typeof ((n = this.client.authStore.model) == null ? void 0 : n.collectionId) > "u" && this.client.authStore.clear(), t;
    });
  }
  // ---------------------------------------------------------------
  // Auth handlers
  // ---------------------------------------------------------------
  /**
   * Prepare successful authorize response.
   */
  authResponse(i) {
    const e = this.decode((i == null ? void 0 : i.admin) || {});
    return i != null && i.token && (i != null && i.admin) && this.client.authStore.save(i.token, e), Object.assign({}, i, {
      // normalize common fields
      token: (i == null ? void 0 : i.token) || "",
      admin: e
    });
  }
  async authWithPassword(i, e, t, s) {
    let n = {
      method: "POST",
      body: {
        identity: i,
        password: e
      }
    };
    n = d(
      "This form of authWithPassword(email, pass, body?, query?) is deprecated. Consider replacing it with authWithPassword(email, pass, options?).",
      n,
      t,
      s
    );
    const r = n.autoRefreshThreshold;
    delete n.autoRefreshThreshold, n.autoRefresh || O(this.client);
    let o = await this.client.send(
      this.baseCrudPath + "/auth-with-password",
      n
    );
    return o = this.authResponse(o), r && J(
      this.client,
      r,
      () => this.authRefresh({ autoRefresh: !0 }),
      () => this.authWithPassword(
        i,
        e,
        Object.assign({ autoRefresh: !0 }, n)
      )
    ), o;
  }
  async authRefresh(i, e) {
    let t = {
      method: "POST"
    };
    return t = d(
      "This form of authRefresh(body?, query?) is deprecated. Consider replacing it with authRefresh(options?).",
      t,
      i,
      e
    ), this.client.send(this.baseCrudPath + "/auth-refresh", t).then(this.authResponse.bind(this));
  }
  async requestPasswordReset(i, e, t) {
    let s = {
      method: "POST",
      body: {
        email: i
      }
    };
    return s = d(
      "This form of requestPasswordReset(email, body?, query?) is deprecated. Consider replacing it with requestPasswordReset(email, options?).",
      s,
      e,
      t
    ), this.client.send(this.baseCrudPath + "/request-password-reset", s).then(() => !0);
  }
  async confirmPasswordReset(i, e, t, s, n) {
    let r = {
      method: "POST",
      body: {
        token: i,
        password: e,
        passwordConfirm: t
      }
    };
    return r = d(
      "This form of confirmPasswordReset(resetToken, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(resetToken, password, passwordConfirm, options?).",
      r,
      s,
      n
    ), this.client.send(this.baseCrudPath + "/confirm-password-reset", r).then(() => !0);
  }
}
const V = [
  "requestKey",
  "$cancelKey",
  "$autoCancel",
  "fetch",
  "headers",
  "body",
  "query",
  "params",
  // ---,
  "cache",
  "credentials",
  "headers",
  "integrity",
  "keepalive",
  "method",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "window"
];
function q(c) {
  if (c) {
    c.query = c.query || {};
    for (let i in c)
      V.includes(i) || (c.query[i] = c[i], delete c[i]);
  }
}
class A extends p {
  constructor() {
    super(...arguments);
    l(this, "clientId", "");
    l(this, "eventSource", null);
    l(this, "subscriptions", {});
    l(this, "lastSentSubscriptions", []);
    l(this, "connectTimeoutId");
    l(this, "maxConnectTimeout", 15e3);
    l(this, "reconnectTimeoutId");
    l(this, "reconnectAttempts", 0);
    l(this, "maxReconnectAttempts", 1 / 0);
    l(this, "predefinedReconnectIntervals", [
      200,
      300,
      500,
      1e3,
      1200,
      1500,
      2e3
    ]);
    l(this, "pendingConnects", []);
  }
  /**
   * Returns whether the realtime connection has been established.
   */
  get isConnected() {
    return !!this.eventSource && !!this.clientId && !this.pendingConnects.length;
  }
  /**
   * Register the subscription listener.
   *
   * You can subscribe multiple times to the same topic.
   *
   * If the SSE connection is not started yet,
   * this method will also initialize it.
   */
  async subscribe(e, t, s) {
    var o;
    if (!e)
      throw new Error("topic must be set.");
    let n = e;
    if (s) {
      q(s);
      const a = "options=" + encodeURIComponent(
        JSON.stringify({ query: s.query, headers: s.headers })
      );
      n += (n.includes("?") ? "&" : "?") + a;
    }
    const r = function(a) {
      const h = a;
      let u;
      try {
        u = JSON.parse(h == null ? void 0 : h.data);
      } catch {
      }
      t(u || {});
    };
    return this.subscriptions[n] || (this.subscriptions[n] = []), this.subscriptions[n].push(r), this.isConnected ? this.subscriptions[n].length === 1 ? await this.submitSubscriptions() : (o = this.eventSource) == null || o.addEventListener(n, r) : await this.connect(), async () => this.unsubscribeByTopicAndListener(e, r);
  }
  /**
   * Unsubscribe from all subscription listeners with the specified topic.
   *
   * If `topic` is not provided, then this method will unsubscribe
   * from all active subscriptions.
   *
   * This method is no-op if there are no active subscriptions.
   *
   * The related sse connection will be autoclosed if after the
   * unsubscribe operation there are no active subscriptions left.
   */
  async unsubscribe(e) {
    var s;
    let t = !1;
    if (!e)
      this.subscriptions = {};
    else {
      const n = this.getSubscriptionsByTopic(e);
      for (let r in n)
        if (this.hasSubscriptionListeners(r)) {
          for (let o of this.subscriptions[r])
            (s = this.eventSource) == null || s.removeEventListener(r, o);
          delete this.subscriptions[r], t || (t = !0);
        }
    }
    this.hasSubscriptionListeners() ? t && await this.submitSubscriptions() : this.disconnect();
  }
  /**
   * Unsubscribe from all subscription listeners starting with the specified topic prefix.
   *
   * This method is no-op if there are no active subscriptions with the specified topic prefix.
   *
   * The related sse connection will be autoclosed if after the
   * unsubscribe operation there are no active subscriptions left.
   */
  async unsubscribeByPrefix(e) {
    var s;
    let t = !1;
    for (let n in this.subscriptions)
      if ((n + "?").startsWith(e)) {
        t = !0;
        for (let r of this.subscriptions[n])
          (s = this.eventSource) == null || s.removeEventListener(n, r);
        delete this.subscriptions[n];
      }
    t && (this.hasSubscriptionListeners() ? await this.submitSubscriptions() : this.disconnect());
  }
  /**
   * Unsubscribe from all subscriptions matching the specified topic and listener function.
   *
   * This method is no-op if there are no active subscription with
   * the specified topic and listener.
   *
   * The related sse connection will be autoclosed if after the
   * unsubscribe operation there are no active subscriptions left.
   */
  async unsubscribeByTopicAndListener(e, t) {
    var r;
    let s = !1;
    const n = this.getSubscriptionsByTopic(e);
    for (let o in n) {
      if (!Array.isArray(this.subscriptions[o]) || !this.subscriptions[o].length)
        continue;
      let a = !1;
      for (let h = this.subscriptions[o].length - 1; h >= 0; h--)
        this.subscriptions[o][h] === t && (a = !0, delete this.subscriptions[o][h], this.subscriptions[o].splice(h, 1), (r = this.eventSource) == null || r.removeEventListener(o, t));
      a && (this.subscriptions[o].length || delete this.subscriptions[o], !s && !this.hasSubscriptionListeners(o) && (s = !0));
    }
    this.hasSubscriptionListeners() ? s && await this.submitSubscriptions() : this.disconnect();
  }
  hasSubscriptionListeners(e) {
    var t, s;
    if (this.subscriptions = this.subscriptions || {}, e)
      return !!((t = this.subscriptions[e]) != null && t.length);
    for (let n in this.subscriptions)
      if ((s = this.subscriptions[n]) != null && s.length)
        return !0;
    return !1;
  }
  async submitSubscriptions() {
    if (this.clientId)
      return this.addAllSubscriptionListeners(), this.lastSentSubscriptions = this.getNonEmptySubscriptionKeys(), this.client.send("/api/realtime", {
        method: "POST",
        body: {
          clientId: this.clientId,
          subscriptions: this.lastSentSubscriptions
        },
        requestKey: this.getSubscriptionsCancelKey()
      }).catch((e) => {
        if (!(e != null && e.isAbort))
          throw e;
      });
  }
  getSubscriptionsCancelKey() {
    return "realtime_" + this.clientId;
  }
  getSubscriptionsByTopic(e) {
    const t = {};
    e = e.includes("?") ? e : e + "?";
    for (let s in this.subscriptions)
      (s + "?").startsWith(e) && (t[s] = this.subscriptions[s]);
    return t;
  }
  getNonEmptySubscriptionKeys() {
    const e = [];
    for (let t in this.subscriptions)
      this.subscriptions[t].length && e.push(t);
    return e;
  }
  addAllSubscriptionListeners() {
    if (this.eventSource) {
      this.removeAllSubscriptionListeners();
      for (let e in this.subscriptions)
        for (let t of this.subscriptions[e])
          this.eventSource.addEventListener(e, t);
    }
  }
  removeAllSubscriptionListeners() {
    if (this.eventSource)
      for (let e in this.subscriptions)
        for (let t of this.subscriptions[e])
          this.eventSource.removeEventListener(e, t);
  }
  async connect() {
    if (!(this.reconnectAttempts > 0))
      return new Promise((e, t) => {
        this.pendingConnects.push({ resolve: e, reject: t }), !(this.pendingConnects.length > 1) && this.initConnect();
      });
  }
  initConnect() {
    this.disconnect(!0), clearTimeout(this.connectTimeoutId), this.connectTimeoutId = setTimeout(() => {
      this.connectErrorHandler(new Error("EventSource connect took too long."));
    }, this.maxConnectTimeout), this.eventSource = new EventSource(this.client.buildUrl("/api/realtime")), this.eventSource.onerror = (e) => {
      this.connectErrorHandler(
        new Error("Failed to establish realtime connection.")
      );
    }, this.eventSource.addEventListener("PB_CONNECT", (e) => {
      const t = e;
      this.clientId = t == null ? void 0 : t.lastEventId, this.submitSubscriptions().then(async () => {
        let s = 3;
        for (; this.hasUnsentSubscriptions() && s > 0; )
          s--, await this.submitSubscriptions();
      }).then(() => {
        for (let n of this.pendingConnects)
          n.resolve();
        this.pendingConnects = [], this.reconnectAttempts = 0, clearTimeout(this.reconnectTimeoutId), clearTimeout(this.connectTimeoutId);
        const s = this.getSubscriptionsByTopic("PB_CONNECT");
        for (let n in s)
          for (let r of s[n])
            r(e);
      }).catch((s) => {
        this.clientId = "", this.connectErrorHandler(s);
      });
    });
  }
  hasUnsentSubscriptions() {
    const e = this.getNonEmptySubscriptionKeys();
    if (e.length != this.lastSentSubscriptions.length)
      return !0;
    for (const t of e)
      if (!this.lastSentSubscriptions.includes(t))
        return !0;
    return !1;
  }
  connectErrorHandler(e) {
    if (clearTimeout(this.connectTimeoutId), clearTimeout(this.reconnectTimeoutId), // wasn't previously connected -> direct reject
    !this.clientId && !this.reconnectAttempts || // was previously connected but the max reconnection limit has been reached
    this.reconnectAttempts > this.maxReconnectAttempts) {
      for (let s of this.pendingConnects)
        s.reject(new f(e));
      this.pendingConnects = [], this.disconnect();
      return;
    }
    this.disconnect(!0);
    const t = this.predefinedReconnectIntervals[this.reconnectAttempts] || this.predefinedReconnectIntervals[this.predefinedReconnectIntervals.length - 1];
    this.reconnectAttempts++, this.reconnectTimeoutId = setTimeout(() => {
      this.initConnect();
    }, t);
  }
  disconnect(e = !1) {
    var t;
    if (clearTimeout(this.connectTimeoutId), clearTimeout(this.reconnectTimeoutId), this.removeAllSubscriptionListeners(), this.client.cancelRequest(this.getSubscriptionsCancelKey()), (t = this.eventSource) == null || t.close(), this.eventSource = null, this.clientId = "", !e) {
      this.reconnectAttempts = 0;
      for (let s of this.pendingConnects)
        s.resolve();
      this.pendingConnects = [];
    }
  }
}
class z extends T {
  constructor(e, t) {
    super(e);
    l(this, "collectionIdOrName");
    this.collectionIdOrName = t;
  }
  /**
   * @inheritdoc
   */
  get baseCrudPath() {
    return this.baseCollectionPath + "/records";
  }
  /**
   * Returns the current collection service base path.
   */
  get baseCollectionPath() {
    return "/api/collections/" + encodeURIComponent(this.collectionIdOrName);
  }
  // ---------------------------------------------------------------
  // Realtime handlers
  // ---------------------------------------------------------------
  /**
   * Subscribe to realtime changes to the specified topic ("*" or record id).
   *
   * If `topic` is the wildcard "*", then this method will subscribe to
   * any record changes in the collection.
   *
   * If `topic` is a record id, then this method will subscribe only
   * to changes of the specified record id.
   *
   * It's OK to subscribe multiple times to the same topic.
   * You can use the returned `UnsubscribeFunc` to remove only a single subscription.
   * Or use `unsubscribe(topic)` if you want to remove all subscriptions attached to the topic.
   */
  async subscribe(e, t, s) {
    if (!e)
      throw new Error("Missing topic.");
    if (!t)
      throw new Error("Missing subscription callback.");
    return this.client.realtime.subscribe(
      this.collectionIdOrName + "/" + e,
      t,
      s
    );
  }
  /**
   * Unsubscribe from all subscriptions of the specified topic
   * ("*" or record id).
   *
   * If `topic` is not set, then this method will unsubscribe from
   * all subscriptions associated to the current collection.
   */
  async unsubscribe(e) {
    return e ? this.client.realtime.unsubscribe(
      this.collectionIdOrName + "/" + e
    ) : this.client.realtime.unsubscribeByPrefix(this.collectionIdOrName);
  }
  /**
   * @inheritdoc
   */
  async getFullList(e, t) {
    if (typeof e == "number")
      return super.getFullList(e, t);
    const s = Object.assign({}, e, t);
    return super.getFullList(s);
  }
  /**
   * @inheritdoc
   */
  async getList(e = 1, t = 30, s) {
    return super.getList(e, t, s);
  }
  /**
   * @inheritdoc
   */
  async getFirstListItem(e, t) {
    return super.getFirstListItem(e, t);
  }
  /**
   * @inheritdoc
   */
  async getOne(e, t) {
    return super.getOne(e, t);
  }
  /**
   * @inheritdoc
   */
  async create(e, t) {
    return super.create(e, t);
  }
  /**
   * @inheritdoc
   *
   * If the current `client.authStore.model` matches with the updated id, then
   * on success the `client.authStore.model` will be updated with the result.
   */
  async update(e, t, s) {
    return super.update(e, t, s).then((n) => {
      var r, o, a;
      return (
        // is record auth
        ((r = this.client.authStore.model) == null ? void 0 : r.id) === (n == null ? void 0 : n.id) && (((o = this.client.authStore.model) == null ? void 0 : o.collectionId) === this.collectionIdOrName || ((a = this.client.authStore.model) == null ? void 0 : a.collectionName) === this.collectionIdOrName) && this.client.authStore.save(this.client.authStore.token, n), n
      );
    });
  }
  /**
   * @inheritdoc
   *
   * If the current `client.authStore.model` matches with the deleted id,
   * then on success the `client.authStore` will be cleared.
   */
  async delete(e, t) {
    return super.delete(e, t).then((s) => {
      var n, r, o;
      return s && // is record auth
      ((n = this.client.authStore.model) == null ? void 0 : n.id) === e && (((r = this.client.authStore.model) == null ? void 0 : r.collectionId) === this.collectionIdOrName || ((o = this.client.authStore.model) == null ? void 0 : o.collectionName) === this.collectionIdOrName) && this.client.authStore.clear(), s;
    });
  }
  // ---------------------------------------------------------------
  // Auth handlers
  // ---------------------------------------------------------------
  /**
   * Prepare successful collection authorization response.
   */
  authResponse(e) {
    const t = this.decode((e == null ? void 0 : e.record) || {});
    return this.client.authStore.save(e == null ? void 0 : e.token, t), Object.assign({}, e, {
      // normalize common fields
      token: (e == null ? void 0 : e.token) || "",
      record: t
    });
  }
  /**
   * Returns all available collection auth methods.
   *
   * @throws {ClientResponseError}
   */
  async listAuthMethods(e) {
    return e = Object.assign(
      {
        method: "GET"
      },
      e
    ), this.client.send(this.baseCollectionPath + "/auth-methods", e).then((t) => Object.assign({}, t, {
      // normalize common fields
      usernamePassword: !!(t != null && t.usernamePassword),
      emailPassword: !!(t != null && t.emailPassword),
      authProviders: Array.isArray(t == null ? void 0 : t.authProviders) ? t == null ? void 0 : t.authProviders : []
    }));
  }
  async authWithPassword(e, t, s, n) {
    let r = {
      method: "POST",
      body: {
        identity: e,
        password: t
      }
    };
    return r = d(
      "This form of authWithPassword(usernameOrEmail, pass, body?, query?) is deprecated. Consider replacing it with authWithPassword(usernameOrEmail, pass, options?).",
      r,
      s,
      n
    ), this.client.send(this.baseCollectionPath + "/auth-with-password", r).then((o) => this.authResponse(o));
  }
  async authWithOAuth2Code(e, t, s, n, r, o, a) {
    let h = {
      method: "POST",
      body: {
        provider: e,
        code: t,
        codeVerifier: s,
        redirectUrl: n,
        createData: r
      }
    };
    return h = d(
      "This form of authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createData?, body?, query?) is deprecated. Consider replacing it with authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createData?, options?).",
      h,
      o,
      a
    ), this.client.send(this.baseCollectionPath + "/auth-with-oauth2", h).then((u) => this.authResponse(u));
  }
  async authWithOAuth2(...e) {
    if (e.length > 1 || typeof (e == null ? void 0 : e[0]) == "string")
      return console.warn(
        "PocketBase: This form of authWithOAuth2() is deprecated and may get removed in the future. Please replace with authWithOAuth2Code() OR use the authWithOAuth2() realtime form as shown in https://pocketbase.io/docs/authentication/#oauth2-integration."
      ), this.authWithOAuth2Code(
        (e == null ? void 0 : e[0]) || "",
        (e == null ? void 0 : e[1]) || "",
        (e == null ? void 0 : e[2]) || "",
        (e == null ? void 0 : e[3]) || "",
        (e == null ? void 0 : e[4]) || {},
        (e == null ? void 0 : e[5]) || {},
        (e == null ? void 0 : e[6]) || {}
      );
    const t = (e == null ? void 0 : e[0]) || {}, n = (await this.listAuthMethods()).authProviders.find(
      (u) => u.name === t.provider
    );
    if (!n)
      throw new f(
        new Error(`Missing or invalid provider "${t.provider}".`)
      );
    const r = this.client.buildUrl("/api/oauth2-redirect"), o = new A(this.client);
    let a = null;
    t.urlCallback || (a = I(void 0));
    function h() {
      a == null || a.close(), o.unsubscribe();
    }
    return new Promise(async (u, m) => {
      var S;
      try {
        await o.subscribe("@oauth2", async (b) => {
          const x = o.clientId;
          try {
            if (!b.state || x !== b.state)
              throw new Error("State parameters don't match.");
            if (b.error || !b.code)
              throw new Error(
                "OAuth2 redirect error or missing code: " + b.error
              );
            const g = Object.assign({}, t);
            delete g.provider, delete g.scopes, delete g.createData, delete g.urlCallback;
            const L = await this.authWithOAuth2Code(
              n.name,
              b.code,
              n.codeVerifier,
              r,
              t.createData,
              g
            );
            u(L);
          } catch (g) {
            m(new f(g));
          }
          h();
        });
        const y = {
          state: o.clientId
        };
        (S = t.scopes) != null && S.length && (y.scope = t.scopes.join(" "));
        const j = this._replaceQueryParams(
          n.authUrl + r,
          y
        );
        await (t.urlCallback || function(b) {
          a ? a.location.href = b : a = I(b);
        })(j);
      } catch (y) {
        h(), m(new f(y));
      }
    });
  }
  async authRefresh(e, t) {
    let s = {
      method: "POST"
    };
    return s = d(
      "This form of authRefresh(body?, query?) is deprecated. Consider replacing it with authRefresh(options?).",
      s,
      e,
      t
    ), this.client.send(this.baseCollectionPath + "/auth-refresh", s).then((n) => this.authResponse(n));
  }
  async requestPasswordReset(e, t, s) {
    let n = {
      method: "POST",
      body: {
        email: e
      }
    };
    return n = d(
      "This form of requestPasswordReset(email, body?, query?) is deprecated. Consider replacing it with requestPasswordReset(email, options?).",
      n,
      t,
      s
    ), this.client.send(this.baseCollectionPath + "/request-password-reset", n).then(() => !0);
  }
  async confirmPasswordReset(e, t, s, n, r) {
    let o = {
      method: "POST",
      body: {
        token: e,
        password: t,
        passwordConfirm: s
      }
    };
    return o = d(
      "This form of confirmPasswordReset(token, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(token, password, passwordConfirm, options?).",
      o,
      n,
      r
    ), this.client.send(this.baseCollectionPath + "/confirm-password-reset", o).then(() => !0);
  }
  async requestVerification(e, t, s) {
    let n = {
      method: "POST",
      body: {
        email: e
      }
    };
    return n = d(
      "This form of requestVerification(email, body?, query?) is deprecated. Consider replacing it with requestVerification(email, options?).",
      n,
      t,
      s
    ), this.client.send(this.baseCollectionPath + "/request-verification", n).then(() => !0);
  }
  async confirmVerification(e, t, s) {
    let n = {
      method: "POST",
      body: {
        token: e
      }
    };
    return n = d(
      "This form of confirmVerification(token, body?, query?) is deprecated. Consider replacing it with confirmVerification(token, options?).",
      n,
      t,
      s
    ), this.client.send(this.baseCollectionPath + "/confirm-verification", n).then(() => {
      const r = w(e), o = this.client.authStore.model;
      return o && !o.verified && o.id === r.id && o.collectionId === r.collectionId && (o.verified = !0, this.client.authStore.save(this.client.authStore.token, o)), !0;
    });
  }
  async requestEmailChange(e, t, s) {
    let n = {
      method: "POST",
      body: {
        newEmail: e
      }
    };
    return n = d(
      "This form of requestEmailChange(newEmail, body?, query?) is deprecated. Consider replacing it with requestEmailChange(newEmail, options?).",
      n,
      t,
      s
    ), this.client.send(this.baseCollectionPath + "/request-email-change", n).then(() => !0);
  }
  async confirmEmailChange(e, t, s, n) {
    let r = {
      method: "POST",
      body: {
        token: e,
        password: t
      }
    };
    return r = d(
      "This form of confirmEmailChange(token, password, body?, query?) is deprecated. Consider replacing it with confirmEmailChange(token, password, options?).",
      r,
      s,
      n
    ), this.client.send(this.baseCollectionPath + "/confirm-email-change", r).then(() => {
      const o = w(e), a = this.client.authStore.model;
      return a && a.id === o.id && a.collectionId === o.collectionId && this.client.authStore.clear(), !0;
    });
  }
  /**
   * Lists all linked external auth providers for the specified auth record.
   *
   * @throws {ClientResponseError}
   */
  async listExternalAuths(e, t) {
    return t = Object.assign(
      {
        method: "GET"
      },
      t
    ), this.client.send(
      this.baseCrudPath + "/" + encodeURIComponent(e) + "/external-auths",
      t
    );
  }
  /**
   * Unlink a single external auth provider from the specified auth record.
   *
   * @throws {ClientResponseError}
   */
  async unlinkExternalAuth(e, t, s) {
    return s = Object.assign(
      {
        method: "DELETE"
      },
      s
    ), this.client.send(
      this.baseCrudPath + "/" + encodeURIComponent(e) + "/external-auths/" + encodeURIComponent(t),
      s
    ).then(() => !0);
  }
  // ---------------------------------------------------------------
  // very rudimentary url query params replacement because at the moment
  // URL (and URLSearchParams) doesn't seem to be fully supported in React Native
  //
  // note: for details behind some of the decode/encode parsing check https://unixpapa.com/js/querystring.html
  _replaceQueryParams(e, t = {}) {
    let s = e, n = "";
    e.indexOf("?") >= 0 && (s = e.substring(0, e.indexOf("?")), n = e.substring(e.indexOf("?") + 1));
    const o = {}, a = n.split("&");
    for (const h of a) {
      if (h == "")
        continue;
      const u = h.split("=");
      o[decodeURIComponent(u[0].replace(/\+/g, " "))] = decodeURIComponent((u[1] || "").replace(/\+/g, " "));
    }
    for (let h in t)
      t.hasOwnProperty(h) && (t[h] == null ? delete o[h] : o[h] = t[h]);
    n = "";
    for (let h in o)
      o.hasOwnProperty(h) && (n != "" && (n += "&"), n += encodeURIComponent(h.replace(/%20/g, "+")) + "=" + encodeURIComponent(o[h].replace(/%20/g, "+")));
    return n != "" ? s + "?" + n : s;
  }
}
function I(c) {
  if (typeof window > "u" || !(window != null && window.open))
    throw new f(
      new Error(
        "Not in a browser context - please pass a custom urlCallback function."
      )
    );
  let i = 1024, e = 768, t = window.innerWidth, s = window.innerHeight;
  i = i > t ? t : i, e = e > s ? s : e;
  let n = t / 2 - i / 2, r = s / 2 - e / 2;
  return window.open(
    c,
    "popup_window",
    "width=" + i + ",height=" + e + ",top=" + r + ",left=" + n + ",resizable,menubar=no"
  );
}
class M extends T {
  /**
   * @inheritdoc
   */
  get baseCrudPath() {
    return "/api/collections";
  }
  /**
   * Imports the provided collections.
   *
   * If `deleteMissing` is `true`, all local collections and schema fields,
   * that are not present in the imported configuration, WILL BE DELETED
   * (including their related records data)!
   *
   * @throws {ClientResponseError}
   */
  async import(i, e = !1, t) {
    return t = Object.assign(
      {
        method: "PUT",
        body: {
          collections: i,
          deleteMissing: e
        }
      },
      t
    ), this.client.send(this.baseCrudPath + "/import", t).then(() => !0);
  }
}
class Q extends p {
  /**
   * Returns paginated logs list.
   *
   * @throws {ClientResponseError}
   */
  async getList(i = 1, e = 30, t) {
    return t = Object.assign({ method: "GET" }, t), t.query = Object.assign(
      {
        page: i,
        perPage: e
      },
      t.query
    ), this.client.send("/api/logs", t);
  }
  /**
   * Returns a single log by its id.
   *
   * If `id` is empty it will throw a 404 error.
   *
   * @throws {ClientResponseError}
   */
  async getOne(i, e) {
    if (!i)
      throw new f({
        url: this.client.buildUrl("/api/logs/"),
        status: 404,
        response: {
          code: 404,
          message: "Missing required log id.",
          data: {}
        }
      });
    return e = Object.assign(
      {
        method: "GET"
      },
      e
    ), this.client.send("/api/logs/" + encodeURIComponent(i), e);
  }
  /**
   * Returns logs statistics.
   *
   * @throws {ClientResponseError}
   */
  async getStats(i) {
    return i = Object.assign(
      {
        method: "GET"
      },
      i
    ), this.client.send("/api/logs/stats", i);
  }
}
class Y extends p {
  /**
   * Checks the health status of the api.
   *
   * @throws {ClientResponseError}
   */
  async check(i) {
    return i = Object.assign(
      {
        method: "GET"
      },
      i
    ), this.client.send("/api/health", i);
  }
}
class X extends p {
  /**
   * Builds and returns an absolute record file url for the provided filename.
   */
  getUrl(i, e, t = {}) {
    if (!e || !(i != null && i.id) || !(i != null && i.collectionId || i != null && i.collectionName))
      return "";
    const s = [];
    s.push("api"), s.push("files"), s.push(encodeURIComponent(i.collectionId || i.collectionName)), s.push(encodeURIComponent(i.id)), s.push(encodeURIComponent(e));
    let n = this.client.buildUrl(s.join("/"));
    if (Object.keys(t).length) {
      t.download === !1 && delete t.download;
      const r = new URLSearchParams(t);
      n += (n.includes("?") ? "&" : "?") + r;
    }
    return n;
  }
  /**
   * Requests a new private file access token for the current auth model (admin or record).
   *
   * @throws {ClientResponseError}
   */
  async getToken(i) {
    return i = Object.assign(
      {
        method: "POST"
      },
      i
    ), this.client.send("/api/files/token", i).then((e) => (e == null ? void 0 : e.token) || "");
  }
}
class Z extends p {
  /**
   * Returns list with all available backup files.
   *
   * @throws {ClientResponseError}
   */
  async getFullList(i) {
    return i = Object.assign(
      {
        method: "GET"
      },
      i
    ), this.client.send("/api/backups", i);
  }
  /**
   * Initializes a new backup.
   *
   * @throws {ClientResponseError}
   */
  async create(i, e) {
    return e = Object.assign(
      {
        method: "POST",
        body: {
          name: i
        }
      },
      e
    ), this.client.send("/api/backups", e).then(() => !0);
  }
  /**
   * Uploads an existing backup file.
   *
   * Example:
   *
   * ```js
   * await pb.backups.upload({
   *     file: new Blob([...]),
   * });
   * ```
   *
   * @throws {ClientResponseError}
   */
  async upload(i, e) {
    return e = Object.assign(
      {
        method: "POST",
        body: i
      },
      e
    ), this.client.send("/api/backups/upload", e).then(() => !0);
  }
  /**
   * Deletes a single backup file.
   *
   * @throws {ClientResponseError}
   */
  async delete(i, e) {
    return e = Object.assign(
      {
        method: "DELETE"
      },
      e
    ), this.client.send(`/api/backups/${encodeURIComponent(i)}`, e).then(() => !0);
  }
  /**
   * Initializes an app data restore from an existing backup.
   *
   * @throws {ClientResponseError}
   */
  async restore(i, e) {
    return e = Object.assign(
      {
        method: "POST"
      },
      e
    ), this.client.send(`/api/backups/${encodeURIComponent(i)}/restore`, e).then(() => !0);
  }
  /**
   * Builds a download url for a single existing backup using an
   * admin file token and the backup file key.
   *
   * The file token can be generated via `pb.files.getToken()`.
   */
  getDownloadUrl(i, e) {
    return this.client.buildUrl(
      `/api/backups/${encodeURIComponent(e)}?token=${encodeURIComponent(i)}`
    );
  }
}
class te {
  constructor(i = "/", e, t = "en-US") {
    /**
     * The base PocketBase backend url address (eg. 'http://127.0.0.1.8090').
     */
    l(this, "baseUrl");
    /**
     * Hook that get triggered right before sending the fetch request,
     * allowing you to inspect and modify the url and request options.
     *
     * For list of the possible options check https://developer.mozilla.org/en-US/docs/Web/API/fetch#options
     *
     * You can return a non-empty result object `{ url, options }` to replace the url and request options entirely.
     *
     * Example:
     * ```js
     * client.beforeSend = function (url, options) {
     *     options.headers = Object.assign({}, options.headers, {
     *         'X-Custom-Header': 'example',
     *     });
     *
     *     return { url, options }
     * };
     * ```
     */
    l(this, "beforeSend");
    /**
     * Hook that get triggered after successfully sending the fetch request,
     * allowing you to inspect/modify the response object and its parsed data.
     *
     * Returns the new Promise resolved `data` that will be returned to the client.
     *
     * Example:
     * ```js
     * client.afterSend = function (response, data) {
     *     if (response.status != 200) {
     *         throw new ClientResponseError({
     *             url:      response.url,
     *             status:   response.status,
     *             response: { ... },
     *         });
     *     }
     *
     *     return data;
     * };
     * ```
     */
    l(this, "afterSend");
    /**
     * Optional language code (default to `en-US`) that will be sent
     * with the requests to the server as `Accept-Language` header.
     */
    l(this, "lang");
    /**
     * A replaceable instance of the local auth store service.
     */
    l(this, "authStore");
    /**
     * An instance of the service that handles the **Settings APIs**.
     */
    l(this, "settings");
    /**
     * An instance of the service that handles the **Admin APIs**.
     */
    l(this, "admins");
    /**
     * An instance of the service that handles the **Collection APIs**.
     */
    l(this, "collections");
    /**
     * An instance of the service that handles the **File APIs**.
     */
    l(this, "files");
    /**
     * An instance of the service that handles the **Log APIs**.
     */
    l(this, "logs");
    /**
     * An instance of the service that handles the **Realtime APIs**.
     */
    l(this, "realtime");
    /**
     * An instance of the service that handles the **Health APIs**.
     */
    l(this, "health");
    /**
     * An instance of the service that handles the **Backup APIs**.
     */
    l(this, "backups");
    l(this, "cancelControllers", {});
    l(this, "recordServices", {});
    l(this, "enableAutoCancellation", !0);
    this.baseUrl = i, this.lang = t, this.authStore = e || new $(), this.admins = new G(this), this.collections = new M(this), this.files = new X(this), this.logs = new Q(this), this.settings = new H(this), this.realtime = new A(this), this.health = new Y(this), this.backups = new Z(this);
  }
  /**
   * Returns the RecordService associated to the specified collection.
   *
   * @param  {string} idOrName
   * @return {RecordService}
   */
  collection(i) {
    return this.recordServices[i] || (this.recordServices[i] = new z(this, i)), this.recordServices[i];
  }
  /**
   * Globally enable or disable auto cancellation for pending duplicated requests.
   */
  autoCancellation(i) {
    return this.enableAutoCancellation = !!i, this;
  }
  /**
   * Cancels single request by its cancellation key.
   */
  cancelRequest(i) {
    return this.cancelControllers[i] && (this.cancelControllers[i].abort(), delete this.cancelControllers[i]), this;
  }
  /**
   * Cancels all pending requests.
   */
  cancelAllRequests() {
    for (let i in this.cancelControllers)
      this.cancelControllers[i].abort();
    return this.cancelControllers = {}, this;
  }
  /**
   * Constructs a filter expression with placeholders populated from a parameters object.
   *
   * Placeholder parameters are defined with the `{:paramName}` notation.
   *
   * The following parameter values are supported:
   *
   * - `string` (_single quotes are autoescaped_)
   * - `number`
   * - `boolean`
   * - `Date` object (_stringified into the PocketBase datetime format_)
   * - `null`
   * - everything else is converted to a string using `JSON.stringify()`
   *
   * Example:
   *
   * ```js
   * pb.collection("example").getFirstListItem(pb.filter(
   *    'title ~ {:title} && created >= {:created}',
   *    { title: "example", created: new Date()}
   * ))
   * ```
   */
  filter(i, e) {
    if (!e)
      return i;
    for (let t in e) {
      let s = e[t];
      switch (typeof s) {
        case "boolean":
        case "number":
          s = "" + s;
          break;
        case "string":
          s = "'" + s.replace(/'/g, "\\'") + "'";
          break;
        default:
          s === null ? s = "null" : s instanceof Date ? s = "'" + s.toISOString().replace("T", " ") + "'" : s = "'" + JSON.stringify(s).replace(/'/g, "\\'") + "'";
      }
      i = i.replaceAll("{:" + t + "}", s);
    }
    return i;
  }
  /**
   * Legacy alias of `pb.files.getUrl()`.
   */
  getFileUrl(i, e, t = {}) {
    return this.files.getUrl(i, e, t);
  }
  /**
   * Builds a full client url by safely concatenating the provided path.
   */
  buildUrl(i) {
    var t;
    let e = this.baseUrl;
    return typeof window < "u" && window.location && !e.startsWith("https://") && !e.startsWith("http://") && (e = (t = window.location.origin) != null && t.endsWith("/") ? window.location.origin.substring(0, window.location.origin.length - 1) : window.location.origin || "", this.baseUrl.startsWith("/") || (e += window.location.pathname || "/", e += e.endsWith("/") ? "" : "/"), e += this.baseUrl), i && (e += e.endsWith("/") ? "" : "/", e += i.startsWith("/") ? i.substring(1) : i), e;
  }
  /**
   * Sends an api http request.
   *
   * @throws {ClientResponseError}
   */
  async send(i, e) {
    e = this.initSendOptions(i, e);
    let t = this.buildUrl(i);
    if (this.beforeSend) {
      const n = Object.assign({}, await this.beforeSend(t, e));
      typeof n.url < "u" || typeof n.options < "u" ? (t = n.url || t, e = n.options || e) : Object.keys(n).length && (e = n, console != null && console.warn && console.warn(
        "Deprecated format of beforeSend return: please use `return { url, options }`, instead of `return options`."
      ));
    }
    if (typeof e.query < "u") {
      const n = this.serializeQueryParams(e.query);
      n && (t += (t.includes("?") ? "&" : "?") + n), delete e.query;
    }
    return this.getHeader(e.headers, "Content-Type") == "application/json" && e.body && typeof e.body != "string" && (e.body = JSON.stringify(e.body)), (e.fetch || fetch)(t, e).then(async (n) => {
      let r = {};
      try {
        r = await n.json();
      } catch {
      }
      if (this.afterSend && (r = await this.afterSend(n, r)), n.status >= 400)
        throw new f({
          url: n.url,
          status: n.status,
          data: r
        });
      return r;
    }).catch((n) => {
      throw new f(n);
    });
  }
  /**
   * Shallow copy the provided object and takes care to initialize
   * any options required to preserve the backward compatability.
   *
   * @param  {SendOptions} options
   * @return {SendOptions}
   */
  initSendOptions(i, e) {
    if (e = Object.assign({ method: "GET" }, e), e.body = this.convertToFormDataIfNeeded(e.body), q(e), e.query = Object.assign({}, e.params, e.query), typeof e.requestKey > "u" && (e.$autoCancel === !1 || e.query.$autoCancel === !1 ? e.requestKey = null : (e.$cancelKey || e.query.$cancelKey) && (e.requestKey = e.$cancelKey || e.query.$cancelKey)), delete e.$autoCancel, delete e.query.$autoCancel, delete e.$cancelKey, delete e.query.$cancelKey, this.getHeader(e.headers, "Content-Type") === null && !this.isFormData(e.body) && (e.headers = Object.assign({}, e.headers, {
      "Content-Type": "application/json"
    })), this.getHeader(e.headers, "Accept-Language") === null && (e.headers = Object.assign({}, e.headers, {
      "Accept-Language": this.lang
    })), // has valid token
    this.authStore.token && // auth header is not explicitly set
    this.getHeader(e.headers, "Authorization") === null && (e.headers = Object.assign({}, e.headers, {
      Authorization: this.authStore.token
    })), this.enableAutoCancellation && e.requestKey !== null) {
      const t = e.requestKey || (e.method || "GET") + i;
      delete e.requestKey, this.cancelRequest(t);
      const s = new AbortController();
      this.cancelControllers[t] = s, e.signal = s.signal;
    }
    return e;
  }
  /**
   * Converts analyzes the provided body and converts it to FormData
   * in case a plain object with File/Blob values is used.
   */
  convertToFormDataIfNeeded(i) {
    if (typeof FormData > "u" || typeof i > "u" || typeof i != "object" || i === null || this.isFormData(i) || !this.hasBlobField(i))
      return i;
    const e = new FormData();
    for (const t in i) {
      const s = i[t];
      if (typeof s == "object" && !this.hasBlobField({ data: s })) {
        let n = {};
        n[t] = s, e.append("@jsonPayload", JSON.stringify(n));
      } else {
        const n = Array.isArray(s) ? s : [s];
        for (let r of n)
          e.append(t, r);
      }
    }
    return e;
  }
  /**
   * Checks if the submitted body object has at least one Blob/File field.
   */
  hasBlobField(i) {
    for (const e in i) {
      const t = Array.isArray(i[e]) ? i[e] : [i[e]];
      for (const s of t)
        if (typeof Blob < "u" && s instanceof Blob || typeof File < "u" && s instanceof File)
          return !0;
    }
    return !1;
  }
  /**
   * Extracts the header with the provided name in case-insensitive manner.
   * Returns `null` if no header matching the name is found.
   */
  getHeader(i, e) {
    i = i || {}, e = e.toLowerCase();
    for (let t in i)
      if (t.toLowerCase() == e)
        return i[t];
    return null;
  }
  /**
   * Loosely checks if the specified body is a FormData instance.
   */
  isFormData(i) {
    return i && // we are checking the constructor name because FormData
    // is not available natively in some environments and the
    // polyfill(s) may not be globally accessible
    (i.constructor.name === "FormData" || // fallback to global FormData instance check
    // note: this is needed because the constructor.name could be different in case of
    //       custom global FormData implementation, eg. React Native on Android/iOS
    typeof FormData < "u" && i instanceof FormData);
  }
  /**
   * Serializes the provided query parameters into a query string.
   */
  serializeQueryParams(i) {
    const e = [];
    for (const t in i) {
      if (i[t] === null)
        continue;
      const s = i[t], n = encodeURIComponent(t);
      if (Array.isArray(s))
        for (const r of s)
          e.push(n + "=" + encodeURIComponent(r));
      else
        s instanceof Date ? e.push(n + "=" + encodeURIComponent(s.toISOString())) : typeof s !== null && typeof s == "object" ? e.push(n + "=" + encodeURIComponent(JSON.stringify(s))) : e.push(n + "=" + encodeURIComponent(s));
    }
    return e.join("&");
  }
}
class ie extends R {
  constructor(e) {
    super();
    l(this, "saveFunc");
    l(this, "clearFunc");
    l(this, "queue", []);
    this.saveFunc = e.save, this.clearFunc = e.clear, this._enqueue(() => this._loadInitial(e.initial));
  }
  /**
   * @inheritdoc
   */
  save(e, t) {
    super.save(e, t);
    let s = "";
    try {
      s = JSON.stringify({ token: e, model: t });
    } catch {
      console.warn("AsyncAuthStore: failed to stringify the new state");
    }
    this._enqueue(() => this.saveFunc(s));
  }
  /**
   * @inheritdoc
   */
  clear() {
    super.clear(), this.clearFunc ? this._enqueue(() => this.clearFunc()) : this._enqueue(() => this.saveFunc(""));
  }
  /**
   * Initializes the auth store state.
   */
  async _loadInitial(e) {
    try {
      if (e = await e, e) {
        let t;
        typeof e == "string" ? t = JSON.parse(e) || {} : typeof e == "object" && (t = e), this.save(t.token || "", t.model || null);
      }
    } catch {
    }
  }
  /**
   * Appends an async function to the queue.
   */
  _enqueue(e) {
    this.queue.push(e), this.queue.length == 1 && this._dequeue();
  }
  /**
   * Starts the queue processing.
   */
  _dequeue() {
    this.queue.length && this.queue[0]().finally(() => {
      this.queue.shift(), this.queue.length && this._dequeue();
    });
  }
}
export {
  G as AdminService,
  ie as AsyncAuthStore,
  R as BaseAuthStore,
  te as Client,
  f as ClientResponseError,
  M as CollectionService,
  T as CrudService,
  Y as HealthService,
  $ as LocalAuthStore,
  Q as LogService,
  A as RealtimeService,
  z as RecordService,
  F as cookieParse,
  v as cookieSerialize,
  w as getTokenPayload,
  E as isTokenExpired,
  q as normalizeUnknownQueryParams
};
