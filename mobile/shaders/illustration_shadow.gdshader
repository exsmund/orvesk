shader_type canvas_item;
render_mode unshaded;
uniform vec4 shadow_color : source_color;
uniform vec2 image_size = vec2(172.0);
// Same logical width as the inward shadow in character_shadow.gdshader.
uniform float shadow_width = 48.0;

void fragment() {
	vec2 p = UV * (image_size + vec2(shadow_width * 2.0)) - vec2(shadow_width);
	float opacity = 0.0;
	float weights = 0.0;
	for (int i = 0; i < 32; i++) {
		float t = (float(i) + 0.5) / 32.0;
		float angle = float(i) * 2.39996323;
		vec2 offset = vec2(cos(angle), sin(angle)) * sqrt(t) * shadow_width;
		vec2 uv = (p + offset) / image_size;
		float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
		float weight = exp(-3.0 * t);
		opacity += texture(TEXTURE, clamp(uv, vec2(0.0), vec2(1.0))).a * inside * weight;
		weights += weight;
	}
	COLOR = vec4(shadow_color.rgb, min(1.0, opacity / weights * 2.8) * shadow_color.a);
}
