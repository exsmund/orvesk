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
const CombatDamage = preload("res://ui/combat_damage.gd")
const RULES_TEXT = "Размещайте карты на поле 3×3. Свои фигуры не пересекаются; фигуры противника можно перекрывать.\n\nАтака против атаки: обе наносят половину урона. Блок и уклонение отменяют входящий урон. Парирование наносит встречный удар.\n\nБлок расходует 1 силу за перекрытую клетку атаки. При первом ходе резервируется полная стоимость блока.\n\nПустое поле восстанавливает силы после удара противника, если герой выжил. Обычно каждый следующий ход даёт +2 силы.\n\nЗа победу осколки начисляются сразу. Затем получите одну награду: за более слабого противника — одно предложение, за равного или сильного — два. Предмет на вырост можно открыть и повысить нужные характеристики за осколки прямо в его карточке. У костра здоровье восстанавливается. В кузнице можно заменить предмет.\n\nИгра сохраняет каждое действие на устройстве. Интернет не требуется."
const CharacterWindow = preload("res://ui/character_window.gd")
const SquareButton = preload("res://ui/square_button.gd")
const ModalDialog = preload("res://ui/modal_dialog.gd")
const CombatReport = preload("res://ui/combat_report_dialog.gd")
const InspectionWindow = preload("res://ui/inspection_window.gd")
const InspectionModel = preload("res://ui/inspection_model.gd")
const Flags = preload("res://game/feature_flags.gd")
const DebugActions = preload("res://game/debug_actions.gd")
const DebugCatalog = preload("res://ui/debug_catalog.gd")
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
var screen_frame = preload("res://ui/screen_frame.gd").new()
var create_stats = session.initial_creation_stats()
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
var story_view
var victory_view
var creation_view
var heroes_view
var character_window
var inspection_window
var debug_catalog
var map_dialog
var damage_feedback
var shard_feedback
var presented_awards: Dictionary = {}
var page = VBoxContainer.new()
var page_header_view
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
	margin.add_child(screen_frame)
	screen_frame.add_child(page)
	page.add_theme_constant_override("separation", AdaptiveLayout.CONTENT_GAP)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	page.add_child(scroll)
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
	var scrollbar_width = scroll.get_v_scroll_bar().get_combined_minimum_size().x if scroll.get_v_scroll_bar().visible else 0.0
	return maxf(0, AdaptiveLayout.content_rect(screen_frame.size).size.x - scrollbar_width)

func apply_layout():
	layout_queued = false
	if not is_instance_valid(content): return
	update_safe_area()
	if is_instance_valid(victory_view):
		var message_height = notice.size.y + content.get_theme_constant("separation") if notice.visible else 0
		victory_view.custom_minimum_size.y = maxf(220, scroll.size.y - message_height)
	if is_instance_valid(home_view):
		home_view.custom_minimum_size.y = maxf(600, scroll.size.y - (notice.size.y + 12 if notice.visible else 0))
	if is_instance_valid(character_window): character_window.arrange()
	if is_instance_valid(inspection_window): inspection_window.arrange()
	# Keep modal dialogs usable when the available window becomes narrower.
	for child in get_children():
		if child is ModalDialog and child.visible:
			child.arrange()

func update_safe_area():
	if OS.get_name() != "Android" or not is_instance_valid(content): return
	var window_pixels = Rect2(Vector2(DisplayServer.window_get_position()), Vector2(DisplayServer.window_get_size()))
	var margins = AdaptiveLayout.safe_margins(size, window_pixels, Rect2(DisplayServer.get_display_safe_area()))
	for side in margins:
		if margin.get_theme_constant("margin_" + side) != margins[side]:
			margin.add_theme_constant_override("margin_" + side, margins[side])


