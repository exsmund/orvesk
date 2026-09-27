shader_type canvas_item;
render_mode unshaded;
uniform bool wide = false;

void fragment() {
	vec4 picture = texture(TEXTURE, UV);
	float fade = wide ? 0.55 : smoothstep(0.0, 0.48, UV.y) * 0.85;
	COLOR = vec4(picture.rgb, picture.a * fade);
}
