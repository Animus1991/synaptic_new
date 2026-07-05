import JSZip from 'jszip';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import browserWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

import type { AnkiExportCard } from './ankiExport';
import {
  ANKI_FIELD_SEP,
  ankiFieldChecksum,
  escapeAnkiFieldHtml,
  formatAnkiTags,
  noteFieldsToFrontBack,
  parseAnkiTags,
  randomAnkiGuid,
  splitAnkiNoteFields,
} from './ankiApkgFields';

export type ParsedApkgCard = {
  front: string;
  back: string;
  deck?: string;
  tags?: string[];
};

let sqlInit: Promise<SqlJsStatic> | null = null;

async function wasmLocateFile(file: string): Promise<string> {
  if (import.meta.env?.VITEST) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    return require.resolve(`sql.js/dist/${file}`);
  }
  return browserWasmUrl;
}

async function getSql(): Promise<SqlJsStatic> {
  if (!sqlInit) {
    const locateFile = await wasmLocateFile('sql-wasm.wasm');
    sqlInit = initSqlJs({ locateFile: () => locateFile });
  }
  return sqlInit;
}

const BASIC_MODEL_ID = 1607392319028;
const DEFAULT_DECK_CONF_ID = 1;
const DEFAULT_DECK_ID = 1;

function findCollectionDbFile(zip: JSZip): JSZip.JSZipObject | null {
  const direct = zip.file('collection.anki2');
  if (direct) return direct;
  const match = zip.file(/collection\.anki2$/i)[0];
  return match ?? null;
}

function readDecksById(db: Database): Record<string, { name?: string }> {
  try {
    const rows = db.exec('SELECT decks FROM col LIMIT 1');
    const decksJson = rows[0]?.values[0]?.[0];
    if (typeof decksJson === 'string') return JSON.parse(decksJson) as Record<string, { name?: string }>;
  } catch {
    /* optional */
  }
  return {};
}

function readNoteDeckMap(db: Database): Map<number, number> {
  const map = new Map<number, number>();
  const rows = db.exec('SELECT nid, did FROM cards');
  for (const row of rows[0]?.values ?? []) {
    map.set(Number(row[0]), Number(row[1]));
  }
  return map;
}

export async function parseApkgBuffer(buffer: ArrayBuffer): Promise<ParsedApkgCard[]> {
  const zip = await JSZip.loadAsync(buffer);
  const dbEntry = findCollectionDbFile(zip);
  if (!dbEntry) {
    if (zip.file(/collection\.anki21/i).length > 0) {
      throw new Error('Compressed .anki21 decks require Anki 2.1.50+ — re-export as legacy .apkg');
    }
    throw new Error('Invalid .apkg: missing collection.anki2');
  }

  const dbBytes = await dbEntry.async('uint8array');
  const SQL = await getSql();
  const db = new SQL.Database(dbBytes);
  try {
    const decksById = readDecksById(db);
    const nidToDid = readNoteDeckMap(db);
    const rows = db.exec('SELECT flds, tags, id FROM notes');
    if (!rows[0]) return [];

    const cards: ParsedApkgCard[] = [];
    for (const row of rows[0].values) {
      const fields = splitAnkiNoteFields(String(row[0] ?? ''));
      const { front, back } = noteFieldsToFrontBack(fields);
      if (!front && !back) continue;
      const tags = parseAnkiTags(String(row[1] ?? ''));
      const nid = Number(row[2]);
      const did = nidToDid.get(nid);
      const deckName = did != null ? decksById[String(did)]?.name : undefined;
      cards.push({
        front,
        back,
        deck: deckName,
        tags: tags.length ? tags : undefined,
      });
    }
    return cards;
  } finally {
    db.close();
  }
}

export async function parseApkgFile(file: File): Promise<ParsedApkgCard[]> {
  return parseApkgBuffer(await file.arrayBuffer());
}

function basicModelJson(): string {
  return JSON.stringify({
    [BASIC_MODEL_ID]: {
      id: BASIC_MODEL_ID,
      name: 'Basic',
      type: 0,
      mod: 0,
      usn: 0,
      sortf: 0,
      did: DEFAULT_DECK_ID,
      latexPre: '',
      latexPost: '',
      latexsvg: false,
      flds: [
        { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      ],
      tmpls: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{Front}}',
          afmt: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}',
          bqfmt: '',
          bafmt: '',
          did: null,
          bfont: '',
          bsize: 0,
        },
      ],
      css: '.card{font-family:arial;font-size:20px;text-align:center;color:black;background-color:white;}',
      tags: [],
    },
  });
}

function deckJson(deckName: string, now: number): string {
  return JSON.stringify({
    [DEFAULT_DECK_ID]: {
      id: DEFAULT_DECK_ID,
      mod: now,
      name: deckName,
      usn: 0,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: false,
      desc: '',
      dyn: 0,
      conf: DEFAULT_DECK_CONF_ID,
      extendNew: 0,
      extendRev: 0,
    },
  });
}

