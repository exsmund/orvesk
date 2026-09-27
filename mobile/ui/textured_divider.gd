extends ColorRect
## One unframed metal highlight, brightest in the center and fading at both ends.
const THICKNESS = 2.0
var vertical = false

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	material = ShaderMaterial.new()
	material.shader = preload("res://shaders/textured_divider.gdshader")

func configure(data, upright: bool = false):
	vertical = upright
	material.set_shader_parameter("metal", data.image("/ui/gothic-frame.png"))
	material.set_shader_parameter("vertical", vertical)
