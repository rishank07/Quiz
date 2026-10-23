(function () {
      'use strict';

      /* ================= SAFE STORAGE ================= */
      var mem = {};
      var store = {
        get: function (k) {
          try { var v = window.localStorage.getItem(k); return v !== null ? v : (k in mem ? mem[k] : null); }
          catch (e) { return k in mem ? mem[k] : null; }
        },
        set: function (k, v) {
          mem[k] = v;
          try { window.localStorage.setItem(k, v); } catch (e) { }
        }
      };

      /* ================= SOUND ================= */
      var soundOn = store.get('msb_sound') !== '0';
      var audioCtx = null;
      function beep(freq, dur, type, vol) {
        if (!soundOn) return;
        try {
          if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var o = audioCtx.createOscillator();
          var g = audioCtx.createGain();
          o.type = type || 'sine';
          o.frequency.value = freq;
          g.gain.value = vol || 0.08;
          o.connect(g); g.connect(audioCtx.destination);
          o.start();
          g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
          o.stop(audioCtx.currentTime + dur);
        } catch (e) { }
      }
      function sfxCorrect() { beep(660, .12, 'sine'); setTimeout(function () { beep(880, .18, 'sine'); }, 90); }
      function sfxWrong() { beep(200, .28, 'square', .05); }
      function sfxTick() { beep(1200, .05, 'sine', .04); }
      function sfxFinish() { beep(523, .15); setTimeout(function () { beep(659, .15); }, 140); setTimeout(function () { beep(784, .3); }, 280); }

      var soundBtn = document.getElementById('soundBtn');
      function paintSoundBtn() { soundBtn.innerHTML = soundOn ? '&#128266;' : '&#128263;'; }
      paintSoundBtn();
      soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        store.set('msb_sound', soundOn ? '1' : '0');
        paintSoundBtn();
      });

      /* ================= PRACTICE TYPES ================= */
      var TYPES = [
        { key: 'addition', nm: 'Addition', hi: '\u091C\u094B\u0921\u093C', sym: '+', ac: '#3498db' },
        { key: 'subtraction', nm: 'Subtraction', hi: '\u0918\u091F\u093E\u0935', sym: '\u2212', ac: '#e74c3c' },
        { key: 'multiplication', nm: 'Multiplication', hi: '\u0917\u0941\u0923\u093E', sym: '\u00d7', ac: '#2ecc71' },
        { key: 'division', nm: 'Division', hi: '\u092D\u093E\u0917', sym: '\u00f7', ac: '#9b59b6' },
        { key: 'percentage', nm: 'Percentage', hi: '\u092A\u094D\u0930\u0924\u093F\u0936\u0924', sym: '%', ac: '#e67e22' },
        { key: 'square', nm: 'Square', hi: '\u0935\u0930\u094D\u0917', sym: 'x\u00b2', ac: '#1abc9c' },
        { key: 'sqrt', nm: 'Square Root', hi: '\u0935\u0930\u094D\u0917\u092E\u0942\u0932', sym: '\u221a', ac: '#3498db' },
        { key: 'cube', nm: 'Cube', hi: '\u0918\u0928', sym: 'x\u00b3', ac: '#e74c3c' },
        { key: 'cbrt', nm: 'Cube Root', hi: '\u0918\u0928\u092E\u0942\u0932', sym: '\u221b', ac: '#2ecc71' },
        { key: 'exponent', nm: 'Exponent', hi: '\u0918\u093E\u0924\u093E\u0902\u0915', sym: 'x\u207F', ac: '#9b59b6' },
        { key: 'mixed', nm: 'Mixed Practice', hi: '\u0938\u092D\u0940 \u092E\u093F\u0932\u093E\u0915\u0930', sym: '\u2211', ac: '#f5c842', wide: true }
      ];

      var gridEl = document.getElementById('practiceGrid');
      TYPES.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'p-card' + (t.wide ? ' wide' : '');
        b.style.setProperty('--ac', t.ac);
        b.innerHTML = '<span class="sym">' + t.sym + '</span><span class="nm">' + t.nm + '</span><span class="hi">' + t.hi + '</span>';
        b.addEventListener('click', function () { openSettings(t, b); });
        gridEl.appendChild(b);
      });

      var BEST_KEY = 'msb_best_v2';
      function readBests() {
        try { var value = JSON.parse(store.get(BEST_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; }
        catch (e) { return {}; }
      }
      function patternKey() {
        return [current.type.key, current.level, current.digits, current.time, current.inputType,
          current.count, current.marks, current.neg].join('|');
      }
      function formatTime(seconds) { return Number(seconds.toFixed(2)) + 's'; }

      /* Compare records only within the same pattern; retain old records separately. */
      var bestStrip = document.getElementById('bestStrip');
      function paintBestStrip() {
        try {
          var best = readBests();
          var keys = Object.keys(best);
          if (!keys.length) {
            var legacy = JSON.parse(store.get('msb_best') || '{}');
            var oldKeys = Object.keys(legacy);
            if (!oldKeys.length) { bestStrip.classList.remove('show'); return; }
            var oldPct = Math.max.apply(null, oldKeys.map(function (k) { return Number(legacy[k].pct) || 0; }));
            bestStrip.textContent = 'Previous best: ' + oldPct + '% · Complete a batch to track your score and speed by pattern.';
            bestStrip.classList.add('show'); return;
          }
          var top = keys.map(function (k) { return { k: k, p: best[k].pct }; })
            .sort(function (a, b) { return b.p - a.p; })[0];
          var record = best[top.k];
          var t = TYPES.filter(function (x) { return x.key === record.type; })[0];
          bestStrip.textContent = '🏆 Best: ' + top.p + '% in ' + (t ? t.nm : 'Practice') +
            ' · ' + record.level + ' · ' + record.digits + ' digits · ' + record.inputType +
            (record.correctAvg === null ? '' : ' · ' + formatTime(record.correctAvg) + ' per correct answer');
          bestStrip.classList.add('show');
        } catch (e) { bestStrip.classList.remove('show'); }
      }
      paintBestStrip();

      /* ================= NAVIGATION ================= */
      var topbar = document.getElementById('topbar');
      var topbarTitle = document.getElementById('topbarTitle');
      var backBtn = document.getElementById('backBtn');
      var settingsOverlay = document.getElementById('settingsOverlay');
      var resultOverlay = document.getElementById('resultOverlay');
      var settingsTrigger = null;

      function showScreen(id) {
        document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
        document.getElementById(id).classList.add('active');
      }
      function goHome() {
        resetSession();
        resultOverlay.classList.remove('active');
        settingsOverlay.classList.remove('active');
        topbar.classList.remove('show-back');
        topbarTitle.innerHTML = 'Math <span class="accent">Speed Booster</span>';
        paintBestStrip();
        showScreen('screen-home');
      }
      backBtn.addEventListener('click', goHome);
      function closeSettings() {
        settingsOverlay.classList.remove('active');
        if (settingsTrigger) settingsTrigger.focus();
      }
      function closeResult() {
        goHome();
        if (settingsTrigger) settingsTrigger.focus();
      }
      window.EFP_MATHS_SPEED_BOOSTER_BACK = function () {
        if (settingsOverlay.classList.contains('active')) { closeSettings(); return true; }
        if (resultOverlay.classList.contains('active')) { closeResult(); return true; }
        if (document.getElementById('screen-practice').classList.contains('active')) {
          goHome();
          if (settingsTrigger) settingsTrigger.focus();
          return true;
        }
        return false;
      };
      document.getElementById('settingsClose').addEventListener('click', closeSettings);
      document.getElementById('resultClose').addEventListener('click', closeResult);
      settingsOverlay.addEventListener('click', function (e) { if (e.target === settingsOverlay) closeSettings(); });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (settingsOverlay.classList.contains('active')) closeSettings();
        else if (resultOverlay.classList.contains('active')) closeResult();
      });

      /* ================= SETTINGS ================= */
      var current = { type: TYPES[0], time: 20, level: 'beginner', digits: 2, inputType: 'keyboard', count: 10, marks: 1, neg: 0 };

      function wirePills(containerId, stateKey, parseFn) {
        var container = document.getElementById(containerId);
        container.querySelectorAll('.pill').forEach(function (p) {
          p.addEventListener('click', function () {
            container.querySelectorAll('.pill').forEach(function (x) { x.classList.remove('sel'); });
            p.classList.add('sel');
            current[stateKey] = parseFn ? parseFn(p.dataset.val) : p.dataset.val;
            paintSettings();
          });
        });
      }
      wirePills('timeOptions', 'time', Number);
      wirePills('levelOptions', 'level');
      wirePills('digitOptions', 'digits', Number);
      wirePills('inputTypeOptions', 'inputType');
      wirePills('countOptions', 'count', Number);
      wirePills('marksOptions', 'marks', Number);
      wirePills('negOptions', 'neg', Number);

      function openSettings(type, trigger) {
        current.type = type;
        settingsTrigger = trigger || null;
        document.getElementById('settingsTitle').textContent = type.nm + ' Practice';
        paintSettings();
        settingsOverlay.classList.add('active');
      }

      function paintSettings() {
        var key = current.type.key;
        var power = ['square', 'cube', 'exponent'].indexOf(key) !== -1;
        var root = key === 'sqrt' || key === 'cbrt';
        document.getElementById('digitLabel').textContent = root ? 'Digits in the root answer' :
          power ? 'Digits in the base number' : key === 'division' ? 'Digits in the dividend' : 'Digits in each main number';
        document.getElementById('digitNote').textContent = root ?
          'The root answer has the selected digits; the number under the root is its perfect square/cube.' :
          power ? 'The base has the selected digits. Its square, cube or power can be much longer.' :
          key === 'mixed' ? 'Digits apply to main operands, the dividend, or the base/root answer according to the topic.' :
          key === 'multiplication' ? 'The first number has the selected digits; level controls the multiplier.' :
          'Selected digits are respected at every level. Higher levels use larger or trickier numbers.';
        var best = readBests()[patternKey()];
        document.getElementById('settingsSub').textContent = best ?
          'Best for this pattern: ' + best.pct + '%' + (best.correctAvg === null ? '' : ' · ' + formatTime(best.correctAvg) + ' per correct answer') :
          'New pattern · unique questions in every batch.';
      }

      document.getElementById('setBtn').addEventListener('click', function () {
        settingsOverlay.classList.remove('active');
        topbar.classList.add('show-back');
        topbarTitle.textContent = current.type.nm;
        preparePracticeScreen();
        showScreen('screen-practice');
      });

      /* ================= QUESTION GENERATION ================= */
      function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
      function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

      function digitRange(d) {
        if (d === 2) return [10, 99];
        if (d === 3) return [100, 999];
        return [1000, 9999];
      }
      /* level scales the "hard side" operand / base numbers */
      function levelIdx() { return current.level === 'beginner' ? 0 : (current.level === 'intermediate' ? 1 : 2); }

      function levelRange(d, level) {
        var full = digitRange(d), size = full[1] - full[0] + 1;
        var first = full[0] + Math.floor(size * 0.3);
        var second = full[0] + Math.floor(size * 0.65);
        return level === 0 ? [full[0], first - 1] : level === 1 ? [first, second - 1] : [second, full[1]];
      }

      function genQuestion(typeKey) {
        var L = levelIdx();
        var digits = current.digits;
        var range = levelRange(digits, L);
        var a, b, text, answer;
        var effectiveType = typeKey;
        if (typeKey === 'mixed') {
          effectiveType = pick(['addition', 'subtraction', 'multiplication', 'division', 'percentage', 'square', 'sqrt', 'cube', 'cbrt', 'exponent']);
        }
        switch (effectiveType) {
          case 'addition':
            a = randInt(range[0], range[1]); b = randInt(range[0], range[1]);
            if (L === 2) { /* expert: 3 numbers */
              var c = randInt(range[0], range[1]);
              text = a + ' + ' + b + ' + ' + c + ' = ?'; answer = a + b + c; break;
            }
            text = a + ' + ' + b + ' = ?'; answer = a + b; break;

          case 'subtraction':
            a = randInt(range[0], range[1]); b = randInt(range[0], range[1]);
            if (b > a) { var t1 = a; a = b; b = t1; }
            if (L === 2 && Math.random() < 0.5) { var t2 = a; a = b; b = t2; } /* expert: negative answers possible */
            text = a + ' \u2212 ' + b + ' = ?'; answer = a - b; break;

          case 'multiplication':
            var mulSmall = [[2, 9], [11, 25], [26, 99]][L];
            a = randInt(range[0], range[1]); b = randInt(mulSmall[0], mulSmall[1]);
            text = a + ' \u00d7 ' + b + ' = ?'; answer = a * b; break;

          case 'division':
            var divB = [[2, 9], [6, 15], [11, 25]][L];
            // Choose only divisors that have an exact multiple in the digit band.
            var divisors = [];
            for (var divisor = divB[0]; divisor <= divB[1]; divisor++) {
              if (Math.ceil(range[0] / divisor) <= Math.floor(range[1] / divisor)) divisors.push(divisor);
            }
            b = pick(divisors);
            var q = randInt(Math.ceil(range[0] / b), Math.floor(range[1] / b));
            a = b * q;
            text = a + ' \u00f7 ' + b + ' = ?'; answer = q; break;

          case 'percentage':
            var pctPool = [[5, 10, 20, 25, 50], [5, 10, 12.5, 15, 20, 25, 40, 50, 75], [2.5, 7.5, 12.5, 15, 17.5, 22.5, 33, 37.5, 62.5, 87.5]][L];
            var pct = pick(pctPool);
            a = randInt(range[0], range[1]);
            text = pct + '% of ' + a + ' = ?';
            // All percentages have at most one decimal: exact answers need at most 3.
            answer = (Math.round(pct * 10) * a) / 1000; break;

          case 'square':
            a = randInt(range[0], range[1]);
            text = a + '\u00b2 = ?'; answer = a * a; break;

          case 'sqrt':
            a = randInt(range[0], range[1]);
            text = '\u221a' + (a * a) + ' = ?'; answer = a; break;

          case 'cube':
            a = randInt(range[0], range[1]);
            text = a + '\u00b3 = ?'; answer = a * a * a; break;

          case 'cbrt':
            a = randInt(range[0], range[1]);
            text = '\u221b' + (a * a * a) + ' = ?'; answer = a; break;

          case 'exponent':
            var exPow = [[2, 2], [2, 3], [3, 4]][L];
            b = randInt(exPow[0], exPow[1]);
            var safeBase = Math.floor(Math.pow(Number.MAX_SAFE_INTEGER, 1 / b));
            while (Math.pow(safeBase, b) > Number.MAX_SAFE_INTEGER) safeBase--;
            a = randInt(range[0], Math.min(range[1], safeBase));
            text = a + '^' + b + ' = ?'; answer = Math.pow(a, b); break;

          default:
            a = randInt(range[0], range[1]); b = randInt(range[0], range[1]);
            text = a + ' + ' + b + ' = ?'; answer = a + b;
        }
        var id;
        if (effectiveType === 'addition') id = 'add:' + (typeof c === 'number' ? [a, b, c] : [a, b]).sort(function (x, y) { return x - y; }).join(':');
        else if (effectiveType === 'multiplication') id = 'mul:' + Math.min(a, b) + ':' + Math.max(a, b);
        else if (effectiveType === 'square' || effectiveType === 'cube' || effectiveType === 'exponent') id = 'power:' + a + ':' + (effectiveType === 'square' ? 2 : effectiveType === 'cube' ? 3 : b);
        else if (effectiveType === 'percentage') id = 'pct:' + pct + ':' + a;
        else if (effectiveType === 'sqrt' || effectiveType === 'cbrt') id = effectiveType + ':' + a;
        else id = effectiveType + ':' + a + ':' + b;
        return { text: text, answer: answer, options: null, id: id, type: effectiveType };
      }

      function genBatch() {
        var questions = [], seen = new Set(), attempts = 0;
        while (questions.length < current.count && attempts++ < current.count * 300) {
          var q = genQuestion(current.type.key);
          if (seen.has(q.id)) continue;
          seen.add(q.id);
          if (current.inputType === 'mcq') q.options = genOptions(q.answer);
          questions.push(q);
        }
        if (questions.length !== current.count) throw new Error('Could not prepare a unique batch. Please press Start again.');
        return questions;
      }

      /* MCQ distractors: plausible near-miss options */
      function genOptions(ans) {
        var opts = [ans];
        var isDec = ans % 1 !== 0;
        var mag = Math.max(1, Math.abs(ans));
        var tries = 0;
        while (opts.length < 4 && tries < 60) {
          tries++;
          var d;
          var mode = randInt(0, 3);
          if (mode === 0) d = ans + pick([1, -1, 2, -2, 10, -10]);
          else if (mode === 1) d = ans + pick([1, -1]) * Math.max(1, Math.round(mag * pick([0.05, 0.1, 0.02])));
          else if (mode === 2 && !isDec && Math.abs(ans) >= 12) {
            /* digit swap */
            var s = String(Math.abs(ans)).split('');
            var i = randInt(0, s.length - 2);
            var tmp = s[i]; s[i] = s[i + 1]; s[i + 1] = tmp;
            d = parseInt(s.join(''), 10) * (ans < 0 ? -1 : 1);
          }
          else d = ans + pick([3, -3, 5, -5, 100, -100]);
          if (isDec) {
            d = ans + pick([-1, 1]) * pick([0.001, 0.01, 0.1, 0.5, 1, 2, 10]);
            d = Math.round(d * 1000) / 1000;
          }
          if (d !== ans && opts.indexOf(d) === -1 && Number.isFinite(d) && Math.abs(d) <= Number.MAX_SAFE_INTEGER &&
            (isDec || Number.isSafeInteger(d)) && (ans < 0 || d >= 0)) opts.push(d);
        }
        for (var delta = 1; opts.length < 4; delta++) {
          var fallback = ans + (ans > Number.MAX_SAFE_INTEGER - 10 ? -delta : delta);
          if (isDec) fallback = Math.round(fallback * 1000) / 1000;
          if (opts.indexOf(fallback) === -1) opts.push(fallback);
        }
        /* shuffle */
        for (var i = opts.length - 1; i > 0; i--) {
          var j = randInt(0, i);
          var t = opts[i]; opts[i] = opts[j]; opts[j] = t;
        }
        return opts;
      }

      /* ================= PRACTICE SESSION ================= */
      var session = null;

      var marksVal = document.getElementById('marksVal');
      var streakVal = document.getElementById('streakVal');
      var timerArc = document.getElementById('timerArc');
      var timerNum = document.getElementById('timerNum');
      var progressBar = document.getElementById('progressBar');
      var qCount = document.getElementById('qCount');
      var qText = document.getElementById('qText');
      var kbArea = document.getElementById('kbArea');
      var mcqArea = document.getElementById('mcqArea');
      var ansBox = document.getElementById('ansBox');
      var feedback = document.getElementById('feedback');
      var mcqFeedback = document.getElementById('mcqFeedback');
      var mcqGrid = document.getElementById('mcqGrid');
      var startWrap = document.getElementById('startWrap');
      var startBtn = document.getElementById('startBtn');
      var startHint = document.getElementById('startHint');
      var countdownEl = document.getElementById('countdown');
      var answerArea = document.getElementById('answerArea');
      var ARC_LEN = 169.6;

      function fmtNum(n) { return String(n); }

      function preparePracticeScreen() {
        resetSession();
        marksVal.textContent = '0';
        streakVal.textContent = '0';
        streakVal.classList.remove('streak-hot');
        timerNum.textContent = '00';
        timerNum.classList.remove('low');
        timerArc.classList.remove('low');
        timerArc.style.strokeDashoffset = 0;
        progressBar.style.width = '0%';
        qCount.textContent = 'Ready';
        qText.innerHTML = '&nbsp;';
        feedback.textContent = ''; feedback.className = 'feedback';
        mcqFeedback.textContent = ''; mcqFeedback.className = 'feedback';
        answerArea.style.display = 'none';
        countdownEl.style.display = 'none';
        startWrap.style.display = 'block';
        var negTxt = current.neg > 0 ? ('&minus;' + current.neg + ' for each wrong answer') : 'no negative marking';
        startHint.innerHTML =
          '<b>' + current.count + ' questions</b> &middot; <b>' + current.time + ' sec</b> each &middot; ' +
          current.level.charAt(0).toUpperCase() + current.level.slice(1) + ' level<br>' +
          '+' + current.marks + ' per correct, ' + negTxt + '.<br>' +
          'No repeated questions in this batch. Enter exact answers (up to 3 decimal places).';
      }

      function resetSession() {
        if (session) {
          if (session.timerId) clearInterval(session.timerId);
          if (session.advanceId) clearTimeout(session.advanceId);
          if (session.cdId) clearInterval(session.cdId);
          if (session.resultId) clearTimeout(session.resultId);
        }
        session = null;
      }

      startBtn.addEventListener('click', function () {
        if (session) return;
        var questions;
        try { questions = genBatch(); }
        catch (e) { startHint.textContent = e.message; return; }
        startWrap.style.display = 'none';
        session = {
          index: 0, marks: 0, correct: 0, wrong: 0, skipped: 0,
          streak: 0, bestStreak: 0,
          currentAnswer: '', locked: true, phase: 'countdown',
          timerId: null, advanceId: null, cdId: null, resultId: null,
          timeLeft: current.time, qStart: 0, deadline: 0,
          questions: questions, review: []
        };
        var activeSession = session;
        /* 3-2-1 countdown */
        var n = 3;
        countdownEl.style.display = 'block';
        countdownEl.textContent = n;
        sfxTick();
        session.cdId = setInterval(function () {
          if (session !== activeSession) return;
          n--;
          if (n <= 0) {
            clearInterval(session.cdId);
            countdownEl.style.display = 'none';
            answerArea.style.display = 'block';
            kbArea.style.display = current.inputType === 'keyboard' ? 'block' : 'none';
            mcqArea.style.display = current.inputType === 'mcq' ? 'block' : 'none';
            loadQuestion();
          } else {
            countdownEl.textContent = n;
            sfxTick();
          }
        }, 1000);
      });

      function loadQuestion() {
        if (!session) return;
        var q = session.questions[session.index];
        session.currentAnswer = '';
        session.locked = false;
        session.phase = 'question';
        session.timeLeft = current.time;
        session.qStart = Date.now();
        session.deadline = session.qStart + current.time * 1000;

        qCount.textContent = 'Question ' + (session.index + 1) + ' of ' + current.count;
        progressBar.style.width = ((session.index) / current.count * 100) + '%';
        qText.textContent = q.text;

        feedback.textContent = ''; feedback.className = 'feedback';
        mcqFeedback.textContent = ''; mcqFeedback.className = 'feedback';
        paintAnswer();

        if (current.inputType === 'mcq') {
          mcqGrid.innerHTML = '';
          q.options.forEach(function (opt) {
            var b = document.createElement('button');
            b.className = 'mcq-opt';
            b.textContent = fmtNum(opt);
            b.addEventListener('click', function () { submitMcq(opt, b); });
            mcqGrid.appendChild(b);
          });
        }

        timerNum.classList.remove('low');
        timerArc.classList.remove('low');
        timerArc.style.transition = 'none';
        timerArc.style.strokeDashoffset = 0;
        timerNum.textContent = String(session.timeLeft).padStart(2, '0');
        /* force reflow so transition restarts cleanly */
        void timerArc.getBoundingClientRect();
        timerArc.style.transition = 'stroke-dashoffset 1s linear, stroke .3s';

        if (session.timerId) clearInterval(session.timerId);
        var activeSession = session;
        session.timerId = setInterval(function () { if (session === activeSession) updateTimer(); }, 100);
      }

      function updateTimer() {
          if (!session || session.phase !== 'question') return;
          var previous = session.timeLeft;
          var left = Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000));
          session.timeLeft = left;
          timerNum.textContent = String(left).padStart(2, '0');
          timerArc.style.strokeDashoffset = ARC_LEN * (1 - left / current.time);
          if (left <= Math.min(5, Math.ceil(current.time * 0.25))) {
            timerNum.classList.add('low');
            timerArc.classList.add('low');
            if (left > 0 && left !== previous) sfxTick();
          }
          if (session.timeLeft <= 0) {
            clearInterval(session.timerId);
            finishQuestion(null, true);
          }
      }

      document.addEventListener('visibilitychange', updateTimer);
      window.addEventListener('pageshow', updateTimer);

      function paintAnswer() {
        ansBox.className = 'ans-box';
        if (session && session.currentAnswer !== '') {
          ansBox.textContent = session.currentAnswer;
        } else {
          ansBox.innerHTML = '<span class="ph">Your answer</span>';
        }
      }

      /* --- keyboard-mode input --- */
      document.getElementById('keypad').addEventListener('click', function (e) {
        var btn = e.target.closest('.key');
        if (!btn || !session || session.locked || session.phase !== 'question') return;
        handleKey(btn.dataset.k);
      });
      function handleKey(k) {
        if (!session || session.locked || session.phase !== 'question') return;
        if (k === 'del') session.currentAnswer = session.currentAnswer.slice(0, -1);
        else if (k === 'clear') session.currentAnswer = '';
        else if (k === 'submit') { submitTyped(); return; }
        else if (k === '-') {
          if (session.currentAnswer === '') session.currentAnswer = '-';
        }
        else if (k === '.') {
          if (session.currentAnswer.indexOf('.') === -1) session.currentAnswer += '.';
        }
        else if (/^\d$/.test(k) && session.currentAnswer.replace('-', '').replace('.', '').length < 16) {
          session.currentAnswer += k;
        }
        paintAnswer();
      }
      document.addEventListener('keydown', function (e) {
        if (!session || session.locked || session.phase !== 'question' || current.inputType !== 'keyboard') return;
        if (!document.getElementById('screen-practice').classList.contains('active')) return;
        if (startWrap.style.display !== 'none') return;
        if (e.key >= '0' && e.key <= '9') { handleKey(e.key); e.preventDefault(); }
        else if (e.key === '.') { handleKey('.'); e.preventDefault(); }
        else if (e.key === '-') { handleKey('-'); e.preventDefault(); }
        else if (e.key === 'Backspace') { handleKey('del'); e.preventDefault(); }
        else if (e.key === 'Enter') { submitTyped(); e.preventDefault(); }
      });

      function submitTyped() {
        if (!session || session.locked || session.phase !== 'question') return;
        if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(session.currentAnswer)) {
          finishQuestion(null, false); /* treated as skipped */
          return;
        }
        finishQuestion(Number(session.currentAnswer), false);
      }

      function submitMcq(val, btnEl) {
        if (!session || session.locked || session.phase !== 'question') return;
        session.mcqBtn = btnEl;
        finishQuestion(val, false);
      }
      document.getElementById('mcqSkip').addEventListener('click', function () {
        if (!session || session.locked || session.phase !== 'question') return;
        finishQuestion(null, false);
      });

      /* --- grading + feedback + auto-advance --- */
      function finishQuestion(given, timedOut) {
        if (!session || session.locked || session.phase !== 'question') return;
        // Enforce the deadline at submission too, even if a browser delayed the timer.
        timedOut = timedOut || Date.now() >= session.deadline;
        if (timedOut) given = null;
        session.locked = true;
        session.phase = 'feedback';
        clearInterval(session.timerId);

        var q = session.questions[session.index];
        var timeTaken = Math.min(current.time, Math.max(0, (Date.now() - session.qStart) / 1000));
        var status, delay;

        if (given === null || !Number.isFinite(given)) {
          status = 'skip';
          session.skipped++;
          session.streak = 0;
          var msg = timedOut ? '\u23F1 Time up! Answer: ' + fmtNum(q.answer) : 'Skipped \u2014 answer: ' + fmtNum(q.answer);
          feedback.textContent = msg; feedback.className = 'feedback skip';
          mcqFeedback.textContent = msg; mcqFeedback.className = 'feedback skip';
          delay = 1600;
        }
        else if (given === q.answer) {
          status = 'ok';
          session.correct++;
          session.streak++;
          if (session.streak > session.bestStreak) session.bestStreak = session.streak;
          session.marks = Math.round((session.marks + current.marks) * 100) / 100;
          ansBox.classList.add('ok');
          feedback.textContent = '\u2713 Correct!' + (session.streak >= 3 ? ('  \u{1F525} ' + session.streak + ' streak') : '');
          feedback.className = 'feedback ok';
          mcqFeedback.textContent = feedback.textContent;
          mcqFeedback.className = 'feedback ok';
          if (session.mcqBtn) session.mcqBtn.classList.add('ok');
          sfxCorrect();
          delay = 900;
        }
        else {
          status = 'bad';
          session.wrong++;
          session.streak = 0;
          session.marks -= current.neg;
          session.marks = Math.round(session.marks * 100) / 100;
          ansBox.classList.add('bad');
          var wmsg = '\u2717 Wrong \u2014 correct answer: ' + fmtNum(q.answer);
          feedback.textContent = wmsg; feedback.className = 'feedback bad';
          mcqFeedback.textContent = wmsg; mcqFeedback.className = 'feedback bad';
          if (session.mcqBtn) {
            session.mcqBtn.classList.add('bad');
            /* highlight the correct option */
            var opts = mcqGrid.querySelectorAll('.mcq-opt');
            opts.forEach(function (o) { if (parseFloat(o.textContent) === q.answer) o.classList.add('ok'); });
          }
          sfxWrong();
          delay = 1900;
        }
        if (current.inputType === 'mcq') {
          mcqGrid.querySelectorAll('.mcq-opt').forEach(function (o) { o.disabled = true; });
        }
        session.mcqBtn = null;

        session.review.push({
          text: q.text, answer: q.answer,
          given: (given === null || !Number.isFinite(given)) ? null : given,
          status: status, time: timeTaken
        });

        marksVal.textContent = fmtNum(session.marks);
        streakVal.textContent = session.streak;
        streakVal.classList.toggle('streak-hot', session.streak >= 3);
        progressBar.style.width = ((session.index + 1) / current.count * 100) + '%';

        var activeSession = session;
        session.advanceId = setTimeout(function () {
          if (session !== activeSession || session.phase !== 'feedback') return;
          if (session.index >= current.count - 1) {
            showResult();
          } else {
            session.index++;
            loadQuestion();
          }
        }, delay);
      }

      /* ================= RESULT ================= */
      function showResult() {
        if (!session || session.phase === 'result') return;
        session.phase = 'result';
        session.locked = true;
        sfxFinish();
        var maxMarks = current.count * current.marks;
        var pct = Math.max(0, Math.round((session.marks / maxMarks) * 100));
        var attempted = session.correct + session.wrong;
        var totalTime = session.review.reduce(function (s, r) { return s + r.time; }, 0);
        var avg = session.review.length ? totalTime / session.review.length : 0;
        var correctTime = session.review.filter(function (r) { return r.status === 'ok'; })
          .reduce(function (s, r) { return s + r.time; }, 0);
        var correctAvg = session.correct ? correctTime / session.correct : null;

        document.getElementById('resultHeading').textContent = current.type.nm + ' \u00b7 ' +
          current.level.charAt(0).toUpperCase() + current.level.slice(1);
        document.getElementById('resultPct').textContent = pct + '%';
        document.getElementById('resultOf').textContent = fmtNum(session.marks) + ' / ' + maxMarks + ' marks';
        document.getElementById('rTotal').textContent = attempted;
        document.getElementById('rCorrect').textContent = session.correct;
        document.getElementById('rWrong').textContent = session.wrong;
        document.getElementById('rSkipped').textContent = session.skipped;
        document.getElementById('rMarks').textContent = fmtNum(session.marks);
        document.getElementById('avgTime').innerHTML =
          'Avg time (all): <b>' + formatTime(avg) + '</b> &middot; Correct-answer avg: <b>' +
          (correctAvg === null ? '—' : formatTime(correctAvg)) + '</b><br>Best streak: <b>' + session.bestStreak + '</b>';

        var arc = document.getElementById('scoreArc');
        arc.style.strokeDashoffset = 351.9;
        var activeSession = session;
        session.resultId = setTimeout(function () { if (session === activeSession) arc.style.strokeDashoffset = 351.9 * (1 - Math.min(pct, 100) / 100); }, 80);

        /* best score */
        var newBestEl = document.getElementById('newBest');
        newBestEl.classList.remove('show');
        try {
          var best = readBests();
          var key = patternKey(), prev = best[key];
          if (!prev || session.marks > prev.marks ||
            (session.marks === prev.marks && correctAvg !== null && (prev.correctAvg === null || correctAvg < prev.correctAvg))) {
            best[key] = { pct: pct, marks: session.marks, correctAvg: correctAvg,
              type: current.type.key, level: current.level, digits: current.digits, inputType: current.inputType,
              time: current.time, count: current.count, perQuestion: current.marks, negative: current.neg };
            store.set(BEST_KEY, JSON.stringify(best));
            if (prev) newBestEl.classList.add('show');
          }
        } catch (e) { }

        /* review list */
        var list = document.getElementById('reviewList');
        list.innerHTML = '';
        session.review.forEach(function (r, i) {
          var div = document.createElement('div');
          div.className = 'rev-item ' + r.status;
          var icon = r.status === 'ok' ? '\u2713' : (r.status === 'bad' ? '\u2717' : '\u2013');
          var ua = r.given === null ? '\u2014' : fmtNum(r.given);
          var caLine = r.status === 'ok' ? '' : '<span class="ca">Ans: <b>' + fmtNum(r.answer) + '</b></span>';
          div.innerHTML =
            '<span class="st">' + icon + '</span>' +
            '<span class="qq">' + (i + 1) + '. ' + r.text.replace(' = ?', '') + '</span>' +
            '<span class="aa"><span class="ua">' + ua + '</span>' + caLine + '</span>' +
            '<span class="tt">' + formatTime(r.time) + '</span>';
          list.appendChild(div);
        });

        resultOverlay.classList.add('active');
      }

      document.getElementById('homeBtn').addEventListener('click', goHome);
      document.getElementById('retryBtn').addEventListener('click', function () {
        resultOverlay.classList.remove('active');
        preparePracticeScreen();
      });

    })();