function deckConfJson(): string {
  return JSON.stringify({
    [DEFAULT_DECK_CONF_ID]: {
      id: DEFAULT_DECK_CONF_ID,
      mod: 0,
      name: 'Default',
      usn: 0,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: { bury: false, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 0], order: 1, perDay: 20 },
      rev: { bury: false, ease4: 1.3, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 200 },
      lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 },
    },
  });
}

function colConfJson(): string {
  return JSON.stringify({
    nextPos: 1,
    estTime: 120000,
    activeDecks: [DEFAULT_DECK_ID],
    sortType: 'noteFld',
    timeLim: 0,
    sortBackwards: false,
    addToCur: true,
    curDeck: DEFAULT_DECK_ID,
    newBury: true,
    newSpread: 0,
    dueCounts: true,
    curModel: BASIC_MODEL_ID,
  });
}

function createCollectionSchema(db: Database): void {
  db.run(`
    CREATE TABLE col (
      id integer PRIMARY KEY,
      crt integer NOT NULL,
      mod integer NOT NULL,
      scm integer NOT NULL,
      ver integer NOT NULL,
      dty integer NOT NULL,
      usn integer NOT NULL,
      ls integer NOT NULL,
      conf text NOT NULL,
      models text NOT NULL,
      decks text NOT NULL,
      dconf text NOT NULL,
      tags text NOT NULL
    );
    CREATE TABLE notes (
      id integer PRIMARY KEY,
      guid text NOT NULL,
      mid integer NOT NULL,
      mod integer NOT NULL,
      usn integer NOT NULL,
      tags text NOT NULL,
      flds text NOT NULL,
      sfld integer NOT NULL,
      csum integer NOT NULL,
      flags integer NOT NULL,
      data text NOT NULL
    );
    CREATE TABLE cards (
      id integer PRIMARY KEY,
      nid integer NOT NULL,
      did integer NOT NULL,
      ord integer NOT NULL,
      mod integer NOT NULL,
      usn integer NOT NULL,
      type integer NOT NULL,
      queue integer NOT NULL,
      due integer NOT NULL,
      ivl integer NOT NULL,
      factor integer NOT NULL,
      reps integer NOT NULL,
      lapses integer NOT NULL,
      left integer NOT NULL,
      odue integer NOT NULL,
      odid integer NOT NULL,
      flags integer NOT NULL,
      data text NOT NULL
    );
    CREATE TABLE revlog (
      id integer PRIMARY KEY,
      cid integer NOT NULL,
      usn integer NOT NULL,
      ease integer NOT NULL,
      ivl integer NOT NULL,
      lastIvl integer NOT NULL,
      factor integer NOT NULL,
      time integer NOT NULL,
      type integer NOT NULL
    );
    CREATE TABLE graves (
      usn integer NOT NULL,
      oid integer NOT NULL,
      type integer NOT NULL
    );
  `);
}

function buildCollectionDatabase(
  SQL: SqlJsStatic,
  cards: AnkiExportCard[],
  deckName: string,
): Database {
  const db = new SQL.Database();
  const now = Math.floor(Date.now() / 1000);
  createCollectionSchema(db);
  db.run(
    `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
     VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '')`,
    [
      now,
      now,
      now,
      colConfJson(),
      basicModelJson(),
      deckJson(deckName, now),
      deckConfJson(),
    ],
  );

  let noteId = 1;
  let cardId = 1;
  for (const card of cards) {
    const front = escapeAnkiFieldHtml(card.front);
    const back = escapeAnkiFieldHtml(card.back);
    const flds = `${front}${ANKI_FIELD_SEP}${back}`;
    const sfld = ankiFieldChecksum(front);
    const tags = formatAnkiTags(card.tags);
    db.run(
      `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 0, '')`,
      [noteId, randomAnkiGuid(), BASIC_MODEL_ID, now, tags, flds, sfld, sfld],
    );
    db.run(
      `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
       VALUES (?, ?, ?, 0, ?, 0, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')`,
      [cardId, noteId, DEFAULT_DECK_ID, now, noteId],
    );
    noteId += 1;
    cardId += 1;
  }
  return db;
}

export async function buildApkgBlob(
  cards: AnkiExportCard[],
  deckName: string,
): Promise<Blob> {
  const SQL = await getSql();
  const db = buildCollectionDatabase(SQL, cards, deckName);
  try {
    const dbBytes = db.export();
    const zip = new JSZip();
    zip.file('collection.anki2', dbBytes);
    zip.file('media', '{}');
    zip.file('meta', JSON.stringify({ mediaFiles: {}, modified: Date.now() }));
    const buffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    return new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' });
  } finally {
    db.close();
  }
}

export async function downloadAnkiApkgDeck(
  cards: AnkiExportCard[],
  deckName: string,
  filename: string,
) {
  const blob = await buildApkgBlob(cards, deckName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.apkg') ? filename : `${filename}.apkg`;
  a.click();
  URL.revokeObjectURL(url);
}
