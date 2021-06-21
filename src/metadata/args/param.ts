export type ParamMetadataArgs = ParamStringMetadataArgs | ParamIntMetadataArgs | ParamFloatMetadataArgs;

export interface ParamStringMetadataArgs {
	name: string;
	type?: 'string' | StringConstructor;
}

export interface ParamIntMetadataArgs {
	name: string;
	type?: 'int';
	min?: number;
	max?: number;
}

export interface ParamFloatMetadataArgs {
	name: string;
	type?: 'float' | NumberConstructor;
	min?: number;
	max?: number;
}
