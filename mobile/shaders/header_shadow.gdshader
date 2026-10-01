shader_type canvas_item;
render_mode unshaded;
#include "res://shaders/gaussian.gdshaderinc"
uniform vec4 shade : source_color;
uniform vec2 panel_size;
uniform vec2 inset;
uniform vec2 header_size;
uniform float sigma = 14.0;
uniform vec2 offset = vec2(0.0, 7.0);
void fragment() {
	vec2 lower = inset + offset;
	float alpha = gaussian_box(UV * panel_size, lower, lower + header_size, sigma);
	COLOR = vec4(shade.rgb, shade.a * alpha * 0.70);
}
