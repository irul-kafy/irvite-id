/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test, { mock } from "node:test";
import assert from "node:assert";
import Module from "node:module";

let currentToken: string | undefined = "mock-token";

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === "next/headers") {
    return {
      cookies: async () => ({
        get: (name: string) =>
          name === "auth_token" && currentToken
            ? { value: currentToken }
            : undefined,
        delete: () => {},
      }),
    };
  }
  return origRequire.apply(this, arguments);
};

const { GET: StaffGet, POST: StaffPost } = require("./route");
const { GET: StaffDetailGet, PATCH: StaffPatch } = require("./[staffId]/route");
const { PATCH: PasswordPatch } = require("./[staffId]/password/route");

// 1. no cookie -> 401
test("BFF rejects unauthenticated requests with 401 when no auth_token cookie", async () => {
  currentToken = undefined;

  // GET /api/staff
  const getReq = new Request("http://localhost/api/staff", { method: "GET" });
  const getRes = await StaffGet(getReq);
  assert.strictEqual(getRes.status, 401);

  // POST /api/staff
  const postReq = new Request("http://localhost/api/staff", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "password1234" }),
  });
  const postRes = await StaffPost(postReq);
  assert.strictEqual(postRes.status, 401);

  // GET /api/staff/:id
  const detailReq = new Request("http://localhost/api/staff/s1", { method: "GET" });
  const detailRes = await StaffDetailGet(detailReq, {
    params: Promise.resolve({ staffId: "s1" }),
  });
  assert.strictEqual(detailRes.status, 401);

  // PATCH /api/staff/:id
  const patchReq = new Request("http://localhost/api/staff/s1", {
    method: "PATCH",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ email: "test@example.com" }),
  });
  const patchRes = await StaffPatch(patchReq, {
    params: Promise.resolve({ staffId: "s1" }),
  });
  assert.strictEqual(patchRes.status, 401);

  // PATCH /api/staff/:id/password
  const passReq = new Request("http://localhost/api/staff/s1/password", {
    method: "PATCH",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ password: "password1234" }),
  });
  const passRes = await PasswordPatch(passReq, {
    params: Promise.resolve({ staffId: "s1" }),
  });
  assert.strictEqual(passRes.status, 401);

  currentToken = "mock-token";
});

// 2. upstream 401: response 401 & auth_token is cleared
test("BFF clears auth_token cookie and returns 401 when upstream responds with 401", async () => {
  mock.method(global, "fetch", async () => {
    return new Response(JSON.stringify({ message: "Unauthorized token" }), {
      status: 401,
    });
  });

  // GET /api/staff
  const getReq = new Request("http://localhost/api/staff", { method: "GET" });
  const getRes = await StaffGet(getReq);
  assert.strictEqual(getRes.status, 401);
  const getCookie = getRes.cookies.get("auth_token");
  assert.ok(getCookie, "auth_token cookie must be present in response");
  assert.strictEqual(getCookie.value, "", "auth_token value must be empty (deleted)");

  // POST /api/staff
  const postReq = new Request("http://localhost/api/staff", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ email: "s@test.com", password: "password1234" }),
  });
  const postRes = await StaffPost(postReq);
  assert.strictEqual(postRes.status, 401);
  const postCookie = postRes.cookies.get("auth_token");
  assert.ok(postCookie);
  assert.strictEqual(postCookie.value, "");

  // PATCH /api/staff/:id
  const patchReq = new Request("http://localhost/api/staff/s1", {
    method: "PATCH",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ email: "s@test.com" }),
  });
  const patchRes = await StaffPatch(patchReq, {
    params: Promise.resolve({ staffId: "s1" }),
  });
  assert.strictEqual(patchRes.status, 401);
  const patchCookie = patchRes.cookies.get("auth_token");
  assert.ok(patchCookie);
  assert.strictEqual(patchCookie.value, "");

  // PATCH /api/staff/:id/password
  const passReq = new Request("http://localhost/api/staff/s1/password", {
    method: "PATCH",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ password: "password1234" }),
  });
  const passRes = await PasswordPatch(passReq, {
    params: Promise.resolve({ staffId: "s1" }),
  });
  assert.strictEqual(passRes.status, 401);
  const passCookie = passRes.cookies.get("auth_token");
  assert.ok(passCookie);
  assert.strictEqual(passCookie.value, "");

  mock.reset();
});

