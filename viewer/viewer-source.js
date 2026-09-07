import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage=document.querySelector('#stage');
const status=document.querySelector('#status');
const loading=document.querySelector('#loading');
const buttons=[...document.querySelectorAll('[data-view]')];
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
catch(error){loading.textContent='3D表示を開始できません。ブラウザのハードウェアアクセラレーションを有効にして、もう一度開いてください。';throw error;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NeutralToneMapping;
renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','テックくまの3Dモデル。ドラッグで回転、ホイールまたはピンチで拡大縮小。');
renderer.domElement.setAttribute('tabindex','0');
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-3.2,3.2,3.2,-3.2,.1,100);
camera.position.set(0,.12,12);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;
controls.minZoom=.65;controls.maxZoom=3.5;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.88;
controls.autoRotateSpeed=1.1;
const pmrem=new THREE.PMREMGenerator(renderer);
const room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);
scene.environment=environment.texture;scene.environmentIntensity=.6;
room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xe9f8ff,0x84969f,1.7));
const key=new THREE.DirectionalLight(0xffffff,3.0);key.position.set(-4,7,6);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-4;
key.shadow.normalBias=.025;key.shadow.bias=-.00015;key.shadow.radius=3;scene.add(key);
const fill=new THREE.DirectionalLight(0xeaf7ff,1.0);fill.position.set(5,3,-3);scene.add(fill);
let model, bytes, downloadURL, tween;
const presets={front:new THREE.Vector3(0,.12,12),side:new THREE.Vector3(12,.25,2),back:new THREE.Vector3(0,.12,-12),angle:new THREE.Vector3(7,2.1,10)};
function markView(name){buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));}
function setRotation(value){controls.autoRotate=value;document.querySelector('#rotate').setAttribute('aria-pressed',String(value));document.querySelector('#rotate-label').textContent=value?'回転を停止':'自動回転';}
function setView(name){setRotation(false);const from=camera.position.clone();tween={from,to:presets[name].clone(),start:performance.now()};markView(name);}
buttons.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelector('#rotate').addEventListener('click',()=>{tween=null;setRotation(!controls.autoRotate);if(controls.autoRotate)markView('');});
document.querySelector('#reset').addEventListener('click',()=>{camera.zoom=1;camera.updateProjectionMatrix();setView('front');});
controls.addEventListener('start',()=>{tween=null;setRotation(false);markView('');});
renderer.domElement.addEventListener('keydown',e=>{
 if(e.key==='Home'){camera.zoom=1;camera.updateProjectionMatrix();setView('front');e.preventDefault();}
 if(e.key==='+'||e.key==='='){camera.zoom=Math.min(3.5,camera.zoom*1.15);camera.updateProjectionMatrix();e.preventDefault();}
 if(e.key==='-'){camera.zoom=Math.max(.65,camera.zoom/1.15);camera.updateProjectionMatrix();e.preventDefault();}
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?-.16:.16);camera.lookAt(0,0,0);markView('');e.preventDefault();}
});
const observer=new ResizeObserver(()=>{
 const width=stage.clientWidth,height=stage.clientHeight;
 renderer.setSize(width,height,false);
 const aspect=width/height;const half=aspect<.9?3.0/aspect:3.05;
 camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
});observer.observe(stage);
function frame(time){
 if(tween){const t=Math.min(1,(time-tween.start)/450);camera.position.lerpVectors(tween.from,tween.to,t*t*(3-2*t));if(t===1)tween=null;}
 controls.update();renderer.render(scene,camera);
}renderer.setAnimationLoop(frame);
(async()=>{
 try{
  const raw=atob(document.querySelector('#model-data').textContent.trim());bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');model=gltf.scene;
  const box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.sub(center);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x385265,opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=box.min.y-center.y+.003;floor.receiveShadow=true;scene.add(floor);
  downloadURL=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));const dl=document.querySelector('#download');dl.href=downloadURL;dl.download='tek-kuma.glb';dl.removeAttribute('aria-disabled');
  status.textContent='ドラッグで回転 · スクロール / ピンチでズーム';loading.hidden=true;
  document.querySelectorAll('button').forEach(b=>b.disabled=false);
  document.documentElement.dataset.modelReady='true';
 }catch(error){console.error(error);loading.textContent='モデルを読み込めませんでした。HTMLファイルをダウンロードし直して、ChromeまたはSafariで開いてください。';status.textContent='読み込みエラー';}
})();
window.addEventListener('pagehide',()=>{if(downloadURL)URL.revokeObjectURL(downloadURL);});
