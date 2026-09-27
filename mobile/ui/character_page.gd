extends Control
## A bounded, non-scrolling canvas. Reflow first, then uniformly fit to the safe body.
const GothicTheme = preload("res://ui/gothic_theme.gd")
const ACTION_HEIGHT = 58.0
var host
var canvas = Control.new()
var wide = false
var design_size = Vector2(360, 576)

func setup(owner_ui):
	host = owner_ui
	mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(canvas)
	resized.connect(arrange)

static func design_for(area: Vector2) -> Vector2:
	return Vector2(720, 320) if area.x > area.y * 1.18 else Vector2(360, 576)

static func scale_for(area: Vector2) -> float:
	var design = design_for(area)
	return maxf(0.01, minf(area.x / design.x, area.y / design.y))

func arrange():
	wide = size.x > size.y * 1.18
	design_size = design_for(size)
	var factor = scale_for(size)
	canvas.scale = Vector2.ONE * factor
	canvas.size = design_size
	canvas.position = (size - design_size * factor) / 2
	layout_content()

func layout_content(): pass

func put(node: Control, x: float, y: float, width: float, height: float):
	node.position = Vector2(x, y)
	node.size = Vector2(width, height)

func label(text: String, font_size: int = 20, display: bool = false) -> Label:
	var node = Label.new()
	node.text = text
	node.clip_text = true
	node.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	node.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	node.add_theme_font_size_override("font_size", font_size)
	if display: node.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(node)
	return node

func picture(texture: Texture2D, covered: bool = false) -> TextureRect:
	var node = TextureRect.new()
	node.texture = texture
	node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	node.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED if covered else TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(node)
	return node

func fit_label(node: Label, preferred: int, minimum: int = 12):
	var font = node.get_theme_font("font")
	var fitted = preferred
	while fitted > minimum and font.get_string_size(node.text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x > node.size.x - 4: fitted -= 1
	node.add_theme_font_size_override("font_size", fitted)
