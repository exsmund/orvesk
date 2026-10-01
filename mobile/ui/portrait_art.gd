extends TextureRect
## Full transparent silhouette shared by creation, profiles, bestiary and dialogue.
func _init():
	expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	material = ShaderMaterial.new()
	material.shader = preload("res://shaders/dialogue_portrait.gdshader")

func configure(data, source: Texture2D):
	texture = source
	var fade = data.portrait_presentation.full.fade
	material.set_shader_parameter("fade_range", Vector2(fade.start, fade.end))

func fit_in(area: Rect2):
	if not texture: return
	var extent = Vector2(texture.get_size())
	size = extent * minf(area.size.x / extent.x, area.size.y / extent.y)
	position = area.get_center() - size / 2
