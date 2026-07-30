"""Blender headless VRM -> FBX converter.
Usage: set VRM_INPUT_PATH + FBX_OUTPUT_PATH env vars, then:
  blender --background --python scripts/vrm_to_fbx_converter.py
"""

import os
import sys

import bpy


def load_vrm_extension():
    """Load the VRM add-on extension using addon_utils."""
    ext_root = bpy.utils.user_resource("EXTENSIONS", path="user_default")
    vrm_dir = os.path.join(ext_root, "vrm")
    init_py = os.path.join(vrm_dir, "__init__.py")
    if not os.path.exists(init_py):
        print(f"VRM extension not found at {vrm_dir}")
        return False

    sys.path.insert(0, ext_root)

    # Use addon_utils to properly register the addon with preferences
    import addon_utils
    try:
        # First ensure the module is accessible
        # Enable via addon_utils which handles preferences
        addon_utils.enable("vrm", default_set=True, persistent=True)
        print("VRM addon enabled with preferences")
        return True
    except Exception as e:
        print(f"Failed to enable VRM addon: {e}")
        import traceback
        traceback.print_exc()
        return False


def convert_vrm_to_fbx(vrm_path: str, fbx_path: str):
    if not os.path.exists(vrm_path):
        print(f"ERROR: Input VRM not found: {vrm_path}")
        return False

    load_vrm_extension()

    # Clear scene
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    # Check what import ops are available
    import_ops = [op for op in dir(bpy.ops.import_scene) if not op.startswith("_")]
    print(f"Available import ops: {import_ops}")

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

    for obj in bpy.context.scene.objects:
        if obj.type == "ARMATURE":
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.mode_set(mode="POSE")
            bpy.ops.pose.select_all(action="SELECT")
            bpy.ops.pose.armature_apply(selected=False)
            bpy.ops.object.mode_set(mode="OBJECT")

    print(f"Exporting FBX: {fbx_path}")
    bpy.ops.export_scene.fbx(
        filepath=fbx_path,
        use_selection=False,
        add_leaf_bones=False,
        bake_anim=True,
        bake_anim_use_all_bones=True,
        bake_anim_use_nla_strips=False,
        bake_anim_use_all_actions=False,
        armature_nodetype="NULL",
        object_types={"ARMATURE", "MESH"},
        mesh_smooth_type="FACE",
        path_mode="AUTO",
        embed_textures=True,
    )
    print(f"Exported FBX: {fbx_path}")
    return True


if __name__ == "__main__":
    vrm_path = os.environ.get("VRM_INPUT_PATH", "")
    fbx_path = os.environ.get("FBX_OUTPUT_PATH", "")
    if not vrm_path or not fbx_path:
        print("Set VRM_INPUT_PATH and FBX_OUTPUT_PATH env vars")
    else:
        convert_vrm_to_fbx(vrm_path, fbx_path)
