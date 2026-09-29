shader_type canvas_item;
uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_nearest;
uniform vec2 edges = vec2(0.0, 1.0);
uniform float fade_size = 0.01;
void fragment() {
	vec4 image = textureLod(screen_texture, SCREEN_UV, 0.0);
	if (image.a > 0.0001) image.rgb /= image.a;
	float fade = smoothstep(edges.x, edges.x + fade_size, SCREEN_UV.y) * (1.0 - smoothstep(edges.y - fade_size, edges.y, SCREEN_UV.y));
	COLOR *= vec4(image.rgb, image.a * fade);
}
