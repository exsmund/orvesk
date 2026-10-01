extends CheckBox
## Checkbox with an explicit mark: the application theme has no native check icons.
var ink = Color.WHITE
var outline = Color(0.65, 0.54, 0.35)

func _init():
	custom_minimum_size.y = 46
	alignment = HORIZONTAL_ALIGNMENT_LEFT
	var empty = GradientTexture2D.new()
	empty.width = 1
	empty.height = 1
	empty.gradient = Gradient.new()
	empty.gradient.colors = PackedColorArray([Color.TRANSPARENT, Color.TRANSPARENT])
	for icon_name in ["checked","unchecked","checked_disabled","unchecked_disabled"]:
		add_theme_icon_override(icon_name, empty)
	for state in ["normal","hover","pressed","disabled"]:
		var style = StyleBoxEmpty.new()
		style.content_margin_left = 48
		style.content_margin_right = 8
		add_theme_stylebox_override(state, style)
	add_theme_font_override("font", preload("res://ui/gothic_theme.gd").BODY_FONT)
	add_theme_font_size_override("font_size", 19)
	toggled.connect(func(_value): queue_redraw())

func configure(data):
	ink = data.color("text-home")
	outline = data.color("border-style-7-2")
	add_theme_color_override("font_color", ink)
	queue_redraw()

func _draw():
	var rect = Rect2(8, (size.y - 28) / 2, 28, 28)
	draw_rect(rect, Color(0.04, 0.05, 0.04, 0.9))
	draw_rect(rect, outline, false, 1.5, true)
	if button_pressed:
		draw_polyline(PackedVector2Array([rect.position + Vector2(6,14), rect.position + Vector2(12,20), rect.position + Vector2(23,7)]), ink, 2.4, true)
