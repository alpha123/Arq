/* Scenario  © 2008-2009 Bruce Pascoe
   Version 2.1
   Scenario is an advanced cutscene engine for Sphere which allows you to
   coordinate complex cutscenes via forks and synchronization.
*/

function Scenario ()
{
	this.FadeMask = CreateColor(0,0,0,0);
	this.FocusStack = [];
	this.FocusThread = 0;
	this.NextThreadID = 1;
	this.Threads = [];
	this.ForkArrays = [];
	this.CurrentForkArray = [];
	this.CurrentQueue = [];
	this.Queues = [];
	this.Running = false;
}

Scenario.defineAction = function(Name,Code)
{
	if (Scenario.prototype[Name] != null) {
		Abort("Scenario.defineAction:\nThe identifier '" + Scenelet.name + "' is already in use.");
	}
	Scenario.prototype[Name] = function() {
		var Instruction = {};
		Instruction.state = {};
		Instruction.arguments = arguments;
		Instruction.start = Code.start;
		Instruction.update = Code.update;
		Instruction.render = Code.render;
		Instruction.handleInput = Code.handleInput;
		this.Enqueue(Instruction);
	};
};

Scenario.prototype.execute = function()
{
	if (!IsMapEngineRunning()) Abort("Scenario:\nCannot execute a scenario without an active map engine.")
	if (this.Running) return;
	this.synchronize();
	if (!IsCameraAttached()) {
		var OldCameraX = GetCameraX();
		var OldCameraY = GetCameraY();
		this.beginFork();
		  this.panTo(OldCameraX,OldCameraY);
		this.endFork();
	}
	else {
		var OldCameraTarget = GetCameraPerson();
		this.beginFork();
			this.followPerson(OldCameraTarget);
		this.endFork();
	}
	this.beginFork();
		this.fadeTo(CreateColor(0,0,0,0));
	this.endFork();
	var State = {};
	State.CommandThread = 0;
	State.Instructions = this.CurrentQueue;
	State.ForkThreads = this.CurrentForkArray;
	this.FrameRate = GetMapEngineFrameRate();
	var OldPC = IsInputAttached() ? GetInputPerson() : null;
	DetachInput();
	var OldFrameRate = GetFrameRate();
	SetFrameRate(this.FrameRate);
	this.Running = true;
	var FadeRenderer = function(host,state) {
		ApplyColorMask(host.FadeMask);
	}
	var FadeThread = this.CreateThread(null,null,FadeRenderer,-1);
	var Thread = this.CreateThread(State,Scenario.UpdateTimeline,null,-1);
	while (this.FindThread(Thread)) {
		RenderMap();
		this.RenderScene();
		FlipScreen();
		UpdateMapEngine();
		this.UpdateScene();
	}
	SetFrameRate(OldFrameRate);
	if (OldPC != null) AttachInput(OldPC);
	this.KillThread(FadeThread);
	this.Running = false;
};

// System scenelets
Scenario.prototype.beginFork = function()
{
	this.ForkArrays.push(this.CurrentForkArray);
	this.CurrentForkArray = [];
	this.Queues.push(this.CurrentQueue);
	this.CurrentQueue = [];
};

Scenario.prototype.endFork = function()
{
	var ThreadArray = this.CurrentForkArray;
	this.CurrentForkArray = this.ForkArrays.pop();
	var ParentThreadArray = this.CurrentForkArray;
	var Instruction = {};
	Instruction.state = {};
	Instruction.arguments = [ ParentThreadArray,ThreadArray,this.CurrentQueue ];
	Instruction.start = function(host,state,Threads,SubThreads,Queue) {
		var ForkState = {};
		ForkState.Context = host;
		ForkState.Instructions = Queue;
		ForkState.CommandThread = 0;
		ForkState.ForkThreads = SubThreads;
		var Thread = host.CreateThread(ForkState,Scenario.UpdateTimeline,null,-1);
		Threads.push(Thread);
	};
	this.CurrentQueue = this.Queues.pop();
	this.Enqueue(Instruction);
};

Scenario.prototype.synchronize = function()
{
	var Instruction = {};
	Instruction.state = {};
	Instruction.arguments = [ this.CurrentForkArray ];
	Instruction.start = function(host,state,Threads) {
		state.Threads = Threads;
	};
	Instruction.update = function(host,state) {
		return state.Threads.length != 0;
	};
	this.Enqueue(Instruction);
};

