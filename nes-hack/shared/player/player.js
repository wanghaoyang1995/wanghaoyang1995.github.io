const $ = id => document.getElementById(id);
const canvas = $('game');
const context = canvas.getContext('2d', {alpha: false});
const workerURL = new URL('./worker.js', import.meta.url);
workerURL.search = new URL(import.meta.url).search;
const keyboardURL = new URL('./keyboard.js', import.meta.url);
keyboardURL.search = new URL(import.meta.url).search;
const touchURL = new URL('./touch.js', import.meta.url);
touchURL.search = new URL(import.meta.url).search;
const sources = new Set();
const heldSources = new Map();
const touchButtons = [];
let entry = null, manifestURL = null, worker = null, ready = false;
let manualPause = false, hiddenPause = document.hidden, muted = false;
let audio = null, gain = null, nextAudio = 0;
let allowedKeys = new Set();
let virtualPad = null;
let touchMode = false;
let loading = false;

function setControlButton(id, label, icon) {
  const button = $(id);
  button.querySelector('.button-label').textContent = label;
  button.querySelector('use').setAttribute('href', '#icon-' + icon);
  button.dataset.icon = icon;
  button.setAttribute('aria-label', label);
}

function localURL(value, base) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('游戏入口地址无效');
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin || url.username || url.password || url.hash) {
    throw new Error('游戏入口必须是同源 HTTP(S) 地址');
  }
  return url;
}

function parseKey(key) {
  const named = {'←':'ArrowLeft', '↑':'ArrowUp', '→':'ArrowRight', '↓':'ArrowDown'};
  const physicalCode = Object.hasOwn(named, key) ? named[key] : /^[A-Z]$/i.test(key) ? 'Key' + key.toUpperCase() : /^[0-9]$/.test(key) ? 'Digit' + key : key;
  const codes = {ArrowLeft:37, ArrowUp:38, ArrowRight:39, ArrowDown:40, Enter:13, Space:32, ShiftLeft:16, ShiftRight:16, NumpadEnter:13};
  let code = codes[physicalCode];
  if (/^Key[A-Z]$/.test(physicalCode)) code = physicalCode.charCodeAt(3);
  if (/^Digit[0-9]$/.test(physicalCode)) code = physicalCode.charCodeAt(5);
  if (/^Numpad[0-9]$/.test(physicalCode)) code = 96 + Number(physicalCode.at(-1));
  if (!code) return null;
  const arrows = {ArrowLeft:'←', ArrowUp:'↑', ArrowRight:'→', ArrowDown:'↓'};
  const label = /^Numpad[0-9]$/.test(physicalCode) ? '小键盘 ' + physicalCode.at(-1) : physicalCode === 'ShiftLeft' ? '左 Shift' : physicalCode === 'ShiftRight' ? '右 Shift' : arrows[physicalCode] || key;
  return {label, code, physicalCode};
}

function readControls(value, name) {
  if (!Array.isArray(value) || value.length > 32) throw new Error(`${name}配置无效`);
  return value.map(row => {
    if (!row || typeof row.label !== 'string' || !row.label.trim() || !Array.isArray(row.keys) || !row.keys.length || row.keys.length > 16) {
      throw new Error(`${name}配置无效`);
    }
    const keys = row.keys.map(label => {
      const key = typeof label === 'string' && parseKey(label);
      if (!key) throw new Error(`不支持的按键：${String(label)}`);
      return key;
    });
    if (row.player !== undefined && (typeof row.player !== 'string' || !row.player.trim())) throw new Error(`${name}玩家分组无效`);
    return {label:row.label, player:row.player || '', keys, touch:row.touch !== false};
  });
}

function setTouchEnabled() {
  for (const button of touchButtons) button.disabled = !ready || manualPause || hiddenPause || touchMode;
  virtualPad?.setEnabled(touchMode && ready && !manualPause && !hiddenPause, touchMode && ready && !hiddenPause);
  virtualPad?.setPaused(manualPause);
  virtualPad?.setLaunchState(ready, loading);
}

