import {layouts,layoutFor,printPlan,printDocument,jpeg300} from './layouts.js';
const $=s=>document.querySelector(s);
const video=$('#camera'),preview=$('#preview'),defaults={theme:'orange',format:'portrait',title:'Kết nối mọi trải nghiệm.',caption:'Chạm niềm vui. Giữ khoảnh khắc.',delay:3,mirror:true,zoom:1};
let saved={};try{saved=JSON.parse(localStorage.getItem('fpt-photobooth-demo-settings')||'{}')}catch{}
const state={...defaults,assetsReady:false,source:'sample',stream:null,release:null,photo:null,customFrame:null,review:false,busy:false,starting:false,focusing:false,exportBlob:null,exportUrl:null,countTimer:null,countResolve:null,generation:0,exportGeneration:0,takes:[],capturedLayout:null,importGeneration:0};
for(const key of ['title','caption'])if(typeof saved[key]==='string')state[key]=saved[key].slice(0,key==='title'?40:60);
if(['orange','blue','pitch'].includes(saved.theme))state.theme=saved.theme;if(['portrait','landscape','strip'].includes(saved.format))state.format=saved.format;if([0,3,5].includes(saved.delay))state.delay=saved.delay;if(typeof saved.mirror==='boolean')state.mirror=saved.mirror;
let tetherFolder = null;
const assets={};let raf=0,lastFrame=0,disposed=false;
function message(text=''){const el=$('#message');el.hidden=!text;el.textContent=text;}
function persist(){try{const{theme,format,title,caption,delay,mirror}=state;localStorage.setItem('fpt-photobooth-demo-settings',JSON.stringify({theme,format,title,caption,delay,mirror}));}catch{}}
function dimensions(){return layoutFor(state.format);}
function clearTakes(){for(const image of state.takes)image?.close();state.takes=[];}
function sourceReady(){if(!state.assetsReady)return false;return state.source==='tether'&&!!tetherFolder||state.source==='sample'||state.source==='file'&&!!state.photo||state.source==='camera'&&!!state.stream&&video.readyState>=2;}
function setReview(review){state.review=review;document.querySelector('.shell').classList.toggle('is-review',review);$('#setup-controls').hidden=review;$('#review-pill').hidden=!review;$('#capture').hidden=review;$('#download').hidden=!review;$('#print').hidden=!review;$('#retake').hidden=!review;$('#panel-title').textContent=review?'Ảnh của bạn đây!':'Bạn chọn khung nào?';$('#panel-intro').textContent=review?'Tải ảnh để mang khoảnh khắc về, hoặc chụp lại một tấm khác.':'Thử ngay bằng ảnh mẫu, hoặc bật camera để chụp thật.';$('#capture-note').textContent=review?'Ảnh chưa gửi lên máy chủ. Tải ảnh về trước khi rời trang.':'Chưa kết nối với đăng ký, báo cáo hoặc kho quà của Hub.';}
function update(){
 const{w,h,name,slots}=dimensions();$('#size-label').textContent=`${name} · ${w} × ${h} px · 300 dpi`;$('#form-spec').textContent=`PNG ${w} × ${h} px · ${slots.length} vùng ảnh trong suốt · 300 dpi`;$('#shot-progress').hidden=!state.busy||slots.length===1;$('#shot-progress').textContent=`Ảnh ${Math.min(state.takes.length+1,slots.length)} / ${slots.length} · Giữ dáng nhé`; 
 document.querySelectorAll('[data-theme]').forEach(b=>{const active=b.dataset.theme===state.theme&&!state.customFrame;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));b.disabled=state.busy});
 document.querySelectorAll('[data-source]').forEach(b=>{const active=b.dataset.source===state.source;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));b.disabled=state.busy});
 $('.source-file').classList.toggle('is-active',state.source==='file');$('#camera-controls').hidden=state.source!=='camera';$('#enable-camera').hidden=!!state.stream;$('#enable-camera').disabled=state.starting||state.busy;$('#enable-camera').textContent=state.starting?'Đang mở camera…':'Bật camera';$('#stop-camera').hidden=!state.stream;
 $('#tether-controls').hidden = state.source !== 'tether';
 $('#tether-folder').disabled = state.busy;
 $('#cancel-tether').hidden = state.source !== 'tether' || !state.busy;
 $('#custom-frame').hidden=!state.customFrame;$('#source-badge').textContent=state.review?'ẢNH ĐÃ CHỤP · CHƯA TẢI LÊN':state.source==='sample'?'ẢNH MẪU · CHƯA BẬT CAMERA':state.source==='file'?'ẢNH TỪ MÁY · CHỈ XỬ LÝ TẠI MÁY':state.source==='tether'?'TETHER JPEG · ẢNH TỪ MÁY ẢNH':state.stream?'CAMERA ĐANG BẬT':'CAMERA CHƯA BẬT';
 $('#devices').disabled=state.busy||state.starting;$('#focus-mode').disabled=state.focusing||state.busy;$('#refresh-cameras').disabled=state.starting||state.busy;
 $('#capture').disabled=state.busy||state.starting||state.focusing||!sourceReady();$('#capture-label').textContent=state.busy?'GIỮ DÁNG MỘT CHÚT…':state.source==='sample'?'CHỤP THỬ ẢNH MẪU':state.source==='tether'?'BẮT ĐẦU NHẬN ẢNH':'CHỤP KHOẢNH KHẮC';
 $('#event-title').value=state.title;$('#caption').value=state.caption;$('#format').value=state.format;$('#delay').value=String(state.delay);$('#mirror').checked=state.mirror;$('#zoom').value=String(state.zoom);$('#zoom-value').textContent=state.zoom.toFixed(1)+'×';
 for(const el of document.querySelectorAll('#setup-controls input,#setup-controls select'))el.disabled=state.busy;$('#fullscreen').disabled=state.busy;$('#event-title').disabled=state.busy||!!state.customFrame;$('#caption').disabled=state.busy||!!state.customFrame;
}
function rounded(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function lineText(ctx,text,x,y,max,font,color,align='left'){ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y,max);}
function drawCover(ctx,source,x,y,w,h,mirror=false,zoom=state.zoom){const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;if(!sw||!sh)return;const scale=Math.max(w/sw,h/sh)*zoom,dw=sw*scale,dh=sh*scale;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x+w/2,y+h/2);if(mirror)ctx.scale(-1,1);ctx.drawImage(source,-dw/2,-dh/2,dw,dh);ctx.restore();}
function sample(ctx,x,y,w,h){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#e5f2ff');g.addColorStop(.6,'#f6f8ff');g.addColorStop(1,'#fff0df');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.fillStyle='#cae2fb';ctx.beginPath();ctx.arc(x+w*.52,y+h*.52,Math.min(w,h)*.32,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+w*.52,y+h*.52,Math.min(w,h)*.39,0,Math.PI*2);ctx.stroke();if(assets.fox){const sw=assets.fox.naturalWidth,sh=assets.fox.naturalHeight,scale=Math.min(w*.79/sw,h*.78/sh),dw=sw*scale,dh=sh*scale;ctx.drawImage(assets.fox,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}lineText(ctx,'✦',x+w*.15,y+h*.2,100,'700 50px Arial','#f58432');lineText(ctx,'✧',x+w*.85,y+h*.75,100,'700 55px Arial','#317dbb','center');rounded(ctx,x+28,y+25,205,50,25,'#ffffffdf');lineText(ctx,'ẢNH MẪU',x+130,y+58,170,'700 20px Arial','#47718d','center');ctx.restore();}
function compose(canvas){const layout=dimensions(),{w,h,slots}=layout,strip=layout.id==='strip',scale=canvas.width/w,ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='white';ctx.fillRect(0,0,w,h);
 for(let i=0;i<slots.length;i++){const rect=slots[i],captured=state.takes[i],src=captured||(state.source==='camera'?video:state.source==='file'?state.photo:null);if(src&&(captured||state.source!=='camera'||video.readyState>=2))drawCover(ctx,src,rect.x,rect.y,rect.w,rect.h,!captured&&state.source==='camera'&&state.mirror,captured?1:state.zoom);else sample(ctx,rect.x,rect.y,rect.w,rect.h);}
 if(state.customFrame){ctx.drawImage(state.customFrame,0,0,w,h);return;}
 const color={orange:'#f37021',blue:'#176ab4',pitch:'#19705c'}[state.theme],light={orange:'#fff1e6',blue:'#edf6ff',pitch:'#eef8f0'}[state.theme],bottom=slots.at(-1).y+slots.at(-1).h+20;
 ctx.fillStyle=light;ctx.fillRect(0,bottom,w,h-bottom);ctx.fillStyle=color;ctx.fillRect(0,0,w,10);ctx.fillRect(0,h-16,w,16);
 if(assets.logo)ctx.drawImage(assets.logo,strip?36:72,strip?28:40,strip?190:250,strip?61:80);
 if(!strip)lineText(ctx,'MỘT KHOẢNH KHẮC CÙNG FPT',w-72,90,w-450,'700 16px Arial','#697b8b','right');
 const x=strip?36:72;lineText(ctx,state.title||defaults.title,x,h-137,w-2*x,`800 ${strip?26:40}px "Be Vietnam Pro",Arial`,color);lineText(ctx,state.caption||defaults.caption,x,h-77,w-2*x,`500 ${strip?17:23}px "Be Vietnam Pro",Arial`,'#50697a');
 if(strip)lineText(ctx,'FPT TELECOM · GIỮ KHOẢNH KHẮC',x,h-35,w-2*x,'700 12px Arial','#677f8d');
}

function draw(){if(state.review||document.hidden||disposed)return;const{w,h}=dimensions(),pw=state.format==='strip'?400:state.format==='portrait'?800:1000,ph=Math.round(pw*h/w);if(preview.width!==pw||preview.height!==ph){preview.width=pw;preview.height=ph;}compose(preview);}
function loop(time){if(disposed)return;raf=requestAnimationFrame(loop);if(time-lastFrame>100){draw();lastFrame=time;}}
let knownCameraIds;
let preferredCamera = '';
try { preferredCamera = localStorage.getItem('fpt-photobooth-camera') || ''; } catch {}

async function enumerate() {
 if (!navigator.mediaDevices?.enumerateDevices) return;
 const select = $('#devices');
 const previous = select.value;
 const devices = await navigator.mediaDevices.enumerateDevices();
 const cameras = devices.filter(device => device.kind === 'videoinput' && device.deviceId);
 const ids = new Set(cameras.map(camera => camera.deviceId));
 const added = knownCameraIds
  ? cameras.filter(camera => !knownCameraIds.has(camera.deviceId) && camera.label && !['default','communications'].includes(camera.deviceId))
  : [];
 knownCameraIds = ids;
 select.replaceChildren(new Option('Camera mặc định',''), ...cameras.map((camera,index) =>
  new Option(camera.label || `Camera ${index+1}`, camera.deviceId)));
 const idle = !state.stream && !state.starting && !state.busy && !state.review;
 if (idle && state.source === 'camera' && added.length === 1) {
  select.value = added[0].deviceId;
  $('#camera-status').textContent = `Đã thấy ${added[0].label}. Bấm Bật camera để xem hình.`;
 } else {
  select.value = ids.has(previous) ? previous : ids.has(preferredCamera) ? preferredCamera : '';
 }
}

const focusModes = {
 continuous: 'Lấy nét liên tục',
 'single-shot': 'Lấy nét một lần',
};

function showFocusOptions(track) {
 const select = $('#focus-mode');
 const supported = track?.getCapabilities?.().focusMode;
 const modes = Array.isArray(supported) ? supported.filter(mode => Object.hasOwn(focusModes, mode)) : [];
 select.replaceChildren(new Option('Chọn chế độ', ''), ...modes.map(mode => new Option(focusModes[mode], mode)));
 const current = track?.getSettings?.().focusMode;
 if (modes.includes(current)) select.value = current;
 $('#focus-controls').hidden = !track;
 select.hidden = modes.length === 0;
 select.labels[0].hidden = select.hidden;
 $('#focus-status').textContent = modes.length
  ? 'Đặt chế độ nét trước khi chụp. Kiểm tra độ nét trên hình xem trước.'
  : 'Chỉnh AF/MF trên thân máy hoặc trong ứng dụng của hãng cho nguồn này.';
}

async function changeFocus() {
 const track = state.stream?.getVideoTracks()[0];
 const mode = $('#focus-mode').value;
 if (!track || !mode || state.busy || state.focusing) return;
 const generation = state.generation;
 state.focusing = true;
 update();
 try {
  await track.applyConstraints({...track.getConstraints(), focusMode: {exact: mode}});
  if (generation !== state.generation) return;
  const current = track.getSettings().focusMode;
  $('#focus-status').textContent = current === mode
   ? `Đã đặt ${focusModes[mode].toLowerCase()}. Kiểm tra độ nét trên hình xem trước.`
   : 'Thiết bị chưa xác nhận chế độ nét. Kiểm tra hình xem trước hoặc chỉnh trên thân máy.';
 } catch {
  if (generation !== state.generation) return;
  showFocusOptions(track);
  $('#focus-status').textContent = 'Không đổi được chế độ nét. Chỉnh trên thân máy và kiểm tra hình trước khi chụp.';
 } finally {
  if (generation === state.generation) {
   state.focusing = false;
   update();
  }
 }
}

function clearExport(){state.exportGeneration++;if(state.exportUrl)URL.revokeObjectURL(state.exportUrl);state.exportUrl=null;state.exportBlob=null;}
function cancelCount(){if(state.countTimer){clearInterval(state.countTimer);state.countTimer=null;}if(state.countResolve){state.countResolve(false);state.countResolve=null;}$('#countdown').hidden=true;state.busy=false;}
function stopCamera(reason=''){state.generation++;state.starting=false;state.focusing=false;showFocusOptions(null);state.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});state.stream=null;state.release?.();state.release=null;video.srcObject=null;if(state.busy&&!state.review){state.exportGeneration++;clearTakes();cancelCount();}$('#camera-status').textContent=reason||'Camera đã tắt. Bấm bật lại khi sẵn sàng.';update();}
async function startCamera(){stopCamera();const id=state.generation;state.starting=true;message();update();let stream;
 try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Mở bản mẫu qua localhost hoặc HTTPS để cấp quyền camera.');stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:1920,max:2560},height:{ideal:1080,max:1440},frameRate:{ideal:15,max:24},...($('#devices').value?{deviceId:{exact:$('#devices').value}}:{facingMode:'user'})}});if(id!==state.generation){stream.getTracks().forEach(t=>t.stop());return;}
 await enumerate();if(id!==state.generation){stream.getTracks().forEach(t=>t.stop());return;}
 const device=stream.getVideoTracks()[0]?.getSettings().deviceId;if(device&&navigator.locks){const release=await new Promise((resolve,reject)=>{void navigator.locks.request('fpt-camera:'+device,{ifAvailable:true},async lock=>{if(!lock){reject(Error('Nguồn camera đang được một cửa sổ khác dùng. Dừng nguồn đó hoặc chọn camera khác.'));return;}await new Promise(done=>resolve(done));}).catch(reject)});if(id!==state.generation){release();stream.getTracks().forEach(t=>t.stop());return;}state.release=release;}
 state.stream=stream;stream.getVideoTracks()[0].onended=()=>{stopCamera('Camera đã ngắt. Kiểm tra cáp, chọn nguồn và bật lại.');message('Camera đã ngắt; chưa chụp ảnh mới.');};video.srcObject=stream;await video.play();if(id!==state.generation)return;
 $('#camera-status').textContent=`Đang nhận hình ${video.videoWidth} × ${video.videoHeight}. Chỉnh vị trí để thấy rõ khuôn mặt.`;showFocusOptions(stream.getVideoTracks()[0]);state.starting=false;update();
 }catch(e){stream?.getTracks().forEach(t=>t.stop());if(id!==state.generation)return;stopCamera();const messages={NotAllowedError:'Chưa có quyền camera. Cho phép camera trong trình duyệt rồi bật lại.',NotFoundError:'Chưa tìm thấy camera. Cắm thiết bị và bấm bật lại.',NotReadableError:'Camera đang bận hoặc chưa sẵn sàng. Đóng ứng dụng dùng camera khác rồi thử lại.',OverconstrainedError:'Nguồn camera đã đổi hoặc không đáp ứng cấu hình. Chọn Camera mặc định rồi thử lại.'};message(messages[e.name]||e.message||'Không mở được camera.');}
}
async function readImage(file,kind){if(!file)return null;const limit=kind==='tether'?32:12;if(file.size>limit*1024*1024)throw Error(`Chọn ảnh dưới ${limit} MB.`);const allow=kind==='frame'?['image/png']:['image/jpeg','image/png','image/webp'];if(!allow.includes(file.type))throw Error(kind==='frame'?'Khung cần là PNG có vùng giữa trong suốt.':'Chọn ảnh JPG, PNG hoặc WebP.');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const maxMP=kind==='tether'?60:24;if(img.naturalWidth*img.naturalHeight>maxMP*1000000)throw Error(`Ảnh quá lớn; dùng bản dưới ${maxMP} triệu điểm ảnh.`);if(kind==='frame'){const l=dimensions();if(img.naturalWidth!==l.w||img.naturalHeight!==l.h)throw Error(`Sai form: cần PNG ${l.w} × ${l.h} px cho ${l.name}. Chọn đúng form trước khi import.`);const c=document.createElement('canvas');c.width=l.w;c.height=l.h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);for(let n=0;n<l.slots.length;n++){const r=l.slots[n],pixels=ctx.getImageData(r.x+8,r.y+8,r.w-16,r.h-16).data;let clear=0,total=0;for(let i=3;i<pixels.length;i+=16){total++;if(pixels[i]<128)clear++;}if(clear/total<.65)throw Error(`Vùng ảnh ${n+1} chưa trong suốt theo form. Dùng file mẫu để giữ đúng khoảng đặt ảnh.`);}}return await createImageBitmap(img);}finally{URL.revokeObjectURL(url);}}
function waitCount(seconds){if(!seconds)return Promise.resolve(true);return new Promise(resolve=>{let n=seconds;state.countResolve=resolve;const el=$('#countdown');el.hidden=false;const show=()=>{el.replaceChildren();const strong=document.createElement('strong');strong.textContent=String(n);const label=document.createElement('span');label.textContent='TẠO DÁNG · CƯỜI MỘT CHÚT NHÉ';el.append(strong,label)};show();state.countTimer=setInterval(()=>{n--;if(n>0)show();else{clearInterval(state.countTimer);state.countTimer=null;state.countResolve=null;el.hidden=true;resolve(true);}},1000);});}
async function nextTetherPhoto(folder, used, current) {
 const deadline = Date.now() + 60000;
 const observed = new Map();
 let lastError;
 while (current === state.exportGeneration && Date.now() < deadline) {
  const candidates = [];
  for await (const handle of folder.values()) {
   if (handle.kind !== 'file' || !/\.jpe?g$/i.test(handle.name) || used.has(handle.name)) continue;
   try {
    const file = await handle.getFile();
    const signature = `${file.size}:${file.lastModified}`;
    if (file.size && observed.get(handle.name) === signature) candidates.push(file);
    observed.set(handle.name, signature);
   } catch (error) {
    if (error.name !== 'NotFoundError') throw error;
   }
  }
  candidates.sort((a,b) => a.lastModified - b.lastModified || a.name.localeCompare(b.name));
  for (const file of candidates) {
   if (current !== state.exportGeneration) return null;
   try {
    const image = await readImage(file, 'tether');
    used.add(file.name);
    return image;
   } catch (error) {
    lastError = error;
   }
  }
  await new Promise(resolve => setTimeout(resolve, 500));
 }
 if (current !== state.exportGeneration) return null;
 throw lastError || Error('Chưa có JPEG mới sau 60 giây. Kiểm tra thư mục lưu và định dạng JPEG trong phần mềm máy ảnh.');
}