func clear(title: String, subtitle: String = ""):
	if is_instance_valid(shard_feedback): shard_feedback.finish()
	for i in range(get_child_count() - 1, -1, -1):
		var child = get_child(i)
		if child is ModalDialog: child.close()
	if is_instance_valid(damage_feedback):
		damage_feedback.queue_free()
		damage_feedback = null
	if is_instance_valid(inspection_window) and not busy: inspection_window.close()
	if is_instance_valid(character_window): character_window.close()
	if is_instance_valid(page_header_view):
		page.remove_child(page_header_view)
		page_header_view.queue_free()
	page_header_view = null
	for child in content.get_children():
		content.remove_child(child)
		child.queue_free()
	board = null
	if is_instance_valid(combat_view):
		screen_frame.remove_child(combat_view)
		combat_view.queue_free()
	combat_view = null
	if is_instance_valid(journey_view):
		screen_frame.remove_child(journey_view)
		journey_view.queue_free()
	journey_view = null
	if is_instance_valid(story_view):
		screen_frame.remove_child(story_view)
		story_view.queue_free()
	story_view = null
	if is_instance_valid(creation_view):
		creation_view.dismiss_keyboard()
		screen_frame.remove_child(creation_view)
		creation_view.queue_free()
	creation_view = null
	if is_instance_valid(heroes_view):
		screen_frame.remove_child(heroes_view)
		heroes_view.queue_free()
	heroes_view = null
	victory_view = null
	page.show()
	scroll.show()
	scroll.scroll_vertical = 0
	home_view = null
	debug_catalog = null
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
		backdrop.texture = data.image(preset.battleBackground if session.game.phase in ["combat", "story", "ended"] else preset.background)
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
	if is_instance_valid(heroes_view): heroes_view.set_notice(text)
	if is_instance_valid(combat_view): combat_view.set_notice(text)
	if is_instance_valid(journey_view): journey_view.set_notice(text)
	if is_instance_valid(story_view): story_view.set_notice(text)
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
	var previous_selected = selected
	draft = []
	selected = ""
	if not persist():
		session.game = previous
		session.combat.rng.state = previous_rng
		draft = previous_draft
		selected = previous_selected
		busy = false
		return false
	present_action(previous)
	busy = false
	return true

func present_action(previous: Dictionary):
	var g = session.game
	var result = g.get("log", [])
	var resolved = previous.get("phase") == "combat" and int(g.get("round", 0)) == int(previous.get("round", 0)) + 1 and not result.is_empty() and int(result[0].round) == int(previous.get("round", 0))
	if not resolved or not is_instance_valid(combat_view):
		show_game()
		return
	var summary = result[0].summary
	if summary.player.damage <= 0 and summary.enemy.damage <= 0:
		show_game()
		return
	var ending = g.phase != "combat"
	if ending:
		# The saved result is already committed. Keep its avatars visible briefly
		# so a lethal hit floats over the defeated fighter before the reward screen.
		var snapshot = previous.duplicate(true)
		for side in ["player", "enemy"]:
			snapshot[side].hp = summary[side].hpAfter
			snapshot[side].stamina = summary[side].staminaAfter
		combat_view.header.configure(data, snapshot, animated)
		combat_view.header.title.text = "Ход %d · Итог" % result[0].round
		combat_view.header.layout()
		var placed = result[0].placements
		combat_view.board.configure(combat_view.art, session.combat.layer(snapshot.player, placed.playerPlaced, placed.playerModifiers), session.combat.layer(snapshot.enemy, placed.enemyPlaced, placed.enemyModifiers), false, snapshot.player, snapshot.enemy, placed.playerModifiers, placed.enemyModifiers)
		combat_view.board.damage_cells = summary.cells
		combat_view.board.queue_redraw()
	else:
		show_game()
	var view = combat_view
	if is_instance_valid(damage_feedback): damage_feedback.queue_free()
	var feedback = CombatDamage.new()
	damage_feedback = feedback
	add_child(feedback)
	feedback.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	feedback.configure(view.header, summary, data, ending)
	feedback.finished.connect(func():
		if damage_feedback != feedback: return
		damage_feedback = null
		feedback.queue_free()
		if ending and is_instance_valid(view) and combat_view == view and screen == "game": show_game())

