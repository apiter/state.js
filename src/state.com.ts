/*
 * Finite state machine library
 * Copyright (c) 2014-6 Steelbreeze Limited
 * Licensed under the MIT and GPL v3 licences
 * http://www.steelbreeze.net/state.cs
 */

/**
 * An enumeration of static constants that dictates the precise behavior of pseudo states.
 *
 * Use these constants as the `kind` parameter when creating new `PseudoState` instances.
 * @class PseudoStateKind
 */
export enum PseudoStateKind {
	/**
	 * Used for pseudo states that are always the staring point when entering their parent region.
	 * @member {PseudoStateKind} Initial
	 */
	Initial,

	/**
	 * Used for pseudo states that are the the starting point when entering their parent region for the first time; subsequent entries will start at the last known state.
	 * @member {PseudoStateKind} ShallowHistory
	 */
	ShallowHistory,

	/**
	 * As per `ShallowHistory` but the history semantic cascades through all child regions irrespective of their initial pseudo state kind.
	 * @member {PseudoStateKind} DeepHistory
	 */
	DeepHistory,

	/**
	 * Enables a dynamic conditional branches; within a compound transition.
	 * All outbound transition guards from a Choice are evaluated upon entering the PseudoState:
	 * if a single transition is found, it will be traversed;
	 * if many transitions are found, an arbitary one will be selected and traversed;
	 * if none evaluate true, and there is no 'else transition' defined, the machine is deemed illformed and an exception will be thrown.
	 * @member {PseudoStateKind} Choice
	 */
	Choice,

	/**
	 * Enables a static conditional branches; within a compound transition.
	 * All outbound transition guards from a Choice are evaluated upon entering the PseudoState:
	 * if a single transition is found, it will be traversed;
	 * if many or none evaluate true, and there is no 'else transition' defined, the machine is deemed illformed and an exception will be thrown.
	 * @member {PseudoStateKind} Junction
	 */
	Junction,

	/**
	 * Entering a terminate `PseudoState` implies that the execution of this state machine by means of its state object is terminated.
	 * @member {PseudoStateKind} Terminate
	 */
	Terminate
}

/**
 * An enumeration of static constants that dictates the precise behavior of transitions.
 *
 * Use these constants as the `kind` parameter when creating new `Transition` instances.
 * @class TransitionKind
 */
export enum TransitionKind {
	/**
	 * The transition, if triggered, occurs without exiting or entering the source state.
	 * Thus, it does not cause a state change. This means that the entry or exit condition of the source state will not be invoked.
	 * An internal transition can be taken even if the state machine is in one or more regions nested within this state.
	 * @member {TransitionKind} Internal
	 */
	Internal,

	/**
	 * The transition, if triggered, will not exit the composite (source) state, but will enter the non-active target vertex ancestry.
	 * @member {TransitionKind} Local
	 */
	Local,

	/**
	 * The transition, if triggered, will exit the source vertex.
	 * @member {TransitionKind} External
	 */
	External
}

/**
 * Interface for the state machine instance; an object used as each instance of a state machine (as the classes in this library describe a state machine model). The contents of objects that implement this interface represents the Ac
 * @interface IInstance
 */
export interface IInstance {
	/**
	 * @member {boolean} isTerminated Indicates that the state machine instance has reached a terminate pseudo state and therfore will no longer evaluate messages.
	 */
	isTerminated: boolean;

	/**
	 * Updates the last known state for a given region.
	 * @method setCurrent
	 * @param {Region} region The region to update the last known state for.
	 * @param {State} state The last known state for the given region.
	 */
	setCurrent(region: Region, state: State): void;

	/**
	 * Returns the last known state for a given region.
	 * @method getCurrent
	 * @param {Region} region The region to update the last known state for.
	 * @returns {State} The last known state for the given region.
	 */
	getCurrent(region: Region): State;
}

/**
 * Declaration for callbacks that provide state entry, state exit and transition behavior.
 * @interface Action
 * @param {any} message The message that may trigger the transition.
 * @param {IInstance} instance The state machine instance.
 * @param {boolean} history Internal use only
 * @returns {any} Actions can return any value.
 */
export interface Action {
	(message?: any, instance?: IInstance, history?: boolean): any;
}

/**
 * Behavior encapsulates multiple Action callbacks that can be invoked by a single call.
 * @class Behavior
 */
export class Behavior {
	private actions = new Array<Action>();

	/**
	 * Creates a new instance of the Behavior class.
	 * @param {Behavior} behavior The copy constructor; omit this optional parameter for a simple constructor.
	 */
	public constructor(behavior?: Behavior) {
		if (behavior) {
			this.push(behavior); // NOTE: this ensures a copy of the array is made
		}
	}

	/**
	 * Adds an Action or set of Actions callbacks in a Behavior instance to this behavior instance.
	 * @method push
	 * @param {Action | Behavior} behavior The Action or set of Actions callbacks to add to this behavior instance.
	 * @returns {Behavior} Returns this behavior instance (for use in fluent style development).
	 */
	public push(behavior: Behavior | Action) {
		if (behavior instanceof Behavior) {
			this.actions = this.actions.concat(behavior.actions);
		} else {
			this.actions.push(behavior);
		}

		return this;
	}

	/**
	 * Tests the Behavior instance to see if any actions have been defined.
	 * @method hasActions
	 * @returns {boolean} True if there are actions defined within this Behavior instance.
	 */
	public hasActions(): boolean {
		return this.actions.length !== 0;
	}

	/**
	 * Invokes all the action callbacks in this Behavior instance.
	 * @method invoke
	 * @param {any} message The message that triggered the transition.
	 * @param {IInstance} instance The state machine instance.
	 * @param {boolean} history Internal use only
	 */
	public invoke(message: any, instance: IInstance, history: boolean = false): void {
		for (let action of this.actions) {
			action(message, instance, history);
		}
	}
}

/**
 * Declaration callbacks that provide transition guard conditions.
 * @interface Guard
 * @param {any} message The message that may trigger the transition.
 * @param {IInstance} instance The state machine instance.
 * @param {boolean} history Internal use only
 * @returns {boolean} True if the guard condition passed.
 */
export interface Guard {
	(message?: any, instance?: IInstance): boolean;
}

/**
 * An abstract class used as the base for the Region and Vertex classes.
 * An element is a node within the tree structure that represents a composite state machine model.
 * @class Element
 */
export abstract class Element {
	/**
	 * The symbol used to separate element names within a fully qualified name.
	 * Change this static member to create different styles of qualified name generated by the toString method.
	 * @member {string}
	 */
	public static namespaceSeparator = ".";

