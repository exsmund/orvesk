extends Control
const AdaptiveLayout = preload("res://ui/adaptive_layout.gd")
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://game/session.gd")
const SaveStore = preload("res://game/save_store.gd")
const Preferences = preload("res://game/preferences.gd")
const HomeScreen = preload("res://ui/home_screen.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
const Header = preload("res://ui/game_header.gd")
const JourneyScreen = preload("res://ui/journey_screen.gd")
const ResourceBar = preload("res://ui/resource_bar.gd")
const CombatScreen = preload("res://ui/combat_screen.gd")
const FigureArt = preload("res://ui/figure_art.gd")
const CombatDetails = preload("res://ui/combat_details.gd")
const RULES_TEXT = "Размещайте карты на поле 3×3. Свои фигуры не пересекаются; фигуры противника можно перекрывать.\n\nАтака против атаки: обе наносят половину урона. Блок и уклонение отменяют входящий урон. Парирование наносит встречный удар.\n\nБлок расходует 1 силу за перекрытую клетку атаки. При первом ходе резервируется полная стоимость блока.\n\nПустое поле восстанавливает силы после удара противника, если герой выжил. Обычно каждый следующий ход даёт +2 силы.\n\nЗа победу осколки начисляются сразу. Затем получите одну награду: за более слабого противника — одно предложение, за равного или сильного — два. Предмет на вырост можно открыть и повысить нужные характеристики за осколки прямо в его карточке. У костра здоровье восстанавливается. В кузнице можно заменить предмет.\n\nИгра сохраняет каждое действие на устройстве. Интернет не требуется."
const CharacterWindow = preload("res://ui/character_window.gd")
const SquareButton = preload("res://ui/square_button.gd")
const CombatReport = preload("res://ui/combat_report_dialog.gd")
const InspectionWindow = preload("res://ui/inspection_window.gd")
const InspectionModel = preload("res://ui/inspection_model.gd")
var data = Catalog.new()
var session = Session.new(data)
var saves = SaveStore.new()
var preferences = Preferences.new()
var hero_id = ""
var draft: Array = []
var selected = ""
var card_rotation = 0
var screen = "home"
var animated = true
var content: VBoxContainer
var scroll: ScrollContainer
var notice: Label
var backdrop = TextureRect.new()
var overlay = ColorRect.new()
var margin = MarginContainer.new()
var create_stats = {"strength": 1, "agility": 1, "vitality": 1, "intelligence": 1}
var create_name = ""
var create_portrait = 0
var board
var busy = false
var combat_view
var rotations: Dictionary = {}
var layout_queued = false
var layout_timer: Timer
var home_view
var journey_view
var character_window
var inspection_window
var page_padding = MarginContainer.new()

func _ready():
	get_tree().auto_accept_quit = false
	Engine.max_fps = 60
	animated = preferences.animated
	theme = make_theme()
	add_child(backdrop)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.color = data.color("background-page")
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]: margin.add_theme_constant_override("margin_" + side, 18)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margin.add_child(scroll)
	content = VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 12)
	scroll.add_child(page_padding)
	page_padding.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page_padding.add_child(content)
	get_viewport().size_changed.connect(queue_layout)
	resized.connect(queue_layout)
	content.resized.connect(queue_layout)
	scroll.resized.connect(queue_layout)
	if OS.get_name() == "Android":
		# Insets can arrive after the fold/rotation size event.
		layout_timer = Timer.new()
		layout_timer.wait_time = 0.25
		layout_timer.timeout.connect(update_safe_area)
		add_child(layout_timer)
		layout_timer.start()
	show_home()
	queue_layout()

func make_theme() -> Theme:
	return GothicTheme.make(data)

func queue_layout():
	if layout_queued: return
	layout_queued = true
	apply_layout.call_deferred()

func available_content_width() -> float:
	var gutters = margin.get_theme_constant("margin_left") + margin.get_theme_constant("margin_right")
	var scrollbar_width = scroll.get_v_scroll_bar().get_combined_minimum_size().x if scroll.get_v_scroll_bar().visible else 0.0
	return maxf(0, size.x - gutters - scrollbar_width)

func apply_layout():
	layout_queued = false
	if not is_instance_valid(content): return
	update_safe_area()
	var inset = maxi(0, int((scroll.size.x - 620) / 2)) if screen != "home" else 0
	page_padding.add_theme_constant_override("margin_left", inset)
	page_padding.add_theme_constant_override("margin_right", inset)
	if is_instance_valid(home_view):
		home_view.custom_minimum_size.y = maxf(600, scroll.size.y - (notice.size.y + 12 if notice.visible else 0))
	if is_instance_valid(character_window): character_window.arrange()
	if is_instance_valid(inspection_window): inspection_window.arrange()
	# Keep modal dialogs usable when the available window becomes narrower.
	for child in get_children():
		if child is AcceptDialog and child.visible:
			child.popup_centered(Vector2i(mini(430, int(size.x) - 36), mini(child.size.y, int(size.y) - 48)))