func show_home():
	screen = "home"
	clear("")
	backdrop.texture = data.image("/ui/start-landscape.png")
	var shading = ShaderMaterial.new()
	shading.shader = preload("res://shaders/home_overlay.gdshader")
	var tokens = {"top_color": "background-start-screen", "upper_color": "background-start-screen-2", "lower_color": "background-start-screen-3", "bottom_color": "background-start-screen-4", "center_color": "background-start-screen-5"}
	for entry in tokens:
		shading.set_shader_parameter(entry, data.color(tokens[entry]))
	overlay.material = shading
	var entries = saves.list_heroes()
	home_view = HomeScreen.new()
	home_view.configure(data, latest_hero(entries), entries.any(func(entry): return entry.payload.is_empty()), not session.game.is_empty())
	home_view.continue_requested.connect(load_hero)
	home_view.create_requested.connect(start_create)
	home_view.heroes_requested.connect(show_heroes)
	home_view.settings_requested.connect(show_settings)
	home_view.bestiary_requested.connect(func(): show_debug_catalog(true))
	home_view.equipment_requested.connect(func(): show_debug_catalog(false))
	home_view.skills_requested.connect(show_skills_catalog)
	home_view.map_requested.connect(show_debug_map_dialog)
	content.add_child(home_view)
	scroll.scroll_vertical = 0

func show_debug_catalog(creatures: bool):
	if not Flags.enabled(Flags.DEBUG_TOOLS): return
	screen = "bestiary" if creatures else "equipment_catalog"
	clear("Бестиарий" if creatures else "Экипировка")
	button("Назад", show_home)
	debug_catalog = DebugCatalog.new()
	content.add_child(debug_catalog)
	debug_catalog.configure(self, creatures)

func show_catalog_entry(id: String, creatures: bool):
	if not Flags.enabled(Flags.DEBUG_TOOLS): return
	if data.lookup(data.creatures if creatures else data.items, id).is_empty(): return
	var baseline = session.fighter("Базовый профиль", {"strength":1, "agility":1, "vitality":1, "intelligence":1})
	var model = InspectionModel.new(data, session.combat)
	if creatures:
		open_inspection([[model.creature(id, baseline)]], {"title":"Существо"})
	else:
		var player = baseline if session.game.is_empty() else session.game.player
		open_inspection([[model.item(id, player)]], {"title":"Оружие" if data.item(id).kind == "weapon" else "Экипировка"})

func debug_win():
	if not Flags.enabled(Flags.DEBUG_TOOLS): return
	act(func(): return DebugActions.win(session))

func show_debug_map_dialog():
	if not Flags.enabled(Flags.DEBUG_TOOLS) or session.game.is_empty() or is_instance_valid(map_dialog): return
	var dialog = ModalDialog.new()
	map_dialog = dialog
	dialog.title = "Перейти карту…"
	dialog.ok_button_text = "Перейти"
	dialog.cancel_button_text = "Отмена"
	dialog.dialog_hide_on_ok = false
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	dialog.content.add_child(box)
	label("Номер карты", 18, "text-home", box).autowrap_mode = TextServer.AUTOWRAP_OFF
	var number = LineEdit.new()
	number.name = "MapNumber"
	number.text = str(int(session.game.journey.expedition))
	number.virtual_keyboard_type = LineEdit.KEYBOARD_TYPE_NUMBER
	number.max_length = 10
	number.custom_minimum_size.y = 52
	box.add_child(number)
	# Fixed text areas avoid a wrapped Label giving the native dialog an enormous
	# minimum height before its first layout has established the content width.
	var note = RichTextLabel.new()
	note.text = "Откроется новая карта с первого противника. Здоровье и выносливость восстановятся."
	note.custom_minimum_size.y = 72
	note.scroll_active = false
	note.add_theme_font_size_override("normal_font_size", 14)
	note.add_theme_color_override("default_color", data.color("text-muted"))
	box.add_child(note)
	var error = RichTextLabel.new()
	error.custom_minimum_size.y = 60
	error.scroll_active = false
	error.add_theme_font_size_override("normal_font_size", 14)
	error.add_theme_color_override("default_color", data.color("text-danger"))
	box.add_child(error)
	error.hide()
	var actor = hero_id
	var submit = func():
		if dialog.is_queued_for_deletion(): return
		if hero_id != actor: dialog.close(); return
		if act(func(): return DebugActions.go_to_map(session, number.text)):
			dialog.close()
		else:
			error.text = notice.text
			error.show()
	dialog.confirmed.connect(submit)
	number.text_submitted.connect(func(_text): submit.call())
	dialog.canceled.connect(dialog.close)
	add_child(dialog)
	dialog.theme = theme
	dialog.popup_centered(Vector2i(mini(430, int(size.x) - 36), 300))
	number.grab_focus()
	number.select_all()