// 3. upstream 403 passthrough
test("BFF passes through upstream 403 Forbidden", async () => {
  mock.method(global, "fetch", async () => {
    return new Response(JSON.stringify({ message: "Forbidden role" }), {
      status: 403,
    });
  });

  const getReq = new Request("http://localhost/api/staff", { method: "GET" });
  const getRes = await StaffGet(getReq);
  assert.strictEqual(getRes.status, 403);

  const postReq = new Request("http://localhost/api/staff", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ email: "s@test.com", password: "password1234" }),
  });
  const postRes = await StaffPost(postReq);
  assert.strictEqual(postRes.status, 403);

  mock.reset();
});

// 4. GET detail upstream 404 passthrough
test("BFF GET detail passes through upstream 404 Not Found", async () => {
  mock.method(
    global,
    "fetch",
    async () =>
      new Response(JSON.stringify({ message: "Staff not found" }), {
        status: 404,
      }),
  );
  const req = new Request("http://localhost/api/staff/unknown-id", {
    method: "GET",
  });
  const res = await StaffDetailGet(req, {
    params: Promise.resolve({ staffId: "unknown-id" }),
  });
  assert.strictEqual(res.status, 404);
  mock.reset();
});

// 5. POST duplicate upstream 409 passthrough
test("BFF POST passes through upstream 409 Conflict for duplicate email", async () => {
  mock.method(
    global,
    "fetch",
    async () =>
      new Response(JSON.stringify({ message: "Email already exists" }), {
        status: 409,
      }),
  );

  const req = new Request("http://localhost/api/staff", {
    method: "POST",
    headers: {
      origin: "http://localhost:3001",
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: "dup@test.com", password: "password1234" }),
  });
  const res = await StaffPost(req);
  assert.strictEqual(res.status, 409);
  mock.reset();
});

// 6. POST invalid Origin -> 403
test("BFF POST rejects invalid Origin with 403", async () => {
  const req = new Request("http://localhost/api/staff", {
    method: "POST",
    headers: { origin: "http://evil.com", "content-type": "application/json" },
    body: JSON.stringify({ email: "s@test.com", password: "password1234" }),
  });
  const res = await StaffPost(req);
  assert.strictEqual(res.status, 403);
});

// 7. PATCH /staff/:id invalid Origin -> 403
test("BFF PATCH /staff/:id rejects invalid Origin with 403", async () => {
  const req = new Request("http://localhost/api/staff/staff-1", {
    method: "PATCH",
    headers: { origin: "http://malicious.org", "content-type": "application/json" },
    body: JSON.stringify({ email: "new@test.com" }),
  });
  const res = await StaffPatch(req, {
    params: Promise.resolve({ staffId: "staff-1" }),
  });
  assert.strictEqual(res.status, 403);
});

// 8. PATCH /staff/:id/password invalid Origin -> 403
test("BFF PATCH /staff/:id/password rejects invalid Origin with 403", async () => {
  const req = new Request("http://localhost/api/staff/staff-1/password", {
    method: "PATCH",
    headers: { origin: "http://malicious.org", "content-type": "application/json" },
    body: JSON.stringify({ password: "newpassword1234" }),
  });
  const res = await PasswordPatch(req, {
    params: Promise.resolve({ staffId: "staff-1" }),
  });
  assert.strictEqual(res.status, 403);
});

// 9. POST invalid Content-Type -> 415
test("BFF POST rejects invalid Content-Type with 415", async () => {
  const req = new Request("http://localhost/api/staff", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "text/plain" },
    body: "bad body",
  });
  const res = await StaffPost(req);
  assert.strictEqual(res.status, 415);
});

// 10. PATCH staff invalid Content-Type -> 415
test("BFF PATCH /staff/:id rejects invalid Content-Type with 415", async () => {
  const req = new Request("http://localhost/api/staff/staff-1", {
    method: "PATCH",
    headers: { origin: "http://localhost:3001", "content-type": "text/plain" },
    body: "plain text",
  });
  const res = await StaffPatch(req, {
    params: Promise.resolve({ staffId: "staff-1" }),
  });
  assert.strictEqual(res.status, 415);
});

// 11. PATCH password invalid Content-Type -> 415
test("BFF PATCH /staff/:id/password rejects invalid Content-Type with 415", async () => {
  const req = new Request("http://localhost/api/staff/staff-1/password", {
    method: "PATCH",
    headers: { origin: "http://localhost:3001", "content-type": "application/x-www-form-urlencoded" },
    body: "password=1234",
  });
  const res = await PasswordPatch(req, {
    params: Promise.resolve({ staffId: "staff-1" }),
  });
  assert.strictEqual(res.status, 415);
});

