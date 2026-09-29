extends "res://ui/character_page.gd"
## Name and portrait stay live while resizing and moving between creation steps.
signal changed
signal submitted
const SquareButton = preload("res://ui/square_button.gd")
var portrait: TextureRect
var frame = preload("res://ui/texture_frame.gd").new()
var previous = SquareButton.new()
var next = SquareButton.new()
var name_input = LineEdit.new()
var keyboard_visible = false

func configure(owner_ui):
	setup(owner_ui)
	portrait = picture(null)
	portrait.material = ShaderMaterial.new()
	portrait.material.shader = preload("res://shaders/portrait_background.gdshader")
	canvas.add_child(frame)
	frame.configure(host.data, 24, "/ui/portrait-frame.png")
	frame.modulate = host.data.color("text-home")
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
	portrait.texture = host.data.framed_portrait(host.data.image(entry.src))
	portrait.tooltip_text = entry.label
	arrange()

func fit_portrait(area: Rect2):
	# Frame the configured 2:3 crop, preserving the original square asset.
	var inset = 14.0
	var extent = Vector2(portrait.texture.get_size())
	var room = area.size - Vector2.ONE * inset * 2
	portrait.size = extent * minf(room.x / extent.x, room.y / extent.y)
	portrait.position = area.get_center() - portrait.size / 2
	frame.position = portrait.position - Vector2.ONE * inset
	frame.size = portrait.size + Vector2.ONE * inset * 2

func layout_content():
	if not portrait or not portrait.texture: return
	if keyboard_visible:
		put(name_input, 8, 34, 344, 52)
		return
	if wide:
		fit_portrait(Rect2(50, 0, 228, 316))
		put(previous, 0, 134, 44, 44)
		put(next, 284, 134, 44, 44)
		put(name_input, 364, 128, 338, 54)
	else:
		fit_portrait(Rect2(54, 4, 252, 388))
		put(previous, 0, 178, 44, 44)
		put(next, 316, 178, 44, 44)
		put(name_input, 8, 446, 344, 52)

func set_keyboard_visible(value: bool):
	keyboard_visible = value
	for node in [portrait, frame, previous, next]: node.visible = not value
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