func update_safe_area():
	if OS.get_name() != "Android" or not is_instance_valid(content): return
	var window_pixels = Rect2(Vector2(DisplayServer.window_get_position()), Vector2(DisplayServer.window_get_size()))
	var margins = AdaptiveLayout.safe_margins(size, window_pixels, Rect2(DisplayServer.get_display_safe_area()))
	for side in margins:
		if margin.get_theme_constant("margin_" + side) != margins[side]:
			margin.add_theme_constant_override("margin_" + side, margins[side])


func clear(title: String, subtitle: String = ""):
	if is_instance_valid(inspection_window) and not busy: inspection_window.close()
	if is_instance_valid(character_window): character_window.close()
	for child in content.get_children():
		content.remove_child(child)
		child.queue_free()
	board = null
	if is_instance_valid(combat_view):
		margin.remove_child(combat_view)
		combat_view.queue_free()
	combat_view = null
	if is_instance_valid(journey_view):
		margin.remove_child(journey_view)
		journey_view.queue_free()
	journey_view = null
	scroll.show()
	scroll.scroll_vertical = 0
	home_view = null
	overlay.material = null
	queue_layout()
	if not title.is_empty():
		var heading = label(title, 30, "text-highlight")
		heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		heading.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		heading.custom_minimum_size.y = 60
	if subtitle: label(subtitle, 14, "text-muted")
	notice = label("", 15, "text-danger")
	notice.hide()
	if not session.game.is_empty():
		var preset = data.lookup(data.maps, session.game.journey.mapPreset)
		backdrop.texture = data.image(preset.battleBackground if session.game.phase == "combat" else preset.background)
		overlay.color = Color(data.color("background-page"), 0.76)
	else:
		backdrop.texture = data.image(data.maps[0].background)
		overlay.color = Color(data.color("background-page"), 0.70)

func label(text: String, font_size: int = 18, color: String = "text-primary", parent = null) -> Label:
	var node = Label.new()
	node.text = text
	node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	node.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	node.add_theme_font_size_override("font_size", font_size)
	node.add_theme_color_override("font_color", data.color(color))
	(parent if parent else content).add_child(node)
	return node

func button(text: String, callback: Callable, parent = null, disabled: bool = false) -> Button:
	var node = SquareButton.new() if text in ["+", "−"] else Button.new()
	if node is SquareButton: node.configure(data, text)
	node.text = text
	node.custom_minimum_size.y = 52
	node.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	node.disabled = disabled
	node.pressed.connect(callback)
	if text in ["+", "−", "←", "→"]:
		node.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		node.custom_minimum_size.x = 52
	(parent if parent else content).add_child(node)
	return node

func row(parent = null) -> HBoxContainer:
	var node = HBoxContainer.new()
	node.add_theme_constant_override("separation", 8)
	(parent if parent else content).add_child(node)
	return node

func message(text: String):
	if is_instance_valid(combat_view): combat_view.set_notice(text)
	if is_instance_valid(journey_view): journey_view.set_notice(text)
	notice.text = text
	notice.visible = not text.is_empty()

func persist() -> bool:
	if hero_id.is_empty() or session.game.is_empty(): return true
	var ok = saves.write(hero_id, session, draft)
	if not ok and is_instance_valid(notice): message(saves.error)
	return ok

func act(callback: Callable) -> bool:
	if busy: return false
	busy = true
	var previous = session.game.duplicate(true)
	var previous_rng = session.combat.rng.state
	var error = callback.call()
	if error:
		session.game = previous
		session.combat.rng.state = previous_rng
		message(error)
		busy = false
		return false
	var previous_draft = draft.duplicate(true)
	draft = []
	selected = ""
	if not persist():
		session.game = previous
		session.combat.rng.state = previous_rng
		draft = previous_draft
		busy = false
		return false
	show_game()
	busy = false
	return true

