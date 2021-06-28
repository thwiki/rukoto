export function getClassParamTypes(object: object): any[] {
	return Reflect.getMetadata('design:paramtypes', object) ?? [];
}
