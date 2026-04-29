--
-- PostgreSQL database dump
--

\restrict uZl40CKzlobXHb04MFAbv1bqDg6dgSNHNHQLpz4Qt3koDMdPdAnqtJWooKjdvkN

-- Dumped from database version 17.8 (130b160)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_session_jwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_session_jwt WITH SCHEMA public;


--
-- Name: EXTENSION pg_session_jwt; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_session_jwt IS 'pg_session_jwt: manage authentication sessions using JWTs';


--
-- Name: pgrst; Type: SCHEMA; Schema: -; Owner: neon_service
--

CREATE SCHEMA pgrst;


ALTER SCHEMA pgrst OWNER TO neon_service;

--
-- Name: RoleEnum; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."RoleEnum" AS ENUM (
    'CUSTOMER',
    'SUB_ADMIN',
    'ADMIN',
    'TECH_SUPPORT'
);


ALTER TYPE public."RoleEnum" OWNER TO neondb_owner;

--
-- Name: pre_config(); Type: FUNCTION; Schema: pgrst; Owner: neon_service
--

CREATE FUNCTION pgrst.pre_config() RETURNS void
    LANGUAGE sql
    SET search_path TO ''
    AS $$
  SELECT
      set_config('pgrst.db_schemas', 'public', true)
    , set_config('pgrst.db_aggregates_enabled', 'true', true)
    , set_config('pgrst.db_anon_role', 'anonymous', true)
    , set_config('pgrst.jwt_role_claim_key', '.role', true)
$$;


ALTER FUNCTION pgrst.pre_config() OWNER TO neon_service;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public."Account" OWNER TO neondb_owner;

--
-- Name: Coupon; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Coupon" (
    id text NOT NULL,
    code text NOT NULL,
    "discountPct" double precision NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Coupon" OWNER TO neondb_owner;

--
-- Name: HeaderNavLink; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."HeaderNavLink" (
    id text NOT NULL,
    "group" text,
    label text NOT NULL,
    href text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."HeaderNavLink" OWNER TO neondb_owner;

--
-- Name: HeroCarouselSettings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."HeroCarouselSettings" (
    id text DEFAULT 'default'::text NOT NULL,
    transition text DEFAULT 'wipe'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HeroCarouselSettings" OWNER TO neondb_owner;

--
-- Name: HeroSlide; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."HeroSlide" (
    id text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "imageUrl" text NOT NULL,
    eyebrow text DEFAULT ''::text NOT NULL,
    line1 text NOT NULL,
    accent text NOT NULL,
    sub1 text DEFAULT ''::text NOT NULL,
    sub2 text DEFAULT ''::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "imagePosition" text DEFAULT 'center'::text NOT NULL
);


ALTER TABLE public."HeroSlide" OWNER TO neondb_owner;

--
-- Name: HomePageConfig; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."HomePageConfig" (
    id text DEFAULT 'default'::text NOT NULL,
    payload jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HomePageConfig" OWNER TO neondb_owner;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "couponCode" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "totalAmount" double precision DEFAULT 0 NOT NULL,
    "guestEmail" text,
    "invoiceUrl" text,
    "paymentMethod" text,
    "shippingAddress" jsonb,
    "trackingUrl" text,
    "couponId" text,
    "discountAmount" double precision DEFAULT 0 NOT NULL,
    "subtotalBeforeDiscount" double precision DEFAULT 0 NOT NULL,
    "publicOrderRef" text
);


ALTER TABLE public."Order" OWNER TO neondb_owner;

--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL,
    price double precision NOT NULL,
    color text,
    size text,
    "variantId" text
);


ALTER TABLE public."OrderItem" OWNER TO neondb_owner;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    mrp double precision NOT NULL,
    category text DEFAULT 'Uncategorized'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "discountedPrice" double precision,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    tags text[] DEFAULT ARRAY[]::text[],
    "careInstructions" text,
    "fitNotes" text,
    material text,
    occasion text,
    slug text NOT NULL,
    story text,
    style text,
    "videoUrls" text[] DEFAULT ARRAY[]::text[],
    "listImageIndex" integer DEFAULT 0 NOT NULL,
    "listImagePosition" text DEFAULT 'center'::text NOT NULL,
    "codEnabled" boolean DEFAULT true NOT NULL,
    "prepaidOfferText" text,
    "pricingFootnote" text,
    "sizeChartImageUrl" text
);


