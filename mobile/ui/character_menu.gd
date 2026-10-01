extends ScrollContainer
## Scrollable hero actions; Rules opens the shared illustrated tutorial.
const TextMenuButton = preload("res://ui/menu_button.gd")
const CharacterPage = preload("res://ui/character_page.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
const Flags = preload("res://game/feature_flags.gd")
var host
var owner_window
var content = VBoxContainer.new()
var padding = MarginContainer.new()

func configure(owner_ui, window):
	host = owner_ui
	owner_window = window
	horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(padding)
	padding.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for side in ["left", "right", "top", "bottom"]: padding.add_theme_constant_override("margin_" + side, 20)
	padding.add_child(content)
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 20)
	resized.connect(arrange)
	show_menu()

func clear():
	for node in content.get_children():
		content.remove_child(node)
		node.queue_free()
	scroll_vertical = 0
	call_deferred("arrange")

func action(caption: String, callback: Callable):
	var button = TextMenuButton.new()
	button.configure(caption, callback, host.data)
	button.custom_minimum_size.y = 60
	button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(button)
	return button

func text(value: String):
	var node = Label.new()
	node.text = value
	node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(node)
	return node

func show_menu():
	clear()
	action("Продолжить игру", owner_window.close)
	action("Главное меню", func():
		if host.persist():
			owner_window.close()
			host.show_home()
		else: text(host.saves.error))
	action("Правила", show_rules)
	if Flags.enabled(Flags.DEBUG_TOOLS):
		var win = action("Победить врага", host.debug_win)
		win.disabled = host.session.game.get("phase", "") != "combat"
		action("Существа", func(): owner_window.close(); host.show_debug_catalog(true))
		action("Экипировка", func(): owner_window.close(); host.show_debug_catalog(false))
		action("Навыки", func(): owner_window.close(); host.show_skills_catalog())
		action("Перейти на карту", host.show_debug_map_dialog)

func show_rules():
	host.show_combat_help(true)

func arrange():
	if not host: return
	var wide = size.x > size.y * 1.18
	var unit = CharacterPage.scale_for(size)
	var width = minf(size.x - 32, 400 * unit if wide else size.x - 32)
	var inset = maxi(16, int((size.x - width) / 2))
	padding.add_theme_constant_override("margin_left", inset)
	padding.add_theme_constant_override("margin_right", inset)
	padding.add_theme_constant_override("margin_top", int(size.y * 0.04))
	var height = maxf(44, 48 * unit)
	content.add_theme_constant_override("separation", maxi(4, roundi(6 * unit)))
	for button in content.get_children():
		if button is Button:
			button.custom_minimum_size.y = height
			button.add_theme_font_size_override("font_size", 2 * maxi(10, GothicTheme.button_text_size(18 * unit)))
