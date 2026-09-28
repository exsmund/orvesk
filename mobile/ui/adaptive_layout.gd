extends RefCounted
## Geometry in logical UI units; never uses a device/model-specific resolution.
const WIDE_AT = 640.0
const GUTTER = 18.0
const PADDING = 18
const HEADER_HEIGHT = 132.0
const CONTENT_GAP = 12.0
const COMBAT_FOOTER_HEIGHT = 78.0

static func columns(width: float) -> int:
	return 2 if width >= WIDE_AT else 1

static func battle_body_height(height: float) -> float:
	return maxf(0, height - HEADER_HEIGHT - COMBAT_FOOTER_HEIGHT - CONTENT_GAP * 2)

static func content_width(available: Vector2) -> float:
	if columns(available.x) == 1: return available.x
	# The same two square lanes as combat, with room for its header and footer.
	# Retain the wide breakpoint even in unusually short embedded windows.
	return minf(available.x, maxf(WIDE_AT, battle_body_height(available.y) * 2 + CONTENT_GAP))

static func content_rect(available: Vector2) -> Rect2:
	var width = floorf(content_width(available))
	return Rect2(Vector2(floorf((available.x - width) / 2), 0), Vector2(width, available.y))

static func board_extent(width: float, height: float, remaining_height: float = -1.0) -> float:
	var lane = (width - GUTTER) / 2.0 if columns(width) == 2 else width
	# On a wide screen keep the board and its controls within the visible height.
	var limit = 460.0 if columns(width) == 2 else clampf(height * 0.34, 246.0, 360.0)
	if columns(width) == 2 and remaining_height >= 0:
		limit = clampf(remaining_height, 246.0, limit)
	return floorf(clampf(lane, 246.0, limit))

static func safe_margins(logical_size: Vector2, window_pixels: Rect2, safe_pixels: Rect2) -> Dictionary:
	var margins = {"left": PADDING, "top": PADDING, "right": PADDING, "bottom": PADDING}
	if window_pixels.size.x <= 0 or window_pixels.size.y <= 0 or not safe_pixels.has_area(): return margins
	var safe = window_pixels.intersection(safe_pixels)
	if not safe.has_area(): return margins
	var scale = logical_size / window_pixels.size
	var leading = (safe.position - window_pixels.position) * scale
	var trailing = (window_pixels.end - safe.end) * scale
	margins.left = maxi(PADDING, ceili(leading.x) + 8)
	margins.top = maxi(PADDING, ceili(leading.y) + 8)
	margins.right = maxi(PADDING, ceili(trailing.x) + 8)
	margins.bottom = maxi(PADDING, ceili(trailing.y) + 8)
	return margins
