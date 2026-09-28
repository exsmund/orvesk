extends "res://ui/square_button.gd"
## Simple native trash glyph over the common textured square button.
var glyph = Control.new()

func configure(data, caption: String = "Удалить героя"):
	super.configure(data, "")
	tooltip_text = caption
	glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(glyph)
	glyph.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	glyph.draw.connect(draw_glyph)
	resized.connect(glyph.queue_redraw)
	mouse_entered.connect(glyph.queue_redraw)
	mouse_exited.connect(glyph.queue_redraw)

func draw_glyph():
	var side = minf(size.x, size.y)
	var origin = (size - Vector2.ONE * side) / 2
	var ink = get_theme_color("font_hover_color" if is_hovered() else "font_color")
	if disabled: ink = get_theme_color("font_disabled_color")
	var points = [Vector2(0.35,0.39),Vector2(0.38,0.75),Vector2(0.62,0.75),Vector2(0.65,0.39)]
	var contour = PackedVector2Array()
	for point in points: contour.append(origin + point * side)
	glyph.draw_polyline(contour, ink, 1.3, true)
	for line in [[Vector2(0.30,0.32),Vector2(0.70,0.32)], [Vector2(0.42,0.24),Vector2(0.58,0.24)], [Vector2(0.46,0.44),Vector2(0.46,0.67)], [Vector2(0.54,0.44),Vector2(0.54,0.67)]]:
		glyph.draw_line(origin + line[0]*side, origin + line[1]*side, ink, 1.3, true)