func latest_hero(entries: Array) -> Dictionary:
	var latest: Dictionary = {}
	for entry in entries:
		if entry.payload.is_empty(): continue
		if entry.id == preferences.last_hero: return entry
		if latest.is_empty() or str(entry.payload.get("savedAt", "")) > str(latest.payload.get("savedAt", "")):
			latest = entry
	return latest

func start_create():
	create_stats = session.initial_creation_stats()
	create_name = ""
	create_portrait = randi_range(0, data.portraits.size() - 1)
	show_create()

func show_heroes():
	screen = "heroes"
	clear("")
	page.hide()
	scroll.hide()
	heroes_view = preload("res://ui/heroes_screen.gd").new()
	screen_frame.add_child(heroes_view)
	heroes_view.configure(self)
	heroes_view.continued.connect(load_hero)
	heroes_view.removal_requested.connect(confirm_hero_removal)
	heroes_view.create_requested.connect(start_create)
	heroes_view.back_requested.connect(show_home)

func confirm_hero_removal(id: String, hero_name: String):
	if not is_instance_valid(heroes_view) or get_children().any(func(node): return node is ModalDialog and node.visible): return
	var view = heroes_view
	var dialog = ModalDialog.new()
	dialog.title = "Удалить героя?"
	dialog.destructive = true
	dialog.dialog_text = "Весь прогресс героя «%s» будет потерян.\nЭто действие нельзя отменить." % hero_name
	dialog.ok_button_text = "Удалить"
	dialog.cancel_button_text = "Отмена"
	dialog.theme = theme
	dialog.confirmed.connect(func():
		dialog.close()
		if heroes_view != view or busy: return
		if not saves.remove(id):
			view.set_notice(saves.error)
			return
		if hero_id == id:
			# Prevent pause/quit autosave from recreating the removed hero.
			hero_id = ""
			session = Session.new(data)
			draft.clear()
			rotations.clear()
			selected = ""
		if preferences.last_hero == id:
			preferences.last_hero = ""
			preferences.write()
		view.refresh(saves.list_heroes()))
	dialog.canceled.connect(dialog.close)
	add_child(dialog)
	dialog.popup_centered(Vector2i(mini(430, int(size.x) - 36), 220))

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
	return {"ready": "Путешествие", "combat": "Бой", "victory": "Награда", "defeat": "Поражение", "draw": "Ничья", "story": "Диалог", "ended": "История завершена"}.get(phase, phase)

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
	clear("")
	page.hide()
	scroll.hide()
	creation_view = preload("res://ui/creation_screen.gd").new()
	screen_frame.add_child(creation_view)
	creation_view.configure(self)

func finish_creation():
	if busy or not is_instance_valid(creation_view) or creation_view.step != 1: return
	busy = true
	# Commit a new hero only after its first save succeeds. A canceled/failed draft
	# must not replace the currently loaded hero or consume that hero's RNG.
	var candidate = Session.new(data)
	var error = candidate.create(create_name, create_stats, data.portraits[create_portrait].id)
	if error:
		creation_view.show_error(error)
		busy = false
		return
	var id = Crypto.new().generate_random_bytes(12).hex_encode()
	if not saves.write(id, candidate, []):
		creation_view.show_error(saves.error)
		busy = false
		return
	session = candidate
	hero_id = id
	draft = []
	selected = ""
	preferences.last_hero = id
	preferences.write()
	show_game()
	busy = false

func show_game():
	screen = "game"
	var g = session.game
	if g.phase in ["story", "ended"]:
		clear("")
		page.hide()
		scroll.hide()
		story_view = preload("res://ui/story_dialogue.gd").new()
		screen_frame.add_child(story_view)
		story_view.configure(self)
		return
	if g.phase == "combat":
		clear("")
		show_combat()
		return
	if g.phase == "ready":
		show_journey()
		return
	clear("")
	page_header(g.get("victoryReward", {}).get("title", "Победа") if g.phase == "victory" else phase_name(g.phase))
	match g.phase:
		"victory": show_rewards()
		"defeat", "draw":
			show_last_result()
			label("Непотраченные осколки остались у противника. Победите его, чтобы вернуть их." if g.phase == "defeat" else "Силы оказались равны.")
			button("Начать карту заново" if g.phase == "defeat" else "Повторить бой", func(): act(session.restart))
			button("Главное меню", func(): if persist(): show_home())

