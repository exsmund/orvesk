extends Control
## Square inspection targets; claiming is deliberately a separate dialog action.
signal inspected(index: int)
const Illustration = preload("res://ui/inspection_art.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var buttons: Array[TextureButton] = []
var pictures: Array[Control] = []

func configure(data, entries: Array):
	for i in entries.size():
		var entry = entries[i]
		var button = TextureButton.new()
		button.texture_normal = preload("res://content/ui/board-tile-v1.png")
		button.ignore_texture_size = true
		button.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
		button.tooltip_text = entry.title + (" · На вырост" if not entry.eligible else "")
		button.clip_contents = true
		button.pressed.connect(func(): inspected.emit(i))
		add_child(button)
		buttons.append(button)
		var image = Illustration.new()
		image.custom_minimum_size = Vector2.ZERO
		button.add_child(image)
		image.configure(data, GothicTheme.trim_texture(entry.texture))
		pictures.append(image)
	resized.connect(arrange)
	arrange()

func arrange():
	if buttons.is_empty(): return
	var gap = 12.0
	# Keep the artwork large, square and at the same scale for one or two offers.
	var slot = maxf(0, minf(minf(240, size.x * 0.44), minf(size.y, (size.x - gap * (buttons.size() - 1)) / buttons.size())))
	var left = (size.x - slot * buttons.size() - gap * (buttons.size() - 1)) / 2
	for i in buttons.size():
		buttons[i].position = Vector2(left + i * (slot + gap), 0)
		buttons[i].size = Vector2.ONE * slot
		pictures[i].position = Vector2.ONE * slot * 0.08
		pictures[i].shadow_width = slot * 0.06
		pictures[i].size = Vector2.ONE * slot * 0.84
		pictures[i].arrange()
