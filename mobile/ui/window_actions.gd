extends Control
## Fixed page actions, including safe spacing around the Back ornament.
const GothicTheme = preload("res://ui/gothic_theme.gd")
var reserve_hint_space = false
var hint = preload("res://ui/action_hint.gd").new()
var primary = Button.new()
var back = Button.new()
var divider = preload("res://ui/header_divider.gd").new()

func _init():
	for node in [hint, primary, back, divider]: add_child(node)
	back.text = "Назад"
	back.flat = true
	for state in ["normal", "hover", "pressed", "disabled"]:
		back.add_theme_stylebox_override(state, StyleBoxEmpty.new())

func arrange(panel_size: Vector2) -> float:
	var unit = clampf(panel_size.y / 760, 0.7, 1.15)
	var width = minf(500, panel_size.x - 48)
	var x = (panel_size.x - width) / 2
	for button in [primary, back]: GothicTheme.fit_button_text(button, width, 18 * unit)
	var primary_height = maxf(52, 56 * unit)
	var back_height = maxf(30, 38 * unit)
	hint.visible = not hint.text.is_empty()
	var hint_height = 38.0 * unit if hint.visible or reserve_hint_space else 0.0
	size = Vector2(panel_size.x, hint_height + primary_height + 10 * unit + back_height + maxf(8, 8 * unit) + 40)
	position = Vector2(0, panel_size.y - size.y)
	hint.position = Vector2(x, 0)
	hint.size = Vector2(width, hint_height)
	if hint.visible: hint.fit()
	primary.position = Vector2(x, hint_height)
	primary.size = Vector2(width, primary_height)
	back.position = Vector2(x, hint_height + primary_height + 10 * unit)
	back.size = Vector2(width, back_height)
	# Prata leaves space below the visible text inside the button's line box.
	# Bring the ornament into that space while preserving the bottom frame inset.
	divider.size = Vector2(140, 12)
	divider.position = Vector2((panel_size.x - divider.size.x) / 2, back.get_rect().end.y - 2 * unit)
	return position.y