// Built-in scenelets
Scenario.defineAction("call", {
	start: function(host,state,Function,Arguments) {
		Function.apply(null,Arguments);
	},
});

Scenario.defineAction("facePerson", {
	start: function(host,state,Person,Direction) {
		var XFaceCommand;
		var YFaceCommand;
		switch (Direction.toLowerCase()) {
		case "n": case "north":
			XFaceCommand = COMMAND_WAIT;
			YFaceCommand = COMMAND_FACE_NORTH;
			break;
		case "s": case "south":
			XFaceCommand = COMMAND_WAIT;
			YFaceCommand = COMMAND_FACE_SOUTH;
			break;
		case "w": case "west":
			XFaceCommand = COMMAND_FACE_WEST;
			YFaceCommand = COMMAND_WAIT;
			break;
		case "e": case "east":
			XFaceCommand = COMMAND_FACE_EAST;
			YFaceCommand = COMMAND_WAIT;
			break;
		case "nw": case "northwest":
			XFaceCommand = COMMAND_FACE_WEST;
			YFaceCommand = COMMAND_FACE_NORTH;
			break;
		case "ne": case "northeast":
			XFaceCommand = COMMAND_FACE_EAST;
			YFaceCommand = COMMAND_FACE_NORTH;
			break;
		case "sw": case "southwest":
			XFaceCommand = COMMAND_FACE_WEST;
			YFaceCommand = COMMAND_FACE_SOUTH;
			break;
		case "se": case "southeast":
			XFaceCommand = COMMAND_FACE_EAST;
			YFaceCommand = COMMAND_FACE_SOUTH;
			break;
		default:
			XFaceCommand = COMMAND_WAIT;
			YFaceCommand = COMMAND_WAIT;
		}
		QueuePersonCommand(Person,XFaceCommand,true);
		QueuePersonCommand(Person,YFaceCommand,true);
	},
});

Scenario.defineAction("fadeTo", {
	start: function(host,state,Color,Duration) {
		if (Duration == null) Duration = 250;
		state.Color = Color;
		state.Duration = Duration;
		if (state.Duration <= 0) host.FadeMask = Color;
		var Multiplier = state.Duration > 0 ? 1000 / state.Duration : 0;
		state.RInterval = Multiplier * ((state.Color.red - host.FadeMask.red) / host.frameRate);
		state.GInterval = Multiplier * ((state.Color.green - host.FadeMask.green) / host.frameRate);
		state.BInterval = Multiplier * ((state.Color.blue - host.FadeMask.blue) / host.frameRate);
		state.AInterval = Multiplier * ((state.Color.alpha - host.FadeMask.alpha) / host.frameRate);
	},
	update: function(host,state) {
		var Red = host.FadeMask.red;
		var Green = host.FadeMask.green;
		var Blue = host.FadeMask.blue;
		var Alpha = host.FadeMask.alpha;
		Red += state.RInterval;
		if (Red > state.Color.red && state.RInterval > 0) Red = state.Color.red;
			else if (Red < state.Color.red && state.RInterval < 0) Red = state.Color.red;
		Green += state.GInterval;
		if (Green > state.Color.green && state.GInterval > 0) Green = state.Color.green;
			else if (Green < state.Color.green && state.GInterval < 0) Green = state.Color.green;
		Blue += state.BInterval;
		if (Blue > state.Color.blue && state.BInterval > 0) Blue = state.Color.blue;
			else if (Blue < state.Color.blue && state.BInterval < 0) Blue = state.Color.blue;
		Alpha += state.AInterval;
		if (Alpha > state.Color.alpha && state.AInterval > 0) Alpha = state.Color.alpha;
			else if (Alpha < state.Color.alpha && state.AInterval < 0) Alpha = state.Color.alpha;
		host.FadeMask = CreateColor(Red,Green,Blue,Alpha);
		return state.Color.red != host.FadeMask.red
			|| state.Color.green != host.FadeMask.green
			|| state.Color.blue != host.FadeMask.blue
			|| state.Color.alpha != host.FadeMask.alpha;
	},
});