	/**
	 * The name of the element.
	 * @member {string}
	 */
	public /*readonly*/ name: string;

	/**
	 * The fully qualified name of the element.
	 * @member {string}
	 */
	public /*readonly*/ qualifiedName: string;

	/**
	 * Creates a new instance of the element class.
	 * @param {string} name The name of the element.
	 */
	public constructor(name: string, parent: Element) {
		this.name = name;
		this.qualifiedName = parent ? (parent.qualifiedName + Element.namespaceSeparator + name) : name;
	}

	/**
	 * Returns a the element name as a fully qualified namespace.
	 * @method toString
	 * @returns {string}
	 */
	public toString(): string {
		return this.qualifiedName;
	}
}

/**
 * An element within a state machine model that is a container of Vertices.
 *
 * Regions are implicitly inserted into composite state machines as a container for vertices.
 * They only need to be explicitly defined if orthogonal states are required.
 *
 * Region extends the Element class and inherits its public interface.
 * @class Region
 * @augments Element
 */
export class Region extends Element {
	/**
	 * The name given to regions that are are created automatically when a state is passed as a vertex's parent.
	 * Regions are automatically inserted into state machine models as the composite structure is built; they are named using this static member.
	 * Update this static member to use a different name for default regions.
	 * @member {string}
	 */
	public static defaultName: string = "default";

	/**
	 * The parent state of this region.
	 * @member {Region}
	 */
	public /*readonly*/ state: State;

	/**
	 * The set of vertices that are children of the region.
	 * @member {Array<Vertex>}
	 */
	public vertices = new Array<Vertex>();

	/**
	 * Creates a new instance of the Region class.
	 * @param {string} name The name of the region.
	 * @param {State} state The parent state that this region will be a child of.
	 */
	public constructor(name: string, state: State) {
		super(name, state);

		this.state = state;

		this.state.regions.push(this);

		this.state.getRoot().clean = false;
	}

	/**
	 * Removes the state from the state machine model
	 * @method remove
	 */
	public remove() {
		for (let vertex of this.vertices) {
			vertex.remove();
		}

		this.state.regions.splice(this.state.regions.indexOf(this), 1);

		console.log(`remove ${this}`);

		this.state.getRoot().clean = false;
	}

	/**
	 * Returns the root element within the state machine model.
	 * @method getRoot
	 * @returns {StateMachine} The root state machine element.
	 */
	public getRoot(): StateMachine {
		return this.state.getRoot();
	}

	/**
	 * Accepts an instance of a visitor and calls the visitRegion method on it.
	 * @method accept
	 * @param {Visitor<TArg1>} visitor The visitor instance.
	 * @param {TArg1} arg1 An optional argument to pass into the visitor.
	 * @param {any} arg2 An optional argument to pass into the visitor.
	 * @param {any} arg3 An optional argument to pass into the visitor.
	 * @returns {any} Any value can be returned by the visitor.
	 */
	public accept<TArg1>(visitor: Visitor<TArg1>, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return visitor.visitRegion(this, arg1, arg2, arg3);
	}
}

/**
 * An abstract element within a state machine model that can be the source or target of a transition (states and pseudo states).
 *
 * Vertex extends the Element class and inherits its public interface.
 * @class Vertex
 * @augments Element
 */
export abstract class Vertex extends Element {
	// resolve the vertices parent region for either states or regions
	private static parent(parent: Region | State ): Region {
		return parent instanceof State ? parent.defaultRegion() : parent;
	}

	/**
	 * The parent region of this vertex.
	 * @member {Region}
	 */
	public /*readonly*/ region: Region;

	/**
	 * The set of transitions originating from this vertex.
	 * @member {Array<Transition>}
	 */
	public outgoing = new Array<Transition>();

	/**
	 * The set of transitions targeting this vertex.
	 * @member {Array<Transition>}
	 */
	public incoming = new Array<Transition>();

	/**
	 * Creates a new instance of the Vertex class.
	 * @param {string} name The name of the vertex.
	 * @param {Region | State} parent The parent region or state.
	 */
	public constructor(name: string, parent: Region | State) {
		super(name, State.parent(parent));

		this.region = State.parent(parent);

		if (this.region) {
			this.region.vertices.push(this);

			this.region.getRoot().clean = false;
		}
	}

	// returns the ancestry of this vertex
	/*internal*/ ancestry(): Array<Vertex> {
		return (this.region ? this.region.state.ancestry() : new Array<Vertex>()).concat(this);
	}

	/**
	 * Returns the root element within the state machine model.
	 * @method getRoot
	 * @returns {StateMachine} The root state machine element.
	 */
	public getRoot(): StateMachine {
		return this.region.getRoot();
	}

	/**
	 * Removes the vertex from the state machine model
	 * @method remove
	 */
	public remove() {
		for (let transition of this.outgoing) {
			transition.remove();
		}

		for (let transition of this.incoming) {
			transition.remove();
		}

		this.region.vertices.splice(this.region.vertices.indexOf(this), 1);

		console.log(`remove ${this}`);

		this.region.getRoot().clean = false;
	}

	/**
	 * Creates a new transition from this vertex.
	 * Newly created transitions are completion transitions; they will be evaluated after a vertex has been entered if it is deemed to be complete.
	 * Transitions can be converted to be event triggered by adding a guard condition via the transitions `where` method.
	 * @method to
	 * @param {Vertex} target The destination of the transition; omit for internal transitions.
	 * @param {TransitionKind} kind The kind the transition; use this to set Local or External (the default if omitted) transition semantics.
	 * @returns {Transition} The new transition object.
	 */
	public to(target?: Vertex, kind: TransitionKind = TransitionKind.External): Transition {
		return new Transition(this, target, kind);
	}

	/**
	 * Accepts an instance of a visitor.
	 * @method accept
	 * @param {Visitor<TArg>} visitor The visitor instance.
	 * @param {TArg} arg An optional argument to pass into the visitor.
	 * @returns {any} Any value can be returned by the visitor.
	 */
	public abstract accept<TArg1>(visitor: Visitor<TArg1>, arg1?: TArg1, arg2?: any, arg3?: any): any;
}

/**
 * An element within a state machine model that represents an transitory Vertex within the state machine model.
 *
 * Pseudo states are required in all state machine models; at the very least, an `Initial` pseudo state is the default stating state when the parent region is entered.
 * Other types of pseudo state are available; typically for defining history semantics or to facilitate more complex transitions.
 * A `Terminate` pseudo state kind is also available to immediately terminate processing within the entire state machine instance.
 *
 * PseudoState extends the Vertex class and inherits its public interface.
 * @class PseudoState
 * @augments Vertex
 */
