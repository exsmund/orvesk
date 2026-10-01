extends Control
const ModalDialog = preload("res://ui/modal_dialog.gd")
## Saved stories; chrome stays fixed while a long roster scrolls inside it.
signal continued(id: String)
signal removal_requested(id: String, hero_name: String)
signal create_requested
signal back_requested
const GothicTheme = preload("res://ui/gothic_theme.gd")
var host
var panel = Control.new()
var background = preload("res://ui/character_surface.gd").new()
var shadow = ColorRect.new()
var frame = preload("res://ui/texture_frame.gd").new()
var header = preload("res://ui/window_header.gd").new()
var actions = preload("res://ui/window_actions.gd").new()
var scroll = ScrollContainer.new()
var grid = GridContainer.new()
var rows: Array = []
var empty = Label.new()
var notice = Label.new()
var layout_queued = false

func configure(owner_ui):
	host = owner_ui
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	add_child(panel)
	preload("res://ui/panel_shadow.gd").new().follow_panel(panel, host.data)
	panel.theme = host.theme.duplicate(false)
	for kind in ["Label", "Button"]: panel.theme.set_color("font_color", kind, host.data.color("text-home"))
	panel.add_child(background)
	background.configure(host.data, 26, 0.68)
	background.frame.hide()
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(shadow)
	shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shadow.material = ShaderMaterial.new()
	shadow.material.shader = preload("res://shaders/character_shadow.gdshader")
	shadow.material.set_shader_parameter("shadow_color", host.data.color("shadow-character-card-2"))
	shadow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(header)
	header.configure(host.data)
	header.title.text = "Герои"
	header.subtitle.text = "Выберите историю,\nкоторую хотите продолжить."
	panel.add_child(scroll)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.follow_focus = true
	scroll.scroll_deadzone = 10
	scroll.add_child(grid)
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 30)
	grid.add_theme_constant_override("v_separation", 10)
	panel.add_child(empty)
	empty.text = "Пока нет героев.\nНачните новую историю."
	empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	empty.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	empty.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	empty.add_theme_font_size_override("font_size", 20)
	empty.add_theme_color_override("font_color", host.data.color("text-muted"))
	panel.add_child(notice)
	notice.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	notice.add_theme_font_size_override("font_size", 14)
	notice.add_theme_color_override("font_color", host.data.color("text-danger"))
	panel.add_child(actions)
	actions.primary.text = "+ Новая игра"
	actions.primary.pressed.connect(func(): create_requested.emit())
	actions.back.pressed.connect(func(): back_requested.emit())
	panel.add_child(frame)
	frame.configure(host.data, 26)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	resized.connect(queue_arrange)
	# Wrapped labels settle their minimum height after the available width changes.
	# Reflow then, so the initial narrow measurement cannot stretch text over the footer.
	empty.minimum_size_changed.connect(queue_arrange)
	notice.minimum_size_changed.connect(queue_arrange)
	refresh(host.saves.list_heroes())

func refresh(entries: Array):
	for row in rows:
		grid.remove_child(row)
		row.queue_free()
	rows.clear()
	var sorted = entries.duplicate()
	sorted.sort_custom(func(a,b):
		var date_a = str(a.payload.get("savedAt", ""))
		var date_b = str(b.payload.get("savedAt", ""))
		return str(a.id) < str(b.id) if date_a == date_b else date_a > date_b)
	for entry in sorted:
		var row = preload("res://ui/hero_list_row.gd").new()
		grid.add_child(row)
		row.configure(host.data, entry, describe(entry.payload.get("game", {})))
		row.continued.connect(func(id): continued.emit(id))
		row.removed.connect(func(id, hero_name): removal_requested.emit(id, hero_name))
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		rows.append(row)
	empty.visible = rows.is_empty()
	set_notice("")

func describe(game: Dictionary) -> String:
	if game.is_empty(): return "Файл сохранён на устройстве"
	var journey: Dictionary = game.journey
	var status = host.phase_name(game.phase)
	if game.phase == "ready":
		if journey.has("service"):
			status = host.data.lookup(host.data.map_points.points, journey.service.type).get("name", status)
		else:
			var path: Array = journey.get("path", [])
			var current = host.data.lookup(journey.get("map", {}).get("nodes", []), path.back() if not path.is_empty() else "")
			if current.get("kind", "") == "fight" or current.is_empty() or current.get("kind", "") == "start": status = "Перед боем"
			elif current.has("mapPointType"): status = host.data.point_for_node(current).get("name", status)
	return "Карта %d · %s" % [journey.expedition, status]

func set_notice(text: String):
	notice.text = text
	notice.visible = not text.is_empty()
	queue_arrange()

func queue_arrange():
	if layout_queued: return
	layout_queued = true
	arrange.call_deferred()

func arrange():
	layout_queued = false
	if not host or size.x <= 0 or size.y <= 0: return
	var wide = size.x > size.y * 1.08
	panel.size = Vector2(minf(size.x, size.y * 1.65), size.y) if wide else Vector2(minf(560, size.x), minf(920, size.y))
	panel.position = (size - panel.size) / 2
	if wide: panel.position.x = 0
	elif size.y > size.x * 1.65: panel.position.y = size.y - panel.size.y
	var head = header.arrange(panel.size)
	var footer_top = actions.arrange(panel.size)
	notice.position = Vector2(24, footer_top - 52)
	notice.size = Vector2(panel.size.x - 48, 44)
	var list_end = notice.position.y - 8 if notice.visible else footer_top - 24
	scroll.position = Vector2(28, head + 18)
	scroll.size = Vector2(panel.size.x - 56, maxf(1, list_end - scroll.position.y))
	empty.position = scroll.position
	empty.size = scroll.size
	grid.columns = 2 if scroll.size.x >= 780 else 1
	var cell_width = (scroll.size.x - grid.get_theme_constant("h_separation") * (grid.columns - 1)) / grid.columns
	var row_height = clampf(cell_width * 0.43, 124, 188)
	for row in rows: row.custom_minimum_size = Vector2(0, row_height)
	shadow.material.set_shader_parameter("panel_size", panel.size)
	shadow.material.set_shader_parameter("header_height", head)

func _input(event):
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		if host.get_children().any(func(node): return node is ModalDialog and node.visible): return
		back_requested.emit()
		get_viewport().set_input_as_handled()
