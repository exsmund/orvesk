extends Control
## Shared chrome for character, creation and inspection windows.
const GothicTheme = preload("res://ui/gothic_theme.gd")
var surface = preload("res://ui/character_surface.gd").new()
var divider = preload("res://ui/textured_divider.gd").new()
var title = Label.new()
var subtitle = Label.new()

func configure(data):
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(surface)
	surface.configure(data, 20, 0.78)
	surface.frame.hide()
	add_child(divider)
	divider.configure(data)
	for label in [title, subtitle]:
		add_child(label)
		label.clip_text = true
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		label.add_theme_color_override("font_color", data.color("text-muted" if label == subtitle else "text-home"))

static func scale_for(panel_size: Vector2) -> float:
	return maxf(1, minf(panel_size.x / 900, panel_size.y / 650)) if panel_size.x > panel_size.y * 1.08 else 1.0

func arrange(panel_size: Vector2) -> float:
	var wide = panel_size.x > panel_size.y * 1.08
	var unit = scale_for(panel_size)
	var title_height = minf(74 * unit if wide else 82, panel_size.y * 0.17)
	subtitle.visible = not subtitle.text.is_empty()
	var extra = 26 * unit * (subtitle.text.count("\n") + 1) if subtitle.visible else 0.0
	size = Vector2(panel_size.x, title_height + extra)
	surface.position = Vector2(2, 2)
	surface.size = Vector2(size.x - 4, size.y)
	divider.position = Vector2(12, size.y + 1)
	divider.size = Vector2(size.x - 24, divider.THICKNESS)
	title.size = Vector2(size.x - 36, title_height - 10)
	fit(title, int(28 * unit))
	# Prata's visible letters sit above the center of its line box.
	title.position = Vector2(18, 6 + title.get_theme_font_size("font_size") * 0.25)
	subtitle.position = Vector2(18, title_height - 5)
	subtitle.size = Vector2(size.x - 36, extra)
	if subtitle.visible: fit(subtitle, int(17 * unit))
	return size.y

func fit(label: Label, preferred: int):
	var fitted = preferred
	for line in label.text.split("\n"):
		while fitted > 1 and GothicTheme.DISPLAY_FONT.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x > label.size.x: fitted -= 1
	label.add_theme_font_size_override("font_size", fitted)
