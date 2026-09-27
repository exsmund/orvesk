extends Control
## Overlay: map selection, dealt cards, board placements and RNG stay in their owners.
const GothicTheme = preload("res://ui/gothic_theme.gd")
const Frame = preload("res://ui/texture_frame.gd")
const TabButton = preload("res://ui/character_tab_button.gd")
const TITLES = ["Герой", "Характеристики", "Экипировка и навыки", "Меню игры"]
var host
var panel = Control.new()
var title = Label.new()
var body = Control.new()
var navigation = Control.new()
var pages: Array = []
var tabs: Array = []
var current_tab = 0
var previous_focus: Control
var previous_processing: int
var closing = false
var background = preload("res://ui/character_surface.gd").new()
var header_surface = preload("res://ui/character_surface.gd").new()
var navigation_surface = preload("res://ui/character_surface.gd").new()
var header_separator = preload("res://ui/textured_divider.gd").new()
var navigation_separator = preload("res://ui/textured_divider.gd").new()
var close_separator = preload("res://ui/textured_divider.gd").new()
var landscape = TextureRect.new()
var inner_shadow = ColorRect.new()
var outer_frame = Frame.new()

func configure(owner_ui):
	host = owner_ui
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	mouse_filter = Control.MOUSE_FILTER_STOP
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	previous_focus = get_viewport().gui_get_focus_owner()
	cancel_gestures(host.margin)
	previous_processing = host.margin.process_mode
	host.margin.process_mode = Node.PROCESS_MODE_DISABLED
	var shade = ColorRect.new()
	shade.color = Color(host.data.color("background-page"), 0.92)
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(panel)
	panel.theme = host.theme.duplicate(false)
	for kind in ["Label", "Button", "CheckButton", "RichTextLabel"]:
		panel.theme.set_color("default_color" if kind == "RichTextLabel" else "font_color", kind, host.data.color("text-home"))
	panel.add_child(background)
	background.configure(host.data, 26, 0.68)
	background.frame.hide()
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	landscape.texture = host.data.image("/ui/start-landscape-v1.png")
	landscape.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	landscape.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	landscape.mouse_filter = Control.MOUSE_FILTER_IGNORE
	landscape.material = ShaderMaterial.new()
	landscape.material.shader = preload("res://shaders/character_menu.gdshader")
	panel.add_child(landscape)
	inner_shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inner_shadow.material = ShaderMaterial.new()
	inner_shadow.material.shader = preload("res://shaders/character_shadow.gdshader")
	inner_shadow.material.set_shader_parameter("shadow_color", host.data.color("shadow-character-card-2"))
	panel.add_child(inner_shadow)
	inner_shadow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(header_surface)
	header_surface.configure(host.data, 20, 0.78)
	header_surface.frame.hide()
	panel.add_child(header_separator)
	header_separator.configure(host.data)
	panel.add_child(title)
	title.clip_text = true
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	title.add_theme_color_override("font_color", host.data.color("text-home"))
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(body)
	body.clip_contents = true
	pages = [preload("res://ui/character_overview.gd").new(), preload("res://ui/character_attributes.gd").new(), preload("res://ui/character_equipment.gd").new(), preload("res://ui/character_menu.gd").new()]
	for i in pages.size():
		body.add_child(pages[i])
		pages[i].set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		if i == 3: pages[i].configure(host, self)
		else: pages[i].configure(host)
	pages[1].applied.connect(pages[0].refresh)
	panel.add_child(navigation_surface)
	navigation_surface.configure(host.data, 22, 0.20)
	navigation_surface.frame.hide()
	panel.add_child(navigation_separator)
	navigation_separator.configure(host.data)
	panel.add_child(navigation)
	for i in 5:
		var button = TabButton.new()
		navigation.add_child(button)
		button.configure(host.data, i, TITLES[i] if i < 4 else "Закрыть")
		button.toggle_mode = i < 4
		if i < 4: button.pressed.connect(func(): select_tab(i))
		else: button.pressed.connect(close)
		tabs.append(button)
	navigation.add_child(close_separator)
	close_separator.configure(host.data, true)
	panel.add_child(outer_frame)
	outer_frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	outer_frame.configure(host.data, 26)
	resized.connect(arrange)
	select_tab(0)
	arrange()
	if is_instance_valid(previous_focus): previous_focus.release_focus()

func cancel_gestures(node):
	if node.has_method("cancel_gesture"): node.cancel_gesture()
	for child in node.get_children(): cancel_gestures(child)

