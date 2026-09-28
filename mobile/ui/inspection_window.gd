extends Control
## Equipment and skill inspection; only the body scrolls, even while comparing or folding.
signal confirmed
signal canceled
signal upgrade_requested(stat: String, expected_value: int)
const GothicTheme = preload("res://ui/gothic_theme.gd")
const Surface = preload("res://ui/character_surface.gd")
const Frame = preload("res://ui/texture_frame.gd")
const Divider = preload("res://ui/textured_divider.gd")
const TabButton = preload("res://ui/character_tab_button.gd")
const Card = preload("res://ui/inspection_card.gd")
const Model = preload("res://ui/inspection_model.gd")
const FigureArt = preload("res://ui/figure_art.gd")
const Column = preload("res://ui/inspection_column.gd")
var host
var panel = Control.new()
var window_header = preload("res://ui/window_header.gd").new()
var header = window_header.surface
var footer = Surface.new()
var title = window_header.title
var scroll = ScrollContainer.new()
var body_padding = MarginContainer.new()
var body = VBoxContainer.new()
var columns = GridContainer.new()
var cards: Array = []
var groups: Array = []
var column_slots: Array = []
var warning = Label.new()
var upgrade_controls = preload("res://ui/requirement_upgrades.gd").new()
var upgrades: VBoxContainer
var primary = Button.new()
var secondary = Button.new()
var close_button = TabButton.new()
var footer_hint = Label.new()
var header_separator = window_header.divider
var footer_separator = Divider.new()
var close_separator = Divider.new()
var frame = Frame.new()
var shadow = ColorRect.new()
var options: Dictionary = {}
var closing = false
var previous_focus: Control
var parent_window
var parent_mode = Node.PROCESS_MODE_INHERIT
var margin_mode = Node.PROCESS_MODE_INHERIT
var had_parent = false

func configure(owner_ui, entries: Array, settings: Dictionary = {}):
	host = owner_ui
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	previous_focus = get_viewport().gui_get_focus_owner()
	parent_window = host.character_window
	had_parent = is_instance_valid(parent_window)
	margin_mode = host.margin.process_mode
	if had_parent:
		parent_mode = parent_window.process_mode
		parent_window.process_mode = Node.PROCESS_MODE_DISABLED
	cancel_gestures(host.margin)
	host.margin.process_mode = Node.PROCESS_MODE_DISABLED
	var shade = ColorRect.new()
	shade.color = Color(host.data.color("background-page"), 0.92)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(panel)
	panel.theme = host.theme.duplicate(false)
	for kind in ["Label", "Button"]: panel.theme.set_color("font_color",kind,host.data.color("text-home"))
	var surface = Surface.new()
	panel.add_child(surface)
	surface.configure(host.data, 26, 0.68)
	surface.frame.hide()
	surface.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(shadow)
	shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shadow.material = ShaderMaterial.new()
	shadow.material.shader = preload("res://shaders/character_shadow.gdshader")
	shadow.material.set_shader_parameter("shadow_color",host.data.color("shadow-character-card-2"))
	shadow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(window_header)
	window_header.configure(host.data)
	panel.add_child(footer)
	footer.configure(host.data, 20, 0.20)
	footer.frame.hide()
	for line in [footer_separator, close_separator]:
		panel.add_child(line)
		line.configure(host.data,line == close_separator)
	panel.add_child(scroll)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.follow_focus = true
	scroll.get_v_scroll_bar().value_changed.connect(func(_value): update_sticky_columns.call_deferred())
	scroll.resized.connect(update_sticky_columns)
	scroll.add_child(body_padding)
	body_padding.item_rect_changed.connect(update_sticky_columns)
	body_padding.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body_padding.add_theme_constant_override("margin_top",12)
	body_padding.add_theme_constant_override("margin_bottom",12)
	body_padding.add_child(body)
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation",16)
	body.add_child(warning)
	warning.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	warning.add_theme_font_size_override("font_size",15)
	body.add_child(upgrade_controls)
	upgrade_controls.requested.connect(func(stat,value): upgrade_requested.emit(stat,value))
	body.add_child(columns)
	columns.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	columns.add_theme_constant_override("h_separation",26)
	columns.add_theme_constant_override("v_separation",24)
	columns.sort_children.connect(func(): update_sticky_columns.call_deferred())
	for button in [secondary,primary]:
		panel.add_child(button)
	secondary.pressed.connect(func(): canceled.emit())
	primary.pressed.connect(func():
		if not primary.disabled and not closing: confirmed.emit())
	panel.add_child(close_button)
	close_button.configure(host.data,4,"Закрыть")
	close_button.pressed.connect(func(): canceled.emit())
	panel.add_child(footer_hint)
	footer_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	footer_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	footer_hint.add_theme_font_size_override("font_size",12)
	footer_hint.add_theme_color_override("font_color",host.data.color("text-muted"))
	panel.add_child(frame)
	frame.configure(host.data,26)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	canceled.connect(close)
	resized.connect(arrange)
	refresh(entries,settings)
	if is_instance_valid(previous_focus): previous_focus.release_focus()
	close_button.grab_focus()

