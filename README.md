# Beausion.pk — Beauty & Personal Care Store

A premium beauty e-commerce storefront built from the supplied shoe-store project.

## New in this version
- Daraz-style product detail page at `/product.html?id=PRODUCT_ID`
- Large product gallery, thumbnails, price/discount, stock, delivery information, quantity controls, Add to Bag and WhatsApp CTA
- Dynamic category pages with category-specific hero/banner images
- Admin category management: create, edit, hide/show and delete categories
- Admin category card image + wide banner upload
- Products added in Admin are assigned to a category and appear automatically on that collection page
- Default Beausion categories are seeded automatically on first database connection

## Setup
1. Copy `.env.example` to `.env`.
2. Add your MongoDB connection string and admin credentials.
3. Run `npm install`.
4. Run `npm start`.
5. Open `/admin.html` for the dashboard.

## Category workflow
Admin → Categories → Add Category → upload card image + banner → save.
Then Admin → Products → choose that category when adding a product.

If a category contains products, the API prevents accidental deletion until those products are moved to another category.
