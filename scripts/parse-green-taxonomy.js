#!/usr/bin/env node
/**
 * Parse docs/green-taxo.md into a structured JSON taxonomy definition.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '..', 'docs', 'green-taxo.md');
const OUTPUT = path.resolve(__dirname, '..', 'data', 'green-taxonomy.json');

const content = fs.readFileSync(SOURCE, 'utf8').split(/\r?\n/);

const headingRegex = /^(#{1,4})\s+\*\*(.+?)\*\*/;
const numberingRegex = /^([0-9]+(?:\.[0-9]+)*)\s+(.*)$/;
const bulletRegex = /^\s*[\-*]\s*Code:\s*([^|]+?)\s*\|\s*Name:\s*(.+)$/i;

const taxonomy = [];
const stack = [null, null, null, null];
const issues = [];

function cleanTitle(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(numberingRegex);
  if (match) {
    return { code: match[1], title: match[2].trim() };
  }
  return { code: null, title: trimmed };
}

function normalizeCode(rawCode, lineNumber) {
  const digits = (rawCode || '').replace(/[^0-9]/g, '');
  if (!digits) {
    issues.push({ type: 'missing-code-digits', raw: rawCode, lineNumber });
    return null;
  }
  let normalized = digits;
  if (digits.length > 4) {
    normalized = digits.slice(0, 4);
    issues.push({ type: 'trimmed-code', raw: rawCode, normalized, lineNumber });
  } else if (digits.length < 4) {
    normalized = digits + '*'.repeat(4 - digits.length);
    issues.push({ type: 'padded-code-with-star', raw: rawCode, normalized, lineNumber });
  }
  return normalized;
}

function ensureArray(obj, field) {
  if (!obj[field]) obj[field] = [];
  return obj[field];
}

content.forEach((line, index) => {
  const lineNumber = index + 1;
  const headingMatch = line.match(headingRegex);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const { code, title } = cleanTitle(headingMatch[2]);
    const node = { name: title, code: code || null, children: [] };
    if (level === 1) {
      taxonomy.push(node);
      stack[0] = node;
      stack[1] = stack[2] = stack[3] = null;
    } else if (level === 2) {
      if (!stack[0]) {
        issues.push({ type: 'orphan-level2', lineNumber, title });
        return;
      }
      stack[0].children.push(node);
      stack[1] = node;
      stack[2] = stack[3] = null;
    } else if (level === 3) {
      if (!stack[1]) {
        issues.push({ type: 'orphan-level3', lineNumber, title });
        return;
      }
      stack[1].children.push(node);
      stack[2] = node;
      stack[3] = null;
    } else if (level === 4) {
      if (!stack[2]) {
        issues.push({ type: 'orphan-level4', lineNumber, title });
        return;
      }
      node.industries = [];
      stack[2].children.push(node);
      stack[3] = node;
    }
    return;
  }

  const bulletMatch = line.match(bulletRegex);
  if (bulletMatch && stack[3]) {
    const rawCode = bulletMatch[1].trim();
    const code = normalizeCode(rawCode, lineNumber);
    const industryName = bulletMatch[2].trim();
    ensureArray(stack[3], 'industries').push({
      code,
      name: industryName,
      rawCode,
    });
  }
});

fs.writeFileSync(OUTPUT, JSON.stringify({ taxonomy, issues }, null, 2));
console.log(`Parsed taxonomy with ${taxonomy.length} primary categories.`);
console.log(`Output written to ${path.relative(process.cwd(), OUTPUT)}.`);
if (issues.length) {
  console.warn('Encountered issues:', issues.length);
}
