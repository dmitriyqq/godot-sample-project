extends KinematicBody

var gravity : Vector3 = Vector3.DOWN * 12.0
var speed : float = 4.0
var current_anim = ""
var velocity : Vector3 = Vector3()

var path = []
var path_ind = 0
const move_speed = 5
onready var nav = get_parent().get_parent().get_node('floor_nav')

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

# Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
#	pass

func _physics_process(delta):
	if path_ind < path.size():
		var move_vec = (path[path_ind] - global_transform.origin)
		
		
		if move_vec.length() < 0.1:
			path_ind += 1
			if (path_ind != path.size()) :
				look_at(path[path_ind],Vector3(0,1,0))
		else:
			move_and_slide(move_vec.normalized() * move_speed, Vector3(0, 1, 0))
 
func move_to(target_pos):
    path = nav.get_simple_path(global_transform.origin, target_pos)
    path_ind = 0
	# var pos = get_translation()
	# var cam = get_tree().get_root().get_camera()
	# var screenpos = cam.unproject_position(pos)
	# get_node("PlayerName").set_position(Vector2(screenpos.x , screenpos.y ) )
