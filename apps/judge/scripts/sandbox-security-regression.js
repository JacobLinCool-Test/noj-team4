/* eslint-disable no-console */
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const IMAGE = process.env.NOJ_SANDBOX_IMAGE || 'noj4-sandbox:0.1';

const DOCKER_CPU = process.env.NOJ_SANDBOX_DOCKER_CPUS || '1';
const DOCKER_MEMORY = process.env.NOJ_SANDBOX_DOCKER_MEMORY || '512m';
const DOCKER_PIDS_LIMIT = Number.parseInt(process.env.NOJ_SANDBOX_DOCKER_PIDS_LIMIT || '256', 10);
const DOCKER_TMPFS_SIZE = process.env.NOJ_SANDBOX_DOCKER_TMPFS_SIZE || '128m';
const OUTPUT_LIMIT_BYTES = Number.parseInt(process.env.NOJ_SANDBOX_OUTPUT_LIMIT_BYTES || String(256 * 1024), 10);

function sourceFileName(lang) {
  switch (lang) {
    case 'C':
      return 'main.c';
    case 'CPP':
      return 'main.cpp';
    case 'JAVA':
      return 'Main.java';
    case 'PYTHON':
      return 'main.py';
    default:
      throw new Error(`unsupported lang: ${lang}`);
  }
}

async function execDocker(args, { stdin, timeoutMs, maxOutputBytes } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let done = false;

    const kill = (reason) => {
      if (done) return;
      done = true;
      try {
        proc.kill('SIGKILL');
      } catch {}
      reject(new Error(reason));
    };

    const maxBytes = maxOutputBytes ?? 256 * 1024;
    proc.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
      if (Buffer.byteLength(stdout, 'utf8') > maxBytes) kill('maxBuffer exceeded');
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
      if (Buffer.byteLength(stderr, 'utf8') > maxBytes) kill('maxBuffer exceeded');
    });

    if (stdin !== undefined) proc.stdin.write(stdin);
    proc.stdin.end();

    const timer = setTimeout(() => kill('timeout'), timeoutMs ?? 60_000);

    proc.on('error', (e) => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      reject(e);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });
  });
}

async function execDockerRun({ name, jobDir, argsAfterImage, stdin, timeoutMs }) {
  const args = [
    'run',
    '--rm',
    '--name',
    name,
    '--network',
    'none',
    '--read-only',
    '--tmpfs',
    `/tmp:rw,noexec,nosuid,size=${DOCKER_TMPFS_SIZE}`,
    '--cap-drop',
    'ALL',
    '--pids-limit',
    String(DOCKER_PIDS_LIMIT),
    '--cpus',
    DOCKER_CPU,
    '--memory',
    DOCKER_MEMORY,
    '--memory-swap',
    DOCKER_MEMORY,
    '-e',
    `NOJ_SANDBOX_OUTPUT_LIMIT_BYTES=${OUTPUT_LIMIT_BYTES}`,
    '-e',
    'PYTHONDONTWRITEBYTECODE=1',
    '-v',
    `${jobDir}:/work:rw`,
    '-w',
    '/work',
    '-i',
    IMAGE,
    ...argsAfterImage,
  ];

  try {
    return await execDocker(args, { stdin, timeoutMs, maxOutputBytes: 32 * 1024 });
  } catch (e) {
    await execDocker(['rm', '-f', name], { timeoutMs: 5000, maxOutputBytes: 8 * 1024 }).catch(() => {});
    throw e;
  }
}

async function ensureDockerReady() {
  await execDocker(['--version'], { timeoutMs: 5000 });
  await execDocker(['image', 'inspect', IMAGE], { timeoutMs: 5000 });
}