Scenario.defineAction("focusOnPerson", {
	start: function(host,state,Person,Duration) {
		if (Duration == null) Duration = 250;
		DetachCamera();
		state.XTarget = GetPersonX(Person);
		state.YTarget = GetPersonY(Person);
		state.X = Duration > 0 ? GetCameraX() : state.XTarget;
		state.Y = Duration > 0 ? GetCameraY() : state.YTarget;
		var Multiplier = Duration > 0 ? 1000 / Duration : 0;
		state.XInterval = Multiplier * ((state.XTarget - state.X) / host.frameRate);
		state.YInterval = Multiplier * ((state.YTarget - state.Y) / host.frameRate);
	},
	update: function(host,state) {
		state.X += state.XInterval;
		if (state.X > state.XTarget && state.XInterval > 0) state.X = state.XTarget;
			else if (state.X < state.XTarget && state.XInterval < 0) state.X = state.XTarget;
		state.Y += state.YInterval;
		if (state.Y > state.YTarget && state.YInterval > 0) state.Y = state.YTarget;
			else if (state.Y < state.YTarget && state.YInterval < 0) state.Y = state.YTarget;
		SetCameraX(state.X); SetCameraY(state.Y);
		return state.X != state.XTarget || state.Y != state.YTarget;
	},
});

Scenario.defineAction("followPerson", {
	start: function(host,state,Person) {
		state.Person = Person;
		state.XTarget = GetPersonX(state.Person);
		state.YTarget = GetPersonY(state.Person);
		state.X = GetCameraX();
		state.Y = GetCameraY();
		var PanDuration = 250;
		var Multiplier = 1000 / PanDuration;
		state.XInterval = Multiplier * ((state.XTarget - state.X) / host.frameRate);
		state.YInterval = Multiplier * ((state.YTarget - state.Y) / host.frameRate);
	},
	update: function(host,state) {
		state.X += state.XInterval;
		if (state.X > state.XTarget && state.XInterval > 0) state.X = state.XTarget;
			else if (state.X < state.XTarget && state.XInterval < 0) state.X = state.XTarget;
		state.Y += state.YInterval;
		if (state.Y > state.YTarget && state.YInterval > 0) state.Y = state.YTarget;
			else if (state.Y < state.YTarget && state.YInterval < 0) state.Y = state.YTarget;
		SetCameraX(state.X); SetCameraY(state.Y);
		if (state.X == state.XTarget && state.Y == state.YTarget) {
			AttachCamera(state.Person);
			return false;
		}
		return true;
	},
});

Scenario.defineAction("hidePerson", {
	start: function(host,state,Person) {
		SetPersonVisible(Person,false);
		IgnorePersonObstructions(Person,true);
	},
});

Scenario.defineAction("killPerson", {
	start: function(host,state,Person) {
		DestroyPerson(Person);
	},
});

Scenario.defineAction("panTo", {
	start: function(host,state,X,Y,Duration) {
		if (Duration == null) Duration = 250;
		state.XTarget = X;
		state.YTarget = Y;
		DetachCamera();
		state.X = Duration != 0 ? GetCameraX() : state.XTarget;
		state.Y = Duration != 0 ? GetCameraY() : state.YTarget;
		var Multiplier = 1000 / Duration;
		state.XInterval = Multiplier * ((state.XTarget - state.X) / host.frameRate);
		state.YInterval = Multiplier * ((state.YTarget - state.Y) / host.frameRate);
		return true;
	},
	update: function(host,state) {
		state.X += state.XInterval;
		if (state.X > state.XTarget && state.XInterval > 0) state.X = state.XTarget;
			else if (state.X < state.XTarget && state.XInterval < 0) state.X = state.XTarget;
		state.Y += state.YInterval;
		if (state.Y > state.YTarget && state.YInterval > 0) state.Y = state.YTarget;
			else if (state.Y < state.YTarget && state.YInterval < 0) state.Y = state.YTarget;
		SetCameraX(state.X); SetCameraY(state.Y);
		return state.X != state.XTarget || state.Y != state.YTarget;
	},
});

Scenario.defineAction("pause", {
	start: function(host,state,Duration) {
		state.EndTime = Duration + GetTime();
	},
	update: function(host,state) {
		return GetTime() < state.EndTime;
	},
});