ALTER TABLE public."Product" OWNER TO neondb_owner;

--
-- Name: ProductFeaturedCoupon; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ProductFeaturedCoupon" (
    "productId" text NOT NULL,
    "couponId" text NOT NULL
);


ALTER TABLE public."ProductFeaturedCoupon" OWNER TO neondb_owner;

--
-- Name: ProductVariant; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ProductVariant" (
    id text NOT NULL,
    "productId" text NOT NULL,
    size text NOT NULL,
    color text NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."ProductVariant" OWNER TO neondb_owner;

--
-- Name: Review; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Review" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "userId" text,
    "authorName" text NOT NULL,
    rating integer NOT NULL,
    title text,
    body text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Review" OWNER TO neondb_owner;

--
-- Name: User; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text,
    password text,
    role public."RoleEnum" DEFAULT 'CUSTOMER'::public."RoleEnum" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    addresses jsonb,
    "paymentMethods" jsonb,
    age integer,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "onboardingComplete" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    phone text
);


ALTER TABLE public."User" OWNER TO neondb_owner;

--
-- Name: _UserWishlist; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."_UserWishlist" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_UserWishlist" OWNER TO neondb_owner;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO neondb_owner;

--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: Coupon; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Coupon" (id, code, "discountPct", "isActive") FROM stdin;
cmnxsat170000t4s1hdwz06az	NEWHERE	10	t
cmnyhvsm90005t47amugk9bck	HELLO	5	t
\.


--
-- Data for Name: HeaderNavLink; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."HeaderNavLink" (id, "group", label, href, "sortOrder", "isActive") FROM stdin;
\.


--
-- Data for Name: HeroCarouselSettings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."HeroCarouselSettings" (id, transition, "updatedAt") FROM stdin;
default	fade	2026-04-14 03:00:07.497
\.


--
-- Data for Name: HeroSlide; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."HeroSlide" (id, "sortOrder", "imageUrl", eyebrow, line1, accent, sub1, sub2, "isActive", "imagePosition") FROM stdin;
cmnxxmz6j0001t405vy61jyj1	1	https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1920&q=80	Festive luminance	Crafted to	Shine	Jewel tones and hand embroidery for the season’s grandest nights.	Limited atelier drops — never mass-produced.	t	center
cmnxxmzno0002t40528btv6lv	2	https://images6.alphacoders.com/127/1276605.jpg	Modern heritage	Silhouettes	Reimagined	Architectural drapes with soulful texture.	Designed for movement, built to last.	t	center
cmnxxmyeb0000t405vc4uu9q7	0	https://www.azafashions.com/blog/wp-content/uploads/2024/06/Featured-Image-2.jpg	New collection • Spring 2026	The Language	of Elegance	Where couture craftsmanship meets contemporary vision.	Each piece a testament to artisan mastery.	t	47.9% 0%
\.


