shader_type canvas_item;
#include "res://shaders/portrait_background.gdshaderinc"
void fragment() {
	vec4 image = texture(TEXTURE, UV);
	COLOR = vec4(mix(portrait_ground(UV), image.rgb, image.a), 1.0);
}
