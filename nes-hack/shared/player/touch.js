// A single-player overlay. Inputs use the same physical keys and ownership
// mechanism as the normal player, including raw keys read by Lua scripts.
export function createVirtualGamepad(container, {controls, bindings, parseKey, emit, pause, exit, launch}) {
  const rows = controls.filter(row => row.touch && !/^(?:2p|p2|player2)$/i.test(row.player.replace(/\s/g, '')));
  const available = new Set(rows.flatMap(row => row.keys.map(key => key.physicalCode)));
  const controller = bindings?.find(binding => binding.port === 0);
  const choose = (button, fallbacks) => {
    const codes = controller ? (controller[button] || []) : fallbacks;
    return codes.map(parseKey).filter(item => item && available.has(item.physicalCode));
  };
  const mapping = {
    up:choose('Up', ['KeyW','ArrowUp']), down:choose('Down', ['KeyS','ArrowDown']),
    left:choose('Left', ['KeyA','ArrowLeft']), right:choose('Right', ['KeyD','ArrowRight']),
    b:choose('B', ['KeyJ']), a:choose('A', ['KeyK']),
    'turbo-b':choose('TurboB', ['KeyU']), 'turbo-a':choose('TurboA', ['KeyI']),
    start:choose('Start', ['Enter']), select:choose('Select', ['ShiftLeft'])
  };
  // One actual binding is enough; avoid pressing multiple aliases together.
  for (const action of Object.keys(mapping)) mapping[action] = mapping[action].slice(0,1);
  const pointers = new Map(), buttons = [];
  let enabled = false, canPause = false;
  container.replaceChildren();

  const group = className => {const node=document.createElement('div');node.className=className;container.append(node);return node;};
  const dpad = group('gamepad-dpad');
  dpad.setAttribute('role','group');dpad.setAttribute('aria-label','方向控制，滑动可组合斜向');
  for (const [direction, label] of Object.entries({up:'↑',left:'←',right:'→',down:'↓'})) {
    const node=document.createElement('span');node.dataset.direction=direction;node.textContent=label;node.dataset.held='false';dpad.append(node);
  }
  const center=document.createElement('span');center.className='gamepad-center';center.setAttribute('aria-hidden','true');center.textContent='·';dpad.append(center);
  const actions = group('gamepad-actions'), menu=group('gamepad-menu'), tools=group('gamepad-tools'), extras=group('gamepad-extras');
  const hintsFor = action => {
    const code=mapping[action][0]?.physicalCode;
    const text=rows.filter(row=>row.keys.some(item=>item.physicalCode===code)).map(row=>row.label).join(' ');
    if(action==='a')return /跳/.test(text)?'跳跃':'攻击 A';
    if(action==='b')return /射/.test(text)?'射击':'攻击 B';
    return action==='turbo-a'?'连跳':'连射';
  };
  function inputButton(parent, action, label, keys, extra=false) {
    if (!keys.length) return;
    const button=document.createElement('button');button.type='button';
    button.className='gamepad-button'+(extra?' gamepad-extra':'');button.textContent=label;
    button.dataset.action=action;button.dataset.codes=JSON.stringify(keys.map(item=>item.physicalCode));button.dataset.held='false';
    button.setAttribute('aria-label',label+'，1P');
    button.addEventListener('pointerdown',event=>begin(event,button,'button',keys));
    buttons.push(button);parent.append(button);
  }
  for(const action of ['turbo-b','turbo-a','b','a'])inputButton(actions,action,hintsFor(action),mapping[action]);
  inputButton(menu,'select','SELECT 选择',mapping.select);inputButton(menu,'start','START 开始',mapping.start);
  const pauseButton=document.createElement('button');pauseButton.type='button';pauseButton.className='gamepad-button';pauseButton.dataset.action='pause';pauseButton.textContent='暂停';
  pauseButton.addEventListener('click',event=>{event.preventDefault();if(canPause)pause();});tools.append(pauseButton);
  const seen=new Set();
  for(const row of rows) {
    if(!row.touch || row.keys.length<2 || !row.keys.some(item=>mapping.select.some(key=>key.physicalCode===item.physicalCode)))continue;
    const signature=row.keys.map(key=>key.physicalCode).sort().join('+');if(seen.has(signature))continue;seen.add(signature);
    inputButton(extras,'combo-'+seen.size,row.label.replace(/（同时按）/g,''),row.keys,true);
  }
  extras.hidden=!seen.size;
  const exitButton=document.createElement('button');exitButton.type='button';exitButton.className='gamepad-exit';exitButton.textContent='退出触屏';exitButton.setAttribute('aria-label','退出触屏模式');
  exitButton.addEventListener('click',event=>{event.preventDefault();exit();});container.append(exitButton);
  const launchButton=document.createElement('button');launchButton.type='button';launchButton.className='gamepad-launch';launchButton.dataset.action='launch';launchButton.textContent='开始游戏';
  launchButton.addEventListener('click',event=>{event.preventDefault();if(!launchButton.disabled)launch();});container.append(launchButton);

  function updateVisual() {
    const held=new Set([...pointers.values()].flatMap(pointer=>pointer.keys.map(key=>key.physicalCode)));
    for(const node of dpad.querySelectorAll('[data-direction]'))node.dataset.held=String(mapping[node.dataset.direction].some(key=>held.has(key.physicalCode)));
    for(const button of buttons)button.dataset.held=String([...pointers.values()].some(pointer=>pointer.element===button && pointer.keys.length));
  }
  function setKeys(pointer, keys) {
    const previous=new Set(pointer.keys.map(key=>key.physicalCode)),next=new Set(keys.map(key=>key.physicalCode));
    for(const key of pointer.keys.slice().reverse())if(!next.has(key.physicalCode))emit(key,false,pointer.source);
    for(const key of keys)if(!previous.has(key.physicalCode))emit(key,true,pointer.source);
    pointer.keys=keys;updateVisual();
  }
  function inside(element,event,margin=0) {
    const box=element.getBoundingClientRect();return event.clientX>=box.left-margin&&event.clientX<=box.right+margin&&event.clientY>=box.top-margin&&event.clientY<=box.bottom+margin;
  }
  function directionKeys(event) {
    if(!inside(dpad,event,16))return [];
    const box=dpad.getBoundingClientRect(),x=(event.clientX-box.left-box.width/2)/(box.width/2),y=(event.clientY-box.top-box.height/2)/(box.height/2);
    if(Math.hypot(x,y)<.23)return [];
    const sectors=[['right'],['right','down'],['down'],['left','down'],['left'],['left','up'],['up'],['right','up']];
    const sector=(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8;
    return sectors[sector].flatMap(action=>mapping[action]);
  }
  function begin(event,element,kind,keys=[]) {
    if(!enabled || event.button>0)return;
    event.preventDefault();
    const pointer={element,kind,keys:[],originalKeys:keys,source:'gamepad:'+event.pointerId};pointers.set(event.pointerId,pointer);
    try{element.setPointerCapture(event.pointerId);}catch{}
    setKeys(pointer,kind==='dpad'?directionKeys(event):keys);
  }
  function release(event) {
    const pointer=pointers.get(event.pointerId);if(!pointer)return;
    setKeys(pointer,[]);pointers.delete(event.pointerId);
    try{if(pointer.element.hasPointerCapture(event.pointerId))pointer.element.releasePointerCapture(event.pointerId);}catch{}
    updateVisual();
  }
  dpad.addEventListener('pointerdown',event=>begin(event,dpad,'dpad'));
  container.addEventListener('pointermove',event=>{
    const pointer=pointers.get(event.pointerId);if(!pointer)return;event.preventDefault();
    setKeys(pointer,pointer.kind==='dpad'?directionKeys(event):inside(pointer.element,event,2)?pointer.originalKeys:[]);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])container.addEventListener(name,release,true);
  container.addEventListener('contextmenu',event=>event.preventDefault());
  function reset() {
    for(const id of [...pointers.keys()])release({pointerId:id});
    updateVisual();
  }
  function setEnabled(value, pauseAvailable=false) {
    enabled=!!value;canPause=!!pauseAvailable;if(!enabled)reset();
    for(const button of buttons)button.disabled=!enabled;
    pauseButton.disabled=!canPause;dpad.setAttribute('aria-disabled',String(!enabled));
  }
  function setPaused(value) {pauseButton.textContent=value?'继续':'暂停';pauseButton.setAttribute('aria-pressed',String(!!value));}
  function setLaunchState(ready, loading) {launchButton.hidden=!!ready;launchButton.disabled=!!loading;launchButton.textContent=loading?'加载中…':'开始游戏';}
  setEnabled(false);
  return {reset,setEnabled,setPaused,setLaunchState,mapping};
}
