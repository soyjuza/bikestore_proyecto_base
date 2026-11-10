const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const productsRoutes = require("./routes/products.routes");
const cartRoutes = require("./routes/cart.routes");
const ordersRoutes = require("./routes/orders.routes");
const usersRoutes = require("./routes/users.routes");
const reportsRoutes = require("./routes/reports.routes");
const errorHandler = require("./middlewares/error.middleware");
const { limiteGeneral } = require("./middlewares/rateLimit.middleware");

const app = express();

// Cabeceras de seguridad. Las imágenes de /uploads las pide el frontend desde otro puerto,
// por eso se permite cargarlas desde otro origen.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Solo el frontend del proyecto puede llamar a la API desde un navegador
app.use(cors({ origin: env.corsOrigins }));

app.use(express.json({ limit: "100kb" }));

// Si la petición llega sin cuerpo, req.body queda como objeto vacío y los controladores no fallan
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    req.body = {};
  }
  next();
});

app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"), { dotfiles: "ignore", index: false }),
);

app.use("/api", limiteGeneral);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "BikeStore API funcional" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reports", reportsRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Ruta no encontrada",
  });
});

app.use(errorHandler);

module.exports = app;
