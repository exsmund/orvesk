extends Control
## Original transparent art with a soft silhouette shadow, without changing shared PNGs.
const SHADOW_WIDTH = 48.0
var texture: Texture2D
var picture = TextureRect.new()
var shadow = TextureRect.new()

func configure(data, source: Texture2D):
	texture = source
	custom_minimum_size.y = 172
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	for layer in [shadow,picture]:
		layer.texture = texture
		layer.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		layer.stretch_mode = TextureRect.STRETCH_SCALE
		layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(layer)
	shadow.material = ShaderMaterial.new()
	shadow.material.shader = preload("res://shaders/illustration_shadow.gdshader")
	shadow.material.set_shader_parameter("shadow_color",data.color("shadow-character-card-2"))
	shadow.material.set_shader_parameter("shadow_width",SHADOW_WIDTH)
	resized.connect(arrange)
	arrange()

func arrange():
	if not texture or size.x <= 0 or size.y <= 0: return
	var extent = texture.get_size() * minf(size.x/texture.get_width(),size.y/texture.get_height())
	picture.position = (size-extent)/2
	picture.size = extent
	shadow.position = picture.position-Vector2.ONE*SHADOW_WIDTH
	shadow.size = extent+Vector2.ONE*SHADOW_WIDTH*2
	shadow.material.set_shader_parameter("image_size",extent)
