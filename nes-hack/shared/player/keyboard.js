// Static physical-key diagram. This module neither listens for keys nor sends
// input; all highlighting describes the fixed manifest configuration.
const SVG = 'http://www.w3.org/2000/svg';
const arrows = {'←':'ArrowLeft', '↑':'ArrowUp', '→':'ArrowRight', '↓':'ArrowDown'};
const keyNames = {Tab:'Tab', CapsLock:'Caps', ShiftLeft:'Shift', ShiftRight:'Shift', Enter:'Enter', Space:'Space', Backspace:'Back',
  Backquote:'`', Minus:'−', Equal:'=', BracketLeft:'[', BracketRight:']', Backslash:'\\', Semicolon:';', Quote:"'", Comma:',', Period:'.', Slash:'/',
  ControlLeft:'Ctrl', ControlRight:'Ctrl', AltLeft:'Alt', AltRight:'Alt', MetaLeft:'Win', MetaRight:'Win', ContextMenu:'Menu',
  ArrowUp:'↑', ArrowLeft:'←', ArrowDown:'↓', ArrowRight:'→', NumLock:'Num', NumpadDivide:'/', NumpadMultiply:'*', NumpadSubtract:'−', NumpadAdd:'+', NumpadEnter:'↵', NumpadDecimal:'.',
  Escape:'Esc', Insert:'Ins', Delete:'Del', Home:'Home', End:'End', PageUp:'PgUp', PageDown:'PgDn'};
const buttonNames = {Up:'上', Down:'下', Left:'左', Right:'右', A:'A', B:'B', TurboA:'A 连发', TurboB:'B 连发', Start:'开始', Select:'选择'};
const key = (code, width=1) => ({code,width});
const letters = value => [...value].map(letter => key('Key'+letter));
const plainRows = [
  [key('Tab',1.5),...letters('QWERTYUIOP'),key('BracketLeft'),key('BracketRight'),key('Backslash',1.5)],
  [key('CapsLock',1.75),...letters('ASDFGHJKL'),key('Semicolon'),key('Quote'),key('Enter',2.25)],
  [key('ShiftLeft',2.25),...letters('ZXCVBNM'),key('Comma'),key('Period'),key('Slash'),key('ShiftRight',2.75)]
];
const numberRow = [key('Backquote'),...Array.from({length:10},(_,i)=>key('Digit'+((i+1)%10))),key('Minus'),key('Equal'),key('Backspace',2)];
const modifierRow = [key('ControlLeft',1.25),key('MetaLeft',1.25),key('AltLeft',1.25),key('Space',6.25),key('AltRight',1.25),key('MetaRight',1.25),key('ContextMenu',1.25),key('ControlRight',1.25)];

function codeFor(value) {
  if (value && typeof value === 'object') value = value.physicalCode || value.code || value.label;
  if (typeof value !== 'string') return null;
  if (arrows[value]) return arrows[value];
  if (/^[a-z]$/i.test(value)) return 'Key'+value.toUpperCase();
  if (/^[0-9]$/.test(value)) return 'Digit'+value;
  return value.trim() || null;
}

function playerFor(value) {
  const text = String(value || '').replace(/\s/g,'').toLowerCase();
  if (['1p','p1','player1','玩家1','玩家一'].includes(text)) return 0;
  if (['2p','p2','player2','玩家2','玩家二'].includes(text)) return 1;
  return null;
}

