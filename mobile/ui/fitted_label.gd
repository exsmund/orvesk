extends Label
## A single line that shrinks to the available width, including after folding.
var base_font_size = 22
var fitted_font_size = 22

func _init():
	clip_text = true
	autowrap_mode = TextServer.AUTOWRAP_OFF
	text_overrun_behavior = TextServer.OVERRUN_NO_TRIMMING
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	resized.connect(fit)

func fit():
	if size.x <= 0: return
	var font = get_theme_font("font")
	fitted_font_size = base_font_size
	while fitted_font_size > 1 and (font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted_font_size).x > size.x or font.get_height(fitted_font_size) > size.y):
		fitted_font_size -= 1
	add_theme_font_size_override("font_size", fitted_font_size)
