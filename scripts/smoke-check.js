const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const dataFile = path.join(projectDir, 'data', 'todos.json');
const port = process.env.PORT || '4173';
const baseUrl = `http://127.0.0.1:${port}`;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

async function waitForHealthy(retries = 30) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const { response, body } = await request(`${baseUrl}/api/health`);
      if (response.ok && body && body.ok === true) return;
    } catch {}
    await wait(500);
  }

  throw new Error('Server did not become healthy in time');
}

async function main() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, '[]\n', 'utf8');

  const child = spawn(process.execPath, ['server.js'], {
    cwd: projectDir,
    stdio: 'inherit',
    env: { ...process.env, PORT: port },
  });

  const cleanup = () => {
    if (!child.killed) child.kill('SIGTERM');
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(1);
  });

  try {
    await waitForHealthy();

    const list1 = await request(`${baseUrl}/api/todos`);
    if (!list1.response.ok || !Array.isArray(list1.body)) {
      throw new Error('GET /api/todos failed');
    }

    const created = await request(`${baseUrl}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'CI smoke todo' }),
    });
    if (created.response.status !== 201 || !created.body?.id) {
      throw new Error('POST /api/todos failed');
    }

    const updated = await request(`${baseUrl}/api/todos/${created.body.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true, title: 'CI smoke todo updated' }),
    });
    if (!updated.response.ok || updated.body?.completed !== true) {
      throw new Error('PUT /api/todos/:id failed');
    }

    const removed = await request(`${baseUrl}/api/todos/${created.body.id}`, {
      method: 'DELETE',
    });
    if (removed.response.status !== 204) {
      throw new Error('DELETE /api/todos/:id failed');
    }

    console.log('Smoke check passed');
  } finally {
    cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
