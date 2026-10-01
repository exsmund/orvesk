shader_type canvas_item;
render_mode unshaded;
#include "res://shaders/gaussian.gdshaderinc"
uniform vec4 shadow_color : source_color;
uniform vec2 panel_size = vec2(400.0, 800.0);
uniform float header_height = 64.0;
void fragment() {
	vec2 p = UV * panel_size;
	float inner = (1.0 - gaussian_box(p, vec2(4.0), panel_size - vec2(4.0), 14.0)) * 0.88;
	float under_header = step(header_height, p.y) * gaussian_cdf(header_height - p.y, 17.0) * 0.85;
	float alpha = 1.0 - (1.0 - inner) * (1.0 - under_header);
	COLOR = vec4(shadow_color.rgb, shadow_color.a * alpha);
}