func show_home():
	screen = "home"
	clear("")
	backdrop.texture = data.image("/ui/start-landscape-v1.png")
	var shading = ShaderMaterial.new()
	shading.shader = preload("res://shaders/home_overlay.gdshader")
	var tokens = {"top_color": "background-start-screen", "upper_color": "background-start-screen-2", "lower_color": "background-start-screen-3", "bottom_color": "background-start-screen-4", "center_color": "background-start-screen-5"}
	for entry in tokens:
		shading.set_shader_parameter(entry, data.color(tokens[entry]))
	overlay.material = shading
	var entries = saves.list_heroes()
	home_view = HomeScreen.new()
	home_view.configure(data, latest_hero(entries), entries.any(func(entry): return entry.payload.is_empty()))
	home_view.continue_requested.connect(load_hero)
	home_view.create_requested.connect(start_create)
	home_view.heroes_requested.connect(show_heroes)
	home_view.settings_requested.connect(show_settings)
	content.add_child(home_view)
	scroll.scroll_vertical = 0

func latest_hero(entries: Array) -> Dictionary:
	var latest: Dictionary = {}
	for entry in entries:
		if entry.payload.is_empty(): continue
		if entry.id == preferences.last_hero: return entry
		if latest.is_empty() or str(entry.payload.get("savedAt", "")) > str(latest.payload.get("savedAt", "")):
			latest = entry
	return latest

func start_create():
	create_stats = {"strength": 1, "agility": 1, "vitality": 1, "intelligence": 1}
	create_name = ""
	create_portrait = 0
	show_create()

func show_heroes():
	screen = "heroes"
	clear("Герои", "Выберите историю, которую хотите продолжить.")
	var entries = saves.list_heroes()
	if entries.is_empty(): label("Пока нет героев. Начните новую историю.", 18, "text-muted")
	for entry in entries:
		if entry.payload.is_empty():
			button("Повреждённое сохранение", func(): message("Сохранение оставлено на устройстве для восстановления."))
		else:
			var g = entry.payload.game
			button("%s · уровень %d\nКруг %d · %s" % [g.player.name, data.level(g.player), g.journey.expedition, phase_name(g.phase)], func(): load_hero(entry.id))
	button("Новая игра", start_create)
	button("Назад", show_home)

func set_resource_animation(enabled: bool) -> bool:
	var previous = preferences.animated
	preferences.animated = enabled
	if not preferences.write():
		preferences.animated = previous
		message("Не удалось сохранить настройку. Попробуйте ещё раз.")
		return false
	animated = enabled
	return true

func show_settings():
	screen = "settings"
	clear("Настройки")
	var toggle = CheckButton.new()
	toggle.text = "Анимация полосок ресурсов"
	toggle.button_pressed = animated
	toggle.custom_minimum_size.y = 64
	content.add_child(toggle)
	label("Плавное изменение здоровья и сил при действиях. Без огня и дыма. При отключении шкалы обновляются мгновенно.", 16, "text-muted")
	var previews: Array = []
	for kind in ["health", "stamina"]:
		var preview = ResourceBar.new()
		content.add_child(preview)
		preview.configure(data, "Здоровье" if kind == "health" else "Силы", 21 if kind == "health" else 5, 30 if kind == "health" else 8, kind, animated)
		previews.append(preview)
	toggle.toggled.connect(func(enabled):
		if not set_resource_animation(enabled): toggle.set_pressed_no_signal(animated); return
		for preview in previews: preview.set_animation(animated))
	button("Как играть", show_rules)
	button("Назад", show_home)

func phase_name(phase: String) -> String:
	return {"ready": "Путешествие", "combat": "Бой", "victory": "Награда", "defeat": "Поражение", "draw": "Ничья"}.get(phase, phase)

func load_hero(id: String):
	var payload = saves.read(id)
	if payload.is_empty():
		message(saves.error)
		return
	var error = session.restore(payload)
	if error:
		message(error)
		return
	hero_id = id
	draft = payload.get("draft", [])
	selected = ""
	preferences.last_hero = id
	preferences.write()
	show_game()
	if saves.error: message(saves.error)

