const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 4173;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "todos.json");

app.use(express.json());
app.use(express.static(__dirname));

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]\n", "utf8");
  }
}

async function readTodos() {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTodos(todos) {
  await ensureStore();
  await fs.writeFile(DATA_FILE, `${JSON.stringify(todos, null, 2)}\n`, "utf8");
}

function sortTodos(todos) {
  return [...todos].sort((a, b) => b.createdAt - a.createdAt);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/todos", async (_req, res, next) => {
  try {
    const todos = await readTodos();
    res.json(sortTodos(todos));
  } catch (error) {
    next(error);
  }
});

app.post("/api/todos", async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim();

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const todos = await readTodos();
    const now = Date.now();
    const todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    todos.unshift(todo);
    await writeTodos(todos);
    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
});

app.put("/api/todos/:id", async (req, res, next) => {
  try {
    const todoId = req.params.id;
    const todos = await readTodos();
    const index = todos.findIndex((item) => item.id === todoId);

    if (index === -1) {
      return res.status(404).json({ message: "todo not found" });
    }

    const current = todos[index];
    const nextTitle = req.body?.title;
    const nextCompleted = req.body?.completed;
    const updatedTodo = {
      ...current,
      title: typeof nextTitle === "string" ? nextTitle.trim() || current.title : current.title,
      completed: typeof nextCompleted === "boolean" ? nextCompleted : current.completed,
      updatedAt: Date.now(),
    };

    todos[index] = updatedTodo;
    await writeTodos(todos);
    res.json(updatedTodo);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/todos/:id", async (req, res, next) => {
  try {
    const todoId = req.params.id;
    const todos = await readTodos();
    const nextTodos = todos.filter((item) => item.id !== todoId);

    if (nextTodos.length === todos.length) {
      return res.status(404).json({ message: "todo not found" });
    }

    await writeTodos(nextTodos);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "internal server error" });
});

ensureStore()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Todo app server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
