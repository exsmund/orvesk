extends BaseButton
## Simple native line icons remain crisp on both Fold screens. Names are tooltips only.
var kind = 0
var underline = preload("res://ui/textured_divider.gd").new()
var palette

func configure(data, index: int, caption: String):
	palette = data
	add_child(underline)
	underline.configure(data)
	kind = index
	tooltip_text = caption
	focus_mode = Control.FOCUS_ALL
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	resized.connect(queue_redraw)
	toggled.connect(func(_value): queue_redraw())
	mouse_entered.connect(queue_redraw)
	mouse_exited.connect(queue_redraw)
	focus_entered.connect(queue_redraw)
	focus_exited.connect(queue_redraw)

func _draw():
	if not palette: return
	var tint = palette.color("text-highlight" if button_pressed or is_hovered() or has_focus() else "text-home")
	var extent = minf(30 * size.y / 64, minf(size.x, size.y) * 0.52)
	var origin = (size - Vector2.ONE * extent) / 2
	draw_set_transform(origin, 0, Vector2.ONE * extent / 30)
	match kind:
		0:
			draw_arc(Vector2(15, 8), 5, 0, TAU, 24, tint, 1.7, true)
			draw_arc(Vector2(15, 29), 11, PI, TAU, 24, tint, 1.7, true)
		1:
			for i in 3: draw_line(Vector2(6 + i * 9, 28), Vector2(6 + i * 9, 18 - i * 8), tint, 2, true)
		2:
			draw_polyline(PackedVector2Array([Vector2(10,3),Vector2(4,5),Vector2(1,13),Vector2(7,15),Vector2(9,11),Vector2(8,28),Vector2(22,28),Vector2(21,11),Vector2(23,15),Vector2(29,13),Vector2(26,5),Vector2(20,3),Vector2(18,7),Vector2(12,7),Vector2(10,3)]), tint, 1.7, true)
		3:
			for y in [6,15,24]: draw_line(Vector2(3,y),Vector2(27,y),tint,1.7,true)
		4:
			draw_line(Vector2(5,5),Vector2(25,25),tint,1.7,true)
			draw_line(Vector2(25,5),Vector2(5,25),tint,1.7,true)
	draw_set_transform(Vector2.ZERO)
	underline.visible = kind != 4 and (button_pressed or has_focus())
	underline.modulate = Color(1.15, 1.15, 1.15, 1.0 if button_pressed else 0.5)
	underline.position = Vector2(3, size.y - 12)
	underline.size = Vector2(size.x - 6, underline.THICKNESS)
