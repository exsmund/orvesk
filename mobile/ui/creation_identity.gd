extends "res://ui/character_page.gd"
## Name and portrait stay live while resizing and moving between creation steps.
signal changed
signal submitted
const SquareButton = preload("res://ui/square_button.gd")
var portrait = preload("res://ui/portrait_art.gd").new()
var previous = SquareButton.new()
var next = SquareButton.new()
var name_input = LineEdit.new()
var keyboard_visible = false

func configure(owner_ui):
	setup(owner_ui)
	canvas.add_child(portrait)
	for button in [previous, next]: canvas.add_child(button)
	previous.configure(host.data, "‹")
	next.configure(host.data, "›")
	previous.tooltip_text = "Предыдущий портрет"
	next.tooltip_text = "Следующий портрет"
	previous.pressed.connect(func(): cycle(-1))
	next.pressed.connect(func(): cycle(1))
	canvas.add_child(name_input)
	name_input.placeholder_text = "Имя героя"
	name_input.max_length = host.session.MAX_NAME_LENGTH
	name_input.text = host.create_name
	name_input.add_theme_font_size_override("font_size", 20)
	name_input.text_changed.connect(func(value): host.create_name = value; changed.emit())
	name_input.text_submitted.connect(func(_value): submitted.emit())
	refresh()

func cycle(delta: int):
	host.create_portrait = posmod(host.create_portrait + delta, host.data.portraits.size())
	refresh()
	changed.emit()

func refresh():
	var entry = host.data.portraits[host.create_portrait]
	portrait.configure(host.data, host.data.image(entry.src))
	portrait.tooltip_text = entry.label
	arrange()

func layout_content():
	if not portrait or not portrait.texture: return
	if keyboard_visible:
		put(name_input, 8, 34, 344, 52)
		return
	if wide:
		portrait.fit_in(Rect2(0, 0, 328, 316))
		put(previous, 0, 134, 44, 44)
		put(next, 284, 134, 44, 44)
		put(name_input, 364, 128, 338, 54)
	else:
		portrait.fit_in(Rect2(0, 4, 360, 414))
		put(previous, 0, 178, 44, 44)
		put(next, 316, 178, 44, 44)
		put(name_input, 8, 446, 344, 52)

func set_keyboard_visible(value: bool):
	keyboard_visible = value
	for node in [portrait, previous, next]: node.visible = not value
	arrange()

func arrange():
	if not keyboard_visible:
		super.arrange()
		return
	# Keep the name legible above the Android keyboard; restore the portrait on dismissal.
	canvas.size = Vector2(360, 120)
	canvas.scale = Vector2.ONE * maxf(0.01, minf(size.x / 360, size.y / 120))
	canvas.position = (size - canvas.size * canvas.scale) / 2
	layout_content()
