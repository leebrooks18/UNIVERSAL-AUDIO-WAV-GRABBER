import { spawn } from 'node:child_process';

// Run a command, streaming nothing back, resolving once it exits successfully.
export function run(cmd, args) {
  return new Promise((resolve, reject) => {
    console.log('Running:', cmd, args.join(' '));
    const proc = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || `${cmd} exited with code ${code}`));
      else resolve();
    });
  });
}

// Run a command and capture stdout, for JSON-emitting invocations.
export function runCapture(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || `${cmd} exited with code ${code}`));
      else resolve(stdout);
    });
  });
}
