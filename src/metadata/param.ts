import { ParamMetadataArgs, ParamFloatMetadataArgs, ParamIntMetadataArgs, ParamStringMetadataArgs } from './args/param';

export class ParamMetadata {
	name: string;
	type: ParamMetadataArgs['type'];

	static factory(args: ParamMetadataArgs) {
		if (args.type === 'string' || args.type === String) {
			return new ParamStringMetadata(args);
		}
		if (args.type === 'int') {
			return new ParamIntMetadata(args);
		}
		if (args.type === 'float' || args.type === Number) {
			return new ParamFloatMetadata(args);
		}
		args.type = null;
		return new ParamMetadata(args);
	}

	constructor(args: ParamMetadataArgs) {
		this.name = args.name;
		this.type = args.type;
	}

	transform(arg: string): any {
		return undefined;
	}

	toString() {
		return `${this.name}:null`;
	}
}

export class ParamStringMetadata extends ParamMetadata {
	constructor(args: ParamStringMetadataArgs) {
		super(args);
	}

	transform(arg: string): string {
		return String(arg);
	}

	toString() {
		return `${this.name}:string`;
	}
}

export class ParamIntMetadata extends ParamMetadata {
	min: number;
	max: number;

	constructor(args: ParamIntMetadataArgs) {
		super(args);
		this.min = args.min;
		this.max = args.max;
	}

	transform(arg: string): number {
		let value = parseInt(arg, 10);
		if (Number.isNaN(value)) throw new TypeError(`Unable to cast value "${arg}" to type int`);
		value = value | 0;
		if (this.min != null && value < this.min) throw new RangeError(`The value "${arg}" must be greater than or equal to ${this.min}`);
		if (this.max != null && value > this.max) throw new RangeError(`The value "${arg}" must be smaller than or equal to ${this.max}`);
		return value;
	}

	toString() {
		return `${this.name}:int`;
	}
}

export class ParamFloatMetadata extends ParamMetadata {
	min: number;
	max: number;

	constructor(args: ParamFloatMetadataArgs) {
		super(args);
		this.min = args.min;
		this.max = args.max;
	}

	transform(arg: string): number {
		const value = parseFloat(arg);
		if (Number.isNaN(value)) throw new TypeError(`Unable to cast value "${arg}" to type float`);
		if (this.min != null && value < this.min) throw new RangeError(`The value "${arg}" must be greater than or equal to ${this.min}`);
		if (this.max != null && value > this.max) throw new RangeError(`The value "${arg}" must be smaller than or equal to ${this.max}`);
		return value;
	}

	toString() {
		return `${this.name}:float`;
	}
}
