# overte-mcp Model Depot

Assets available for Overte entity spawning via `http://localhost:11110/models/`.

## Nekomimi-chan

| File | Size | Description |
|------|------|-------------|
| `Nekomimi-chan.glb` | 11.6 MB | VRM->GLB converted character with full armature + embedded MToon textures. Joint animation via `Entities.setJointRotation()`. |

**Spawn:** `overte_entity_spawn(name="Neko", type="Model", model_url="http://localhost:11110/models/Nekomimi-chan.glb", permanent=True)`

## Contemporary Living Room (World Labs Marble)

| File | Size | Description |
|------|------|-------------|
| `contemporary-living-room.glb` | 4.3 MB | Collider mesh (physics proxy geometry) |
| `contemporary-living-room_full.spz` | 66.8 MB | Full-res Gaussian splat (NGSP v2 compressed). Requires Splat->Mesh conversion for Overte. |
| `contemporary-living-room_pano.png` | 10.5 MB | 360 panorama. Use as sphere entity texture for skybox. |

**Spawn collider:** `overte_entity_spawn(name="Living Room Collider", type="Model", model_url="http://localhost:11110/models/contemporary-living-room.glb")`

**Spawn skybox (panorama):** Create a sphere entity with the pano as texture:
```javascript
Entities.addEntity({
    type: "Sphere",
    name: "Skybox",
    position: { x: 0, y: 0, z: 0 },
    dimensions: { x: 100, y: 100, z: 100 },
    texture: "http://localhost:11110/models/contemporary-living-room_pano.png"
});
```

**Full visual:** Open the Marble player in a Web entity:
`https://marble.worldlabs.ai/world/3f15df65-cae3-4fe9-8e94-422b557cc2d0`

## Conversion Pipelines

- **VRM->GLB:** `scripts/vrm_to_glb_converter.py` (Blender 4.4 headless)
- **SPZ->Mesh:** Requires blender-mcp with gsplat/CUDA, or the 3DGS Blender addon
- **SPZ viewer:** Marble Spark viewer (WebGL2) or SuperSplat desktop app
