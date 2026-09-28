extends Button
## A square control skin shared by increment/decrement actions. Glyphs stay native.
const GothicTheme = preload("res://ui/gothic_theme.gd")
const NORMAL = preload("res://content/ui/button-square-v1.png")
const PRESSED = preload("res://content/ui/button-square-pressed-v1.png")
var border = preload("res://ui/texture_frame.gd").new()

func configure(data, glyph: String):
	text = glyph
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	custom_minimum_size = Vector2(44, 44)
	add_theme_font_override("font", GothicTheme.BODY_FONT)
	add_theme_font_size_override("font_size", GothicTheme.button_text_size(28))
	for state in ["normal", "hover", "pressed", "disabled"]:
		var style = StyleBoxTexture.new()
		style.texture = PRESSED if state == "pressed" else NORMAL
		style.region_rect = GothicTheme.visible_region(style.texture)
		style.set_content_margin_all(0)
		if state == "disabled": style.modulate_color = Color(data.color("text-muted"), 0.7)
		elif state == "hover": style.modulate_color = Color(1.12, 1.12, 1.12)
		add_theme_stylebox_override(state, style)
	# Enlarge only the existing textured rim, preserving the square and its glyph.
	add_child(border)
	border.corner = 9
	border.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	queue_redraw()

func _draw():
	if not is_instance_valid(border) or not border.is_inside_tree(): return
	var state = "disabled" if disabled else ("pressed" if is_pressed() else ("hover" if is_hovered() else "normal"))
	var skin = get_theme_stylebox(state)
	border.texture = GothicTheme.trim_texture(skin.texture)
	border.modulate = skin.modulate_color
	border.queue_redraw()