func refresh(entries: Array, settings: Dictionary = {}):
	var offset = scroll.scroll_vertical
	options = settings
	for child in columns.get_children():
		columns.remove_child(child)
		child.queue_free()
	groups.clear()
	column_slots.clear()
	cards.clear()
	var model = Model.new(host.data,host.session.combat)
	var renderer = FigureArt.new(host.data,host.session.combat)
	for entries_in_column in entries:
		var slot = Column.new()
		columns.add_child(slot)
		column_slots.append(slot)
		var group = slot.content
		groups.append(group)
		group.resized.connect(func(): update_sticky_columns.call_deferred())
		for entry in entries_in_column:
			var card = Card.new()
			group.add_child(card)
			card.configure(host.data,renderer,model,entry)
			cards.append(card)
	title.text = options.get("title","Экипировка")
	primary.text = options.get("action","")
	primary.visible = not primary.text.is_empty()
	primary.disabled = not options.get("eligible",true)
	secondary.text = "Оставить" if entries.size() > 1 else "Назад"
	secondary.visible = primary.visible
	footer_hint.text = options.get("hint","")
	footer_hint.visible = primary.visible and not footer_hint.text.is_empty()
	footer_hint.add_theme_color_override("font_color",host.data.color("text-danger" if options.get("hint_danger",false) else "text-muted"))
	warning.text = options.get("warning","")
	warning.visible = not warning.text.is_empty()
	warning.add_theme_color_override("font_color",host.data.color("text-danger"))
	upgrade_controls.configure(host.data,options.get("requirements",{}))
	upgrades = upgrade_controls.steps
	host.margin.process_mode = Node.PROCESS_MODE_DISABLED
	arrange()
	restore_scroll.call_deferred(offset)

func restore_scroll(offset: int):
	if not closing: scroll.scroll_vertical = offset

func update_sticky_columns():
	if closing or not is_inside_tree(): return
	for slot in column_slots:
		slot.follow_scroll(scroll.get_global_rect(),columns.columns > 1)