function labelFor(code) {
  if (keyNames[code]) return keyNames[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
  return code;
}

function element(name, className, text) {
  const item = document.createElement(name);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function svgElement(name, attributes={}) {
  const item = document.createElementNS(SVG,name);
  for (const [name,value] of Object.entries(attributes)) item.setAttribute(name,String(value));
  return item;
}

export function createKeyboardPreview(container, {controls=[], bindings=[]}={}) {
  if (!container || typeof container.replaceChildren !== 'function') throw new TypeError('Keyboard preview needs a DOM container');
  const used = new Map(), players = new Set();
  const infoFor = code => {
    if (!used.has(code)) used.set(code,{owners:new Set(),actions:new Set()});
    return used.get(code);
  };
  for (const controller of Array.isArray(bindings) ? bindings : []) {
    if (!controller || ![0,1].includes(controller.port)) continue;
    for (const [button,codes] of Object.entries(controller)) {
      if (button==='port' || !Array.isArray(codes)) continue;
      for (const value of codes) {
        const code=codeFor(value);if(!code)continue;
        const info=infoFor(code);info.owners.add(controller.port);players.add(controller.port);
        info.actions.add(`${controller.port+1}P · ${buttonNames[button] || button}`);
      }
    }
  }
  for (const row of Array.isArray(controls) ? controls : []) {
    if (!row || !Array.isArray(row.keys)) continue;
    const player=playerFor(row.player);
    if (player!==null) players.add(player);
    for (const value of row.keys) {
      const code=codeFor(value);if(!code)continue;
      const info=infoFor(code);
      if (player!==null) info.owners.add(player);
      if (row.label) info.actions.add([row.player,row.label].filter(Boolean).join(' · '));
    }
  }
  container.replaceChildren();
  if (!used.size) return null;
  if (!players.size) players.add(0);
  // An unassigned hotkey in a two-player configuration belongs to both; a
  // bound second-player key never acquires an implicit first-player owner.
  for (const info of used.values()) if (!info.owners.size) for (const player of players) info.owners.add(player);
  const ownerFor = code => {
    const owners=used.get(code)?.owners;
    return !owners ? 'none' : owners.has(0) && owners.has(1) ? 'shared' : owners.has(1) ? '2p' : '1p';
  };
  const root=element('section','keyboard-preview');
  root.setAttribute('aria-label','游戏控制键示意');
  const legend=element('div','keyboard-legend');
  legend.append(element('span','keyboard-legend-caption','游戏控制键'));
  const legendItem=(owner,label)=>{
    const item=element('span','keyboard-legend-item');item.dataset.owner=owner;
    item.append(element('span','keyboard-swatch'),document.createTextNode(label));legend.append(item);
  };
  if(players.has(0))legendItem('1p','1P');
  if(players.has(1))legendItem('2p','2P');
  if([...used.keys()].some(code=>ownerFor(code)==='shared'))legendItem('shared','共用');
  root.append(legend);
  const placed=new Set();

  function drawKey(svg,code,x,y,width,height) {
    const owner=ownerFor(code),name=labelFor(code);
    const group=svgElement('g',{'class':'keyboard-key keyboard-key--'+owner,'data-code':code,'data-owner':owner,'data-assigned':owner==='none'?'false':'true'});
    const title=svgElement('title');
    title.textContent=(code.startsWith('Numpad')?'小键盘 ':'')+name+(used.has(code)?'：'+[...used.get(code).actions].join('；'):'');
    group.append(title,svgElement('rect',{'class':'keyboard-cap',x,y,width,height,rx:3,'stroke-width':1}));
    const text=svgElement('text',{'class':'keyboard-key-label',x:x+width/2,y:y+height/2,'text-anchor':'middle','dominant-baseline':'central','font-size':name.length>3?9:11,'font-family':'ui-monospace, SFMono-Regular, Consolas, monospace'});
    text.textContent=name;group.append(text);svg.append(group);placed.add(code);
  }

  function section(name,kind,viewWidth,viewHeight) {
    const group=element('div','keyboard-block keyboard-block--'+kind);
    group.append(element('h4','keyboard-block-title',name));
    const svg=svgElement('svg',{viewBox:`0 0 ${viewWidth} ${viewHeight}`,width:'100%',role:'img','aria-label':name+'游戏控制键',preserveAspectRatio:'xMinYMin meet'});
    group.append(svg);return{group,svg};
  }

  const mainCodes=new Set([...plainRows.flat(),...numberRow,...modifierRow].map(item=>item.code));
  if([...used.keys()].some(code=>mainCodes.has(code))){
    const rows=[];
    if(numberRow.some(item=>used.has(item.code)))rows.push(numberRow);
    rows.push(...plainRows);
    if(modifierRow.some(item=>used.has(item.code)))rows.push(modifierRow);
    const {group,svg}=section('主键盘','main',330,rows.length*26);
    rows.forEach((row,index)=>{let x=0;for(const item of row){drawKey(svg,item.code,x+1,index*26+1,item.width*22-3,23);x+=item.width*22;}});
    root.append(group);
  }

  const secondary=element('div','keyboard-secondary');
  if(['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].some(code=>used.has(code))){
    const {group,svg}=section('方向键','arrows',88,58);
    [['ArrowUp',1,0],['ArrowLeft',0,1],['ArrowDown',1,1],['ArrowRight',2,1]].forEach(([code,x,y])=>drawKey(svg,code,1+x*29,1+y*29,26,26));
    secondary.append(group);
  }
  if([...used.keys()].some(code=>code==='NumLock'||code.startsWith('Numpad'))){
    const {group,svg}=section('数字小键盘','numpad',117,146);
    const items=[['NumLock',0,0],['NumpadDivide',1,0],['NumpadMultiply',2,0],['NumpadSubtract',3,0],
      ['Numpad7',0,1],['Numpad8',1,1],['Numpad9',2,1],['NumpadAdd',3,1,1,2],
      ['Numpad4',0,2],['Numpad5',1,2],['Numpad6',2,2],['Numpad1',0,3],['Numpad2',1,3],['Numpad3',2,3],['NumpadEnter',3,3,1,2],['Numpad0',0,4,2],['NumpadDecimal',2,4]];
    items.forEach(([code,x,y,w=1,h=1])=>drawKey(svg,code,1+x*29,1+y*29,w*29-3,h*29-3));secondary.append(group);
  }
  if(secondary.childElementCount)root.append(secondary);

  const functions=['Escape',...Array.from({length:12},(_,i)=>'F'+(i+1))];
  if(functions.some(code=>used.has(code))){
    const {group,svg}=section('功能键','functions',330,26);
    functions.forEach((code,index)=>drawKey(svg,code,1+index*25.3,1,23,23));root.append(group);
  }
  const remaining=[...used.keys()].filter(code=>!placed.has(code));
  if(remaining.length){
    const group=element('div','keyboard-block keyboard-block--extra');group.append(element('h4','keyboard-block-title','其他按键'));
    const list=element('div','keyboard-extra-keys');
    for(const code of remaining){const item=element('span','keyboard-extra-key',labelFor(code));item.dataset.code=code;item.dataset.owner=ownerFor(code);item.dataset.assigned='true';item.title=[...used.get(code).actions].join('；');list.append(item);}
    group.append(list);root.append(group);
  }
  container.append(root);
  return root;
}