func show_create():
	screen = "create"
	clear("Новый герой", "Распределите 3 очка. Живучесть увеличивает здоровье.")
	var portrait = TextureRect.new()
	portrait.texture = data.image(data.portraits[create_portrait].src)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.custom_minimum_size.y = 220
	content.add_child(portrait)
	var navigation = row()
	button("←", func(): create_portrait = posmod(create_portrait - 1, data.portraits.size()); show_create(), navigation)
	label(data.portraits[create_portrait].label, 18, "text-highlight", navigation).size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button("→", func(): create_portrait = (create_portrait + 1) % data.portraits.size(); show_create(), navigation)
	var name_input = LineEdit.new()
	name_input.placeholder_text = "Имя героя"
	name_input.max_length = 24
	name_input.text = create_name
	name_input.custom_minimum_size.y = 52
	name_input.text_changed.connect(func(value): create_name = value)
	content.add_child(name_input)
	var total = 0
	for value in create_stats.values(): total += int(value)
	var stats_box = section("Осталось очков: %d" % (7 - total))
	for stat in data.STATS:
		var controls = row(stats_box)
		label("%s: %d" % [data.STAT_NAMES[stat], create_stats[stat]], 18, "text-primary", controls).size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button("−", func(): create_stats[stat] -= 1; show_create(), controls, create_stats[stat] <= 1)
		button("+", func(): create_stats[stat] += 1; show_create(), controls, total >= 7)
	button("Начать путешествие", func():
		var error = session.create(create_name, create_stats, data.portraits[create_portrait].id)
		if error: message(error); return
		hero_id = Crypto.new().generate_random_bytes(12).hex_encode()
		draft = []
		if persist():
			preferences.last_hero = hero_id
			preferences.write()
			show_game(), null, total != 7)
	button("Назад", show_home)

func show_game():
	screen = "game"
	var g = session.game
	if g.phase == "combat":
		clear("")
		show_combat()
		return
	if g.phase == "ready":
		show_journey()
		return
	clear("")
	page_header()
	match g.phase:
		"victory": show_rewards()
		"defeat", "draw":
			var heading = label(phase_name(g.phase), 32, "text-home")
			heading.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
			heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			show_last_result()
			label("Непотраченные осколки остались у противника. Победите его, чтобы вернуть их." if g.phase == "defeat" else "Силы оказались равны.")
			button("Начать карту заново" if g.phase == "defeat" else "Повторить бой", func(): act(session.restart))
			button("Главное меню", func(): if persist(): show_home())

func page_header():
	var header = Header.new()
	header.custom_minimum_size.y = 88
	content.add_child(header)
	header.configure_journey(data, session.game, animated)
	header.player_requested.connect(show_character)
	header.menu_requested.connect(show_journey_menu)
	content.move_child(header, 0)

func section(title: String) -> VBoxContainer:
	var panel = PanelContainer.new()
	content.add_child(panel)
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	panel.add_child(box)
	if title:
		var heading = label(title, 22, "text-home", box)
		heading.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	return box

func choice(title: String, description: String, texture: Texture2D, caption: String = "", callback: Callable = Callable(), disabled: bool = false):
	var box = section("")
	var line = row(box)
	if texture:
		var icon = TextureRect.new()
		icon.texture = texture
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.custom_minimum_size = Vector2(64, 64)
		line.add_child(icon)
	var words = VBoxContainer.new()
	words.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	line.add_child(words)
	label(title, 20, "text-home", words).add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	label(description, 15, "text-muted", words)
	if callback.is_valid(): button(caption, callback, box, disabled)

func fighter_panel(f: Dictionary, parent, compact: bool = false):
	var box = VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.add_child(box)
	var portrait = TextureRect.new()
	portrait.texture = data.portrait(f)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.custom_minimum_size.y = 48 if compact else 95
	box.add_child(portrait)
	label(f.name, 17, "text-highlight", box)
	for kind in ["health", "stamina"]:
		var bar = ResourceBar.new()
		box.add_child(bar)
		bar.configure(data, "Здоровье" if kind == "health" else "Силы", f.hp if kind == "health" else f.stamina, data.max_hp(f) if kind == "health" else data.balance.stamina.max, kind, animated)

func show_combat():
	scroll.hide()
	combat_view = CombatScreen.new()
	margin.add_child(combat_view)
	combat_view.configure(self)
	board = combat_view.board
	overlay.color = Color(data.color("background-page"), 0.56)

func rotation_for(id: String) -> int:
	var moves = session.game.clashPlan.playerPlaced if session.game.clashPlan.stage == "reveal" else draft
	for move in moves:
		if move.id == id: return int(move.rotation)
	return int(rotations.get(id, card_rotation if id == selected else 0))

func can_place_card(id: String, index: int, rotation: int) -> bool:
	if index < 0 or index > 8 or session.game.clashPlan.stage == "reveal": return false
	var card = session.combat.card_by_id(session.game.player, id)
	if card.is_empty(): return false
	var modifiers = session.game.clashPlan.playerModifiers
	var occupied: Array = []
	for move in draft:
		if move.id != id:
			occupied.append_array(session.combat.cells(session.combat.card_by_id(session.game.player, move.id), move, modifiers))
	var candidate = {"id": id, "x": index % 3, "y": int(index / 3), "rotation": rotation}
	for cell in session.combat.cells(card, candidate, modifiers):
		if cell < 0 or cell in occupied: return false
	return true

