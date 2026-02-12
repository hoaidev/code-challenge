/**
 * Parses vitest JSON reporter output and generates a detailed markdown report.
 *
 * Usage:  bun test/helpers/generate-report.ts <json-file> <output-md> [duration-seconds]
 */
import { readFileSync, writeFileSync } from 'fs';
import { relative } from 'path';

interface AssertionResult {
  ancestorTitles: string[];
  title: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  duration: number | null;
  failureMessages: string[];
}

interface TestResult {
  name: string;
  status: string;
  assertionResults: AssertionResult[];
}

interface VitestJsonOutput {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numPendingTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  startTime: number;
  success: boolean;
  testResults: TestResult[];
}

const [jsonPath, outputPath, durationArg] = process.argv.slice(2);

if (!jsonPath || !outputPath) {
  console.error(
    'Usage: bun generate-report.ts <json-file> <output-md> [duration-seconds]',
  );
  process.exit(1);
}

const raw = readFileSync(jsonPath, 'utf-8');
const data = JSON.parse(raw) as VitestJsonOutput;
const cwd = process.cwd();
const duration = durationArg ?? '?';

const statusIcon = (s: string) => {
  switch (s) {
    case 'passed':
      return 'PASS';
    case 'failed':
      return 'FAIL';
    case 'pending':
      return 'SKIP';
    case 'skipped':
      return 'SKIP';
    default:
      return s.toUpperCase();
  }
};

const lines: string[] = [];
const push = (line = '') => lines.push(line);

// ── Header ──────────────────────────────────────────────────────────
push('# E2E Test Report');
push();
push('| Field | Value |');
push('|-------|-------|');
push(
  `| **Date** | ${new Date().toISOString().replace('T', ' ').slice(0, 19)} |`,
);
push(`| **Status** | ${data.success ? 'PASSED' : 'FAILED'} |`);
push(`| **Duration** | ${duration}s |`);
push();

// ── Summary ─────────────────────────────────────────────────────────
push('## Summary');
push();
push('| Metric | Passed | Failed | Skipped | Total |');
push('|--------|--------|--------|---------|-------|');
push(
  `| Test Suites | ${data.numPassedTestSuites} | ${data.numFailedTestSuites} | ${data.numPendingTestSuites} | ${data.numTotalTestSuites} |`,
);
push(
  `| Tests | ${data.numPassedTests} | ${data.numFailedTests} | ${data.numPendingTests} | ${data.numTotalTests} |`,
);
push();

// ── Per-suite test cases ────────────────────────────────────────────
push('## Test Cases');
push();

const failures: { suite: string; test: string; messages: string[] }[] = [];

for (const suite of data.testResults) {
  const suiteName = relative(cwd, suite.name);
  push(`### ${suiteName}`);
  push();
  push('| # | Test | Status | Duration |');
  push('|---|------|--------|----------|');

  suite.assertionResults.forEach((t, i) => {
    const fullName = [...t.ancestorTitles, t.title].join(' > ');
    const dur = t.duration != null ? `${t.duration}ms` : '-';
    const status = statusIcon(t.status);
    push(`| ${i + 1} | ${fullName} | ${status} | ${dur} |`);

    if (t.status === 'failed' && t.failureMessages.length > 0) {
      failures.push({
        suite: suiteName,
        test: fullName,
        messages: t.failureMessages,
      });
    }
  });

  push();
}

// ── Failures detail ─────────────────────────────────────────────────
push('## Failures');
push();

if (failures.length === 0) {
  push('No failures.');
} else {
  for (const f of failures) {
    push(`### FAIL: ${f.test}`);
    push();
    push(`**Suite:** ${f.suite}`);
    push();
    push('```');
    for (const msg of f.messages) {
      // Strip ANSI escape codes for readability
      push(msg.replace(/\x1b\[[0-9;]*m/g, ''));
    }
    push('```');
    push();
  }
}

writeFileSync(outputPath, lines.join('\n') + '\n');
console.log(`Report written to ${outputPath}`);
