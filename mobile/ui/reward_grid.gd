extends Control
## Square inspection targets; claiming is deliberately a separate dialog action.
signal inspected(index: int)
var buttons: Array[TextureButton] = []
var captions: Array[Label] = []
var pictures: Array[TextureRect] = []

func configure(entries: Array):
	custom_minimum_size.y = 172
	for i in entries.size():
		var entry = entries[i]
		var button = TextureButton.new()
		button.texture_normal = preload("res://content/ui/board-tile-v1.png")
		button.ignore_texture_size = true
		button.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
		button.tooltip_text = entry.title
		button.pressed.connect(func(): inspected.emit(i))
		add_child(button)
		buttons.append(button)
		var image = TextureRect.new()
		image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		image.texture = entry.texture
		image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(image)
		pictures.append(image)
		var caption = Label.new()
		caption.text = entry.title + ("\nНа вырост" if not entry.eligible else "")
		caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		caption.add_theme_font_size_override("font_size", 13)
		caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(caption)
		captions.append(caption)
	resized.connect(arrange)
	arrange()

func arrange():
	if buttons.is_empty(): return
	var gap = 10.0
	var slot = minf(132, (size.x - gap * (buttons.size() - 1)) / buttons.size())
	var left = (size.x - slot * buttons.size() - gap * (buttons.size() - 1)) / 2
	for i in buttons.size():
		buttons[i].position = Vector2(left + i * (slot + gap), 8)
		buttons[i].size = Vector2.ONE * slot
		pictures[i].position = Vector2.ONE * slot * 0.13
		pictures[i].size = Vector2.ONE * slot * 0.74
		captions[i].position = buttons[i].position + Vector2(0, slot + 8)
		captions[i].size = Vector2(slot, 46)
	custom_minimum_size.y = slot + 64