func arrange():
	if not host or not is_inside_tree(): return
	var origin = Vector2(host.margin.get_theme_constant("margin_left"),host.margin.get_theme_constant("margin_top"))
	var area = size - origin - Vector2(host.margin.get_theme_constant("margin_right"),host.margin.get_theme_constant("margin_bottom"))
	panel.size = Vector2(minf(1120 if groups.size() > 1 else 540,host.AdaptiveLayout.content_width(area)),minf(900,area.y))
	panel.position = origin + (area - panel.size) / 2
	if area.y > area.x * 1.65: panel.position.y = origin.y + area.y - panel.size.y
	var head = window_header.arrange(panel.size)
	var compact = primary.visible and panel.size.x < 440
	footer_hint.size.x = panel.size.x-40
	var hint_height = maxf(18,footer_hint.get_minimum_size().y) if footer_hint.visible else 0.0
	var hint_space = hint_height+8 if footer_hint.visible else 0.0
	var foot = (140.0 if compact else 82.0)+hint_space
	footer.position = Vector2(2,panel.size.y-foot-2)
	footer.size = Vector2(panel.size.x-4,foot)
	footer_separator.position = Vector2(12,footer.position.y)
	footer_separator.size = Vector2(panel.size.x-24,2)
	# Insets belong to scrolling content, so the clipping edges meet both strips.
	scroll.position = Vector2(20,header.position.y+header.size.y)
	scroll.size = Vector2(panel.size.x-40,maxf(1,footer.position.y-scroll.position.y))
	columns.columns = groups.size() if panel.size.x >= 760 else 1
	update_sticky_columns.call_deferred()
	var close_side = 48.0
	footer_hint.position = Vector2(20,footer.position.y+10)
	footer_hint.size = Vector2(panel.size.x-40,hint_height)
	var y = footer.position.y + 12 + hint_space
	close_button.position = Vector2(panel.size.x-close_side-16,y)
	close_button.size = Vector2.ONE*close_side
	close_separator.visible = primary.visible
	close_separator.position = Vector2(close_button.position.x-8,y+4)
	close_separator.size = Vector2(2,close_side-8)
	if primary.visible:
		var available = panel.size.x-40 if compact else panel.size.x-close_side-60
		var width = (available-10)/2
		secondary.position = Vector2(20,y)
		secondary.size = Vector2(width,50)
		primary.position = Vector2(30+width,y)
		primary.size = Vector2(width,50)
		for button in [secondary,primary]: GothicTheme.fit_button_text(button,width)
		if compact:
			close_button.position = Vector2((panel.size.x-close_side)/2,y+58)
			close_separator.hide()
	else:
		close_button.position.x = (panel.size.x-close_side)/2
	shadow.material.set_shader_parameter("panel_size",panel.size)
	shadow.material.set_shader_parameter("header_height",head)

func get_ok_button() -> Button: return primary

func show_error(message: String):
	warning.text = message
	warning.show()
	scroll.scroll_vertical = 0

func cancel_gestures(node):
	if node.has_method("cancel_gesture"): node.cancel_gesture()
	for child in node.get_children(): cancel_gestures(child)

func restore_underlay():
	if not is_instance_valid(host): return
	if is_instance_valid(parent_window): parent_window.process_mode = parent_mode
	host.margin.process_mode = margin_mode if not had_parent or is_instance_valid(parent_window) else Node.PROCESS_MODE_INHERIT
	if host.inspection_window == self: host.inspection_window = null

func close():
	if closing: return
	closing = true
	restore_underlay()
	hide()
	if is_instance_valid(previous_focus) and previous_focus.is_inside_tree(): previous_focus.grab_focus()
	queue_free()

func _exit_tree():
	if not closing: restore_underlay()

func _input(event):
	if closing or not event is InputEventKey or not event.pressed: return
	if event.keycode == KEY_ESCAPE:
		canceled.emit()
		get_viewport().set_input_as_handled()
	elif event.keycode == KEY_TAB:
		var targets: Array = []
		collect_focus(self,targets)
		if not targets.is_empty():
			var index = targets.find(get_viewport().gui_get_focus_owner())
			targets[posmod(index+(-1 if event.shift_pressed else 1),targets.size())].grab_focus()
		get_viewport().set_input_as_handled()

func collect_focus(node, targets: Array):
	if node is Control and node.is_visible_in_tree() and node.focus_mode == Control.FOCUS_ALL and not (node is BaseButton and node.disabled): targets.append(node)
	for child in node.get_children(): collect_focus(child,targets)