export class PseudoState extends Vertex {
	/**
	 * The kind of the pseudo state which determines its use and behavior.
	 * @member {PseudoStateKind}
	 */
	public /*readonly*/ kind: PseudoStateKind;

	/**
	 * Creates a new instance of the PseudoState class.
	 * @param {string} name The name of the pseudo state.
	 * @param {Region | State} parent The parent element that this pseudo state will be a child of.
	 * @param {PseudoStateKind} kind Determines the behavior of the PseudoState.
	 */
	public constructor(name: string, parent: Region | State, kind: PseudoStateKind = PseudoStateKind.Initial) {
		super(name, parent);

		this.kind = kind;
	}

	/**
	 * Tests a pseudo state to determine if it is a history pseudo state.
	 * History pseudo states are of kind: Initial, ShallowHisory, or DeepHistory.
	 * @method isHistory
	 * @returns {boolean} True if the pseudo state is a history pseudo state.
	 */
	public isHistory(): boolean {
		return this.kind === PseudoStateKind.DeepHistory || this.kind === PseudoStateKind.ShallowHistory;
	}

	/**
	 * Tests a pseudo state to determine if it is an initial pseudo state.
	 * Initial pseudo states are of kind: Initial, ShallowHisory, or DeepHistory.
	 * @method isInitial
	 * @returns {boolean} True if the pseudo state is an initial pseudo state.
	 */
	public isInitial(): boolean {
		return this.kind === PseudoStateKind.Initial || this.isHistory();
	}

	/**
	 * Accepts an instance of a visitor and calls the visitPseudoState method on it.
	 * @method accept
	 * @param {Visitor<TArg1>} visitor The visitor instance.
	 * @param {TArg1} arg1 An optional argument to pass into the visitor.
	 * @param {any} arg2 An optional argument to pass into the visitor.
	 * @param {any} arg3 An optional argument to pass into the visitor.
	 * @returns {any} Any value can be returned by the visitor.
	 */
	public accept<TArg1>(visitor: Visitor<TArg1>, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return visitor.visitPseudoState(this, arg1, arg2, arg3);
	}
}

/**
 * An element within a state machine model that represents an invariant condition within the life of the state machine instance.
 *
 * States are one of the fundamental building blocks of the state machine model.
 * Behavior can be defined for both state entry and state exit.
 *
 * State extends the Vertex class and inherits its public interface.
 * @class State
 * @augments Vertex
 */
export class State extends Vertex {
		// user defined behavior (via exit method) to execute when exiting a state.
		/* internal */ exitBehavior = new Behavior();

		// user defined behavior (via entry method) to execute when entering a state.
		/* internal */ entryBehavior = new Behavior();

	/**
	 * The set of regions under this state.
	 * @member {Array<Region>}
	 */
	public regions = new Array<Region>();

	/**
	 * Creates a new instance of the State class.
	 * @param {string} name The name of the state.
	 * @param {Region | State} parent The parent state that owns the state.
	 */
	public constructor(name: string, parent: Region | State) {
		super(name, parent);
	}

	/**
	 * Returns the default region for the state.
	 * Note, this will create the default region if it does not already exist.
	 * @method defaultRegion
	 * @returns {Region} The default region.
	 */
	public defaultRegion(): Region {
		return this.regions.reduce((result, region) => region.name === Region.defaultName ? region : result, undefined) || new Region(Region.defaultName, this);
	}

	/**
	 * Tests the state to see if it is a final state;
	 * a final state is one that has no outbound transitions.
	 * @method isFinal
	 * @returns {boolean} True if the state is a final state.
	 */
	public isFinal(): boolean {
		return this.outgoing.length === 0;
	}

	/**
	 * Tests the state to see if it is a simple state;
	 * a simple state is one that has no child regions.
	 * @method isSimple
	 * @returns {boolean} True if the state is a simple state.
	 */
	public isSimple(): boolean {
		return this.regions.length === 0;
	}

	/**
	 * Tests the state to see if it is a composite state;
	 * a composite state is one that has one or more child regions.
	 * @method isComposite
	 * @returns {boolean} True if the state is a composite state.
	 */
	public isComposite(): boolean {
		return this.regions.length > 0;
	}

	/**
	 * Tests the state to see if it is an orthogonal state;
	 * an orthogonal state is one that has two or more child regions.
	 * @method isOrthogonal
	 * @returns {boolean} True if the state is an orthogonal state.
	 */
	public isOrthogonal(): boolean {
		return this.regions.length > 1;
	}

	/**
	 * Removes the state from the state machine model
	 * @method remove
	 */
	public remove() {
		for (let region of this.regions) {
			region.remove();
		}

		super.remove();
	}

	/**
	 * Adds behavior to a state that is executed each time the state is exited.
	 * @method exit
	 * @param {Action} exitAction The action to add to the state's exit behavior.
	 * @returns {State} Returns the state to allow a fluent style API.
	 */
	public exit(exitAction: Action) {
		this.exitBehavior.push(exitAction);

		this.getRoot().clean = false;

		return this;
	}

	/**
	 * Adds behavior to a state that is executed each time the state is entered.
	 * @method entry
	 * @param {Action} entryAction The action to add to the state's entry behavior.
	 * @returns {State} Returns the state to allow a fluent style API.
	 */
	public entry(entryAction: Action) {
		this.entryBehavior.push(entryAction);

		this.getRoot().clean = false;

		return this;
	}

	/**
	 * Accepts an instance of a visitor and calls the visitState method on it.
	 * @method accept
	 * @param {Visitor<TArg1>} visitor The visitor instance.
	 * @param {TArg1} arg1 An optional argument to pass into the visitor.
	 * @param {any} arg2 An optional argument to pass into the visitor.
	 * @param {any} arg3 An optional argument to pass into the visitor.
	 * @returns {any} Any value can be returned by the visitor.
	 */
	public accept<TArg1>(visitor: Visitor<TArg1>, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return visitor.visitState(this, arg1, arg2, arg3);
	}
}

/**
 * An element within a state machine model that represents completion of the life of the containing Region within the state machine instance.
 *
 * A final state cannot have outbound transitions.
 *
 * FinalState extends the State class and inherits its public interface.
 * @class FinalState
 * @augments State
 */
export class FinalState extends State {
	/**
	 * Creates a new instance of the FinalState class.
	 * @param {string} name The name of the final state.
	 * @param {Region | State} parent The parent element that owns the final state.
	 */
	public constructor(name: string, parent: Region | State) {
		super(name, parent);
	}

