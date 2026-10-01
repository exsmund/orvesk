extends Control
## Three bounded pages using the textures and fitted content of the character window.
const GothicTheme = preload("res://ui/gothic_theme.gd")
const FittedLabel = preload("res://ui/fitted_label.gd")
var host
var step = 0
var panel = Control.new()
var background = preload("res://ui/character_surface.gd").new()
var inner_shadow = ColorRect.new()
var frame = preload("res://ui/texture_frame.gd").new()
var window_header = preload("res://ui/window_header.gd").new()
var title = window_header.title
var subtitle = window_header.subtitle
var divider = window_header.divider
var body = Control.new()
var identity = preload("res://ui/creation_identity.gd").new()
var attributes = preload("res://ui/creation_attributes.gd").new()
var difficulty = preload("res://ui/creation_difficulty.gd").new()
var actions = preload("res://ui/window_actions.gd").new()
var action = actions.primary
var back_button = actions.back
var back_divider = actions.divider
var warning = FittedLabel.new()
var keyboard_inset = 0.0

func configure(owner_ui):
	host = owner_ui
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	add_child(panel)
	preload("res://ui/panel_shadow.gd").new().follow_panel(panel, host.data)
	panel.theme = host.theme.duplicate(false)
	for kind in ["Label", "Button", "LineEdit", "RichTextLabel"]:
		panel.theme.set_color("default_color" if kind == "RichTextLabel" else "font_color", kind, host.data.color("text-home"))
	panel.add_child(background)
	background.configure(host.data, 26, 0.68)
	background.frame.hide()
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	inner_shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inner_shadow.material = ShaderMaterial.new()
	inner_shadow.material.shader = preload("res://shaders/character_shadow.gdshader")
	inner_shadow.material.set_shader_parameter("shadow_color", host.data.color("shadow-character-card-2"))
	panel.add_child(inner_shadow)
	inner_shadow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(window_header)
	window_header.configure(host.data)
	for node in [body, actions, warning]: panel.add_child(node)
	actions.hint.configure(host.data)
	warning.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	warning.add_theme_color_override("font_color", host.data.color("text-danger"))
	warning.base_font_size = 15
	body.clip_contents = true
	for page in [identity, attributes, difficulty]:
		body.add_child(page)
		page.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		page.configure(host)
		page.changed.connect(refresh)
	identity.submitted.connect(advance)
	action.pressed.connect(advance)
	back_button.pressed.connect(back)
	panel.add_child(frame)
	frame.configure(host.data, 26)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	resized.connect(arrange)
	refresh()

func refresh():
	title.text = ["Новый герой", "Характеристики", "Сложность"][step]
	subtitle.text = "Шаг %d из 3" % (step + 1)
	identity.visible = step == 0
	attributes.visible = step == 1
	difficulty.visible = step == 2
	action.text = "Далее" if step < 2 else "Начать путешествие"
	action.disabled = not host.session.creation_name_error(host.create_name).is_empty() or (step >= 1 and host.session.creation_points_remaining(host.create_stats) != 0) or (step == 2 and difficulty.buttons[host.create_difficulty].disabled)
	warning.text = ""
	# Keep body geometry stable when the final point hides the hint.
	actions.reserve_hint_space = step == 1
	actions.hint.text = "Распределите %d очка" % host.session.CREATION_POINTS if step == 1 and host.session.creation_points_remaining(host.create_stats) > 0 else ""
	arrange()

func dismiss_keyboard():
	if identity.name_input.is_inside_tree(): identity.name_input.release_focus()
	if DisplayServer.has_feature(DisplayServer.FEATURE_VIRTUAL_KEYBOARD): DisplayServer.virtual_keyboard_hide()
	set_keyboard_inset(0)

func advance():
	if not is_inside_tree() or host.creation_view != self or action.disabled or host.busy: return
	dismiss_keyboard()
	if step < 2:
		step += 1
		attributes.refresh()
		refresh()
	else: host.finish_creation()

func back():
	if not is_inside_tree() or host.creation_view != self: return
	if keyboard_inset > 0:
		dismiss_keyboard()
		return
	dismiss_keyboard()
	if step > 0:
		step -= 1
		refresh()
	else: host.show_home()

func show_error(text: String):
	warning.text = text
	warning.fit()

func put(node: Control, rect: Rect2):
	node.position = rect.position
	node.size = rect.size
	if node is FittedLabel: node.fit()

func arrange():
	if not host or size.x <= 0 or size.y <= 0: return
	var available = Vector2(size.x, maxf(1, size.y - keyboard_inset))
	var wide = available.x > available.y * 1.08
	panel.size = Vector2(minf(available.x, available.y * 1.65), available.y) if wide else Vector2(minf(560, available.x), minf(920, available.y))
	panel.position = (available - panel.size) / 2
	if wide: panel.position.x = 0
	elif available.y > available.x * 1.65: panel.position.y = available.y - panel.size.y
	var unit = clampf(panel.size.y / 760, 0.7, 1.15)
	var head = window_header.arrange(panel.size)
	var width = minf(500, panel.size.x - 48)
	var x = (panel.size.x - width) / 2
	var footer_top = actions.arrange(panel.size)
	put(warning, Rect2(x, footer_top - 30 * unit, width, 26 * unit))
	put(body, Rect2(24, head + 14, panel.size.x - 48, maxf(1, warning.position.y - head - 22)))
	inner_shadow.material.set_shader_parameter("panel_size", panel.size)
	inner_shadow.material.set_shader_parameter("header_height", head)

func set_keyboard_inset(value: float):
	if is_equal_approx(keyboard_inset, value): return
	keyboard_inset = value
	identity.set_keyboard_visible(value > 0)
	arrange()

func _process(_delta):
	if OS.get_name() != "Android" or not host: return
	var pixels = DisplayServer.virtual_keyboard_get_height()
	var height = float(pixels) * host.size.y / maxf(1, get_window().size.y)
	set_keyboard_inset(maxf(0, get_global_rect().end.y - (host.size.y - height)) if pixels > 0 else 0)

func _input(event):
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		back()
		get_viewport().set_input_as_handled()
