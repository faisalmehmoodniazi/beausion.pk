require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 11 },
  fileFilter: (_, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error("Only JPG, PNG and WEBP images are allowed"), ok);
  }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, default: 0 },
  category: { type: String, default: "Sneakers" },
  gender: { type: String, default: "Men" },
  sizes: { type: [String], default: [] },
  variants: { type: [{ label: String, values: [String] }], default: [] },
  stock: { type: Number, default: 0 },
  image: { type: String, default: "" },
  images: { type: [String], default: [] },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model("Product", productSchema);

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: "" },
  banner: { type: String, default: "" },
  image: { type: String, default: "" },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Category = mongoose.model("Category", categorySchema);

const DEFAULT_CATEGORIES = [
  { name: "Hair Removal", slug: "hair-removal", description: "Veet, wax and smooth-skin essentials.", banner: "/assets/categories/hair-removal.jpg", image: "/assets/categories/hair-removal.jpg" },
  { name: "Perfumes & Body Sprays", slug: "perfumes", description: "Signature scents and everyday freshness.", banner: "/assets/categories/perfumes.jpg", image: "/assets/categories/perfumes.jpg" },
  { name: "Face Powders & Makeup", slug: "face-powders", description: "Compacts, powders and complexion essentials.", banner: "/assets/categories/face-powders.jpg", image: "/assets/categories/face-powders.jpg" },
  { name: "Skincare", slug: "skincare", description: "Cleansers, lotions and daily skin care.", banner: "/assets/categories/skincare.jpg", image: "/assets/categories/skincare.jpg" }
];
function slugify(value) { return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
async function ensureDefaultCategories() {
  const count = await Category.countDocuments();
  if (!count) await Category.insertMany(DEFAULT_CATEGORIES);
}

const orderSchema = new mongoose.Schema({
  customer: {
    name: String,
    phone: String,
    address: String,
    city: String
  },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    quantity: Number,
    size: String,
    variant: String,
    image: String
  }],
  total: Number,
  paymentMethod: { type: String, default: "COD" },
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model("Order", orderSchema);

function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Admin login required" });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || "fallbacksecretkey");
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Categories
app.get("/api/categories", async (req, res) => {
  try { res.json(await Category.find({ active: true }).sort({ createdAt: 1, name: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/admin/categories", adminAuth, async (req, res) => {
  try { res.json(await Category.find().sort({ createdAt: 1, name: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

app.post("/api/categories", adminAuth, upload.fields([{ name: "image", maxCount: 1 }, { name: "banner", maxCount: 1 }]), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Category name is required" });
    const slug = slugify(req.body.slug || name);
    if (!slug) return res.status(400).json({ message: "A valid category slug is required" });
    const category = await Category.create({
      name, slug, description: req.body.description || "", active: req.body.active !== "false",
      image: req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : "",
      banner: req.files?.banner?.[0] ? `/uploads/${req.files.banner[0].filename}` : ""
    });
    res.status(201).json(category);
  } catch (e) { res.status(400).json({ message: e.code === 11000 ? "Category name or slug already exists" : e.message }); }
});

app.put("/api/categories/:id", adminAuth, upload.fields([{ name: "image", maxCount: 1 }, { name: "banner", maxCount: 1 }]), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    const oldName = category.name;
    if (req.body.name !== undefined) category.name = String(req.body.name).trim();
    if (req.body.slug !== undefined) category.slug = slugify(req.body.slug);
    if (req.body.description !== undefined) category.description = req.body.description;
    if (req.body.active !== undefined) category.active = req.body.active === "true";
    if (req.files?.image?.[0]) category.image = `/uploads/${req.files.image[0].filename}`;
    if (req.files?.banner?.[0]) category.banner = `/uploads/${req.files.banner[0].filename}`;
    await category.save();
    if (oldName !== category.name) await Product.updateMany({ category: oldName }, { $set: { category: category.name } });
    res.json(category);
  } catch (e) { res.status(400).json({ message: e.code === 11000 ? "Category name or slug already exists" : e.message }); }
});

app.delete("/api/categories/:id", adminAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount) return res.status(400).json({ message: `Move ${productCount} product(s) to another category before deleting this category.` });
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Products
app.get("/api/products", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== "All") filter.$or = [{ category: req.query.category }, { gender: req.query.category }];
    if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Product not found" });
    res.json(p);
  } catch (e) { res.status(400).json({ message: "Invalid product ID" }); }
});

app.post("/api/products", adminAuth, upload.fields([{ name: "image", maxCount: 1 }, { name: "gallery", maxCount: 10 }]), async (req, res) => {
  try {
    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),
      oldPrice: Number(req.body.oldPrice || 0),
      category: req.body.category || "Sneakers",
      gender: req.body.gender || "Men",
      sizes: req.body.sizes ? JSON.parse(req.body.sizes) : [],
      variants: req.body.variants ? JSON.parse(req.body.variants) : [],
      stock: Number(req.body.stock || 0),
      featured: req.body.featured === "true",
      image: req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : "",
      images: (req.files?.gallery || []).map(f => `/uploads/${f.filename}`)
    });
    res.status(201).json(product);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put("/api/products/:id", adminAuth, upload.fields([{ name: "image", maxCount: 1 }, { name: "gallery", maxCount: 10 }]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const fields = ["name","description","category","gender"];
    fields.forEach(f => { if (req.body[f] !== undefined) product[f] = req.body[f]; });
    if (req.body.price !== undefined) product.price = Number(req.body.price);
    if (req.body.oldPrice !== undefined) product.oldPrice = Number(req.body.oldPrice);
    if (req.body.stock !== undefined) product.stock = Number(req.body.stock);
    if (req.body.sizes) product.sizes = JSON.parse(req.body.sizes);
    if (req.body.variants) product.variants = JSON.parse(req.body.variants);
    if (req.body.featured !== undefined) product.featured = req.body.featured === "true";
    if (req.files?.image?.[0]) product.image = `/uploads/${req.files.image[0].filename}`;
    if (req.files?.gallery?.length) product.images = req.files.gallery.map(f => `/uploads/${f.filename}`);
    await product.save();
    res.json(product);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete("/api/products/:id", adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Multer upload error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Image is too large. Maximum size is 20 MB per image." });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) return res.status(400).json({ message: err.message });
  next();
});

// Orders
app.post("/api/orders", async (req, res) => {
  try {
    const { customer, items, paymentMethod = "COD" } = req.body;
    if (!customer?.name || !customer?.phone || !customer?.address || !customer?.city)
      return res.status(400).json({ message: "Please fill all customer fields" });
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ message: "Cart is empty" });

    const ids = items.map(x => x.productId);
    const products = await Product.find({ _id: { $in: ids } });
    const map = new Map(products.map(p => [String(p._id), p]));
    let total = 0;

    const orderItems = items.map(item => {
      const p = map.get(String(item.productId));
      if (!p) throw new Error("One product no longer exists");
      const qty = Math.max(1, Number(item.quantity || 1));
      if (p.stock < qty) throw new Error(`${p.name} is out of stock`);
      total += p.price * qty;
      return { productId: p._id, name: p.name, price: p.price, quantity: qty, size: item.size || "", variant: item.variant || "", image: p.image };
    });

    for (const item of orderItems) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } });
    }

    const order = await Order.create({ customer, items: orderItems, total, paymentMethod });
    res.status(201).json({ message: "Order placed successfully", orderId: order._id, total });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.get("/api/orders", adminAuth, async (_, res) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.patch("/api/orders/:id/status", adminAuth, async (req, res) => {
  try {
    const allowed = ["Pending","Confirmed","Shipped","Delivered","Cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid status" });
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(order);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Admin login
app.post("/api/admin/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const adminEmail = process.env.ADMIN_EMAIL || "fmehmood982@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "123456";
  if (email !== adminEmail || password !== adminPassword)
    return res.status(401).json({ message: "Invalid admin credentials" });

  const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET || "fallbacksecretkey", { expiresIn: "2d" });
  res.json({ token });
});

app.get("/api/stats", adminAuth, async (_, res) => {
  const [products, orders, categories, revenue] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    Category.countDocuments(),
    Order.aggregate([{ $match: { status: { $ne: "Cancelled" } } }, { $group: { _id: null, total: { $sum: "$total" } } }])
  ]);
  res.json({ products, orders, categories, revenue: revenue[0]?.total || 0 });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Database Connection & Server Listener
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is not configured. Copy .env.example to .env and add your MongoDB connection string.");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
.then(async () => {
  await ensureDefaultCategories();
  console.log("Connected to MongoDB successfully!");
  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  }
})
.catch((err) => console.error("MongoDB Connection Error:", err.message));

module.exports = app;
