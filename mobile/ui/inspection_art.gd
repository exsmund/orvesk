extends Control
## Shared transparent illustration and silhouette shadow for inspection cards and board cells.
const SHADOW_WIDTH = 48.0
var shadow_width = SHADOW_WIDTH
var texture: Texture2D
var picture = TextureRect.new()
var shadow = TextureRect.new()

func _init():
	custom_minimum_size.y = 172
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	for layer in [shadow,picture]:
		layer.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		layer.stretch_mode = TextureRect.STRETCH_SCALE
		layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(layer)
	shadow.material = ShaderMaterial.new()
	shadow.material.shader = preload("res://shaders/illustration_shadow.gdshader")
	resized.connect(arrange)

func configure(data, source: Texture2D):
	shadow.material.set_shader_parameter("shadow_color",data.color("shadow-character-card-2"))
	set_texture(source)

func set_texture(source: Texture2D):
	texture = source
	picture.texture = source
	shadow.texture = source
	arrange()

func arrange():
	if not texture or size.x <= 0 or size.y <= 0: return
	var extent = texture.get_size() * minf(size.x/texture.get_width(),size.y/texture.get_height())
	picture.position = (size-extent)/2
	picture.size = extent
	shadow.position = picture.position-Vector2.ONE*shadow_width
	shadow.size = extent+Vector2.ONE*shadow_width*2
	shadow.material.set_shader_parameter("image_size",extent)
	shadow.material.set_shader_parameter("shadow_width",shadow_width)
