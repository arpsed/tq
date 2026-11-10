/*
 * parser.js — reads the surah text format used in surah/NNN.js.
 * Runs in the browser (window.TQParser) and in Node (require).
 *
 * Format summary (see PANDUAN.md for the full guide):
 *   # 2 | Al-Baqarah | Sapi Betina | Madaniyah    header: number | name | meaning | place
 *   {12}                                          start of verse 12
 *   [^12a]                                        footnote marker
 *   [^12a]: text                                  footnote text (its own line)
 *   (blank line)                                  new paragraph
 *   ***                                           section break
 *   // text                                       reviewer comment, shown only in review mode
 */
(function (global) {
  'use strict';

  var TOKEN = /\{(\d+)\}|\[\^([^\]\s]+)\]/g;
  var NOTE_DEF = /^\[\^([^\]\s]+)\]:\s*(.*)$/;
  var HEADER = /^#\s*(\d+)\s*(?:\|(.*))?$/;
  var SECTION = /^\*\s*\*\s*\*$/;

  function parseSurah(src, expectedVerses) {
    var out = {
      number: null, name: '', meaning: '', place: '',
      blocks: [],        // {type:'para', segs, from, to, comments} | {type:'section', comments}
      notes: {},         // id -> footnote text
      noteOrder: [],     // ids in order of appearance in the text
      noteVerse: {},     // id -> verse the marker sits in
      verseText: [],     // verse number -> plain text (for search)
      verseCount: 0,
      problems: []
    };
    var lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    var buf = [], bufLine = 0, comments = [];
    var verse = 0;            // current verse while reading text
    var defLine = {};         // footnote id -> line where it is defined
    var refCount = {};

    function problem(lineNo, msg) {
      out.problems.push(lineNo ? 'Baris ' + lineNo + ': ' + msg : msg);
    }

    function addText(para, s) {
      if (!s) return;
      if (!verse) {
        if (s.trim()) problem(bufLine, 'ada teks sebelum nomor ayat pertama: "' + s.trim().slice(0, 40) + '"');
        return;
      }
      var last = para.segs[para.segs.length - 1];
      if (last && last.k === 't') last.s += s; else para.segs.push({ k: 't', s: s });
      out.verseText[verse] = (out.verseText[verse] || '') + s;
    }

    function flush() {
      if (!buf.length) return;
      var text = buf.join(' ').replace(/\s+/g, ' ').trim();
      var para = { type: 'para', segs: [], from: verse, to: verse, comments: comments, line: bufLine };
      comments = [];
      buf = [];
      if (verse) out.verseText[verse] = (out.verseText[verse] || '') + ' '; // paragraph break inside a verse
      var last = 0, m;
      TOKEN.lastIndex = 0;
      while ((m = TOKEN.exec(text))) {
        addText(para, text.slice(last, m.index));
        last = TOKEN.lastIndex;
        if (m[1] !== undefined) {
          var n = parseInt(m[1], 10);
          if (n !== verse + 1) {
            if (n <= verse) problem(bufLine, 'nomor ayat {' + n + '} muncul lagi atau tidak berurutan (sebelumnya {' + verse + '})');
            else problem(bufLine, 'ayat ' + (verse + 1) + (n - 1 > verse + 1 ? '–' + (n - 1) : '') + ' tidak ditemukan (setelah {' + verse + '} langsung {' + n + '})');
          }
          verse = n;
          if (!para.segs.length) para.from = n;
          para.to = n;
          para.segs.push({ k: 'v', n: n });
          while (text.charAt(last) === ' ') last++; // number sits directly before the verse text
        } else {
          var id = m[2];
          refCount[id] = (refCount[id] || 0) + 1;
          if (refCount[id] === 1) { out.noteOrder.push(id); out.noteVerse[id] = verse; }
          else problem(bufLine, 'tanda catatan [^' + id + '] dipakai lebih dari sekali');
          para.segs.push({ k: 'n', id: id, v: verse });
        }
      }
      addText(para, text.slice(last));
      // trim the paragraph's trailing space
      var tail = para.segs[para.segs.length - 1];
      if (tail && tail.k === 't') tail.s = tail.s.replace(/\s+$/, '');
      if (para.segs.length) out.blocks.push(para);
    }

    for (var i = 0; i < lines.length; i++) {
      var lineNo = i + 1;
      var line = lines[i].replace(/\s+$/, '');
      var t = line.trim();
      var m;
      if (!t) { flush(); continue; }
      if (out.number === null && (m = HEADER.exec(t))) {
        flush();
        out.number = parseInt(m[1], 10);
        var f = (m[2] || '').split('|');
        out.name = (f[0] || '').trim();
        out.meaning = (f[1] || '').trim();
        out.place = (f[2] || '').trim();
        continue;
      }
      if (t.slice(0, 2) === '//') { flush(); comments.push(t.slice(2).trim()); continue; }
      if (SECTION.test(t)) {
        flush();
        out.blocks.push({ type: 'section', comments: comments });
        comments = [];
        continue;
      }
      if ((m = NOTE_DEF.exec(t))) {
        flush();
        if (m[1] in out.notes) problem(lineNo, 'isi catatan [^' + m[1] + '] ditulis dua kali (juga di baris ' + defLine[m[1]] + ')');
        out.notes[m[1]] = m[2].trim();
        defLine[m[1]] = lineNo;
        continue;
      }
      if (!buf.length) bufLine = lineNo;
      buf.push(t);
    }
    flush();

    if (out.number === null) problem(0, 'baris judul "# nomor | nama | arti | tempat" tidak ditemukan');
    out.verseCount = verse;
    if (expectedVerses && verse !== expectedVerses) {
      problem(0, 'jumlah ayat ' + verse + ', seharusnya ' + expectedVerses);
    }
    out.noteOrder.forEach(function (id) {
      if (!(id in out.notes)) problem(0, 'tanda [^' + id + '] (ayat ' + out.noteVerse[id] + ') tidak punya isi catatan "[^' + id + ']: ..."');
    });
    Object.keys(out.notes).forEach(function (id) {
      if (!refCount[id]) problem(defLine[id], 'catatan [^' + id + '] tidak dipakai di dalam teks');
    });
    for (var v = 1; v < out.verseText.length; v++) {
      if (out.verseText[v] !== undefined) out.verseText[v] = out.verseText[v].replace(/\s+/g, ' ').trim();
    }
    return out;
  }

  /* Letter shown for a footnote marker: "12a" -> "a". */
  function noteLetter(id) {
    var s = String(id).replace(/^\d+/, '');
    return s || String(id);
  }

  var api = { parse: parseSurah, noteLetter: noteLetter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TQParser = api;
})(this);