$('#tether-folder').addEventListener('click', async () => {
 if (!window.showDirectoryPicker) {
  message('Dùng Chrome hoặc Edge để tự nhận JPEG từ thư mục. Bạn vẫn có thể chọn Ảnh từ máy.');
  return;
 }
 try {
  tetherFolder = await window.showDirectoryPicker({mode:'read'});
  $('#tether-status').textContent = `Thư mục ${tetherFolder.name} · Bấm Bắt đầu nhận ảnh trước khi bấm máy.`;
  message();
  update();
 } catch (error) {
  if (error.name !== 'AbortError') message('Chưa mở được thư mục. Chọn thư mục riêng lưu JPEG và cấp quyền đọc.');
 }
});

$('#cancel-tether').addEventListener('click', () => {
 state.exportGeneration++;
 message('Đã hủy nhận ảnh.');
});

async function capture(){if(state.busy||state.focusing||state.review||!sourceReady())return;message();state.importGeneration++;clearTakes();state.busy=true;const current=++state.exportGeneration;update();try{const{w,h,slots}=dimensions();
 const folder=state.source==='tether'?tetherFolder:null;
 const used=new Set();
 if(folder)for await(const name of folder.keys())used.add(name);
 for(let n=0;n<slots.length;n++){update();
 if(folder){
  if(current!==state.exportGeneration)return;
  message(`Bấm máy để chụp ảnh ${n+1}/${slots.length}. Đang chờ JPEG mới…`);
  const image=await nextTetherPhoto(folder,used,current);
  if(!image||current!==state.exportGeneration){image?.close();clearTakes();return;}
  const slot=slots[n],canvas=document.createElement('canvas');
  canvas.width=slot.w;canvas.height=slot.h;
  drawCover(canvas.getContext('2d'),image,0,0,slot.w,slot.h,false);
  image.close();
  const bitmap=await createImageBitmap(canvas);
  if(current!==state.exportGeneration){bitmap.close();clearTakes();return;}
  state.takes.push(bitmap);
  draw();
  continue;
 }
 const ready=await waitCount(state.delay);if(!ready||current!==state.exportGeneration||!sourceReady()||document.hidden){clearTakes();return;}if(state.source==='sample')state.takes.push(null);else{const r=slots[n],shot=document.createElement('canvas');shot.width=r.w;shot.height=r.h;drawCover(shot.getContext('2d'),state.source==='camera'?video:state.photo,0,0,r.w,r.h,state.source==='camera'&&state.mirror);const bitmap=await createImageBitmap(shot);if(current!==state.exportGeneration||document.hidden){bitmap.close();clearTakes();return;}state.takes.push(bitmap);}draw();if(slots.length>1&&n<slots.length-1&&state.delay===0)await new Promise(r=>setTimeout(r,400));}
 const output=document.createElement('canvas');output.width=w;output.height=h;compose(output);const raw=await new Promise((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(Error('Chưa tạo được ảnh. Thử chụp lại.')),'image/jpeg',.93)),blob=new Blob([jpeg300(await raw.arrayBuffer())],{type:'image/jpeg'});if(current!==state.exportGeneration||(!folder&&document.hidden)){clearTakes();return;}message();clearExport();state.exportBlob=blob;state.exportUrl=URL.createObjectURL(blob);state.capturedLayout=state.format;preview.width=w;preview.height=h;preview.getContext('2d').drawImage(output,0,0);setReview(true);stopCamera();update();}catch(e){clearTakes();if(current===state.exportGeneration)message(e.message||'Chưa chụp được ảnh, hãy thử lại.');}finally{state.busy=false;$('#countdown').hidden=true;update();}}

