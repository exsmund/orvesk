extends Control
## Stretch only the rails. The textured center ornament always keeps its aspect/size.
const TEXTURE = preload("res://content/ui/header-divider-v1.png")
const ORNAMENT_HEIGHT = 12.0
var diamond_rect = Rect2()

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	resized.connect(queue_redraw)

func _draw():
	# The original transparent atlas is 2164 x 727. Its rail crosses y=349,
	# with the complete center ornament inside x=982..1182, y=272..426.
	# Normalized regions remain valid if the delivery import is downscaled.
	var source = Vector2(TEXTURE.get_size())
	var band = Rect2(Vector2(0, 272.0 / 727.0) * source, Vector2(1, 154.0 / 727.0) * source)
	var left = source.x * 982.0 / 2164.0
	var right = source.x * 1182.0 / 2164.0
	var height = minf(ORNAMENT_HEIGHT, size.y)
	var width = height * 200.0 / 154.0
	diamond_rect = Rect2((size - Vector2(width, height)) / 2, Vector2(width, height))
	var rail_width = maxf(0, (size.x - width) / 2)
	draw_texture_rect_region(TEXTURE, Rect2(0, diamond_rect.position.y, rail_width, height), Rect2(0, band.position.y, left, band.size.y))
	draw_texture_rect_region(TEXTURE, diamond_rect, Rect2(left, band.position.y, right - left, band.size.y))
	draw_texture_rect_region(TEXTURE, Rect2(diamond_rect.end.x, diamond_rect.position.y, rail_width, height), Rect2(right, band.position.y, source.x - right, band.size.y))
