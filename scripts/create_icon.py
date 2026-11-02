"""
Creates a cybernetic ULTRON icon (.png and .ico) using standard library (zlib, struct).
Zero external dependencies required.
"""
import os
import zlib
import struct

def create_png(width, height):
    # RGBA image buffer
    raw_data = bytearray()
    cx, cy = width / 2.0, height / 2.0
    r_outer = width * 0.45
    r_mid = width * 0.32
    r_core = width * 0.15

    for y in range(height):
        raw_data.append(0)  # Filter type 0 (None)
        for x in range(width):
            dx = x - cx
            dy = y - cy
            dist = (dx * dx + dy * dy) ** 0.5

            if dist > r_outer:
                # Transparent outside
                raw_data.extend((0, 0, 0, 0))
            elif dist > r_outer - 4:
                # Outer ring edge (Crimson / Rose)
                raw_data.extend((244, 63, 94, 255))
            elif dist > r_mid:
                # Cybernetic dark slate background
                raw_data.extend((9, 13, 22, 255))
            elif dist > r_mid - 4:
                # Middle ring (Cyan glow)
                raw_data.extend((6, 182, 212, 255))
            elif dist > r_core:
                # Inner chassis
                raw_data.extend((15, 23, 42, 255))
            elif dist > r_core - 4:
                # Core border (Rose)
                raw_data.extend((225, 29, 72, 255))
            else:
                # Energy core (Glowing White/Red gradient)
                glow = int(255 * (1.0 - (dist / r_core)))
                raw_data.extend((255, min(255, 60 + glow), min(255, 100 + glow), 255))

    # PNG chunks
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), level=9))
    iend = chunk(b'IEND', b'')

    return header + ihdr + idat + iend

def create_ico(png_bytes, width, height):
    # Modern Windows Vista+ ICO with embedded PNG data
    # ICONDIR (6 bytes): reserved=0, type=1 (ico), count=1
    icondir = struct.pack('<HHH', 0, 1, 1)
    # ICONDIRENTRY (16 bytes)
    # bWidth, bHeight (0 means 256), bColorCount, bReserved, wPlanes(1), wBitCount(32), dwBytesInRes, dwImageOffset
    w_byte = 0 if width >= 256 else width
    h_byte = 0 if height >= 256 else height
    offset = 6 + 16
    direntry = struct.pack('<BBBBHHII', w_byte, h_byte, 0, 0, 1, 32, len(png_bytes), offset)
    return icondir + direntry + png_bytes

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'public')
    os.makedirs(public_dir, exist_ok=True)

    png_data = create_png(256, 256)
    png_path = os.path.join(public_dir, 'icon.png')
    with open(png_path, 'wb') as f:
        f.write(png_data)
    print(f"Generated {png_path}")

    ico_data = create_ico(png_data, 256, 256)
    ico_path = os.path.join(public_dir, 'icon.ico')
    with open(ico_path, 'wb') as f:
        f.write(ico_data)
    print(f"Generated {ico_path}")

if __name__ == '__main__':
    main()