func place_card(id: String, index: int, rotation: int):
	if not can_place_card(id, index, rotation):
		message("Фигура не помещается. Поверните её или выберите другую клетку.")
		return
	var previous = draft.duplicate(true)
	var next = draft.filter(func(move): return move.id != id)
	next.append({"id": id, "x": index % 3, "y": int(index / 3), "rotation": rotation})
	draft = next
	if not persist(): draft = previous; return
	selected = id
	card_rotation = rotation
	rotations[id] = rotation
	combat_view.refresh()

func place_selected(index: int):
	if session.game.clashPlan.stage == "reveal" or index < 0: return
	var own = session.combat.layer(session.game.player, draft, session.game.clashPlan.playerModifiers)
	if not own[index].is_empty():
		var previous = draft.duplicate(true)
		var id = own[index].id
		draft = draft.filter(func(move): return move.id != id)
		if not persist(): draft = previous; return
		combat_view.refresh()
	elif not selected.is_empty(): place_card(selected, index, rotation_for(selected))

func rotate_card(id: String):
	if session.game.clashPlan.stage == "reveal": return
	var rotation = (rotation_for(id) + 1) % 4
	for move in draft:
		if move.id == id:
			if can_place_card(id, int(move.y) * 3 + int(move.x), rotation): place_card(id, int(move.y) * 3 + int(move.x), rotation)
			else: message("Для поворота не хватает места. Переместите фигуру.")
			return
	selected = id
	card_rotation = rotation
	rotations[id] = rotation
	combat_view.refresh()

func show_figure_details(card: Dictionary, fighter: Dictionary):
	var art = FigureArt.new(data, session.combat)
	var lines: Array = [card.get("description", "")]
	var hp = art.damage(fighter, card)
	if hp > 0: lines.append("Урон здоровью за клетку: " + art.number(hp))
	if card.get("staminaDamagePerCell", 0) > 0: lines.append("Урон выносливости за клетку: " + art.number(card.staminaDamagePerCell))
	if card.get("healing", 0) > 0: lines.append("Лечение за фигуру: " + art.number(card.healing))
	if card.get("blocks", false): lines.append("Блокирует входящий урон")
	if card.get("evades", false): lines.append("Уклонение от входящего урона")
	if card.get("counter", false): lines.append("Урон при контратаке")
	lines.append("Цена: %s выносливости" % art.number(card.get("staminaCost", 0)))
	if card.get("blockCost", 0) > 0: lines.append("Дополнительно за заблокированную клетку: " + art.number(card.blockCost))
	lines.append("Клеток: %d · Копий в колоде: %d" % [card.shape.size(), card.get("copies", 1)])
	show_info(card.name, "\n\n".join(lines))

func show_info(title: String, text: String):
	var dialog = CombatReport.new()
	add_child(dialog)
	dialog.theme = theme
	dialog.configure(title, text, data)
	# Preserve the accessible/native description, while long content gets bounded scrolling.
	dialog.get_label().autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dialog.dialog_text = text
	dialog.get_label().hide()
	var width = mini(430, int(size.x) - 36)
	var lines = text.count("\n") + int(text.length() / maxf(1, width / 9.0)) + 1
	var height = clampi(lines * 23 + 110, 220, mini(560, int(size.y) - 80))
	dialog.popup_centered(Vector2i(width, height))

func show_combat_report(title: String, text: String):
	var dialog = CombatReport.new()
	add_child(dialog)
	dialog.theme = theme
	dialog.configure(title, text, data)
	dialog.popup_centered(Vector2i(mini(430, int(size.x) - 36), mini(560, int(size.y) - 48)))

func show_cell_details(cell: Dictionary):
	var details = CombatDetails.new(data)
	show_combat_report(details.cell_title(cell), details.cell_text(cell))

func show_last_clash_details():
	if session.game.get("log", []).is_empty(): return
	var record = session.game.log[0]
	show_combat_report("Разбор хода %d" % record.round, CombatDetails.new(data).result_text(record))

func show_enemy_details():
	var f = session.game.enemy
	var lines: Array = []
	for stat in data.STATS: lines.append("%s: %d" % [data.STAT_NAMES[stat], f.stats[stat]])
	show_info(f.name, "\n".join(lines))

