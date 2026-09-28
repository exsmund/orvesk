extends Control
## Shared stat editor: only number presentation differs for creation and upgrades.
const SquareButton = preload("res://ui/square_button.gd")
signal changed(delta: int)
var caption = Label.new()
var value = preload("res://ui/attribute_value.gd").new()
var minus = SquareButton.new()
var plus = SquareButton.new()
var divider = preload("res://ui/textured_divider.gd").new()
var locked = false
var creation = false

func configure(data, name_text: String, combat: bool, initial_allocation: bool = false):
	locked = combat
	creation = initial_allocation
	for node in [divider, caption, value, minus, plus]: add_child(node)
	divider.configure(data)
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	caption.text = name_text
	caption.add_theme_font_override("font", preload("res://ui/gothic_theme.gd").DISPLAY_FONT)
	caption.add_theme_font_size_override("font_size", 18)
	value.configure(data)
	minus.configure(data, "−")
	plus.configure(data, "+")
	minus.tooltip_text = "Отменить выбранное повышение: " + name_text
	plus.tooltip_text = "Повысить: " + name_text
	minus.pressed.connect(func():
		if not locked: changed.emit(-1))
	plus.pressed.connect(func():
		if not locked: changed.emit(1))
	resized.connect(arrange)

func refresh(current: int, increment: int, affordable: bool):
	value.refresh(current + increment if creation else current, 0 if creation else increment)
	minus.disabled = locked or increment == 0
	plus.disabled = locked or not affordable
	arrange()

func arrange():
	caption.position = Vector2(8, 0)
	caption.size = Vector2(130, size.y)
	var side = 44.0
	minus.position = Vector2(140, (size.y - side) / 2)
	plus.position = Vector2(size.x - side - 10, (size.y - side) / 2)
	minus.size = Vector2.ONE * side
	plus.size = Vector2.ONE * side
	value.position = Vector2(186, 0)
	value.size = Vector2(maxf(1, plus.position.x - 188), size.y)
	value.fit()
	divider.position = Vector2(0, size.y - divider.THICKNESS)
	divider.size = Vector2(size.x, divider.THICKNESS)
