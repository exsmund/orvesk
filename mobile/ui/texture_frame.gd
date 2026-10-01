extends Control
## Nine-slice frame with independent source/destination corners; ornaments never stretch.
const DEFAULT_TEXTURE = preload("res://content/ui/gothic-frame.png")
## Include the entire corner ornament, including the diamonds on the side strips.
const SOURCE_CORNER_RATIO = 0.24
var texture: Texture2D
var corner = 12.0

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(queue_redraw)

func configure(_data, edge: float = 12, source_texture: Texture2D = DEFAULT_TEXTURE):
	texture = source_texture
	corner = edge
	queue_redraw()

func _draw():
	if not texture: return
	var source = Vector2(texture.get_size())
	var cut = source * SOURCE_CORNER_RATIO
	var edge = minf(corner, minf(size.x, size.y) / 2)
	var xs = [0.0, edge, size.x - edge, size.x]
	var ys = [0.0, edge, size.y - edge, size.y]
	var sx = [0.0, cut.x, source.x - cut.x, source.x]
	var sy = [0.0, cut.y, source.y - cut.y, source.y]
	for y in 3:
		for x in 3:
			if x == 1 and y == 1: continue
			draw_texture_rect_region(texture, Rect2(xs[x], ys[y], xs[x + 1] - xs[x], ys[y + 1] - ys[y]), Rect2(sx[x], sy[y], sx[x + 1] - sx[x], sy[y + 1] - sy[y]))
