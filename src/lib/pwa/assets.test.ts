import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Png = {
  width: number;
  height: number;
  colorType: 2 | 6;
  bytesPerPixel: 3 | 4;
  pixels: Uint8Array;
};

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const diagonalDistance = Math.abs(estimate - upperLeft);

  return leftDistance <= aboveDistance && leftDistance <= diagonalDistance
    ? left
    : aboveDistance <= diagonalDistance
      ? above
      : upperLeft;
}

function readPng(path: string): Png {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const compressed: Buffer[] = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === "IDAT") compressed.push(data);
    offset += length + 12;
  }

  expect(bitDepth).toBe(8);
  if (colorType !== 2 && colorType !== 6) {
    throw new Error(
      `Unsupported PNG color type ${colorType}; expected RGB (2) or RGBA (6).`,
    );
  }
  expect(compressed.length).toBeGreaterThan(0);

  const bytesPerPixel = colorType === 2 ? 3 : 4;
  const raw = inflateSync(Buffer.concat(compressed));
  const stride = width * bytesPerPixel;
  const expectedRawLength = (stride + 1) * height;
  expect(raw.length).toBe(expectedRawLength);

  const pixels = new Uint8Array(stride * height);
  let sourceOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = raw[sourceOffset++];
    const rowOffset = row * stride;

    for (let column = 0; column < stride; column += 1) {
      const encoded = raw[sourceOffset++];
      const left =
        column >= bytesPerPixel
          ? pixels[rowOffset + column - bytesPerPixel]
          : 0;
      const above = row > 0 ? pixels[rowOffset + column - stride] : 0;
      const upperLeft =
        row > 0 && column >= bytesPerPixel
          ? pixels[rowOffset + column - stride - bytesPerPixel]
          : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? above
              : filter === 3
                ? Math.floor((left + above) / 2)
                : filter === 4
                  ? paeth(left, above, upperLeft)
                  : -1;

      if (predictor < 0) throw new Error(`Unsupported PNG filter ${filter}.`);
      pixels[rowOffset + column] = (encoded + predictor) & 255;
    }
  }

  return { width, height, colorType, bytesPerPixel, pixels };
}

function attributes(element: string): Map<string, string> {
  return new Map(
    [...element.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(
      ([, name, value]) => [name.toLowerCase(), value],
    ),
  );
}

const assets = [
  ["public/icons/tracktv-192.png", 192],
  ["public/icons/tracktv-512.png", 512],
  ["public/icons/tracktv-maskable-512.png", 512],
  ["public/icons/apple-touch-icon-180.png", 180],
] as const;

describe("TrackTV application icon assets", () => {
  it.each(assets)("validates %s dimensions and full opacity", (path, size) => {
    const png = readPng(path);
    expect(png.width).toBe(size);
    expect(png.height).toBe(size);

    if (png.colorType === 6) {
      for (let index = 3; index < png.pixels.length; index += 4) {
        expect(png.pixels[index]).toBe(255);
      }
    }

    expect([...png.pixels.subarray(0, 3)]).toEqual([15, 106, 92]);
    expect(png.pixels.length).toBe(
      png.width * png.height * png.bytesPerPixel,
    );
  });

  it("retains a portable exact-color SVG source without external content", () => {
    const source = readFileSync(
      "public/icons/tracktv-icon-source.svg",
      "utf8",
    );
    const rootMatch = source.match(/<svg\b[^>]*>/i);

    expect(rootMatch).not.toBeNull();
    const root = attributes(rootMatch?.[0] ?? "");
    expect(root.get("width")).toBe("1024");
    expect(root.get("height")).toBe("1024");

    const rectangles = [...source.matchAll(/<rect\b[^>]*\/?>/gi)].map(
      ([element]) => attributes(element),
    );
    const background = rectangles.find(
      (rectangle) =>
        rectangle.get("width") === "1024" &&
        rectangle.get("height") === "1024" &&
        (rectangle.get("x") === undefined || rectangle.get("x") === "0") &&
        (rectangle.get("y") === undefined || rectangle.get("y") === "0"),
    );

    expect(background).toBeDefined();
    expect(background?.get("fill")).toBe("#0f6a5c");
    expect(background?.has("rx")).toBe(false);
    expect(background?.has("ry")).toBe(false);
    expect(source).toMatch(/(?:fill|stroke)\s*=\s*["']#fffaf2["']/i);

    expect(source).not.toMatch(/<image\b/i);
    expect(source).not.toMatch(/<script\b|<foreignObject\b|<text\b/i);
    expect(source).not.toMatch(/\b(?:href|xlink:href)\s*=/i);
    expect(source).not.toMatch(/url\s*\(/i);
  });
});
