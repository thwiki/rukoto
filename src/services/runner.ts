import chalk from 'chalk';
import { randomInt } from 'crypto';
import { mwn } from 'mwn';
import { performance } from 'perf_hooks';
import { Scheduler } from '.';
import { JobClass } from '../decorators';
import { JobMetadata, ParamMetadata } from '../metadata';

function getParamTypes(object: object, methodName?: string): any[] {
	return Reflect.getMetadata('design:paramtypes', object, methodName) ?? [];
}

function getArgTypes(object: object, methodName?: string): ParamMetadata[] {
	const paramtypes: ParamMetadata[] = Reflect.getMetadata('custom:paramtypes', object, methodName) ?? [];
	return ((Reflect.getMetadata('design:paramtypes', object, methodName) ?? []) as any[]).map((paramtype, i) => {
		return ParamMetadata.factory({ name: `arg${i}`, type: paramtype, ...(paramtypes[i] ?? {}) });
	});
}

export class Runner {
	paramTypes: any[];
	argTypes: ParamMetadata[];

	constructor(private scheduler: Scheduler, public jobClass: JobClass, public metadata: JobMetadata) {
		this.paramTypes = getParamTypes(jobClass);
		this.argTypes = getArgTypes(jobClass.prototype, 'run');
	}

	run = async (...args: string[]) => {
		const jobId = randomInt(10000).toString(10).padStart(4, '0');
		const jobName = `${this.jobClass.name}.${jobId}`;
		const jobLabel = chalk.bgYellow.black(jobName);

		mwn.log(`[i] ${jobLabel} triggered`);

		let status = false;
		let done = false;
		if (this.scheduler.waiter.add(1)) {
			const time = performance.now();
			try {
				const job = new this.jobClass(
					...this.paramTypes.map((paramtype: any) => {
						const name: string = paramtype?.name ?? '';
						if (name === 'mwn') return this.scheduler.bot;
						if (name === 'Messenger') return this.scheduler.messenger;
						if (name === 'Waiter') return this.scheduler.waiter;
						if (name === 'Token') return this.scheduler.token;
						if (name === 'Log') return new paramtype(jobLabel);
						return new paramtype();
					})
				);

				status = await job.run(
					...this.argTypes.map((type, index) => {
						const arg = args[index];
						return arg == null || arg === 'null' ? undefined : type.transform(arg);
					})
				);

				if (status) {
					mwn.log(`[S] ${jobLabel} exited successfully (${Math.round(performance.now() - time)}ms)`);
				} else {
					mwn.log(`[/] ${jobLabel} exited with nothing to do (${Math.round(performance.now() - time)}ms)`);
				}
			} catch (e: unknown) {
				mwn.log(`[E] ${jobLabel} exited with an error (${Math.round(performance.now() - time)}ms)`);
				if (e instanceof Error) {
					mwn.log(`[E] ${jobLabel} ${e?.name ?? ''} ${e?.message ?? ''}`);
				} else {
					mwn.log(`[E] ${jobLabel} ${e?.toString() ?? 'Unknown error'}`);
				}
				status = false;
			}

			done = this.scheduler.waiter.done();
		} else {
			mwn.log(`[/] ${jobLabel} was blocked because Rukoto is trying to exit`);
		}

		if (!done) {
			mwn.log(`[V] Rukoto is waiting ${this.scheduler.waiter.count} jobs to complete before exiting`);
		}

		return status;
	};
}