--
-- Data for Name: HomePageConfig; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."HomePageConfig" (id, payload, "updatedAt") FROM stdin;
default	{"hero": {"enabled": true}, "version": 2, "sections": [{"id": "migrated-newArrivals-8b0f8738-df0d-480b-a7a4-80b0eb291a8c", "type": "carousel", "order": 0, "title": "Fresh from the atelier", "enabled": true, "eyebrow": "New arrivals", "productIds": ["cmo0pctmu0000t4qz1p4nk71h", "cmnxs54k20009t4p5zet589rj"], "transition": "fade", "viewAllHref": "/shop?sort=new"}]}	2026-04-20 04:18:38.934
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Order" (id, "userId", "createdAt", "couponCode", status, "totalAmount", "guestEmail", "invoiceUrl", "paymentMethod", "shippingAddress", "trackingUrl", "couponId", "discountAmount", "subtotalBeforeDiscount", "publicOrderRef") FROM stdin;
cmnxsdd1g0002t4s1br73as98	cmnxryju20000t4p5v849cc1l	2026-04-13 22:50:40.323	newhere	PAID	2099	\N	\N	UPI	{"pin": "600021", "city": "Chennai", "line1": "ioqhwdsoihqw", "fullName": "Test Hi"}	https://example.com/track	\N	0	0	\N
cmnxzngii0001t4d512qe45ol	\N	2026-04-14 02:14:28.698	newhere	PENDING	2099	hello@123.com	\N	CASH_ON_DELIVERY	{"area": "Addhiganahalli", "city": "Addiganahalli", "town": "", "phone": "0000000000", "street": "Rajankunte Railway Flyover", "pincode": "560064", "fullName": "Test 1"}	\N	\N	0	0	\N
cmo2qac4o0002t4gvw0pbziu3	cmo2q8p090000t4gvype47eeu	2026-04-17 09:51:10.822	\N	PENDING	1299	\N	\N	CASH_ON_DELIVERY	{"area": "Yelahanka Old Town", "city": "Yelahanka taluku", "town": "Bangalore", "email": "reshmakochiery@gmail.com", "phone": "+916362365349", "street": "Yelahanka", "pincode": "560064", "fullName": "Reshma Mathew", "phoneLocal": "6362365349", "phoneCountryCode": "+91"}	\N	\N	0	1299	\N
\.


