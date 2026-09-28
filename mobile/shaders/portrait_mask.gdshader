shader_type canvas_item;
uniform vec2 mask_size = vec2(58.0);
uniform vec2 object_position = vec2(0.5, 0.25);
varying vec2 local_position;
void vertex() { local_position = VERTEX; }
void fragment() {
	vec2 source_size = 1.0 / TEXTURE_PIXEL_SIZE;
	float cover = max(mask_size.x / source_size.x, mask_size.y / source_size.y);
	vec2 visible_part = mask_size / (cover * source_size);
	vec2 source_uv = (vec2(1.0) - visible_part) * object_position + UV * visible_part;
	vec4 image = texture(TEXTURE, source_uv);
	image.a *= 1.0 - smoothstep(0.475, 0.495, length(local_position / mask_size - vec2(0.5)));
	COLOR = image;
}
