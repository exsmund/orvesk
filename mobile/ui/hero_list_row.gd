extends Control
signal continued(id: String)
signal removed(id: String, hero_name: String)
const GothicTheme = preload("res://ui/gothic_theme.gd")
const FittedLabel = preload("res://ui/fitted_label.gd")
var hero_id = ""
var open_button = Button.new()
var portrait = TextureRect.new()
var frame = TextureRect.new()
var missing = Label.new()
var hero_name = FittedLabel.new()
var level = FittedLabel.new()
var location = FittedLabel.new()
var delete_button = preload("res://ui/delete_button.gd").new()

func configure(data, entry: Dictionary, description: String):
	hero_id = entry.id
	for node in [open_button, portrait, frame, missing, hero_name, level, location, delete_button]: add_child(node)
	for state in ["normal", "hover", "pressed", "disabled"]: open_button.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	open_button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	open_button.pressed.connect(func(): continued.emit(hero_id))
	var game: Dictionary = entry.payload.get("game", {})
	var valid = not game.is_empty()
	hero_name.text = game.player.name if valid else "Повреждённое сохранение"
	level.text = "Уровень %d" % data.level(game.player) if valid else "Не удалось прочитать историю"
	location.text = description
	open_button.tooltip_text = "Продолжить: " + hero_name.text if valid else "Сохранение недоступно"
	for label in [hero_name, level, location, missing]:
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		label.add_theme_color_override("font_color", data.color("text-muted" if label in [location, missing] else ("text-highlight" if label == level else "text-home")))
	for label in [hero_name, level, location]: label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	for image in [portrait, frame]:
		image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_SCALE
	portrait.texture = data.portrait(game.player) if valid else null
	portrait.material = ShaderMaterial.new()
	portrait.material.shader = preload("res://shaders/portrait_mask.gdshader")
	var crop = data.portrait_presentation.circle.position
	portrait.material.set_shader_parameter("object_position", Vector2(crop.x, crop.y))
	frame.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	frame.texture = GothicTheme.trim_texture(data.image("/ui/portrait-frame-round-v1.png"))
	missing.text = "?" if not valid else ""
	missing.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	missing.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	delete_button.configure(data, "Удалить: " + hero_name.text)
	delete_button.pressed.connect(func(): removed.emit(hero_id, hero_name.text))
	resized.connect(arrange)

func place(node: Control, rectangle: Rect2):
	node.position = rectangle.position
	node.size = rectangle.size
	if node is FittedLabel: node.fit()

func arrange():
	if size.x <= 0: return
	var side = minf(size.y - 20, size.x * 0.34)
	var text_x = side + 18
	var delete_side = 44.0
	var text_width = maxf(1, size.x - text_x - 8)
	var unit = clampf(size.x / 450, 0.78, 1.1)
	place(open_button, Rect2(0, 0, size.x - delete_side - 8, size.y))
	place(portrait, Rect2(4, (size.y-side)/2+4, side-8, side-8))
	portrait.material.set_shader_parameter("mask_size", portrait.size)
	place(frame, Rect2(0, (size.y-side)/2, side, side))
	place(missing, frame.get_rect())
	missing.add_theme_font_size_override("font_size", int(28 * unit))
	place(delete_button, Rect2(size.x-delete_side, (size.y-side)/2, delete_side, delete_side))
	hero_name.base_font_size = int(34 * unit)
	level.base_font_size = int(20 * unit)
	location.base_font_size = int(18 * unit)
	var top = (size.y - 126 * unit) / 2
	place(hero_name, Rect2(text_x, top, maxf(1,text_width-delete_side-8), 56*unit))
	place(level, Rect2(text_x, top+57*unit, text_width, 36*unit))
	place(location, Rect2(text_x, top+94*unit, text_width, 32*unit))
