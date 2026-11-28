/* Classic worker, private WASM memory: no pthreads or cross-origin isolation. */
const engineURL = new URL('../engine/mesen.js', self.location.href);
engineURL.search = self.location.search;
importScripts(engineURL.href);
let module, playing = false, initialized = false, target = 0, timer;
const fps = 60.0988;
const wakeChannel = new MessageChannel();
let wakeGeneration = 0;
const pressed = new Map();
let aliases = new Map();
let bindings = null, inputFrame = 0;
const physicalKey = /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Left|Up|Right|Down)|Enter|Space|ShiftLeft|ShiftRight|NumpadEnter)$/;
const padButtons = {A:1, B:2, Select:4, Start:8, Up:16, Down:32, Left:64, Right:128, TurboA:1, TurboB:2};

function cancelPump() {
  clearTimeout(timer);
  timer = undefined;
  wakeGeneration++;
}

function schedulePump(delay) {
  cancelPump();
  const generation = wakeGeneration;
  if (delay > 0) timer = setTimeout(() => { if (generation === wakeGeneration) pump(); }, delay);
  else wakeChannel.port2.postMessage(generation);
}

wakeChannel.port1.onmessage = event => {
  if (event.data === wakeGeneration && playing) pump();
};

function localURL(value, base) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('资源地址无效');
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== self.location.origin || url.username || url.password || url.hash) {
    throw new Error('资源必须使用同源 HTTP(S) 地址');
  }
  return url;
}

function parseHash(value, name) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${name} SHA-256 无效`);
  return value.toLowerCase();
}

function parseAliases(value) {
  if (value === undefined) return new Map();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('控制器映射无效');
  const result = new Map();
  for (const [raw, target] of Object.entries(value)) {
    if (!/^[1-9][0-9]{0,2}$/.test(raw) || Number(raw) > 511 || !Number.isInteger(target) || target < 1 || target > 511) {
      throw new Error('控制器映射必须是 1..511 的按键码');
    }
    result.set(Number(raw), target);
  }
  return result;
}

function parseBindings(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || !value.length || value.length > 2) throw new Error('双人控制器配置无效');
  const result = new Map(), ports = new Set();
  for (const controller of value) {
    if (!controller || typeof controller !== 'object' || Array.isArray(controller) || ![0,1].includes(controller.port) || ports.has(controller.port) || Object.keys(controller).length < 2) throw new Error('控制器端口必须是独立的 0 或 1');
    ports.add(controller.port);
    for (const [button, codes] of Object.entries(controller)) {
      if (button === 'port') continue;
      if (!Object.hasOwn(padButtons, button) || !Array.isArray(codes) || !codes.length || codes.length > 8) throw new Error('控制器按键配置无效');
      for (const code of codes) {
        if (typeof code !== 'string' || !physicalKey.test(code)) throw new Error('控制器必须使用有效的 KeyboardEvent.code');
        if (!result.has(code)) result.set(code, []);
        result.get(code).push({port:controller.port, mask:padButtons[button], turbo:button.startsWith('Turbo')});
      }
    }
  }
  return result;
}

function clearKeys() { pressed.clear(); module?._web_clear_keys(); }
function applyKeys() {
  module._web_clear_keys();
  const pads = [0, 0];
  for (const [physicalCode, raw] of pressed) {
    module._web_key(raw, 1);
    if (bindings === null) {
      if (aliases.has(raw)) module._web_key(aliases.get(raw), 1);
    } else {
      for (const binding of bindings.get(physicalCode) || []) {
        // Mesen TurboSpeed=2: two emulated frames on, two frames off.
        if (!binding.turbo || (inputFrame & 3) < 2) pads[binding.port] |= binding.mask;
      }
    }
  }
  if (bindings !== null) for (let port = 0; port < 2; port++) {
    if (!module._web_set_pad(port, pads[port])) throw new Error('控制器输入失败');
  }
}

function updateKey(code, down, physicalCode) {
  if (!Number.isInteger(code) || code < 1 || code > 511 || typeof down !== 'boolean') throw new Error('按键消息无效');
  if (physicalCode !== undefined && (typeof physicalCode !== 'string' || !physicalKey.test(physicalCode))) throw new Error('物理按键消息无效');
  const identity = physicalCode || `legacy:${code}`;
  if (down) pressed.set(identity, code); else pressed.delete(identity);
  // Retain raw Lua hotkeys and the union of all fixed controller aliases.
  applyKeys();
}

function copyAudio() {
  const count = module._web_audio_count();
  return module.HEAP16.slice(module._web_audio() / 2, module._web_audio() / 2 + count);
}

function sendFrame(audio = copyAudio()) {
  const width = module._web_width(), height = module._web_height();
  const pixels = module.HEAPU8.slice(module._web_pixels(), module._web_pixels() + width * height * 4);
  postMessage({type:'frame', width, height, pixels:pixels.buffer, audio:audio.buffer}, [pixels.buffer, audio.buffer]);
}

function stopWithError(error) {
  playing = false;
  cancelPump();
  clearKeys();
  postMessage({type:'error', message:String(error.stack || error)});
}

function pump() {
  if (!playing) return;
  try {
    const now = performance.now();
    if (now < target - 1) { schedulePump(Math.max(1, target - now)); return; }
    if (now - target > 100) target = now;
    const count = Math.min(3, Math.max(1, Math.floor((now - target) / (1000 / fps)) + 1));
    const workStart = performance.now();
    let audio;
    if (bindings === null) {
      if (module._web_step(count) !== count) throw new Error(module.UTF8ToString(module._web_error()) || '核心停止运行');
    } else {
      const chunks = [];
      let sampleCount = 0;
      for (let index = 0; index < count; index++) {
        applyKeys();
        if (module._web_step(1) !== 1) throw new Error(module.UTF8ToString(module._web_error()) || '核心停止运行');
        const chunk = copyAudio();
        chunks.push(chunk);
        sampleCount += chunk.length;
        inputFrame++;
      }
      audio = new Int16Array(sampleCount);
      let offset = 0;
      for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.length; }
    }
    sendFrame(audio);
    const finished = performance.now();
    // When one emulated frame already exceeds its real-time budget, repeatedly
    // catching up would hide two of every three computed video frames. Rebase
    // the deadline and yield an immediate task so slower devices show each
    // computed frame without the nested setTimeout minimum-delay penalty.
    target = (finished - workStart) / count > 1000 / fps ? finished : target + count * 1000 / fps;
    schedulePump(Math.max(0, target - performance.now()));
  } catch (error) { stopWithError(error); }
}

async function loadBytes(url, expectedHash, name) {
  const response = await fetch(url, {redirect:'error'});
  if (!response.ok) throw new Error(`${name}加载失败 (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!crypto.subtle) throw new Error('资源校验需要 HTTPS 或 localhost');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const actual = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
  if (actual !== expectedHash) throw new Error(`${name} SHA-256 校验失败`);
  return bytes;
}