	/**
	 * Accepts an instance of a visitor and calls the visitFinalState method on it.
	 * @method accept
	 * @param {Visitor<TArg>} visitor The visitor instance.
	 * @param {TArg} arg An optional argument to pass into the visitor.
	 * @returns {any} Any value can be returned by the visitor.
	 */
	public accept<TArg1>(visitor: Visitor<TArg1>, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return visitor.visitFinalState(this, arg1, arg2, arg3);
	}
}

/**
 * An element within a state machine model that represents the root of the state machine model.
 *
 * StateMachine extends the State class and inherits its public interface.
 * @class StateMachine
 * @augments State
 */
export class StateMachine extends State {
		// flag used to indicate that the state machine model has has structural changes and therefore requires initialising.
		/*internal*/ clean = false;

		// the behavior required to initialise state machine instances; created when initialising the state machine model.
		/*internal*/ onInitialise: Behavior;

	/**
	 * Creates a new instance of the StateMachine class.
	 * @param {string} name The name of the state machine.
	 */
	public constructor(name: string) {
		super(name, undefined);
	}

	/**
	 * Returns the root element within the state machine model.
	 * Note that if this state machine is embeded within another state machine, the ultimate root element will be returned.
	 * @method getRoot
	 * @returns {StateMachine} The root state machine element.
	 */
	public getRoot(): StateMachine {
		return this.region ? this.region.getRoot() : this;
	}

	/**
	 * Accepts an instance of a visitor and calls the visitStateMachine method on it.
	 * @method accept
	 * @param {Visitor<TArg1>} visitor The visitor instance.
	 * @param {TArg1} arg1 An optional argument to pass into the visitor.
	 * @param {any} arg2 An optional argument to pass into the visitor.
	 * @param {any} arg3 An optional argument to pass into the visitor.
	 * @returns {any} Any value can be returned by the visitor.
	 */
	public accept<TArg1>(visitor: Visitor<TArg1>, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return visitor.visitStateMachine(this, arg1, arg2, arg3);
	}
}

/**
 * A transition between vertices (states or pseudo states) that may be traversed in response to a message.
 *
 * Transitions come in a variety of types:
 * internal transitions respond to messages but do not cause a state transition, they only have behavior;
 * local transitions are contained within a single region therefore the source vertex is exited, the transition traversed, and the target state entered;
 * external transitions are more complex in nature as they cross region boundaries, all elements up to but not not including the common ancestor are exited and entered.
 *
 * Entering a composite state will cause the entry of the child regions within the composite state; this in turn may trigger more transitions.
 * @class Transition
 */
export class Transition {
		// the default guard condition for pseudo states
		/*internal*/ static TrueGuard = () => { return true; };

		// used as the guard condition for else tranitions
		/*internal*/ static FalseGuard = () => { return false; };

		// guard condition for this transition.
		/*internal*/ guard: Guard;

		// user defined behavior (via effect) executed when traversing this transition.
		/*internal*/ transitionBehavior = new Behavior();

		// the collected actions to perform when traversing the transition (includes exiting states, traversal, and state entry)
		/*internal*/ onTraverse: Behavior;

	/**
	 * The source of the transition.
	 * @member {Vertex}
	 */
	public /*readonly*/ source: Vertex;

	/**
	 * The target of the transition.
	 * @member {Vertex}
	 */
	public /*readonly*/ target: Vertex;

	/**
	 * The kind of the transition which determines its behavior.
	 * @member {TransitionKind}
	 */
	public /*readonly*/ kind: TransitionKind;

	/**
	 * Creates a new instance of the Transition class.
	 * @param {Vertex} source The source of the transition.
	 * @param {Vertex} source The target of the transition; this is an optional parameter, omitting it will create an Internal transition.
	 * @param {TransitionKind} kind The kind the transition; use this to set Local or External (the default if omitted) transition semantics.
	 */
	public constructor(source: Vertex, target?: Vertex, kind: TransitionKind = TransitionKind.External) {
		this.source = source;
		this.target = target;
		this.kind = target ? kind : TransitionKind.Internal;

		this.guard = source instanceof PseudoState ? Transition.TrueGuard : (message => message === this.source);

		this.source.outgoing.push(this);

		if (this.target) {
			this.target.incoming.push(this);
		}

		this.source.getRoot().clean = false;
	}

	/**
	 * Turns a transition into an else transition.
	 *
	 * Else transitions can be used at `Junction` or `Choice` pseudo states if no other transition guards evaluate true, an Else transition if present will be traversed.
	 * @method else
	 * @returns {Transition} Returns the transition object to enable the fluent API.
	 */
	public else() {
		this.guard = Transition.FalseGuard;

		return this;
	}

	/**
	 * Defines the guard condition for the transition.
	 * @method when
	 * @param {Guard} guard The guard condition that must evaluate true for the transition to be traversed.
	 * @returns {Transition} Returns the transition object to enable the fluent API.
	 */
	public when(guard: Guard) {
		this.guard = guard;

		return this;
	}

	/**
	 * Add behavior to a transition.
	 * @method effect
	 * @param {Action} transitionAction The action to add to the transitions traversal behavior.
	 * @returns {Transition} Returns the transition object to enable the fluent API.
	 */
	public effect(transitionAction: Action) {
		this.transitionBehavior.push(transitionAction);

		this.source.getRoot().clean = false;

		return this;
	}

	/**
	 * Removes the transition from the state machine model
	 * @method remove
	 */
	public remove() {
		this.source.outgoing.splice(this.source.outgoing.indexOf(this), 1);

		if (this.target) {
			this.target.incoming.splice(this.target.incoming.indexOf(this), 1);
		}

		console.log(`remove ${this}`);

		this.source.getRoot().clean = false;
	}

	/**
	 * Accepts an instance of a visitor and calls the visitTransition method on it.
	 * @method accept
	 * @param {Visitor<TArg1>} visitor The visitor instance.
	 * @param {TArg1} arg1 An optional argument to pass into the visitor.
	 * @param {any} arg2 An optional argument to pass into the visitor.
	 * @param {any} arg3 An optional argument to pass into the visitor.
	 * @returns {any} Any value can be returned by the visitor.
	 */
	public accept<TArg1>(visitor: Visitor<TArg1>, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return visitor.visitTransition(this, arg1, arg2, arg3);
	}

	/**
	 * Returns a the transition name.
	 * @method toString
	 * @returns {string}
	 */
	public toString(): string {
		return `[ ${this.target ? (this.source + " -> " + this.target) : this.source}]`;
	}
}

/**
 * Default working implementation of a state machine instance class.
 *
 * Implements the `IInstance` interface.
 * It is possible to create other custom instance classes to manage state machine state in other ways (e.g. as serialisable JSON); just implement the same members and methods as this class.
 * @class StateMachineInstance
 * @implements IInstance
 */
