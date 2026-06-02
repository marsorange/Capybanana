import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

if (!globalThis.FileReader) {
  globalThis.FileReader = class NodeFileReader {
    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer();
      this.onloadend?.({ target: this });
    }
  };
}

const output = fileURLToPath(
  new URL("../src/asset/3D/Capybanana.rigged.glb", import.meta.url),
);

const scene = new THREE.Scene();
scene.name = "CapybananaRiggedScene";

const materials = {
  body: new THREE.MeshStandardMaterial({
    name: "warm_orange_body",
    color: 0xd88b32,
    roughness: 0.82,
    metalness: 0,
    flatShading: true,
  }),
  bodyDark: new THREE.MeshStandardMaterial({
    name: "orange_shadow_facets",
    color: 0xb96e25,
    roughness: 0.88,
    metalness: 0,
    flatShading: true,
  }),
  muzzle: new THREE.MeshStandardMaterial({
    name: "taupe_muzzle",
    color: 0x8b6542,
    roughness: 0.86,
    metalness: 0,
    flatShading: true,
  }),
  ear: new THREE.MeshStandardMaterial({
    name: "brown_ears_and_paws",
    color: 0x735139,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  }),
  earInner: new THREE.MeshStandardMaterial({
    name: "dark_inner_ear",
    color: 0x4f3828,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  }),
  eye: new THREE.MeshStandardMaterial({
    name: "glossy_black_eyes",
    color: 0x151514,
    roughness: 0.28,
    metalness: 0,
    flatShading: true,
  }),
  eyeGlint: new THREE.MeshStandardMaterial({
    name: "eye_glint",
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0,
    flatShading: true,
  }),
  green: new THREE.MeshStandardMaterial({
    name: "leaf_scarf_green",
    color: 0x98ad38,
    roughness: 0.8,
    metalness: 0,
    flatShading: true,
  }),
  greenDark: new THREE.MeshStandardMaterial({
    name: "olive_shadow_green",
    color: 0x687a26,
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
  }),
  blush: new THREE.MeshStandardMaterial({
    name: "soft_blush",
    color: 0xe18a72,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  }),
  line: new THREE.MeshStandardMaterial({
    name: "dark_mouth_lines",
    color: 0x3c2c22,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  }),
};

const root = new THREE.Bone();
root.name = "root";
root.position.set(0, 0, 0);

const spine = new THREE.Bone();
spine.name = "spine";
spine.position.set(0, 0.82, 0);
root.add(spine);

const head = new THREE.Bone();
head.name = "head";
head.position.set(0, 0.82, 0.04);
spine.add(head);

const leftArm = new THREE.Bone();
leftArm.name = "left_arm";
leftArm.position.set(0.55, 0.2, 0.06);
spine.add(leftArm);

const rightArm = new THREE.Bone();
rightArm.name = "right_arm";
rightArm.position.set(-0.55, 0.2, 0.06);
spine.add(rightArm);

const leftLeg = new THREE.Bone();
leftLeg.name = "left_leg";
leftLeg.position.set(0.32, -0.68, 0.06);
root.add(leftLeg);

const rightLeg = new THREE.Bone();
rightLeg.name = "right_leg";
rightLeg.position.set(-0.32, -0.68, 0.06);
root.add(rightLeg);

const leaf = new THREE.Bone();
leaf.name = "leaf_hat";
leaf.position.set(0, 0.55, -0.04);
head.add(leaf);

scene.add(root);

const bones = [root, spine, head, leftArm, rightArm, leftLeg, rightLeg, leaf];
const skeleton = new THREE.Skeleton(bones);

function addSkinAttributes(geometry, boneIndex) {
  const count = geometry.attributes.position.count;
  const skinIndex = [];
  const skinWeight = [];

  for (let i = 0; i < count; i += 1) {
    skinIndex.push(boneIndex, 0, 0, 0);
    skinWeight.push(1, 0, 0, 0);
  }

  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(skinIndex, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(skinWeight, 4),
  );
}

function lowPolySphere(name, material, boneIndex, position, scale, detail = 2) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  geometry.scale(scale[0], scale[1], scale[2]);
  geometry.translate(position[0], position[1], position[2]);
  geometry.computeVertexNormals();
  addSkinAttributes(geometry, boneIndex);

  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.bind(skeleton);
  scene.add(mesh);
  return mesh;
}

