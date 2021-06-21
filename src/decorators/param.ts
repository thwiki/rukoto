import { ParamMetadataArgs } from '../metadata';

export function Param(options: ParamMetadataArgs): Function {
	return function (object: Function, methodName: string, index: number) {
		const paramtypes: ParamMetadataArgs[] = Reflect.getMetadata('custom:paramtypes', object, methodName) ?? [];
		paramtypes[index] = { ...(paramtypes[index] ?? {}), ...options };
		Reflect.defineMetadata('custom:paramtypes', paramtypes, object, methodName);
	};
}
