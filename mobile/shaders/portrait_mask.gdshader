shader_type canvas_item;
uniform vec2 mask_size = vec2(58.0);
varying vec2 local_position;
void vertex() { local_position = VERTEX; }
void fragment() {
	vec4 image = texture(TEXTURE, UV);
	image.a *= 1.0 - smoothstep(0.475, 0.495, length(local_position / mask_size - vec2(0.5)));
	COLOR = image;
}
