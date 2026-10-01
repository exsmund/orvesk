shader_type canvas_item;
render_mode unshaded;
#include "res://shaders/gaussian.gdshaderinc"
uniform vec4 shadow_color : source_color;
uniform vec2 panel_size = vec2(100.0);
void fragment() {
	float side = min(panel_size.x, panel_size.y);
	vec2 inset = vec2(side * 0.025);
	float inward = 1.0 - gaussian_box(UV * panel_size, inset, panel_size - inset, side * 0.08);
	COLOR = vec4(shadow_color.rgb, shadow_color.a * inward);
}
