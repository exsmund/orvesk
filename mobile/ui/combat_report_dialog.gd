extends AcceptDialog
## Only the inspection text scrolls; the underlying combat screen stays fixed.
var report = RichTextLabel.new()

func _init():
	ok_button_text = "Закрыть"
	report.bbcode_enabled = false
	report.add_theme_font_size_override("normal_font_size", 16)
	report.add_theme_constant_override("line_separation", 4)
	add_child(report)
	confirmed.connect(queue_free)
	canceled.connect(queue_free)

func configure(caption: String, text: String, data):
	title = caption
	report.text = text
	report.add_theme_color_override("default_color", data.color("text-primary"))
