extends Control
const Header = preload("res://ui/game_header.gd")
const Map = preload("res://ui/journey_map.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var host
var header = Header.new()
var title = Label.new()
var subtitle = Label.new()
var map_view = Map.new()
var detail = PanelContainer.new()
var detail_icon = TextureRect.new()
var detail_title = Label.new()
var description = Label.new()
var action = Button.new()
var notice = Label.new()
var selected = ""

func _init():
	for node in [header, title, subtitle, map_view, detail, notice, action]: add_child(node)
	for node in [title, subtitle, detail_title, description, notice]:
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE
		node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	for node in [title, subtitle, notice]: node.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	title.add_theme_font_size_override("font_size", 26)
	subtitle.add_theme_font_size_override("font_size", 13)
	notice.add_theme_font_size_override("font_size", 13)
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	detail.add_child(row)
	row.add_child(detail_icon)
	detail_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	detail_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	detail_icon.custom_minimum_size = Vector2(52, 52)
	var texts = VBoxContainer.new()
	texts.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(texts)
	texts.add_child(detail_title)
	texts.add_child(description)
	detail_title.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	detail_title.add_theme_font_size_override("font_size", 19)
	description.add_theme_font_size_override("font_size", 14)
	resized.connect(arrange)
	title.minimum_size_changed.connect(func(): arrange.call_deferred())
	description.minimum_size_changed.connect(func(): arrange.call_deferred())

func configure(controller):
	host = controller
	header.configure_journey(host.data, host.session.game, host.animated)
	header.player_requested.connect(host.show_character)
	header.menu_requested.connect(host.show_journey_menu)
	title.text = host.data.lookup(host.data.maps, host.session.game.journey.mapPreset).name
	subtitle.text = "Круг %d · Пройдено противников %d / 5" % [host.session.game.journey.expedition, host.session.game.journey.cleared]
	for node in [title, detail_title]: node.add_theme_color_override("font_color", host.data.color("text-home"))
	for node in [subtitle, description]: node.add_theme_color_override("font_color", host.data.color("text-muted"))
	notice.add_theme_color_override("font_color", host.data.color("text-danger"))
	map_view.configure(host)
	map_view.node_selected.connect(select_node)
	action.pressed.connect(func():
		if selected in host.session.available_nodes(): host.act(func(): return host.session.travel(selected)))
	var available = host.session.available_nodes()
	select_node(available[0] if not available.is_empty() else host.session.current_node())
	arrange()

func select_node(id: String):
	selected = id
	map_view.selected = id
	map_view.arrange()
	var node = host.data.lookup(host.session.game.journey.map.nodes, id)
	detail_icon.texture = map_view.icon_for(node)
	detail_title.text = node.name
	match node.kind:
		"camp":
			description.text = "Полное восстановление здоровья и сил."
			action.text = "К костру"
		"forge":
			description.text = "Замените один предмет экипировки."
			action.text = "В кузницу"
		_:
			var enemy = host.session.game.journey.enemies[id]
			detail_title.text = enemy.name
			description.text = "Последний противник этой карты." if node.stage == 5 else "Противник %d · Подготовьтесь к бою." % node.stage
			action.text = "В бой"
	action.disabled = id not in host.session.available_nodes()
	if action.disabled:
		description.text = "Путь пройден." if id in host.session.game.journey.path else "Этот путь пока недоступен."
	arrange()

func set_notice(text: String):
	notice.text = text

func arrange():
	if not host or not is_inside_tree() or size.x < 1: return
	header.position = Vector2.ZERO
	header.size = Vector2(size.x, 88)
	title.position = Vector2(0, 100)
	title.size = Vector2(size.x, 64)
	title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	subtitle.position = Vector2(0, 164)
	subtitle.size = Vector2(size.x, 22)
	var wide = size.x >= 720
	var detail_width = minf(360, size.x * 0.4) if wide else size.x
	var map_width = size.x - detail_width - 28 if wide else size.x
	var map_bottom = size.y - 24 if wide else size.y - 192
	map_view.position = Vector2(0, 194)
	map_view.size = Vector2(map_width, maxf(120, map_bottom - 194))
	var left = map_width + 28 if wide else 0.0
	var bottom = minf(size.y - 78, 420) if wide else size.y - 78
	detail.position = Vector2(left, bottom - 100)
	detail.size = Vector2(detail_width, 100)
	notice.position = Vector2(left, bottom)
	notice.size = Vector2(detail_width, 24)
	action.position = Vector2(left, bottom + 24)
	action.size = Vector2(detail_width, 54)