func show_battle_menu():
	var dialog = AcceptDialog.new()
	dialog.title = "Свободное поле" if session.game.journey.battleMode == "free" else "Единственный шанс"
	dialog.ok_button_text = "Вернуться в бой"
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	dialog.add_child(box)
	label("Сброшенные фигуры возвращаются в колоду." if session.game.journey.battleMode == "free" else "Каждая фигура используется один раз за бой.", 16, "text-muted", box)
	button("Герой", func(): dialog.queue_free(); show_character(), box)
	button("Главное меню", func():
		if persist(): dialog.queue_free(); show_home(), box)
	if session.game.clashPlan.stage != "reveal":
		button("Очистить поле", func():
			var previous = draft.duplicate(true)
			draft = []
			if not persist(): draft = previous; return
			dialog.queue_free()
			combat_view.refresh(), box, draft.is_empty())
		if data.item(session.game.player.gear.get("amulet")).get("charmEffect", "") == "compress":
			button("Сжать выбранную фигуру", func(): dialog.queue_free(); act(func(): return session.compress(selected)), box, selected.is_empty())
		if session.game.journey.battleMode == "expendable":
			button("Завершить действия", func(): dialog.queue_free(); confirm_finish(), box)
	if not session.game.get("log", []).is_empty():
		var record = session.game.log[0]
		label("Последний ход: вы потеряли %s HP, противник — %s HP." % [str(record.summary.player.damage), str(record.summary.enemy.damage)], 14, "text-muted", box)
		button("Разбор последнего хода", func(): dialog.queue_free(); show_last_clash_details(), box)
	add_child(dialog)
	dialog.theme = theme
	dialog.confirmed.connect(dialog.queue_free)
	dialog.canceled.connect(dialog.queue_free)
	dialog.popup_centered(Vector2i(mini(430, int(size.x) - 36), 0))

func show_last_result():
	if session.game.get("log", []).is_empty(): return
	var record = session.game.log[0]
	label("Ход %d: вы потеряли %s HP, противник — %s HP." % [record.round, str(record.summary.player.damage), str(record.summary.enemy.damage)], 15, "text-muted")
	button("Разбор последнего хода", show_last_clash_details)

func show_journey():
	var g = session.game
	clear("")
	if session.current_node().begins_with("forge") and not g.journey.get("forgeResolved", false):
		page_header()
		label("Кузница", 30, "text-home").add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		label("Выберите замену экипировки", 16, "text-muted")
		for reference in g.journey.offers:
			var equipment = data.item(reference)
			var tile = preload("res://ui/equipment_slot.gd").new()
			content.add_child(tile)
			tile.custom_minimum_size = Vector2(108,108)
			tile.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			tile.configure(data,data.image(data.art.get(equipment.templateId, "")))
			tile.tooltip_text = equipment.name
			tile.pressed.connect(func(): show_forge_details(reference))
			button(equipment.name,func(): show_forge_details(reference))
		button("Пройти мимо", func(): act(session.forge))
		return
	scroll.hide()
	journey_view = JourneyScreen.new()
	margin.add_child(journey_view)
	journey_view.configure(self)
	overlay.color = Color(data.color("background-page"), 0.35)

func show_journey_menu():
	var dialog = AcceptDialog.new()
	dialog.title = "Путешествие"
	dialog.ok_button_text = "Вернуться"
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	dialog.add_child(box)
	button("Герой", func(): dialog.queue_free(); show_character(), box)
	button("Главное меню", func():
		if persist(): dialog.queue_free(); show_home(), box)
	add_child(dialog)
	dialog.theme = theme
	dialog.confirmed.connect(dialog.queue_free)
	dialog.canceled.connect(dialog.queue_free)
	dialog.popup_centered(Vector2i(mini(430, int(size.x) - 36), 0))

func item_text(equipment: Dictionary) -> String:
	var requirements: Array = []
	for stat in equipment.requirements: requirements.append("%s %d" % [data.STAT_NAMES[stat], equipment.requirements[stat]])
	return "Уровень %d · %s\n%s" % [equipment.level, ", ".join(requirements), equipment.description]

func shard_amount(amount: int) -> String:
	var word = "осколков"
	if amount % 100 < 11 or amount % 100 > 14:
		if amount % 10 == 1: word = "осколок"
		elif amount % 10 in [2, 3, 4]: word = "осколка"
	return "%d %s" % [amount, word]

func reward_entry(reward: Dictionary) -> Dictionary:
	var entry = {"title": "", "description": "", "texture": null, "eligible": true}
	match reward.kind:
		"item":
			var equipment = data.item(reward.itemId)
			entry.title = equipment.name
			entry.description = item_text(equipment) + "\n\nПредмет заменит надетую экипировку соответствующего слота."
			entry.texture = data.image(data.art.get(equipment.templateId, ""))
			entry.eligible = data.can_use(session.game.player, equipment)
		"skill":
			var skill = data.lookup(data.skills, reward.skillId)
			entry.title = skill.name
			entry.description = skill.description
			if session.game.player.skills.size() >= 3:
				entry.description += "\n\nПосле получения выберите навык для замены."
			entry.texture = data.image(skill.get("art", ""))
	return entry

