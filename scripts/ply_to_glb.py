"""Blender headless PLY (3D Gaussian Splat) -> GLB converter.

Usage: set PLY_INPUT_PATH + GLB_OUTPUT_PATH env vars, then:
  blender --background --python scripts/ply_to_glb.py

Requires: ReshotAI 3DGS Blender addon installed (for import),
or uses standard PLY import as fallback.
"""

import os

import bpy


def convert_ply_to_glb(ply_path, glb_path):
    if not os.path.exists(ply_path):
        print(f"ERROR: PLY not found: {ply_path}")
        return False

    # Clear scene
    for coll in bpy.data.collections:
        for obj in coll.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in bpy.context.scene.objects:
        bpy.data.objects.remove(obj, do_unlink=True)

    # Try 3DGS addon import operator, fall back to standard PLY
    imported = False
    for op_name in ["object.import_gaussian_splatting", "import_mesh.ply"]:
        try:
            if op_name == "object.import_gaussian_splatting":
                # Addon from ReshotAI: bl_idname = "object.import_gaussian_splatting"
                bpy.ops.object.import_gaussian_splatting(filepath=ply_path)
            else:
                bpy.ops.import_mesh.ply(filepath=ply_path)
            print(f"Imported via {op_name}")
            imported = True
            break
        except Exception as e:
            print(f"{op_name} failed: {e}")

    if not imported:
        print("Could not import PLY")
        return False

    print(f"Objects: {len(bpy.context.scene.objects)}")
    for obj in bpy.context.scene.objects:
        print(f"  {obj.name}: {obj.type}")

    # Select all importable objects and export as GLB
    bpy.ops.object.select_all(action="SELECT")

    print(f"Exporting GLB: {glb_path}")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_apply=True,
        export_image_format="AUTO",
    )
    print(f"Exported: {glb_path}")
    return True


if __name__ == "__main__":
    ply_path = os.environ.get("PLY_INPUT_PATH", "")
    glb_path = os.environ.get("GLB_OUTPUT_PATH", "")
    if not ply_path or not glb_path:
        print("Set PLY_INPUT_PATH and GLB_OUTPUT_PATH env vars")
        print("  PLY_INPUT_PATH: path to .ply file")
        print("  GLB_OUTPUT_PATH: output .glb path")
    else:
        convert_ply_to_glb(ply_path, glb_path)
