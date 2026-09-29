extends "res://ui/modal_dialog.gd"
## Reports share the ordinary dialog chrome; only their text scrolls.
var report = RichTextLabel.new()

func _init():
	super()
	use_message = false
	report.bbcode_enabled = false
	report.scroll_active = false
	report.fit_content = true
	report.mouse_filter = Control.MOUSE_FILTER_IGNORE
	report.add_theme_font_size_override("normal_font_size", 16)
	report.add_theme_constant_override("line_separation", 4)
	content.add_child(report)

func configure(caption: String, text: String, data):
	title = caption
	dialog_text = text
	report.text = text
	report.add_theme_color_override("default_color", data.color("text-primary"))