function lowPolyBox(name, material, boneIndex, position, scale, rotation = [0, 0, 0]) {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  geometry.scale(scale[0], scale[1], scale[2]);
  geometry.rotateX(rotation[0]);
  geometry.rotateY(rotation[1]);
  geometry.rotateZ(rotation[2]);
  geometry.translate(position[0], position[1], position[2]);
  geometry.computeVertexNormals();
  addSkinAttributes(geometry, boneIndex);

  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.bind(skeleton);
  scene.add(mesh);
  return mesh;
}

function lowPolyCylinder(
  name,
  material,
  boneIndex,
  position,
  radiusTop,
  radiusBottom,
  height,
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
) {
  const geometry = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    8,
    1,
    false,
  );
  geometry.scale(scale[0], scale[1], scale[2]);
  geometry.rotateX(rotation[0]);
  geometry.rotateY(rotation[1]);
  geometry.rotateZ(rotation[2]);
  geometry.translate(position[0], position[1], position[2]);
  geometry.computeVertexNormals();
  addSkinAttributes(geometry, boneIndex);

  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.bind(skeleton);
  scene.add(mesh);
  return mesh;
}

// Body and head.
lowPolySphere("body_orange", materials.body, 1, [0, 0.68, 0], [0.72, 0.92, 0.5]);
lowPolySphere("belly_facets", materials.bodyDark, 1, [0, 0.32, 0.04], [0.58, 0.46, 0.44], 1);
lowPolySphere("head_orange", materials.body, 2, [0, 1.55, 0.06], [0.7, 0.62, 0.52]);

// Face.
lowPolySphere("muzzle", materials.muzzle, 2, [0, 1.48, 0.48], [0.36, 0.29, 0.18], 1);
lowPolySphere("left_eye", materials.eye, 2, [0.31, 1.66, 0.48], [0.065, 0.105, 0.045], 1);
lowPolySphere("right_eye", materials.eye, 2, [-0.31, 1.66, 0.48], [0.065, 0.105, 0.045], 1);
lowPolySphere("left_eye_glint", materials.eyeGlint, 2, [0.33, 1.7, 0.515], [0.018, 0.02, 0.012], 0);
lowPolySphere("right_eye_glint", materials.eyeGlint, 2, [-0.29, 1.7, 0.515], [0.018, 0.02, 0.012], 0);
lowPolyBox("nose_left", materials.line, 2, [0.11, 1.52, 0.64], [0.12, 0.035, 0.035], [0, 0.16, -0.34]);
lowPolyBox("nose_right", materials.line, 2, [-0.11, 1.52, 0.64], [0.12, 0.035, 0.035], [0, -0.16, 0.34]);
lowPolyBox("mouth_center", materials.line, 2, [0, 1.36, 0.65], [0.025, 0.22, 0.025]);
lowPolyBox("mouth_left", materials.line, 2, [0.08, 1.27, 0.65], [0.025, 0.16, 0.025], [0, 0, -0.65]);
lowPolyBox("mouth_right", materials.line, 2, [-0.08, 1.27, 0.65], [0.025, 0.16, 0.025], [0, 0, 0.65]);
lowPolySphere("left_blush", materials.blush, 2, [0.47, 1.42, 0.4], [0.08, 0.035, 0.025], 0);
lowPolySphere("right_blush", materials.blush, 2, [-0.47, 1.42, 0.4], [0.08, 0.035, 0.025], 0);

// Ears.
lowPolySphere("left_ear_outer", materials.ear, 2, [0.47, 2.05, 0.03], [0.19, 0.22, 0.15], 1);
lowPolySphere("right_ear_outer", materials.ear, 2, [-0.47, 2.05, 0.03], [0.19, 0.22, 0.15], 1);
lowPolySphere("left_ear_inner", materials.earInner, 2, [0.49, 2.04, 0.11], [0.1, 0.12, 0.04], 0);
lowPolySphere("right_ear_inner", materials.earInner, 2, [-0.49, 2.04, 0.11], [0.1, 0.12, 0.04], 0);