function clearKeys() {
  virtualPad?.reset();
  heldSources.clear();
  for (const button of touchButtons) button.dataset.held = 'false';
  worker?.postMessage({type:'clear'});
}

function key(item, down, source) {
  if (!ready || manualPause || hiddenPause || !allowedKeys.has(item.physicalCode)) return;
  const {code, physicalCode} = item;
  let holders = heldSources.get(physicalCode);
  if (down) {
    if (!holders) heldSources.set(physicalCode, holders = new Set());
    if (holders.has(source)) return;
    const first = holders.size === 0;
    holders.add(source);
    if (first) worker.postMessage({type:'key', code, physicalCode, down:true});
  } else if (holders?.delete(source) && holders.size === 0) {
    heldSources.delete(physicalCode);
    worker.postMessage({type:'key', code, physicalCode, down:false});
  }
}

function renderControls(rows, touchRows) {
  const list = $('controls');
  list.replaceChildren();
  let previousPlayer = '';
  for (const row of rows) {
    if (row.player && row.player !== previousPlayer) {
      const heading = document.createElement('div');
      heading.className = 'control-player';
      heading.textContent = row.player;
      list.append(heading);
    }
    previousPlayer = row.player;
    const group = document.createElement('div');
    const label = document.createElement('dt');
    const keys = document.createElement('dd');
    label.textContent = row.label;
    for (const item of row.keys) {
      const kbd = document.createElement('kbd');
      kbd.textContent = item.label;
      keys.append(kbd);
    }
    group.append(label, keys);
    list.append(group);
  }
  const touch = $('touch-controls');
  touch.replaceChildren();
  touchButtons.length = 0;
  for (const row of touchRows.filter(row => row.touch)) {
    const group = document.createElement('div');
    group.className = 'touch-group';
    const label = document.createElement('span');
    label.className = 'touch-label';
    label.textContent = [row.player, row.label].filter(Boolean).join(' · ');
    group.append(label);
    for (const item of row.keys) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      button.dataset.key = String(item.code);
      button.dataset.code = item.physicalCode;
      button.dataset.player = row.player;
      button.setAttribute('aria-label', [row.player, row.label, item.label].filter(Boolean).join(' '));
      button.onpointerdown = event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        button.dataset.held = 'true';
        key(item, true, `pointer:${event.pointerId}`);
      };
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(name, event => {
          button.dataset.held = 'false';
          key(item, false, `pointer:${event.pointerId}`);
        });
      }
      touchButtons.push(button);
      group.append(button);
    }
    touch.append(group);
  }
  setTouchEnabled();
}

async function loadEntry() {
  manifestURL = localURL(document.documentElement.dataset.manifest, document.baseURI);
  const response = await fetch(manifestURL, {redirect:'error'});
  if (!response.ok) throw new Error(`游戏信息加载失败 (${response.status})`);
  const manifest = await response.json();
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || typeof manifest.title !== 'string' || !manifest.title.trim()) {
    throw new Error('游戏信息格式无效');
  }
  for (const field of ['subtitle', 'note']) {
    if (manifest[field] !== undefined && typeof manifest[field] !== 'string') throw new Error(`游戏${field}配置无效`);
  }
  const controls = readControls(manifest.controls, '按键');
  const touch = manifest.touchControls === undefined ? controls : readControls(manifest.touchControls, '触屏按键');
  allowedKeys = new Set([...controls, ...touch].flatMap(row => row.keys.map(item => item.physicalCode)));
  document.title = manifest.title;
  $('title').textContent = manifest.title;
  $('subtitle').textContent = manifest.subtitle || '';
  $('note').textContent = manifest.note || '';
  $('note').hidden = !manifest.note;
  renderControls(controls, touch);
  const {createKeyboardPreview} = await import(keyboardURL.href);
  createKeyboardPreview($('keyboard-diagram'), {controls, bindings:manifest.controllerBindings});
  const {createVirtualGamepad} = await import(touchURL.href);
  virtualPad = createVirtualGamepad($('virtual-gamepad'), {
    controls:touch, bindings:manifest.controllerBindings, parseKey, emit:key,
    launch:start,
    pause() { manualPause = !manualPause; updatePause(); },
    exit() { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); setTouchMode(false); }
  });
  setTouchMode(touchMode);
  entry = manifest;
  $('start').disabled = false;
  $('touch-mode').disabled = false;
  $('status').textContent = '准备就绪，点击开始。';
}

