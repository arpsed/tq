/*
 * Terjemahan Al-Qur’an — app.js
 * Plain JavaScript, no libraries. Works from file:// (double-click index.html)
 * and from a web server, where a service worker also makes it work offline.
 */
(function () {
  'use strict';

  var APP_TITLE = 'Terjemahan Al-Qur’an';
  var SOURCE_CREDIT = 'Al-Qur’an dan Terjemahannya, Edisi Penyempurnaan 2019, Kementerian Agama Republik Indonesia.';
  var BASMALAH = 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.';
  var VERSE_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
  var MAX_RESULTS = 200;

  var $main = document.getElementById('main');
  var $title = document.getElementById('topbar-title');
  var $pop = document.getElementById('note-pop');
  var $settings = document.getElementById('settings');
  var $btnSettings = document.getElementById('btn-settings');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------------- small helpers ---------------- */

  function pad3(n) { return ('00' + n).slice(-3); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return n.toLocaleString('id-ID'); }
  function readStore(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function barHeight() { return document.querySelector('.topbar').getBoundingClientRect().height; }

  // Diacritic- and apostrophe-insensitive folding for search ("quran" finds "Qur’an", "fatihah" finds "Fātiḥah").
  var MARKS = /[\u0300-\u036f]/g, APOS = /[\u2019\u2018'`\u02bc\u02bb]/g;
  function fold(s) { return s.normalize('NFD').replace(MARKS, '').replace(APOS, '').toLowerCase(); }
  function foldWithMap(s) {
    var out = '', map = [], i = 0;
    for (var ch of s) {
      var f = ch.normalize('NFD').replace(MARKS, '').replace(APOS, '').toLowerCase();
      for (var k = 0; k < f.length; k++) map.push(i);
      out += f;
      i += ch.length;
    }
    map.push(i);
    return { s: out, map: map };
  }

  /* ---------------- loading surah files ---------------- */

  var raw = {}, parsed = {}, loadError = {}, loaders = {}, allLoaded = null;

  window.TQ = {
    surah: function (text) {
      var el = document.currentScript;
      var m = el && /(\d{3})\.js(?:[?#].*)?$/.exec(el.getAttribute('src') || '');
      var n = m ? parseInt(m[1], 10) : headerInfo(String(text)).number;
      if (n) raw[n] = String(text);
    }
  };

  function headerInfo(text) {
    var m = /^[ \t]*#[ \t]*(\d+)[ \t]*(?:\|([^|\n]*))?(?:\|([^|\n]*))?(?:\|([^|\n]*))?/m.exec(text);
    if (!m) return { number: 0, name: '', meaning: '', place: '' };
    return { number: +m[1], name: (m[2] || '').trim(), meaning: (m[3] || '').trim(), place: (m[4] || '').trim() };
  }

  function loadSurah(n) {
    if (!loaders[n]) {
      loaders[n] = new Promise(function (resolve) {
        var el = document.createElement('script');
        el.src = 'surah/' + pad3(n) + '.js';
        el.onload = function () {
          if (!(n in raw)) {
            loadError[n] = 'File surah/' + pad3(n) + '.js terbaca, tetapi isinya tidak bisa dijalankan. ' +
              'Biasanya karena ada tanda ` (backtick) di dalam teks, atau baris pembuka TQ.surah(` / penutup `); terhapus.';
          }
          resolve();
        };
        el.onerror = function () {
          loadError[n] = 'File surah/' + pad3(n) + '.js tidak ditemukan.';
          resolve();
        };
        document.head.appendChild(el);
      });
    }
    return loaders[n];
  }

  function loadAll() {
    if (!allLoaded) {
      var list = [];
      for (var i = 1; i <= 114; i++) list.push(loadSurah(i));
      allLoaded = Promise.all(list);
    }
    return allLoaded;
  }

  function getSurah(n) {
    if (!parsed[n] && raw[n] !== undefined) {
      var d = TQParser.parse(raw[n], VERSE_COUNTS[n - 1]);
      if (d.number !== null && d.number !== n) {
        d.problems.unshift('Nomor di baris judul (' + d.number + ') tidak sama dengan nama file (' + pad3(n) + '.js).');
      }
      parsed[n] = d;
    }
    return parsed[n] || null;
  }

  function info(n) {
    if (parsed[n]) return parsed[n];
    if (raw[n] !== undefined) return headerInfo(raw[n]);
    return { name: 'Surah ' + n, meaning: '', place: '' };
  }

  /* ---------------- settings ---------------- */

  var settings = Object.assign({ fs: 19, theme: 'auto', vn: true, fn: true, review: false }, readStore('tq-settings', {}));

  function applySettings() {
    var root = document.documentElement;
    root.style.setProperty('--fs', settings.fs + 'px');
    if (settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    document.body.classList.toggle('hide-vn', !settings.vn);
    document.body.classList.toggle('hide-fn', !settings.fn);
    document.body.classList.toggle('review', !!settings.review);
    document.getElementById('font-size-out').textContent = settings.fs;
    document.querySelectorAll('[data-theme-choice]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-choice') === settings.theme));
    });
    document.getElementById('opt-vn').checked = settings.vn;
    document.getElementById('opt-fn').checked = settings.fn;
    document.getElementById('opt-review').checked = !!settings.review;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
  }

  // Change a setting while keeping the reader at the same verse.
  function changeSetting(fn) {
    var keep = view.type === 'surah' ? currentVerse() : 0;
    fn();
    writeStore('tq-settings', settings);
    applySettings();
    if (keep) scrollToVerse(keep, false);
  }

  $btnSettings.addEventListener('click', function () {
    var open = $settings.hidden;
    $settings.hidden = !open;
    $btnSettings.setAttribute('aria-expanded', String(open));
  });
  $settings.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'font-up') changeSetting(function () { settings.fs = Math.min(30, settings.fs + 1); });
    if (act === 'font-down') changeSetting(function () { settings.fs = Math.max(14, settings.fs - 1); });
    var th = b.getAttribute('data-theme-choice');
    if (th) changeSetting(function () { settings.theme = th; });
  });
  document.getElementById('opt-vn').addEventListener('change', function (e) {
    changeSetting(function () { settings.vn = e.target.checked; });
  });
  document.getElementById('opt-fn').addEventListener('change', function (e) {
    changeSetting(function () { settings.fn = e.target.checked; });
  });
  document.getElementById('opt-review').addEventListener('change', function (e) {
    changeSetting(function () { settings.review = e.target.checked; });
    if (view.type === 'contents') showContents();
  });
  function closeSettings() {
    if (!$settings.hidden) { $settings.hidden = true; $btnSettings.setAttribute('aria-expanded', 'false'); }
  }

  /* ---------------- routing ---------------- */

  var view = { type: '' };
  var contentsScroll = 0;
  var lastQuery = '';
  var firstRoute = true;

  function route() {
    closeNote();
    var fromUser = !firstRoute;
    firstRoute = false;
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    var m = /^(\d{1,3})(?::(\d{1,3}))?$/.exec(h);
    if (view.type === 'contents') contentsScroll = window.scrollY;
    if (m && +m[1] >= 1 && +m[1] <= 114) return showSurah(+m[1], m[2] ? +m[2] : 0, fromUser);
    if (h === 'cari') return showSearch();
    return showContents();
  }
  window.addEventListener('hashchange', route);

  function go(hash) {
    if (location.hash === hash || (hash === '#' && !location.hash)) route();
    else location.hash = hash;
  }

  document.getElementById('btn-toc').addEventListener('click', function () { closeSettings(); go('#'); });
  document.getElementById('btn-search').addEventListener('click', function () { closeSettings(); go('#cari'); });
  $title.addEventListener('click', function (e) {
    if (view.type === 'surah') { e.preventDefault(); window.scrollTo(0, 0); }
  });

  function setTitles(bar, doc) {
    $title.textContent = bar;
    document.title = doc;
  }

  /* ---------------- contents ---------------- */

  function showContents() {
    view = { type: 'contents' };
    setTitles(APP_TITLE, APP_TITLE);
    if (!allLoadedDone) $main.innerHTML = '<p class="loading">Memuat…</p>';
    loadAll().then(function () {
      if (view.type !== 'contents') return;
      $main.innerHTML = contentsHtml();
      var input = document.getElementById('toc-filter');
      input.addEventListener('input', function () { filterToc(input.value); });
      window.scrollTo(0, contentsScroll);
    });
  }
  var allLoadedDone = false;
  loadAll().then(function () { allLoadedDone = true; });

  function contentsHtml() {
    var html = '<section class="cover">' +
      '<h1>Terjemahan Al-Qur’an</h1>' +
      '<p class="cover-sub">Bahasa Indonesia · disusun sebagai bacaan bersambung</p>' +
      '<div class="notice">' +
      '<p><strong>Ini adalah terjemahan, bukan Al-Qur’an.</strong> Al-Qur’an adalah firman Allah dalam bahasa Arab. ' +
      'Yang Anda baca di sini adalah terjemahan maknanya ke dalam bahasa Indonesia, yang tidak dapat menggantikan teks aslinya.</p>' +
      '<p>Pembagian paragraf dan bagian disusun untuk memudahkan membaca dan bukan bagian dari terjemahan.</p>' +
      '<p class="source">Sumber terjemahan: ' + esc(SOURCE_CREDIT) + '</p>' +
      '</div>';
    var pos = readStore('tq-pos', null);
    if (pos && pos.s >= 1 && pos.s <= 114) {
      html += '<a class="btn" href="#' + pos.s + ':' + (pos.v || 1) + '">Lanjutkan membaca · ' +
        esc(info(pos.s).name) + ', ayat ' + (pos.v || 1) + '</a>';
    }
    html += '</section>';

    var broken = Object.keys(loadError);
    var issues = [];
    if (settings.review) {
      for (var n = 1; n <= 114; n++) {
        var d = getSurah(n);
        if (d && d.problems.length) issues.push('<li><a href="#' + n + '">' + pad3(n) + '.js</a>: ' + d.problems.length + ' masalah</li>');
      }
    }
    if (broken.length || issues.length) {
      html += '<div class="problems"><strong>Ada file surah yang perlu diperiksa:</strong><ul>' +
        broken.map(function (k) { return '<li>' + esc(loadError[k]) + '</li>'; }).join('') + issues.join('') + '</ul></div>';
    }

    html += '<div class="toc-tools"><input id="toc-filter" class="field" type="search" placeholder="Saring surah: nama, arti, atau nomor" aria-label="Saring daftar surah" autocomplete="off"></div>';
    html += '<ol class="toc" id="toc">';
    for (var i = 1; i <= 114; i++) {
      var s = info(i);
      html += '<li data-key="' + esc(fold(i + ' ' + s.name + ' ' + s.meaning)) + '"><a href="#' + i + '">' +
        '<span class="toc-no">' + i + '</span>' +
        '<span><span class="toc-name">' + esc(s.name) + '</span><span class="toc-mean">' + esc(s.meaning) + '</span></span>' +
        '<span class="toc-meta">' + esc(s.place) + '<br>' + VERSE_COUNTS[i - 1] + ' ayat</span>' +
        '</a></li>';
    }
    html += '</ol><p class="toc-empty" id="toc-empty" hidden>Tidak ada surah yang cocok.</p>';
    return html;
  }

  function filterToc(q) {
    var f = fold(q.trim());
    var shown = 0;
    document.querySelectorAll('#toc li').forEach(function (li) {
      var key = li.getAttribute('data-key');
      var ok = !f || key.indexOf(f) !== -1 || key.split(' ')[0] === f;
      if (/^\d+$/.test(f)) ok = key.split(' ')[0] === f;
      li.hidden = !ok;
      if (ok) shown++;
    });
    document.getElementById('toc-empty').hidden = shown > 0;
  }

  /* ---------------- surah ---------------- */

  function showSurah(n, verse, fromUser) {
    closeSettings();
    if (view.type === 'surah' && view.surah === n && $main.querySelector('.ch-text')) {
      if (verse) scrollToVerse(verse, true); else window.scrollTo(0, 0);
      return;
    }
    view = { type: 'surah', surah: n };
    var name = info(n).name;
    setTitles(n + '. ' + name, name + ' · ' + APP_TITLE);
    $main.innerHTML = '<p class="loading">Memuat…</p>';
    Promise.all([loadSurah(n), n > 1 ? loadSurah(n - 1) : null, n < 114 ? loadSurah(n + 1) : null]).then(function () {
      if (view.type !== 'surah' || view.surah !== n) return;
      renderSurah(n);
      if (verse) scrollToVerse(verse, fromUser);
      else window.scrollTo(0, 0);
      $main.focus({ preventScroll: true });
    });
  }

  function renderSurah(n) {
    var d = getSurah(n);
    if (!d) {
      $main.innerHTML = '<div class="problems"><strong>Surah ' + n + ' tidak dapat ditampilkan.</strong><ul><li>' +
        esc(loadError[n] || 'File tidak termuat.') + '</li></ul></div>' + navHtml(n);
      return;
    }
    setTitles(n + '. ' + d.name, d.name + ' · ' + APP_TITLE);
    var html = '';
    if (d.problems.length) {
      var list = d.problems.slice(0, 25).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('');
      if (d.problems.length > 25) list += '<li>…dan ' + (d.problems.length - 25) + ' lainnya</li>';
      html += '<div class="problems"><strong>Ada ' + d.problems.length + ' masalah di file surah/' + pad3(n) + '.js:</strong><ul>' + list + '</ul></div>';
    }
    html += '<header class="ch-head">' +
      '<p class="ch-kicker">Surah ke-' + n + '</p>' +
      '<h1 class="ch-name">' + esc(d.name) + '</h1>' +
      '<p class="ch-meta">' + [d.meaning, d.place, VERSE_COUNTS[n - 1] + ' ayat'].filter(Boolean).map(esc).join(' · ') + '</p>' +
      '<p class="ch-notice">Terjemahan makna, bukan teks asli Al-Qur’an</p>' +
      '</header>';
    if (n !== 1 && n !== 9) html += '<p class="basmalah">' + esc(BASMALAH) + '</p>';
    html += '<div class="ch-text">' + bodyHtml(n, d) + '</div>';
    html += notesHtml(n, d);
    html += navHtml(n);
    $main.innerHTML = html;
  }

  function rangeOf(b) { return b.from === b.to ? String(b.from) : b.from + '–' + b.to; }

  function bodyHtml(n, d) {
    var html = '', first = true, section = 1, cur = 0;
    d.blocks.forEach(function (b) {
      if (b.type === 'section') {
        section++;
        html += '<div class="sb" role="separator"><span class="rv">Bagian ' + section +
          (b.comments.length ? ' · ' + esc(b.comments.join(' ')) : '') + '</span></div>';
        first = true;
        return;
      }
      var label = b.comments[0] || '';
      html += '<div class="rv"><span class="rv-range">' + n + ':' + rangeOf(b) + '</span>' + esc(label) + '</div>';
      for (var i = 1; i < b.comments.length; i++) {
        html += '<div class="rv' + (/^catatan\b/i.test(b.comments[i]) ? ' rv-note' : '') + '">' + esc(b.comments[i]) + '</div>';
      }
      var p = '', open = false;
      b.segs.forEach(function (g) {
        if (g.k === 'v') {
          if (open) p += '</span>';
          cur = g.n;
          p += '<span class="va" id="v-' + g.n + '"></span><sup class="vn" data-v="' + g.n + '">' + g.n + '</sup><span class="vt" data-v="' + g.n + '">';
          open = true;
          return;
        }
        if (!open) { p += '<span class="vt" data-v="' + cur + '">'; open = true; }
        if (g.k === 't') p += esc(g.s);
        else {
          var L = TQParser.noteLetter(g.id);
          p += '<sup class="fn"><button type="button" class="fn-btn" id="r-' + esc(g.id) + '" data-note="' + esc(g.id) +
            '" aria-label="Catatan kaki ' + esc(L) + ', ayat ' + g.v + '">' + esc(L) + '</button></sup>';
        }
      });
      if (open) p += '</span>';
      html += '<p' + (first ? ' class="first"' : '') + '>' + p + '</p>';
      first = false;
    });
    return html;
  }

  function notesHtml(n, d) {
    if (!d.noteOrder.length) return '';
    var items = d.noteOrder.map(function (id) {
      var v = d.noteVerse[id], L = TQParser.noteLetter(id);
      return '<li id="n-' + esc(id) + '"><a class="note-loc" href="#' + n + ':' + v + '" data-back="' + esc(id) +
        '" aria-label="Kembali ke ayat ' + v + ', catatan ' + esc(L) + '">' + v + '<i>' + esc(L) + '</i></a>' +
        '<span>' + esc(d.notes[id] || '') + '</span></li>';
    }).join('');
    return '<section class="notes" aria-labelledby="notes-h"><h2 id="notes-h">Catatan Kaki</h2>' +
      '<p class="notes-help">Angka menunjukkan nomor ayat, huruf menunjukkan tanda catatan di dalam teks.</p>' +
      '<ol class="note-list">' + items + '</ol></section>';
  }

  function navHtml(n) {
    var prev = n > 1 ? '<a class="prev" href="#' + (n - 1) + '"><small>← Sebelumnya</small>' + (n - 1) + '. ' + esc(info(n - 1).name) + '</a>' : '<span class="spacer"></span>';
    var next = n < 114 ? '<a class="next" href="#' + (n + 1) + '"><small>Berikutnya →</small>' + (n + 1) + '. ' + esc(info(n + 1).name) + '</a>' : '<span class="spacer"></span>';
    return '<nav class="ch-nav" aria-label="Surah sebelumnya dan berikutnya">' + prev + next + '</nav>';
  }

  function scrollToEl(el, offset) {
    var y = el.getBoundingClientRect().top + window.scrollY - barHeight() - (offset || 60);
    window.scrollTo(0, Math.max(0, y));
  }

  function flash(nodes) {
    nodes.forEach(function (el) { el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); });
  }

  function scrollToVerse(v, highlight) {
    var a = document.getElementById('v-' + v);
    if (!a) return;
    scrollToEl(a);
    if (highlight) flash($main.querySelectorAll('.vt[data-v="' + v + '"], .vn[data-v="' + v + '"]'));
  }

  // The verse at the top of the screen.
  function currentVerse() {
    var anchors = $main.querySelectorAll('.va');
    if (!anchors.length) return 0;
    var limit = barHeight() + 80, v = +anchors[0].id.slice(2);
    for (var i = 0; i < anchors.length; i++) {
      if (anchors[i].getBoundingClientRect().top > limit) break;
      v = +anchors[i].id.slice(2);
    }
    return v;
  }

  var posTimer = 0;
  window.addEventListener('scroll', function () {
    if (view.type !== 'surah') return;
    clearTimeout(posTimer);
    posTimer = setTimeout(function () {
      if (view.type !== 'surah' || !$main.querySelector('.ch-text')) return;
      var v = currentVerse();
      if (!v) return;
      writeStore('tq-pos', { s: view.surah, v: v });
      var h = '#' + view.surah + ':' + v;
      if (location.hash !== h) history.replaceState(null, '', h);
    }, 300);
  }, { passive: true });

  /* ---------------- footnote popup ---------------- */

  var noteOpener = null;

  $main.addEventListener('click', function (e) {
    var btn = e.target.closest('.fn-btn');
    if (btn) { e.preventDefault(); openNote(btn); return; }
    var back = e.target.closest('[data-back]');
    if (back) {
      e.preventDefault();
      var marker = document.getElementById('r-' + back.getAttribute('data-back'));
      if (marker) { scrollToEl(marker, 120); flash([marker]); }
      return;
    }
    var link = e.target.closest('a[href^="#"]');
    if (link && view.type === 'surah') {
      var m = /^#(\d{1,3}):(\d{1,3})$/.exec(link.getAttribute('href'));
      if (m && +m[1] === view.surah) { e.preventDefault(); scrollToVerse(+m[2], true); }
    }
  });

  function openNote(btn) {
    var id = btn.getAttribute('data-note');
    var d = getSurah(view.surah);
    if (!d) return;
    var L = TQParser.noteLetter(id);
    $pop.querySelector('.note-pop-title').textContent =
      d.name + ' ' + view.surah + ':' + d.noteVerse[id] + ' · catatan ' + L;
    $pop.querySelector('.note-pop-body').textContent = d.notes[id] || '(Isi catatan tidak ditemukan.)';
    $pop.hidden = false;
    noteOpener = btn;
    placeNote(btn);
    $pop.querySelector('.note-pop-close').focus({ preventScroll: true });
  }

  var narrow = window.matchMedia('(max-width: 640px)'); // same breakpoint as the bottom-sheet CSS

  function placeNote(btn) {
    if (narrow.matches) {
      $pop.classList.add('sheet');
      $pop.style.left = ''; $pop.style.top = '';
      return;
    }
    $pop.classList.remove('sheet');
    var r = btn.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var w = $pop.offsetWidth, h = $pop.offsetHeight;
    var left = Math.max(16, Math.min(r.left - 24, vw - w - 16));
    var top = r.bottom + 10;
    if (top + h > vh - 12 && r.top - h - 10 > barHeight() + 8) top = r.top - h - 10;
    $pop.style.left = (left + window.scrollX) + 'px';
    $pop.style.top = (top + window.scrollY) + 'px';
  }

  function closeNote() {
    if ($pop.hidden) return;
    $pop.hidden = true;
    if (noteOpener && document.body.contains(noteOpener)) noteOpener.focus({ preventScroll: true });
    noteOpener = null;
  }

  $pop.querySelector('.note-pop-close').addEventListener('click', closeNote);
  document.addEventListener('click', function (e) {
    if (!$pop.hidden && !$pop.contains(e.target) && !e.target.closest('.fn-btn')) closeNote();
    if (!$settings.hidden && !$settings.contains(e.target) && !e.target.closest('#btn-settings')) closeSettings();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeNote(); closeSettings(); }
  });
  window.addEventListener('resize', function () { if (!$pop.hidden && noteOpener) placeNote(noteOpener); });

  /* ---------------- search ---------------- */

  var index = null;

  function buildIndex() {
    index = [];
    for (var n = 1; n <= 114; n++) {
      var d = getSurah(n);
      if (!d) continue;
      for (var v = 1; v < d.verseText.length; v++) {
        if (d.verseText[v]) index.push({ s: n, v: v, f: fold(d.verseText[v]) });
      }
    }
  }

  function showSearch() {
    closeSettings();
    view = { type: 'search' };
    setTitles('Cari', 'Cari · ' + APP_TITLE);
    $main.innerHTML = '<section class="search-head"><h1>Cari</h1>' +
      '<input id="q" class="field" type="search" placeholder="Kata, atau nomor seperti 2:255" aria-label="Kata yang dicari" autocomplete="off" enterkeyhint="search">' +
      '<p class="search-info" id="search-info" aria-live="polite"></p></section><ol class="results" id="results"></ol>';
    var q = document.getElementById('q');
    q.value = lastQuery;
    var t = 0;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { runSearch(q.value); }, 180); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var first = document.querySelector('#results a'); if (first) first.click(); }
    });
    window.scrollTo(0, 0);
    q.focus();
    if (lastQuery) runSearch(lastQuery);
  }

  function runSearch(query) {
    lastQuery = query;
    var $info = document.getElementById('search-info'), $res = document.getElementById('results');
    if (!$info) return;
    var q = query.trim();
    if (!q) { $info.textContent = ''; $res.innerHTML = ''; return; }
    $info.textContent = 'Mencari…';
    loadAll().then(function () {
      if (lastQuery !== query || !document.getElementById('results')) return;
      if (!index) buildIndex();
      var html = '';
      var ref = /^(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3}))?$/.exec(q);
      if (ref) {
        var s = +ref[1], v = ref[2] ? +ref[2] : 0;
        if (s >= 1 && s <= 114 && v <= VERSE_COUNTS[s - 1]) {
          html += '<li><a href="#' + s + (v ? ':' + v : '') + '"><span class="res-loc">Buka</span><span class="res-text">' +
            esc(info(s).name) + (v ? ', ayat ' + v : '') + ' (' + s + (v ? ':' + v : '') + ')</span></a></li>';
        }
      }
      var words = fold(q).split(/\s+/).filter(Boolean);
      var hits = [];
      if (fold(q).replace(/\s+/g, '').length >= 2) {
        for (var i = 0; i < index.length; i++) {
          var e = index[i], ok = true;
          for (var k = 0; k < words.length; k++) if (e.f.indexOf(words[k]) === -1) { ok = false; break; }
          if (ok) hits.push(e);
        }
      }
      hits.slice(0, MAX_RESULTS).forEach(function (h) {
        var d = getSurah(h.s);
        html += '<li><a href="#' + h.s + ':' + h.v + '"><span class="res-loc">' + esc(d.name) + ' ' + h.s + ':' + h.v + '</span>' +
          '<span class="res-text">' + snippet(d.verseText[h.v], words) + '</span></a></li>';
      });
      $res.innerHTML = html;
      $info.textContent = hits.length
        ? (hits.length > MAX_RESULTS ? 'Menampilkan ' + MAX_RESULTS + ' dari ' + fmt(hits.length) + ' ayat' : fmt(hits.length) + ' ayat ditemukan')
        : (ref ? '' : 'Tidak ditemukan.');
    });
  }

  function snippet(text, words) {
    var fm = foldWithMap(text), ranges = [];
    words.forEach(function (w) {
      var from = 0, at;
      while (w && (at = fm.s.indexOf(w, from)) !== -1) { ranges.push([fm.map[at], fm.map[at + w.length]]); from = at + w.length; }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push(r.slice());
    });
    var ws = 0, we = text.length, LIMIT = 320;
    if (text.length > LIMIT) {
      var c = merged.length ? merged[0][0] : 0;
      ws = Math.max(0, c - 110);
      if (ws > 0) { var sp = text.indexOf(' ', ws); ws = sp !== -1 && sp < c ? sp + 1 : ws; }
      we = Math.min(text.length, ws + LIMIT);
      if (we < text.length) { var sp2 = text.lastIndexOf(' ', we); if (sp2 > ws) we = sp2; }
    }
    var out = ws > 0 ? '…' : '', pos = ws;
    merged.forEach(function (r) {
      var a = Math.max(r[0], ws), b = Math.min(r[1], we);
      if (b <= a) return;
      out += esc(text.slice(pos, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>';
      pos = b;
    });
    out += esc(text.slice(pos, we)) + (we < text.length ? '…' : '');
    return out;
  }

  /* ---------------- offline support when served over http(s) ---------------- */

  if (/^https?:$/.test(location.protocol)) {
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.webmanifest';
    document.head.appendChild(link);
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* offline mode unavailable */ });
      });
    }
  }

  /* ---------------- start ---------------- */

  applySettings();
  route();
})();
