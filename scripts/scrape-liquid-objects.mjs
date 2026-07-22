// Scrapes https://nationbuilder.com/liquid and its per-object subpages to
// build src/data/nb-objects.json, the data source for Liquid object
// autocompletion and hover. Re-run this whenever NationBuilder's docs change:
//
//   npm run scrape-objects

import * as cheerio from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://nationbuilder.com';
const INDEX_URL = `${BASE_URL}/liquid`;
const OUTPUT_PATH = path.join(import.meta.dirname, '..', 'src', 'data', 'nb-objects.json');
const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 5;
const USER_AGENT = 'vscode-nationbuilder-liquid-scraper (+https://github.com/pjpscriv/vscode-nationbuilder-liquid)';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      return res.text();
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2000 * 2 ** attempt;
      console.warn(`  429 for ${url}, retrying in ${Math.round(waitMs / 1000)}s...`);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`Request failed (${res.status} ${res.statusText}): ${url}`);
  }
}

/**
 * The sidebar nav on every doc page lists all Liquid objects, and its link
 * text already encodes nesting (e.g. "page.basic" for the "page" object's
 * basic-page subtype), which is more useful than the two-column table on the
 * /liquid index page itself.
 */
async function fetchObjectList() {
  const html = await fetchHtml(INDEX_URL);
  const $ = cheerio.load(html);

  const seen = new Set();
  const entries = [];

  for (const el of $('#side-nav ul.dropdown-menu a[href]').toArray()) {
    const href = $(el).attr('href') ?? '';
    if (!href.endsWith('_variables')) {
      continue;
    }

    const slug = href.replace(/^\//, '');
    if (seen.has(slug)) {
      continue;
    }
    seen.add(slug);

    let name = $(el).text().trim();
    // A handful of sidebar entries are mislabeled with their own slug
    // (e.g. "pledge_variables") instead of the intended short name.
    if (name.endsWith('_variables')) {
      name = slug.replace(/_variables$/, '');
    }

    entries.push({ name, slug });
  }

  return entries;
}

function extractDescription($, container) {
  let text = '';
  let reachedTable = false;

  container.contents().each((_, el) => {
    if (reachedTable) {
      return;
    }
    if (el.type === 'tag' && el.name === 'table') {
      reachedTable = true;
      return;
    }
    if (el.type === 'tag' && (el.name === 'h1' || el.name === 'h2' || el.name === 'style')) {
      return;
    }
    if (el.type === 'tag' && el.name === 'div' && $(el).hasClass('title')) {
      return;
    }
    text += $(el).text ? $(el).text() : ($.text ? $.text([el]) : '');
  });

  return text.replace(/\s+/g, ' ').trim();
}

function extractProperties($, container, slugToName) {
  const properties = {};

  // Most doc pages use table.doc_table, but a few older ones (e.g.
  // request_variables) use table.table-striped instead, so match any table
  // within the intro content rather than a specific class.
  for (const tr of container.find('table tr').toArray()) {
    const $tr = $(tr);
    if ($tr.find('th').length > 0) {
      continue; // header row
    }

    const tds = $tr.find('td');
    if (tds.length < 2) {
      continue;
    }

    const nameCell = $(tds[0]);
    const descCell = $(tds[1]);

    const name = nameCell.text().trim();
    if (!name) {
      continue;
    }

    const linkedSlug = nameCell.find('a').first().attr('href')?.replace(/^\//, '');
    const type = linkedSlug ? slugToName.get(linkedSlug) : undefined;

    const descClone = descCell.clone();
    const example = descClone.find('.example').first().text().replace(/\s+/g, ' ').trim() || undefined;
    descClone.find('.example').remove();
    const description = descClone.text().replace(/\s+/g, ' ').trim() || undefined;

    const property = {};
    if (description) property.description = description;
    if (example) property.example = example;
    if (type) property.type = type;
    if (nameCell.find('strike').length > 0) property.deprecated = true;

    properties[name] = property;
  }

  return properties;
}

function parseObjectPage(html, entry, slugToName) {
  const $ = cheerio.load(html);
  const container = $('#intro .text-content').first();
  const titleEl = container.find('.title, h1, h2').first();

  const title = titleEl.text().trim() || entry.name;
  // Some doc pages wrap title+table in an extra div (e.g. flash_variables'
  // .docs wrapper). Scoping to the title's own parent, rather than the
  // outer container, keeps the "stop at the first table" logic correct
  // regardless of that extra nesting.
  const descriptionScope = titleEl.parent().length ? titleEl.parent() : container;
  const description = extractDescription($, descriptionScope);

  const object = { slug: entry.slug, title, properties: extractProperties($, container, slugToName) };
  if (description) {
    object.description = description;
  }
  return object;
}

// The sidebar names page subtypes like "page.basic" as separate entries, but
// NationBuilder actually exposes them as properties of the base object, e.g.
// {{ page.basic.content }}. The docs never list "basic" as a row in page's
// own property table, so inject it as a synthetic property pointing at the
// "page.basic" object, letting property resolution treat every nested access
// uniformly (follow a property's `type` into another object).
function linkDottedSubtypes(objects) {
  for (const [key, object] of Object.entries(objects)) {
    const dotIndex = key.indexOf('.');
    if (dotIndex === -1) {
      continue;
    }

    const parent = objects[key.slice(0, dotIndex)];
    const childName = key.slice(dotIndex + 1);
    if (!parent || parent.properties[childName]) {
      continue;
    }

    parent.properties[childName] = { type: key };
    if (object.description) {
      parent.properties[childName].description = object.description;
    }
  }
}

async function main() {
  console.log(`Fetching object index from ${INDEX_URL}`);
  const entries = await fetchObjectList();
  console.log(`Found ${entries.length} objects`);

  const slugToName = new Map(entries.map((entry) => [entry.slug, entry.name]));
  const objects = {};

  for (const [i, entry] of entries.entries()) {
    console.log(`[${i + 1}/${entries.length}] ${entry.name} (${entry.slug})`);
    const html = await fetchHtml(`${BASE_URL}/${entry.slug}`);
    objects[entry.name] = parseObjectPage(html, entry, slugToName);
    await sleep(REQUEST_DELAY_MS);
  }

  linkDottedSubtypes(objects);

  const sorted = Object.fromEntries(
    Object.entries(objects).sort(([a], [b]) => a.localeCompare(b))
  );

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${entries.length} objects to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
