extends RefCounted
## One theme for every native button, input, panel and dialog.
const DISPLAY_FONT = preload("res://content/fonts/Prata-UI.tres")
const BODY_FONT = preload("res://content/fonts/GolosText.ttf")
const BUTTON = preload("res://content/ui/button-slate-v1.png")
static var cropped: Dictionary = {}
static var regions: Dictionary = {}

static func visible_region(texture: Texture2D) -> Rect2i:
	var key = texture.get_instance_id()
	if not regions.has(key):
		var image = texture.get_image()
		var low = image.get_size()
		var high = Vector2i.ZERO
		# Ignore almost transparent export noise; do not count it as the icon silhouette.
		for y in image.get_height():
			for x in image.get_width():
				if image.get_pixel(x, y).a > 0.1:
					low = low.min(Vector2i(x, y))
					high = high.max(Vector2i(x, y))
		regions[key] = Rect2i(low, high - low + Vector2i.ONE)
	return regions[key]

static func trim_texture(texture: Texture2D) -> Texture2D:
	if not texture: return null
	var key = texture.get_instance_id()
	if not cropped.has(key):
		var atlas = AtlasTexture.new()
		atlas.atlas = texture
		atlas.region = visible_region(texture)
		cropped[key] = atlas
	return cropped[key]

static func panel(data, inset: int = 16) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = data.color("background-ui-textures-background")
	style.border_color = data.color("border-style-7-2")
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	style.set_content_margin_all(inset)
	return style

static func make(data) -> Theme:
	var theme = Theme.new()
	theme.default_font_size = 17
	theme.default_font = BODY_FONT
	for kind in ["Label", "Button", "LineEdit", "CheckButton", "RichTextLabel"]:
		theme.set_color("font_color" if kind != "RichTextLabel" else "default_color", kind, data.color("text-primary"))
	theme.set_font("font", "Button", DISPLAY_FONT)
	theme.set_font_size("font_size", "Button", 18)
	var texture_region = visible_region(BUTTON)
	for state in ["normal", "hover", "pressed", "disabled"]:
		var style = StyleBoxTexture.new()
		style.texture = BUTTON
		style.region_rect = texture_region
		for side in [SIDE_LEFT, SIDE_RIGHT]: style.set_texture_margin(side, 22)
		for side in [SIDE_TOP, SIDE_BOTTOM]: style.set_texture_margin(side, 22)
		style.axis_stretch_horizontal = StyleBoxTexture.AXIS_STRETCH_MODE_TILE
		style.axis_stretch_vertical = StyleBoxTexture.AXIS_STRETCH_MODE_TILE
		style.content_margin_left = 22
		style.content_margin_right = 22
		style.content_margin_top = 12
		style.content_margin_bottom = 12
		style.modulate_color = Color(1.16, 1.13, 1.05) if state == "hover" else (Color(0.72, 0.76, 0.68) if state == "pressed" else (Color(0.48, 0.48, 0.45) if state == "disabled" else Color.WHITE))
		theme.set_stylebox(state, "Button", style)
		theme.set_stylebox(state, "LineEdit", panel(data))
	var focus = panel(data, 0)
	focus.bg_color = Color.TRANSPARENT
	focus.border_color = data.color("text-highlight")
	focus.set_border_width_all(2)
	theme.set_stylebox("focus", "Button", focus)
	theme.set_stylebox("focus", "LineEdit", focus)
	theme.set_color("font_hover_color", "Button", data.color("text-home"))
	theme.set_color("font_pressed_color", "Button", data.color("text-home"))
	theme.set_color("font_disabled_color", "Button", data.color("text-muted"))
	theme.set_stylebox("panel", "PanelContainer", panel(data))
	theme.set_stylebox("panel", "AcceptDialog", panel(data, 20))
	var window = panel(data, 16)
	window.expand_margin_top = 38
	theme.set_stylebox("embedded_border", "Window", window)
	theme.set_stylebox("embedded_unfocused_border", "Window", window)
	theme.set_font("title_font", "Window", DISPLAY_FONT)
	theme.set_font_size("title_font_size", "Window", 20)
	theme.set_color("title_color", "Window", data.color("text-home"))
	for state in ["grabber", "grabber_highlight", "grabber_pressed"]:
		var thumb = panel(data, 3)
		thumb.bg_color = data.color("border-style-7-2")
		theme.set_stylebox(state, "VScrollBar", thumb)
	return theme
