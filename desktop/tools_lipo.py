"""Minimal lipo: combine thin Mach-O files into one universal (fat) binary."""
import struct, sys
def thin_info(data):
    magic = struct.unpack('<I', data[:4])[0]
    assert magic == 0xFEEDFACF, 'expected 64-bit little-endian Mach-O'
    cputype, cpusub = struct.unpack('<iI', data[4:12])
    return cputype, cpusub & 0x00FFFFFF
def lipo(out, inputs, align=14):
    blobs = [open(p, 'rb').read() for p in inputs]
    n = len(blobs)
    off = 8 + 20 * n
    archs, body, cur = [], b'', off
    for b in blobs:
        a = 1 << align
        pad = (-cur) % a
        cur += pad
        body_pad = b'\0' * pad
        ct, cs = thin_info(b)
        archs.append(struct.pack('>iIIII', ct, cs, cur, len(b), align))
        body += body_pad + b
        cur += len(b)
    hdr = struct.pack('>II', 0xCAFEBABE, n) + b''.join(archs)
    with open(out, 'wb') as f:
        f.write(hdr + body)
if __name__ == '__main__':
    lipo(sys.argv[1], sys.argv[2:])
