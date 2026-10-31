// Test double for an Overte assignment-client agent script engine (NOT Overte).
// Provides Agent, Entities, EntityViewer, Script, Vec3 and WebSocket with Overte-like
// semantics, including "agents only see entities inside the EntityViewer query".
const src = await (await fetch(process.env.BRIDGE_URL)).text();
const world = new Map();       // id -> props (server truth)
const visible = new Set();     // ids the agent currently "sees"
let view = { pos: {x:0,y:0,z:0}, r: 0 };
let n = 0;
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
const Entities = {
  serversExist: () => true,
  canRez: () => true,
  addEntity(p) { const id = `{e${++n}}`; world.set(id, {...p, type: p.type}); visible.add(id); return id; },
  editEntity(id, p) { if (world.has(id)) Object.assign(world.get(id), p); },
  deleteEntity(id) { world.delete(id); visible.delete(id); },
  getEntityProperties(id, wanted) { if (!visible.has(id) || !world.has(id)) return { type: "Unknown" }; const e = world.get(id); if (!wanted || !wanted.length) return {...e}; const o = {}; for (const k of wanted) o[k] = e[k]; return o; },
  findEntities(c, r) { return [...visible].filter(id => world.has(id) && world.get(id).position && dist(world.get(id).position, c) <= r); },
};
const EntityViewer = {
  setPosition(p) { view.pos = p; }, setCenterRadius(r) { view.r = r; },
  queryOctree() { setTimeout(() => { for (const [id, e] of world) if (e.position && dist(e.position, view.pos) <= view.r) visible.add(id); }, 200); },
};
// an entity created "elsewhere" that the agent must discover via the viewer
world.set("{external}", { type: "Sphere", name: "external", position: {x: 500, y: 0, z: 0} });
const Script = { setTimeout, setInterval, clearInterval, scriptEnding: { connect() {} } };
const Agent = {};
globalThis.print = (m) => console.log(m);
new Function("Agent","Entities","EntityViewer","Script","WebSocket","Vec3", src)(Agent, Entities, EntityViewer, Script, WebSocket, {});
setTimeout(() => process.exit(0), 120000);
