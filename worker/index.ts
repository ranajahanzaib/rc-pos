import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { z } from "zod";

type Bindings = { DB: D1Database };
type User = { id: string; name: string; email: string };
type CompletedSale = {
  receiptNumber: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  changeCents: number;
};
type Variables = { user: User };
type AppEnv = { Bindings: Bindings; Variables: Variables };
type RequestContext = Context<AppEnv>;

const app = new Hono<AppEnv>();
const SESSION_COOKIE = "rcpos_session";
const SESSION_DAYS = 14;
const encoder = new TextEncoder();

const setupSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  taxRatePercent: z.number().min(0).max(100),
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  accessKey: z.string().min(40).max(100),
});

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  accessKey: z.string().min(40).max(100),
});
const productSchema = z.object({
  sku: z.string().trim().min(1).max(40),
  barcode: z.string().trim().max(80).optional().nullable(),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1).max(60),
  priceCents: z.number().int().min(0).max(100_000_000),
  costCents: z.number().int().min(0).max(100_000_000),
  reorderLevel: z.number().int().min(0).max(1_000_000),
});
const adjustmentSchema = z.object({
  productId: z.string().uuid(),
  quantityDelta: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((n) => n !== 0),
  reason: z.enum(["received", "counted", "damaged", "returned", "other"]),
});
const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .min(1)
    .max(100),
  cashReceivedCents: z.number().int().nonnegative().max(1_000_000_000),
  idempotencyKey: z.uuid(),
});
const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  taxRatePercent: z.number().min(0).max(100),
});
const rotateKeySchema = z.object({
  currentAccessKey: z.string().min(40).max(100),
  newAccessKey: z.string().min(40).max(100),
});

function jsonError(message: string, status: 400 | 401 | 404 | 409 | 422 | 500) {
  return Response.json({ error: message }, { status });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function digest(value: string): Promise<string> {
  return bytesToBase64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
}

function safeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1)
    mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

function setSessionCookie(c: RequestContext, token: string, maxAge: number) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge,
  });
}

async function createSession(c: RequestContext, userId: string) {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await c.env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
  )
    .bind(await digest(token), userId, expiresAt)
    .run();
  setSessionCookie(c, token, SESSION_DAYS * 24 * 60 * 60);
}

async function getCurrentUser(c: RequestContext): Promise<User | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  return await c.env.DB.prepare(
    `
    SELECT users.id, users.name, users.email
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `,
  )
    .bind(await digest(token), new Date().toISOString())
    .first<User>();
}

function readJson<T extends z.ZodType>(schema: T) {
  return async (request: Request): Promise<z.infer<T> | Response> => {
    let value: unknown;
    try {
      value = await request.json();
    } catch {
      return jsonError("Send a valid JSON request body.", 400);
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Check the submitted values.",
        422,
      );
    }
    return parsed.data;
  };
}

const publicApi = new Hono<AppEnv>();
publicApi.get("/bootstrap", async (c) => {
  const store = await c.env.DB.prepare(
    "SELECT name, currency, tax_rate_basis_points AS taxRateBasisPoints FROM store_settings WHERE id = 1",
  ).first<{ name: string; currency: string; taxRateBasisPoints: number }>();
  return c.json({ configured: Boolean(store), store });
});

publicApi.post("/setup", async (c) => {
  const parsed = await readJson(setupSchema)(c.req.raw);
  if (parsed instanceof Response) return parsed;
  const exists = await c.env.DB.prepare(
    "SELECT id FROM store_settings WHERE id = 1",
  ).first();
  if (exists) return jsonError("This store is already configured.", 409);

  const userId = crypto.randomUUID();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO store_settings (id, name, currency, tax_rate_basis_points) VALUES (1, ?, ?, ?)",
      ).bind(
        parsed.storeName,
        parsed.currency,
        Math.round(parsed.taxRatePercent * 100),
      ),
      c.env.DB.prepare(
        "INSERT INTO users (id, name, email, access_key_hash) VALUES (?, ?, ?, ?)",
      ).bind(userId, parsed.name, parsed.email, await digest(parsed.accessKey)),
    ]);
  } catch {
    return jsonError(
      "Setup could not be completed. Check that this store has not already been initialized.",
      409,
    );
  }
  await createSession(c, userId);
  return c.json({ ok: true });
});

publicApi.post("/login", async (c) => {
  const parsed = await readJson(loginSchema)(c.req.raw);
  if (parsed instanceof Response) return parsed;
  const record = await c.env.DB.prepare(
    "SELECT id, access_key_hash AS accessKeyHash FROM users WHERE email = ?",
  )
    .bind(parsed.email)
    .first<{ id: string; accessKeyHash: string }>();
  const suppliedHash = await digest(parsed.accessKey);
  if (
    !record ||
    !safeEqual(
      encoder.encode(suppliedHash),
      encoder.encode(record.accessKeyHash),
    )
  ) {
    return jsonError("Email or access key is incorrect.", 401);
  }
  await createSession(c, record.id);
  return c.json({ ok: true });
});