async function withJob(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'noj-sandbox-regression-'));
  try {
    await fs.chmod(root, 0o777);
    await fs.mkdir(path.join(root, 'src'), { recursive: true });
    await fs.chmod(path.join(root, 'src'), 0o777);
    await fs.mkdir(path.join(root, 'build'), { recursive: true });
    await fs.chmod(path.join(root, 'build'), 0o777);
    await fs.mkdir(path.join(root, 'out'), { recursive: true });
    await fs.chmod(path.join(root, 'out'), 0o777);
    return await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function compile(jobDir, lang, code) {
  await fs.writeFile(path.join(jobDir, 'src', sourceFileName(lang)), code, { mode: 0o644 });
  const name = `noj4-reg-compile-${crypto.randomBytes(6).toString('hex')}`;
  return execDockerRun({ name, jobDir, argsAfterImage: ['compile', lang], timeoutMs: 45_000 });
}

async function run(jobDir, lang, { stdin = '', timeLimitMs = 1000, memoryLimitKb = 262144 } = {}) {
  const stdoutFile = path.join(jobDir, 'out', 'stdout.txt');
  const stderrFile = path.join(jobDir, 'out', 'stderr.txt');
  // Create files and explicitly chmod to 0666 (writeFile mode is affected by umask)
  // Docker with --cap-drop=ALL loses CAP_DAC_OVERRIDE, so files must be world-writable
  await fs.writeFile(stdoutFile, '');
  await fs.chmod(stdoutFile, 0o666);
  await fs.writeFile(stderrFile, '');
  await fs.chmod(stderrFile, 0o666);

  const name = `noj4-reg-run-${crypto.randomBytes(6).toString('hex')}`;
  const started = Date.now();
  const result = await execDockerRun({
    name,
    jobDir,
    argsAfterImage: [
      'run',
      lang,
      '--time-limit-ms',
      String(timeLimitMs),
      '--memory-limit-kb',
      String(memoryLimitKb),
      '--stdout-file',
      '/work/out/stdout.txt',
      '--stderr-file',
      '/work/out/stderr.txt',
    ],
    stdin,
    timeoutMs: timeLimitMs + 5000,
  });

  const elapsedMs = Date.now() - started;
  const stdout = await fs.readFile(stdoutFile).then((b) => b.toString('utf8')).catch(() => '');
  const stderr = await fs.readFile(stderrFile).then((b) => b.toString('utf8')).catch(() => '');
  return { ...result, elapsedMs, stdout, stderr };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  await ensureDockerReady();

  const tests = [
    {
      name: 'fork bomb blocked by pids-limit',
      lang: 'C',
      compileCode: `
#include <unistd.h>
#include <errno.h>
#include <stdio.h>
int main() {
  while (1) {
    if (fork() == -1) { perror("fork"); return 1; }
  }
}
      `.trim(),
      runOpts: { timeLimitMs: 500 },
      verify: (r) => {
        assert(r.elapsedMs < 5000, 'fork bomb should not hang');
        assert(r.exitCode !== 0, 'fork bomb should not exit 0');
      },
    },
    {
      name: 'no network access',
      lang: 'PYTHON',
      compileCode: `
import socket
s = socket.socket()
s.settimeout(1.0)
s.connect(("1.1.1.1", 53))
print("connected")
      `.trim(),
      runOpts: { timeLimitMs: 1000 },
      verify: (r) => {
        assert(r.exitCode !== 0, 'network access should fail');
      },
    },
    {
      name: 'read-only rootfs',
      lang: 'PYTHON',
      compileCode: `
from pathlib import Path
Path("/etc/noj4_sandbox_should_fail").write_text("x")
print("wrote")
      `.trim(),
      runOpts: { timeLimitMs: 1000 },
      verify: (r) => {
        assert(r.exitCode !== 0, 'writing to /etc should fail');
      },
    },
    {
      name: 'output limit (OLE)',
      lang: 'PYTHON',
      compileCode: `
while True:
  print("A" * 1024)
      `.trim(),
      runOpts: { timeLimitMs: 1000 },
      verify: (r) => {
        const lower = (r.stderr || '').toLowerCase();
        assert(r.exitCode !== 0, 'output limiter should stop the program');
        assert(r.exitCode === 153 || lower.includes('file too large'), 'expected SIGXFSZ/file too large');
      },
    },
    {
      name: 'time limit (TLE)',
      lang: 'C',
      compileCode: `
int main() { while (1) {} }
      `.trim(),
      runOpts: { timeLimitMs: 300 },
      verify: (r) => {
        assert(r.exitCode !== 0, 'TLE should stop the program');
        assert(r.elapsedMs < 5000, 'TLE should not hang');
      },
    },
    {
      name: 'memory limit (MLE/OOM)',
      lang: 'C',
      compileCode: `
#include <stdlib.h>
#include <string.h>
int main() {
  size_t n = 1024 * 1024;
  for (;;) {
    char* p = (char*)malloc(n);
    if (!p) return 1;
    memset(p, 1, n);
  }
}
      `.trim(),
      runOpts: { timeLimitMs: 1000, memoryLimitKb: 64 * 1024 },
      verify: (r) => {
        assert(r.exitCode !== 0, 'memory limit should stop the program');
        assert(r.elapsedMs < 5000, 'MLE should not hang');
      },
    },
  ];

  let failed = 0;
  for (const t of tests) {
    process.stdout.write(`- ${t.name} ... `);
    try {
      await withJob(async (jobDir) => {
        const c = await compile(jobDir, t.lang, t.compileCode);
        assert(c.exitCode === 0, `compile failed: ${c.stderr || c.stdout}`);
        const r = await run(jobDir, t.lang, t.runOpts);
        t.verify(r);
      });
      console.log('OK');
    } catch (e) {
      failed += 1;
      console.log('FAIL');
      console.error(String(e && e.stack ? e.stack : e));
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll sandbox security regression tests passed.');
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});