func shard_counter(prefix: String, amount: int, font_size: int):
	var counter = preload("res://ui/shard_counter.gd").new()
	counter.prefix = prefix
	counter.font_size = font_size
	counter.alignment = HORIZONTAL_ALIGNMENT_LEFT
	counter.custom_minimum_size.y = font_size * 1.7
	content.add_child(counter)
	counter.configure(data, amount)
	return counter

func show_rewards():
	label("Победа", 32, "text-home").add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	var receipt = session.game.get("victoryReward", {})
	shard_counter("Получено: ", int(receipt.get("shards", 0)), 18)
	if receipt.get("recoveredShards", 0) > 0:
		shard_counter("Возвращено: ", int(receipt.recoveredShards), 16)
	show_last_result()
	if session.game.rewardOptions.is_empty():
		label("Новых предметов и навыков нет.", 18)
		button("Продолжить", func(): act(session.complete_reward))
		return
	label("Выберите одну награду" if session.game.rewardOptions.size() > 1 else "Ваша награда", 18)
	var rewards = preload("res://ui/reward_grid.gd").new()
	content.add_child(rewards)
	rewards.configure(session.game.rewardOptions.map(reward_entry))
	rewards.inspected.connect(show_reward_details)

func open_inspection(entries: Array, settings: Dictionary):
	if is_instance_valid(inspection_window): inspection_window.close()
	inspection_window = InspectionWindow.new()
	add_child(inspection_window)
	inspection_window.configure(self,entries,settings)
	return inspection_window

func show_item_details(reference):
	var model = InspectionModel.new(data,session.combat)
	var equipment = data.item(reference)
	open_inspection(model.item_comparison(equipment.id,session.game.player,false),{"title":"Оружие" if equipment.kind == "weapon" else "Экипировка"})

func show_skill_details(id: String):
	var model = InspectionModel.new(data,session.combat)
	open_inspection([[model.skill(id,session.game.player,"Изучено")]],{"title":"Навык"})

func offered_item(reference: String) -> Dictionary:
	var model = InspectionModel.new(data,session.combat)
	var equipment = data.item(reference)
	var entries = model.item_comparison(reference,session.game.player,true)
	var title = "Оружие" if equipment.kind == "weapon" else "Экипировка"
	if entries.size() > 1: title = "Сравнение оружия" if equipment.kind == "weapon" else "Сравнение экипировки"
	var eligible = data.can_use(session.game.player,equipment)
	var hint = ""
	if entries.size() > 1:
		hint = "Заменит: " + ", ".join(entries[1].map(func(entry): return entry.title)) if eligible else "Характеристик недостаточно для этого предмета."
	return {"entries":entries,"settings":{"title":title,"action":"Заменить" if entries.size() > 1 else "Получить", "eligible":eligible,"hint":hint,"hint_danger":not eligible}}

func show_forge_details(reference: String):
	if session.game.phase != "ready" or not session.current_node().begins_with("forge") or session.game.journey.get("forgeResolved",false) or reference not in session.game.journey.offers: return
	var node_id = session.current_node()
	var actor = hero_id
	var request = offered_item(reference)
	var dialog = open_inspection(request.entries,request.settings)
	dialog.confirmed.connect(func():
		if dialog.closing: return
		if hero_id != actor or session.current_node() != node_id or session.game.phase != "ready" or session.game.journey.get("forgeResolved",false) or reference not in session.game.journey.offers:
			dialog.close()
			return
		if act(func(): return session.forge(reference)): dialog.close()
		else: dialog.show_error(notice.text))

func reward_inspection(index: int) -> Dictionary:
	var reward = session.game.rewardOptions[index]
	if reward.kind == "item":
		var request = offered_item(reward.itemId)
		request.settings.requirements = session.reward_requirements(index)
		return request
	var model = InspectionModel.new(data,session.combat)
	return {"entries":[[model.skill(reward.skillId,session.game.player,"Предлагается")]],
		"settings":{"title":"Навык","action":"Получить","hint":"Затем выберите навык для замены" if session.game.player.skills.size() >= 3 else ""}}

