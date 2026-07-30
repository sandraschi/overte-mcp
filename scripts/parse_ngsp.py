"""Parse NGSP v2 binary format from Marble SPZ file and export as standard PLY."""

import gzip
import os
import struct

import numpy as np


def read_ngsp_v2(filepath):
    """Parse NGSP v2 format and return splat parameter tensors."""
    with gzip.open(filepath, "rb") as f:
        magic = f.read(4)
        version = struct.unpack("I", f.read(4))[0]
        print(f"Magic: {magic}, Version: {version}")
        assert magic == b"NGSP", f"Not NGSP: {magic}"
        assert version == 2, f"Only v2 supported, got {version}"

        remaining = f.read()

    print(f"Data after header: {len(remaining)} bytes")
    print(f"First 64 bytes hex: {remaining[:64].hex()}")

    # NGSP v2 format: each section has a 24-byte descriptor
    # offset 0-3: type tag (4 chars padded with nulls)
    # offset 4-7: element size in bytes per value
    # offset 8-11: number of elements
    # offset 12-15: data length in bytes (total)
    # offset 16-23: reserved/padding
    # offset 24+: data

    pos = 0
    sections = {}
    while pos < len(remaining):
        if pos + 24 > len(remaining):
            print(f"Truncated descriptor at offset {pos}")
            break

        tag = remaining[pos : pos + 4].rstrip(b"\x00").decode("ascii", errors="replace")
        elem_size = struct.unpack("I", remaining[pos + 4 : pos + 8])[0]
        num_elems = struct.unpack("I", remaining[pos + 8 : pos + 12])[0]
        data_len = struct.unpack("I", remaining[pos + 12 : pos + 16])[0]

        data_start = pos + 24
        data_end = data_start + data_len

        print(f"  Section '{tag}': elem_size={elem_size}, count={num_elems}, data_len={data_len}")

        if data_end > len(remaining):
            print(f"    Truncated data, only {len(remaining) - data_start} bytes available")
            break

        raw_data = remaining[data_start:data_end]

        if tag == "pos0":
            sections["means"] = np.frombuffer(raw_data, dtype=np.float32).reshape(-1, 3)
            print(f"    means: {sections['means'].shape}")
        elif tag == "f_dc":
            sections["f_dc"] = np.frombuffer(raw_data, dtype=np.float16).reshape(-1, 3, 3)
            print(f"    f_dc: {sections['f_dc'].shape}")
        elif tag == "opac":
            sections["opacities"] = np.frombuffer(raw_data, dtype=np.float16)
            print(f"    opacities: {sections['opacities'].shape}")
        elif tag == "scal":
            sections["scales"] = np.frombuffer(raw_data, dtype=np.float16).reshape(-1, 3)
            print(f"    scales: {sections['scales'].shape}")
        elif tag == "quat":
            sections["quats"] = np.frombuffer(raw_data, dtype=np.float16).reshape(-1, 4)
            print(f"    quats: {sections['quats'].shape}")
        elif tag == "f_res":
            sections["f_rest"] = np.frombuffer(raw_data, dtype=np.float16).reshape(num_elems, -1)
            print(f"    f_rest: {sections['f_rest'].shape}")
        else:
            print(f"    UNKNOWN section, first 16 data bytes: {raw_data[:16].hex()}")

        pos = data_end

    return sections


def splats_to_ply(sections, output_path):
    """Write standard 3DGS PLY file from splat parameters."""
    means = sections.get("means")
    f_dc = sections.get("f_dc")
    f_rest = sections.get("f_rest")
    opacities = sections.get("opacities")
    scales = sections.get("scales")
    quats = sections.get("quats")

    if means is None:
        print("No means found, cannot export")
        return False

    N = means.shape[0]
    print(f"Exporting {N} splats to {output_path}")

    # Build structured array for PLY
    dtype_list = [
        ("x", "f4"),
        ("y", "f4"),
        ("z", "f4"),
        ("nx", "f4"),
        ("ny", "f4"),
        ("nz", "f4"),
    ]
    if f_dc is not None:
        for j in range(3):
            dtype_list.append((f"f_dc_{j}", "f4"))
    if f_rest is not None:
        k = f_rest.shape[1]
        for j in range(k):
            dtype_list.append((f"f_rest_{j}", "f4"))
    dtype_list.append(("opacity", "f4"))
    if scales is not None:
        for j in range(3):
            dtype_list.append((f"scale_{j}", "f4"))
    if quats is not None:
        for j in range(4):
            dtype_list.append((f"rot_{j}", "f4"))

    arr = np.zeros(N, dtype=dtype_list)
    arr["x"] = means[:, 0]
    arr["y"] = means[:, 1]
    arr["z"] = means[:, 2]
    arr["nx"] = 0
    arr["ny"] = 0
    arr["nz"] = 0

    if f_dc is not None:
        arr["f_dc_0"] = f_dc[:, 0, 0]
        arr["f_dc_1"] = f_dc[:, 1, 0]
        arr["f_dc_2"] = f_dc[:, 2, 0]
    if f_rest is not None:
        k = f_rest.shape[1]
        for j in range(k):
            arr[f"f_rest_{j}"] = f_rest[:, j]
    if opacities is not None:
        arr["opacity"] = opacities
    if scales is not None:
        arr["scale_0"] = scales[:, 0]
        arr["scale_1"] = scales[:, 1]
        arr["scale_2"] = scales[:, 2]
    if quats is not None:
        arr["rot_0"] = quats[:, 0]
        arr["rot_1"] = quats[:, 1]
        arr["rot_2"] = quats[:, 2]
        arr["rot_3"] = quats[:, 3]

    # Write PLY header
    with open(output_path, "wb") as f:
        f.write(b"ply\n")
        f.write(b"format binary_little_endian 1.0\n")
        f.write(f"element vertex {N}\n".encode())
        for name, fmt in dtype_list:
            f.write(f"property {fmt} {name}\n".encode())
        f.write(b"end_header\n")
        f.write(arr.tobytes())

    print(f"Wrote {output_path}")
    return True


if __name__ == "__main__":
    spz_path = os.environ.get("SPLAT_INPUT_PATH", "")
    ply_path = os.environ.get("PLY_OUTPUT_PATH", "")
    if not spz_path:
        spz_path = os.path.join(
            os.path.dirname(__file__) or ".", "..", "models", "contemporary-living-room_full.spz"
        )
    if not ply_path:
        ply_path = os.path.join(
            os.path.dirname(__file__) or ".", "..", "models", "contemporary-living-room_raw.ply"
        )

    sections = read_ngsp_v2(os.path.normpath(spz_path))
    print(f"\nSections found: {list(sections.keys())}")

    if sections.get("means") is not None:
        splats_to_ply(sections, os.path.normpath(ply_path))