func arrange():
	if not host: return
	var left = host.margin.get_theme_constant("margin_left")
	var top = host.margin.get_theme_constant("margin_top")
	var right = host.margin.get_theme_constant("margin_right")
	var bottom = host.margin.get_theme_constant("margin_bottom")
	var available = size - Vector2(left + right, top + bottom)
	var wide = available.x > available.y * 1.08
	panel.size = Vector2(minf(available.x, available.y * 1.65), available.y) if wide else Vector2(minf(560, available.x), minf(920, available.y))
	panel.position = Vector2(left, top) + (available - panel.size) / 2
	if wide: panel.position.x = left
	elif available.y > available.x * 1.65: panel.position.y = top + available.y - panel.size.y
	var unit = maxf(1, minf(panel.size.x / 900, panel.size.y / 650)) if wide else 1.0
	var head = minf(74 * unit if wide else 82, panel.size.y * 0.17)
	var foot = minf(90 * unit if wide else 100, maxf(66, panel.size.y * 0.19))
	header_surface.position = Vector2(2, 2)
	header_surface.size = Vector2(panel.size.x - 4, head)
	header_separator.position = Vector2(12, head + 1)
	header_separator.size = Vector2(panel.size.x - 24, header_separator.THICKNESS)
	title.position = Vector2(18, 6)
	title.size = Vector2(panel.size.x - 36, head - 10)
	var fitted = int(28 * unit)
	while fitted > 16 and GothicTheme.DISPLAY_FONT.get_string_size(title.text,HORIZONTAL_ALIGNMENT_LEFT,-1,fitted).x > title.size.x: fitted -= 1
	title.add_theme_font_size_override("font_size", fitted)
	# Prata's visible letters sit above the center of its line box.
	title.position.y += fitted * 0.25
	body.position = Vector2(18, head + 14)
	body.size = Vector2(panel.size.x - 36, panel.size.y - head - foot - 30)
	navigation_surface.position = Vector2(2, panel.size.y - foot - 2)
	navigation_surface.size = Vector2(panel.size.x - 4, foot)
	navigation_separator.position = Vector2(12, navigation_surface.position.y)
	navigation_separator.size = Vector2(panel.size.x - 24, navigation_separator.THICKNESS)
	# Center the controls inside the visible panel, above the inset bottom frame.
	navigation.position = navigation_surface.position + Vector2(8, 1)
	navigation.size = navigation_surface.size - Vector2(16, 10)
	var gap = 6.0
	var side = minf(navigation.size.y, (navigation.size.x - gap * 4) / 5)
	var start = (navigation.size.x - side * 5 - gap * 4) / 2
	for i in 5:
		tabs[i].position = Vector2(start + i * (side + gap), (navigation.size.y - side) / 2)
		tabs[i].size = Vector2.ONE * side
	close_separator.position = Vector2(start + 4 * (side + gap) - gap / 2 - 1.5, 9)
	close_separator.size = Vector2(close_separator.THICKNESS, navigation.size.y - 18)
	landscape.visible = current_tab == 3
	landscape.position = Vector2(6, 6) if wide else Vector2(6, panel.size.y * 0.5)
	landscape.size = panel.size - Vector2(12, 12) if wide else Vector2(panel.size.x - 12, panel.size.y * 0.5 - 6)
	landscape.material.set_shader_parameter("wide", wide)
	inner_shadow.material.set_shader_parameter("panel_size", panel.size)
	inner_shadow.material.set_shader_parameter("header_height", head)

func select_tab(index: int):
	current_tab = index
	title.text = TITLES[index]
	for i in 4:
		pages[i].visible = i == index
		tabs[i].set_pressed_no_signal(i == index)
		tabs[i].queue_redraw()
	arrange()

func back():
	if current_tab == 3 and pages[3].back(): return
	close()

func close():
	if closing: return
	closing = true
	host.margin.process_mode = previous_processing
	host.character_window = null
	hide()
	if is_instance_valid(previous_focus) and previous_focus.is_inside_tree(): previous_focus.grab_focus()
	queue_free()

func focus_targets(node, result: Array):
	if node is Control and node.is_visible_in_tree() and node.focus_mode == Control.FOCUS_ALL and not (node is BaseButton and node.disabled): result.append(node)
	for child in node.get_children(): focus_targets(child, result)

func _input(event):
	if closing or is_instance_valid(host.inspection_window) or not event is InputEventKey or not event.pressed: return
	# Embedded inspection dialogs handle their own keyboard navigation first.
	if host.get_children().any(func(c): return c is AcceptDialog and c.visible): return
	if event.keycode == KEY_ESCAPE:
		back()
		get_viewport().set_input_as_handled()
	elif event.keycode == KEY_TAB:
		var targets: Array = []
		focus_targets(self, targets)
		if not targets.is_empty():
			var index = targets.find(get_viewport().gui_get_focus_owner())
			targets[posmod(index + (-1 if event.shift_pressed else 1), targets.size())].grab_focus()
		get_viewport().set_input_as_handled()
