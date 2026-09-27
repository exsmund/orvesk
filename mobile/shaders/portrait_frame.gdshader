shader_type canvas_item;
void fragment() {
	vec4 source = texture(TEXTURE, UV);
	float grey = dot(source.rgb, vec3(0.299, 0.587, 0.114));
	COLOR = vec4(mix(source.rgb, vec3(grey), 0.78), source.a);
}
