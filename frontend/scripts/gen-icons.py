#!/usr/bin/env python3
"""Generate PWA icons with the real Apple emoji using CoreText via macOS."""
import subprocess, os, sys

os.makedirs("../public", exist_ok=True)

SIZES = [
    ("../public/icon-512.png", 512),
    ("../public/icon-192.png", 192),
    ("../public/apple-touch-icon.png", 180),
    ("../public/favicon.png", 32),
]

# Use Swift + NSAttributedString to render the emoji using Apple Color Emoji
swift = r"""
import AppKit

let emoji = "🥕"
let baseSize: CGFloat = 512
let padding: CGFloat = baseSize * 0.08

let sizes: [(String, CGFloat)] = [
    ("../public/icon-512.png", 512),
    ("../public/icon-192.png", 192),
    ("../public/apple-touch-icon.png", 180),
    ("../public/favicon.png", 32),
]

for (path, size) in sizes {
    let fontSize = size * 0.72
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(size), pixelsHigh: Int(size),
        bitsPerSample: 8, samplesPerPixel: 4,
        hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0, bitsPerPixel: 0
    )!
    let ctx = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = ctx

    // Cream/ivory background
    NSColor(red: 0.98, green: 0.96, blue: 0.91, alpha: 1.0).setFill()
    NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: size, height: size),
                 xRadius: size * 0.22, yRadius: size * 0.22).fill()

    // Draw emoji
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont(name: "AppleColorEmoji", size: fontSize) ?? NSFont.systemFont(ofSize: fontSize)
    ]
    let str = NSAttributedString(string: emoji, attributes: attrs)
    let strSize = str.size()
    let x = (size - strSize.width) / 2
    let y = (size - strSize.height) / 2
    str.draw(at: NSPoint(x: x, y: y))

    NSGraphicsContext.restoreGraphicsState()

    let data = rep.representation(using: .png, properties: [:])!
    try! data.write(to: URL(fileURLWithPath: path))
    print("✓ \(path)")
}
"""

script_path = "/tmp/gen_icons.swift"
with open(script_path, "w") as f:
    f.write(swift)

result = subprocess.run(["swift", script_path], capture_output=True, text=True)
if result.returncode != 0:
    print("Swift error:", result.stderr)
    sys.exit(1)
print(result.stdout)
print("Done!")
