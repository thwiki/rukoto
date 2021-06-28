import { ParamMetadata } from '../metadata';

export function getMethodParamTypes(object: object, methodName?: string): ParamMetadata[] {
	const paramtypes: ParamMetadata[] = Reflect.getMetadata('custom:paramtypes', object, methodName) ?? [];
	return ((Reflect.getMetadata('design:paramtypes', object, methodName) ?? []) as any[]).map((paramtype, i) => {
		return ParamMetadata.factory({ name: `arg${i}`, type: paramtype, ...(paramtypes[i] ?? {}) });
	});
}