export class StateMachineInstance implements IInstance {
	private last: any = [];

	/**
	 * The name of the state machine instance.
	 * @member {string}
	 */
	public /*readonly*/ name: string;

	/**
	 * Indicates that the state manchine instance reached was terminated by reaching a Terminate pseudo state.
	 * @member isTerminated
	 */
	public isTerminated: boolean = false;

	/**
	 * Creates a new instance of the state machine instance class.
	 * @param {string} name The optional name of the state machine instance.
	 */
	public constructor(name: string = "unnamed") {
		this.name = name;
	}

		// Updates the last known state for a given region.
		/*internal*/ setCurrent(region: Region, state: State): void {
		this.last[region.qualifiedName] = state;
	}

	// Returns the last known state for a given region.
	public getCurrent(region: Region): State {
		return this.last[region.qualifiedName];
	}

	/**
	 * Returns the name of the state machine instance.
	 * @method toString
	 * @returns {string} The name of the state machine instance.
	 */
	public toString(): string {
		return this.name;
	}
}

/**
 * Implementation of a visitor pattern.
 * @class Visitor
 */
export abstract class Visitor<TArg1> {
	/**
	 * Visits an element within a state machine model.
	 * @method visitElement
	 * @param {Element} element the element being visited.
	 * @param {TArg1} arg1 An optional parameter passed into the accept method.
	 * @param {any} arg2 An optional parameter passed into the accept method.
	 * @param {any} arg3 An optional parameter passed into the accept method.
	 * @returns {any} Any value may be returned when visiting an element.
	 */
	public visitElement(element: Element, arg1?: TArg1, arg2?: any, arg3?: any): any {
	}

	/**
	 * Visits a region within a state machine model.
	 * @method visitRegion
	 * @param {Region} region The region being visited.
	 * @param {TArg1} arg1 An optional parameter passed into the accept method.
	 * @param {any} arg2 An optional parameter passed into the accept method.
	 * @param {any} arg3 An optional parameter passed into the accept method.
	 * @returns {any} Any value may be returned when visiting an element.
	 */
	public visitRegion(region: Region, arg1?: TArg1, arg2?: any, arg3?: any): any {
		const result = this.visitElement(region, arg1, arg2, arg3);

		for (let vertex of region.vertices) {
			vertex.accept(this, arg1, arg2, arg3);
		}

		return result;
	}

	/**
	 * Visits a vertex within a state machine model.
	 * @method visitVertex
	 * @param {Vertex} vertex The vertex being visited.
	 * @param {TArg1} arg1 An optional parameter passed into the accept method.
	 * @param {any} arg2 An optional parameter passed into the accept method.
	 * @param {any} arg3 An optional parameter passed into the accept method.
	 * @returns {any} Any value may be returned when visiting an element.
	 */
	public visitVertex(vertex: Vertex, arg1?: TArg1, arg2?: any, arg3?: any): any {
		const result = this.visitElement(vertex, arg1, arg2, arg3);

		for (let transition of vertex.outgoing) {
			transition.accept(this, arg1, arg2, arg3);
		}

		return result;
	}

	/**
	 * Visits a pseudo state within a state machine model.
	 * @method visitPseudoState
	 * @param {PseudoState} pseudoState The pseudo state being visited.
	 * @param {TArg1} arg1 An optional parameter passed into the accept method.
	 * @param {any} arg2 An optional parameter passed into the accept method.
	 * @param {any} arg3 An optional parameter passed into the accept method.
	 * @returns {any} Any value may be returned when visiting an element.
	 */
	public visitPseudoState(pseudoState: PseudoState, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return this.visitVertex(pseudoState, arg1, arg2, arg3);
	}

	/**
	 * Visits a state within a state machine model.
	 * @method visitState
	 * @param {State} state The state being visited.
	 * @param {TArg1} arg1 An optional parameter passed into the accept method.
	 * @param {any} arg2 An optional parameter passed into the accept method.
	 * @param {any} arg3 An optional parameter passed into the accept method.
	 * @returns {any} Any value may be returned when visiting an element.
	 */
	public visitState(state: State, arg1?: TArg1, arg2?: any, arg3?: any): any {
		const result = this.visitVertex(state, arg1, arg2, arg3);

		for (let region of state.regions) {
			region.accept(this, arg1, arg2, arg3);
		}

		return result;
	}

	/**
	 * Visits a final state within a state machine model.
	 * @method visitFinal
	 * @param {FinalState} finalState The final state being visited.
	 * @param {TArg1} arg1 An optional parameter passed into the accept method.
	 * @param {any} arg2 An optional parameter passed into the accept method.
	 * @param {any} arg3 An optional parameter passed into the accept method.
	 * @returns {any} Any value may be returned when visiting an element.
	 */
	public visitFinalState(finalState: FinalState, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return this.visitState(finalState, arg1, arg2, arg3);
	}

	/**
	 * Visits a state machine within a state machine model.
	 * @method visitVertex
	 * @param {StateMachine} state machine The state machine being visited.
	 * @param {TArg1} arg1 An optional parameter passed into the accept method.
	 * @param {any} arg2 An optional parameter passed into the accept method.
	 * @param {any} arg3 An optional parameter passed into the accept method.
	 * @returns {any} Any value may be returned when visiting an element.
	 */
	public visitStateMachine(model: StateMachine, arg1?: TArg1, arg2?: any, arg3?: any): any {
		return this.visitState(model, arg1, arg2, arg3);
	}

	/**
	 * Visits a transition within a state machine model.
	 * @method visitTransition
	 * @param {Transition} transition The transition being visited.
	 * @param {TArg1} arg1 An optional parameter passed into the accept method.
	 * @param {any} arg2 An optional parameter passed into the accept method.
	 * @param {any} arg3 An optional parameter passed into the accept method.
	 * @returns {any} Any value may be returned when visiting an element.
	 */
	public visitTransition(transition: Transition, arg1?: TArg1, arg2?: any, arg3?: any): any {
	}
}



/**
 * The methods that state.js may use from a console implementation. Create objects that ahdere to this interface for custom logging, warnings and error handling.
 * @interface IConsole
 */
export interface IConsole {
	/**
	 * Outputs a log message.
	 * @method log
	 * @param {any} message The object to log.
	 */
	log(message?: any, ...optionalParams: any[]): void;

	/**
	 * Outputs a warnnig warning.
	 * @method log
	 * @param {any} message The object to log.
	 */
	warn(message?: any, ...optionalParams: any[]): void;

	/**
	 * Outputs an error message.
	 * @method log
	 * @param {any} message The object to log.
	 */
	error(message?: any, ...optionalParams: any[]): void;
}

