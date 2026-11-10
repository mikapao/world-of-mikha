import * as THREE from "three";
import { mat, mesh } from "../engine.js";

function ginghamTex(){
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0,0,64,64);
  g.fillStyle = "rgba(90,150,225,.55)"; g.fillRect(0,0,32,64); g.fillRect(0,0,64,32);
  g.fillStyle = "#4f8fdc"; g.fillRect(0,0,32,32);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6,2.5); t.magFilter = THREE.NearestFilter; return t;
}
// Kitty — an original chibi kitty girl: yellow bob, black cat ears, sparkly green eyes,
// blue gingham dress with collar + cherry brooch, sunflower pin & pocket, swishy tail.
// Every build returns: { root, body, armL, armR, footL, footR, idle(t, moving) }
export function buildKitty(){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const sparkles2 = [];
  const skin = mat(0xffdcc6), hair = mat(0xffd54a), ear = mat(0x2d2a33), earIn = mat(0xffb3a7),
        dress = new THREE.MeshStandardMaterial({map:ginghamTex(), roughness:.9}), boot = mat(0xf2a65a), eye = mat(0x3a2f3a,{roughness:.3}), green = mat(0x34c25a,{roughness:.2, emissive:0x1f8a3a, emissiveIntensity:.35}), white = mat(0xffffff), blush = mat(0xff9fb0),
        petal = mat(0xffc93c), seed = mat(0x8a5a2b);
  // sundress + sunflower pocket
  body.add(mesh(new THREE.CylinderGeometry(.23,.38,.46,8), dress, 0,.44,0));
  body.add(mesh(new THREE.CylinderGeometry(.08,.08,.03,8), petal, .11,.4,.31,false).rotateX(Math.PI/2));
  body.add(mesh(new THREE.CylinderGeometry(.035,.035,.04,6), seed, .11,.4,.325,false).rotateX(Math.PI/2));
  // round white collar + cherry brooch
  const collar = mesh(new THREE.CylinderGeometry(.26,.28,.06,10), white, 0,.67,0,false); body.add(collar);
  const cherry = new THREE.Group(); cherry.position.set(-.08,.57,.27); cherry.scale.setScalar(.85); body.add(cherry);
  [[-.04,0],[.045,-.01]].forEach(([x,y])=> cherry.add(mesh(new THREE.SphereGeometry(.045,8,6), mat(0xe8384f,{roughness:.3}), x,y,0,false)));
  const stem = mesh(new THREE.CylinderGeometry(.01,.01,.1,4), mat(0x4f9a3a), 0,.06,0,false); stem.rotation.z = .3; cherry.add(stem);
  const lf = mesh(new THREE.SphereGeometry(.03,5,4), mat(0x6cc04a), .04,.1,0,false); lf.scale.set(1.4,.6,.6); cherry.add(lf);
  // arms
  const armL = mesh(new THREE.CylinderGeometry(.065,.075,.27,6), skin, -.29,.52,0), armR = mesh(new THREE.CylinderGeometry(.065,.075,.27,6), skin, .29,.52,0);
  armL.rotation.z = -.35; armR.rotation.z = .35; body.add(armL, armR);
  // head
  const head = mesh(new THREE.SphereGeometry(.6,12,10), skin, 0,1.38,0); head.scale.set(1,.93,.95); body.add(head);
  // hair: rounded bob + bangs + little top curl
  const cap = mesh(new THREE.SphereGeometry(.65,12,10), hair, 0,1.52,-.14); cap.scale.set(1.04,.9,.98); body.add(cap);
  [-.42,.42].forEach(x=>{ const side = mesh(new THREE.SphereGeometry(.3,8,7), hair, x,1.2,-.02); side.scale.set(.7,1,.85); body.add(side); });
  [-.3,-.1,.1,.3].forEach((x,i)=>{ const b = mesh(new THREE.SphereGeometry(.17,8,6), hair, x,1.72-(Math.abs(x)*.25),.42); b.scale.set(1.1,.7,.6); body.add(b); });
  const curl = mesh(new THREE.TorusGeometry(.09,.035,5,10,Math.PI*1.5), hair, .02,2.02,-.05,false); curl.rotation.y = Math.PI/2; body.add(curl);
  // black cat ears
  [-1,1].forEach(sd=>{
    const e = mesh(new THREE.ConeGeometry(.29,.56,4), ear, sd*.38,2.0,-.05); e.rotation.z = -sd*.38; e.rotation.y = Math.PI/4; body.add(e);
    const ei = mesh(new THREE.ConeGeometry(.17,.34,4), earIn, sd*.37,1.95,.08,false); ei.rotation.z = -sd*.38; ei.rotation.y = Math.PI/4; body.add(ei);
  });
  // face: shiny dot eyes, rosy cheeks, tiny smile
  [-1,1].forEach(sd=>{
    const e = mesh(new THREE.SphereGeometry(.09,12,10), green, sd*.2,1.34,.555,false); e.scale.set(1,1.3,.6); body.add(e);
    const pu = mesh(new THREE.SphereGeometry(.045,8,6), eye, sd*.2,1.33,.6,false); pu.scale.set(1,1.3,.5); body.add(pu);
    const sp1 = mesh(new THREE.OctahedronGeometry(.032,0), white, sd*.2+.035,1.4,.625,false); body.add(sp1); sparkles2.push(sp1);
    const sp2 = mesh(new THREE.SphereGeometry(.014,5,4), white, sd*.2-.03,1.29,.62,false); body.add(sp2);
    const c = mesh(new THREE.SphereGeometry(.07,8,6), blush, sd*.33,1.2,.52,false); c.scale.set(1,.6,.4); body.add(c);
  });
  const smile = mesh(new THREE.TorusGeometry(.05,.014,4,10,Math.PI), eye, 0,1.2,.56,false); smile.rotation.z = Math.PI; body.add(smile);
  // sunflower hair pin
  const pin = new THREE.Group(); pin.position.set(.43,1.66,.3); pin.rotation.set(Math.PI/2.3,0,-.5);
  for(let i=0;i<6;i++){ const p = mesh(new THREE.SphereGeometry(.06,6,5), petal, Math.cos(i/6*6.28)*.08,0,Math.sin(i/6*6.28)*.08,false); p.scale.set(1,.4,1); pin.add(p); }
  pin.add(mesh(new THREE.SphereGeometry(.05,6,5), seed, 0,.02,0,false)); body.add(pin);
  // swishy black tail with a yellow tip
  const tail = new THREE.Group(); tail.position.set(0,.38,-.32); tail.scale.setScalar(.85); body.add(tail);
  const tb = mesh(new THREE.TorusGeometry(.26,.055,5,10,Math.PI*1.1), ear, 0,.26,-.05,false); tb.rotation.y = Math.PI/2; tail.add(tb);
  tail.add(mesh(new THREE.SphereGeometry(.075,6,5), hair, 0,.6,-.08,false));
  // chibi: move every head part into one group, make it a bit bigger, sit it on the small body
  const headG = new THREE.Group(); headG.position.y = .6; headG.scale.setScalar(1.1);
  body.children.filter(o => o.position.y > 1.0).forEach(o => { o.position.y -= .7; headG.add(o); });
  body.add(headG);
  // little boots
  const footL = mesh(new THREE.SphereGeometry(.13,8,6), boot, -.15,.1,.03), footR = mesh(new THREE.SphereGeometry(.13,8,6), boot, .15,.1,.03);
  footL.scale.set(1,.8,1.25); footR.scale.set(1,.8,1.25); root.add(footL, footR);
  return {root, body, armL, armR, footL, footR, idle:(t,moving)=>{ tail.rotation.z = Math.sin(t*(moving?7:2.2))*.35;
    sparkles2.forEach((sp,i)=>{ sp.rotation.z = t*1.5; sp.scale.setScalar(.8 + Math.max(0,Math.sin(t*2.5+i*1.3))*.6); }); }};
}
