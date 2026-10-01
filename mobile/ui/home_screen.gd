extends Control
## Native equivalent of the browser StartScreen; layout uses the safe viewport.
signal continue_requested(id: String)
signal create_requested
signal heroes_requested
const TextMenuButton = preload("res://ui/menu_button.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
const DISPLAY_FONT = preload("res://content/fonts/Prata-Regular.ttf")
var kicker = Label.new()
var title = Label.new()
var status = Label.new()
var menu_buttons: Array[Button] = []
var divider: GradientTexture2D
var divider_color: Color
var layout_queued = false

func configure(data, latest: Dictionary, failed: bool, _has_hero: bool = false):
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for node in [kicker, title, status]:
		add_child(node)
		node.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		node.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE
		node.add_theme_color_override("font_color", data.color("text-muted" if node == status else "text-home"))
	for node in [kicker, title]: node.add_theme_font_override("font", DISPLAY_FONT)
	kicker.text = "Г Е Р О И"
	title.text = "ОРВЕСКА"
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status.add_theme_font_size_override("font_size", 12)
	if not latest.is_empty():
		add_action("Продолжить", func(): continue_requested.emit(latest.id), data)
		status.text = "Последняя история · " + latest.payload.game.player.name
	if failed: status.text = "Не все сохранения удалось открыть. Проверьте раздел «Герои»."
	add_action("Новая игра", func(): create_requested.emit(), data)
	add_action("Герои", func(): heroes_requested.emit(), data)
	divider_color = data.color("text-muted")
	divider = GradientTexture2D.new()
	divider.width = 256
	divider.height = 1
	divider.fill_to = Vector2(1, 0)
	divider.gradient = Gradient.new()
	divider.gradient.colors = PackedColorArray([data.color("base-transparent"), data.color("background-start-screen-6")])
	resized.connect(queue_arrange)
	# Wrapped text's minimum height settles after its new width is applied.
	status.minimum_size_changed.connect(queue_arrange)
	queue_arrange()

func queue_arrange():
	if layout_queued: return
	layout_queued = true
	arrange.call_deferred()

func add_action(text: String, callback: Callable, data):
	var node = TextMenuButton.new()
	node.text = text
	node.configure(text, callback, data)
	add_child(node)
	menu_buttons.append(node)
	return node

func arrange():
	layout_queued = false
	var title_size = clampi(int(size.x * 0.15), 48, 96)
	title.add_theme_font_size_override("font_size", title_size)
	kicker.add_theme_font_size_override("font_size", int(title_size * 0.34))
	kicker.position = Vector2(0, size.y * 0.065)
	kicker.size = Vector2(size.x, title_size * 0.65)
	title.position = Vector2(0, kicker.position.y + kicker.size.y)
	title.size = Vector2(size.x, title_size * 1.45)
	var button_size = clampi(int(size.x * 0.092), 32, 54)
	var button_width = minf(size.x * 0.92, 460)
	var button_height = maxf(58, button_size * 1.55)
	var menu_top = maxf(title.position.y + title.size.y + 30, size.y * 0.36)
	var menu_step = (size.y * 0.89 - menu_top) / maxf(1, menu_buttons.size())
	if menu_buttons.size() > 4:
		button_height = minf(button_height, menu_step - 6)
		button_size = mini(button_size, int(button_height / 1.55))
	for i in menu_buttons.size():
		var node = menu_buttons[i]
		GothicTheme.fit_button_text(node, button_width, button_size)
		var center = lerpf(0.435, 0.80, float(i) / (menu_buttons.size() - 1)) * size.y
		if menu_buttons.size() > 4: center = menu_top + menu_step * (i + 0.5)
		node.position = Vector2((size.x - button_width) / 2, center - button_height / 2)
		node.size = Vector2(button_width, button_height)
	status.position = Vector2(0, size.y * 0.92)
	status.size = Vector2(size.x, size.y * 0.07)
	queue_redraw()

func _draw():
	if not divider: return
	var width = minf(size.x * 0.70, 550)
	var middle = Vector2(size.x * 0.5, size.y * 0.315)
	var length = width / 2 - 24
	draw_texture_rect(divider, Rect2(middle - Vector2(width / 2, 0), Vector2(length, 1)), false)
	draw_texture_rect(divider, Rect2(middle + Vector2(24, 0), Vector2(-length, 1)), false)
	draw_colored_polygon(PackedVector2Array([middle + Vector2(0, -4), middle + Vector2(4, 0), middle + Vector2(0, 4), middle + Vector2(-4, 0)]), divider_color)