/**
 * Determines if a vertex is currently active; that it has been entered but not yet exited.
 * @function isActive
 * @param {Vertex} vertex The vertex to test.
 * @param {IInstance} instance The instance of the state machine model.
 * @returns {boolean} True if the vertex is active.
 */
export function isActive(vertex: Vertex, instance: IInstance): boolean {
	return vertex.region ? (isActive(vertex.region.state, instance) && (instance.getCurrent(vertex.region) === vertex)) : true;
}

/**
 * Tests an element within a state machine instance to see if its lifecycle is complete.
 * @function isComplete
 * @param {Region | State} element The element to test.
 * @param {IInstance} instance The instance of the state machine model to test for completeness.
 * @returns {boolean} True if the element is complete.
 */
export function isComplete(element: Region | State, instance: IInstance): boolean {
	if (element instanceof Region) {
		return instance.getCurrent(element).isFinal();
	} else {
		return element.regions.every(region => { return isComplete(region, instance); });
	}
}

/**
 * Sets a method to select an integer random number less than the max value passed as a parameter.
 *
 * This is only useful when a custom random number generator is required; the default implementation is fine in most circumstances.
 * @function setRandom
 * @param {function} generator A function that takes a max value and returns a random number between 0 and max - 1.
 * @returns A random number between 0 and max - 1
 */
export function setRandom(generator: (max: number) => number): void {
	random = generator;
}

/**
 * Returns the current method used to select an integer random number less than the max value passed as a parameter.
 *
 * This is only useful when a custom random number generator is required; the default implementation is fine in most circumstances.
 * @function getRandom
 * @returns {function} The function that takes a max value and returns a random number between 0 and max - 1.
 */
export function getRandom(): (max: number) => number {
	return random;
}

// the default method used to produce a random number; defaulting to simplified implementation seen in Mozilla Math.random() page; may be overriden for testing
let random = function (max: number): number {
	return Math.floor(Math.random() * max);
};

/**
 * Initialises a state machine and/or state machine model.
 *
 * Passing just the state machine model will initialise the model, passing the model and instance will initialse the instance and if necessary, the model.
 * @function initialise
 * @param {StateMachine} model The state machine model. If autoInitialiseModel is true (or no instance is specified) and the model has changed, the model will be initialised.
 * @param {IInstance} instance The optional state machine instance to initialise.
 * @param {boolean} autoInitialiseModel Defaulting to true, this will cause the model to be initialised prior to initialising the instance if the model has changed.
 */
export function initialise(model: StateMachine, instance?: IInstance, autoInitialiseModel: boolean = true): void {
	if (instance) {
		// initialise the state machine model if necessary
		if (autoInitialiseModel && model.clean === false) {
			initialise(model);
		}

		// log as required
		console.log(`initialise ${instance}`);

		// enter the state machine instance for the first time
		model.onInitialise.invoke(undefined, instance);
	} else {
		// log as required
		console.log(`initialise ${model.name}`);

		// initialise the state machine model
		model.accept(new InitialiseElements(), false);
		model.clean = true;
	}
}

/**
 * Passes a message to a state machine for evaluation; messages trigger state transitions.
 * @function evaluate
 * @param {StateMachine} model The state machine model. If autoInitialiseModel is true (or no instance is specified) and the model has changed, the model will be initialised.
 * @param {IInstance} instance The instance of the state machine model to evaluate the message against.
 * @param {boolean} autoInitialiseModel Defaulting to true, this will cause the model to be initialised prior to initialising the instance if the model has changed.
 * @returns {boolean} True if the message triggered a state transition.
 */
export function evaluate(model: StateMachine, instance: IInstance, message: any, autoInitialiseModel: boolean = true): boolean {
	// initialise the state machine model if necessary
	if (autoInitialiseModel && model.clean === false) {
		initialise(model);
	}

	// log as required
	console.log(`${instance} evaluate ${message}`);

	// terminated state machine instances will not evaluate messages
	if (instance.isTerminated) {
		return false;
	}

	return evaluateState(model, instance, message);
}

// evaluates messages against a state, executing transitions as appropriate
function evaluateState(state: State, instance: IInstance, message: any): boolean {
	let result = false;

	// delegate to child regions first if a non-continuation
	if (message !== state) {
		state.regions.every(region => {
			if (evaluateState(instance.getCurrent(region), instance, message)) {
				result = true;

				return isActive(state, instance); // NOTE: this just controls the every loop; also isActive is a litte costly so using sparingly
			}

			return true; // NOTE: this just controls the every loop
		});
	}
	// if a transition occured in a child region, check for completions
	if (result) {
		if ((message !== state) && isComplete(state, instance)) {
			evaluateState(state, instance, state);
		}
	} else {
		// otherwise look for a transition from this state
		const transitions = state.outgoing.filter(transition => transition.guard(message, instance));

		if (transitions.length === 1) {
			// execute if a single transition was found
			result = traverse(transitions[0], instance, message);
		} else if (transitions.length > 1) {
			// error if multiple transitions evaluated true
			console.error(`${state}: multiple outbound transitions evaluated true for message ${message}`);
		}
	}

	return result;
}

// traverses a transition
function traverse(transition: Transition, instance: IInstance, message?: any): boolean {
	let tran = transition;
	let target = tran.target;
	let onTraverse = new Behavior(tran.onTraverse);

	// process static conditional branches - build up all the transition behaviour prior to executing
	while (target && target instanceof PseudoState && target.kind === PseudoStateKind.Junction) {
		// proceed to the next transition
		tran = selectTransition(target as PseudoState, instance, message);
		target = tran.target;

		// concatenate behavior before and after junctions
		onTraverse.push(tran.onTraverse);
	}

	// execute the transition behavior
	onTraverse.invoke(message, instance);

	if (target) {
		// process dynamic conditional branches as required
		if (target instanceof PseudoState && target.kind === PseudoStateKind.Choice) {
			traverse(selectTransition(target, instance, message), instance, message);
		}

		// test for completion transitions
		else if (target instanceof State && isComplete(target, instance)) {
			evaluateState(target, instance, target);
		}
	}

	return true;
}

// select next leg of composite transitions after choice and junction pseudo states
function selectTransition(pseudoState: PseudoState, instance: IInstance, message: any): Transition {
	const results = pseudoState.outgoing.filter(transition => transition.guard(message, instance));

	if (pseudoState.kind === PseudoStateKind.Choice) {
		return results.length !== 0 ? results[getRandom()(results.length)] : findElse(pseudoState);
	} else {
		if (results.length > 1) {
			console.error(`Multiple outbound transition guards returned true at ${pseudoState} for ${message}`);
		} else {
			return results[0] || findElse(pseudoState);
		}
	}
}

