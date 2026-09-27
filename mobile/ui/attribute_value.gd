extends Control
## Keep the current value and arrow ivory; only the proposed value becomes green.
const GothicTheme = preload("res://ui/gothic_theme.gd")
var text = ""
var current_text = ""
var proposed_text = ""
var current_color = Color.WHITE
var proposed_color = Color.WHITE
var fitted = 22

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	resized.connect(fit)

func configure(data):
	current_color = data.color("text-home")
	proposed_color = data.color("text-success")

func refresh(current: int, increment: int):
	current_text = str(current) + (" → " if increment else "")
	proposed_text = str(current + increment) if increment else ""
	text = current_text + proposed_text
	tooltip_text = text
	fit()

func fit():
	fitted = 22
	while fitted > 10 and GothicTheme.DISPLAY_FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x > size.x - 2: fitted -= 1
	add_theme_font_size_override("font_size", fitted)
	queue_redraw()

func _draw():
	var font = GothicTheme.DISPLAY_FONT
	var width = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x
	var origin = Vector2((size.x - width) / 2, (size.y - font.get_height(fitted)) / 2 + font.get_ascent(fitted))
	draw_string(font, origin, current_text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted, current_color)
	origin.x += font.get_string_size(current_text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x
	draw_string(font, origin, proposed_text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted, proposed_color)
