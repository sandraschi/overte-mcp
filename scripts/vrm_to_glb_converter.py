"""Blender headless VRM -> GLB converter.
Usage: set VRM_INPUT_PATH + GLB_OUTPUT_PATH env vars, then:
  blender --background --python scripts/vrm_to_glb_converter.py

Uses glTF/GLB export instead of FBX because:
- VRM is built on glTF (MToon shaders, textures, armature all designed for glTF)
- FBX loses MToon textures and material assignments
- Overte supports glTF natively as Model entities
- GLB embeds all textures in a single file
"""

import os
import sys

import bpy


def load_vrm_extension():
    ext_root = bpy.utils.user_resource("EXTENSIONS", path="user_default")
    sys.path.insert(0, ext_root)
    import addon_utils

    try:
        addon_utils.enable("vrm", default_set=True, persistent=True)
        print("VRM addon enabled with preferences")
        return True
    except Exception as e:
        print(f"Failed to enable VRM addon: {e}")
        import traceback

        traceback.print_exc()
        return False


def convert_vrm_to_glb(vrm_path: str, glb_path: str):
    if not os.path.exists(vrm_path):
        print(f"ERROR: Input VRM not found: {vrm_path}")
        return False

    if not load_vrm_extension():
        return False

    # Aggressively clear ALL objects across all collections
    for coll in bpy.data.collections:
        for obj in coll.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    # Also clear any objects not in collections
    for obj in bpy.context.scene.objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    # Remove orphaned mesh/material/image data
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)
    for block in bpy.data.images:
        bpy.data.images.remove(block)

    # Import VRM
    print(f"Importing VRM: {vrm_path}")
    try:
        bpy.ops.import_scene.vrm(filepath=vrm_path)
    except Exception as e:
        print(f"VRM import failed: {e}")
        return False

    print(f"Imported. Objects: {len(bpy.context.scene.objects)}")
    has_armature = False
    for obj in bpy.context.scene.objects:
        print(f"  Object: {obj.name}, type: {obj.type}")
        if obj.type == "ARMATURE":
            has_armature = True

    if not has_armature:
        print("WARNING: No armature found in VRM model")

    # Select only armature + mesh objects for export
    for obj in bpy.context.scene.objects:
        if obj.type in {"ARMATURE", "MESH"}:
            obj.select_set(True)
        else:
            obj.select_set(False)

    # Apply rest pose to armature
    for obj in bpy.context.scene.objects:
        if obj.type == "ARMATURE":
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.mode_set(mode="POSE")
            bpy.ops.pose.select_all(action="SELECT")
            bpy.ops.pose.armature_apply(selected=False)
            bpy.ops.object.mode_set(mode="OBJECT")

    print(f"Exporting GLB: {glb_path}")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_image_format="AUTO",
        export_texcoords=True,
        export_materials="EXPORT",
        export_yup=True,
        export_apply=True,
        export_animations=False,
        export_skins=True,
        export_all_influences=False,
    )
    print(f"Exported GLB: {glb_path}")
    return True


if __name__ == "__main__":
    vrm_path = os.environ.get("VRM_INPUT_PATH", "")
    glb_path = os.environ.get("GLB_OUTPUT_PATH", "")
    if not vrm_path or not glb_path:
        print("Set VRM_INPUT_PATH and GLB_OUTPUT_PATH env vars")
    else:
        convert_vrm_to_glb(vrm_path, glb_path)