publicApi.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token)
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await digest(token))
      .run();
  setSessionCookie(c, "", 0);
  return c.json({ ok: true });
});

publicApi.get("/session", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ user: null });
  const store = await c.env.DB.prepare(
    "SELECT name, currency, tax_rate_basis_points AS taxRateBasisPoints FROM store_settings WHERE id = 1",
  ).first<{ name: string; currency: string; taxRateBasisPoints: number }>();
  return c.json({ user, store });
});

const privateApi = new Hono<AppEnv>();
privateApi.use("*", async (c, next) => {
  const user = await getCurrentUser(c);
  if (!user) return jsonError("Your session has expired. Sign in again.", 401);
  c.set("user", user);
  await next();
});

privateApi.get("/dashboard", async (c) => {
  const db = c.env.DB;
  const [today, products, lowStock, recentSales, trend, settings] =
    await Promise.all([
      db
        .prepare(
          "SELECT COUNT(*) AS count, COALESCE(SUM(total_cents), 0) AS total FROM sales WHERE date(created_at) = date('now')",
        )
        .first<{ count: number; total: number }>(),
      db
        .prepare("SELECT COUNT(*) AS count FROM products WHERE active = 1")
        .first<{ count: number }>(),
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM products WHERE active = 1 AND stock <= reorder_level",
        )
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT receipt_number AS receiptNumber, total_cents AS totalCents, created_at AS createdAt
      FROM sales ORDER BY created_at DESC LIMIT 6`,
        )
        .all(),
      db
        .prepare(
          `SELECT date(created_at) AS day, SUM(total_cents) AS totalCents
      FROM sales WHERE created_at >= datetime('now', '-6 days') GROUP BY date(created_at) ORDER BY day`,
        )
        .all(),
      db
        .prepare(
          "SELECT name, currency, tax_rate_basis_points AS taxRateBasisPoints FROM store_settings WHERE id = 1",
        )
        .first(),
    ]);
  return c.json({
    today,
    products: products?.count ?? 0,
    lowStock: lowStock?.count ?? 0,
    recentSales: recentSales.results,
    trend: trend.results,
    settings,
  });
});

privateApi.get("/products", async (c) => {
  const q = (c.req.query("q") ?? "").trim().slice(0, 100);
  const includeInactive = c.req.query("inactive") === "1";
  const products = await c.env.DB.prepare(
    `
    SELECT id, sku, barcode, name, category, price_cents AS priceCents,
      cost_cents AS costCents, stock, reorder_level AS reorderLevel, active,
      created_at AS createdAt
    FROM products WHERE (? = '' OR name LIKE ? OR sku LIKE ? OR barcode LIKE ?)
      AND (? = 1 OR active = 1)
    ORDER BY name COLLATE NOCASE LIMIT 300
  `,
  )
    .bind(q, `%${q}%`, `%${q}%`, `%${q}%`, includeInactive ? 1 : 0)
    .all();
  return c.json({ products: products.results });
});

privateApi.post("/products", async (c) => {
  const parsed = await readJson(
    productSchema.extend({
      initialStock: z.number().int().min(0).max(1_000_000).default(0),
    }),
  )(c.req.raw);
  if (parsed instanceof Response) return parsed;
  const productId = crypto.randomUUID();
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO products (id, sku, barcode, name, category, price_cents, cost_cents, stock, reorder_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      productId,
      parsed.sku,
      parsed.barcode || null,
      parsed.name,
      parsed.category,
      parsed.priceCents,
      parsed.costCents,
      parsed.initialStock,
      parsed.reorderLevel,
    ),
  ];
  if (parsed.initialStock > 0) {
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO inventory_movements (id, product_id, user_id, quantity_delta, reason)
      VALUES (?, ?, ?, ?, 'opening stock')`,
      ).bind(
        crypto.randomUUID(),
        productId,
        c.get("user").id,
        parsed.initialStock,
      ),
    );
  }
  try {
    await c.env.DB.batch(statements);
  } catch {
    return jsonError(
      "That SKU or barcode is already in use, or the product could not be saved.",
      409,
    );
  }
  return c.json({ id: productId }, 201);
});