--
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."OrderItem" (id, "orderId", "productId", quantity, price, color, size, "variantId") FROM stdin;
cmnxsdd1h0004t4s1dsvu0wla	cmnxsdd1g0002t4s1br73as98	cmnxs54k20009t4p5zet589rj	1	2099	\N	\N	\N
cmnxzngij0003t4d5w0msllti	cmnxzngii0001t4d512qe45ol	cmnxs54k20009t4p5zet589rj	1	2099	\N	\N	\N
cmo2qac4o0004t4gvrwxwqn13	cmo2qac4o0002t4gvw0pbziu3	cmo0pctmu0000t4qz1p4nk71h	1	1299	As shown	Free	cmo0pctmw0001t4qzskz494z6
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Product" (id, name, description, mrp, category, "createdAt", "discountedPrice", "imageUrls", tags, "careInstructions", "fitNotes", material, occasion, slug, story, style, "videoUrls", "listImageIndex", "listImagePosition", "codEnabled", "prepaidOfferText", "pricingFootnote", "sizeChartImageUrl") FROM stdin;
cmnxs54k20009t4p5zet589rj	Saree	A very silky smooth finish	2300	Saree	2026-04-13 22:44:16.083	2099	{https://www.vastranand.in/cdn/shop/files/7_c1271eb4-07f1-43de-a416-34de985ce923.jpg?v=1743078744,https://www.vastranand.in/cdn/shop/files/9_c349c6dc-639a-444a-8d00-7f1d02c413f1.jpg?v=1743078739}	{silk,bridal,saree}	Wash with care	\N	Silk	Wedding	cmnxs54k2000at4p5esa2fa4y	So beautifully crafted	Sweet	{}	0	center	t	\N	\N	\N
cmo0pctmu0000t4qz1p4nk71h	Celestial Glow Zarocan Chiffon Saree	Feather-light chiffon with a soft sheen and a refined zari border. Drapes beautifully for brunches, pujas, and daytime celebrations.	1999	Sarees	2026-04-15 23:49:34.854	1299	{https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1200&q=85}	{"Summer Special"}	\N	\N	Poly Soft Chiffon	Daily	celestial-glow-zarocan-chiffon-saree	Our Zarocan weave pairs airy poly chiffon with tonal hand-finished edges so the silhouette stays fluid from pleat to pallu.	\N	{}	0	center	t	\N	\N	\N
cmod0ggxu0009t4lle24jgzax	Kurti Set	Cream floral printed kurta with schiffli lace hem, embroidered placket, and wide-leg palazzo pants in matching print.\r\nPaired with a sheer lavender floral dupatta and tassel detailing for a breezy, feminine look.	3800	Kurti with Dupatta&Bottomwear	2026-04-24 14:33:34.914	3420	{https://i.imageupload.app/10bbaf070e6f4c675b83.jpeg,https://i.imageupload.app/49cbb99a2a5619723093.jpeg,https://i.imageupload.app/72833494611dab3f2cd3.jpeg,https://i.imageupload.app/d7402754734a1ad57208.jpeg}	{}	Gentle machine wash cold or hand wash. Do not wring. Dry in shade. Iron on low heat.	Relaxed straight kurta with flowy wide-leg palazzo — offers an easy, comfortable fit suitable for all body types; especially flattering on pear and plus frames.	Cotton	Festive	cmod0ggxv000at4ll0x4kd553	\N	Ladies kurti set 8794	{}	0	57.6% 15.2%	f	\N	\N	https://ethnicity.in/pages/size-guide?srsltid=AfmBOorP0jtHRnyXsyruevq68jJijT5NMHD0kNXNQMvWwPxRhyfLxU8U
cmoczb8u60001t4llj1nwo6c7	Kurti Set	Ivory self-jacquard silk kurta set with vibrant multicolour embroidered neckline and matching straight pants.\r\nPaired with a rich magenta Banarasi dupatta featuring gold zari bootis and ornate border with tassels.	3750	Kurti Set& Fabrics	2026-04-24 14:01:31.518	3375	{https://i.imageupload.app/8457e263227be0502627.jpeg,https://i.imageupload.app/c58da63b9e9bb71dcefb.jpeg,https://i.imageupload.app/6e60413e8485e1ab2c70.jpeg,https://i.imageupload.app/6b1299f40efae0a90c77.jpeg}	{}	Dry clean only. Store folded in muslin. Avoid direct sunlight. Iron on low heat with pressing cloth.	Straight-cut kurta with relaxed silhouette; slim straight pants offer a sleek, tailored fit — ideal for a petite to regular frame.	Jacquard silk	Festive	cmoczb8u70002t4llg3i6t2ih	\N	Ladies kurti set 8523	{}	0	49.3% 19%	f	\N	\N	https://ethnicity.in/pages/size-guide?srsltid=AfmBOor4ZIUXRJTaklnJTVSOWtbmF6N41uKuKcHAB56Mc8amZYEqqx0u
cmod1wu6f000it4ll4kwkfmdr	Kurti Set	Soft sage green chanderi kurta with vibrant multicolour floral embroidery on yoke, scattered butti detailing, and ruffle cuffs.\r\nPaired with matching wide-leg palazzo pants for an effortlessly elegant, breezy ethnic look.	3990	Kurti with Dupatta&Bottomwear	2026-04-24 15:14:18.181	3591	{https://i.imageupload.app/40a3bf054967e10178e6.jpeg,https://i.imageupload.app/21138059ee038d4626c4.jpeg,https://i.imageupload.app/8da631a622f78599b997.jpeg}	{}	Dry clean recommended. If hand washing, use cold water gently. Do not wring. Dry in shade. Iron on low heat with pressing cloth.	Relaxed A-line kurta with asymmetric hem and flowy wide-leg palazzo — universally flattering, especially elegant on pear, plus, and tall frames.	Chanderi Silk	Festive	cmod1wu6h000jt4ll7sz0b0y0	\N	Ladies kurti set 9000	{}	0	48.2% 14.3%	t	\N	\N	https://ethnicity.in/pages/size-guide?srsltid=AfmBOor4ZIUXRJTaklnJTVSOWtbmF6N41uKuKcHAB56Mc8amZYEqqx0u
cmod16pfo000dt4llpai267y4	Lehenga	Vibrant mustard chiffon lehenga set with bold multicolour floral print, embellished crop top with ruffle neckline and jewelled waistband.\r\nCompleted with dramatic cape-style sleeves in matching print for a striking, festive statement look.	3240	Ready To Wear Lehenga	2026-04-24 14:53:58.98	2916	{https://i.imageupload.app/1944430727a6c8e5f22f.jpeg,https://i.imageupload.app/0ed57255599fc9da7912.jpeg,https://i.imageupload.app/eb21e7ec5e73e3e73954.jpeg}	{}	Dry clean only. Handle embellishments with care. Store flat or rolled in muslin. Avoid direct sunlight to preserve print vibrancy.	Crop top with adjustable/tied fit; flared lehenga skirt suits all body types — particularly stunning on hourglass and tall frames. Cape adds drama and elongates the silhouette.	Crepe	Party Wear	cmod16pfp000et4lle5btz4k7	\N	Ladies kurti set 8287G	{}	0	center	t	\N	\N	https://ethnicity.in/pages/size-guide?srsltid=AfmBOorP0jtHRnyXsyruevq68jJijT5NMHD0kNXNQMvWwPxRhyfLxU8U
cmod2eyal000lt4llb90gnakb	Kurti Set	Mustard yellow block-print anarkali kurta with dense white floral jaal pattern, V-neckline with button placket, and printed hem border.\r\nPaired with matching slim pants and a coordinating dupatta featuring medallion and geometric border prints.	2850	Kurti with Dupatta&Bottomwear	2026-04-24 15:28:23.325	2565	{https://i.imageupload.app/1bc715c2fa2f4941fa85.jpeg,https://i.imageupload.app/231b7a4db1b15faf2791.jpeg,https://i.imageupload.app/42e5c0fcc3b19cb2d0f6.jpeg,https://i.imageupload.app/7eb4a6b31f45efd04b42.jpeg}	{}	Machine wash cold on gentle cycle or hand wash. Wash dark colours separately. Do not bleach. Dry in shade. Iron on medium heat.	Flared anarkali silhouette with fitted bodice and flowy skirt — universally flattering, particularly beautiful on apple, pear, and plus frames; slim pants add a balanced, polished finish.	Cotton	Wedding	cmod2eyam000mt4llbocvgf0j	\N	Ladies kurti set 8942	{}	0	49.7% 11.8%	t	\N	\N	https://ethnicity.in/pages/size-guide?srsltid=AfmBOor4ZIUXRJTaklnJTVSOWtbmF6N41uKuKcHAB56Mc8amZYEqqx0u
\.


--
-- Data for Name: ProductFeaturedCoupon; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ProductFeaturedCoupon" ("productId", "couponId") FROM stdin;
cmod0ggxu0009t4lle24jgzax	cmnyhvsm90005t47amugk9bck
cmoczb8u60001t4llj1nwo6c7	cmnxsat170000t4s1hdwz06az
\.


--
-- Data for Name: ProductVariant; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ProductVariant" (id, "productId", size, color, stock, "isActive") FROM stdin;
cmnxzz8qr0007t47mnkvkij31	cmnxs54k20009t4p5zet589rj			2	t
cmo0pctmw0001t4qzskz494z6	cmo0pctmu0000t4qz1p4nk71h	Free	As shown	31	t
cmod0jdgg000ct4lluq5v1crp	cmod0ggxu0009t4lle24jgzax	M,L,XXL	Pink	4	t
cmod193gp000gt4llzh8dpx6x	cmoczb8u60001t4llj1nwo6c7	M,XL,XXL,3XL	Cream	4	t
cmod1c1b0000ht4llrzleqso4	cmod16pfo000dt4llpai267y4	XL,XXL	Green	4	t
cmod1wu6k000kt4llk0fgnzi1	cmod1wu6f000it4ll4kwkfmdr	L,XL,XXL	Light Green	3	t
cmod2eyan000nt4llarlqjrig	cmod2eyal000lt4llb90gnakb	M,L,XL,XXL	Mustrad	4	t
\.


--
-- Data for Name: Review; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Review" (id, "productId", "userId", "authorName", rating, title, body, "createdAt") FROM stdin;
cmnxsen5o0006t4s1brn802or	cmnxs54k20009t4p5zet589rj	\N	ellixor	5	\N	Such a beautifull dress	2026-04-13 22:51:39.832
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."User" (id, name, email, password, role, "createdAt", addresses, "paymentMethods", age, "emailVerified", image, "onboardingComplete", "lastLoginAt", phone) FROM stdin;
cmnxryju20000t4p5v849cc1l	Ellixor L	hello@ellixorlabs.com	$2b$12$Cp1YZ6EnGCHAjqLW.NsCIOzKXlKsi37jQigm9x5AnAYLoIIAo/j3C	ADMIN	2026-04-13 22:39:09.291	\N	\N	22	\N	\N	t	2026-04-28 08:33:14.34	\N
cmoior1b60000t47sg04098jt	Kunal Kumar	kunalsinghrajput7114@gmail.com	$2b$12$ECJA40XJje7gbPZ5fTt3Se7REodcaFRLIsx4R.tHXjD/p5/REe5am	ADMIN	2026-04-28 13:52:29.538	\N	\N	\N	\N	\N	t	2026-04-28 13:52:31.372	\N
cmoiosrk10001t47sa3wd6d3i	Devika Yadav	devikayadav800@gmail.com	$2b$12$Gg8oI3ZNlcdQiAYtDGdHr.UtWYN.KL36aUjrLcMcmDVVJBkDYqgL6	ADMIN	2026-04-28 13:53:50.209	\N	\N	\N	\N	\N	t	2026-04-28 13:53:52.778	\N
cmo2q8p090000t4gvype47eeu	Reshma Mathew	reshmakochiery@gmail.com	$2b$12$6d/sLzcCa9MQnuGBb9C5p.jn2z2ym4rBooyfLLhw2mixzktZUAi.q	ADMIN	2026-04-17 09:49:54.201	\N	\N	\N	\N	\N	t	2026-04-17 09:49:56.076	\N
cmo5qrgxp0000t4j34hnfykw8	Reshma Mathew	test@gmail.com	$2b$12$3U.4BG5zwsAOax5obTo3b.9fdzzWgNT35.9H5iWLxDPbDK8az5lR.	ADMIN	2026-04-19 12:27:48.733	\N	\N	\N	\N	\N	t	2026-04-19 12:27:50.55	\N
\.


--
-- Data for Name: _UserWishlist; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."_UserWishlist" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d3d39df7-34f0-4a9c-885f-bea467b5b037	148b388aa5ee0548413a62dcc49e7311b969cf0ff9a2d211d19b88d5510da5db	2026-04-15 22:20:06.692839+00	20260215120000_variant_system_refactor		\N	2026-04-15 22:20:06.692839+00	0
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Coupon Coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Coupon"
    ADD CONSTRAINT "Coupon_pkey" PRIMARY KEY (id);


--
-- Name: HeaderNavLink HeaderNavLink_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."HeaderNavLink"
    ADD CONSTRAINT "HeaderNavLink_pkey" PRIMARY KEY (id);


--
-- Name: HeroCarouselSettings HeroCarouselSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."HeroCarouselSettings"
    ADD CONSTRAINT "HeroCarouselSettings_pkey" PRIMARY KEY (id);


--
-- Name: HeroSlide HeroSlide_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."HeroSlide"
    ADD CONSTRAINT "HeroSlide_pkey" PRIMARY KEY (id);


--
-- Name: HomePageConfig HomePageConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."HomePageConfig"
    ADD CONSTRAINT "HomePageConfig_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: ProductFeaturedCoupon ProductFeaturedCoupon_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ProductFeaturedCoupon"
    ADD CONSTRAINT "ProductFeaturedCoupon_pkey" PRIMARY KEY ("productId", "couponId");


--
-- Name: ProductVariant ProductVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _UserWishlist _UserWishlist_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."_UserWishlist"
    ADD CONSTRAINT "_UserWishlist_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Coupon_code_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Coupon_code_key" ON public."Coupon" USING btree (code);


--
-- Name: Order_publicOrderRef_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Order_publicOrderRef_key" ON public."Order" USING btree ("publicOrderRef");


--
-- Name: ProductFeaturedCoupon_couponId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ProductFeaturedCoupon_couponId_idx" ON public."ProductFeaturedCoupon" USING btree ("couponId");


--
-- Name: ProductVariant_productId_size_color_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ProductVariant_productId_size_color_key" ON public."ProductVariant" USING btree ("productId", size, color);


--
-- Name: Product_slug_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Product_slug_key" ON public."Product" USING btree (slug);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: _UserWishlist_B_index; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "_UserWishlist_B_index" ON public."_UserWishlist" USING btree ("B");


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES public."Coupon"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductFeaturedCoupon ProductFeaturedCoupon_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ProductFeaturedCoupon"
    ADD CONSTRAINT "ProductFeaturedCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES public."Coupon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductFeaturedCoupon ProductFeaturedCoupon_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ProductFeaturedCoupon"
    ADD CONSTRAINT "ProductFeaturedCoupon_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductVariant ProductVariant_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Review Review_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Review Review_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _UserWishlist _UserWishlist_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."_UserWishlist"
    ADD CONSTRAINT "_UserWishlist_A_fkey" FOREIGN KEY ("A") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserWishlist _UserWishlist_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."_UserWishlist"
    ADD CONSTRAINT "_UserWishlist_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO authenticated;


--
-- Name: SCHEMA pgrst; Type: ACL; Schema: -; Owner: neon_service
--

GRANT USAGE ON SCHEMA pgrst TO authenticator;


--
-- Name: FUNCTION pre_config(); Type: ACL; Schema: pgrst; Owner: neon_service
--

GRANT ALL ON FUNCTION pgrst.pre_config() TO authenticator;


--
-- Name: TABLE "Account"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Account" TO authenticated;


--
-- Name: TABLE "Coupon"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Coupon" TO authenticated;


--
-- Name: TABLE "HeaderNavLink"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."HeaderNavLink" TO authenticated;


--
-- Name: TABLE "HeroCarouselSettings"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."HeroCarouselSettings" TO authenticated;


--
-- Name: TABLE "HeroSlide"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."HeroSlide" TO authenticated;


--
-- Name: TABLE "HomePageConfig"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."HomePageConfig" TO authenticated;


--
-- Name: TABLE "Order"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Order" TO authenticated;


--
-- Name: TABLE "OrderItem"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."OrderItem" TO authenticated;


--
-- Name: TABLE "Product"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Product" TO authenticated;


--
-- Name: TABLE "ProductFeaturedCoupon"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."ProductFeaturedCoupon" TO authenticated;


--
-- Name: TABLE "ProductVariant"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."ProductVariant" TO authenticated;


--
-- Name: TABLE "Review"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Review" TO authenticated;


--
-- Name: TABLE "User"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."User" TO authenticated;


--
-- Name: TABLE "_UserWishlist"; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."_UserWishlist" TO authenticated;


--
-- Name: TABLE _prisma_migrations; Type: ACL; Schema: public; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public._prisma_migrations TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: neondb_owner
--

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: neondb_owner
--

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: neondb_owner
--

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;


--
-- PostgreSQL database dump complete
--

\unrestrict uZl40CKzlobXHb04MFAbv1bqDg6dgSNHNHQLpz4Qt3koDMdPdAnqtJWooKjdvkN

