extends TextureButton
## Clickable circular portrait using the same crop, mask and metal as the header.
const GothicTheme = preload("res://ui/gothic_theme.gd")
var frame = TextureRect.new()

func _init():
	ignore_texture_size = true
	stretch_mode = TextureButton.STRETCH_SCALE
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	material = ShaderMaterial.new()
	material.shader = preload("res://shaders/portrait_mask.gdshader")
	add_child(frame)
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	frame.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	frame.texture = GothicTheme.trim_texture(preload("res://content/ui/portrait-frame-round.png"))
	frame.material = ShaderMaterial.new()
	frame.material.shader = preload("res://shaders/portrait_frame.gdshader")
	resized.connect(arrange)

static func apply_crop(mask: ShaderMaterial, data):
	var crop: Dictionary = data.portrait_presentation.circle.position
	mask.set_shader_parameter("object_position", Vector2(crop.x, crop.y))
	var square: Dictionary = data.portrait_presentation.circle.squareCrop
	mask.set_shader_parameter("square_crop", Vector4(square.x, square.y, square.width, square.height))

func configure(data, source: Texture2D):
	texture_normal = source
	apply_crop(material, data)
	arrange()

func arrange():
	material.set_shader_parameter("mask_size", size)
	frame.position = -Vector2.ONE * 4
	frame.size = size + Vector2.ONE * 8