function passBytes(name, bytes) {
  const ptr = module._malloc(bytes.length);
  if (!ptr) throw new Error('WASM 内存分配失败');
  try { module.HEAPU8.set(bytes, ptr); return module[name](ptr, bytes.length); }
  finally { module._free(ptr); }
}

onmessage = async ({data}) => {
  try {
    if (!data || typeof data !== 'object') throw new Error('播放器消息无效');
    if (data.type === 'init') {
      if (initialized) throw new Error('播放器已初始化');
      initialized = true;
      const manifestURL = localURL(data.manifestURL, self.location.href);
      const response = await fetch(manifestURL, {redirect:'error'});
      if (!response.ok) throw new Error(`游戏信息加载失败 (${response.status})`);
      const manifest = await response.json();
      if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('游戏信息格式无效');
      aliases = parseAliases(manifest.controllerAliases);
      bindings = parseBindings(manifest.controllerBindings);
      const romHash = parseHash(manifest.romSha256, 'ROM');
      const luaHash = parseHash(manifest.outputSha256, 'Lua');
      const [rom, lua] = await Promise.all([
        loadBytes(localURL(manifest.rom, manifestURL), romHash, 'ROM'),
        loadBytes(localURL(manifest.lua, manifestURL), luaHash, 'Lua')
      ]);
      module = await createMesen({
        locateFile:file => {
          const url = new URL(file, engineURL);
          url.search = self.location.search;
          return url.href;
        },
        print:line => postMessage({type:'log', line}),
        printErr:line => postMessage({type:'log', line})
      });
      if (!module._web_init() || !passBytes('_web_load_rom', rom)) throw new Error(module.UTF8ToString(module._web_error()));
      if (bindings !== null) {
        if (typeof module._web_use_explicit_pads !== 'function' || typeof module._web_set_pad !== 'function') throw new Error('共享核心不支持双人控制器');
        module._web_use_explicit_pads(1);
        applyKeys();
      }
      if (passBytes('_web_load_script', lua) < 0) throw new Error(module.UTF8ToString(module._web_error()));
      postMessage({type:'ready', log:module.UTF8ToString(module._web_script_log())});
      playing = true;
      target = performance.now();
      pump();
    } else if (data.type === 'key' && module) updateKey(data.code, data.down, data.physicalCode);
    else if (data.type === 'clear') clearKeys();
    else if (data.type === 'pause' && module) {
      if (typeof data.paused !== 'boolean') throw new Error('暂停消息无效');
      cancelPump();
      playing = !data.paused;
      clearKeys();
      module._web_pause(data.paused ? 1 : 0);
      if (playing) { target = performance.now(); pump(); }
    } else if (data.type === 'inspect' && module) {
      if (!Array.isArray(data.addresses) || data.addresses.length > 256 || data.addresses.some(value => !Number.isInteger(value) || value < 0 || value > 0xffff)) {
        throw new Error('读取地址无效');
      }
      postMessage({type:'inspect', id:data.id, values:data.addresses.map(address => module._web_read(address)), log:module.UTF8ToString(module._web_script_log())});
    }
  } catch (error) { stopWithError(error); }
};
