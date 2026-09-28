extends "res://ui/fitted_label.gd"
## A consistent, quiet explanation immediately above a primary action.
func configure(data):
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	add_theme_font_override("font", preload("res://ui/gothic_theme.gd").DISPLAY_FONT)
	base_font_size = 18
	add_theme_font_size_override("font_size", base_font_size)
	add_theme_color_override("font_color", data.color("text-muted"))
