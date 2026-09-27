extends ScrollContainer
## Only the menu is allowed to scroll, including its settings/rules subpages.
const CharacterPage = preload("res://ui/character_page.gd")
var host
var owner_window
var content = VBoxContainer.new()
var padding = MarginContainer.new()
var page = "menu"

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

func clear(next: String):
	page = next
	for node in content.get_children():
		content.remove_child(node)
		node.queue_free()
	scroll_vertical = 0
	call_deferred("arrange")

func action(caption: String, callback: Callable):
	var button = Button.new()
	button.text = caption
	button.custom_minimum_size.y = 60
	button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	button.pressed.connect(callback)
	content.add_child(button)
	return button

func text(value: String):
	var node = Label.new()
	node.text = value
	node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(node)
	return node

func show_menu():
	clear("menu")
	action("Продолжить игру", owner_window.close)
	action("Настройки", show_settings)
	action("Правила", show_rules)
	action("Главное меню", func():
		if host.persist():
			owner_window.close()
			host.show_home()
		else: text(host.saves.error))

func show_settings():
	clear("settings")
	action("Назад", show_menu)
	var toggle = CheckButton.new()
	toggle.text = "Анимация полосок ресурсов"
	toggle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toggle.custom_minimum_size.y = 64
	toggle.button_pressed = host.animated
	content.add_child(toggle)
	text("Плавное изменение здоровья и выносливости. При отключении шкалы обновляются мгновенно.")
	var error = text("")
	toggle.toggled.connect(func(enabled):
		if not host.set_resource_animation(enabled):
			toggle.set_pressed_no_signal(host.animated)
			error.text = "Не удалось сохранить настройку."
		else:
			error.text = ""
			host.refresh_character_header()
			owner_window.pages[0].refresh())

func show_rules():
	clear("rules")
	action("Назад", show_menu)
	text(host.RULES_TEXT)

func back() -> bool:
	if page == "menu": return false
	show_menu()
	return true

func arrange():
	if not host: return
	var wide = size.x > size.y * 1.18
	var unit = CharacterPage.scale_for(size)
	var width = minf(size.x - 32, 400 * unit if wide else size.x - 32)
	var inset = maxi(16, int((size.x - width) / 2))
	padding.add_theme_constant_override("margin_left", inset)
	padding.add_theme_constant_override("margin_right", inset)
	padding.add_theme_constant_override("margin_top", int(size.y * 0.12) if page == "menu" else 20)
	var height = CharacterPage.ACTION_HEIGHT * unit
	content.add_theme_constant_override("separation", int(height * 0.30) if page == "menu" else 20)
	for button in content.get_children():
		if button is Button:
			button.custom_minimum_size.y = height
			button.add_theme_font_size_override("font_size", maxi(12, int(18 * unit)))