func page_header(title: String = ""):
	# Keep the common header outside the bounded, clipping body scroll container.
	page_header_view = Header.new()
	page_header_view.custom_minimum_size.y = Header.HEIGHT
	page_header_view.title_override = title
	page.add_child(page_header_view)
	page.move_child(page_header_view, 0)
	page_header_view.configure_journey(data, session.game, animated)
	page_header_view.player_requested.connect(show_character)
	page_header_view.menu_requested.connect(show_journey_menu)

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
		bar.configure(data, "Здоровье" if kind == "health" else "Силы", f.hp if kind == "health" else f.stamina, data.max_hp(f) if kind == "health" else data.max_stamina(f), kind, animated)

func show_combat():
	page.hide()
	scroll.hide()
	combat_view = CombatScreen.new()
	screen_frame.add_child(combat_view)
	combat_view.configure(self)
	board = combat_view.board
	overlay.color = Color(data.color("background-page"), 0.56)
	show_combat_help.call_deferred()

func show_combat_help():
	if screen != "game" or not is_instance_valid(combat_view) or not session.needs_combat_help(): return
	for child in get_children():
		if child is ModalDialog and child.visible: return
	var dialog = preload("res://ui/combat_help_dialog.gd").new()
	add_child(dialog)
	dialog.configure(data)
	var actor = hero_id
	dialog.answered.connect(func(hide_future: bool):
		if dialog.closing: return
		if hero_id != actor or session.game.phase != "combat":
			dialog.close()
			return
		var previous = session.game.duplicate(true)
		session.acknowledge_combat_help(hide_future)
		if persist(): dialog.close()
		else:
			session.game = previous
			dialog.show_error(saves.error))
	dialog.popup_centered(Vector2i(430, 560))
	dialog.primary.grab_focus()

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

func remove_card(id: String):
	if session.game.clashPlan.stage == "reveal": return
	var next = draft.filter(func(move): return move.id != id)
	if next.size() == draft.size(): return
	var previous = draft.duplicate(true)
	var rotation = rotation_for(id)
	draft = next
	if not persist(): draft = previous; return
	rotations[id] = rotation
	combat_view.refresh()

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
	if session.combat.stamina_damage_per_cell(fighter, card) > 0: lines.append("Урон выносливости за клетку: " + art.number(session.combat.stamina_damage_per_cell(fighter, card)))
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
	for stat in data.STATS: lines.append("%s: %d" % [data.STAT_NAMES[stat], data.effective_stat(f, stat)])
	show_info(f.name, "\n".join(lines))

func show_battle_menu():
	var dialog = ModalDialog.new()
	dialog.title = "Свободное поле"
	dialog.ok_button_text = "Вернуться в бой"
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	dialog.content.add_child(box)
	if Flags.enabled(Flags.DEBUG_TOOLS):
		button("Перейти карту…", func(): dialog.close(); show_debug_map_dialog(), box)
	label("Сброшенные фигуры возвращаются в колоду.", 16, "text-muted", box)
	button("Герой", func(): dialog.close(); show_character(), box)
	button("Главное меню", func():
		if persist(): dialog.close(); show_home(), box)
	if session.game.clashPlan.stage != "reveal":
		button("Очистить поле", func():
			var previous = draft.duplicate(true)
			draft = []
			if not persist(): draft = previous; return
			dialog.close()
			combat_view.refresh(), box, draft.is_empty())
		if data.item(session.game.player.gear.get("amulet")).get("charmEffect", "") == "compress":
			button("Сжать выбранную фигуру", func(): dialog.close(); act(func(): return session.compress(selected)), box, selected.is_empty())
	if not session.game.get("log", []).is_empty():
		var record = session.game.log[0]
		label("Последний ход: вы потеряли %s HP, противник — %s HP." % [str(record.summary.player.damage), str(record.summary.enemy.damage)], 14, "text-muted", box)
		button("Разбор последнего хода", func(): dialog.close(); show_last_clash_details(), box)
	add_child(dialog)
	dialog.theme = theme
	dialog.confirmed.connect(dialog.close)
	dialog.canceled.connect(dialog.close)
	dialog.popup_centered(Vector2i(mini(430, int(size.x) - 36), 0))

