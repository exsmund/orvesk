extends Control
## Resolution-independent resource silhouettes, shared by the header and cell counters.
var kind = "health"
var tint = Color.WHITE

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(queue_redraw)

func configure(resource: String, color: Color):
	kind = resource
	tint = color
	queue_redraw()

static func paint(canvas: CanvasItem, rect: Rect2, resource: String, color: Color):
	var shape = PackedVector2Array()
	if resource == "health":
		for i in 48:
			var t = TAU * i / 48
			var x = 16 * pow(sin(t), 3)
			var y = 13 * cos(t) - 5 * cos(2*t) - 2 * cos(3*t) - cos(4*t)
			shape.append(rect.position + Vector2((x + 16) / 32, (12 - y) / 29) * rect.size)
	else:
		for point in [Vector2(0.35,0), Vector2(0.95,0), Vector2(0.61,0.42), Vector2(0.89,0.42), Vector2(0.10,1), Vector2(0.35,0.57), Vector2(0.06,0.57)]:
			shape.append(rect.position + point * rect.size)
	canvas.draw_colored_polygon(shape, color)
	shape.append(shape[0])
	canvas.draw_polyline(shape, color.lightened(0.18), 0.65, true)

func _draw():
	var extent = minf(size.x, size.y)
	paint(self, Rect2((size - Vector2.ONE * extent) / 2, Vector2.ONE * extent), kind, tint)
