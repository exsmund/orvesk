shader_type canvas_item;
render_mode unshaded;
uniform vec4 shadow_color : source_color;
uniform vec2 image_size = vec2(172.0);
uniform float shadow_width = 48.0;
void fragment() {
	vec2 p = UV * (image_size + vec2(shadow_width * 2.0)) - vec2(shadow_width);
	float opacity = 0.0;
	// Equal-probability samples of a circular Gaussian, truncated at four sigma.
	// Blur the alpha silhouette without a gain/clamp that creates hard plateaus.
	for (int i = 0; i < 48; i++) {
		float u = (float(i) + 0.5) / 48.0;
		float radius = shadow_width * 0.25 * sqrt(-2.0 * log(1.0 - u * (1.0 - exp(-8.0))));
		float angle = float(i) * 2.39996323;
		vec2 uv = (p + vec2(cos(angle), sin(angle)) * radius) / image_size;
		float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
		opacity += texture(TEXTURE, clamp(uv, vec2(0.0), vec2(1.0))).a * inside;
	}
	COLOR = vec4(shadow_color.rgb, shadow_color.a * opacity / 48.0);
}
