import { JobMetadata, JobMetadataArgs } from '../metadata';

export function Job(options: JobMetadataArgs): Function {
	return function (object: Function) {
		Reflect.defineMetadata('metadata', new JobMetadata(options), object);
	};
}

export type JobClass = new (...args: any[]) => { run(...args: any[]): Promise<boolean> };
