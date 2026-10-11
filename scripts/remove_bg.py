import sys
from PIL import Image
from collections import deque

def remove_white_background(input_path, output_path, tolerance=235):
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()

    # Outer background detection using BFS from image borders
    visited = [[False] * w for _ in range(h)]
    is_outer_bg = [[False] * w for _ in range(h)]
    queue = deque()

    def is_white_like(r, g, b):
        diff = max(r, g, b) - min(r, g, b)
        return min(r, g, b) >= tolerance and diff < 25

    for x in range(w):
        for y in [0, h - 1]:
            r, g, b, _ = pixels[x, y]
            if is_white_like(r, g, b):
                queue.append((x, y))
                visited[y][x] = True
    for y in range(h):
        for x in [0, w - 1]:
            if not visited[y][x]:
                r, g, b, _ = pixels[x, y]
                if is_white_like(r, g, b):
                    queue.append((x, y))
                    visited[y][x] = True

    while queue:
        cx, cy = queue.popleft()
        is_outer_bg[cy][cx] = True
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                visited[ny][nx] = True
                r, g, b, _ = pixels[nx, ny]
                if is_white_like(r, g, b):
                    queue.append((nx, ny))

    for y in range(h):
        for x in range(w):
            if is_outer_bg[y][x]:
                r, g, b, _ = pixels[x, y]
                brightness = (r + g + b) / 3.0
                if brightness >= 248:
                    pixels[x, y] = (r, g, b, 0)
                elif brightness >= tolerance:
                    alpha = int(255 * (1.0 - (brightness - tolerance) / (248.0 - tolerance)))
                    pixels[x, y] = (r, g, b, alpha)

    # Resize cleanly to 256x256
    img = img.resize((256, 256), Image.Resampling.LANCZOS)
    img.save(output_path, "PNG")
    print(f"Saved: {output_path} (256x256, transparent)")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        remove_white_background(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python3 remove_bg.py input.png output.png")