Scenario.defineAction("playSound", {
	start: function(host,state,File) {
		state.Sound = LoadSound(File);
		state.Sound.play(false);
		return true;
	},
	update: function(host,state) {
		return state.Sound.isPlaying();
	},
});

Scenario.defineAction("showPerson", {
	start: function(host,state,Person) {
		SetPersonVisible(Person,true);
		IgnorePersonObstructions(Person,false);
	},
});

Scenario.defineAction("walkPerson", {
	start: function(host,state,Person,Direction,Distance,Speed,FaceFirst) {
		if (FaceFirst == null) FaceFirst = true;
		if (!isNaN(Speed)) SpeedVector = [Speed,Speed];
			else SpeedVector = Speed;
		state.Person = Person;
		state.OldSpeed = [GetPersonSpeedX(Person),GetPersonSpeedY(Person)];
		if (SpeedVector != null) SetPersonSpeedXY(state.Person,SpeedVector[0],SpeedVector[1]);
			else SpeedVector = state.OldSpeed;
		var XMovement;
		var YMovement;
		var XFaceCommand;
		var YFaceCommand;
		var StepCount;
		switch (Direction.toLowerCase()) {
			case "n": case "north":
				XFaceCommand = COMMAND_WAIT;
				YFaceCommand = COMMAND_FACE_NORTH;
				XMovement = COMMAND_WAIT;
				YMovement = COMMAND_MOVE_NORTH;
				StepCount = Distance / SpeedVector[1];
				break;
			case "s": case "south":
				XFaceCommand = COMMAND_WAIT;
				YFaceCommand = COMMAND_FACE_SOUTH;
				XMovement = COMMAND_WAIT;
				YMovement = COMMAND_MOVE_SOUTH;
				StepCount = Distance / SpeedVector[1];
				break;
			case "w": case "west":
				XFaceCommand = COMMAND_FACE_WEST;
				YFaceCommand = COMMAND_WAIT;
				XMovement = COMMAND_MOVE_WEST;
				YMovement = COMMAND_WAIT;
				StepCount = Distance / SpeedVector[0];
				break;
			case "e": case "east":
				XFaceCommand = COMMAND_FACE_EAST;
				YFaceCommand = COMMAND_WAIT;
				XMovement = COMMAND_MOVE_EAST;
				YMovement = COMMAND_WAIT;
				StepCount = Distance / SpeedVector[0];
				break;
			case "nw": case "northwest":
		    		XFaceCommand = COMMAND_FACE_WEST;
		    		YFaceCommand = COMMAND_FACE_NORTH;
		    		XMovement = COMMAND_MOVE_WEST;
				YMovement = COMMAND_MOVE_NORTH;
				StepCount = Distance / SpeedVector[0];
				break;
			case "ne": case "northeast":
		    		XFaceCommand = COMMAND_FACE_EAST;
		    		YFaceCommand = COMMAND_FACE_NORTH;
		    		XMovement = COMMAND_MOVE_EAST;
				YMovement = COMMAND_MOVE_NORTH;
				StepCount = Distance / SpeedVector[0];
				break;
			case "sw": case "southwest":
		    		XFaceCommand = COMMAND_FACE_WEST;
		    		YFaceCommand = COMMAND_FACE_SOUTH;
		    		XMovement = COMMAND_MOVE_WEST;
				YMovement = COMMAND_MOVE_SOUTH;
				StepCount = Distance / SpeedVector[0];
				break;
			case "se": case "southeast":
		    		XFaceCommand = COMMAND_FACE_EAST;
		    		YFaceCommand = COMMAND_FACE_SOUTH;
		    		XMovement = COMMAND_MOVE_EAST;
				YMovement = COMMAND_MOVE_SOUTH;
				StepCount = Distance / SpeedVector[0];
				break;
			default:
				XFaceCommand = COMMAND_WAIT;
		    		YFaceCommand = COMMAND_WAIT;
				XMovement = COMMAND_WAIT;
				YMovement = COMMAND_WAIT;
				StepCount = 0;
		}
		if (FaceFirst) {
		    QueuePersonCommand(state.Person,XFaceCommand,true);
		    QueuePersonCommand(state.Person,YFaceCommand,true);
		}
		for (iStep = 0; iStep < StepCount; ++iStep) {
			QueuePersonCommand(state.Person,XMovement,true);
			QueuePersonCommand(state.Person,YMovement,true);
			QueuePersonCommand(state.Person,COMMAND_WAIT,false);
		}
		return true;
	},
	update: function(host,state) {
		if (IsCommandQueueEmpty(state.Person)) {
			SetPersonSpeedXY(state.Person,state.OldSpeed[0],state.OldSpeed[1]);
			return false;
		}
		return true;
	},
});

