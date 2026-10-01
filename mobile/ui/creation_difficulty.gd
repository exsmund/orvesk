extends Control
signal changed
const Option = preload("res://ui/difficulty_option.gd")
const Divider = preload("res://ui/textured_divider.gd")
var host
var page = Control.new()
var buttons: Dictionary = {}
var separators: Array = []
var bottom_divider = preload("res://ui/header_divider.gd").new()

func configure(owner_ui):
	host = owner_ui
	add_child(page)
	var group = ButtonGroup.new()
	var completed = host.completed_difficulties()
	for entry in host.data.difficulties.levels:
		var button = Option.new()
		button.button_group = group
		button.configure(host.data, entry, host.data.difficulty_available(entry.id, completed))
		button.pressed.connect(func():
			if button.disabled: return
			host.create_difficulty = entry.id
			refresh()
			changed.emit())
		page.add_child(button)
		buttons[entry.id] = button
		var line = Divider.new()
		line.configure(host.data)
		page.add_child(line)
		separators.append(line)
	page.add_child(bottom_divider)
	resized.connect(arrange)
	refresh()

func refresh():
	for id in buttons:
		buttons[id].set_pressed_no_signal(id == host.create_difficulty)
		buttons[id].refresh()
	arrange()

func arrange():
	if not host or size.x <= 0 or size.y <= 0: return
	var width = minf(size.x, 500)
	var unit = clampf(width / 420, 0.68, 1.2)
	var height = minf(size.y, 440 * unit)
	page.size = Vector2(width, height)
	page.position = (size - page.size) / 2
	var extra = 24 * unit
	var locked_count = buttons.values().filter(func(button): return button.disabled).size()
	var row_height = (height - 16 - extra * locked_count) / buttons.size()
	var y = 0.0
	for i in buttons.size():
		var button = buttons.values()[i]
		button.position = Vector2(0, y)
		button.size = Vector2(width, row_height + (extra if button.disabled else 0))
		button.arrange()
		y += button.size.y
		separators[i].visible = i < buttons.size() - 1
		separators[i].position = Vector2(8 * unit, y - 1)
		separators[i].size = Vector2(width - 16 * unit, 2)
	bottom_divider.position = Vector2(8 * unit, height - 14)
	bottom_divider.size = Vector2(width - 16 * unit, 12)
