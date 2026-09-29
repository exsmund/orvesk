extends RichTextLabel
## Render the shared formula literally, coloring only its evaluated result.
var result_color: Color

func _init():
	bbcode_enabled = false
	fit_content = true
	scroll_active = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

func configure(data, lines: Array):
	result_color = data.color("text-success")
	add_theme_color_override("default_color", data.color("text-muted"))
	add_theme_font_size_override("normal_font_size", 13)
	clear()
	for i in lines.size():
		if i > 0: add_text("\n")
		var line = lines[i]
		add_text(line.prefix)
		if not line.result.is_empty():
			push_color(result_color)
			add_text(line.result)
			pop()
		add_text(line.suffix)
	visible = not lines.is_empty()