func show_last_result():
	if session.game.get("log", []).is_empty(): return
	var record = session.game.log[0]
	label("Ход %d: вы потеряли %s HP, противник — %s HP." % [record.round, str(record.summary.player.damage), str(record.summary.enemy.damage)], 15, "text-muted")
	button("Разбор последнего хода", show_last_clash_details)

func show_journey():
	var g = session.game
	clear("")
	if g.journey.has("service"):
		page_header(data.map_point(g.journey.service.type).name)
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
			var price = int(g.journey.service.prices.get(reference,0))
			button(equipment.name + (" · " + shard_amount(price) if price > 0 else ""),func(): show_forge_details(reference))
		button("Пройти мимо", func(): act(session.forge))
		return
	page.hide()
	scroll.hide()
	journey_view = JourneyScreen.new()
	screen_frame.add_child(journey_view)
	journey_view.configure(self)
	overlay.color = Color(data.color("background-page"), 0.35)

func show_journey_menu():
	var dialog = ModalDialog.new()
	dialog.title = "Путешествие"
	dialog.ok_button_text = "Вернуться"
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	dialog.content.add_child(box)
	button("Герой", func(): dialog.close(); show_character(), box)
	if Flags.enabled(Flags.DEBUG_TOOLS):
		button("Перейти карту…", func(): dialog.close(); show_debug_map_dialog(), box)
	button("Главное меню", func():
		if persist(): dialog.close(); show_home(), box)
	add_child(dialog)
	dialog.theme = theme
	dialog.confirmed.connect(dialog.close)
	dialog.canceled.connect(dialog.close)
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
			var hint = skill_reward_hint(reward.skillId)
			if hint: entry.description += "\n\n" + hint
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
	var receipt = session.game.get("victoryReward", {})
	victory_view = preload("res://ui/victory_rewards.gd").new()
	content.add_child(victory_view)
	victory_view.configure(data, receipt, session.game.rewardOptions.map(reward_entry))
	victory_view.refresh_progression(session.can_upgrade_attributes())
	victory_view.inspected.connect(show_reward_details)
	victory_view.continued.connect(func(): act(session.complete_reward))
	victory_view.declined.connect(func(): act(session.skip_reward))
	victory_view.upgrade_requested.connect(show_reward_upgrade)
	animate_victory_shards(receipt)

func animate_victory_shards(receipt: Dictionary):
	if receipt.is_empty() or receipt.get("progressionPending", false): return
	var identity = [session.game.get("wins", 0), session.game.journey.expedition, session.game.journey.stage, session.game.get("story", {}).get("node", ""), receipt.duplicate(true)]
	if presented_awards.get(hero_id, []) == identity: return
	presented_awards[hero_id] = identity
	if int(receipt.get("shards", 0)) + int(receipt.get("recoveredShards", 0)) <= 0: return
	shard_feedback = preload("res://ui/shard_award_feedback.gd").new()
	add_child(shard_feedback)
	shard_feedback.configure(victory_view.shards, victory_view.recovered, page_header_view.shards)

func show_reward_upgrade():
	if session.game.phase != "victory" or not session.game.get("victoryReward", {}).get("progressionPending", false): return
	show_character(1)
	var window = character_window
	var actor = hero_id
	var receipt = session.game.victoryReward.duplicate(true)
	var applied = [false]
	window.pages[1].applied.connect(func(): applied[0] = true)
	window.closed.connect(func():
		if applied[0]: finish_reward_upgrade.call_deferred(actor, receipt))

func finish_reward_upgrade(actor: String, receipt: Dictionary):
	# A delayed close must not advance a different hero, reward or destination.
	if screen != "game" or hero_id != actor or session.game.phase != "victory" or session.game.get("victoryReward", {}) != receipt or not session.game.rewardOptions.is_empty(): return
	act(session.complete_reward)

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
	var lost = model.lost_items(reference, session.game.player)
	if not eligible: hint = "Характеристик недостаточно для этого предмета."
	elif not lost.is_empty(): hint = "Вы потеряете: " + ", ".join(lost.map(func(id): return data.item(id).name))
	return {"entries":entries,"settings":{"title":title,"action":"Заменить" if entries.size() > 1 else "Получить", "eligible":eligible,"hint":hint,"hint_danger":not eligible}}

