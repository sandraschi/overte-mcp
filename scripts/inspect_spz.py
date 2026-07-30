"""Inspect Marble SPZ file - it's gzip compressed."""
import gzip
import io
import os
import struct

spz_path = os.path.join(os.path.dirname(__file__) or ".", "..", "models", "contemporary-living-room_full.spz")
spz_path = os.path.normpath(spz_path)

with gzip.open(spz_path, "rb") as f:
    data = f.read()

print(f"Decompressed size: {len(data)} bytes ({len(data)/(1024*1024):.1f} MB)")
print(f"First 16 bytes: {data[:16].hex()}")
print(f"First 32 chars: {data[:32]}")

# Check format
if data[:3] == b"spz":
    print(f"SPZ format, version byte: {data[3]}")
elif data[:4] == b"\x00\x00\x00\x00":
    print("Binary format starting with 4 null bytes")
    # Likely raw tensor data
    # Try to interpret as float32 array
    # gsplat saves: means (Nx3), features_dc (Nx1x3), features_rest (Nx...), opacities (Nx1), scales (Nx3), quats (Nx4)
    n = struct.unpack("I", data[4:8])[0]
    print(f"  Possible count: {n}")
    dtype = struct.unpack("I", data[8:12])[0]
    print(f"  Possible dtype: {dtype}")
elif data[:6] == b"NUMPY\x01":
    print("Numpy format")
    import numpy as np
    buf = io.BytesIO(data)
    arr = np.load(buf)
    print(f"  Shape: {arr.shape}, dtype: {arr.dtype}")
else:
    # Check if it's a pickle (Python object serialization)
    if data[:2] == b"\x80\x04":
        print("Python pickle format")
        import pickle
        obj = pickle.loads(data)
        print(f"  Type: {type(obj)}")
        if hasattr(obj, "keys"):
            for k in obj:
                v = obj[k]
                if hasattr(v, "shape"):
                    print(f"    {k}: {v.shape}")
                else:
                    print(f"    {k}: {type(v).__name__}")
    else:
        print(f"Unknown format. First 4 hex: {data[:4].hex()}")
        # Check for bson, msgpack, etc
        if data[:5] == b"\x89\x50\x4e\x47":
            print("  PNG image!")