privateApi.patch("/products/:id", async (c) => {
  const parsed = await readJson(productSchema.extend({ active: z.boolean() }))(
    c.req.raw,
  );
  if (parsed instanceof Response) return parsed;
  const result = await c.env.DB.prepare(
    `UPDATE products SET sku = ?, barcode = ?, name = ?, category = ?, price_cents = ?,
    cost_cents = ?, reorder_level = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  )
    .bind(
      parsed.sku,
      parsed.barcode || null,
      parsed.name,
      parsed.category,
      parsed.priceCents,
      parsed.costCents,
      parsed.reorderLevel,
      parsed.active ? 1 : 0,
      c.req.param("id"),
    )
    .run();
  if (!result.meta.changes) return jsonError("Product not found.", 404);
  return c.json({ ok: true });
});

privateApi.get("/inventory", async (c) => {
  const [products, movements] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, sku, name, category, stock, reorder_level AS reorderLevel, cost_cents AS costCents
      FROM products WHERE active = 1 ORDER BY CASE WHEN stock <= reorder_level THEN 0 ELSE 1 END, name COLLATE NOCASE LIMIT 300`,
    ).all(),
    c.env.DB.prepare(
      `SELECT inventory_movements.id, inventory_movements.quantity_delta AS quantityDelta,
        inventory_movements.reason, inventory_movements.reference, inventory_movements.created_at AS createdAt,
        products.name AS productName, products.sku, users.name AS userName
      FROM inventory_movements JOIN products ON products.id = inventory_movements.product_id
      JOIN users ON users.id = inventory_movements.user_id ORDER BY inventory_movements.created_at DESC LIMIT 20`,
    ).all(),
  ]);
  return c.json({ products: products.results, movements: movements.results });
});

privateApi.post("/inventory/adjustments", async (c) => {
  const parsed = await readJson(adjustmentSchema)(c.req.raw);
  if (parsed instanceof Response) return parsed;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND active = 1",
      ).bind(parsed.quantityDelta, parsed.productId),
      c.env.DB.prepare(
        `INSERT INTO inventory_movements (id, product_id, user_id, quantity_delta, reason)
        SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM products WHERE id = ? AND active = 1)`,
      ).bind(
        crypto.randomUUID(),
        parsed.productId,
        c.get("user").id,
        parsed.quantityDelta,
        parsed.reason,
        parsed.productId,
      ),
    ]);
  } catch {
    return jsonError(
      "The adjustment would create an invalid stock level.",
      409,
    );
  }
  const product = await c.env.DB.prepare(
    "SELECT id FROM products WHERE id = ? AND active = 1",
  )
    .bind(parsed.productId)
    .first();
  if (!product) return jsonError("Product not found.", 404);
  return c.json({ ok: true });
});

privateApi.get("/sales", async (c) => {
  const sales = await c.env.DB.prepare(
    `SELECT receipt_number AS receiptNumber, subtotal_cents AS subtotalCents,
      tax_cents AS taxCents, total_cents AS totalCents, cash_received_cents AS cashReceivedCents,
      change_cents AS changeCents, created_at AS createdAt
    FROM sales ORDER BY created_at DESC LIMIT 100`,
  ).all();
  return c.json({ sales: sales.results });
});

privateApi.get("/sales/:receiptNumber", async (c) => {
  const sale = await c.env.DB.prepare(
    `SELECT receipt_number AS receiptNumber, subtotal_cents AS subtotalCents,
      tax_cents AS taxCents, total_cents AS totalCents, cash_received_cents AS cashReceivedCents,
      change_cents AS changeCents, created_at AS createdAt
    FROM sales WHERE receipt_number = ?`,
  )
    .bind(c.req.param("receiptNumber"))
    .first();
  if (!sale) return jsonError("Receipt not found.", 404);
  const items = await c.env.DB.prepare(
    `SELECT sku, name, quantity, unit_price_cents AS unitPriceCents, line_total_cents AS lineTotalCents
    FROM sale_items WHERE receipt_number = ?`,
  )
    .bind(c.req.param("receiptNumber"))
    .all();
  return c.json({ sale, items: items.results });
});