func show_reward_details(index: int):
	if session.game.phase != "victory" or index < 0 or index >= session.game.rewardOptions.size(): return
	var reward = session.game.rewardOptions[index].duplicate(true)
	var actor = hero_id
	var request = reward_inspection(index)
	var dialog = open_inspection(request.entries,request.settings)
	var current = func(): return not dialog.closing and hero_id == actor and session.game.phase == "victory" and index < session.game.rewardOptions.size() and session.game.rewardOptions[index] == reward
	dialog.upgrade_requested.connect(func(stat, expected_value):
		if not current.call():
			dialog.close()
			return
		var success = act(func(): return session.upgrade_reward_requirement(index, stat, expected_value))
		var updated = reward_inspection(index)
		dialog.refresh(updated.entries,updated.settings)
		if not success: dialog.show_error(notice.text))
	dialog.confirmed.connect(func():
		if not current.call():
			dialog.close()
			return
		if not reward_entry(reward).eligible: return
		if reward.kind == "skill" and session.game.player.skills.size() >= 3:
			dialog.close()
			choose_skill_replacement(index)
		elif act(func(): return session.reward(index)): dialog.close()
		else: dialog.show_error(notice.text))

func choose_skill_replacement(reward_index: int):
	clear("Заменить навык")
	for slot in session.game.player.skills.size():
		var skill = data.lookup(data.skills, session.game.player.skills[slot])
		button(skill.name, func(): show_skill_replacement(reward_index, slot))
	button("Назад", show_game)

func show_skill_replacement(index: int, slot: int):
	if session.game.phase != "victory" or index < 0 or index >= session.game.rewardOptions.size() or slot < 0 or slot >= session.game.player.skills.size(): return
	var reward = session.game.rewardOptions[index].duplicate(true)
	if reward.kind != "skill": return
	var old = session.game.player.skills[slot]
	var actor = hero_id
	var model = InspectionModel.new(data,session.combat)
	var dialog = open_inspection([[model.skill(reward.skillId,session.game.player,"Предлагается",slot)],[model.skill(old,session.game.player,"Изучено")]],
		{"title":"Сравнение навыков","action":"Заменить","hint":"Заменит навык: " + data.lookup(data.skills,old).name})
	dialog.confirmed.connect(func():
		if dialog.closing: return
		if actor != hero_id or session.game.phase != "victory" or index >= session.game.rewardOptions.size() or session.game.rewardOptions[index] != reward or slot >= session.game.player.skills.size() or session.game.player.skills[slot] != old:
			dialog.close()
			return
		if act(func(): return session.reward(index,slot)): dialog.close()
		else: dialog.show_error(notice.text))

func show_character():
	if session.game.is_empty() or is_instance_valid(character_window): return
	character_window = CharacterWindow.new()
	add_child(character_window)
	character_window.configure(self)

func refresh_character_header():
	if is_instance_valid(journey_view):
		journey_view.header.configure_journey(data, session.game, animated)
		journey_view.select_node(journey_view.selected)
	if is_instance_valid(combat_view): combat_view.refresh()
	for node in content.get_children():
		if node.get_script() == Header: node.configure_journey(data, session.game, animated)

func confirm_finish():
	var dialog = ConfirmationDialog.new()
	dialog.title = "Завершить действия?"
	dialog.dialog_text = "Оставшиеся карты будут сброшены. Противник доиграет свои карты."
	dialog.ok_button_text = "Завершить"
	dialog.cancel_button_text = "Отмена"
	add_child(dialog)
	dialog.theme = theme
	dialog.confirmed.connect(func():
		dialog.queue_free()
		act(func():
			session.game.player.actionsFinished = true
			session.game.player.deck.hand = []
			session.game.player.deck.draw = []
			for _turn in 100:
				if session.game.phase != "combat": return ""
				var error = session.submit([])
				if error: return error
			return "Противник не завершил действия."))
	dialog.canceled.connect(dialog.queue_free)
	dialog.popup_centered(Vector2i(380, 220))

func show_rules():
	screen = "rules"
	clear("Правила боя")
	label(RULES_TEXT, 18)
	button("Назад", show_settings)

func _notification(what):
	if what == NOTIFICATION_APPLICATION_PAUSED:
		persist()
	elif what == NOTIFICATION_APPLICATION_RESUMED:
		queue_layout()
	elif what == NOTIFICATION_WM_GO_BACK_REQUEST:
		if is_instance_valid(inspection_window):
			inspection_window.close()
			return
		var dialogs = get_children().filter(func(child): return child is AcceptDialog and child.visible)
		if not dialogs.is_empty():
			dialogs.back().queue_free()
			return
		if is_instance_valid(character_window):
			character_window.back()
			return
		if screen == "home":
			if persist(): get_tree().quit()
		elif screen in ["character", "game"]:
			if persist(): show_home() if screen == "game" else show_game()
		elif screen == "rules": show_settings()
		else: show_home()
	elif what == NOTIFICATION_WM_CLOSE_REQUEST:
		if persist(): get_tree().quit()
