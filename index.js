const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const JWT_SECRET = "supersecretkey_change_this";

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "strom_store"
});

db.connect(err => {
    if (err) return console.log("MySQL Error:", err);
    console.log("MySQL connected!");
});

// Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});
const upload = multer({ storage });

// Seed admin
db.query("SELECT * FROM users WHERE email='admin@example.com'", (err, res) => {
    if (!res || res.length === 0) {
        const hash = bcrypt.hashSync("admin123", 10);
        db.query("INSERT INTO users (username, email, password, is_admin) VALUES ('Admin', 'admin@example.com', ?, 1)", [hash]);
        console.log("Admin user created: admin@example.com / admin123");
    }
});

function auth(req, res, next) {
    const h = req.headers.authorization;
    if (!h) return res.status(401).json({ error: "no token" });
    const token = h.split(" ")[1];
    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data;
        next();
    } catch(e) { return res.status(401).json({ error: "invalid token" }); }
}

// Games
app.get("/games", (req, res) => {
    db.query("SELECT * FROM games", (err, result) => {
        if (err) return res.json({ error: err });
        res.json(result);
    });
});

app.post("/games", auth, upload.single("image"), (req, res) => {
    if (!req.user || !req.user.is_admin) return res.status(403).json({ error: "forbidden" });
    const { title, price, description } = req.body;
    const thumb = req.file ? "/uploads/" + req.file.filename : "";
    db.query("INSERT INTO games (title, price, thumb, description) VALUES (?, ?, ?, ?)", [title, price, thumb, description], err => {
        if (err) return res.json({ error: err });
        res.json({ success: true });
    });
});

app.delete("/games/:id", auth, (req, res) => {
    if (!req.user || !req.user.is_admin) return res.status(403).json({ error: "forbidden" });
    db.query("DELETE FROM games WHERE id = ?", [req.params.id], err => {
        if (!err) res.json({ success: true });
        else res.json({ error: err });
    });
});

// Register/Login
app.post("/register", (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "missing data" });
    const hash = bcrypt.hashSync(password, 10);
    db.query("INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 0)", [username, email, hash], (err) => {
        if (err) return res.json({ error: err });
        res.json({ success: true });
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
        if (err) return res.json({ error: err });
        if (!result[0]) return res.status(400).json({ error: "user not found" });
        const user = result[0];
        if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: "invalid password" });
        const token = jwt.sign({ id: user.id, username: user.username, email: user.email, is_admin: user.is_admin==1 }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin==1 } });
    });
});

// Profile
app.get("/profile", auth, (req, res) => {
    db.query("SELECT id, username, email, is_admin FROM users WHERE id = ?", [req.user.id], (err, result) => {
        if (err) return res.json({ error: err });
        res.json(result[0]);
    });
});

// Orders: create order (requires auth)
app.post("/orders", auth, (req, res) => {
    const { items, total } = req.body;
    if (!items || !total) return res.status(400).json({ error: "missing" });
    const itemsJson = JSON.stringify(items);
    db.query("INSERT INTO orders (user_id, total, items, status) VALUES (?, ?, ?, 'new')", [req.user.id, total, itemsJson], (err, result) => {
        if (err) return res.json({ error: err });
        res.json({ success: true, orderId: result.insertId });
    });
});

// Fake payment: pay order
app.post("/orders/:id/pay", auth, (req, res) => {
    const id = req.params.id;
    // verify ownership or admin
    db.query("SELECT * FROM orders WHERE id = ?", [id], (err, rows) => {
        if (err) return res.json({ error: err });
        if (!rows[0]) return res.status(404).json({ error: "not found" });
        const order = rows[0];
        if (order.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: "forbidden" });
        db.query("UPDATE orders SET status = 'paid' WHERE id = ?", [id], err2 => {
            if (err2) return res.json({ error: err2 });
            res.json({ success: true });
        });
    });
});

// User orders
app.get("/orders", auth, (req, res) => {
    db.query("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [req.user.id], (err, rows) => {
        if (err) return res.json({ error: err });
        res.json(rows);
    });
});

// Admin: list all orders and update status
app.get("/admin/orders", auth, (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: "forbidden" });
    db.query("SELECT * FROM orders ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.json({ error: err });
        res.json(rows);
    });
});

app.put("/admin/orders/:id", auth, (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: "forbidden" });
    const { status } = req.body;
    db.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], err => {
        if (err) return res.json({ error: err });
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