function stopAudio() {
  for (const source of sources) { try { source.stop(); } catch {} }
  sources.clear();
  nextAudio = 0;
}

function updatePause() {
  setTouchEnabled();
  if (!ready) return;
  clearKeys();
  worker.postMessage({type:'pause', paused:manualPause || hiddenPause});
  setControlButton('pause', manualPause ? '继续' : '暂停', manualPause ? 'play' : 'pause');
  $('pause').setAttribute('aria-pressed', String(manualPause));
  $('status').textContent = manualPause ? '已暂停，点击继续恢复。' : hiddenPause ? '页面隐藏，已自动暂停。' : touchMode ? '运行中 · 使用画面上的虚拟手柄' : '运行中 · 点击游戏画面后可使用键盘';
  if (manualPause || hiddenPause) stopAudio();
}

function fail(message) {
  loading = false;
  clearKeys();
  ready = false;
  worker?.terminate();
  worker = null;
  stopAudio();
  setTouchEnabled();
  $('status').textContent = `运行失败：${message}`;
  $('start').disabled = false;
  for (const id of ['pause', 'restart', 'mute']) $(id).disabled = true;
  console.error(message);
}

function playAudio(buffer) {
  if (!audio || audio.state !== 'running' || manualPause || hiddenPause) return;
  const samples = new Int16Array(buffer), n = samples.length / 2;
  if (!n) return;
  const sound = audio.createBuffer(2, n, 48000);
  for (let channel = 0; channel < 2; channel++) {
    const output = sound.getChannelData(channel);
    for (let i = 0; i < n; i++) output[i] = samples[i * 2 + channel] / 32768;
  }
  const source = audio.createBufferSource();
  source.buffer = sound;
  source.connect(gain);
  const now = audio.currentTime;
  if (nextAudio < now || nextAudio > now + .2) { stopAudio(); nextAudio = now + .04; }
  source.start(nextAudio);
  nextAudio += n / 48000;
  sources.add(source);
  source.onended = () => sources.delete(source);
}

async function start() {
  if (loading) return;
  loading = true;
  clearKeys();
  worker?.terminate();
  worker = null;
  stopAudio();
  ready = false;
  manualPause = false;
  hiddenPause = document.hidden;
  setTouchEnabled();
  for (const id of ['start', 'pause', 'restart', 'mute']) $(id).disabled = true;
  setControlButton('pause', '暂停', 'pause');
  $('pause').setAttribute('aria-pressed', 'false');
  $('status').textContent = '正在加载游戏…';
  try {
    if (!entry) await loadEntry();
    $('start').disabled = true;
    try {
      if (!audio) {
        audio = new AudioContext({sampleRate:48000});
        gain = audio.createGain();
        gain.connect(audio.destination);
      }
      gain.gain.value = muted ? 0 : .4;
      await audio.resume();
    } catch (error) { console.warn('声音未启用', error); }
    const currentWorker = new Worker(workerURL);
    worker = currentWorker;
    currentWorker.onmessage = ({data}) => {
      if (worker !== currentWorker) return;
      if (data.type === 'ready') {
        loading = false;
        ready = true;
        for (const id of ['pause', 'restart', 'mute']) $(id).disabled = false;
        canvas.focus();
        updatePause();
      } else if (data.type === 'frame') {
        if (canvas.width !== data.width || canvas.height !== data.height) { canvas.width = data.width; canvas.height = data.height; }
        context.putImageData(new ImageData(new Uint8ClampedArray(data.pixels), data.width, data.height), 0, 0);
        playAudio(data.audio);
      } else if (data.type === 'error') fail(data.message);
      else if (data.type === 'log') console.info('[Mesen]', data.line);
      else if (data.type === 'inspect') window.dispatchEvent(new CustomEvent('mesen-inspect', {detail:data}));
    };
    currentWorker.onerror = event => { if (worker === currentWorker) fail(event.message); };
    currentWorker.postMessage({type:'init', manifestURL:manifestURL.href});
  } catch (error) { fail(error.message || String(error)); }
}