privateApi.post("/sales", async (c) => {
  const parsed = await readJson(checkoutSchema)(c.req.raw);
  if (parsed instanceof Response) return parsed;
  const priorSale = await c.env.DB.prepare(
    `SELECT receipt_number AS receiptNumber, subtotal_cents AS subtotalCents,
      tax_cents AS taxCents, total_cents AS totalCents, change_cents AS changeCents
    FROM sales WHERE idempotency_key = ?`,
  )
    .bind(parsed.idempotencyKey)
    .first<CompletedSale>();
  if (priorSale) return c.json(priorSale);
  const quantities = new Map<string, number>();
  for (const item of parsed.items)
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  const ids = [...quantities.keys()];
  const placeholders = ids.map(() => "?").join(", ");
  const products = await c.env.DB.prepare(
    `SELECT id, sku, name, price_cents AS priceCents, stock FROM products
    WHERE active = 1 AND id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<{
      id: string;
      sku: string;
      name: string;
      priceCents: number;
      stock: number;
    }>();
  const byId = new Map(
    products.results.map((product) => [product.id, product]),
  );
  if (byId.size !== ids.length)
    return jsonError("One or more products are no longer available.", 409);
  for (const [productId, quantity] of quantities) {
    const product = byId.get(productId)!;
    if (product.stock < quantity)
      return jsonError(
        `${product.name} has only ${product.stock} in stock.`,
        409,
      );
  }
  const subtotalCents = ids.reduce(
    (sum, id) => sum + byId.get(id)!.priceCents * quantities.get(id)!,
    0,
  );
  const settings = await c.env.DB.prepare(
    "SELECT tax_rate_basis_points AS taxRateBasisPoints FROM store_settings WHERE id = 1",
  ).first<{ taxRateBasisPoints: number }>();
  const taxCents = Math.round(
    (subtotalCents * (settings?.taxRateBasisPoints ?? 0)) / 10_000,
  );
  const totalCents = subtotalCents + taxCents;
  if (parsed.cashReceivedCents < totalCents)
    return jsonError("Cash received must cover the total.", 422);
  const receiptNumber = `RC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO sales (receipt_number, idempotency_key, cashier_id, subtotal_cents, tax_cents, total_cents, cash_received_cents, change_cents)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      receiptNumber,
      parsed.idempotencyKey,
      c.get("user").id,
      subtotalCents,
      taxCents,
      totalCents,
      parsed.cashReceivedCents,
      parsed.cashReceivedCents - totalCents,
    ),
  ];
  for (const id of ids) {
    const product = byId.get(id)!;
    const quantity = quantities.get(id)!;
    statements.push(
      c.env.DB.prepare(
        "UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND active = 1",
      ).bind(quantity, id),
    );
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO sale_items (id, receipt_number, product_id, sku, name, quantity, unit_price_cents, line_total_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        receiptNumber,
        id,
        product.sku,
        product.name,
        quantity,
        product.priceCents,
        product.priceCents * quantity,
      ),
    );
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO inventory_movements (id, product_id, user_id, quantity_delta, reason, reference)
      VALUES (?, ?, ?, ?, 'sale', ?)`,
      ).bind(
        crypto.randomUUID(),
        id,
        c.get("user").id,
        -quantity,
        receiptNumber,
      ),
    );
  }
  try {
    await c.env.DB.batch(statements);
  } catch {
    return jsonError(
      "Checkout could not be completed. Stock may have changed; refresh the cart and try again.",
      409,
    );
  }
  return c.json(
    {
      receiptNumber,
      subtotalCents,
      taxCents,
      totalCents,
      changeCents: parsed.cashReceivedCents - totalCents,
    },
    201,
  );
});

privateApi.get("/settings", async (c) => {
  const settings = await c.env.DB.prepare(
    `SELECT name, currency, tax_rate_basis_points AS taxRateBasisPoints
    FROM store_settings WHERE id = 1`,
  ).first();
  return c.json({ settings });
});

privateApi.put("/settings", async (c) => {
  const parsed = await readJson(settingsSchema)(c.req.raw);
  if (parsed instanceof Response) return parsed;
  await c.env.DB.prepare(
    `UPDATE store_settings SET name = ?, currency = ?, tax_rate_basis_points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
  )
    .bind(parsed.name, parsed.currency, Math.round(parsed.taxRatePercent * 100))
    .run();
  return c.json({ ok: true });
});

privateApi.post("/access-key/rotate", async (c) => {
  const parsed = await readJson(rotateKeySchema)(c.req.raw);
  if (parsed instanceof Response) return parsed;
  const user = c.get("user");
  const record = await c.env.DB.prepare(
    "SELECT access_key_hash AS accessKeyHash FROM users WHERE id = ?",
  )
    .bind(user.id)
    .first<{ accessKeyHash: string }>();
  if (
    !record ||
    !safeEqual(
      encoder.encode(await digest(parsed.currentAccessKey)),
      encoder.encode(record.accessKeyHash),
    )
  ) {
    return jsonError("The current access key is incorrect.", 401);
  }
  await c.env.DB.prepare("UPDATE users SET access_key_hash = ? WHERE id = ?")
    .bind(await digest(parsed.newAccessKey), user.id)
    .run();
  return c.json({ ok: true });
});

app.route("/api", publicApi);
app.route("/api", privateApi);

app.onError((error, _c) => {
  console.error("Request failed", error);
  return jsonError("Something went wrong while processing the request.", 500);
});

export default app;