// Properties
Scenario.prototype.frameRate getter = function()
{
	return this.FrameRate;
};

// Internal functions and methods
Scenario.Delegate = function(Object,Method)
{
	if (Method == null) return null;
	return function() { return Method.apply(Object,arguments); };
};

Scenario.UpdateTimeline = function(host,state)
{
	for (var iFork = 0; iFork < state.ForkThreads.length; ++iFork) {
		if (!host.FindThread(state.ForkThreads[iFork])) {
			state.ForkThreads.splice(iFork,1);
			--iFork; continue;
		}
	}
	if (host.FindThread(state.CommandThread)) return true;
	if (state.Instructions.length == 0 && state.ForkThreads.length == 0) return false;
	if (state.Instructions.length > 0) {
		var Instruction = state.Instructions.shift();
		if (Instruction.start != null) {
			var Arguments = [];
			Arguments.push(host);
			Arguments.push(Instruction.state);
			for (i = 0; i < Instruction.arguments.length; ++i) {
				Arguments.push(Instruction.arguments[i]);
			}
			Instruction.start.apply(Instruction,Arguments);
		}
		if (Instruction.update == null) return true;
		var UpdateDelegate = Scenario.Delegate(Instruction,Instruction.update);
		var RenderDelegate = Scenario.Delegate(Instruction,Instruction.render);
		var InputDelegate = Scenario.Delegate(Instruction,Instruction.handleInput);
		state.CommandThread = host.CreateThread(Instruction.state,UpdateDelegate,RenderDelegate,0,InputDelegate);
	}
	return true;
};

Scenario.prototype.CreateThread = function(State,Updater,Renderer,Priority,InputHandler)
{
	if (Priority == null) Priority = 0;
	var ThreadData = {};
	ThreadData.ID = this.NextThreadID;
	ThreadData.State = State;
	ThreadData.Priority = Priority;
	ThreadData.Updater = Updater;
	ThreadData.Renderer = Renderer;
	ThreadData.InputHandler = InputHandler;
	this.Threads.push(ThreadData);
	var Comparer = function(A,B) {
		if (A.Priority < B.Priority) return -1;
		if (A.Priority > B.Priority) return 1;
		return 0;
	};
	this.Threads.sort(Comparer);
	if (InputHandler != null) {
		this.FocusStack.push(this.FocusThread);
		this.FocusThread = ThreadData.ID;
	}
	++this.NextThreadID;
	return ThreadData.ID;
};

Scenario.prototype.Enqueue = function(Instruction)
{
	this.CurrentQueue.push(Instruction);
};

Scenario.prototype.FindThread = function(ID)
{
	if (ID == 0) return false;
	for (var i = 0; i < this.Threads.length; ++i) {
		if (ID == this.Threads[i].ID) return true;
	}
	return false;
};

Scenario.prototype.KillThread = function(ID)
{
	for (var i = 0; i < this.Threads.length; ++i) {
		if (ID == this.Threads[i].ID) {
			this.Threads.splice(i,1);
			--i; continue;
		}
	}
};

Scenario.prototype.RenderScene = function()
{
	for (var iThread = 0; iThread < this.Threads.length; ++iThread) {
		var Renderer = this.Threads[iThread].Renderer;
		if (Renderer != null) Renderer(this,this.Threads[iThread].State);
	}
};

Scenario.prototype.UpdateScene = function()
{
	for (var iThread = 0; iThread < this.Threads.length; ++iThread) {
		var ID = this.Threads[iThread].ID;
		var Updater = this.Threads[iThread].Updater;
		var InputHandler = this.Threads[iThread].InputHandler;
		var State = this.Threads[iThread].State;
		if (Updater == null) continue;
		if (!Updater(this,State)) {
			if (this.FocusThread == ID) this.FocusThread = this.FocusStack.pop();
			this.Threads.splice(iThread,1);
			--iThread; continue;
		}
		if (this.FocusThread == ID) InputHandler(this,State);
	}
};