// 12. GET forwarding: page, limit, search, status, Cache-Control no-store
test("BFF GET forwards query params and sets Cache-Control: no-store", async () => {
  let capturedUrl = "";
  mock.method(global, "fetch", async (url: string) => {
    capturedUrl = url;
    return new Response(
      JSON.stringify({
        data: [],
        meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
      }),
      { status: 200 },
    );
  });

  const req = new Request(
    "http://localhost/api/staff?page=2&limit=10&status=active&search=operator",
    { method: "GET" },
  );
  const res = await StaffGet(req);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(
    capturedUrl,
    "http://localhost:3000/staff?page=2&limit=10&search=operator&status=active",
  );
  assert.strictEqual(res.headers.get("cache-control"), "no-store");
  mock.reset();
});

// 13. POST body forwards only: email, password
test("BFF POST body forwards only email and password (strips unintended fields)", async () => {
  let capturedBody = "";
  mock.method(global, "fetch", async (_url: string, opts: any) => {
    capturedBody = opts.body;
    return new Response(
      JSON.stringify({
        id: "new-id",
        email: "s@test.com",
        role: "STAFF",
        isActive: true,
      }),
      { status: 201 },
    );
  });

  const req = new Request("http://localhost/api/staff", {
    method: "POST",
    headers: {
      origin: "http://localhost:3001",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: "s@test.com",
      password: "securepassword1234",
      role: "SUPER_ADMIN", // Malicious attempt to elevate role
      isAdmin: true,
      extraField: "ignored",
    }),
  });
  const res = await StaffPost(req);
  assert.strictEqual(res.status, 201);
  const parsed = JSON.parse(capturedBody);
  assert.deepStrictEqual(parsed, {
    email: "s@test.com",
    password: "securepassword1234",
  });
  assert.strictEqual((parsed as any).role, undefined);
  assert.strictEqual((parsed as any).isAdmin, undefined);
  assert.strictEqual((parsed as any).extraField, undefined);
  mock.reset();
});

// 14. PATCH staff forwards only: email, isActive
test("BFF PATCH /staff/:id forwards only email and isActive", async () => {
  let capturedBody = "";
  mock.method(global, "fetch", async (_url: string, opts: any) => {
    capturedBody = opts.body;
    return new Response(
      JSON.stringify({ id: "staff-1", email: "updated@test.com", isActive: false }),
      { status: 200 },
    );
  });

  const req = new Request("http://localhost/api/staff/staff-1", {
    method: "PATCH",
    headers: {
      origin: "http://localhost:3001",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: "updated@test.com",
      isActive: false,
      role: "SUPER_ADMIN", // Malicious attempt
      password: "injectedpassword",
      extra: "drop",
    }),
  });
  const res = await StaffPatch(req, {
    params: Promise.resolve({ staffId: "staff-1" }),
  });
  assert.strictEqual(res.status, 200);
  const parsed = JSON.parse(capturedBody);
  assert.deepStrictEqual(parsed, {
    email: "updated@test.com",
    isActive: false,
  });
  assert.strictEqual((parsed as any).role, undefined);
  assert.strictEqual((parsed as any).password, undefined);
  assert.strictEqual((parsed as any).extra, undefined);
  mock.reset();
});

// 15. password endpoint forwards only: password
test("BFF PATCH /staff/:id/password forwards only password", async () => {
  let capturedBody = "";
  mock.method(global, "fetch", async (_url: string, opts: any) => {
    capturedBody = opts.body;
    return new Response(null, { status: 204 });
  });

  const req = new Request("http://localhost/api/staff/staff-1/password", {
    method: "PATCH",
    headers: {
      origin: "http://localhost:3001",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      password: "brandnewpassword1234",
      email: "should-not-forward@test.com",
      role: "SUPER_ADMIN",
      isActive: true,
    }),
  });
  const res = await PasswordPatch(req, {
    params: Promise.resolve({ staffId: "staff-1" }),
  });
  assert.strictEqual(res.status, 204);
  const parsed = JSON.parse(capturedBody);
  assert.deepStrictEqual(parsed, {
    password: "brandnewpassword1234",
  });
  assert.strictEqual((parsed as any).email, undefined);
  assert.strictEqual((parsed as any).role, undefined);
  mock.reset();
});
