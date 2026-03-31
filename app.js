const state = {
  todos: [],
  filter: "all",
  loading: true,
  saving: false,
  error: "",
};

const todoForm = document.getElementById("todoForm");
const todoInput = document.getElementById("todoInput");
const todoList = document.getElementById("todoList");
const emptyState = document.getElementById("emptyState");
const statusText = document.getElementById("statusText");
const syncText = document.getElementById("syncText");
const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const completedCount = document.getElementById("completedCount");
const template = document.getElementById("todoItemTemplate");
const filterButtons = Array.from(document.querySelectorAll(".filter"));

bootstrap();

async function bootstrap() {
  bindEvents();
  render();
  await fetchTodos();
}

function bindEvents() {
  todoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = todoInput.value.trim();

    if (!title || state.saving) {
      todoInput.focus();
      return;
    }

    setSaving(true);

    try {
      const createdTodo = await request("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title }),
      });

      state.todos.unshift(createdTodo);
      todoForm.reset();
      todoInput.focus();
      clearError();
      setSyncText("已同步到服务器");
      render();
    } catch (error) {
      handleError(error, "新增待办失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });
}

function render() {
  const filteredTodos = getFilteredTodos();

  todoList.innerHTML = "";

  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });

  filteredTodos.forEach((todo) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const toggle = node.querySelector(".toggle");
    const title = node.querySelector(".todo-title");
    const meta = node.querySelector(".todo-meta");
    const editBtn = node.querySelector(".edit-btn");
    const deleteBtn = node.querySelector(".delete-btn");
    const view = node.querySelector(".todo-view");
    const editForm = node.querySelector(".todo-edit");
    const editInput = node.querySelector(".edit-input");
    const cancelBtn = node.querySelector(".cancel-btn");

    title.textContent = todo.title;
    meta.textContent = `${todo.completed ? "已完成" : "未完成"} · 更新于 ${formatDate(todo.updatedAt)}`;
    toggle.checked = todo.completed;
    node.classList.toggle("is-completed", todo.completed);

    toggle.addEventListener("change", async () => {
      try {
        await saveTodo(todo.id, { completed: toggle.checked });
      } catch {
        toggle.checked = todo.completed;
      }
    });

    deleteBtn.addEventListener("click", async () => {
      if (state.saving) {
        return;
      }

      setSaving(true);

      try {
        await request(`/api/todos/${todo.id}`, { method: "DELETE" });
        state.todos = state.todos.filter((item) => item.id !== todo.id);
        clearError();
        setSyncText("删除成功，已同步");
        render();
      } catch (error) {
        handleError(error, "删除待办失败，请稍后重试");
      } finally {
        setSaving(false);
      }
    });

    editBtn.addEventListener("click", () => {
      view.classList.add("hidden");
      editForm.classList.remove("hidden");
      editInput.value = todo.title;
      editInput.focus();
      editInput.select();
    });

    cancelBtn.addEventListener("click", () => {
      editForm.classList.add("hidden");
      view.classList.remove("hidden");
    });

    editForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nextTitle = editInput.value.trim();

      if (!nextTitle) {
        editInput.focus();
        return;
      }

      try {
        await saveTodo(todo.id, { title: nextTitle });
        editForm.classList.add("hidden");
        view.classList.remove("hidden");
      } catch {
        editInput.focus();
      }
    });

    todoList.appendChild(node);
  });

  const total = state.todos.length;
  const active = state.todos.filter((todo) => !todo.completed).length;
  const completed = total - active;

  totalCount.textContent = total;
  activeCount.textContent = active;
  completedCount.textContent = completed;

  statusText.textContent = getStatusText(filteredTodos.length);
  emptyState.style.display = filteredTodos.length === 0 ? "grid" : "none";
}

async function fetchTodos() {
  state.loading = true;
  setSyncText("正在从服务器加载...");

  try {
    state.todos = await request("/api/todos");
    clearError();
    setSyncText("数据已从服务器加载");
  } catch (error) {
    handleError(error, "加载待办失败，请确认后端服务已启动");
  } finally {
    state.loading = false;
    render();
  }
}

async function saveTodo(id, patch) {
  if (state.saving) {
    return;
  }

  setSaving(true);

  try {
    const updated = await request(`/api/todos/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });

    state.todos = state.todos.map((todo) => (todo.id === id ? updated : todo));
    clearError();
    setSyncText("变更已同步到服务器");
    render();
    return updated;
  } catch (error) {
    handleError(error, "更新待办失败，请稍后重试");
    throw error;
  } finally {
    setSaving(false);
  }
}

function getFilteredTodos() {
  if (state.filter === "active") {
    return state.todos.filter((todo) => !todo.completed);
  }

  if (state.filter === "completed") {
    return state.todos.filter((todo) => todo.completed);
  }

  return state.todos;
}

function getStatusText(visibleCount) {
  if (state.error) {
    return state.error;
  }

  if (state.loading) {
    return "正在加载任务列表...";
  }

  const map = {
    all: "当前显示全部任务",
    active: "当前显示未完成任务",
    completed: "当前显示已完成任务",
  };

  if (visibleCount === 0) {
    return `${map[state.filter]} · 暂无数据`;
  }

  return `${map[state.filter]} · 共 ${visibleCount} 条`;
}

function setSaving(flag) {
  state.saving = flag;
  todoInput.disabled = flag;
  todoForm.querySelector("button").disabled = flag;
}

function clearError() {
  state.error = "";
}

function handleError(error, fallbackMessage) {
  console.error(error);
  state.error = error.message || fallbackMessage;
  setSyncText("同步失败");
  render();
}

function setSyncText(text) {
  if (syncText) {
    syncText.textContent = text;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "request failed");
  }

  return data;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}
