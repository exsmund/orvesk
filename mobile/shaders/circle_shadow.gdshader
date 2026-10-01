shader_type canvas_item;
render_mode unshaded;
#include "res://shaders/gaussian.gdshaderinc"
uniform vec4 shade : source_color;
uniform vec2 panel_size = vec2(100.0);
uniform float radius = 36.0;
uniform float sigma = 4.0;
void fragment() {
	vec2 p = UV * panel_size - panel_size * 0.5;
	// Integrate horizontal Gaussian intervals across the circular silhouette.
	float lower = max(-radius, p.y - 4.0 * sigma);
	float upper = min(radius, p.y + 4.0 * sigma);
	float step_y = max(0.0, upper - lower) / 24.0;
	float alpha = 0.0;
	for (int i = 0; i < 24; i++) {
		float y = lower + (float(i) + 0.5) * step_y;
		float extent = sqrt(max(0.0, radius * radius - y * y));
		float horizontal = gaussian_cdf(extent - p.x, sigma) - gaussian_cdf(-extent - p.x, sigma);
		float dy = (y - p.y) / sigma;
		alpha += horizontal * exp(-0.5 * dy * dy) * step_y / (2.50662827463 * sigma);
	}
	COLOR = vec4(shade.rgb, shade.a * clamp(alpha, 0.0, 1.0));
}
