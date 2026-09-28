extends Control
## Shared application dialog. Story conversations deliberately use their own screen.
signal confirmed
signal canceled
const GothicTheme = preload("res://ui/gothic_theme.gd")
var title = ""
var dialog_text = ""
var use_message = true
var ok_button_text = "Закрыть"
var cancel_button_text = ""
var dialog_hide_on_ok = true
var destructive = false
var closing = false
var panel = Control.new()
var header = preload("res://ui/window_header.gd").new()
var surface = preload("res://ui/character_surface.gd").new()
var frame = preload("res://ui/texture_frame.gd").new()
var shadow = ColorRect.new()
var shade = ColorRect.new()
var scroll = ScrollContainer.new()
var content = VBoxContainer.new()
var message = Label.new()
var primary = Button.new()
var secondary = Button.new()
var requested_size = Vector2(430, 0)
var host
var previous_focus: Control
var suspended: Array = []
var configured = false
var keyboard_height = 0.0

func _init():
	mouse_filter = Control.MOUSE_FILTER_STOP
	add_to_group("application_dialogs")
	for node in [shade, panel]: add_child(node)
	for node in [surface, shadow, header, scroll, secondary, primary, frame]: panel.add_child(node)
	scroll.add_child(content)
	content.add_child(message)
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 14)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.follow_focus = true
	message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	message.mouse_filter = Control.MOUSE_FILTER_IGNORE
	primary.pressed.connect(accept)
	secondary.pressed.connect(cancel)
	resized.connect(arrange)
	content.minimum_size_changed.connect(arrange)

func popup_centered(dimensions: Vector2i = Vector2i.ZERO):
	if not configured:
		host = get_parent()
		theme = host.theme
		texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
		set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		previous_focus = get_viewport().gui_get_focus_owner()
		if is_instance_valid(previous_focus): previous_focus.release_focus()
		var underlays = [host.margin, host.character_window, host.inspection_window]
		for child in host.get_children():
			if child != self and child.is_in_group("application_dialogs") and child.visible: underlays.append(child)
		for node in underlays:
			if is_instance_valid(node):
				suspended.append([node, node.process_mode])
				node.process_mode = Node.PROCESS_MODE_DISABLED
		cancel_gestures(host.margin)
		shade.color = Color(host.data.color("background-page"), 0.78)
		shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
		shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		surface.configure(host.data, 26, 0.68)
		surface.frame.hide()
		surface.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
		shadow.material = ShaderMaterial.new()
		shadow.material.shader = preload("res://shaders/character_shadow.gdshader")
		shadow.material.set_shader_parameter("shadow_color", host.data.color("shadow-character-card-2"))
		shadow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		header.configure(host.data)
		frame.configure(host.data, 26)
		frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		message.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		message.add_theme_font_size_override("font_size", 18)
		message.add_theme_color_override("font_color", host.data.color("text-home"))
		for button in [primary, secondary]:
			button.add_theme_stylebox_override("focus", theme.get_stylebox("hover", "Button"))
		configured = true
	requested_size = Vector2(dimensions) if dimensions.x > 0 else Vector2(430, 0)
	header.title.text = title
	message.text = dialog_text
	message.visible = use_message and not dialog_text.is_empty()
	primary.text = ok_button_text
	secondary.text = cancel_button_text
	secondary.visible = not cancel_button_text.is_empty()
	if destructive:
		primary.material = ShaderMaterial.new()
		primary.material.shader = preload("res://shaders/destructive_button.gdshader")
		primary.material.set_shader_parameter("tint", host.data.color("text-danger"))
	show()
	arrange()
	(secondary if secondary.visible else primary).grab_focus()

func arrange():
	if not configured or closing or size.x <= 0: return
	var available = Rect2(Vector2.ZERO, Vector2(size.x, maxf(1, size.y - keyboard_height))).grow(-18)
	var width = maxf(1, minf(requested_size.x, available.size.x))
	var inset = minf(24, width * 0.065)
	var body_width = maxf(1, width - inset * 2)
	# Establish wrap width before measuring the body. Only this body may scroll.
	scroll.size.x = body_width
	content.size.x = body_width
	message.size.x = body_width
	var body_height = maxf(60, content.get_combined_minimum_size().y)
	var head_height = header.arrange(Vector2(width, 480))
	var footer_height = 52.0
	var height = minf(available.size.y, maxf(requested_size.y, head_height + 24 + body_height + 18 + footer_height + 26))
	panel.size = Vector2(width, maxf(1, height))
	panel.position = available.position + (available.size - panel.size) / 2
	scroll.position = Vector2(inset, head_height + 16)
	scroll.size = Vector2(body_width, maxf(1, height - head_height - footer_height - 64))
	var button_width = (body_width - 12) / 2 if secondary.visible else body_width
	secondary.position = Vector2(inset, height - footer_height - 26)
	secondary.size = Vector2(button_width, footer_height)
	primary.position = Vector2(inset + button_width + 12 if secondary.visible else inset, secondary.position.y)
	primary.size = Vector2(button_width, footer_height)
	for button in [primary, secondary]: GothicTheme.fit_button_text(button, button_width)
	shadow.material.set_shader_parameter("panel_size", panel.size)
	shadow.material.set_shader_parameter("header_height", head_height)

func accept():
	if closing or primary.disabled: return
	if dialog_hide_on_ok: close()
	confirmed.emit()

func cancel():
	if closing: return
	close()
	canceled.emit()

func release_underlay():
	for entry in suspended:
		if is_instance_valid(entry[0]): entry[0].process_mode = entry[1]
	suspended.clear()

func close():
	if closing: return
	closing = true
	hide()
	release_underlay()
	if is_instance_valid(previous_focus) and previous_focus.is_inside_tree() and previous_focus.is_visible_in_tree(): previous_focus.grab_focus()
	queue_free()

func _exit_tree():
	release_underlay()

func _input(event):
	if closing or not visible or not (event is InputEventKey) or not event.pressed: return
	if event.keycode == KEY_ESCAPE:
		cancel()
		get_viewport().set_input_as_handled()
	elif event.keycode == KEY_TAB:
		var targets: Array = []
		collect_focus(panel, targets)
		if not targets.is_empty():
			var index = targets.find(get_viewport().gui_get_focus_owner())
			targets[posmod(index + (-1 if event.shift_pressed else 1), targets.size())].grab_focus()
		get_viewport().set_input_as_handled()

func collect_focus(node, targets: Array):
	if node is Control and node.is_visible_in_tree() and node.focus_mode == Control.FOCUS_ALL and not (node is BaseButton and node.disabled): targets.append(node)
	for child in node.get_children(): collect_focus(child, targets)

func _process(_delta):
	if OS.get_name() != "Android" or not configured: return
	var inset = float(DisplayServer.virtual_keyboard_get_height()) * host.size.y / maxf(1, get_window().size.y)
	if not is_equal_approx(inset, keyboard_height):
		keyboard_height = inset
		arrange()

func cancel_gestures(node):
	if node.has_method("cancel_gesture"): node.cancel_gesture()
	for child in node.get_children(): cancel_gestures(child)
