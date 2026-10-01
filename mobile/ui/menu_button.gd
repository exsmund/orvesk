extends Button
## Shared text-only menu action for the home screen and hero menu.
const DISPLAY_FONT = preload("res://content/fonts/Prata-Regular.ttf")

func configure(caption: String, callback: Callable, data):
	text = caption
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	add_theme_font_override("font", DISPLAY_FONT)
	add_theme_color_override("font_color", data.color("text-primary"))
	add_theme_color_override("font_hover_color", data.color("text-highlight"))
	add_theme_color_override("font_pressed_color", data.color("text-highlight"))
	for state in ["normal", "disabled", "pressed"]: add_theme_stylebox_override(state, StyleBoxEmpty.new())
	for state in ["hover", "focus"]:
		var accent = StyleBoxFlat.new()
		accent.bg_color = data.color("background-start-screen-7")
		accent.border_color = data.color("border-start-screen-border-block")
		accent.border_width_top = 1
		accent.border_width_bottom = 1
		add_theme_stylebox_override(state, accent)
	pressed.connect(callback)
