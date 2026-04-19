/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/** Curated ethnic-wear photography (Unsplash). Run once: `npx prisma db seed` */
const SAREES = [
  {
    slug: "celestial-glow-zarocan-chiffon-saree",
    name: "Celestial Glow Zarocan Chiffon Saree",
    description:
      "Feather-light chiffon with a soft sheen and a refined zari border. Drapes beautifully for brunches, pujas, and daytime celebrations.",
    story:
      "Our Zarocan weave pairs airy poly chiffon with tonal hand-finished edges so the silhouette stays fluid from pleat to pallu.",
    mrp: 1999,
    discountedPrice: 1299,
    material: "Poly Soft Chiffon",
    occasion: "Daily",
    imageUrls: [
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1200&q=85"
    ]
  },
  {
    slug: "royal-purple-zari-silk-saree-blouse",
    name: "Royal Purple Zari Woven Silk Saree with Blouse Piece",
    description:
      "Rich jewel-toned silk with traditional zari motifs across the body and pallu. Includes contrast unstitched blouse fabric.",
    story: "Woven on compact power-loomed silk with tested colour fastness and a structured fall for formal occasions.",
    mrp: 3499,
    discountedPrice: 2999,
    material: "Silk blend",
    occasion: "Wedding",
    imageUrls: [
      "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1200&q=85"
    ]
  },
  {
    slug: "wine-maroon-banarasi-silk-saree-blouse",
    name: "Wine Maroon Banarasi Silk Saree with Blouse Piece",
    description:
      "Deep wine body with antique gold brocade detailing. Ideal for sangeet, reception, and festive evenings.",
    story: "Inspired by Banaras brocade layouts with a modern colour story and a balanced weight for all-night comfort.",
    mrp: 3499,
    discountedPrice: 2999,
    material: "Silk",
    occasion: "Wedding",
    imageUrls: [
      "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?auto=format&fit=crop&w=1200&q=85"
    ]
  },
  {
    slug: "olive-green-mukaish-chiffon-saree",
    name: "Olive Green Mukaish Chiffon Saree",
    description:
      "Muted olive base with delicate mukaish-inspired shimmer across the pallu. Effortless drape for mehendi and garden parties.",
    story: "Soft chiffon with controlled flare so pleats stay neat without heavy stiffening.",
    mrp: 2300,
    discountedPrice: 2099,
    material: "Chiffon",
    occasion: "Festive",
    imageUrls: [
      "https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?auto=format&fit=crop&w=1200&q=85"
    ]
  },
  {
    slug: "rose-pink-embroidered-georgette-saree",
    name: "Rose Pink Embroidered Georgette Saree with Blouse Piece",
    description:
      "Romantic rose palette with tonal thread embroidery along the border. Light georgette for graceful movement.",
    story: "Georgette selected for breathability and a fluid fall; blouse fabric coordinates with border tones.",
    mrp: 3499,
    discountedPrice: 2999,
    material: "Georgette",
    occasion: "Wedding",
    imageUrls: [
      "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=1200&q=85"
    ]
  },
  {
    slug: "elegant-white-pink-floral-chiffon-saree",
    name: "Elegant White & Pink Floral Printed Chiffon Saree",
    description:
      "Airborne florals on a soft ivory base with blush highlights. Perfect for daytime rituals and intimate receptions.",
    story: "Digital print on premium chiffon with finished edges and a blouse piece in coordinating pink.",
    mrp: 3499,
    discountedPrice: 2399,
    material: "Chiffon",
    occasion: "Festive",
    imageUrls: [
      "https://images.unsplash.com/photo-1583391738853-10e42a9fe8d0?auto=format&fit=crop&w=1200&q=85"
    ]
  }
];

async function main() {
  for (const s of SAREES) {
    const exists = await prisma.product.findUnique({ where: { slug: s.slug } });
    if (exists) {
      console.log("Skip (exists):", s.slug);
      continue;
    }
    await prisma.product.create({
      data: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        story: s.story,
        mrp: s.mrp,
        discountedPrice: s.discountedPrice,
        category: "Sarees",
        tags: ["Summer Special"],
        material: s.material,
        occasion: s.occasion,
        imageUrls: s.imageUrls,
        listImageIndex: 0,
        listImagePosition: "center",
        variants: {
          create: [{ color: "As shown", size: "Free", stock: 32, isActive: true }]
        }
      }
    });
    console.log("Created:", s.slug);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
