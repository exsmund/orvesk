extends Control
## One illustration per action, including the compact stack after compression.
const Illustration = preload("res://ui/inspection_art.gd")
var renderer
var actions: Array = []
var pictures: Array = []

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(arrange)

func configure(art, card: Dictionary):
	renderer = art
	actions = art.display_actions(card)
	while pictures.size() < actions.size():
		var picture = Illustration.new()
		picture.custom_minimum_size = Vector2.ZERO
		picture.clip_contents = true
		add_child(picture)
		pictures.append(picture)
	for i in pictures.size():
		pictures[i].visible = i < actions.size()
		if i < actions.size(): pictures[i].configure(art.data,art.texture_for(actions[i]))
	arrange()

func arrange():
	if actions.is_empty(): return
	for i in actions.size():
		var picture = pictures[i]
		picture.position = Vector2(0,size.y*i/actions.size())
		picture.size = Vector2(size.x,size.y/actions.size())
		picture.shadow_width = minf(Illustration.SHADOW_WIDTH,minf(picture.size.x,picture.size.y)*0.28)
		picture.arrange()
