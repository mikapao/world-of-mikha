import * as THREE from "three";
import { mat, mesh } from "../engine.js";

// Blibli — the little pastel robot. Returns { root, body, armL, armR, footL, footR, idle(t, moving) }
export function buildBlibli(){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const blue = mat(0x8fb8e8), light = mat(0xdfeaf7), pink = mat(0xf4a7b9), dark = mat(0x3b4a5a);
  body.add(mesh(new THREE.BoxGeometry(.8,.7,.6), blue, 0,.75,0));
  body.add(mesh(new THREE.BoxGeometry(.32,.22,.04), light, 0,.8,.31,false));
  body.add(mesh(new THREE.BoxGeometry(.76,.58,.6), light, 0,1.45,0));
  body.add(mesh(new THREE.SphereGeometry(.075,8,6), dark, -.16,1.5,.3,false));
  body.add(mesh(new THREE.SphereGeometry(.075,8,6), dark,  .16,1.5,.3,false));
  body.add(mesh(new THREE.SphereGeometry(.06,6,5), pink, -.27,1.36,.3,false));
  body.add(mesh(new THREE.SphereGeometry(.06,6,5), pink,  .27,1.36,.3,false));
  body.add(mesh(new THREE.CylinderGeometry(.025,.025,.3,5), dark, 0,1.88,0,false));
  const antTip = mesh(new THREE.SphereGeometry(.09,8,6), mat(0xf4a7b9,{emissive:0xf4a7b9,emissiveIntensity:.4}), 0,2.05,0,false); body.add(antTip);
  const armL = mesh(new THREE.BoxGeometry(.14,.45,.14), blue, -.5,.78,0), armR = mesh(new THREE.BoxGeometry(.14,.45,.14), blue, .5,.78,0);
  body.add(armL, armR);
  const footL = mesh(new THREE.BoxGeometry(.24,.28,.34), dark, -.2,.2,0), footR = mesh(new THREE.BoxGeometry(.24,.28,.34), dark, .2,.2,0);
  root.add(footL, footR);
  return {root, body, armL, armR, footL, footR, idle:(t)=>{ antTip.position.x = Math.sin(t*3)*.03; }};
}