$('start').onclick = start;
$('restart').onclick = start;
$('pause').onclick = () => { manualPause = !manualPause; updatePause(); };
$('mute').onclick = () => {
  muted = !muted;
  if (gain) gain.gain.value = muted ? 0 : .4;
  setControlButton('mute', muted ? '开启声音' : '静音', muted ? 'volume-off' : 'volume');
  $('mute').setAttribute('aria-pressed', String(muted));
};
$('fullscreen').onclick = () => { $('game-screen').requestFullscreen?.().catch(error => console.warn('无法进入全屏', error)); };
function setTouchMode(enabled) {
  clearKeys();
  touchMode = !!enabled;
  document.documentElement.classList.toggle('touch-mode', touchMode);
  $('virtual-gamepad').hidden = !touchMode;
  $('touch-hint').hidden = !touchMode;
  setControlButton('touch-mode', touchMode ? '触屏：开' : '触屏模式', 'gamepad');
  $('touch-mode').setAttribute('aria-pressed', String(touchMode));
  setTouchEnabled();
  if (ready) $('status').textContent = manualPause ? '已暂停，点击继续恢复。' : touchMode ? '运行中 · 使用画面上的虚拟手柄' : '运行中 · 点击游戏画面后可使用键盘';
}
$('touch-mode').onclick = () => setTouchMode(!touchMode);

for (const [name, down] of [['keydown', true], ['keyup', false]]) {
  addEventListener(name, event => {
    const item = parseKey(event.code);
    if (ready && item && allowedKeys.has(item.physicalCode) && (!down || (!event.ctrlKey && !event.metaKey && !event.altKey))) {
      event.preventDefault();
      key(item, down, `keyboard:${event.code}`);
    }
  });
}
addEventListener('blur', clearKeys);
addEventListener('pagehide', () => { clearKeys(); stopAudio(); worker?.terminate(); worker = null; ready = false; loading = false; setTouchEnabled(); });
addEventListener('pageshow', event => {
  if (event.persisted && !worker && entry) {
    loading = false;
    $('start').disabled = false;
    for (const id of ['pause','restart','mute']) $(id).disabled = true;
    setTouchEnabled();
    $('status').textContent = '点击开始游戏继续游玩。';
  }
});
document.addEventListener('visibilitychange', () => { hiddenPause = document.hidden; clearKeys(); updatePause(); });

// Read-only verification hook; the page exposes no ROM/script/settings loader.
window.__mesenProbe = {
  inspect(addresses) {
    if (!ready || !worker) return Promise.reject(new Error('game is not ready'));
    if (!Array.isArray(addresses) || addresses.length > 256 || addresses.some(value => !Number.isInteger(value) || value < 0 || value > 0xffff)) {
      return Promise.reject(new Error('invalid inspection addresses'));
    }
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const listener = event => {
        if (event.detail.id === id) { clearTimeout(timeout); window.removeEventListener('mesen-inspect', listener); resolve(event.detail); }
      };
      const timeout = setTimeout(() => { window.removeEventListener('mesen-inspect', listener); reject(new Error('inspection timeout')); }, 3000);
      window.addEventListener('mesen-inspect', listener);
      worker.postMessage({type:'inspect', id, addresses});
    });
  },
  get ready() { return ready; }
};

loadEntry().catch(error => fail(error.message || String(error)));
