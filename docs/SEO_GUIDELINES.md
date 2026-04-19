Make this Next.js ecommerce site SEO ready.

RULES:

1. Rendering
- use server components where possible
- avoid client-only rendering for pages
- no data fetching only in useEffect for main content

2. Metadata
- every page must have metadata
- include title, description
- use generateMetadata for dynamic pages

3. Product pages
- dynamic SEO from database
- title = product name
- description = product description
- include keywords if available

4. URLs
- clean URLs only
- use slug (no query params)
- example: /product/red-silk-saree

5. Images
- all images must have alt text
- use meaningful alt (product name + details)
- use optimized images (Next/Image or CDN)

6. Sitemap
- generate sitemap.xml
- include all products, categories, pages

7. Robots
- add robots.txt
- allow indexing except admin/auth pages

8. Performance
- avoid blocking UI
- optimize LCP images
- use lazy loading where needed

9. Structured data (important)
- add JSON-LD for products
- include price, availability, name

10. Internal linking
- link related products
- link categories properly

11. No hydration issues
- avoid server/client mismatch
- stable rendering

12. Accessibility (affects SEO)
- proper headings (h1, h2)
- semantic HTML

GOAL:
fast, crawlable, production SEO ready ecommerce site.