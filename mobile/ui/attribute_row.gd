extends Control
const SquareButton = preload("res://ui/square_button.gd")
const Frame = preload("res://ui/texture_frame.gd")
signal changed(delta: int)
var caption = Label.new()
var value = preload("res://ui/attribute_value.gd").new()
var minus = SquareButton.new()
var plus = SquareButton.new()
var locked = false
var palette

func configure(data, name_text: String, combat: bool):
	palette = data
	locked = combat
	var background = Panel.new()
	background.add_theme_stylebox_override("panel", preload("res://ui/gothic_theme.gd").panel(data, 0))
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var frame = Frame.new()
	add_child(frame)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	frame.configure(data, 10)
	for node in [caption, value]:
		add_child(node)
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	value.configure(data)
	caption.text = name_text
	caption.add_theme_font_size_override("font_size", 16)
	minus.configure(data, "−")
	plus.configure(data, "+")
	minus.tooltip_text = "Отменить выбранное повышение: " + name_text
	plus.tooltip_text = "Повысить: " + name_text
	if not locked:
		add_child(minus)
		add_child(plus)
	else:
		minus.free()
		plus.free()
	if not locked:
		minus.pressed.connect(func(): changed.emit(-1))
		plus.pressed.connect(func(): changed.emit(1))
	resized.connect(arrange)

func refresh(current: int, increment: int, affordable: bool):
	value.refresh(current, increment)
	if not locked:
		minus.disabled = increment == 0
		plus.disabled = not affordable
	arrange()

func arrange():
	caption.position = Vector2(14, 0)
	caption.size = Vector2(100, size.y)
	var side = 44.0
	value.position = Vector2(116 if locked else 161, 0)
	value.size = Vector2(size.x - value.position.x - (14 if locked else 58), size.y)
	value.fit()
	if not locked:
		minus.position = Vector2(114, (size.y - side) / 2)
		plus.position = Vector2(size.x - side - 10, (size.y - side) / 2)
		minus.size = Vector2.ONE * side
		plus.size = Vector2.ONE * side