func confirm_equipment_replacement(reference: String, inspection, current: Callable, commit: Callable):
	if not current.call() or inspection.primary.disabled: return
	if get_children().any(func(node): return node is ModalDialog and node.visible): return
	var model = InspectionModel.new(data, session.combat)
	var lost = model.lost_items(reference, session.game.player)
	if lost.is_empty():
		commit.call()
		return
	var gear = session.game.player.gear.duplicate(true)
	var dialog = ModalDialog.new()
	dialog.title = "Заменить предмет?"
	dialog.destructive = true
	dialog.dialog_text = "Вы потеряете: %s.\n\nЭто действие нельзя отменить." % ", ".join(lost.map(func(id): return data.item(id).name))
	dialog.ok_button_text = "Заменить"
	dialog.cancel_button_text = "Отмена"
	dialog.confirmed.connect(func():
		# Check again after the modal: an old offer cannot act on another hero or loadout.
		if not is_instance_valid(inspection) or not current.call(): return
		if session.game.player.gear != gear:
			inspection.show_error("Экипировка изменилась. Откройте сравнение заново.")
			return
		commit.call())
	add_child(dialog)
	dialog.popup_centered(Vector2i(430, 240))

func forge_inspection(reference: String) -> Dictionary:
	var request = offered_item(reference)
	request.settings.requirements = session.item_requirements(reference)
	var price = int(session.game.journey.service.prices.get(reference,0))
	if price > 0:
		request.settings.action = "Купить · " + shard_amount(price)
		request.settings.eligible = request.settings.eligible and session.game.souls >= price
	return request

func show_forge_details(reference: String):
	if session.game.phase != "ready" or not session.game.journey.has("service") or session.game.journey.get("forgeResolved",false) or reference not in session.game.journey.offers: return
	var node_id = session.current_node()
	var actor = hero_id
	var request = forge_inspection(reference)
	var dialog = open_inspection(request.entries,request.settings)
	var current = func(): return not dialog.closing and hero_id == actor and session.current_node() == node_id and session.game.phase == "ready" and session.game.journey.has("service") and not session.game.journey.get("forgeResolved",false) and reference in session.game.journey.offers
	dialog.upgrade_requested.connect(func(quote):
		if not current.call():
			dialog.close()
			return
		var success = act(func(): return session.upgrade_item_requirements(reference, quote))
		var updated = forge_inspection(reference)
		dialog.refresh(updated.entries,updated.settings)
		if not success: dialog.show_error(notice.text))
	dialog.confirmed.connect(func():
		if not current.call():
			dialog.close()
			return
		confirm_equipment_replacement(reference, dialog, current, func():
			if act(func(): return session.forge(reference)): dialog.close()
			else: dialog.show_error(notice.text)))

func reward_inspection(index: int) -> Dictionary:
	var reward = session.game.rewardOptions[index]
	if reward.kind == "item":
		var request = offered_item(reward.itemId)
		request.settings.requirements = session.reward_requirements(index)
		return request
	var model = InspectionModel.new(data,session.combat)
	return {"entries":[[model.skill(reward.skillId,session.game.player,"Предлагается")]],
		"settings":{"title":"Навык","action":"Получить","hint":skill_reward_hint(reward.skillId)}}

func show_reward_details(index: int):
	if session.game.phase != "victory" or index < 0 or index >= session.game.rewardOptions.size(): return
	var reward = session.game.rewardOptions[index].duplicate(true)
	var actor = hero_id
	var request = reward_inspection(index)
	var dialog = open_inspection(request.entries,request.settings)
	var current = func(): return not dialog.closing and hero_id == actor and session.game.phase == "victory" and index < session.game.rewardOptions.size() and session.game.rewardOptions[index] == reward
	dialog.upgrade_requested.connect(func(quote):
		if not current.call():
			dialog.close()
			return
		var success = act(func(): return session.upgrade_item_requirements(reward.itemId, quote))
		var updated = reward_inspection(index)
		dialog.refresh(updated.entries,updated.settings)
		if not success: dialog.show_error(notice.text))
	dialog.confirmed.connect(func():
		if not current.call():
			dialog.close()
			return
		if not reward_entry(reward).eligible: return
		var conflict = data.conflicting_skill_slot(session.game.player, reward.skillId) if reward.kind == "skill" else -1
		if conflict >= 0:
			dialog.close()
			show_skill_replacement(index, conflict)
		elif reward.kind == "skill" and session.game.player.skills.size() >= 3:
			dialog.close()
			choose_skill_replacement(index)
		else:
			var claim = func():
				if act(func(): return session.reward(index)): dialog.close()
				else: dialog.show_error(notice.text)
			if reward.kind == "item": confirm_equipment_replacement(reward.itemId, dialog, current, claim)
			else: claim.call())

