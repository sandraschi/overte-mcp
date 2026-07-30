"""Convert Marble SPZ (NGSP v2 compressed Gaussian Splat) to textured GLB mesh.

Pipeline:
1. Decompress gzip wrapper
2. Parse NGSP v2 binary format (splat positions, colors, opacities)
3. Filter visible points, sample, triangulate via scipy
4. Export as textured GLB

Usage: set SPLAT_INPUT_PATH + GLB_OUTPUT_PATH env vars, then:
  uv run python scripts/splat_to_glb_converter.py
"""

import gzip
import os
import struct

import numpy as np


def _read_ngsp_section(f):
    """Read one NGSP section: type(4) + length(4) + data(length)."""
    type_tag = f.read(4)
    if len(type_tag) < 4:
        return None, None
    length = struct.unpack("I", f.read(4))[0]
    data = f.read(length)
    return type_tag, data


def read_ngsp(filepath):
    """Parse NGSP v2 format and return splat data as numpy arrays."""
    with gzip.open(filepath, "rb") as f:
        magic = f.read(4)
        if magic != b"NGSP":
            raise ValueError(f"Not NGSP format: {magic}")

        version = struct.unpack("I", f.read(4))[0]
        print(f"NGSP version: {version}")

        positions = None
        features_dc = None
        opacities = None
        scales = None
        quats = None

        while True:
            tag, data = _read_ngsp_section(f)
            if tag is None:
                break

            if tag == b"pos\x00\x00":
                positions = np.frombuffer(data, dtype=np.float32).reshape(-1, 3).copy()
                print(f"  positions: {positions.shape}")
            elif tag == b"f_dc":
                features_dc = np.frombuffer(data, dtype=np.float16).reshape(-1, 3, 3).copy()
                print(f"  features_dc: {features_dc.shape}")
            elif tag == b"opac":
                opacities = np.frombuffer(data, dtype=np.float16).copy()
                print(f"  opacities: {opacities.shape}")
            elif tag == b"scal":
                scales = np.frombuffer(data, dtype=np.float16).reshape(-1, 3).copy()
                print(f"  scales: {scales.shape}")
            elif tag == b"quat":
                quats = np.frombuffer(data, dtype=np.float16).reshape(-1, 4).copy()
                print(f"  quats: {quats.shape}")
            else:
                print(f"  unknown section: {tag}, len={len(data)}")

    # SH DC features -> RGB colors via spherical harmonics order 0
    def sh_to_rgb(sh):
        """Extract RGB from SH DC component (first channel)."""
        return 0.5 + sh[:, 0, :] * 0.5  # SH DC is [-1, 1], remap to [0, 1]

    colors = sh_to_rgb(features_dc.astype(np.float32)) if features_dc is not None else None
    opacities = opacities.astype(np.float32) if opacities is not None else None
    scales = scales.astype(np.float32) if scales is not None else None
    quats = quats.astype(np.float32) if quats is not None else None

    return {
        "positions": positions,
        "colors": colors,
        "opacities": opacities,
        "scales": scales,
        "quats": quats,
    }


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def splat_to_mesh(positions, colors, opacities, subsample=50, opacity_threshold=0.05):
    """Filter gaussian splat point cloud and create mesh via Delaunay."""
    from scipy.spatial import Delaunay

    mask = opacities > opacity_threshold
    pts = positions[mask]
    cols = colors[mask] if colors is not None else None
    print(f"After opacity filter: {pts.shape[0]} / {positions.shape[0]} points")

    pts = pts[::subsample]
    if cols is not None:
        cols = cols[::subsample]
    print(f"After subsample ({subsample}x): {pts.shape[0]} points")

    if pts.shape[0] < 1000:
        print("Too few points for mesh, adjusting...")
        return None, None, None

    # Project to XZ plane and triangulate
    xy = pts[:, [0, 2]]
    tri = Delaunay(xy)
    triangles = tri.simplices

    print(f"Triangles: {triangles.shape[0]}")
    return pts, cols, triangles


def export_glb(verts, colors, triangles, output_path):
    import trimesh

    if colors is not None:
        vertex_colors = (np.clip(colors, 0, 1) * 255).astype(np.uint8)
    else:
        vertex_colors = np.ones((len(verts), 3), dtype=np.uint8) * 128

    mesh = trimesh.Trimesh(
        vertices=verts,
        faces=triangles,
        vertex_colors=vertex_colors,
    )
    mesh.export(output_path, file_type="glb")
    print(f"Exported: {output_path} ({len(mesh.vertices)} verts, {len(mesh.faces)} faces)")


def convert(splat_path, glb_path):
    print(f"Reading: {splat_path}")
    data = read_ngsp(splat_path)

    verts, colors, triangles = splat_to_mesh(
        data["positions"], data["colors"], data["opacities"],
        subsample=50, opacity_threshold=0.05,
    )
    if verts is None:
        print("Mesh generation failed, trying with lower subsample...")
        verts, colors, triangles = splat_to_mesh(
            data["positions"], data["colors"], data["opacities"],
            subsample=10, opacity_threshold=0.01,
        )
    if verts is not None:
        os.makedirs(os.path.dirname(glb_path) or ".", exist_ok=True)
        export_glb(verts, colors, triangles, glb_path)
    else:
        print("Cannot generate mesh from this splat.")


if __name__ == "__main__":
    sp = os.environ.get("SPLAT_INPUT_PATH", "")
    gp = os.environ.get("GLB_OUTPUT_PATH", "")
    if not sp or not gp:
        print("Set SPLAT_INPUT_PATH and GLB_OUTPUT_PATH env vars")
    else:
        convert(sp, gp)
