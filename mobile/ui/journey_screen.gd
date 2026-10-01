extends Control
const Header = preload("res://ui/game_header.gd")
const Map = preload("res://ui/journey_map.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var host
var header = Header.new()
var title = header.title
var map_scroll = ScrollContainer.new()
var map_view = Map.new()
var detail = Control.new()
var detail_shadow = preload("res://ui/panel_shadow.gd").new()
var surface = preload("res://ui/character_surface.gd").new()
var detail_icon = TextureRect.new()
var detail_title = Label.new()
var divider = preload("res://ui/header_divider.gd").new()
var description = Label.new()
var action = Button.new()
var notice = Label.new()
var selected = ""
var center_pending = false
var returning = false
var return_progress = 0.0
var return_motion: Tween
var return_node = ""
var return_identity: Array = []

func _init():
	set_notify_transform(true)
	add_child(map_scroll)
	map_scroll.add_child(map_view)
	map_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	map_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	map_scroll.follow_focus = false
	map_scroll.scroll_deadzone = 8
	for node in [detail, header, notice]: add_child(node)
	for node in [detail_shadow, surface, detail_icon, detail_title, divider, description, action]: detail.add_child(node)
	detail.hide()
	for node in [detail_title, description, notice, detail_icon]: node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for label in [detail_title, description, notice]:
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	detail_title.add_theme_font_size_override("font_size", 24)
	description.add_theme_font_size_override("font_size", 17)
	notice.add_theme_font_size_override("font_size", 13)
	detail_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	detail_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	action.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	action.add_theme_font_size_override("font_size", 18)
	action.alignment = HORIZONTAL_ALIGNMENT_RIGHT
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		action.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	resized.connect(arrange)

func configure(controller):
	host = controller
	header.configure_journey(host.data, host.session.game)
	header.player_requested.connect(host.show_character)
	surface.configure(host.data, 14, 0.48)
	detail_shadow.configure(host.data)
	for node in [detail_title, description, action]: node.add_theme_color_override("font_color", host.data.color("text-home"))
	notice.add_theme_color_override("font_color", host.data.color("text-danger"))
	map_view.configure(host)
	map_view.node_selected.connect(select_node)
	action.pressed.connect(func():
		if selected in host.session.available_nodes(): host.act(func(): return host.session.travel(selected)))
	# Opening the map is not selecting a destination.
	arrange()

func select_node(id: String):
	if returning: return
	selected = id
	map_view.selected = selected
	map_view.arrange()
	detail.visible = not selected.is_empty()
	if selected.is_empty(): return
	var node = host.data.lookup(host.session.game.journey.map.nodes, selected)
	var point = host.data.point_for_node(node)
	var available = selected in host.session.available_nodes()
	var visited = selected in host.session.game.journey.path
	var skipped = map_view.is_skipped(node)
	var hidden_point = not available and not visited and not skipped
	detail_icon.texture = null if hidden_point else host.data.image(point.get("icon", {}).get("symbol", ""))
	detail_title.text = "Неизведанный путь" if hidden_point else (node.name if skipped else point.name)
	description.text = host.data.story.rules.activities.get(point.id, {}).get("description", point.get("description", ""))
	if node.kind == "fight": description.text = host.data.story.rules.ui.beforeCombatLabel
	if not available: description.text = "Вы находитесь здесь." if selected == host.session.current_node() else ("Путь пройден." if visited else ("Этот путь уже недоступен." if skipped else "Этот путь пока недоступен."))
	action.text = point.get("actionLabel", host.data.story.rules.ui.beforeCombatLabel) + " →"
	action.visible = available
	action.disabled = not available
	arrange_detail()

func set_notice(text: String):
	notice.text = text

func _notification(what):
	if what == NOTIFICATION_TRANSFORM_CHANGED: arrange.call_deferred()

func arrange():
	if not host or not is_inside_tree() or size.x < 1: return
	header.position = Vector2.ZERO
	header.size = Vector2(size.x, Header.HEIGHT)
	header.layout()
	var viewport = get_global_transform().affine_inverse() * get_viewport_rect()
	map_scroll.position = viewport.position
	map_scroll.size = viewport.size
	map_view.layout(map_scroll.size, header.frames[0].size.x)
	arrange_detail()
	if not center_pending:
		center_pending = true
		center_active.call_deferred()

func center_active():
	await get_tree().process_frame
	if not is_inside_tree(): return
	center_pending = false
	if returning:
		apply_return_progress(return_progress)
		return
	var receipt = host.session.game.journey.get("returnFromDefeat", {})
	var identity = [host.session.game.journey.expedition, receipt]
	if not receipt.is_empty() and host.session.game.journey.get("awaitingFirstBattle", false) and host.presented_returns.get(host.hero_id, []) != identity:
		start_return(receipt.nodeId, identity)
	else:
		center_on(map_view.centers[host.session.current_node()] if not receipt.is_empty() and host.session.game.journey.get("awaitingFirstBattle", false) else map_view.active_center())

func center_on(point: Vector2):
	map_scroll.scroll_horizontal = roundi(point.x - map_scroll.size.x / 2)
	map_scroll.scroll_vertical = roundi(point.y - map_scroll.size.y / 2)

func start_return(id: String, identity: Array):
	if not map_view.centers.has(id):
		center_on(map_view.active_center())
		return
	returning = true
	return_node = id
	return_identity = identity.duplicate(true)
	map_view.show_return_point(id, true)
	for marker in map_view.markers.values():
		marker.disabled = true
		marker.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_scroll.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	apply_return_progress(0.0)
	return_motion = create_tween()
	return_motion.tween_interval(0.65)
	return_motion.tween_method(apply_return_progress, 0.0, 1.0, 1.65).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	return_motion.tween_callback(finish_return)

func apply_return_progress(progress: float):
	return_progress = progress
	center_on(map_view.centers[return_node].lerp(map_view.centers[host.session.current_node()], progress))

func finish_return():
	apply_return_progress(1.0)
	map_view.show_return_point(return_node, false)
	host.presented_returns[host.hero_id] = return_identity.duplicate(true)
	returning = false
	for marker in map_view.markers.values():
		marker.disabled = false
		marker.mouse_filter = Control.MOUSE_FILTER_STOP
	map_scroll.mouse_filter = Control.MOUSE_FILTER_STOP
	map_view.mouse_filter = Control.MOUSE_FILTER_PASS

func arrange_detail():
	var width = minf(size.x, 540)
	var inset = 18.0
	description.size.x = maxf(1, width - inset * 2)
	var body_height = maxf(44, description.get_minimum_size().y)
	var height = 80 + body_height + (48 if action.visible else 16)
	detail.position = Vector2((size.x - width) / 2, size.y - height - 12)
	detail.size = Vector2(width, height)
	surface.size = detail.size
	detail_shadow.fit_panel(Rect2(Vector2.ZERO, detail.size))
	var art_size = minf(132, width * 0.35) * 1.5
	detail_icon.position = Vector2(width - art_size - 10, -art_size * 0.64)
	detail_icon.size = Vector2.ONE * art_size
	detail_title.position = Vector2(inset, 14)
	detail_title.size = Vector2(width - art_size * 0.78 - inset * 2, 36)
	var fitted = 24
	while fitted > 16 and GothicTheme.DISPLAY_FONT.get_string_size(detail_title.text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x > detail_title.size.x: fitted -= 1
	detail_title.add_theme_font_size_override("font_size", fitted)
	divider.position = Vector2(inset, 52)
	divider.size = Vector2(width - art_size * 0.78 - inset * 2, 12)
	description.position = Vector2(inset, 80)
	description.size.y = body_height
	action.position = Vector2(inset, height - 46)
	action.size = Vector2(width - inset * 2, 36)
	notice.position = Vector2(0, Header.HEIGHT)
	notice.size = Vector2(size.x, 24)
