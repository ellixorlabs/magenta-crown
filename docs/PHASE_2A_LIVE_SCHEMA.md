# Phase 2A — Live Supabase `public` schema (snapshot via MCP)

Inspected tables: `Order`, `OrderItem`, `Coupon`, `User`, `Review` (no `ProductReview` table), `Product`, `ProductVariant`.

## Order

| Column | Type | Notes |
|--------|------|--------|
| id | text | PK, default gen_random_uuid()::text |
| userId | text | FK → User.id, nullable |
| createdAt | timestamp | default now |
| couponCode | text | nullable |
| status | text | default `PENDING` — **legacy mixed payment + fulfillment** |
| totalAmount | float8 | default 0 |
| guestEmail | text | nullable |
| invoiceUrl | text | nullable |
| paymentMethod | text | nullable — values seen: `CASH_ON_DELIVERY`, `UPI` |
| shippingAddress | jsonb | nullable |
| trackingUrl | text | nullable |
| couponId | text | FK → Coupon.id, nullable |
| discountAmount | float8 | default 0 |
| subtotalBeforeDiscount | float8 | default 0 |
| publicOrderRef | text | nullable, unique index exists (migration in repo) |

FKs: Order_userId_fkey, Order_couponId_fkey. RLS: enabled.

## OrderItem

| Column | Type |
|--------|------|
| id | text PK |
| orderId | text FK → Order |
| productId | text FK → Product |
| quantity | int |
| price | float8 |
| color | text nullable |
| size | text nullable |
| variantId | text FK → ProductVariant nullable |

**Note:** Repo code inserts `styleCode`; live DB had **no** `styleCode` column at inspection — migration adds nullable `styleCode` for alignment.

## Coupon

| Column | Type |
|--------|------|
| id | text PK |
| code | text |
| discountPct | float8 |
| isActive | bool default true |

No expiry columns. RLS: enabled.

## User

Includes `role` as Postgres enum **`RoleEnum`**: `CUSTOMER`, `SUB_ADMIN`, `ADMIN`, `TECH_SUPPORT`. RLS: enabled.

## Review (not ProductReview)

| Column | Type |
|--------|------|
| id | text PK |
| productId | text FK |
| userId | text FK nullable |
| authorName | text |
| rating | int |
| title | text nullable |
| body | text nullable |
| createdAt | timestamp default now |

No `verifiedPurchase`. RLS: enabled.

## Product / ProductVariant

Full column list in MCP `list_tables` output. No `returnable` / `exchangeable` / `returnWindowDays` at inspection.

## Live Order row mix (sample)

- `PAID` + `UPI`: 1  
- `PENDING` + `CASH_ON_DELIVERY`: 7  
- `PENDING` + `UPI`: 5  

Used for backfill rules in migration `20260515180000_order_commerce_normalization.sql`.
