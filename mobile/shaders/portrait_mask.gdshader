shader_type canvas_item;
#include "res://shaders/portrait_background.gdshaderinc"
uniform vec2 mask_size = vec2(58.0);
uniform vec4 square_crop = vec4(0.18, 0.055, 0.64, 0.64);
uniform vec2 object_position = vec2(0.5, 0.25);
varying vec2 local_position;
void vertex() { local_position = VERTEX; }
void fragment() {
	vec2 source_size = 1.0 / TEXTURE_PIXEL_SIZE;
	float cover = max(mask_size.x / source_size.x, mask_size.y / source_size.y);
	vec2 visible_part = mask_size / (cover * source_size);
	vec2 source_uv = (vec2(1.0) - visible_part) * object_position + UV * visible_part;
	if (abs(source_size.x - source_size.y) < 1.0) {
		source_uv = square_crop.xy + UV * square_crop.zw;
	}
	vec4 image = texture(TEXTURE, source_uv);
	image.rgb = mix(portrait_ground(UV), image.rgb, image.a);
	image.a = 1.0 - smoothstep(0.475, 0.495, length(local_position / mask_size - vec2(0.5)));
	COLOR = image;
}
