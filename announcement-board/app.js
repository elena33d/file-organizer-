import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");


app.get("/", async (req, res) => {
  const { search, sort = "newest", page = 1 } = req.query;

  const where = search
    ? { title: { contains: search, mode: "insensitive" } }
    : {};

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" }
      : { createdAt: "desc" };

  const perPage = 10;
  const skip = (Number(page) - 1) * perPage;

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy,
    skip,
    take: perPage
  });

  const total = await prisma.announcement.count({ where });
  const totalPages = Math.ceil(total / perPage);

  res.render("index", {
    announcements,
    search: search || "",
    sort,
    page: Number(page),
    totalPages
  });
});


app.get("/announcements", (req, res) => {
  res.render("new", { errors: {}, data: {} });
});


app.post("/announcements", async (req, res) => {
  const { title, description, price, category, contactInfo } = req.body;
  const errors = {};

  if (!title || title.trim().length < 5)
    errors.title = "Назва має бути ≥ 5 символів";

  if (!description || description.trim().length < 10)
    errors.description = "Опис має бути ≥ 10 символів";

  if (!["sale", "service", "job", "other"].includes(category))
    errors.category = "Оберіть категорію";

  if (!price || isNaN(price) || Number(price) <= 0)
    errors.price = "Ціна має бути > 0";

  if (!contactInfo || contactInfo.trim().length < 5)
    errors.contactInfo = "Контакти мінімум 5 символів";

  if (Object.keys(errors).length > 0) {
    return res.render("new", {
      errors,
      data: req.body
    });
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      contactInfo: contactInfo.trim()
    }
  });

  res.redirect(`/announcements/${announcement.id}`);
});


app.get("/announcements/:id", async (req, res) => {
  const ann = await prisma.announcement.findUnique({
    where: { id: Number(req.params.id) }
  });

  if (!ann) {
    return res.status(404).render("404", {
      message: "Оголошення не знайдено"
    });
  }

  res.render("announcement", { ann });
});


app.delete("/announcements/:id", async (req, res) => {
  await prisma.announcement.delete({
    where: { id: Number(req.params.id) }
  });

  res.status(204).end();
});


app.use((req, res) => {
  res.status(404).render("404", {
    message: "Сторінку не знайдено"
  });
});


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error");
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});