// look for else transitions from a junction or choice
function findElse(pseudoState: PseudoState): Transition {
	return pseudoState.outgoing.filter(transition => transition.guard === Transition.FalseGuard)[0];
}

// interfaces to manage element behavior
class ElementBehavior {
	leave: Behavior = new Behavior();
	beginEnter: Behavior = new Behavior();
	endEnter: Behavior = new Behavior();

	enter(): Behavior {
		return new Behavior(this.beginEnter).push(this.endEnter);
	}
}

interface ElementBehaviors { [index: string]: ElementBehavior; }

// determine the type of transition and use the appropriate initiliasition method
class InitialiseTransitions extends Visitor<(element: Element) => ElementBehavior> {
	visitTransition(transition: Transition, behavior: (element: Element) => ElementBehavior) {
		// reset transition behavior
		transition.onTraverse = new Behavior();

		// initialise transition behaviour based on transition kind
		switch (transition.kind) {
			case TransitionKind.Internal:
				this.visitInternalTransition(transition, behavior);
				break;

			case TransitionKind.Local:
				this.visitLocalTransition(transition, behavior);
				break;

			case TransitionKind.External:
				this.visitExternalTransition(transition, behavior);
				break;
		}
	}

	// initialise internal transitions: these do not leave the source state
	visitInternalTransition(transition: Transition, behavior: (element: Element) => ElementBehavior) {
		// perform the transition behavior
		transition.onTraverse.push(transition.transitionBehavior);

		// add a test for completion
		if (internalTransitionsTriggerCompletion) {
			transition.onTraverse.push((message, instance, history) => {
				const state = transition.source as State; // NOTE: internal transitions source

				// fire a completion transition
				if (isComplete(state, instance)) {
					evaluateState(state, instance, state);
				}
			});
		}
	}

	// initialise transitions within the same region
	visitLocalTransition(transition: Transition, behavior: (element: Element) => ElementBehavior) {
		transition.onTraverse.push((message, instance) => {
			const targetAncestors = transition.target.ancestry();
			let i = 0;

			// find the first inactive element in the target ancestry
			while (isActive(targetAncestors[i], instance)) { ++i; }

			// exit the active sibling
			behavior(instance.getCurrent(targetAncestors[i].region)).leave.invoke(message, instance);

			// perform the transition action;
			transition.transitionBehavior.invoke(message, instance);

			// enter the target ancestry
			while (i < targetAncestors.length) {
				this.cascadeElementEntry(transition, behavior, targetAncestors[i++], targetAncestors[i], behavior => behavior.invoke(message, instance));
			}

			// trigger cascade
			behavior(transition.target).endEnter.invoke(message, instance);
		});
	}

	// initialise external transitions: these are abritarily complex
	visitExternalTransition(transition: Transition, behavior: (element: Element) => ElementBehavior) {
		const sourceAncestors = transition.source.ancestry(),
			targetAncestors = transition.target.ancestry();
		let i = Math.min(sourceAncestors.length, targetAncestors.length) - 1;

		// find the index of the first uncommon ancestor (or for external transitions, the source)
		while (sourceAncestors[i - 1] !== targetAncestors[i - 1]) { --i; }

		// leave source ancestry as required
		transition.onTraverse.push(behavior(sourceAncestors[i]).leave);

		// perform the transition effect
		transition.onTraverse.push(transition.transitionBehavior);

		// enter the target ancestry
		while (i < targetAncestors.length) {
			this.cascadeElementEntry(transition, behavior, targetAncestors[i++], targetAncestors[i], behavior => transition.onTraverse.push(behavior));
		}

		// trigger cascade
		transition.onTraverse.push(behavior(transition.target).endEnter);
	}

	cascadeElementEntry(transition: Transition, behavior: (element: Element) => ElementBehavior, element: Vertex, next: Vertex, task: (behavior: Behavior) => void) {
		task(behavior(element).beginEnter);

		if (next && element instanceof State) {
			for (let region of element.regions) {
				task(behavior(region).beginEnter);

				if (region !== next.region) {
					task(behavior(region).endEnter);
				}
			}
		}
	}
}

// bootstraps all the elements within a state machine model
class InitialiseElements extends Visitor<boolean> {
	private behaviors: ElementBehaviors = {};

	private behavior(element: Element): ElementBehavior {
		return this.behaviors[element.qualifiedName] || (this.behaviors[element.qualifiedName] = new ElementBehavior());
	}

	visitElement(element: Element, deepHistoryAbove: boolean) {
		if (console !== defaultConsole) {
			this.behavior(element).leave.push((message, instance) => console.log(`${instance} enter ${element}`));
			this.behavior(element).beginEnter.push((message, instance) => console.log(`${instance} enter ${element}`));
		}
	}

	visitRegion(region: Region, deepHistoryAbove: boolean) {
		const regionInitial = region.vertices.reduce<PseudoState>((result, vertex) => vertex instanceof PseudoState && vertex.isInitial() ? vertex : result, undefined);

		for (let vertex of region.vertices) {
			vertex.accept(this, deepHistoryAbove || (regionInitial && regionInitial.kind === PseudoStateKind.DeepHistory));
		}

		// leave the curent active child state when exiting the region
		this.behavior(region).leave.push((message, instance) => this.behavior(instance.getCurrent(region)).leave.invoke(message, instance));

		// enter the appropriate child vertex when entering the region
		if (deepHistoryAbove || !regionInitial || regionInitial.isHistory()) { // NOTE: history needs to be determined at runtime
			this.behavior(region).endEnter.push((message, instance, history) => (this.behavior((history || regionInitial.isHistory()) ? instance.getCurrent(region) || regionInitial : regionInitial)).enter().invoke(message, instance, history || regionInitial.kind === PseudoStateKind.DeepHistory));
		} else {
			this.behavior(region).endEnter.push(this.behavior(regionInitial).enter());
		}

		this.visitElement(region, deepHistoryAbove);
	}

	visitPseudoState(pseudoState: PseudoState, deepHistoryAbove: boolean) {
		super.visitPseudoState(pseudoState, deepHistoryAbove);

		// evaluate comppletion transitions once vertex entry is complete
		if (pseudoState.isInitial()) {
			this.behavior(pseudoState).endEnter.push((message, instance, history) => {
				if (instance.getCurrent(pseudoState.region)) {
					this.behavior(pseudoState).leave.invoke(message, instance);

					this.behavior(instance.getCurrent(pseudoState.region)).enter().invoke(message, instance, history || pseudoState.kind === PseudoStateKind.DeepHistory);
				} else {
					traverse(pseudoState.outgoing[0], instance);
				}
			});
		} else if (pseudoState.kind === PseudoStateKind.Terminate) {
			// terminate the state machine instance upon transition to a terminate pseudo state
			this.behavior(pseudoState).beginEnter.push((message, instance) => instance.isTerminated = true);
		}
	}