func choose_skill_replacement(reward_index: int):
	clear("Заменить навык")
	var choices = preload("res://ui/reward_grid.gd").new()
	choices.name = "SkillReplacementGrid"
	choices.custom_minimum_size.y = 240
	content.add_child(choices)
	choices.configure(data, session.game.player.skills.map(func(id): return reward_entry({"kind":"skill", "skillId":id})))
	choices.inspected.connect(func(slot): show_skill_replacement(reward_index, slot))
	button("Назад", show_game)

func show_skill_replacement(index: int, slot: int):
	if session.game.phase != "victory" or index < 0 or index >= session.game.rewardOptions.size() or slot < 0 or slot >= session.game.player.skills.size(): return
	var reward = session.game.rewardOptions[index].duplicate(true)
	if reward.kind != "skill": return
	var old = session.game.player.skills[slot]
	var actor = hero_id
	var model = InspectionModel.new(data,session.combat)
	var dialog = open_inspection([[model.skill(reward.skillId,session.game.player,"Предлагается",slot)],[model.skill(old,session.game.player,"Изучено")]],
		{"title":"Сравнение навыков","action":"Заменить","hint":"Вы потеряете: " + data.lookup(data.skills,old).name})
	dialog.confirmed.connect(func():
		if dialog.closing: return
		if actor != hero_id or session.game.phase != "victory" or index >= session.game.rewardOptions.size() or session.game.rewardOptions[index] != reward or slot >= session.game.player.skills.size() or session.game.player.skills[slot] != old:
			dialog.close()
			return
		if act(func(): return session.reward(index,slot)): dialog.close()
		else: dialog.show_error(notice.text))

func show_character(tab: int = 0):
	if session.game.is_empty() or is_instance_valid(character_window): return
	character_window = CharacterWindow.new()
	add_child(character_window)
	character_window.configure(self)
	character_window.select_tab(tab)

func refresh_character_header():
	if is_instance_valid(shard_feedback): shard_feedback.finish()
	if is_instance_valid(story_view): story_view.header.configure_journey(data, session.game, animated)
	if is_instance_valid(journey_view):
		journey_view.header.configure_journey(data, session.game, animated)
		journey_view.select_node(journey_view.selected)
	if is_instance_valid(combat_view): combat_view.refresh()
	if is_instance_valid(page_header_view): page_header_view.configure_journey(data, session.game, animated)
	if is_instance_valid(victory_view): victory_view.refresh_progression(session.can_upgrade_attributes())

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
		var dialogs = get_children().filter(func(child): return child is ModalDialog and child.visible)
		if not dialogs.is_empty():
			dialogs.back().cancel()
			return
		if is_instance_valid(creation_view):
			creation_view.back()
			return
		if is_instance_valid(inspection_window):
			inspection_window.close()
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

func show_skills_catalog():
	if not Flags.enabled(Flags.DEBUG_TOOLS): return
	screen = "skills_catalog"
	clear("Навыки")
	button("Назад", show_home)
	debug_catalog = DebugCatalog.new()
	content.add_child(debug_catalog)
	debug_catalog.configure(self, false, true)

func show_skill_catalog_entry(id: String):
	if not Flags.enabled(Flags.DEBUG_TOOLS) or data.lookup(data.skills, id).is_empty(): return
	var baseline = session.fighter("Базовый профиль", {"strength":1, "agility":1, "vitality":1, "intelligence":1})
	var player = baseline if session.game.is_empty() else session.game.player
	var model = InspectionModel.new(data, session.combat)
	open_inspection([[model.skill(id, player)]], {"title":"Навык"})

func skill_reward_hint(id: String) -> String:
	var conflict = data.conflicting_skill_slot(session.game.player, id)
	if conflict >= 0: return "Заменит несовместимый навык «%s»." % data.lookup(data.skills, session.game.player.skills[conflict]).name
	return "Затем выберите навык для замены" if session.game.player.skills.size() >= 3 else ""