// Arms, paws, feet, and simple toe marks.
lowPolyCylinder("left_arm_orange", materials.body, 3, [0.62, 0.77, 0.13], 0.14, 0.18, 0.72, [1, 1, 1], [0.12, 0, -0.18]);
lowPolyCylinder("right_arm_orange", materials.body, 4, [-0.62, 0.77, 0.13], 0.14, 0.18, 0.72, [1, 1, 1], [0.12, 0, 0.18]);
lowPolySphere("left_paw", materials.ear, 3, [0.66, 0.43, 0.17], [0.17, 0.15, 0.12], 1);
lowPolySphere("right_paw", materials.ear, 4, [-0.66, 0.43, 0.17], [0.17, 0.15, 0.12], 1);
lowPolySphere("left_foot", materials.ear, 5, [0.29, -0.15, 0.18], [0.24, 0.13, 0.16], 1);
lowPolySphere("right_foot", materials.ear, 6, [-0.29, -0.15, 0.18], [0.24, 0.13, 0.16], 1);
for (const side of [-1, 1]) {
  for (const offset of [-0.07, 0.07]) {
    lowPolyBox(
      `toe_${side}_${offset}`,
      materials.line,
      side > 0 ? 5 : 6,
      [side * (0.29 + offset), -0.11, 0.32],
      [0.018, 0.08, 0.018],
    );
  }
}

// Scarf and leaf hat.
lowPolyCylinder("scarf_ring", materials.green, 1, [0, 1.05, 0.06], 0.47, 0.54, 0.2, [1, 0.8, 1], [Math.PI / 2, 0, 0]);
lowPolySphere("scarf_knot", materials.greenDark, 1, [0, 0.92, 0.55], [0.16, 0.18, 0.11], 1);
lowPolyBox("scarf_tail_left", materials.green, 1, [0.13, 0.72, 0.57], [0.15, 0.36, 0.08], [0.1, 0, -0.38]);
lowPolyBox("scarf_tail_right", materials.green, 1, [-0.13, 0.72, 0.57], [0.15, 0.34, 0.08], [0.1, 0, 0.38]);
lowPolySphere("leaf_hat_body", materials.green, 7, [0, 2.22, 0.04], [0.38, 0.15, 0.27], 1);
lowPolyCylinder("leaf_hat_stem", materials.greenDark, 7, [0.05, 2.38, 0.02], 0.045, 0.055, 0.22, [1, 1, 1], [0.25, 0, -0.45]);

function quat(axis, angle) {
  return new THREE.Quaternion().setFromAxisAngle(axis, angle).toArray();
}

function track(name, axis, angles, times) {
  return new THREE.QuaternionKeyframeTrack(
    `${name}.quaternion`,
    times,
    angles.flatMap((angle) => quat(axis, angle)),
  );
}

const xAxis = new THREE.Vector3(1, 0, 0);
const zAxis = new THREE.Vector3(0, 0, 1);

const idleTimes = [0, 1.2, 2.4];
const idle = new THREE.AnimationClip("idle", 2.4, [
  track("head", zAxis, [-0.045, 0.045, -0.045], idleTimes),
  track("left_arm", zAxis, [0.02, 0.12, 0.02], idleTimes),
  track("right_arm", zAxis, [-0.02, -0.12, -0.02], idleTimes),
  track("leaf_hat", zAxis, [-0.06, 0.06, -0.06], idleTimes),
  new THREE.VectorKeyframeTrack("root.position", idleTimes, [
    0, 0, 0,
    0, 0.025, 0,
    0, 0, 0,
  ]),
]);

const walkTimes = [0, 0.25, 0.5, 0.75, 1];
const walk = new THREE.AnimationClip("walk", 1, [
  track("left_arm", zAxis, [-0.26, 0.2, -0.26, 0.2, -0.26], walkTimes),
  track("right_arm", zAxis, [0.26, -0.2, 0.26, -0.2, 0.26], walkTimes),
  track("left_leg", xAxis, [0.24, -0.18, 0.24, -0.18, 0.24], walkTimes),
  track("right_leg", xAxis, [-0.24, 0.18, -0.24, 0.18, -0.24], walkTimes),
  track("head", zAxis, [0.04, -0.04, 0.04, -0.04, 0.04], walkTimes),
  new THREE.VectorKeyframeTrack("root.position", walkTimes, [
    0, 0, 0,
    0, 0.035, 0,
    0, 0, 0,
    0, 0.035, 0,
    0, 0, 0,
  ]),
]);

scene.animations = [idle, walk];

const exporter = new GLTFExporter();
const arrayBuffer = await exporter.parseAsync(scene, {
  binary: true,
  animations: scene.animations,
  trs: true,
  onlyVisible: true,
});

writeFileSync(output, Buffer.from(arrayBuffer));
console.log(`Wrote ${output}`);
