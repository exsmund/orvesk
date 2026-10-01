extends SceneTree
## Interactive production button gallery; never reads or writes player saves.
const GothicTheme = preload("res://ui/gothic_theme.gd")
var data = preload("res://game/catalog.gd").new()
var column = VBoxContainer.new()
var feedback = Label.new()

func _initialize(): call_deferred("run")

func run():
	root.title = "Орвеск — кнопки (тестовая страница)"
	root.size = Vector2i(760, 940)
	var page = Control.new()
	page.theme = GothicTheme.make(data)
	root.add_child(page)
	page.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var surface = preload("res://ui/character_surface.gd").new()
	page.add_child(surface)
	surface.configure(data, 24, 0.68)
	surface.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var margin = MarginContainer.new()
	page.add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for edge in ["left", "right", "top", "bottom"]: margin.add_theme_constant_override("margin_" + edge, 28)
	var scroll = ScrollContainer.new()
	margin.add_child(scroll)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.add_child(column)
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 14)
	heading("Кнопки")
	heading("Основная · наведите курсор и нажмите", 16)
	button("Продолжить")
	heading("Наведение · нажатие · недоступна", 16)
	for state in ["hover", "pressed", "disabled"]:
		var b = button({"hover":"Наведение", "pressed":"Нажатие", "disabled":"Недоступна"}[state])
		if state == "disabled": b.disabled = true
		else:
			b.add_theme_stylebox_override("normal", page.theme.get_stylebox(state, "Button"))
			b.add_theme_color_override("font_color", page.theme.get_color("font_" + state + "_color", "Button"))
	for variant in ["SecondaryButton", "DangerButton"]:
		for state in ["normal", "hover", "pressed", "disabled"]:
			var b = button(("Серая" if variant == "SecondaryButton" else "Красная") + " · " + state)
			b.theme_type_variation = variant
			b.disabled = state == "disabled"
			if state in ["hover", "pressed"]: b.add_theme_stylebox_override("normal", page.theme.get_stylebox(state, variant))
	var row = HBoxContainer.new()
	column.add_child(row)
	row.add_theme_constant_override("separation", 16)
	for caption in ["Отмена", "Удалить"]:
		var b = Button.new()
		row.add_child(b)
		b.text = caption
		b.custom_minimum_size.y = 56
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.theme_type_variation = "DangerButton" if caption == "Удалить" else "SecondaryButton"
	heading("Квадратные кнопки", 16)
	var squares = HBoxContainer.new()
	column.add_child(squares)
	squares.add_theme_constant_override("separation", 16)
	for caption in ["−", "+", "‹", "›", "×", "+"]:
		var b = preload("res://ui/square_button.gd").new()
		squares.add_child(b)
		b.configure(data, caption)
		b.custom_minimum_size = Vector2(52,52)
		if squares.get_child_count() == 6: b.disabled = true
	var trash = preload("res://ui/delete_button.gd").new()
	squares.add_child(trash)
	trash.configure(data)
	heading("Текстовая кнопка меню", 16)
	var menu = preload("res://ui/menu_button.gd").new()
	column.add_child(menu)
	menu.configure("Продолжить игру", func(): feedback.text = "Нажата кнопка меню", data)
	menu.custom_minimum_size.y = 44
	var actions = preload("res://ui/window_actions.gd").new()
	column.add_child(actions)
	actions.primary.text = "Начать путешествие"
	actions.custom_minimum_size.y = 150
	actions.resized.connect(func():
		var origin = actions.position
		actions.arrange(Vector2(actions.size.x,150))
		actions.position = origin)
	column.add_child(feedback)
	feedback.text = "Тестовая страница — сохранения не меняются"
	feedback.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	print("BUTTONS_PREVIEW_READY")

func heading(caption: String, font_size: int = 28):
	var label = Label.new()
	label.text = caption
	label.add_theme_font_size_override("font_size",font_size)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(label)

func button(caption: String) -> Button:
	var result = Button.new()
	result.text = caption
	result.custom_minimum_size.y = 56
	column.add_child(result)
	result.pressed.connect(func(): feedback.text = "Нажато: " + caption)
	return result