function chooseSource(source){if(state.busy||state.review)return;state.importGeneration++;clearTakes();stopCamera();state.source=source;message();update();draw();if(source==='camera')void enumerate().catch(()=>{});}
for(const el of document.querySelectorAll('[data-theme]'))el.addEventListener('click',()=>{if(state.busy||state.review)return;state.customFrame?.close();state.customFrame=null;state.theme=el.dataset.theme;persist();update();draw();});
for(const el of document.querySelectorAll('[data-source]'))el.addEventListener('click',()=>chooseSource(el.dataset.source));
$('#focus-mode').addEventListener('change', () => void changeFocus());
$('#refresh-cameras').addEventListener('click', async () => {
 try {
  await enumerate();
  if (!state.stream) message('Đã làm mới danh sách. Chọn nguồn rồi bấm Bật camera để kiểm tra.');
 } catch {
  message('Chưa đọc được danh sách thiết bị. Kiểm tra quyền camera rồi thử lại.');
 }
});
$('#enable-camera').addEventListener('click',()=>void startCamera());$('#stop-camera').addEventListener('click',()=>stopCamera());$('#devices').addEventListener('change',()=>{
 if(state.busy)return;
 preferredCamera = $('#devices').value;
 try { localStorage.setItem('fpt-photobooth-camera',preferredCamera); } catch {}
 stopCamera();
 message('Đã chọn nguồn. Bấm Bật camera để kiểm tra hình.');
});
$('#photo-file').addEventListener('change',async e=>{const file=e.target.files[0];if(state.busy||state.review)return;const op=++state.importGeneration;try{const image=await readImage(file,'photo');if(!image)return;if(op!==state.importGeneration||state.busy||state.review){image.close();return;}stopCamera();state.photo?.close();state.photo=image;state.source='file';message();update();draw();}catch(err){message(err.message);}finally{e.target.value='';}});
$('#frame-file').addEventListener('change',async e=>{const file=e.target.files[0];if(state.busy||state.review)return;const op=++state.importGeneration;try{const image=await readImage(file,'frame');if(!image)return;if(op!==state.importGeneration||state.busy||state.review){image.close();return;}state.customFrame?.close();state.customFrame=image;message('Đã import đúng form. Chữ và logo dùng nguyên thiết kế PNG của bạn.');update();draw();}catch(err){message(err.message);}finally{e.target.value='';}});
$('#clear-frame').addEventListener('click',()=>{if(state.busy||state.review)return;state.customFrame?.close();state.customFrame=null;update();draw();});
for(const[key,id]of[['title','event-title'],['caption','caption'],['format','format'],['delay','delay'],['mirror','mirror'],['zoom','zoom']])$('#'+id).addEventListener(key==='title'||key==='caption'||key==='zoom'?'input':'change',e=>{if(state.busy||state.review)return;if(key==='format'){state.importGeneration++;clearTakes();if(state.customFrame){state.customFrame.close();state.customFrame=null;message('Đã đổi form. Import lại PNG đúng kích thước của form mới.');}}state[key]=key==='mirror'?e.target.checked:key==='delay'||key==='zoom'?Number(e.target.value):e.target.value;persist();update();draw();});
$('#reset').addEventListener('click',()=>{if(state.busy||state.review)return;state.importGeneration++;clearTakes();Object.assign(state,defaults);state.customFrame?.close();state.customFrame=null;persist();update();draw();message('Đã khôi phục khung và nội dung mẫu.');});
$('#capture').addEventListener('click',()=>void capture());$('#retake').addEventListener('click',()=>{clearTakes();clearExport();setReview(false);state.busy=false;message();update();draw();if(state.source==='camera')message('Camera đã tắt sau khi chụp. Bấm Bật camera để chụp tấm tiếp theo.');});
$('#download').addEventListener('click',()=>{if(!state.exportBlob||!state.exportUrl)return;const a=document.createElement('a');a.href=state.exportUrl;a.download=`FPT-Photobooth-${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`;a.click();message('Đã yêu cầu tải ảnh. Kiểm tra thư mục tải về của trình duyệt.');});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message('Trình duyệt chưa cho phép toàn màn hình. Có thể dùng nút toàn màn hình của máy.');}});
for(const[button,dialog]of[['hardware-help','help-dialog']])$('#'+button).addEventListener('click',()=>$('#'+dialog).showModal());for(const el of document.querySelectorAll('.close-dialog'))el.addEventListener('click',()=>el.closest('dialog').close());
$('.source-file').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();$('#photo-file').click();}});
function cleanup(){tetherFolder=null;clearTakes();disposed=true;cancelAnimationFrame(raf);clearExport();cancelCount();stopCamera();state.photo?.close();state.customFrame?.close();}
window.addEventListener('pagehide',cleanup);window.addEventListener('pageshow',e=>{if(!e.persisted)return;disposed=false;state.photo=null;state.customFrame=null;if(state.source==='file')state.source='sample';setReview(false);state.busy=false;message('Đã mở lại bản mẫu. Ảnh tạm trước đó đã được xóa; chọn nguồn để chụp mới.');update();draw();raf=requestAnimationFrame(loop);});document.addEventListener('visibilitychange',()=>{if(document.hidden){const wasCounting=state.busy&&state.source!=='tether',wasCamera=!!state.stream||state.starting;if(wasCounting){state.exportGeneration++;clearTakes();cancelCount();}if(wasCamera)stopCamera();if(wasCounting||wasCamera)message('Đã tạm dừng khi rời trang. Camera đã tắt; ảnh đã chụp vẫn được giữ nếu chưa tải lại trang.');}else{if(disposed){disposed=false;raf=requestAnimationFrame(loop);}update();draw();}});
navigator.mediaDevices?.addEventListener?.('devicechange',()=>{void enumerate().catch(()=>{});});
(async()=>{await Promise.all([['logo','./assets/fpt-telecom.svg'],['fox','./assets/fox-ready.png']].map(async([key,src])=>{try{const img=new Image();img.src=src;await img.decode();assets[key]=img;}catch{message('Một ảnh trang trí chưa tải được. Kiểm tra thư mục assets của bản mẫu.');}}));await Promise.race([document.fonts?.ready||Promise.resolve(),new Promise(r=>setTimeout(r,1800))]);state.assetsReady=true;update();draw();raf=requestAnimationFrame(loop);})();
let printGeneration=0;
async function preparePrint(){if(!state.review||!state.exportUrl)return;const generation=++printGeneration,id=state.capturedLayout,copies=Number($('#print-copies').value),p=printPlan(id,copies);$('#print-spec').textContent=`${layoutFor(id).name} · ${copies} bản / ${p.pages.length} tờ giấy${id==='strip'?' · 2 dải trên một tờ 4×6':''}.`;const preview=$('#paper-preview');preview.replaceChildren();for(const count of p.pages){const paper=document.createElement('div');paper.className='paper-mini';paper.style.aspectRatio=`${p.paperW}/${p.paperH}`;paper.style.width=p.paperW>p.paperH?'220px':'150px';for(let i=0;i<count;i++){const img=document.createElement('img');img.src=state.exportUrl;img.alt='Ảnh đặt trên giấy';img.style.width=p.imageW/p.paperW*100+'%';paper.append(img);}preview.append(paper);}
 $('#start-print').disabled=true;const iframe=$('#print-frame');iframe.srcdoc=printDocument(id,copies,state.exportUrl);await new Promise(resolve=>iframe.onload=resolve);await Promise.all([...iframe.contentDocument.images].map(i=>i.decode()));if(generation===printGeneration)$('#start-print').disabled=false;
}
$('#print').addEventListener('click',()=>{if(!state.exportBlob)return;$('#print-copies').value=state.capturedLayout==='strip'?'2':'1';$('#print-message').textContent='Chọn máy in hoặc Lưu thành PDF trong hộp thoại. Chưa kiểm thử với máy in thật.';$('#print-dialog').showModal();void preparePrint().catch(()=>$('#print-message').textContent='Chưa chuẩn bị được trang in. Tải JPEG về để in từ máy.');});
$('#print-copies').addEventListener('change',()=>void preparePrint().catch(()=>$('#print-message').textContent='Chưa chuẩn bị được trang in. Chọn lại số bản.'));
$('#start-print').addEventListener('click',()=>{try{$('#print-frame').contentWindow.focus();$('#print-frame').contentWindow.print();$('#print-message').textContent='Đã mở hộp thoại in. Chưa xác nhận in thành công; kiểm tra bản in hoặc file PDF.';}catch{$('#print-message').textContent='Không mở được hộp thoại in. Tải JPEG về để in từ máy.';}});
