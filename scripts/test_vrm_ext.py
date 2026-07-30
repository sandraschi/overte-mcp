"""Test VRM extension loading and list import operators."""

import os

import bpy

ext_root = bpy.utils.user_resource("EXTENSIONS", path="user_default")
print(f"Ext root: {ext_root}")

# Check vrm extension dir
vrm_dir = os.path.join(ext_root, "vrm")
print(f"VRM dir exists: {os.path.exists(vrm_dir)}")
if os.path.exists(vrm_dir):
    for fn in os.listdir(vrm_dir):
        print(f"  {fn}")

# Try to install/enable the vrm package
try:
    bpy.ops.extensions.package_install_files(
        files=[{"name": "vrm"}],
        repo="user_default",
    )
    print("Package installed")
except Exception as e:
    print(f"Install error: {e}")

# List import operators after
print("\nImport operators:")
for op_name in sorted(dir(bpy.ops.import_scene)):
    print(f"  {op_name}")