	visitState(state: State, deepHistoryAbove: boolean) {
		// NOTE: manually iterate over the child regions to control the sequence of behavior
		for (let region of state.regions) {
			region.accept(this, deepHistoryAbove);

			this.behavior(state).leave.push(this.behavior(region).leave);
			this.behavior(state).endEnter.push(this.behavior(region).enter());
		}

		this.visitVertex(state, deepHistoryAbove);

		// add the user defined behavior when entering and exiting states
		this.behavior(state).leave.push(state.exitBehavior);
		this.behavior(state).beginEnter.push(state.entryBehavior);

		// update the parent regions current state
		this.behavior(state).beginEnter.push((message, instance) => {
			if (state.region) {
				instance.setCurrent(state.region, state);
			}
		});
	}

	visitStateMachine(stateMachine: StateMachine, deepHistoryAbove: boolean) {
		super.visitStateMachine(stateMachine, deepHistoryAbove);

		// initiaise all the transitions once all the elements have been initialised
		stateMachine.accept(new InitialiseTransitions(), (element: Element) => this.behavior(element));

		// define the behavior for initialising a state machine instance
		stateMachine.onInitialise = this.behavior(stateMachine).enter();
	}
}

const defaultConsole = {
	log(message?: any, ...optionalParams: any[]): void { },
	warn(message?: any, ...optionalParams: any[]): void { },
	error(message?: any, ...optionalParams: any[]): void { throw message; }
};

/**
 * The object used for log, warning and error messages
 * @member {IConsole}
 */
export let console: IConsole = defaultConsole;

/**
 * Flag to trigger internal transitions to trigger completion events for state they are in
 * @member {Boolean}
 */
export let internalTransitionsTriggerCompletion: Boolean = false;

/**
 * Validates a state machine model for correctness (see the constraints defined within the UML Superstructure specification).
 * @function validate
 * @param {StateMachine} model The state machine model to validate.
 */
export function validate(model: StateMachine): void {
	model.accept(new Validator());
}

class Validator extends Visitor<string> {
	public visitPseudoState(pseudoState: PseudoState): any {
		super.visitPseudoState(pseudoState);

		if (pseudoState.kind === PseudoStateKind.Choice || pseudoState.kind === PseudoStateKind.Junction) {
			// [7] In a complete statemachine, a junction vertex must have at least one incoming and one outgoing transition.
			// [8] In a complete statemachine, a choice vertex must have at least one incoming and one outgoing transition.
			if (pseudoState.outgoing.length === 0) {
				console.error(`${pseudoState}: ${pseudoState.kind} pseudo states must have at least one outgoing transition.`);
			}

			// choice and junction pseudo state can have at most one else transition
			if (pseudoState.outgoing.filter((transition: Transition) => { return transition.guard === Transition.FalseGuard; }).length > 1) {
				console.error(`${pseudoState}: ${pseudoState.kind} pseudo states cannot have more than one Else transitions.`);
			}
		} else {
			// non choice/junction pseudo state may not have else transitions
			if (pseudoState.outgoing.filter((transition: Transition) => { return transition.guard === Transition.FalseGuard; }).length !== 0) {
				console.error(`${pseudoState}: ${pseudoState.kind} pseudo states cannot have Else transitions.`);
			}

			if (pseudoState.isInitial()) {
				if (pseudoState.outgoing.length > 1) {
					// [1] An initial vertex can have at most one outgoing transition.
					// [2] History vertices can have at most one outgoing transition.
					console.error(`${pseudoState}: initial pseudo states must have no more than one outgoing transition.`);
				} else if (pseudoState.outgoing.length === 1) {
					// [9] The outgoing transition from an initial vertex may have a behavior, but not a trigger or guard.
					if (pseudoState.outgoing[0].guard !== Transition.TrueGuard) {
						console.error(`${pseudoState}: initial pseudo states cannot have a guard condition.`);
					}
				}
			}
		}
	}

	public visitRegion(region: Region): any {
		super.visitRegion(region);

		// [1] A region can have at most one initial vertex.
		// [2] A region can have at most one deep history vertex.
		// [3] A region can have at most one shallow history vertex.
		let initial = 0, deepHistory = 0, shallowHistory = 0;

		for (let vertex of region.vertices) {
			if (vertex instanceof PseudoState) {
				if (vertex.kind === PseudoStateKind.Initial) {
					initial++;
				} else if (vertex.kind === PseudoStateKind.DeepHistory) {
					deepHistory++;
				} else if (vertex.kind === PseudoStateKind.ShallowHistory) {
					shallowHistory++;
				}
			}
		}

		if (initial > 1) {
			console.error(`${region}: regions may have at most one initial pseudo state.`);
		}

		if (deepHistory > 1) {
			console.error(`${region}: regions may have at most one deep history pseudo state.`);
		}

		if (shallowHistory > 1) {
			console.error(`${region}: regions may have at most one shallow history pseudo state.`);
		}
	}
	public visitState(state: State): any {
		super.visitState(state);

		if (state.regions.filter(region => region.name === Region.defaultName).length > 1) {
			console.error(`${state}: a state cannot have more than one region named ${Region.defaultName}`);
		}
	}

	public visitFinalState(finalState: FinalState): any {
		super.visitFinalState(finalState);

		// [1] A final state cannot have any outgoing transitions.
		if (finalState.outgoing.length !== 0) {
			console.error(`${finalState}: final states must not have outgoing transitions.`);
		}

		// [2] A final state cannot have regions.
		if (finalState.regions.length !== 0) {
			console.error(`${finalState}: final states must not have child regions.`);
		}

		// [4] A final state has no entry behavior.
		if (finalState.entryBehavior.hasActions()) {
			console.warn(`${finalState}: final states may not have entry behavior.`);
		}

		// [5] A final state has no exit behavior.
		if (finalState.exitBehavior.hasActions()) {
			console.warn(`${finalState}: final states may not have exit behavior.`);
		}
	}

	public visitTransition(transition: Transition): any {
		super.visitTransition(transition);

		// Local transition target vertices must be a child of the source vertex
		if (transition.kind === TransitionKind.Local) {
			if (transition.target.ancestry().indexOf(transition.source) === -1) {
				console.error(`${transition}: local transition target vertices must be a child of the source composite sate.`);
			}
		}
	}
}